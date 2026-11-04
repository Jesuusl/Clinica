import assert from 'node:assert';
import http from 'node:http';
import { db, initDatabase, generateUniquePickupCode } from '../src/db/database.js';
import { seedData } from '../src/db/seed.js';

// Inicializar DB y sembrado
initDatabase();
seedData();

const BASE_URL = 'http://localhost:4000/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const { headers, ...restOptions } = options;
  const res = await fetch(url, {
    ...restOptions,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('🧪 Iniciando batería exhaustiva de pruebas QA...');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASÓ: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FALLÓ: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Healthcheck
  await test('1. Servidor Backend está en línea y responde healthcheck', async () => {
    const res = await request('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'online');
  });

  // 2. Consulta y Actualización de Perfil de Paciente
  await test('2. Consulta de Perfil de Paciente y actualización de datos médicos/EPS', async () => {
    const res = await request('/patients/6/profile');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.id, 6);
    assert.ok(res.data.data.eps_insurance);

    // Actualizar datos
    const updateRes = await request('/patients/6/profile', {
      method: 'PUT',
      body: JSON.stringify({
        phone: '+57 300 999 8888',
        allergies: 'Penicilina, Sulfas, AINES',
        chronic_conditions: 'Hipertensión Arterial Grado I',
        actingUserName: 'Juan Pérez'
      })
    });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.data.data.phone, '+57 300 999 8888');
    assert.ok(updateRes.data.data.allergies.includes('AINES'));
  });

  // 3. Flujo de Citas: Creación clasificada, optimización de turnos y cambio de estado
  let testApptId = null;
  await test('3. Agendamiento de Cita clasificada por color e inicio en Solicitada', async () => {
    db.prepare("UPDATE appointments SET status = 'Cancelada' WHERE date = '2026-11-20' AND time_slot = '14:00' AND doctor_id = 2").run();
    const res = await request('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patient_id: 6,
        doctor_id: 2,
        specialty: 'Cardiología',
        reason_type: 'control_cardiaco',
        date: '2026-11-20',
        time_slot: '14:00',
        notes: 'Control semestral de presión arterial',
        requestedByRole: 'patient',
        actingUserName: 'Juan Pérez'
      })
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.data.status, 'Solicitada');
    assert.strictEqual(res.data.data.color_code, '#10b981'); // Verde para control cardiaco
    testApptId = res.data.data.id;
  });

  await test('4. Optimización de Fecha y Franja Horaria más próxima disponible', async () => {
    const res = await request('/appointments/next-available?doctor_id=2');
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.data.date);
    assert.ok(res.data.data.time_slot);
    assert.strictEqual(res.data.data.doctor_id, 2);
  });

  await test('5. Transición controlada de estado de cita: Solicitada -> Confirmada', async () => {
    const res = await request(`/appointments/${testApptId}/status`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'Confirmada',
        actingUserName: 'Carlos Ramos (Admin)',
        actingRole: 'admin'
      })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.status, 'Confirmada');
  });

  // 4. Consulta Médica: Generación atómica de receta con código de 6 dígitos, labs y remisión
  let generatedPickupCode = null;
  await test('6. Realización de Consulta Médica con firma digital y generación de código 6D', async () => {
    const res = await request('/clinical/consultation', {
      method: 'POST',
      body: JSON.stringify({
        appointment_id: testApptId,
        patient_id: 6,
        doctor_id: 2,
        diagnosis: 'I10 - Hipertensión arterial en control satisfactorio',
        clinical_notes: 'Paciente acude a control. Cifras tensionales en metas. Se prescribe tratamiento.',
        physical_exam: 'TA: 122/78 mmHg | FC: 66 lpm | Ruidos cardíacos rítmicos',
        prescriptions: [
          {
            medication_name: 'Losartán Potásico 50mg',
            dosage: '50mg',
            frequency: 'Cada 12 horas',
            duration: '30 días',
            instructions: 'Tomar con agua en las mañanas y noches.'
          }
        ],
        lab_orders: [
          {
            test_type: 'Creatinina Sérica y Electrolitos',
            test_category: 'Sangre',
            instructions: 'Ayuno de 8 horas'
          }
        ],
        referrals: [
          {
            referral_type: 'control',
            target_specialty: 'Cardiología',
            priority: 'Normal',
            reason: 'Seguimiento tensional a 6 meses'
          }
        ]
      })
    });

    assert.strictEqual(res.status, 201);
    assert.ok(res.data.data.doctor_signature.includes('Dra. Valentina Soto'));
    assert.strictEqual(res.data.data.prescriptions.length, 1);

    generatedPickupCode = res.data.data.prescriptions[0].pickup_code;
    assert.strictEqual(typeof generatedPickupCode, 'string');
    assert.strictEqual(generatedPickupCode.length, 6);
    assert.match(generatedPickupCode, /^\d{6}$/);

    // Verificar que la cita pasó a 'Completada'
    const apptCheck = await request(`/appointments?patient_id=6`);
    const appt = apptCheck.data.data.find(a => a.id === testApptId);
    assert.strictEqual(appt.status, 'Completada');
  });

  // 5. Farmacia: Verificación, canje y restricción de código
  await test('7. Farmacia: Verificación de código de 6 dígitos activo', async () => {
    assert.ok(generatedPickupCode);
    const res = await request(`/pharmacy/verify-code/${generatedPickupCode}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.valid, true);
    assert.strictEqual(res.data.data.status, 'Pendiente');
    assert.strictEqual(res.data.data.medication_name, 'Losartán Potásico 50mg');
  });

  await test('8. Farmacia: Dispensación confirmada e irreversible con descuento de inventario', async () => {
    // Obtener stock antes
    const invBefore = await request('/pharmacy/inventory');
    const losartan = invBefore.data.data.find(m => m.medication_name.includes('Losartán'));
    const stockPrevio = losartan.stock_quantity;

    // Dispensar
    const res = await request('/pharmacy/dispense', {
      method: 'POST',
      body: JSON.stringify({
        pickup_code: generatedPickupCode,
        dispensed_by: 5,
        actingUserName: 'QF. Laura Mendoza'
      })
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.status, 'Reclamado');
    assert.strictEqual(res.data.data.remaining_stock, stockPrevio - 1);

    // Comprobar que en base de datos quedó en Reclamado
    const prescDb = db.prepare('SELECT status, redeemed_at FROM prescriptions WHERE pickup_code = ?').get(generatedPickupCode);
    assert.strictEqual(prescDb.status, 'Reclamado');
    assert.ok(prescDb.redeemed_at);
  });

  await test('9. Seguridad DB: Restricción de reutilización del código (intento de canjear código ya usado)', async () => {
    const res = await request('/pharmacy/dispense', {
      method: 'POST',
      body: JSON.stringify({
        pickup_code: generatedPickupCode,
        dispensed_by: 5
      })
    });

    // Debe ser rechazado con 409 Conflict
    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.data.success, false);
    assert.ok(res.data.error.includes('bloqueada') || res.data.error.includes('ya fue entregada'));
  });

  await test('10. Farmacia: Detección y bandera visual de stock crítico (<= min_threshold_alert)', async () => {
    const res = await request('/pharmacy/inventory');
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.summary.critical_alerts > 0);
    const criticalItem = res.data.data.find(m => m.is_critical_stock === 1);
    assert.ok(criticalItem);
    assert.ok(criticalItem.stock_quantity <= criticalItem.min_threshold_alert);
  });

  // 6. Laboratorio: Carga de resultados
  await test('11. Laboratorio: Carga de resultados e incorporación directa a la historia clínica', async () => {
    const ordersRes = await request('/laboratory/orders?status=Pendiente');
    assert.strictEqual(ordersRes.status, 200);
    assert.ok(ordersRes.data.data.length > 0);
    const orderToComplete = ordersRes.data.data[0];

    const uploadRes = await request(`/laboratory/orders/${orderToComplete.id}/result`, {
      method: 'PUT',
      body: JSON.stringify({
        result_notes: 'Valores dentro de rangos normales de referencia.',
        result_values: { 'Creatinina': '0.9 mg/dL (Normal: 0.7 - 1.2)', 'Potasio': '4.2 mEq/L' },
        attachment_name: 'Informe_Laboratorio_Oficial.pdf',
        completed_by: 4,
        actingUserName: 'Lic. Roberto Díaz'
      })
    });

    assert.strictEqual(uploadRes.status, 200);
    assert.strictEqual(uploadRes.data.data.status, 'Completado');
  });

  // 7. Auditoría y Trazabilidad
  await test('12. Bitácora de Auditoría: Registro inmutable de eventos de acceso y dispensación', async () => {
    const res = await request('/audit-logs');
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.data.length >= 3);

    const hasDispense = res.data.data.some(l => l.action === 'DISPENSE_MEDICATION');
    assert.ok(hasDispense, 'Debe existir log de DISPENSE_MEDICATION');

    const hasAccess = res.data.data.some(l => l.action === 'ACCESS_MEDICAL_RECORD' || l.action === 'COMPLETE_CONSULTATION');
    assert.ok(hasAccess, 'Debe existir log de trazabilidad médica');
  });

  // 8. Seguridad Clínica y Autenticación
  let adminAuthToken = null;
  await test('13. Autenticación: Login exitoso con credenciales demo seguras y generación de token', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'recepcion@clinicasalud.com',
        password: 'Admin123*'
      })
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.data.token);
    assert.strictEqual(res.data.data.user.role, 'admin');
    assert.strictEqual(res.data.data.user.password_hash, undefined);
    assert.strictEqual(res.data.data.user.salt, undefined);
    adminAuthToken = res.data.data.token;
  });

  await test('14. Autenticación: Rechazo de login con contraseña incorrecta (401)', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'recepcion@clinicasalud.com',
        password: 'PasswordEquivocada123'
      })
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.success, false);
    assert.ok(res.data.error.includes('Credenciales inválidas'));
  });

  await test('15. Autenticación: Verificación de sesión clínica en /me con Bearer token', async () => {
    const res = await request('/auth/me', {
      headers: {
        Authorization: `Bearer ${adminAuthToken}`
      }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.email, 'recepcion@clinicasalud.com');
    assert.strictEqual(res.data.data.password_hash, undefined);
    assert.strictEqual(res.data.data.salt, undefined);

    // Intento con token inválido
    const invalidRes = await request('/auth/me', {
      headers: {
        Authorization: 'Bearer token-invalido-o-manipulado'
      }
    });
    assert.strictEqual(invalidRes.status, 401);
  });

  const testPatientEmail = `paciente.test.${Date.now()}@correo.com`;
  await test('16. Autenticación: Registro público exclusivo de paciente y perfil clínico transaccional (201)', async () => {
    const res = await request('/auth/register-patient', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Camila Restrepo',
        email: testPatientEmail,
        password: 'PasswordSegura2026*',
        phone: '+57 315 111 2233',
        document_id: 'CC 1098765432',
        address: 'Carrera 7 # 120-45, Bogotá',
        eps_insurance: 'Compensar EPS',
        policy_number: 'COM-778899',
        blood_type: 'O+',
        allergies: 'Dipirona',
        chronic_conditions: 'Rinitis Alérgica',
        emergency_contact_name: 'Santiago Restrepo',
        emergency_contact_phone: '+57 315 222 3344'
      })
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.user.email, testPatientEmail);
    assert.strictEqual(res.data.data.user.role, 'patient');
    assert.strictEqual(res.data.data.user.eps_insurance, 'Compensar EPS');
    assert.ok(res.data.data.token);
    assert.strictEqual(res.data.data.user.password_hash, undefined);
  });

  await test('17. Autenticación: Control de colisiones de email (409) y validación de contraseña corta (400)', async () => {
    // Intento duplicar el email recién registrado
    const dupRes = await request('/auth/register-patient', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Otra Persona',
        email: testPatientEmail,
        password: 'PasswordValida123*',
        phone: '+57 300 000 0000',
        document_id: 'CC 99887766',
        address: 'Calle 100 # 20',
        eps_insurance: 'Sura',
        blood_type: 'A+'
      })
    });
    assert.strictEqual(dupRes.status, 409);
    assert.strictEqual(dupRes.data.success, false);

    // Contraseña menor a 6 caracteres
    const shortPassRes = await request('/auth/register-patient', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Corto',
        email: 'corto@correo.com',
        password: '123',
        phone: '+57 300 000 0000',
        document_id: 'CC 112233',
        address: 'Calle 10',
        eps_insurance: 'Sura',
        blood_type: 'A+'
      })
    });
    assert.strictEqual(shortPassRes.status, 400);
    assert.strictEqual(shortPassRes.data.success, false);
  });

  const testDoctorEmail = `dra.mendez.${Date.now()}@clinicasalud.com`;
  await test('18. Autenticación: Creación de médico especialista por Administrador con bitácora CREATE_DOCTOR (201)', async () => {
    const res = await request('/auth/create-doctor', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminAuthToken}`
      },
      body: JSON.stringify({
        name: 'Dra. Carolina Méndez',
        email: testDoctorEmail,
        password: 'DoctorMendez2026*',
        phone: '+57 320 888 9900',
        specialty: 'Neurología',
        license_number: 'MP-NEURO-55443',
        office_number: 'Consultorio 408 - Edificio Norte',
        available_days: ['Martes', 'Jueves'],
        available_hours: ['08:00 - 13:00']
      })
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.email, testDoctorEmail);
    assert.strictEqual(res.data.data.role, 'doctor');
    assert.strictEqual(res.data.data.specialty, 'Neurología');
    assert.ok(Array.isArray(res.data.data.available_days));
    assert.strictEqual(res.data.data.password_hash, undefined);

    // Verificar bitácora de auditoría
    const auditRes = await request('/audit-logs');
    const doctorAudit = auditRes.data.data.find(l => l.action === 'CREATE_DOCTOR' && l.details.includes('Carolina Méndez'));
    assert.ok(doctorAudit, 'Debe registrarse el evento CREATE_DOCTOR en audit_logs');
  });

  await test('19. Autenticación: Rechazo de creación de médico sin privilegios de administrador (403)', async () => {
    // Intento con usuario no administrador (adminUserId = 6, que es paciente)
    const res = await request('/auth/create-doctor', {
      method: 'POST',
      body: JSON.stringify({
        adminUserId: 6, // Rol paciente
        name: 'Dr. Falso',
        email: 'falso@clinica.com',
        password: 'Password123*',
        specialty: 'Pediatría',
        license_number: 'MP-12345',
        office_number: '101'
      })
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.data.success, false);
    assert.ok(res.data.error.includes('Solo los administradores'));
  });

  await test('20. Seguridad e Integridad: Endpoints públicos nunca exponen password_hash ni salt', async () => {
    const listRes = await request('/auth/users');
    assert.strictEqual(listRes.status, 200);
    for (const u of listRes.data.data) {
      assert.strictEqual(u.password_hash, undefined, `Usuario ${u.email} no debe exponer password_hash`);
      assert.strictEqual(u.salt, undefined, `Usuario ${u.email} no debe exponer salt`);
    }

    const detailRes = await request('/auth/users/1');
    assert.strictEqual(detailRes.status, 200);
    assert.strictEqual(detailRes.data.data.password_hash, undefined);
    assert.strictEqual(detailRes.data.data.salt, undefined);
  });

  console.log(`\n========================================`);
  console.log(`🏁 Resultados de QA: ${passed} pruebas superadas, ${failed} fallos.`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Iniciar servidor temporalmente para los tests
import express from 'express';
import cors from 'cors';
import authRoutes from '../src/routes/auth.js';
import patientRoutes from '../src/routes/patients.js';
import appointmentRoutes from '../src/routes/appointments.js';
import doctorRoutes from '../src/routes/doctors.js';
import clinicalRoutes from '../src/routes/clinical.js';
import labRoutes from '../src/routes/laboratory.js';
import pharmacyRoutes from '../src/routes/pharmacy.js';
import auditRoutes from '../src/routes/audit.js';

const app = express();
app.use(cors());
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ status: 'online' }));
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/clinical', clinicalRoutes);
app.use('/api/laboratory', labRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/audit-logs', auditRoutes);

const server = app.listen(4000, async () => {
  await runTests();
  server.close();
});

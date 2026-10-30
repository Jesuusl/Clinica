import { db, initDatabase } from './database.js';

export function seedData() {
  initDatabase();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    return; // Ya hay datos iniciales
  }

  // 1. Usuarios del sistema
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, role, phone, avatar)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(1, 'Carlos Ramos', 'recepcion@clinicasalud.com', 'admin', '+57 310 456 7890', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80');
  insertUser.run(2, 'Dra. Valentina Soto', 'vsoto@clinicasalud.com', 'doctor', '+57 311 234 5678', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=256&q=80');
  insertUser.run(3, 'Dr. Alejandro Ruiz', 'aruiz@clinicasalud.com', 'doctor', '+57 312 987 6543', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=256&q=80');
  insertUser.run(4, 'Lic. Roberto Díaz', 'lab@clinicasalud.com', 'lab', '+57 314 555 1234', 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=256&q=80');
  insertUser.run(5, 'QF. Laura Mendoza', 'farmacia@clinicasalud.com', 'pharmacy', '+57 316 777 8899', 'https://images.unsplash.com/photo-1594824813572-c51f49618f3a?auto=format&fit=crop&w=256&q=80');
  insertUser.run(6, 'Juan Pérez Gómez', 'juan.perez@email.com', 'patient', '+57 300 123 4567', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80');
  insertUser.run(7, 'María Gómez Londoño', 'maria.gomez@email.com', 'patient', '+57 301 987 6543', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80');

  // 2. Perfiles de doctores
  const insertDoc = db.prepare(`
    INSERT INTO doctor_profiles (user_id, specialty, license_number, office_number, available_days, available_hours)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertDoc.run(
    2,
    'Cardiología',
    'MP-CARD-98432',
    'Consultorio 304 - Edificio Especialistas',
    JSON.stringify(['Lunes', 'Miércoles', 'Viernes']),
    JSON.stringify(['08:00 - 12:00', '14:00 - 17:00'])
  );
  insertDoc.run(
    3,
    'Medicina General',
    'MP-MED-11029',
    'Consultorio 102 - Torre Principal',
    JSON.stringify(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']),
    JSON.stringify(['07:00 - 13:00', '14:00 - 18:00'])
  );

  // 3. Perfiles de pacientes
  const insertPat = db.prepare(`
    INSERT INTO patient_profiles (user_id, document_id, phone, email, address, eps_insurance, policy_number, blood_type, allergies, chronic_conditions, emergency_contact_name, emergency_contact_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertPat.run(
    6,
    'CC 1020304050',
    '+57 300 123 4567',
    'juan.perez@email.com',
    'Calle 45 # 18-24, Apto 502, Bogotá',
    'Sura EPS',
    'SUR-9948210-C',
    'O+',
    'Penicilina, Sulfas',
    'Hipertensión Arterial Grado I, Arritmia Leve',
    'Carolina Gómez (Esposa)',
    '+57 300 555 0192'
  );
  insertPat.run(
    7,
    'CC 52401928',
    '+57 301 987 6543',
    'maria.gomez@email.com',
    'Carrera 15 # 85-30, Casa 12, Bogotá',
    'Sanitas EPS',
    'SAN-8102938-A',
    'A+',
    'AINES (Ibuprofeno)',
    'Asma Bronquial Controlada',
    'Jorge Londoño (Hermano)',
    '+57 301 222 4433'
  );

  // 4. Inventario de farmacia (con algunos artículos cerca o bajo stock crítico para alertas visuales)
  const insertMed = db.prepare(`
    INSERT INTO pharmacy_inventory (medication_name, category, stock_quantity, min_threshold_alert, unit, presentation)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertMed.run('Losartán Potásico 50mg', 'Antihipertensivo', 150, 20, 'comprimidos', 'Caja x 30 tabletas');
  insertMed.run('Metoprolol Tartrato 50mg', 'Cardiovascular', 8, 15, 'comprimidos', 'Caja x 30 tabletas (Stock Crítico)');
  insertMed.run('Atorvastatina 20mg', 'Hipolipemiante', 85, 20, 'comprimidos', 'Caja x 30 tabletas');
  insertMed.run('Amoxicilina + Clavulánico 875/125mg', 'Antibiótico', 5, 10, 'comprimidos', 'Caja x 14 tabletas (Stock Crítico)');
  insertMed.run('Salbutamol Inhalador 100mcg', 'Broncodilatador', 24, 8, 'inhalador', 'Frasco presurizado 200 dosis');
  insertMed.run('Omeprazol 20mg', 'Gastroenterología', 120, 25, 'cápsulas', 'Caja x 30 cápsulas');
  insertMed.run('Acetaminofén 500mg', 'Analgésico', 350, 50, 'tabletas', 'Caja x 100 tabletas');

  // 5. Citas médicas con clasificaciones por color
  const insertAppt = db.prepare(`
    INSERT INTO appointments (id, patient_id, doctor_id, specialty, reason_type, reason_label, color_code, date, time_slot, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  // Cita de hoy completada
  const today = new Date().toISOString().split('T')[0];
  insertAppt.run(
    1,
    6,
    2,
    'Cardiología',
    'control_cardiaco',
    'Control Cardíaco Periódico',
    '#10b981', // Verde
    today,
    '09:00',
    'Completada',
    'Revisión de presión arterial y ajuste de medicación antihipertensiva.'
  );
  // Cita solicitada pendiente por confirmar por recepción
  insertAppt.run(
    2,
    6,
    3,
    'Medicina General',
    'control_general',
    'Control de Medicina General',
    '#3b82f6', // Azul
    '2026-11-02',
    '10:30',
    'Solicitada',
    'Solicitud de cita para chequeo de rutina anual.'
  );
  // Cita confirmada para María Gómez
  insertAppt.run(
    3,
    7,
    2,
    'Cardiología',
    'primera_vez',
    'Primera Vez - Valoración Especialista',
    '#f59e0b', // Ámbar
    '2026-11-04',
    '11:00',
    'Confirmada',
    'Paciente remitida por cuadro recurrente de palpitaciones.'
  );

  // 6. Historia Clínica de la Cita Completada #1
  const insertRec = db.prepare(`
    INSERT INTO medical_records (id, appointment_id, patient_id, doctor_id, diagnosis, clinical_notes, physical_exam, doctor_signature, doctor_license)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertRec.run(
    1,
    1,
    6,
    2,
    'I10 - Hipertensión esencial (primaria) en control favorable',
    'Paciente masculino de 45 años asiste a control cardíaco trimestral. Refiere buena tolerancia al Losartán. Niega mareos o dolor torácico. Se ajusta dosis para optimización tensional.',
    'TA: 125/82 mmHg | FC: 68 lpm | Peso: 78 kg | Auscultación cardiopulmonar rítmica sin soplos.',
    'Dra. Valentina Soto - Médica Especialista en Cardiología',
    'Registro Médico MP-CARD-98432'
  );

  // 7. Prescripciones con códigos únicos de 6 dígitos
  const insertPresc = db.prepare(`
    INSERT INTO prescriptions (id, medical_record_id, appointment_id, patient_id, doctor_id, medication_id, medication_name, dosage, frequency, duration, instructions, pickup_code, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  // Código 849201 pendiente por reclamar
  insertPresc.run(
    1,
    1,
    1,
    6,
    2,
    1,
    'Losartán Potásico 50mg',
    '1 tableta (50mg)',
    'Cada 12 horas',
    '30 días',
    'Tomar con abundante agua en las mañanas y noches.',
    '849201',
    'Pendiente'
  );
  // Código 391845 reclamado previamente
  insertPresc.run(
    2,
    1,
    1,
    6,
    2,
    3,
    'Atorvastatina 20mg',
    '1 tableta (20mg)',
    'Cada 24 horas',
    '30 días',
    'Tomar preferiblemente con la cena.',
    '391845',
    'Reclamado'
  );

  // Actualizar el reclamado con fecha
  db.prepare(`
    UPDATE prescriptions
    SET redeemed_at = datetime('now', '-2 days'), redeemed_by = 5
    WHERE id = 2
  `).run();

  // 8. Órdenes de Laboratorio
  const insertLab = db.prepare(`
    INSERT INTO lab_orders (id, medical_record_id, patient_id, doctor_id, test_type, test_category, instructions, status, result_notes, result_values, attachment_name, attachment_url, completed_by, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  // Examen completado con resultado cargado
  insertLab.run(
    1,
    1,
    6,
    2,
    'Perfil Lipídico Completo',
    'Sangre',
    'Ayuno mínimo de 10 a 12 horas previo a la toma.',
    'Completado',
    'Muestra procesada en tubo seco. Valores dentro de metas terapéuticas con leve elevación de triglicéridos.',
    JSON.stringify({
      'Colesterol Total': '182 mg/dL (Deseable < 200)',
      'Triglicéridos': '165 mg/dL (Moderado 150-199)',
      'HDL (Bueno)': '48 mg/dL (> 40)',
      'LDL (Malo)': '101 mg/dL (< 100)'
    }),
    'Informe_Perfil_Lipidico_JuanPerez.pdf',
    '#report-sample-lipids',
    4,
    new Date().toISOString()
  );

  // Examen pendiente por procesar
  insertLab.run(
    2,
    1,
    6,
    2,
    'Electrocardiograma de 12 Derivaciones',
    'Cardiología',
    'Paciente en reposo supino durante 10 minutos previo a registro.',
    'Pendiente',
    null,
    null,
    null,
    null,
    null,
    null
  );

  // 9. Remisión médica
  const insertRef = db.prepare(`
    INSERT INTO medical_referrals (id, medical_record_id, patient_id, doctor_id, referral_type, target_specialty, priority, reason, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertRef.run(
    1,
    1,
    6,
    2,
    'control',
    'Cardiología',
    'Normal',
    'Control de seguimiento en 3 meses para monitoreo de presión arterial y función lipídica.',
    'Pendiente'
  );

  // 10. Auditoría inicial
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (user_id, user_name, role, action, entity_type, entity_id, details, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-1 hours'))
  `);
  const defaultAuditIp = process.env.AUDIT_SEED_IP || '127.0.0.1';
  const doctorAuditIp = process.env.DOCTOR_AUDIT_IP || defaultAuditIp;
  const pharmacyAuditIp = process.env.PHARMACY_AUDIT_IP || defaultAuditIp;

  insertAudit.run(1, 'Carlos Ramos', 'admin', 'SYSTEM_INITIALIZATION', 'system', '0', 'Sembrado y arranque de datos clínicos del sistema hospitalario', defaultAuditIp);
  insertAudit.run(2, 'Dra. Valentina Soto', 'doctor', 'CREATE_MEDICAL_RECORD', 'medical_record', '1', 'Registro de atención médica y diagnóstico I10 para paciente Juan Pérez', doctorAuditIp);
  insertAudit.run(5, 'QF. Laura Mendoza', 'pharmacy', 'DISPENSE_MEDICATION', 'prescription', '2', 'Dispensación exitosa de Atorvastatina 20mg con código 391845 validado irreversiblemente', pharmacyAuditIp);
}

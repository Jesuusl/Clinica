import { Router } from 'express';
import { db, generateUniquePickupCode, logAudit } from '../db/database.js';

const router = Router();

// Ejecución completa de consulta médica (Atención, Recetas con código 6 dígitos, Labs y Remisiones)
router.post('/consultation', (req, res) => {
  try {
    const {
      appointment_id,
      patient_id,
      doctor_id,
      diagnosis,
      clinical_notes,
      physical_exam = '',
      prescriptions = [], // [{ medication_id, medication_name, dosage, frequency, duration, instructions }]
      lab_orders = [],    // [{ test_type, test_category, instructions }]
      referrals = []      // [{ referral_type: 'control' | 'specialist', target_specialty, priority, reason }]
    } = req.body;

    if (!patient_id || !doctor_id || !diagnosis || !clinical_notes) {
      return res.status(400).json({ success: false, error: 'Faltan campos clínicos obligatorios (patient_id, doctor_id, diagnosis, clinical_notes)' });
    }

    // Datos del doctor para firma digital y trazabilidad
    const doctor = db.prepare(`
      SELECT u.name, dp.specialty, dp.license_number
      FROM users u
      JOIN doctor_profiles dp ON dp.user_id = u.id
      WHERE u.id = ?
    `).get(doctor_id);

    if (!doctor) {
      return res.status(404).json({ success: false, error: 'Doctor no registrado' });
    }

    const doctorSignature = `${doctor.name} - ${doctor.specialty}`;
    const doctorLicense = `Registro Médico: ${doctor.license_number} | Certificado Digital`;

    // 1. Crear registro de evolución médica
    const insertRecord = db.prepare(`
      INSERT INTO medical_records (
        appointment_id, patient_id, doctor_id, diagnosis, clinical_notes,
        physical_exam, doctor_signature, doctor_license, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);

    const recordResult = insertRecord.run(
      appointment_id || null,
      patient_id,
      doctor_id,
      diagnosis,
      clinical_notes,
      physical_exam,
      doctorSignature,
      doctorLicense
    );

    const recordId = recordResult.lastInsertRowid;

    // 2. Si vino enlazada a una cita, marcarla como 'Completada'
    if (appointment_id) {
      db.prepare(`
        UPDATE appointments
        SET status = 'Completada', updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(appointment_id);
    }

    // 3. Generar prescripciones médicas con códigos únicos de 6 dígitos
    const generatedPrescriptions = [];
    const insertPresc = db.prepare(`
      INSERT INTO prescriptions (
        medical_record_id, appointment_id, patient_id, doctor_id,
        medication_id, medication_name, dosage, frequency, duration,
        instructions, pickup_code, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', datetime('now', 'localtime'))
    `);

    for (const p of prescriptions) {
      // Buscar o asociar medication_id si existe en inventario
      let medId = p.medication_id;
      if (!medId && p.medication_name) {
        const item = db.prepare('SELECT id FROM pharmacy_inventory WHERE medication_name LIKE ?').get(`%${p.medication_name}%`);
        if (item) medId = item.id;
      }

      // Código irrepetible de 6 dígitos verificado por restricción DB
      const pickupCode = generateUniquePickupCode();

      const pRes = insertPresc.run(
        recordId,
        appointment_id || null,
        patient_id,
        doctor_id,
        medId || null,
        p.medication_name,
        p.dosage,
        p.frequency,
        p.duration,
        p.instructions || '',
        pickupCode
      );

      generatedPrescriptions.push({
        id: pRes.lastInsertRowid,
        medication_name: p.medication_name,
        dosage: p.dosage,
        frequency: p.frequency,
        duration: p.duration,
        pickup_code: pickupCode,
        status: 'Pendiente'
      });
    }

    // 4. Registrar órdenes de laboratorio
    const generatedLabs = [];
    const insertLab = db.prepare(`
      INSERT INTO lab_orders (
        medical_record_id, patient_id, doctor_id, test_type, test_category, instructions, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'Pendiente', datetime('now', 'localtime'))
    `);

    for (const l of lab_orders) {
      const lRes = insertLab.run(
        recordId,
        patient_id,
        doctor_id,
        l.test_type,
        l.test_category || 'General',
        l.instructions || ''
      );
      generatedLabs.push({
        id: lRes.lastInsertRowid,
        test_type: l.test_type,
        test_category: l.test_category,
        status: 'Pendiente'
      });
    }

    // 5. Registrar remisiones a control o especialista
    const generatedReferrals = [];
    const insertRef = db.prepare(`
      INSERT INTO medical_referrals (
        medical_record_id, patient_id, doctor_id, referral_type, target_specialty, priority, reason, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente', datetime('now', 'localtime'))
    `);

    for (const r of referrals) {
      const rRes = insertRef.run(
        recordId,
        patient_id,
        doctor_id,
        r.referral_type || 'control',
        r.target_specialty,
        r.priority || 'Normal',
        r.reason
      );
      generatedReferrals.push({
        id: rRes.lastInsertRowid,
        referral_type: r.referral_type,
        target_specialty: r.target_specialty,
        status: 'Pendiente'
      });
    }

    // 6. Auditoría con estampa de tiempo y trazabilidad médica
    logAudit({
      userId: doctor_id,
      userName: doctor.name,
      role: 'doctor',
      action: 'COMPLETE_CONSULTATION',
      entityType: 'medical_record',
      entityId: recordId,
      details: `Atención clínica completada. Recetas: ${generatedPrescriptions.length}, Labs: ${generatedLabs.length}, Remisiones: ${generatedReferrals.length}`
    });

    res.status(201).json({
      success: true,
      message: 'Consulta registrada exitosamente con firmas electrónicas y códigos emitidos',
      data: {
        record_id: recordId,
        doctor_signature: doctorSignature,
        doctor_license: doctorLicense,
        prescriptions: generatedPrescriptions,
        lab_orders: generatedLabs,
        referrals: generatedReferrals
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

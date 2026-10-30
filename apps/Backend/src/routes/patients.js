import { Router } from 'express';
import { db, logAudit } from '../db/database.js';

const router = Router();

// Obtener perfil completo del paciente
router.get('/:id/profile', (req, res) => {
  try {
    const patientId = req.params.id;
    const profile = db.prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.avatar,
             p.document_id, p.address, p.eps_insurance, p.policy_number,
             p.blood_type, p.allergies, p.chronic_conditions,
             p.emergency_contact_name, p.emergency_contact_phone,
             p.updated_at
      FROM users u
      JOIN patient_profiles p ON p.user_id = u.id
      WHERE u.id = ? AND u.role = 'patient'
    `).get(patientId);

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Perfil de paciente no encontrado' });
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Actualizar información personal y médica del paciente
router.put('/:id/profile', (req, res) => {
  try {
    const patientId = req.params.id;
    const {
      phone,
      email,
      address,
      eps_insurance,
      policy_number,
      blood_type,
      allergies,
      chronic_conditions,
      emergency_contact_name,
      emergency_contact_phone,
      actingUserName = 'Paciente'
    } = req.body;

    // Actualizar tabla users
    if (phone || email) {
      db.prepare(`
        UPDATE users
        SET phone = COALESCE(?, phone), email = COALESCE(?, email)
        WHERE id = ?
      `).run(phone || null, email || null, patientId);
    }

    // Actualizar tabla patient_profiles
    const updateProfile = db.prepare(`
      UPDATE patient_profiles
      SET phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          address = COALESCE(?, address),
          eps_insurance = COALESCE(?, eps_insurance),
          policy_number = COALESCE(?, policy_number),
          blood_type = COALESCE(?, blood_type),
          allergies = COALESCE(?, allergies),
          chronic_conditions = COALESCE(?, chronic_conditions),
          emergency_contact_name = COALESCE(?, emergency_contact_name),
          emergency_contact_phone = COALESCE(?, emergency_contact_phone),
          updated_at = datetime('now', 'localtime')
      WHERE user_id = ?
    `);

    updateProfile.run(
      phone || null,
      email || null,
      address || null,
      eps_insurance || null,
      policy_number || null,
      blood_type || null,
      allergies ?? null,
      chronic_conditions ?? null,
      emergency_contact_name || null,
      emergency_contact_phone || null,
      patientId
    );

    // Registrar en auditoría
    logAudit({
      userId: patientId,
      userName: actingUserName,
      role: 'patient',
      action: 'UPDATE_PATIENT_PROFILE',
      entityType: 'patient_profile',
      entityId: patientId,
      details: `Actualización de datos clínicos y personales de paciente ID: ${patientId}`
    });

    const updatedProfile = db.prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.avatar,
             p.document_id, p.address, p.eps_insurance, p.policy_number,
             p.blood_type, p.allergies, p.chronic_conditions,
             p.emergency_contact_name, p.emergency_contact_phone,
             p.updated_at
      FROM users u
      JOIN patient_profiles p ON p.user_id = u.id
      WHERE u.id = ?
    `).get(patientId);

    res.json({ success: true, message: 'Perfil actualizado exitosamente', data: updatedProfile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Historial clínico y evoluciones con estampa y firma médica
router.get('/:id/medical-records', (req, res) => {
  try {
    const patientId = req.params.id;
    const { auditorName = 'Sistema', auditorRole = 'patient', auditorId = null } = req.query;

    const records = db.prepare(`
      SELECT mr.id, mr.appointment_id, mr.diagnosis, mr.clinical_notes, mr.physical_exam,
             mr.doctor_signature, mr.doctor_license, mr.created_at,
             uDoc.name as doctor_name, dp.specialty as doctor_specialty,
             a.reason_label, a.date as appointment_date, a.time_slot
      FROM medical_records mr
      JOIN users uDoc ON uDoc.id = mr.doctor_id
      LEFT JOIN doctor_profiles dp ON dp.user_id = uDoc.id
      LEFT JOIN appointments a ON a.id = mr.appointment_id
      WHERE mr.patient_id = ?
      ORDER BY mr.created_at DESC
    `).all(patientId);

    // Anexar prescripciones y labs a cada registro
    const enriched = records.map(rec => {
      const prescriptions = db.prepare(`
        SELECT p.id, p.medication_name, p.dosage, p.frequency, p.duration,
               p.instructions, p.pickup_code, p.status, p.redeemed_at
        FROM prescriptions p
        WHERE p.medical_record_id = ?
      `).all(rec.id);

      const labs = db.prepare(`
        SELECT l.id, l.test_type, l.test_category, l.instructions, l.status,
               l.result_notes, l.result_values, l.attachment_name, l.attachment_url, l.completed_at
        FROM lab_orders l
        WHERE l.medical_record_id = ?
      `).all(rec.id);

      const referrals = db.prepare(`
        SELECT r.id, r.referral_type, r.target_specialty, r.priority, r.reason, r.status
        FROM medical_referrals r
        WHERE r.medical_record_id = ?
      `).all(rec.id);

      return {
        ...rec,
        prescriptions,
        lab_orders: labs,
        referrals
      };
    });

    // Auditoría obligatoria de acceso a historias clínicas
    logAudit({
      userId: auditorId ? Number(auditorId) : null,
      userName: auditorName,
      role: auditorRole,
      action: 'ACCESS_MEDICAL_RECORD',
      entityType: 'medical_record',
      entityId: patientId,
      details: `Visualización de historia clínica del paciente ID: ${patientId}`
    });

    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Prescripciones y códigos de reclamación de medicamentos del paciente
router.get('/:id/prescriptions', (req, res) => {
  try {
    const patientId = req.params.id;
    const prescriptions = db.prepare(`
      SELECT p.id, p.medical_record_id, p.appointment_id, p.medication_name,
             p.dosage, p.frequency, p.duration, p.instructions,
             p.pickup_code, p.status, p.redeemed_at, p.created_at,
             uDoc.name as doctor_name, dp.specialty as doctor_specialty,
             pi.stock_quantity as current_stock, pi.min_threshold_alert
      FROM prescriptions p
      JOIN users uDoc ON uDoc.id = p.doctor_id
      LEFT JOIN doctor_profiles dp ON dp.user_id = uDoc.id
      LEFT JOIN pharmacy_inventory pi ON pi.id = p.medication_id
      WHERE p.patient_id = ?
      ORDER BY p.created_at DESC
    `).all(patientId);

    res.json({ success: true, data: prescriptions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Laboratorios y exámenes médicos del paciente
router.get('/:id/lab-orders', (req, res) => {
  try {
    const patientId = req.params.id;
    const labs = db.prepare(`
      SELECT l.id, l.test_type, l.test_category, l.instructions, l.status,
             l.result_notes, l.result_values, l.attachment_name, l.attachment_url,
             l.created_at, l.completed_at,
             uDoc.name as doctor_name, dp.specialty as doctor_specialty,
             uLab.name as laboratory_technician
      FROM lab_orders l
      JOIN users uDoc ON uDoc.id = l.doctor_id
      LEFT JOIN doctor_profiles dp ON dp.user_id = uDoc.id
      LEFT JOIN users uLab ON uLab.id = l.completed_by
      WHERE l.patient_id = ?
      ORDER BY l.created_at DESC
    `).all(patientId);

    const parsedLabs = labs.map(lab => ({
      ...lab,
      result_values: lab.result_values ? JSON.parse(lab.result_values) : null
    }));

    res.json({ success: true, data: parsedLabs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

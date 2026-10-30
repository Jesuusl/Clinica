import { Router } from 'express';
import { db, logAudit } from '../db/database.js';

const router = Router();

// Directorio de doctores con perfiles y disponibilidad
router.get('/', (req, res) => {
  try {
    const doctors = db.prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.avatar,
             dp.specialty, dp.license_number, dp.office_number,
             dp.available_days, dp.available_hours
      FROM users u
      JOIN doctor_profiles dp ON dp.user_id = u.id
      WHERE u.role = 'doctor'
      ORDER BY dp.specialty ASC, u.name ASC
    `).all();

    const formatted = doctors.map(doc => ({
      ...doc,
      available_days: JSON.parse(doc.available_days || '[]'),
      available_hours: JSON.parse(doc.available_hours || '[]')
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Actualizar franjas horarias y días de disponibilidad del doctor
router.put('/:id/availability', (req, res) => {
  try {
    const doctorId = req.params.id;
    const { available_days, available_hours, actingUserName = 'Doctor' } = req.body;

    if (!Array.isArray(available_days) || !Array.isArray(available_hours)) {
      return res.status(400).json({ success: false, error: 'available_days y available_hours deben ser arreglos' });
    }

    db.prepare(`
      UPDATE doctor_profiles
      SET available_days = ?,
          available_hours = ?
      WHERE user_id = ?
    `).run(JSON.stringify(available_days), JSON.stringify(available_hours), doctorId);

    logAudit({
      userId: Number(doctorId),
      userName: actingUserName,
      role: 'doctor',
      action: 'UPDATE_DOCTOR_AVAILABILITY',
      entityType: 'doctor_profile',
      entityId: doctorId,
      details: `Actualización de disponibilidad horaria del doctor: ${available_days.join(', ')} | ${available_hours.join(', ')}`
    });

    res.json({ success: true, message: 'Disponibilidad actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

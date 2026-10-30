import { Router } from 'express';
import { db, logAudit } from '../db/database.js';

const router = Router();

// Mapeo de colores y etiquetas por motivo de cita
export const REASON_CONFIG = {
  control_cardiaco: { label: 'Control Cardíaco', color: '#10b981', specialty: 'Cardiología' }, // Verde
  control_general: { label: 'Control General', color: '#3b82f6', specialty: 'Medicina General' }, // Azul
  primera_vez: { label: 'Primera Vez - Valoración', color: '#f59e0b', specialty: 'Medicina General' }, // Ámbar
  especialidad: { label: 'Consulta de Especialidad', color: '#8b5cf6', specialty: 'Cardiología' } // Morado
};

// Obtener listado de citas con filtros
router.get('/', (req, res) => {
  try {
    const { patient_id, doctor_id, status, date } = req.query;

    let query = `
      SELECT a.id, a.patient_id, a.doctor_id, a.specialty,
             a.reason_type, a.reason_label, a.color_code,
             a.date, a.time_slot, a.status, a.notes, a.created_at,
             uPat.name as patient_name, pp.document_id as patient_document, pp.phone as patient_phone,
             uDoc.name as doctor_name, dp.office_number, dp.specialty as doctor_specialty
      FROM appointments a
      JOIN users uPat ON uPat.id = a.patient_id
      LEFT JOIN patient_profiles pp ON pp.user_id = uPat.id
      JOIN users uDoc ON uDoc.id = a.doctor_id
      LEFT JOIN doctor_profiles dp ON dp.user_id = uDoc.id
      WHERE 1=1
    `;
    const params = [];

    if (patient_id) {
      query += ' AND a.patient_id = ?';
      params.push(patient_id);
    }
    if (doctor_id) {
      query += ' AND a.doctor_id = ?';
      params.push(doctor_id);
    }
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    if (date) {
      query += ' AND a.date = ?';
      params.push(date);
    }

    query += ' ORDER BY a.date ASC, a.time_slot ASC';

    const appointments = db.prepare(query).all(...params);
    res.json({ success: true, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Optimización de asignación de cita: cálculo de fecha y hora más próxima disponible
router.get('/next-available', (req, res) => {
  try {
    const { doctor_id, specialty } = req.query;

    let targetDoctorId = doctor_id;
    if (!targetDoctorId && specialty) {
      const doc = db.prepare(`
        SELECT u.id FROM users u
        JOIN doctor_profiles dp ON dp.user_id = u.id
        WHERE dp.specialty LIKE ? LIMIT 1
      `).get(`%${specialty}%`);
      if (doc) targetDoctorId = doc.id;
    }

    if (!targetDoctorId) {
      return res.status(400).json({ success: false, error: 'Debe especificar doctor_id o specialty' });
    }

    const doctor = db.prepare(`
      SELECT u.id, u.name, dp.specialty, dp.available_days, dp.available_hours, dp.office_number
      FROM users u
      JOIN doctor_profiles dp ON dp.user_id = u.id
      WHERE u.id = ?
    `).get(targetDoctorId);

    if (!doctor) {
      return res.status(404).json({ success: false, error: 'Doctor no encontrado' });
    }

    const availableDays = JSON.parse(doctor.available_days || '[]');
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    // Buscar el próximo slot libre en los próximos 14 días
    const today = new Date();
    const candidateSlots = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
    let nearest = null;

    for (let i = 1; i <= 14; i++) {
      const candidateDate = new Date(today);
      candidateDate.setDate(today.getDate() + i);
      const dayName = dayNames[candidateDate.getDay()];

      if (availableDays.includes(dayName)) {
        const dateStr = candidateDate.toISOString().split('T')[0];

        // Buscar qué horas ya están ocupadas ese día
        const busySlots = db.prepare(`
          SELECT time_slot FROM appointments
          WHERE doctor_id = ? AND date = ? AND status != 'Cancelada'
        `).all(targetDoctorId, dateStr).map(r => r.time_slot);

        for (const slot of candidateSlots) {
          if (!busySlots.includes(slot)) {
            nearest = {
              doctor_id: doctor.id,
              doctor_name: doctor.name,
              specialty: doctor.specialty,
              office_number: doctor.office_number,
              date: dateStr,
              day_name: dayName,
              time_slot: slot
            };
            break;
          }
        }
      }
      if (nearest) break;
    }

    res.json({ success: true, data: nearest });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Solicitar o crear cita médica
router.post('/', (req, res) => {
  try {
    const {
      patient_id,
      doctor_id,
      specialty,
      reason_type = 'control_general',
      date,
      time_slot,
      notes = '',
      requestedByRole = 'patient',
      actingUserName = 'Usuario'
    } = req.body;

    if (!patient_id || !doctor_id || !date || !time_slot) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos (patient_id, doctor_id, date, time_slot)' });
    }

    // Verificar si el doctor ya tiene cita en ese horario
    const collision = db.prepare(`
      SELECT id FROM appointments
      WHERE doctor_id = ? AND date = ? AND time_slot = ? AND status != 'Cancelada'
    `).get(doctor_id, date, time_slot);

    if (collision) {
      return res.status(409).json({ success: false, error: 'El médico ya tiene una cita programada en ese horario. Por favor seleccione otro espacio.' });
    }

    const config = REASON_CONFIG[reason_type] || {
      label: 'Consulta General',
      color: '#3b82f6',
      specialty: specialty || 'Medicina General'
    };

    // Si la crea administración, nace "Confirmada". Si la pide el paciente, inicia en "Solicitada".
    const initialStatus = requestedByRole === 'admin' ? 'Confirmada' : 'Solicitada';

    const insert = db.prepare(`
      INSERT INTO appointments (
        patient_id, doctor_id, specialty, reason_type, reason_label, color_code,
        date, time_slot, status, notes, admin_assigned_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      patient_id,
      doctor_id,
      specialty || config.specialty,
      reason_type,
      config.label,
      config.color,
      date,
      time_slot,
      initialStatus,
      notes,
      requestedByRole === 'admin' ? 1 : null
    );

    logAudit({
      userId: patient_id,
      userName: actingUserName,
      role: requestedByRole,
      action: 'SCHEDULE_APPOINTMENT',
      entityType: 'appointment',
      entityId: result.lastInsertRowid,
      details: `Cita #${result.lastInsertRowid} agendada en estado '${initialStatus}' para el ${date} a las ${time_slot} (${config.label})`
    });

    const newAppt = db.prepare(`
      SELECT a.*, uPat.name as patient_name, uDoc.name as doctor_name
      FROM appointments a
      JOIN users uPat ON uPat.id = a.patient_id
      JOIN users uDoc ON uDoc.id = a.doctor_id
      WHERE a.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ success: true, message: 'Cita registrada exitosamente', data: newAppt });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Transición de estado controlada: Solicitada -> Confirmada -> Completada -> Cancelada
router.put('/:id/status', (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { status, actingUserId, actingUserName = 'Administración', actingRole = 'admin', notes } = req.body;

    const validStatuses = ['Solicitada', 'Confirmada', 'Completada', 'Cancelada'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}` });
    }

    const current = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointmentId);
    if (!current) {
      return res.status(404).json({ success: false, error: 'Cita no encontrada' });
    }

    db.prepare(`
      UPDATE appointments
      SET status = ?,
          notes = CASE WHEN ? IS NOT NULL THEN ? ELSE notes END,
          admin_assigned_by = CASE WHEN ? = 'admin' THEN ? ELSE admin_assigned_by END,
          updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(status, notes || null, notes || null, actingRole, actingUserId || 1, appointmentId);

    logAudit({
      userId: actingUserId ? Number(actingUserId) : null,
      userName: actingUserName,
      role: actingRole,
      action: 'UPDATE_APPOINTMENT_STATUS',
      entityType: 'appointment',
      entityId: appointmentId,
      details: `Estado de cita #${appointmentId} cambiado de '${current.status}' a '${status}'`
    });

    const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointmentId);
    res.json({ success: true, message: `Estado actualizado a ${status}`, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

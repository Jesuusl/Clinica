import { Router } from 'express';
import { db, logAudit } from '../db/database.js';

const router = Router();

// Listado de todas las órdenes de laboratorio
router.get('/orders', (req, res) => {
  try {
    const { status, patient_id } = req.query;

    let query = `
      SELECT l.id, l.medical_record_id, l.patient_id, l.doctor_id,
             l.test_type, l.test_category, l.instructions, l.status,
             l.result_notes, l.result_values, l.attachment_name, l.attachment_url,
             l.completed_by, l.completed_at, l.created_at,
             uPat.name as patient_name, pp.document_id as patient_document, pp.eps_insurance,
             uDoc.name as doctor_name, dp.specialty as doctor_specialty,
             uTech.name as technician_name
      FROM lab_orders l
      JOIN users uPat ON uPat.id = l.patient_id
      LEFT JOIN patient_profiles pp ON pp.user_id = uPat.id
      JOIN users uDoc ON uDoc.id = l.doctor_id
      LEFT JOIN doctor_profiles dp ON dp.user_id = uDoc.id
      LEFT JOIN users uTech ON uTech.id = l.completed_by
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND l.status = ?';
      params.push(status);
    }
    if (patient_id) {
      query += ' AND l.patient_id = ?';
      params.push(patient_id);
    }

    query += ' ORDER BY l.created_at DESC';

    const orders = db.prepare(query).all(...params);

    const formatted = orders.map(ord => ({
      ...ord,
      result_values: ord.result_values ? JSON.parse(ord.result_values) : null
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cargar y registrar resultados de examen directamente a la historia clínica
router.put('/orders/:id/result', (req, res) => {
  try {
    const orderId = req.params.id;
    const {
      result_notes,
      result_values, // objeto o string
      attachment_name,
      attachment_url,
      completed_by = 4, // ID de Lic. Roberto Díaz por defecto
      actingUserName = 'Laboratorio Clínico'
    } = req.body;

    if (!result_notes) {
      return res.status(400).json({ success: false, error: 'Debe ingresar las notas o interpretación del resultado' });
    }

    const order = db.prepare('SELECT * FROM lab_orders WHERE id = ?').get(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Orden de laboratorio no encontrada' });
    }

    const valuesString = result_values ? (typeof result_values === 'string' ? result_values : JSON.stringify(result_values)) : null;

    db.prepare(`
      UPDATE lab_orders
      SET status = 'Completado',
          result_notes = ?,
          result_values = ?,
          attachment_name = ?,
          attachment_url = ?,
          completed_by = ?,
          completed_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(
      result_notes,
      valuesString,
      attachment_name || `Informe_${order.test_type.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      attachment_url || `#report-${orderId}`,
      completed_by,
      orderId
    );

    logAudit({
      userId: completed_by,
      userName: actingUserName,
      role: 'lab',
      action: 'UPLOAD_LAB_RESULT',
      entityType: 'lab_order',
      entityId: orderId,
      details: `Resultados cargados para examen '${order.test_type}' de paciente ID: ${order.patient_id}`
    });

    const updated = db.prepare(`
      SELECT l.*, uPat.name as patient_name, uTech.name as technician_name
      FROM lab_orders l
      JOIN users uPat ON uPat.id = l.patient_id
      LEFT JOIN users uTech ON uTech.id = l.completed_by
      WHERE l.id = ?
    `).get(orderId);

    res.json({ success: true, message: 'Resultado cargado y publicado en la historia clínica del paciente', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

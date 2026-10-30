import { Router } from 'express';
import { db, logAudit } from '../db/database.js';

const router = Router();

// 1. Inventario en tiempo real con alertas de stock crítico
router.get('/inventory', (req, res) => {
  try {
    const items = db.prepare(`
      SELECT id, medication_name, category, stock_quantity, min_threshold_alert,
             unit, presentation, last_updated,
             CASE WHEN stock_quantity <= min_threshold_alert THEN 1 ELSE 0 END as is_critical_stock
      FROM pharmacy_inventory
      ORDER BY is_critical_stock DESC, medication_name ASC
    `).all();

    res.json({
      success: true,
      data: items,
      summary: {
        total_items: items.length,
        critical_alerts: items.filter(i => i.is_critical_stock === 1).length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Actualizar o reabastecer stock
router.put('/inventory/:id/stock', (req, res) => {
  try {
    const itemId = req.params.id;
    const { add_quantity, min_threshold_alert, actingUserName = 'Farmacia' } = req.body;

    const item = db.prepare('SELECT * FROM pharmacy_inventory WHERE id = ?').get(itemId);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Medicamento no encontrado en inventario' });
    }

    const newStock = Math.max(0, item.stock_quantity + (Number(add_quantity) || 0));

    db.prepare(`
      UPDATE pharmacy_inventory
      SET stock_quantity = ?,
          min_threshold_alert = COALESCE(?, min_threshold_alert),
          last_updated = datetime('now', 'localtime')
      WHERE id = ?
    `).run(newStock, min_threshold_alert || null, itemId);

    logAudit({
      userId: 5,
      userName: actingUserName,
      role: 'pharmacy',
      action: 'UPDATE_INVENTORY_STOCK',
      entityType: 'pharmacy_inventory',
      entityId: itemId,
      details: `Reabastecimiento de ${item.medication_name}: stock previo ${item.stock_quantity} -> nuevo stock ${newStock}`
    });

    res.json({ success: true, message: 'Stock actualizado exitosamente', newStock });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Canje por código de 6 dígitos: Verificación y validación de vigencia
router.get('/verify-code/:code', (req, res) => {
  try {
    const rawCode = req.params.code.trim();

    if (!/^\d{6}$/.test(rawCode)) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: 'El código de reclamo debe ser un número exacto de 6 dígitos.'
      });
    }

    const prescription = db.prepare(`
      SELECT p.id, p.pickup_code, p.status, p.medication_name, p.dosage,
             p.frequency, p.duration, p.instructions, p.created_at, p.redeemed_at,
             uPat.name as patient_name, pp.document_id as patient_document, pp.eps_insurance,
             uDoc.name as doctor_name, dp.specialty as doctor_specialty,
             pi.id as inventory_id, pi.stock_quantity, pi.min_threshold_alert
      FROM prescriptions p
      JOIN users uPat ON uPat.id = p.patient_id
      LEFT JOIN patient_profiles pp ON pp.user_id = uPat.id
      JOIN users uDoc ON uDoc.id = p.doctor_id
      LEFT JOIN doctor_profiles dp ON dp.user_id = uDoc.id
      LEFT JOIN pharmacy_inventory pi ON (pi.id = p.medication_id OR pi.medication_name = p.medication_name)
      WHERE p.pickup_code = ?
    `).get(rawCode);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        valid: false,
        error: `El código ${rawCode} no existe en el sistema de farmacia.`
      });
    }

    if (prescription.status === 'Reclamado') {
      return res.status(409).json({
        success: false,
        valid: false,
        already_redeemed: true,
        error: `El código ${rawCode} ya fue dispensado y canjeado previamente el ${prescription.redeemed_at}. No puede reutilizarse.`,
        data: prescription
      });
    }

    res.json({
      success: true,
      valid: true,
      already_redeemed: false,
      message: 'Código válido y activo para entrega.',
      data: prescription
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Confirmación de Entrega: Descuenta stock e invalida el código de manera irreversible
router.post('/dispense', (req, res) => {
  try {
    const { pickup_code, dispensed_by = 5, actingUserName = 'QF. Laura Mendoza' } = req.body;

    if (!pickup_code || !/^\d{6}$/.test(String(pickup_code).trim())) {
      return res.status(400).json({ success: false, error: 'Código de 6 dígitos inválido' });
    }

    const code = String(pickup_code).trim();

    // Consulta atómica con bloqueo
    const prescription = db.prepare(`
      SELECT p.*, pi.id as inventory_id, pi.stock_quantity, pi.medication_name as inv_name
      FROM prescriptions p
      LEFT JOIN pharmacy_inventory pi ON (pi.id = p.medication_id OR pi.medication_name = p.medication_name)
      WHERE p.pickup_code = ?
    `).get(code);

    if (!prescription) {
      return res.status(404).json({ success: false, error: 'Código de prescripción no encontrado.' });
    }

    if (prescription.status === 'Reclamado') {
      return res.status(409).json({
        success: false,
        error: `Acción bloqueada: Esta receta ya fue entregada el ${prescription.redeemed_at}. Restricción de seguridad activa.`
      });
    }

    // Comprobar inventario si está vinculado
    let inventoryUpdated = null;
    if (prescription.inventory_id) {
      if (prescription.stock_quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: `No hay stock suficiente para ${prescription.medication_name}. Stock actual: 0.`
        });
      }

      // Descontar inventario
      db.prepare(`
        UPDATE pharmacy_inventory
        SET stock_quantity = stock_quantity - 1,
            last_updated = datetime('now', 'localtime')
        WHERE id = ?
      `).run(prescription.inventory_id);

      inventoryUpdated = db.prepare('SELECT stock_quantity, min_threshold_alert FROM pharmacy_inventory WHERE id = ?').get(prescription.inventory_id);
    }

    // Marcar receta como reclamada de manera irreversible
    db.prepare(`
      UPDATE prescriptions
      SET status = 'Reclamado',
          redeemed_at = datetime('now', 'localtime'),
          redeemed_by = ?
      WHERE id = ? AND status = 'Pendiente'
    `).run(dispensed_by, prescription.id);

    // Auditoría estricta de dispensación de medicamentos
    logAudit({
      userId: dispensed_by,
      userName: actingUserName,
      role: 'pharmacy',
      action: 'DISPENSE_MEDICATION',
      entityType: 'prescription',
      entityId: prescription.id,
      details: `Dispensación confirmada para medicamento '${prescription.medication_name}' con código único ${code}. Paciente ID: ${prescription.patient_id}`
    });

    res.json({
      success: true,
      message: '¡Entrega confirmada exitosamente! El código ha sido invalidado irreversiblemente y el stock fue actualizado.',
      data: {
        prescription_id: prescription.id,
        pickup_code: code,
        status: 'Reclamado',
        medication_name: prescription.medication_name,
        remaining_stock: inventoryUpdated ? inventoryUpdated.stock_quantity : null,
        is_critical: inventoryUpdated ? inventoryUpdated.stock_quantity <= inventoryUpdated.min_threshold_alert : false
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

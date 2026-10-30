import { Router } from 'express';
import { db } from '../db/database.js';

const router = Router();

// Obtener todos los usuarios del sistema agrupados por rol para el selector de perfiles
router.get('/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.phone, u.avatar,
             dp.specialty, dp.license_number, dp.office_number,
             pp.eps_insurance, pp.document_id
      FROM users u
      LEFT JOIN doctor_profiles dp ON dp.user_id = u.id
      LEFT JOIN patient_profiles pp ON pp.user_id = u.id
      ORDER BY u.id ASC
    `).all();

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener detalle de usuario por ID
router.get('/users/:id', (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

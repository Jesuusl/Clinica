import { Router } from 'express';
import { db, logAudit } from '../db/database.js';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  extractToken,
  sanitizeEmail,
  isValidEmail,
  isValidPassword
} from '../utils/security.js';
import { broadcastEvent } from '../services/realtime.js';

const router = Router();

/**
 * Obtiene el perfil completo de un usuario sin exponer campos sensibles
 * @param {number} userId 
 * @returns {object|null}
 */
function getFullUserById(userId) {
  const user = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.phone, u.avatar, u.created_at,
           dp.specialty, dp.license_number, dp.office_number, dp.available_days, dp.available_hours,
           pp.document_id, pp.address, pp.eps_insurance, pp.policy_number,
           pp.blood_type, pp.allergies, pp.chronic_conditions,
           pp.emergency_contact_name, pp.emergency_contact_phone
    FROM users u
    LEFT JOIN doctor_profiles dp ON dp.user_id = u.id
    LEFT JOIN patient_profiles pp ON pp.user_id = u.id
    WHERE u.id = ?
  `).get(userId);

  if (!user) return null;

  if (user.role === 'doctor') {
    try {
      user.available_days = JSON.parse(user.available_days || '[]');
    } catch {
      user.available_days = [];
    }
    try {
      user.available_hours = JSON.parse(user.available_hours || '[]');
    } catch {
      user.available_hours = [];
    }
  }

  return user;
}

// 1. Inicio de sesión clínico con hash criptográfico
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar correo electrónico y contraseña clínica'
      });
    }

    const cleanEmail = sanitizeEmail(email);
    const userRow = db.prepare(`
      SELECT id, name, email, role, password_hash, salt
      FROM users
      WHERE LOWER(TRIM(email)) = ?
    `).get(cleanEmail);

    if (!userRow || !userRow.password_hash || !userRow.salt) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas. Por favor verifique su correo y contraseña clínica.'
      });
    }

    const isValid = verifyPassword(password, userRow.password_hash, userRow.salt);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas. Por favor verifique su correo y contraseña clínica.'
      });
    }

    const fullUser = getFullUserById(userRow.id);
    const token = generateToken(fullUser);

    logAudit({
      userId: userRow.id,
      userName: userRow.name,
      role: userRow.role,
      action: 'USER_LOGIN',
      entityType: 'auth',
      entityId: userRow.id,
      details: `Inicio de sesión exitoso en el sistema clínico para el rol ${userRow.role}`
    });

    res.json({
      success: true,
      message: 'Autenticación exitosa',
      data: {
        user: fullUser,
        token
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Registro público exclusivo para pacientes
router.post('/register-patient', (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      document_id,
      address,
      eps_insurance,
      policy_number,
      blood_type,
      allergies,
      chronic_conditions,
      emergency_contact_name,
      emergency_contact_phone,
      avatar
    } = req.body || {};

    // Validar campos obligatorios
    if (!name || !email || !password || !phone || !document_id || !address || !eps_insurance || !blood_type) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos faltantes: nombre, correo, contraseña, teléfono, documento, dirección, EPS y tipo de sangre'
      });
    }

    // Validar longitud mínima de contraseña
    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener una longitud mínima de 6 caracteres'
      });
    }

    // Sanitizar y validar correo
    const cleanEmail = sanitizeEmail(email);
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: 'El formato de correo electrónico no es válido'
      });
    }

    // Verificar si el correo ya existe
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(TRIM(email)) = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'El correo electrónico ya se encuentra registrado en el sistema clínico'
      });
    }

    // Hashear contraseña
    const { hash, salt } = hashPassword(password);

    // Inserción transaccional
    db.exec('BEGIN IMMEDIATE TRANSACTION;');
    let userId;
    try {
      const insertUser = db.prepare(`
        INSERT INTO users (name, email, password_hash, salt, role, phone, avatar)
        VALUES (?, ?, ?, ?, 'patient', ?, ?)
      `);
      const userRes = insertUser.run(
        name.trim(),
        cleanEmail,
        hash,
        salt,
        phone.trim(),
        avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80'
      );
      userId = Number(userRes.lastInsertRowid);

      const insertProfile = db.prepare(`
        INSERT INTO patient_profiles (
          user_id, document_id, phone, email, address, eps_insurance,
          policy_number, blood_type, allergies, chronic_conditions,
          emergency_contact_name, emergency_contact_phone
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertProfile.run(
        userId,
        document_id.trim(),
        phone.trim(),
        cleanEmail,
        address.trim(),
        eps_insurance.trim(),
        policy_number ? policy_number.trim() : 'POL-PARTICULAR',
        blood_type.trim(),
        allergies ? allergies.trim() : '',
        chronic_conditions ? chronic_conditions.trim() : '',
        emergency_contact_name ? emergency_contact_name.trim() : '',
        emergency_contact_phone ? emergency_contact_phone.trim() : ''
      );

      logAudit({
        userId,
        userName: name.trim(),
        role: 'patient',
        action: 'REGISTER_PATIENT',
        entityType: 'patient',
        entityId: userId,
        details: `Auto-registro de paciente: ${name.trim()} (Doc: ${document_id.trim()})`
      });

      db.exec('COMMIT;');
    } catch (txnError) {
      db.exec('ROLLBACK;');
      throw txnError;
    }

    const fullUser = getFullUserById(userId);
    const token = generateToken(fullUser);

    res.status(201).json({
      success: true,
      message: 'Paciente registrado exitosamente',
      data: {
        user: fullUser,
        token
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Creación de médicos especialistas exclusiva para el Administrador
router.post('/create-doctor', (req, res) => {
  try {
    const {
      adminUserId,
      name,
      email,
      password,
      phone,
      specialty,
      license_number,
      office_number,
      available_days,
      available_hours,
      avatar
    } = req.body || {};

    // Validar autorización del administrador (vía token o vía adminUserId)
    let authorizedAdmin = null;
    const token = extractToken(req);
    if (token) {
      const decoded = verifyToken(token);
      if (decoded && decoded.role === 'admin') {
        authorizedAdmin = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(decoded.id);
      }
    }

    if (!authorizedAdmin && adminUserId) {
      const adminCandidate = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(adminUserId);
      if (adminCandidate && adminCandidate.role === 'admin') {
        authorizedAdmin = adminCandidate;
      }
    }

    if (!authorizedAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Acceso no autorizado: Solo los administradores pueden dar de alta a médicos especialistas'
      });
    }

    // Validar campos obligatorios
    if (!name || !email || !password || !specialty || !license_number || !office_number) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos faltantes: nombre, correo, contraseña, especialidad, tarjeta profesional (license_number) y consultorio (office_number)'
      });
    }

    // Validar longitud mínima de contraseña
    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener una longitud mínima de 6 caracteres'
      });
    }

    // Sanitizar y validar correo
    const cleanEmail = sanitizeEmail(email);
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: 'El formato de correo electrónico no es válido'
      });
    }

    // Verificar si el correo ya existe
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(TRIM(email)) = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'El correo electrónico ya se encuentra registrado en el sistema clínico'
      });
    }

    // Días y horas de disponibilidad
    const daysJson = JSON.stringify(
      Array.isArray(available_days) && available_days.length > 0
        ? available_days
        : ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
    );

    const hoursJson = JSON.stringify(
      Array.isArray(available_hours) && available_hours.length > 0
        ? available_hours
        : ['08:00 - 12:00', '14:00 - 18:00']
    );

    // Hashear contraseña
    const { hash, salt } = hashPassword(password);

    // Inserción transaccional
    db.exec('BEGIN IMMEDIATE TRANSACTION;');
    let doctorId;
    try {
      const insertUser = db.prepare(`
        INSERT INTO users (name, email, password_hash, salt, role, phone, avatar)
        VALUES (?, ?, ?, ?, 'doctor', ?, ?)
      `);
      const userRes = insertUser.run(
        name.trim(),
        cleanEmail,
        hash,
        salt,
        phone ? phone.trim() : '+57 300 000 0000',
        avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=256&q=80'
      );
      doctorId = Number(userRes.lastInsertRowid);

      const insertProfile = db.prepare(`
        INSERT INTO doctor_profiles (user_id, specialty, license_number, office_number, available_days, available_hours)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertProfile.run(
        doctorId,
        specialty.trim(),
        license_number.trim(),
        office_number.trim(),
        daysJson,
        hoursJson
      );

      logAudit({
        userId: authorizedAdmin.id,
        userName: authorizedAdmin.name,
        role: 'admin',
        action: 'CREATE_DOCTOR',
        entityType: 'doctor',
        entityId: doctorId,
        details: `Alta de médico especialista: ${name.trim()} - Especialidad: ${specialty.trim()} - Licencia: ${license_number.trim()}`
      });

      db.exec('COMMIT;');
    } catch (txnError) {
      db.exec('ROLLBACK;');
      throw txnError;
    }

    const createdDoctor = getFullUserById(doctorId);

    // Notificar en tiempo real a administradores
    broadcastEvent('DOCTOR_PROVISIONED', createdDoctor, {
      targetRole: 'admin'
    });

    res.status(201).json({
      success: true,
      message: 'Médico especialista registrado exitosamente',
      data: createdDoctor
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Verificación de sesión / usuario actual autenticado
router.get('/me', (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Sesión no autorizada: token de autenticación no proporcionado'
      });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        error: 'Sesión inválida o expirada. Por favor inicie sesión nuevamente.'
      });
    }

    const user = getFullUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'El usuario asociado a esta sesión no existe en el sistema clínico'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Retrocompatibilidad: Obtener todos los usuarios del sistema (sin password_hash ni salt)
router.get('/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.phone, u.avatar, u.created_at,
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

// 6. Retrocompatibilidad: Obtener detalle de usuario por ID (sin password_hash ni salt)
router.get('/users/:id', (req, res) => {
  try {
    const user = getFullUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado en el sistema clínico' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

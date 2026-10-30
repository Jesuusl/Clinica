import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_DIR = path.join(__dirname, '../../data');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'clinica.db');
export const db = new DatabaseSync(DB_PATH);

// Habilitar foreign keys y performance
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    -- Tabla de Usuarios del Sistema
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('patient', 'admin', 'doctor', 'lab', 'pharmacy')),
      phone TEXT,
      avatar TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Perfil Clínico y Personal del Paciente
    CREATE TABLE IF NOT EXISTS patient_profiles (
      user_id INTEGER PRIMARY KEY,
      document_id TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT NOT NULL,
      eps_insurance TEXT NOT NULL,
      policy_number TEXT NOT NULL,
      blood_type TEXT NOT NULL,
      allergies TEXT DEFAULT '',
      chronic_conditions TEXT DEFAULT '',
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Perfil de Doctores y Disponibilidad
    CREATE TABLE IF NOT EXISTS doctor_profiles (
      user_id INTEGER PRIMARY KEY,
      specialty TEXT NOT NULL,
      license_number TEXT NOT NULL,
      office_number TEXT NOT NULL,
      available_days TEXT NOT NULL, -- JSON string de días disponibles e.g. ["Lunes","Miércoles","Viernes"]
      available_hours TEXT NOT NULL, -- JSON string e.g. ["08:00 - 12:00", "14:00 - 18:00"]
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Citas Médicas con Clasificación y Estados Controlados
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      specialty TEXT NOT NULL,
      reason_type TEXT NOT NULL, -- e.g. 'primera_vez', 'control_general', 'control_cardiaco', 'especialidad'
      reason_label TEXT NOT NULL,
      color_code TEXT NOT NULL, -- '#3b82f6' (general), '#10b981' (control cardíaco), '#f59e0b' (primera vez), '#8b5cf6' (especialidad)
      date TEXT NOT NULL, -- YYYY-MM-DD
      time_slot TEXT NOT NULL, -- HH:mm
      status TEXT NOT NULL DEFAULT 'Solicitada' CHECK(status IN ('Solicitada', 'Confirmada', 'Completada', 'Cancelada')),
      notes TEXT,
      admin_assigned_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES users(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id),
      FOREIGN KEY (admin_assigned_by) REFERENCES users(id)
    );

    -- Inventario de Farmacia en Tiempo Real
    CREATE TABLE IF NOT EXISTS pharmacy_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medication_name TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK(stock_quantity >= 0),
      min_threshold_alert INTEGER NOT NULL DEFAULT 10,
      unit TEXT NOT NULL DEFAULT 'unidades',
      presentation TEXT,
      last_updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Historia Clínica y Evoluciones
    CREATE TABLE IF NOT EXISTS medical_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER UNIQUE,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      diagnosis TEXT NOT NULL,
      clinical_notes TEXT NOT NULL,
      physical_exam TEXT,
      doctor_signature TEXT NOT NULL,
      doctor_license TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id),
      FOREIGN KEY (patient_id) REFERENCES users(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id)
    );

    -- Prescripciones con Código Único de 6 Dígitos Irreversible
    CREATE TABLE IF NOT EXISTS prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medical_record_id INTEGER NOT NULL,
      appointment_id INTEGER,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      medication_id INTEGER,
      medication_name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      frequency TEXT NOT NULL,
      duration TEXT NOT NULL,
      instructions TEXT,
      pickup_code TEXT UNIQUE NOT NULL, -- Restricción estricta DB: 6 dígitos únicos
      status TEXT NOT NULL DEFAULT 'Pendiente' CHECK(status IN ('Pendiente', 'Reclamado')),
      redeemed_at TEXT,
      redeemed_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (medical_record_id) REFERENCES medical_records(id),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id),
      FOREIGN KEY (patient_id) REFERENCES users(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id),
      FOREIGN KEY (medication_id) REFERENCES pharmacy_inventory(id),
      FOREIGN KEY (redeemed_by) REFERENCES users(id)
    );

    -- Órdenes y Resultados de Laboratorio
    CREATE TABLE IF NOT EXISTS lab_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medical_record_id INTEGER,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      test_type TEXT NOT NULL,
      test_category TEXT NOT NULL, -- 'Sangre', 'Orina', 'Imágenes / Rayos X', 'Cardiología'
      instructions TEXT,
      status TEXT NOT NULL DEFAULT 'Pendiente' CHECK(status IN ('Pendiente', 'Completado')),
      result_notes TEXT,
      result_values TEXT,
      attachment_name TEXT,
      attachment_url TEXT,
      completed_by INTEGER,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (medical_record_id) REFERENCES medical_records(id),
      FOREIGN KEY (patient_id) REFERENCES users(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id),
      FOREIGN KEY (completed_by) REFERENCES users(id)
    );

    -- Remisiones Médicas (a Control o Especialista)
    CREATE TABLE IF NOT EXISTS medical_referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medical_record_id INTEGER NOT NULL,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      referral_type TEXT NOT NULL CHECK(referral_type IN ('control', 'specialist')),
      target_specialty TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'Normal' CHECK(priority IN ('Normal', 'Prioritaria', 'Urgente')),
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pendiente' CHECK(status IN ('Pendiente', 'Procesada')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (medical_record_id) REFERENCES medical_records(id),
      FOREIGN KEY (patient_id) REFERENCES users(id),
      FOREIGN KEY (doctor_id) REFERENCES users(id)
    );

    -- Bitácora de Auditoría y Seguridad
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT NOT NULL,
      role TEXT NOT NULL,
      action TEXT NOT NULL, -- 'ACCESS_MEDICAL_RECORD', 'DISPENSE_MEDICATION', 'UPDATE_PROFILE', 'CONFIRM_APPOINTMENT', etc.
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT NOT NULL,
      ip_address TEXT DEFAULT '127.0.0.1',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
}

/**
 * Genera un código de 6 dígitos único garantizado por consulta y restricción DB
 */
export function generateUniquePickupCode() {
  const checkStmt = db.prepare('SELECT id FROM prescriptions WHERE pickup_code = ?');
  let code = '';
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 100) {
    attempts++;
    // Número aleatorio de 6 dígitos: 100000 a 999999
    code = Math.floor(100000 + Math.random() * 900000).toString();
    const row = checkStmt.get(code);
    if (!row) {
      exists = false;
    }
  }

  if (exists) {
    throw new Error('No se pudo generar un código único de 6 dígitos tras múltiples intentos.');
  }

  return code;
}

/**
 * Registra eventos de seguridad y auditoría en la base de datos
 */
export function logAudit({ userId, userName, role, action, entityType, entityId, details, ipAddress = '127.0.0.1' }) {
  const stmt = db.prepare(`
    INSERT INTO audit_logs (user_id, user_name, role, action, entity_type, entity_id, details, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `);
  stmt.run(userId || null, userName || 'Anónimo', role || 'unknown', action, entityType, String(entityId || ''), details, ipAddress);
}

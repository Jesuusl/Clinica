import crypto from 'node:crypto';

// Secreto para firma de tokens (configurable mediante variable de entorno)
const AUTH_SECRET = process.env.AUTH_SECRET || 'saludplus-clinica-seguridad-2026-secret-key-prod';

/**
 * Genera un hash criptográfico scrypt con salt único
 * @param {string} password 
 * @param {string} [existingSalt] 
 * @returns {{ hash: string, salt: string }}
 */
export function hashPassword(password, existingSalt = null) {
  if (!password || typeof password !== 'string') {
    throw new Error('La contraseña debe ser una cadena de texto válida');
  }
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

/**
 * Valida una contraseña contra un hash y salt almacenados usando comparación en tiempo constante
 * @param {string} password 
 * @param {string} storedHash 
 * @param {string} storedSalt 
 * @returns {boolean}
 */
export function verifyPassword(password, storedHash, storedSalt) {
  if (!password || !storedHash || !storedSalt) {
    return false;
  }
  try {
    const calculatedHash = crypto.scryptSync(password, storedSalt, 64).toString('hex');
    const hashBuffer = Buffer.from(calculatedHash, 'hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');
    if (hashBuffer.length !== storedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(hashBuffer, storedBuffer);
  } catch {
    return false;
  }
}

/**
 * Genera un token firmado HMAC-SHA256 para el usuario
 * @param {object} user 
 * @param {number} [expiresInMs=86400000] - 24 horas por defecto
 * @returns {string}
 */
export function generateToken(user, expiresInMs = 24 * 60 * 60 * 1000) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    iat: Date.now(),
    exp: Date.now() + expiresInMs
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Verifica un token firmado y retorna el payload si es válido
 * @param {string} token 
 * @returns {object|null}
 */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [payloadB64, signature] = parts;

  try {
    const expectedSignature = crypto
      .createHmac('sha256', AUTH_SECRET)
      .update(payloadB64)
      .digest('base64url');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);

    if (payload.exp && payload.exp < Date.now()) {
      return null; // Token expirado
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extrae el token de la solicitud HTTP (Authorization header, x-auth-token o query param)
 * @param {import('express').Request} req 
 * @returns {string|null}
 */
export function extractToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === 'string') {
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }
    return authHeader.trim();
  }

  const customToken = req.headers['x-auth-token'];
  if (customToken && typeof customToken === 'string') {
    return customToken.trim();
  }

  if (req.query && req.query.token && typeof req.query.token === 'string') {
    return req.query.token.trim();
  }

  return null;
}

/**
 * Sanitiza un objeto de usuario eliminando hashes, salts y campos sensibles
 * @param {object} user 
 * @returns {object}
 */
export function sanitizeUser(user) {
  if (!user) return null;
  const safeUser = { ...user };
  delete safeUser.password_hash;
  delete safeUser.salt;
  return safeUser;
}

/**
 * Sanitiza una dirección de correo electrónico
 * @param {string} email 
 * @returns {string}
 */
export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Valida formato estándar de correo electrónico
 * @param {string} email 
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}

/**
 * Valida longitud mínima de contraseña (mínimo 6 caracteres)
 * @param {string} password 
 * @returns {boolean}
 */
export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

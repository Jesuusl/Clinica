import crypto from 'node:crypto';
import { extractToken, verifyToken } from '../utils/security.js';

/**
 * Almacenamiento centralizado en memoria de conexiones SSE activas.
 * Cada elemento almacena: { id, res, req, userId, role, connectedAt, heartbeatTimer }
 */
export const clients = new Set();

/**
 * Maneja una nueva conexión entrante de Server-Sent Events (SSE).
 * Configura cabeceras SSE, autentica mediante token (query o header),
 * envía mensaje de bienvenida CONNECTED, activa heartbeat cada 25s y
 * asegura la desconexión limpia.
 * 
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
export function handleSSEConnection(req, res) {
  // 1. Extracción y verificación de token JWT/HMAC si está presente
  let userId = null;
  let role = 'guest';

  const token = extractToken(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      userId = decoded.id ?? null;
      role = decoded.role ?? 'user';
    }
  }

  // Soporte adicional por query params para roles o usuarios explícitos (útil en testing y clientes ligeros)
  if (userId === null && req.query?.userId) {
    const parsedId = Number(req.query.userId);
    if (!Number.isNaN(parsedId)) {
      userId = parsedId;
    }
  }
  if ((role === 'guest' || !role) && req.query?.role) {
    role = String(req.query.role);
  }

  // 2. Establecer cabeceras obligatorias para SSE y CORS
  const origin = req.headers.origin || '*';
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    'X-Accel-Buffering': 'no'
  });

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const clientId = crypto.randomUUID();

  // 3. Crear registro del cliente conectado
  const client = {
    id: clientId,
    res,
    req,
    userId,
    role,
    connectedAt: new Date().toISOString(),
    heartbeatTimer: null
  };

  // 4. Heartbeat / Keep-alive cada 25 segundos (: ping\n\n) para prevenir timeouts de proxys y navegadores
  client.heartbeatTimer = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(client.heartbeatTimer);
      clients.delete(client);
    }
  }, 25000);

  // Evitar que el timer mantenga el proceso vivo si no hay otras actividades
  if (client.heartbeatTimer?.unref) {
    client.heartbeatTimer.unref();
  }

  clients.add(client);

  // 5. Enviar mensaje inicial de confirmación CONNECTED con timestamp
  const initialPayload = {
    event: 'CONNECTED',
    data: {
      message: 'Conexión a eventos en tiempo real SSE establecida exitosamente',
      clientId,
      userId,
      role
    },
    timestamp: new Date().toISOString()
  };

  res.write(`event: CONNECTED\ndata: ${JSON.stringify(initialPayload)}\n\n`);

  // 6. Manejo de desconexión limpia del cliente
  req.on('close', () => {
    if (client.heartbeatTimer) {
      clearInterval(client.heartbeatTimer);
    }
    clients.delete(client);
  });
}

/**
 * Emite un evento en tiempo real a los clientes conectados.
 * Soporta filtrado opcional por rol ('targetRole' o 'targetRoles') y/o por usuario ('targetUserId' o 'targetUserIds').
 * 
 * Formato SSE estándar:
 * event: ${eventType}
 * data: ${JSON.stringify({ event: eventType, data: payload, timestamp: ... })}
 * 
 * @param {string} eventType Nombre o tipo del evento SSE
 * @param {any} payload Información o entidad asociada al evento
 * @param {object} [options={}] Opciones de filtrado
 * @param {string|string[]} [options.targetRole] Rol o lista de roles objetivo
 * @param {string|string[]} [options.targetRoles] Roles objetivo
 * @param {number|number[]} [options.targetUserId] ID o lista de IDs de usuario objetivo
 * @param {number|number[]} [options.targetUserIds] IDs de usuario objetivo
 * @returns {number} Cantidad de clientes a los que se les transmitió el evento
 */
export function broadcastEvent(eventType, payload, options = {}) {
  const { targetRole, targetRoles, targetUserId, targetUserIds } = options;

  const roles = [];
  if (targetRole) {
    roles.push(...(Array.isArray(targetRole) ? targetRole : [targetRole]));
  }
  if (targetRoles) {
    roles.push(...(Array.isArray(targetRoles) ? targetRoles : [targetRoles]));
  }

  const userIds = [];
  if (targetUserId !== undefined && targetUserId !== null) {
    const rawIds = Array.isArray(targetUserId) ? targetUserId : [targetUserId];
    userIds.push(...rawIds.map(Number).filter(n => !Number.isNaN(n)));
  }
  if (targetUserIds) {
    const rawIds = Array.isArray(targetUserIds) ? targetUserIds : [targetUserIds];
    userIds.push(...rawIds.map(Number).filter(n => !Number.isNaN(n)));
  }

  const hasFilter = roles.length > 0 || userIds.length > 0;
  const isoTimestamp = new Date().toISOString();

  const formattedEvent = `event: ${eventType}\ndata: ${JSON.stringify({
    event: eventType,
    data: payload,
    timestamp: isoTimestamp
  })}\n\n`;

  let sentCount = 0;

  for (const client of clients) {
    if (hasFilter) {
      const clientUserId = client.userId !== null && client.userId !== undefined ? Number(client.userId) : null;
      const clientRole = client.role;

      // Coincidencia directa por ID de usuario
      const matchesUser = userIds.length > 0 && clientUserId !== null && userIds.includes(clientUserId);

      // Coincidencia por rol (si es rol 'patient' y hay restricción de usuario, respetar privacidad)
      let matchesRole = false;
      if (roles.length > 0 && clientRole && roles.includes(clientRole)) {
        if (clientRole === 'patient' && userIds.length > 0 && clientUserId !== null) {
          matchesRole = userIds.includes(clientUserId);
        } else {
          matchesRole = true;
        }
      }

      if (!matchesUser && !matchesRole) {
        continue;
      }
    }

    try {
      client.res.write(formattedEvent);
      sentCount++;
    } catch {
      if (client.heartbeatTimer) {
        clearInterval(client.heartbeatTimer);
      }
      clients.delete(client);
    }
  }

  return sentCount;
}

/**
 * Retorna la cantidad de clientes actualmente conectados
 * @returns {number}
 */
export function getConnectedClientsCount() {
  return clients.size;
}

/**
 * Limpia todas las conexiones activas (útil para pruebas y reinicio del servicio)
 */
export function closeAllConnections() {
  for (const client of clients) {
    if (client.heartbeatTimer) {
      clearInterval(client.heartbeatTimer);
    }
    try {
      client.res.end();
    } catch {}
  }
  clients.clear();
}

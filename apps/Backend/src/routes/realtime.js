import { Router } from 'express';
import { handleSSEConnection, getConnectedClientsCount } from '../services/realtime.js';

const router = Router();

/**
 * Suscripción a eventos en tiempo real mediante Server-Sent Events (SSE)
 * Acepta token de autenticación en:
 * - Query param: ?token=...
 * - Header: Authorization: Bearer ...
 */
router.get('/events', (req, res) => {
  handleSSEConnection(req, res);
});

/**
 * Diagnóstico y estado del canal en tiempo real
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    channel: 'Server-Sent Events (SSE)',
    active_connections: getConnectedClientsCount(),
    timestamp: new Date().toISOString()
  });
});

export default router;

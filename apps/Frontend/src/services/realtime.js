/**
 * Servicio de Tiempo Real con Server-Sent Events (SSE) - SaludPlus Hospital
 * 
 * Gestiona la conexión persistente con /api/realtime/events,
 * despacho reactivo de eventos hacia módulos del frontend,
 * reconexión con backoff y formateo de notificaciones clínicas.
 */

// Tipos de eventos soportados desde el backend
export const SSE_EVENTS = [
  'CONNECTED',
  'APPOINTMENT_REQUESTED',
  'APPOINTMENT_UPDATED',
  'PRESCRIPTION_CREATED',
  'MEDICATION_DISPENSED',
  'LOW_STOCK_ALERT',
  'LAB_RESULT_READY',
  'DOCTOR_PROVISIONED'
];

/**
 * Genera un tono de audio discreto y clínico usando Web Audio API
 * @param {'info' | 'success' | 'warning' | 'error'} type 
 */
export function playNotificationTone(type = 'info') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;

    if (type === 'warning' || type === 'error') {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(330, now + 0.18);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } else {
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    }

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 500);
  } catch {
    // Si el navegador bloquea audio sin interacción previa, ignorar silenciosamente
  }
}

/**
 * Formatea una fecha a tiempo relativo amigable en español
 * @param {string | Date} dateInput 
 * @returns {string}
 */
export function formatRelativeTime(dateInput) {
  if (!dateInput) return 'Hace un momento';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return 'Hace un momento';

  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 20) return 'Hace un momento';
  if (diffInSeconds < 60) return `Hace ${diffInSeconds}s`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `Hace ${diffInMinutes}m`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    const hours = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');
    return `Hoy ${hours}:${mins}`;
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month}`;
}

/**
 * Traduce un evento SSE en un objeto de notificación visual con título, mensaje,
 * severidad, tipo de icono y metadatos clínicos.
 * 
 * @param {string} eventType 
 * @param {any} data 
 * @param {string} timestamp 
 * @returns {{ id: string, type: string, title: string, message: string, severity: 'info'|'success'|'warning'|'error', iconType: string, timestamp: string, read: boolean, data: any }}
 */
export function buildNotificationFromEvent(eventType, data = {}, timestamp = new Date().toISOString()) {
  const notifId = `sse_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  let title = 'Notificación del Sistema';
  let message = 'Nueva actualización clínica recibida.';
  let severity = 'info';
  let iconType = 'bell';

  switch (eventType) {
    case 'CONNECTED':
      title = '🟢 Conexión en Vivo Activa';
      message = data.message || 'Canal de eventos en tiempo real SSE sincronizado.';
      severity = 'info';
      iconType = 'activity';
      break;

    case 'APPOINTMENT_REQUESTED':
      title = 'Nueva Solicitud de Cita';
      message = `El paciente ${data.patient_name || 'Paciente'} solicitó turno con ${data.doctor_name || 'especialista'} para el ${data.appointment_date || 'próximo turno'} (${data.time_slot || 'hora'}).`;
      severity = 'info';
      iconType = 'calendar';
      break;

    case 'APPOINTMENT_UPDATED': {
      const isConfirmed = data.status === 'Confirmada';
      const isCancelled = data.status === 'Cancelada';
      title = isConfirmed ? 'Cita Confirmada' : (isCancelled ? 'Cita Cancelada' : `Cita Actualizada: ${data.status}`);
      message = `Cita con ${data.doctor_name || 'Médico'} el ${data.appointment_date || ''} (${data.time_slot || ''}) cambió a estado "${data.status}".`;
      severity = isConfirmed ? 'success' : (isCancelled ? 'error' : 'info');
      iconType = 'calendar';
      break;
    }

    case 'PRESCRIPTION_CREATED':
      title = 'Nueva Fórmula Médica Prescrita';
      message = `Receta para ${data.patient_name || 'Paciente'}: ${data.medication_name || 'Medicamento'} (${data.dosage || 'Dosis'}). Código de reclamo: ${data.pickup_code || '6 dígitos'}.`;
      severity = 'success';
      iconType = 'pill';
      break;

    case 'MEDICATION_DISPENSED':
      title = 'Medicamento Dispensado';
      message = `Se entregó exitosamente "${data.medication_name || 'fármaco'}" a ${data.patient_name || 'el paciente'}. Stock descontado.`;
      severity = 'success';
      iconType = 'check';
      break;

    case 'LOW_STOCK_ALERT':
      title = '⚠️ Alerta de Stock Crítico';
      message = `El medicamento "${data.medication_name}" cuenta con solo ${data.current_stock} unidad(es) (Mínimo de seguridad: ${data.min_threshold}).`;
      severity = 'warning';
      iconType = 'alert';
      break;

    case 'LAB_RESULT_READY':
      title = 'Resultado de Laboratorio Publicado';
      message = `Se cargaron los resultados de "${data.test_type || 'Examen'}" para el paciente ${data.patient_name || 'titular'}.`;
      severity = 'info';
      iconType = 'lab';
      break;

    case 'DOCTOR_PROVISIONED':
      title = 'Nuevo Médico Habilitado';
      message = `Dr./Dra. ${data.name || 'Especialista'} (${data.specialty || 'General'}) ha sido dado de alta en la plataforma.`;
      severity = 'info';
      iconType = 'user-check';
      break;

    default:
      title = `Evento: ${eventType}`;
      message = typeof data === 'string' ? data : (data?.message || 'Actualización clínica en tiempo real.');
      severity = 'info';
      iconType = 'bell';
  }

  return {
    id: notifId,
    type: eventType,
    title,
    message,
    severity,
    iconType,
    timestamp,
    read: false,
    data
  };
}

class RealtimeClient {
  constructor() {
    /** @type {EventSource | null} */
    this.eventSource = null;
    this.isConnected = false;
    this.connectionState = 'disconnected'; // 'disconnected' | 'connecting' | 'connected' | 'error'
    this.currentUrl = null;
    this.lastToken = null;
    this.currentUser = null;

    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
    /** @type {Set<Function>} */
    this.statusListeners = new Set();

    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 15000;
  }

  /**
   * Conecta al endpoint SSE del backend
   * @param {string | null} [token] Token JWT/HMAC
   * @param {object | null} [user] Usuario activo
   * @param {boolean} [force=false] Forzar reconexión aunque los parámetros no cambien
   */
  connect(token = null, user = null, force = false) {
    const activeToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('saludplus_token') : null);
    
    // Evitar reconexión redundante si ya está conectado con los mismos parámetros
    const tokenChanged = activeToken !== this.lastToken;
    const userChanged = user?.id !== this.currentUser?.id || user?.role !== this.currentUser?.role;

    if (!force && this.eventSource && this.isConnected && !tokenChanged && !userChanged) {
      return;
    }

    this.lastToken = activeToken;
    this.currentUser = user;

    // Limpiar conexión previa si existía
    this._closeConnection();

    // Construir URL con parámetros
    const params = new URLSearchParams();
    if (activeToken) {
      params.append('token', activeToken);
    }
    if (user?.id) {
      params.append('userId', String(user.id));
    }
    if (user?.role) {
      params.append('role', String(user.role));
    }

    const queryString = params.toString();
    const url = `/api/realtime/events${queryString ? `?${queryString}` : ''}`;
    this.currentUrl = url;

    this._setConnectionState('connecting');

    try {
      this.eventSource = new EventSource(url);

      // Evento nativo de apertura de conexión SSE
      this.eventSource.onopen = () => {
        this.reconnectAttempts = 0;
        this._setConnectionState('connected');
      };

      // Manejador genérico para fallos de red
      this.eventSource.onerror = (err) => {
        // Si el EventSource está cerrado o falló la conexión
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this._setConnectionState('error');
          this._scheduleReconnect();
        } else if (this.eventSource?.readyState === EventSource.CONNECTING) {
          this._setConnectionState('connecting');
        }
      };

      // Registrar los eventos clínicos conocidos
      SSE_EVENTS.forEach(eventType => {
        this.eventSource.addEventListener(eventType, (event) => {
          this._handleIncomingEvent(eventType, event.data);
        });
      });

      // Manejador fallback onmessage
      this.eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          const type = parsed.event || 'message';
          this._handleIncomingEvent(type, event.data);
        } catch {
          // Ignorar mensajes sin formato JSON (ej. heartbeats : ping)
        }
      };

    } catch (err) {
      console.error('[RealtimeClient] Error instanciando EventSource:', err);
      this._setConnectionState('error');
      this._scheduleReconnect();
    }
  }

  /**
   * Cierra de manera limpia y definitiva la suscripción SSE
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this._closeConnection();
    this.lastToken = null;
    this.currentUser = null;
    this._setConnectionState('disconnected');
  }

  /**
   * Suscribe un callback a un tipo de evento SSE específico o a todos ('*')
   * @param {string} eventType Tipo de evento o '*'
   * @param {Function} callback Función receptora (eventObject) => void
   * @returns {() => void} Función para desuscribirse
   */
  subscribe(eventType, callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);

    return () => {
      const set = this.listeners.get(eventType);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  /**
   * Suscribe a los cambios de estado de conexión (conectado, desconectado, reconectando)
   * @param {(status: { isConnected: boolean, state: string }) => void} callback 
   * @returns {() => void}
   */
  onStatusChange(callback) {
    if (typeof callback !== 'function') return () => {};
    this.statusListeners.add(callback);
    // Notificar de inmediato con el estado actual
    callback({
      isConnected: this.isConnected,
      state: this.connectionState
    });
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Retorna si el cliente está conectado en vivo
   * @returns {boolean}
   */
  getIsConnected() {
    return this.isConnected;
  }

  /**
   * Retorna el estado textual de la conexión
   * @returns {'disconnected' | 'connecting' | 'connected' | 'error'}
   */
  getConnectionState() {
    return this.connectionState;
  }

  /* ------------------- MÉTODOS PRIVADOS ------------------- */

  _closeConnection() {
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {}
      this.eventSource = null;
    }
  }

  _setConnectionState(newState) {
    this.connectionState = newState;
    this.isConnected = newState === 'connected';

    const statusObj = {
      isConnected: this.isConnected,
      state: this.connectionState,
      timestamp: new Date().toISOString()
    };

    this.statusListeners.forEach(cb => {
      try {
        cb(statusObj);
      } catch (err) {
        console.error('[RealtimeClient] Error en status listener:', err);
      }
    });
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.connectionState !== 'connected') {
        this.connect(this.lastToken, this.currentUser, true);
      }
    }, delay);
  }

  _handleIncomingEvent(eventType, rawData) {
    let parsedData = {};
    let timestamp = new Date().toISOString();

    try {
      if (typeof rawData === 'string') {
        const json = JSON.parse(rawData);
        parsedData = json.data !== undefined ? json.data : json;
        timestamp = json.timestamp || timestamp;
      } else if (typeof rawData === 'object' && rawData !== null) {
        parsedData = rawData.data !== undefined ? rawData.data : rawData;
        timestamp = rawData.timestamp || timestamp;
      }
    } catch {
      parsedData = { message: String(rawData) };
    }

    // Objeto normalizado del evento
    const eventObject = {
      type: eventType,
      data: parsedData,
      timestamp,
      raw: rawData
    };

    // Despachar a oyentes del tipo de evento específico
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).forEach(cb => {
        try {
          cb(eventObject);
        } catch (err) {
          console.error(`[RealtimeClient] Error en callback de evento ${eventType}:`, err);
        }
      });
    }

    // Despachar a oyentes globales '*'
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach(cb => {
        try {
          cb(eventObject);
        } catch (err) {
          console.error('[RealtimeClient] Error en callback global:', err);
        }
      });
    }
  }
}

// Instancia única (Singleton) para toda la aplicación
export const realtimeService = new RealtimeClient();
export default realtimeService;

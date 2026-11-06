import { realtimeService } from './realtime';

const API_BASE = '/api';

export function getStoredToken() {
  try {
    return localStorage.getItem('saludplus_token');
  } catch {
    return null;
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('saludplus_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  try {
    if (token) localStorage.setItem('saludplus_token', token);
    if (user) localStorage.setItem('saludplus_user', JSON.stringify(user));
  } catch (err) {
    console.error('Error saving session to localStorage:', err);
  }
}

export function clearSession() {
  try {
    localStorage.removeItem('saludplus_token');
    localStorage.removeItem('saludplus_user');
  } catch (err) {
    console.error('Error clearing session from localStorage:', err);
  }
}

async function fetchJSON(url, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers
  });

  const data = await res.json();
  if (!res.ok || data.success === false) {
    const errorMsg = data.error || `Error en la petición: ${res.statusText}`;
    throw new Error(errorMsg);
  }
  return data;
}

export const DEMO_ACCOUNTS = [
  {
    role: 'admin',
    roleLabel: 'Administración / Recepción',
    name: 'Carlos Ramos',
    email: 'recepcion@clinicasalud.com',
    badge: 'Control Central & Doctores'
  },
  {
    role: 'doctor',
    roleLabel: 'Cardiología Especializada',
    name: 'Dra. Valentina Soto',
    email: 'vsoto@clinicasalud.com',
    badge: 'Consultas & Prescripciones'
  },
  {
    role: 'doctor',
    roleLabel: 'Medicina General',
    name: 'Dr. Alejandro Ruiz',
    email: 'aruiz@clinicasalud.com',
    badge: 'Atención Primaria'
  },
  {
    role: 'patient',
    roleLabel: 'Paciente Titular',
    name: 'Juan Pérez Gómez',
    email: 'juan.perez@email.com',
    badge: 'Historial & Código de Farmacia'
  },
  {
    role: 'patient',
    roleLabel: 'Paciente',
    name: 'María Gómez Londoño',
    email: 'maria.gomez@email.com',
    badge: 'Agendamiento Web'
  },
  {
    role: 'lab',
    roleLabel: 'Laboratorio Clínico',
    name: 'Lic. Roberto Díaz',
    email: 'lab@clinicasalud.com',
    badge: 'Resultados Inmediatos'
  },
  {
    role: 'pharmacy',
    roleLabel: 'Farmacia Hospitalaria',
    name: 'QF. Laura Mendoza',
    email: 'farmacia@clinicasalud.com',
    badge: 'Despacho Código 6 Dígitos'
  }
];

export const api = {
  // Autenticación y Cuentas
  login: async (credentials) => {
    const res = await fetchJSON('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    if (res.data?.token) {
      setSession(res.data.token, res.data.user);
    }
    return res;
  },

  // Inicio de sesión seguro con perfiles demo autorizados (sin credenciales hardcodeadas)
  demoLogin: async (email) => {
    const res = await fetchJSON('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    if (res.data?.token) {
      setSession(res.data.token, res.data.user);
    }
    return res;
  },

  registerPatient: async (patientData) => {
    const res = await fetchJSON('/auth/register-patient', {
      method: 'POST',
      body: JSON.stringify(patientData)
    });
    if (res.data?.token) {
      setSession(res.data.token, res.data.user);
    }
    return res;
  },

  createDoctor: async (doctorData) => {
    return fetchJSON('/auth/create-doctor', {
      method: 'POST',
      body: JSON.stringify(doctorData)
    });
  },

  getMe: () => fetchJSON('/auth/me'),

  logout: () => {
    try {
      realtimeService.disconnect();
    } catch {}
    clearSession();
  },

  realtime: realtimeService,
  getStoredToken,
  getStoredUser,
  setSession,
  clearSession,

  // Usuarios y roles
  getUsers: () => fetchJSON('/auth/users'),
  getUserById: (id) => fetchJSON(`/auth/users/${id}`),

  // Módulo de Pacientes
  getPatientProfile: (id) => fetchJSON(`/patients/${id}/profile`),
  updatePatientProfile: (id, payload) => fetchJSON(`/patients/${id}/profile`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),
  getPatientRecords: (id, auditor = {}) => {
    const query = new URLSearchParams(auditor).toString();
    return fetchJSON(`/patients/${id}/medical-records?${query}`);
  },
  getPatientPrescriptions: (id) => fetchJSON(`/patients/${id}/prescriptions`),
  getPatientLabOrders: (id) => fetchJSON(`/patients/${id}/lab-orders`),

  // Citas y Agenda
  getAppointments: (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return fetchJSON(`/appointments?${query}`);
  },
  getNextAvailableSlot: (params) => {
    const query = new URLSearchParams(params).toString();
    return fetchJSON(`/appointments/next-available?${query}`);
  },
  createAppointment: (payload) => fetchJSON('/appointments', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  updateAppointmentStatus: (id, payload) => fetchJSON(`/appointments/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),

  // Doctores
  getDoctors: () => fetchJSON('/doctors'),
  updateDoctorAvailability: (id, payload) => fetchJSON(`/doctors/${id}/availability`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),

  // Consulta Médica
  submitConsultation: (payload) => fetchJSON('/clinical/consultation', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  // Laboratorio
  getLabOrders: (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return fetchJSON(`/laboratory/orders?${query}`);
  },
  submitLabResult: (id, payload) => fetchJSON(`/laboratory/orders/${id}/result`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),

  // Farmacia
  getPharmacyInventory: () => fetchJSON('/pharmacy/inventory'),
  updatePharmacyStock: (id, payload) => fetchJSON(`/pharmacy/inventory/${id}/stock`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),
  verifyPharmacyCode: (code) => fetchJSON(`/pharmacy/verify-code/${code}`),
  dispenseMedication: (payload) => fetchJSON('/pharmacy/dispense', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  // Auditoría y Trazabilidad
  getAuditLogs: (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return fetchJSON(`/audit-logs?${query}`);
  }
};

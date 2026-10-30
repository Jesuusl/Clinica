const API_BASE = '/api';

async function fetchJSON(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  const data = await res.json();
  if (!res.ok || data.success === false) {
    const errorMsg = data.error || `Error en la petición: ${res.statusText}`;
    throw new Error(errorMsg);
  }
  return data;
}

export const api = {
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

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { realtimeService } from '../services/realtime';
import {
  ShieldCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Users,
  FileText,
  UserCheck,
  Search,
  Filter,
  Eye,
  EyeOff,
  Building,
  UserPlus,
  Lock,
  Mail,
  Phone
} from 'lucide-react';

export default function AdminModule({ adminUser, onShowToast, onOpenAudit, lastRealtimeEvent }) {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [activeTab, setActiveTab] = useState('citas'); // 'citas', 'doctores', 'historias'
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Modal para Registro de Nuevo Médico Especialista
  const [showCreateDoctorModal, setShowCreateDoctorModal] = useState(false);
  const [creatingDoctor, setCreatingDoctor] = useState(false);
  const [showDoctorPassword, setShowDoctorPassword] = useState(false);
  const [doctorForm, setDoctorForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    specialty: 'Cardiología',
    license_number: '',
    office_number: '',
    available_days: ['Lunes', 'Miércoles', 'Viernes'],
    available_hours: ['08:00 - 12:00', '14:00 - 18:00'],
    avatar: ''
  });

  // Modal para Optimizar Cita Más Próxima
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [selectedApptToOptimize, setSelectedApptToOptimize] = useState(null);
  const [optimizedSlot, setOptimizedSlot] = useState(null);
  const [optimizing, setOptimizing] = useState(false);

  // Modal para ver historia clínica de un paciente con auditoría
  const [selectedPatientHistory, setSelectedPatientHistory] = useState(null);
  const [patientRecords, setPatientRecords] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const loadData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [apptsRes, docsRes, usersRes] = await Promise.all([
        api.getAppointments(),
        api.getDoctors(),
        api.getUsers()
      ]);

      setAppointments(apptsRes.data);
      setDoctors(docsRes.data);
      setPatients(usersRes.data.filter(u => u.role === 'patient'));
    } catch (err) {
      onShowToast(err.message, 'error');
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();

    // Suscripción a eventos SSE de citas y altas médicas en tiempo real
    const unsubReq = realtimeService.subscribe('APPOINTMENT_REQUESTED', () => {
      void loadData(true);
    });
    const unsubUpd = realtimeService.subscribe('APPOINTMENT_UPDATED', () => {
      void loadData(true);
    });
    const unsubDoc = realtimeService.subscribe('DOCTOR_PROVISIONED', () => {
      void loadData(true);
    });

    return () => {
      unsubReq();
      unsubUpd();
      unsubDoc();
    };
  }, []);

  // Actualización reactiva por prop del orquestador
  useEffect(() => {
    if (!lastRealtimeEvent) return;
    if (
      lastRealtimeEvent.type === 'APPOINTMENT_REQUESTED' ||
      lastRealtimeEvent.type === 'APPOINTMENT_UPDATED' ||
      lastRealtimeEvent.type === 'DOCTOR_PROVISIONED'
    ) {
      void loadData(true);
    }
  }, [lastRealtimeEvent]);

  // Cambiar estado de la cita (Confirmar o Cancelar)
  const handleUpdateStatus = async (appointmentId, newStatus) => {
    try {
      await api.updateAppointmentStatus(appointmentId, {
        status: newStatus,
        actingUserId: adminUser?.id || 1,
        actingUserName: adminUser?.name || 'Administración Central',
        actingRole: 'admin'
      });

      onShowToast(`Cita #${appointmentId} actualizada a estado '${newStatus}'`, 'success');
      await loadData();
    } catch (err) {
      onShowToast(err.message, 'error');
    }
  };

  // Abrir optimizador de tiempo
  const handleOpenOptimizer = async (appt) => {
    setSelectedApptToOptimize(appt);
    setOptimizedSlot(null);
    setShowOptimizeModal(true);
    setOptimizing(true);

    try {
      const res = await api.getNextAvailableSlot({
        doctor_id: appt.doctor_id,
        specialty: appt.specialty
      });
      setOptimizedSlot(res.data);
    } catch (err) {
      onShowToast(err.message, 'error');
    } finally {
      setOptimizing(false);
    }
  };

  // Asignar el horario optimizado
  const handleApplyOptimizedSlot = async () => {
    if (!selectedApptToOptimize || !optimizedSlot) return;

    try {
      // Confirmar y reubicar cita
      await api.updateAppointmentStatus(selectedApptToOptimize.id, {
        status: 'Confirmada',
        notes: `Horario optimizado por administración: ${optimizedSlot.date} a las ${optimizedSlot.time_slot}`,
        actingUserId: adminUser?.id || 1,
        actingUserName: adminUser?.name || 'Administración',
        actingRole: 'admin'
      });

      onShowToast(`¡Cita #${selectedApptToOptimize.id} asignada y confirmada para el ${optimizedSlot.date} a las ${optimizedSlot.time_slot}!`, 'success');
      setShowOptimizeModal(false);
      await loadData();
    } catch (err) {
      onShowToast(err.message, 'error');
    }
  };

  // Manejar creación de nuevo médico especialista por el Administrador
  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    if (
      !doctorForm.name.trim() ||
      !doctorForm.email.trim() ||
      !doctorForm.password ||
      !doctorForm.license_number.trim() ||
      !doctorForm.office_number.trim()
    ) {
      onShowToast('Por favor completa los campos requeridos con asterisco (*)', 'error');
      return;
    }

    if (doctorForm.password.length < 6) {
      onShowToast('La contraseña debe tener una longitud mínima de 6 caracteres', 'error');
      return;
    }

    if (doctorForm.available_days.length === 0) {
      onShowToast('Debes seleccionar al menos un día de atención para el médico', 'error');
      return;
    }

    if (doctorForm.available_hours.length === 0) {
      onShowToast('Debes seleccionar al menos una franja horaria de consulta', 'error');
      return;
    }

    setCreatingDoctor(true);
    try {
      const payload = {
        adminUserId: adminUser?.id || 1,
        name: doctorForm.name.trim(),
        email: doctorForm.email.trim().toLowerCase(),
        password: doctorForm.password,
        phone: doctorForm.phone.trim() || '+57 300 000 0000',
        specialty: doctorForm.specialty.trim(),
        license_number: doctorForm.license_number.trim(),
        office_number: doctorForm.office_number.trim(),
        available_days: doctorForm.available_days,
        available_hours: doctorForm.available_hours,
        avatar: doctorForm.avatar.trim() || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=256&q=80'
      };

      const res = await api.createDoctor(payload);
      onShowToast(`¡Médico especialista ${res.data.name} (${res.data.specialty}) registrado exitosamente!`, 'success');

      // Cerrar modal y reiniciar formulario
      setShowCreateDoctorModal(false);
      setDoctorForm({
        name: '',
        email: '',
        password: '',
        phone: '',
        specialty: 'Cardiología',
        license_number: '',
        office_number: '',
        available_days: ['Lunes', 'Miércoles', 'Viernes'],
        available_hours: ['08:00 - 12:00', '14:00 - 18:00'],
        avatar: ''
      });

      // Recargar directorio médico de inmediato
      await loadData();
    } catch (err) {
      onShowToast(err.message, 'error');
    } finally {
      setCreatingDoctor(false);
    }
  };

  const toggleDaySelection = (day) => {
    setDoctorForm(prev => {
      const exists = prev.available_days.includes(day);
      return {
        ...prev,
        available_days: exists
          ? prev.available_days.filter(d => d !== day)
          : [...prev.available_days, day]
      };
    });
  };

  const toggleHourSelection = (hour) => {
    setDoctorForm(prev => {
      const exists = prev.available_hours.includes(hour);
      return {
        ...prev,
        available_hours: exists
          ? prev.available_hours.filter(h => h !== hour)
          : [...prev.available_hours, hour]
      };
    });
  };

  // Ver historia clínica de paciente con log de auditoría
  const handleViewPatientHistory = async (patient) => {
    setSelectedPatientHistory(patient);
    setShowHistoryModal(true);
    try {
      const res = await api.getPatientRecords(patient.id, {
        auditorName: adminUser?.name || 'Carlos Ramos (Admin)',
        auditorRole: 'admin',
        auditorId: adminUser?.id || 1
      });
      setPatientRecords(res.data);
      onShowToast(`Acceso a historia clínica registrado en bitácora de auditoría.`, 'info');
    } catch (err) {
      onShowToast(err.message, 'error');
    }
  };

  // Filtrado de citas
  const filteredAppointments = appointments.filter(a => {
    if (statusFilter === 'all') return true;
    return a.status === statusFilter;
  });

  const getStatusBadge = (status) => {
    const map = {
      'Solicitada': 'badge-solicitada',
      'Confirmada': 'badge-confirmada',
      'Completada': 'badge-completada',
      'Cancelada': 'badge-cancelada'
    };
    return <span className={`badge ${map[status] || 'badge-solicitada'}`}>{status}</span>;
  };

  const getReasonBadge = (color, label) => (
    <span className="badge-color-tag" style={{ background: color || '#3b82f6' }}>
      ● {label}
    </span>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Navegación del Centro de Control */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'citas' ? 'active' : ''}`}
          onClick={() => setActiveTab('citas')}
        >
          <Calendar size={18} />
          <span>Gestión de Citas & Despacho</span>
          {appointments.filter(a => a.status === 'Solicitada').length > 0 && (
            <span className="badge badge-solicitada" style={{ fontSize: '0.7rem' }}>
              {appointments.filter(a => a.status === 'Solicitada').length} por confirmar
            </span>
          )}
        </button>

        <button
          className={`tab-btn ${activeTab === 'doctores' ? 'active' : ''}`}
          onClick={() => setActiveTab('doctores')}
        >
          <Users size={18} />
          <span>Directorio Médico & Disponibilidad</span>
          <span className="badge badge-confirmada" style={{ fontSize: '0.7rem' }}>{doctors.length} especialistas</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'historias' ? 'active' : ''}`}
          onClick={() => setActiveTab('historias')}
        >
          <FileText size={18} />
          <span>Historias Clínicas & Pacientes (Auditoría)</span>
        </button>
      </div>

      {/* 1. SECCIÓN: GESTIÓN DE CITAS */}
      {activeTab === 'citas' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <ShieldCheck size={22} color="var(--primary)" />
                Centro de Control y Despacho de Citas
              </h2>
              <p className="card-subtitle">
                Supervisa solicitudes entrantes, confirma turnos, optimiza franjas horarias y sincroniza agendas en tiempo real.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Filtro por estado */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <Filter size={16} color="var(--text-muted)" />
                <span>Estado:</span>
                <select
                  className="form-select"
                  style={{ width: 'auto', padding: '0.4rem 0.75rem' }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Todas ({appointments.length})</option>
                  <option value="Solicitada">Solicitadas ({appointments.filter(a => a.status === 'Solicitada').length})</option>
                  <option value="Confirmada">Confirmadas ({appointments.filter(a => a.status === 'Confirmada').length})</option>
                  <option value="Completada">Completadas ({appointments.filter(a => a.status === 'Completada').length})</option>
                  <option value="Cancelada">Canceladas ({appointments.filter(a => a.status === 'Cancelada').length})</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabla de Citas Centralizadas */}
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Paciente</th>
                  <th>Motivo / Clasificación</th>
                  <th>Médico & Especialidad</th>
                  <th>Fecha & Hora</th>
                  <th>Estado</th>
                  <th>Acciones Administrativas</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No se encontraron citas con el filtro seleccionado.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map(appt => (
                    <tr key={appt.id}>
                      <td>#{appt.id}</td>
                      <td>
                        <strong>{appt.patient_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {appt.patient_document} • Tel: {appt.patient_phone}
                        </div>
                      </td>
                      <td>
                        {getReasonBadge(appt.color_code, appt.reason_label)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{appt.doctor_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {appt.doctor_specialty} • {appt.office_number}
                        </div>
                      </td>
                      <td>
                        <strong>{appt.date}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{appt.time_slot} hrs</div>
                      </td>
                      <td>{getStatusBadge(appt.status)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {appt.status === 'Solicitada' && (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleUpdateStatus(appt.id, 'Confirmada')}
                                title="Confirmar cita en horario seleccionado"
                              >
                                <CheckCircle2 size={14} />
                                Confirmar
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ color: 'var(--secondary)' }}
                                onClick={() => handleOpenOptimizer(appt)}
                                title="Buscar y optimizar fecha más próxima disponible en la agenda del doctor"
                              >
                                <Sparkles size={14} />
                                Optimizar Turno
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleUpdateStatus(appt.id, 'Cancelada')}
                                title="Rechazar o cancelar cita"
                              >
                                <XCircle size={14} />
                              </button>
                            </>
                          )}
                          {appt.status === 'Confirmada' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleUpdateStatus(appt.id, 'Cancelada')}
                            >
                              Cancelar
                            </button>
                          )}
                          {appt.status === 'Completada' && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
                              ✓ Atendida
                            </span>
                          )}
                          {appt.status === 'Cancelada' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleUpdateStatus(appt.id, 'Solicitada')}
                            >
                              Reactivar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. SECCIÓN: DIRECTORIO DE DOCTORES */}
      {activeTab === 'doctores' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Users size={22} color="var(--primary)" />
                Directorio de Especialistas y Agendas
              </h2>
              <p className="card-subtitle">
                Supervisión de consultorios, especialidades, registros médicos y franjas de disponibilidad declaradas.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowCreateDoctorModal(true)}
            >
              <UserPlus size={18} />
              <span>+ Registrar Nuevo Doctor / Especialista</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem' }}>
            {doctors.map(doc => (
              <div key={doc.id} className="card" style={{ background: 'var(--bg-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem' }}>
                  <img
                    src={doc.avatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=150&q=80'}
                    alt={doc.name}
                    className="user-avatar-sm"
                    style={{ width: '48px', height: '48px' }}
                  />
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{doc.name}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
                      {doc.specialty}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
                  <div><strong>Consultorio:</strong> {doc.office_number}</div>
                  <div><strong>Registro Médico:</strong> {doc.license_number}</div>
                  <div><strong>Contacto:</strong> {doc.phone} • {doc.email}</div>
                </div>

                <div style={{ background: 'var(--bg-card)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    📅 Días de Atención:
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    {doc.available_days.map((day, idx) => (
                      <span key={idx} className="badge badge-confirmada" style={{ fontSize: '0.7rem' }}>
                        {day}
                      </span>
                    ))}
                  </div>

                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    ⏰ Franjas Horarias:
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    {doc.available_hours.join(' • ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. SECCIÓN: HISTORIAS CLÍNICAS (CON CONTROL DE AUDITORÍA) */}
      {activeTab === 'historias' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <FileText size={22} color="var(--primary)" />
                Directorio de Pacientes y Auditoría de Historias
              </h2>
              <p className="card-subtitle">
                Acceso restringido para personal de administración y auditoría clínica. Cada consulta queda registrada de manera inmutable.
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={onOpenAudit}>
              <ShieldCheck size={16} />
              Ver Registro de Seguridad (Audit Logs)
            </button>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Identificación</th>
                  <th>EPS / Aseguradora</th>
                  <th>Contacto</th>
                  <th>Acción de Auditoría</th>
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                    </td>
                    <td>{p.document_id || 'CC Pendiente'}</td>
                    <td>
                      <span className="badge badge-confirmada">{p.eps_insurance || 'Particular'}</span>
                    </td>
                    <td>{p.phone || p.email}</td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleViewPatientHistory(p)}
                      >
                        <Eye size={14} />
                        Consultar Historia Clínica (Auditar)
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL OPTIMIZADOR DE CITAS */}
      {showOptimizeModal && selectedApptToOptimize && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowOptimizeModal(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowOptimizeModal(false);
          }}
        >
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="admin-optimize-title">
            <div className="modal-header">
              <h3 id="admin-optimize-title" className="card-title">
                <Sparkles size={20} color="var(--secondary)" />
                Optimizar Fecha y Franja Horaria
              </h3>
              <button type="button" className="icon-btn" onClick={() => setShowOptimizeModal(false)} aria-label="Cerrar modal">✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                El algoritmo analiza los días de disponibilidad declarados por el especialista y los turnos ya ocupados para ofrecer la fecha más cercana sin colisiones.
              </p>

              <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.85rem' }}>
                  <strong>Paciente:</strong> {selectedApptToOptimize.patient_name}<br />
                  <strong>Médico:</strong> {selectedApptToOptimize.doctor_name} ({selectedApptToOptimize.doctor_specialty})<br />
                  <strong>Turno Solicitado Inicialmente:</strong> {selectedApptToOptimize.date} a las {selectedApptToOptimize.time_slot}
                </div>
              </div>

              {optimizing ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                  Buscando el espacio óptimo más próximo...
                </div>
              ) : optimizedSlot ? (
                <div style={{
                  background: 'var(--secondary-light)',
                  border: '2px solid var(--secondary)',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--secondary)', textTransform: 'uppercase' }}>
                    ✓ Fecha Más Próxima Disponible Calculada:
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.25rem 0' }}>
                    {optimizedSlot.day_name}, {optimizedSlot.date} - {optimizedSlot.time_slot} hrs
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Consultorio: {optimizedSlot.office_number}
                  </div>
                </div>
              ) : (
                <div className="alert-box alert-warning">
                  No se encontraron espacios disponibles en las próximas dos semanas para este médico.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowOptimizeModal(false)}>
                Cerrar
              </button>
              {optimizedSlot && (
                <button className="btn btn-success" onClick={handleApplyOptimizedSlot}>
                  <CheckCircle2 size={16} />
                  Asignar y Confirmar Turno Optimizado
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTORIA CLÍNICA CON AUDITORÍA */}
      {showHistoryModal && selectedPatientHistory && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowHistoryModal(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowHistoryModal(false);
          }}
        >
          <div className="modal-content" style={{ maxWidth: '750px' }} role="dialog" aria-modal="true" aria-labelledby="admin-history-title">
            <div className="modal-header">
              <h3 id="admin-history-title" className="card-title">
                <FileText size={20} color="var(--primary)" />
                Historia Clínica: {selectedPatientHistory.name}
              </h3>
              <button type="button" className="icon-btn" onClick={() => setShowHistoryModal(false)} aria-label="Cerrar modal">✕</button>
            </div>
            <div className="modal-body">
              <div className="alert-box alert-info" style={{ padding: '0.6rem 0.85rem', marginBottom: '1rem' }}>
                <ShieldCheck size={16} />
                <span style={{ fontSize: '0.8rem' }}>
                  Sesión auditada bajo ID de recepción. Evento registrado: <strong>ACCESS_MEDICAL_RECORD</strong>.
                </span>
              </div>

              {patientRecords.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Este paciente no registra atenciones previas.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {patientRecords.map(rec => (
                    <div key={rec.id} className="card" style={{ background: 'var(--bg-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong>Atención #{rec.id} • {rec.created_at}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{rec.doctor_name}</span>
                      </div>
                      <div style={{ fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                        <strong>Diagnóstico:</strong> {rec.diagnosis}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <strong>Notas:</strong> {rec.clinical_notes}
                      </div>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                        Firma Digital: {rec.doctor_signature} ({rec.doctor_license})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowHistoryModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA REGISTRAR NUEVO DOCTOR / ESPECIALISTA */}
      {showCreateDoctorModal && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateDoctorModal(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowCreateDoctorModal(false);
          }}
        >
          <div className="modal-content" style={{ maxWidth: '720px' }} role="dialog" aria-modal="true" aria-labelledby="create-doc-title">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div className="brand-logo" style={{ width: '36px', height: '36px' }}>
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 id="create-doc-title" className="card-title">
                    Registrar Nuevo Médico / Especialista
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Alta institucional en el directorio clínico y habilitación de agenda
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowCreateDoctorModal(false)}
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDoctor}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* 1. Datos Personales & Credenciales */}
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Nombre Completo del Médico *</label>
                    <div className="input-with-icon">
                      <UserCheck size={18} className="field-icon" />
                      <input
                        type="text"
                        className="form-input field-input"
                        placeholder="Ej: Dra. Camila Morales"
                        value={doctorForm.name}
                        onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Institucional *</label>
                    <div className="input-with-icon">
                      <Mail size={18} className="field-icon" />
                      <input
                        type="email"
                        className="form-input field-input"
                        placeholder="cmorales@clinicasalud.com"
                        value={doctorForm.email}
                        onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Contraseña Inicial (Mín. 6 caracteres) *</label>
                    <div className="input-with-icon">
                      <Lock size={18} className="field-icon" />
                      <input
                        type={showDoctorPassword ? 'text' : 'password'}
                        className="form-input field-input"
                        placeholder="Contraseña para el portal del doctor"
                        value={doctorForm.password}
                        onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        className="toggle-pwd-btn"
                        onClick={() => setShowDoctorPassword(!showDoctorPassword)}
                        aria-label="Ver u ocultar contraseña"
                      >
                        {showDoctorPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Teléfono Móvil / Contacto</label>
                    <div className="input-with-icon">
                      <Phone size={18} className="field-icon" />
                      <input
                        type="tel"
                        className="form-input field-input"
                        placeholder="+57 311 456 7890"
                        value={doctorForm.phone}
                        onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Especialidad, Registro y Consultorio */}
                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Especialidad Médica *</label>
                    <select
                      className="form-select"
                      value={doctorForm.specialty}
                      onChange={(e) => setDoctorForm({ ...doctorForm, specialty: e.target.value })}
                      required
                    >
                      <option value="Cardiología">Cardiología</option>
                      <option value="Medicina General">Medicina General</option>
                      <option value="Pediatría">Pediatría</option>
                      <option value="Neurología">Neurología</option>
                      <option value="Ginecología">Ginecología y Obstetricia</option>
                      <option value="Traumatología">Traumatología y Ortopedia</option>
                      <option value="Dermatología">Dermatología</option>
                      <option value="Oftalmología">Oftalmología</option>
                      <option value="Psiquiatría">Psiquiatría</option>
                      <option value="Urología">Urología</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tarjeta / Registro Médico *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: MP-CARD-98432"
                      value={doctorForm.license_number}
                      onChange={(e) => setDoctorForm({ ...doctorForm, license_number: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Consultorio / Ubicación *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: Consultorio 305 - Torre A"
                      value={doctorForm.office_number}
                      onChange={(e) => setDoctorForm({ ...doctorForm, office_number: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* 3. Días de Atención */}
                <div className="form-group">
                  <label className="form-label">
                    Días de Atención Semanal * (Selecciona los días habilitados)
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((day) => {
                      const isSelected = doctorForm.available_days.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => toggleDaySelection(day)}
                          style={{ borderRadius: 'var(--radius-full)' }}
                        >
                          {isSelected ? '✓ ' : '+ '} {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Franjas Horarias */}
                <div className="form-group">
                  <label className="form-label">
                    Franjas Horarias de Consulta *
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {[
                      '07:00 - 12:00',
                      '08:00 - 12:00',
                      '13:00 - 17:00',
                      '14:00 - 18:00',
                      '18:00 - 21:00'
                    ].map((slot) => {
                      const isSelected = doctorForm.available_hours.includes(slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          className={`btn btn-sm ${isSelected ? 'btn-success' : 'btn-secondary'}`}
                          onClick={() => toggleHourSelection(slot)}
                          style={{ borderRadius: 'var(--radius-full)' }}
                        >
                          {isSelected ? '✓ ' : '+ '} {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. URL de Avatar / Foto (Opcional) */}
                <div className="form-group">
                  <label className="form-label">URL de Foto de Perfil (Opcional)</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://images.unsplash.com/... (Dejar vacío para avatar por defecto)"
                    value={doctorForm.avatar}
                    onChange={(e) => setDoctorForm({ ...doctorForm, avatar: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateDoctorModal(false)}
                  disabled={creatingDoctor}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingDoctor}
                >
                  <UserPlus size={18} />
                  <span>{creatingDoctor ? 'Registrando en Base de Datos...' : 'Guardar y Habilitar Doctor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

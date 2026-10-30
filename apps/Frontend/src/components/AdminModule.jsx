import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
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
  Building
} from 'lucide-react';

export default function AdminModule({ adminUser, onShowToast, onOpenAudit }) {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [activeTab, setActiveTab] = useState('citas'); // 'citas', 'doctores', 'historias'
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Modal para Optimizar Cita Más Próxima
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [selectedApptToOptimize, setSelectedApptToOptimize] = useState(null);
  const [optimizedSlot, setOptimizedSlot] = useState(null);
  const [optimizing, setOptimizing] = useState(false);

  // Modal para ver historia clínica de un paciente con auditoría
  const [selectedPatientHistory, setSelectedPatientHistory] = useState(null);
  const [patientRecords, setPatientRecords] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      loadData();
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
      loadData();
    } catch (err) {
      onShowToast(err.message, 'error');
    }
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
        <div className="modal-overlay" onClick={() => setShowOptimizeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="card-title">
                <Sparkles size={20} color="var(--secondary)" />
                Optimizar Fecha y Franja Horaria
              </h3>
              <button className="icon-btn" onClick={() => setShowOptimizeModal(false)}>✕</button>
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
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content" style={{ maxWidth: '750px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="card-title">
                <FileText size={20} color="var(--primary)" />
                Historia Clínica: {selectedPatientHistory.name}
              </h3>
              <button className="icon-btn" onClick={() => setShowHistoryModal(false)}>✕</button>
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
    </div>
  );
}

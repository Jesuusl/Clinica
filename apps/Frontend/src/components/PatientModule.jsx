import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  User,
  HeartPulse,
  Calendar,
  Pill,
  FileText,
  FlaskConical,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  PlusCircle,
  ChevronRight,
  Shield,
  Download
} from 'lucide-react';

export default function PatientModule({ patientUser, onShowToast }) {
  const [activeTab, setActiveTab] = useState('citas'); // 'citas', 'reclamar', 'historia', 'laboratorios', 'perfil'
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [labOrders, setLabOrders] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados del modal de Agendar Cita
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    doctor_id: '',
    specialty: 'Medicina General',
    reason_type: 'control_general',
    date: '',
    time_slot: '09:00',
    notes: ''
  });

  // Estado del formulario de Perfil
  const [profileForm, setProfileForm] = useState({
    phone: '',
    email: '',
    address: '',
    eps_insurance: '',
    policy_number: '',
    blood_type: 'O+',
    allergies: '',
    chronic_conditions: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });

  // Estado para ver detalle de historia clínica en modal
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Cargar datos del paciente
  const loadPatientData = async () => {
    if (!patientUser?.id) return;
    setLoading(true);
    try {
      const [profRes, apptRes, prescRes, recRes, labRes, docsRes] = await Promise.all([
        api.getPatientProfile(patientUser.id),
        api.getAppointments({ patient_id: patientUser.id }),
        api.getPatientPrescriptions(patientUser.id),
        api.getPatientRecords(patientUser.id, {
          auditorName: patientUser.name,
          auditorRole: 'patient',
          auditorId: patientUser.id
        }),
        api.getPatientLabOrders(patientUser.id),
        api.getDoctors()
      ]);

      setProfile(profRes.data);
      setProfileForm({
        phone: profRes.data.phone || '',
        email: profRes.data.email || '',
        address: profRes.data.address || '',
        eps_insurance: profRes.data.eps_insurance || '',
        policy_number: profRes.data.policy_number || '',
        blood_type: profRes.data.blood_type || 'O+',
        allergies: profRes.data.allergies || '',
        chronic_conditions: profRes.data.chronic_conditions || '',
        emergency_contact_name: profRes.data.emergency_contact_name || '',
        emergency_contact_phone: profRes.data.emergency_contact_phone || ''
      });
      setAppointments(apptRes.data);
      setPrescriptions(prescRes.data);
      setMedicalRecords(recRes.data);
      setLabOrders(labRes.data);
      setDoctors(docsRes.data);

      if (docsRes.data.length > 0 && !scheduleForm.doctor_id) {
        setScheduleForm(prev => ({
          ...prev,
          doctor_id: docsRes.data[0].id,
          specialty: docsRes.data[0].specialty
        }));
      }
    } catch (err) {
      onShowToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatientData();
  }, [patientUser?.id]);

  // Actualizar perfil
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await api.updatePatientProfile(patientUser.id, {
        ...profileForm,
        actingUserName: patientUser.name
      });
      onShowToast('¡Datos personales y médicos actualizados correctamente!', 'success');
      loadPatientData();
    } catch (err) {
      onShowToast(err.message, 'error');
    }
  };

  // Solicitar nueva cita
  const handleScheduleAppointment = async (e) => {
    e.preventDefault();
    if (!scheduleForm.date || !scheduleForm.time_slot || !scheduleForm.doctor_id) {
      onShowToast('Por favor completa todos los campos del agendamiento', 'error');
      return;
    }

    try {
      await api.createAppointment({
        patient_id: patientUser.id,
        doctor_id: Number(scheduleForm.doctor_id),
        specialty: scheduleForm.specialty,
        reason_type: scheduleForm.reason_type,
        date: scheduleForm.date,
        time_slot: scheduleForm.time_slot,
        notes: scheduleForm.notes,
        requestedByRole: 'patient',
        actingUserName: patientUser.name
      });

      onShowToast('¡Cita solicitada exitosamente! Se encuentra en estado Pendiente para confirmación administrativa.', 'success');
      setShowScheduleModal(false);
      loadPatientData();
    } catch (err) {
      onShowToast(err.message, 'error');
    }
  };

  // Al cambiar motivo, sugerir especialidad y doctor afín
  const handleReasonChange = (reason) => {
    let spec = 'Medicina General';
    if (reason === 'control_cardiaco') spec = 'Cardiología';
    if (reason === 'especialidad') spec = 'Cardiología';

    const matchDoc = doctors.find(d => d.specialty === spec) || doctors[0];

    setScheduleForm(prev => ({
      ...prev,
      reason_type: reason,
      specialty: spec,
      doctor_id: matchDoc ? matchDoc.id : prev.doctor_id
    }));
  };

  const getReasonColorBadge = (color, label) => (
    <span
      className="badge-color-tag"
      style={{ backgroundColor: color || '#3b82f6' }}
    >
      ● {label}
    </span>
  );

  const getStatusBadge = (status) => {
    const map = {
      'Solicitada': 'badge-solicitada',
      'Confirmada': 'badge-confirmada',
      'Completada': 'badge-completada',
      'Cancelada': 'badge-cancelada'
    };
    return <span className={`badge ${map[status] || 'badge-solicitada'}`}>{status}</span>;
  };

  if (loading && !profile) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Cargando portal del paciente...</div>;
  }

  return (
    <div>
      {/* Navegación por Pestañas del Paciente */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'citas' ? 'active' : ''}`}
          onClick={() => setActiveTab('citas')}
        >
          <Calendar size={18} />
          <span>Mis Citas & Agendamiento</span>
          <span className="badge badge-confirmada" style={{ fontSize: '0.7rem' }}>{appointments.length}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'reclamar' ? 'active' : ''}`}
          onClick={() => setActiveTab('reclamar')}
        >
          <Pill size={18} />
          <span>Reclamación de Medicamentos</span>
          {prescriptions.filter(p => p.status === 'Pendiente').length > 0 && (
            <span className="badge badge-solicitada" style={{ fontSize: '0.7rem' }}>
              {prescriptions.filter(p => p.status === 'Pendiente').length} activo(s)
            </span>
          )}
        </button>

        <button
          className={`tab-btn ${activeTab === 'historia' ? 'active' : ''}`}
          onClick={() => setActiveTab('historia')}
        >
          <FileText size={18} />
          <span>Historial Clínico y Evoluciones</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'laboratorios' ? 'active' : ''}`}
          onClick={() => setActiveTab('laboratorios')}
        >
          <FlaskConical size={18} />
          <span>Laboratorios y Exámenes</span>
          <span className="badge badge-completada" style={{ fontSize: '0.7rem' }}>{labOrders.length}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'perfil' ? 'active' : ''}`}
          onClick={() => setActiveTab('perfil')}
        >
          <User size={18} />
          <span>Mi Perfil & Datos Médicos</span>
        </button>
      </div>

      {/* 1. SECCIÓN: MIS CITAS Y AGENDAMIENTO CON CLASIFICACIÓN */}
      {activeTab === 'citas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  <Calendar size={22} color="var(--primary)" />
                  Agendamiento y Citas del Paciente
                </h2>
                <p className="card-subtitle">
                  Solicita consultas clasificadas por motivo. La cita inicia en estado <strong>Pendiente (Solicitada)</strong> hasta que recepción confirme y sincronice las agendas.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setShowScheduleModal(true)}
              >
                <PlusCircle size={18} />
                Solicitar Nueva Cita
              </button>
            </div>

            {/* Código de Color Visual en la Agenda */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              padding: '0.75rem 1rem',
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1rem',
              fontSize: '0.8rem',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Clasificación de Citas:</span>
              <span className="badge-color-tag" style={{ background: '#3b82f6' }}>● Azul: Control General</span>
              <span className="badge-color-tag" style={{ background: '#10b981' }}>● Verde: Control Cardíaco</span>
              <span className="badge-color-tag" style={{ background: '#f59e0b' }}>● Ámbar: Primera Vez</span>
              <span className="badge-color-tag" style={{ background: '#8b5cf6' }}>● Morado: Especialidad</span>
            </div>

            {/* Tabla de Citas */}
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Fecha & Hora</th>
                    <th>Motivo & Tipo</th>
                    <th>Especialista</th>
                    <th>Ubicación / Consultorio</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No tienes citas agendadas actualmente. Haz clic en "Solicitar Nueva Cita".
                      </td>
                    </tr>
                  ) : (
                    appointments.map(appt => (
                      <tr key={appt.id}>
                        <td>
                          <strong>{appt.date}</strong>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{appt.time_slot} hrs</div>
                        </td>
                        <td>
                          {getReasonColorBadge(appt.color_code, appt.reason_label)}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{appt.doctor_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{appt.specialty}</div>
                        </td>
                        <td>{appt.office_number || 'Por asignar'}</td>
                        <td>{getStatusBadge(appt.status)}</td>
                        <td>
                          {appt.status === 'Completada' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                const rec = medicalRecords.find(r => r.appointment_id === appt.id);
                                if (rec) setSelectedRecord(rec);
                                else onShowToast('Cargando evolución médica...', 'info');
                              }}
                            >
                              <FileCheck2 size={15} />
                              Ver Evolución
                            </button>
                          )}
                          {appt.status === 'Solicitada' && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--warning)', fontStyle: 'italic' }}>
                              En espera de recepción
                            </span>
                          )}
                          {appt.status === 'Confirmada' && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                              ✓ Agendada en consultorio
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. SECCIÓN: RECLAMACIÓN DE MEDICAMENTOS (CÓDIGO ÚNICO DE 6 DÍGITOS) */}
      {activeTab === 'reclamar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  <Pill size={22} color="var(--primary)" />
                  Códigos de Reclamación de Medicamentos
                </h2>
                <p className="card-subtitle">
                  Presenta este código único de 6 dígitos en la farmacia hospitalaria para reclamar tu tratamiento recetado.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
              {prescriptions.length === 0 ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No tienes fórmulas médicas registradas actualmente.
                </div>
              ) : (
                prescriptions.map(p => (
                  <div
                    key={p.id}
                    className="card"
                    style={{
                      border: p.status === 'Pendiente' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      background: p.status === 'Pendiente' ? 'var(--bg-card)' : 'var(--bg-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span className={`badge ${p.status === 'Pendiente' ? 'badge-solicitada' : 'badge-completada'}`}>
                        {p.status === 'Pendiente' ? '● Pendiente por Reclamar' : '✓ Reclamado en Farmacia'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Emitido: {p.created_at?.split(' ')[0]}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {p.medication_name}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 1rem' }}>
                      <strong>Dosis:</strong> {p.dosage} • <strong>Frecuencia:</strong> {p.frequency} • <strong>Duración:</strong> {p.duration}
                    </div>

                    {p.instructions && (
                      <div style={{ fontSize: '0.8rem', background: 'var(--bg-subtle)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                        💡 <em>{p.instructions}</em>
                      </div>
                    )}

                    {/* Caja de Código de 6 Dígitos */}
                    <div className="code-display-box">
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
                        Código de Reclamo Único (6 Dígitos)
                      </div>
                      <div className="code-digits">{p.pickup_code}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                        {p.status === 'Pendiente'
                          ? 'Muestra este código en ventanilla de farmacia'
                          : `Dispensado el: ${p.redeemed_at || 'Registro previo'}`}
                      </div>
                    </div>

                    <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                      Prescrito por: {p.doctor_name} ({p.doctor_specialty})
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. SECCIÓN: HISTORIAL CLÍNICO Y EVOLUCIONES */}
      {activeTab === 'historia' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  <FileText size={22} color="var(--primary)" />
                  Evolución Clínica e Historias Médicas
                </h2>
                <p className="card-subtitle">
                  Historial completo con notas, diagnósticos CIE-10, diagnósticos físicos, estampa de tiempo y firma digital de los médicos tratantes.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {medicalRecords.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Aún no registras evoluciones de consultas médicas completadas.
                </div>
              ) : (
                medicalRecords.map(rec => (
                  <div
                    key={rec.id}
                    className="card"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>
                            Atención Clínica #{rec.id}
                          </span>
                          <span className="badge badge-completada">Completada</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Fecha de atención: {rec.created_at}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{rec.doctor_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rec.doctor_specialty}</div>
                      </div>
                    </div>

                    {/* Diagnóstico */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>DIAGNÓSTICO PRINCIPAL:</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                        {rec.diagnosis}
                      </div>
                    </div>

                    {/* Notas Clínicas */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>EVOLUCIÓN Y NOTAS MÉDICAS:</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginTop: '0.2rem' }}>
                        {rec.clinical_notes}
                      </div>
                    </div>

                    {rec.physical_exam && (
                      <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <strong>Signos y Examen Físico:</strong> {rec.physical_exam}
                      </div>
                    )}

                    {/* Recetas asociadas a esta consulta */}
                    {rec.prescriptions && rec.prescriptions.length > 0 && (
                      <div style={{ marginTop: '0.75rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.75rem' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                          MEDICAMENTOS PRESCRITOS:
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {rec.prescriptions.map(p => (
                            <div key={p.id} style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                              💊 <strong>{p.medication_name}</strong> ({p.dosage}) - Código 6D: <strong>{p.pickup_code}</strong> [{p.status}]
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Firma Digital y Sello de Trazabilidad */}
                    <div style={{
                      marginTop: '1rem',
                      padding: '0.6rem 0.85rem',
                      background: 'var(--primary-light)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      fontSize: '0.785rem',
                      color: 'var(--primary-hover)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Shield size={16} />
                        <strong>Firma Digital:</strong> {rec.doctor_signature}
                      </div>
                      <div>
                        {rec.doctor_license}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. SECCIÓN: LABORATORIOS Y EXÁMENES */}
      {activeTab === 'laboratorios' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  <FlaskConical size={22} color="var(--primary)" />
                  Exámenes Médicos e Informes de Laboratorio
                </h2>
                <p className="card-subtitle">
                  Consulta de resultados procesados y subidos por el personal de laboratorio autorizado.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {labOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No tienes órdenes de laboratorio ni exámenes pendientes.
                </div>
              ) : (
                labOrders.map(lab => (
                  <div
                    key={lab.id}
                    className="card"
                    style={{
                      borderLeft: lab.status === 'Completado' ? '4px solid var(--success)' : '4px solid var(--warning)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{lab.test_type}</h3>
                          <span className="badge badge-confirmada" style={{ fontSize: '0.7rem' }}>{lab.test_category}</span>
                          <span className={`badge ${lab.status === 'Completado' ? 'badge-completada' : 'badge-solicitada'}`}>
                            {lab.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Ordenado por: {lab.doctor_name} ({lab.doctor_specialty}) • {lab.created_at?.split(' ')[0]}
                        </div>
                      </div>

                      {lab.attachment_name && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onShowToast(`Descargando informe clínico: ${lab.attachment_name}`, 'info')}
                        >
                          <Download size={14} />
                          {lab.attachment_name}
                        </button>
                      )}
                    </div>

                    {lab.instructions && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        <strong>Instrucciones de preparación:</strong> {lab.instructions}
                      </div>
                    )}

                    {/* Resultados del Examen */}
                    {lab.status === 'Completado' && (
                      <div style={{ marginTop: '0.75rem', background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--success)' }}>
                          ✓ INFORME DE RESULTADOS VALIDADOS:
                        </div>
                        <p style={{ fontSize: '0.875rem', margin: '0.25rem 0 0.5rem', color: 'var(--text-primary)' }}>
                          {lab.result_notes}
                        </p>

                        {lab.result_values && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {Object.entries(lab.result_values).map(([k, v]) => (
                              <div key={k} style={{ fontSize: '0.8rem', background: 'var(--bg-card)', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                <span style={{ color: 'var(--text-muted)' }}>{k}:</span> <strong>{v}</strong>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'right' }}>
                          Procesado por: {lab.laboratory_technician || 'Laboratorio Central SaludPlus'} • {lab.completed_at}
                        </div>
                      </div>
                    )}

                    {lab.status === 'Pendiente' && (
                      <div className="alert-box alert-warning" style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem' }}>
                        <AlertCircle size={16} />
                        <span style={{ fontSize: '0.8rem' }}>
                          Muestra pendiente de toma o procesamiento técnico en laboratorio.
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. SECCIÓN: PERFIL Y ANTECEDENTES MÉDICOS */}
      {activeTab === 'perfil' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  <User size={22} color="var(--primary)" />
                  Perfil Personal y Datos Médicos
                </h2>
                <p className="card-subtitle">
                  Mantén actualizada tu información de contacto, afiliación a EPS y antecedentes clínicos básicos.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                1. Información de Contacto
              </h3>
              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Teléfono Móvil</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Correo Electrónico</label>
                  <input
                    type="email"
                    className="form-input"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Dirección de Residencia</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    required
                  />
                </div>
              </div>

              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', margin: '1.25rem 0 0.75rem', textTransform: 'uppercase' }}>
                2. Datos de Afiliación y Aseguramiento
              </h3>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">EPS / Aseguradora de Salud</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileForm.eps_insurance}
                    onChange={(e) => setProfileForm({ ...profileForm, eps_insurance: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Número de Póliza / Afiliación</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileForm.policy_number}
                    onChange={(e) => setProfileForm({ ...profileForm, policy_number: e.target.value })}
                    required
                  />
                </div>
              </div>

              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', margin: '1.25rem 0 0.75rem', textTransform: 'uppercase' }}>
                3. Antecedentes Médicos Básicos
              </h3>
              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Tipo de Sangre</label>
                  <select
                    className="form-select"
                    value={profileForm.blood_type}
                    onChange={(e) => setProfileForm({ ...profileForm, blood_type: e.target.value })}
                  >
                    <option value="O+">O Positivo (O+)</option>
                    <option value="O-">O Negativo (O-)</option>
                    <option value="A+">A Positivo (A+)</option>
                    <option value="A-">A Negativo (A-)</option>
                    <option value="B+">B Positivo (B+)</option>
                    <option value="B-">B Negativo (B-)</option>
                    <option value="AB+">AB Positivo (AB+)</option>
                    <option value="AB-">AB Negativo (AB-)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Alergias Conocidas</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Penicilina, Sulfas..."
                    value={profileForm.allergies}
                    onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Condiciones Crónicas Preexistentes</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Hipertensión, Diabetes..."
                    value={profileForm.chronic_conditions}
                    onChange={(e) => setProfileForm({ ...profileForm, chronic_conditions: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2" style={{ marginTop: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Contacto de Emergencia (Nombre y Parentesco)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileForm.emergency_contact_name}
                    onChange={(e) => setProfileForm({ ...profileForm, emergency_contact_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono de Emergencia</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileForm.emergency_contact_phone}
                    onChange={(e) => setProfileForm({ ...profileForm, emergency_contact_phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle2 size={18} />
                  Guardar y Actualizar Perfil Clínico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA AGENDAR CITA CON CLASIFICACIÓN */}
      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="card-title">
                <Calendar size={20} color="var(--primary)" />
                Solicitud de Agendamiento de Cita
              </h3>
              <button className="icon-btn" onClick={() => setShowScheduleModal(false)}>✕</button>
            </div>
            <form onSubmit={handleScheduleAppointment}>
              <div className="modal-body">
                {/* Selector de Motivo con Colores */}
                <div className="form-group">
                  <label className="form-label">Motivo de la Cita (Clasificación Automática):</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <button
                      type="button"
                      className={`btn btn-secondary ${scheduleForm.reason_type === 'control_general' ? 'btn-primary' : ''}`}
                      onClick={() => handleReasonChange('control_general')}
                      style={{ borderLeft: '5px solid #3b82f6', justifyContent: 'flex-start' }}
                    >
                      Control General (Azul)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-secondary ${scheduleForm.reason_type === 'control_cardiaco' ? 'btn-primary' : ''}`}
                      onClick={() => handleReasonChange('control_cardiaco')}
                      style={{ borderLeft: '5px solid #10b981', justifyContent: 'flex-start' }}
                    >
                      Control Cardíaco (Verde)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-secondary ${scheduleForm.reason_type === 'primera_vez' ? 'btn-primary' : ''}`}
                      onClick={() => handleReasonChange('primera_vez')}
                      style={{ borderLeft: '5px solid #f59e0b', justifyContent: 'flex-start' }}
                    >
                      Primera Vez (Ámbar)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-secondary ${scheduleForm.reason_type === 'especialidad' ? 'btn-primary' : ''}`}
                      onClick={() => handleReasonChange('especialidad')}
                      style={{ borderLeft: '5px solid #8b5cf6', justifyContent: 'flex-start' }}
                    >
                      Especialidad (Morado)
                    </button>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Especialidad Requerida</label>
                    <input
                      type="text"
                      className="form-input"
                      value={scheduleForm.specialty}
                      readOnly
                      style={{ background: 'var(--bg-subtle)' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Médico Especialista</label>
                    <select
                      className="form-select"
                      value={scheduleForm.doctor_id}
                      onChange={(e) => {
                        const doc = doctors.find(d => d.id === Number(e.target.value));
                        setScheduleForm({
                          ...scheduleForm,
                          doctor_id: e.target.value,
                          specialty: doc ? doc.specialty : scheduleForm.specialty
                        });
                      }}
                      required
                    >
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.specialty})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Fecha Deseada</label>
                    <input
                      type="date"
                      className="form-input"
                      value={scheduleForm.date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Franja Horaria</label>
                    <select
                      className="form-select"
                      value={scheduleForm.time_slot}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, time_slot: e.target.value })}
                      required
                    >
                      <option value="08:00">08:00 AM</option>
                      <option value="09:00">09:00 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="14:00">02:00 PM</option>
                      <option value="15:00">03:00 PM</option>
                      <option value="16:00">04:00 PM</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notas Adicionales o Síntomas</label>
                  <textarea
                    className="form-textarea"
                    rows="3"
                    placeholder="Describe brevemente el motivo de la consulta o síntomas presentados..."
                    value={scheduleForm.notes}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  />
                </div>

                <div className="alert-box alert-info" style={{ margin: 0, padding: '0.6rem 0.85rem' }}>
                  <Clock size={16} />
                  <span style={{ fontSize: '0.8rem' }}>
                    La cita quedará en estado <strong>Solicitada</strong>. El equipo de recepción revisará la agenda del doctor y confirmará el turno.
                  </span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowScheduleModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Enviar Solicitud de Cita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

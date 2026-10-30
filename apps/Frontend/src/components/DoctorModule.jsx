import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Stethoscope,
  Calendar,
  Pill,
  FlaskConical,
  Share2,
  Clock,
  CheckCircle2,
  Plus,
  Trash2,
  FileText,
  User,
  Shield,
  AlertCircle
} from 'lucide-react';

export default function DoctorModule({ doctorUser, onShowToast }) {
  const [activeTab, setActiveTab] = useState('agenda'); // 'agenda', 'consulta', 'disponibilidad'
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  // Perfil del paciente seleccionado para consulta
  const [patientProfile, setPatientProfile] = useState(null);
  const [patientRecords, setPatientRecords] = useState([]);

  // Estado del Formulario de Consulta Médica
  const [consultationForm, setConsultationForm] = useState({
    diagnosis: '',
    clinical_notes: '',
    physical_exam: '',
    prescriptions: [
      { medication_name: 'Losartán Potásico 50mg', dosage: '50mg', frequency: 'Cada 12 horas', duration: '30 días', instructions: 'Tomar con abundante agua en ayunas.' }
    ],
    lab_orders: [],
    referrals: []
  });

  // Estado de Disponibilidad Horaria del Doctor
  const [availability, setAvailability] = useState({
    days: ['Lunes', 'Miércoles', 'Viernes'],
    hours: ['08:00 - 12:00', '14:00 - 17:00']
  });

  const loadDoctorData = async () => {
    if (!doctorUser?.id) return;
    setLoading(true);
    try {
      const [apptsRes, usersRes, docsRes] = await Promise.all([
        api.getAppointments({ doctor_id: doctorUser.id }),
        api.getUsers(),
        api.getDoctors()
      ]);

      setAppointments(apptsRes.data);
      setPatients(usersRes.data.filter(u => u.role === 'patient'));

      const currentDoc = docsRes.data.find(d => d.id === doctorUser.id);
      if (currentDoc) {
        setAvailability({
          days: currentDoc.available_days || ['Lunes', 'Miércoles', 'Viernes'],
          hours: currentDoc.available_hours || ['08:00 - 12:00', '14:00 - 17:00']
        });
      }
    } catch (err) {
      onShowToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorData();
  }, [doctorUser?.id]);

  // Iniciar atención de una cita
  const handleStartConsultation = async (appt) => {
    setSelectedAppointment(appt);
    setActiveTab('consulta');

    // Cargar perfil clínico y antecedentes del paciente
    try {
      const [profRes, recRes] = await Promise.all([
        api.getPatientProfile(appt.patient_id),
        api.getPatientRecords(appt.patient_id, {
          auditorName: doctorUser.name,
          auditorRole: 'doctor',
          auditorId: doctorUser.id
        })
      ]);
      setPatientProfile(profRes.data);
      setPatientRecords(recRes.data);
    } catch (err) {
      onShowToast(`Error cargando expediente del paciente: ${err.message}`, 'error');
    }
  };

  // Manejo de recetas
  const handleAddPrescription = () => {
    setConsultationForm(prev => ({
      ...prev,
      prescriptions: [
        ...prev.prescriptions,
        { medication_name: '', dosage: '', frequency: '', duration: '', instructions: '' }
      ]
    }));
  };

  const handleRemovePrescription = (index) => {
    setConsultationForm(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((_, i) => i !== index)
    }));
  };

  const handlePrescriptionChange = (index, field, value) => {
    setConsultationForm(prev => {
      const updated = [...prev.prescriptions];
      updated[index][field] = value;
      return { ...prev, prescriptions: updated };
    });
  };

  // Manejo de órdenes de laboratorio
  const handleAddLabOrder = () => {
    setConsultationForm(prev => ({
      ...prev,
      lab_orders: [
        ...prev.lab_orders,
        { test_type: 'Hemograma Completo', test_category: 'Sangre', instructions: 'Ayuno de 8 horas' }
      ]
    }));
  };

  const handleRemoveLabOrder = (index) => {
    setConsultationForm(prev => ({
      ...prev,
      lab_orders: prev.lab_orders.filter((_, i) => i !== index)
    }));
  };

  // Manejo de remisiones
  const handleAddReferral = () => {
    setConsultationForm(prev => ({
      ...prev,
      referrals: [
        ...prev.referrals,
        { referral_type: 'control', target_specialty: doctorUser.specialty || 'Cardiología', priority: 'Normal', reason: 'Control de seguimiento a 3 meses.' }
      ]
    }));
  };

  const handleRemoveReferral = (index) => {
    setConsultationForm(prev => ({
      ...prev,
      referrals: prev.referrals.filter((_, i) => i !== index)
    }));
  };

  // Enviar Consulta y Emitir Recetas con Código de 6 Dígitos
  const handleSubmitConsultation = async (e) => {
    e.preventDefault();
    if (!selectedAppointment) {
      onShowToast('Selecciona primero una cita de la agenda para atender.', 'error');
      return;
    }

    if (!consultationForm.diagnosis || !consultationForm.clinical_notes) {
      onShowToast('El diagnóstico y las notas clínicas son obligatorias.', 'error');
      return;
    }

    try {
      const payload = {
        appointment_id: selectedAppointment.id,
        patient_id: selectedAppointment.patient_id,
        doctor_id: doctorUser.id,
        diagnosis: consultationForm.diagnosis,
        clinical_notes: consultationForm.clinical_notes,
        physical_exam: consultationForm.physical_exam,
        prescriptions: consultationForm.prescriptions.filter(p => p.medication_name),
        lab_orders: consultationForm.lab_orders.filter(l => l.test_type),
        referrals: consultationForm.referrals.filter(r => r.target_specialty)
      };

      const res = await api.submitConsultation(payload);
      const { prescriptions } = res.data;

      const codeNotice = prescriptions.length > 0
        ? `Se generaron ${prescriptions.length} código(s) único(s) de 6 dígitos: ${prescriptions.map(p => p.pickup_code).join(', ')}`
        : '';

      onShowToast(`¡Consulta finalizada y firmada digitalmente! ${codeNotice}`, 'success');

      // Limpiar y volver a la agenda
      setSelectedAppointment(null);
      setConsultationForm({
        diagnosis: '',
        clinical_notes: '',
        physical_exam: '',
        prescriptions: [],
        lab_orders: [],
        referrals: []
      });
      setActiveTab('agenda');
      loadDoctorData();
    } catch (err) {
      onShowToast(err.message, 'error');
    }
  };

  // Guardar Disponibilidad
  const handleSaveAvailability = async (e) => {
    e.preventDefault();
    try {
      await api.updateDoctorAvailability(doctorUser.id, {
        available_days: availability.days,
        available_hours: availability.hours,
        actingUserName: doctorUser.name
      });
      onShowToast('¡Disponibilidad horaria actualizada correctamente para recepción!', 'success');
    } catch (err) {
      onShowToast(err.message, 'error');
    }
  };

  const allWeekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Navegación del Portal Médico */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'agenda' ? 'active' : ''}`}
          onClick={() => setActiveTab('agenda')}
        >
          <Calendar size={18} />
          <span>Agenda de Pacientes</span>
          <span className="badge badge-confirmada" style={{ fontSize: '0.7rem' }}>{appointments.length}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'consulta' ? 'active' : ''}`}
          onClick={() => setActiveTab('consulta')}
        >
          <Stethoscope size={18} />
          <span>Atención Clínica & Receta Electrónica</span>
          {selectedAppointment && (
            <span className="badge badge-completada" style={{ fontSize: '0.7rem' }}>En curso</span>
          )}
        </button>

        <button
          className={`tab-btn ${activeTab === 'disponibilidad' ? 'active' : ''}`}
          onClick={() => setActiveTab('disponibilidad')}
        >
          <Clock size={18} />
          <span>Mi Disponibilidad & Horarios</span>
        </button>
      </div>

      {/* 1. SECCIÓN: AGENDA DEL DOCTOR */}
      {activeTab === 'agenda' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Calendar size={22} color="var(--primary)" />
                Agenda y Turnos Programados: {doctorUser.name}
              </h2>
              <p className="card-subtitle">
                Especialidad: <strong>{doctorUser.specialty}</strong> • Identifica turnos clasificados por color e inicia la atención.
              </p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Fecha & Turno</th>
                  <th>Paciente</th>
                  <th>Clasificación</th>
                  <th>Notas / Síntomas</th>
                  <th>Estado</th>
                  <th>Acción Médica</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No tienes citas programadas en tu agenda en este momento.
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
                        <strong>{appt.patient_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{appt.patient_document}</div>
                      </td>
                      <td>
                        <span className="badge-color-tag" style={{ background: appt.color_code || '#3b82f6' }}>
                          ● {appt.reason_label}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', maxWidth: '250px' }}>
                          {appt.notes || 'Consulta de rutina'}
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${appt.status.toLowerCase()}`}>{appt.status}</span>
                      </td>
                      <td>
                        {appt.status === 'Confirmada' || appt.status === 'Solicitada' ? (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleStartConsultation(appt)}
                          >
                            <Stethoscope size={14} />
                            Atender Consulta
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>
                            ✓ Consulta Finalizada
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
      )}

      {/* 2. SECCIÓN: ATENCIÓN CLÍNICA, RECETAS Y ÓRDENES */}
      {activeTab === 'consulta' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {!selectedAppointment ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <Stethoscope size={48} color="var(--primary)" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Ningún paciente seleccionado para atención
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Por favor ve a la pestaña <strong>"Agenda de Pacientes"</strong> y haz clic en <strong>"Atender Consulta"</strong>.
              </p>
              <button className="btn btn-primary" onClick={() => setActiveTab('agenda')}>
                Ir a mi Agenda
              </button>
            </div>
          ) : (
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">
                    <Stethoscope size={22} color="var(--primary)" />
                    Atención Médica en Curso: {selectedAppointment.patient_name}
                  </h2>
                  <p className="card-subtitle">
                    Turno: #{selectedAppointment.id} • Motivo: {selectedAppointment.reason_label} • {selectedAppointment.date} {selectedAppointment.time_slot}
                  </p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedAppointment(null)}>
                  Cambiar Paciente
                </button>
              </div>

              {/* Expediente Rápido y Antecedentes del Paciente */}
              {patientProfile && (
                <div style={{
                  background: 'var(--bg-subtle)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.5rem',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Expediente & Antecedentes Clínicos del Paciente:
                  </div>
                  <div className="form-grid-3" style={{ fontSize: '0.85rem' }}>
                    <div><strong>EPS / Póliza:</strong> {patientProfile.eps_insurance} ({patientProfile.policy_number})</div>
                    <div><strong>Tipo de Sangre:</strong> <span className="badge badge-completada">{patientProfile.blood_type}</span></div>
                    <div><strong>Contacto:</strong> {patientProfile.phone}</div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <strong style={{ color: 'var(--danger)' }}>Alergias:</strong> {patientProfile.allergies || 'Ninguna reportada'} •
                      <strong style={{ marginLeft: '0.5rem' }}>Condiciones Preexistentes:</strong> {patientProfile.chronic_conditions || 'Sin antecedentes crónicos'}
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmitConsultation}>
                {/* 1. Diagnóstico y Evolución */}
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                  1. Diagnóstico y Registro de Evolución
                </h3>
                <div className="form-group">
                  <label className="form-label">Diagnóstico Principal (CIE-10 / Descripción Clínica):</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. I10 - Hipertensión esencial (primaria) con control favorable"
                    value={consultationForm.diagnosis}
                    onChange={(e) => setConsultationForm({ ...consultationForm, diagnosis: e.target.value })}
                    required
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Evolución y Notas Médicas:</label>
                    <textarea
                      className="form-textarea"
                      rows="4"
                      placeholder="Anamnesis, evolución de síntomas, respuesta al tratamiento previo y recomendaciones..."
                      value={consultationForm.clinical_notes}
                      onChange={(e) => setConsultationForm({ ...consultationForm, clinical_notes: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Signos Vitales y Examen Físico:</label>
                    <textarea
                      className="form-textarea"
                      rows="4"
                      placeholder="TA: 120/80 mmHg | FC: 72 lpm | FR: 16 rpm | Peso: 75 kg | Hallazgos auscultación..."
                      value={consultationForm.physical_exam}
                      onChange={(e) => setConsultationForm({ ...consultationForm, physical_exam: e.target.value })}
                    />
                  </div>
                </div>

                {/* 2. Prescripción Médica con Código Único de 6 Dígitos */}
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                        2. Prescripción y Receta Electrónica (Generación de Código de 6 Dígitos)
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Cada medicamento emitirá automáticamente un código numérico único de 6 dígitos que el paciente presentará en farmacia.
                      </p>
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddPrescription}>
                      <Plus size={14} />
                      Agregar Medicamento
                    </button>
                  </div>

                  {consultationForm.prescriptions.map((p, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '0.75rem', position: 'relative' }}>
                      <div className="form-grid-3">
                        <div className="form-group">
                          <label className="form-label">Medicamento</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Ej. Losartán Potásico 50mg"
                            value={p.medication_name}
                            onChange={(e) => handlePrescriptionChange(idx, 'medication_name', e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Dosis y Vía</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Ej. 1 tableta (50mg)"
                            value={p.dosage}
                            onChange={(e) => handlePrescriptionChange(idx, 'dosage', e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Frecuencia y Duración</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Ej. Cada 12 horas x 30 días"
                            value={p.frequency}
                            onChange={(e) => handlePrescriptionChange(idx, 'frequency', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Instrucciones Específicas al Paciente</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Ej. Tomar en la mañana después del desayuno con abundante agua"
                          value={p.instructions}
                          onChange={(e) => handlePrescriptionChange(idx, 'instructions', e.target.value)}
                        />
                      </div>
                      {consultationForm.prescriptions.length > 1 && (
                        <button
                          type="button"
                          className="icon-btn"
                          style={{ position: 'absolute', top: '10px', right: '10px', color: 'var(--danger)' }}
                          onClick={() => handleRemovePrescription(idx)}
                          title="Eliminar medicamento"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* 3. Solicitud de Exámenes / Laboratorios */}
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                        3. Solicitud de Exámenes / Laboratorios Clínicos
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Enlaza órdenes directas que aparecerán en el módulo del personal de laboratorio.
                      </p>
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddLabOrder}>
                      <Plus size={14} />
                      Ordenar Examen
                    </button>
                  </div>

                  {consultationForm.lab_orders.map((lab, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-subtle)', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <div style={{ flex: 2 }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Nombre del Examen (ej. Perfil Lipídico, Rayos X Tórax...)"
                          value={lab.test_type}
                          onChange={(e) => {
                            const updated = [...consultationForm.lab_orders];
                            updated[idx].test_type = e.target.value;
                            setConsultationForm({ ...consultationForm, lab_orders: updated });
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <select
                          className="form-select"
                          value={lab.test_category}
                          onChange={(e) => {
                            const updated = [...consultationForm.lab_orders];
                            updated[idx].test_category = e.target.value;
                            setConsultationForm({ ...consultationForm, lab_orders: updated });
                          }}
                        >
                          <option value="Sangre">Sangre / Hematología</option>
                          <option value="Orina">Orina / Microbiología</option>
                          <option value="Imágenes">Imágenes / Rayos X</option>
                          <option value="Cardiología">Cardiología / ECG</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        className="icon-btn"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => handleRemoveLabOrder(idx)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* 4. Remisiones y Controles */}
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                        4. Remisiones y Controles Médicos
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Envía solicitud a administración para control periódico o deriva a otro especialista.
                      </p>
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddReferral}>
                      <Plus size={14} />
                      Crear Remisión / Control
                    </button>
                  </div>

                  {consultationForm.referrals.map((ref, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-subtle)', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <select
                        className="form-select"
                        style={{ flex: 1 }}
                        value={ref.referral_type}
                        onChange={(e) => {
                          const updated = [...consultationForm.referrals];
                          updated[idx].referral_type = e.target.value;
                          setConsultationForm({ ...consultationForm, referrals: updated });
                        }}
                      >
                        <option value="control">Control Periódico</option>
                        <option value="specialist">Derivación a Especialista</option>
                      </select>

                      <input
                        type="text"
                        className="form-input"
                        style={{ flex: 2 }}
                        placeholder="Especialidad destino (ej. Cardiología, Neumología)"
                        value={ref.target_specialty}
                        onChange={(e) => {
                          const updated = [...consultationForm.referrals];
                          updated[idx].target_specialty = e.target.value;
                          setConsultationForm({ ...consultationForm, referrals: updated });
                        }}
                      />

                      <input
                        type="text"
                        className="form-input"
                        style={{ flex: 2 }}
                        placeholder="Motivo clínico de la remisión"
                        value={ref.reason}
                        onChange={(e) => {
                          const updated = [...consultationForm.referrals];
                          updated[idx].reason = e.target.value;
                          setConsultationForm({ ...consultationForm, referrals: updated });
                        }}
                      />

                      <button
                        type="button"
                        className="icon-btn"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => handleRemoveReferral(idx)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Sello de Seguridad y Firma */}
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-light)',
                  border: '1px solid var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Shield size={20} color="var(--primary)" />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                        Firma Digital y Certificado Médico Activo
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Doctor emisor: {doctorUser.name} • Especialidad: {doctorUser.specialty}
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary">
                    <CheckCircle2 size={18} />
                    Finalizar Consulta, Emitir Códigos 6D y Firmar
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* 3. SECCIÓN: CONFIGURACIÓN DE DISPONIBILIDAD DEL DOCTOR */}
      {activeTab === 'disponibilidad' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Clock size={22} color="var(--primary)" />
                Gestión de Disponibilidad Horaria y Días de Atención
              </h2>
              <p className="card-subtitle">
                Configura los días y franjas horarias en las que atiendes consultas para que el equipo de recepción optimice la asignación de turnos.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveAvailability}>
            <div className="form-group">
              <label className="form-label">Días Habilitados para Citas:</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                {allWeekDays.map(day => {
                  const isSelected = availability.days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => {
                        const newDays = isSelected
                          ? availability.days.filter(d => d !== day)
                          : [...availability.days, day];
                        setAvailability({ ...availability, days: newDays });
                      }}
                    >
                      {isSelected ? `✓ ${day}` : day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1.25rem' }}>
              <label className="form-label">Franjas Horarias Disponibles (separadas por coma):</label>
              <input
                type="text"
                className="form-input"
                value={availability.hours.join(', ')}
                onChange={(e) => {
                  const parts = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  setAvailability({ ...availability, hours: parts });
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Ejemplo: 08:00 - 12:00, 14:00 - 18:00
              </span>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary">
                <CheckCircle2 size={18} />
                Guardar Mi Disponibilidad
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

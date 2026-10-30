import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  FlaskConical,
  UploadCloud,
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Filter,
  Paperclip
} from 'lucide-react';

export default function LabModule({ labUser, onShowToast }) {
  const [orders, setOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Formulario de Carga de Resultados
  const [resultForm, setResultForm] = useState({
    result_notes: '',
    attachment_name: '',
    param1_name: 'Colesterol Total',
    param1_val: '175 mg/dL',
    param2_name: 'Triglicéridos',
    param2_val: '140 mg/dL',
    param3_name: 'Glucosa en Ayunas',
    param3_val: '92 mg/dL'
  });

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getLabOrders();
      setOrders(res.data);
    } catch (err) {
      onShowToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  const handleOpenUpload = (order) => {
    setSelectedOrder(order);
    setResultForm({
      result_notes: `Examen procesado en analizador automatizado. Muestra en condiciones óptimas. Parámetros dentro de rangos normales de referencia clínica.`,
      attachment_name: `Informe_${order.test_type.replace(/[^a-zA-Z0-9]/g, '_')}_${order.patient_name.replace(/\s+/g, '_')}.pdf`,
      param1_name: 'Parámetro Principal',
      param1_val: 'Normal / Negativo',
      param2_name: 'Índice de Referencia',
      param2_val: 'En meta clínica',
      param3_name: 'Validación Bioquímica',
      param3_val: 'Conforme'
    });
    setShowUploadModal(true);
  };

  // Sanitizador seguro contra Prototype Pollution
  const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
  const safeSetParam = (target, rawKey, rawValue) => {
    const key = String(rawKey || '').trim();
    if (key && !FORBIDDEN_KEYS.has(key.toLowerCase())) {
      Object.defineProperty(target, key, {
        value: String(rawValue || '').trim(),
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
  };

  const handleSaveResult = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      // Objeto seguro sin prototipo para prevenir contaminación de prototipos
      const result_values = Object.create(null);
      if (resultForm.param1_name && resultForm.param1_val) {
        safeSetParam(result_values, resultForm.param1_name, resultForm.param1_val);
      }
      if (resultForm.param2_name && resultForm.param2_val) {
        safeSetParam(result_values, resultForm.param2_name, resultForm.param2_val);
      }
      if (resultForm.param3_name && resultForm.param3_val) {
        safeSetParam(result_values, resultForm.param3_name, resultForm.param3_val);
      }

      await api.submitLabResult(selectedOrder.id, {
        result_notes: resultForm.result_notes,
        result_values: { ...result_values },
        attachment_name: resultForm.attachment_name,
        attachment_url: `#report-${selectedOrder.id}`,
        completed_by: labUser?.id || 4,
        actingUserName: labUser?.name || 'Laboratorio Clínico'
      });

      onShowToast(`¡Resultado cargado exitosamente e incorporado a la historia clínica de ${selectedOrder.patient_name}!`, 'success');
      setShowUploadModal(false);
      await loadOrders();
    } catch (err) {
      onShowToast(err.message, 'error');
    }
  };

  const filtered = orders.filter(o => {
    if (filterStatus === 'all') return true;
    return o.status === filterStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <FlaskConical size={22} color="var(--primary)" />
              Módulo de Laboratorio Clínico y Procesamiento
            </h2>
            <p className="card-subtitle">
              Gestiona órdenes de laboratorio solicitadas por los médicos tratantes, carga resultados validados y adjunta informes directamente al expediente del paciente.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <Filter size={16} color="var(--text-muted)" />
              <span>Filtrar por:</span>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '0.4rem 0.75rem' }}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Todas ({orders.length})</option>
                <option value="Pendiente">Pendientes ({orders.filter(o => o.status === 'Pendiente').length})</option>
                <option value="Completado">Completados ({orders.filter(o => o.status === 'Completado').length})</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabla de Órdenes */}
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID Orden</th>
                <th>Paciente</th>
                <th>Prueba / Examen Solicitado</th>
                <th>Categoría</th>
                <th>Doctor Emisor</th>
                <th>Estado</th>
                <th>Acción de Laboratorio</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No hay órdenes de laboratorio en la categoría seleccionada.
                  </td>
                </tr>
              ) : (
                filtered.map(order => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>
                      <strong>{order.patient_name}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {order.patient_document} • {order.eps_insurance}
                      </div>
                    </td>
                    <td>
                      <strong>{order.test_type}</strong>
                      {order.instructions && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Indicación: {order.instructions}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-confirmada">{order.test_category}</span>
                    </td>
                    <td>
                      <div>{order.doctor_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.doctor_specialty}</div>
                    </td>
                    <td>
                      <span className={`badge ${order.status === 'Completado' ? 'badge-completada' : 'badge-solicitada'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      {order.status === 'Pendiente' ? (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleOpenUpload(order)}
                        >
                          <UploadCloud size={14} />
                          Cargar Resultados
                        </button>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
                            ✓ Validado por {order.technician_name || 'Laboratorio'}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {order.attachment_name}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PARA CARGAR RESULTADOS DE LABORATORIO */}
      {showUploadModal && selectedOrder && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowUploadModal(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowUploadModal(false);
          }}
        >
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="lab-modal-title">
            <div className="modal-header">
              <h3 id="lab-modal-title" className="card-title">
                <UploadCloud size={20} color="var(--primary)" />
                Carga de Resultados Clínicos: {selectedOrder.test_type}
              </h3>
              <button type="button" className="icon-btn" onClick={() => setShowUploadModal(false)} aria-label="Cerrar modal">✕</button>
            </div>
            <form onSubmit={handleSaveResult}>
              <div className="modal-body">
                <div style={{ background: 'var(--bg-subtle)', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <strong>Paciente:</strong> {selectedOrder.patient_name} ({selectedOrder.patient_document})<br />
                  <strong>Ordenado por:</strong> {selectedOrder.doctor_name} • <strong>Categoría:</strong> {selectedOrder.test_category}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="lab-result-notes">Notas e Interpretación Bioquímica del Resultado:</label>
                  <textarea
                    id="lab-result-notes"
                    className="form-textarea"
                    rows="3"
                    value={resultForm.result_notes}
                    onChange={(e) => setResultForm({ ...resultForm, result_notes: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <span className="form-label" id="lab-params-group-title" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Parámetros Cuantitativos de Laboratorio (Métricas):</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }} role="group" aria-labelledby="lab-params-group-title">
                    <div className="form-grid-2">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Parámetro 1"
                        aria-label="Nombre del Parámetro 1"
                        value={resultForm.param1_name}
                        onChange={(e) => setResultForm({ ...resultForm, param1_name: e.target.value })}
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Valor y unidades (ej. 120 mg/dL)"
                        aria-label="Valor del Parámetro 1"
                        value={resultForm.param1_val}
                        onChange={(e) => setResultForm({ ...resultForm, param1_val: e.target.value })}
                      />
                    </div>
                    <div className="form-grid-2">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Parámetro 2"
                        aria-label="Nombre del Parámetro 2"
                        value={resultForm.param2_name}
                        onChange={(e) => setResultForm({ ...resultForm, param2_name: e.target.value })}
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Valor y unidades"
                        aria-label="Valor del Parámetro 2"
                        value={resultForm.param2_val}
                        onChange={(e) => setResultForm({ ...resultForm, param2_val: e.target.value })}
                      />
                    </div>
                    <div className="form-grid-2">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Parámetro 3"
                        aria-label="Nombre del Parámetro 3"
                        value={resultForm.param3_name}
                        onChange={(e) => setResultForm({ ...resultForm, param3_name: e.target.value })}
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Valor y unidades"
                        aria-label="Valor del Parámetro 3"
                        value={resultForm.param3_val}
                        onChange={(e) => setResultForm({ ...resultForm, param3_val: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="lab-attachment-name">Nombre del Archivo Adjunto (Informe PDF Oficial):</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Paperclip size={18} color="var(--primary)" />
                    <input
                      id="lab-attachment-name"
                      type="text"
                      className="form-input"
                      value={resultForm.attachment_name}
                      onChange={(e) => setResultForm({ ...resultForm, attachment_name: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle2 size={16} />
                  Publicar Resultado en Historia Clínica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

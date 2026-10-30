import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  ShieldCheck,
  FileCheck2,
  Lock,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Pill,
  Clock,
  User
} from 'lucide-react';

export default function AuditModule({ onClose, onShowToast }) {
  const [logs, setLogs] = useState([]);
  const [filterAction, setFilterAction] = useState('all');
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({ limit: 100 });
      setLogs(res.data);
    } catch (err) {
      onShowToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, []);

  const filteredLogs = logs.filter(l => {
    if (filterAction === 'all') return true;
    return l.action === filterAction;
  });

  const getActionBadge = (action) => {
    if (action.includes('ACCESS_MEDICAL')) {
      return <span className="badge badge-confirmada"><Eye size={12} /> Acceso Historia</span>;
    }
    if (action.includes('DISPENSE')) {
      return <span className="badge badge-completada"><Pill size={12} /> Dispensación Farmacia</span>;
    }
    if (action.includes('CONSULTATION') || action.includes('CREATE_MEDICAL')) {
      return <span className="badge badge-color-tag" style={{ background: '#8b5cf6' }}>🩺 Atención Médica</span>;
    }
    if (action.includes('APPOINTMENT')) {
      return <span className="badge badge-solicitada">📅 Cita / Agenda</span>;
    }
    return <span className="badge badge-secondary">{action}</span>;
  };

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="modal-content" style={{ maxWidth: '950px' }} role="dialog" aria-modal="true" aria-labelledby="audit-modal-title">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={22} color="var(--primary)" />
            <div>
              <h3 id="audit-modal-title" className="card-title" style={{ margin: 0 }}>
                Bitácora de Seguridad & Auditoría Clínica
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Trazabilidad inmutable de acceso a historias clínicas y entrega de medicamentos
              </div>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar modal">✕</button>
        </div>

        <div className="modal-body">
          {/* Barra de Filtros */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <Filter size={16} color="var(--text-muted)" />
              <span>Filtrar eventos:</span>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '0.35rem 0.65rem' }}
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
              >
                <option value="all">Todos los registros ({logs.length})</option>
                <option value="ACCESS_MEDICAL_RECORD">Accesos a Historias Clínicas</option>
                <option value="DISPENSE_MEDICATION">Dispensaciones de Farmacia</option>
                <option value="COMPLETE_CONSULTATION">Consultas Finalizadas</option>
                <option value="UPDATE_APPOINTMENT_STATUS">Cambios de Estado de Citas</option>
              </select>
            </div>

            <button className="btn btn-secondary btn-sm" onClick={loadLogs}>
              <RefreshCw size={14} />
              Actualizar Bitácora
            </button>
          </div>

          {/* Tabla de Logs */}
          <div className="table-responsive" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Fecha & Hora</th>
                  <th>Usuario Activo</th>
                  <th>Rol</th>
                  <th>Tipo de Evento</th>
                  <th>Detalles de Trazabilidad</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No hay eventos registrados con el filtro actual.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                        <strong>{log.created_at}</strong>
                      </td>
                      <td>
                        <strong>{log.user_name}</strong>
                      </td>
                      <td>
                        <span className="badge badge-confirmada" style={{ fontSize: '0.7rem' }}>
                          {log.role}
                        </span>
                      </td>
                      <td>
                        {getActionBadge(log.action)}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Cerrar Bitácora
          </button>
        </div>
      </div>
    </div>
  );
}

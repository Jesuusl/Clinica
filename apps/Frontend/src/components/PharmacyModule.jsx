import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Pill,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
  Layers,
  ArrowRight,
  RefreshCw,
  Plus,
  Lock,
  UserCheck
} from 'lucide-react';

export default function PharmacyModule({ pharmacyUser, onShowToast }) {
  const [activeTab, setActiveTab] = useState('canje'); // 'canje', 'inventario'
  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState({ total_items: 0, critical_alerts: 0 });
  const [loading, setLoading] = useState(true);

  // Estados del Canje de Código de 6 Dígitos
  const [pickupCodeInput, setPickupCodeInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifiedPrescription, setVerifiedPrescription] = useState(null);
  const [verificationError, setVerificationError] = useState(null);
  const [dispensing, setDispensing] = useState(false);
  const [lastDispenseResult, setLastDispenseResult] = useState(null);

  // Estado para Reabastecer Medicamento
  const [selectedRestockItem, setSelectedRestockItem] = useState(null);
  const [restockAmount, setRestockAmount] = useState(20);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const res = await api.getPharmacyInventory();
      setInventory(res.data);
      setSummary(res.summary);
    } catch (err) {
      onShowToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInventory();
  }, []);

  // 1. Validar Código de 6 Dígitos
  const handleVerifyCode = async (codeToVerify) => {
    const code = (codeToVerify || pickupCodeInput).trim();
    if (!code) {
      onShowToast('Ingresa el código de 6 dígitos para validar.', 'error');
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setVerificationError('El código debe componerse exactamente de 6 dígitos numéricos.');
      setVerifiedPrescription(null);
      return;
    }

    setVerifying(true);
    setVerificationError(null);
    setVerifiedPrescription(null);
    setLastDispenseResult(null);

    try {
      const res = await api.verifyPharmacyCode(code);
      setVerifiedPrescription(res.data);
      onShowToast(`✓ Código ${code} verificado. Paciente: ${res.data.patient_name}`, 'success');
    } catch (err) {
      setVerificationError(err.message);
      onShowToast(err.message, 'error');
    } finally {
      setVerifying(false);
    }
  };

  // 2. Confirmación de Entrega Irreversible
  const handleConfirmDispense = async () => {
    if (!verifiedPrescription) return;

    setDispensing(true);
    try {
      const res = await api.dispenseMedication({
        pickup_code: verifiedPrescription.pickup_code,
        dispensed_by: pharmacyUser?.id || 5,
        actingUserName: pharmacyUser?.name || 'QF. Laura Mendoza'
      });

      setLastDispenseResult(res.data);
      setVerifiedPrescription(null);
      setPickupCodeInput('');
      onShowToast(`¡Entrega confirmada! Se descontó el stock y el código quedó invalidado irreversiblemente.`, 'success');
      await loadInventory();
    } catch (err) {
      onShowToast(err.message, 'error');
    } finally {
      setDispensing(false);
    }
  };

  // 3. Reabastecer Stock de Medicamento
  const handleRestock = async (e) => {
    e.preventDefault();
    if (!selectedRestockItem) return;

    try {
      await api.updatePharmacyStock(selectedRestockItem.id, {
        add_quantity: Number(restockAmount),
        actingUserName: pharmacyUser?.name || 'Farmacia'
      });
      onShowToast(`Se añadieron ${restockAmount} unidades a ${selectedRestockItem.medication_name}`, 'success');
      setSelectedRestockItem(null);
      await loadInventory();
    } catch (err) {
      onShowToast(err.message, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Navegación del Módulo de Farmacia */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'canje' ? 'active' : ''}`}
          onClick={() => setActiveTab('canje')}
        >
          <Lock size={18} />
          <span>Canje de Receta por Código 6D</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'inventario' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventario')}
        >
          <Package size={18} />
          <span>Inventario en Tiempo Real & Alertas</span>
          {summary.critical_alerts > 0 && (
            <span className="badge badge-cancelada critical-stock-alert" style={{ fontSize: '0.7rem' }}>
              ⚠️ {summary.critical_alerts} stock crítico
            </span>
          )}
        </button>
      </div>

      {/* 1. SECCIÓN: CANJE POR CÓDIGO DE 6 DÍGITOS */}
      {activeTab === 'canje' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  <Pill size={22} color="var(--primary)" />
                  Ventanilla de Dispensación y Canje por Código Único
                </h2>
                <p className="card-subtitle">
                  Ingresa el código único de 6 dígitos presentado por el paciente. La base de datos valida vigencia, no-reutilización y existencia de stock antes de despachar.
                </p>
              </div>
            </div>

            {/* Formulario de Búsqueda de Código */}
            <div style={{
              background: 'var(--bg-subtle)',
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '650px',
              margin: '0 auto 1.5rem',
              border: '1px solid var(--border-color)',
              textAlign: 'center'
            }}>
              <label htmlFor="pharmacy-pickup-input" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                DIGITA EL CÓDIGO DE RECLAMO (6 DÍGITOS):
              </label>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', alignItems: 'center' }}>
                <input
                  id="pharmacy-pickup-input"
                  type="text"
                  maxLength="6"
                  placeholder="Ej. 849201"
                  className="form-input"
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    letterSpacing: '0.3em',
                    textAlign: 'center',
                    maxWidth: '260px',
                    fontFamily: 'monospace'
                  }}
                  value={pickupCodeInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPickupCodeInput(val);
                    if (val.length === 6) {
                      handleVerifyCode(val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleVerifyCode();
                  }}
                />

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleVerifyCode()}
                  disabled={verifying}
                  style={{ minWidth: '130px' }}
                >
                  <Search size={18} />
                  {verifying ? 'Validando...' : 'Verificar'}
                </button>
              </div>

              {/* Botones de prueba rápida con códigos existentes */}
              <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Códigos demo en el sistema: </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', margin: '0 0.25rem' }}
                  onClick={() => {
                    setPickupCodeInput('849201');
                    handleVerifyCode('849201');
                  }}
                >
                  849201 (Pendiente)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', margin: '0 0.25rem' }}
                  onClick={() => {
                    setPickupCodeInput('391845');
                    handleVerifyCode('391845');
                  }}
                >
                  391845 (Ya Reclamado)
                </button>
              </div>
            </div>

            {/* Error de Validación */}
            {verificationError && (
              <div className="alert-box alert-danger" style={{ maxWidth: '650px', margin: '0 auto 1.5rem' }}>
                <XCircle size={20} />
                <div>
                  <strong>No es posible dispensar:</strong>
                  <div>{verificationError}</div>
                </div>
              </div>
            )}

            {/* Éxito de la última dispensación */}
            {lastDispenseResult && (
              <div className="alert-box alert-success" style={{ maxWidth: '650px', margin: '0 auto 1.5rem' }}>
                <CheckCircle2 size={24} />
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>¡Dispensación Confirmada e Irreversible!</h4>
                  <p style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}>
                    Medicamento: <strong>{lastDispenseResult.medication_name}</strong> • Código: <strong>{lastDispenseResult.pickup_code}</strong> (Marcado como RECLAMADO).
                  </p>
                  <p style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                    Stock restante en farmacia: <strong>{lastDispenseResult.remaining_stock} unidades</strong>
                    {lastDispenseResult.is_critical && ' (⚠️ Nivel de stock crítico alcanzado)'}.
                  </p>
                </div>
              </div>
            )}

            {/* Tarjeta de Prescripción Verificada Lista para Dispensar */}
            {verifiedPrescription && (
              <div style={{
                maxWidth: '650px',
                margin: '0 auto',
                background: 'var(--bg-card)',
                border: '2px solid var(--primary)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-hover)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <div>
                    <span className="badge badge-confirmada">Código Verificado: {verifiedPrescription.pickup_code}</span>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--text-primary)' }}>
                      {verifiedPrescription.medication_name}
                    </h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stock Disponible:</div>
                    <div style={{
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: verifiedPrescription.stock_quantity <= verifiedPrescription.min_threshold_alert ? 'var(--danger)' : 'var(--success)'
                    }}>
                      {verifiedPrescription.stock_quantity !== null ? `${verifiedPrescription.stock_quantity} uds` : 'En bodega'}
                    </div>
                  </div>
                </div>

                <div className="form-grid-2" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Paciente:</span><br />
                    <strong>{verifiedPrescription.patient_name}</strong> ({verifiedPrescription.patient_document})
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>EPS / Aseguradora:</span><br />
                    <strong>{verifiedPrescription.eps_insurance || 'Particular'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Médico Prescriptor:</span><br />
                    <strong>{verifiedPrescription.doctor_name}</strong> ({verifiedPrescription.doctor_specialty})
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Posología:</span><br />
                    <strong>{verifiedPrescription.dosage}</strong> • {verifiedPrescription.frequency}
                  </div>
                </div>

                {verifiedPrescription.instructions && (
                  <div style={{ background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                    <strong>Instrucciones médicas:</strong> {verifiedPrescription.instructions}
                  </div>
                )}

                {/* Botón de Confirmación de Entrega Irreversible */}
                <button
                  type="button"
                  className="btn btn-success btn-block"
                  style={{ padding: '0.85rem 1.5rem', fontSize: '1rem' }}
                  onClick={handleConfirmDispense}
                  disabled={dispensing}
                >
                  <CheckCircle2 size={20} />
                  {dispensing ? 'Procesando Entrega y Descuento...' : 'Confirmar Entrega (Descontar Stock e Invalidar Código)'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. SECCIÓN: INVENTARIO EN TIEMPO REAL CON ALERTAS DE STOCK CRÍTICO */}
      {activeTab === 'inventario' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Package size={22} color="var(--primary)" />
                Inventario de Farmacia en Tiempo Real
              </h2>
              <p className="card-subtitle">
                Monitoreo de existencias farmacéuticas con <strong>alertas visuales de stock crítico</strong> automáticas cuando el stock es menor o igual al umbral mínimo.
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={loadInventory}>
              <RefreshCw size={14} />
              Actualizar Existencias
            </button>
          </div>

          {/* Banner de Alerta si hay medicamentos críticos */}
          {summary.critical_alerts > 0 && (
            <div className="alert-box alert-danger">
              <AlertTriangle size={24} />
              <div>
                <strong style={{ fontSize: '0.95rem' }}>⚠️ ALERTA DE STOCK CRÍTICO ACTIVA ({summary.critical_alerts} medicamentos):</strong>
                <div style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  Existen medicamentos con niveles de reserva inferiores al umbral mínimo de seguridad. Reabastece inmediatamente para no retrasar las dispensaciones a pacientes.
                </div>
              </div>
            </div>
          )}

          {/* Tabla de Inventario */}
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Medicamento</th>
                  <th>Categoría</th>
                  <th>Stock Actual</th>
                  <th>Umbral Mínimo</th>
                  <th>Estado de Stock</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(item => (
                  <tr
                    key={item.id}
                    style={{
                      background: item.is_critical_stock ? 'rgba(239, 68, 68, 0.04)' : 'transparent'
                    }}
                  >
                    <td>#{item.id}</td>
                    <td>
                      <strong>{item.medication_name}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.presentation}</div>
                    </td>
                    <td>
                      <span className="badge badge-confirmada">{item.category}</span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: item.is_critical_stock ? 'var(--danger)' : 'var(--text-primary)'
                      }}>
                        {item.stock_quantity}
                      </span>{' '}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.unit}</span>
                    </td>
                    <td>{item.min_threshold_alert} {item.unit}</td>
                    <td>
                      {item.is_critical_stock ? (
                        <span className="badge badge-cancelada critical-stock-alert">
                          ⚠️ Stock Crítico (&le; {item.min_threshold_alert})
                        </span>
                      ) : (
                        <span className="badge badge-completada">
                          ✓ Stock Normal
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setSelectedRestockItem(item);
                          setRestockAmount(30);
                        }}
                      >
                        <Plus size={14} />
                        Reabastecer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL PARA REABASTECER STOCK */}
      {selectedRestockItem && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedRestockItem(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSelectedRestockItem(null);
          }}
        >
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="pharmacy-restock-title">
            <div className="modal-header">
              <h3 id="pharmacy-restock-title" className="card-title">
                <Package size={20} color="var(--primary)" />
                Reabastecer: {selectedRestockItem.medication_name}
              </h3>
              <button type="button" className="icon-btn" onClick={() => setSelectedRestockItem(null)} aria-label="Cerrar modal">✕</button>
            </div>
            <form onSubmit={handleRestock}>
              <div className="modal-body">
                <div style={{ background: 'var(--bg-subtle)', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  Stock actual: <strong>{selectedRestockItem.stock_quantity} {selectedRestockItem.unit}</strong> • Umbral de alerta: <strong>{selectedRestockItem.min_threshold_alert}</strong>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="pharmacy-restock-amount">Cantidad a Ingresar al Inventario:</label>
                  <input
                    id="pharmacy-restock-amount"
                    type="number"
                    min="1"
                    className="form-input"
                    value={restockAmount}
                    onChange={(e) => setRestockAmount(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedRestockItem(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle2 size={16} />
                  Confirmar Entrada a Inventario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

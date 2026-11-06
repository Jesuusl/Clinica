import React, { useState } from 'react';
import {
  X,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  MapPin,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Stethoscope,
  FlaskConical,
  Pill,
  HeartPulse
} from 'lucide-react';
import { api, DEMO_ACCOUNTS } from '../services/api';

export default function AuthModal({
  isOpen,
  initialTab = 'login', // 'login' or 'register'
  onClose,
  onAuthSuccess,
  onShowToast
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estado del Formulario de Inicio de Sesión
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  // Estado del Formulario de Registro de Paciente
  const [registerForm, setRegisterForm] = useState({
    name: '',
    document_id: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    address: '',
    eps_insurance: 'Sura',
    policy_number: 'POL-AUTO-REG',
    blood_type: 'O+',
    allergies: '',
    chronic_conditions: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });

  if (!isOpen) return null;

  // Manejar Login Estándar
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!loginForm.email || !loginForm.password) {
      setErrorMessage('Por favor ingresa tu correo y contraseña clínica.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.login({
        email: loginForm.email.trim(),
        password: loginForm.password
      });

      if (onShowToast) {
        onShowToast(`¡Bienvenido/a de nuevo, ${res.data.user.name}!`, 'success');
      }
      onAuthSuccess(res.data.user);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  // Manejar Login Rápido con Demo (1 solo clic)
  const handleQuickDemoLogin = async (demoAccount) => {
    setErrorMessage('');
    setLoading(true);
    try {
      // Iniciar sesión segura con el endpoint de acceso demo del servidor (sin contraseñas en frontend)
      const res = await api.demoLogin(demoAccount.email);

      if (onShowToast) {
        onShowToast(`Acceso Demo activado: ${demoAccount.name} (${demoAccount.roleLabel})`, 'success');
      }
      onAuthSuccess(res.data.user);
      onClose();
    } catch (err) {
      setErrorMessage(`Error en demo: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Manejar Registro de Paciente
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Validaciones básicas
    if (
      !registerForm.name.trim() ||
      !registerForm.document_id.trim() ||
      !registerForm.email.trim() ||
      !registerForm.password ||
      !registerForm.phone.trim() ||
      !registerForm.address.trim()
    ) {
      setErrorMessage('Por favor completa todos los campos requeridos con asterisco (*).');
      return;
    }

    if (registerForm.password.length < 6) {
      setErrorMessage('La contraseña debe tener una longitud mínima de 6 caracteres.');
      return;
    }

    if (registerForm.password !== registerForm.confirm_password) {
      setErrorMessage('Las contraseñas ingresadas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: registerForm.name.trim(),
        document_id: registerForm.document_id.trim(),
        email: registerForm.email.trim().toLowerCase(),
        password: registerForm.password,
        phone: registerForm.phone.trim(),
        address: registerForm.address.trim(),
        eps_insurance: registerForm.eps_insurance.trim(),
        policy_number: registerForm.policy_number.trim() || 'POL-PARTICULAR',
        blood_type: registerForm.blood_type,
        allergies: registerForm.allergies.trim(),
        chronic_conditions: registerForm.chronic_conditions.trim(),
        emergency_contact_name: registerForm.emergency_contact_name.trim(),
        emergency_contact_phone: registerForm.emergency_contact_phone.trim(),
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80'
      };

      const res = await api.registerPatient(payload);

      if (onShowToast) {
        onShowToast(`¡Registro exitoso! Bienvenido/a a SaludPlus, ${res.data.user.name}`, 'success');
      }
      onAuthSuccess(res.data.user);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Error al procesar el registro del paciente.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return ShieldCheck;
      case 'doctor': return Stethoscope;
      case 'lab': return FlaskConical;
      case 'pharmacy': return Pill;
      case 'patient':
      default: return HeartPulse;
    }
  };

  return (
    <div
      className="modal-overlay auth-modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="modal-content auth-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        {/* Cabecera del Modal */}
        <div className="modal-header auth-modal-header">
          <div className="auth-header-brand">
            <div className="brand-logo" style={{ width: '36px', height: '36px' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 id="auth-modal-title" className="card-title" style={{ fontSize: '1.2rem' }}>
                Acceso al Portal Clínico SaludPlus
              </h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Sistema unificado con autenticación protegida
              </div>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Cerrar ventana de autenticación"
          >
            <X size={18} />
          </button>
        </div>

        {/* Selector de Pestañas: Login vs Registro Paciente */}
        <div className="auth-tabs-nav">
          <button
            type="button"
            className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('login');
              setErrorMessage('');
            }}
          >
            <LogIn size={16} />
            <span>Iniciar Sesión</span>
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('register');
              setErrorMessage('');
            }}
          >
            <UserPlus size={16} />
            <span>Crear Cuenta de Paciente</span>
          </button>
        </div>

        <div className="modal-body auth-modal-body">
          {/* Mensaje de Error si existe */}
          {errorMessage && (
            <div className="alert-box alert-danger" style={{ marginBottom: '1.25rem' }}>
              <AlertCircle size={18} />
              <div style={{ fontSize: '0.85rem' }}>{errorMessage}</div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 1. PESTAÑA: INICIAR SESIÓN                              */}
          {/* ======================================================== */}
          {activeTab === 'login' && (
            <div>
              <form onSubmit={handleLoginSubmit} className="auth-form">
                <div className="form-group">
                  <label className="form-label">Correo Electrónico Institucional o Personal *</label>
                  <div className="input-with-icon">
                    <Mail size={18} className="field-icon" />
                    <input
                      type="email"
                      className="form-input field-input"
                      placeholder="ejemplo@clinicasalud.com o tu@correo.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                      autoComplete="username"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Contraseña Clínica *</label>
                  <div className="input-with-icon">
                    <Lock size={18} className="field-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input field-input"
                      placeholder="Ingresa tu contraseña"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="toggle-pwd-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Ver u ocultar contraseña"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block auth-submit-btn"
                  disabled={loading}
                >
                  <LogIn size={18} />
                  <span>{loading ? 'Validando Credenciales...' : 'Ingresar al Portal Clínico'}</span>
                </button>
              </form>

              {/* SECCIÓN ACCESO RÁPIDO DEMO */}
              <div className="demo-access-section">
                <div className="demo-divider">
                  <span>O Ingresa en 1 Clic con Cuentas Demo</span>
                </div>

                <p className="demo-subtext">
                  Para evaluación rápida del tribunal o usuarios de prueba, haz clic sobre cualquiera de los perfiles preconfigurados:
                </p>

                <div className="demo-buttons-grid">
                  {DEMO_ACCOUNTS.map((acc, idx) => {
                    const RoleIcon = getRoleIcon(acc.role);
                    return (
                      <button
                        key={idx}
                        type="button"
                        className="demo-card-btn"
                        onClick={() => handleQuickDemoLogin(acc)}
                        disabled={loading}
                      >
                        <div className="demo-card-icon">
                          <RoleIcon size={18} />
                        </div>
                        <div className="demo-card-info">
                          <div className="demo-card-name">{acc.name}</div>
                          <div className="demo-card-role">{acc.roleLabel}</div>
                          <div className="demo-card-badge">{acc.badge}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. PESTAÑA: CREAR CUENTA DE PACIENTE                     */}
          {/* ======================================================== */}
          {activeTab === 'register' && (
            <div>
              <div className="alert-box alert-info" style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem' }}>
                <Sparkles size={18} />
                <div style={{ fontSize: '0.825rem' }}>
                  <strong>Auto-registro Exclusivo para Pacientes:</strong> Obtén de inmediato tu expediente digital,
                  agenda citas médicas y gestiona tus recetas farmacéuticas seguras.
                </div>
              </div>

              <form onSubmit={handleRegisterSubmit} className="auth-form">
                {/* 1. Datos Personales */}
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Nombre Completo *</label>
                    <div className="input-with-icon">
                      <User size={18} className="field-icon" />
                      <input
                        type="text"
                        className="form-input field-input"
                        placeholder="Ej: Camila Restrepo"
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Documento de Identidad (CC / TI) *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: 1020304050"
                      value={registerForm.document_id}
                      onChange={(e) => setRegisterForm({ ...registerForm, document_id: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* 2. Correo y Teléfono */}
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Correo Electrónico *</label>
                    <div className="input-with-icon">
                      <Mail size={18} className="field-icon" />
                      <input
                        type="email"
                        className="form-input field-input"
                        placeholder="tu.correo@ejemplo.com"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Teléfono Móvil *</label>
                    <div className="input-with-icon">
                      <Phone size={18} className="field-icon" />
                      <input
                        type="tel"
                        className="form-input field-input"
                        placeholder="+57 311 000 0000"
                        value={registerForm.phone}
                        onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Contraseñas */}
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Contraseña (Mínimo 6 caracteres) *</label>
                    <div className="input-with-icon">
                      <Lock size={18} className="field-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-input field-input"
                        placeholder="Mínimo 6 caracteres"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        className="toggle-pwd-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="Ver u ocultar contraseña"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Confirmar Contraseña *</label>
                    <div className="input-with-icon">
                      <Lock size={18} className="field-icon" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="form-input field-input"
                        placeholder="Repite tu contraseña"
                        value={registerForm.confirm_password}
                        onChange={(e) => setRegisterForm({ ...registerForm, confirm_password: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        className="toggle-pwd-btn"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label="Ver u ocultar confirmación de contraseña"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Dirección y EPS */}
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Dirección de Residencia *</label>
                    <div className="input-with-icon">
                      <MapPin size={18} className="field-icon" />
                      <input
                        type="text"
                        className="form-input field-input"
                        placeholder="Calle 85 # 15-20, Bogotá"
                        value={registerForm.address}
                        onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">EPS o Aseguradora de Salud *</label>
                    <select
                      className="form-select"
                      value={registerForm.eps_insurance}
                      onChange={(e) => setRegisterForm({ ...registerForm, eps_insurance: e.target.value })}
                      required
                    >
                      <option value="Sura">Sura EPS</option>
                      <option value="Sanitas">Sanitas EPS</option>
                      <option value="Salud Total">Salud Total EPS</option>
                      <option value="Nueva EPS">Nueva EPS</option>
                      <option value="Compensar">Compensar EPS</option>
                      <option value="Famisanar">Famisanar EPS</option>
                      <option value="Coosalud">Coosalud EPS</option>
                      <option value="Particular">Particular / Medicina Prepagada</option>
                    </select>
                  </div>
                </div>

                {/* 5. Datos Médicos Relevantes */}
                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Tipo de Sangre *</label>
                    <select
                      className="form-select"
                      value={registerForm.blood_type}
                      onChange={(e) => setRegisterForm({ ...registerForm, blood_type: e.target.value })}
                      required
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
                      placeholder="Ej: Penicilina, AINEs, Ninguna"
                      value={registerForm.allergies}
                      onChange={(e) => setRegisterForm({ ...registerForm, allergies: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Condición Crónica</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: Asma leve, Hipertensión, Ninguna"
                      value={registerForm.chronic_conditions}
                      onChange={(e) => setRegisterForm({ ...registerForm, chronic_conditions: e.target.value })}
                    />
                  </div>
                </div>

                {/* 6. Contacto de Emergencia */}
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Nombre del Contacto de Emergencia</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: Carlos Restrepo (Hermano)"
                      value={registerForm.emergency_contact_name}
                      onChange={(e) => setRegisterForm({ ...registerForm, emergency_contact_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Teléfono de Emergencia</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="+57 312 000 0000"
                      value={registerForm.emergency_contact_phone}
                      onChange={(e) => setRegisterForm({ ...registerForm, emergency_contact_phone: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block auth-submit-btn"
                  disabled={loading}
                  style={{ marginTop: '0.5rem' }}
                >
                  <UserPlus size={18} />
                  <span>{loading ? 'Creando Expediente Clínico...' : 'Completar Registro e Ingresar'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import {
  Activity,
  User,
  ShieldCheck,
  Stethoscope,
  FlaskConical,
  Pill,
  Sun,
  Moon,
  FileCheck
} from 'lucide-react';

export default function Header({
  activeRole,
  setActiveRole,
  currentUser,
  setCurrentUser,
  users,
  theme,
  setTheme,
  onOpenAudit
}) {
  const roles = [
    { key: 'patient', label: 'Pacientes', icon: User, desc: 'Portal y Perfil' },
    { key: 'admin', label: 'Recepción / Admin', icon: ShieldCheck, desc: 'Centro de Control' },
    { key: 'doctor', label: 'Doctores', icon: Stethoscope, desc: 'Consultas y Recetas' },
    { key: 'lab', label: 'Laboratorio', icon: FlaskConical, desc: 'Carga de Resultados' },
    { key: 'pharmacy', label: 'Farmacia', icon: Pill, desc: 'Canje y Stock' }
  ];

  // Filtrar los usuarios que pertenecen al rol activo para el selector de perfil
  const roleUsers = users.filter(u => u.role === activeRole);

  const handleRoleChange = (roleKey) => {
    setActiveRole(roleKey);
    const firstUserOfRole = users.find(u => u.role === roleKey);
    if (firstUserOfRole) {
      setCurrentUser(firstUserOfRole);
    }
  };

  const handleUserSelect = (userId) => {
    const selected = users.find(u => u.id === Number(userId));
    if (selected) {
      setCurrentUser(selected);
    }
  };

  return (
    <header className="header-wrapper">
      <div className="header-top">
        {/* Marca de la Clínica */}
        <div className="brand-area" onClick={() => handleRoleChange('patient')}>
          <div className="brand-logo">
            <Activity size={24} />
          </div>
          <div>
            <div className="brand-title">
              SaludPlus <span className="brand-badge">Hospital</span>
            </div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              Gestión Clínica & Trazabilidad Farmacéutica
            </div>
          </div>
        </div>

        {/* Selector de Rol Rápido */}
        <div className="role-switcher-container">
          <span className="role-switcher-label">Módulo:</span>
          <div className="role-pills">
            {roles.map(r => {
              const Icon = r.icon;
              const isActive = activeRole === r.key;
              return (
                <button
                  key={r.key}
                  className={`role-pill-btn ${isActive ? 'active' : ''}`}
                  onClick={() => handleRoleChange(r.key)}
                  title={r.desc}
                >
                  <Icon size={16} />
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Acciones Rápidas del Encabezado */}
        <div className="header-actions">
          {/* Botón de Auditoría General */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={onOpenAudit}
            title="Registro de Logs de Auditoría y Seguridad"
          >
            <FileCheck size={16} />
            <span>Auditoría</span>
          </button>

          {/* Toggle Modo Oscuro / Claro */}
          <button
            className="icon-btn"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title="Cambiar tema claro / oscuro"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </div>

      {/* Sub-barra de Contexto de Usuario */}
      {currentUser && (
        <div className="user-context-banner">
          <div className="user-context-inner">
            <div className="user-profile-badge">
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                alt={currentUser.name}
                className="user-avatar-sm"
              />
              <div>
                <strong>{currentUser.name}</strong>
                <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>•</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {currentUser.specialty || currentUser.eps_insurance || (currentUser.role === 'admin' ? 'Coordinador de Recepción' : currentUser.role)}
                </span>
                {currentUser.document_id && (
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ({currentUser.document_id})
                  </span>
                )}
              </div>
            </div>

            {/* Alternar entre usuarios del mismo rol si existen varios (ej. Juan vs María, Dra. Soto vs Dr. Ruiz) */}
            {roleUsers.length > 1 && (
              <div className="user-sub-switcher">
                <span>Cambiar usuario activo:</span>
                <select
                  className="user-sub-select"
                  value={currentUser.id}
                  onChange={(e) => handleUserSelect(e.target.value)}
                >
                  {roleUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.specialty ? `(${u.specialty})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

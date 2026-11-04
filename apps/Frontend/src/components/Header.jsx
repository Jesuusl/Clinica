import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  User,
  ShieldCheck,
  Stethoscope,
  FlaskConical,
  Pill,
  Sun,
  Moon,
  FileCheck,
  Globe,
  LogOut,
  Bell,
  CheckCheck,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  Inbox
} from 'lucide-react';
import { formatRelativeTime } from '../services/realtime';

export default function Header({
  activeRole,
  setActiveRole,
  currentUser,
  setCurrentUser,
  users,
  theme,
  setTheme,
  onOpenAudit,
  onGoToLanding,
  onLogout,
  notifications = [],
  unreadCount = 0,
  isSSEConnected = false,
  onMarkAllAsRead = () => {},
  onMarkAsRead = () => {},
  onClearNotifications = () => {}
}) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef(null);

  const roles = [
    { key: 'patient', label: 'Pacientes', icon: User, desc: 'Portal y Perfil' },
    { key: 'admin', label: 'Recepción / Admin', icon: ShieldCheck, desc: 'Centro de Control' },
    { key: 'doctor', label: 'Doctores', icon: Stethoscope, desc: 'Consultas y Recetas' },
    { key: 'lab', label: 'Laboratorio', icon: FlaskConical, desc: 'Carga de Resultados' },
    { key: 'pharmacy', label: 'Farmacia', icon: Pill, desc: 'Canje y Stock' }
  ];

  // Cerrar el dropdown al hacer clic fuera o presionar Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsNotificationsOpen(false);
      }
    };

    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isNotificationsOpen]);

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

  // Renderizador de iconos temáticos por tipo de notificación
  const renderNotificationIcon = (item) => {
    const iconType = item.iconType || item.type;
    switch (iconType) {
      case 'calendar':
      case 'APPOINTMENT_REQUESTED':
      case 'APPOINTMENT_UPDATED':
        return <Calendar size={18} />;
      case 'pill':
      case 'PRESCRIPTION_CREATED':
        return <Pill size={18} />;
      case 'check':
      case 'MEDICATION_DISPENSED':
        return <CheckCircle2 size={18} />;
      case 'alert':
      case 'LOW_STOCK_ALERT':
        return <AlertTriangle size={18} />;
      case 'lab':
      case 'LAB_RESULT_READY':
        return <FlaskConical size={18} />;
      case 'user-check':
      case 'DOCTOR_PROVISIONED':
        return <UserCheck size={18} />;
      case 'activity':
      case 'CONNECTED':
        return <Activity size={18} />;
      default:
        return <Bell size={18} />;
    }
  };

  return (
    <header className="header-wrapper">
      <div className="header-top">
        {/* Marca de la Clínica con Navegación al Inicio */}
        <button
          type="button"
          className="brand-area"
          onClick={onGoToLanding}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            textAlign: 'left',
            font: 'inherit',
            color: 'inherit',
            cursor: 'pointer'
          }}
          title="Ir a la Landing Page Principal"
          aria-label="Ir al inicio - SaludPlus Hospital"
        >
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
        </button>

        {/* Selector de Rol Rápido en el Portal */}
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
          {/* Botón para volver a la Landing Page */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onGoToLanding}
            title="Ver Sitio Web Institucional / Landing Page"
          >
            <Globe size={16} color="var(--primary)" />
            <span>Sitio Web</span>
          </button>

          {/* Botón de Auditoría General */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onOpenAudit}
            title="Registro de Logs de Auditoría y Seguridad"
          >
            <FileCheck size={16} />
            <span>Auditoría</span>
          </button>

          {/* CENTRO DE NOTIFICACIONES EN TIEMPO REAL CON INDICADOR SSE */}
          <div className="notification-bell-wrapper" ref={notificationRef}>
            <button
              type="button"
              className={`icon-btn notification-bell-btn ${isNotificationsOpen ? 'active' : ''}`}
              onClick={() => setIsNotificationsOpen(prev => !prev)}
              title={isSSEConnected ? 'Centro de Notificaciones en Vivo (🟢 Conectado)' : 'Centro de Notificaciones (🔴 Reconectando)'}
              aria-label="Centro de Notificaciones en Tiempo Real"
              aria-expanded={isNotificationsOpen}
            >
              <Bell size={18} />

              {/* Indicador de conexión SSE (puntito verde pulsante cuando está en línea) */}
              <span
                className={`connection-dot ${isSSEConnected ? 'online' : 'offline'}`}
                title={isSSEConnected ? '🟢 En línea (SSE Conectado)' : '🔴 Desconectado de Tiempo Real'}
              />

              {/* Badge numérico de notificaciones no leídas */}
              {unreadCount > 0 && (
                <span className="notification-count-badge" aria-label={`${unreadCount} notificaciones no leídas`}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* PANEL / MENÚ FLOTANTE DE NOTIFICACIONES */}
            {isNotificationsOpen && (
              <div className="notifications-dropdown">
                {/* Cabecera del Panel */}
                <div className="notifications-header">
                  <div className="notifications-header-left">
                    <div className="notifications-title-row">
                      <h3 className="notifications-title-text">Notificaciones en Tiempo Real</h3>
                      <span className={`live-status-pill ${isSSEConnected ? 'online' : 'offline'}`}>
                        <span className="live-status-dot" />
                        {isSSEConnected ? '🟢 En línea' : 'Reconectando'}
                      </span>
                    </div>
                    <div className="notifications-subtitle">
                      {unreadCount > 0
                        ? `${unreadCount} ${unreadCount === 1 ? 'notificación pendiente' : 'notificaciones pendientes'}`
                        : 'Bandeja al día'}
                    </div>
                  </div>

                  {notifications.length > 0 && (
                    <div className="notifications-header-actions">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          className="btn-mark-all-read"
                          onClick={onMarkAllAsRead}
                          title="Marcar todas las notificaciones como leídas"
                        >
                          <CheckCheck size={14} />
                          <span>Marcar leídas</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-clear-notifications"
                        onClick={onClearNotifications}
                        title="Limpiar todas las notificaciones"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Cuerpo con la Lista de Notificaciones o Estado Vacío */}
                <div className="notifications-body">
                  {notifications.length === 0 ? (
                    <div className="notifications-empty">
                      <div className="notifications-empty-icon">
                        <Inbox size={34} />
                      </div>
                      <h4 className="notifications-empty-title">No tienes notificaciones pendientes</h4>
                      <p className="notifications-empty-desc">
                        Las solicitudes de turnos, confirmaciones de citas, fórmulas farmacéuticas y resultados de laboratorio llegarán aquí en tiempo real.
                      </p>
                    </div>
                  ) : (
                    <ul className="notifications-list">
                      {notifications.map(n => (
                        <li
                          key={n.id}
                          className={`notification-item ${n.read ? 'read' : 'unread'} notification-${n.severity || 'info'}`}
                          onClick={() => onMarkAsRead(n.id)}
                        >
                          <div className={`notification-icon-box ${n.severity || 'info'}`}>
                            {renderNotificationIcon(n)}
                          </div>

                          <div className="notification-content">
                            <div className="notification-item-header">
                              <span className="notification-item-title">{n.title}</span>
                              <span className="notification-time">{formatRelativeTime(n.timestamp)}</span>
                            </div>
                            <p className="notification-item-message">{n.message}</p>

                            {/* Metadatos clínicos adicionales si aplican */}
                            {n.data?.pickup_code && (
                              <div className="notification-meta-tag">
                                <Pill size={12} />
                                <span>Código de reclamo: <strong>{n.data.pickup_code}</strong></span>
                              </div>
                            )}
                            {n.data?.current_stock !== undefined && (
                              <div className="notification-meta-tag alert">
                                <AlertTriangle size={12} />
                                <span>Stock restante: <strong>{n.data.current_stock} uds</strong></span>
                              </div>
                            )}
                          </div>

                          {!n.read && (
                            <span className="unread-dot" title="No leída" />
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Pie del Panel con indicador de canal */}
                <div className="notifications-footer">
                  <span>Canal seguro SSE • SaludPlus Live Core</span>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      className="btn-mark-all-link"
                      onClick={onMarkAllAsRead}
                    >
                      Marcar todas como leídas
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Toggle Modo Oscuro / Claro */}
          <button
            type="button"
            className="icon-btn"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title="Cambiar tema claro / oscuro"
            aria-label="Cambiar tema"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Botón de Cerrar Sesión */}
          <button
            type="button"
            className="btn btn-secondary btn-sm btn-logout"
            onClick={onLogout}
            title="Cerrar sesión activa y regresar al inicio"
          >
            <LogOut size={16} color="var(--danger)" />
            <span>Salir</span>
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

            {/* Alternar entre usuarios del mismo rol si existen varios */}
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

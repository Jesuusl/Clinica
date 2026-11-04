import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import LandingPage from './components/LandingPage';
import AuthModal from './components/AuthModal';
import Header from './components/Header';
import PatientModule from './components/PatientModule';
import AdminModule from './components/AdminModule';
import DoctorModule from './components/DoctorModule';
import LabModule from './components/LabModule';
import PharmacyModule from './components/PharmacyModule';
import AuditModule from './components/AuditModule';
import { api } from './services/api';
import { realtimeService, buildNotificationFromEvent, playNotificationTone } from './services/realtime';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  X
} from 'lucide-react';

const INITIAL_DEMO_NOTIFICATIONS = [
  {
    id: 'init_1',
    type: 'CONNECTED',
    title: '🟢 Canal SSE SaludPlus Activo',
    message: 'Sistema de eventos en tiempo real sincronizado y listo para recibir alertas clínicas.',
    severity: 'info',
    iconType: 'activity',
    timestamp: new Date().toISOString(),
    read: false,
    data: {}
  },
  {
    id: 'init_2',
    type: 'APPOINTMENT_REQUESTED',
    title: 'Sincronización Clínica en Vivo',
    message: 'Las solicitudes de turnos, fórmulas con código 6D y alertas de stock se actualizarán al instante.',
    severity: 'info',
    iconType: 'calendar',
    timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    read: true,
    data: {}
  }
];

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('saludplus_theme') || 'light';
    } catch {
      return 'light';
    }
  });

  const [view, setView] = useState('landing'); // 'landing' | 'portal'
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState('login'); // 'login' | 'register'

  const [users, setUsers] = useState([]);
  const [activeRole, setActiveRole] = useState('patient');
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Estados de Tiempo Real (SSE) y Notificaciones
  const [isSSEConnected, setIsSSEConnected] = useState(false);
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState(null);
  const [notifications, setNotifications] = useState(() => {
    try {
      const stored = localStorage.getItem('saludplus_notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_DEMO_NOTIFICATIONS;
  });

  // Persistir notificaciones en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('saludplus_notifications', JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  // Sincronizar tema con el atributo data-theme en el documento HTML y guardar preferencia
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('saludplus_theme', theme);
    } catch {}
  }, [theme]);

  // Notificaciones Toast flotantes mejoradas con título y severidad
  const showToast = useCallback((message, type = 'info', title = null) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  // Cargar usuarios del sistema y verificar si existe sesión previa
  const loadSystemUsers = async () => {
    try {
      const res = await api.getUsers();
      setUsers(res.data);
      return res.data;
    } catch (err) {
      console.error('Error al cargar lista de usuarios:', err);
      return [];
    }
  };

  useEffect(() => {
    async function initSession() {
      setLoadingInitial(true);
      try {
        const sysUsers = await loadSystemUsers();

        const token = api.getStoredToken();
        if (token) {
          try {
            const meRes = await api.getMe();
            if (meRes.data) {
              setCurrentUser(meRes.data);
              setActiveRole(meRes.data.role);
            }
          } catch (tokenErr) {
            console.warn('Token previo no válido o expirado:', tokenErr.message);
            api.clearSession();
          }
        } else {
          const defaultPatient = sysUsers.find(u => u.role === 'patient');
          if (defaultPatient) {
            setActiveRole('patient');
          }
        }
      } catch (err) {
        showToast(`Error al inicializar la plataforma: ${err.message}`, 'error');
      } finally {
        setLoadingInitial(false);
      }
    }
    void initSession();
  }, [showToast]);

  // CONEXIÓN Y SUSCRIPCIÓN EN TIEMPO REAL CON SSE
  useEffect(() => {
    const token = api.getStoredToken();
    realtimeService.connect(token, currentUser);

    // Escuchar estado de la conexión en vivo
    const unsubStatus = realtimeService.onStatusChange((status) => {
      setIsSSEConnected(status.isConnected);
    });

    // Escuchar todos los eventos clínicos entrantes
    const unsubEvents = realtimeService.subscribe('*', (event) => {
      setLastRealtimeEvent(event);

      // Si es el evento de confirmación de conexión
      if (event.type === 'CONNECTED') {
        setIsSSEConnected(true);
        return;
      }

      // Generar notificación visual
      const newNotif = buildNotificationFromEvent(event.type, event.data, event.timestamp);

      // Agregar a la bandeja de notificaciones
      setNotifications(prev => [newNotif, ...prev.slice(0, 49)]);

      // Sonido clínico sutil
      playNotificationTone(newNotif.severity);

      // Disparar Toast emergente en pantalla
      showToast(newNotif.message, newNotif.severity, newNotif.title);
    });

    return () => {
      unsubStatus();
      unsubEvents();
    };
  }, [currentUser?.id, currentUser?.role, showToast]);

  // Acciones sobre el Centro de Notificaciones
  const handleMarkAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const handleMarkAsRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? ({ ...n, read: true }) : n));
  }, []);

  const handleClearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Apertura de modal de autenticación
  const handleOpenAuth = (tab = 'login') => {
    setAuthInitialTab(tab);
    setShowAuthModal(true);
  };

  // Manejo de éxito en autenticación (Login o Registro)
  const handleAuthSuccess = async (authenticatedUser) => {
    setCurrentUser(authenticatedUser);
    setActiveRole(authenticatedUser.role);
    setView('portal');
    await loadSystemUsers();
  };

  // Manejo de Cerrar Sesión con desconexión limpia de SSE
  const handleLogout = () => {
    realtimeService.disconnect();
    api.logout();
    setCurrentUser(null);
    setView('landing');
    showToast('Has cerrado tu sesión correctamente.', 'info');
  };

  return (
    <div className="app-container">
      {/* VISTA 1: LANDING PAGE MÉDICA MODERNA */}
      {view === 'landing' && (
        <LandingPage
          currentUser={currentUser}
          theme={theme}
          setTheme={setTheme}
          onOpenAuth={handleOpenAuth}
          onEnterPortal={() => {
            if (currentUser) {
              setView('portal');
            } else {
              handleOpenAuth('login');
            }
          }}
          onShowToast={showToast}
        />
      )}

      {/* VISTA 2: PORTAL CLÍNICO HOSPITALARIO */}
      {view === 'portal' && (
        <>
          {/* Barra Superior del Portal */}
          <Header
            activeRole={activeRole}
            setActiveRole={setActiveRole}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            users={users}
            theme={theme}
            setTheme={setTheme}
            onOpenAudit={() => setShowAuditModal(true)}
            onGoToLanding={() => setView('landing')}
            onLogout={handleLogout}
            notifications={notifications}
            unreadCount={unreadCount}
            isSSEConnected={isSSEConnected}
            onMarkAllAsRead={handleMarkAllAsRead}
            onMarkAsRead={handleMarkAsRead}
            onClearNotifications={handleClearNotifications}
          />

          {/* Contenido Principal Modular según Rol */}
          <main className="main-content">
            {loadingInitial ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                Cargando portal clínico SaludPlus...
              </div>
            ) : (
              <>
                {activeRole === 'patient' && (
                  <PatientModule
                    patientUser={currentUser}
                    onShowToast={showToast}
                    lastRealtimeEvent={lastRealtimeEvent}
                  />
                )}

                {activeRole === 'admin' && (
                  <AdminModule
                    adminUser={currentUser}
                    onShowToast={showToast}
                    onOpenAudit={() => setShowAuditModal(true)}
                    lastRealtimeEvent={lastRealtimeEvent}
                  />
                )}

                {activeRole === 'doctor' && (
                  <DoctorModule
                    doctorUser={currentUser}
                    onShowToast={showToast}
                    lastRealtimeEvent={lastRealtimeEvent}
                  />
                )}

                {activeRole === 'lab' && (
                  <LabModule
                    labUser={currentUser}
                    onShowToast={showToast}
                    lastRealtimeEvent={lastRealtimeEvent}
                  />
                )}

                {activeRole === 'pharmacy' && (
                  <PharmacyModule
                    pharmacyUser={currentUser}
                    onShowToast={showToast}
                    lastRealtimeEvent={lastRealtimeEvent}
                  />
                )}
              </>
            )}
          </main>
        </>
      )}

      {/* Modal de Autenticación (Login & Registro de Paciente) */}
      <AuthModal
        isOpen={showAuthModal}
        initialTab={authInitialTab}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
        onShowToast={showToast}
      />

      {/* Modal de Auditoría y Seguridad */}
      {showAuditModal && (
        <AuditModule
          onClose={() => setShowAuditModal(false)}
          onShowToast={showToast}
        />
      )}

      {/* Toasts Flotantes Reactivos con Iconos y Animación */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type || 'info'}`}>
            <div className={`toast-icon-wrapper toast-icon-${t.type || 'info'}`}>
              {t.type === 'success' && <CheckCircle2 size={18} />}
              {t.type === 'error' && <XCircle size={18} />}
              {t.type === 'warning' && <AlertTriangle size={18} />}
              {(t.type === 'info' || !t.type) && <Activity size={18} />}
            </div>
            <div className="toast-body">
              {t.title && <div className="toast-title">{t.title}</div>}
              <div className="toast-message">{t.message}</div>
            </div>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              aria-label="Cerrar notificación"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

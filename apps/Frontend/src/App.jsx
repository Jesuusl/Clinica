import React, { useState, useEffect } from 'react';
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

  // Sincronizar tema con el atributo data-theme en el documento HTML y guardar preferencia
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('saludplus_theme', theme);
    } catch {
      // Ignorar error si localStorage no está disponible
    }
  }, [theme]);

  // Cargar usuarios del sistema y verificar si existe sesión activa previa
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

        // Verificar si hay token almacenado
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
          // Si no hay token previo, mantener como invitado en la Landing Page
          // Pero predeterminar el paciente Juan Pérez para cuando explore sin login si así lo desea
          const defaultPatient = sysUsers.find(u => u.role === 'patient');
          if (defaultPatient) {
            // No iniciamos sesión automáticamente para respetar el flujo de autenticación,
            // pero dejamos el rol listo para consultas
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
  }, []);

  // Notificaciones Toast flotantes
  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

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
    // Actualizar lista global de usuarios
    await loadSystemUsers();
  };

  // Manejo de Cerrar Sesión
  const handleLogout = () => {
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
                  />
                )}

                {activeRole === 'admin' && (
                  <AdminModule
                    adminUser={currentUser}
                    onShowToast={showToast}
                    onOpenAudit={() => setShowAuditModal(true)}
                  />
                )}

                {activeRole === 'doctor' && (
                  <DoctorModule
                    doctorUser={currentUser}
                    onShowToast={showToast}
                  />
                )}

                {activeRole === 'lab' && (
                  <LabModule
                    labUser={currentUser}
                    onShowToast={showToast}
                  />
                )}

                {activeRole === 'pharmacy' && (
                  <PharmacyModule
                    pharmacyUser={currentUser}
                    onShowToast={showToast}
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

      {/* Toasts Flotantes */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <div style={{ fontSize: '0.875rem' }}>{t.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import PatientModule from './components/PatientModule';
import AdminModule from './components/AdminModule';
import DoctorModule from './components/DoctorModule';
import LabModule from './components/LabModule';
import PharmacyModule from './components/PharmacyModule';
import AuditModule from './components/AuditModule';
import { api } from './services/api';

export default function App() {
  const [theme, setTheme] = useState('light');
  const [users, setUsers] = useState([]);
  const [activeRole, setActiveRole] = useState('patient');
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Sincronizar tema con el atributo data-theme en el documento HTML
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Cargar usuarios del sistema al inicio
  useEffect(() => {
    async function initUsers() {
      try {
        const res = await api.getUsers();
        setUsers(res.data);

        // Seleccionar paciente por defecto (Juan Pérez)
        const defaultPatient = res.data.find(u => u.role === 'patient');
        if (defaultPatient) {
          setCurrentUser(defaultPatient);
        }
      } catch (err) {
        showToast(`Error al inicializar la plataforma: ${err.message}`, 'error');
      } finally {
        setLoadingInitial(false);
      }
    }
    void initUsers();
  }, []);

  // Notificaciones Toast flotantes
  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  return (
    <div className="app-container">
      {/* Barra Superior con Selector de Rol Inmediato */}
      <Header
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        users={users}
        theme={theme}
        setTheme={setTheme}
        onOpenAudit={() => setShowAuditModal(true)}
      />

      {/* Contenido Principal Modular */}
      <main className="main-content">
        {loadingInitial ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            Inicializando sistema hospitalario SaludPlus...
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

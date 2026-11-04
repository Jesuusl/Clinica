import React, { useState } from 'react';
import {
  Activity,
  HeartPulse,
  Stethoscope,
  ShieldCheck,
  FlaskConical,
  Pill,
  Clock,
  Calendar,
  Users,
  Award,
  Phone,
  MapPin,
  ChevronRight,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  Building2,
  LogIn,
  UserPlus
} from 'lucide-react';

export default function LandingPage({
  currentUser,
  theme,
  setTheme,
  onOpenAuth,
  onEnterPortal,
  onShowToast
}) {
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const specialties = [
    {
      id: 'cardio',
      name: 'Cardiología Especializada',
      icon: HeartPulse,
      color: '#ef4444',
      bgLight: 'rgba(239, 68, 68, 0.1)',
      desc: 'Diagnóstico integral cardiovascular, ecocardiogramas computarizados, control de arritmias y prevención de infartos.',
      consultorio: 'Consultorio 304 - Edificio Especialistas',
      doctorsCount: '8 Especialistas',
      features: ['Monitoreo Holter 24h', 'Ecocardiograma Doppler', 'Prevención Coronaria']
    },
    {
      id: 'general',
      name: 'Medicina General',
      icon: Stethoscope,
      color: '#3b82f6',
      bgLight: 'rgba(59, 130, 246, 0.1)',
      desc: 'Atención primaria y medicina preventiva familiar. Chequeos anuales, control metabólico y remisión oportuna.',
      consultorio: 'Consultorios 101 al 105 - Torre Principal',
      doctorsCount: '15 Médicos de Planta',
      features: ['Control de Presión', 'Evaluación Preventiva', 'Remisión Directa']
    },
    {
      id: 'pediatria',
      name: 'Pediatría y Desarrollo Infantil',
      icon: Sparkles,
      color: '#10b981',
      bgLight: 'rgba(16, 185, 129, 0.1)',
      desc: 'Acompañamiento humanizado desde el nacimiento hasta la adolescencia. Control de crecimiento y esquema de vacunación.',
      consultorio: 'Consultorio 202 - Ala Pediátrica',
      doctorsCount: '6 Pediatras',
      features: ['Vacunación al Día', 'Control de Crecimiento', 'Nutrición Infantil']
    },
    {
      id: 'neurologia',
      name: 'Neurología Clínica',
      icon: Activity,
      color: '#8b5cf6',
      bgLight: 'rgba(139, 92, 246, 0.1)',
      desc: 'Diagnóstico y tratamiento avanzado de cefaleas crónicas, trastornos del sueño, epilepsia y rehabilitación cognitiva.',
      consultorio: 'Consultorio 401 - Centro Neurovascular',
      doctorsCount: '4 Neurólogos',
      features: ['Estudio de Cefaleas', 'Electroencefalograma', 'Manejo del Sueño']
    },
    {
      id: 'ginecologia',
      name: 'Ginecología y Obstetricia',
      icon: UserCheck,
      color: '#ec4899',
      bgLight: 'rgba(236, 72, 153, 0.1)',
      desc: 'Cuidado integral de la salud femenina, ecografías obstétricas de alta resolución, control prenatal y salud reproductiva.',
      consultorio: 'Consultorio 301 - Torre Materno Infantil',
      doctorsCount: '5 Especialistas',
      features: ['Control Prenatal HD', 'Citología & Tamizaje', 'Planificación Familiar']
    },
    {
      id: 'trauma',
      name: 'Traumatología y Ortopedia',
      icon: ShieldCheck,
      color: '#f59e0b',
      bgLight: 'rgba(245, 158, 11, 0.1)',
      desc: 'Manejo de lesiones articulares y musculares, medicina deportiva, artroscopia y rehabilitación física post-quirúrgica.',
      consultorio: 'Consultorio 205 - Módulo Quirúrgico',
      doctorsCount: '6 Traumatólogos',
      features: ['Ecografía Articular', 'Medicina Deportiva', 'Rehabilitación Inmediata']
    }
  ];

  const integratedServices = [
    {
      icon: FileText,
      title: 'Historia Clínica Digital Unificada',
      desc: 'Toda tu información médica, evoluciones, diagnósticos y antecedentes en un registro inmutable disponible para tu equipo de especialistas.',
      highlight: 'Auditado bajo estándar HIPAA & MinSalud'
    },
    {
      icon: Pill,
      title: 'Farmacia con Código Seguro de 6 Dígitos',
      desc: 'Criptográficamente generado por tu médico. Garantiza entrega segura de medicamentos en farmacia hospitalaria sin duplicidades.',
      highlight: 'Trazabilidad de inventario en tiempo real'
    },
    {
      icon: FlaskConical,
      title: 'Laboratorio Automatizado en Red',
      desc: 'Procesamiento computarizado de muestras de sangre, orina y perfiles avanzados con resultados en línea y alertas automáticas.',
      highlight: 'Resultados validados por bacteriólogos'
    },
    {
      icon: Calendar,
      title: 'Optimizador de Citas y Agendas',
      desc: 'Algoritmo inteligente de despacho que encuentra la franja más cercana disponible respetando la agenda declarada del médico.',
      highlight: 'Confirmación y recordatorios en línea'
    }
  ];

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      if (onShowToast) onShowToast('Por favor completa los campos requeridos del formulario', 'error');
      return;
    }
    setContactSubmitted(true);
    if (onShowToast) {
      onShowToast('¡Mensaje enviado con éxito! Un coordinador clínico te responderá pronto.', 'success');
    }
    setTimeout(() => {
      setContactForm({ name: '', email: '', phone: '', message: '' });
      setContactSubmitted(false);
    }, 4000);
  };

  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    const elem = document.getElementById(sectionId);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page-wrapper">
      {/* NAVBAR PRINCIPAL DE LA LANDING */}
      <nav className="landing-navbar">
        <div className="landing-nav-container">
          {/* Logo SaludPlus */}
          <div className="landing-brand">
            <div className="landing-logo-icon">
              <Activity size={26} />
            </div>
            <div>
              <div className="landing-brand-title">
                SaludPlus <span className="landing-brand-badge">Hospital</span>
              </div>
              <div className="landing-brand-subtitle">
                Excelencia Médica & Trazabilidad Digital
              </div>
            </div>
          </div>

          {/* Enlaces de Navegación Suave */}
          <div className="landing-nav-links">
            <a href="#especialidades" onClick={(e) => scrollToSection(e, 'especialidades')}>
              Especialidades
            </a>
            <a href="#servicios" onClick={(e) => scrollToSection(e, 'servicios')}>
              Servicios Digitales
            </a>
            <a href="#urgencias" onClick={(e) => scrollToSection(e, 'urgencias')}>
              Urgencias 24/7
            </a>
            <a href="#contacto" onClick={(e) => scrollToSection(e, 'contacto')}>
              Sedes & Contacto
            </a>
          </div>

          {/* Acciones de Cabecera: Tema & Acceso al Portal */}
          <div className="landing-nav-actions">
            {/* Toggle de Tema */}
            <button
              className="icon-btn"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              title={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
              aria-label="Cambiar tema de color"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Botón Destacado: Portal Clínico */}
            {currentUser ? (
              <button
                className="btn btn-primary landing-portal-btn"
                onClick={onEnterPortal}
              >
                <Stethoscope size={18} />
                <span>Ir a mi Portal ({currentUser.name.split(' ')[0]})</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <div className="landing-auth-buttons">
                <button
                  className="btn btn-secondary btn-sm landing-register-btn"
                  onClick={() => onOpenAuth('register')}
                >
                  <UserPlus size={16} />
                  <span>Crear Cuenta Paciente</span>
                </button>
                <button
                  className="btn btn-primary landing-portal-btn"
                  onClick={() => onOpenAuth('login')}
                >
                  <LogIn size={18} />
                  <span>Portal Clínico / Iniciar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* HERO SECTION DE ALTO IMPACTO */}
      <header className="landing-hero">
        <div className="landing-hero-backdrop"></div>
        <div className="landing-hero-content">
          <div className="landing-hero-left">
            <div className="hero-kicker-badge">
              <Sparkles size={14} />
              <span>Red Hospitalaria de Alta Complejidad & Tecnología Médica</span>
            </div>

            <h1 className="hero-title">
              Cuidamos de tu salud con <span className="highlight-text">excelencia e innovación</span> médica
            </h1>

            <p className="hero-description">
              Plataforma clínica integral de última generación. Gestiona tus citas médicas en tiempo real,
              accede a tu historia clínica protegida, reclama medicamentos con nuestro código de seguridad de 6 dígitos
              y consulta resultados de laboratorio desde cualquier dispositivo.
            </p>

            <div className="hero-cta-group">
              {currentUser ? (
                <button
                  className="btn btn-primary btn-lg pulse-hover"
                  onClick={onEnterPortal}
                >
                  <Stethoscope size={20} />
                  <span>Continuar en mi Portal Clínico</span>
                  <ArrowRight size={18} />
                </button>
              ) : (
                <>
                  <button
                    className="btn btn-primary btn-lg pulse-hover"
                    onClick={() => onOpenAuth('login')}
                  >
                    <LogIn size={20} />
                    <span>Acceder al Portal Clínico</span>
                    <ArrowRight size={18} />
                  </button>
                  <button
                    className="btn btn-secondary btn-lg"
                    onClick={() => onOpenAuth('register')}
                  >
                    <Calendar size={18} />
                    <span>Agendar mi Cita Médica</span>
                  </button>
                </>
              )}
            </div>

            <div className="hero-urgency-chip">
              <span className="live-pulse-dot"></span>
              <span>Urgencias y Triage Activo 24/7 • Sede Principal y Consultorios Habilitados</span>
            </div>
          </div>

          {/* Tarjeta Visual Interactiva / Preview Clínico */}
          <div className="landing-hero-right">
            <div className="clinical-hero-card">
              <div className="hero-card-header">
                <div className="hero-card-doctor-info">
                  <img
                    src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=150&q=80"
                    alt="Dra. Soto"
                    className="hero-avatar"
                  />
                  <div>
                    <div className="hero-doc-name">Dra. Valentina Soto</div>
                    <div className="hero-doc-spec">Cardiología • MP-CARD-98432</div>
                  </div>
                </div>
                <span className="badge badge-confirmada">En Consulta</span>
              </div>

              <div className="hero-card-body">
                <div className="hero-pill-badge">
                  <Activity size={14} color="#ef4444" />
                  <span>Monitoreo Cardiopulmonar Normal (72 bpm)</span>
                </div>

                <div className="hero-prescription-preview">
                  <div className="preview-label">Código Único de Dispensación Farmacéutica:</div>
                  <div className="preview-code-tag">
                    <Lock size={14} />
                    <span>#849201</span>
                    <span className="code-valid-tag">Cripto Verificado</span>
                  </div>
                  <div className="preview-med">Losartán Potásico 50mg • Cada 12 horas</div>
                </div>

                <div className="hero-metrics-mini">
                  <div className="mini-metric">
                    <span className="mini-val">100%</span>
                    <span className="mini-lbl">Digital</span>
                  </div>
                  <div className="mini-metric">
                    <span className="mini-val">0 Colisiones</span>
                    <span className="mini-lbl">Agenda Inteligente</span>
                  </div>
                  <div className="mini-metric">
                    <span className="mini-val">Auditado</span>
                    <span className="mini-lbl">Trazabilidad Total</span>
                  </div>
                </div>
              </div>

              <div className="hero-card-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                  <ShieldCheck size={16} color="var(--success)" />
                  <span>Cumplimiento Estándar de Seguridad Hospitalaria</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MÉTRICAS DESTACADAS DE LA CLÍNICA */}
        <div className="landing-metrics-bar">
          <div className="metrics-grid">
            <div className="metric-item">
              <div className="metric-icon-wrap" style={{ color: '#0284c7', background: 'rgba(2, 132, 199, 0.12)' }}>
                <Users size={28} />
              </div>
              <div className="metric-details">
                <div className="metric-number">+15,000</div>
                <div className="metric-title">Pacientes Atendidos</div>
                <div className="metric-sub">Historias unificadas en la nube</div>
              </div>
            </div>

            <div className="metric-item">
              <div className="metric-icon-wrap" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.12)' }}>
                <Award size={28} />
              </div>
              <div className="metric-details">
                <div className="metric-number">99.8%</div>
                <div className="metric-title">Satisfacción Global</div>
                <div className="metric-sub">Calidad y calidez en el trato</div>
              </div>
            </div>

            <div className="metric-item">
              <div className="metric-icon-wrap" style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.12)' }}>
                <Clock size={28} />
              </div>
              <div className="metric-details">
                <div className="metric-number">24/7</div>
                <div className="metric-title">Urgencias Médicas</div>
                <div className="metric-sub">Triage y hospitalización continua</div>
              </div>
            </div>

            <div className="metric-item">
              <div className="metric-icon-wrap" style={{ color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.12)' }}>
                <Stethoscope size={28} />
              </div>
              <div className="metric-details">
                <div className="metric-number">+40</div>
                <div className="metric-title">Especialistas Certificados</div>
                <div className="metric-sub">Doctores de primer nivel</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* SECCIÓN 1: ESPECIALIDADES MÉDICAS */}
      <section id="especialidades" className="landing-section">
        <div className="section-container">
          <div className="section-header-center">
            <span className="section-pill">Especialidades Médicas</span>
            <h2 className="section-title">Atención Médica Especializada de Vanguardia</h2>
            <p className="section-subtitle">
              Doctores certificados con infraestructura de última generación. Consulta consultorios,
              agendas declaradas y disponibilidad inmediata.
            </p>
          </div>

          <div className="specialties-grid">
            {specialties.map((spec) => {
              const Icon = spec.icon;
              return (
                <div key={spec.id} className="specialty-card">
                  <div className="specialty-card-top">
                    <div
                      className="specialty-icon-box"
                      style={{ color: spec.color, background: spec.bgLight }}
                    >
                      <Icon size={26} />
                    </div>
                    <span className="badge badge-confirmada" style={{ fontSize: '0.725rem' }}>
                      {spec.doctorsCount}
                    </span>
                  </div>

                  <h3 className="specialty-name">{spec.name}</h3>
                  <p className="specialty-desc">{spec.desc}</p>

                  <div className="specialty-location">
                    <MapPin size={14} color="var(--primary)" />
                    <span>{spec.consultorio}</span>
                  </div>

                  <div className="specialty-features">
                    {spec.features.map((f, i) => (
                      <span key={i} className="spec-feature-tag">
                        ✓ {f}
                      </span>
                    ))}
                  </div>

                  <button
                    className="btn btn-secondary btn-block specialty-btn"
                    onClick={() => {
                      if (currentUser) {
                        onEnterPortal();
                      } else {
                        onOpenAuth('login');
                      }
                    }}
                  >
                    <span>Consultar Disponibilidad</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECCIÓN 2: SERVICIOS INTEGRADOS */}
      <section id="servicios" className="landing-section section-alternate">
        <div className="section-container">
          <div className="section-header-center">
            <span className="section-pill">Ecosistema Clínico Conectado</span>
            <h2 className="section-title">Servicios Digitales Integrados en Tiempo Real</h2>
            <p className="section-subtitle">
              Eliminamos los trámites engorrosos conectando al paciente, al médico, a la farmacia y al laboratorio
              en un entorno seguro y con trazabilidad inmutable.
            </p>
          </div>

          <div className="services-grid">
            {integratedServices.map((srv, idx) => {
              const Icon = srv.icon;
              return (
                <div key={idx} className="service-card">
                  <div className="service-icon-wrap">
                    <Icon size={30} />
                  </div>
                  <h3 className="service-title">{srv.title}</h3>
                  <p className="service-description">{srv.desc}</p>
                  <div className="service-highlight">
                    <CheckCircle2 size={16} color="var(--secondary)" />
                    <span>{srv.highlight}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Showcase visual de trazabilidad y seguridad */}
          <div className="traceability-showcase">
            <div className="trace-left">
              <span className="badge badge-confirmada">Trazabilidad Total</span>
              <h3>Seguridad Farmacéutica de 6 Dígitos</h3>
              <p>
                Al emitirse una prescripción, el sistema genera automáticamente un código aleatorio único
                y matemáticamente no repetible. El paciente solo debe presentarlo en la ventanilla de farmacia
                para canjear sus medicamentos, protegiendo contra suplantaciones o recetas adulteradas.
              </p>
              <div className="trace-steps">
                <div className="trace-step">
                  <div className="step-num">1</div>
                  <div>
                    <strong>Emisión Clínica:</strong> El doctor formula el medicamento en la consulta.
                  </div>
                </div>
                <div className="trace-step">
                  <div className="step-num">2</div>
                  <div>
                    <strong>Código Seguro:</strong> El sistema asigna 6 dígitos únicos e intransferibles.
                  </div>
                </div>
                <div className="trace-step">
                  <div className="step-num">3</div>
                  <div>
                    <strong>Dispensación:</strong> Farmacia valida el código y descuenta stock automáticamente.
                  </div>
                </div>
              </div>
            </div>

            <div className="trace-right">
              <div className="code-display-card">
                <div className="code-card-header">
                  <Pill size={22} />
                  <span>Código de Entrega Hospitalaria</span>
                </div>
                <div className="code-big-display">582914</div>
                <div className="code-status-pill">
                  <CheckCircle2 size={14} /> Listo para Canje en Farmacia
                </div>
                <div className="code-meta">
                  <div><strong>Paciente:</strong> Juan Pérez Gómez</div>
                  <div><strong>Medicamento:</strong> Amoxicilina + Ácido Clavulánico 875mg</div>
                  <div><strong>Vencimiento:</strong> 30 días calendario</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 3: URGENCIAS 24/7 & SEDES / CONTACTO */}
      <section id="urgencias" className="landing-section">
        <div className="section-container">
          <div className="urgency-banner-card">
            <div className="urgency-banner-left">
              <div className="urgency-alert-tag">
                <span className="live-pulse-dot alert-pulse"></span>
                <span>Servicio de Urgencias & Cuidados Críticos 24 Horas</span>
              </div>
              <h2 className="urgency-title">¿Tienes una Urgencia Médica Inmediata?</h2>
              <p className="urgency-desc">
                Contamos con ambulancias medicalizadas, quirófanos de alta complejidad y equipo de trauma
                disponible 365 días del año. Acércate directamente o comunícate con nuestra central.
              </p>

              <div className="urgency-hotlines">
                <div className="hotline-box">
                  <Phone size={22} color="#ef4444" />
                  <div>
                    <div className="hotline-label">Línea de Emergencias 24/7</div>
                    <div className="hotline-number">(601) 745-9000</div>
                  </div>
                </div>

                <div className="hotline-box">
                  <Phone size={22} color="var(--primary)" />
                  <div>
                    <div className="hotline-label">Línea Celular / WhatsApp</div>
                    <div className="hotline-number">+57 300 911 0000</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="urgency-banner-right">
              <div className="triage-status-board">
                <div className="triage-header">
                  <Activity size={18} />
                  <span>Disponibilidad de Camas & Triage en Vivo</span>
                </div>
                <div className="triage-item">
                  <span>Triage I (Reanimación Inmediata):</span>
                  <span className="badge badge-confirmada">0 min espera</span>
                </div>
                <div className="triage-item">
                  <span>Triage II (Emergencia Severa):</span>
                  <span className="badge badge-confirmada">&lt; 15 min espera</span>
                </div>
                <div className="triage-item">
                  <span>Camas UCI / Cuidados Críticos:</span>
                  <span className="badge badge-confirmada">Disponibles</span>
                </div>
                <div className="triage-footer">
                  Sede Central: Av. Carrera 45 # 128 - 50, Bogotá D.C.
                </div>
              </div>
            </div>
          </div>

          {/* FORMULARIO DE CONTACTO Y SEDES */}
          <div id="contacto" className="contact-section-grid">
            <div className="contact-info-col">
              <span className="section-pill">Sedes & Atención</span>
              <h3 className="contact-col-title">Estamos Cerca de Ti</h3>
              <p className="contact-col-desc">
                Nuestras instalaciones cuentan con accesibilidad universal, parqueadero privado,
                área de ambulancias y farmacia abierta las 24 horas.
              </p>

              <div className="contact-items-list">
                <div className="contact-info-item">
                  <Building2 size={20} color="var(--primary)" />
                  <div>
                    <strong>Sede Principal SaludPlus:</strong>
                    <div>Av. Carrera 45 # 128 - 50, Complejo Médico SaludPlus, Torre A</div>
                  </div>
                </div>

                <div className="contact-info-item">
                  <Clock size={20} color="var(--primary)" />
                  <div>
                    <strong>Horario de Consulta Externa:</strong>
                    <div>Lunes a Viernes: 6:00 AM - 8:00 PM | Sábados: 7:00 AM - 2:00 PM</div>
                  </div>
                </div>

                <div className="contact-info-item">
                  <ShieldCheck size={20} color="var(--primary)" />
                  <div>
                    <strong>Acreditación Sanitaria:</strong>
                    <div>Certificación de Calidad Hospitalaria MinSalud Res. 3100</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="contact-form-col card">
              <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>
                Envíanos tu Consulta o Inquietud
              </h3>
              <p className="card-subtitle" style={{ marginBottom: '1.25rem' }}>
                Te responderemos a tu correo en menos de 24 horas hábiles.
              </p>

              {contactSubmitted ? (
                <div className="alert-box alert-success">
                  <CheckCircle2 size={20} />
                  <div>
                    <strong>¡Mensaje recibido con éxito!</strong>
                    <div>Gracias por contactarnos. Tu solicitud fue canalizada al equipo correspondiente.</div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit}>
                  <div className="form-group">
                    <label className="form-label">Nombre Completo *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: Camila Restrepo"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Correo Electrónico *</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="nombre@ejemplo.com"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Teléfono Móvil</label>
                      <input
                        type="tel"
                        className="form-input"
                        placeholder="+57 300 000 0000"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mensaje o Inquietud *</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      placeholder="Escribe tu consulta sobre citas, especialidades o convenios EPS..."
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      required
                    ></textarea>
                  </div>

                  <button type="submit" className="btn btn-primary btn-block">
                    <span>Enviar Mensaje</span>
                    <ArrowRight size={16} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER INSTITUCIONAL */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-top-grid">
            <div className="footer-brand-col">
              <div className="landing-brand" style={{ marginBottom: '1rem' }}>
                <div className="landing-logo-icon">
                  <Activity size={24} />
                </div>
                <div>
                  <div className="landing-brand-title">
                    SaludPlus <span className="landing-brand-badge">Hospital</span>
                  </div>
                </div>
              </div>
              <p className="footer-mission-text">
                Institución prestadora de salud con más de 18 años dedicados al cuidado integral,
                tecnología médica de punta y atención humanizada con los más altos estándares éticos.
              </p>
              <div className="footer-cert-badge">
                <ShieldCheck size={16} color="var(--primary)" />
                <span>Institución Acreditada en Calidad en Salud</span>
              </div>
            </div>

            <div className="footer-links-col">
              <h4>Navegación</h4>
              <ul>
                <li><a href="#especialidades" onClick={(e) => scrollToSection(e, 'especialidades')}>Especialidades</a></li>
                <li><a href="#servicios" onClick={(e) => scrollToSection(e, 'servicios')}>Servicios Integrados</a></li>
                <li><a href="#urgencias" onClick={(e) => scrollToSection(e, 'urgencias')}>Urgencias 24/7</a></li>
                <li><a href="#contacto" onClick={(e) => scrollToSection(e, 'contacto')}>Sedes y Contacto</a></li>
              </ul>
            </div>

            <div className="footer-links-col">
              <h4>Portales de Acceso</h4>
              <ul>
                <li>
                  <button type="button" className="footer-link-btn" onClick={() => onOpenAuth('login')}>
                    Portal de Pacientes
                  </button>
                </li>
                <li>
                  <button type="button" className="footer-link-btn" onClick={() => onOpenAuth('login')}>
                    Acceso para Médicos
                  </button>
                </li>
                <li>
                  <button type="button" className="footer-link-btn" onClick={() => onOpenAuth('login')}>
                    Dispensación Farmacéutica
                  </button>
                </li>
                <li>
                  <button type="button" className="footer-link-btn" onClick={() => onOpenAuth('login')}>
                    Laboratorio & Resultados
                  </button>
                </li>
              </ul>
            </div>

            <div className="footer-links-col">
              <h4>Seguridad & Ley</h4>
              <ul>
                <li><span>Protección de Datos Personales</span></li>
                <li><span>Derechos y Deberes del Paciente</span></li>
                <li><span>Trazabilidad Criptográfica</span></li>
                <li><span>Vigilado por Superintendencia Nacional de Salud</span></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <div>
              © 2026 SaludPlus Hospital. Todos los derechos reservados.
            </div>
            <div className="footer-bottom-actions">
              <span>Resolución de Habilitación MinSalud #3100</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Volver Arriba ↑
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

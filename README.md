# 🏥 SaludPlus - Sistema Integral de Gestión Hospitalaria

Sistema de gestión clínica desarrollado bajo arquitectura multi-agente (**Orquestador**, **Backend**, **Frontend** y **QA**) con reglas de negocio clínicas, trazabilidad de historias médicas y control estricto de dispensación de medicamentos.

---

## 🚀 Arquitectura y Tecnologías

- **Backend**: Node.js v26 + Express REST API + `node:sqlite` (SQLite integrado de alto rendimiento sin dependencias nativas).
- **Frontend**: React + Vite + Vanilla CSS moderno (Tokens clínicos HSL, paletas armónicas, responsive, temas claro/oscuro y micro-animaciones).
- **QA & Testing**: Suite de integración automatizada en Node.js con 12/12 pruebas de contrato, transiciones de estado y seguridad.

---

## 👥 Módulos Clínicos Desarrollados

### 1. Módulo de Pacientes (Portal y Perfil)
- **Perfil Personal y Clínico**: Información de contacto, afiliación a EPS (Sura, Sanitas, etc.), número de póliza, tipo de sangre (O+, A+, etc.), alergias y antecedentes de condiciones crónicas.
- **Agendamiento Clasificado**: Citas con clasificación visual por colores:
  - 🔵 **Azul**: Control General
  - 🟢 **Verde**: Control Cardíaco
  - 🟠 **Ámbar**: Primera Vez
  - 🟣 **Morado**: Consulta de Especialidad
  - Inicia en estado `Solicitada` (Pendiente) hasta confirmación por administración.
- **Reclamación de Medicamentos**: Visualización destacada del **código único de 6 dígitos** autogenerado por consulta, posología, instrucciones y estado (`Pendiente` / `Reclamado`).
- **Historial e Historia Clínica**: Evoluciones con diagnóstico CIE-10, notas médicas, estampa de tiempo y firma digital / registro médico del doctor tratante.
- **Laboratorios y Exámenes**: Consulta de órdenes pendientes y resultados validados con visor de informes y métricas paramétricas.

### 2. Módulo de Administración y Recepción (Centro de Control)
- **Portal Centralizador**: Monitor de operaciones y solicitudes en tiempo real.
- **Gestión de Citas y Despacho**: Transiciones controladas de estados (`Solicitada` ➔ `Confirmada` ➔ `Completada` ➔ `Cancelada`).
- **Optimizador de Franjas Horarias**: Botón *"Optimizar Turno Más Próximo"* que calcula matemáticamente el primer espacio disponible en la agenda del especialista sin colisiones.
- **Auditoría de Historias Clínicas**: Consulta de expedientes con generación automática de logs de acceso.
- **Directorio Médico**: Visualización de consultorios, teléfonos y días/horarios disponibles de cada especialista.

### 3. Módulo de Doctores y Especialistas
- **Atención Clínica**: Registro de consultas en curso con diagnóstico, notas de evolución y examen físico.
- **Prescripción Electrónica**: Redacción de recetas con **generación automática de código único de 6 dígitos** (restricción UNIQUE a nivel de base de datos) y firma médica digital.
- **Remisiones y Controles**: Envío de remisiones a control periódico o derivación a especialistas.
- **Solicitud de Exámenes**: Órdenes directas para laboratorio clasificadas por tipo (Sangre, Orina, Rayos X, ECG).
- **Gestión de Disponibilidad**: Configuración de días y franjas horarias por parte del doctor.

### 4. Módulo de Laboratorio
- **Carga de Resultados**: Interfaz para registrar notas de validación bioquímica, parámetros cuantitativos estructurados y archivo adjunto oficial (.pdf).
- **Publicación Inmediata**: Incorporación automática e instantánea al expediente clínico del paciente.

### 5. Módulo de Farmacia
- **Control de Stock en Tiempo Real**: Inventario con **alertas visuales de stock crítico** (badge pulsante animado en rojo) cuando las existencias son menores o iguales al umbral mínimo.
- **Canje por Código de 6 Dígitos**: Entrada numérica con validación instantánea de vigencia y existencia de stock.
- **Confirmación de Entrega Irreversible**:
  - Descuenta el inventario automáticamente.
  - Invalida y marca el código como `Reclamado` de forma irreversible.
  - Bloqueo a nivel de base de datos que impide la reutilización del código (código 409 Conflict).

### 6. Auditoría y Trazabilidad (Seguridad)
- Bitácora inmutable de eventos con registro de:
  - `ACCESS_MEDICAL_RECORD` (Trazabilidad de acceso a expedientes confidenciales).
  - `DISPENSE_MEDICATION` (Entrega de fármacos con código y farmacéutico responsable).
  - `COMPLETE_CONSULTATION` y `UPDATE_APPOINTMENT_STATUS`.

---

## 🏃 Cómo Ejecutar el Proyecto

### 1. Iniciar el Backend (Puerto 4000)
```bash
cd apps/Backend
npm start
```
*Healthcheck:* `http://localhost:4000/api/health`

### 2. Iniciar el Frontend (Puerto 5173)
```bash
cd apps/Frontend
npm run dev
```
*Acceso en el navegador:* `http://localhost:5173`

### 3. Ejecutar la Suite de Pruebas QA
```bash
cd apps/Backend
npm test
```

---

## 🔑 Usuarios y Perfiles Preconfigurados para Demostración

| Rol | Usuario Demo | Detalle / Especialidad |
| :--- | :--- | :--- |
| **Paciente 1** | Juan Pérez Gómez | CC 1020304050, Sura EPS, Hipertensión |
| **Paciente 2** | María Gómez Londoño | CC 52401928, Sanitas EPS, Asma |
| **Recepción / Admin** | Carlos Ramos | Coordinador Operativo de Recepción |
| **Doctora** | Dra. Valentina Soto | Especialista en Cardiología (MP-CARD-98432) |
| **Doctor** | Dr. Alejandro Ruiz | Médico General (MP-MED-11029) |
| **Laboratorio** | Lic. Roberto Díaz | Bacteriólogo / Analista de Laboratorio |
| **Farmacia** | QF. Laura Mendoza | Química Farmacéutica Titular |

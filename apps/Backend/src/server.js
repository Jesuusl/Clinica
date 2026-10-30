import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/database.js';
import { seedData } from './db/seed.js';

import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import appointmentRoutes from './routes/appointments.js';
import doctorRoutes from './routes/doctors.js';
import clinicalRoutes from './routes/clinical.js';
import labRoutes from './routes/laboratory.js';
import pharmacyRoutes from './routes/pharmacy.js';
import auditRoutes from './routes/audit.js';

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 4000;

// Configuración segura de CORS para producción y desarrollo
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir solicitudes sin origin (como herramientas locales, curl o SSR) y orígenes autorizados
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Acceso bloqueado por política de seguridad CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());

// Inicialización de persistencia y sembrado
initDatabase();
seedData();

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Sistema de Gestión Hospitalaria - API Backend',
    timestamp: new Date().toISOString()
  });
});

// Enrutadores modulares
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/clinical', clinicalRoutes);
app.use('/api/laboratory', labRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/audit-logs', auditRoutes);

// Manejo global de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Ruta no encontrada: ${req.method} ${req.url}` });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🏥 Servidor Clínico Backend escuchando en http://localhost:${PORT}`);
  console.log(`📡 API Health: http://localhost:${PORT}/api/health`);
});

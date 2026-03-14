import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './src/db/database.js';
import invoiceRoutes from './src/routes/invoices.js';
import clientRoutes from './src/routes/clients.js';
import settingsRoutes from './src/routes/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/facturas', invoiceRoutes);
app.use('/api/clientes', clientRoutes);
app.use('/api/configuracion', settingsRoutes);

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database and start server
async function start() {
  try {
    await getDb();
    console.log('✅ Base de datos inicializada');
    app.listen(PORT, () => {
      console.log(`🧾 Sistema e-CF DGII corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Error iniciando servidor:', err);
    process.exit(1);
  }
}

start();

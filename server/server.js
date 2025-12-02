import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { initDatabase, getDb } from './db/database.js';
import metaRoutes from './routes/meta.js';
import sallaRoutes from './routes/salla.js';
import manualRoutes from './routes/manual.js';
import analyticsRoutes from './routes/analytics.js';
import { syncMetaData } from './services/metaService.js';
import { syncSallaData } from './services/sallaService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

initDatabase();

app.use('/api/meta', metaRoutes);
app.use('/api/salla', sallaRoutes);
app.use('/api/manual', manualRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/sync', async (req, res) => {
  try {
    const metaResult = await syncMetaData();
    const sallaResult = await syncSallaData();
    res.json({ success: true, meta: metaResult, salla: sallaResult, syncedAt: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ message: 'VironaX API running', note: 'Client build not found' });
  });
}

cron.schedule('0 * * * *', async () => {
  try { await syncMetaData(); await syncSallaData(); } catch (e) { console.error(e); }
});

setTimeout(async () => {
  try { await syncMetaData(); await syncSallaData(); } catch (e) { console.error(e); }
}, 5000);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

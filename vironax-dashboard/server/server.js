import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initDatabase();

// API Routes
app.use('/api/meta', metaRoutes);
app.use('/api/salla', sallaRoutes);
app.use('/api/manual', manualRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Sync endpoint (manual trigger)
app.post('/api/sync', async (req, res) => {
  try {
    console.log('Starting manual sync...');
    
    const metaResult = await syncMetaData();
    const sallaResult = await syncSallaData();
    
    res.json({
      success: true,
      meta: metaResult,
      salla: sallaResult,
      syncedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Scheduled sync (every day at 8 AM UTC)
cron.schedule('0 8 * * *', async () => {
  console.log('Running scheduled sync...');
  try {
    await syncMetaData();
    await syncSallaData();
    console.log('Scheduled sync completed');
  } catch (error) {
    console.error('Scheduled sync failed:', error);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📊 Dashboard API ready`);
});

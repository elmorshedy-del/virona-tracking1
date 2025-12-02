import express from 'express';
import { getDb } from '../db/database.js';
import { syncSallaData } from '../services/sallaService.js';

const router = express.Router();

// Get Salla orders summary
router.get('/orders', (req, res) => {
  try {
    const { start, end } = req.query;
    const startDate = start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = end || new Date().toISOString().split('T')[0];
    
    const db = getDb();
    
    const summary = db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(order_total) as total_revenue,
        AVG(order_total) as avg_order_value
      FROM salla_orders
      WHERE date BETWEEN ? AND ?
    `).get(startDate, endDate);

    const byCountry = db.prepare(`
      SELECT 
        country,
        COUNT(*) as orders,
        SUM(order_total) as revenue
      FROM salla_orders
      WHERE date BETWEEN ? AND ?
      GROUP BY country
      ORDER BY revenue DESC
    `).all(startDate, endDate);

    const byDay = db.prepare(`
      SELECT 
        date,
        COUNT(*) as orders,
        SUM(order_total) as revenue
      FROM salla_orders
      WHERE date BETWEEN ? AND ?
      GROUP BY date
      ORDER BY date
    `).all(startDate, endDate);

    res.json({
      summary,
      byCountry,
      byDay
    });
  } catch (error) {
    console.error('Error getting Salla orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync Salla data
router.post('/sync', async (req, res) => {
  try {
    const result = await syncSallaData();
    res.json(result);
  } catch (error) {
    console.error('Error syncing Salla:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

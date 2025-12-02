import express from 'express';
import { getDb } from '../db/database.js';

const router = express.Router();

// Get all manual orders
router.get('/', (req, res) => {
  try {
    const { start, end } = req.query;
    const db = getDb();
    
    let query = 'SELECT * FROM manual_orders';
    const params = [];

    if (start && end) {
      query += ' WHERE date BETWEEN ? AND ?';
      params.push(start, end);
    }

    query += ' ORDER BY date DESC, created_at DESC';
    
    const orders = db.prepare(query).all(...params);
    res.json(orders);
  } catch (error) {
    console.error('Error getting manual orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add manual order
router.post('/', (req, res) => {
  try {
    const { date, country, campaign, orders_count, revenue, source, notes } = req.body;
    
    if (!date || !country || !orders_count || !revenue) {
      return res.status(400).json({ error: 'Missing required fields: date, country, orders_count, revenue' });
    }

    const db = getDb();
    
    const result = db.prepare(`
      INSERT INTO manual_orders (date, country, campaign, orders_count, revenue, source, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(date, country, campaign || null, orders_count, revenue, source || 'whatsapp', notes || null);

    const newOrder = db.prepare('SELECT * FROM manual_orders WHERE id = ?').get(result.lastInsertRowid);
    
    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error adding manual order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update manual order
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { date, country, campaign, orders_count, revenue, source, notes } = req.body;
    
    const db = getDb();
    
    db.prepare(`
      UPDATE manual_orders 
      SET date = ?, country = ?, campaign = ?, orders_count = ?, revenue = ?, source = ?, notes = ?
      WHERE id = ?
    `).run(date, country, campaign, orders_count, revenue, source, notes, id);

    const updated = db.prepare('SELECT * FROM manual_orders WHERE id = ?').get(id);
    
    if (!updated) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating manual order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete single manual order
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    
    const result = db.prepare('DELETE FROM manual_orders WHERE id = ?').run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true, deleted: id });
  } catch (error) {
    console.error('Error deleting manual order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk delete manual orders
router.post('/delete-bulk', (req, res) => {
  try {
    const { scope, date, startDate, endDate } = req.body;
    const db = getDb();
    
    let query = '';
    let params = [];

    switch (scope) {
      case 'day':
        query = 'DELETE FROM manual_orders WHERE date = ?';
        params = [date];
        break;
      case 'week':
        // Delete for the week containing the given date
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        query = 'DELETE FROM manual_orders WHERE date BETWEEN ? AND ?';
        params = [weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0]];
        break;
      case 'month':
        // Delete for the month of the given date
        const monthStart = date.substring(0, 7) + '-01';
        const monthEnd = new Date(date.substring(0, 4), parseInt(date.substring(5, 7)), 0)
          .toISOString().split('T')[0];
        query = 'DELETE FROM manual_orders WHERE date BETWEEN ? AND ?';
        params = [monthStart, monthEnd];
        break;
      case 'year':
        query = 'DELETE FROM manual_orders WHERE date LIKE ?';
        params = [date.substring(0, 4) + '%'];
        break;
      case 'custom':
        query = 'DELETE FROM manual_orders WHERE date BETWEEN ? AND ?';
        params = [startDate, endDate];
        break;
      case 'all':
        query = 'DELETE FROM manual_orders';
        params = [];
        break;
      default:
        return res.status(400).json({ error: 'Invalid scope' });
    }

    const result = db.prepare(query).run(...params);
    
    res.json({ success: true, deleted: result.changes });
  } catch (error) {
    console.error('Error bulk deleting:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get manual orders summary
router.get('/summary', (req, res) => {
  try {
    const { start, end } = req.query;
    const startDate = start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = end || new Date().toISOString().split('T')[0];
    
    const db = getDb();
    
    const summary = db.prepare(`
      SELECT 
        SUM(orders_count) as total_orders,
        SUM(revenue) as total_revenue,
        COUNT(*) as entries
      FROM manual_orders
      WHERE date BETWEEN ? AND ?
    `).get(startDate, endDate);

    const byCountry = db.prepare(`
      SELECT 
        country,
        SUM(orders_count) as orders,
        SUM(revenue) as revenue
      FROM manual_orders
      WHERE date BETWEEN ? AND ?
      GROUP BY country
    `).all(startDate, endDate);

    const bySource = db.prepare(`
      SELECT 
        source,
        SUM(orders_count) as orders,
        SUM(revenue) as revenue
      FROM manual_orders
      WHERE date BETWEEN ? AND ?
      GROUP BY source
    `).all(startDate, endDate);

    res.json({
      summary,
      byCountry,
      bySource
    });
  } catch (error) {
    console.error('Error getting manual summary:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

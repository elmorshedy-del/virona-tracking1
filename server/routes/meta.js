import express from 'express';
import { getCampaignMetrics, getCampaignsByCountry } from '../services/analyticsService.js';
import { syncMetaData } from '../services/metaService.js';

const router = express.Router();

// Get campaign metrics
router.get('/campaigns', (req, res) => {
  try {
    const { start, end } = req.query;
    const startDate = start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = end || new Date().toISOString().split('T')[0];
    
    const campaigns = getCampaignMetrics(startDate, endDate);
    res.json(campaigns);
  } catch (error) {
    console.error('Error getting campaigns:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get campaigns by country breakdown
router.get('/campaigns/by-country', (req, res) => {
  try {
    const { start, end } = req.query;
    const startDate = start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = end || new Date().toISOString().split('T')[0];
    
    const data = getCampaignsByCountry(startDate, endDate);
    res.json(data);
  } catch (error) {
    console.error('Error getting campaigns by country:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync Meta data
router.post('/sync', async (req, res) => {
  try {
    const result = await syncMetaData();
    res.json(result);
  } catch (error) {
    console.error('Error syncing Meta:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

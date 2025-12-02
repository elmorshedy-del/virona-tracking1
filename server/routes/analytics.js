import express from 'express';
import {
  getOverviewKPIs,
  getKPITrends,
  getCampaignMetrics,
  getCountryMetrics,
  getBudgetEfficiency,
  getEfficiencyTrends,
  getDiagnostics,
  getRecommendations
} from '../services/analyticsService.js';

const router = express.Router();

// Helper to parse date range from query
function parseDateRange(req) {
  const { start, end, days, weeks, months } = req.query;
  
  let endDate = end ? new Date(end) : new Date();
  let startDate;

  if (start) {
    startDate = new Date(start);
  } else if (days) {
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - parseInt(days));
  } else if (weeks) {
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - parseInt(weeks) * 7);
  } else if (months) {
    startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - parseInt(months));
  } else {
    // Default to 7 days
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

// Get overview KPIs
router.get('/overview', (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req);
    const kpis = getOverviewKPIs(startDate, endDate);
    res.json({ ...kpis, startDate, endDate });
  } catch (error) {
    console.error('Error getting overview:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get KPI trends (daily data for charts)
router.get('/trends', (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req);
    const trends = getKPITrends(startDate, endDate);
    res.json({ trends, startDate, endDate });
  } catch (error) {
    console.error('Error getting trends:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all dashboard data in one call
router.get('/dashboard', (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req);
    
    const overview = getOverviewKPIs(startDate, endDate);
    const trends = getKPITrends(startDate, endDate);
    const campaigns = getCampaignMetrics(startDate, endDate);
    const countries = getCountryMetrics(startDate, endDate);
    const diagnostics = getDiagnostics(startDate, endDate);

    res.json({
      overview,
      trends,
      campaigns,
      countries,
      diagnostics,
      dateRange: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error getting dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get country metrics
router.get('/countries', (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req);
    const countries = getCountryMetrics(startDate, endDate);
    res.json(countries);
  } catch (error) {
    console.error('Error getting countries:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get budget efficiency analysis
router.get('/efficiency', (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req);
    const efficiency = getBudgetEfficiency(startDate, endDate);
    res.json(efficiency);
  } catch (error) {
    console.error('Error getting efficiency:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get efficiency trends for charts
router.get('/efficiency/trends', (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req);
    const trends = getEfficiencyTrends(startDate, endDate);
    res.json(trends);
  } catch (error) {
    console.error('Error getting efficiency trends:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get diagnostics/alerts
router.get('/diagnostics', (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req);
    const diagnostics = getDiagnostics(startDate, endDate);
    res.json(diagnostics);
  } catch (error) {
    console.error('Error getting diagnostics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recommendations
router.get('/recommendations', (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req);
    const recommendations = getRecommendations(startDate, endDate);
    res.json(recommendations);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

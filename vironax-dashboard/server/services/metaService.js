import fetch from 'node-fetch';
import { getDb } from '../db/database.js';

const META_API_VERSION = 'v19.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export async function fetchMetaCampaigns(dateStart, dateEnd) {
  const accountId = process.env.META_AD_ACCOUNT_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!accountId || !accessToken) {
    console.log('Meta credentials not configured - using demo data');
    return getDemoMetaData(dateStart, dateEnd);
  }

  try {
    const fields = [
      'campaign_id',
      'campaign_name',
      'spend',
      'impressions',
      'reach',
      'clicks',
      'actions',
      'action_values',
      'cpm',
      'cpc',
      'ctr',
      'frequency'
    ].join(',');

    const url = `${META_BASE_URL}/act_${accountId}/insights?fields=${fields}&time_range={"since":"${dateStart}","until":"${dateEnd}"}&level=campaign&time_increment=1&access_token=${accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.data || [];
  } catch (error) {
    console.error('Meta API error:', error);
    throw error;
  }
}

export async function fetchMetaCampaignsByCountry(dateStart, dateEnd) {
  const accountId = process.env.META_AD_ACCOUNT_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!accountId || !accessToken) {
    return getDemoMetaDataByCountry(dateStart, dateEnd);
  }

  try {
    const fields = [
      'campaign_id',
      'campaign_name',
      'spend',
      'impressions',
      'reach',
      'clicks',
      'actions',
      'action_values',
      'cpm',
      'cpc',
      'ctr',
      'frequency'
    ].join(',');

    const url = `${META_BASE_URL}/act_${accountId}/insights?fields=${fields}&time_range={"since":"${dateStart}","until":"${dateEnd}"}&level=campaign&time_increment=1&breakdowns=country&access_token=${accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.data || [];
  } catch (error) {
    console.error('Meta API error:', error);
    throw error;
  }
}

export async function syncMetaData() {
  const db = getDb();
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    const campaigns = await fetchMetaCampaigns(startDate, endDate);
    const countryData = await fetchMetaCampaignsByCountry(startDate, endDate);

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO meta_daily_metrics 
      (date, campaign_id, campaign_name, country, spend, impressions, reach, clicks, 
       landing_page_views, add_to_cart, checkouts_initiated, conversions, conversion_value,
       cpm, cpc, ctr, frequency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let recordsInserted = 0;

    // Insert campaign totals
    for (const row of campaigns) {
      const actions = parseActions(row.actions || []);
      const actionValues = parseActionValues(row.action_values || []);

      insertStmt.run(
        row.date_start,
        row.campaign_id,
        row.campaign_name,
        'ALL',
        parseFloat(row.spend) || 0,
        parseInt(row.impressions) || 0,
        parseInt(row.reach) || 0,
        parseInt(row.clicks) || 0,
        actions.landing_page_view || 0,
        actions.add_to_cart || 0,
        actions.initiate_checkout || 0,
        actions.purchase || 0,
        actionValues.purchase || 0,
        parseFloat(row.cpm) || 0,
        parseFloat(row.cpc) || 0,
        parseFloat(row.ctr) || 0,
        parseFloat(row.frequency) || 0
      );
      recordsInserted++;
    }

    // Insert country breakdown
    for (const row of countryData) {
      const actions = parseActions(row.actions || []);
      const actionValues = parseActionValues(row.action_values || []);

      insertStmt.run(
        row.date_start,
        row.campaign_id,
        row.campaign_name,
        row.country || 'UNKNOWN',
        parseFloat(row.spend) || 0,
        parseInt(row.impressions) || 0,
        parseInt(row.reach) || 0,
        parseInt(row.clicks) || 0,
        actions.landing_page_view || 0,
        actions.add_to_cart || 0,
        actions.initiate_checkout || 0,
        actions.purchase || 0,
        actionValues.purchase || 0,
        parseFloat(row.cpm) || 0,
        parseFloat(row.cpc) || 0,
        parseFloat(row.ctr) || 0,
        parseFloat(row.frequency) || 0
      );
      recordsInserted++;
    }

    // Log sync
    db.prepare(`
      INSERT INTO sync_log (source, status, records_synced)
      VALUES ('meta', 'success', ?)
    `).run(recordsInserted);

    return { success: true, records: recordsInserted };
  } catch (error) {
    db.prepare(`
      INSERT INTO sync_log (source, status, error_message)
      VALUES ('meta', 'error', ?)
    `).run(error.message);

    throw error;
  }
}

function parseActions(actions) {
  const result = {
    landing_page_view: 0,
    add_to_cart: 0,
    initiate_checkout: 0,
    purchase: 0
  };

  for (const action of actions) {
    if (action.action_type === 'landing_page_view') {
      result.landing_page_view = parseInt(action.value) || 0;
    } else if (action.action_type === 'add_to_cart') {
      result.add_to_cart = parseInt(action.value) || 0;
    } else if (action.action_type === 'initiate_checkout') {
      result.initiate_checkout = parseInt(action.value) || 0;
    } else if (action.action_type === 'purchase' || action.action_type === 'omni_purchase') {
      result.purchase = parseInt(action.value) || 0;
    }
  }

  return result;
}

function parseActionValues(actionValues) {
  const result = { purchase: 0 };

  for (const av of actionValues) {
    if (av.action_type === 'purchase' || av.action_type === 'omni_purchase') {
      result.purchase = parseFloat(av.value) || 0;
    }
  }

  return result;
}

// Demo data for testing without API credentials
function getDemoMetaData(dateStart, dateEnd) {
  const campaigns = [
    { id: 'camp_1', name: 'Modern Gentleman' },
    { id: 'camp_2', name: 'Heritage Gentleman' },
    { id: 'camp_3', name: 'Gift Giver' }
  ];

  const data = [];
  const start = new Date(dateStart);
  const end = new Date(dateEnd);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];

    for (const camp of campaigns) {
      const baseSpend = camp.id === 'camp_1' ? 850 : camp.id === 'camp_2' ? 580 : 420;
      const variance = 0.8 + Math.random() * 0.4;

      data.push({
        date_start: dateStr,
        campaign_id: camp.id,
        campaign_name: camp.name,
        spend: (baseSpend * variance).toFixed(2),
        impressions: Math.floor(280000 * variance),
        reach: Math.floor(180000 * variance),
        clicks: Math.floor(3500 * variance),
        cpm: (3.0 + Math.random() * 0.8).toFixed(2),
        cpc: (0.22 + Math.random() * 0.08).toFixed(2),
        ctr: (1.1 + Math.random() * 0.4).toFixed(2),
        frequency: (1.4 + Math.random() * 0.3).toFixed(2),
        actions: [
          { action_type: 'landing_page_view', value: Math.floor(2800 * variance) },
          { action_type: 'add_to_cart', value: Math.floor(210 * variance) },
          { action_type: 'initiate_checkout', value: Math.floor(84 * variance) },
          { action_type: 'purchase', value: Math.floor(14 * variance) }
        ],
        action_values: [
          { action_type: 'purchase', value: (baseSpend * variance * 3.5).toFixed(2) }
        ]
      });
    }
  }

  return data;
}

function getDemoMetaDataByCountry(dateStart, dateEnd) {
  const campaigns = [
    { id: 'camp_1', name: 'Modern Gentleman' },
    { id: 'camp_2', name: 'Heritage Gentleman' },
    { id: 'camp_3', name: 'Gift Giver' }
  ];

  const countries = [
    { code: 'SA', share: 0.50 },
    { code: 'AE', share: 0.30 },
    { code: 'KW', share: 0.15 },
    { code: 'QA', share: 0.05 }
  ];

  const data = [];
  const start = new Date(dateStart);
  const end = new Date(dateEnd);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];

    for (const camp of campaigns) {
      for (const country of countries) {
        const baseSpend = camp.id === 'camp_1' ? 850 : camp.id === 'camp_2' ? 580 : 420;
        const variance = 0.8 + Math.random() * 0.4;
        const countrySpend = baseSpend * country.share * variance;

        data.push({
          date_start: dateStr,
          campaign_id: camp.id,
          campaign_name: camp.name,
          country: country.code,
          spend: countrySpend.toFixed(2),
          impressions: Math.floor(280000 * country.share * variance),
          reach: Math.floor(180000 * country.share * variance),
          clicks: Math.floor(3500 * country.share * variance),
          cpm: (3.0 + Math.random() * 0.8).toFixed(2),
          cpc: (0.22 + Math.random() * 0.08).toFixed(2),
          ctr: (1.1 + Math.random() * 0.4).toFixed(2),
          frequency: (1.4 + Math.random() * 0.3).toFixed(2),
          actions: [
            { action_type: 'landing_page_view', value: Math.floor(2800 * country.share * variance) },
            { action_type: 'add_to_cart', value: Math.floor(210 * country.share * variance) },
            { action_type: 'initiate_checkout', value: Math.floor(84 * country.share * variance) },
            { action_type: 'purchase', value: Math.floor(14 * country.share * variance) }
          ],
          action_values: [
            { action_type: 'purchase', value: (countrySpend * 3.5).toFixed(2) }
          ]
        });
      }
    }
  }

  return data;
}

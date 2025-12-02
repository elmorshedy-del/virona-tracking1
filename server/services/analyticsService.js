import { getDb } from '../db/database.js';

export function getOverviewKPIs(startDate, endDate) {
  const db = getDb();

  // Meta spend
  const metaSpend = db.prepare(`
    SELECT COALESCE(SUM(spend), 0) as total
    FROM meta_daily_metrics
    WHERE date BETWEEN ? AND ? AND country = 'ALL'
  `).get(startDate, endDate);

  // Salla orders and revenue
  const sallaData = db.prepare(`
    SELECT 
      COUNT(*) as orders,
      COALESCE(SUM(order_total), 0) as revenue
    FROM salla_orders
    WHERE date BETWEEN ? AND ?
  `).get(startDate, endDate);

  // Manual orders and revenue
  const manualData = db.prepare(`
    SELECT 
      COALESCE(SUM(orders_count), 0) as orders,
      COALESCE(SUM(revenue), 0) as revenue
    FROM manual_orders
    WHERE date BETWEEN ? AND ?
  `).get(startDate, endDate);

  const totalOrders = (sallaData?.orders || 0) + (manualData?.orders || 0);
  const totalRevenue = (sallaData?.revenue || 0) + (manualData?.revenue || 0);
  const spend = metaSpend?.total || 0;

  return {
    spend,
    orders: totalOrders,
    sallaOrders: sallaData?.orders || 0,
    manualOrders: manualData?.orders || 0,
    revenue: totalRevenue,
    aov: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    cac: totalOrders > 0 ? spend / totalOrders : 0,
    roas: spend > 0 ? totalRevenue / spend : 0
  };
}

export function getKPITrends(startDate, endDate) {
  const db = getDb();

  // Daily spend from Meta
  const spendByDay = db.prepare(`
    SELECT date, SUM(spend) as spend
    FROM meta_daily_metrics
    WHERE date BETWEEN ? AND ? AND country = 'ALL'
    GROUP BY date
    ORDER BY date
  `).all(startDate, endDate);

  // Daily orders from Salla
  const sallaByDay = db.prepare(`
    SELECT date, COUNT(*) as orders, SUM(order_total) as revenue
    FROM salla_orders
    WHERE date BETWEEN ? AND ?
    GROUP BY date
    ORDER BY date
  `).all(startDate, endDate);

  // Daily manual orders
  const manualByDay = db.prepare(`
    SELECT date, SUM(orders_count) as orders, SUM(revenue) as revenue
    FROM manual_orders
    WHERE date BETWEEN ? AND ?
    GROUP BY date
    ORDER BY date
  `).all(startDate, endDate);

  // Combine into daily trends
  const dateMap = {};

  for (const row of spendByDay) {
    if (!dateMap[row.date]) dateMap[row.date] = { date: row.date, spend: 0, orders: 0, revenue: 0 };
    dateMap[row.date].spend = row.spend;
  }

  for (const row of sallaByDay) {
    if (!dateMap[row.date]) dateMap[row.date] = { date: row.date, spend: 0, orders: 0, revenue: 0 };
    dateMap[row.date].orders += row.orders;
    dateMap[row.date].revenue += row.revenue;
  }

  for (const row of manualByDay) {
    if (!dateMap[row.date]) dateMap[row.date] = { date: row.date, spend: 0, orders: 0, revenue: 0 };
    dateMap[row.date].orders += row.orders || 0;
    dateMap[row.date].revenue += row.revenue || 0;
  }

  const trends = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

  // Calculate derived metrics for each day
  return trends.map(day => ({
    ...day,
    aov: day.orders > 0 ? day.revenue / day.orders : 0,
    cac: day.orders > 0 ? day.spend / day.orders : 0,
    roas: day.spend > 0 ? day.revenue / day.spend : 0
  }));
}

export function getCampaignMetrics(startDate, endDate) {
  const db = getDb();

  const campaigns = db.prepare(`
    SELECT 
      campaign_id,
      campaign_name,
      SUM(spend) as spend,
      SUM(impressions) as impressions,
      SUM(reach) as reach,
      SUM(clicks) as clicks,
      SUM(landing_page_views) as lpv,
      SUM(add_to_cart) as atc,
      SUM(checkouts_initiated) as checkout,
      SUM(conversions) as conversions,
      SUM(conversion_value) as conversion_value,
      AVG(frequency) as frequency
    FROM meta_daily_metrics
    WHERE date BETWEEN ? AND ? AND country = 'ALL'
    GROUP BY campaign_id, campaign_name
    ORDER BY spend DESC
  `).all(startDate, endDate);

  return campaigns.map(c => {
    const cpm = c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0;
    const cpc = c.clicks > 0 ? c.spend / c.clicks : 0;
    const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
    const cr = c.clicks > 0 ? (c.conversions / c.clicks) * 100 : 0;
    const metaRoas = c.spend > 0 ? c.conversion_value / c.spend : 0;
    const metaAov = c.conversions > 0 ? c.conversion_value / c.conversions : 0;
    const metaCac = c.conversions > 0 ? c.spend / c.conversions : 0;

    return {
      campaignId: c.campaign_id,
      campaignName: c.campaign_name,
      spend: c.spend,
      impressions: c.impressions,
      reach: c.reach,
      clicks: c.clicks,
      lpv: c.lpv,
      atc: c.atc,
      checkout: c.checkout,
      conversions: c.conversions,
      conversionValue: c.conversion_value,
      cpm,
      cpc,
      ctr,
      cr,
      frequency: c.frequency,
      metaRoas,
      metaAov,
      metaCac
    };
  });
}

export function getCampaignsByCountry(startDate, endDate) {
  const db = getDb();

  return db.prepare(`
    SELECT 
      campaign_id,
      campaign_name,
      country,
      SUM(spend) as spend,
      SUM(impressions) as impressions,
      SUM(reach) as reach,
      SUM(clicks) as clicks,
      SUM(conversions) as conversions,
      SUM(conversion_value) as conversion_value,
      AVG(frequency) as frequency
    FROM meta_daily_metrics
    WHERE date BETWEEN ? AND ? AND country != 'ALL'
    GROUP BY campaign_id, campaign_name, country
    ORDER BY campaign_name, spend DESC
  `).all(startDate, endDate);
}

export function getCountryMetrics(startDate, endDate) {
  const db = getDb();

  // Meta spend by country
  const metaByCountry = db.prepare(`
    SELECT 
      country,
      SUM(spend) as spend
    FROM meta_daily_metrics
    WHERE date BETWEEN ? AND ? AND country != 'ALL'
    GROUP BY country
  `).all(startDate, endDate);

  // Salla orders by country
  const sallaByCountry = db.prepare(`
    SELECT 
      country,
      COUNT(*) as orders,
      SUM(order_total) as revenue
    FROM salla_orders
    WHERE date BETWEEN ? AND ?
    GROUP BY country
  `).all(startDate, endDate);

  // Manual orders by country
  const manualByCountry = db.prepare(`
    SELECT 
      country,
      SUM(orders_count) as orders,
      SUM(revenue) as revenue
    FROM manual_orders
    WHERE date BETWEEN ? AND ?
    GROUP BY country
  `).all(startDate, endDate);

  // Combine data
  const countryMap = {};
  const countryNames = {
    'SA': { name: 'Saudi Arabia', flag: '🇸🇦' },
    'AE': { name: 'UAE', flag: '🇦🇪' },
    'KW': { name: 'Kuwait', flag: '🇰🇼' },
    'QA': { name: 'Qatar', flag: '🇶🇦' },
    'BH': { name: 'Bahrain', flag: '🇧🇭' },
    'OM': { name: 'Oman', flag: '🇴🇲' }
  };

  for (const row of metaByCountry) {
    const code = row.country;
    if (!countryMap[code]) {
      countryMap[code] = {
        code,
        name: countryNames[code]?.name || code,
        flag: countryNames[code]?.flag || '🏳️',
        spend: 0,
        sallaOrders: 0,
        manualOrders: 0,
        sallaRevenue: 0,
        manualRevenue: 0
      };
    }
    countryMap[code].spend = row.spend;
  }

  for (const row of sallaByCountry) {
    const code = row.country;
    if (!countryMap[code]) {
      countryMap[code] = {
        code,
        name: countryNames[code]?.name || code,
        flag: countryNames[code]?.flag || '🏳️',
        spend: 0,
        sallaOrders: 0,
        manualOrders: 0,
        sallaRevenue: 0,
        manualRevenue: 0
      };
    }
    countryMap[code].sallaOrders = row.orders;
    countryMap[code].sallaRevenue = row.revenue;
  }

  for (const row of manualByCountry) {
    const code = row.country;
    if (!countryMap[code]) {
      countryMap[code] = {
        code,
        name: countryNames[code]?.name || code,
        flag: countryNames[code]?.flag || '🏳️',
        spend: 0,
        sallaOrders: 0,
        manualOrders: 0,
        sallaRevenue: 0,
        manualRevenue: 0
      };
    }
    countryMap[code].manualOrders = row.orders || 0;
    countryMap[code].manualRevenue = row.revenue || 0;
  }

  // Calculate derived metrics
  return Object.values(countryMap).map(c => {
    const totalOrders = c.sallaOrders + c.manualOrders;
    const totalRevenue = c.sallaRevenue + c.manualRevenue;
    return {
      ...c,
      totalOrders,
      totalRevenue,
      aov: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      cac: totalOrders > 0 ? c.spend / totalOrders : 0,
      roas: c.spend > 0 ? totalRevenue / c.spend : 0
    };
  }).sort((a, b) => b.spend - a.spend);
}

export function getBudgetEfficiency(startDate, endDate) {
  const db = getDb();

  // Get current period metrics
  const current = getOverviewKPIs(startDate, endDate);

  // Calculate previous period (same length)
  const daysDiff = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
  const prevEndDate = new Date(startDate);
  prevEndDate.setDate(prevEndDate.getDate() - 1);
  const prevStartDate = new Date(prevEndDate);
  prevStartDate.setDate(prevStartDate.getDate() - daysDiff);

  const previous = getOverviewKPIs(
    prevStartDate.toISOString().split('T')[0],
    prevEndDate.toISOString().split('T')[0]
  );

  // Calculate efficiency metrics
  const spendChange = previous.spend > 0 ? ((current.spend - previous.spend) / previous.spend) * 100 : 0;
  const roasChange = previous.roas > 0 ? ((current.roas - previous.roas) / previous.roas) * 100 : 0;

  // Efficiency ratio: if you spend more, are you getting proportionally more?
  const efficiencyRatio = spendChange !== 0 && roasChange !== 0 
    ? (1 + roasChange/100) / (1 + spendChange/100) 
    : 1;

  // Marginal CAC: what's the CAC of the incremental spend?
  const incrementalSpend = current.spend - previous.spend;
  const incrementalOrders = current.orders - previous.orders;
  const marginalCac = incrementalOrders > 0 ? incrementalSpend / incrementalOrders : current.cac;

  // Determine status
  let status = 'green';
  if (efficiencyRatio < 0.85 || marginalCac > current.cac * 1.3) {
    status = 'yellow';
  }
  if (efficiencyRatio < 0.7 || marginalCac > current.cac * 1.5) {
    status = 'red';
  }

  // Campaign-level efficiency
  const campaigns = getCampaignMetrics(startDate, endDate);
  const prevCampaigns = getCampaignMetrics(
    prevStartDate.toISOString().split('T')[0],
    prevEndDate.toISOString().split('T')[0]
  );

  const campaignEfficiency = campaigns.map(c => {
    const prev = prevCampaigns.find(p => p.campaignId === c.campaignId);
    
    let campStatus = 'green';
    let cpmChange = 0;
    let ctrChange = 0;
    let margCac = c.metaCac;

    if (prev) {
      cpmChange = prev.cpm > 0 ? ((c.cpm - prev.cpm) / prev.cpm) * 100 : 0;
      ctrChange = prev.ctr > 0 ? ((c.ctr - prev.ctr) / prev.ctr) * 100 : 0;
      
      const incSpend = c.spend - prev.spend;
      const incConv = c.conversions - prev.conversions;
      margCac = incConv > 0 ? incSpend / incConv : c.metaCac;

      if (c.frequency > 3 || cpmChange > 15 || ctrChange < -10 || margCac > c.metaCac * 1.3) {
        campStatus = 'yellow';
      }
      if (c.frequency > 4 || cpmChange > 25 || ctrChange < -20 || margCac > c.metaCac * 1.5) {
        campStatus = 'red';
      }
    }

    return {
      ...c,
      status: campStatus,
      cpmChange,
      ctrChange,
      marginalCac: margCac
    };
  });

  // Country-level efficiency
  const countries = getCountryMetrics(startDate, endDate);
  const prevCountries = getCountryMetrics(
    prevStartDate.toISOString().split('T')[0],
    prevEndDate.toISOString().split('T')[0]
  );

  const countryEfficiency = countries.map(c => {
    const prev = prevCountries.find(p => p.code === c.code);
    
    let scaling = 'green';
    let headroom = 'Can scale +40%';

    if (prev && prev.cac > 0) {
      const cacChange = ((c.cac - prev.cac) / prev.cac) * 100;
      
      if (cacChange > 15) {
        scaling = 'yellow';
        headroom = 'Hold budget';
      }
      if (cacChange > 30) {
        scaling = 'red';
        headroom = 'Reduce -20%';
      }
    }

    return {
      ...c,
      scaling,
      headroom
    };
  });

  return {
    status,
    current,
    previous,
    spendChange,
    roasChange,
    efficiencyRatio,
    averageCac: current.cac,
    marginalCac,
    marginalPremium: current.cac > 0 ? ((marginalCac - current.cac) / current.cac) * 100 : 0,
    campaigns: campaignEfficiency,
    countries: countryEfficiency
  };
}

export function getEfficiencyTrends(startDate, endDate) {
  const trends = getKPITrends(startDate, endDate);
  
  // Calculate rolling averages and efficiency curves
  const windowSize = 3; // 3-day rolling
  
  return trends.map((day, i) => {
    // Calculate rolling average CAC
    const start = Math.max(0, i - windowSize + 1);
    const window = trends.slice(start, i + 1);
    
    const rollingSpend = window.reduce((s, d) => s + d.spend, 0);
    const rollingOrders = window.reduce((s, d) => s + d.orders, 0);
    const rollingRevenue = window.reduce((s, d) => s + d.revenue, 0);
    
    return {
      date: day.date,
      spend: day.spend,
      orders: day.orders,
      revenue: day.revenue,
      cac: day.cac,
      roas: day.roas,
      rollingCac: rollingOrders > 0 ? rollingSpend / rollingOrders : 0,
      rollingRoas: rollingSpend > 0 ? rollingRevenue / rollingSpend : 0,
      // Marginal efficiency (comparing to previous day)
      marginalCac: i > 0 && (day.orders - trends[i-1].orders) > 0
        ? (day.spend - trends[i-1].spend) / (day.orders - trends[i-1].orders)
        : day.cac
    };
  });
}

export function getDiagnostics(startDate, endDate) {
  const campaigns = getCampaignMetrics(startDate, endDate);
  const efficiency = getBudgetEfficiency(startDate, endDate);
  const diagnostics = [];

  // Check each campaign for issues
  for (const camp of campaigns) {
    // High frequency
    if (camp.frequency > 3.5) {
      diagnostics.push({
        type: 'warning',
        icon: '⚠️',
        title: `${camp.campaignName}: High Frequency (${camp.frequency.toFixed(1)})`,
        detail: 'Audience seeing ads 3.5+ times per week. Creative fatigue likely.',
        action: '→ Reduce budget 20% and refresh creatives'
      });
    }

    // Low CTR
    if (camp.ctr < 0.8 && camp.impressions > 10000) {
      diagnostics.push({
        type: 'warning',
        icon: '⚠️',
        title: `${camp.campaignName}: Low CTR (${camp.ctr.toFixed(2)}%)`,
        detail: 'Below average click-through rate indicates creative or targeting issues.',
        action: '→ Test new creatives or refine audience targeting'
      });
    }

    // High ATC to Checkout drop-off
    if (camp.atc > 0 && camp.checkout > 0) {
      const dropOff = ((camp.atc - camp.checkout) / camp.atc) * 100;
      if (dropOff > 60) {
        diagnostics.push({
          type: 'warning',
          icon: '⚠️',
          title: `${camp.campaignName}: High Cart Abandonment (${dropOff.toFixed(0)}%)`,
          detail: `${camp.atc} added to cart but only ${camp.checkout} started checkout.`,
          action: '→ Check cart page UX, shipping costs, payment options'
        });
      }
    }
  }

  // Check for attribution mismatch
  const totalMetaConv = campaigns.reduce((s, c) => s + c.conversions, 0);
  const overview = getOverviewKPIs(startDate, endDate);
  
  if (totalMetaConv > 0 && overview.sallaOrders > 0) {
    const mismatch = Math.abs(totalMetaConv - overview.sallaOrders) / totalMetaConv * 100;
    if (mismatch > 15) {
      diagnostics.push({
        type: 'warning',
        icon: '⚠️',
        title: `Attribution Mismatch: ${mismatch.toFixed(0)}%`,
        detail: `Meta reports ${totalMetaConv} conversions, Salla shows ${overview.sallaOrders} orders.`,
        action: '→ Check pixel setup and order confirmation page'
      });
    }
  }

  // Positive signals
  for (const country of efficiency.countries) {
    if (country.scaling === 'green' && country.roas > 3) {
      diagnostics.push({
        type: 'success',
        icon: '✅',
        title: `${country.name}: Strong Performance (${country.roas.toFixed(2)}× ROAS)`,
        detail: `Efficient CAC at $${country.cac.toFixed(2)}. Market is performing well.`,
        action: `→ Consider scaling ${country.name} budget +30%`
      });
    }
  }

  // Overall efficiency
  if (efficiency.roasChange > 5) {
    diagnostics.push({
      type: 'success',
      icon: '✅',
      title: `ROAS improved ${efficiency.roasChange.toFixed(1)}% vs last period`,
      detail: 'Overall acquisition efficiency is improving.',
      action: '→ Continue current strategy'
    });
  }

  if (efficiency.marginalPremium < 10) {
    diagnostics.push({
      type: 'success',
      icon: '✅',
      title: 'Marginal CAC is healthy',
      detail: `New spending is only ${efficiency.marginalPremium.toFixed(0)}% less efficient than average.`,
      action: '→ Room to scale if needed'
    });
  }

  return diagnostics;
}

export function getRecommendations(startDate, endDate) {
  const efficiency = getBudgetEfficiency(startDate, endDate);
  const recommendations = [];

  // Campaign-level recommendations
  for (const camp of efficiency.campaigns) {
    if (camp.status === 'red') {
      recommendations.push({
        priority: 1,
        type: 'urgent',
        title: `Reduce ${camp.campaignName} budget by 25%`,
        detail: `Frequency at ${camp.frequency.toFixed(1)} means audience is oversaturated. Reduce spend and let audience recover.`,
        impact: `Expected: Save ~$${(camp.spend * 0.25 / 7).toFixed(0)}/day, improve efficiency by 15%`
      });
    } else if (camp.status === 'yellow' && camp.ctrChange < -10) {
      recommendations.push({
        priority: 2,
        type: 'standard',
        title: `Refresh ${camp.campaignName} creatives`,
        detail: `CTR dropped ${Math.abs(camp.ctrChange).toFixed(0)}% while frequency rising. Creative fatigue setting in.`,
        impact: `Expected: Restore CTR, reduce CPC by ~15%`
      });
    } else if (camp.status === 'green' && camp.marginalCac < camp.metaCac * 1.1) {
      recommendations.push({
        priority: 3,
        type: 'positive',
        title: `Scale ${camp.campaignName} by 25%`,
        detail: `Low frequency (${camp.frequency.toFixed(1)}), stable metrics, efficient marginal CAC. Room to grow.`,
        impact: `Expected: +${Math.floor(camp.conversions * 0.25)} additional conversions at current efficiency`
      });
    }
  }

  // Country-level recommendations
  const greenCountries = efficiency.countries.filter(c => c.scaling === 'green');
  const redCountries = efficiency.countries.filter(c => c.scaling === 'red');

  if (greenCountries.length > 0 && redCountries.length > 0) {
    const shiftAmount = Math.min(
      redCountries.reduce((s, c) => s + c.spend * 0.2, 0),
      1000
    );
    recommendations.push({
      priority: 2,
      type: 'standard',
      title: `Shift $${shiftAmount.toFixed(0)} from ${redCountries.map(c => c.name).join(', ')} to ${greenCountries.map(c => c.name).join(', ')}`,
      detail: `${redCountries.map(c => c.name).join(' and ')} showing saturation. ${greenCountries.map(c => c.name).join(' and ')} still efficient with room to grow.`,
      impact: `Expected: Better overall ROAS with same spend`
    });
  }

  return recommendations.sort((a, b) => a.priority - b.priority);
}

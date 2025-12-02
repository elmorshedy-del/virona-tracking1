import fetch from 'node-fetch';
import { getDb } from '../db/database.js';

const SALLA_BASE_URL = 'https://api.salla.dev/admin/v2';

export async function fetchSallaOrders(dateStart, dateEnd, page = 1) {
  const accessToken = process.env.SALLA_ACCESS_TOKEN;

  if (!accessToken) {
    console.log('Salla credentials not configured - using demo data');
    return getDemoSallaData(dateStart, dateEnd);
  }

  try {
    const url = `${SALLA_BASE_URL}/orders?page=${page}&per_page=50&from_date=${dateStart}&to_date=${dateEnd}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Salla API error');
    }

    // If there are more pages, fetch them recursively
    const orders = data.data || [];
    
    if (data.pagination && data.pagination.currentPage < data.pagination.totalPages) {
      const moreOrders = await fetchSallaOrders(dateStart, dateEnd, page + 1);
      return [...orders, ...moreOrders];
    }

    return orders;
  } catch (error) {
    console.error('Salla API error:', error);
    throw error;
  }
}

export async function syncSallaData() {
  const db = getDb();
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    const orders = await fetchSallaOrders(startDate, endDate);

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO salla_orders 
      (order_id, date, country, order_total, items_count, status, payment_method)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let recordsInserted = 0;

    for (const order of orders) {
      const orderDate = order.date?.date?.split(' ')[0] || 
                        order.created_at?.split('T')[0] || 
                        new Date().toISOString().split('T')[0];

      // Get country from shipping address
      const country = order.shipping?.country?.code || 
                      order.customer?.country?.code || 
                      'SA';

      insertStmt.run(
        order.id.toString(),
        orderDate,
        country,
        parseFloat(order.total?.amount) || parseFloat(order.total) || 0,
        order.items?.length || 1,
        order.status?.name || order.status || 'completed',
        order.payment_method || 'unknown'
      );
      recordsInserted++;
    }

    // Log sync
    db.prepare(`
      INSERT INTO sync_log (source, status, records_synced)
      VALUES ('salla', 'success', ?)
    `).run(recordsInserted);

    return { success: true, records: recordsInserted };
  } catch (error) {
    db.prepare(`
      INSERT INTO sync_log (source, status, error_message)
      VALUES ('salla', 'error', ?)
    `).run(error.message);

    throw error;
  }
}

// Demo data for testing without API credentials
function getDemoSallaData(dateStart, dateEnd) {
  const countries = [
    { code: 'SA', share: 0.50 },
    { code: 'AE', share: 0.30 },
    { code: 'KW', share: 0.15 },
    { code: 'QA', share: 0.05 }
  ];

  const orders = [];
  const start = new Date(dateStart);
  const end = new Date(dateEnd);
  let orderId = 10000;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    
    // Generate 18-25 orders per day
    const dailyOrders = 18 + Math.floor(Math.random() * 8);

    for (let i = 0; i < dailyOrders; i++) {
      // Assign country based on share probability
      const rand = Math.random();
      let country = 'SA';
      let cumulative = 0;
      for (const c of countries) {
        cumulative += c.share;
        if (rand <= cumulative) {
          country = c.code;
          break;
        }
      }

      // Random order value between 180 and 450
      const orderValue = 180 + Math.random() * 270;

      orders.push({
        id: orderId++,
        date: { date: dateStr + ' 12:00:00' },
        shipping: { country: { code: country } },
        total: { amount: orderValue.toFixed(2) },
        items: [{ id: 1 }],
        status: { name: 'completed' },
        payment_method: Math.random() > 0.3 ? 'credit_card' : 'cod'
      });
    }
  }

  return orders;
}

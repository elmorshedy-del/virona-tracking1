import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

export function getDb() {
  if (!db) {
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'vironax.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function initDatabase() {
  const db = getDb();
  
  // Meta campaign daily metrics
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta_daily_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      campaign_name TEXT,
      country TEXT DEFAULT 'ALL',
      spend REAL DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      reach INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      landing_page_views INTEGER DEFAULT 0,
      add_to_cart INTEGER DEFAULT 0,
      checkouts_initiated INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      conversion_value REAL DEFAULT 0,
      cpm REAL DEFAULT 0,
      cpc REAL DEFAULT 0,
      ctr REAL DEFAULT 0,
      frequency REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, campaign_id, country)
    )
  `);

  // Salla orders
  db.exec(`
    CREATE TABLE IF NOT EXISTS salla_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      country TEXT,
      order_total REAL DEFAULT 0,
      items_count INTEGER DEFAULT 1,
      status TEXT,
      payment_method TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Manual orders
  db.exec(`
    CREATE TABLE IF NOT EXISTS manual_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      country TEXT NOT NULL,
      campaign TEXT,
      orders_count INTEGER DEFAULT 1,
      revenue REAL DEFAULT 0,
      source TEXT DEFAULT 'whatsapp',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sync log
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      records_synced INTEGER DEFAULT 0,
      error_message TEXT,
      synced_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_meta_date ON meta_daily_metrics(date);
    CREATE INDEX IF NOT EXISTS idx_meta_campaign ON meta_daily_metrics(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_salla_date ON salla_orders(date);
    CREATE INDEX IF NOT EXISTS idx_manual_date ON manual_orders(date);
  `);

  console.log('✅ Database initialized');
  return db;
}

// Helper functions for common queries
export function getDateRange(days = 7) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}

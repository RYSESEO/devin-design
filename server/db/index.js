import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_URL || path.join(__dirname, '..', '..', 'data', 'ryse.db');

// Ensure the data directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, key)
  );

  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS dashboard_layouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    layout_json TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS oauth_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    state TEXT UNIQUE NOT NULL,
    shop TEXT,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS intelligence_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    metric TEXT NOT NULL,
    target REAL NOT NULL,
    current REAL DEFAULT 0,
    label TEXT,
    deadline TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS intelligence_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    metric TEXT NOT NULL,
    condition TEXT NOT NULL,
    threshold REAL NOT NULL,
    action_type TEXT DEFAULT 'notify',
    enabled INTEGER DEFAULT 1,
    triggered_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS revenue_attribution (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    order_id TEXT,
    source TEXT NOT NULL,
    channel TEXT NOT NULL,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    revenue REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS automations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    trigger_config TEXT DEFAULT '{}',
    conditions TEXT DEFAULT '[]',
    actions TEXT DEFAULT '[]',
    enabled INTEGER DEFAULT 1,
    deleted INTEGER DEFAULT 0,
    last_run DATETIME,
    run_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS automation_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    category TEXT,
    trigger_type TEXT NOT NULL,
    trigger_config TEXT DEFAULT '{}',
    conditions TEXT DEFAULT '[]',
    actions TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    score INTEGER DEFAULT 0,
    source TEXT,
    page_visits INTEGER DEFAULT 0,
    email_opens INTEGER DEFAULT 0,
    purchases INTEGER DEFAULT 0,
    days_since_last_activity INTEGER DEFAULT 0,
    behavior_data TEXT DEFAULT '{}',
    priority TEXT DEFAULT 'cold',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notification_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    channel_type TEXT NOT NULL,
    config TEXT DEFAULT '{}',
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Seed automation_templates with pre-built templates (idempotent)
const seedSQL = "INSERT OR IGNORE INTO automation_templates (name, description, category, trigger_type, trigger_config, conditions, actions) VALUES"
  + " ('Auto-discount slow movers', 'Automatically create discounts for products with low sales velocity', 'sales', 'product_velocity_low', '{\"threshold_days\": 14, \"min_inventory\": 10}', '[{\"field\": \"velocity\", \"operator\": \"below\", \"value\": 2}]', '[{\"type\": \"create_discount\", \"config\": {\"percent\": 15, \"duration_days\": 7}}]'),"
  + " ('Auto-tag high-value customers', 'Tag customers when their order total exceeds a threshold', 'customers', 'order_total_above', '{\"threshold\": 500}', '[{\"field\": \"order_total\", \"operator\": \"above\", \"value\": 500}]', '[{\"type\": \"tag_customer\", \"config\": {\"tag\": \"vip\"}}]'),"
  + " ('Abandoned cart followup', 'Send notification when a cart is abandoned for more than 1 hour', 'engagement', 'cart_abandoned', '{\"delay_minutes\": 60}', '[{\"field\": \"cart_age_minutes\", \"operator\": \"above\", \"value\": 60}]', '[{\"type\": \"send_notification\", \"config\": {\"channel\": \"email\", \"template\": \"cart_reminder\"}}]'),"
  + " ('Inventory reorder alert', 'Notify when inventory drops below reorder point', 'inventory', 'inventory_low', '{\"threshold\": 10}', '[{\"field\": \"stock_level\", \"operator\": \"below\", \"value\": 10}]', '[{\"type\": \"notify\", \"config\": {\"channel\": \"slack\", \"message\": \"Inventory low for {{product_name}}\"}}]'),"
  + " ('Revenue milestone celebration', 'Notify team when a revenue milestone is reached', 'revenue', 'revenue_milestone', '{\"milestone\": 10000}', '[{\"field\": \"total_revenue\", \"operator\": \"above\", \"value\": 10000}]', '[{\"type\": \"notify\", \"config\": {\"channel\": \"slack\", \"message\": \"Revenue milestone reached: ${{amount}}\"}}]');";
db.exec(seedSQL);

// Migrate oauth_states table if it exists without the new columns
try {
  const cols = db.prepare("PRAGMA table_info(oauth_states)").all().map(c => c.name);
  if (!cols.includes('expires_at')) {
    db.exec("ALTER TABLE oauth_states ADD COLUMN expires_at DATETIME");
    // Backfill existing rows with an already-expired timestamp
    db.exec("UPDATE oauth_states SET expires_at = datetime('now', '-1 hour') WHERE expires_at IS NULL");
  }
  if (!cols.includes('shop')) {
    db.exec("ALTER TABLE oauth_states ADD COLUMN shop TEXT");
  }
} catch {
  // Table may not exist yet (first run), ignore
}

export default db;

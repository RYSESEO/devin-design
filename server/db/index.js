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

  CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    store_name TEXT NOT NULL,
    shop_domain TEXT,
    credentials_encrypted TEXT,
    is_active INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS workspaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    owner_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS workspace_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(workspace_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    current_period_end DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS client_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    report_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS order_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    store_id INTEGER,
    product_id TEXT,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    revenue REAL NOT NULL DEFAULT 0,
    order_date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS keyword_rankings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    keyword TEXT NOT NULL,
    position REAL,
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    url TEXT,
    recorded_at TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS price_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id TEXT,
    product_name TEXT NOT NULL,
    original_price REAL NOT NULL,
    test_price REAL NOT NULL,
    conversion_original REAL DEFAULT 0,
    conversion_test REAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS customer_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    customer_email TEXT NOT NULL,
    last_purchase_date TEXT,
    purchase_count INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    avg_order_interval_days REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS competitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    domain TEXT,
    tracked_products TEXT DEFAULT '[]',
    last_checked DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS competitor_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competitor_id INTEGER NOT NULL,
    change_type TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '{}',
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (competitor_id) REFERENCES competitors(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS marketplace_plugins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    author TEXT,
    version TEXT DEFAULT '1.0.0',
    category TEXT,
    config_schema TEXT DEFAULT '{}',
    install_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS installed_plugins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plugin_id INTEGER NOT NULL,
    config TEXT DEFAULT '{}',
    enabled INTEGER DEFAULT 1,
    installed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plugin_id) REFERENCES marketplace_plugins(id) ON DELETE CASCADE,
    UNIQUE(user_id, plugin_id)
  );

  CREATE TABLE IF NOT EXISTS dashboard_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT,
    layout_json TEXT NOT NULL DEFAULT '{}',
    preview_data TEXT DEFAULT '{}',
    install_count INTEGER DEFAULT 0,
    is_custom INTEGER DEFAULT 0,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    key_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    permissions TEXT DEFAULT '["read"]',
    last_used DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS benchmark_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    metric TEXT NOT NULL,
    value REAL NOT NULL,
    period TEXT NOT NULL,
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

// Seed marketplace_plugins with sample plugins (idempotent)
db.exec(`
  INSERT OR IGNORE INTO marketplace_plugins (name, description, author, category, config_schema) VALUES
  ('Analytics Widget', 'Real-time analytics widget with customizable charts', 'RYSE Team', 'analytics', '{"refresh_interval": "number", "chart_type": "string"}'),
  ('Social Feed', 'Aggregated social media feed from connected platforms', 'RYSE Team', 'social', '{"platforms": "array", "max_posts": "number"}'),
  ('Inventory Tracker', 'Live inventory monitoring with low-stock alerts', 'RYSE Team', 'commerce', '{"threshold": "number", "notify": "boolean"}'),
  ('Email Digest', 'Automated daily/weekly email report summaries', 'RYSE Team', 'reporting', '{"frequency": "string", "recipients": "array"}'),
  ('Custom Charts', 'Build custom chart visualizations from any data source', 'RYSE Team', 'analytics', '{"chart_types": "array", "data_sources": "array"}');
`);

// Seed dashboard_templates with sample templates (idempotent)
db.exec(`
  INSERT OR IGNORE INTO dashboard_templates (name, description, category, layout_json, preview_data) VALUES
  ('E-commerce Overview', 'Complete e-commerce dashboard with revenue, orders, and product metrics', 'commerce', '{"panels":["kpi","revenue-chart","orders","products"]}', '{"preview":"ecommerce"}'),
  ('Marketing Command', 'Marketing-focused layout with campaign metrics and social analytics', 'marketing', '{"panels":["campaigns","social","attribution","seo"]}', '{"preview":"marketing"}'),
  ('Developer Ops', 'Technical dashboard with CI/CD, GitHub, and performance metrics', 'development', '{"panels":["github","ci-cd","performance","errors"]}', '{"preview":"devops"}'),
  ('Minimal Analytics', 'Clean minimal layout with key metrics only', 'minimal', '{"panels":["kpi","revenue-chart"]}', '{"preview":"minimal"}');
`);

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

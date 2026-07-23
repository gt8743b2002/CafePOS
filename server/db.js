const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const dbPath = path.join(__dirname, 'data', 'cafepos.db');
const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    name TEXT NOT NULL,
    base_price REAL NOT NULL,
    price_small REAL,
    price_large REAL,
    icon TEXT DEFAULT '',
    image_path TEXT,
    has_size INTEGER NOT NULL DEFAULT 0,
    is_drink INTEGER NOT NULL DEFAULT 0,
    track_stock INTEGER NOT NULL DEFAULT 1,
    stock_qty INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS addons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    subtotal REAL NOT NULL,
    tax REAL NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    order_type TEXT NOT NULL DEFAULT 'TAKE_AWAY',
    payment_method TEXT NOT NULL DEFAULT 'CASH',
    cash_received REAL,
    change_due REAL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER,
    name TEXT NOT NULL,
    size TEXT,
    sugar_level TEXT,
    ice_level TEXT,
    milk_level TEXT,
    addons_json TEXT,
    note TEXT,
    unit_price REAL NOT NULL,
    qty INTEGER NOT NULL,
    line_total REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'CASHIER',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );
`);

function migrateColumns(table, migrations) {
  const existing = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
  for (const [column, sql] of migrations) {
    if (!existing.has(column)) db.exec(sql);
  }
}

migrateColumns('orders', [
  ['order_type', "ALTER TABLE orders ADD COLUMN order_type TEXT NOT NULL DEFAULT 'TAKE_AWAY'"],
  ['payment_method', "ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'CASH'"],
  ['cash_received', 'ALTER TABLE orders ADD COLUMN cash_received REAL'],
  ['change_due', 'ALTER TABLE orders ADD COLUMN change_due REAL'],
]);

migrateColumns('products', [
  ['price_small', 'ALTER TABLE products ADD COLUMN price_small REAL'],
  ['price_large', 'ALTER TABLE products ADD COLUMN price_large REAL'],
]);

migrateColumns('orders', [
  ['cashier_id', 'ALTER TABLE orders ADD COLUMN cashier_id INTEGER'],
  ['cashier_name', 'ALTER TABLE orders ADD COLUMN cashier_name TEXT'],
]);

module.exports = db;

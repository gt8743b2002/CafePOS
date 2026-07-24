const express = require('express');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const db = require('./db');
const seed = require('./seed');
const { TAX_RATE, SIZE_MODIFIERS, MILK_MODIFIERS } = require('./constants');
const { hashPassword, verifyPassword, signToken, authenticate, requireAdmin } = require('./auth');
// Stripe/PayPal integration (server/payments/) is a separate, not-yet-committed
// piece of work — this file must not depend on it until that lands.

seed();
seed.seedUsers();

const UPLOAD_DIR = path.join(db.DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

const asRow = (row) => row || null;

// ---------- Order pricing (shared by staff POS + public guest ordering) ----------
class OrderError extends Error {}

function sizePrice(product, size) {
  if (size === 'SMALL' && product.price_small != null) return product.price_small;
  if (size === 'LARGE' && product.price_large != null) return product.price_large;
  return product.base_price + (SIZE_MODIFIERS[size] ?? 0);
}

function computeLinePrice(product, opts) {
  let unit = product.has_size && opts.size ? sizePrice(product, opts.size) : product.base_price;
  if (product.is_drink && opts.milk_level) {
    unit += MILK_MODIFIERS[opts.milk_level] ?? 0;
  }
  const addonsTotal = (opts.addons || []).reduce((sum, a) => sum + (Number(a.price) || 0), 0);
  unit += addonsTotal;
  return Math.max(0, unit);
}

// Recomputes subtotal/tax/total for a cart server-side — a client-supplied amount is never trusted.
function priceCart(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new OrderError('items must be a non-empty array');
  }
  const productStmt = db.prepare('SELECT * FROM products WHERE id = ?');
  const line = [];
  let subtotal = 0;

  for (const item of items) {
    const product = productStmt.get(Number(item.product_id));
    if (!product || !product.active) {
      throw new OrderError(`Product ${item.product_id} not found or inactive`);
    }
    const qty = Number(item.qty) || 1;
    if (product.track_stock && product.stock_qty < qty) {
      throw new OrderError(`Not enough stock for ${product.name} (have ${product.stock_qty}, need ${qty})`);
    }
    const unitPrice = computeLinePrice(product, item);
    const lineTotal = Math.round(unitPrice * qty * 100) / 100;
    subtotal += lineTotal;
    line.push({
      product,
      qty,
      unitPrice,
      lineTotal,
      size: item.size || null,
      sugar_level: item.sugar_level || null,
      ice_level: item.ice_level || null,
      milk_level: item.milk_level || null,
      addons: item.addons || [],
      note: item.note || null,
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { line, subtotal, tax, total };
}

function createOrderRecord({
  items, orderType, paymentMethod, cashReceived,
  cashierId, cashierName, source, tableNumber, guestName, kitchenStatus, paymentRef, guestToken,
}) {
  const { line, subtotal, tax, total } = priceCart(items);

  let cashReceivedFinal = null;
  let changeDue = null;
  if (paymentMethod === 'CASH') {
    cashReceivedFinal = Math.round(Number(cashReceived) * 100) / 100;
    if (!Number.isFinite(cashReceivedFinal) || cashReceivedFinal < total) {
      throw new OrderError(`Cash received (${cashReceivedFinal}) is less than total due (${total})`);
    }
    changeDue = Math.round((cashReceivedFinal - total) * 100) / 100;
  }

  const createdAt = new Date().toISOString();

  const orderInfo = db.prepare(`
    INSERT INTO orders (
      created_at, subtotal, tax, total, status, order_type, payment_method, cash_received, change_due,
      cashier_id, cashier_name, source, table_number, guest_name, kitchen_status, payment_ref, guest_token
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    createdAt, subtotal, tax, total, 'completed', orderType, paymentMethod, cashReceivedFinal, changeDue,
    cashierId ?? null, cashierName ?? null, source, tableNumber ?? null, guestName ?? null,
    kitchenStatus ?? null, paymentRef ?? null, guestToken ?? null
  );
  const orderId = orderInfo.lastInsertRowid;

  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, name, size, sugar_level, ice_level, milk_level, addons_json, note, unit_price, qty, line_total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const decrementStock = db.prepare('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?');

  for (const l of line) {
    insertItem.run(
      orderId, l.product.id, l.product.name, l.size, l.sugar_level, l.ice_level, l.milk_level,
      JSON.stringify(l.addons), l.note, l.unitPrice, l.qty, l.lineTotal
    );
    if (l.product.track_stock) {
      decrementStock.run(l.qty, l.product.id);
    }
  }

  return getOrderDetail(orderId);
}

function getOrderDetail(id) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) return null;
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id)
    .map((it) => ({ ...it, addons: JSON.parse(it.addons_json || '[]') }));
  return { ...order, items };
}

// ---------- Public read-only catalog (no login required — used by guest ordering) ----------
app.get('/api/categories', (req, res) => {
  const rows = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
  res.json(rows);
});

app.get('/api/products', (req, res) => {
  const { category, includeInactive } = req.query;
  let sql = 'SELECT * FROM products';
  const clauses = [];
  const params = [];
  if (category) {
    clauses.push('category_id = ?');
    params.push(Number(category));
  }
  if (!includeInactive) {
    clauses.push('active = 1');
  }
  if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
  sql += ' ORDER BY name';
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/addons', (req, res) => {
  const { includeInactive } = req.query;
  const sql = includeInactive ? 'SELECT * FROM addons ORDER BY name' : 'SELECT * FROM addons WHERE active = 1 ORDER BY name';
  res.json(db.prepare(sql).all());
});

// ---------- Public guest ordering (table-side, no login) ----------
// Counter payment only for now — Stripe/PayPal verification is a separate,
// not-yet-committed piece of work (see server/payments/).
const KITCHEN_STATUSES = ['RECEIVED', 'PREPARING', 'READY', 'SERVED'];

app.post('/api/orders/guest', (req, res) => {
  const { items, table_number, guest_name, payment_method } = req.body;
  if (!table_number) return res.status(400).json({ error: 'table_number is required' });
  if (payment_method !== 'COUNTER') {
    return res.status(400).json({ error: 'Online payments are not set up yet. Choose "Pay at Counter" to place this order.' });
  }

  try {
    const guestToken = crypto.randomUUID();
    const order = createOrderRecord({
      items,
      orderType: 'DINE_IN',
      paymentMethod: 'COUNTER',
      cashReceived: null,
      cashierId: null,
      cashierName: null,
      source: 'CUSTOMER',
      tableNumber: String(table_number),
      guestName: guest_name || null,
      kitchenStatus: 'RECEIVED',
      paymentRef: null,
      guestToken,
    });
    res.status(201).json({ order, guest_token: guestToken });
  } catch (e) {
    res.status(e instanceof OrderError ? 400 : 500).json({ error: e.message });
  }
});

app.get('/api/public/orders/:id/status', (req, res) => {
  const { token } = req.query;
  const order = getOrderDetail(Number(req.params.id));
  if (!order || order.source !== 'CUSTOMER' || !order.guest_token || order.guest_token !== token) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json({
    id: order.id,
    kitchen_status: order.kitchen_status,
    created_at: order.created_at,
    table_number: order.table_number,
    total: order.total,
    items: order.items.map((it) => ({ name: it.name, qty: it.qty })),
  });
});

// ---------- Auth ----------
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password are required' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username));
  if (!user || !user.active || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = signToken(user);
  res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
});

app.use(authenticate);

app.get('/api/auth/me', (req, res) => {
  res.json(req.user);
});

// ---------- Users (admin only) ----------
app.get('/api/users', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT id, username, name, role, active, created_at FROM users ORDER BY name').all();
  res.json(rows);
});

app.post('/api/users', requireAdmin, (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: 'username, password and name are required' });
  }
  const normalizedRole = role === 'ADMIN' ? 'ADMIN' : 'CASHIER';
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(String(username));
  if (existing) return res.status(400).json({ error: 'Username already exists' });

  const info = db.prepare('INSERT INTO users (username, password_hash, name, role, active, created_at) VALUES (?, ?, ?, ?, 1, ?)')
    .run(String(username), hashPassword(String(password)), String(name), normalizedRole, new Date().toISOString());
  const row = db.prepare('SELECT id, username, name, role, active, created_at FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

app.put('/api/users/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'User not found' });

  const { username, name, role, active, password } = req.body;
  if (active === false && id === req.user.id) {
    return res.status(400).json({ error: 'You cannot deactivate your own account' });
  }
  const normalizedRole = role === 'ADMIN' ? 'ADMIN' : role === 'CASHIER' ? 'CASHIER' : existing.role;
  if (existing.role === 'ADMIN' && normalizedRole !== 'ADMIN') {
    const adminCount = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'ADMIN' AND active = 1").get().n;
    if (adminCount <= 1) return res.status(400).json({ error: 'At least one active admin account is required' });
  }

  const merged = {
    username: username != null ? String(username) : existing.username,
    name: name != null ? String(name) : existing.name,
    role: normalizedRole,
    active: active != null ? (active ? 1 : 0) : existing.active,
    password_hash: password ? hashPassword(String(password)) : existing.password_hash,
  };
  db.prepare('UPDATE users SET username=?, name=?, role=?, active=?, password_hash=? WHERE id=?')
    .run(merged.username, merged.name, merged.role, merged.active, merged.password_hash, id);
  const row = db.prepare('SELECT id, username, name, role, active, created_at FROM users WHERE id = ?').get(id);
  res.json(row);
});

app.delete('/api/users/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account' });
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'User not found' });
  if (existing.role === 'ADMIN') {
    const adminCount = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'ADMIN' AND active = 1").get().n;
    if (adminCount <= 1) return res.status(400).json({ error: 'At least one active admin account is required' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});

// ---------- Products (mutations — admin only; reads are public, defined above) ----------
app.post('/api/products', requireAdmin, (req, res) => {
  const { category_id, name, base_price, price_small, price_large, icon, has_size, is_drink, track_stock, stock_qty } = req.body;
  if (!category_id || !name || base_price == null) {
    return res.status(400).json({ error: 'category_id, name and base_price are required' });
  }
  const info = db.prepare(`
    INSERT INTO products (category_id, name, base_price, price_small, price_large, icon, has_size, is_drink, track_stock, stock_qty, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    Number(category_id), String(name), Number(base_price),
    price_small == null || price_small === '' ? null : Number(price_small),
    price_large == null || price_large === '' ? null : Number(price_large),
    icon || '', has_size ? 1 : 0, is_drink ? 1 : 0, track_stock === false ? 0 : 1, Number(stock_qty) || 0
  );
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

app.put('/api/products/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const merged = { ...existing, ...req.body };
  db.prepare(`
    UPDATE products SET category_id=?, name=?, base_price=?, price_small=?, price_large=?, icon=?, image_path=?,
      has_size=?, is_drink=?, track_stock=?, stock_qty=?, active=?
    WHERE id=?
  `).run(
    Number(merged.category_id), String(merged.name), Number(merged.base_price),
    merged.price_small == null || merged.price_small === '' ? null : Number(merged.price_small),
    merged.price_large == null || merged.price_large === '' ? null : Number(merged.price_large),
    merged.icon || '', merged.image_path || null, merged.has_size ? 1 : 0, merged.is_drink ? 1 : 0,
    merged.track_stock ? 1 : 0, Number(merged.stock_qty) || 0, merged.active ? 1 : 0, id
  );
  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(id));
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(id);
  res.json({ ok: true });
});

app.post('/api/products/:id/restock', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const qty = Number(req.body.qty);
  if (!Number.isFinite(qty)) return res.status(400).json({ error: 'qty must be a number' });
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });
  db.prepare('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?').run(qty, id);
  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(id));
});

// ---------- Image upload (base64 data URL -> file on disk) ----------
app.post('/api/uploads', requireAdmin, (req, res) => {
  const { dataUrl } = req.body;
  const match = /^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.+)$/.exec(dataUrl || '');
  if (!match) return res.status(400).json({ error: 'Expected a base64 image data URL' });
  const ext = match[2] === 'jpeg' ? 'jpg' : match[2];
  const filename = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), Buffer.from(match[3], 'base64'));
  res.json({ image_path: `/uploads/${filename}` });
});

// ---------- Addons (mutations — admin only; reads are public, defined above) ----------
app.post('/api/addons', requireAdmin, (req, res) => {
  const { name, price } = req.body;
  if (!name || price == null) return res.status(400).json({ error: 'name and price are required' });
  const info = db.prepare('INSERT INTO addons (name, price, active) VALUES (?, ?, 1)').run(String(name), Number(price));
  res.status(201).json(db.prepare('SELECT * FROM addons WHERE id = ?').get(info.lastInsertRowid));
});

app.put('/api/addons/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM addons WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Addon not found' });
  const merged = { ...existing, ...req.body };
  db.prepare('UPDATE addons SET name=?, price=?, active=? WHERE id=?')
    .run(String(merged.name), Number(merged.price), merged.active ? 1 : 0, id);
  res.json(db.prepare('SELECT * FROM addons WHERE id = ?').get(id));
});

app.delete('/api/addons/:id', requireAdmin, (req, res) => {
  db.prepare('UPDATE addons SET active = 0 WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ---------- Orders / Checkout (staff — unchanged behavior, now backed by createOrderRecord) ----------
const ORDER_TYPES = ['DINE_IN', 'TAKE_AWAY'];
const PAYMENT_METHODS = ['CASH', 'CARD'];

app.post('/api/orders', (req, res) => {
  const { items, order_type, payment_method, cash_received } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }
  const orderType = ORDER_TYPES.includes(order_type) ? order_type : 'TAKE_AWAY';
  const paymentMethod = PAYMENT_METHODS.includes(payment_method) ? payment_method : 'CASH';

  try {
    const order = createOrderRecord({
      items,
      orderType,
      paymentMethod,
      cashReceived: cash_received,
      cashierId: req.user.id,
      cashierName: req.user.name,
      source: 'STAFF',
      tableNumber: null,
      guestName: null,
      kitchenStatus: null,
      paymentRef: null,
      guestToken: null,
    });
    res.status(201).json(order);
  } catch (e) {
    res.status(e instanceof OrderError ? 400 : 500).json({ error: e.message });
  }
});

app.get('/api/orders', (req, res) => {
  const { from, to, cashier_id, source } = req.query;
  let sql = 'SELECT * FROM orders';
  const clauses = [];
  const params = [];
  if (from) { clauses.push('created_at >= ?'); params.push(from); }
  if (to) { clauses.push('created_at <= ?'); params.push(to); }
  if (source) { clauses.push('source = ?'); params.push(source); }
  if (req.user.role === 'CASHIER' && source !== 'CUSTOMER') {
    // Cashiers see only their own rung-up sales — except the live customer order
    // queue, which every logged-in staff member needs to see in full.
    clauses.push('cashier_id = ?');
    params.push(req.user.id);
  } else if (cashier_id) {
    clauses.push('cashier_id = ?');
    params.push(Number(cashier_id));
  }
  if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
  sql += ' ORDER BY created_at DESC LIMIT 200';
  const orders = db.prepare(sql).all(...params);

  // The live kitchen queue needs to show what's actually in each order.
  if (source === 'CUSTOMER' && orders.length) {
    const itemsStmt = db.prepare('SELECT name, qty FROM order_items WHERE order_id = ?');
    for (const o of orders) o.items = itemsStmt.all(o.id);
  }

  res.json(orders);
});

app.get('/api/orders/:id', (req, res) => {
  const detail = getOrderDetail(Number(req.params.id));
  if (!detail) return res.status(404).json({ error: 'Order not found' });
  if (req.user.role === 'CASHIER' && detail.cashier_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only view your own orders' });
  }
  res.json(detail);
});

app.patch('/api/orders/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!KITCHEN_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${KITCHEN_STATUSES.join(', ')}` });
  }
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.source !== 'CUSTOMER') return res.status(400).json({ error: 'Only customer orders have a kitchen status' });
  db.prepare('UPDATE orders SET kitchen_status = ? WHERE id = ?').run(status, id);
  res.json(getOrderDetail(id));
});

// ---------- Reports ----------
app.get('/api/reports/summary', requireAdmin, (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const orders = db.prepare("SELECT * FROM orders WHERE substr(created_at, 1, 10) = ?").all(date);
  const orderIds = orders.map((o) => o.id);
  const totals = orders.reduce((acc, o) => ({
    subtotal: acc.subtotal + o.subtotal,
    tax: acc.tax + o.tax,
    total: acc.total + o.total,
  }), { subtotal: 0, tax: 0, total: 0 });

  let topItems = [];
  if (orderIds.length) {
    const placeholders = orderIds.map(() => '?').join(',');
    topItems = db.prepare(`
      SELECT name, SUM(qty) AS qty, SUM(line_total) AS revenue
      FROM order_items WHERE order_id IN (${placeholders})
      GROUP BY name ORDER BY qty DESC LIMIT 5
    `).all(...orderIds);
  }

  res.json({ date, orderCount: orders.length, ...totals, topItems });
});

app.get('/api/reports/daily', requireAdmin, (req, res) => {
  const days = Math.min(Number(req.query.days) || 14, 90);
  const rows = db.prepare(`
    SELECT substr(created_at, 1, 10) AS date, COUNT(*) AS orderCount, SUM(total) AS total
    FROM orders
    GROUP BY date
    ORDER BY date DESC
    LIMIT ?
  `).all(days);
  res.json(rows.reverse());
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`CafePOS server running on http://localhost:${PORT}`);
});

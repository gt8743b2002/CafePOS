const db = require('./db');
const { hashPassword } = require('./auth');

function seedUsers() {
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (userCount > 0) return; // already seeded

  db.prepare('INSERT INTO users (username, password_hash, name, role, active, created_at) VALUES (?, ?, ?, ?, 1, ?)')
    .run('admin', hashPassword('admin123'), 'Admin', 'ADMIN', new Date().toISOString());

  console.log('Seeded default admin account (admin / admin123).');
}

function seed() {
  const catCount = db.prepare('SELECT COUNT(*) AS n FROM categories').get().n;
  if (catCount > 0) return; // already seeded

  const insertCat = db.prepare('INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)');
  insertCat.run(1, 'Coffee', 1);
  insertCat.run(2, 'Beverages', 2);
  insertCat.run(4, 'Pastries & Bakery', 3);
  insertCat.run(5, 'Breakfast', 4);
  insertCat.run(6, 'Lunch', 5);
  insertCat.run(3, 'Groceries', 6);

  const insertProduct = db.prepare(`
    INSERT INTO products (category_id, name, base_price, icon, has_size, is_drink, track_stock, stock_qty, active)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, 1)
  `);

  const coffee = [
    ['Espresso', 2.5, '☕', 20],
    ['Americano', 2.75, '☕', 20],
    ['Latte', 3.5, '☕', 20],
    ['Cappuccino', 3.5, '☕', 20],
    ['Mocha', 3.75, '☕', 15],
    ['Caramel Macchiato', 4.0, '☕', 15],
  ];
  for (const [name, price, icon, stock] of coffee) {
    insertProduct.run(1, name, price, icon, 1, 1, stock);
  }

  const drinks = [
    ['Milk Tea', 3.75, '🥤', 20],
    ['Taro Milk Tea', 4.0, '🥤', 20],
    ['Thai Tea', 3.75, '🥤', 20],
    ['Matcha Latte', 4.25, '🍵', 15],
    ['Mango Smoothie', 4.5, '🥭', 15],
    ['Lemonade', 3.0, '🍋', 20],
  ];
  for (const [name, price, icon, stock] of drinks) {
    insertProduct.run(2, name, price, icon, 1, 1, stock);
  }

  const grocery = [
    ['Bottled Water', 1.5, '💧', 40],
    ['Potato Chips', 2.0, '🍟', 30],
    ['Chocolate Bar', 2.5, '🍫', 30],
    ['Muffin', 3.0, '🧁', 20],
    ['Sandwich', 5.5, '🥪', 15],
    ['Bagel', 2.75, '🥯', 20],
  ];
  for (const [name, price, icon, stock] of grocery) {
    insertProduct.run(3, name, price, icon, 0, 0, stock);
  }

  const insertAddon = db.prepare('INSERT INTO addons (name, price, active) VALUES (?, ?, 1)');
  const addons = [
    ['Boba / Pearls', 0.75],
    ['Pudding', 0.75],
    ['Grass Jelly', 0.75],
    ['Aloe Vera', 0.75],
    ['Extra Espresso Shot', 0.5],
    ['Whipped Cream', 0.5],
  ];
  for (const [name, price] of addons) {
    insertAddon.run(name, price);
  }

  console.log('Database seeded with initial catalog.');
}

module.exports = seed;
module.exports.seedUsers = seedUsers;

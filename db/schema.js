const db = require('./index');

async function init() {
  if (db.type === 'pg') {
    await db.query(`CREATE TABLE IF NOT EXISTS branches (
      id SERIAL PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      hours TEXT,
      open BOOLEAN DEFAULT true,
      delivery_fee INTEGER DEFAULT 0,
      min_order INTEGER DEFAULT 0,
      allow_cod BOOLEAN DEFAULT true,
      allow_online BOOLEAN DEFAULT true
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      category_key TEXT,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      description TEXT,
      veg BOOLEAN DEFAULT true,
      available BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      image TEXT
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      public_code TEXT UNIQUE NOT NULL,
      branch_key TEXT NOT NULL,
      customer_phone TEXT,
      name TEXT,
      type TEXT,
      address TEXT,
      items_json TEXT NOT NULL,
      subtotal INTEGER NOT NULL,
      delivery_fee INTEGER DEFAULT 0,
      total INTEGER NOT NULL,
      payment_method TEXT,
      payment_status TEXT DEFAULT 'pending',
      order_status TEXT DEFAULT 'new',
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      webhook_processed BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      branch_key TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);
  } else {
    await db.exec(`CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      hours TEXT,
      open INTEGER DEFAULT 1,
      delivery_fee INTEGER DEFAULT 0,
      min_order INTEGER DEFAULT 0,
      allow_cod INTEGER DEFAULT 1,
      allow_online INTEGER DEFAULT 1
    )`);
    await db.exec(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    )`);
    await db.exec(`CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      category_key TEXT,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      description TEXT,
      veg INTEGER DEFAULT 1,
      available INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      image TEXT
    )`);
    await db.exec(`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      public_code TEXT UNIQUE NOT NULL,
      branch_key TEXT NOT NULL,
      customer_phone TEXT,
      name TEXT,
      type TEXT,
      address TEXT,
      items_json TEXT NOT NULL,
      subtotal INTEGER NOT NULL,
      delivery_fee INTEGER DEFAULT 0,
      total INTEGER NOT NULL,
      payment_method TEXT,
      payment_status TEXT DEFAULT 'pending',
      order_status TEXT DEFAULT 'new',
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      webhook_processed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.exec(`CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      branch_key TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.exec(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);
  }
}

module.exports = { init };

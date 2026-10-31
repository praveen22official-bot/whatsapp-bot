const fs = require('fs');
const path = require('path');
const db = require('./index');

async function seed() {
  const menuPath = path.join(__dirname, '..', 'menu.json');
  const menu = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
  
  // Seed branches
  for (const b of menu.branches) {
    if (db.type === 'pg') {
      await db.query(`INSERT INTO branches (key, name, address, phone, hours) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (key) DO UPDATE SET name=$2, address=$3, phone=$4, hours=$5`,
        [b.key, b.name, b.address, b.phone, b.hours]);
    } else {
      await db.run(`INSERT OR REPLACE INTO branches (key, name, address, phone, hours) VALUES (?,?,?,?,?)`,
        [b.key, b.name, b.address, b.phone, b.hours]);
    }
  }
  
  // Seed categories and items
  for (let i = 0; i < menu.categories.length; i++) {
    const c = menu.categories[i];
    if (db.type === 'pg') {
      await db.query(`INSERT INTO categories (key, name, sort_order) VALUES ($1,$2,$3) ON CONFLICT (key) DO UPDATE SET name=$2, sort_order=$3`,
        [c.id, c.name, i]);
    } else {
      await db.run(`INSERT OR REPLACE INTO categories (key, name, sort_order) VALUES (?,?,?)`,
        [c.id, c.name, i]);
    }
    for (let j = 0; j < c.items.length; j++) {
      const it = c.items[j];
      if (db.type === 'pg') {
        await db.query(`INSERT INTO items (key, category_key, name, price, description, veg, available, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (key) DO UPDATE SET category_key=$2, name=$3, price=$4, description=$5, sort_order=$8`,
          [it.id, c.id, it.name, it.price, it.desc || '', true, true, j]);
      } else {
        await db.run(`INSERT OR REPLACE INTO items (key, category_key, name, price, description, veg, available, sort_order) VALUES (?,?,?,?,?,?,?,?)`,
          [it.id, c.id, it.name, it.price, it.desc || '', 1, 1, j]);
      }
    }
  }
  console.log('Seeded from menu.json');
}

module.exports = { seed };

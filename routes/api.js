const express = require('express');
const db = require('../db/index');
const { apiLimiter } = require('../middleware/rateLimit');
const router = express.Router();

router.use(apiLimiter);

router.get('/menu', async (req, res) => {
  try {
    let branches, categories, items;
    if (db.type === 'pg') {
      const b = await db.query('SELECT * FROM branches ORDER BY id');
      const c = await db.query('SELECT * FROM categories ORDER BY sort_order');
      const i = await db.query('SELECT * FROM items WHERE available = true ORDER BY sort_order');
      branches = b.rows; categories = c.rows; items = i.rows;
    } else {
      branches = await db.all('SELECT * FROM branches ORDER BY id');
      categories = await db.all('SELECT * FROM categories ORDER BY sort_order');
      items = await db.all('SELECT * FROM items WHERE available = 1 ORDER BY sort_order');
    }
    // group
    const cats = categories.map(cat => ({
      id: cat.key,
      name: cat.name,
      items: items.filter(it => it.category_key === cat.key).map(it => ({
        id: it.key, name: it.name, price: it.price, desc: it.description, veg: !!it.veg
      }))
    }));
    res.json({ restaurant: { name: 'Hotel Aalayaa', tagline: 'Pure Vegetarian Restaurant' }, branches, categories: cats });
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

router.get('/branches', async (req, res) => {
  try {
    let rows;
    if (db.type === 'pg') rows = (await db.query('SELECT * FROM branches ORDER BY id')).rows;
    else rows = await db.all('SELECT * FROM branches ORDER BY id');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

module.exports = router;

const express = require('express');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../utils/token');
const db = require('../db/index');
const router = express.Router();

// Serve order page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'order.html'));
});

router.get('/meta', async (req, res) => {
  const { branch, t } = req.query;
  let tokenData = null;
  if (t) tokenData = verifyToken(t);
  try {
    let branches, items, cats;
    if (db.type === 'pg') {
      const b = await db.query('SELECT * FROM branches WHERE key=$1', [branch]);
      branches = b.rows;
      const c = await db.query('SELECT * FROM categories ORDER BY sort_order');
      const i = await db.query('SELECT * FROM items WHERE available = true ORDER BY sort_order');
      cats = c.rows; items = i.rows;
    } else {
      branches = await db.all('SELECT * FROM branches WHERE key=?', [branch]);
      const c = await db.all('SELECT * FROM categories ORDER BY sort_order');
      const i = await db.all('SELECT * FROM items WHERE available = 1 ORDER BY sort_order');
      cats = c.rows; items = i.rows;
    }
    const categories = cats.map(cat => ({
      id: cat.key, name: cat.name,
      items: items.filter(it => it.category_key === cat.key).map(it => ({ id: it.key, name: it.name, price: it.price, desc: it.description, veg: !!it.veg }))
    }));
    res.json({ branch: branches[0] || null, categories, token: tokenData, requirePhone: !tokenData });
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

module.exports = router;

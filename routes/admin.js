const express = require('express');
const bcrypt = require('bcryptjs');
const { loginLimiter } = require('../middleware/rateLimit');
const db = require('../db/index');
const router = express.Router();

router.get('/login', (req, res) => {
  res.sendFile(require('path').join(__dirname, '..', 'admin', 'login.html'));
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  try {
    let admin;
    if (db.type === 'pg') {
      admin = (await db.query('SELECT * FROM admins WHERE email=$1', [email])).rows[0];
    } else {
      admin = await db.get('SELECT * FROM admins WHERE email=?', [email]);
    }
    if (!admin) return res.status(401).send('Invalid');
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) return res.status(401).send('Invalid');
    req.session.admin = { id: admin.id, email: admin.email, role: admin.role, branch_key: admin.branch_key };
    res.redirect('/admin');
  } catch (e) {
    res.status(500).send('Error');
  }
});

function requireAuth(req, res, next) {
  if (!req.session.admin) return res.redirect('/admin/login');
  next();
}

router.get('/', requireAuth, (req, res) => {
  res.sendFile(require('path').join(__dirname, '..', 'admin', 'index.html'));
});

router.get('/api/me', requireAuth, (req, res) => {
  res.json(req.session.admin);
});

router.get('/api/orders', requireAuth, async (req, res) => {
  try {
    const { admin } = req.session;
    let rows;
    if (admin.role === 'branch_staff' && admin.branch_key) {
      if (db.type === 'pg') {
        rows = (await db.query("SELECT * FROM orders WHERE branch_key=$1 ORDER BY created_at DESC LIMIT 100", [admin.branch_key])).rows;
      } else {
        rows = await db.all("SELECT * FROM orders WHERE branch_key=? ORDER BY created_at DESC LIMIT 100", [admin.branch_key]);
      }
    } else {
      if (db.type === 'pg') {
        rows = (await db.query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 200")).rows;
      } else {
        rows = await db.all("SELECT * FROM orders ORDER BY created_at DESC LIMIT 200");
      }
    }
    res.json(rows.map(r => ({ ...r, items: JSON.parse(r.items_json || '[]') })));
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

router.post('/api/orders/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body;
  const allowed = ['new','preparing','ready','out_for_delivery','completed','cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'invalid' });
  try {
    if (db.type === 'pg') {
      await db.query("UPDATE orders SET order_status=$1, updated_at=NOW() WHERE id=$2", [status, req.params.id]);
    } else {
      await db.run("UPDATE orders SET order_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", [status, req.params.id]);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

module.exports = router;

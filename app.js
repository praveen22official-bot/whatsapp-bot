require('dotenv').config({ path: require('path').join(__dirname, 'bot', '.env') });
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const csrf = require('csurf');
const { init } = require('./db/schema');
const { seed } = require('./db/seed');
const db = require('./db/index');
const bcrypt = require('bcryptjs');

const app = express();

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : false, credentials: true }));
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.APP_SECRET || 'session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 24*60*60*1000 }
}));

app.use('/site', express.static(path.join(__dirname, 'site')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/admin/static', express.static(path.join(__dirname, 'admin', 'static')));

const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const webhookRoutes = require('./routes/webhook');
const orderRoutes = require('./routes/order');

app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/webhook', webhookRoutes);
app.use('/order', orderRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

async function bootstrap() {
  try {
    await init();
    await seed();
    // Create first owner if env vars set
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      const email = process.env.ADMIN_EMAIL;
      const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      if (db.type === 'pg') {
        await db.query(`INSERT INTO admins (email, password_hash, role) VALUES ($1,$2,'owner') ON CONFLICT (email) DO NOTHING`, [email, hash]);
      } else {
        await db.run(`INSERT OR IGNORE INTO admins (email, password_hash, role) VALUES (?,?, 'owner')`, [email, hash]);
      }
    }
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log('App listening on', port));
  } catch (e) {
    console.error('Bootstrap error', e);
    process.exit(1);
  }
}

bootstrap();
module.exports = app;

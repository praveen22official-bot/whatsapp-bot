// Hotel Aalayaa WhatsApp ordering bot (WhatsApp Cloud API, Node 20+).
// Run:  node --env-file=.env server.js
const express = require('express');
const crypto = require('crypto');
const menu = require('../menu.json');

const {
  WA_TOKEN,
  WA_PHONE_ID,
  VERIFY_TOKEN,
  APP_SECRET,
  STAFF_PARUTHIPPATTU,
  STAFF_JAKCITY,
  PORT = 3000,
} = process.env;

const API = `https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`;
const STAFF = { paruthippattu: STAFF_PARUTHIPPATTU, jakcity: STAFF_JAKCITY };

const items = {};
menu.categories.forEach((c) => c.items.forEach((i) => (items[i.id] = i)));
const branchByKey = Object.fromEntries(menu.branches.map((b) => [b.key, b]));
const RESTART = /^\s*(hi+|hello+|hey+|hai|start|menu|restart|reset|home|vanakkam|namaste)\s*[!.?]*\s*$/i;
const CANCEL  = /^\s*(cancel|stop|exit|quit)\s*[!.?]*\s*$/i;

// ---------- sending ----------
async function send(payload) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
  });
  if (!res.ok) console.error('WhatsApp send failed', res.status, await res.text());
}
const text = (to, body) => send({ to, type: 'text', text: { body, preview_url: false } });
const buttons = (to, body, btns) =>
  send({
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      action: { buttons: btns.map(([id, title]) => ({ type: 'reply', reply: { id, title: title.slice(0, 20) } })) },
    },
  });
const list = (to, body, button, rows, title) =>
  send({
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: body },
      action: {
        button: button.slice(0, 20),
        sections: [
          {
            title: title.slice(0, 24),
            rows: rows.slice(0, 10).map((r) => ({
              id: r.id,
              title: r.title.slice(0, 24),
              description: (r.description || '').slice(0, 72),
            })),
          },
        ],
      },
    },
  });

// ---------- sessions (in memory; use Redis if you run several instances) ----------
const sessions = new Map();
const blank = () => ({ step: 'idle', branch: null, cart: {}, mode: null, address: '', name: '', webOrder: null });
const session = (id) => {
  if (!sessions.has(id)) sessions.set(id, blank());
  return sessions.get(id);
};
const reset = (id) => sessions.set(id, blank());

const rupee = (n) => `₹${n}`;
function cartLines(s) {
  return Object.entries(s.cart).map(([id, q]) => ({ ...items[id], qty: q, line: items[id].price * q }));
}
const cartTotal = (s) => cartLines(s).reduce((t, l) => t + l.line, 0);

// ---------- screens ----------
function welcome(to) {
  return buttons(
    to,
    `Welcome to *${menu.restaurant.name}* – ${menu.restaurant.tagline}.\nHow can we help you today?`,
    [['go_order', 'Order food'], ['go_menu', 'View menu'], ['go_info', 'Branches & timings']]
  );
}
function askBranch(to) {
  return list(
    to,
    'Which branch should prepare your order?',
    'Choose branch',
    menu.branches.map((b) => ({ id: `branch:${b.key}`, title: b.name, description: b.address })),
    'Branches'
  );
}
function showCategories(to) {
  return list(
    to,
    'What would you like to eat? Pick a section.',
    'See sections',
    menu.categories.map((c) => ({ id: `cat:${c.id}`, title: c.name, description: `${c.items.length} items` })),
    'Menu'
  );
}
function showItems(to, catId) {
  const cat = menu.categories.find((c) => c.id === catId);
  if (!cat) return showCategories(to);
  return list(
    to,
    `*${cat.name}*\nTap a dish to add one to your order. Tap it again to add another.`,
    'See dishes',
    cat.items.map((i) => ({ id: `item:${i.id}`, title: i.name, description: `${rupee(i.price)} · ${i.desc}` })),
    cat.name
  );
}
function fullMenuText() {
  const chunks = [];
  for (const c of menu.categories) {
    chunks.push(`*${c.name}*\n` + c.items.map((i) => `• ${i.name} – ${rupee(i.price)}`).join('\n'));
  }
  return chunks.join('\n\n');
}
function infoText() {
  return menu.branches
    .map((b) => `*${b.name}*\n${b.address}\n📞 ${b.phone}\n🕒 ${b.hours}`)
    .join('\n\n');
}
function summary(s) {
  const lines = cartLines(s).map((l) => `${l.qty} x ${l.name} = ${rupee(l.line)}`).join('\n');
  return (
    `Branch: ${branchByKey[s.branch].name}\nType: ${s.mode}\nName: ${s.name}\n` +
    (s.mode === 'Delivery' ? `Address: ${s.address}\n` : '') +
    `\n${lines}\n\n*Total: ${rupee(cartTotal(s))}*`
  );
}

// ---------- order hand-off ----------
async function placeOrder(from, s, body, branchKey) {
  const ref = `AAL-${Date.now().toString(36).toUpperCase().slice(-5)}`;
  const staff = STAFF[branchKey];
  if (staff) await text(staff, `🧾 *New order ${ref}*\nCustomer: +${from}\n\n${body}`);
  else console.warn('No staff number set for branch', branchKey);
  await text(
    from,
    `Thank you! Your order *${ref}* is placed. ${branchByKey[branchKey].name} branch will confirm it shortly.\nQuestions? Call ${branchByKey[branchKey].phone}.`
  );
  reset(from);
}

function branchFromWebText(t) {
  const m = /Branch:\s*(.+)/i.exec(t);
  const name = m ? m[1].trim().toLowerCase() : '';
  return menu.branches.find((b) => b.name.toLowerCase() === name)?.key || menu.branches[0].key;
}

// ---------- routing ----------
async function handle(from, msg) {
  const s = session(from);
  let id = null;
  let body = '';
  if (msg.type === 'interactive') {
    id = msg.interactive.button_reply?.id || msg.interactive.list_reply?.id;
  } else if (msg.type === 'text') {
    body = msg.text.body.trim();
  } else {
    return text(from, 'Sorry, I can only read text and button taps. Send "hi" to start.');
  }

  // Global restart/cancel (works at any step)
  if (!id && body && CANCEL.test(body)) {
    reset(from);
    return text(from, 'Order cancelled. Send "hi" whenever you want to order again.');
  }
  if (!id && body && RESTART.test(body)) {
    reset(from);
    return welcome(from);
  }

  // Order sent from the website
  if (body && /via website/i.test(body)) {
    s.webOrder = body;
    return buttons(from, `We received your website order:\n\n${body}\n\nShall we place it?`, [
      ['web_confirm', 'Confirm order'],
      ['cancel', 'Cancel'],
    ]);
  }

  // Free text answers while a step is waiting
  if (!id && s.step === 'address') {
    s.address = body;
    s.step = 'name';
    return text(from, 'Thanks. What name should we put on the order?');
  }
  if (!id && s.step === 'name') {
    s.name = body;
    s.step = 'confirm';
    return buttons(from, `Please check your order:\n\n${summary(s)}`, [
      ['confirm', 'Confirm order'],
      ['cancel', 'Cancel'],
    ]);
  }

  if (!id) return welcome(from);

  if (id === 'go_order') return askBranch(from);
  if (id === 'go_menu') {
    await text(from, fullMenuText());
    return buttons(from, 'Ready to order?', [['go_order', 'Order food']]);
  }
  if (id === 'go_info') return text(from, infoText());

  if (id.startsWith('branch:')) {
    s.branch = id.slice(7);
    return showCategories(from);
  }
  if (id.startsWith('cat:')) return showItems(from, id.slice(4));
  if (id.startsWith('item:')) {
    const itemId = id.slice(5);
    if (!items[itemId]) return showCategories(from);
    s.cart[itemId] = (s.cart[itemId] || 0) + 1;
    return buttons(
      from,
      `Added *${items[itemId].name}*.\nOrder so far: ${rupee(cartTotal(s))}`,
      [['more', 'Add more'], ['checkout', 'Checkout'], ['clear', 'Clear order']]
    );
  }
  if (id === 'more') return showCategories(from);
  if (id === 'clear') {
    s.cart = {};
    return showCategories(from);
  }
  if (id === 'checkout') {
    if (!Object.keys(s.cart).length) return showCategories(from);
    if (!s.branch) return askBranch(from);
    return buttons(from, `Total so far: ${rupee(cartTotal(s))}\nHow would you like to receive it?`, [
      ['mode:Delivery', 'Delivery'],
      ['mode:Pickup', 'Pickup'],
    ]);
  }
  if (id.startsWith('mode:')) {
    s.mode = id.slice(5);
    if (s.mode === 'Delivery') {
      s.step = 'address';
      return text(from, 'Please type your full delivery address with a landmark.');
    }
    s.step = 'name';
    return text(from, 'What name should we put on the order?');
  }
  if (id === 'confirm') {
    if (!Object.keys(s.cart).length || !s.branch) return welcome(from);
    return placeOrder(from, s, summary(s), s.branch);
  }
  if (id === 'web_confirm') {
    if (!s.webOrder) return welcome(from);
    return placeOrder(from, s, s.webOrder, branchFromWebText(s.webOrder));
  }
  if (id === 'cancel') {
    reset(from);
    return text(from, 'Order cancelled. Send "hi" whenever you want to order again.');
  }
  return welcome(from);
}

// ---------- web server ----------
const app = express();
app.use(express.json({ verify: (req, _res, buf) => (req.rawBody = buf) }));

app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
    return res.status(200).send(req.query['hub.challenge']);
  }
  res.sendStatus(403);
});

app.post('/webhook', (req, res) => {
  if (APP_SECRET) {
    const sig = req.get('x-hub-signature-256') || '';
    const expected = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(req.rawBody || '').digest('hex');
    const ok = sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!ok) return res.sendStatus(401);
  }
  res.sendStatus(200); // answer fast, work after
  const value = req.body?.entry?.[0]?.changes?.[0]?.value;
  for (const msg of value?.messages || []) {
    handle(msg.from, msg).catch((e) => console.error('handler error', e));
  }
});

app.get('/', (_req, res) => res.send('Hotel Aalayaa bot is running'));
app.listen(PORT, () => console.log(`Bot listening on ${PORT}`));

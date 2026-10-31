const express = require('express');
const crypto = require('crypto');
const { verifyWebhookSignature } = require('../utils/payment');
const db = require('../db/index');
const router = express.Router();

// Meta WhatsApp webhook (existing bot webhook)
router.get('/', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
    return res.status(200).send(req.query['hub.challenge']);
  }
  res.sendStatus(403);
});

router.post('/', async (req, res) => {
  if (process.env.APP_SECRET) {
    const sig = req.get('x-hub-signature-256') || '';
    const expected = 'sha256=' + crypto.createHmac('sha256', process.env.APP_SECRET).update(req.rawBody || '').digest('hex');
    const ok = sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!ok) return res.sendStatus(401);
  }
  res.sendStatus(200);
  try {
    const { handle } = require('../bot/server');
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    for (const msg of value?.messages || []) {
      handle(msg.from, msg).catch((e) => console.error('handler error', e));
    }
  } catch (e) {
    console.error(e);
  }
});

// Razorpay webhook
router.post('/razorpay', async (req, res) => {
  const signature = req.get('x-razorpay-signature') || '';
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (verifyWebhookSignature(req.rawBody.toString(), signature, secret)) {
    const event = req.body;
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      // Find order and mark paid idempotently
      try {
        let order;
        if (db.type === 'pg') {
          order = (await db.query('SELECT * FROM orders WHERE razorpay_order_id=$1', [orderId])).rows[0];
        } else {
          order = await db.get('SELECT * FROM orders WHERE razorpay_order_id=?', [orderId]);
        }
        if (order && (!order.webhook_processed || order.webhook_processed === 0) && order.payment_status !== 'paid') {
          if (db.type === 'pg') {
            await db.query(`UPDATE orders SET payment_status='paid', razorpay_payment_id=$1, webhook_processed=true, updated_at=NOW() WHERE id=$2`,
              [payment.id, order.id]);
          } else {
            await db.run(`UPDATE orders SET payment_status='paid', razorpay_payment_id=?, webhook_processed=1, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
              [payment.id, order.id]);
          }
          // Notify staff/customer would go here
        }
      } catch (e) {
        console.error(e);
      }
    }
  }
  res.sendStatus(200);
});

module.exports = router;

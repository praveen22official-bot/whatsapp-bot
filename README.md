# Hotel Aalayaa: website and WhatsApp ordering bot

```
menu.json                 one menu for both the website and the bot
site/index.template.html  website source (edit this)
site/index.html           built website (upload this to your hosting)
bot/server.js             WhatsApp bot (Node 20.6 or newer)
```

## 1. Replace the sample menu first

Every dish and price in `menu.json` is a sample. Edit it with your real items and prices.
Rules: max 10 dishes per category (WhatsApp list limit), every `id` unique.

Rebuild the website after any menu change:

```
python3 - <<'EOF'
import json
t = open('site/index.template.html', encoding='utf-8').read()
m = json.load(open('menu.json', encoding='utf-8'))
open('site/index.html', 'w', encoding='utf-8').write(t.replace('/*MENU_JSON*/{}', json.dumps(m, ensure_ascii=False)))
EOF
```

Also set `WHATSAPP_NUMBER` near the bottom of `site/index.template.html` to the number that runs the bot.

## 2. Website

`site/index.html` is one self-contained file. Upload it to any static host
(Netlify, Cloudflare Pages, GitHub Pages, or your domain's hosting) and point your domain at it.

How ordering works: a customer picks dishes, chooses branch and Delivery or Pickup, and taps
"Send order on WhatsApp". WhatsApp opens with the full order typed in. The bot recognises
that message (it contains "via website"), shows it back with Confirm / Cancel buttons, and on
Confirm sends it to the branch's staff number.

## 3. WhatsApp bot

1. Go to developers.facebook.com, create an app (type Business) and add the WhatsApp product.
2. Add your restaurant number. A number used with the Cloud API cannot also be used in the normal
   WhatsApp app, so use a new SIM or a number you are happy to dedicate to the bot.
3. Create a system user with a permanent token (permissions: whatsapp_business_messaging,
   whatsapp_business_management). Note the Phone Number ID and the App Secret.
4. In `bot/`: `cp .env.example .env`, fill the values, then:
   ```
   npm install
   npm start
   ```
5. Host it on a public HTTPS URL (Render, Railway, a VPS with Caddy or nginx). For local testing use
   `ngrok http 3000`.
6. In Meta's WhatsApp, Configuration, set the webhook to `https://YOUR-URL/webhook`, verify token =
   your `VERIFY_TOKEN`, and subscribe to the `messages` field.

Customer flow: "hi" -> Order food / View menu / Branches -> branch -> sections -> dishes ->
Checkout -> Delivery or Pickup -> address and name -> Confirm. Staff get the order as a WhatsApp message.

## Things to know

- Staff alerts: WhatsApp only lets a business message someone freely within 24 hours of their last
  message to it. Have each branch phone send "hi" to the bot number once a day, or set up an
  approved message template for order alerts (Meta Business Manager, Message templates).
  Alternatively change `placeOrder` in `server.js` to post orders to a Telegram group or email.
- Sessions are kept in memory, so a restart clears half-finished carts. Use Redis if that matters.
- No online payment yet. Customers pay at the restaurant or on delivery.
- The Jak City branch hours are not set because they were not provided. Edit them in `menu.json`.

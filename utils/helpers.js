const crypto = require('crypto');

function genOrderCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += chars[crypto.randomInt(0, chars.length)];
  return 'AAL-' + s;
}

function maskPhone(p) {
  if (!p) return '';
  const s = String(p);
  if (s.length <= 4) return '****';
  return '****' + s.slice(-4);
}

module.exports = { genOrderCode, maskPhone };

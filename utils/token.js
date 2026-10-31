const crypto = require('crypto');

const TOKEN_SECRET = process.env.TOKEN_SECRET || process.env.APP_SECRET || 'change-me';

function signToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  return data + '.' + sig;
}

function verifyToken(token) {
  try {
    const [data, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
    if (sig.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function signOrderLink(phone, branch) {
  const exp = Date.now() + 2 * 60 * 60 * 1000;
  return signToken({ phone, branch, exp, type: 'order' });
}

module.exports = { signToken, verifyToken, signOrderLink };

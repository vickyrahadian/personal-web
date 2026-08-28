const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { quote } = require('../../shared/csv');

function createContactRouter({ dataDir, captchaSecret = crypto.randomBytes(32).toString('hex') }) {
  const router = express.Router();
  const csvPath = path.join(dataDir, 'contacts.csv');
  const header = '"timestamp","name","email","message"';
  const usedCaptchaTokens = new Set();
  const requestsByIp = new Map();
  const CAPTCHA_TTL_MS = 10 * 60 * 1000;
  const RATE_WINDOW_MS = 15 * 60 * 1000;
  const RATE_LIMIT = 5;

  const getIp = req => req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const sign = value => crypto.createHmac('sha256', captchaSecret).update(value).digest('base64url');
  const makeCaptcha = () => {
    const a = crypto.randomInt(1, 10);
    const b = crypto.randomInt(1, 10);
    const payload = `${Date.now()}.${a + b}`;
    return {
      question: `What is ${a} + ${b}?`,
      token: `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`
    };
  };
  const verifyCaptcha = (token, answer) => {
    if (typeof token !== 'string' || typeof answer !== 'string' || token.length > 512) return false;
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) return false;
    let payload;
    try { payload = Buffer.from(encodedPayload, 'base64url').toString('utf8'); } catch { return false; }
    const expectedSignature = sign(payload);
    if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return false;
    const [issuedAt, expectedAnswer] = payload.split('.');
    if (!/^\d+$/.test(issuedAt) || Date.now() - Number(issuedAt) > CAPTCHA_TTL_MS || Date.now() - Number(issuedAt) < 0) return false;
    if (usedCaptchaTokens.has(token) || !/^\d+$/.test(expectedAnswer) || !/^\d+$/.test(answer.trim())) return false;
    usedCaptchaTokens.add(token);
    return Number(answer.trim()) === Number(expectedAnswer);
  };
  const allowedByRateLimit = ip => {
    const now = Date.now();
    const recent = (requestsByIp.get(ip) || []).filter(timestamp => now - timestamp < RATE_WINDOW_MS);
    if (recent.length >= RATE_LIMIT) { requestsByIp.set(ip, recent); return false; }
    recent.push(now);
    requestsByIp.set(ip, recent);
    return true;
  };

  router.get('/challenge', (req, res) => res.json(makeCaptcha()));

  router.post('/', (req, res) => {
    const { name, email, message, captchaToken, captchaAnswer, website } = req.body || {};
    if (website) return res.status(400).json({ error: 'Invalid submission.' });
    if (!allowedByRateLimit(getIp(req))) return res.status(429).json({ error: 'Too many messages. Please try again later.' });
    if (!name || !email || !message) return res.status(400).json({ error: 'All fields required' });
    if (String(name).length > 100 || String(email).length > 254 || String(message).length > 3000) return res.status(400).json({ error: 'Input is too long.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });
    if (!verifyCaptcha(captchaToken, captchaAnswer)) return res.status(400).json({ error: 'Captcha answer is invalid or expired.' });
    fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(csvPath)) fs.writeFileSync(csvPath, `${header}\n`);
    fs.appendFileSync(csvPath, [new Date().toISOString(), name, email, message].map(quote).join(',') + '\n');
    res.json({ success: true });
  });

  return router;
}

module.exports = createContactRouter;

const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app = express();
const PORT       = process.env.PORT || 3000;
const ADMIN_PW   = process.env.ADMIN_PASSWORD || 'admin2026';
const FRONTEND   = path.join(__dirname, '../frontend');
const DATA_DIR   = path.join(__dirname, '../data');
const CSV        = path.join(DATA_DIR, 'contacts.csv');
const GALLERY    = path.join(FRONTEND, 'images/galery');
const IMG_EXTS   = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

app.use(express.json());
app.use(express.static(FRONTEND));

// ── Gallery images ────────────────────────────────────
app.get('/api/gallery', (req, res) => {
  try {
    const files = fs.readdirSync(GALLERY)
      .filter(f => IMG_EXTS.has(path.extname(f).toLowerCase()))
      .map(f => `images/galery/${f}`);
    res.json(files);
  } catch {
    res.json([]);
  }
});

// ── Save contact message ──────────────────────────────
app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message)
    return res.status(400).json({ error: 'All fields required' });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Invalid email' });

  const q   = s => `"${String(s).replace(/"/g, '""').replace(/\n/g, ' ')}"`;
  const row = `${q(new Date().toISOString())},${q(name)},${q(email)},${q(message)}\n`;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CSV)) fs.writeFileSync(CSV, '"timestamp","name","email","message"\n');
  fs.appendFileSync(CSV, row);

  res.json({ success: true });
});

// ── Get all messages (admin) ──────────────────────────
app.get('/api/messages', (req, res) => {
  if (req.headers['x-admin-password'] !== ADMIN_PW)
    return res.status(401).json({ error: 'Unauthorized' });

  if (!fs.existsSync(CSV)) return res.json([]);

  const parseRow = line => {
    const vals = []; let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (line[i] === ',' && !inQ) {
        vals.push(cur); cur = '';
      } else cur += line[i];
    }
    vals.push(cur);
    const [timestamp, name, email, message] = vals;
    return { timestamp, name, email, message };
  };

  const rows = fs.readFileSync(CSV, 'utf8').trim().split('\n')
    .slice(1).filter(Boolean).map(parseRow).reverse();

  res.json(rows);
});

// ── Delete a message (admin) ──────────────────────────
app.delete('/api/messages/:index', (req, res) => {
  if (req.headers['x-admin-password'] !== ADMIN_PW)
    return res.status(401).json({ error: 'Unauthorized' });

  if (!fs.existsSync(CSV))
    return res.status(404).json({ error: 'No messages' });

  const lines = fs.readFileSync(CSV, 'utf8').trim().split('\n');
  const data  = lines.slice(1).filter(Boolean);
  const idx   = data.length - 1 - parseInt(req.params.index);

  if (idx < 0 || idx >= data.length)
    return res.status(400).json({ error: 'Invalid index' });

  data.splice(idx, 1);
  fs.writeFileSync(CSV, [lines[0], ...data].join('\n') + '\n');
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Running → http://localhost:${PORT}`));

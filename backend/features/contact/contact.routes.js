const express = require('express');
const fs = require('fs');
const path = require('path');
const { quote } = require('../../shared/csv');

function createContactRouter({ dataDir }) {
  const router = express.Router();
  const csvPath = path.join(dataDir, 'contacts.csv');
  const header = '"timestamp","name","email","message"';

  router.post('/', (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'All fields required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });
    fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(csvPath)) fs.writeFileSync(csvPath, `${header}\n`);
    fs.appendFileSync(csvPath, [new Date().toISOString(), name, email, message].map(quote).join(',') + '\n');
    res.json({ success: true });
  });

  return router;
}

module.exports = createContactRouter;

const express = require('express');
const fs = require('fs');
const path = require('path');
const { read, write, quote } = require('../../shared/csv');

function createMessagesRouter({ dataDir, isAdmin }) {
  const router = express.Router();
  const csvPath = path.join(dataDir, 'contacts.csv');
  const header = '"timestamp","name","email","message"';
  const readMessages = () => read(csvPath, ([timestamp, name, email, message]) => ({ timestamp, name, email, message })).reverse();

  router.get('/', (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    res.json(readMessages());
  });

  router.delete('/:index', (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    const rows = readMessages();
    const index = Number.parseInt(req.params.index, 10);
    if (!Number.isInteger(index) || index < 0 || index >= rows.length) return res.status(400).json({ error: 'Invalid index' });
    rows.splice(index, 1);
    write(csvPath, header, rows.reverse().map(message => [message.timestamp, message.name, message.email, message.message]));
    res.json({ success: true });
  });

  return router;
}

module.exports = createMessagesRouter;

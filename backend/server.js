const express = require('express');
const path = require('path');

const createGalleryRouter = require('./features/gallery/gallery.routes');
const createMessagesRouter = require('./features/messages/messages.routes');
const createContactRouter = require('./features/contact/contact.routes');
const createAnalyticsRouter = require('./features/analytics/analytics.routes');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2026';
const CONTACT_CAPTCHA_SECRET = process.env.CONTACT_CAPTCHA_SECRET;
const FRONTEND_DIR = path.join(__dirname, '../frontend');
const DATA_DIR = path.join(__dirname, '../data');
const GALLERY_DIR = path.join(FRONTEND_DIR, 'images/galery');
const CONTACTS_PATH = path.join(DATA_DIR, 'contacts.csv');

const isAdmin = req => req.headers['x-admin-password'] === ADMIN_PASSWORD;

app.use(express.json({ limit: '15mb' }));
app.use(express.static(FRONTEND_DIR));

app.use('/api/gallery', createGalleryRouter({ dataDir: DATA_DIR, galleryDir: GALLERY_DIR, isAdmin }));
app.use('/api/messages', createMessagesRouter({ dataDir: DATA_DIR, isAdmin }));
app.use('/api/contact', createContactRouter({ dataDir: DATA_DIR, captchaSecret: CONTACT_CAPTCHA_SECRET }));
app.use('/api/analytics', createAnalyticsRouter({ dataDir: DATA_DIR, contactsPath: CONTACTS_PATH, analyticsSalt: process.env.ANALYTICS_SALT || 'change-this-analytics-salt', isAdmin }));

app.use((error, req, res, next) => {
  console.error('[server-error]', error);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Running → http://localhost:${PORT}`));
}

module.exports = app;

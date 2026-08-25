const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { read, write } = require('../../shared/csv');

const router = express.Router();
const IMG_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const HEADER = '"id","filename","title","description","alt_text","sort_order","is_active","created_at"';

function createGalleryRouter({ dataDir, galleryDir, isAdmin, adminPassword }) {
  const photoCsv = path.join(dataDir, 'photo.csv');
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!IMG_EXTS.has(ext)) {
        const error = new Error(`Unsupported file extension: ${ext || 'none'}. Allowed formats: JPG, JPEG, PNG, WEBP, GIF.`);
        error.code = 'INVALID_FILE_TYPE';
        return cb(error);
      }
      if (!file.mimetype.startsWith('image/')) {
        const error = new Error(`Invalid MIME type: ${file.mimetype || 'unknown'}.`);
        error.code = 'INVALID_MIME_TYPE';
        return cb(error);
      }
      cb(null, true);
    }
  });

  const readPhotos = () => read(photoCsv, ([id, filename, title, description, alt_text, sort_order, is_active, created_at]) => ({
    id, filename, title, description, alt_text,
    sort_order: Number(sort_order) || 0,
    is_active: is_active === '1',
    created_at
  }));

  const writePhotos = photos => write(photoCsv, HEADER, photos.map(photo => [
    photo.id, photo.filename, photo.title, photo.description, photo.alt_text,
    photo.sort_order, photo.is_active ? 1 : 0, photo.created_at
  ]));

  const initialize = () => {
    if (fs.existsSync(photoCsv)) return;
    fs.mkdirSync(galleryDir, { recursive: true });
    const now = new Date().toISOString();
    const photos = fs.readdirSync(galleryDir)
      .filter(file => IMG_EXTS.has(path.extname(file).toLowerCase()))
      .sort((a, b) => a.localeCompare(b))
      .map((filename, index) => {
        const title = path.basename(filename, path.extname(filename));
        return { id: crypto.randomUUID(), filename, title, description: '', alt_text: title, sort_order: index + 1, is_active: true, created_at: now };
      });
    writePhotos(photos);
  };

  const publicPhoto = photo => ({ ...photo, src: `images/galery/${photo.filename}` });

  const savePhoto = (file, fields) => {
    const photos = readPhotos();
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${crypto.randomUUID()}${ext}`;
    const title = String(fields.title || path.basename(filename, ext)).trim();
    const photo = { id: crypto.randomUUID(), filename, title, description: String(fields.description || '').trim(), alt_text: String(fields.alt_text || title).trim(), sort_order: Number(fields.sort_order) || photos.length + 1, is_active: fields.is_active !== '0', created_at: new Date().toISOString() };
    fs.mkdirSync(galleryDir, { recursive: true });
    const filePath = path.join(galleryDir, filename);
    fs.writeFileSync(filePath, file.buffer);
    try {
      photos.push(photo);
      writePhotos(photos);
    } catch (error) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      throw error;
    }
    return publicPhoto(photo);
  };

  initialize();

  router.get('/', (req, res) => {
    res.json(readPhotos().filter(photo => photo.is_active && fs.existsSync(path.join(galleryDir, photo.filename))).sort((a, b) => a.sort_order - b.sort_order).map(publicPhoto));
  });

  router.get('/admin', (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    res.json(readPhotos().sort((a, b) => a.sort_order - b.sort_order).map(publicPhoto));
  });

  router.post('/', (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    if (req.is('application/json')) {
      const { filename, mimeType, data } = req.body || {};
      const ext = path.extname(filename || '').toLowerCase();
      if (!filename || !data) return res.status(400).json({ error: 'No photo data received.', code: 'PHOTO_REQUIRED' });
      if (!IMG_EXTS.has(ext)) return res.status(400).json({ error: 'Unsupported image format.', code: 'INVALID_FILE_TYPE' });
      if (!String(mimeType || '').startsWith('image/')) return res.status(400).json({ error: 'Invalid image MIME type.', code: 'INVALID_MIME_TYPE' });
      const buffer = Buffer.from(data, 'base64');
      if (buffer.length > 10 * 1024 * 1024) return res.status(400).json({ error: 'File exceeds the 10 MB limit.', code: 'LIMIT_FILE_SIZE' });
      try { return res.status(201).json(savePhoto({ originalname: filename, mimetype: mimeType, buffer }, req.body)); }
      catch (error) { return res.status(500).json({ error: `Photo could not be saved: ${error.message}`, code: 'SAVE_FAILED' }); }
    }
    upload.single('photo')(req, res, error => {
      if (error) return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the 10 MB limit.' : error.message, code: error.code || 'UPLOAD_ERROR' });
      if (!req.file) return res.status(400).json({ error: 'No photo selected.', code: 'PHOTO_REQUIRED' });
      try { res.status(201).json(savePhoto(req.file, req.body)); }
      catch (saveError) { res.status(500).json({ error: `Photo could not be saved: ${saveError.message}`, code: 'SAVE_FAILED' }); }
    });
  });

  router.put('/:id', (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    const photos = readPhotos();
    const photo = photos.find(item => item.id === req.params.id);
    if (!photo) return res.status(404).json({ error: 'Photo not found' });
    photo.title = String(req.body.title ?? photo.title).trim();
    photo.description = String(req.body.description ?? photo.description).trim();
    photo.alt_text = String(req.body.alt_text ?? photo.alt_text).trim();
    photo.sort_order = Number(req.body.sort_order) || photo.sort_order;
    photo.is_active = req.body.is_active === undefined ? photo.is_active : Boolean(req.body.is_active);
    writePhotos(photos);
    res.json(publicPhoto(photo));
  });

  router.delete('/:id', (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    const photos = readPhotos();
    const index = photos.findIndex(item => item.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Photo not found' });
    const [photo] = photos.splice(index, 1);
    const filePath = path.join(galleryDir, photo.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    writePhotos(photos);
    res.json({ success: true });
  });

  return router;
}

module.exports = createGalleryRouter;

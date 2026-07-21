const express = require('express');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');
const { MEDIA_ROOT } = require('../config');

const router = express.Router();
const VIDEO_EXTS = new Set(['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v', '.flv', '.wmv']);

function safePath(requestedPath) {
  const resolved = path.resolve(MEDIA_ROOT, requestedPath || '');
  if (!resolved.startsWith(MEDIA_ROOT + path.sep) && resolved !== MEDIA_ROOT) {
    throw new Error('Access denied');
  }
  return resolved;
}

function isVideo(name) {
  return VIDEO_EXTS.has(path.extname(name).toLowerCase());
}

function statItem(dirPath, entry) {
  const fullPath = path.join(dirPath, entry.name);
  const relativePath = path.relative(MEDIA_ROOT, fullPath).replace(/\\/g, '/');
  if (entry.isDirectory()) {
    return { name: entry.name, type: 'directory', path: relativePath, size: null };
  }
  let size = null;
  try { size = fs.statSync(fullPath).size; } catch {}
  return { name: entry.name, type: 'file', path: relativePath, size };
}

router.get('/', auth, (req, res) => {
  try {
    const dirPath = safePath(req.query.path);
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const items = entries
      .filter(e => e.isDirectory() || isVideo(e.name))
      .map(e => statItem(dirPath, e))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });
    const currentPath = path.relative(MEDIA_ROOT, dirPath).replace(/\\/g, '/');
    res.json({ items, currentPath });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/search', auth, (req, res) => {
  const query = (req.query.q || '').toLowerCase().trim();
  if (!query) return res.json({ items: [] });

  const results = [];

  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name));
      } else if (isVideo(entry.name) && entry.name.toLowerCase().includes(query)) {
        results.push(statItem(dir, entry));
      }
    }
  }

  walk(MEDIA_ROOT);
  res.json({ items: results });
});

module.exports = router;

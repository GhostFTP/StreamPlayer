const express = require('express');
const path = require('path');
const streamAuth = require('../middleware/streamAuth');
const { MEDIA_ROOT } = require('../config');

const router = express.Router();

function safePath(p) {
  if (!p) throw new Error('path required');
  const resolved = path.resolve(MEDIA_ROOT, p);
  if (!resolved.startsWith(MEDIA_ROOT + path.sep) && resolved !== MEDIA_ROOT)
    throw new Error('Access denied');
  return resolved;
}

// GET /api/poster?path=<image-path>&token=
router.get('/', streamAuth, (req, res) => {
  try {
    res.sendFile(safePath(req.query.path));
  } catch (e) {
    res.status(400).end();
  }
});

module.exports = router;

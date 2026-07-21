const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const streamAuth = require('../middleware/streamAuth');
const { MEDIA_ROOT } = require('../config');

const router = express.Router();
const CACHE_DIR = path.join(os.tmpdir(), 'stream-player-thumbs');

fs.mkdirSync(CACHE_DIR, { recursive: true });

function safePath(requestedPath) {
  if (!requestedPath) throw new Error('path is required');
  const resolved = path.resolve(MEDIA_ROOT, requestedPath);
  if (!resolved.startsWith(MEDIA_ROOT + path.sep) && resolved !== MEDIA_ROOT) {
    throw new Error('Access denied');
  }
  return resolved;
}

function generateThumb(inputPath, outputPath, seekSeconds) {
  return new Promise((resolve, reject) => {
    const args = [
      '-ss', String(seekSeconds),
      '-i', inputPath,
      '-vframes', '1',
      '-q:v', '4',
      '-vf', 'scale=480:-2',
      '-y', outputPath,
    ];
    const proc = spawn('ffmpeg', args);
    let stderr = '';
    proc.stderr.on('data', d => (stderr += d));
    proc.on('close', code => {
      if (code === 0 && fs.existsSync(outputPath)) resolve();
      else reject(new Error(`ffmpeg: ${stderr.slice(-300)}`));
    });
  });
}

router.get('/', streamAuth, async (req, res) => {
  try {
    const filePath = safePath(req.query.path);
    if (!fs.existsSync(filePath)) return res.status(404).end();

    const stat = fs.statSync(filePath);
    if (stat.size === 0) return res.status(204).end();

    const cacheKey = crypto
      .createHash('md5')
      .update(filePath + stat.mtimeMs)
      .digest('hex');
    const cachePath = path.join(CACHE_DIR, `${cacheKey}.jpg`);

    if (fs.existsSync(cachePath)) {
      return res.sendFile(cachePath);
    }

    // Try seeking to 5 s, fall back to 0 s for very short videos
    try {
      await generateThumb(filePath, cachePath, 5);
    } catch {
      await generateThumb(filePath, cachePath, 0);
    }

    res.sendFile(cachePath);
  } catch (e) {
    res.status(500).end();
  }
});

module.exports = router;

const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const streamAuth = require('../middleware/streamAuth');
const { MEDIA_ROOT } = require('../config');

const router = express.Router();
const ALLOWED_HEIGHTS = new Set([360, 480, 720, 1080]);

function safePath(requestedPath) {
  if (!requestedPath) throw new Error('path is required');
  const resolved = path.resolve(MEDIA_ROOT, requestedPath);
  if (!resolved.startsWith(MEDIA_ROOT + path.sep) && resolved !== MEDIA_ROOT) {
    throw new Error('Access denied');
  }
  return resolved;
}

// Transcodes on the fly and pipes a fragmented MP4 to the response.
// `start` lets the client "seek" by re-requesting from a new point, since
// the piped stream itself has no byte-range/seek support.
router.get('/', streamAuth, (req, res) => {
  let filePath;
  try {
    filePath = safePath(req.query.path);
  } catch (e) {
    return res.status(400).send(e.message);
  }
  if (!fs.existsSync(filePath)) return res.status(404).send('File not found');

  // `source` means "keep the original video quality" — used when Auto's raw
  // passthrough would work fine except the audio codec isn't browser-safe,
  // so we only need to re-encode the audio, not the (expensive) video.
  const isSourceQuality = req.query.height === 'source';
  const height = parseInt(req.query.height, 10);
  if (!isSourceQuality && !ALLOWED_HEIGHTS.has(height)) return res.status(400).send('Invalid height');

  const start = Math.max(0, parseFloat(req.query.start) || 0);

  const audioIndex = parseInt(req.query.audio, 10);
  const args = ['-ss', String(start), '-i', filePath];
  if (Number.isInteger(audioIndex) && audioIndex >= 0) {
    args.push('-map', '0:v:0', '-map', `0:a:${audioIndex}`);
  }
  if (isSourceQuality) {
    args.push('-c:v', 'copy');
  } else {
    args.push('-vf', `scale=-2:${height}`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23');
  }
  args.push(
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
    '-f', 'mp4',
    'pipe:1',
  );

  const ffmpeg = spawn('ffmpeg', args);

  res.setHeader('Content-Type', 'video/mp4');
  ffmpeg.stdout.pipe(res);

  let stderr = '';
  ffmpeg.stderr.on('data', d => { stderr += d; });
  ffmpeg.on('error', () => res.destroy());
  ffmpeg.on('close', code => {
    if (code !== 0 && code !== null) console.error(`transcode failed (${code}): ${stderr.slice(-300)}`);
  });

  req.on('close', () => {
    if (ffmpeg.exitCode === null) ffmpeg.kill('SIGKILL');
  });
});

module.exports = router;

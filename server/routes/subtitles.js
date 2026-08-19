const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const auth = require('../middleware/auth');
const streamAuth = require('../middleware/streamAuth');
const { MEDIA_ROOT } = require('../config');

const router = express.Router();

const SUB_EXTS = new Set(['.srt', '.vtt', '.ass', '.ssa']);
const VIDEO_EXTS = new Set(['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v', '.flv', '.wmv']);
const isSub   = n => SUB_EXTS.has(path.extname(n).toLowerCase());
const isVideo = n => VIDEO_EXTS.has(path.extname(n).toLowerCase());

const LANG_NAMES = {
  en: 'English',  eng: 'English',
  es: 'Spanish',  spa: 'Spanish',
  fr: 'French',   fre: 'French',  fra: 'French',
  de: 'German',   ger: 'German',  deu: 'German',
  it: 'Italian',  ita: 'Italian',
  pt: 'Portuguese', por: 'Portuguese',
  ja: 'Japanese', jpn: 'Japanese',
  zh: 'Chinese',  zho: 'Chinese',  chi: 'Chinese',
  ko: 'Korean',   kor: 'Korean',
  ar: 'Arabic',   ara: 'Arabic',
  ru: 'Russian',  rus: 'Russian',
  nl: 'Dutch',    nld: 'Dutch',
  ind: 'Indonesian',
  may: 'Malay',   msa: 'Malay',
  tha: 'Thai',
  vie: 'Vietnamese',
  und: 'Unknown',
};

function langLabel(code, title) {
  if (title && title.trim()) return title.trim();
  return LANG_NAMES[code] || code.toUpperCase();
}

function safePath(p) {
  if (!p) throw new Error('path required');
  const resolved = path.resolve(MEDIA_ROOT, p);
  if (!resolved.startsWith(MEDIA_ROOT + path.sep) && resolved !== MEDIA_ROOT)
    throw new Error('Access denied');
  return resolved;
}

function srtToVtt(srt) {
  return 'WEBVTT\n\n' + srt
    .replace(/\r\n|\r/g, '\n')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
}

// Re-base cue timestamps to 0 at `offsetSeconds` — needed because the
// transcoded video pipe restarts its own clock at the seek point, while
// subtitle cues are always timed against the original file.
function shiftVttTimestamps(vtt, offsetSeconds) {
  if (!offsetSeconds) return vtt;
  return vtt.replace(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})/g, (_, h, m, s, ms) => {
    const total = Math.max(0, (+h) * 3600 + (+m) * 60 + (+s) + (+ms) / 1000 - offsetSeconds);
    const hh  = String(Math.floor(total / 3600)).padStart(2, '0');
    const mm  = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const ss  = String(Math.floor(total % 60)).padStart(2, '0');
    const mmm = String(Math.round((total % 1) * 1000)).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${mmm}`;
  });
}

// Extract embedded subtitle stream list via ffprobe
function getEmbeddedTracks(videoPath, relVideoPath) {
  try {
    const out = execFileSync('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      '-select_streams', 's',
      videoPath,
    ], { timeout: 8000 }).toString();

    const streams = JSON.parse(out).streams || [];
    return streams.map((s, i) => {
      const lang  = s.tags?.language || 'und';
      const title = s.tags?.title    || '';
      return {
        lang,
        label: langLabel(lang, title),
        path: relVideoPath,   // video file path — ffmpeg will extract from it
        streamIndex: i,
        type: 'embedded',
      };
    });
  } catch {
    return [];
  }
}

// Read the language of each embedded audio stream via ffprobe
function getAudioLanguages(videoPath) {
  try {
    const out = execFileSync('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      '-select_streams', 'a',
      videoPath,
    ], { timeout: 8000 }).toString();

    const streams = JSON.parse(out).streams || [];
    return streams.map(s => ({
      lang: s.tags?.language || 'und',
      label: langLabel(s.tags?.language || 'und', s.tags?.title || ''),
      default: s.disposition?.default === 1,
    }));
  } catch {
    return [];
  }
}

// Read the real container duration via ffprobe — independent of which
// quality/stream the client ends up playing (transcoded streams report an
// unreliable duration since they're fragmented mp4 with no upfront moov).
function getDuration(videoPath) {
  try {
    const out = execFileSync('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_entries', 'format=duration',
      videoPath,
    ], { timeout: 8000 }).toString();

    const duration = parseFloat(JSON.parse(out).format?.duration);
    return isFinite(duration) && duration > 0 ? duration : null;
  } catch {
    return null;
  }
}

// GET /api/subtitles?path=<video-path>
// Returns sidecar files + embedded streams
router.get('/', auth, (req, res) => {
  try {
    const filePath    = safePath(req.query.path);
    const relFilePath = path.relative(MEDIA_ROOT, filePath).replace(/\\/g, '/');
    const dir         = path.dirname(filePath);
    const base        = path.basename(filePath, path.extname(filePath));
    const tracks      = [];

    // ── Sidecar files ────────────────────────────────
    try {
      for (const f of fs.readdirSync(dir)) {
        if (!isSub(f)) continue;
        const fBase = path.basename(f, path.extname(f));
        if (!fBase.startsWith(base)) continue;
        const remainder = fBase.slice(base.length).replace(/^\./, '');
        const lang      = remainder.split('.')[0] || 'und';
        tracks.push({
          lang,
          label: langLabel(lang, ''),
          path: path.relative(MEDIA_ROOT, path.join(dir, f)).replace(/\\/g, '/'),
          type: 'sidecar',
        });
      }
    } catch {}

    // ── Embedded streams (MKV / MP4 / etc.) ─────────
    let audio = [];
    let duration = null;
    if (isVideo(filePath)) {
      const embedded = getEmbeddedTracks(filePath, relFilePath);
      tracks.push(...embedded);
      audio = getAudioLanguages(filePath);
      duration = getDuration(filePath);
    }

    res.json({ tracks, audio, duration });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/subtitles/file?path=<path>&stream=<N>&token=
// stream=N → extract embedded stream N from video at <path>
// (no stream) → serve sidecar file at <path>
router.get('/file', streamAuth, (req, res) => {
  try {
    const filePath = safePath(req.query.path);
    const start = Math.max(0, parseFloat(req.query.start) || 0);

    res.set('Content-Type', 'text/vtt; charset=utf-8');
    res.set('Access-Control-Allow-Origin', '*');

    // Embedded stream extraction
    if (req.query.stream !== undefined) {
      const streamIndex = parseInt(req.query.stream, 10);
      if (!fs.existsSync(filePath)) return res.status(404).end();

      const args = [];
      if (start > 0) args.push('-ss', String(start));
      args.push('-i', filePath, '-map', `0:s:${streamIndex}`, '-f', 'webvtt', 'pipe:1');

      const proc = spawn('ffmpeg', args);
      proc.stdout.pipe(res);
      proc.stderr.resume(); // drain stderr to avoid blocking
      proc.on('error', () => res.status(500).end());
      return;
    }

    // Sidecar file
    if (!fs.existsSync(filePath)) return res.status(404).end();
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.vtt') {
      const vtt = fs.readFileSync(filePath, 'utf8');
      res.send(shiftVttTimestamps(vtt, start));
    } else if (ext === '.srt') {
      const vtt = srtToVtt(fs.readFileSync(filePath, 'utf8'));
      res.send(shiftVttTimestamps(vtt, start));
    } else {
      const args = [];
      if (start > 0) args.push('-ss', String(start));
      args.push('-i', filePath, '-f', 'webvtt', 'pipe:1');

      const proc = spawn('ffmpeg', args);
      proc.stdout.pipe(res);
      proc.stderr.resume();
      proc.on('error', () => res.status(500).end());
    }
  } catch (e) {
    res.status(400).end();
  }
});

module.exports = router;

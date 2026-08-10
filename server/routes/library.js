const express = require('express');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');
const { MEDIA_ROOT, TMDB_API_KEY } = require('../config');
const { getPosterUrl: tmdbPoster } = require('../tmdb');

const router = express.Router();

const VIDEO_EXTS = new Set(['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v', '.flv', '.wmv']);
const SUB_EXTS   = new Set(['.srt', '.vtt', '.ass', '.ssa']);
const POSTER_NAMES = ['poster.jpg', 'poster.jpeg', 'poster.png', 'poster.webp', 'cover.jpg', 'cover.png'];
const EPISODE_RE = /[Ss](\d{1,2})[Ee](\d{1,2})/;

const isVideo = n => VIDEO_EXTS.has(path.extname(n).toLowerCase());
const isSub   = n => SUB_EXTS.has(path.extname(n).toLowerCase());
const rel     = p => path.relative(MEDIA_ROOT, p).replace(/\\/g, '/');

function readMeta(dir) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, 'metadata.json'), 'utf8')); }
  catch { return {}; }
}

function parseGenres(meta) {
  const g = meta.genres ?? meta.genre;
  if (!g) return [];
  return Array.isArray(g) ? g : [g];
}

function findPosterPath(dir) {
  for (const name of POSTER_NAMES) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return rel(p);
  }
  return null;
}

function findFirstVideo(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries)
      if (e.isFile() && isVideo(e.name))
        return rel(path.join(dir, e.name));
    for (const e of entries)
      if (e.isDirectory()) {
        const found = findFirstVideo(path.join(dir, e.name));
        if (found) return found;
      }
  } catch {}
  return null;
}

function addedAtOf(p) {
  try { return fs.statSync(p).mtimeMs; } catch { return 0; }
}

function dirHasSubs(dir) {
  try { return fs.readdirSync(dir).some(isSub); } catch { return false; }
}

function posterUrl(posterPath, videoPath) {
  if (posterPath) return `/api/poster?path=${encodeURIComponent(posterPath)}`;
  if (videoPath)  return `/api/thumbnail?path=${encodeURIComponent(videoPath)}`;
  return null;
}

// Tags that appear after S##E## in release filenames (not episode titles)
const RELEASE_TAGS_RE = /\b(1080p|720p|480p|2160p|4k|uhd|hdr10?|dv|web[-.]?dl|webrip|blu[-.]?ray|bdrip|bdremux|hdtv|dvdrip|x265|x264|hevc|avc|h\.?26[45]|aac|ac3|dts|dd5\.1|truehd|atmos|nf|amzn|hulu|dsnp|hbo|pcok|proper|repack|extended|theatrical|remux|hybrid|imax|yts|rarbg)\b.*/i;

function parseEpisode(name) {
  const m = name.match(EPISODE_RE);
  if (!m) return null;
  const season  = parseInt(m[1], 10);
  const episode = parseInt(m[2], 10);

  // Year extraction from the part before S##E##
  const before    = name.slice(0, name.indexOf(m[0]));
  const yearMatch = before.match(/\b((?:19|20)\d{2})\b/);
  const year      = yearMatch ? parseInt(yearMatch[1], 10) : null;

  // Title extraction: part after S##E##, stripped of release tags and separators
  const rawAfter = name.slice(name.indexOf(m[0]) + m[0].length);
  const cleaned  = rawAfter
    .replace(RELEASE_TAGS_RE, '')   // strip quality tags and everything after
    .replace(/[._]/g, ' ')          // dots/underscores → spaces
    .replace(/\.[^.]+$/, '')        // remove extension if still present
    .trim();

  const title = cleaned.length > 1 ? cleaned : `Episode ${episode}`;
  return { season, episode, title, year };
}

function scanSeriesFolder(dir) {
  const map = {};  // season → episodes[]
  let detectedYear = null;

  function addFile(filePath) {
    const name = path.basename(filePath);
    const ep = parseEpisode(name);
    if (!ep) return;
    const fileDir = path.dirname(filePath);
    if (!map[ep.season]) map[ep.season] = [];
    if (ep.year && !detectedYear) detectedYear = ep.year;
    map[ep.season].push({
      number: ep.episode,
      title: ep.title,
      path: rel(filePath),
      hasSubtitles: dirHasSubs(fileDir),
    });
  }

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isFile() && isVideo(e.name)) {
        addFile(full);
      } else if (e.isDirectory()) {
        try {
          fs.readdirSync(full, { withFileTypes: true })
            .filter(se => se.isFile() && isVideo(se.name))
            .forEach(se => addFile(path.join(full, se.name)));
        } catch {}
      }
    }
  } catch {}

  const seasons = Object.keys(map).map(Number).sort((a, b) => a - b).map(n => ({
    number: n,
    episodes: map[n].sort((a, b) => a.number - b.number),
  }));
  return { seasons, detectedYear };
}

router.get('/', auth, async (_req, res) => {
  const moviesDir = path.join(MEDIA_ROOT, 'Movies');
  const seriesDir = path.join(MEDIA_ROOT, 'Series');
  const movies    = [];
  const series    = [];
  const genreSet  = new Set();

  // ── Movies ──────────────────────────────────────────────
  if (fs.existsSync(moviesDir)) {
    for (const e of fs.readdirSync(moviesDir, { withFileTypes: true })) {
      const full = path.join(moviesDir, e.name);
      let meta = {}, videoPath, itemPath;

      if (e.isDirectory()) {
        meta      = readMeta(full);
        videoPath = findFirstVideo(full);
        itemPath  = rel(full);
      } else if (e.isFile() && isVideo(e.name)) {
        videoPath = rel(full);
        itemPath  = null;
      } else continue;

      if (!videoPath) continue;

      const genres = parseGenres(meta);
      genres.forEach(g => genreSet.add(g));
      const title = meta.title || path.basename(e.name, path.extname(e.name));
      const year  = meta.year ?? null;

      movies.push({
        id: e.name.replace(/[^a-z0-9]/gi, '-').toLowerCase(),
        title,
        year,
        genres,
        description: meta.description ?? null,
        director:    meta.director    ?? null,
        cast:        Array.isArray(meta.cast) ? meta.cast : (meta.cast ? [meta.cast] : []),
        runtime:     meta.runtime     ?? null,
        addedAt:     addedAtOf(full),
        _localPoster: e.isDirectory() ? findPosterPath(full) : null,
        _videoPath:   videoPath,
        videoPath,
        path: itemPath,
        hasSubtitles: e.isDirectory() ? dirHasSubs(full) : false,
      });
    }
  }

  // ── Series ──────────────────────────────────────────────
  if (fs.existsSync(seriesDir)) {
    for (const e of fs.readdirSync(seriesDir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const full    = path.join(seriesDir, e.name);
      const meta    = readMeta(full);
      const genres  = parseGenres(meta);
      const { seasons, detectedYear } = scanSeriesFolder(full);
      if (seasons.length === 0) continue;

      genres.forEach(g => genreSet.add(g));

      series.push({
        id: e.name.replace(/[^a-z0-9]/gi, '-').toLowerCase(),
        title:        meta.title   || e.name,
        year:         meta.year    ?? detectedYear ?? null,
        endYear:      meta.endYear ?? null,
        genres,
        description:  meta.description ?? null,
        creator:      meta.creator     ?? null,
        cast:         Array.isArray(meta.cast) ? meta.cast : (meta.cast ? [meta.cast] : []),
        runtime:      meta.runtime     ?? null,
        addedAt:      addedAtOf(full),
        _localPoster: findPosterPath(full),
        _videoPath:   findFirstVideo(full),
        path:         rel(full),
        seasons,
        episodeCount: seasons.reduce((s, se) => s + se.episodes.length, 0),
      });
    }
  }

  // ── Resolve poster URLs (TMDB fallback) ─────────────────
  await Promise.all([
    ...movies.map(async m => {
      if (m._localPoster) {
        m.posterUrl = `/api/poster?path=${encodeURIComponent(m._localPoster)}`;
      } else {
        const tmdb = await tmdbPoster('movie', m.title, m.year, TMDB_API_KEY);
        m.posterUrl = tmdb ?? (m._videoPath ? `/api/thumbnail?path=${encodeURIComponent(m._videoPath)}` : null);
      }
      delete m._localPoster; delete m._videoPath;
    }),
    ...series.map(async s => {
      if (s._localPoster) {
        s.posterUrl = `/api/poster?path=${encodeURIComponent(s._localPoster)}`;
      } else {
        const tmdb = await tmdbPoster('tv', s.title, s.year, TMDB_API_KEY);
        s.posterUrl = tmdb ?? (s._videoPath ? `/api/thumbnail?path=${encodeURIComponent(s._videoPath)}` : null);
      }
      delete s._localPoster; delete s._videoPath;
    }),
  ]);

  movies.sort((a, b) => a.title.localeCompare(b.title));
  series.sort((a, b) => a.title.localeCompare(b.title));

  res.json({ movies, series, genres: [...genreSet].sort() });
});

module.exports = router;

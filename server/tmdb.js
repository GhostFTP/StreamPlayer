const https = require('https');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, 'poster-cache.json');
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';

let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch {}

function saveCache() {
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2)); } catch {}
}

function tmdbGet(path_, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `https://api.themoviedb.org/3${path_}&api_key=${apiKey}`;
    https.get(url, { headers: { 'User-Agent': 'Nyx/1.0' } }, res => {
      let raw = '';
      res.on('data', c => { raw += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error('TMDB parse error')); }
      });
    }).on('error', reject);
  });
}

async function getTmdbImages(type, title, year, apiKey) {
  if (!apiKey) return { poster: null, backdrop: null };

  const cacheKey = `${type}:${title.toLowerCase().trim()}:${year ?? 'any'}`;
  const cached = cache[cacheKey];
  // Older cache entries stored just the poster URL as a string — refetch those once
  // so they pick up a backdrop too, instead of treating them as permanently backdrop-less.
  if (cached && typeof cached === 'object') return cached;

  try {
    const q = encodeURIComponent(title);
    let endpoint;
    if (type === 'movie') {
      endpoint = `/search/movie?query=${q}${year ? `&year=${year}` : ''}`;
    } else {
      endpoint = `/search/tv?query=${q}${year ? `&first_air_date_year=${year}` : ''}`;
    }

    const data = await tmdbGet(endpoint, apiKey);
    const result = data.results?.[0];
    const images = {
      poster: result?.poster_path ? `${POSTER_BASE}${result.poster_path}` : null,
      backdrop: result?.backdrop_path ? `${BACKDROP_BASE}${result.backdrop_path}` : null,
    };

    cache[cacheKey] = images;
    saveCache();
    return images;
  } catch (err) {
    console.error(`[TMDB] ${title}: ${err.message}`);
    return { poster: null, backdrop: null };
  }
}

module.exports = { getTmdbImages };

const https = require('https');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, 'poster-cache.json');
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch {}

function saveCache() {
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2)); } catch {}
}

function tmdbGet(path_, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `https://api.themoviedb.org/3${path_}&api_key=${apiKey}`;
    https.get(url, { headers: { 'User-Agent': 'StreamPlayer/1.0' } }, res => {
      let raw = '';
      res.on('data', c => { raw += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error('TMDB parse error')); }
      });
    }).on('error', reject);
  });
}

async function getPosterUrl(type, title, year, apiKey) {
  if (!apiKey) return null;

  const cacheKey = `${type}:${title.toLowerCase().trim()}:${year ?? 'any'}`;
  if (cacheKey in cache) return cache[cacheKey];

  try {
    const q = encodeURIComponent(title);
    let endpoint;
    if (type === 'movie') {
      endpoint = `/search/movie?query=${q}${year ? `&year=${year}` : ''}`;
    } else {
      endpoint = `/search/tv?query=${q}${year ? `&first_air_date_year=${year}` : ''}`;
    }

    const data = await tmdbGet(endpoint, apiKey);
    const posterPath = data.results?.[0]?.poster_path ?? null;
    const url = posterPath ? `${IMAGE_BASE}${posterPath}` : null;

    cache[cacheKey] = url;
    saveCache();
    return url;
  } catch (err) {
    console.error(`[TMDB] ${title}: ${err.message}`);
    return null;
  }
}

module.exports = { getPosterUrl };

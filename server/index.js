const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const config = require('./config');

const app = express();

// CSP is disabled: it would need to explicitly allowlist the TMDB poster CDN
// and blob:/mediasource: URLs used by the transcoded video pipeline, and
// getting that wrong silently breaks posters/playback. The other headers
// (frameguard, HSTS, no-sniff, hidden X-Powered-By, etc.) apply as-is.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.CLIENT_ORIGIN }));
app.use(express.json());

// TEMP: request timing log for diagnosing slow-first-playback reports. Remove once resolved.
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[req] ${req.method} ${req.originalUrl} range=${req.headers.range || '-'}`);
  res.on('finish', () => {
    console.log(`[res] ${req.method} ${req.originalUrl} status=${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/files',      require('./routes/files'));
app.use('/api/stream',     require('./routes/stream'));
app.use('/api/transcode',  require('./routes/transcode'));
app.use('/api/thumbnail',  require('./routes/thumbnail'));
app.use('/api/library',    require('./routes/library'));
app.use('/api/subtitles',  require('./routes/subtitles'));
app.use('/api/poster',     require('./routes/poster'));
app.use('/api/users',      require('./routes/users'));

if (config.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.listen(config.PORT, () => {
  console.log(`Server listening on http://localhost:${config.PORT}`);
  console.log(`Media root: ${config.MEDIA_ROOT}`);
});

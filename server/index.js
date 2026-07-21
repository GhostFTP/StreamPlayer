const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');

const app = express();

app.use(cors({ origin: config.CLIENT_ORIGIN }));
app.use(express.json());

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/files',      require('./routes/files'));
app.use('/api/stream',     require('./routes/stream'));
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

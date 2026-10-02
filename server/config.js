const path = require('path');
require('dotenv').config();

module.exports = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  MEDIA_ROOT: process.env.MEDIA_ROOT
    ? path.resolve(process.env.MEDIA_ROOT)
    : path.resolve(__dirname, '..', 'media'),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',
  TMDB_API_KEY: process.env.TMDB_API_KEY || null,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || null,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || null,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || null,
  GOOGLE_ALLOWED_EMAILS: (process.env.GOOGLE_ALLOWED_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean),
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-session-secret-change-me',
};

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { JWT_SECRET } = require('../config');

const USERS_FILE = path.join(__dirname, '..', 'users.json');

module.exports = function adminAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { username } = jwt.verify(header.slice(7), JWT_SECRET);
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const user = users.find(u => u.username === username);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.username = username;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

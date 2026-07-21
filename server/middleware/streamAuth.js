const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

// Accepts token from Authorization header OR query param (needed for <img> and <video> src)
module.exports = function streamAuth(req, res, next) {
  const token = req.headers.authorization?.slice(7) || req.query.token;
  if (!token) return res.status(401).send('Unauthorized');
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).send('Invalid or expired token');
  }
};

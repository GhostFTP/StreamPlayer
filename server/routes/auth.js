const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { JWT_SECRET, CLIENT_ORIGIN } = config;
const auth = require('../middleware/auth');
const passport = require('../middleware/passport');
const { loginRateLimit, recordLoginFailure, recordLoginSuccess } = require('../middleware/loginRateLimit');

const router = express.Router();
const USERS_FILE = path.join(__dirname, '..', 'users.json');

function readUsers() {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); }
  catch { return []; }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

router.post('/login', loginRateLimit, async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user || !user.password) {
    recordLoginFailure(req);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    recordLoginFailure(req);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  recordLoginSuccess(req);
  const role = user.role || 'user';
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username, role });
});

// Change own password
router.put('/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const users = readUsers();
  const idx = users.findIndex(u => u.username === req.username);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });

  const valid = await bcrypt.compare(currentPassword, users[idx].password);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

  users[idx].password = await bcrypt.hash(newPassword, 12);
  writeUsers(users);
  res.json({ ok: true });
});

// --- Google OAuth (alternative sign-in, separate accounts from password-based users) ---

router.get('/google', (req, res, next) => {
  if (!config.GOOGLE_CLIENT_ID) {
    return res.redirect(`${CLIENT_ORIGIN}/login?error=google_not_configured`);
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: true })(req, res, next);
});

router.get('/google/callback',
  passport.authenticate('google', { session: true, failureRedirect: `${CLIENT_ORIGIN}/login?error=google` }),
  (req, res) => {
    const email = req.user?.email;
    if (!email || !config.GOOGLE_ALLOWED_EMAILS.includes(email)) {
      return res.redirect(`${CLIENT_ORIGIN}/login?error=not_allowed`);
    }

    const users = readUsers();
    let user = users.find(u => u.googleId === req.user.googleId);
    if (!user) {
      const username = `${email.split('@')[0]}_google`;
      user = { username, email, googleId: req.user.googleId, role: 'user' };
      users.push(user);
      writeUsers(users);
    }

    const role = user.role || 'user';
    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.redirect(`${CLIENT_ORIGIN}/auth/callback?token=${token}&username=${user.username}&role=${role}`);
  }
);

module.exports = router;

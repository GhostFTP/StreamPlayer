const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();
const USERS_FILE = path.join(__dirname, '..', 'users.json');

function readUsers() {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); }
  catch { return []; }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// List all users (admin only)
router.get('/', adminAuth, (_req, res) => {
  const users = readUsers().map(({ username, role }) => ({ username, role: role || 'user' }));
  res.json(users);
});

// Create user (admin only)
router.post('/', adminAuth, async (req, res) => {
  const { username, password, role = 'user' } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ error: 'username and password are required' });
  if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'role must be admin or user' });

  const users = readUsers();
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const hashed = await bcrypt.hash(password, 12);
  users.push({ username, password: hashed, role });
  writeUsers(users);
  res.status(201).json({ username, role });
});

// Delete user (admin only, cannot delete self or last admin)
router.delete('/:username', adminAuth, (req, res) => {
  const target = req.params.username;
  if (target === req.username) return res.status(400).json({ error: 'Cannot delete your own account' });

  const users = readUsers();
  const idx = users.findIndex(u => u.username === target);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });

  const admins = users.filter(u => u.role === 'admin');
  if (users[idx].role === 'admin' && admins.length <= 1) {
    return res.status(400).json({ error: 'Cannot delete the last admin' });
  }

  users.splice(idx, 1);
  writeUsers(users);
  res.json({ ok: true });
});

module.exports = router;

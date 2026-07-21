const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const USERS_FILE = path.join(__dirname, 'users.json');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = q => new Promise(resolve => rl.question(q, resolve));

async function main() {
  const username = (await ask('Username: ')).trim();
  const password = (await ask('Password: ')).trim();
  rl.close();

  if (!username || !password) {
    console.error('Username and password cannot be empty.');
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 12);

  let users = [];
  try { users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch {}

  const existing = users.findIndex(u => u.username === username);
  if (existing >= 0) {
    users[existing].password = hashed;
    console.log(`Password updated for "${username}".`);
  } else {
    users.push({ username, password: hashed });
    console.log(`User "${username}" created.`);
  }

  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });

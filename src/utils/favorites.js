const key = (username) => `sp_favorites_${username}`;

function readSet(username) {
  try { return new Set(JSON.parse(localStorage.getItem(key(username)) || '[]')); }
  catch { return new Set(); }
}

function writeSet(username, set) {
  localStorage.setItem(key(username), JSON.stringify([...set]));
}

export function toggleFavorite(username, id) {
  const set = readSet(username);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  writeSet(username, set);
}

export function isFavorite(username, id) {
  return readSet(username).has(id);
}

export function getFavoriteIds(username) {
  return readSet(username);
}

const MAX_ENTRIES = 20;
const DONE_RATIO = 0.92;

const key = (username) => `sp_progress_${username}`;

function readAll(username) {
  try { return JSON.parse(localStorage.getItem(key(username)) || '{}'); }
  catch { return {}; }
}

function writeAll(username, data) {
  localStorage.setItem(key(username), JSON.stringify(data));
}

export function saveProgress(username, filePath, { title, posterUrl, currentTime, duration }) {
  if (!username || !filePath || !duration || duration < 1) return;

  const all = readAll(username);

  if (currentTime < 30 || currentTime / duration > DONE_RATIO) {
    delete all[filePath];
  } else {
    all[filePath] = { filePath, title, posterUrl: posterUrl ?? null, currentTime, duration, updatedAt: Date.now() };
  }

  const trimmed = Object.fromEntries(
    Object.entries(all)
      .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
      .slice(0, MAX_ENTRIES)
  );
  writeAll(username, trimmed);
}

export function removeProgress(username, filePath) {
  const all = readAll(username);
  delete all[filePath];
  writeAll(username, all);
}

export function getInitialTime(username, filePath) {
  if (!username || !filePath) return 0;
  return readAll(username)[filePath]?.currentTime ?? 0;
}

export function getContinueWatching(username) {
  if (!username) return [];
  return Object.values(readAll(username)).sort((a, b) => b.updatedAt - a.updatedAt);
}

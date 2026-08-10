const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

const attempts = new Map(); // ip -> { count, resetAt }

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(ip);
  }
}, WINDOW_MS).unref();

function loginRateLimit(req, res, next) {
  const entry = attempts.get(req.ip);
  const now = Date.now();

  if (entry && entry.resetAt > now && entry.count >= MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    res.set('Retry-After', String(retryAfterSec));
    return res.status(429).json({
      error: `Too many login attempts. Try again in ${Math.ceil(retryAfterSec / 60)} minute(s).`,
    });
  }

  next();
}

function recordLoginFailure(req) {
  const now = Date.now();
  const entry = attempts.get(req.ip);
  if (!entry || entry.resetAt <= now) {
    attempts.set(req.ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function recordLoginSuccess(req) {
  attempts.delete(req.ip);
}

module.exports = { loginRateLimit, recordLoginFailure, recordLoginSuccess };

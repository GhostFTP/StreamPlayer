// External URLs (TMDB CDN) are public — no auth needed.
// Internal API paths require the JWT token as a query param.
export function buildPosterSrc(posterUrl, token) {
  if (!posterUrl) return null;
  if (posterUrl.startsWith('http://') || posterUrl.startsWith('https://')) return posterUrl;
  return `${posterUrl}&token=${encodeURIComponent(token)}`;
}

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Navbar from '../components/Navbar.jsx';
import { isFavorite, toggleFavorite } from '../utils/favorites.js';

function formatRuntime(minutes) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export default function SeriesDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, username } = useAuth();
  const { series } = location.state || {};
  const [openSeason, setOpenSeason] = useState(0);
  const [fav, setFav] = useState(() => series ? isFavorite(username, series.id) : false);

  function handleToggleFav() {
    toggleFavorite(username, series.id);
    setFav(f => !f);
  }

  if (!series) {
    navigate('/', { replace: true });
    return null;
  }

  const posterSrc = series.posterUrl
    ? `${series.posterUrl}&token=${encodeURIComponent(token)}`
    : null;

  function playEpisode(ep) {
    navigate('/player', { state: { filePath: ep.path, fileName: ep.title, posterUrl: series.posterUrl } });
  }

  return (
    <>
      <Navbar />
      <div className="series-detail-page">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

        {/* Hero */}
        <div className="series-hero">
          <div className="series-poster-wrap">
            {posterSrc ? (
              <img src={posterSrc} alt={series.title} className="series-poster-img" />
            ) : (
              <div className="series-poster-fallback">📺</div>
            )}
          </div>
          <div className="series-hero-info">
            <h1 className="series-hero-title">{series.title}</h1>
            <div className="series-hero-meta">
              {series.year && (
                <span>{series.year}{series.endYear ? ` – ${series.endYear}` : ''}</span>
              )}
              {series.runtime && <span>{formatRuntime(series.runtime)} / ep</span>}
              {series.creator && <span>Created by {series.creator}</span>}
              <span>{series.seasons.length} season{series.seasons.length !== 1 ? 's' : ''}</span>
              <span>{series.episodeCount} episodes</span>
            </div>
            {series.genres?.length > 0 && (
              <div className="series-genres">
                {series.genres.map(g => (
                  <span key={g} className="media-genre-badge">{g}</span>
                ))}
              </div>
            )}
            {series.description && (
              <p className="series-description">{series.description}</p>
            )}
            <button
              className={`detail-fav-btn${fav ? ' active' : ''}`}
              onClick={handleToggleFav}
              title={fav ? 'Remove from favorites' : 'Add to favorites'}
              style={{ marginTop: '1rem' }}
            >
              {fav ? '♥' : '♡'}
            </button>
            {series.cast?.length > 0 && (
              <div className="movie-cast">
                <span className="movie-cast-label">Cast</span>
                <span className="movie-cast-names">{series.cast.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Seasons */}
        <div className="seasons-list">
          {series.seasons.map((season, si) => (
            <div key={season.number} className="season-block">
              <button
                className={`season-header${openSeason === si ? ' open' : ''}`}
                onClick={() => setOpenSeason(openSeason === si ? -1 : si)}
              >
                <span>Season {season.number}</span>
                <span className="season-ep-count">{season.episodes.length} episodes</span>
                <span className="season-chevron">{openSeason === si ? '▲' : '▼'}</span>
              </button>

              {openSeason === si && (
                <div className="episode-list">
                  {season.episodes.map(ep => (
                    <div key={ep.path} className="episode-row">
                      <div className="episode-num">E{String(ep.number).padStart(2, '0')}</div>
                      <div className="episode-title">{ep.title}</div>
                      {ep.hasSubtitles && <span className="ep-sub-badge">CC</span>}
                      <button
                        className="episode-play-btn"
                        onClick={() => playEpisode(ep)}
                      >
                        ▶ Play
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

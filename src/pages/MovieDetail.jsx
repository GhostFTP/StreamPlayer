import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Navbar from '../components/Navbar.jsx';
import { isFavorite, toggleFavorite } from '../utils/favorites.js';
import { buildPosterSrc } from '../utils/poster.js';

export default function MovieDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, username } = useAuth();
  const { movie } = location.state || {};
  const [fav, setFav] = useState(() => movie ? isFavorite(username, movie.id) : false);

  function handleToggleFav() {
    toggleFavorite(username, movie.id);
    setFav(f => !f);
  }

  if (!movie) {
    navigate('/', { replace: true });
    return null;
  }

  const posterSrc = buildPosterSrc(movie.posterUrl, token);
  const backdropSrc = buildPosterSrc(movie.backdropUrl, token);

  function play() {
    navigate('/player', { state: { filePath: movie.videoPath, fileName: movie.title, posterUrl: movie.posterUrl } });
  }

  return (
    <>
      <Navbar />
      {backdropSrc && (
        <div className="detail-backdrop" style={{ backgroundImage: `url(${backdropSrc})` }}>
          <div className="detail-backdrop-fade" />
        </div>
      )}
      <div className={`series-detail-page${backdropSrc ? ' detail-page-overlap' : ''}`}>
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

        <div className="series-hero">
          <div className="series-poster-wrap">
            {posterSrc ? (
              <img src={posterSrc} alt={movie.title} className="series-poster-img" />
            ) : (
              <div className="series-poster-fallback">🎬</div>
            )}
          </div>

          <div className="series-hero-info">
            <h1 className="series-hero-title">{movie.title}</h1>
            <div className="series-hero-meta">
              {movie.year && <span>{movie.year}</span>}
              {movie.runtime && <span>{formatRuntime(movie.runtime)}</span>}
              {movie.director && <span>Dir. {movie.director}</span>}
            </div>

            {movie.genres?.length > 0 && (
              <div className="series-genres">
                {movie.genres.map(g => (
                  <span key={g} className="media-genre-badge">{g}</span>
                ))}
              </div>
            )}

            {movie.description && (
              <p className="series-description">{movie.description}</p>
            )}

            {movie.cast?.length > 0 && (
              <div className="movie-cast">
                <span className="movie-cast-label">Cast</span>
                <span className="movie-cast-names">{movie.cast.join(', ')}</span>
              </div>
            )}

            <div className="detail-actions">
              <button className="movie-play-btn" onClick={play}>▶ Watch Now</button>
              <button
                className={`detail-fav-btn${fav ? ' active' : ''}`}
                onClick={handleToggleFav}
                title={fav ? 'Remove from favorites' : 'Add to favorites'}
              >
                {fav ? '♥' : '♡'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function formatRuntime(minutes) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

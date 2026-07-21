import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { buildPosterSrc } from '../utils/poster.js';

export default function MediaCard({ item, type, onClick, progress, isFav, onToggleFavorite }) {
  const { token } = useAuth();
  const [imgError, setImgError] = useState(false);

  const imgSrc = buildPosterSrc(item.posterUrl, token);

  return (
    <div className="media-card" onClick={onClick}>
      <div className="media-poster">
        {imgSrc && !imgError ? (
          <img
            src={imgSrc}
            alt={item.title}
            className="media-poster-img"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="media-poster-fallback">
            {type === 'series' ? '📺' : '🎬'}
          </div>
        )}
        {item.genres?.length > 0 && (
          <div className="media-genre-overlay">
            {item.genres.slice(0, 2).map(g => (
              <span key={g} className="media-genre-badge">{g}</span>
            ))}
          </div>
        )}
        {onToggleFavorite && (
          <button
            className={`media-fav-btn${isFav ? ' active' : ''}`}
            onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFav ? '♥' : '♡'}
          </button>
        )}
        {typeof progress === 'number' && (
          <div className="media-progress-bar">
            <div className="media-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      <div className="media-info">
        <div className="media-title">{item.title}</div>
        <div className="media-meta">
          {item.year && <span>{item.year}{item.endYear ? `–${item.endYear}` : ''}</span>}
          {type === 'series' && item.seasons != null && (
            <span>{item.seasons.length} season{item.seasons.length !== 1 ? 's' : ''}</span>
          )}
          {type === 'movie' && item.director && (
            <span>{item.director}</span>
          )}
        </div>
      </div>
    </div>
  );
}

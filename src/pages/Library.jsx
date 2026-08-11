import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Navbar from '../components/Navbar.jsx';
import MediaCard from '../components/MediaCard.jsx';
import SkeletonCard from '../components/SkeletonCard.jsx';
import { getContinueWatching, removeProgress } from '../utils/progress.js';
import { getFavoriteIds, toggleFavorite } from '../utils/favorites.js';

export default function Library() {
  const { token, username }           = useAuth();
  const [data, setData]               = useState({ movies: [], series: [], genres: [] });
  const [activeGenre, setActiveGenre] = useState('All');
  const [sortBy, setSortBy]           = useState('title'); // 'title' | 'recent'
  const [loading, setLoading]         = useState(true);
  const [continueItems, setContinueItems] = useState([]);
  const [favorites,     setFavorites]     = useState(() => getFavoriteIds(username));
  const [searchParams]                = useSearchParams();
  const navigate                      = useNavigate();
  const query                         = (searchParams.get('q') || '').toLowerCase().trim();
  const filterParam                   = searchParams.get('filter');

  useEffect(() => {
    if (filterParam === 'favorites') setActiveGenre('♥ Favorites');
    else if (!filterParam) setActiveGenre(g => g === '♥ Favorites' ? 'All' : g);
  }, [filterParam]);

  // Refresh continue watching on mount and when window regains focus
  useEffect(() => {
    const refresh = () => setContinueItems(getContinueWatching(username));
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  useEffect(() => {
    fetch('/api/library', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  // Reset genre filter when searching
  useEffect(() => {
    if (query) setActiveGenre('All');
  }, [query]);

  function toggleFav(id) {
    toggleFavorite(username, id);
    setFavorites(getFavoriteIds(username));
  }

  function filter(items) {
    const filtered = items
      .filter(i => !query || i.title.toLowerCase().includes(query))
      .filter(i => {
        if (activeGenre === 'All') return true;
        if (activeGenre === '♥ Favorites') return favorites.has(i.id);
        return i.genres.includes(activeGenre);
      });
    if (sortBy === 'recent') return [...filtered].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    return filtered;
  }

  const movies = filter(data.movies);
  const series = filter(data.series);
  const noResults = query && movies.length === 0 && series.length === 0;

  return (
    <>
      <Navbar />
      <div className="library-page">
        {/* Continue Watching — hidden while searching */}
        {!query && continueItems.length > 0 && (
          <section className="library-section">
            <h2 className="library-section-title">Continue Watching</h2>
            <div className="media-grid">
              {continueItems.map(item => {
                const pct = Math.round((item.currentTime / item.duration) * 100);
                return (
                  <div key={item.filePath} className="continue-card-wrap">
                    <MediaCard
                      item={{ title: item.title, posterUrl: item.posterUrl, genres: [] }}
                      type="movie"
                      progress={pct}
                      onClick={() => navigate('/player', {
                        state: { filePath: item.filePath, fileName: item.title, posterUrl: item.posterUrl },
                      })}
                    />
                    <button
                      className="continue-remove-btn"
                      title="Eliminar de continuar viendo"
                      onClick={e => {
                        e.stopPropagation();
                        removeProgress(username, item.filePath);
                        setContinueItems(getContinueWatching(username));
                      }}
                    >✕</button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Genre filter (hidden while searching) + sort control */}
        <div className="library-toolbar">
          {!query && data.genres.length > 0 && (
            <div className="genre-bar">
              {['All', '♥ Favorites', ...data.genres].map(g => (
                <button
                  key={g}
                  className={`genre-chip${activeGenre === g ? ' active' : ''}${g === '♥ Favorites' ? ' fav-chip' : ''}`}
                  onClick={() => setActiveGenre(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
          <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="title">Title (A–Z)</option>
            <option value="recent">Recently Added</option>
          </select>
        </div>

        {loading ? (
          <>
            <section className="library-section">
              <h2 className="library-section-title">Movies</h2>
              <div className="media-grid">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            </section>
            <section className="library-section">
              <h2 className="library-section-title">Series</h2>
              <div className="media-grid">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            </section>
          </>
        ) : noResults ? (
          <div className="search-empty">
            <p>No results for <strong>"{searchParams.get('q')}"</strong></p>
          </div>
        ) : (
          <>
            <LibrarySection
              title={query ? 'Movies' : 'Movies'}
              items={movies}
              emptyMsg={query ? null : 'No movies found in media/Movies/'}
              renderCard={m => (
                <MediaCard
                  key={m.id}
                  item={m}
                  type="movie"
                  isFav={favorites.has(m.id)}
                  onToggleFavorite={() => toggleFav(m.id)}
                  onClick={() => navigate('/movie', { state: { movie: m } })}
                />
              )}
            />
            <LibrarySection
              title="Series"
              items={series}
              emptyMsg={query ? null : 'No series found in media/Series/'}
              renderCard={s => (
                <MediaCard
                  key={s.id}
                  item={s}
                  type="series"
                  isFav={favorites.has(s.id)}
                  onToggleFavorite={() => toggleFav(s.id)}
                  onClick={() => navigate('/series', { state: { series: s } })}
                />
              )}
            />
          </>
        )}
      </div>
    </>
  );
}

function LibrarySection({ title, items, emptyMsg, renderCard }) {
  if (items.length === 0 && !emptyMsg) return null;
  return (
    <section className="library-section">
      <h2 className="library-section-title">{title}</h2>
      {items.length === 0 ? (
        <p className="empty-msg">{emptyMsg}</p>
      ) : (
        <div className="media-grid">{items.map(renderCard)}</div>
      )}
    </section>
  );
}

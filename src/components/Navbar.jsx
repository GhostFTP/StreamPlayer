import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import BurgerMenu from './BurgerMenu.jsx';

const SEARCH_ROUTES = ['/'];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const showSearch = SEARCH_ROUTES.includes(location.pathname);
  const searchValue = searchParams.get('q') || '';

  function handleSearch(e) {
    const val = e.target.value;
    if (val) setSearchParams({ q: val }, { replace: true });
    else setSearchParams({}, { replace: true });
  }

  function clearSearch() {
    setSearchParams({}, { replace: true });
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-left">
          <button
            className="burger-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <span /><span /><span />
          </button>
          <button className="navbar-brand" onClick={() => navigate('/')}>▶ Nyx</button>
        </div>

        {showSearch && (
          <div className="navbar-search-wrap">
            <span className="navbar-search-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input
              className="navbar-search"
              type="search"
              placeholder="Search movies and series…"
              value={searchValue}
              onChange={handleSearch}
            />
            {searchValue && (
              <button className="navbar-search-clear" onClick={clearSearch} aria-label="Clear search">✕</button>
            )}
          </div>
        )}

        <div className="navbar-right-placeholder" />
      </nav>

      <BurgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

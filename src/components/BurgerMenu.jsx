import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV_ITEMS = [
  { icon: '🎬', label: 'Library',      path: '/' },
  { icon: '📁', label: 'Browse Files', path: '/browse' },
];

export default function BurgerMenu({ isOpen, onClose }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { username, role, logout } = useAuth();

  const navItems = [
    { icon: '🎬', label: 'Library',      path: '/',                search: '' },
    { icon: '♥',  label: 'Favorites',    path: '/',                search: '?filter=favorites' },
    { icon: '📁', label: 'Browse Files', path: '/browse',          search: '' },
    ...(role === 'admin' ? [{ icon: '⚙️', label: 'Users', path: '/admin', search: '' }] : []),
  ];

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  function go(path, search = '') {
    navigate(search ? `${path}${search}` : path);
    onClose();
  }

  function handleLogout() {
    logout();
    navigate('/login');
    onClose();
  }

  return (
    <>
      <div
        className={`burger-overlay${isOpen ? ' visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`burger-panel${isOpen ? ' open' : ''}`} aria-label="Navigation menu">
        <div className="burger-header">
          <span className="burger-brand">▶ Stream Player</span>
          <button className="burger-close" onClick={onClose} aria-label="Close menu">✕</button>
        </div>

        <nav className="burger-nav">
          {navItems.map(item => {
            const isActive = location.pathname === item.path &&
              (item.search ? location.search.includes('filter=favorites') : !location.search.includes('filter=favorites') || item.path !== '/');
            return (
            <button
              key={item.label}
              className={`burger-nav-item${isActive ? ' active' : ''}${item.label === 'Favorites' ? ' fav-item' : ''}`}
              onClick={() => go(item.path, item.search)}
            >
              <span className="burger-nav-icon">{item.icon}</span>
              {item.label}
            </button>
            );
          })}
        </nav>

        <div className="burger-footer">
          <button className="burger-user" onClick={() => go('/profile')} title="View profile">
            <span className="burger-avatar">{username?.[0]?.toUpperCase()}</span>
            <div className="burger-user-info">
              <span className="burger-username">{username}</span>
              <span className="burger-role">{role === 'admin' ? 'Admin' : 'User'}</span>
            </div>
          </button>
          <button className="burger-logout" onClick={handleLogout}>Logout</button>
        </div>
      </aside>
    </>
  );
}

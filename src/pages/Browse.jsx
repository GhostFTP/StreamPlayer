import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Navbar from '../components/Navbar.jsx';
import FileCard from '../components/FileCard.jsx';

export default function Browse() {
  const [items, setItems] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const { token } = useAuth();
  const navigate = useNavigate();

  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchFiles = useCallback(async (path) => {
    setLoading(true);
    setSearchQuery('');
    setSearchResults(null);
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`, { headers: authHeaders });
      const data = await res.json();
      setItems(data.items ?? []);
      setCurrentPath(data.currentPath ?? '');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchFiles(''); }, [fetchFiles]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/files/search?q=${encodeURIComponent(searchQuery)}`, { headers: authHeaders });
      const data = await res.json();
      setSearchResults(data.items ?? []);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, token]);

  function handleItemClick(item) {
    if (item.type === 'directory') {
      fetchFiles(item.path);
    } else {
      navigate('/player', { state: { filePath: item.path, fileName: item.name } });
    }
  }

  const pathParts = currentPath ? currentPath.split('/').filter(Boolean) : [];
  const displayItems = searchResults !== null ? searchResults : items;

  return (
    <>
      <Navbar />
      <div className="browse-page">
        <div className="browse-header">
          <h2 className="browse-title">My Media</h2>
          <input
            className="input search-input"
            type="search"
            placeholder="Search videos…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {!searchQuery && (
          <nav className="breadcrumb">
            <span className="breadcrumb-item" onClick={() => fetchFiles('')}>Home</span>
            {pathParts.map((part, i) => {
              const subPath = pathParts.slice(0, i + 1).join('/');
              const isLast = i === pathParts.length - 1;
              return (
                <span key={subPath} style={{ display: 'contents' }}>
                  <span className="breadcrumb-sep">/</span>
                  <span
                    className={isLast ? 'breadcrumb-current' : 'breadcrumb-item'}
                    onClick={!isLast ? () => fetchFiles(subPath) : undefined}
                  >
                    {part}
                  </span>
                </span>
              );
            })}
          </nav>
        )}

        {loading ? (
          <div className="loading">Loading…</div>
        ) : (
          <div className="file-grid">
            {displayItems.length === 0 ? (
              <div className="empty-msg">
                {searchQuery ? 'No videos found' : 'This folder is empty'}
              </div>
            ) : (
              displayItems.map(item => (
                <FileCard key={item.path} item={item} onClick={() => handleItemClick(item)} />
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}

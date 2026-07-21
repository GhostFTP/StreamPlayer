import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function FileCard({ item, onClick }) {
  const { token } = useAuth();
  const [thumbFailed, setThumbFailed] = useState(false);

  const isVideo = item.type === 'file';
  const thumbUrl = isVideo
    ? `/api/thumbnail?path=${encodeURIComponent(item.path)}&token=${encodeURIComponent(token)}`
    : null;

  return (
    <div className="file-card" onClick={onClick}>
      <div className="file-thumb">
        {isVideo && !thumbFailed ? (
          <img
            src={thumbUrl}
            alt=""
            className="file-thumb-img"
            onError={() => setThumbFailed(true)}
          />
        ) : (
          <span className="file-thumb-fallback">
            {isVideo ? '🎬' : '📁'}
          </span>
        )}
      </div>
      <div className="file-info">
        <div className="file-name">{item.name}</div>
        {item.size != null && <div className="file-size">{formatSize(item.size)}</div>}
      </div>
    </div>
  );
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Navbar from '../components/Navbar.jsx';
import VideoPlayer from '../components/VideoPlayer.jsx';
import { saveProgress, getInitialTime } from '../utils/progress.js';

export default function Player() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, username } = useAuth();
  const { filePath, fileName, posterUrl } = location.state || {};
  const [subtitleTracks, setSubtitleTracks] = useState([]);

  const initialTime = filePath ? getInitialTime(username, filePath) : 0;

  const handleProgress = useCallback((currentTime, duration) => {
    saveProgress(username, filePath, { title: fileName, posterUrl, currentTime, duration });
  }, [username, filePath, fileName, posterUrl]);

  useEffect(() => {
    if (!filePath) { navigate('/', { replace: true }); return; }
    fetch(`/api/subtitles?path=${encodeURIComponent(filePath)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setSubtitleTracks(d.tracks ?? []))
      .catch(() => {});
  }, [filePath, token, navigate]);

  if (!filePath) return null;

  const streamUrl = `/api/stream?path=${encodeURIComponent(filePath)}&token=${encodeURIComponent(token)}`;

  return (
    <div className="player-page">
      <Navbar />
      <div className="player-content">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <h2 className="video-title">{fileName}</h2>
        <VideoPlayer
          src={streamUrl}
          subtitleTracks={subtitleTracks}
          token={token}
          initialTime={initialTime}
          onProgress={handleProgress}
        />
        {subtitleTracks.length > 0 && (
          <p className="subtitle-hint">
            {subtitleTracks.length} subtitle track{subtitleTracks.length !== 1 ? 's' : ''} available — click CC in the player
          </p>
        )}
      </div>
    </div>
  );
}

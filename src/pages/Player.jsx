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
  const { filePath, fileName, posterUrl, series, seasonNumber, episodeNumber } = location.state || {};
  const [subtitleTracks, setSubtitleTracks] = useState([]);

  const initialTime = filePath ? getInitialTime(username, filePath) : 0;

  const handleProgress = useCallback((currentTime, duration) => {
    saveProgress(username, filePath, { title: fileName, posterUrl, currentTime, duration });
  }, [username, filePath, fileName, posterUrl]);

  function findNextEpisode() {
    if (!series || seasonNumber == null || episodeNumber == null) return null;
    const seasonIdx = series.seasons.findIndex(s => s.number === seasonNumber);
    if (seasonIdx === -1) return null;
    const season = series.seasons[seasonIdx];
    const epIdx = season.episodes.findIndex(e => e.number === episodeNumber);
    if (epIdx === -1) return null;

    if (epIdx + 1 < season.episodes.length) {
      const ep = season.episodes[epIdx + 1];
      return { ep, seasonNumber: season.number };
    }
    const nextSeason = series.seasons[seasonIdx + 1];
    if (nextSeason?.episodes.length > 0) {
      return { ep: nextSeason.episodes[0], seasonNumber: nextSeason.number };
    }
    return null;
  }

  const next = findNextEpisode();
  const nextEpisode = next ? { fileName: next.ep.title } : null;

  function handlePlayNext() {
    if (!next) return;
    navigate('/player', {
      state: {
        filePath: next.ep.path,
        fileName: next.ep.title,
        posterUrl,
        series,
        seasonNumber: next.seasonNumber,
        episodeNumber: next.ep.number,
      },
    });
  }

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
          filePath={filePath}
          subtitleTracks={subtitleTracks}
          token={token}
          initialTime={initialTime}
          onProgress={handleProgress}
          nextEpisode={nextEpisode}
          onPlayNext={handlePlayNext}
          title={fileName}
          posterUrl={posterUrl}
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

import { useRef, useState, useEffect } from 'react';

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function VideoPlayer({ src, subtitleTracks = [], token = '', initialTime = 0, onProgress }) {
  const videoRef      = useRef(null);
  const containerRef  = useRef(null);
  const hideRef       = useRef(null);
  const ctRef         = useRef(0);   // currentTime without triggering re-renders
  const durRef        = useRef(0);   // duration
  const lastSavedRef  = useRef(0);   // last time we called onProgress (throttle)

  const [playing, setPlaying]           = useState(false);
  const [currentTime, setCurrentTime]   = useState(0);
  const [duration, setDuration]         = useState(0);
  const [volume, setVolume]             = useState(1);
  const [muted, setMuted]               = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen]     = useState(false);
  const [activeTrack, setActiveTrack]   = useState(-1); // -1 = off
  const [showSubMenu, setShowSubMenu]   = useState(false);

  // Sync active subtitle track with video.textTracks
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const sync = () => {
      Array.from(v.textTracks).forEach((t, i) => {
        t.mode = i === activeTrack ? 'showing' : 'hidden';
      });
    };
    sync();
    v.addEventListener('loadedmetadata', sync);
    return () => v.removeEventListener('loadedmetadata', sync);
  }, [activeTrack]);

  useEffect(() => {
    // Reset subtitle selection when video changes
    setActiveTrack(-1);
  }, [src]);

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => () => clearTimeout(hideRef.current), []);

  // Flush progress on unmount
  useEffect(() => {
    return () => {
      if (onProgress && durRef.current > 0) {
        onProgress(ctRef.current, durRef.current);
      }
    };
  }, [onProgress]);

  function revealControls() {
    setShowControls(true);
    clearTimeout(hideRef.current);
    hideRef.current = setTimeout(() => {
      if (!videoRef.current?.paused) setShowControls(false);
    }, 3000);
  }

  function togglePlay(e) {
    e.stopPropagation();
    const v = videoRef.current;
    v.paused ? v.play() : v.pause();
  }

  function handleSeek(e) {
    const rect  = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = ratio * duration;
  }

  function handleVolumeChange(e) {
    const v = parseFloat(e.target.value);
    videoRef.current.volume = v;
    videoRef.current.muted  = v === 0;
    setVolume(v);
    setMuted(v === 0);
  }

  function toggleMute() {
    const v = videoRef.current;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) containerRef.current.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  function selectTrack(index) {
    setActiveTrack(index);
    setShowSubMenu(false);
  }

  const subTrackUrl = (track) => {
    const base = `/api/subtitles/file?path=${encodeURIComponent(track.path)}&token=${encodeURIComponent(token)}`;
    return track.type === 'embedded' ? `${base}&stream=${track.streamIndex}` : base;
  };

  const effectiveVolume = muted ? 0 : volume;
  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`video-wrapper${showControls ? ' show-controls' : ''}`}
      onMouseMove={revealControls}
      onMouseLeave={() => playing && setShowControls(false)}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        className="video-element"
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          setShowControls(true);
          if (onProgress) onProgress(ctRef.current, durRef.current);
        }}
        onEnded={() => {
          setPlaying(false);
          if (onProgress) onProgress(durRef.current, durRef.current);
        }}
        onTimeUpdate={() => {
          const ct = videoRef.current.currentTime;
          ctRef.current = ct;
          setCurrentTime(ct);
          // throttle: report every 10s while playing
          if (onProgress && ct - lastSavedRef.current >= 10) {
            lastSavedRef.current = ct;
            onProgress(ct, durRef.current);
          }
        }}
        onLoadedMetadata={() => {
          const dur = videoRef.current.duration;
          durRef.current = dur;
          setDuration(dur);
          if (initialTime > 5) videoRef.current.currentTime = initialTime;
        }}
      >
        {subtitleTracks.map((track, i) => (
          <track
            key={`${track.path}-${track.streamIndex ?? 'sidecar'}`}
            kind="subtitles"
            src={subTrackUrl(track)}
            srcLang={track.lang}
            label={track.label}
          />
        ))}
      </video>

      <div className="video-controls" onClick={e => e.stopPropagation()}>
        <div className="progress-bar" onClick={handleSeek}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="controls-row">
          <button className="ctrl-btn" onClick={togglePlay}>
            {playing ? '⏸' : '▶'}
          </button>

          <span className="time-display">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <button className="ctrl-btn" onClick={toggleMute}>
            {effectiveVolume === 0 ? '🔇' : effectiveVolume < 0.5 ? '🔉' : '🔊'}
          </button>

          <input
            className="volume-slider"
            type="range" min="0" max="1" step="0.05"
            value={effectiveVolume}
            onChange={handleVolumeChange}
          />

          {subtitleTracks.length > 0 && (
            <div className="sub-control">
              <button
                className={`ctrl-btn cc-btn${activeTrack >= 0 ? ' cc-active' : ''}`}
                onClick={() => setShowSubMenu(p => !p)}
                title="Subtitles"
              >
                CC
              </button>
              {showSubMenu && (
                <div className="sub-menu">
                  <button
                    className={`sub-option${activeTrack === -1 ? ' active' : ''}`}
                    onClick={() => selectTrack(-1)}
                  >
                    Off
                  </button>
                  {subtitleTracks.map((t, i) => (
                    <button
                      key={t.path}
                      className={`sub-option${activeTrack === i ? ' active' : ''}`}
                      onClick={() => selectTrack(i)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button className="ctrl-btn" onClick={toggleFullscreen}>
            {fullscreen ? '⊡' : '⛶'}
          </button>
        </div>
      </div>
    </div>
  );
}

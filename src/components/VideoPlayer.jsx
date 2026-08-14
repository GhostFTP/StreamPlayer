import { useRef, useState, useEffect } from 'react';
import { buildPosterSrc } from '../utils/poster.js';

const QUALITY_OPTIONS = [1080, 720, 480, 360];
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function VideoPlayer({
  src, filePath = '', subtitleTracks = [], audioTracksInfo = [], knownDuration = null, token = '', initialTime = 0, onProgress,
  nextEpisode = null, onPlayNext, title = '', posterUrl = null,
}) {
  const videoRef        = useRef(null);
  const containerRef    = useRef(null);
  const hideRef         = useRef(null);
  const ctRef           = useRef(0);   // currentTime without triggering re-renders
  const durRef          = useRef(0);   // duration
  const lastSavedRef    = useRef(0);   // last time we called onProgress (throttle)
  const knownDurationRef = useRef(0);  // real duration, learned from the original (auto) stream
  const pendingSeekRef  = useRef(null); // currentTime to apply once the next src finishes loading
  const wasPlayingRef   = useRef(true); // whether the video should auto-play once loaded (true on first mount)
  const nextTriggeredRef = useRef(false); // whether the next-episode prompt already fired for this video
  const autoSubAppliedRef = useRef(false); // whether we've already decided on auto-subtitles for this video

  const [playing, setPlaying]           = useState(false);
  const [currentTime, setCurrentTime]   = useState(0);
  const [duration, setDuration]         = useState(0);
  const [volume, setVolume]             = useState(1);
  const [muted, setMuted]               = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen]     = useState(false);
  const [activeTrack, setActiveTrack]   = useState(-1); // -1 = off
  const [castKind, setCastKind]         = useState(null); // 'remote' | 'airplay' | null
  const [casting, setCasting]           = useState(false);
  const [quality, setQuality]           = useState('auto'); // 'auto' | 360 | 480 | 720 | 1080
  const [offset, setOffset]             = useState(0);       // start point (s) of the transcoded stream, in real time
  const [showNextPrompt, setShowNextPrompt]   = useState(false);
  const [nextCountdown, setNextCountdown]     = useState(8);
  const [activeMenu, setActiveMenu]     = useState(null); // 'cc' | 'quality' | 'audio' | 'speed' | 'more' | null
  const [moreView, setMoreView]         = useState('root'); // 'root' | 'audio' | 'speed' | 'quality', inside the mobile "more" menu
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioTracks, setAudioTracks]   = useState([]); // [{label}]
  const [activeAudioTrack, setActiveAudioTrack] = useState(0);
  const [pipActive, setPipActive]       = useState(false);

  const pipSupported = typeof document !== 'undefined' && document.pictureInPictureEnabled;

  const effectiveSrc = quality === 'auto'
    ? src
    : `/api/transcode?path=${encodeURIComponent(filePath)}&height=${quality}&start=${offset}&token=${encodeURIComponent(token)}`;

  // Detect Chromecast (Remote Playback API) or AirPlay support once on mount
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if ('remote' in HTMLMediaElement.prototype) {
      setCastKind('remote');
      const remote = v.remote;
      const updateState = () => setCasting(remote.state === 'connected');
      updateState();
      remote.addEventListener('connect', updateState);
      remote.addEventListener('connecting', updateState);
      remote.addEventListener('disconnect', updateState);
      return () => {
        remote.removeEventListener('connect', updateState);
        remote.removeEventListener('connecting', updateState);
        remote.removeEventListener('disconnect', updateState);
      };
    }

    if (window.WebKitPlaybackTargetAvailabilityEvent) {
      setCastKind('airplay');
      const onWireless = () => setCasting(!!v.webkitCurrentPlaybackTargetIsWireless);
      v.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', onWireless);
      return () => v.removeEventListener('webkitcurrentplaybacktargetiswirelesschanged', onWireless);
    }
  }, []);

  // Picture-in-Picture state
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onEnter = () => setPipActive(true);
    const onLeave = () => setPipActive(false);
    v.addEventListener('enterpictureinpicture', onEnter);
    v.addEventListener('leavepictureinpicture', onLeave);
    return () => {
      v.removeEventListener('enterpictureinpicture', onEnter);
      v.removeEventListener('leavepictureinpicture', onLeave);
    };
  }, []);

  // Seed/correct the known duration from ffprobe metadata (server-side, quality-independent).
  // Transcoded (non-"auto") streams are fragmented mp4 and report an unreliable video.duration,
  // so this is the only trustworthy source when the original-quality stream never loaded.
  useEffect(() => {
    if (!knownDuration || knownDuration <= 0) return;
    knownDurationRef.current = knownDuration;
    if (quality !== 'auto') {
      durRef.current = knownDuration;
      setDuration(knownDuration);
    }
  }, [knownDuration, quality]);

  // Auto-enable a Spanish subtitle track when the file's default audio isn't Spanish
  useEffect(() => {
    if (autoSubAppliedRef.current) return;
    if (!audioTracksInfo.length || !subtitleTracks.length) return;

    autoSubAppliedRef.current = true;
    const defaultAudio = audioTracksInfo.find(t => t.default) || audioTracksInfo[0];
    const audioLang = (defaultAudio?.lang || '').toLowerCase();
    const isSpanish = audioLang.startsWith('es') || audioLang.startsWith('spa');
    const isEnglish = audioLang.startsWith('en') || audioLang.startsWith('eng');
    if (isSpanish || isEnglish) return;

    const subIndex = subtitleTracks.findIndex(t => {
      const lang = (t.lang || '').toLowerCase();
      return lang.startsWith('es') || lang.startsWith('spa');
    });
    if (subIndex !== -1) setActiveTrack(subIndex);
  }, [audioTracksInfo, subtitleTracks]);

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
    // Reset all per-video state when switching to a different file (e.g. next episode)
    setActiveTrack(-1);
    setQuality('auto');
    setOffset(0);
    setShowNextPrompt(false);
    setActiveMenu(null);
    setMoreView('root');
    setAudioTracks([]);
    setActiveAudioTrack(0);
    nextTriggeredRef.current = false;
    autoSubAppliedRef.current = false;
    knownDurationRef.current = 0;
    ctRef.current = 0;
    lastSavedRef.current = 0;
    durRef.current = 0;
    pendingSeekRef.current = null;
    wasPlayingRef.current = true;
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  // Auto-advance countdown once the "next episode" prompt appears
  useEffect(() => {
    if (!showNextPrompt) return;
    setNextCountdown(8);
    const interval = setInterval(() => {
      setNextCountdown(c => {
        if (c <= 1) {
          clearInterval(interval);
          onPlayNext?.();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showNextPrompt]);

  // Mirror of the latest render's values, for handlers registered once (keyboard, Media Session)
  const latestRef = useRef({});
  latestRef.current = { quality, offset, duration, currentTime, volume, muted };

  function seekTo(target) {
    const { quality, offset, duration } = latestRef.current;
    const clamped = Math.max(0, Math.min(duration || Infinity, target));
    if (quality === 'auto') {
      videoRef.current.currentTime = clamped;
    } else {
      // No byte-range support on the transcoded pipe: "seek" by restarting
      // the ffmpeg encode from the new timestamp.
      wasPlayingRef.current = !videoRef.current.paused;
      setOffset(clamped);
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName;
      if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(tag)) return;
      const v = videoRef.current;
      if (!v) return;
      const { currentTime, volume, muted } = latestRef.current;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          v.paused ? v.play() : v.pause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekTo(currentTime - 10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekTo(currentTime + 10);
          break;
        case 'ArrowUp': {
          e.preventDefault();
          const nv = Math.min(1, (muted ? 0 : volume) + 0.05);
          v.volume = nv; v.muted = false;
          setVolume(nv); setMuted(false);
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          const nv = Math.max(0, (muted ? 0 : volume) - 0.05);
          v.volume = nv; v.muted = nv === 0;
          setVolume(nv); setMuted(nv === 0);
          break;
        }
        case 'f': case 'F':
          toggleFullscreen();
          break;
        case 'm': case 'M':
          v.muted = !v.muted;
          setMuted(v.muted);
          break;
        default:
          return;
      }
      revealControls();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Media Session: lock screen / hardware media key integration
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title || 'Nyx',
      artist: 'Nyx',
      artwork: posterUrl ? [{ src: buildPosterSrc(posterUrl, token), sizes: '512x512', type: 'image/jpeg' }] : [],
    });
  }, [title, posterUrl, token]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    ms.setActionHandler('play', () => videoRef.current?.play());
    ms.setActionHandler('pause', () => videoRef.current?.pause());
    ms.setActionHandler('seekbackward', d => seekTo(latestRef.current.currentTime - (d.seekOffset || 10)));
    ms.setActionHandler('seekforward', d => seekTo(latestRef.current.currentTime + (d.seekOffset || 10)));
    ms.setActionHandler('nexttrack', nextEpisode && onPlayNext ? () => onPlayNext() : null);
    return () => {
      ['play', 'pause', 'seekbackward', 'seekforward', 'nexttrack'].forEach(action => {
        try { ms.setActionHandler(action, null); } catch { /* unsupported action */ }
      });
    };
  }, [nextEpisode, onPlayNext]);

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
    seekTo(ratio * duration);
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

  function togglePip(e) {
    e.stopPropagation();
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
    else videoRef.current?.requestPictureInPicture?.().catch(() => {});
  }

  function selectTrack(index) {
    setActiveTrack(index);
    setActiveMenu(null);
  }

  function selectQuality(q) {
    const v = videoRef.current;
    const realTime = quality === 'auto' ? v.currentTime : offset + v.currentTime;
    wasPlayingRef.current = !v.paused;
    if (q === 'auto') {
      pendingSeekRef.current = realTime;
      setOffset(0);
    } else {
      setOffset(realTime);
    }
    setQuality(q);
    setActiveMenu(null);
  }

  function selectSpeed(rate) {
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setActiveMenu(null);
  }

  function refreshAudioTracks() {
    const v = videoRef.current;
    if (!v?.audioTracks) return;
    const list = Array.from(v.audioTracks);
    setAudioTracks(list.map((t, i) => ({ label: t.label || t.language || `Track ${i + 1}` })));
    const activeIdx = list.findIndex(t => t.enabled);
    setActiveAudioTrack(activeIdx === -1 ? 0 : activeIdx);
  }

  function selectAudioTrack(index) {
    const v = videoRef.current;
    if (v?.audioTracks) {
      Array.from(v.audioTracks).forEach((t, i) => { t.enabled = i === index; });
    }
    setActiveAudioTrack(index);
    setActiveMenu(null);
  }

  function handleCast(e) {
    e.stopPropagation();
    const v = videoRef.current;
    if (castKind === 'remote') v.remote.prompt().catch(() => {});
    else if (castKind === 'airplay') v.webkitShowPlaybackTargetPicker();
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
        src={effectiveSrc}
        className="video-element"
        onPlay={() => {
          setPlaying(true);
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        }}
        onPause={() => {
          setPlaying(false);
          setShowControls(true);
          if (onProgress) onProgress(ctRef.current, durRef.current);
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        }}
        onEnded={() => {
          setPlaying(false);
          if (onProgress) onProgress(durRef.current, durRef.current);
          if (nextEpisode && onPlayNext) onPlayNext();
        }}
        onTimeUpdate={() => {
          const ct = videoRef.current.currentTime;
          const realTime = quality === 'auto' ? ct : offset + ct;
          ctRef.current = realTime;
          setCurrentTime(realTime);
          // throttle: report every 10s while playing
          if (onProgress && realTime - lastSavedRef.current >= 10) {
            lastSavedRef.current = realTime;
            onProgress(realTime, durRef.current);
          }
          if (
            nextEpisode && !nextTriggeredRef.current &&
            durRef.current > 0 && durRef.current - realTime <= 15
          ) {
            nextTriggeredRef.current = true;
            setShowNextPrompt(true);
          }
          if ('mediaSession' in navigator && durRef.current > 0) {
            try {
              navigator.mediaSession.setPositionState({
                duration: durRef.current,
                playbackRate: videoRef.current.playbackRate,
                position: Math.min(realTime, durRef.current),
              });
            } catch { /* transient inconsistent state, ignore */ }
          }
        }}
        onLoadedMetadata={() => {
          const rawDur = videoRef.current.duration;
          if (quality === 'auto' && isFinite(rawDur) && rawDur > 0) {
            knownDurationRef.current = rawDur;
            durRef.current = rawDur;
          } else {
            durRef.current = knownDurationRef.current || rawDur || 0;
          }
          setDuration(durRef.current);
          videoRef.current.playbackRate = playbackRate;
          refreshAudioTracks();

          if (pendingSeekRef.current != null) {
            videoRef.current.currentTime = pendingSeekRef.current;
            pendingSeekRef.current = null;
          } else if (quality === 'auto' && initialTime > 5) {
            videoRef.current.currentTime = initialTime;
          }

          if (wasPlayingRef.current) {
            videoRef.current.play().catch(() => {});
            wasPlayingRef.current = false;
          }
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
                onClick={() => setActiveMenu(m => m === 'cc' ? null : 'cc')}
                title="Subtitles"
              >
                CC
              </button>
              {activeMenu === 'cc' && (
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

          {audioTracks.length > 1 && (
            <div className="quality-control hide-mobile">
              <button
                className={`ctrl-btn cc-btn${activeAudioTrack !== 0 ? ' cc-active' : ''}`}
                onClick={() => setActiveMenu(m => m === 'audio' ? null : 'audio')}
                title="Audio track"
              >
                Audio
              </button>
              {activeMenu === 'audio' && (
                <div className="sub-menu">
                  {audioTracks.map((t, i) => (
                    <button
                      key={i}
                      className={`sub-option${activeAudioTrack === i ? ' active' : ''}`}
                      onClick={() => selectAudioTrack(i)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="quality-control hide-mobile">
            <button
              className={`ctrl-btn cc-btn${playbackRate !== 1 ? ' cc-active' : ''}`}
              onClick={() => setActiveMenu(m => m === 'speed' ? null : 'speed')}
              title="Playback speed"
            >
              {playbackRate}x
            </button>
            {activeMenu === 'speed' && (
              <div className="sub-menu">
                {SPEED_OPTIONS.map(rate => (
                  <button
                    key={rate}
                    className={`sub-option${playbackRate === rate ? ' active' : ''}`}
                    onClick={() => selectSpeed(rate)}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="quality-control hide-mobile">
            <button
              className={`ctrl-btn cc-btn${quality !== 'auto' ? ' cc-active' : ''}`}
              onClick={() => setActiveMenu(m => m === 'quality' ? null : 'quality')}
              title="Quality"
            >
              {quality === 'auto' ? 'Auto' : `${quality}p`}
            </button>
            {activeMenu === 'quality' && (
              <div className="sub-menu">
                <button
                  className={`sub-option${quality === 'auto' ? ' active' : ''}`}
                  onClick={() => selectQuality('auto')}
                >
                  Auto
                </button>
                {QUALITY_OPTIONS.map(h => (
                  <button
                    key={h}
                    className={`sub-option${quality === h ? ' active' : ''}`}
                    onClick={() => selectQuality(h)}
                  >
                    {h}p
                  </button>
                ))}
              </div>
            )}
          </div>

          {castKind && (
            <button
              className={`ctrl-btn cast-btn hide-mobile${casting ? ' cast-active' : ''}`}
              onClick={handleCast}
              title={castKind === 'airplay' ? 'AirPlay' : 'Cast'}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M2 16.1A5 5 0 0 1 5.9 20" />
                <path d="M2 12.05A9 9 0 0 1 9.95 20" />
                <path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
                <line x1="2" y1="20" x2="2.01" y2="20" />
              </svg>
            </button>
          )}

          {pipSupported && (
            <button
              className={`ctrl-btn pip-btn hide-mobile${pipActive ? ' cast-active' : ''}`}
              onClick={togglePip}
              title="Picture-in-Picture"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <rect x="12" y="12" width="8" height="6" rx="1" fill="currentColor" />
              </svg>
            </button>
          )}

          <div className="quality-control more-control">
            <button
              className="ctrl-btn more-btn"
              onClick={() => { setActiveMenu(m => m === 'more' ? null : 'more'); setMoreView('root'); }}
              title="More options"
            >
              ⋮
            </button>
            {activeMenu === 'more' && (
              <div className="sub-menu">
                {moreView === 'root' && (
                  <>
                    {audioTracks.length > 1 && (
                      <button className="sub-option" onClick={() => setMoreView('audio')}>
                        Audio: {audioTracks[activeAudioTrack]?.label} ›
                      </button>
                    )}
                    <button className="sub-option" onClick={() => setMoreView('speed')}>
                      Speed: {playbackRate}x ›
                    </button>
                    <button className="sub-option" onClick={() => setMoreView('quality')}>
                      Quality: {quality === 'auto' ? 'Auto' : `${quality}p`} ›
                    </button>
                    {castKind && (
                      <button className="sub-option" onClick={e => { handleCast(e); setActiveMenu(null); }}>
                        {castKind === 'airplay' ? 'AirPlay' : 'Cast'}
                      </button>
                    )}
                    {pipSupported && (
                      <button className="sub-option" onClick={e => { togglePip(e); setActiveMenu(null); }}>
                        Picture-in-Picture
                      </button>
                    )}
                  </>
                )}
                {moreView === 'audio' && (
                  <>
                    <button className="sub-option more-back" onClick={() => setMoreView('root')}>‹ Back</button>
                    {audioTracks.map((t, i) => (
                      <button
                        key={i}
                        className={`sub-option${activeAudioTrack === i ? ' active' : ''}`}
                        onClick={() => selectAudioTrack(i)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </>
                )}
                {moreView === 'speed' && (
                  <>
                    <button className="sub-option more-back" onClick={() => setMoreView('root')}>‹ Back</button>
                    {SPEED_OPTIONS.map(rate => (
                      <button
                        key={rate}
                        className={`sub-option${playbackRate === rate ? ' active' : ''}`}
                        onClick={() => selectSpeed(rate)}
                      >
                        {rate}x
                      </button>
                    ))}
                  </>
                )}
                {moreView === 'quality' && (
                  <>
                    <button className="sub-option more-back" onClick={() => setMoreView('root')}>‹ Back</button>
                    <button
                      className={`sub-option${quality === 'auto' ? ' active' : ''}`}
                      onClick={() => selectQuality('auto')}
                    >
                      Auto
                    </button>
                    {QUALITY_OPTIONS.map(h => (
                      <button
                        key={h}
                        className={`sub-option${quality === h ? ' active' : ''}`}
                        onClick={() => selectQuality(h)}
                      >
                        {h}p
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          <button className="ctrl-btn" onClick={toggleFullscreen}>
            {fullscreen ? '⊡' : '⛶'}
          </button>
        </div>
      </div>

      {showNextPrompt && nextEpisode && (
        <div className="next-episode-overlay" onClick={e => e.stopPropagation()}>
          <div className="next-episode-card">
            <div className="next-episode-label">Next episode in {nextCountdown}s</div>
            <div className="next-episode-title">{nextEpisode.fileName}</div>
            <div className="next-episode-actions">
              <button className="next-episode-cancel" onClick={() => setShowNextPrompt(false)}>
                Cancel
              </button>
              <button className="next-episode-play" onClick={() => onPlayNext?.()}>
                ▶ Play Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

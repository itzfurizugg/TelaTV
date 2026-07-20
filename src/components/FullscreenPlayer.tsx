import { useRef, useState, useEffect, useCallback } from 'react';
import { useHlsPlayer } from '../hooks/useHlsPlayer';
import type { Channel } from '../types/channel';

interface FullscreenPlayerProps {
  channel: Channel;
  onBack: () => void;
}

function getProxiedUrl(url: string, needsProxy?: boolean): string {
  const proxyUrl = import.meta.env.VITE_CORS_PROXY_URL as string | undefined;
  if (!proxyUrl || !needsProxy) return url;
  const encoded = encodeURIComponent(url);
  const origin = encodeURIComponent(new URL(url).origin);
  return `${proxyUrl}?url=${encoded}&referer=${origin}`;
}

export default function FullscreenPlayer({ channel, onBack }: FullscreenPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { status, loadSource, togglePlay, setVolume, destroy } = useHlsPlayer(videoRef);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const url = getProxiedUrl(channel.streamUrl, channel.needsProxy);
    loadSource(url);
    return () => destroy();
  }, [channel.streamUrl, channel.needsProxy, loadSource, destroy]);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenEnabled) {
      console.warn('Fullscreen API is not enabled in this browser.');
      return;
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      container.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const resetControlsTimer = useCallback(() => {
    if (controlsTimeout) clearTimeout(controlsTimeout);
    setShowControls(true);
    const t = setTimeout(() => {
      if (!status.isBuffering) setShowControls(false);
    }, 4000);
    setControlsTimeout(t);
  }, [controlsTimeout, status.isBuffering]);

  useEffect(() => {
    const handler = () => resetControlsTimer();
    window.addEventListener('mousemove', handler);
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('mousemove', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [resetControlsTimer]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'q') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        onBack();
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setVolume(Math.min(1, status.volume + 0.1));
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setVolume(Math.max(0, status.volume - 0.1));
      }
      if (e.key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onBack, togglePlay, setVolume, status.volume, toggleFullscreen]);

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleRetry = useCallback(() => {
    const url = getProxiedUrl(channel.streamUrl, channel.needsProxy);
    loadSource(url);
  }, [channel.streamUrl, channel.needsProxy, loadSource]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        autoPlay
      />

      {status.isBuffering && !status.error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white animate-spin" />
        </div>
      )}

      {status.error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 pointer-events-none">
          <div className="bg-white/10 px-8 py-4 text-white text-lg font-medium backdrop-blur-sm border border-white/20">
            {status.error}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRetry();
            }}
            className="pointer-events-auto border-2 border-white px-8 py-3 text-white font-semibold uppercase tracking-wider text-sm hover:bg-white/10 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      )}

      <div
        className={`
          absolute inset-0 transition-opacity duration-300 pointer-events-none
          ${showControls ? 'opacity-100' : 'opacity-0'}
        `}
        style={{ pointerEvents: showControls ? 'auto' : 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            }
            onBack();
          }}
          className="absolute top-6 left-6 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-200 text-white border border-white/20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center">
          <h2 className="text-2xl font-bold text-white drop-shadow-lg">{channel.name}</h2>
          <p className="text-sm text-white/60 mt-1">{channel.category}</p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen();
          }}
          className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-200 text-white border border-white/20"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div
            className="flex items-center gap-3 bg-black/70 backdrop-blur-md px-4 py-2.5 border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                const video = videoRef.current;
                if (video) video.currentTime = Math.max(0, video.currentTime - 10);
              }}
              className="p-2 hover:bg-white/10 text-white transition-all"
              aria-label="Mundur 10 detik"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.5 8C9.85 8 7.45 9.01 5.6 10.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
              </svg>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="p-2.5 bg-white/15 hover:bg-white/25 text-white transition-all"
              aria-label={status.isPlaying ? 'Jeda' : 'Putar'}
            >
              {status.isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                const video = videoRef.current;
                if (video) video.currentTime = Math.min(status.duration, video.currentTime + 10);
              }}
              className="p-2 hover:bg-white/10 text-white transition-all"
              aria-label="Maju 10 detik"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.5 8C14.15 8 16.55 9.01 18.4 10.6L22 7v9h-9l3.62-3.62c-1.39-1.16-3.16-1.88-5.12-1.88-3.54 0-6.55 2.31-7.6 5.5L1.53 15.24C2.92 11.03 6.85 8 11.5 8z"/>
              </svg>
            </button>

            <span className="text-xs text-white/70 tabular-nums whitespace-nowrap">
              {formatTime(status.currentTime)} / {formatTime(status.duration)}
            </span>

            <div className="w-28 h-1 bg-white/20 overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-200"
                style={{
                  width: status.duration ? `${(status.currentTime / status.duration) * 100}%` : '0%',
                }}
              />
            </div>

            <div className="w-px h-5 bg-white/15 mx-1" />

            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white/60 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={status.volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              onClick={(e) => e.stopPropagation()}
              className="w-16 accent-white h-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

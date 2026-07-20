import { useRef, useState, useEffect, useCallback } from 'react';
import Hls from 'hls.js';

export interface PlayerStatus {
  isPlaying: boolean;
  isBuffering: boolean;
  error: string | null;
  duration: number;
  currentTime: number;
  volume: number;
}

const MAX_RETRIES = 3;

export function useHlsPlayer(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const hlsRef = useRef<Hls | null>(null);
  const retryCountRef = useRef(0);
  const [status, setStatus] = useState<PlayerStatus>({
    isPlaying: false,
    isBuffering: false,
    error: null,
    duration: 0,
    currentTime: 0,
    volume: 1,
  });

  const destroy = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    retryCountRef.current = 0;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    setStatus({
      isPlaying: false,
      isBuffering: false,
      error: null,
      duration: 0,
      currentTime: 0,
      volume: 1,
    });
  }, [videoRef]);

  const loadSource = useCallback((url: string) => {
    destroy();
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        startFragPrefetch: true,
      });

      hlsRef.current = hls;

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        retryCountRef.current = 0;
        video.muted = false;
        video.play().catch(() => {
          // Autoplay blocked - try muted then unmute on first interaction
          video.muted = true;
          video.play().then(() => {
            const unmute = () => {
              video.muted = false;
              video.removeEventListener('click', unmute);
              video.removeEventListener('keydown', unmute);
            };
            video.addEventListener('click', unmute, { once: true });
            video.addEventListener('keydown', unmute, { once: true });
          }).catch(() => {});
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (retryCountRef.current < MAX_RETRIES) {
                retryCountRef.current++;
                hls.startLoad();
              } else {
                setStatus(s => ({
                  ...s,
                  error: 'Stream unavailable — the channel may be offline or geo-blocked.',
                }));
                destroy();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              if (retryCountRef.current < MAX_RETRIES) {
                retryCountRef.current++;
                hls.recoverMediaError();
              } else {
                setStatus(s => ({
                  ...s,
                  error: 'Stream format error — the channel source may be corrupted.',
                }));
                destroy();
              }
              break;
            default:
              setStatus(s => ({
                ...s,
                error: 'Stream playback failed — try another channel.',
              }));
              destroy();
              break;
          }
        }
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        setStatus(s => ({ ...s, isBuffering: false }));
      });

      hls.on(Hls.Events.FRAG_LOADING, () => {
        setStatus(s => ({ ...s, isBuffering: true }));
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.muted = false;
      video.play().catch(() => {
        video.muted = true;
        video.play().then(() => {
          const unmute = () => {
            video.muted = false;
            video.removeEventListener('click', unmute);
            video.removeEventListener('keydown', unmute);
          };
          video.addEventListener('click', unmute, { once: true });
          video.addEventListener('keydown', unmute, { once: true });
        }).catch(() => {});
      });
    } else {
      setStatus(s => ({
        ...s,
        error: 'HLS streaming is not supported in this browser.',
      }));
    }
  }, [videoRef, destroy]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setStatus(s => ({ ...s, isPlaying: true, error: null }));
    const onPause = () => setStatus(s => ({ ...s, isPlaying: false }));
    const onWaiting = () => setStatus(s => ({ ...s, isBuffering: true }));
    const onPlaying = () => setStatus(s => ({ ...s, isBuffering: false }));
    const onTimeUpdate = () => setStatus(s => ({
      ...s,
      currentTime: video.currentTime,
      duration: video.duration || 0,
    }));
    const onError = () => setStatus(s => ({
      ...s,
      error: 'Channel failed to load — it may be offline or geo-blocked.',
      isBuffering: false,
    }));

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('error', onError);
    };
  }, [videoRef]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }, [videoRef]);

  const setVolume = useCallback((vol: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = vol;
    setStatus(s => ({ ...s, volume: vol }));
  }, [videoRef]);

  return {
    status,
    loadSource,
    togglePlay,
    setVolume,
    destroy,
  };
}

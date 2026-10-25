import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import {
  getAudioFromCache,
  cacheAudioFromUrl,
  extractSessionAudioKey,
} from "../utils/audioCache";
import "./AudioPlayer.css";

function formatTime(seconds) {
  if (
    seconds === null ||
    seconds === undefined ||
    isNaN(seconds) ||
    !isFinite(seconds) ||
    seconds < 0
  ) {
    return "0:00";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function AudioPlayer({
  src,
  className = "",
  id,
  initialDuration,
  cacheKey: explicitCacheKey,
}) {
  const audioRef = useRef(null);
  const blobUrlRef = useRef(null);
  const [effectiveSrc, setEffectiveSrc] = useState(src);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(() => {
    return initialDuration && isFinite(initialDuration) && Number(initialDuration) > 0
      ? Number(initialDuration)
      : 0;
  });
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Pause other players on this page when one starts
  useEffect(() => {
    const handlePauseAll = (e) => {
      if (e.detail?.keepId && e.detail.keepId === id) return;
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };

    window.addEventListener("pause-all-audio", handlePauseAll);
    return () => {
      window.removeEventListener("pause-all-audio", handlePauseAll);
    };
  }, [id]);

  // Check local cache (IndexedDB) first before fetching from R2
  useEffect(() => {
    let isMounted = true;
    const resolvedKey = explicitCacheKey || extractSessionAudioKey(src);

    async function resolveSource() {
      // If already a local blob URL, use directly
      if (src && src.startsWith("blob:")) {
        if (blobUrlRef.current && blobUrlRef.current !== src) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
        setEffectiveSrc(src);
        return;
      }

      // Check if local cache has this audio
      if (resolvedKey) {
        try {
          const cachedBlob = await getAudioFromCache(resolvedKey);
          if (cachedBlob && isMounted) {
            if (blobUrlRef.current) {
              URL.revokeObjectURL(blobUrlRef.current);
            }
            const localBlobUrl = URL.createObjectURL(cachedBlob);
            blobUrlRef.current = localBlobUrl;
            setEffectiveSrc(localBlobUrl);
            return;
          }
        } catch (err) {
          console.warn("Audio cache read error:", err);
        }
      }

      // Not cached locally yet; fallback to remote source
      if (isMounted) {
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
        setEffectiveSrc(src);
      }

      // Pre-cache remote audio in background for instant playback on revisit
      if (resolvedKey && src && src.startsWith("http")) {
        cacheAudioFromUrl(src, resolvedKey).catch(() => {});
      }
    }

    resolveSource();

    return () => {
      isMounted = false;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [src, explicitCacheKey]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (initialDuration && isFinite(initialDuration) && Number(initialDuration) > 0) {
      setDuration(Number(initialDuration));
    } else {
      setDuration(0);
    }
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      if (effectiveSrc) {
        audioRef.current.load();
      }
    }
  }, [effectiveSrc, initialDuration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // If audio has ended or position is invalid / beyond duration, restart from 0
      if (
        audio.ended ||
        !isFinite(audio.currentTime) ||
        (duration > 0 && audio.currentTime >= duration)
      ) {
        audio.currentTime = 0;
        setCurrentTime(0);
      }
      window.dispatchEvent(
        new CustomEvent("pause-all-audio", { detail: { keepId: id } })
      );
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error("Audio playback error:", err);
          setIsPlaying(false);
        });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime;
      if (isFinite(cur)) {
        setCurrentTime(cur);
        if (cur > duration) {
          setDuration(cur);
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const d = audioRef.current.duration;
    if (d && isFinite(d) && !isNaN(d) && d > 0) {
      setDuration(d);
    } else if (initialDuration && isFinite(initialDuration) && Number(initialDuration) > 0) {
      setDuration(Number(initialDuration));
    }
  };

  const handleDurationChange = () => {
    if (audioRef.current) {
      const d = audioRef.current.duration;
      if (d && isFinite(d) && !isNaN(d) && d > 0) {
        setDuration(d);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      if ((!duration || !isFinite(duration) || duration <= 0) && isFinite(audioRef.current.currentTime) && audioRef.current.currentTime > 0) {
        setDuration(audioRef.current.currentTime);
      }
      audioRef.current.currentTime = 0;
    }
    setCurrentTime(0);
  };

  const handleSeek = (e) => {
    const newTime = Number(e.target.value);
    if (audioRef.current && isFinite(newTime)) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e) => {
    const val = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.volume = val;
      setVolume(val);
      setIsMuted(val === 0);
    }
  };

  const maxDuration =
    duration && isFinite(duration) && duration > 0
      ? duration
      : (currentTime > 0 ? currentTime : 100);

  return (
    <div className={`hmr-audio-player ${className}`}>
      <audio
        ref={audioRef}
        src={effectiveSrc}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleDurationChange}
        onEnded={handleEnded}
        onError={async () => {
          const resolvedKey = explicitCacheKey || extractSessionAudioKey(src);
          // If remote R2 audio failed or is not ready, attempt fallback to local cache
          if (effectiveSrc && !effectiveSrc.startsWith("blob:") && resolvedKey) {
            try {
              const cachedBlob = await getAudioFromCache(resolvedKey);
              if (cachedBlob) {
                if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
                const localBlobUrl = URL.createObjectURL(cachedBlob);
                blobUrlRef.current = localBlobUrl;
                setEffectiveSrc(localBlobUrl);
                return;
              }
            } catch (err) {
              console.warn("Local audio fallback failed:", err);
            }
          } else if (effectiveSrc && effectiveSrc.startsWith("blob:") && src && effectiveSrc !== src) {
            // If local blob URL failed, attempt fallback to remote R2
            setEffectiveSrc(src);
            return;
          }
          console.error("Audio error on element:", audioRef.current?.error);
          setIsPlaying(false);
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      <button
        type="button"
        className="hmr-audio-play-btn"
        onClick={togglePlay}
        title={isPlaying ? "Pause" : "Play"}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: 2 }} />}
      </button>

      <span className="hmr-audio-time">{formatTime(currentTime)}</span>

      <div className="hmr-audio-slider-wrap">
        <input
          type="range"
          min="0"
          max={maxDuration}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          className="hmr-audio-slider"
          aria-label="Seek audio"
        />
      </div>

      <span className="hmr-audio-time">
        {duration && isFinite(duration) && duration > 0
          ? formatTime(duration)
          : (currentTime > 0 ? formatTime(currentTime) : "0:00")}
      </span>

      <div className="hmr-audio-vol-wrap">
        <button
          type="button"
          className="hmr-audio-vol-btn"
          onClick={toggleMute}
          title={isMuted ? "Unmute" : "Mute"}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="hmr-audio-vol-slider"
          aria-label="Volume"
        />
      </div>
    </div>
  );
}

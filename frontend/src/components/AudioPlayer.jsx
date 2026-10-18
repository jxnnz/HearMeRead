import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
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

export default function AudioPlayer({ src, className = "", id, initialDuration }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(() => {
    return initialDuration && isFinite(initialDuration) && initialDuration > 0
      ? initialDuration
      : 0;
  });
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

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

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (initialDuration && isFinite(initialDuration) && initialDuration > 0) {
      setDuration(initialDuration);
    } else {
      setDuration(0);
    }
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, [src, initialDuration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
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
        });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime;
      setCurrentTime(cur);
      if (isFinite(cur) && cur > duration) {
        setDuration(cur);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const d = audioRef.current.duration;
    if (d && isFinite(d) && !isNaN(d) && d > 0) {
      setDuration(d);
    } else if (d === Infinity || !isFinite(d)) {
      // Chrome WebM fix: seek to end to trigger duration calculation
      const audio = audioRef.current;
      audio.currentTime = 1e101;
      audio.ontimeupdate = function () {
        this.ontimeupdate = null;
        audio.currentTime = 0;
        if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
        }
      };
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
    setCurrentTime(0);
  };

  const handleSeek = (e) => {
    const newTime = Number(e.target.value);
    if (audioRef.current) {
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
      : Math.max(100, currentTime);

  return (
    <div className={`hmr-audio-player ${className}`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleDurationChange}
        onEnded={handleEnded}
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
          : formatTime(currentTime)}
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

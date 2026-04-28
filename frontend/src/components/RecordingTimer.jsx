import { Play, Square } from "lucide-react";
import "./RecordingTimer.css";

export default function RecordingTimer({
  recordingTime,
  isRecording,
  onStop,
}) {
  const minutes = Math.floor(recordingTime / 60);
  const seconds = recordingTime % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="rt-container">
      <div className="rt-indicator">
        <div className={`rt-mic-btn ${isRecording ? "rt-mic-btn--recording" : "rt-mic-btn--ready"}`}>
          {isRecording ? <Play size={24} /> : null}
        </div>
      </div>
      
      <div className="rt-info">
        <p className="rt-label">
          {isRecording ? "Live recording active…" : "Ready to record"}
        </p>
        {isRecording && (
          <span className="rt-timer">{timeString}</span>
        )}
      </div>

      <div className="rt-controls">
        {isRecording ? (
          <button className="rt-stop-btn" onClick={onStop}>
            <Square size={11} />
            Stop
          </button>
        ) : null}
      </div>
    </div>
  );
}
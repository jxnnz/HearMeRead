import { useState, useEffect } from "react";
import { ChevronRight, Volume2 } from "lucide-react";
import TranscriptionWarningBanner from "../../components/TranscriptionWarningBanner";

/**
 * Editable transcription preview shown after every recording.
 *
 * Props:
 *   badge          — step label string (e.g. "Assessment 1 — Gawain 1")
 *   transcript     — initial transcript text from Whisper
 *   words          — array of { word, start, end } from Whisper (optional, for A2 highlight)
 *   timeLimitSec   — grade-level time limit in seconds; null/undefined for A1 (no highlight)
 *   onConfirm(text)— called with the (possibly edited) transcript when teacher confirms
 */
export default function TranscriptionPreviewStep({
  badge,
  transcript,
  words,
  timeLimitSec,
  audioFile,
  onConfirm,
}) {
  const [edited, setEdited] = useState(transcript ?? "");
  const [audioUrl, setAudioUrl] = useState(null);

  useEffect(() => {
    if (!audioFile) return;
    const url = URL.createObjectURL(audioFile);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioFile]);

  // Find the index of the last word spoken within the time limit (A2 only)
  const cutoffIdx = timeLimitSec != null && words?.length
    ? (() => {
        let last = -1;
        words.forEach((w, i) => {
          if ((w.start ?? 0) <= timeLimitSec) last = i;
        });
        return last;
      })()
    : -1;

  // Build highlighted word spans for read-only preview (A2 only)
  const showHighlight = cutoffIdx >= 0 && words?.length > 0;

  return (
    <div className="asp-page">
      <div className="asp-preview-card">
        <span className="asp-reading-badge">{badge}</span>
        <h2 className="asp-preview-card__title">Transcription Preview</h2>

        <TranscriptionWarningBanner />

        {/* Audio playback preview */}
        {audioUrl && (
          <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px", background: "#f4f6fb", padding: "12px", borderRadius: "8px", border: "1px solid #c8d0e4" }}>
            <Volume2 size={16} style={{ color: "#2c7fc1" }} />
            <audio controls src={audioUrl} style={{ flex: 1, height: "32px" }} />
          </div>
        )}

        {/* Highlighted word view — A2 only, shows cutoff word in blue */}
        {showHighlight && (
          <div className="asp-preview-highlight-wrap">
            <p className="asp-preview-highlight-label">
              Words up to the time limit are shown below. The{" "}
              <span style={{ color: "#2c7fc1", fontWeight: 600 }}>blue word</span>{" "}
              is the last word read within the limit.
            </p>
            <div className="asp-preview-highlight-text">
              {words.map((w, i) => (
                <span
                  key={i}
                  className={
                    i === cutoffIdx
                      ? "asp-preview-word asp-preview-word--cutoff"
                      : i < cutoffIdx
                      ? "asp-preview-word"
                      : "asp-preview-word asp-preview-word--past"
                  }
                >
                  {w.word}{" "}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Editable textarea */}
        <div className="asp-preview-edit-wrap">
          <label className="asp-preview-edit-label">
            Edit transcription if needed:
          </label>
          <textarea
            className="asp-preview-textarea"
            value={edited}
            onChange={(e) => setEdited(e.target.value)}
            rows={6}
            spellCheck={false}
          />
        </div>

        <button
          className="asp-continue-btn"
          onClick={() => onConfirm(edited)}
          disabled={!edited.trim()}
        >
          Confirm Transcription <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

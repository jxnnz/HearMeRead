import { useState, useEffect } from "react";
import { ChevronRight, Volume2, Pencil, RotateCcw, Upload } from "lucide-react";
import EditTranscriptionModal from "../../modals/EditTranscriptionModal";

function alignWords(refText, transText) {
  const strip = (w) => w.toLowerCase().replace(/[^a-z0-9]/gi, "");
  const ref   = refText.trim().split(/\s+/).filter(Boolean);
  const trans = transText.trim().split(/\s+/).filter(Boolean);

  if (!ref.length) return trans.map((w) => ({ word: w, correct: true,  source: "extra"  }));
  if (!trans.length) return ref.map((w)  => ({ word: w, correct: false, source: "missed" }));

  const m = ref.length;
  const n = trans.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = strip(ref[i - 1]) === strip(trans[j - 1])
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const result = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && strip(ref[i - 1]) === strip(trans[j - 1])) {
      result.unshift({ word: trans[j - 1], correct: true,  source: "match"  });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ word: trans[j - 1], correct: false, source: "extra"  });
      j--;
    } else {
      result.unshift({ word: ref[i - 1],  correct: false, source: "missed" });
      i--;
    }
  }
  return result;
}

function fmtTime(secs) {
  if (!secs && secs !== 0) return "—";
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

export default function TranscriptionPreviewStep({
  badge,
  transcript,
  referenceText,
  words,
  timeLimitSec,
  audioFile,
  recordingTime,
  recordingMode,
  onRetakeRecording,
  onConfirm,
}) {
  const [edited, setEdited] = useState(transcript ?? "");
  const [audioUrl, setAudioUrl] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (!audioFile) return;
    const url = URL.createObjectURL(audioFile);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioFile]);

  const cutoffIdx = timeLimitSec != null && words?.length
    ? (() => {
        let last = -1;
        words.forEach((w, i) => { if ((w.start ?? 0) <= timeLimitSec) last = i; });
        return last;
      })()
    : -1;

  const showHighlight = cutoffIdx >= 0 && words?.length > 0;

  const aligned = referenceText
    ? alignWords(referenceText, edited)
    : edited.trim().split(/\s+/).filter(Boolean).map((w) => ({ word: w, correct: true, source: "match" }));

  const totalRefWords = referenceText
    ? referenceText.trim().split(/\s+/).filter(Boolean).length
    : aligned.length;
  const correctCount = aligned.filter((a) => a.correct).length;
  const wrongCount   = totalRefWords - correctCount;

  // Only show transcript words (matches + extras); missed reference words are
  // already captured in the wrong count and would confuse the edit modal comparison.
  const displayWords = aligned
    .filter((a) => a.source !== "missed")
    .map((a, tIdx) => ({
      ...a,
      isCutoff:    showHighlight && tIdx === cutoffIdx,
      isPastLimit: showHighlight && tIdx > cutoffIdx,
    }));

  const stats = [
    { label: "Total Words", value: totalRefWords,                     color: "#1a2340" },
    { label: "Correct",     value: `${correctCount}/${totalRefWords}`, color: "#27ae60" },
    { label: "Wrong",       value: wrongCount,                        color: "#c0392b" },
    { label: "Time",        value: fmtTime(recordingTime),            color: "#2c7fc1" },
  ];

  return (
    <div className="asp-page">
      <div className="asp-preview-card">
        <span className="asp-reading-badge">{badge}</span>

        {/* Title row + Retake button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 className="asp-preview-card__title" style={{ margin: 0 }}>Transcription Preview</h2>
          {onRetakeRecording && (
            <button className="asp-retake-btn" onClick={onRetakeRecording}>
              {recordingMode === "upload" ? <Upload size={14} /> : <RotateCcw size={14} />}
              {recordingMode === "upload" ? "Re-upload" : "Retake"}
            </button>
          )}
        </div>

        {/* Audio player */}
        {audioUrl && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#f4f6fb", padding: "12px", borderRadius: "8px", border: "1px solid #c8d0e4" }}>
            <Volume2 size={16} style={{ color: "#2c7fc1", flexShrink: 0 }} />
            <audio controls src={audioUrl} style={{ flex: 1, height: "32px" }} />
          </div>
        )}

        {/* Stat chips */}
        <div className="asp-preview-stats">
          {stats.map((s) => (
            <div key={s.label} className="asp-preview-stat">
              <span className="asp-preview-stat__value" style={{ color: s.color }}>{s.value}</span>
              <span className="asp-preview-stat__label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Original passage reference */}
        {referenceText && (
          <div className="asp-preview-passage">
            <div className="asp-preview-passage__header">
              <span className="asp-preview-passage__label">Original Passage</span>
              <span className="asp-preview-passage__hint">Reference text read by the student</span>
            </div>
            <p className="asp-preview-passage__text">{referenceText}</p>
          </div>
        )}

        {/* Color-coded transcription — cutoff highlighting merged in */}
        <div className="asp-preview-edit-wrap">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <span className="asp-preview-edit-label" style={{ marginBottom: 0 }}>Transcription:</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {referenceText && (
                <span style={{ display: "flex", gap: "10px", fontSize: "11px", fontWeight: 600, fontFamily: "Poppins, sans-serif", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <span style={{ color: "#1a2340" }}>● Correct</span>
                  <span style={{ color: "#c0392b" }}>● Wrong</span>
                  {showHighlight && <span style={{ color: "#2c7fc1" }}>● Last in Limit</span>}
                </span>
              )}
              <button className="asp-edit-btn" onClick={() => setShowEditModal(true)} title="Edit transcription">
                <Pencil size={15} />
              </button>
            </div>
          </div>

          {displayWords.length > 0 ? (
            <div className="asp-word-highlight__text" style={{ borderRadius: "10px" }}>
              {displayWords.map((a, i) => {
                let color, fontWeight, background, borderRadius, padding;
                if (a.isCutoff) {
                  color = "#2c7fc1"; fontWeight = 700;
                  background = "#d6ecfb"; borderRadius = "3px"; padding = "0 3px";
                } else if (a.correct) {
                  color = "#1a2340";
                } else {
                  color = "#c0392b"; fontWeight = 600;
                }
                return (
                  <span key={i} style={{ color, fontWeight, background, borderRadius, padding }}>
                    {a.word}{" "}
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="asp-word-highlight__text" style={{ borderRadius: "10px", color: "#b8bdd4", fontStyle: "italic" }}>
              No transcription yet.
            </div>
          )}
        </div>

        <button
          className="asp-continue-btn"
          onClick={() => onConfirm(edited)}
          disabled={!edited.trim()}
        >
          Proceed <ChevronRight size={16} />
        </button>
      </div>

      <EditTranscriptionModal
        isOpen={showEditModal}
        transcript={edited}
        onSave={(text) => setEdited(text)}
        onClose={() => setShowEditModal(false)}
      />
    </div>
  );
}

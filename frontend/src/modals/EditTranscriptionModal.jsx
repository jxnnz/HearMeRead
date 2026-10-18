import { useState, useEffect } from "react";
import { Headphones } from "lucide-react";
import AudioPlayer from "../components/AudioPlayer";
import "./EditTranscriptionModal.css";

export default function EditTranscriptionModal({
  isOpen,
  title = "Edit Transcription",
  description = "Review and correct the transcribed words. When saved, fluency metrics and alignments will be recalculated automatically.",
  transcript,
  audioUrl,
  saving = false,
  onSave,
  onClose,
}) {
  const [text, setText] = useState(transcript ?? "");

  useEffect(() => {
    if (isOpen) {
      setText(transcript ?? "");
    } else {
      window.dispatchEvent(new CustomEvent("pause-all-audio"));
    }
  }, [isOpen, transcript]);

  if (!isOpen) return null;

  function handleClose() {
    window.dispatchEvent(new CustomEvent("pause-all-audio"));
    onClose();
  }

  function handleSave() {
    window.dispatchEvent(new CustomEvent("pause-all-audio"));
    onSave(text);
  }

  return (
    <div className="etm-overlay" onClick={saving ? undefined : handleClose}>
      <div className="etm-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="etm-title">{title}</h3>
        {description && (
          <p style={{ margin: "-8px 0 0", fontSize: "12.5px", color: "#64748b", lineHeight: 1.5 }}>
            {description}
          </p>
        )}
        {audioUrl && (
          <div className="etm-audio-container">
            <div className="etm-audio-label">
              <Headphones size={15} style={{ color: "#2c3e6b" }} />
              <span>Audio Recording Preview</span>
            </div>
            <AudioPlayer src={audioUrl} id="modal-audio-player" />
          </div>
        )}
        <textarea
          className="etm-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          spellCheck={false}
          autoFocus
          disabled={saving}
        />
        <div className="etm-actions">
          <button
            type="button"
            className="etm-btn etm-btn--cancel"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="etm-btn etm-btn--save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

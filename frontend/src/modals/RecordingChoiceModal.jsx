import { useEffect } from "react";
import { X, Upload, Mic } from "lucide-react";
import "./RecordingChoiceModal.css";

export default function RecordingChoiceModal({
  isOpen,
  onClose,
  onUpload,
  onLive,
}) {
  // ── Close on Escape key ──────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // ── Prevent body scroll when open ───────────────────────
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="rcm-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Choose recording method"
    >
      <div
        className="rcm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="rcm-header">
          <div className="rcm-header__text">
            <h2 className="rcm-title">Start Assessment</h2>
            <p className="rcm-subtitle">
              How would you like to record the student's reading?
            </p>
          </div>
          <button
            className="rcm-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Choice cards ── */}
        <div className="rcm-choices">

          {/* Upload Audio */}
          <button
            className="rcm-choice rcm-choice--upload"
            onClick={() => { onUpload(); onClose(); }}
          >
            <div className="rcm-choice__icon-wrap rcm-choice__icon-wrap--upload">
              <Upload size={28} />
            </div>
            <div className="rcm-choice__body">
              <span className="rcm-choice__title">Upload Audio</span>
              <span className="rcm-choice__desc">
                Upload a pre-recorded audio file of the student reading
                (.mp3, .wav, .m4a)
              </span>
            </div>
            <div className="rcm-choice__arrow">→</div>
          </button>

          {/* Divider */}
          <div className="rcm-divider">
            <span>or</span>
          </div>

          {/* Live Recording */}
          <button
            className="rcm-choice rcm-choice--live"
            onClick={() => { onLive(); onClose(); }}
          >
            <div className="rcm-choice__icon-wrap rcm-choice__icon-wrap--live">
              <Mic size={28} />
            </div>
            <div className="rcm-choice__body">
              <span className="rcm-choice__title">Live Recording</span>
              <span className="rcm-choice__desc">
                Record the student reading aloud directly through your
                device's microphone
              </span>
            </div>
            <div className="rcm-choice__arrow">→</div>
          </button>
        </div>

        {/* ── Footer hint ── */}
        <p className="rcm-footer">
          Press <kbd>Esc</kbd> to cancel
        </p>
      </div>
    </div>
  );
}
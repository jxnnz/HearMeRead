import { useEffect } from "react";
import "./TimeLimitModal.css";

export default function TimeLimitModal({ isOpen, onContinue, onSubmit }) {
  // ── Lock body scroll while open ─────────────────────────
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="tlm-overlay" role="dialog" aria-modal="true" aria-labelledby="tlm-title">
      <div className="tlm-modal">

        {/* ── Bell icon ── */}
        <div className="tlm-icon" aria-hidden="true">
          🔔
        </div>

        {/* ── Heading ── */}
        <h2 className="tlm-title" id="tlm-title">
          2-Minute Limit Reached
        </h2>

        {/* ── Description ── */}
        <p className="tlm-desc">
          The student has reached the 2-minute time limit. Would you like
          to continue recording or submit the current recording?
        </p>

        {/* ── Buttons ── */}
        <div className="tlm-actions">
          <button
            className="tlm-btn tlm-btn--continue"
            onClick={onContinue}
          >
            Continue Recording
          </button>

          <button
            className="tlm-btn tlm-btn--submit"
            onClick={onSubmit}
          >
            Submit Recording Now
          </button>
        </div>

      </div>
    </div>
  );
}
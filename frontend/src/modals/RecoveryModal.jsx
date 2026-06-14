import { X, AlertTriangle } from "lucide-react";
import "./RecoveryModal.css";

export default function RecoveryModal({
  isOpen,
  onClose,
  onResume,
  onStartOver,
  studentName,
}) {
  if (!isOpen) return null;

  return (
    <div className="rm-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="rm-title">
      <div className="rm-modal" onClick={(e) => e.stopPropagation()}>
        
        <button className="rm-close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="rm-icon">
          <AlertTriangle size={28} />
        </div>

        <h3 className="rm-title" id="rm-title">Unfinished Session Found</h3>
        
        <p className="rm-body">
          An unfinished assessment session exists for <strong>{studentName}</strong>. 
          Would you like to resume where they left off, or discard it and start over?
        </p>

        <div className="rm-actions">
          <button className="rm-btn rm-btn--resume" onClick={onResume}>
            Resume Session
          </button>
          
          <button className="rm-btn rm-btn--startover" onClick={onStartOver}>
            Start Over
          </button>
          
          <button className="rm-btn rm-btn--cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

import { X } from "lucide-react";
import "./RetakeModal.css";

export default function RetakeModal({
  isOpen,
  onClose,
  onRetake,
  onKeep,
}) {
  if (!isOpen) return null;

  return (
    <div className="rtm-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="rtm-modal" onClick={(e) => e.stopPropagation()}>
        <button className="rtm-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        
        <div className="rtm-icon">✓</div>
        <h3 className="rtm-title">Recording Complete</h3>
        <p className="rtm-body">
          Would you like to keep this recording or retake it?
        </p>
        
        <div className="rtm-actions">
          <button className="rtm-btn rtm-btn--secondary" onClick={onRetake}>
            Retake
          </button>
          <button className="rtm-btn rtm-btn--primary" onClick={onKeep}>
            End Recording
          </button>
        </div>
      </div>
    </div>
  );
}
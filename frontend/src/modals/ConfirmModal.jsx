import { X } from "lucide-react";
import "./ConfirmModal.css";

/**
 * ConfirmModal — reusable confirmation dialog
 *
 * Props:
 *   isOpen        : boolean
 *   onClose       : () => void   — cancel / close
 *   onConfirm     : () => void   — confirm action
 *   title         : string
 *   message       : string
 *   confirmLabel  : string  (default "Confirm")
 *   cancelLabel   : string  (default "Cancel")
 *   variant       : "danger" | "logout" | "default"
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel  = "Cancel",
  variant      = "default",
}) {
  if (!isOpen) return null;

  const iconMap = {
    danger: (
      <svg className="cm-icon__svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10 11v5M14 11v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    logout: (
      <svg className="cm-icon__svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10 17l5-5-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M15 12H3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    default: (
      <svg className="cm-icon__svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M12 8v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="12" cy="16" r="0.9" fill="currentColor"/>
      </svg>
    ),
  };

  return (
    <div className="cm-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="cm-title">
      <div className={`cm-modal cm-modal--${variant}`} onClick={(e) => e.stopPropagation()}>

        <div className={`cm-icon cm-icon--${variant}`}>
          {iconMap[variant] ?? iconMap.default}
        </div>

        <h3 className="cm-title" id="cm-title">{title}</h3>
        {message && <p className="cm-body">{message}</p>}

        {(cancelLabel || confirmLabel) && (
          <div className="cm-actions">
            {cancelLabel && (
              <button className="cm-btn cm-btn--cancel" onClick={onClose}>
                {cancelLabel}
              </button>
            )}
            {confirmLabel && (
              <button
                className={`cm-btn cm-btn--confirm cm-btn--confirm-${variant}`}
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

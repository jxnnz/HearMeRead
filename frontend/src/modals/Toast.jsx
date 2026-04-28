import { useEffect, useRef } from "react";
import "./Toast.css";

/**
 * Toast — top-right notification modal
 *
 * Props:
 *   toasts  : Array<{ id, type, title, message, duration? }>
 *             type: "success" | "warning" | "error" | "info"
 *   onRemove: (id) => void
 */

const ICONS = {
  success: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M6.5 10.5L9 13L13.5 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 3L18 17H2L10 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M10 9V12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="10" cy="14.5" r="0.75" fill="currentColor"/>
    </svg>
  ),
  error: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 7L13 13M13 7L7 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 9V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="10" cy="6.5" r="0.75" fill="currentColor"/>
    </svg>
  ),
};

function ToastItem({ toast, onRemove }) {
  const timerRef = useRef(null);
  const duration = toast.duration ?? (toast.type === "warning" ? 0 : 5000); // 0 = sticky

  useEffect(() => {
    if (duration > 0) {
      timerRef.current = setTimeout(() => onRemove(toast.id), duration);
    }
    return () => clearTimeout(timerRef.current);
  }, [toast.id, duration, onRemove]);

  return (
    <div
      className={`toast toast--${toast.type}`}
      role="alert"
      aria-live="assertive"
    >
      {/* Progress bar for auto-dismiss */}
      {duration > 0 && (
        <div
          className="toast__progress"
          style={{ animationDuration: `${duration}ms` }}
        />
      )}

      <div className="toast__icon">{ICONS[toast.type]}</div>

      <div className="toast__body">
        {toast.title && <p className="toast__title">{toast.title}</p>}
        {toast.message && <p className="toast__message">{toast.message}</p>}
      </div>

      <button
        className="toast__close"
        onClick={() => onRemove(toast.id)}
        aria-label="Dismiss notification"
      >
        <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}

export default function Toast({ toasts, onRemove }) {
  if (!toasts?.length) return null;

  return (
    <div className="toast-portal" aria-label="Notifications">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}
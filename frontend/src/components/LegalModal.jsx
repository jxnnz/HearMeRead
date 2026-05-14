import "./component css/Auth.css";

export default function LegalModal({ title, onClose, children }) {
  return (
    <div className="legal-modal-overlay" onClick={onClose}>
      <div className="legal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="legal-modal__header">
          <h2>{title}</h2>
          <button
            type="button"
            className="legal-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="legal-modal__body">{children}</div>
      </div>
    </div>
  );
}

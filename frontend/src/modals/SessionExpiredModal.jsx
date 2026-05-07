import { LogIn, Lock } from "lucide-react";
import "./SessionExpiredModal.css";

export default function SessionExpiredModal({ isOpen }) {
  if (!isOpen) return null;

  function handleRelogin() {
    window.location.href = "/login";
  }

  return (
    <div className="sem-overlay">
      <div className="sem-modal">
        <div className="sem-icon-wrap">
          <Lock size={28} strokeWidth={2} />
        </div>
        <div className="sem-body">
          <h3 className="sem-title">Session Expired</h3>
          <p className="sem-message">
            Your login session has expired or is no longer valid. Please log in again to continue.
          </p>
        </div>
        <button className="sem-btn" onClick={handleRelogin}>
          <LogIn size={15} />
          Log In Again
        </button>
      </div>
    </div>
  );
}

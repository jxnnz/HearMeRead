import "./component css/Auth.css";

export default function AuthLayout({ children }) {
  return (
    <div className="auth-bg">
      <div className="auth-card">

        {/* ── Navy box (left) — floats inside the white card ── */}
        <div className="auth-card__left">
          <div className="auth-card__left-inner" />
        </div>

        {/* ── Form area (right) ── */}
        <div className="auth-card__right">
          {children}
        </div>

      </div>
    </div>
  );
}
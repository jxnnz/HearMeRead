import "./component css/Auth.css";
import PublicNav from "./PublicNav";

export default function AuthLayout({ children, page }) {
  return (
    <div className="auth-bg">

      {/* ── Aurora background ── */}
      <div className="auth-aurora">
        <div className="auth-aurora__band auth-aurora__band--1" />
        <div className="auth-aurora__band auth-aurora__band--2" />
        <div className="auth-aurora__band auth-aurora__band--3" />
        <div className="auth-aurora__band auth-aurora__band--4" />
        <div className="auth-aurora__band auth-aurora__band--5" />
      </div>

      <PublicNav page={page} />

      {/* ── Card ── */}
      <div className="auth-card-wrap">
        <div className="auth-card">
          {children}
        </div>
      </div>

    </div>
  );
}

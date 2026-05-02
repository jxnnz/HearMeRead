import { useNavigate } from "react-router-dom";
import "./component css/Auth.css";
import authBg from "../assets/teach.png";

/**
 * AuthLayout
 * Props:
 *   page — "login" | "signup"  (highlights the matching nav button)
 */
export default function AuthLayout({ children, page }) {
  const navigate = useNavigate();

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

      {/* ── Navbar ── */}
      <nav className="auth-nav">
        <span className="auth-nav__brand">HearMeRead</span>
        <div className="auth-nav__actions">
          <button
            className={`auth-nav__btn ${page === "login" ? "auth-nav__btn--active" : "auth-nav__btn--ghost"}`}
            onClick={() => navigate("/login")}
          >
            Log In
          </button>
          <button
            className={`auth-nav__btn ${page === "signup" ? "auth-nav__btn--active" : "auth-nav__btn--ghost"}`}
            onClick={() => navigate("/signup")}
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* ── Card ── */}
      <div className="auth-card-wrap">
        <div className="auth-card">

          {/* ── Image panel (left) ── */}
          <div className="auth-card__left">
            <img
              src={authBg}
              alt=""
              className="auth-card__left-img"
              aria-hidden="true"
            />
          </div>

          {/* ── Form area (right) ── */}
          <div className="auth-card__right">
            {children}
          </div>

        </div>
      </div>

    </div>
  );
}

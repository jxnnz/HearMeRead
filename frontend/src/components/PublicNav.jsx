import { useNavigate } from "react-router-dom";
import "./component css/PublicNav.css";

export default function PublicNav({ page }) {
  const navigate = useNavigate();

  return (
    <nav className="pub-nav">
      <span className="pub-nav__brand" onClick={() => navigate("/")}>
        <img src="/HMR-LOGO.png" alt="HearMeRead" className="pub-nav__logo" />
        HearMeRead
      </span>
      <div className="pub-nav__actions">
        <button
          className={`pub-nav__btn ${page === "login" ? "pub-nav__btn--active" : "pub-nav__btn--ghost"}`}
          onClick={() => navigate("/login")}
        >
          Log In
        </button>
        <button
          className={`pub-nav__btn ${page === "signup" ? "pub-nav__btn--active" : "pub-nav__btn--ghost"}`}
          onClick={() => navigate("/signup")}
        >
          Sign Up
        </button>
      </div>
    </nav>
  );
}

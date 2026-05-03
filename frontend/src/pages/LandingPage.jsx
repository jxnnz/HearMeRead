import { useNavigate } from "react-router-dom";
import teachImg from "../assets/teach.png";
import "../pages/pages css/LandingPage.css";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="lp-page">

      {/* ── Navbar ── */}
      <nav className="lp-nav">
        <span className="lp-nav__brand">
          <img src="/HMR-LOGO.png" alt="" style={{ height: 32, width: "auto", verticalAlign: "middle", marginRight: 8 }} />
          HearMeRead
        </span>
        <div className="lp-nav__actions">
          <button className="lp-btn lp-btn--ghost" onClick={() => navigate("/login")}>
            Log In
          </button>
          <button className="lp-btn lp-btn--primary" onClick={() => navigate("/signup")}>
            Register
          </button>
        </div>
      </nav>

      {/* ── teach ── */}
      <main className="lp-teach">
        <div className="lp-teach__text">
          <h1 className="lp-teach__title">
            Empowering<br />
            <span className="lp-teach__title--accent">Early Readers</span>
          </h1>
          <p className="lp-teach__sub">
            HearMeRead is a reading assessment tool designed to help teachers track
            fluency, comprehension, and reading growth — one student at a time.
          </p>
          <div className="lp-teach__cta">
            <button className="lp-btn lp-btn--primary lp-btn--lg" onClick={() => navigate("/signup")}>
              Get Started
            </button>
            <button className="lp-btn lp-btn--ghost lp-btn--lg" onClick={() => navigate("/login")}>
              Log In
            </button>
          </div>
        </div>

        <div className="lp-teach__image">
          <img src={teachImg} alt="HearMeRead illustration" />
        </div> 
      </main>

    </div>
  );
}

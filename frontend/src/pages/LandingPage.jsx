import { useNavigate } from "react-router-dom";
import heroImg from "../assets/hero.png";
import "./LandingPage.css";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="lp-page">

      {/* ── Navbar ── */}
      <nav className="lp-nav">
        <span className="lp-nav__brand">HearMeRead</span>
        <div className="lp-nav__actions">
          <button className="lp-btn lp-btn--ghost" onClick={() => navigate("/login")}>
            Log In
          </button>
          <button className="lp-btn lp-btn--primary" onClick={() => navigate("/signup")}>
            Register
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <main className="lp-hero">
        <div className="lp-hero__text">
          <h1 className="lp-hero__title">
            Empowering<br />
            <span className="lp-hero__title--accent">Early Readers</span>
          </h1>
          <p className="lp-hero__sub">
            HearMeRead is a reading assessment tool designed to help teachers track
            fluency, comprehension, and reading growth — one student at a time.
          </p>
          <div className="lp-hero__cta">
            <button className="lp-btn lp-btn--primary lp-btn--lg" onClick={() => navigate("/signup")}>
              Get Started
            </button>
            <button className="lp-btn lp-btn--ghost lp-btn--lg" onClick={() => navigate("/login")}>
              Log In
            </button>
          </div>
        </div>

{/*        <div className="lp-hero__image">
          <img src={heroImg} alt="HearMeRead illustration" />
        </div> */}
      </main>

    </div>
  );
}

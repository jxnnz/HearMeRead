import { useState } from "react";
import { useNavigate } from "react-router-dom";
import HmrLogo from "../assets/HMR-LOGO.png";
import "./pages css/LandingPage.css";

export default function LandingPage() {
  const navigate  = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="lp-root">

      {/* ── NAV ── */}
      <nav className="lp-nav">
        <a className="nav-logo" href="#">
          <img src={HmrLogo} alt="HearMeRead logo" />
          HearMeRead
        </a>
        <button
          className={`nav-hamburger${menuOpen ? " open" : ""}`}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
        <div className={`nav-actions${menuOpen ? " open" : ""}`}>
          <button className="btn-outline" onClick={() => { navigate("/login");  setMenuOpen(false); }}>Login</button>
          <button className="btn-solid"   onClick={() => { navigate("/signup"); setMenuOpen(false); }}>Sign Up</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-content">
          <h1>Empowering Early<br />Readers</h1>
          <p className="hero-sub">
            HearMeRead is a reading assessment tool designed to help teachers track fluency,
            comprehension, and reading growth — one student at a time.
          </p>
          <button className="btn-hero" onClick={() => navigate("/signup")}>Get Started</button>
        </div>

        <div className="hero-visual">
          <div className="hero-card-stack">
            <div className="hero-card-shadow" />
            <div className="float-tag tr">✓ CWPM Computed</div>
            <div className="hero-main-card">
              <div className="card-header">
                <div className="student-row">
                  <div className="avatar">JD</div>
                  <div>
                    <div className="student-name">Juan D.</div>
                    <div className="student-sub">Grade 2 · Makopa</div>
                  </div>
                </div>
                <span className="rec-badge">
                  <span className="rec-dot" />
                  Recording
                </span>
              </div>

              <div className="waveform">
                {[30,60,82,50,88,66,44,78,58,72,38,22,28].map((h, i) => (
                  <div
                    key={i}
                    className={`bar${i >= 1 && i <= 9 ? " on" : ""}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>

              <div className="metrics-row">
                <div className="metric-chip">
                  <span className="metric-val">74</span>
                  <span className="metric-lbl">CWPM</span>
                </div>
                <div className="metric-chip">
                  <span className="metric-val">92%</span>
                  <span className="metric-lbl">Accuracy</span>
                </div>
                <div className="metric-chip">
                  <span className="metric-val">✓</span>
                  <span className="metric-lbl">Fluent</span>
                </div>
              </div>
            </div>
            <div className="float-tag bl">📄 Report ready</div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="features">
        <h2 className="section-title">Core Features</h2>
        <div className="features-grid">
          {[
            { icon: "🎙️", title: "Smart Audio Assessment",    desc: "Record student reading in real time with playback and re-record options. AI speech-to-text transcription powered by Whisper ASR." },
            { icon: "📊", title: "Automated Error Detection",  desc: "Identifies mispronounced, missing, and extra words using Levenshtein Distance — no manual marking needed." },
            { icon: "📈", title: "Automatic Reading Metrics",  desc: "CWPM, reading time, and miscue count are computed instantly. No more manual tallying." },
            { icon: "📋", title: "Instant Evaluation Reports", desc: "Comprehension results, fluency rating, learner experience score, and teacher remarks computed instantly and displayed in one view." },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="feature-card">
              <div className="feature-icon">{icon}</div>
              <div className="feature-title">{title}</div>
              <p className="feature-desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section>
        <div className="about">
          <div className="about-mascot-wrap">
            <div className="mascot-ring">
              <div className="mascot-dot" />
            </div>
            <img className="about-logo" src={HmrLogo} alt="HearMeRead" />
          </div>
          <div>
            <div className="about-section-label">About HearMeRead</div>
            <h2 className="about-title">Built for Philippine classrooms</h2>
            <div className="about-text">
              <p><strong>HearMeRead</strong> is an AI-powered reading assessment web application designed to help teachers evaluate students' oral reading performance faster and more accurately.</p>
              <p>Using speech recognition and intelligent error detection, the system automates transcription, identifies reading miscues, and generates performance reports aligned with classroom reading assessment standards.</p>
              <p>Built with support for both English and Filipino, HearMeRead empowers teachers with a smarter, data-driven approach to monitoring student progress and improving literacy outcomes.</p>
              <div className="lang-pills">
                <span className="lang-pill en">🇬🇧 English</span>
                <span className="lang-pill fil">🇵🇭 Filipino</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="how">
        <h2 className="section-title">How It Works</h2>
        <p className="how-sub">A simple four-step flow designed around how teachers already work.</p>
        <div className="steps">
          {[
            { num: "1", alt: false, title: "Select Student", desc: "Choose the student and set the assessment period." },
            { num: "2", alt: true,  title: "Choose Passage", desc: "Pick a language and passage matched to the grade level." },
            { num: "3", alt: false, title: "Record Reading", desc: "Tap to start — ASR transcribes and scores in real time." },
            { num: "4", alt: true,  title: "View Report",    desc: "CWPM, accuracy, reading profile, and remarks ready instantly." },
          ].map(({ num, alt, title, desc }) => (
            <div key={num} className="step">
              <div className={`step-num${alt ? " alt" : ""}`}>{num}</div>
              <h4>{title}</h4>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="footer-brand">HearMeRead</div>
        <div className="footer-mid">Supporting UN SDG 4 · Quality Education</div>
        <div className="footer-copy">© 2026 HearMeRead. All rights reserved.</div>
      </footer>

    </div>
  );
}

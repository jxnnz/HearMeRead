import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import HmrLogo    from "../assets/HMR-LOGO.png";
import BlobBlue   from "../assets/Blob_15.png";
import BlobPurple from "../assets/Blob_6.png";
import WaveBlue   from "../assets/HeavyWaves.png";
import WaveRed    from "../assets/HeavyWaves_1.png";
import WaveGreen  from "../assets/HeavyWaves_2.png";
import "./pages css/LandingPage.css";

export default function LandingPage() {
  const navigate   = useNavigate();
  const [menuOpen, setMenuOpen]       = useState(false);
  const [scrolled, setScrolled]       = useState(false);
  const [activeSection, setActive]    = useState("");

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10);
      const navH = document.getElementById("navbar")?.offsetHeight ?? 64;
      let current = "";
      document.querySelectorAll("section[id]").forEach((sec) => {
        if (sec.getBoundingClientRect().top <= navH + 60) current = sec.id;
      });
      setActive(current);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* close drawer */
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && menuOpen) closeMenu();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function openMenu()  { setMenuOpen(true);  document.body.style.overflow = "hidden"; }
  function closeMenu() { setMenuOpen(false); document.body.style.overflow = ""; }

  function scrollTo(href) {
    const target = document.querySelector(href);
    if (!target) return;
    const navH = document.getElementById("navbar")?.offsetHeight ?? 0;
    const top  = target.getBoundingClientRect().top + window.scrollY - navH - 16;
    window.scrollTo({ top, behavior: "smooth" });
  }

  function handleNavLink(e, href) {
    e.preventDefault();
    closeMenu();
    scrollTo(href);
  }

  return (
    <div className="lp-root">

      {/* ── NAV ── */}
      <nav id="navbar" className={scrolled ? "scrolled" : ""}>
        <a className="nav-logo" href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          <img src={HmrLogo} alt="HearMeRead logo" />
          HearMeRead
        </a>

        {/* links */}
        <ul className="nav-links">
          {[
            { label: "Features",   href: "#features" },
            { label: "How to Use", href: "#how"      },
            { label: "About",      href: "#about"    },
          ].map(({ label, href }) => (
            <li key={href}>
              <a
                href={href}
                className={activeSection === href.slice(1) ? "active" : ""}
                onClick={(e) => handleNavLink(e, href)}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        {/* buttons */}
        <div className="nav-actions">
          <button className="btn-login"  onClick={() => navigate("/login")}>Login</button>
          <button className="btn-signup" onClick={() => navigate("/signup")}>Sign Up</button>
        </div>

        {/* Hamburger - for mobile only */}
        <button
          className={`hamburger${menuOpen ? " open" : ""}`}
          onClick={menuOpen ? closeMenu : openMenu}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* drawer for mobile */}
      <div className={`overlay${menuOpen ? " open" : ""}`} onClick={closeMenu} />
      <div className={`mobile-menu${menuOpen ? " open" : ""}`}>
        <ul>
          {[
            { label: "Features",   href: "#features" },
            { label: "How to Use", href: "#how"      },
            { label: "About",      href: "#about"    },
          ].map(({ label, href }) => (
            <li key={href}>
              <a href={href} onClick={(e) => handleNavLink(e, href)}>{label}</a>
            </li>
          ))}
        </ul>
        <div className="mobile-actions">
          <button className="btn-login"  onClick={() => { closeMenu(); navigate("/login"); }}>Login</button>
          <button className="btn-signup" onClick={() => { closeMenu(); navigate("/signup"); }}>Sign Up</button>
        </div>
      </div>

      {/* ── HERO ── */}
      <section className="hero">
        {/* blobs & waves */}
        <img className="deco blob-blue"   src={BlobBlue}   alt="" aria-hidden="true" />
        <img className="deco blob-purple" src={BlobPurple} alt="" aria-hidden="true" />
        <img className="deco wave-red"    src={WaveRed}    alt="" aria-hidden="true" />
        <img className="deco wave-green"  src={WaveGreen}  alt="" aria-hidden="true" />

        <div className="hero-inner">
          <h1>Empowering <em>Early</em><br />Readers</h1>
          <p className="hero-sub">
            HearMeRead is a reading assessment tool designed to help teachers track fluency,
            comprehension, and reading growth — one student at a time.
          </p>
          <button className="btn-hero" onClick={() => navigate("/signup")}>Get Started</button>
          <div className="hero-badges">
            <div className="badge"><span className="badge-icon">🎙️</span> Voice-to-Text</div>
            <div className="badge"><span className="badge-icon">📊</span> Auto Scoring</div>
            <div className="badge"><span className="badge-icon">🇵🇭</span> Filipino &amp; English</div>
          </div>
        </div>
      </section>

      {/* features */}
      <section className="features" id="features">
        <div className="container">
          <span className="section-label">Core Features</span>
          <h2 className="section-title white">Everything teachers need,<br />nothing they don't</h2>

          <div className="features-grid">
            {[
              { icon: "🎙️", bg: "#dbeafe", title: "Smart Audio Assessment",    desc: "Record student reading in real time with playback and re-record options. AI speech-to-text transcription powered by Whisper ASR." },
              { icon: "🔍", bg: "#fef3c7", title: "Automated Error Detection",  desc: "Identifies mispronounced, missing, and extra words using Levenshtein Distance — no manual marking needed." },
              { icon: "📈", bg: "#dcfce7", title: "Automatic Reading Metrics",  desc: "CWPM, reading time, and miscue count are computed instantly. No more manual tallying after every session." },
              { icon: "📋", bg: "#fce7f3", title: "Instant Evaluation Reports", desc: "Comprehension results, fluency rating, learner experience score, and teacher remarks computed instantly and displayed in one view." },
            ].map(({ icon, bg, title, desc }) => (
              <div key={title} className="feat-card">
                <div className="feat-icon" style={{ background: bg }}>{icon}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* how it works */}
      <section className="how" id="how">
        <div className="container">
          <span className="section-label dark">How It Works</span>
          <h2 className="section-title dark">A simple four-step flow</h2>
          <p className="how-sub">Designed around how teachers already work.</p>

          <div className="steps">
            {[
              { num: "1", title: "Select Student", desc: "Choose the student and set the assessment period." },
              { num: "2", title: "Choose Passage", desc: "Pick a language and passage matched to the grade level." },
              { num: "3", title: "Record Reading", desc: "Tap to start — ASR transcribes and scores in real time." },
              { num: "4", title: "View Report",    desc: "CWPM, accuracy, reading profile, and remarks ready instantly." },
            ].map(({ num, title, desc }) => (
              <div key={num} className="step">
                <div className="step-num">{num}</div>
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* about */}
      <section className="about" id="about">
        <div className="wave-divider">
          <img src={WaveBlue} alt="" aria-hidden="true" />
        </div>
        <div className="container">
          <div className="about-inner">

            <div className="about-mascot">
              <div className="mascot-ring"><div className="ring-dot" /></div>
              <img className="mascot-img" src={HmrLogo} alt="HearMeRead mascot" />
            </div>

            <div>
              <span className="section-label">About HearMeRead</span>
              <h2 className="about-title">Built for Philippine classrooms</h2>
              <div className="about-text">
                <p><strong>HearMeRead</strong> is an AI-powered reading assessment web application designed to help teachers evaluate students' oral reading performance faster and more accurately.</p>
                <p>Using speech recognition and intelligent error detection, the system automates transcription, identifies reading miscues, and generates performance reports aligned with classroom reading assessment standards.</p>
                <p>Built with support for both English and Filipino, HearMeRead empowers teachers with a smarter, data-driven approach to monitoring student progress and improving literacy outcomes.</p>
              </div>
              <div className="lang-pills">
                <span className="pill">🇬🇧 English</span>
                <span className="pill">🇵🇭 Filipino</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* footer */}
      <footer>
        <div className="footer-brand">
          <img src={HmrLogo} alt="HearMeRead" />
          <div>
            <span className="footer-name">HearMeRead</span>
            <span className="footer-copy">© 2026 HearMeRead. All rights reserved.</span>
          </div>
        </div>
        <span className="footer-sdg">Supporting UN SDG 4 · Quality Education</span>
      </footer>

    </div>
  );
}
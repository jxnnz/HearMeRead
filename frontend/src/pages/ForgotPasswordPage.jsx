import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ChevronLeft } from "lucide-react";
import lockImg  from "../assets/change-pword.png";
import resetImg from "../assets/forgot-pword.png";
import "./ForgotPasswordPage.css";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  // "verify" → enter email + code  |  "reset" → set new password
  const [step, setStep] = useState("verify");

  // Step 1
  const [email,    setEmail]    = useState("");
  const [code,     setCode]     = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sending,  setSending]  = useState(false);
  const [verifying,setVerifying]= useState(false);

  // Step 2
  const [newPw,       setNewPw]       = useState("");
  const [confirmPw,   setConfirmPw]   = useState("");
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetting,   setResetting]   = useState(false);

  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(null);

  async function handleSendCode() {
    if (!email) return;
    setSending(true);
    setError(null);
    try {
      // FINAL: await authApi.sendResetCode(email);
      setCodeSent(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to send code. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    if (!code) return;
    setVerifying(true);
    setError(null);
    try {
      // FINAL: await authApi.verifyResetCode(email, code);
      setStep("reset");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired code.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    if (newPw !== confirmPw) { setError("Passwords do not match."); return; }
    if (newPw.length < 8)    { setError("Password must be at least 8 characters."); return; }
    setResetting(true);
    setError(null);
    try {
      // FINAL: await authApi.resetPassword(email, code, newPw);
      setSuccess("Password changed! Redirecting to login…");
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to reset password.");
    } finally {
      setResetting(false);
    }
  }

  function handleBack() {
    if (step === "reset") { setStep("verify"); setError(null); }
    else navigate("/login");
  }

  return (
    <div className="fp-bg">

      {/* ── Aurora (reuses Auth.css bands) ── */}
      <div className="auth-aurora">
        <div className="auth-aurora__band auth-aurora__band--1" />
        <div className="auth-aurora__band auth-aurora__band--2" />
        <div className="auth-aurora__band auth-aurora__band--3" />
        <div className="auth-aurora__band auth-aurora__band--4" />
        <div className="auth-aurora__band auth-aurora__band--5" />
      </div>

      {/* ── Navbar (reuses Auth.css nav) ── */}
      <nav className="auth-nav">
        <span className="auth-nav__brand">HearMeRead</span>
        <div className="auth-nav__actions">
          <button
            className="auth-nav__btn auth-nav__btn--active"
            onClick={() => navigate("/login")}
          >
            Log In
          </button>
          <button
            className="auth-nav__btn auth-nav__btn--ghost"
            onClick={() => navigate("/signup")}
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* ── Content ── */}
      <div className="fp-wrap">

        {/* Left illustration */}
        <div className="fp-illustration">
          <img
            src={step === "verify" ? lockImg : resetImg}
            alt=""
            aria-hidden="true"
          />
        </div>

        {/* Right card */}
        <div className="fp-card">

          {step === "verify" ? (
            <>
              <h2 className="fp-title">Change Password</h2>
              <p className="fp-sub">Enter the email address associated with your account</p>

              {error && <div className="fp-error">{error}</div>}

              {/* Email row */}
              <div className="fp-field">
                <label className="fp-label" htmlFor="fp-email">Enter your email:</label>
                <div className="fp-email-row">
                  <input
                    id="fp-email"
                    type="email"
                    className="fp-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                  <button
                    className="fp-send-btn"
                    onClick={handleSendCode}
                    disabled={sending || !email}
                  >
                    {sending ? "Sending…" : codeSent ? "Resend" : "Send Code"}
                  </button>
                </div>
              </div>

              {/* Code field */}
              <div className="fp-field">
                <label className="fp-label" htmlFor="fp-code">Enter verification code:</label>
                <input
                  id="fp-code"
                  type="text"
                  className="fp-input"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter the code sent to your email"
                  maxLength={8}
                  disabled={!codeSent}
                />
              </div>

              <button
                className="fp-submit-btn"
                onClick={handleVerify}
                disabled={verifying || !code || !codeSent}
              >
                {verifying ? "Verifying…" : "Verify"}
              </button>
            </>
          ) : (
            <>
              <h2 className="fp-title">Create New Password</h2>
              <p className="fp-sub">Choose a strong password for your account</p>

              {error   && <div className="fp-error">{error}</div>}
              {success && <div className="fp-success">{success}</div>}

              {/* New password */}
              <div className="fp-field">
                <label className="fp-label" htmlFor="fp-newpw">Enter New Password:</label>
                <div className="fp-pw-wrap">
                  <input
                    id="fp-newpw"
                    type={showNew ? "text" : "password"}
                    className="fp-input"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="Min. 8 characters"
                  />
                  <button
                    type="button"
                    className="fp-eye"
                    onClick={() => setShowNew((v) => !v)}
                    aria-label={showNew ? "Hide password" : "Show password"}
                  >
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="fp-field">
                <label className="fp-label" htmlFor="fp-confirmpw">Confirm Password:</label>
                <div className="fp-pw-wrap">
                  <input
                    id="fp-confirmpw"
                    type={showConfirm ? "text" : "password"}
                    className="fp-input"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Re-enter your password"
                  />
                  <button
                    type="button"
                    className="fp-eye"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                className="fp-submit-btn"
                onClick={handleReset}
                disabled={resetting || !newPw || !confirmPw}
              >
                {resetting ? "Saving…" : "Change Password"}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

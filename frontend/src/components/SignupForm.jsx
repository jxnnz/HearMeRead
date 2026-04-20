// ============================================================
// HearMeRead — SignupForm Component
// Props:
//   onSubmit  — ({ firstName, lastName, email, password }) => void
//   loading   — boolean, disables submit while API runs
// ============================================================
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

export default function SignupForm({ onSubmit, loading }) {
  const navigate = useNavigate();

  const [firstName, setFirstName]             = useState("");
  const [lastName, setLastName]               = useState("");
  const [email, setEmail]                     = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [confirmError, setConfirmError]       = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match.");
      return;
    }
    setConfirmError("");
    onSubmit({ firstName, lastName, email, password });
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>

      {/* ── First Name + Last Name ── */}
      <div className="auth-form__row">
        <div className="auth-field">
          <label className="auth-label" htmlFor="signup-firstname">
            First Name:
          </label>
          <input
            id="signup-firstname"
            type="text"
            className="auth-input"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            required
            autoComplete="given-name"
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="signup-lastname">
            Last Name:
          </label>
          <input
            id="signup-lastname"
            type="text"
            className="auth-input"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            required
            autoComplete="family-name"
          />
        </div>
      </div>

      {/* ── Email ── */}
      <div className="auth-field">
        <label className="auth-label" htmlFor="signup-email">Email:</label>
        <input
          id="signup-email"
          type="email"
          className="auth-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          autoComplete="email"
        />
      </div>

      {/* ── Password ── */}
      <div className="auth-field">
        <label className="auth-label" htmlFor="signup-password">Password:</label>
        <div className="auth-password-wrap">
          <input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            className="auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* ── Confirm Password ── */}
      <div className="auth-field">
        <label className="auth-label" htmlFor="signup-confirm">
          Confirm Password:
        </label>
        <div className="auth-password-wrap">
          <input
            id="signup-confirm"
            type={showConfirm ? "text" : "password"}
            className={`auth-input${confirmError ? " auth-input--error" : ""}`}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (confirmError) setConfirmError("");
            }}
            placeholder="Re-enter your password"
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? "Hide password" : "Show password"}
          >
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {confirmError && (
          <span className="auth-field-error">{confirmError}</span>
        )}
      </div>

      {/* ── Submit ── */}
      <button type="submit" className="auth-submit" disabled={loading}>
        {loading ? "Creating account…" : "Sign Up"}
      </button>

      {/* ── Switch to login ── */}
      <p className="auth-switch">
        Already have an account?{" "}
        <button type="button" onClick={() => navigate("/login")}>
          Sign in
        </button>
      </p>
    </form>
  );
}
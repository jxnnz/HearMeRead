import { useState, useMemo } from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./component css/Auth.css";

// ── Password rules — must mirror the backend TeacherRegister validator ────────
const RULES = [
  { key: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { key: "uppercase", label: "At least one uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { key: "lowercase", label: "At least one lowercase letter", test: (p) => /[a-z]/.test(p) },
  { key: "number", label: "At least one number", test: (p) => /[0-9]/.test(p) },
  { key: "special", label: "At least one symbol (e.g. !@#$)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

// ── Strength scoring ──────────────────────────────────────────────────────────
function getStrength(password) {
  if (!password) return { score: 0, label: "", color: "" };
  const passed = RULES.filter((r) => r.test(password)).length;
  if (passed <= 1) return { score: 1, label: "Weak", color: "#e74c3c" };
  if (passed === 2) return { score: 2, label: "Fair", color: "#f39c12" };
  if (passed === 3) return { score: 3, label: "Good", color: "#f1c40f" };
  if (passed === 4) return { score: 4, label: "Strong", color: "#2ecc71" };
  return { score: 5, label: "Very Strong", color: "#27ae60" };
}

// =============================================================================
export default function SignupForm({ onSubmit, loading }) {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  // ── Derived state ─────────────────────────────────────────────────────────
  const ruleResults = useMemo(
    () => RULES.map((r) => ({ ...r, passed: r.test(password) })),
    [password]
  );

  const allRulesPassed = ruleResults.every((r) => r.passed);
  const strength = getStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  // ── Submit ────────────────────────────────────────────────────────────────
  function handleSubmit(e) {
    e.preventDefault();
    if (!allRulesPassed) return;
    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match.");
      return;
    }
    setConfirmError("");
    onSubmit({ firstName, lastName, email, password });
  }

  // ==========================================================================
  return (
    <form className="auth-form" onSubmit={handleSubmit}>

      {/* ── First Name + Last Name ─────────────────────────────────────────── */}
      <div className="auth-form__row">
        <div className="auth-field">
          <label className="auth-label" htmlFor="signup-firstname">First Name</label>
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
          <label className="auth-label" htmlFor="signup-lastname">Last Name</label>
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

      {/* ── Email ─────────────────────────────────────────────────────────── */}
      <div className="auth-field">
        <label className="auth-label" htmlFor="signup-email">Email</label>
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

      {/* ── Password ──────────────────────────────────────────────────────── */}
      <div className="auth-field">
        <label className="auth-label" htmlFor="signup-password">Password</label>
        <div className="auth-password-wrap">
          <input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            className={`auth-input${touched && !allRulesPassed ? " auth-input--error" : ""
              }${touched && allRulesPassed ? " auth-input--success" : ""
              }`}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setTouched(true); }}
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

        {/* Strength bar */}
        {touched && password.length > 0 && (
          <div className="pw-strength">
            <div className="pw-strength__bar-track">
              {[1, 2, 3, 4, 5].map((seg) => (
                <div
                  key={seg}
                  className="pw-strength__bar-segment"
                  style={{ background: seg <= strength.score ? strength.color : "#e0e4f0" }}
                />
              ))}
            </div>
            <span className="pw-strength__label" style={{ color: strength.color }}>
              {strength.label}
            </span>
          </div>
        )}

        {/* Rule checklist */}
        {touched && (
          <ul className="pw-rules">
            {ruleResults.map((rule) => (
              <li
                key={rule.key}
                className={`pw-rule ${rule.passed ? "pw-rule--pass" : "pw-rule--fail"}`}
              >
                {rule.passed
                  ? <Check size={12} className="pw-rule__icon" />
                  : <X size={12} className="pw-rule__icon" />
                }
                {rule.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Confirm Password ───────────────────────────────────────────────── */}
      <div className="auth-field">
        <label className="auth-label" htmlFor="signup-confirm">Confirm Password</label>
        <div className="auth-password-wrap">
          <input
            id="signup-confirm"
            type={showConfirm ? "text" : "password"}
            className={`auth-input${passwordsMismatch ? " auth-input--error" : ""
              }${passwordsMatch ? " auth-input--success" : ""
              }`}
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

        {passwordsMatch && (
          <span className="pw-match pw-match--ok">
            <Check size={12} /> Passwords match
          </span>
        )}
        {(passwordsMismatch || confirmError) && (
          <span className="pw-match pw-match--error">
            <X size={12} /> {confirmError || "Passwords do not match"}
          </span>
        )}
      </div>

      {/* ── Submit ────────────────────────────────────────────────────────── */}
      <button
        type="submit"
        className="auth-submit"
        disabled={loading || !allRulesPassed || !passwordsMatch}
      >
        {loading ? "Creating account…" : "Create Account"}
      </button>

      {/* ── Switch to login ───────────────────────────────────────────────── */}
      <p className="auth-switch">
        Already have an account?{" "}
        <button type="button" onClick={() => navigate("/login")}>
          Sign in
        </button>
      </p>

    </form>
  );
}
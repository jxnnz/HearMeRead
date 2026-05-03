import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { authApi } from "../services/api";

// ── Password strength helpers ─────────────────────────────────────────────────

const RULES = [
  { id: "len",     label: "At least 8 characters",           test: (v) => v.length >= 8 },
  { id: "upper",   label: "At least one uppercase letter",   test: (v) => /[A-Z]/.test(v) },
  { id: "lower",   label: "At least one lowercase letter",   test: (v) => /[a-z]/.test(v) },
  { id: "digit",   label: "At least one number",             test: (v) => /\d/.test(v) },
  { id: "symbol",  label: "At least one symbol (!@#$%…)",    test: (v) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(v) },
];

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
const STRENGTH_COLORS = ["#e8eaf2", "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#27ae60"];

function usePasswordStrength(password) {
  return useMemo(() => {
    const results = RULES.map((r) => ({ ...r, pass: r.test(password) }));
    const score   = results.filter((r) => r.pass).length;
    return { results, score };
  }, [password]);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState(null);

  const { results: rules, score } = usePasswordStrength(newPassword);
  const allRulesPass  = score === RULES.length;
  const passwordsMatch = newPassword === confirmPassword && confirmPassword !== "";

  const canSubmit = allRulesPass && passwordsMatch && !loading;

  // ── No token in URL → show error state ───────────────────────────────────
  if (!token) {
    return (
      <AuthLayout page="reset">
        <h1 className="auth-heading">Invalid Link</h1>
        <p className="auth-subheading">This password reset link is missing or malformed.</p>
        <div className="auth-error" role="alert">
          The reset link is invalid. Please request a new one.
        </div>
        <p className="auth-switch">
          <button type="button" onClick={() => navigate("/forgot-password")}>
            Back to Forgot Password
          </button>
        </p>
      </AuthLayout>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      await authApi.resetPassword(token, newPassword);
      navigate("/login?reset=true");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || "This reset link is invalid or has expired. Please request a new one.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout page="reset">
      <h1 className="auth-heading">Reset Password</h1>
      <p className="auth-subheading">Enter your new password below</p>

      {error && (
        <div className="auth-error" role="alert">
          {error}{" "}
          <button
            className="auth-resend-trigger"
            onClick={() => navigate("/forgot-password")}
          >
            Request a new link
          </button>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>

        {/* ── New password ── */}
        <div className="auth-field">
          <label className="auth-label" htmlFor="reset-new-password">New Password:</label>
          <div className="auth-password-wrap">
            <input
              id="reset-new-password"
              type={showNew ? "text" : "password"}
              className={`auth-input${allRulesPass ? " auth-input--success" : newPassword ? " auth-input--error" : ""}`}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowNew((v) => !v)}
              aria-label={showNew ? "Hide password" : "Show password"}
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Strength bar */}
          {newPassword && (
            <>
              <div className="pw-strength">
                <div className="pw-strength__bar-track">
                  {RULES.map((_, i) => (
                    <div
                      key={i}
                      className="pw-strength__bar-segment"
                      style={{ background: i < score ? STRENGTH_COLORS[score] : "#e8eaf2" }}
                    />
                  ))}
                </div>
                <span
                  className="pw-strength__label"
                  style={{ color: STRENGTH_COLORS[score] }}
                >
                  {STRENGTH_LABELS[score]}
                </span>
              </div>

              <ul className="pw-rules">
                {rules.map((rule) => (
                  <li
                    key={rule.id}
                    className={`pw-rule ${rule.pass ? "pw-rule--pass" : "pw-rule--fail"}`}
                  >
                    <span className="pw-rule__icon">
                      {rule.pass
                        ? <CheckCircle size={12} />
                        : <XCircle    size={12} />}
                    </span>
                    {rule.label}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* ── Confirm password ── */}
        <div className="auth-field">
          <label className="auth-label" htmlFor="reset-confirm-password">Confirm Password:</label>
          <div className="auth-password-wrap">
            <input
              id="reset-confirm-password"
              type={showConfirm ? "text" : "password"}
              className={`auth-input${
                confirmPassword
                  ? passwordsMatch
                    ? " auth-input--success"
                    : " auth-input--error"
                  : ""
              }`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
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

          {confirmPassword && (
            <div className={`pw-match ${passwordsMatch ? "pw-match--ok" : "pw-match--error"}`}>
              {passwordsMatch
                ? <><CheckCircle size={12} /> Passwords match</>
                : <><XCircle    size={12} /> Passwords do not match</>}
            </div>
          )}
        </div>

        <button type="submit" className="auth-submit" disabled={!canSubmit}>
          {loading ? "Resetting…" : "Reset Password"}
        </button>
      </form>

      <p className="auth-switch">
        Remember your password?{" "}
        <button type="button" onClick={() => navigate("/login")}>
          Log in
        </button>
      </p>
    </AuthLayout>
  );
}

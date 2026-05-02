import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import LoginForm  from "../components/LoginForm";
import { authApi } from "../services/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // ── Handle redirect flags from /auth/verify ──────────────────────────────
  useEffect(() => {
    const verified    = searchParams.get("verified");
    const registered  = searchParams.get("registered");
    const errFlag     = searchParams.get("error");

    const reset = searchParams.get("reset");

    if (verified === "true") {
      setSuccess("Email verified! You can now log in.");
    } else if (registered === "true") {
      setSuccess("Account created! Check your email and click the verification link before logging in.");
    } else if (reset === "true") {
      setSuccess("Password reset successfully. You can now log in with your new password.");
    } else if (errFlag === "invalid_token") {
      setError(
        "This verification link is invalid or has already expired. " +
        "Please request a new one below."
      );
    }
  }, [searchParams]);

  // ── Login submit ──────────────────────────────────────────────────────────
  async function handleLogin({ email, password }) {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      localStorage.setItem("token", res.access_token);
      navigate("/dashboard");
    } catch (err) {
      const detail = err.response?.data?.detail;

      // Surface the "please verify your email" message with a helpful hint
      if (err.response?.status === 403 && detail?.includes("verify your email")) {
        setError(detail);  // backend message is already user-friendly
      } else {
        setError(detail || err.message || "Invalid email or password.");
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Resend verification ───────────────────────────────────────────────────
  const [resendEmail,   setResendEmail]   = useState("");
  const [resendSent,    setResendSent]    = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showResend,    setShowResend]    = useState(false);

  async function handleResend(e) {
    e.preventDefault();
    setResendLoading(true);
    try {
      await authApi.resendVerification(resendEmail);
      setResendSent(true);
    } catch {
      // Always show success to avoid email enumeration
      setResendSent(true);
    } finally {
      setResendLoading(false);
    }
  }

  // Show resend form if the error is about email verification
  const isVerifyError = error?.includes("verify your email") ||
                        error?.includes("invalid or has already expired");

  return (
    <AuthLayout page="login">
      <h1 className="auth-heading">Welcome Back!</h1>
      <p className="auth-subheading">Login to access your account</p>

      {/* Success banner (after verification) */}
      {success && (
        <div className="auth-success" role="status">{success}</div>
      )}

      {/* Error banner */}
      {error && (
        <div className="auth-error" role="alert">
          {error}
          {isVerifyError && !showResend && (
            <button
              className="auth-resend-trigger"
              onClick={() => setShowResend(true)}
            >
              Resend verification email
            </button>
          )}
        </div>
      )}

      {/* Resend form — shown inline when needed */}
      {showResend && !resendSent && (
        <form className="auth-resend-form" onSubmit={handleResend}>
          <p className="auth-subheading" style={{ marginBottom: 8 }}>
            Enter your email to receive a new verification link:
          </p>
          <div className="auth-form__row" style={{ gridTemplateColumns: "1fr auto", gap: 8 }}>
            <input
              type="email"
              className="auth-input"
              placeholder="your@email.com"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              className="auth-submit"
              style={{ width: "auto", padding: "9px 18px" }}
              disabled={resendLoading}
            >
              {resendLoading ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      )}

      {resendSent && (
        <div className="auth-success" role="status">
          If that email is registered and unverified, a new link has been sent. Check your inbox.
        </div>
      )}

      <LoginForm onSubmit={handleLogin} loading={loading} />
    </AuthLayout>
  );
}
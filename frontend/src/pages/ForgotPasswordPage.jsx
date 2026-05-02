import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { authApi } from "../services/api";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      // Always show success to avoid email enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout page="forgot">
      <h1 className="auth-heading">Forgot Password?</h1>
      <p className="auth-subheading">
        Enter your email and we'll send you a reset link
      </p>

      {error && (
        <div className="auth-error" role="alert">{error}</div>
      )}

      {sent ? (
        <div className="auth-verify-notice">
          <p>
            If <strong>{email}</strong> is registered, a password reset link has been
            sent. Check your inbox — the link expires in <strong>1 hour</strong>.
          </p>
          <p>Didn't get it? Check your spam folder or try again.</p>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="forgot-email">Email:</label>
            <input
              id="forgot-email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoComplete="email"
            />
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Sending…" : "Send Reset Link"}
          </button>
        </form>
      )}

      <p className="auth-switch">
        Remember your password?{" "}
        <button type="button" onClick={() => navigate("/login")}>
          Log in
        </button>
      </p>
    </AuthLayout>
  );
}

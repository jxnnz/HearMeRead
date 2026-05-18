import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./component css/Auth.css";
 
export default function LoginForm({ onSubmit, loading }) {
  const navigate = useNavigate();
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
 
  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ email, password });
  }
 
  return (
    <form className="auth-form" onSubmit={handleSubmit}>
 
      {/* Email */}
      <div className="auth-field">
        <div className="auth-field-float">
          <input
            id="login-email"
            type="email"
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder=" "
            required
            autoComplete="email"
          />
          <label className="auth-label-float" htmlFor="login-email">Email</label>
        </div>
      </div>
 
      {/* Password */}
      <div className="auth-field">
        <div className="auth-field-float">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            className="auth-input auth-input--has-toggle"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder=" "
            required
            autoComplete="current-password"
          />
          <label className="auth-label-float" htmlFor="login-password">Password</label>
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
 
      {/* Forgot password */}
      <div className="auth-forgot">
        <button type="button" onClick={() => navigate("/forgot-password")}>
          Forgot password?
        </button>
      </div>
 
      {/* Submit */}
      <button type="submit" className="auth-submit" disabled={loading}>
        {loading ? "Logging in…" : "Log in"}
      </button>
 
      {/* Switch to signup */}
      <p className="auth-switch">
        Don't have an account?{" "}
        <button type="button" onClick={() => navigate("/signup")}>
          Sign up
        </button>
      </p>
    </form>
  );
}
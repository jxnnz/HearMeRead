import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import SignupForm  from "../components/SignupForm";
import { authApi } from "../services/api";
 
export default function SignupPage() {
  const navigate = useNavigate();
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);
 
  async function handleSignup({ firstName, lastName, email, password }) {
    setError(null);
    setLoading(true);
    try {
      await authApi.register({
        first_name: firstName,
        last_name:  lastName,
        email,
        password,
      });
      // Auto-login after registration
      const res = await authApi.login(email, password);
      localStorage.setItem("token", res.access_token);
      navigate("/assessment");
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }
 
  return (
    <AuthLayout>
      <h1 className="auth-heading">Get Started</h1>
      <p className="auth-subheading">Create an account</p>
 
      {error && (
        <div className="auth-error" role="alert">{error}</div>
      )}
 
      <SignupForm onSubmit={handleSignup} loading={loading} />
    </AuthLayout>
  );
}
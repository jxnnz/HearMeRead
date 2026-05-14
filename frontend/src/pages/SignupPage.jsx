import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import SignupForm  from "../components/SignupForm";
import { authApi } from "../services/api";
import { parseApiError } from "../utils/apiError";

export default function SignupPage() {
  const navigate = useNavigate();
  const [error,   setError]   = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup({ firstName, lastName, email, password, role, depedSchoolId, schoolCode, schoolName, agreedToTerms, agreedToPrivacy }) {
    setError(null);
    setLoading(true);
    try {
      const result = await authApi.register({
        first_name:        firstName,
        last_name:         lastName,
        email,
        password,
        role:              role.toUpperCase(),
        deped_school_id:   depedSchoolId || undefined,
        school_code:       schoolCode,
        school_name:       schoolName,
        agreed_to_terms:   agreedToTerms,
        agreed_to_privacy: agreedToPrivacy,
      });

      if (role === "admin" && result.school_code) {
        navigate(`/signup/success?code=${result.school_code}`);
      } else {
        navigate("/login?registered=true");
      }
    } catch (err) {
      setError(parseApiError(err, "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout page="signup">
      <h1 className="auth-heading">Get Started</h1>
      <p className="auth-subheading">Create an account</p>

      {error && (
        <div className="auth-error" role="alert">{error}</div>
      )}

      <SignupForm onSubmit={handleSignup} loading={loading} />
    </AuthLayout>
  );
}

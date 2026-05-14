import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Check, Copy } from "lucide-react";
import AuthLayout from "../components/AuthLayout";

export default function SignupSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const code           = searchParams.get("code") || "";
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <AuthLayout page="signup">
      <div style={{ textAlign: "center" }}>
        {/* Success icon */}
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "#e8f5e9", display: "flex", alignItems: "center",
          justifyContent: "center", margin: "0 auto 16px",
        }}>
          <Check size={28} color="#27ae60" strokeWidth={2.5} />
        </div>

        <h1 className="auth-heading" style={{ marginBottom: 6 }}>Account Created!</h1>
        <p className="auth-subheading" style={{ marginBottom: 24 }}>
          Please check your email to verify your account.
        </p>

        {/* School code block */}
        {code && (
          <div style={{
            background: "#f0f6ff", border: "2px solid #2c7fc1",
            borderRadius: 12, padding: "20px 24px", marginBottom: 24,
          }}>
            <p style={{
              margin: "0 0 8px", fontSize: 11, fontWeight: 700,
              color: "#4a6fa5", textTransform: "uppercase", letterSpacing: ".8px",
              fontFamily: "Poppins, sans-serif",
            }}>
              Your School Code
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <span style={{
                fontSize: 28, fontWeight: 700, color: "#1e2d52",
                letterSpacing: 6, fontFamily: "monospace",
              }}>
                {code}
              </span>
              <button
                onClick={handleCopy}
                title="Copy school code"
                style={{
                  background: copied ? "#27ae60" : "#2c7fc1",
                  border: "none", borderRadius: 8, padding: "6px 10px",
                  color: "#fff", cursor: "pointer", display: "flex",
                  alignItems: "center", gap: 4, transition: "background 0.2s",
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "Poppins, sans-serif" }}>
                  {copied ? "Copied!" : "Copy"}
                </span>
              </button>
            </div>
            <p style={{
              margin: "10px 0 0", fontSize: 12, color: "#8a94b2",
              lineHeight: 1.5, fontFamily: "Poppins, sans-serif",
            }}>
              Share this code with your teachers so they can link to your school during signup.
              This code has also been sent to your email.
            </p>
          </div>
        )}

        <button
          className="auth-submit"
          style={{ marginTop: 0 }}
          onClick={() => navigate("/login")}
        >
          Go to Login
        </button>
      </div>
    </AuthLayout>
  );
}

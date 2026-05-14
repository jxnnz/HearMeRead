import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Check, Users, School } from "lucide-react";
import Layout from "../components/Layout";
import TopBar from "../components/TopBar";
import { adminApi } from "../services/api";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => {
    adminApi.getDashboard()
      .then(setData)
      .catch((err) => {
        if (err?.response?.status === 403) {
          navigate("/dashboard");
        } else {
          setError("Failed to load dashboard. Please refresh.");
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  function handleCopy() {
    if (!data?.school_code) return;
    navigator.clipboard.writeText(data.school_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ fontFamily: "Poppins, sans-serif", maxWidth: 900 }}>
          <TopBar title="Dashboard" />

          {/* School info card skeleton */}
          <div className="sk-card">
            <div className="sk-row-inline">
              <div className="sk sk-circle" />
              <div className="sk sk-h1" />
            </div>
            <div className="sk sk-badge" />
          </div>

          {/* Teachers table skeleton */}
          <div className="sk-card">
            <div className="sk-row-inline">
              <div className="sk sk-circle" />
              <div className="sk sk-h2" />
            </div>
            <div className="sk sk-row-sm" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="sk sk-row" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{ fontFamily: "Poppins, sans-serif", maxWidth: 900 }}>
          <TopBar title="Dashboard" />
          <p style={{ color: "#c0392b", textAlign: "center", padding: "64px 0" }}>
            {error}
          </p>
        </div>
      </Layout>
    );
  }

  const teachers = data?.teachers ?? [];

  return (
    <Layout>
      <div style={{ fontFamily: "Poppins, sans-serif", maxWidth: 900 }}>
        <TopBar title="Dashboard" />

        {/* ── School info card ────────────────────────────────────── */}
        <div style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 2px 16px rgba(44,62,107,.09)",
          padding: "28px 32px",
          marginBottom: 28,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <School size={20} color="#2c7fc1" />
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a2340" }}>
              {data.school_name}
            </h1>
          </div>

          {/* School code badge */}
          <div style={{
            background: "#f0f6ff",
            border: "2px solid #2c7fc1",
            borderRadius: 12,
            padding: "18px 24px",
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 6,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: "#4a6fa5",
              textTransform: "uppercase", letterSpacing: ".8px",
            }}>
              School Code
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{
                fontSize: 26, fontWeight: 700, color: "#1e2d52",
                letterSpacing: 5, fontFamily: "monospace",
              }}>
                {data.school_code}
              </span>
              <button
                onClick={handleCopy}
                title="Copy school code"
                style={{
                  background: copied ? "#27ae60" : "#2c7fc1",
                  border: "none", borderRadius: 8, padding: "6px 12px",
                  color: "#fff", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 5,
                  transition: "background 0.2s", fontFamily: "Poppins, sans-serif",
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span style={{ fontSize: 11, fontWeight: 600 }}>
                  {copied ? "Copied!" : "Copy"}
                </span>
              </button>
            </div>
            <span style={{ fontSize: 11, color: "#8a94b2", lineHeight: 1.5, maxWidth: 340 }}>
              Share this code with your teachers so they can link to your school during signup.
            </span>
          </div>
        </div>

        {/* ── Teachers list ────────────────────────────────────────── */}
        <div style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 2px 16px rgba(44,62,107,.09)",
          padding: "28px 32px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <Users size={18} color="#2c7fc1" />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a2340" }}>
              Teachers ({teachers.length})
            </h2>
          </div>

          {teachers.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "40px 0",
              color: "#8a94b2", fontSize: 13,
            }}>
              No teachers have linked to your school yet.<br />
              Share your school code to get started.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e8eaf2" }}>
                    {["Name", "Email", "Verified", "Role"].map((h) => (
                      <th key={h} style={{
                        textAlign: "left", padding: "8px 12px",
                        color: "#8a94b2", fontWeight: 600,
                        fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((t) => (
                    <tr key={t.id} style={{ borderBottom: "1px solid #f0f2f8" }}>
                      <td style={{ padding: "12px 12px", color: "#1a2340", fontWeight: 500 }}>
                        {t.first_name} {t.last_name}
                      </td>
                      <td style={{ padding: "12px 12px", color: "#4a5568" }}>
                        {t.email}
                      </td>
                      <td style={{ padding: "12px 12px" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: 11, fontWeight: 600, padding: "3px 8px",
                          borderRadius: 20,
                          background: t.is_verified ? "#e8f5e9" : "#fff3e0",
                          color: t.is_verified ? "#27ae60" : "#f39c12",
                        }}>
                          {t.is_verified ? <Check size={10} /> : null}
                          {t.is_verified ? "Verified" : "Pending"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 12px", color: "#8a94b2", fontSize: 12 }}>
                        {t.role === "ADMIN" ? "Admin" : "Teacher"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Copy, Check, School, Users, GraduationCap,
  ClipboardList, CheckCircle, BarChart3,
} from "lucide-react";
import Layout from "../components/Layout";
import TopBar from "../components/TopBar";
import { adminApi } from "../services/api";

const PERIOD_COLORS = {
  beginning: { bg: "#e8f5e9", color: "#27ae60", label: "Beginning" },
  middle:    { bg: "#e3f2fd", color: "#1565c0", label: "Middle"    },
  end:       { bg: "#f3e5f5", color: "#6a1b9a", label: "End"       },
};

function StatCard({ icon: Icon, iconColor, label, value, sub }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      boxShadow: "0 2px 12px rgba(44,62,107,.08)",
      padding: "20px 24px",
      display: "flex",
      alignItems: "flex-start",
      gap: 14,
      flex: "1 1 160px",
      minWidth: 0,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: `${iconColor}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={18} color={iconColor} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#1a2340", lineHeight: 1.1 }}>
          {value ?? "—"}
        </div>
        <div style={{ fontSize: 11, color: "#8a94b2", marginTop: 2, fontWeight: 500 }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: "#4a6fa5", marginTop: 3 }}>{sub}</div>
        )}
      </div>
    </div>
  );
}

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
        if (err?.response?.status === 403) navigate("/dashboard");
        else setError("Failed to load dashboard. Please refresh.");
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
        <div style={{ fontFamily: "Poppins, sans-serif", width: "100%" }}>
          <TopBar title="Dashboard" />
          <div className="sk-card"><div className="sk sk-h1" style={{ width: 220 }} /></div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
            {[1,2,3,4].map(i => <div key={i} className="sk-card" style={{ flex: "1 1 160px", height: 88 }} />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{ fontFamily: "Poppins, sans-serif", width: "100%" }}>
          <TopBar title="Dashboard" />
          <p style={{ color: "#c0392b", textAlign: "center", padding: "64px 0" }}>{error}</p>
        </div>
      </Layout>
    );
  }

  const pb = data?.period_breakdown ?? {};

  return (
    <Layout>
      <div style={{ fontFamily: "Poppins, sans-serif", width: "100%" }}>
        <TopBar title="Dashboard" />

        {/* ── School banner ─────────────────────────────────────── */}
        <div style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 2px 16px rgba(44,62,107,.09)",
          padding: "24px 28px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <School size={18} color="#2c7fc1" />
              <span style={{ fontSize: 18, fontWeight: 700, color: "#1a2340" }}>
                {data.school_name}
              </span>
            </div>
            {data.deped_school_id && (
              <div style={{ fontSize: 11, color: "#8a94b2" }}>
                DepEd ID: <strong>{data.deped_school_id}</strong>
              </div>
            )}
          </div>

          {/* School code badge */}
          <div style={{
            background: "#f0f6ff",
            border: "2px solid #2c7fc1",
            borderRadius: 12,
            padding: "12px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#4a6fa5", textTransform: "uppercase", letterSpacing: ".8px" }}>
              School Code
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: "#1e2d52", letterSpacing: 4, fontFamily: "monospace" }}>
                {data.school_code}
              </span>
              <button
                onClick={handleCopy}
                style={{
                  background: copied ? "#27ae60" : "#2c7fc1",
                  border: "none", borderRadius: 8, padding: "5px 10px",
                  color: "#fff", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                  fontFamily: "Poppins, sans-serif",
                  transition: "background 0.2s",
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span style={{ fontSize: 11, fontWeight: 600 }}>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
            <span style={{ fontSize: 10, color: "#8a94b2" }}>
              Share with teachers to link to your school.
            </span>
          </div>
        </div>

        {/* ── Stat cards ────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
          <StatCard
            icon={Users}       iconColor="#2c7fc1"
            label="Teachers"  value={data.total_teachers}
          />
          <StatCard
            icon={GraduationCap} iconColor="#8e44ad"
            label="Students Assessed" value={data.total_students_assessed}
          />
          <StatCard
            icon={ClipboardList} iconColor="#e67e22"
            label="Total Sessions"    value={data.total_sessions}
          />
          <StatCard
            icon={CheckCircle} iconColor="#27ae60"
            label="Completed"  value={data.completed_sessions}
            sub={data.total_sessions > 0 ? `${data.completion_rate}% completion rate` : null}
          />
        </div>

        {/* ── Period breakdown ──────────────────────────────────── */}
        <div style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 2px 16px rgba(44,62,107,.09)",
          padding: "22px 28px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <BarChart3 size={16} color="#2c7fc1" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1a2340" }}>
              Completed Sessions by Period
            </span>
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {Object.entries(PERIOD_COLORS).map(([key, { bg, color, label }]) => (
              <div key={key} style={{
                flex: "1 1 120px",
                background: bg,
                borderRadius: 12,
                padding: "16px 20px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 28, fontWeight: 700, color }}>{pb[key] ?? 0}</div>
                <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

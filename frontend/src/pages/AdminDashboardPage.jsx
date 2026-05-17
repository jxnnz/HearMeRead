import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Copy, Check, School, Users, GraduationCap,
  ClipboardList, CheckCircle, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  LabelList, ResponsiveContainer,
} from "recharts";
import Layout from "../components/Layout";
import TopBar from "../components/TopBar";
import { adminApi } from "../services/api";

const PERIOD_COLORS = {
  beginning: { bg: "#e8f5e9", color: "#27ae60", label: "Beginning" },
  middle:    { bg: "#e3f2fd", color: "#1565c0", label: "Middle"    },
  end:       { bg: "#f3e5f5", color: "#6a1b9a", label: "End"       },
};

const PROFILE_COLORS = {
  "Low Emerging Reader":    "#c0392b",
  "High Emerging Reader":   "#e67e22",
  "Developing Reader":      "#f1c40f",
  "Transitioning Reader":   "#2c3e6b",
  "Reading at Grade Level": "#27ae60",
};
const PROFILES = Object.keys(PROFILE_COLORS);

function currentSchoolYear() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

// Return only periods that have already started in the Philippine school calendar
function visiblePeriods() {
  const m = new Date().getMonth() + 1; // 1-12
  if (m >= 6 && m <= 9)  return ["beginning"];
  if (m >= 10 || m === 1) return ["beginning", "middle"];
  return ["beginning", "middle", "end"]; // Feb–May
}

function ProfileTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "1px solid #eee",
      borderRadius: 8, padding: "8px 12px", fontSize: 12,
    }}>
      <p style={{ fontWeight: 700, marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill, margin: "2px 0" }}>
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  );
}

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

  const pb  = data?.period_breakdown   ?? {};
  const pbp = data?.profile_by_period  ?? {};
  const shown = visiblePeriods();

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

        {/* ── Period breakdown (past + current only) ────────────── */}
        <div style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 2px 16px rgba(44,62,107,.09)",
          padding: "22px 28px",
          marginBottom: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <BarChart3 size={16} color="#2c7fc1" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1a2340" }}>
              Completed Sessions by Period
            </span>
          </div>
          <p style={{ fontSize: 11, color: "#8a94b2", margin: "0 0 16px 0" }}>
            {currentSchoolYear()}
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={shown.map((key) => ({
                period: PERIOD_COLORS[key].label,
                Female: pb[key]?.female ?? 0,
                Male:   pb[key]?.male   ?? 0,
                Total:  pb[key]?.total  ?? 0,
              }))}
              margin={{ top: 16, right: 16, left: -16, bottom: 0 }}
              barCategoryGap="20%"
              barGap={2}
            >
              <XAxis
                dataKey="period"
                tick={{ fontSize: 12, fontFamily: "Poppins" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fontFamily: "Poppins" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, fontFamily: "Poppins", borderRadius: 8 }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, fontFamily: "Poppins", paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar dataKey="Female" fill="#e07070" radius={[3,3,0,0]} maxBarSize={36}>
                <LabelList dataKey="Female" position="insideTop"
                  formatter={(v) => (v > 0 ? v : "")}
                  style={{ fill: "#fff", fontSize: 9, fontFamily: "Poppins", fontWeight: 700 }} />
              </Bar>
              <Bar dataKey="Male" fill="#4a6fa5" radius={[3,3,0,0]} maxBarSize={36}>
                <LabelList dataKey="Male" position="insideTop"
                  formatter={(v) => (v > 0 ? v : "")}
                  style={{ fill: "#fff", fontSize: 9, fontFamily: "Poppins", fontWeight: 700 }} />
              </Bar>
              <Bar dataKey="Total" fill="#2c7fc1" radius={[3,3,0,0]} maxBarSize={36}>
                <LabelList dataKey="Total" position="insideTop"
                  formatter={(v) => (v > 0 ? v : "")}
                  style={{ fill: "#fff", fontSize: 9, fontFamily: "Poppins", fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Reading Profile % per Assessment Period ────────────── */}
        <div style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 2px 16px rgba(44,62,107,.09)",
          padding: "22px 28px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <BarChart3 size={16} color="#2c7fc1" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1a2340" }}>
              Percentage of Students Assessed by Reading Profile
            </span>
          </div>
          <p style={{ fontSize: 11, color: "#8a94b2", margin: "0 0 16px 0" }}>
            Per assessment period — {currentSchoolYear()}
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={shown.map((key) => ({
                period: PERIOD_COLORS[key].label,
                ...PROFILES.reduce((acc, p) => {
                  acc[p] = pbp[key]?.[p] ?? 0;
                  return acc;
                }, {}),
              }))}
              margin={{ top: 16, right: 16, left: -16, bottom: 0 }}
              barCategoryGap="20%"
              barGap={2}
            >
              <XAxis
                dataKey="period"
                tick={{ fontSize: 12, fontFamily: "Poppins" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fontFamily: "Poppins" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip content={<ProfileTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, fontFamily: "Poppins", paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              {PROFILES.map((profile) => (
                <Bar
                  key={profile}
                  dataKey={profile}
                  name={profile}
                  fill={PROFILE_COLORS[profile]}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={36}
                >
                  <LabelList
                    dataKey={profile}
                    position="insideTop"
                    formatter={(v) => (v > 0 ? `${v}%` : "")}
                    style={{ fill: "#fff", fontSize: 9, fontFamily: "Poppins", fontWeight: 700 }}
                  />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </Layout>
  );
}

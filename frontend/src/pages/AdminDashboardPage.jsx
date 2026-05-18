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
import { useWindowWidth } from "../hooks/useWindowWidth";
import "./AdminDashboard.css";

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

function visiblePeriods() {
  const m = new Date().getMonth() + 1;
  if (m >= 6 && m <= 9)  return ["beginning"];
  if (m >= 10 || m === 1) return ["beginning", "middle"];
  return ["beginning", "middle", "end"];
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
    <div className="adm-stat-card">
      <div className="adm-stat-card__icon-box" style={{ background: `${iconColor}18` }}>
        <Icon size={18} color={iconColor} />
      </div>
      <div className="adm-stat-card__body">
        <div className="adm-stat-card__value">{value ?? "—"}</div>
        <div className="adm-stat-card__label">{label}</div>
        {sub && <div className="adm-stat-card__sub">{sub}</div>}
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

  const windowWidth = useWindowWidth();
  const isMobile    = windowWidth <= 768;

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
        <div className="adm-page">
          <TopBar title="Dashboard" />
          <div className="sk-card"><div className="sk sk-h1" style={{ width: 220 }} /></div>
          <div className="adm-stats-row">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="sk-card adm-stat-card" style={{ height: 88 }} />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="adm-page">
          <TopBar title="Dashboard" />
          <p style={{ color: "#c0392b", textAlign: "center", padding: "64px 0" }}>{error}</p>
        </div>
      </Layout>
    );
  }

  const pb   = data?.period_breakdown  ?? {};
  const pbp  = data?.profile_by_period ?? {};
  const shown = visiblePeriods();

  const sessionChartHeight = isMobile ? 160 : 220;
  const profileChartHeight = isMobile ? 180 : 260;
  const chartFontSize      = isMobile ? 10  : 12;
  const axisFontSize       = isMobile ? 9   : 11;

  return (
    <Layout>
      <div className="adm-page">
        <TopBar title="Dashboard" />

        {/* School banner */}
        <div className="adm-banner">
          <div>
            <div className="adm-banner__name">
              <School size={isMobile ? 15 : 18} color="#2c7fc1" />
              <span className="adm-banner__name-text">{data.school_name}</span>
            </div>
            {data.deped_school_id && (
              <div className="adm-banner__dep-id">
                DepEd ID: <strong>{data.deped_school_id}</strong>
              </div>
            )}
          </div>

          <div className="adm-school-code">
            <span className="adm-school-code__label">School Code</span>
            <div className="adm-school-code__row">
              <span className="adm-school-code__value">{data.school_code}</span>
              <button
                onClick={handleCopy}
                className="adm-copy-btn"
                style={{ background: copied ? "#27ae60" : "#2c7fc1" }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
            <span className="adm-school-code__hint">Share with teachers to link to your school.</span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="adm-stats-row">
          <StatCard
            icon={Users}         iconColor="#2c7fc1"
            label="Teachers"     value={data.total_teachers}
          />
          <StatCard
            icon={GraduationCap} iconColor="#8e44ad"
            label="Students Assessed" value={data.total_students_assessed}
          />
          <StatCard
            icon={ClipboardList} iconColor="#e67e22"
            label="Total Sessions"   value={data.total_sessions}
          />
          <StatCard
            icon={CheckCircle}   iconColor="#27ae60"
            label="Completed"    value={data.completed_sessions}
            sub={data.total_sessions > 0 ? `${data.completion_rate}% completion rate` : null}
          />
        </div>

        {/* Period breakdown */}
        <div className="adm-chart-card">
          <div className="adm-chart-header">
            <BarChart3 size={16} color="#2c7fc1" />
            <span className="adm-chart-title">Completed Sessions by Period</span>
          </div>
          <p className="adm-chart-sub">{currentSchoolYear()}</p>
          <ResponsiveContainer width="100%" height={sessionChartHeight}>
            <BarChart
              data={shown.map((key) => ({
                period: PERIOD_COLORS[key].label,
                Female: pb[key]?.female ?? 0,
                Male:   pb[key]?.male   ?? 0,
                Total:  pb[key]?.total  ?? 0,
              }))}
              margin={{ top: 16, right: 8, left: -20, bottom: 0 }}
              barCategoryGap="20%"
              barGap={2}
            >
              <XAxis
                dataKey="period"
                tick={{ fontSize: chartFontSize, fontFamily: "Poppins" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: axisFontSize, fontFamily: "Poppins" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={{ fontSize: 12, fontFamily: "Poppins", borderRadius: 8 }} />
              <Legend
                wrapperStyle={{ fontSize: axisFontSize, fontFamily: "Poppins", paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar dataKey="Female" fill="#e07070" radius={[3, 3, 0, 0]} maxBarSize={36}>
                {!isMobile && <LabelList dataKey="Female" position="insideTop"
                  formatter={(v) => (v > 0 ? v : "")}
                  style={{ fill: "#fff", fontSize: 9, fontFamily: "Poppins", fontWeight: 700 }} />}
              </Bar>
              <Bar dataKey="Male" fill="#4a6fa5" radius={[3, 3, 0, 0]} maxBarSize={36}>
                {!isMobile && <LabelList dataKey="Male" position="insideTop"
                  formatter={(v) => (v > 0 ? v : "")}
                  style={{ fill: "#fff", fontSize: 9, fontFamily: "Poppins", fontWeight: 700 }} />}
              </Bar>
              <Bar dataKey="Total" fill="#2c7fc1" radius={[3, 3, 0, 0]} maxBarSize={36}>
                {!isMobile && <LabelList dataKey="Total" position="insideTop"
                  formatter={(v) => (v > 0 ? v : "")}
                  style={{ fill: "#fff", fontSize: 9, fontFamily: "Poppins", fontWeight: 700 }} />}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Reading Profile % per Assessment Period */}
        <div className="adm-chart-card">
          <div className="adm-chart-header">
            <BarChart3 size={16} color="#2c7fc1" />
            <span className="adm-chart-title">Percentage of Students Assessed by Reading Profile</span>
          </div>
          <p className="adm-chart-sub">Per assessment period — {currentSchoolYear()}</p>
          <ResponsiveContainer width="100%" height={profileChartHeight}>
            <BarChart
              data={shown.map((key) => ({
                period: PERIOD_COLORS[key].label,
                ...PROFILES.reduce((acc, p) => {
                  acc[p] = pbp[key]?.[p] ?? 0;
                  return acc;
                }, {}),
              }))}
              margin={{ top: 16, right: 8, left: -20, bottom: 0 }}
              barCategoryGap="20%"
              barGap={2}
            >
              <XAxis
                dataKey="period"
                tick={{ fontSize: chartFontSize, fontFamily: "Poppins" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: axisFontSize, fontFamily: "Poppins" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip content={<ProfileTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: axisFontSize, fontFamily: "Poppins", paddingTop: 8 }}
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
                  {!isMobile && (
                    <LabelList
                      dataKey={profile}
                      position="insideTop"
                      formatter={(v) => (v > 0 ? `${v}%` : "")}
                      style={{ fill: "#fff", fontSize: 9, fontFamily: "Poppins", fontWeight: 700 }}
                    />
                  )}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </Layout>
  );
}

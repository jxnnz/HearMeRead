// ============================================================
// HearMeRead — Dashboard Page
// Route: /dashboard
// API: GET /dashboard/summary?school_year=X
// ============================================================
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Download } from "lucide-react";

import Layout                    from "../components/Layout";
import TopBar                   from "../components/TopBar";
import DashboardStatCard         from "../components/DashboardStatCard";
import ReadingProfileChart       from "../components/ReadingProfileChart";
import FluencyComprehensionChart from "../components/FluencyComprehensionChart";
import * as XLSX from "xlsx";
import { dashboardApi, studentsApi, authApi } from "../services/api";
import TeacherProfileModal from "../components/TeacherProfileModal";

import "./DashboardPage.css";

// ── School year helper ───────────────────────────────────────
function currentSchoolYear() {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth() + 1;
  return m >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

// ── Score color logic ────────────────────────────────────────
function getScoreColor(value, type = "percent") {
  const num = parseFloat(value);
  if (isNaN(num) || value == null) return "#8a94b2";

  if (type === "percent") {
    if (num >= 85) return "#27ae60";
    if (num >= 75) return "#f39c12";
    if (num >= 60) return "#e67e22";
    return "#e74c3c";
  }
  if (type === "wpm") {
    if (num >= 80) return "#27ae60";
    if (num >= 60) return "#f39c12";
    if (num >= 40) return "#e67e22";
    return "#e74c3c";
  }
  if (type === "error") {
    if (num <= 5)  return "#27ae60";
    if (num <= 10) return "#f39c12";
    if (num <= 20) return "#e67e22";
    return "#e74c3c";
  }
  if (type === "sessions") {
    if (num >= 20) return "#27ae60";
    if (num >= 10) return "#f39c12";
    if (num >= 5)  return "#e67e22";
    return "#e74c3c";
  }
  return "#27ae60";
}

// ── Export dashboard data to Excel ──────────────────────────
function exportDashboardXlsx(students, profileData, genderData, schoolYear) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Students
  const studentRows = students.map((s) => ({
    ID: s.id,
    "First Name": s.first_name,
    "Last Name": s.last_name,
    LRN: s.lrn ?? "",
    Grade: s.grade_level,
    Section: s.section ?? "",
    Sex: s.sex ?? "",
    "Reading Profile": s.reading_profile ?? "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(studentRows), "Students");

  // Sheet 2: Reading Profile Distribution
  const PROFILES = [
    "Low Emerging Reader", "High Emerging Reader", "Developing Reader",
    "Transitioning Reader", "Reading at Grade Level",
  ];
  const profileRows = PROFILES.map((p) => ({
    "Reading Profile": p,
    "Female (%)": profileData.female?.[p] ?? 0,
    "Male (%)": profileData.male?.[p] ?? 0,
    "Total (%)": profileData.total?.[p] ?? 0,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(profileRows), "Reading Profile Distribution");

  // Sheet 3: Gender Distribution
  const genderRows = [
    { Sex: "Female", Count: genderData.female ?? 0 },
    { Sex: "Male",   Count: genderData.male   ?? 0 },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(genderRows), "Gender Distribution");

  XLSX.writeFile(wb, `hearmeread_dashboard_${schoolYear}.xlsx`);
}

// ============================================================
export default function DashboardPage() {
  const navigate   = useNavigate();
  const schoolYear = currentSchoolYear();

  const [stats,       setStats]       = useState(null);
  const [profileData, setProfileData] = useState({});
  const [genderData,  setGenderData]  = useState({});
  const [fluencyAcc,  setFluencyAcc]  = useState([]);
  const [fluencyWpm,  setFluencyWpm]  = useState([]);
  const [students,    setStudents]    = useState([]);
  const [user,        setUser]        = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  useEffect(() => {
    Promise.all([
      dashboardApi.getSummary(schoolYear),
      studentsApi.list(),
      authApi.me(),
    ])
      .then(([summary, studentData, userData]) => {
        setStats({
          totalStudents:    summary.stats.total_students,
          totalAssessed:    summary.stats.total_assessed,
          classAvgAccuracy: summary.stats.avg_accuracy_pct,
          avgErrorRate:     summary.stats.avg_error_rate,
        });
        setProfileData(summary.profile_distribution);
        setGenderData(summary.gender_distribution);
        setFluencyAcc(summary.fluency_accuracy);
        setFluencyWpm(summary.fluency_wpm);
        setStudents(studentData.students ?? []);
        setUser(userData);
      })
      .catch((e) => {
        const detail = e.response?.data?.detail;
        const msg = Array.isArray(detail)
          ? detail[0]?.msg ?? "Validation error"
          : (detail || e.message || "Failed to load dashboard.");
        setError(typeof msg === "string" ? msg : JSON.stringify(msg));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [schoolYear]);

  function handleExport() {
    exportDashboardXlsx(students, profileData, genderData, schoolYear);
  }

  // ── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="db-page">
          <TopBar title="Dashboard" />

          {/* Stat cards skeleton */}
          <div className="db-stats-row">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="db-skeleton-stat">
                <div className="db-skeleton db-skeleton-stat__value" />
                <div className="db-skeleton db-skeleton-stat__label" />
              </div>
            ))}
          </div>

          {/* Profile chart + pie skeleton */}
          <div style={{ display: "flex", gap: "16px" }}>
            <div className="db-skeleton-chart" style={{ flex: 1 }}>
              <div className="db-skeleton db-skeleton-chart__title" />
              <div className="db-skeleton db-skeleton-chart__body" />
            </div>
            <div className="db-skeleton-chart" style={{ width: "240px", flexShrink: 0 }}>
              <div className="db-skeleton db-skeleton-chart__title" />
              <div className="db-skeleton db-skeleton-chart__body" />
            </div>
          </div>

          {/* Fluency charts skeleton */}
          {[1, 2].map((i) => (
            <div key={i} className="db-skeleton-chart">
              <div className="db-skeleton db-skeleton-chart__title" />
              <div className="db-skeleton db-skeleton-chart__body" style={{ height: "200px" }} />
            </div>
          ))}
        </div>
      </Layout>
    );
  }

  // ── Error state ───────────────────────────────────────────
  if (error) {
    return (
      <Layout>
        <div className="db-page">
          <TopBar title="Dashboard" />
          <p style={{ color: "#e74c3c", textAlign: "center", padding: "64px 0" }}>
            ⚠ {error}
          </p>
        </div>
      </Layout>
    );
  }

  const noA2Data = stats?.classAvgAccuracy == null;

  // ============================================================
  return (
    <Layout>
      <div className="db-page">

        {/* ── Page header ── */}
        <TopBar title="Dashboard">
          {user && (
            <button 
              className="db-avatar-btn" 
              onClick={() => setShowProfile(true)}
              title="My Profile"
            >
              {user.profile_picture_url ? (
                <img src={user.profile_picture_url} alt="Profile" className="db-avatar-img" />
              ) : (
                <span className="db-avatar-initials">
                  {(user.first_name?.[0] || "") + (user.last_name?.[0] || "")}
                </span>
              )}
            </button>
          )}
        </TopBar>

        {/* ── School year indicator ── */}
        <p className="db-school-year">School Year: {schoolYear}</p>

        {/* ── Section 1: Stat cards ── */}
        <div className="db-stats-row">
          <DashboardStatCard
            value={stats.totalStudents}
            label="Total Students"
            color={getScoreColor(stats.totalStudents, "sessions")}
          />
          <DashboardStatCard
            value={stats.classAvgAccuracy != null ? `${stats.classAvgAccuracy}%` : "—"}
            label="Class Average Accuracy"
            color={getScoreColor(stats.classAvgAccuracy, "percent")}
          />
          <DashboardStatCard
            value={stats.totalAssessed}
            label="Total Assessed"
            color={getScoreColor(stats.totalAssessed, "sessions")}
          />
          <DashboardStatCard
            value={stats.avgErrorRate != null ? `${stats.avgErrorRate}%` : "—"}
            label="Average Error Rate"
            color={getScoreColor(stats.avgErrorRate, "error")}
          />
        </div>

        {/* ── Section 2: Reading Profile bar + Gender pie ── */}
        <ReadingProfileChart
          data={profileData}
          genderData={genderData}
        />

        {/* ── Section 3 & 4: Fluency / Comprehension charts (A2 students only) ── */}
        {noA2Data ? (
          <div className="db-chart-card db-chart-card--full" style={{ textAlign: "center", padding: "32px" }}>
            <p style={{ color: "#8a94b2", fontSize: 14 }}>
              No Assessment 2 data yet for {schoolYear}. Charts will appear once students complete Assessment 2.
            </p>
          </div>
        ) : (
          <>
            <FluencyComprehensionChart
              data={fluencyAcc}
              title="Reading Fluency and Comprehension Average Percentage"
              unit="%"
            />
            <FluencyComprehensionChart
              data={fluencyWpm}
              title="Reading Fluency and Comprehension Average Words Per Minute"
              unit=" WPM"
            />
          </>
        )}

      </div>
      {showProfile && user && (
        <TeacherProfileModal 
          user={user} 
          onClose={() => setShowProfile(false)} 
          onProfileUpdated={setUser} 
        />
      )}
    </Layout>
  );
}

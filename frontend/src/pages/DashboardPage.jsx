// ============================================================
// HearMeRead — Dashboard Page
// Route: /dashboard
//
// Sections:
//   1. Stat row   — Class Avg Accuracy, WPM, Sessions, Error Rate
//   2. Charts row — Reading Profile bar + Gender pie
//   3. Fluency & Comprehension Average %
//   4. Fluency & Comprehension Average WPM
//
// API (final — DO NOT DELETE):
// GET /dashboard/stats?school_year=X  → summary stats
// GET /dashboard/charts?school_year=X → chart data
// ============================================================
import { useNavigate } from "react-router-dom";
import { Plus, Download } from "lucide-react";

import Layout                    from "../components/Layout";
import DashboardStatCard         from "../components/DashboardStatCard";
import ReadingProfileChart       from "../components/ReadingProfileChart";
import FluencyComprehensionChart from "../components/FluencyComprehensionChart";
import { MOCK_STUDENTS }         from "../data/mockData";

import "./DashboardPage.css";

// ── School year helper ───────────────────────────────────────
function currentSchoolYear() {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth() + 1;
  return m >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

// ── Score color logic ────────────────────────────────────────
// Returns a color string based on score value and metric type.
// type = "percent" | "wpm" | "error" | "sessions"
function getScoreColor(value, type = "percent") {
  const num = parseFloat(value);
  if (isNaN(num)) return "#8a94b2";

  if (type === "percent") {
    // Accuracy: higher is better
    if (num >= 85) return "#27ae60"; // 🟢 green  — excellent
    if (num >= 75) return "#f39c12"; // 🟠 orange — good
    if (num >= 60) return "#e67e22"; // 🟡 amber  — fair
    return "#e74c3c";                // 🔴 red    — needs improvement
  }

  if (type === "wpm") {
    // WPM: Grade 2 CRLA benchmark ~53–80 wpm
    if (num >= 80) return "#27ae60"; // 🟢 at/above grade level
    if (num >= 60) return "#f39c12"; // 🟠 approaching
    if (num >= 40) return "#e67e22"; // 🟡 developing
    return "#e74c3c";                // 🔴 below
  }

  if (type === "error") {
    // Error rate: lower is better (reverse scale)
    if (num <= 5)  return "#27ae60"; // 🟢 very few errors
    if (num <= 10) return "#f39c12"; // 🟠 moderate
    if (num <= 20) return "#e67e22"; // 🟡 high
    return "#e74c3c";                // 🔴 very high
  }

  if (type === "sessions") {
    // Sessions completed: higher is better
    if (num >= 20) return "#27ae60"; // 🟢
    if (num >= 10) return "#f39c12"; // 🟠
    if (num >= 5)  return "#e67e22"; // 🟡
    return "#e74c3c";                // 🔴
  }

  return "#27ae60";
}

// ── Mock dashboard data ──────────────────────────────────────
// DELETE AFTER backend is ready
const MOCK_STATS = {
  classAvgAccuracy:  84.7,
  totalStudents:     131,
  totalAssessed:     15,
  avgErrorRate:      7,
};

const MOCK_PROFILE_DATA = {
  female: {
    "Low Emerging Reader":    49,
    "High Emerging Reader":   0,
    "Developing Reader":      0,
    "Transitioning Reader":   46,
    "Reading at Grade Level": 9,
  },
  male: {
    "Low Emerging Reader":    40,
    "High Emerging Reader":   0,
    "Developing Reader":      0,
    "Transitioning Reader":   42,
    "Reading at Grade Level": 10,
  },
  total: {
    "Low Emerging Reader":    50,
    "High Emerging Reader":   0,
    "Developing Reader":      0,
    "Transitioning Reader":   53,
    "Reading at Grade Level": 28,
  },
};

const MOCK_GENDER_DATA = { female: 54.86, male: 45.6 };

const MOCK_FLUENCY_ACCURACY = [
  { group: "All",    fluency: 79, comprehension: 74 },
  { group: "Female", fluency: 83, comprehension: 78 },
  { group: "Male",   fluency: 76, comprehension: 71 },
];

const MOCK_FLUENCY_WPM = [
  { group: "All",    fluency: 77, comprehension: 65 },
  { group: "Female", fluency: 82, comprehension: 70 },
  { group: "Male",   fluency: 72, comprehension: 60 },
];

// ── Export students to CSV ───────────────────────────────────
function exportStudentsCSV(students, schoolYear) {
  const headers = [
    "ID", "First Name", "Last Name", "LRN",
    "Grade", "Section", "Sex", "Reading Profile",
  ];
  const rows = students.map((s) =>
    [
      s.id, s.first_name, s.last_name, s.lrn ?? "",
      s.grade_level, s.section ?? "", s.sex ?? "",
      s.reading_profile ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );

  const csv  = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `hearmeread_students_${schoolYear}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
export default function DashboardPage() {
  const navigate   = useNavigate();
  const schoolYear = currentSchoolYear();

  // FINAL CODE — DO NOT DELETE:
  /*
  const [stats,       setStats]       = useState(null);
  const [profileData, setProfileData] = useState({});
  const [genderData,  setGenderData]  = useState({});
  const [fluencyAcc,  setFluencyAcc]  = useState([]);
  const [fluencyWpm,  setFluencyWpm]  = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    dashboardApi.getStats(schoolYear).then(setStats);
    dashboardApi.getCharts(schoolYear).then((data) => {
      setProfileData(data.profileData);
      setGenderData(data.genderData);
      setFluencyAcc(data.fluencyAccuracy);
      setFluencyWpm(data.fluencyWpm);
      setLoading(false);
    });
  }, [schoolYear]);
  */

  // Mock data (temporary) — DELETE AFTER backend is ready
  const stats       = MOCK_STATS;
  const profileData = MOCK_PROFILE_DATA;
  const genderData  = MOCK_GENDER_DATA;
  const fluencyAcc  = MOCK_FLUENCY_ACCURACY;
  const fluencyWpm  = MOCK_FLUENCY_WPM;

  function handleExport() {
    exportStudentsCSV(MOCK_STUDENTS, schoolYear);
  }

  // ============================================================
  return (
    <Layout>
      <div className="db-page">

        {/* ── Page header ── */}
        <div className="db-header">
          <h1 className="db-title">Dashboard</h1>
          <div className="db-header__actions">
            <button
              className="db-btn db-btn--new"
              onClick={() => navigate("/assessment")}
            >
              <Plus size={15} />
              New Session
            </button>
            <button
              className="db-btn db-btn--export"
              onClick={handleExport}
            >
              <Download size={15} />
              Export
            </button>
          </div>
        </div>

        {/* ── School year indicator ── */}
        <p className="db-school-year">School Year: {schoolYear}</p>

        {/* ── Section 1: Stat cards with dynamic colors ── */}
        <div className="db-stats-row">
          <DashboardStatCard
            value={stats.totalStudents}
            label="Total Students"
            color={getScoreColor(stats.totalStudents, "sessions")}
          />
          <DashboardStatCard
            value={`${stats.classAvgAccuracy}%`}
            label="Class Average Accuracy"
            color={getScoreColor(stats.classAvgAccuracy, "percent")}
          />
          <DashboardStatCard
            value={stats.totalAssessed}
            label="Total Assessed"
            color={getScoreColor(stats.totalAssessed, "sessions")}
          />
          <DashboardStatCard
            value={stats.avgErrorRate}
            label="Average Error Rate"
            color={getScoreColor(stats.avgErrorRate, "error")}
          />
        </div>

        {/* ── Section 2: Reading Profile bar + Gender pie ── */}
        <ReadingProfileChart
          data={profileData}
          genderData={genderData}
        />

        {/* ── Section 3: Fluency & Comprehension Average % ── */}
        <FluencyComprehensionChart
          data={fluencyAcc}
          title="Reading Fluency and Comprehension Average %"
          unit="%"
        />

        {/* ── Section 4: Fluency & Comprehension Average WPM ── */}
        <FluencyComprehensionChart
          data={fluencyWpm}
          title="Reading Fluency and Comprehension Average Words Per Minute"
          unit=" WPM"
        />

      </div>
    </Layout>
  );
}

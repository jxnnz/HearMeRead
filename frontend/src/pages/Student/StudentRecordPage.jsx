import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users } from "lucide-react";

import Layout from "../../components/Layout";
import AppButton from "../../components/AppButton";
import { studentsApi } from "../../services/api";

import "../pages css/StudentRecordPage.css";

const PERIOD_OPTIONS = [
  { value: "beginning", label: "Beginning" },
  { value: "middle",    label: "Middle"    },
  { value: "end",       label: "End"       },
];

function formatGrade(gl) {
  if (!gl) return "Unknown";
  if (gl === "kindergarten") return "Kindergarten";
  return `Grade ${gl.replace("grade_", "")}`;
}

function currentSchoolYear() {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() < 5 ? `${y - 1}-${y}` : `${y}-${y + 1}`;
}

function groupStudents(students) {
  const groups = {};
  for (const s of students) {
    const grade   = s.grade_level ?? "unknown";
    const section = s.section     ?? "No Section";
    const key     = `${grade}||${section}`;
    if (!groups[key]) groups[key] = { grade_level: grade, section, students: [] };
    groups[key].students.push(s);
  }
  return Object.values(groups).sort((a, b) => {
    const gCmp = String(a.grade_level).localeCompare(String(b.grade_level));
    if (gCmp !== 0) return gCmp;
    return a.section.localeCompare(b.section);
  });
}

export default function StudentRecordPage() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const [schoolYear, setSchoolYear] = useState(currentSchoolYear());
  const [period, setPeriod]         = useState("beginning");

  useEffect(() => {
    studentsApi
      .list({ page_size: 200 })
      .then((data) => setStudents(data.students || []))
      .catch((e) => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, []);

  const groups = groupStudents(students);

  function handleCardClick(grade_level, section) {
    const params = new URLSearchParams({
      grade:   grade_level,
      section: section === "No Section" ? "" : section,
      year:    schoolYear,
      period,
    });
    navigate(`/students/class?${params.toString()}`);
  }

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? period;

  return (
    <Layout>
      <div className="sr-page">

        {/* ── Header ── */}
        <div className="sr-header">
          <h1 className="sr-title">Student Record</h1>
          <AppButton variant="teal" onClick={() => navigate("/students/add")}>
            <Plus size={15} />
            Add Student
          </AppButton>
        </div>

        {/* ── Global Filters ── */}
        <div className="sr-filters">
          <div className="sr-filter-field">
            <label htmlFor="sr-year">School Year</label>
            <input
              id="sr-year"
              type="text"
              className="sr-filter-input"
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              placeholder="e.g. 2025-2026"
            />
          </div>
          <div className="sr-filter-field">
            <label htmlFor="sr-period">Assessment Period</label>
            <select
              id="sr-period"
              className="sr-filter-input"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              {PERIOD_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── States ── */}
        {loading && (
          <div className="sr-state">
            <div className="sr-spinner" />
            <p>Loading classes…</p>
          </div>
        )}

        {error && !loading && (
          <div className="sr-state sr-state--error">
            <p>⚠ {error}</p>
          </div>
        )}

        {!loading && !error && groups.length === 0 && (
          <div className="sr-state">
            <Users size={42} strokeWidth={1.2} />
            <p>No students yet. Add a student to get started.</p>
            <AppButton variant="teal" onClick={() => navigate("/students/add")}>
              <Plus size={15} /> Add Student
            </AppButton>
          </div>
        )}

        {/* ── Class Cards ── */}
        {!loading && !error && groups.length > 0 && (
          <div className="sr-class-grid">
            {groups.map((g) => (
              <div
                key={`${g.grade_level}||${g.section}`}
                className="sr-class-card"
                onClick={() => handleCardClick(g.grade_level, g.section)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleCardClick(g.grade_level, g.section)}
                aria-label={`View ${formatGrade(g.grade_level)} ${g.section}`}
              >
                <h2 className="sr-class-card__title">
                  {formatGrade(g.grade_level)}
                  {g.section !== "No Section" && ` — ${g.section}`}
                </h2>
                <p className="sr-class-card__meta">
                  {schoolYear} &nbsp;·&nbsp; {periodLabel}
                </p>
                <span className="sr-class-card__count">
                  {g.students.length} {g.students.length === 1 ? "student" : "students"}
                </span>
              </div>
            ))}
          </div>
        )}

      </div>
    </Layout>
  );
}

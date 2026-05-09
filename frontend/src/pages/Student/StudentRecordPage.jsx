import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users, Upload } from "lucide-react";

import Layout from "../../components/Layout";
import AppButton from "../../components/AppButton";
import ImportRecordsModal from "../../modals/ImportRecordsModal";
import StudentInfoModal from "../../modals/StudentInfoModal";
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


export default function StudentRecordPage() {
  const navigate = useNavigate();

  const [selectedSessionId, setSelectedSessionId] = useState(null);

  const [classes, setClasses]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [showImport, setShowImport]   = useState(false);

  const [schoolYears, setSchoolYears] = useState([]);
  const [schoolYear, setSchoolYear]   = useState(currentSchoolYear());
  const [period, setPeriod]           = useState("beginning");

  const loadClasses = useCallback(() => {
    setLoading(true);
    studentsApi
      .listClasses()
      .then((data) => setClasses(data.classes || []))
      .catch((e) => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  useEffect(() => {
    studentsApi.listSchoolYears().then((data) => {
      const years = data.school_years || [];
      setSchoolYears(years);
      if (years.length > 0 && !years.includes(schoolYear)) {
        setSchoolYear(years[0]);
      }
    }).catch(() => {});
  }, []);

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
          <div className="sr-header-actions">
            <AppButton variant="ghost" onClick={() => setShowImport(true)}>
              <Upload size={15} />
              Import Records
            </AppButton>
            <AppButton variant="teal" onClick={() => navigate("/students/add")}>
              <Plus size={15} />
              Add Student
            </AppButton>
          </div>
        </div>

        {/* ── Global Filters ── */}
        <div className="sr-filters">
          <div className="sr-filter-field">
            <label htmlFor="sr-year">School Year</label>
            {schoolYears.length > 0 ? (
              <select
                id="sr-year"
                className="sr-filter-input"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
              >
                {schoolYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            ) : (
              <input
                id="sr-year"
                type="text"
                className="sr-filter-input"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                placeholder="e.g. 2025-2026"
              />
            )}
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
          <div className="sr-class-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="sr-skeleton-card">
                <div className="sr-skeleton sr-skeleton-card__title" />
                <div className="sr-skeleton sr-skeleton-card__meta" />
                <div className="sr-skeleton sr-skeleton-card__badge" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="sr-state sr-state--error">
            <p>⚠ {error}</p>
          </div>
        )}

        {!loading && !error && classes.length === 0 && (
          <div className="sr-state">
            <Users size={42} strokeWidth={1.2} />
            <p>No classes yet. Add a student to get started.</p>
            <AppButton variant="teal" onClick={() => navigate("/students/add")}>
              <Plus size={15} /> Add Student
            </AppButton>
          </div>
        )}

        {/* ── Class Cards ── */}
        {!loading && !error && classes.length > 0 && (
          <div className="sr-class-grid">
            {classes.map((c) => (
              <div
                key={`${c.grade_level}||${c.section}`}
                className="sr-class-card"
                onClick={() => handleCardClick(c.grade_level, c.section)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleCardClick(c.grade_level, c.section)}
                aria-label={`View ${formatGrade(c.grade_level)} ${c.section}`}
              >
                <h2 className="sr-class-card__title">
                  {formatGrade(c.grade_level)}
                  {c.section !== "No Section" && ` — ${c.section}`}
                </h2>
                <p className="sr-class-card__meta">
                  {schoolYear} &nbsp;·&nbsp; {periodLabel}
                </p>
                <span className="sr-class-card__count">
                  {c.student_count} {c.student_count === 1 ? "student" : "students"}
                </span>
              </div>
            ))}
          </div>
        )}

      </div>

      <ImportRecordsModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={loadClasses}
      />

      <StudentInfoModal
        sessionId={selectedSessionId}
        onClose={() => setSelectedSessionId(null)}
      />
    </Layout>
  );
}

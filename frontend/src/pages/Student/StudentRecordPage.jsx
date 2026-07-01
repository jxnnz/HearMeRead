import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users, Upload } from "lucide-react";

import Layout from "../../components/Layout";
import TopBar from "../../components/TopBar";
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

  const loadClasses = useCallback(() => {
    setLoading(true);
    studentsApi
      .listClasses(schoolYear)
      .then((data) => setClasses(data.classes || []))
      .catch((e) => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, [schoolYear]);

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

  const handleCardClick = useCallback((grade_level, section, period) => {
    navigate("/students/class", {
      state: {
        grade:   grade_level,
        section: section === "No Section" ? "" : section,
        year:    schoolYear,
        period,
      },
    });
  }, [navigate, schoolYear]);

  return (
    <Layout>
      <div className="sr-page">

        {/* Header */}
        <TopBar title="Student Record">
          {/* Import Records (CRLA Excel) */}
          <AppButton variant="ghost" size="sm" onClick={() => setShowImport(true)}>
            <Upload size={14} />
            <span className="sr-btn-full">Import Records</span>
            <span className="sr-btn-short">Import</span>
          </AppButton>

          {/* Add Student — navigates to AddStudentPage where bulk upload also lives */}
          <AppButton variant="primary" size="sm" onClick={() => navigate("/students/add")}>
            <Plus size={14} />
            <span className="sr-btn-full">Add Student</span>
            <span className="sr-btn-short">Add</span>
          </AppButton>
        </TopBar>

        {/* School Year Filter */}
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
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="sr-class-grid">
            {[1, 2, 3].map((i) => (
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
            <AppButton variant="primary" onClick={() => navigate("/students/add")}>
              <Plus size={15} /> Add Student
            </AppButton>
          </div>
        )}

        {/* Period Cards */}
        {!loading && !error && classes.length > 0 && (
          <div className="sr-class-grid">
            {classes.flatMap((c) =>
              PERIOD_OPTIONS.map(({ value, label }) => (
                <div
                  key={`${c.grade_level}||${c.section}||${value}`}
                  className="sr-class-card"
                  onClick={() => handleCardClick(c.grade_level, c.section, value)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handleCardClick(c.grade_level, c.section, value)}
                  aria-label={`View ${formatGrade(c.grade_level)} ${c.section} — ${label}`}
                >
                  <h2 className="sr-class-card__title">
                    {formatGrade(c.grade_level)}
                    {c.section !== "No Section" && ` — ${c.section}`}
                  </h2>
                  <p className="sr-class-card__meta">
                    {schoolYear} &nbsp;·&nbsp; {label}
                  </p>
                  <span className="sr-class-card__count">
                    {c.student_count} {c.student_count === 1 ? "student" : "students"}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* CRLA import modal */}
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
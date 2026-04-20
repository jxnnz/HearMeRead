// ============================================================
// HearMeRead — Student Record Page
// Displays all students in a card grid with search + filter
// Route: /students
// API:   GET /students
// ============================================================
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, X, UserRound } from "lucide-react";

import Layout from "../components/Layout";
import StudentCard from "../components/StudentCard";
import AppButton from "../components/AppButton";
import FilterButton from "../components/FilterButton";
import { studentsApi } from "../services/api";

import "./StudentRecordPage.css";

// ── Filter config passed to FilterButton ────────────────────
const FILTER_CONFIG = [
  {
    key: "grade_level",
    label: "Grade Level",
    options: ["1", "2", "3", "4", "5", "6"].map((g) => ({
      value: g,
      label: `Grade ${g}`,
    })),
  },
  {
    key: "reading_level",
    label: "Reading Level",
    options: [
      { value: "Beginning Reader",      label: "Beginning Reader" },
      { value: "Developing Reader",     label: "Developing Reader" },
      { value: "Transitioning Reader",  label: "Transitioning Reader" },
      { value: "Independent Reader",    label: "Independent Reader" },
    ],
  },
];

const EMPTY_FILTERS = { grade_level: "", reading_level: "" };

// ============================================================
// Page
// ============================================================
export default function StudentRecordPage() {
  const navigate = useNavigate();

  const [students, setStudents]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const [search, setSearch]       = useState("");
  const [filters, setFilters]     = useState(EMPTY_FILTERS);

  // ── Fetch students ───────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    studentsApi
      .list()
      .then(setStudents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Client-side search + filter ─────────────────────────
  const displayed = students.filter((s) => {
    const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
    const lrn      = String(s.lrn ?? s.id ?? "").toLowerCase();
    const q        = search.toLowerCase();

    const matchSearch = !q || fullName.includes(q) || lrn.includes(q);
    const matchGrade  = !filters.grade_level  || String(s.grade_level) === filters.grade_level;
    const matchLevel  = !filters.reading_level || s.reading_level === filters.reading_level;

    return matchSearch && matchGrade && matchLevel;
  });

  // ── Filter handlers ──────────────────────────────────────
  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  // ── Active filter pills ──────────────────────────────────
  const activePills = FILTER_CONFIG
    .filter((f) => filters[f.key])
    .map((f) => ({
      key:   f.key,
      label: f.options.find((o) => o.value === filters[f.key])?.label ?? filters[f.key],
    }));

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <Layout>
      <div className="sr-page">

        {/* ── Page title ── */}
        <h1 className="sr-title">Student Record</h1>

        {/* ── Sub-header: count + search + filter + add ── */}
        <div className="sr-toolbar">
          <div className="sr-toolbar__left">
            <h2 className="sr-subtitle">All Students</h2>
            <span className="sr-count">{displayed.length} students</span>
          </div>

          <div className="sr-toolbar__right">
            {/* Search */}
            <div className="sr-search">
              <Search size={14} className="sr-search__icon" />
              <input
                type="text"
                className="sr-search__input"
                placeholder="Search Student"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="sr-search__clear"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter button */}
            <FilterButton
              filters={FILTER_CONFIG}
              values={filters}
              onChange={handleFilterChange}
              onClear={clearFilters}
            />

            {/* Add Student */}
            <AppButton
              variant="teal"
              onClick={() => navigate("/students/add")}
            >
              <Plus size={15} />
              Add Student
            </AppButton>
          </div>
        </div>

        {/* ── Active filter pills ── */}
        {activePills.length > 0 && (
          <div className="sr-pills">
            {activePills.map((p) => (
              <span key={p.key} className="sr-pill">
                {p.label}
                <button
                  onClick={() => handleFilterChange(p.key, "")}
                  aria-label={`Remove ${p.label} filter`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            <button className="sr-pill-clear" onClick={clearFilters}>
              Clear all
            </button>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="sr-state">
            <div className="sr-spinner" />
            <p>Loading students…</p>
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div className="sr-state sr-state--error">
            <p>⚠ {error}</p>
            <AppButton variant="outline" size="sm" onClick={() => window.location.reload()}>
              Retry
            </AppButton>
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && !error && displayed.length === 0 && (
          <div className="sr-state">
            <UserRound size={42} strokeWidth={1.2} />
            <p>
              {search || activePills.length > 0
                ? "No students match your search."
                : "No students yet."}
            </p>
            {!search && activePills.length === 0 && (
              <AppButton variant="teal" onClick={() => navigate("/students/add")}>
                <Plus size={15} /> Add Student
              </AppButton>
            )}
          </div>
        )}

        {/* ── Student grid ── */}
        {!loading && !error && displayed.length > 0 && (
          <div className="sr-grid">
            {displayed.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                onClick={() => navigate(`/students/${student.id}`)}
              />
            ))}
          </div>
        )}

      </div>
    </Layout>
  );
}
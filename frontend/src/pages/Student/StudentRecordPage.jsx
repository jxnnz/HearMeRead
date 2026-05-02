import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, X, UserRound } from "lucide-react";

import Layout from "../../components/Layout";
import StudentCard from "../../components/StudentCard";
import AppButton from "../../components/AppButton";
import FilterButton from "../../components/FilterButton";
import { studentsApi } from "../../services/api";

import "../pages css/StudentRecordPage.css";

// ── Reading profile sort order ───────────────────────────────
const PROFILE_ORDER = {
  "Reading at Grade Level": 1,
  "High Emerging Reader":   2,
  "Developing Reader":      3,
  "Transitioning Reader":   4,
  "Low Emerging Reader":    5,
};

// ── Filter + Sort config passed to FilterButton ──────────────
const FILTER_CONFIG = [
  {
    key:     "grade_level",
    label:   "Grade Level",
    section: "Filter",
    options: [
      { value: "grade_1", label: "Grade 1" },
      { value: "grade_2", label: "Grade 2" },
      { value: "grade_3", label: "Grade 3" },
    ],
  },
  {
    key:   "reading_profile",
    label: "Reading Profile",
    options: [
      { value: "Reading at Grade Level", label: "Reading at Grade Level" },
      { value: "High Emerging Reader",   label: "High Emerging Reader"   },
      { value: "Developing Reader",      label: "Developing Reader"      },
      { value: "Transitioning Reader",   label: "Transitioning Reader"   },
      { value: "Low Emerging Reader",    label: "Low Emerging Reader"    },
    ],
  },
  {
    key:      "sort_by",
    label:    "Sort By",
    section:  "Sort",
    allLabel: "Default",
    options: [
      { value: "name_az", label: "Name (A – Z)" },
    ],
  },
];

const EMPTY_FILTERS = { grade_level: "", reading_profile: "", sort_by: "" };

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

// ── Mock Data (Delete before deployment) ─────────────────────
const ENABLE_MOCK_DATA = true; // Set to false or delete this block when deploying

const MOCK_STUDENTS = [
  { id: "mock-1", first_name: "Juan", last_name: "Dela Cruz", grade_level: "3", section: "Mabini", lrn: "123456789012", sex: "male", reading_profile: "Reading at Grade Level" },
  { id: "mock-2", first_name: "Maria", last_name: "Santos", grade_level: "1", section: "Rizal", lrn: "987654321098", sex: "female", reading_profile: "Developing Reader" },
  { id: "mock-3", first_name: "Jose", last_name: "Rizal", grade_level: "2", section: "Bonifacio", lrn: "112233445566", sex: "male", reading_profile: "High Emerging Reader" },
  { id: "mock-4", first_name: "Ana", last_name: "Reyes", grade_level: "3", section: "Mabini", lrn: "223344556677", sex: "female", reading_profile: "Transitioning Reader" },
  { id: "mock-5", first_name: "Pedro", last_name: "Penduko", grade_level: "1", section: "Rizal", lrn: "334455667788", sex: "male", reading_profile: "Low Emerging Reader" },
  { id: "mock-6", first_name: "Clara", last_name: "Ibarra", grade_level: "2", section: "Bonifacio", lrn: "445566778899", sex: "female", reading_profile: "Reading at Grade Level" },
  { id: "mock-7", first_name: "Andres", last_name: "Bonifacio", grade_level: "3", section: "Mabini", lrn: "556677889900", sex: "male", reading_profile: "Developing Reader" },
  { id: "mock-8", first_name: "Gabriela", last_name: "Silang", grade_level: "1", section: "Rizal", lrn: "667788990011", sex: "female", reading_profile: "High Emerging Reader" },
  { id: "mock-9", first_name: "Emilio", last_name: "Aguinaldo", grade_level: "2", section: "Bonifacio", lrn: "778899001122", sex: "male", reading_profile: "Transitioning Reader" },
  { id: "mock-10", first_name: "Teresa", last_name: "Magbanua", grade_level: "3", section: "Mabini", lrn: "889900112233", sex: "female", reading_profile: "Low Emerging Reader" },
];

  // ── Fetch students ───────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    studentsApi
      .list({ page_size: 200 })
      .then((data) => {
        let fetchedStudents = data.students || [];
        if (ENABLE_MOCK_DATA) {
          fetchedStudents = [...fetchedStudents, ...MOCK_STUDENTS];
        }
        setStudents(fetchedStudents);
      })
      .catch((e) => {
        // Log full error details so you can see exactly which field fails validation
        console.error("studentsApi.list error:", e.response?.data || e.message);
        setError(e.response?.data?.detail || e.message);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Client-side search + filter + sort ──────────────────
  const filtered = students.filter((s) => {
    const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
    const lrn      = String(s.lrn ?? s.id ?? "").toLowerCase();
    const q        = search.toLowerCase();

    if (q && !fullName.includes(q) && !lrn.includes(q))          return false;
    if (filters.grade_level   && String(s.grade_level) !== filters.grade_level) return false;
    if (filters.reading_profile && s.reading_profile !== filters.reading_profile) return false;
    return true;
  });

  const displayed = [...filtered].sort((a, b) => {
    if (filters.sort_by === "name_az") {
      return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
    }
    if (filters.sort_by === "grade_level") {
      return String(a.grade_level ?? "").localeCompare(String(b.grade_level ?? ""));
    }
    if (filters.sort_by === "reading_profile") {
      return (PROFILE_ORDER[a.reading_profile] ?? 99) - (PROFILE_ORDER[b.reading_profile] ?? 99);
    }
    return 0;
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
    .map((f) => {
      const optionLabel = f.options.find((o) => o.value === filters[f.key])?.label ?? filters[f.key];
      return {
        key:   f.key,
        label: f.section === "Sort" ? `Sort: ${optionLabel}` : optionLabel,
      };
    });

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
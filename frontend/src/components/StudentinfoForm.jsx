import { useState } from "react";
import { Search, X } from "lucide-react";

// ── School year options: current and past only ───────────────
// Never shows a future school year.
// School year starts in June — before June we are still in the
// previous school year (e.g. April 2026 → still 2025-2026).
function schoolYearOptions() {
  const now          = new Date();
  const year         = now.getFullYear();
  const month        = now.getMonth() + 1; // 1–12
  const currentStart = month >= 6 ? year : year - 1;

  // Last 5 school years up to and including the current one
  const options = [];
  for (let i = 4; i >= 0; i--) {
    const start = currentStart - i;
    options.push(`${start}-${start + 1}`);
  }
  return options;
  // e.g. today = April 2026 → ["2021-2022","2022-2023","2023-2024","2024-2025","2025-2026"]
  // e.g. today = August 2026 → ["2022-2023","2023-2024","2024-2025","2025-2026","2026-2027"]
}

// ── Assessment type options ───────────────────────────────────
const ASSESSMENT_TYPES = [
  { value: "BoSY", label: "BoSY — Beginning of School Year" },
  { value: "MoSY", label: "MoSY — Middle of School Year"    },
  { value: "EoSY", label: "EoSY — End of School Year"       },
];

// ── Language options ──────────────────────────────────────────
const LANGUAGE_OPTIONS = [
  { value: "filipino", label: "🇵🇭 Filipino" },
  { value: "english",  label: "🇬🇧 English"  },
];

// ============================================================
export default function StudentInfoForm({
  form,
  setForm,
  students        = [],
  passages        = [],
  loadingStudents = false,
  loadingPassages = false,
}) {
  const [studentSearch,    setStudentSearch]    = useState("");
  const [showStudentDrop,  setShowStudentDrop]  = useState(false);
  const [passageSearch,    setPassageSearch]    = useState("");
  const [showPassageDrop,  setShowPassageDrop]  = useState(false);

  // ── Generic field updater ────────────────────────────────
  function update(field, val) {
    setForm((prev) => ({ ...prev, [field]: val }));
  }

  // ── Select a student — auto-fills Grade, Section, Teacher ─
  function selectStudent(student) {
    setForm((prev) => ({
      ...prev,
      student_id:  student.id,
      first_name:  student.first_name,
      last_name:   student.last_name,
      grade_level: String(student.grade_level ?? ""),
      section:     student.section  ?? "",
      teacher:     student.teacher  ?? "",
    }));
    setStudentSearch("");
    setShowStudentDrop(false);
  }

  function clearStudent() {
    setForm((prev) => ({
      ...prev,
      student_id:  null,
      first_name:  "",
      last_name:   "",
      grade_level: "",
      section:     "",
      teacher:     "",
    }));
  }

  // ── Select a passage ──────────────────────────────────────
  function selectPassage(passage) {
    setForm((prev) => ({
      ...prev,
      passage_id:    passage.id,
      passage_title: passage.title,
    }));
    setPassageSearch("");
    setShowPassageDrop(false);
  }

  function clearPassage() {
    setForm((prev) => ({ ...prev, passage_id: null, passage_title: "" }));
  }

  // ── Filtered dropdown lists ───────────────────────────────
  const filteredStudents = students.filter((s) => {
    const q = studentSearch.toLowerCase();
    return (
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q)  ||
      String(s.lrn ?? "").includes(q)
    );
  });

  const filteredPassages = passages.filter((p) =>
    p.title.toLowerCase().includes(passageSearch.toLowerCase())
  );

  const hasStudent = !!form.student_id;
  const hasPassage = !!form.passage_id;

  // ============================================================
  return (
    <div className="si-card">
      <h2 className="si-card__title">Student Information</h2>
      <p className="si-card__subtitle">
        Enter the student's details before starting the reading assessment.
      </p>

      {/* ── Row 1: School Year + Assessment Type ── */}
      <div className="si-row">
        <div className="si-field">
          <label className="si-label" htmlFor="si-school-year">
            School Year:
          </label>
          <select
            id="si-school-year"
            className="si-input"
            value={form.school_year}
            onChange={(e) => update("school_year", e.target.value)}
          >
            {schoolYearOptions().map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="si-field">
          <label className="si-label" htmlFor="si-assessment-type">
            Assessment Type:
          </label>
          <select
            id="si-assessment-type"
            className="si-input"
            value={form.assessment_type}
            onChange={(e) => update("assessment_type", e.target.value)}
          >
            {ASSESSMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Row 2: First Name (searchable) + Last Name (auto) ── */}
      <div className="si-row">
        <div className="si-field">
          <label className="si-label" htmlFor="si-firstname">
            First Name:
          </label>

          {hasStudent ? (
            /* Selected state — show name with × to clear */
            <div className="si-selected-wrap">
              <span className="si-input si-input--filled">
                {form.first_name}
              </span>
              <button
                type="button"
                className="si-clear-btn"
                onClick={clearStudent}
                aria-label="Clear student"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            /* Search state — live searchable dropdown */
            <div className="si-combo">
              <Search size={13} className="si-combo__icon" />
              <input
                id="si-firstname"
                type="text"
                className="si-input si-input--search"
                placeholder={loadingStudents ? "Loading…" : "Search student"}
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setShowStudentDrop(true);
                }}
                onFocus={() => setShowStudentDrop(true)}
                autoComplete="off"
              />
              {showStudentDrop && (
                <div className="si-dropdown">
                  {filteredStudents.length === 0 ? (
                    <div className="si-dropdown__empty">
                      No students found.
                    </div>
                  ) : (
                    filteredStudents.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="si-dropdown__item"
                        onClick={() => selectStudent(s)}
                      >
                        <span className="si-dropdown__name">
                          {s.first_name} {s.last_name}
                        </span>
                        <span className="si-dropdown__sub">
                          Grade {s.grade_level} · {s.section ?? "—"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="si-field">
          <label className="si-label">Last Name:</label>
          <input
            type="text"
            className="si-input si-input--readonly"
            value={form.last_name}
            placeholder="Auto-filled"
            readOnly
          />
        </div>
      </div>

      {/* ── Row 3: Grade Level + Section (auto-filled) ── */}
      <div className="si-row">
        <div className="si-field">
          <label className="si-label">Grade Level:</label>
          <input
            type="text"
            className="si-input si-input--readonly"
            value={form.grade_level ? `Grade ${form.grade_level}` : ""}
            placeholder="Auto-filled"
            readOnly
          />
        </div>

        <div className="si-field">
          <label className="si-label">Section:</label>
          <input
            type="text"
            className="si-input si-input--readonly"
            value={form.section}
            placeholder="Auto-filled"
            readOnly
          />
        </div>
      </div>

      {/* ── Teacher (full width, auto-filled) ── */}
      <div className="si-field si-field--full">
        <label className="si-label">Teacher:</label>
        <input
          type="text"
          className="si-input si-input--readonly"
          value={form.teacher}
          placeholder="Auto-filled from student record"
          readOnly
        />
      </div>

      {/* ── Language tab toggle ── */}
      <div className="si-field si-field--full">
        <label className="si-label">Reading Profile (Language):</label>
        <div className="si-lang-tabs">
          {LANGUAGE_OPTIONS.map((lang) => (
            <button
              key={lang.value}
              type="button"
              className={`si-lang-tab${
                form.language === lang.value ? " si-lang-tab--active" : ""
              }`}
              onClick={() => {
                update("language", lang.value);
                clearPassage(); // reset passage when language changes
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Reading Passage (searchable, filtered by language) ── */}
      <div className="si-field si-field--full">
        <label className="si-label">Reading Passage:</label>

        {hasPassage ? (
          /* Selected state */
          <div className="si-selected-wrap">
            <span className="si-input si-input--filled">
              {form.passage_title}
            </span>
            <button
              type="button"
              className="si-clear-btn"
              onClick={clearPassage}
              aria-label="Clear passage"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          /* Search state */
          <div className="si-combo">
            <Search size={13} className="si-combo__icon" />
            <input
              type="text"
              className="si-input si-input--search"
              placeholder={
                loadingPassages
                  ? "Loading passages…"
                  : `Search ${form.language} passages`
              }
              value={passageSearch}
              onChange={(e) => {
                setPassageSearch(e.target.value);
                setShowPassageDrop(true);
              }}
              onFocus={() => setShowPassageDrop(true)}
              autoComplete="off"
            />
            {showPassageDrop && (
              <div className="si-dropdown">
                {filteredPassages.length === 0 ? (
                  <div className="si-dropdown__empty">
                    No {form.language} passages found.
                  </div>
                ) : (
                  filteredPassages.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="si-dropdown__item"
                      onClick={() => selectPassage(p)}
                    >
                      <span className="si-dropdown__name">{p.title}</span>
                      <span className="si-dropdown__sub">
                        Grade {p.grade_level} ·{" "}
                        {p.word_count ??
                          p.content
                            ?.trim()
                            .split(/\s+/)
                            .filter(Boolean).length ??
                          "?"}{" "}
                        words
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
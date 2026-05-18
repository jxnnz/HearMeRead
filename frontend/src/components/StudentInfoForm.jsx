import { useState } from "react";
import { Search, X } from "lucide-react";

// School year options: current and past only
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
}

// Assessment type options
const ASSESSMENT_TYPES = [
  { value: "BoSY", label: "BoSY — Beginning of School Year" },
  { value: "MoSY", label: "MoSY — Middle of School Year"    },
  { value: "EoSY", label: "EoSY — End of School Year"       },
];

// Language options
const LANGUAGE_OPTIONS = [
  { value: "filipino", label: "Filipino" },
  { value: "english",  label: "English"  },
];

function gradeLabel(gl) {
  return `Grade ${String(gl).replace("grade_", "")}`;
}

// ============================================================
export default function StudentInfoForm({
  form,
  setForm,
  students        = [],
  passages        = [],
  loadingStudents = false,
  loadingPassages = false,
}) {
  const [studentSearch,   setStudentSearch]   = useState("");
  const [showStudentDrop, setShowStudentDrop] = useState(false);

  // Generic field updater
  function update(field, val) {
    setForm((prev) => ({ ...prev, [field]: val }));
  }

  // Select a student — auto-fills Last Name, Grade, Section
  function selectStudent(student) {
    setForm((prev) => ({
      ...prev,
      student_id:  student.id,
      first_name:  student.first_name,
      last_name:   student.last_name,
      grade_level: String(student.grade_level ?? ""),
      section:     student.section ?? "",
    }));
    setStudentSearch("");
    setShowStudentDrop(false);
  }

  function clearStudent() {
    setForm((prev) => ({
      ...prev,
      student_id: null,
      first_name: "",
      last_name:  "",
      section:    "",
      // grade_level kept intentionally — it acts as the search filter
    }));
  }

  // Filtered student dropdown
  const filteredStudents = students.filter((s) => {
    const q = studentSearch.toLowerCase();
    return (
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q)  ||
      String(s.lrn ?? "").includes(q)
    );
  });

  const hasStudent = !!form.student_id;

  // ============================================================
  return (
    <div className="si-card">
      <h2 className="si-card__title">Student Information</h2>
      <p className="si-card__subtitle">
        Enter the student's details before starting the reading assessment.
      </p>

      {/* Row 1: School Year + Assessment Type */}
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

      {/* Row 2: First Name (searchable) + Last Name (auto-filled) */}
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
                          {gradeLabel(s.grade_level)} · {s.section ?? "—"}
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

      {/* Language tab toggle */}
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
                setForm((prev) => ({
                  ...prev,
                  language:         lang.value,
                  passage_id:       null,
                  passage_title:    "",
                  passage_content:  "",
                  word_count:       0,
                  selected_passage: null,
                }));
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Passage selector — filtered by grade level, language, and assessment type 1 */}
      <div className="si-field si-field--full">
        <label className="si-label" htmlFor="si-passage">
          Passage <span style={{ color: "#8a94b2", fontWeight: 400 }}>(Assessment 1 — Gawain 1)</span>
        </label>
        {!form.grade_level ? (
          <div className="si-input si-input--readonly si-input--disabled">
            No grade level assigned — contact your admin
          </div>
        ) : !hasStudent ? (
          <div className="si-input si-input--readonly si-input--disabled">
            Select a student first
          </div>
        ) : loadingPassages ? (
          <div className="si-input si-input--readonly">Loading passages…</div>
        ) : passages.length === 0 ? (
          <div className="si-input si-input--readonly">
            No passages found for this grade &amp; language
          </div>
        ) : passages.length === 1 ? (
          <div className="si-input si-input--filled">
            {passages[0].title ?? "Assessment 1"}
          </div>
        ) : (
          <select
            id="si-passage"
            className="si-input"
            value={form.passage_id ?? ""}
            onChange={(e) => {
              const selected = passages.find((p) => String(p.id) === e.target.value);
              if (!selected) return;
              const task1Words = selected.task1_content
                ? selected.task1_content.trim().split(/\s+/).filter(Boolean).length
                : (selected.word_count ?? 0);
              setForm((prev) => ({
                ...prev,
                passage_id:       selected.id,
                passage_title:    selected.title ?? "Assessment 1",
                passage_content:  selected.task1_content ?? "",
                word_count:       task1Words,
                selected_passage: selected,
              }));
            }}
          >
            <option value="">— Select a passage —</option>
            {passages.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.title} ({p.word_count} items)
              </option>
            ))}
          </select>
        )}
      </div>

    </div>
  );
}
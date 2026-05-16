import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap, ChevronLeft, ChevronRight, Users,
  Search, ArrowUpDown, FileText, FileSpreadsheet, Pencil, Trash2,
} from "lucide-react";
import Layout from "../components/Layout";
import { adminApi } from "../services/api";
import StudentInfoModal from "../modals/StudentInfoModal";
import "../pages/pages css/ClassRecordPage.css";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatGrade(gl) {
  if (!gl) return "—";
  if (gl === "kindergarten") return "Kindergarten";
  return `Grade ${gl.replace("grade_", "")}`;
}

function currentSchoolYear() {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() + 1 >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  const dt = new Date(iso);
  return `${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")}/${String(dt.getFullYear()).slice(-2)}`;
}

function formatTime(seconds) {
  if (seconds === null || seconds === undefined) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function d(val) {
  return val !== null && val !== undefined ? val : "—";
}

const PROFILE_COLORS = {
  "Reading at Grade Level": "#639922",
  "Transitioning Reader":   "#378ADD",
  "Developing Reader":      "#EF9F27",
  "High Emerging Reader":   "#D4537E",
  "Low Emerging Reader":    "#E24B4A",
};

const GRADE_BG = {
  kindergarten: "#e8f5e9", grade_1: "#e3f2fd", grade_2: "#fce4ec",
  grade_3: "#fff3e0", grade_4: "#f3e5f5", grade_5: "#e0f2f1", grade_6: "#e8eaf6",
};
const GRADE_TEXT = {
  kindergarten: "#2e7d32", grade_1: "#1565c0", grade_2: "#880e4f",
  grade_3: "#e65100", grade_4: "#6a1b9a", grade_5: "#00695c", grade_6: "#283593",
};

const PERIOD_LABELS = { beginning: "Beginning", middle: "Middle", end: "End" };

// ── Class Record sub-view (reuses teacher-side cr-* CSS classes) ──────────────

function ClassRecordView({ card, onBack }) {
  const [record,     setRecord]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear());
  const [period,     setPeriod]     = useState("beginning");
  const [language,   setLanguage]   = useState("filipino");
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  const SCHOOL_YEARS = (() => {
    const y = new Date().getFullYear();
    return [`${y}-${y + 1}`, `${y - 1}-${y}`, `${y - 2}-${y - 1}`];
  })();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (schoolYear) params.school_year = schoolYear;
      if (period) params.period = period;
      if (language) params.language = language;
      const data = await adminApi.getClassRecord(card.teacher_id, params);
      setRecord(data);
    } catch {
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }, [card.teacher_id, schoolYear, period, language]);

  useEffect(() => { load(); }, [load]);

  const students = record?.students ?? [];
  const periodLabel = PERIOD_LABELS[period] ?? period;

  return (
    <div className="cr-page">
      {/* Top bar */}
      <div className="cr-topbar">
        <div className="cr-topbar__left">
          <button className="cr-back-btn" onClick={onBack} aria-label="Back">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="cr-title">
              {formatGrade(card.grade_level)} — {card.section ?? "—"}
            </h1>
            <p className="cr-subtitle">
              Adviser: {card.teacher_name} &nbsp;·&nbsp; {schoolYear} &nbsp;·&nbsp; {periodLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontSize: 12, color: "#4a5568", fontWeight: 500 }}>School Year:</label>
        <select className="cr-lang-select" value={schoolYear} onChange={e => setSchoolYear(e.target.value)}>
          {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <label style={{ fontSize: 12, color: "#4a5568", fontWeight: 500, marginLeft: 8 }}>Period:</label>
        <select className="cr-lang-select" value={period} onChange={e => setPeriod(e.target.value)}>
          <option value="beginning">Beginning</option>
          <option value="middle">Middle</option>
          <option value="end">End</option>
        </select>
        <label style={{ fontSize: 12, color: "#4a5568", fontWeight: 500, marginLeft: 8 }}>Language:</label>
        <select className="cr-lang-select" value={language} onChange={e => setLanguage(e.target.value)}>
          <option value="filipino">Filipino</option>
          <option value="english">English</option>
        </select>
      </div>

      {/* States */}
      {loading && (
        <div className="cr-state">
          <div className="cr-spinner" />
          <p>Loading class data…</p>
        </div>
      )}

      {/* Class record card — reuses teacher-side CSS */}
      {!loading && (
        <div className="cr-card">
          {/* Info bar */}
          <div className="cr-info-bar">
            <div className="cr-info-bar__items">
              <div className="cr-info-item">
                <span className="cr-info-label">Assessment Period</span>
                <span className="cr-info-value">{periodLabel}</span>
              </div>
              <div className="cr-info-item">
                <span className="cr-info-label">Teacher</span>
                <span className="cr-info-value">{card.teacher_name}</span>
              </div>
              <div className="cr-info-item">
                <span className="cr-info-label">Grade Level</span>
                <span className="cr-info-value">{formatGrade(card.grade_level)}</span>
              </div>
              <div className="cr-info-item">
                <span className="cr-info-label">Section</span>
                <span className="cr-info-value">{card.section || "—"}</span>
              </div>
              <div className="cr-info-item">
                <span className="cr-info-label">Language</span>
                <span className="cr-info-value cr-info-value--cap">{language}</span>
              </div>
            </div>
          </div>

          {/* Assessment table — same as teacher side, no actions column */}
          <div className="cr-table-wrapper">
            <table className="cr-table">
              <thead>
                <tr>
                  <th rowSpan={2} className="cr-th cr-th--id">#</th>
                  <th rowSpan={2} className="cr-th cr-th--id">LRN</th>
                  <th rowSpan={2} className="cr-th cr-th--name">Student Name</th>
                  <th rowSpan={2} className="cr-th">Sex</th>
                  <th rowSpan={2} className="cr-th">Date</th>
                  <th colSpan={5} className="cr-th cr-th--group1">Assessment Part 1</th>
                  <th colSpan={8} className="cr-th cr-th--group2">Assessment Part 2</th>
                  <th rowSpan={2} className="cr-th">Learner Exp.</th>
                  <th rowSpan={2} className="cr-th">Obs. Level</th>
                  <th rowSpan={2} className="cr-th cr-th--profile">Reading Profile</th>
                  <th rowSpan={2} className="cr-th cr-th--remarks">Remarks</th>
                </tr>
                <tr>
                  <th className="cr-th cr-th--sub cr-th--group1">Task 1</th>
                  <th className="cr-th cr-th--sub cr-th--group1">Task 2L</th>
                  <th className="cr-th cr-th--sub cr-th--group1">Task 2H</th>
                  <th className="cr-th cr-th--sub cr-th--group1">Total</th>
                  <th className="cr-th cr-th--sub cr-th--group1">Part 1 Level</th>
                  <th className="cr-th cr-th--sub cr-th--group2">Story Title</th>
                  <th className="cr-th cr-th--sub cr-th--group2">Total Words</th>
                  <th className="cr-th cr-th--sub cr-th--group2">Miscues</th>
                  <th className="cr-th cr-th--sub cr-th--group2">Words Read</th>
                  <th className="cr-th cr-th--sub cr-th--group2">Time</th>
                  <th className="cr-th cr-th--sub cr-th--group2">WPM</th>
                  <th className="cr-th cr-th--sub cr-th--group2">% Correct</th>
                  <th className="cr-th cr-th--sub cr-th--group2">Correct Ans.</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={22} className="cr-empty-row">No students found for this period.</td>
                  </tr>
                ) : students.map((s, idx) => {
                  const rr = s.reading_result || null;
                  const obs = s.observation || null;
                  const profile = rr?.reading_profile ?? s.reading_profile ?? null;
                  const nameColor = PROFILE_COLORS[profile] ?? "#1a2340";
                  const totalWords = rr?.total_words ?? null;
                  const miscues = rr?.miscue_count ?? null;
                  const wordsRead = totalWords !== null && miscues !== null ? totalWords - miscues : null;
                  const pctCorrect = totalWords && totalWords > 0 && miscues !== null
                    ? `${Math.round(((totalWords - miscues) / totalWords) * 100)}%` : "—";
                  const route = (rr?.part1_route ?? "").toLowerCase();
                  const task2L = route.includes("2l") ? d(rr?.part1_task2_correct) : "—";
                  const task2H = route.includes("2h") ? d(rr?.part1_task2_correct) : "—";

                  return (
                    <tr key={s.student_id}>
                      <td className="cr-td cr-td--center">{idx + 1}</td>
                      <td className="cr-td">{s.lrn ?? "—"}</td>
                      <td className="cr-td">
                        <span style={{ color: nameColor, fontWeight: 600 }}>
                          {s.last_name}, {s.first_name}
                        </span>
                      </td>
                      <td className="cr-td cr-td--cap">{s.sex ?? "—"}</td>
                      <td className="cr-td">{s.session_date ? formatDate(s.session_date) : "—"}</td>
                      <td className="cr-td cr-td--center cr-td--g1">{d(rr?.part1_task1_correct)}</td>
                      <td className="cr-td cr-td--center cr-td--g1">{task2L}</td>
                      <td className="cr-td cr-td--center cr-td--g1">{task2H}</td>
                      <td className="cr-td cr-td--center cr-td--g1">{d(rr?.part1_total_score)}</td>
                      <td className="cr-td cr-td--g1">{rr?.part1_classification ?? "—"}</td>
                      <td className="cr-td cr-td--g2">{s.passage_title ?? "—"}</td>
                      <td className="cr-td cr-td--center cr-td--g2">{d(totalWords)}</td>
                      <td className="cr-td cr-td--center cr-td--g2">{d(miscues)}</td>
                      <td className="cr-td cr-td--center cr-td--g2">{d(wordsRead)}</td>
                      <td className="cr-td cr-td--center cr-td--g2">{formatTime(rr?.reading_time_seconds)}</td>
                      <td className="cr-td cr-td--center cr-td--g2">{d(rr?.cwpm)}</td>
                      <td className="cr-td cr-td--center cr-td--g2">{pctCorrect}</td>
                      <td className="cr-td cr-td--center cr-td--g2">
                        {obs ? `${obs.comprehension_correct ?? "—"}/${obs.comprehension_total ?? "—"}` : "—"}
                      </td>
                      <td className="cr-td cr-td--center">{d(obs?.learner_experience)}</td>
                      <td className="cr-td cr-td--center">{d(obs?.fluency_level)}</td>
                      <td className="cr-td cr-td--profile" style={{ color: nameColor, fontWeight: 600 }}>{profile ?? "—"}</td>
                      <td className="cr-td cr-td--remarks">{obs?.teacher_remarks ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && (
        <div style={{ fontSize: 12, color: "#8a94b2" }}>
          {students.filter(s => s.reading_profile || s.reading_result).length} of {students.length} students assessed
        </div>
      )}

      <StudentInfoModal
        sessionId={selectedSessionId}
        onClose={() => setSelectedSessionId(null)}
      />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminStudentsPage() {
  const [cards,    setCards]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [selected, setSelected] = useState(null);

  // Search and grade filter
  const [search, setSearch]     = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");

  useEffect(() => {
    adminApi.getClassCards()
      .then(setCards)
      .catch(() => setError("Failed to load class data. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  // Unique grade levels for filter
  const gradeOptions = useMemo(() => {
    const grades = [...new Set(cards.map(c => c.grade_level))].sort();
    return grades;
  }, [cards]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = [...cards];
    if (gradeFilter !== "all") {
      list = list.filter(c => c.grade_level === gradeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.section || "").toLowerCase().includes(q) ||
        (c.teacher_name || "").toLowerCase().includes(q) ||
        formatGrade(c.grade_level).toLowerCase().includes(q)
      );
    }
    return list;
  }, [cards, search, gradeFilter]);

  const inputStyle = {
    padding: "8px 12px 8px 34px", border: "1.5px solid #dde1ee", borderRadius: 8,
    fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none",
    background: "#fff", color: "#1a2340", width: 220,
  };

  const gradeBtnStyle = (active) => ({
    padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
    cursor: "pointer", fontFamily: "Poppins, sans-serif",
    border: `1.5px solid ${active ? "#2c3e6b" : "#dde1ee"}`,
    background: active ? "#eef3ff" : "#fff",
    color: active ? "#2c5fc1" : "#4a5568",
    transition: "all 0.15s",
  });

  return (
    <Layout>
      <div style={{ fontFamily: "Poppins, sans-serif", width: "100%" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1a2340", margin: "0 0 24px", fontFamily: "Poppins, sans-serif" }}>
          Students
        </h1>

        {selected ? (
          <ClassRecordView card={selected} onBack={() => setSelected(null)} />
        ) : (
          <>
            {/* Toolbar */}
            {!loading && !error && cards.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                {/* Row 1: count + search */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Users size={15} color="#2c7fc1" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#4a6fa5" }}>
                      {filtered.length} class{filtered.length !== 1 ? "es" : ""} across your school
                    </span>
                  </div>
                  <div style={{ position: "relative" }}>
                    <Search size={14} color="#8a94b2" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                    <input
                      style={inputStyle}
                      placeholder="Search classes…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                {/* Row 2: grade filter pills */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button style={gradeBtnStyle(gradeFilter === "all")} onClick={() => setGradeFilter("all")}>
                    All Grades
                  </button>
                  {gradeOptions.map(g => (
                    <button key={g} style={gradeBtnStyle(gradeFilter === g)} onClick={() => setGradeFilter(g)}>
                      {formatGrade(g)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 4 }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="sk-card" style={{ width: 280, height: 120, borderRadius: 14 }} />
                ))}
              </div>
            )}

            {error && !loading && (
              <p style={{ color: "#c0392b", textAlign: "center", padding: "64px 0", fontSize: 13 }}>{error}</p>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", height: "50vh", gap: 14, color: "#8a94b2",
              }}>
                <GraduationCap size={44} strokeWidth={1.2} />
                <p style={{ margin: 0, fontSize: 13 }}>
                  {search || gradeFilter !== "all" ? "No classes match your filter." : "No class cards yet. Assign grade levels and sections to teachers first."}
                </p>
              </div>
            )}

            {!loading && !error && filtered.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                {filtered.map(card => {
                  const bg   = GRADE_BG[card.grade_level]   ?? "#f0f6ff";
                  const text = GRADE_TEXT[card.grade_level]  ?? "#2c7fc1";
                  return (
                    <button
                      key={card.teacher_id}
                      onClick={() => setSelected(card)}
                      style={{
                        background: "#fff", border: "1.5px solid #e8ecf4",
                        borderRadius: 14,
                        boxShadow: "0 2px 12px rgba(44,62,107,.06)",
                        padding: "20px 24px", cursor: "pointer", textAlign: "left",
                        width: 280, transition: "box-shadow 0.15s, transform 0.1s, border-color 0.15s",
                        fontFamily: "Poppins, sans-serif",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.boxShadow = "0 6px 24px rgba(44,62,107,.14)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.borderColor = "#c8d0ec";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.boxShadow = "0 2px 12px rgba(44,62,107,.06)";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.borderColor = "#e8ecf4";
                      }}
                    >
                      <div style={{
                        display: "inline-block", background: bg, color: text,
                        borderRadius: 8, padding: "3px 12px",
                        fontSize: 12, fontWeight: 700, marginBottom: 10,
                      }}>
                        {formatGrade(card.grade_level)}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1a2340", marginBottom: 6 }}>
                        {formatGrade(card.grade_level)} — {card.section ?? "No Section"}
                      </div>
                      <div style={{
                        fontSize: 12, color: "#4a5568", fontWeight: 500,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        Adviser: {card.teacher_name}
                      </div>
                      <div style={{
                        fontSize: 11, color: "#8a94b2", marginTop: 8,
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        <Users size={12} />
                        {card.student_count ?? 0} student{(card.student_count ?? 0) !== 1 ? "s" : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

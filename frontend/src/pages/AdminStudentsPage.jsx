import { useState, useEffect, useCallback } from "react";
import { GraduationCap, ChevronLeft, ChevronRight, Users, FileText, FileSpreadsheet } from "lucide-react";
import Layout from "../components/Layout";
import TopBar from "../components/TopBar";
import { adminApi } from "../services/api";

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
  const d = new Date(iso);
  return d.toLocaleDateString("en-PH", { month: "2-digit", day: "2-digit", year: "2-digit" });
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

// ── Class Record sub-view (mirrors teacher-side ClassRecordPage) ──────────────

function ClassRecordView({ card, onBack }) {
  const [record,     setRecord]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear());
  const [period,     setPeriod]     = useState("beginning");
  const [language,   setLanguage]   = useState("filipino");

  const SCHOOL_YEARS = (() => {
    const y = new Date().getFullYear();
    return [`${y}-${y + 1}`, `${y - 1}-${y}`, `${y - 2}-${y - 1}`];
  })();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (schoolYear) params.school_year = schoolYear;
      if (period)     params.period      = period;
      const data = await adminApi.getClassRecord(card.teacher_id, params);
      setRecord(data);
    } catch {
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }, [card.teacher_id, schoolYear, period]);

  useEffect(() => { load(); }, [load]);

  const students = record?.students ?? [];

  // Match sessions by language
  const sessionByStudent = {};
  for (const s of students) {
    // The admin class record endpoint returns students with their session data embedded
    // Check if sessions are embedded; if not, we only have the basic info
    if (s.session && s.session.language === language) {
      sessionByStudent[s.student_id] = s.session;
    }
  }

  const periodLabel = PERIOD_LABELS[period] ?? period;
  const teacherName = card.teacher_name ?? "—";
  const gradeFull = formatGrade(card.grade_level);
  const sectionName = card.section ?? "—";

  const selectStyle = {
    padding: "7px 12px", border: "1.5px solid #dde1ee", borderRadius: 8,
    fontSize: 12, fontFamily: "Poppins, sans-serif", background: "#fff",
    outline: "none", color: "#1a2340", cursor: "pointer",
  };

  return (
    <div style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        marginBottom: 8, flexWrap: "wrap",
      }}>
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "none", border: "none", cursor: "pointer",
            color: "#2c7fc1", fontSize: 13, fontFamily: "Poppins, sans-serif",
            padding: "4px 0",
          }}
        >
          <ChevronLeft size={16} /> Back
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1a2340" }}>
            {gradeFull} — {sectionName}
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#8a94b2" }}>
            Adviser: {teacherName}
          </p>
        </div>
      </div>

      {/* ── Info bar (matches teacher-side cr-info-bar) ── */}
      <div style={{
        background: "#f8f9fd", borderRadius: 12, padding: "14px 20px",
        display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center",
        marginBottom: 20, border: "1px solid #eef0f8",
      }}>
        <div>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#8a94b2", textTransform: "uppercase", letterSpacing: ".4px", display: "block" }}>Assessment Period</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1a2340" }}>{periodLabel}</span>
        </div>
        <div>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#8a94b2", textTransform: "uppercase", letterSpacing: ".4px", display: "block" }}>Teacher</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1a2340" }}>{teacherName}</span>
        </div>
        <div>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#8a94b2", textTransform: "uppercase", letterSpacing: ".4px", display: "block" }}>Grade Level</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1a2340" }}>{gradeFull}</span>
        </div>
        <div>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#8a94b2", textTransform: "uppercase", letterSpacing: ".4px", display: "block" }}>Section</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1a2340" }}>{sectionName}</span>
        </div>
        <div>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#8a94b2", textTransform: "uppercase", letterSpacing: ".4px", display: "block" }}>Language</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1a2340", textTransform: "capitalize" }}>{language}</span>
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <label style={{ fontSize: 12, color: "#4a5568", fontWeight: 500 }}>School Year:</label>
        <select style={selectStyle} value={schoolYear} onChange={e => setSchoolYear(e.target.value)}>
          {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <label style={{ fontSize: 12, color: "#4a5568", fontWeight: 500, marginLeft: 8 }}>Period:</label>
        <select style={selectStyle} value={period} onChange={e => setPeriod(e.target.value)}>
          <option value="beginning">Beginning</option>
          <option value="middle">Middle</option>
          <option value="end">End</option>
        </select>

        <label style={{ fontSize: 12, color: "#4a5568", fontWeight: 500, marginLeft: 8 }}>Language:</label>
        <select style={selectStyle} value={language} onChange={e => setLanguage(e.target.value)}>
          <option value="filipino">Filipino</option>
          <option value="english">English</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div style={{
        background: "#fff", borderRadius: 14,
        boxShadow: "0 2px 12px rgba(44,62,107,.08)", overflow: "hidden",
      }}>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#8a94b2", fontSize: 13 }}>
            Loading students…
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, fontFamily: "Poppins, sans-serif" }}>
              <thead>
                <tr>
                  <th rowSpan={2} style={thStyle}>#</th>
                  <th rowSpan={2} style={thStyle}>LRN</th>
                  <th rowSpan={2} style={{ ...thStyle, minWidth: 140 }}>Student Name</th>
                  <th rowSpan={2} style={thStyle}>Sex</th>
                  <th rowSpan={2} style={thStyle}>Date</th>
                  <th colSpan={5} style={{ ...thStyle, textAlign: "center", background: "#eef3ff", color: "#2c5fc1" }}>Assessment Part 1</th>
                  <th colSpan={8} style={{ ...thStyle, textAlign: "center", background: "#eef8f0", color: "#1a7f52" }}>Assessment Part 2</th>
                  <th rowSpan={2} style={thStyle}>Learner Exp.</th>
                  <th rowSpan={2} style={thStyle}>Obs. Level</th>
                  <th rowSpan={2} style={{ ...thStyle, minWidth: 130 }}>Reading Profile</th>
                  <th rowSpan={2} style={{ ...thStyle, minWidth: 100 }}>Remarks</th>
                </tr>
                <tr>
                  {/* Part 1 sub-headers */}
                  <th style={{ ...subThStyle, background: "#eef3ff" }}>Task 1</th>
                  <th style={{ ...subThStyle, background: "#eef3ff" }}>Task 2L</th>
                  <th style={{ ...subThStyle, background: "#eef3ff" }}>Task 2H</th>
                  <th style={{ ...subThStyle, background: "#eef3ff" }}>Total</th>
                  <th style={{ ...subThStyle, background: "#eef3ff" }}>Part 1 Level</th>
                  {/* Part 2 sub-headers */}
                  <th style={{ ...subThStyle, background: "#eef8f0" }}>Story Title</th>
                  <th style={{ ...subThStyle, background: "#eef8f0" }}>Total Words</th>
                  <th style={{ ...subThStyle, background: "#eef8f0" }}>Miscues</th>
                  <th style={{ ...subThStyle, background: "#eef8f0" }}>Words Read</th>
                  <th style={{ ...subThStyle, background: "#eef8f0" }}>Time</th>
                  <th style={{ ...subThStyle, background: "#eef8f0" }}>WPM</th>
                  <th style={{ ...subThStyle, background: "#eef8f0" }}>% Correct</th>
                  <th style={{ ...subThStyle, background: "#eef8f0" }}>Correct Ans.</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={23} style={{ ...tdStyle, textAlign: "center", color: "#8a94b2", padding: "32px 0" }}>
                      No students found for this period.
                    </td>
                  </tr>
                ) : students.map((s, i) => {
                  const rr = s.reading_result || null;
                  const obs = s.observation || null;
                  const profile = rr?.reading_profile ?? s.reading_profile ?? null;
                  const profileColor = PROFILE_COLORS[profile] ?? "#1a2340";

                  const totalWords = rr?.total_words ?? null;
                  const miscues = rr?.miscue_count ?? null;
                  const wordsRead = totalWords !== null && miscues !== null ? totalWords - miscues : null;
                  const pctCorrect = totalWords && totalWords > 0 && miscues !== null
                    ? `${Math.round(((totalWords - miscues) / totalWords) * 100)}%` : "—";
                  const route = (rr?.part1_route ?? "").toLowerCase();
                  const task2L = route.includes("2l") ? d(rr?.part1_task2_correct) : "—";
                  const task2H = route.includes("2h") ? d(rr?.part1_task2_correct) : "—";

                  return (
                    <tr key={s.student_id} style={{ borderBottom: "1px solid #f0f2f8" }}>
                      <td style={{ ...tdStyle, color: "#8a94b2", textAlign: "center" }}>{i + 1}</td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 10.5, color: "#4a5568" }}>{s.lrn ?? "—"}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: profileColor }}>
                        {s.last_name}, {s.first_name}
                      </td>
                      <td style={{ ...tdStyle, textTransform: "capitalize", color: "#4a5568" }}>{s.sex ?? "—"}</td>
                      <td style={tdStyle}>{s.session_date ? formatDate(s.session_date) : "—"}</td>
                      {/* Part 1 */}
                      <td style={{ ...tdStyle, textAlign: "center", background: "#fafcff" }}>{d(rr?.part1_task1_correct)}</td>
                      <td style={{ ...tdStyle, textAlign: "center", background: "#fafcff" }}>{task2L}</td>
                      <td style={{ ...tdStyle, textAlign: "center", background: "#fafcff" }}>{task2H}</td>
                      <td style={{ ...tdStyle, textAlign: "center", background: "#fafcff" }}>{d(rr?.part1_total_score)}</td>
                      <td style={{ ...tdStyle, background: "#fafcff" }}>{rr?.part1_classification ?? "—"}</td>
                      {/* Part 2 */}
                      <td style={{ ...tdStyle, background: "#fafdf8" }}>{s.passage_title ?? "—"}</td>
                      <td style={{ ...tdStyle, textAlign: "center", background: "#fafdf8" }}>{d(totalWords)}</td>
                      <td style={{ ...tdStyle, textAlign: "center", background: "#fafdf8" }}>{d(miscues)}</td>
                      <td style={{ ...tdStyle, textAlign: "center", background: "#fafdf8" }}>{d(wordsRead)}</td>
                      <td style={{ ...tdStyle, textAlign: "center", background: "#fafdf8" }}>{formatTime(rr?.reading_time_seconds)}</td>
                      <td style={{ ...tdStyle, textAlign: "center", background: "#fafdf8" }}>{d(rr?.cwpm)}</td>
                      <td style={{ ...tdStyle, textAlign: "center", background: "#fafdf8" }}>{pctCorrect}</td>
                      <td style={{ ...tdStyle, textAlign: "center", background: "#fafdf8" }}>
                        {obs ? `${obs.comprehension_correct ?? "—"}/${obs.comprehension_total ?? "—"}` : "—"}
                      </td>
                      {/* Observation */}
                      <td style={{ ...tdStyle, textAlign: "center" }}>{d(obs?.learner_experience)}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>{d(obs?.fluency_level)}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: profileColor }}>{profile ?? "—"}</td>
                      <td style={{ ...tdStyle, fontSize: 10.5 }}>{obs?.teacher_remarks ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && (
        <div style={{ marginTop: 12, fontSize: 12, color: "#8a94b2" }}>
          {students.filter(s => s.reading_profile || s.reading_result).length} of {students.length} students assessed
        </div>
      )}
    </div>
  );
}

// ── Table styles ──────────────────────────────────────────────────────────────

const thStyle = {
  textAlign: "left", padding: "9px 10px",
  color: "#4a5568", fontWeight: 700,
  fontSize: 10, textTransform: "uppercase", letterSpacing: ".5px",
  borderBottom: "2px solid #e8eaf2", whiteSpace: "nowrap",
  background: "#f8f9fd",
};

const subThStyle = {
  textAlign: "center", padding: "6px 8px",
  color: "#4a5568", fontWeight: 600,
  fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".3px",
  borderBottom: "2px solid #e8eaf2", whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "9px 10px",
  fontSize: 11.5, color: "#1a2340", verticalAlign: "middle",
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminStudentsPage() {
  const [cards,    setCards]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    adminApi.getClassCards()
      .then(setCards)
      .catch(() => setError("Failed to load class data. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div style={{ fontFamily: "Poppins, sans-serif", width: "100%" }}>
        <TopBar title="Students" />

        {selected ? (
          <ClassRecordView card={selected} onBack={() => setSelected(null)} />
        ) : (
          <>
            {loading && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 4 }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{
                    width: 260, height: 100, borderRadius: 14,
                    background: "linear-gradient(90deg, #e8ecf4 25%, #f4f6fb 50%, #e8ecf4 75%)",
                    backgroundSize: "1600px 100%",
                    animation: "phShimmer 1.4s ease-in-out infinite",
                  }} />
                ))}
              </div>
            )}

            {error && !loading && (
              <p style={{ color: "#c0392b", textAlign: "center", padding: "64px 0", fontSize: 13 }}>
                {error}
              </p>
            )}

            {!loading && !error && cards.length === 0 && (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", height: "50vh", gap: 14, color: "#8a94b2",
              }}>
                <GraduationCap size={44} strokeWidth={1.2} />
                <p style={{ margin: 0, fontSize: 13 }}>
                  No class cards yet. Assign grade levels and sections to teachers first.
                </p>
              </div>
            )}

            {!loading && !error && cards.length > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <Users size={15} color="#2c7fc1" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#4a6fa5" }}>
                    {cards.length} class{cards.length !== 1 ? "es" : ""} across your school
                  </span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                  {cards.map(card => {
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
                        {/* Grade badge */}
                        <div style={{
                          display: "inline-block",
                          background: bg, color: text,
                          borderRadius: 8, padding: "3px 12px",
                          fontSize: 12, fontWeight: 700,
                          marginBottom: 10,
                        }}>
                          {formatGrade(card.grade_level)}
                        </div>

                        {/* Class title */}
                        <div style={{
                          fontSize: 15, fontWeight: 700, color: "#1a2340",
                          marginBottom: 6,
                        }}>
                          {formatGrade(card.grade_level)} — {card.section ?? "No Section"}
                        </div>

                        {/* Teacher name */}
                        <div style={{
                          fontSize: 12, color: "#4a5568", fontWeight: 500,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          Adviser: {card.teacher_name}
                        </div>

                        {/* Student count */}
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
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

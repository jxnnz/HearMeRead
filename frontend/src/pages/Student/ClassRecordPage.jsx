import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import Layout from "../../components/Layout";
import { authApi, studentsApi, sessionsApi } from "../../services/api";
import "../pages css/ClassRecordPage.css";

const PROFILE_COLORS = {
  "Reading at Grade Level": "#639922",
  "Transitioning Reader":   "#378ADD",
  "Developing Reader":      "#EF9F27",
  "High Emerging Reader":   "#D4537E",
  "Low Emerging Reader":    "#E24B4A",
};

const PERIOD_LABELS = { beginning: "Beginning", middle: "Middle", end: "End" };

function formatGrade(gl) {
  if (!gl) return "Unknown";
  if (gl === "kindergarten") return "Kindergarten";
  return `Grade ${gl.replace("grade_", "")}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
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

export default function ClassRecordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const grade   = searchParams.get("grade")   ?? "";
  const section = searchParams.get("section") ?? "";
  const year    = searchParams.get("year")    ?? "";
  const period  = searchParams.get("period")  ?? "beginning";

  const [language, setLanguage] = useState("filipino");
  const [teacher, setTeacher]   = useState(null);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [me, stuData, sessData] = await Promise.all([
          authApi.me(),
          studentsApi.list({ page_size: 200 }),
          sessionsApi.list({ school_year: year, period, is_completed: true, page_size: 100 }),
        ]);
        if (cancelled) return;

        setTeacher(me);

        const classStudents = (stuData.students || [])
          .filter((s) => {
            const matchGrade   = s.grade_level === grade;
            const matchSection = section ? s.section === section : !s.section;
            return matchGrade && matchSection;
          })
          .sort((a, b) =>
            `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
          );

        setStudents(classStudents);
        setSessions(sessData.sessions || []);
      } catch (e) {
        if (!cancelled) {
          const detail = e.response?.data?.detail;
          setError(
            typeof detail === "string" ? detail
            : Array.isArray(detail)   ? detail.map((d) => d.msg).join(", ")
            : e.message
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [grade, section, year, period]);

  // Filter sessions by selected language, then build a student_id → session map
  const sessionByStudent = {};
  for (const sess of sessions) {
    if (sess.language === language) {
      sessionByStudent[sess.student_id] = sess;
    }
  }

  const periodLabel = PERIOD_LABELS[period] ?? period;

  return (
    <Layout>
      <div className="cr-page">

        {/* ── Top bar ── */}
        <div className="cr-topbar">
          <div className="cr-topbar__left">
            <button
              className="cr-back-btn"
              onClick={() => navigate("/students")}
              aria-label="Back to Student Record"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="cr-title">
                {formatGrade(grade)}{section ? ` — ${section}` : ""}
              </h1>
              <p className="cr-subtitle">{year} &nbsp;·&nbsp; {periodLabel}</p>
            </div>
          </div>

          <div className="cr-topbar__right">
            <label className="cr-lang-label" htmlFor="cr-language">Language:</label>
            <select
              id="cr-language"
              className="cr-lang-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="filipino">Filipino</option>
              <option value="english">English</option>
            </select>
          </div>
        </div>

        {/* ── States ── */}
        {loading && (
          <div className="cr-state">
            <div className="cr-spinner" />
            <p>Loading class data…</p>
          </div>
        )}

        {error && !loading && (
          <div className="cr-state cr-state--error"><p>⚠ {error}</p></div>
        )}

        {/* ── Class record card ── */}
        {!loading && !error && (
          <div className="cr-card">

            {/* Info bar (mirrors Excel header section) */}
            <div className="cr-info-bar">
              <div className="cr-info-item">
                <span className="cr-info-label">Assessment Period</span>
                <span className="cr-info-value">{periodLabel}</span>
              </div>
              <div className="cr-info-item">
                <span className="cr-info-label">Teacher</span>
                <span className="cr-info-value">
                  {teacher ? `${teacher.first_name} ${teacher.last_name}` : "—"}
                </span>
              </div>
              <div className="cr-info-item">
                <span className="cr-info-label">Grade Level</span>
                <span className="cr-info-value">{formatGrade(grade)}</span>
              </div>
              <div className="cr-info-item">
                <span className="cr-info-label">Section</span>
                <span className="cr-info-value">{section || "—"}</span>
              </div>
              <div className="cr-info-item">
                <span className="cr-info-label">Language</span>
                <span className="cr-info-value cr-info-value--cap">{language}</span>
              </div>
            </div>

            {/* Scrollable assessment table */}
            <div className="cr-table-wrapper">
              <table className="cr-table">
                <thead>
                  <tr>
                    {/* Group: Identity */}
                    <th rowSpan={2} className="cr-th cr-th--id">#</th>
                    <th rowSpan={2} className="cr-th cr-th--id">LRN</th>
                    <th rowSpan={2} className="cr-th cr-th--name">Student Name</th>
                    <th rowSpan={2} className="cr-th">Sex</th>
                    <th rowSpan={2} className="cr-th">Date</th>
                    {/* Group: Assessment Part 1 */}
                    <th colSpan={5} className="cr-th cr-th--group1">Assessment Part 1</th>
                    {/* Group: Assessment Part 2 */}
                    <th colSpan={8} className="cr-th cr-th--group2">Assessment Part 2</th>
                    {/* Group: Observation */}
                    <th rowSpan={2} className="cr-th">Learner Exp.</th>
                    <th rowSpan={2} className="cr-th">Obs. Level</th>
                    <th rowSpan={2} className="cr-th cr-th--profile">Reading Profile</th>
                    <th rowSpan={2} className="cr-th cr-th--remarks">Remarks</th>
                  </tr>
                  <tr>
                    <th className="cr-th cr-th--sub cr-th--group1">Task 1</th>
                    <th className="cr-th cr-th--sub cr-th--group1">Task 2L Words</th>
                    <th className="cr-th cr-th--sub cr-th--group1">Task 2H Sent.</th>
                    <th className="cr-th cr-th--sub cr-th--group1">Total Score</th>
                    <th className="cr-th cr-th--sub cr-th--group1">Part 1 Level</th>
                    <th className="cr-th cr-th--sub cr-th--group2">Story Title</th>
                    <th className="cr-th cr-th--sub cr-th--group2">Total Words</th>
                    <th className="cr-th cr-th--sub cr-th--group2">Miscues</th>
                    <th className="cr-th cr-th--sub cr-th--group2">Words Read</th>
                    <th className="cr-th cr-th--sub cr-th--group2">Total Time</th>
                    <th className="cr-th cr-th--sub cr-th--group2">WPM</th>
                    <th className="cr-th cr-th--sub cr-th--group2">% Correct</th>
                    <th className="cr-th cr-th--sub cr-th--group2">Correct Ans.</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={22} className="cr-empty-row">No students in this class.</td>
                    </tr>
                  ) : (
                    students.map((s, idx) => {
                      const sess    = sessionByStudent[s.id];
                      const rr      = sess?.reading_result;
                      const obs     = sess?.observation;
                      const profile = rr?.reading_profile ?? s.reading_profile;
                      const nameColor = PROFILE_COLORS[profile] ?? "#1a2340";

                      const totalWords = rr?.total_words ?? null;
                      const miscues    = rr?.miscue_count ?? null;
                      const wordsRead  = totalWords !== null && miscues !== null
                        ? totalWords - miscues
                        : null;
                      const pctCorrect = totalWords && totalWords > 0 && miscues !== null
                        ? `${Math.round(((totalWords - miscues) / totalWords) * 100)}%`
                        : null;

                      const route       = rr?.part1_route ?? "";
                      const task2LScore = route.includes("2l") ? d(rr?.part1_task2_correct) : "—";
                      const task2HScore = route.includes("2h") ? d(rr?.part1_task2_correct) : "—";

                      return (
                        <tr key={s.id}>
                          <td className="cr-td cr-td--center">{idx + 1}</td>
                          <td className="cr-td">{s.lrn ?? "—"}</td>
                          <td className="cr-td">
                            <button
                              className="cr-student-link"
                              style={{ color: nameColor }}
                              onClick={() => navigate(`/students/${s.id}`)}
                            >
                              {s.last_name}, {s.first_name}
                            </button>
                          </td>
                          <td className="cr-td cr-td--cap">{s.sex ?? "—"}</td>
                          <td className="cr-td">{sess ? formatDate(sess.created_at) : "—"}</td>
                          {/* Part 1 */}
                          <td className="cr-td cr-td--center cr-td--g1">{d(rr?.part1_task1_correct)}</td>
                          <td className="cr-td cr-td--center cr-td--g1">{task2LScore}</td>
                          <td className="cr-td cr-td--center cr-td--g1">{task2HScore}</td>
                          <td className="cr-td cr-td--center cr-td--g1">{d(rr?.part1_total_score)}</td>
                          <td className="cr-td cr-td--g1">{rr?.part1_classification ?? "—"}</td>
                          {/* Part 2 */}
                          <td className="cr-td cr-td--g2">{sess?.passage?.title ?? "—"}</td>
                          <td className="cr-td cr-td--center cr-td--g2">{d(totalWords)}</td>
                          <td className="cr-td cr-td--center cr-td--g2">{d(miscues)}</td>
                          <td className="cr-td cr-td--center cr-td--g2">{d(wordsRead)}</td>
                          <td className="cr-td cr-td--center cr-td--g2">{formatTime(rr?.reading_time_seconds)}</td>
                          <td className="cr-td cr-td--center cr-td--g2">{d(rr?.cwpm)}</td>
                          <td className="cr-td cr-td--center cr-td--g2">{pctCorrect ?? "—"}</td>
                          <td className="cr-td cr-td--center cr-td--g2">
                            {obs
                              ? `${obs.comprehension_correct ?? "—"}/${obs.comprehension_total ?? "—"}`
                              : "—"}
                          </td>
                          {/* Observation */}
                          <td className="cr-td cr-td--center">{d(obs?.learner_experience)}</td>
                          <td className="cr-td cr-td--center">{d(obs?.fluency_level)}</td>
                          <td className="cr-td cr-td--profile" style={{ color: nameColor, fontWeight: 600 }}>
                            {profile ?? "—"}
                          </td>
                          <td className="cr-td cr-td--remarks">{obs?.teacher_remarks ?? "—"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}

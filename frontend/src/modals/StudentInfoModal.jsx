import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { sessionsApi, studentsApi } from "../services/api";
import "./StudentInfoModal.css";

const PERIOD_MAP = { beginning: "Beginning of SY", middle: "Middle of SY", end: "End of SY" };

const PROFILE_COLORS = {
  "Reading at Grade Level": "#639922",
  "Transitioning Reader":   "#378ADD",
  "Developing Reader":      "#EF9F27",
  "High Emerging Reader":   "#D4537E",
  "Low Emerging Reader":    "#E24B4A",
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

function fmtTime(seconds) {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = String(Math.round(seconds % 60)).padStart(2, "0");
  return `${m}:${s}`;
}

function fmtGrade(gl) {
  if (!gl) return "—";
  if (gl === "kindergarten") return "Kindergarten";
  return `Grade ${gl.replace("grade_", "")}`;
}

function d(val) {
  return val !== null && val !== undefined ? val : "—";
}

export default function StudentInfoModal({ sessionId, onClose }) {
  const [session, setSession] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setStudent(null);
      return;
    }
    setLoading(true);
    setError(null);
    setSession(null);
    setStudent(null);

    sessionsApi.get(sessionId)
      .then(async (sess) => {
        setSession(sess);
        if (sess.student_id) {
          const stu = await studentsApi.get(sess.student_id);
          setStudent(stu);
        }
      })
      .catch((e) => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (!sessionId) return null;

  const rr  = session?.reading_result;
  const obs = session?.observation;

  const profile      = rr?.reading_profile ?? null;
  const profileColor = PROFILE_COLORS[profile] ?? "#1a2340";

  const pctCorrect = rr && rr.total_words > 0
    ? Math.round(((rr.total_words - (rr.miscue_count ?? 0)) / rr.total_words) * 100)
    : null;

  const route       = (rr?.part1_route ?? "").toLowerCase();
  const task2LScore = route.includes("2l") ? rr?.part1_task2_correct : null;
  const task2HScore = route.includes("2h") ? rr?.part1_task2_correct : null;
  const wordsRead   = rr?.total_words != null && rr?.miscue_count != null
    ? rr.total_words - rr.miscue_count
    : null;

  return (
    <div className="sim-overlay" onClick={onClose}>
      <div className="sim-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="sim-header">
          <div className="sim-header__info">
            <h2 className="sim-name">
              {student
                ? `${student.last_name}, ${student.first_name}`
                : loading ? "Loading…" : "Assessment Record"}
            </h2>
            {student && (
              <div className="sim-badges">
                <span className="sim-badge">{fmtGrade(student.grade_level)}</span>
                {student.section && <span className="sim-badge">{student.section}</span>}
                {student.lrn    && <span className="sim-badge">LRN: {student.lrn}</span>}
                {student.sex    && (
                  <span className="sim-badge sim-badge--cap">{student.sex}</span>
                )}
              </div>
            )}
          </div>
          <button className="sim-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="sim-body">

          {loading && (
            <div className="sim-state">
              <div className="sim-spinner" />
              <p>Loading session…</p>
            </div>
          )}

          {error && !loading && (
            <div className="sim-state sim-state--error">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && session && (
            <>
              {/* Session meta strip */}
              <div className="sim-meta-strip">
                <div className="sim-meta-item">
                  <span className="sim-meta-label">Date</span>
                  <span className="sim-meta-value">{fmtDate(session.created_at)}</span>
                </div>
                <div className="sim-meta-item">
                  <span className="sim-meta-label">Period</span>
                  <span className="sim-meta-value">{PERIOD_MAP[session.period] ?? session.period ?? "—"}</span>
                </div>
                <div className="sim-meta-item">
                  <span className="sim-meta-label">Language</span>
                  <span className="sim-meta-value sim-meta-value--cap">{session.language ?? "—"}</span>
                </div>
                <div className="sim-meta-item">
                  <span className="sim-meta-label">School Year</span>
                  <span className="sim-meta-value">{session.school_year ?? "—"}</span>
                </div>
              </div>

              {/* Reading profile banner */}
              {profile && (
                <div
                  className="sim-profile-banner"
                  style={{ borderColor: profileColor, background: `${profileColor}18` }}
                >
                  <span className="sim-profile-dot" style={{ background: profileColor }} />
                  <span className="sim-profile-text" style={{ color: profileColor }}>{profile}</span>
                </div>
              )}

              {/* Part 1 */}
              <div className="sim-section">
                <h3 className="sim-section-title">Assessment Part 1</h3>
                <div className="sim-stat-grid">
                  <div className="sim-stat">
                    <span className="sim-stat__val" style={{ color: "#2c7fc1" }}>{d(rr?.part1_task1_correct)}</span>
                    <span className="sim-stat__lbl">Task 1 Correct</span>
                  </div>
                  {task2LScore !== null && (
                    <div className="sim-stat">
                      <span className="sim-stat__val" style={{ color: "#9b59b6" }}>{d(task2LScore)}</span>
                      <span className="sim-stat__lbl">Task 2L Words</span>
                    </div>
                  )}
                  {task2HScore !== null && (
                    <div className="sim-stat">
                      <span className="sim-stat__val" style={{ color: "#9b59b6" }}>{d(task2HScore)}</span>
                      <span className="sim-stat__lbl">Task 2H Sent.</span>
                    </div>
                  )}
                  <div className="sim-stat">
                    <span className="sim-stat__val" style={{ color: "#27ae60" }}>{d(rr?.part1_total_score)}</span>
                    <span className="sim-stat__lbl">Total Score</span>
                  </div>
                  {rr?.part1_classification && (
                    <div className="sim-stat sim-stat--wide">
                      <span className="sim-stat__val sim-stat__val--sm">{rr.part1_classification}</span>
                      <span className="sim-stat__lbl">Part 1 Level</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Part 2 */}
              <div className="sim-section">
                <h3 className="sim-section-title">Assessment Part 2</h3>
                {session.passage?.title && (() => {
                  const m = session.passage.title.match(/^Story\s*(\d+)\s*:\s*(.+)$/i);
                  return m ? (
                    <p className="sim-story-title">
                      <span style={{ fontWeight: 700 }}>Story {m[1]}:</span>{" "}{m[2]}
                    </p>
                  ) : (
                    <p className="sim-story-title">{session.passage.title}</p>
                  );
                })()}
                <div className="sim-stat-grid">
                  <div className="sim-stat">
                    <span className="sim-stat__val">{d(rr?.total_words)}</span>
                    <span className="sim-stat__lbl">Total Words</span>
                  </div>
                  <div className="sim-stat">
                    <span className="sim-stat__val" style={{ color: "#c0392b" }}>{d(rr?.miscue_count)}</span>
                    <span className="sim-stat__lbl">Miscues</span>
                  </div>
                  <div className="sim-stat">
                    <span className="sim-stat__val">{d(wordsRead)}</span>
                    <span className="sim-stat__lbl">Words Read</span>
                  </div>
                  <div className="sim-stat">
                    <span className="sim-stat__val" style={{ color: "#2c3e6b" }}>
                      {rr?.cwpm != null ? Math.round(rr.cwpm) : "—"}
                    </span>
                    <span className="sim-stat__lbl">WPM</span>
                  </div>
                  <div className="sim-stat">
                    <span className="sim-stat__val">{pctCorrect != null ? `${pctCorrect}%` : "—"}</span>
                    <span className="sim-stat__lbl">% Correct</span>
                  </div>
                  <div className="sim-stat">
                    <span className="sim-stat__val">{fmtTime(rr?.reading_time_seconds)}</span>
                    <span className="sim-stat__lbl">Total Time</span>
                  </div>
                  {obs && (
                    <div className="sim-stat">
                      <span className="sim-stat__val">
                        {d(obs.comprehension_correct)}/{d(obs.comprehension_total)}
                      </span>
                      <span className="sim-stat__lbl">Comprehension</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Observation */}
              <div className="sim-section">
                <h3 className="sim-section-title">Observation & Feedback</h3>
                <div className="sim-stat-grid">
                  <div className="sim-stat">
                    <span className="sim-stat__val">{d(obs?.learner_experience)}</span>
                    <span className="sim-stat__lbl">Learner Experience</span>
                  </div>
                  <div className="sim-stat">
                    <span className="sim-stat__val">{d(obs?.fluency_level)}</span>
                    <span className="sim-stat__lbl">Observation Level</span>
                  </div>
                </div>
                <div className="sim-remarks">
                  <span className="sim-remarks__label">Teacher's Remarks</span>
                  <p className="sim-remarks__text">
                    {obs?.teacher_remarks || "No remarks added."}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

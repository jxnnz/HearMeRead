import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { sessionsApi, studentsApi } from "../services/api";
import WordHighlightView from "../components/WordHighlightView";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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

export default function StudentInfoModal({ sessionId, studentId, onClose }) {
  const [session, setSession] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!sessionId && !studentId) {
      setSession(null);
      setStudent(null);
      return;
    }
    setLoading(true);
    setError(null);
    setSession(null);
    setStudent(null);

    if (sessionId) {
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
    } else if (studentId) {
      studentsApi.get(studentId)
        .then((stu) => {
          setStudent(stu);
        })
        .catch((e) => setError(e.response?.data?.detail || e.message))
        .finally(() => setLoading(false));
    }
  }, [sessionId, studentId]);

  if (!sessionId && !studentId) return null;

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

  const task1Alignments = rr?.part1_task1_alignments_json ? JSON.parse(rr.part1_task1_alignments_json) : [];
  const task2Alignments = rr?.part1_task2_alignments_json ? JSON.parse(rr.part1_task2_alignments_json) : [];
  const part2Alignments = rr?.part2_alignments_json ? JSON.parse(rr.part2_alignments_json) : [];

  const exportToPDF = () => {
    if (!student) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const primaryColor = [26, 35, 64];

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("HEAR ME READ", 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 110);
    doc.text("Individual Student Assessment Report", 14, 25);

    // Divider
    doc.setDrawColor(210, 216, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 28, 196, 28);

    // Student Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("STUDENT INFORMATION", 14, 36);

    const infoRows = [
      [
        { content: "Student Name:", styles: { fontStyle: "bold" } },
        `${student.last_name}, ${student.first_name}${student.middle_name ? `, ${student.middle_name}` : ""}`,
        { content: "LRN:", styles: { fontStyle: "bold" } },
        student.lrn || "—"
      ],
      [
        { content: "Grade & Section:", styles: { fontStyle: "bold" } },
        `${fmtGrade(student.grade_level)}${student.section ? ` - ${student.section}` : ""}`,
        { content: "Sex:", styles: { fontStyle: "bold" } },
        student.sex ? student.sex.charAt(0).toUpperCase() + student.sex.slice(1) : "—"
      ]
    ];

    autoTable(doc, {
      body: infoRows,
      startY: 39,
      margin: { left: 14, right: 14 },
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 1.5, textColor: [26, 35, 64] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 65 },
        2: { cellWidth: 25 },
        3: { cellWidth: 65 }
      }
    });

    let currentY = doc.lastAutoTable.finalY + 8;

    if (session) {
      // Assessment Session Info
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("ASSESSMENT DETAILS", 14, currentY);

      const detailsRows = [
        [
          { content: "School Year:", styles: { fontStyle: "bold" } },
          session.school_year || "—",
          { content: "Date assessed:", styles: { fontStyle: "bold" } },
          fmtDate(session.created_at)
        ],
        [
          { content: "Period:", styles: { fontStyle: "bold" } },
          PERIOD_MAP[session.period] || session.period || "—",
          { content: "Language:", styles: { fontStyle: "bold" } },
          session.language ? session.language.charAt(0).toUpperCase() + session.language.slice(1) : "—"
        ],
        [
          { content: "Reading Profile:", styles: { fontStyle: "bold" } },
          {
            content: profile || "—",
            styles: {
              textColor: profileColor === "#639922" ? [99, 153, 34]
                       : profileColor === "#378ADD" ? [55, 138, 221]
                       : profileColor === "#EF9F27" ? [239, 159, 39]
                       : profileColor === "#D4537E" ? [212, 83, 126]
                       : profileColor === "#E24B4A" ? [226, 75, 74]
                       : [26, 35, 64],
              fontStyle: "bold"
            }
          },
          "", ""
        ]
      ];

      autoTable(doc, {
        body: detailsRows,
        startY: currentY + 3,
        margin: { left: 14, right: 14 },
        theme: "plain",
        styles: { fontSize: 10, cellPadding: 1.5, textColor: [26, 35, 64] },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 65 },
          2: { cellWidth: 30 },
          3: { cellWidth: 60 }
        }
      });

      currentY = doc.lastAutoTable.finalY + 8;

      // Part 1 Results
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("PART 1: SCREENER RESULTS", 14, currentY);

      const part1Rows = [
        ["Task 1 (Rapid Literacy)", `${d(rr?.part1_task1_correct)} correct`],
        [route.includes("2h") ? "Task 2H (Sentences)" : "Task 2L (Words)", `${d(rr?.part1_task2_correct)} correct`],
        ["Total Screener Score", `${d(rr?.part1_total_score)} points`],
        ["Part 1 Classification", rr?.part1_classification || "—"]
      ];

      autoTable(doc, {
        head: [["Assessment Area", "Result / Score"]],
        body: part1Rows,
        startY: currentY + 3,
        margin: { left: 14, right: 14 },
        theme: "striped",
        headStyles: { fillColor: [44, 62, 107], textColor: 255 },
        styles: { fontSize: 9.5, cellPadding: 2, textColor: [26, 35, 64] }
      });

      currentY = doc.lastAutoTable.finalY + 8;

      // Part 2 Results
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("PART 2: ORAL READING & COMPREHENSION", 14, currentY);

      const getStoryLabel = (title) => {
        if (!title) return "—";
        const m = title.match(/^Story\s*(\d+)\s*:/i);
        return m ? `Story ${m[1]}` : title;
      };

      const part2Rows = [
        ["Story Title", session.passage?.title ? getStoryLabel(session.passage.title) : "—"],
        ["Total Words in Passage", d(rr?.total_words)],
        ["Miscues Count", d(rr?.miscue_count)],
        ["Words Read Correctly", d(wordsRead)],
        ["Reading Time", fmtTime(rr?.reading_time_seconds)],
        ["Correct Words Per Minute (WPM)", rr?.cwpm != null ? Math.round(rr.cwpm) : "—"],
        ["Word Accuracy Rate", pctCorrect != null ? `${pctCorrect}%` : "—"],
        ["Comprehension Questions Answered", obs ? `${d(obs.comprehension_correct)}/${d(obs.comprehension_total)}` : "—"]
      ];

      autoTable(doc, {
        head: [["Metric", "Result"]],
        body: part2Rows,
        startY: currentY + 3,
        margin: { left: 14, right: 14 },
        theme: "striped",
        headStyles: { fillColor: [20, 100, 60], textColor: 255 },
        styles: { fontSize: 9.5, cellPadding: 2, textColor: [26, 35, 64] }
      });

      currentY = doc.lastAutoTable.finalY + 8;

      if (currentY > 220) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("OBSERVATIONS & FEEDBACK", 14, currentY);

      const obsRows = [
        ["Learner Experience", d(obs?.learner_experience)],
        ["Observation / Fluency Level", d(obs?.fluency_level)],
        ["Teacher's Remarks", obs?.teacher_remarks || "No remarks added."]
      ];

      autoTable(doc, {
        body: obsRows,
        startY: currentY + 3,
        margin: { left: 14, right: 14 },
        theme: "plain",
        styles: { fontSize: 10, cellPadding: 2, textColor: [26, 35, 64] },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: "bold" },
          1: { cellWidth: 130 }
        }
      });
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(11);
      doc.setTextColor(120, 120, 130);
      doc.text("No completed assessment record found for this period.", 14, currentY + 10);
    }

    const pdfFileName = `AssessmentReport_${student.last_name}_${student.first_name}${student.middle_name ? `_${student.middle_name}` : ""}.pdf`;
    doc.save(pdfFileName);
  };

  return (
    <div className="sim-overlay" onClick={onClose}>
      <div className="sim-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="sim-header">
          <div className="sim-header__info">
            <h2 className="sim-name">
              {student
                ? `${student.last_name}, ${student.first_name}${student.middle_name ? `, ${student.middle_name}` : ""}`
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
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {student && !loading && !error && (
              <button
                className="sim-download-btn"
                onClick={exportToPDF}
                title="Download PDF"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #d0d8f0",
                  background: "#fff",
                  color: "#1a2340",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                <Download size={14} />
                PDF
              </button>
            )}
            <button className="sim-close-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
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

                {/* Part 1 Transcriptions */}
                {(task1Alignments.length > 0 || task2Alignments.length > 0) && (
                  <div style={{ marginTop: "16px", borderTop: "1.5px solid #e8ecf5", paddingTop: "16px" }}>
                    <h4 className="sim-subsection-title" style={{ fontSize: "11px", fontWeight: 700, color: "#100c08", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
                      Assessment Part 1 Transcriptions
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {task1Alignments.length > 0 && (
                        <WordHighlightView
                          alignments={task1Alignments}
                          label="Task 1 — Words Read"
                        />
                      )}
                      {task2Alignments.length > 0 && (
                        <WordHighlightView
                          alignments={task2Alignments}
                          label={`Task 2 — ${route.includes("2l") ? "Words Read" : "Sentences Read"}`}
                        />
                      )}
                    </div>
                  </div>
                )}
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

                {/* Part 2 Transcription */}
                {part2Alignments.length > 0 && (
                  <div style={{ marginTop: "16px", borderTop: "1.5px solid #e8ecf5", paddingTop: "16px" }}>
                    <h4 className="sim-subsection-title" style={{ fontSize: "11px", fontWeight: 700, color: "#100c08", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
                      Assessment Part 2 Transcription
                    </h4>
                    <WordHighlightView
                      alignments={part2Alignments}
                      label="Story Reading Transcription"
                    />
                  </div>
                )}
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

          {!loading && !error && !session && student && (
            <div className="sim-state" style={{ padding: "60px 20px", textAlign: "center", color: "#8a94b2" }}>
              <p style={{ fontSize: "15px", fontWeight: 500, marginBottom: "8px" }}>No assessment session completed for this period.</p>
              <p style={{ fontSize: "13px", opacity: 0.8 }}>This student has not yet completed a Filipino or English assessment for the selected school year and period.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

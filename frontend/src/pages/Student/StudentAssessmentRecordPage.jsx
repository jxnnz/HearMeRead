import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  Download,
  Headphones,
  Pencil,
  AlertCircle,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import Layout from "../../components/Layout";
import TopBar from "../../components/TopBar";
import WordHighlightView from "../../components/WordHighlightView";
import AudioPlayer from "../../components/AudioPlayer";
import EditTranscriptionModal from "../../modals/EditTranscriptionModal";
import Toast from "../../modals/Toast";
import useToast from "../../hooks/Usetoast";
import { sessionsApi, studentsApi } from "../../services/api";
import { parseApiError } from "../../utils/apiError";

import "../pages css/StudentAssessmentRecordPage.css";

const PERIOD_MAP = {
  beginning: "Beginning of SY",
  middle:    "Middle of SY",
  end:       "End of SY",
};

const PROFILE_COLORS = {
  "Reading at Grade Level": "#639922",
  "Transitioning Reader":   "#378ADD",
  "Developing Reader":      "#EF9F27",
  "High Emerging Reader":   "#D4537E",
  "Low Emerging Reader":    "#E24B4A",
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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
  return `Grade ${String(gl).replace("grade_", "")}`;
}

function d(val) {
  return val !== null && val !== undefined ? val : "—";
}

export default function StudentAssessmentRecordPage() {
  const { studentId, sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const backTo = location.state?.from ?? "/students/class";
  const backOptions = location.state?.classState ? { state: location.state.classState } : {};

  const { toasts, removeToast, addToast, showError } = useToast();

  const [session, setSession] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Edit Modal State
  const [editModal, setEditModal] = useState({
    isOpen: false,
    type: null, // "part1_task1" | "part1_task2" | "part2" | "remarks"
    title: "",
    description: "",
    transcript: "",
  });
  const [recalculating, setRecalculating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessData, stuData] = await Promise.all([
        sessionId && sessionId !== "0" ? sessionsApi.get(sessionId) : null,
        studentId ? studentsApi.get(studentId) : null,
      ]);
      setSession(sessData);
      setStudent(stuData);
    } catch (e) {
      setError(parseApiError(e, "Failed to load student assessment record."));
    } finally {
      setLoading(false);
    }
  }, [sessionId, studentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Edit Modals
  const openEditModal = (type) => {
    // Immediately pause all playing audio on the page
    window.dispatchEvent(new CustomEvent("pause-all-audio"));
    document.querySelectorAll("audio").forEach((el) => {
      try {
        el.pause();
      } catch (_) {}
    });

    const rr = session?.reading_result;
    const obs = session?.observation;

    if (type === "part1_task1") {
      let currentText = "";
      if (rr?.part1_task1_alignments_json) {
        try {
          const list = JSON.parse(rr.part1_task1_alignments_json);
          currentText = list.map((a) => a.transcribed || "").filter(Boolean).join(" ");
        } catch (_) {}
      }
      setEditModal({
        isOpen: true,
        type: "part1_task1",
        title: "Edit Part 1 — Task 1 Transcription",
        description: "Edit the student's transcribed letter sounds/words. Saving will automatically recalculate Task 1 scores and alignments.",
        transcript: currentText,
      });
    } else if (type === "part1_task2") {
      let currentText = "";
      if (rr?.part1_task2_alignments_json) {
        try {
          const list = JSON.parse(rr.part1_task2_alignments_json);
          currentText = list.map((a) => a.transcribed || "").filter(Boolean).join(" ");
        } catch (_) {}
      }
      setEditModal({
        isOpen: true,
        type: "part1_task2",
        title: "Edit Part 1 — Task 2 Transcription",
        description: "Edit the student's transcribed rhymes/sentences. Saving will recalculate Task 2 scores, total score, and classification.",
        transcript: currentText,
      });
    } else if (type === "part2") {
      let currentText = "";
      if (rr?.part2_alignments_json) {
        try {
          const list = JSON.parse(rr.part2_alignments_json);
          currentText = list.map((a) => a.transcribed || "").filter(Boolean).join(" ");
        } catch (_) {}
      }
      setEditModal({
        isOpen: true,
        type: "part2",
        title: "Edit Story Reading Transcription",
        description: "Correct any words Whisper may have misheard. Saving will re-run word alignment and recalculate CWPM, miscues, and reading profile.",
        transcript: currentText,
      });
    } else if (type === "remarks") {
      setEditModal({
        isOpen: true,
        type: "remarks",
        title: "Edit Teacher Remarks",
        description: "Update assessment notes, instructional observations, or recommendations for this student.",
        transcript: obs?.teacher_remarks || "",
      });
    }
  };

  const handleSaveRecalculation = async (updatedText) => {
    if (!session?.id) return;
    setRecalculating(true);
    try {
      const payload = {};
      if (editModal.type === "part1_task1") {
        payload.part1_task1_transcript = updatedText;
      } else if (editModal.type === "part1_task2") {
        payload.part1_task2_transcript = updatedText;
      } else if (editModal.type === "part2") {
        payload.part2_transcript = updatedText;
      } else if (editModal.type === "remarks") {
        payload.teacher_remarks = updatedText;
      }

      const updatedSession = await sessionsApi.recalculate(session.id, payload);
      setSession(updatedSession);
      setEditModal((prev) => ({ ...prev, isOpen: false }));
      addToast("Assessment scores recalculated and updated successfully!", "success");
    } catch (e) {
      showError(parseApiError(e, "Failed to recalculate assessment scores."));
    } finally {
      setRecalculating(false);
    }
  };

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

    doc.setDrawColor(210, 216, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 28, 196, 28);

    // Student Info Block
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 60);

    const leftX = 14;
    const midX  = 105;
    let currentY = 35;

    doc.setFont("helvetica", "bold");
    doc.text("Student Name:", leftX, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(`${student.last_name}, ${student.first_name}${student.middle_name ? ` ${student.middle_name}` : ""}`, leftX + 26, currentY);

    doc.setFont("helvetica", "bold");
    doc.text("Grade & Section:", midX, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(`${fmtGrade(student.grade_level)} — ${student.section || "No Section"}`, midX + 30, currentY);

    currentY += 6;
    doc.setFont("helvetica", "bold");
    doc.text("LRN:", leftX, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(student.lrn || "—", leftX + 26, currentY);

    doc.setFont("helvetica", "bold");
    doc.text("Sex:", midX, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(student.sex ? student.sex.toUpperCase() : "—", midX + 30, currentY);

    currentY += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Assessment Date:", leftX, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(fmtDate(session?.created_at), leftX + 30, currentY);

    doc.setFont("helvetica", "bold");
    doc.text("Period / SY:", midX, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(`${PERIOD_MAP[session?.period] ?? session?.period ?? "—"} (${session?.school_year ?? "—"})`, midX + 24, currentY);

    currentY += 10;

    const rr  = session?.reading_result;
    const obs = session?.observation;

    if (session && rr) {
      // Reading Profile Banner
      const profile = rr?.reading_profile || "Not Evaluated";
      doc.setFillColor(244, 247, 253);
      doc.roundedRect(14, currentY, 182, 12, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 50, 100);
      doc.text(`Overall Reading Profile: ${profile}`, 18, currentY + 8);

      currentY += 18;

      // Part 1 Table
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("Assessment Part 1 (Foundational Reading Skills)", 14, currentY);

      currentY += 3;
      const part1Rows = [
        ["Task 1 (Letter Sounds)", `${d(rr?.part1_task1_correct)} / 10`],
        ["Task 2 Score", `${d(rr?.part1_task2_correct)} / 10`],
        ["Task 2 Route", rr?.part1_route === "task_2L" ? "Task 2L (Rhymes)" : rr?.part1_route === "task_2H" ? "Task 2H (Sentences)" : "—"],
        ["Part 1 Total Score", `${d(rr?.part1_total_score)} / 20`],
        ["Part 1 Classification", rr?.part1_classification || "—"],
      ];

      autoTable(doc, {
        startY: currentY,
        head: [["Metric", "Result"]],
        body: part1Rows,
        theme: "striped",
        headStyles: { fillColor: [44, 62, 107], fontSize: 9, fontStyle: "bold" },
        bodyStyles: { fontSize: 8.5, textColor: [30, 30, 40] },
        columnStyles: { 0: { cellWidth: 80, fontStyle: "bold" }, 1: { cellWidth: 102 } },
        margin: { left: 14, right: 14 },
      });

      currentY = doc.lastAutoTable.finalY + 10;

      // Part 2 Table
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("Assessment Part 2 (Passage Reading & Comprehension)", 14, currentY);

      currentY += 3;
      const totalWords = rr?.total_words;
      const miscues = rr?.miscue_count;
      const wordsRead = totalWords != null && miscues != null ? totalWords - miscues : "—";
      const pctCorrect = totalWords && totalWords > 0 && miscues != null
        ? `${Math.round(((totalWords - miscues) / totalWords) * 100)}%`
        : "—";

      const part2Rows = hasPart2
        ? [
            ["Passage / Story", session?.passage?.title || "—"],
            ["Total Words in Passage", d(totalWords)],
            ["Miscues Count", d(miscues)],
            ["Words Read Accurately", wordsRead],
            ["Reading Time", fmtTime(rr?.reading_time_seconds)],
            ["Correct Words Per Minute (CWPM)", rr?.cwpm != null ? Math.round(rr.cwpm) : "—"],
            ["Accuracy Percentage", pctCorrect],
            ["Comprehension Score", obs ? `${d(obs.comprehension_correct)} / ${d(obs.comprehension_total)}` : "—"],
          ]
        : [
            ["Status", "Not Taken"],
            ["Notes", rr?.part1_classification === "Full Refresher" ? "Full Refresher on Part 1 (Part 2 Story Reading omitted)" : "Part 2 not administered"],
          ];

      autoTable(doc, {
        startY: currentY,
        head: [["Metric", "Result"]],
        body: part2Rows,
        theme: "striped",
        headStyles: { fillColor: [44, 62, 107], fontSize: 9, fontStyle: "bold" },
        bodyStyles: { fontSize: 8.5, textColor: [30, 30, 40] },
        columnStyles: { 0: { cellWidth: 80, fontStyle: "bold" }, 1: { cellWidth: 102 } },
        margin: { left: 14, right: 14 },
      });

      currentY = doc.lastAutoTable.finalY + 10;

      // Observation Table
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("Observation & Feedback", 14, currentY);

      currentY += 3;
      const obsRows = [
        ["Learner Experience Rating", obs?.learner_experience ? `${obs.learner_experience} / 5` : "—"],
        ["Fluency Observation Level", obs?.fluency_level ? `Level ${obs.fluency_level} / 4` : "—"],
        ["Teacher's Remarks", obs?.teacher_remarks || "No remarks added."],
      ];

      autoTable(doc, {
        startY: currentY,
        head: [["Metric", "Details"]],
        body: obsRows,
        theme: "striped",
        headStyles: { fillColor: [44, 62, 107], fontSize: 9, fontStyle: "bold" },
        bodyStyles: { fontSize: 8.5, textColor: [30, 30, 40] },
        columnStyles: { 0: { cellWidth: 80, fontStyle: "bold" }, 1: { cellWidth: 102 } },
        margin: { left: 14, right: 14 },
      });
    }

    const pdfFileName = `AssessmentRecord_${student.last_name}_${student.first_name}_${session?.period || "BoSY"}.pdf`;
    doc.save(pdfFileName);
  };

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

  // Expiration calculation for 90-day retention
  const audioExpiresAt = rr?.audio_expires_at ? new Date(rr.audio_expires_at) : null;
  const part1AudioExpiresAt = rr?.part1_audio_expires_at ? new Date(rr.part1_audio_expires_at) : null;
  const part1Task2AudioExpiresAt = rr?.part1_task2_audio_expires_at ? new Date(rr.part1_task2_audio_expires_at) : null;
  const now = new Date();
  const isPart1AudioExpired = part1AudioExpiresAt ? part1AudioExpiresAt <= now : (audioExpiresAt && audioExpiresAt <= now);
  const isPart1Task2AudioExpired = part1Task2AudioExpiresAt ? part1Task2AudioExpiresAt <= now : isPart1AudioExpired;
  const isPart2AudioExpired = audioExpiresAt && audioExpiresAt <= now;
  const isAudioExpired = isPart2AudioExpired && isPart1AudioExpired && isPart1Task2AudioExpired;

  const hasPart2 = Boolean(
    session?.passage?.title ||
    (rr?.total_words != null && rr?.total_words > 0) ||
    part2Alignments.length > 0 ||
    rr?.cwpm != null
  );

  return (
    <Layout>
      <div className="sarp-container">
        {/* Sticky Header: Top Navigation + Student Profile Card (Pins to top of screen) */}
        <div className="sarp-sticky-header">
          {/* Top Navigation */}
          <div className="sarp-top-nav">
            <button
              type="button"
              className="sarp-back-btn"
              onClick={() => navigate(backTo, backOptions)}
              title="Return to Class Record"
            >
              <ChevronLeft size={16} /> Back to Class Record
            </button>

            <div className="sarp-actions">
              {student && session && !loading && !error && (
                <button
                  type="button"
                  className="sarp-pdf-btn"
                  onClick={exportToPDF}
                  title="Download Official PDF Report"
                >
                  <Download size={15} /> Download PDF Report
                </button>
              )}
            </div>
          </div>

          {/* Student Profile & Assessment Meta Card */}
          {student && session && !loading && !error && (
            <div className="sarp-student-card">
              <div className="sarp-student-info">
                <h1 className="sarp-student-name">
                  {student.last_name}, {student.first_name}
                  {student.middle_name ? ` ${student.middle_name}` : ""}
                </h1>
                <div className="sarp-badges">
                  <span className="sarp-badge">{fmtGrade(student.grade_level)}</span>
                  {student.section && <span className="sarp-badge">{student.section}</span>}
                  {student.lrn && <span className="sarp-badge">LRN: {student.lrn}</span>}
                  {student.sex && (
                    <span className="sarp-badge sarp-badge--cap">{student.sex}</span>
                  )}
                </div>
                <div className="sarp-meta-chips">
                  <span className="sarp-meta-chip">
                    Date: <strong>{fmtDate(session.created_at)}</strong>
                  </span>
                  <span>·</span>
                  <span className="sarp-meta-chip">
                    Period: <strong>{PERIOD_MAP[session.period] ?? session.period}</strong>
                  </span>
                  <span>·</span>
                  <span className="sarp-meta-chip">
                    Language: <strong style={{ textTransform: "capitalize" }}>{session.language}</strong>
                  </span>
                  <span>·</span>
                  <span className="sarp-meta-chip">
                    School Year: <strong>{session.school_year}</strong>
                  </span>
                </div>
              </div>

              {profile && (
                <div
                  className="sarp-profile-banner"
                  style={{
                    borderColor: profileColor,
                    backgroundColor: `${profileColor}14`,
                    color: profileColor,
                  }}
                >
                  <span className="sarp-profile-dot" style={{ backgroundColor: profileColor }} />
                  {profile}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="sarp-state">
            <div className="sarp-spinner" />
            <p>Loading student assessment record…</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="sarp-state sarp-state--error">
            <p>⚠ {error}</p>
          </div>
        )}

        {/* Empty Assessment State */}
        {!loading && !error && !session && student && (
          <div className="sarp-state">
            <AlertCircle size={44} style={{ color: "#8a94b2", marginBottom: 12 }} />
            <h3 style={{ margin: "0 0 8px", color: "#101828" }}>No Completed Assessment Session</h3>
            <p style={{ maxWidth: 500, margin: "0 0 20px" }}>
              {student.first_name} {student.last_name} has not completed an assessment for this period yet.
            </p>
            <button
              type="button"
              className="sarp-back-btn"
              onClick={() => navigate(backTo, backOptions)}
            >
              <ChevronLeft size={16} /> Return to Class Record
            </button>
          </div>
        )}

        {/* Main Content */}
        {!loading && !error && session && student && (
          <>
            {/* Assessment Part 1 Card */}
            <div className="sarp-card">
              <div className="sarp-card-header">
                <div>
                  <h2 className="sarp-card-title">Assessment Part 1 — Foundational Reading Skills</h2>
                  <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#64748b" }}>
                    Letter sounds recognition and rhyme/sentence decoding.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="sarp-edit-btn"
                    onClick={() => openEditModal("part1_task1")}
                  >
                    <Pencil size={13} /> Edit Task 1
                  </button>
                  <button
                    type="button"
                    className="sarp-edit-btn"
                    onClick={() => openEditModal("part1_task2")}
                  >
                    <Pencil size={13} /> Edit Task 2
                  </button>
                </div>
              </div>

              {/* Part 1 Task 1 Audio Preview */}
              {(rr?.has_part1_audio || (rr?.has_audio && !rr?.has_part2_audio && !rr?.has_part1_task2_audio)) && !isPart1AudioExpired && (
                <div className="sarp-part-audio-bar">
                  <div className="sarp-part-audio-meta">
                    <Headphones size={16} style={{ color: "#2c7fc1" }} />
                    <span className="sarp-part-audio-label">Task 1 Audio</span>
                  </div>
                  <AudioPlayer
                    src={sessionsApi.getAudioUrl(session.id, 1)}
                    id="part1-task1-audio-player"
                  />
                </div>
              )}

              {/* Part 1 Task 2 Audio Preview */}
              {rr?.has_part1_task2_audio && !isPart1Task2AudioExpired && (
                <div className="sarp-part-audio-bar" style={{ marginTop: "10px" }}>
                  <div className="sarp-part-audio-meta">
                    <Headphones size={16} style={{ color: "#9b59b6" }} />
                    <span className="sarp-part-audio-label">
                      Task 2 Audio ({route.includes("2l") ? (student?.grade_level === "grade_1" ? "Rhymes" : "Words") : "Sentences"})
                    </span>
                  </div>
                  <AudioPlayer
                    src={sessionsApi.getAudioUrl(session.id, "task2")}
                    id="part1-task2-audio-player"
                  />
                </div>
              )}

              {/* Part 1 Stat Grid */}
              <div className="sarp-stat-grid">
                <div className="sarp-stat">
                  <span className="sarp-stat__val" style={{ color: "#2c7fc1" }}>
                    {d(rr?.part1_task1_correct)} / 10
                  </span>
                  <span className="sarp-stat__lbl">Task 1 Correct</span>
                </div>
                {task2LScore !== null && (
                  <div className="sarp-stat">
                    <span className="sarp-stat__val" style={{ color: "#9b59b6" }}>
                      {d(task2LScore)} / 10
                    </span>
                    <span className="sarp-stat__lbl">Task 2L (Rhymes)</span>
                  </div>
                )}
                {task2HScore !== null && (
                  <div className="sarp-stat">
                    <span className="sarp-stat__val" style={{ color: "#9b59b6" }}>
                      {d(task2HScore)} / 10
                    </span>
                    <span className="sarp-stat__lbl">Task 2H (Sentences)</span>
                  </div>
                )}
                <div className="sarp-stat">
                  <span className="sarp-stat__val" style={{ color: "#27ae60" }}>
                    {d(rr?.part1_total_score)} / 20
                  </span>
                  <span className="sarp-stat__lbl">Total Score</span>
                </div>
                {rr?.part1_classification && (
                  <div className="sarp-stat sarp-stat--wide">
                    <span className="sarp-stat__val sarp-stat__val--sm">
                      {rr.part1_classification}
                    </span>
                    <span className="sarp-stat__lbl">Part 1 Classification</span>
                  </div>
                )}
              </div>

              {/* Part 1 Alignments Preview */}
              {(task1Alignments.length > 0 || task2Alignments.length > 0) && (
                <div className="sarp-transcriptions">
                  {task1Alignments.length > 0 && (
                    <div>
                      <h3 className="sarp-transcription-section-title">
                        Task 1 — Letter Sounds / Words Read
                      </h3>
                      <WordHighlightView
                        alignments={task1Alignments}
                        hideMissing
                      />
                    </div>
                  )}
                  {task2Alignments.length > 0 && (
                    <div>
                      <h3 className="sarp-transcription-section-title">
                        Task 2 — {route.includes("2l") ? "Rhymes Read" : "Sentences Read"}
                      </h3>
                      <WordHighlightView
                        alignments={task2Alignments}
                        hideMissing
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Assessment Part 2 Card (Passage Reading) */}
            <div className="sarp-card">
              <div className="sarp-card-header">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h2 className="sarp-card-title">Assessment Part 2 — Story Reading & Fluency</h2>
                    {!hasPart2 && (
                      <span
                        className="sarp-badge"
                        style={{
                          background: "#fef3f2",
                          color: "#b42318",
                          border: "1px solid #fecdca",
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "6px",
                        }}
                      >
                        Not Taken
                      </span>
                    )}
                  </div>
                  <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#64748b" }}>
                    Oral reading fluency, words per minute, and comprehension metrics.
                  </p>
                </div>
                {hasPart2 && (
                  <button
                    type="button"
                    className="sarp-edit-btn"
                    onClick={() => openEditModal("part2")}
                  >
                    <Pencil size={13} /> Edit Story Transcription
                  </button>
                )}
              </div>

              {!hasPart2 ? (
                <div
                  style={{
                    padding: "24px 20px",
                    textAlign: "center",
                    background: "#f9fafb",
                    borderRadius: "12px",
                    border: "1.5px dashed #d0d5dd",
                    margin: "14px 0 6px",
                  }}
                >
                  <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#344054", fontSize: "14px" }}>
                    Assessment Part 2 was not administered
                  </p>
                  <p style={{ margin: 0, color: "#667085", fontSize: "13px" }}>
                    {rr?.part1_classification === "Full Refresher"
                      ? "Learner scored in the Full Refresher band on Part 1 and was not required to take Part 2 (Story Reading)."
                      : "No story reading or oral fluency assessment was recorded for this session."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Part 2 Audio Preview */}
                  {(rr?.has_part2_audio || (rr?.has_audio && !rr?.has_part1_audio)) && !isPart2AudioExpired && (
                    <div className="sarp-part-audio-bar">
                      <div className="sarp-part-audio-meta">
                        <Headphones size={16} style={{ color: "#2c7fc1" }} />
                        <span className="sarp-part-audio-label">Story Reading Audio</span>
                      </div>
                      <AudioPlayer
                        src={sessionsApi.getAudioUrl(session.id, 2)}
                        id="part2-audio-player"
                      />
                    </div>
                  )}

                  {session.passage?.title && (
                    <div className="sarp-story-title">
                      <strong>Selected Story:</strong> {session.passage.title}
                    </div>
                  )}

                  {/* Part 2 Stat Grid */}
                  <div className="sarp-stat-grid">
                    <div className="sarp-stat">
                      <span className="sarp-stat__val">{d(rr?.total_words)}</span>
                      <span className="sarp-stat__lbl">Total Words</span>
                    </div>
                    <div className="sarp-stat">
                      <span className="sarp-stat__val" style={{ color: "#c0392b" }}>
                        {d(rr?.miscue_count)}
                      </span>
                      <span className="sarp-stat__lbl">Miscues</span>
                    </div>
                    <div className="sarp-stat">
                      <span className="sarp-stat__val">{d(wordsRead)}</span>
                      <span className="sarp-stat__lbl">Words Read</span>
                    </div>
                    <div className="sarp-stat">
                      <span className="sarp-stat__val" style={{ color: "#2c3e6b" }}>
                        {rr?.cwpm != null ? Math.round(rr.cwpm) : "—"}
                      </span>
                      <span className="sarp-stat__lbl">CWPM / WPM</span>
                    </div>
                    <div className="sarp-stat">
                      <span className="sarp-stat__val">
                        {pctCorrect != null ? `${pctCorrect}%` : "—"}
                      </span>
                      <span className="sarp-stat__lbl">Accuracy %</span>
                    </div>
                    <div className="sarp-stat">
                      <span className="sarp-stat__val">{fmtTime(rr?.reading_time_seconds)}</span>
                      <span className="sarp-stat__lbl">Reading Time</span>
                    </div>
                    {obs && (
                      <div className="sarp-stat">
                        <span className="sarp-stat__val" style={{ color: "#27ae60" }}>
                          {d(obs.comprehension_correct)} / {d(obs.comprehension_total)}
                        </span>
                        <span className="sarp-stat__lbl">Comprehension</span>
                      </div>
                    )}
                  </div>

                  {/* Part 2 Alignments Preview */}
                  {part2Alignments.length > 0 && (
                    <div className="sarp-transcriptions">
                      <div>
                        <h3 className="sarp-transcription-section-title">
                          Story Reading Transcription Preview
                        </h3>
                        <WordHighlightView
                          alignments={part2Alignments}
                          hideMissing
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Observation & Remarks Card */}
            <div className="sarp-card">
              <div className="sarp-card-header">
                <div>
                  <h2 className="sarp-card-title">Observation & Qualitative Feedback</h2>
                  <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#64748b" }}>
                    Teacher observations, learner experience score, and instructional notes.
                  </p>
                </div>
                <button
                  type="button"
                  className="sarp-edit-btn"
                  onClick={() => openEditModal("remarks")}
                >
                  <Pencil size={13} /> Edit Remarks
                </button>
              </div>

              <div className="sarp-stat-grid" style={{ marginBottom: 16 }}>
                <div className="sarp-stat">
                  <span className="sarp-stat__val">
                    {obs?.learner_experience ? `${obs.learner_experience} / 5` : "—"}
                  </span>
                  <span className="sarp-stat__lbl">Learner Experience</span>
                </div>
                <div className="sarp-stat">
                  <span className="sarp-stat__val">
                    {obs?.fluency_level ? `Level ${obs.fluency_level} / 4` : "—"}
                  </span>
                  <span className="sarp-stat__lbl">Observation Level</span>
                </div>
              </div>

              <div className="sarp-remarks-box">
                <div className="sarp-remarks-header">
                  <span className="sarp-remarks-label">Teacher's Observations & Remarks</span>
                </div>
                <p className="sarp-remarks-text">
                  {obs?.teacher_remarks || "No teacher remarks added yet. Click 'Edit Remarks' to add notes."}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Edit Modal */}
        <EditTranscriptionModal
          isOpen={editModal.isOpen}
          title={editModal.title}
          description={editModal.description}
          transcript={editModal.transcript}
          audioUrl={
            editModal.type !== "remarks" && rr?.has_audio && !isAudioExpired
              ? editModal.type === "part1_task1"
                ? sessionsApi.getAudioUrl(session.id, 1)
                : editModal.type === "part1_task2"
                ? sessionsApi.getAudioUrl(session.id, "task2")
                : sessionsApi.getAudioUrl(session.id, 2)
              : null
          }
          saving={recalculating}
          onSave={handleSaveRecalculation}
          onClose={() => setEditModal((prev) => ({ ...prev, isOpen: false }))}
        />

        <Toast toasts={toasts} onRemove={removeToast} />
      </div>
    </Layout>
  );
}

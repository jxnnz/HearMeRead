import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, FileText, FileSpreadsheet, Pencil, Trash2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import Layout from "../../components/Layout";
import EditStudentModal from "../../modals/EditStudentModal";
import EditClassInfoModal from "../../modals/EditClassInfoModal";
import StudentInfoModal from "../../modals/StudentInfoModal";
import { authApi, studentsApi, sessionsApi } from "../../services/api";
import useToast from "../../hooks/Usetoast";
import Toast from "../../modals/Toast";
import { parseApiError } from "../../utils/apiError";
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
  const { toasts, removeToast, showError } = useToast();
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

  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(30);
  const [totalStudents, setTotal]   = useState(0);

  const [selectedSessionId, setSelectedSessionId] = useState(null);

  const [editStudent, setEditStudent]       = useState(null);
  const [editStudentSaving, setEditStudentSaving] = useState(false);
  const [editStudentError, setEditStudentError]   = useState(null);
  const [showEditClass, setShowEditClass]   = useState(false);
  const [archiveSession, setArchiveSession] = useState(null);
  const [archiving, setArchiving]           = useState(false);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const stuParams  = { page, page_size: pageSize, ...(grade ? { grade_level: grade } : {}), ...(section ? { section } : {}) };
      const sessParams = { school_year: year, period, is_completed: true, page_size: pageSize, ...(grade ? { grade_level: grade } : {}), ...(section ? { section } : {}) };
      const [me, stuData, sessData] = await Promise.all([
        authApi.me(),
        studentsApi.list(stuParams),
        sessionsApi.list(sessParams),
      ]);
      setTeacher(me);
      setTotal(stuData.total || 0);
      setStudents(stuData.students || []);
      setSessions(sessData.sessions || []);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(
        typeof detail === "string" ? detail
        : Array.isArray(detail)   ? detail.map((d) => d.msg).join(", ")
        : e.message
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const stuParams  = { page, page_size: pageSize, ...(grade ? { grade_level: grade } : {}), ...(section ? { section } : {}) };
        const sessParams = { school_year: year, period, is_completed: true, page_size: pageSize, ...(grade ? { grade_level: grade } : {}), ...(section ? { section } : {}) };
        const [me, stuData, sessData] = await Promise.all([
          authApi.me(),
          studentsApi.list(stuParams),
          sessionsApi.list(sessParams),
        ]);
        if (cancelled) return;
        setTeacher(me);
        setTotal(stuData.total || 0);
        setStudents(stuData.students || []);
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
  }, [grade, section, year, period, page, pageSize]);

  async function handleSaveStudent(updatedFields) {
    if (!editStudent) return;
    setEditStudentSaving(true);
    setEditStudentError(null);
    try {
      const payload = {};
      if (updatedFields.first_name)  payload.first_name  = updatedFields.first_name;
      if (updatedFields.last_name)   payload.last_name   = updatedFields.last_name;
      if (updatedFields.lrn)         payload.lrn         = updatedFields.lrn;
      if (updatedFields.sex)         payload.sex         = updatedFields.sex;
      if (updatedFields.grade_level) payload.grade_level = updatedFields.grade_level;
      payload.section = updatedFields.section ?? null;
      await studentsApi.update(editStudent.id, payload);
      setEditStudent(null);
      reload();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setEditStudentError(
        typeof detail === "string" ? detail
        : Array.isArray(detail)   ? detail.map((d) => d.msg).join(", ")
        : err.message
      );
    } finally {
      setEditStudentSaving(false);
    }
  }

  async function handleArchiveSession() {
    if (!archiveSession) return;
    setArchiving(true);
    try {
      await sessionsApi.archive(archiveSession.id);
      setArchiveSession(null);
      reload();
    } catch (err) {
      showError(parseApiError(err, "Failed to archive session. Please try again."));
    } finally {
      setArchiving(false);
    }
  }

  const sessionByStudent = {};
  for (const sess of sessions) {
    if (sess.language === language) {
      if (!sessionByStudent[sess.student_id]) {
        sessionByStudent[sess.student_id] = sess;
      }
    }
  }

  const periodLabel = PERIOD_LABELS[period] ?? period;
  const teacherName = teacher ? `${teacher.first_name} ${teacher.last_name}` : "";
  const fileName    = `ClassRecord_${formatGrade(grade).replace(" ", "")}${section ? `_${section}` : ""}_${year}_${period}`;

  const EXPORT_HEADERS = [
    "#", "LRN", "Student Name", "Sex", "Date",
    "Task 1", "Task 2L Words", "Task 2H Sent.", "Total Score", "Part 1 Level",
    "Story Title", "Total Words", "Miscues", "Words Read", "Total Time", "WPM", "% Correct", "Correct Ans.",
    "Learner Exp.", "Obs. Level", "Reading Profile", "Remarks",
  ];

  function buildExportRows() {
    return students.map((s, idx) => {
      const sess       = sessionByStudent[s.id];
      const rr         = sess?.reading_result;
      const obs        = sess?.observation;
      const profile    = rr?.reading_profile ?? s.reading_profile;
      const totalWords = rr?.total_words   ?? null;
      const miscues    = rr?.miscue_count  ?? null;
      const wordsRead  = totalWords !== null && miscues !== null ? totalWords - miscues : null;
      const pctCorrect = totalWords && totalWords > 0 && miscues !== null
        ? `${Math.round(((totalWords - miscues) / totalWords) * 100)}%` : "—";
      const route    = (rr?.part1_route ?? "").toLowerCase();
      const task2L   = route.includes("2l") ? (rr?.part1_task2_correct ?? "—") : "—";
      const task2H   = route.includes("2h") ? (rr?.part1_task2_correct ?? "—") : "—";

      return [
        idx + 1,
        s.lrn ?? "—",
        `${s.last_name}, ${s.first_name}`,
        s.sex ? s.sex.charAt(0).toUpperCase() + s.sex.slice(1) : "—",
        sess ? formatDate(sess.created_at) : "—",
        rr?.part1_task1_correct ?? "—",
        task2L, task2H,
        rr?.part1_total_score ?? "—",
        rr?.part1_classification ?? "—",
        sess?.passage?.title ?? "—",
        totalWords ?? "—",
        miscues ?? "—",
        wordsRead ?? "—",
        formatTime(rr?.reading_time_seconds),
        rr?.cwpm ?? "—",
        pctCorrect,
        obs ? `${obs.comprehension_correct ?? "—"}/${obs.comprehension_total ?? "—"}` : "—",
        obs?.learner_experience ?? "—",
        obs?.fluency_level ?? "—",
        profile ?? "—",
        obs?.teacher_remarks ?? "—",
      ];
    });
  }

  function exportToPDF() {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`${formatGrade(grade)}${section ? ` — ${section}` : ""}`, 14, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`${year}  ·  ${periodLabel}  ·  ${language === "filipino" ? "Filipino" : "English"}  ·  ${teacherName}`, 14, 21);

    autoTable(doc, {
      head: [EXPORT_HEADERS],
      body: buildExportRows(),
      startY: 27,
      styles: { fontSize: 6.5, cellPadding: 2, font: "helvetica" },
      headStyles: { fillColor: [44, 62, 107], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 249, 253] },
      columnStyles: { 2: { cellWidth: 28 }, 10: { cellWidth: 28 }, 21: { cellWidth: 28 } },
    });

    doc.save(`${fileName}.pdf`);
  }

  function exportToExcel() {
    const meta = [
      [`Class: ${formatGrade(grade)}${section ? ` — ${section}` : ""}`],
      [`School Year: ${year}`, `Period: ${periodLabel}`, `Language: ${language === "filipino" ? "Filipino" : "English"}`, `Teacher: ${teacherName}`],
      [],
    ];
    const ws = XLSX.utils.aoa_to_sheet([...meta, EXPORT_HEADERS, ...buildExportRows()]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Class Record");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  }

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

            <div className="cr-topbar__divider" />

            <button className="cr-export-btn cr-export-btn--pdf" onClick={exportToPDF} title="Export as PDF">
              <FileText size={14} />
              PDF
            </button>
            <button className="cr-export-btn cr-export-btn--excel" onClick={exportToExcel} title="Export as Excel">
              <FileSpreadsheet size={14} />
              Excel
            </button>
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
              <div className="cr-info-bar__items">
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
              <button
                className="cr-info-edit-btn"
                onClick={() => setShowEditClass(true)}
                title="Edit class info"
              >
                <Pencil size={13} />
                Edit Class Info
              </button>
            </div>

            {/* Archive confirmation banner */}
            {archiveSession && (
              <div className="cr-archive-confirm">
                <span>Archive the session record for this student? The student will remain but their scores for this period will be removed.</span>
                <div className="cr-archive-confirm__actions">
                  <button className="cr-archive-confirm__btn cr-archive-confirm__btn--cancel" onClick={() => setArchiveSession(null)} disabled={archiving}>
                    Cancel
                  </button>
                  <button className="cr-archive-confirm__btn cr-archive-confirm__btn--confirm" onClick={handleArchiveSession} disabled={archiving}>
                    {archiving ? "Archiving…" : "Confirm Archive"}
                  </button>
                </div>
              </div>
            )}

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
                    <th rowSpan={2} className="cr-th cr-th--actions"></th>
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
                      <td colSpan={23} className="cr-empty-row">No students in this class.</td>
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

                      const route       = (rr?.part1_route ?? "").toLowerCase();
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
                              onClick={() => {
                                if (sess) {
                                  setSelectedSessionId(sess.id);
                                } else {
                                  navigate(`/students/${s.id}`, {
                                    state: { from: `/students/class?grade=${grade}&section=${encodeURIComponent(section)}&year=${encodeURIComponent(year)}&period=${period}` }
                                  });
                                }
                              }}
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
                          <td className="cr-td cr-td--actions">
                            <button
                              className="cr-action-btn cr-action-btn--edit"
                              onClick={() => setEditStudent(s)}
                              title="Edit student"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              className="cr-action-btn cr-action-btn--archive"
                              onClick={() => setArchiveSession(sess ?? null)}
                              disabled={!sess}
                              title={sess ? "Archive session" : "No session to archive"}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Pagination Controls ── */}
        {!loading && !error && students.length > 0 && (
          <div className="cr-pagination">
            <span className="cr-pagination__info">
              Showing {Math.min((page - 1) * pageSize + 1, totalStudents)}–{Math.min(page * pageSize, totalStudents)} of {totalStudents} students
            </span>
            <div className="cr-pagination__right">
              <select
                className="cr-pagination__size"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                <option value={30}>30 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
              <div className="cr-pagination__nav">
                <button
                  className="cr-pagination__btn"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  title="Previous page"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="cr-pagination__pages">
                  Page {page} of {Math.max(1, Math.ceil(totalStudents / pageSize))}
                </span>
                <button
                  className="cr-pagination__btn"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * pageSize >= totalStudents}
                  title="Next page"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Session Detail Modal ── */}
      <StudentInfoModal
        sessionId={selectedSessionId}
        onClose={() => setSelectedSessionId(null)}
      />

      {/* ── Edit Student Modal ── */}
      <EditStudentModal
        isOpen={editStudent !== null}
        student={editStudent}
        onClose={() => { setEditStudent(null); setEditStudentError(null); }}
        onSave={handleSaveStudent}
        saving={editStudentSaving}
        error={editStudentError}
      />

      {/* ── Edit Class Info Modal ── */}
      <EditClassInfoModal
        isOpen={showEditClass}
        onClose={() => setShowEditClass(false)}
        onSuccess={reload}
        students={students}
        currentGrade={grade}
        currentSection={section}
      />

      <Toast toasts={toasts} onRemove={removeToast} />
    </Layout>
  );
}

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, FileText, FileSpreadsheet, Pencil, UserX } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";

import Layout from "../../components/Layout";
import EditStudentModal from "../../modals/EditStudentModal";
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

function storyLabel(t) {
  if (!t) return "—";
  const m = t.match(/^Story\s*(\d+)\s*:/i);
  return m ? `Story ${m[1]}` : t;
}

export default function ClassRecordPage() {
  const { toasts, removeToast, showSaveSuccess, showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { grade = "", section = "", year = "", period = "beginning" } = location.state ?? {};

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
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const [editStudent, setEditStudent]       = useState(null);
  const [editStudentSaving, setEditStudentSaving] = useState(false);
  const [editStudentError, setEditStudentError]   = useState(null);
  const [deleteStudent, setDeleteStudent]   = useState(null); // student object pending hard delete
  const [deletingStudent, setDeletingStudent] = useState(false);
  const [deleteStudentError, setDeleteStudentError] = useState(null);
  const [exportingExcel, setExportingExcel]         = useState(false);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const stuParams  = { page, page_size: pageSize, ...(grade ? { grade_level: grade } : {}), ...(section ? { section } : {}), ...(year ? { school_year: year } : {}) };
      const sessParams = { school_year: year, period, is_completed: true, page_size: 1000, ...(grade ? { grade_level: grade } : {}), ...(section ? { section } : {}) };
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
        const stuParams  = { page, page_size: pageSize, ...(grade ? { grade_level: grade } : {}), ...(section ? { section } : {}), ...(year ? { school_year: year } : {}) };
        const sessParams = { school_year: year, period, is_completed: true, page_size: 1000, ...(grade ? { grade_level: grade } : {}), ...(section ? { section } : {}) };
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

  async function handleDeleteStudent() {
    if (!deleteStudent) return;
    setDeletingStudent(true);
    setDeleteStudentError(null);
    try {
      await studentsApi.delete(deleteStudent.id);
      setDeleteStudent(null);
      reload();
    } catch (err) {
      setDeleteStudentError(parseApiError(err, "Failed to delete student. Please try again."));
    } finally {
      setDeletingStudent(false);
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
    "Story #", "Total Words", "Miscues", "Words Read", "Total Time", "WPM", "% Correct", "Correct Ans.",
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
        `${s.last_name}, ${s.first_name}${s.middle_name ? `, ${s.middle_name.charAt(0).toUpperCase()}.` : ""}`,
        s.sex ? s.sex.charAt(0).toUpperCase() + s.sex.slice(1) : "—",
        sess ? formatDate(sess.created_at) : "—",
        rr?.part1_task1_correct ?? "—",
        task2L, task2H,
        rr?.part1_total_score ?? "—",
        rr?.part1_classification ?? "—",
        sess?.passage?.title ? storyLabel(sess.passage.title) : "—",
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

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(26, 35, 64);
    doc.text(`${formatGrade(grade)}${section ? ` — ${section}` : ""}`, 8, 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 110);
    doc.text(
      `${year}  ·  ${periodLabel}  ·  ${language === "filipino" ? "Filipino" : "English"}  ·  ${teacherName}`,
      8, 20,
    );

    // Two-row grouped header
    const dark    = [44, 62, 107];
    const grp1bg  = [200, 222, 250];
    const grp1txt = [30,  60, 130];
    const grp2bg  = [190, 240, 215];
    const grp2txt = [20,  100, 60 ];
    const sub1bg  = [220, 235, 255];
    const sub2bg  = [215, 248, 232];

    const identityStyle = { fillColor: dark, textColor: 255, fontStyle: "bold", valign: "middle", halign: "center" };
    const obsStyle      = { fillColor: dark, textColor: 255, fontStyle: "bold", valign: "middle", halign: "center" };

    const groupRow = [
      { content: "#",             rowSpan: 2, styles: identityStyle },
      { content: "LRN",           rowSpan: 2, styles: { ...identityStyle, halign: "left" } },
      { content: "Student Name",  rowSpan: 2, styles: { ...identityStyle, halign: "left" } },
      { content: "Sex",           rowSpan: 2, styles: identityStyle },
      { content: "Date",          rowSpan: 2, styles: identityStyle },
      { content: "Assessment Part 1", colSpan: 5, styles: { fillColor: grp1bg, textColor: grp1txt, fontStyle: "bold", halign: "center" } },
      { content: "Assessment Part 2", colSpan: 8, styles: { fillColor: grp2bg, textColor: grp2txt, fontStyle: "bold", halign: "center" } },
      { content: "Learner Exp.",  rowSpan: 2, styles: obsStyle },
      { content: "Obs. Level",    rowSpan: 2, styles: obsStyle },
      { content: "Reading Profile", rowSpan: 2, styles: obsStyle },
      { content: "Remarks",       rowSpan: 2, styles: obsStyle },
    ];

    const mk1 = (t) => ({ content: t, styles: { fillColor: sub1bg, textColor: grp1txt, fontStyle: "bold", halign: "center", fontSize: 6 } });
    const mk2 = (t) => ({ content: t, styles: { fillColor: sub2bg, textColor: grp2txt, fontStyle: "bold", halign: "center", fontSize: 6 } });

    const subRow = [
      mk1("Task 1"), mk1("Task 2L"), mk1("Task 2H"), mk1("Total"), mk1("Part 1 Lvl"),
      mk2("Story #"), mk2("Tot. Wds"), mk2("Miscues"), mk2("Wds Read"), mk2("Time"), mk2("WPM"), mk2("% Corr."), mk2("Correct"),
    ];

    autoTable(doc, {
      head: [groupRow, subRow],
      body: buildExportRows(),
      startY: 25,
      margin: { left: 8, right: 8 },
      styles: { fontSize: 6, cellPadding: 1.5, font: "helvetica", textColor: [26, 35, 64] },
      alternateRowStyles: { fillColor: [248, 249, 253] },
      columnStyles: {
        0:  { cellWidth: 5,  halign: "center" },
        1:  { cellWidth: 18 },
        2:  { cellWidth: 25 },
        3:  { cellWidth: 7,  halign: "center" },
        4:  { cellWidth: 13 },
        5:  { cellWidth: 8,  halign: "center" },
        6:  { cellWidth: 11, halign: "center" },
        7:  { cellWidth: 11, halign: "center" },
        8:  { cellWidth: 10, halign: "center" },
        9:  { cellWidth: 16 },
        10: { cellWidth: 9,  halign: "center" },
        11: { cellWidth: 11, halign: "center" },
        12: { cellWidth: 10, halign: "center" },
        13: { cellWidth: 11, halign: "center" },
        14: { cellWidth: 11, halign: "center" },
        15: { cellWidth: 9,  halign: "center" },
        16: { cellWidth: 10, halign: "center" },
        17: { cellWidth: 11, halign: "center" },
        18: { cellWidth: 12, halign: "center" },
        19: { cellWidth: 10, halign: "center" },
        20: { cellWidth: 18 },
        21: { cellWidth: 15 },
      },
    });

    doc.save(`${fileName}.pdf`);
  }

  async function exportToExcel() {
    setExportingExcel(true);
    try {
      await studentsApi.exportCRLAExcel({
        grade_level: grade,
        section,
        school_year: year,
        period,
      });
      showSaveSuccess("XLSX");
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      showError(
        typeof detail === "string" ? detail
        : Array.isArray(detail)   ? detail.map((d) => d.msg).join(", ")
        : "Failed to export XLSX assessment record."
      );
    } finally {
      setExportingExcel(false);
    }
  }

  return (
    <Layout>
      <div className="cr-page">

        {/* Top bar */}
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
            <button
              className="cr-export-btn cr-export-btn--excel"
              onClick={exportToExcel}
              title="Export as XLSX"
              disabled={exportingExcel}
            >
              <FileSpreadsheet size={14} />
              {exportingExcel ? "Exporting..." : "XLSX"}
            </button>
          </div>
        </div>

        {/* States */}
        {loading && (
          <div className="cr-state">
            <div className="cr-spinner" />
            <p>Loading class data…</p>
          </div>
        )}

        {error && !loading && (
          <div className="cr-state cr-state--error"><p>⚠ {error}</p></div>
        )}

        {/* Class record card */}
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
            </div>



            {/* Delete student confirmation banner */}
            {deleteStudent && (
              <div className="cr-delete-confirm">
                <span>
                  Permanently delete <strong>{deleteStudent.first_name} {deleteStudent.last_name}</strong>?
                  This removes the student and all of their assessment history across every school year.
                  This cannot be undone.
                  {deleteStudentError && (
                    <>
                      <br />
                      <span className="cr-delete-confirm__error">{deleteStudentError}</span>
                    </>
                  )}
                </span>
                <div className="cr-archive-confirm__actions">
                  <button className="cr-archive-confirm__btn cr-archive-confirm__btn--cancel" onClick={() => { setDeleteStudent(null); setDeleteStudentError(null); }} disabled={deletingStudent}>
                    Cancel
                  </button>
                  <button className="cr-archive-confirm__btn cr-archive-confirm__btn--confirm" onClick={handleDeleteStudent} disabled={deletingStudent}>
                    {deletingStudent ? "Deleting…" : "Delete Permanently"}
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
                    <th className="cr-th cr-th--sub cr-th--group2">Story #</th>
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
                                setSelectedStudentId(s.id);
                                setSelectedSessionId(sess ? sess.id : null);
                              }}
                            >
                              {s.last_name}, {s.first_name}{s.middle_name ? `, ${s.middle_name.charAt(0).toUpperCase()}.` : ""}
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
                          <td className="cr-td cr-td--g2">{sess?.passage?.title ? storyLabel(sess.passage.title) : "—"}</td>
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
                              className="cr-action-btn cr-action-btn--delete"
                              onClick={() => { setDeleteStudent(s); setDeleteStudentError(null); }}
                              title="Delete student permanently"
                            >
                              <UserX size={13} />
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

        {/* Pagination Controls */}
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

      {/* Session Detail Modal */}
      <StudentInfoModal
        sessionId={selectedSessionId}
        studentId={selectedStudentId}
        onClose={() => {
          setSelectedSessionId(null);
          setSelectedStudentId(null);
        }}
      />

      {/* Edit Student Modal */}
      <EditStudentModal
        isOpen={editStudent !== null}
        student={editStudent}
        onClose={() => { setEditStudent(null); setEditStudentError(null); }}
        onSave={handleSaveStudent}
        saving={editStudentSaving}
        error={editStudentError}
      />

      <Toast toasts={toasts} onRemove={removeToast} />
    </Layout>
  );
}
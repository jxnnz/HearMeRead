import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap, ChevronLeft, Users,
  Search, FileText, UserCheck, Download,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Layout from "../components/Layout";
import { adminApi, studentsApi } from "../services/api";
import Toast from "../modals/Toast";
import useToast from "../hooks/Usetoast";
import { useWindowWidth } from "../hooks/useWindowWidth";
import "../pages/pages css/ClassRecordPage.css";

// Helpers
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

function storyLabel(t) {
  if (!t) return "—";
  const m = t.match(/^Story\s*(\d+)\s*:/i);
  return m ? `Story ${m[1]}` : t;
}

const PROFILE_COLORS = {
  "Reading at Grade Level": "#639922",
  "Transitioning Reader":   "#378ADD",
  "Developing Reader":      "#EF9F27",
  "High Emerging Reader":   "#D4537E",
  "Low Emerging Reader":    "#E24B4A",
};

const GRADE_BG = {
  grade_1: "#e3f2fd", grade_2: "#fce4ec", grade_3: "#fff3e0",
  kindergarten: "#f3e5f5",
};
const GRADE_TEXT = {
  grade_1: "#1565c0", grade_2: "#880e4f", grade_3: "#e65100",
  kindergarten: "#6a1b9a",
};

const PERIOD_LABELS = { beginning: "Beginning", middle: "Middle", end: "End" };

// Reassign Modal
function ReassignModal({ card, onClose, onSuccess }) {
  const [teachers, setTeachers] = useState([]);
  const [toTeacherId, setToTeacherId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminApi.getTeachers()
      .then(data => {
        const others = (data.teachers || data || []).filter(
          t => t.id !== card.teacher_id
        );
        setTeachers(others);
        if (others.length > 0) setToTeacherId(String(others[0].id));
      })
      .catch(() => setError("Failed to load teachers."));
  }, [card.teacher_id]);

  async function handleReassign() {
    if (!toTeacherId) return;
    setLoading(true);
    setError(null);
    try {
      await adminApi.reassignStudents({
        from_teacher_id: card.teacher_id,
        grade_level: card.grade_level,
        section: card.section,
        to_teacher_id: parseInt(toTeacherId, 10),
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to reassign students.");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 2000, fontFamily: "Poppins, sans-serif",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 14, width: "100%", maxWidth: 420,
          padding: "28px 28px 24px", boxShadow: "0 8px 32px rgba(0,0,0,.18)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "#1a2340" }}>
          Reassign Students
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#6b7280" }}>
          Move all students in{" "}
          <strong>{formatGrade(card.grade_level)} — {card.section}</strong>{" "}
          ({card.school_year}) to another teacher.
        </p>

        {error && (
          <div style={{ background: "#fdf0f0", color: "#e74c3c", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <label style={{ fontSize: 12, fontWeight: 600, color: "#8a94b2", textTransform: "uppercase", letterSpacing: ".4px" }}>
          New Adviser
        </label>
        <select
          value={toTeacherId}
          onChange={e => setToTeacherId(e.target.value)}
          style={{
            width: "100%", marginTop: 6, marginBottom: 24,
            padding: "10px 12px", border: "1.5px solid #1a2340",
            borderRadius: 8, fontSize: 14, fontFamily: "Poppins, sans-serif",
            color: "#1a2340", background: "#fff",
          }}
        >
          {teachers.map(t => (
            <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
          ))}
        </select>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: "9px 20px", borderRadius: 8, border: "1.5px solid #dde1ee",
              background: "#fff", color: "#4a5568", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "Poppins, sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleReassign}
            disabled={loading || !toTeacherId}
            style={{
              padding: "9px 20px", borderRadius: 8, border: "none",
              background: "#1a2340", color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: loading || !toTeacherId ? "not-allowed" : "pointer",
              opacity: loading || !toTeacherId ? 0.7 : 1,
              fontFamily: "Poppins, sans-serif",
            }}
          >
            {loading ? "Reassigning…" : "Reassign"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Class Record sub-view (mirrors teacher-side ClassRecordPage UI and export capabilities)
function ClassRecordView({ card, onBack }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [schoolYear, setSchoolYear] = useState(card.school_year || currentSchoolYear());
  const [period, setPeriod] = useState("beginning");
  const [language, setLanguage] = useState("filipino");
  const [exportingExcel, setExportingExcel] = useState(false);

  const { toasts, removeToast, showSaveSuccess, showError } = useToast();

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
      if (card.grade_level) params.grade_level = card.grade_level;
      if (card.section) params.section = card.section;
      const data = await adminApi.getClassRecord(card.teacher_id, params);
      setRecord(data);
    } catch {
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }, [card.teacher_id, card.grade_level, card.section, schoolYear, period, language]);

  useEffect(() => { load(); }, [load]);

  const students = record?.students ?? [];
  const periodLabel = PERIOD_LABELS[period] ?? period;
  const grade = card.grade_level;
  const section = card.section;
  const year = schoolYear;
  const teacherName = card.teacher_name;
  const fileName = `ClassRecord_${formatGrade(grade).replace(/\s+/g, "")}${section ? `_${section}` : ""}_${year}_${period}`;

  function buildExportRows() {
    return students.map((s, idx) => {
      const rr = s.reading_result || null;
      const obs = s.observation || null;
      const profile = rr?.reading_profile ?? s.reading_profile ?? null;
      const totalWords = rr?.total_words ?? null;
      const miscues = rr?.miscue_count ?? null;
      const wordsRead = totalWords !== null && miscues !== null ? totalWords - miscues : null;
      const pctCorrect = totalWords && totalWords > 0 && miscues !== null
        ? `${Math.round(((totalWords - miscues) / totalWords) * 100)}%` : "—";
      const route = (rr?.part1_route ?? "").toLowerCase();
      const task2L = route.includes("2l") ? (rr?.part1_task2_correct ?? "—") : "—";
      const task2H = route.includes("2h") ? (rr?.part1_task2_correct ?? "—") : "—";

      return [
        idx + 1,
        s.lrn ?? "—",
        `${s.last_name}, {s.first_name}`,
        s.sex ? s.sex.charAt(0).toUpperCase() + s.sex.slice(1) : "—",
        s.session_date ? formatDate(s.session_date) : "—",
        rr?.part1_task1_correct ?? "—",
        task2L, task2H,
        rr?.part1_total_score ?? "—",
        rr?.part1_classification ?? "—",
        s.passage_title ? storyLabel(s.passage_title) : "—",
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
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 8;

    const navy = [30, 45, 82];
    const navyMuted = [200, 210, 235];
    const ink = [26, 35, 64];
    const inkMuted = [105, 112, 135];
    const border = [222, 226, 236];
    const grp1bg = [222, 234, 251];
    const grp1txt = [30, 60, 130];
    const grp2bg = [212, 242, 224];
    const grp2txt = [17, 94, 60];
    const sub1bg = [237, 243, 253];
    const sub2bg = [231, 249, 238];

    const generatedOn = new Date().toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });

    doc.setFillColor(...navy);
    doc.rect(0, 0, pageWidth, 11, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("Classroom Reading Level Assessment (CRLA) — Class Record", marginX, 7.2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...navyMuted);
    doc.text("Generated report", pageWidth - marginX, 7.2, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...ink);
    doc.text(`${formatGrade(grade)}${section ? ` — ${section}` : ""}`, marginX, 21);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...inkMuted);
    doc.text(
      `School Year ${year}   ·   ${periodLabel} Assessment   ·   ${language === "filipino" ? "Filipino" : "English"}   ·   Class Adviser: ${teacherName}`,
      marginX, 27,
    );

    doc.setDrawColor(...border);
    doc.setLineWidth(0.3);
    doc.line(marginX, 30.5, pageWidth - marginX, 30.5);

    const identityStyle = { fillColor: navy, textColor: 255, fontStyle: "bold", valign: "middle", halign: "center" };

    const groupRow = [
      { content: "#", rowSpan: 2, styles: identityStyle },
      { content: "LRN", rowSpan: 2, styles: { ...identityStyle, halign: "left" } },
      { content: "Student Name", rowSpan: 2, styles: { ...identityStyle, halign: "left" } },
      { content: "Sex", rowSpan: 2, styles: identityStyle },
      { content: "Date", rowSpan: 2, styles: identityStyle },
      { content: "Assessment Part 1", colSpan: 5, styles: { fillColor: grp1bg, textColor: grp1txt, fontStyle: "bold", halign: "center" } },
      { content: "Assessment Part 2", colSpan: 8, styles: { fillColor: grp2bg, textColor: grp2txt, fontStyle: "bold", halign: "center" } },
      { content: "Learner Exp.", rowSpan: 2, styles: identityStyle },
      { content: "Obs. Level", rowSpan: 2, styles: identityStyle },
      { content: "Reading Profile", rowSpan: 2, styles: identityStyle },
      { content: "Remarks", rowSpan: 2, styles: identityStyle },
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
      startY: 34,
      margin: { left: marginX, right: marginX, top: 13, bottom: 15 },
      styles: {
        fontSize: 6.3,
        cellPadding: { top: 1.8, right: 1.4, bottom: 1.8, left: 1.4 },
        font: "helvetica",
        textColor: ink,
        lineColor: border,
        lineWidth: 0.15,
        valign: "middle",
        minCellHeight: 6,
      },
      alternateRowStyles: { fillColor: [249, 250, 253] },
      columnStyles: {
        0:  { cellWidth: 6,  halign: "center" },
        1:  { cellWidth: 18 },
        2:  { cellWidth: 26 },
        3:  { cellWidth: 8,  halign: "center" },
        4:  { cellWidth: 13, halign: "center" },
        5:  { cellWidth: 8,  halign: "center" },
        6:  { cellWidth: 11, halign: "center" },
        7:  { cellWidth: 11, halign: "center" },
        8:  { cellWidth: 10, halign: "center" },
        9:  { cellWidth: 18 },
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
        20: { cellWidth: 20, fontStyle: "bold" },
        21: { cellWidth: 15 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 9) {
          const raw = Array.isArray(data.cell.text) ? data.cell.text.join(" ") : data.cell.text;
          if (raw && raw.length > 16) {
            data.cell.text = [`${raw.slice(0, 15)}…`];
          }
        }
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          doc.setFillColor(...navy);
          doc.rect(0, 0, pageWidth, 9, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          doc.text(
            `${formatGrade(grade)}${section ? ` — ${section}` : ""}  ·  ${periodLabel} ${year} (cont.)`,
            marginX, 6,
          );
        }
        doc.setDrawColor(...border);
        doc.setLineWidth(0.2);
        doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(160, 165, 182);
        doc.text(`Generated by HearMeRead  ·  ${generatedOn}`, marginX, pageHeight - 7.5);
        doc.text(`Page ${data.pageNumber}`, pageWidth - marginX, pageHeight - 7.5, { align: "right" });
      },
    });

    const finalY = doc.lastAutoTable?.finalY ?? 40;
    const sigWidth = 65;
    let sigY = finalY + 14;
    if (sigY > pageHeight - 22) {
      doc.addPage();
      sigY = 20;
    }

    doc.setDrawColor(150, 155, 175);
    doc.setLineWidth(0.25);
    doc.line(marginX, sigY, marginX + sigWidth, sigY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...ink);
    doc.text(teacherName || " ", marginX, sigY - 1.5);
    doc.setFontSize(6.8);
    doc.setTextColor(...inkMuted);
    doc.text("Prepared by — Class Adviser", marginX, sigY + 4);

    const sig2X = pageWidth - marginX - sigWidth;
    doc.line(sig2X, sigY, sig2X + sigWidth, sigY);
    doc.setFontSize(6.8);
    doc.text("Noted by — School Head", sig2X, sigY + 4);

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
        teacher_id: card.teacher_id,
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
    <div className="cr-page">
      {/* Top bar — mirrors teacher side */}
      <div className="cr-topbar">
        <div className="cr-topbar__left">
          <button className="cr-back-btn" onClick={onBack} aria-label="Back">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="cr-title">
              {formatGrade(card.grade_level)}{card.section ? ` — ${card.section}` : ""}
            </h1>
            <p className="cr-subtitle">
              Adviser: {card.teacher_name} &nbsp;·&nbsp; {schoolYear} &nbsp;·&nbsp; {periodLabel}
            </p>
          </div>
        </div>

        <div className="cr-topbar__right">
          <label className="cr-lang-label">S.Y.:</label>
          <select className="cr-lang-select" value={schoolYear} onChange={e => setSchoolYear(e.target.value)}>
            {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <label className="cr-lang-label">Period:</label>
          <select className="cr-lang-select" value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="beginning">Beginning</option>
            <option value="middle">Middle</option>
            <option value="end">End</option>
          </select>

          <label className="cr-lang-label">Language:</label>
          <select className="cr-lang-select" value={language} onChange={e => setLanguage(e.target.value)}>
            <option value="filipino">Filipino</option>
            <option value="english">English</option>
          </select>

          <div className="cr-topbar__divider" />

          <button className="cr-export-btn cr-export-btn--pdf" onClick={exportToPDF} title="Export as PDF">
            <Download size={14} />
            PDF
          </button>
          <button
            className="cr-export-btn cr-export-btn--excel"
            onClick={exportToExcel}
            title="Export as XLSX"
            disabled={exportingExcel}
          >
            <Download size={14} />
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

      {/* Class record card */}
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

          {/* Assessment table */}
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
                      <td className="cr-td cr-td--g2">{s.passage_title ? storyLabel(s.passage_title) : "—"}</td>
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

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

// Main page
export default function AdminStudentsPage() {
  const [cards,    setCards]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [selected, setSelected] = useState(null);
  const [reassignCard, setReassignCard] = useState(null);

  // Search and grade filter
  const [search, setSearch]         = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");

  const loadCards = useCallback(() => {
    setLoading(true);
    adminApi.getClassCards()
      .then(setCards)
      .catch(() => setError("Failed to load class data. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadCards(); }, [loadCards]);

  // Unique grade levels for filter pills
  const gradeOptions = useMemo(() => {
    const grades = [...new Set(cards.map(c => c.grade_level))].sort();
    return grades;
  }, [cards]);

  // Filtered list (search + grade filter)
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

  // Group filtered cards by school_year (sorted latest first)
  const grouped = useMemo(() => {
    const map = {};
    for (const card of filtered) {
      const year = card.school_year || "Unknown";
      if (!map[year]) map[year] = [];
      map[year].push(card);
    }
    return map;
  }, [filtered]);

  const sortedYears = useMemo(
    () => Object.keys(grouped).sort((a, b) => b.localeCompare(a)),
    [grouped]
  );

  const isMobile = useWindowWidth() <= 768;

  const inputStyle = {
    padding: "8px 12px 8px 34px", border: "1.5px solid #dde1ee", borderRadius: 8,
    fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none",
    background: "#fff", color: "#1a2340",
    width: "100%", boxSizing: "border-box",
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
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: "#1a2340", margin: isMobile ? "0 0 16px" : "0 0 24px", fontFamily: "Poppins, sans-serif" }}>
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
                <div style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  alignItems: isMobile ? "stretch" : "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}>
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
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))", gap: 16, marginTop: 4 }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="sk-card" style={{ width: "100%", height: 140, borderRadius: 14 }} />
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
                  {search || gradeFilter !== "all"
                    ? "No classes match your filter."
                    : "No class cards yet. Assign grade levels and sections to teachers first."}
                </p>
              </div>
            )}

            {/* Cards grouped by school year */}
            {!loading && !error && filtered.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                {sortedYears.map(year => (
                  <div key={year}>
                    {/* Year header */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
                    }}>
                      <span style={{
                        fontSize: 12, fontWeight: 700, color: "#8a94b2",
                        textTransform: "uppercase", letterSpacing: ".7px",
                      }}>
                        S.Y. {year}
                      </span>
                      <div style={{ flex: 1, height: 1, background: "#e8ecf4" }} />
                    </div>

                    {/* Card grid — max 4 cards per row */}
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))", gap: 16 }}>
                      {grouped[year].map(card => {
                        const bg   = GRADE_BG[card.grade_level]   ?? "#f0f6ff";
                        const text = GRADE_TEXT[card.grade_level]  ?? "#2c7fc1";
                        const cardKey = `${card.teacher_id}-${card.grade_level}-${card.section}-${year}`;
                        const isActiveAdvisory = card.school_year === currentSchoolYear();
                        return (
                          <div
                            key={cardKey}
                            style={{
                              background: "#fff", border: "1.5px solid #e8ecf4",
                              borderRadius: 14, boxShadow: "0 2px 12px rgba(44,62,107,.06)",
                              padding: isMobile ? "16px" : "20px 24px",
                              width: "100%",
                              fontFamily: "Poppins, sans-serif",
                              display: "flex", flexDirection: "column", gap: 0,
                              boxSizing: "border-box",
                            }}
                          >
                            {/* Grade badge */}
                            <div style={{ marginBottom: 10 }}>
                              <span style={{
                                display: "inline-block", background: bg, color: text,
                                borderRadius: 8, padding: "3px 12px",
                                fontSize: 12, fontWeight: 700,
                              }}>
                                {formatGrade(card.grade_level)}
                              </span>
                            </div>

                            {/* Clickable area */}
                            <button
                              onClick={() => setSelected(card)}
                              style={{
                                all: "unset", cursor: "pointer", display: "block",
                              }}
                            >
                              <div style={{ fontSize: 15, fontWeight: 700, color: "#1a2340", marginBottom: 4 }}>
                                {formatGrade(card.grade_level)} — {card.section ?? "No Section"}
                              </div>
                              <div style={{
                                fontSize: 12, color: "#4a5568", fontWeight: 500,
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                marginBottom: 2,
                              }}>
                                Adviser: {card.teacher_name}
                              </div>
                              <div style={{ fontSize: 11, color: "#8a94b2", marginBottom: 8 }}>
                                S.Y. {card.school_year}
                              </div>
                              <div style={{
                                fontSize: 11, color: "#8a94b2",
                                display: "flex", alignItems: "center", gap: 4,
                              }}>
                                <Users size={12} />
                                {card.student_count ?? 0} student{(card.student_count ?? 0) !== 1 ? "s" : ""}
                              </div>
                            </button>

                            {/* Reassign button — only for past/inactive advisory years */}
                            {!isActiveAdvisory && (
                              <button
                                onClick={() => setReassignCard(card)}
                                style={{
                                  marginTop: 12, padding: "6px 0", borderRadius: 7,
                                  border: "1.5px solid #dde1ee", background: "#f7f9ff",
                                  color: "#2c3e6b", fontSize: 12, fontWeight: 600,
                                  cursor: "pointer", fontFamily: "Poppins, sans-serif",
                                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                                  transition: "background 0.15s, border-color 0.15s",
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = "#eef3ff";
                                  e.currentTarget.style.borderColor = "#c8d0ec";
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = "#f7f9ff";
                                  e.currentTarget.style.borderColor = "#dde1ee";
                                }}
                              >
                                <UserCheck size={13} />
                                Reassign
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {reassignCard && (
        <ReassignModal
          card={reassignCard}
          onClose={() => setReassignCard(null)}
          onSuccess={loadCards}
        />
      )}
    </Layout>
  );
}

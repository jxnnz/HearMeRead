import { useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Search, FileSpreadsheet, FileText, Trash2, ChevronsUpDown } from "lucide-react";

// Period labels
const PERIOD_LABELS = {
  BoSY: "Beginning of SY",
  MoSY: "Middle of SY",
  EoSY: "End of SY",
};

// Column definitions
// render(value, record) — optional JSX renderer for table cells
// exportValue(value, record) — plain-text value for Excel / print
const COLUMNS = [
  {
    key:   "assessment_date",
    label: "Assessment Date",
    render: (v) =>
      v ? new Date(v).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—",
    exportValue: (v) =>
      v ? new Date(v).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—",
  },
  {
    key:   "period",
    label: "Assessment Period",
    render: (v) => (
      <span className={`aht-period aht-period--${v}`}>
        {PERIOD_LABELS[v] ?? v ?? "—"}
      </span>
    ),
    exportValue: (v) => PERIOD_LABELS[v] ?? v ?? "—",
  },
  {
    key:   "language",
    label: "Language",
    render: (v) => <span style={{ textTransform: "capitalize" }}>{v ?? "—"}</span>,
    exportValue: (v) => v ? v.charAt(0).toUpperCase() + v.slice(1) : "—",
  },
  { key: "task1",                label: "Task 1"                    },
  { key: "task2l_word",          label: "Task 2L Word"              },
  { key: "task2h_sentences",     label: "Task 2H Sentences"         },
  { key: "total_score",          label: "Total Score"               },
  { key: "part1_reading_level",  label: "Part 1 Reading Level"      },
  { key: "story_number",         label: "Story #"                   },
  { key: "num_miscues",          label: "No. of Miscues"            },
  { key: "words_read",           label: "Words Read"                },
  { key: "total_time",           label: "Time (min:sec)"            },
  { key: "wpm",                  label: "Words Per Minute"          },
  {
    key:   "pct_correct_words",
    label: "% Correct Words",
    render: (v) => v != null ? `${v}%` : "—",
    exportValue: (v) => v != null ? `${v}%` : "—",
  },
  { key: "total_correct",        label: "Total Correct Answers"     },
  { key: "observation_level",    label: "Observation Level"         },
  { key: "reading_profile",      label: "Reading Profile"           },
  { key: "remarks",              label: "Remarks"                   },
];

// Helper: get plain-text cell value
function getCellText(col, record) {
  const v = record[col.key];
  if (col.exportValue) return col.exportValue(v, record);
  return v ?? "—";
}

// Student info block shared by export + print
function buildStudentInfo(student = {}) {
  const {
    first_name = "", last_name = "", lrn = "—",
    grade_level = "—", section = "—", teacher = "—",
    sex = "—", reading_profile = "—",
  } = student;
  return {
    fullName: `${first_name} ${last_name}`.trim() || "—",
    lrn, grade_level, section, teacher,
    sex: sex ? sex.charAt(0).toUpperCase() + sex.slice(1) : "—",
    reading_profile,
  };
}

// Export to Excel
function exportExcel(records, student = {}) {
  const s = buildStudentInfo(student);
  const gradeSection = `${String(s.grade_level ?? "").replace("grade_", "Grade ").replace("kindergarten", "Kindergarten")} — ${s.section}`;

  const infoBlock = [
    ["STUDENT ASSESSMENT HISTORY REPORT"],
    [],
    ["Student Name",    s.fullName],
    ["LRN",             s.lrn],
    ["Grade & Section", gradeSection],
    ["Teacher",         s.teacher],
    ["Sex",             s.sex],
    ["Reading Profile", s.reading_profile],
    [],
    ["#", ...COLUMNS.map((c) => c.label)],
    ...records.map((r, idx) => [idx + 1, ...COLUMNS.map((c) => getCellText(c, r))]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(infoBlock);
  ws["!cols"] = [
    { wch: 4  },  // #
    { wch: 20 },  // Assessment Date
    { wch: 18 },  // Assessment Period
    { wch: 12 },  // Language
    { wch: 8  },  // Task 1
    { wch: 14 },  // Task 2L Word
    { wch: 18 },  // Task 2H Sentences
    { wch: 12 },  // Total Score
    { wch: 22 },  // Part 1 Reading Level
    { wch: 10 },  // Story #
    { wch: 15 },  // No. of Miscues
    { wch: 12 },  // Words Read
    { wch: 14 },  // Time (min:sec)
    { wch: 18 },  // Words Per Minute
    { wch: 18 },  // % Correct Words
    { wch: 22 },  // Total Correct Answers
    { wch: 18 },  // Observation Level
    { wch: 24 },  // Reading Profile
    { wch: 30 },  // Remarks
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Assessment History");
  XLSX.writeFile(wb, `assessment_${s.fullName.replace(/\s+/g, "_")}.xlsx`);
}

// Export to PDF
function exportPDF(records, student = {}) {
  const s = buildStudentInfo(student);
  const gradeSection = `${String(s.grade_level ?? "").replace("grade_", "Grade ").replace("kindergarten", "Kindergarten")} — ${s.section}`;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Student name heading
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(26, 35, 64);
  doc.text(s.fullName, 14, 15);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 120);
  doc.text("Student Assessment History Report", 14, 21);

  // Info box background
  doc.setDrawColor(200, 208, 228);
  doc.setFillColor(244, 246, 251);
  doc.roundedRect(14, 25, 268, 22, 2, 2, "FD");

  // Info items: 2 columns, 3 rows each
  const leftCol  = [["LRN:", s.lrn], ["Teacher:", s.teacher ?? "—"], ["Reading Profile:", s.reading_profile ?? "—"]];
  const rightCol = [["Grade & Section:", gradeSection], ["Sex:", s.sex ?? "—"], ["Total Records:", String(records.length)]];
  const labelW   = 36;
  const colX     = [18, 152];

  [[leftCol, 0], [rightCol, 1]].forEach(([items, colIdx]) => {
    items.forEach(([label, value], rowIdx) => {
      const x = colX[colIdx];
      const y = 31 + rowIdx * 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 120);
      doc.text(label, x, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(26, 35, 64);
      doc.text(value, x + labelW, y);
    });
  });

  // Assessment table
  const headers = ["#", ...COLUMNS.map((c) => c.label)];
  const rows = records.map((r, idx) => [
    idx + 1,
    ...COLUMNS.map((c) => getCellText(c, r)),
  ]);

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 51,
    styles: { fontSize: 6.5, cellPadding: 2, font: "helvetica", textColor: [26, 35, 64] },
    headStyles: { fillColor: [44, 62, 107], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 249, 253] },
    columnStyles: {
      0:  { cellWidth: 6  },
      1:  { cellWidth: 22 },
      2:  { cellWidth: 24 },
      8:  { cellWidth: 24 },
      17: { cellWidth: 26 },
      18: { cellWidth: 30 },
    },
  });

  doc.save(`assessment_${s.fullName.replace(/\s+/g, "_")}.pdf`);
}

// ============================================================
export default function AssessmentHistoryTable({
  records  = [],
  student  = {},
  onDelete,
}) {
  const [search,       setSearch]       = useState("");
  const [filterLang,   setFilterLang]   = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [sortKey,      setSortKey]      = useState("assessment_date");
  const [sortAsc,      setSortAsc]      = useState(false);

  // Filter
  const filtered = records.filter((r) => {
    if (filterLang   !== "all" && r.language !== filterLang)    return false;
    if (filterPeriod !== "all" && r.period   !== filterPeriod)  return false;
    if (search) {
      const q = search.toLowerCase();
      const match = COLUMNS.some((c) =>
        String(r[c.key] ?? "").toLowerCase().includes(q)
      );
      if (!match) return false;
    }
    return true;
  });

  // Sort
  function toggleSort(key) {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    if (av < bv) return sortAsc ? -1 : 1;
    if (av > bv) return sortAsc ?  1 : -1;
    return 0;
  });

  // Unique filter options derived from actual records
  const languages = [...new Set(records.map((r) => r.language).filter(Boolean))];
  const periods   = [...new Set(records.map((r) => r.period).filter(Boolean))];

  // ============================================================
  return (
    <div className="aht-wrap">

      {/* Section header */}
      <div className="aht-header">
        <div className="aht-header__left">
          <h3 className="aht-title">Assessment History</h3>
          <span className="aht-count">{filtered.length} / {records.length} records</span>
        </div>

        <div className="aht-header__right">
          {/* Search */}
          <div className="aht-search">
            <Search size={14} className="aht-search__icon" />
            <input
              type="text"
              className="aht-search__input"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Language filter */}
          <select
            className="aht-filter-select"
            value={filterLang}
            onChange={(e) => setFilterLang(e.target.value)}
            aria-label="Filter by language"
          >
            <option value="all">All Languages</option>
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {lang.charAt(0).toUpperCase() + lang.slice(1)}
              </option>
            ))}
          </select>

          {/* Period filter */}
          <select
            className="aht-filter-select"
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            aria-label="Filter by period"
          >
            <option value="all">All Periods</option>
            {periods.map((p) => (
              <option key={p} value={p}>
                {PERIOD_LABELS[p] ?? p}
              </option>
            ))}
          </select>

          {/* Export PDF */}
          <button
            className="aht-btn aht-btn--print"
            onClick={() => exportPDF(sorted, student)}
          >
            <FileText size={14} />
            Export PDF
          </button>

          {/* Export Excel */}
          <button
            className="aht-btn aht-btn--export"
            onClick={() => exportExcel(sorted, student)}
          >
            <FileSpreadsheet size={14} />
            Export Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="aht-table-wrap">
        <table className="aht-table">
          <thead>
            <tr>
              <th className="aht-th aht-th--id">#</th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="aht-th"
                  onClick={() => toggleSort(col.key)}
                >
                  <span className="aht-th__inner">
                    {col.label}
                    <ChevronsUpDown size={12} className="aht-th__sort-icon" />
                  </span>
                </th>
              ))}
              <th className="aht-th aht-th--action">Action</th>
            </tr>
          </thead>

          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 2} className="aht-empty">
                  {search || filterLang !== "all" || filterPeriod !== "all"
                    ? "No records match the current filters."
                    : "No assessment records yet."}
                </td>
              </tr>
            ) : (
              sorted.map((record, idx) => (
                <tr key={record.id ?? idx} className="aht-row">
                  <td className="aht-td aht-td--id">{idx + 1}</td>
                  {COLUMNS.map((col) => (
                    <td key={col.key} className="aht-td">
                      {col.render
                        ? col.render(record[col.key], record)
                        : (record[col.key] ?? "—")}
                    </td>
                  ))}
                  <td className="aht-td aht-td--actions">
                    <button
                      className="aht-action-btn aht-action-btn--delete"
                      onClick={() => onDelete?.(record)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
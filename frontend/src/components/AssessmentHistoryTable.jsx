// ============================================================
// HearMeRead — AssessmentHistoryTable Component
//
// Props:
//   records  — array of assessment record objects
//   student  — student object (for export/print header)
//   onEdit   — (record) => void
//   onDelete — (record) => void
// ============================================================
import { useState } from "react";
import * as XLSX from "xlsx";
import { Search, FileSpreadsheet, Printer, Trash2, ChevronsUpDown } from "lucide-react";

// ── Period labels ────────────────────────────────────────────
const PERIOD_LABELS = {
  BoSY: "Beginning of SY",
  MoSY: "Middle of SY",
  EoSY: "End of SY",
};

// ── Column definitions ───────────────────────────────────────
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

// ── Helper: get plain-text cell value ────────────────────────
function getCellText(col, record) {
  const v = record[col.key];
  if (col.exportValue) return col.exportValue(v, record);
  return v ?? "—";
}

// ── Student info block shared by export + print ───────────────
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

// ── Export to Excel ──────────────────────────────────────────
function exportExcel(records, student = {}) {
  const s = buildStudentInfo(student);

  const infoBlock = [
    ["STUDENT ASSESSMENT HISTORY REPORT"],
    [],
    ["Student Name",    s.fullName],
    ["LRN",             s.lrn],
    ["Grade & Section", `${String(s.grade_level ?? "").replace("grade_", "Grade ").replace("kindergarten", "Kindergarten")} — ${s.section}`],
    ["Teacher",         s.teacher],
    ["Sex",             s.sex],
    ["Reading Profile", s.reading_profile],
    [],
    ["#", ...COLUMNS.map((c) => c.label)],
    ...records.map((r, idx) => [idx + 1, ...COLUMNS.map((c) => getCellText(c, r))]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(infoBlock);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Assessment History");
  XLSX.writeFile(wb, `assessment_${s.fullName.replace(/\s+/g, "_")}.xlsx`);
}

// ── Print table ──────────────────────────────────────────────
function printTable(records, student = {}) {
  const s = buildStudentInfo(student);

  const headerCells = ["#", ...COLUMNS.map((c) => c.label)]
    .map((l) => `<th>${l}</th>`)
    .join("");

  const bodyRows = records
    .map((r, idx) => {
      const cells = [
        `<td>${idx + 1}</td>`,
        ...COLUMNS.map((c) => `<td>${getCellText(c, r)}</td>`),
      ].join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Assessment History — ${s.fullName}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; color: #1a2340; }
    h2   { margin: 0 0 2px; font-size: 17px; }
    .subtitle { font-size: 11px; color: #666; margin: 0 0 14px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px;
      background: #f4f6fb; border: 1px solid #c8d0e4; border-radius: 6px;
      padding: 10px 16px; margin-bottom: 18px; }
    .info-row { display: flex; gap: 6px; font-size: 11px; }
    .info-label { color: #666; min-width: 110px; }
    .info-value { font-weight: 600; color: #1a2340; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #c8d0e4; padding: 5px 8px; text-align: left; white-space: nowrap; }
    th { background: #eef0f8; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
    tr:nth-child(even) td { background: #f8f9fd; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h2>${s.fullName}</h2>
  <p class="subtitle">Student Assessment History Report</p>
  <div class="info-grid">
    <div class="info-row"><span class="info-label">LRN:</span><span class="info-value">${s.lrn}</span></div>
    <div class="info-row"><span class="info-label">Grade &amp; Section:</span><span class="info-value">${String(s.grade_level ?? "").replace("grade_", "Grade ").replace("kindergarten", "Kindergarten")} — ${s.section}</span></div>
    <div class="info-row"><span class="info-label">Teacher:</span><span class="info-value">${s.teacher}</span></div>
    <div class="info-row"><span class="info-label">Sex:</span><span class="info-value">${s.sex}</span></div>
    <div class="info-row"><span class="info-label">Reading Profile:</span><span class="info-value">${s.reading_profile}</span></div>
    <div class="info-row"><span class="info-label">Total Records:</span><span class="info-value">${records.length}</span></div>
  </div>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
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

  // ── Filter ───────────────────────────────────────────────
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

  // ── Sort ─────────────────────────────────────────────────
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

  // ── Unique filter options derived from actual records ────
  const languages = [...new Set(records.map((r) => r.language).filter(Boolean))];
  const periods   = [...new Set(records.map((r) => r.period).filter(Boolean))];

  // ============================================================
  return (
    <div className="aht-wrap">

      {/* ── Section header ── */}
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

          {/* Print */}
          <button
            className="aht-btn aht-btn--print"
            onClick={() => printTable(sorted, student)}
          >
            <Printer size={14} />
            Print
          </button>

          {/* Export Excel */}
          <button
            className="aht-btn aht-btn--export"
            onClick={() => exportExcel(sorted, student)}
          >
            <FileSpreadsheet size={14} />
            Export
          </button>
        </div>
      </div>

      {/* ── Table ── */}
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
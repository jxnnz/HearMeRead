// ============================================================
// HearMeRead — AssessmentHistoryTable Component
// Displays a student's assessment session records in a table.
// Includes: search, filter button, export, edit & delete per row.
//
// Props:
//   records   — array of session/assessment record objects
//   onEdit    — (record) => void
//   onDelete  — (record) => void
// ============================================================
import { useState } from "react";
import { Search, Filter, Download, Pencil, Trash2, ChevronsUpDown } from "lucide-react";

// ── Column definitions ───────────────────────────────────────
const COLUMNS = [
  { key: "id",              label: "ID" },
  { key: "assessment_date", label: "Assessment Date" },
  { key: "period",          label: "Period" },
  { key: "school_year",     label: "School Year" },
  { key: "language",        label: "Language" },
  { key: "cwpm",            label: "CWPM" },
  { key: "accuracy",        label: "Accuracy" },
];

// ── Period labels ────────────────────────────────────────────
const PERIOD_LABELS = {
  BoSY: "Beginning",
  MoSY: "Middle",
  EoSY: "End",
  beginning: "Beginning",
  middle:    "Middle",
  end:       "End",
};

// ── Export to CSV ────────────────────────────────────────────
function exportCSV(records) {
  const headers = COLUMNS.map((c) => c.label).join(",");
  const rows = records.map((r) =>
    COLUMNS.map((c) => {
      const val = r[c.key] ?? "";
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(",")
  );
  const csv = [headers, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "assessment_history.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
export default function AssessmentHistoryTable({
  records  = [],
  onEdit,
  onDelete,
}) {
  const [search,     setSearch]     = useState("");
  const [sortKey,    setSortKey]    = useState("id");
  const [sortAsc,    setSortAsc]    = useState(true);

  // ── Client-side search ───────────────────────────────────
  const filtered = records.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return COLUMNS.some((c) =>
      String(r[c.key] ?? "").toLowerCase().includes(q)
    );
  });

  // ── Sorting ──────────────────────────────────────────────
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

  // ============================================================
  return (
    <div className="aht-wrap">
      {/* ── Section header ── */}
      <div className="aht-header">
        <div className="aht-header__left">
          <h3 className="aht-title">Assessment History</h3>
          <span className="aht-count">{records.length} records</span>
        </div>

        <div className="aht-header__right">
          {/* Search */}
          <div className="aht-search">
            <Search size={14} className="aht-search__icon" />
            <input
              type="text"
              className="aht-search__input"
              placeholder="Search records"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filter button — placeholder, extend as needed */}
          <button className="aht-btn aht-btn--filter">
            <Filter size={14} />
            Filter
          </button>

          {/* Export button */}
          <button
            className="aht-btn aht-btn--export"
            onClick={() => exportCSV(sorted)}
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="aht-table-wrap">
        <table className="aht-table">
          <thead>
            <tr>
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
                <td
                  colSpan={COLUMNS.length + 1}
                  className="aht-empty"
                >
                  {search ? "No records match your search." : "No assessment records yet."}
                </td>
              </tr>
            ) : (
              sorted.map((record, idx) => (
                <tr key={record.id ?? idx} className="aht-row">
                  <td className="aht-td aht-td--id">{idx + 1}</td>
                  <td className="aht-td">
                    {record.assessment_date
                      ? new Date(record.assessment_date).toLocaleDateString(
                          "en-PH",
                          { year: "numeric", month: "short", day: "numeric" }
                        )
                      : "—"}
                  </td>
                  <td className="aht-td">
                    <span className={`aht-period aht-period--${record.period}`}>
                      {PERIOD_LABELS[record.period] ?? record.period ?? "—"}
                    </span>
                  </td>
                  <td className="aht-td">{record.school_year ?? "—"}</td>
                  <td className="aht-td" style={{ textTransform: "capitalize" }}>
                    {record.language ?? "—"}
                  </td>
                  <td className="aht-td aht-td--num">{record.cwpm ?? "—"}</td>
                  <td className="aht-td aht-td--num">
                    {record.accuracy != null ? `${record.accuracy}%` : "—"}
                  </td>
                  <td className="aht-td aht-td--actions">
                    <button
                      className="aht-action-btn aht-action-btn--edit"
                      onClick={() => onEdit?.(record)}
                      title="Edit record"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="aht-action-btn aht-action-btn--delete"
                      onClick={() => onDelete?.(record)}
                      title="Delete record"
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
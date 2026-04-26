// ============================================================
// HearMeRead — AssessmentHistoryTable Component
// Assessment records table with search, filter, export,
// and edit/delete actions per row
// Props:
//   records   — array of assessment session records
//   onEdit    — (record) => void
//   onDelete  — (record) => void
// ============================================================
import { useState } from "react";
import { Search, SlidersHorizontal, Download, Pencil, Trash2 } from "lucide-react";
import "./StudentInfoPage.css";

const PERIOD_LABELS = {
  BoSY: "Beginning of SY",
  MoSY: "Middle of SY",
  EoSY: "End of SY",
  beginning: "Beginning of SY",
  middle:    "Middle of SY",
  end:       "End of SY",
};

export default function AssessmentHistoryTable({
  records = [],
  onEdit,
  onDelete,
}) {
  const [search, setSearch]           = useState("");
  const [filterPeriod, setFilterPeriod] = useState("");
  const [showFilter, setShowFilter]   = useState(false);

  // ── Client-side search + filter ─────────────────────────
  const displayed = records.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      String(r.id).includes(q) ||
      (r.passage_title ?? "").toLowerCase().includes(q) ||
      (r.period ?? "").toLowerCase().includes(q);

    const matchPeriod =
      !filterPeriod ||
      r.period?.toLowerCase() === filterPeriod.toLowerCase() ||
      r.assessment_type?.toLowerCase() === filterPeriod.toLowerCase();

    return matchSearch && matchPeriod;
  });

  // ── CSV Export ───────────────────────────────────────────
  function handleExport() {
    const headers = ["ID", "Date", "Period", "Passage", "CWPM", "Accuracy", "Action"];
    const rows = records.map((r) => [
      r.id,
      r.date ?? r.created_at ?? "—",
      PERIOD_LABELS[r.period] ?? r.period ?? "—",
      r.passage_title ?? "—",
      r.cwpm ?? r.wpm ?? "—",
      r.accuracy != null ? `${r.accuracy}%` : "—",
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "assessment_history.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="sip-history">

      {/* ── Section header ── */}
      <div className="sip-history__header">
        <div>
          <h3 className="sip-history__title">Assessment History</h3>
          <p className="sip-history__count">{records.length} records</p>
        </div>

        <div className="sip-history__controls">
          {/* Search */}
          <div className="sip-search">
            <Search size={14} className="sip-search__icon" />
            <input
              type="text"
              className="sip-search__input"
              placeholder="Search records"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filter */}
          <div className="sip-filter-wrap">
            <button
              className={`sip-filter-btn${showFilter ? " sip-filter-btn--active" : ""}`}
              onClick={() => setShowFilter((v) => !v)}
            >
              <SlidersHorizontal size={14} />
              Filter
            </button>
            {showFilter && (
              <div className="sip-filter-panel">
                <label className="sip-filter-panel__label">Period</label>
                <select
                  className="sip-filter-panel__select"
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value)}
                >
                  <option value="">All Periods</option>
                  <option value="beginning">Beginning of SY</option>
                  <option value="middle">Middle of SY</option>
                  <option value="end">End of SY</option>
                </select>
                <button
                  className="sip-filter-panel__clear"
                  onClick={() => { setFilterPeriod(""); setShowFilter(false); }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Export */}
          <button className="sip-export-btn" onClick={handleExport}>
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="sip-table-wrap">
        <table className="sip-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Period</th>
              <th>Passage</th>
              <th>CWPM</th>
              <th>Accuracy</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={7} className="sip-table__empty">
                  No assessment records found.
                </td>
              </tr>
            ) : (
              displayed.map((r, idx) => (
                <tr key={r.id ?? idx} className="sip-table__row">
                  <td className="sip-table__id">{idx + 1}</td>
                  <td>{r.date ?? r.created_at ?? "—"}</td>
                  <td>{PERIOD_LABELS[r.period] ?? r.period ?? "—"}</td>
                  <td className="sip-table__passage">{r.passage_title ?? "—"}</td>
                  <td className="sip-table__cwpm">{r.cwpm ?? r.wpm ?? "—"}</td>
                  <td>
                    {r.accuracy != null ? (
                      <span className="sip-table__accuracy">
                        {r.accuracy}%
                      </span>
                    ) : "—"}
                  </td>
                  <td>
                    <div className="sip-table__actions">
                      <button
                        className="sip-action-btn sip-action-btn--edit"
                        onClick={() => onEdit?.(r)}
                        title="Edit record"
                        aria-label="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="sip-action-btn sip-action-btn--delete"
                        onClick={() => onDelete?.(r)}
                        title="Delete record"
                        aria-label="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
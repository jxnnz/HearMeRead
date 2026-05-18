// ============================================================
// HearMeRead — FilterButton Component
// A button that opens a dropdown with filter options.
//
// Props:
//   filters   — array of filter config objects:
//     [{ key, label, value, options: [{ value, label }] }]
//   values    — object of current filter values { [key]: value }
//   onChange  — (key, value) => void
//   onClear   — () => void
// ============================================================
import { useState, useRef, useEffect } from "react";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import "./component css/FilterButton.css";

export default function FilterButton({ filters = [], values = {}, onChange, onClear }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Count active filters
  const activeCount = Object.values(values).filter(Boolean).length;
  const hasActive = activeCount > 0;

  return (
    <div className="filter-btn-wrap" ref={ref}>
      {/* Trigger button */}
      <button
        type="button"
        className={`filter-trigger${open ? " filter-trigger--open" : ""}${hasActive ? " filter-trigger--active" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <SlidersHorizontal size={14} />
        Filter
        {hasActive && <span className="filter-trigger__badge">{activeCount}</span>}
        <ChevronDown size={13} className={open ? "filter-chevron--up" : "filter-chevron"} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="filter-dropdown">
          {filters.map((f, i) => (
            <div key={f.key}>
              {/* Section divider */}
              {f.section && (
                <div className={`filter-dropdown__section${i > 0 ? " filter-dropdown__section--divider" : ""}`}>
                  {f.section}
                </div>
              )}

              <div className="filter-dropdown__row">
                <label className="filter-dropdown__label">{f.label}</label>
                <select
                  className="filter-dropdown__select"
                  value={values[f.key] || ""}
                  onChange={(e) => onChange(f.key, e.target.value)}
                >
                  <option value="">{f.allLabel ?? "All"}</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}

          {hasActive && (
            <button
              type="button"
              className="filter-dropdown__clear"
              onClick={() => { onClear(); setOpen(false); }}
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
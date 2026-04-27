// ============================================================
// HearMeRead — DetailDrawer Component
// Slide-in panel that shows the full passage content
// Props:
//   passage  — passage object to display
//   onClose  — close the drawer
//   onEdit   — open edit modal for this passage
// ============================================================
import { X, Pencil } from "lucide-react";
import "./component css/DetailDrawer.css";

export default function DetailDrawer({ passage, onClose, onEdit }) {
  const isArchived = passage.is_archived;
  const lang = passage.language === "filipino" ? "Filipino" : "English";
  const words =
    passage.word_count ??
    passage.content?.trim().split(/\s+/).filter(Boolean).length ??
    0;

  return (
    // Clicking the overlay closes the drawer
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className="drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Passage: ${passage.title}`}
      >
        {/* ── Header ── */}
        <div className="drawer__header">
          <div className="drawer__header-meta">
            <span className="drawer__grade">Grade {passage.grade_level}</span>
            <span className="drawer__dot">·</span>
            <span className="drawer__lang">{lang}</span>
            {isArchived && (
              <span className="drawer__archived-badge">Archived</span>
            )}
          </div>
          <button
            className="drawer__close"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Title ── */}
        <h2 className="drawer__title">{passage.title}</h2>

        {/* ── Word count ── */}
        <p className="drawer__meta">{words} words</p>

        {/* ── Full passage content ── */}
        <div className="drawer__content">{passage.content}</div>

        {/* ── Footer buttons ── */}
        <div className="drawer__footer">
          <button className="drawer__btn drawer__btn--ghost" onClick={onClose}>
            Close
          </button>

          {!isArchived && (
            <button
              className="drawer__btn drawer__btn--primary"
              onClick={() => onEdit(passage)}
            >
              <Pencil size={14} />
              Edit Passage
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
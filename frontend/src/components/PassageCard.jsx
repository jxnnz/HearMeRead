// ============================================================
// HearMeRead — PassageCard Component
// Displays a single passage in the grid with action buttons
// Props:
//   passage    — passage object from the API
//   onClick    — open detail drawer
//   onEdit     — open edit modal
//   onArchive  — archive the passage
// ============================================================
import { Pencil, Trash2 } from "lucide-react";
import "./component css/PassageCard.css";

function formatGrade(gl) {
  if (!gl) return "";
  if (gl === "kindergarten") return "Kindergarten";
  return `Grade ${gl.replace("grade_", "")}`;
}

export default function PassageCard({ passage, onClick, onEdit, onRemove }) {
  const isArchived = passage.is_archived;
  const isA1 = passage.assessment_type === 1;
  const lang = passage.language === "filipino" ? "Filipino" : "English";

  const words =
    passage.word_count ??
    passage.content?.trim().split(/\s+/).filter(Boolean).length ??
    0;

  return (
    <div
      className={`p-card${isArchived ? " p-card--archived" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      aria-label={`View passage: ${passage.title ?? "passage"}`}
    >
      {/* ── Meta row ── */}
      <div className="p-card__meta">
        <span className="p-card__grade">{formatGrade(passage.grade_level)}</span>
        {!isA1 && (
          <>
            <span className="p-card__dot">·</span>
            <span className="p-card__words">{words} words</span>
          </>
        )}
        <span className="p-card__dot">·</span>
        <span className="p-card__lang">{lang}</span>
      </div>

      {/* ── Title ── */}
      <h3 className="p-card__title">{passage.title}</h3>

      {/* ── Excerpt ── */}
      <p className="p-card__excerpt">
        {passage.content?.slice(0, 160)}
        {passage.content?.length > 160 ? "…" : ""}
      </p>

      {/* ── Action buttons (visible on hover) ── */}
      <div className="p-card__actions" onClick={(e) => e.stopPropagation()}>
        <button
          className="p-card__btn"
          title="Edit passage"
          onClick={(e) => onEdit(passage, e)}
          aria-label="Edit passage"
        >
          <Pencil size={13} />
          Edit
        </button>

        <button
          className="p-card__btn p-card__btn--danger"
          title="Remove passage"
          onClick={(e) => onRemove(passage, e)}
          aria-label="Remove passage"
        >
          <Trash2 size={13} />
          Remove
        </button>
      </div>
    </div>
  );
}
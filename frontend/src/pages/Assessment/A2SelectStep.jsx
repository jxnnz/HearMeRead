import { ChevronRight, CheckCircle } from "lucide-react";

function getStoryParts(p) {
  const rawTitle = (p.title || "").trim();
  const m = rawTitle.match(/^Story\s*(\d+)\s*:\s*(.+)$/i);
  const cleanTitle = m ? m[2] : rawTitle;

  // Prefer the real story_number field if present
  if (p.story_number != null) {
    return { num: String(p.story_number), title: cleanTitle };
  }
  // Fall back to regex-parsing legacy "Story N: Title" format
  if (m) {
    return { num: m[1], title: m[2] };
  }
  // Optional story number (no badge, just title)
  return { num: null, title: cleanTitle };
}

export default function A2SelectStep({ a2Stories, a2Passage, setA2Passage, onSelect }) {
  return (
    <div className="asp-page">
      <div className="asp-a2-select">
        <span className="asp-reading-badge">Assessment 2</span>
        <h2 className="asp-a2-select__title">Choose a Story</h2>
        <p className="asp-a2-select__sub">
          Let the student pick which story they would like to read.
        </p>
        <div className="asp-a2-select__grid">
          {a2Stories.map((p) => {
            const { num, title } = getStoryParts(p);
            return (
              <button
                key={p.id}
                className={`asp-a2-card${a2Passage?.id === p.id ? " asp-a2-card--selected" : ""}`}
                onClick={() => setA2Passage(p)}
              >
                {num && <span className="asp-a2-card__num">Story {num}</span>}
                <span className="asp-a2-card__title">{title}</span>
                <span className="asp-a2-card__meta">{p.word_count} words</span>
                {a2Passage?.id === p.id && <CheckCircle size={18} className="asp-a2-card__check" />}
              </button>
            );
          })}
        </div>
        <button
          className="asp-continue-btn"
          onClick={() => onSelect(a2Passage)}
          disabled={!a2Passage}
        >
          Start Reading <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
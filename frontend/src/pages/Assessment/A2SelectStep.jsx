import { ChevronRight, CheckCircle } from "lucide-react";

function parseStoryTitle(t) {
  if (!t) return { num: null, title: t };
  const m = t.match(/^Story\s*(\d+)\s*:\s*(.+)$/i);
  return m ? { num: m[1], title: m[2] } : { num: null, title: t };
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
            const { num, title } = parseStoryTitle(p.title);
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

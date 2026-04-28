import { ChevronRight } from "lucide-react";

export default function ScoreReviewStep({
  badge,
  score,
  onScoreChange,
  hint,
  onConfirm,
  isTranscribing,
}) {
  const scoreNum = parseInt(score, 10);
  const valid = !isNaN(scoreNum) && scoreNum >= 0 && scoreNum <= 10;

  return (
    <div className="asp-page">
      <div className="asp-score-card">
        <span className="asp-reading-badge">{badge}</span>
        <h2 className="asp-score-card__title">Score Review</h2>
        <p className="asp-score-card__sub">
          The score below is auto-calculated. You may edit it if needed.
        </p>

        {isTranscribing && (
          <p className="asp-score-transcribing">
            ⏳ Analyzing recording…
          </p>
        )}

        <div className="asp-score-input-wrap">
          <label className="asp-score-label">Score (0 – 10)</label>
          <input
            type="number"
            min={0} max={10}
            className="asp-score-input"
            value={score}
            onChange={(e) => onScoreChange(e.target.value)}
            placeholder="—"
          />
        </div>

        {valid && <p className="asp-score-hint">{hint(scoreNum)}</p>}

        <button
          className="asp-continue-btn"
          onClick={onConfirm}
          disabled={!valid}
        >
          Confirm & Continue <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

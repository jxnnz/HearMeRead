import "./WordHighlightView.css";

export default function WordHighlightView({
  alignments,
  label,
  words,
  timeLimitSec,
  hideMissing = false,
}) {
  if (!alignments?.length) return null;

  const displayAlignments = hideMissing
    ? alignments.filter((a) => (a.miscue_type ?? "correct") !== "deletion")
    : alignments;

  if (!displayAlignments.length) return null;

  // Build cutoff index from Whisper timestamps (A2 only)
  let cutoffIdx = -1;
  if (timeLimitSec != null && words?.length) {
    words.forEach((w, i) => {
      if ((w.start ?? 0) <= timeLimitSec) cutoffIdx = i;
    });
  }

  return (
    <div className="asp-word-highlight">
      {label && <p className="asp-word-highlight__label">{label}</p>}
      <div className="asp-word-highlight__legend">
        <span className="asp-whl--correct">● Read Correctly</span>
        <span className="asp-whl--substitution">● Wrong Word</span>
        {!hideMissing && <span className="asp-whl--deletion">● Skipped</span>}
        <span className="asp-whl--insertion">● Added Word</span>
        {cutoffIdx >= 0 && (
          <span style={{ color: "#2c7fc1", fontWeight: 600 }}>● 1-Min Limit</span>
        )}
      </div>
      <div className="asp-word-highlight__text">
        {displayAlignments.map((a, i) => {
          const type = a.miscue_type ?? "correct";
          const word =
            type === "insertion"
              ? `[${a.transcribed ?? ""}]`
              : (a.transcribed || a.reference || "");

          const isWrong = type !== "correct";
          const isCutoff = cutoffIdx >= 0 && i === cutoffIdx;
          const isPast = cutoffIdx >= 0 && i > cutoffIdx;

          if (cutoffIdx >= 0) {
            const cls = [
              "word-chip",
              isWrong ? "word-chip--wrong" : "word-chip--correct",
              isCutoff ? "word-chip--cutoff" : "",
              isPast ? "word-chip--past-limit" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <span
                key={i}
                className={cls}
                title={
                  type === "substitution"
                    ? `Expected: "${a.reference || '—'}" | Said: "${a.transcribed || '—'}"`
                    : type === "insertion"
                    ? `Added word: "${a.transcribed || '—'}"`
                    : type === "deletion"
                    ? `Skipped: "${a.reference || '—'}"`
                    : "Read correctly"
                }
              >
                {word}{" "}
              </span>
            );
          }

          return (
            <span
              key={i}
              className={`asp-whl-word asp-whl--${type}`}
              title={
                type === "substitution"
                  ? `Expected: "${a.reference || '—'}" | Said: "${a.transcribed || '—'}"`
                  : type === "insertion"
                  ? `Added word: "${a.transcribed || '—'}"`
                  : type === "deletion"
                  ? `Skipped: "${a.reference || '—'}"`
                  : "Read correctly"
              }
            >
              {word}{" "}
            </span>
          );
        })}
      </div>
    </div>
  );
}

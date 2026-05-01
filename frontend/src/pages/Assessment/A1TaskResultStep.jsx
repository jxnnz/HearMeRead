import { ChevronRight } from "lucide-react";

const PROFILE_COLOR = {
  "Full Refresher":     { color: "#c0392b", bg: "#fdecea" },
  "Moderate Refresher": { color: "#e67e22", bg: "#fff3e0" },
  "Light Refresher":    { color: "#2c7fc1", bg: "#e8f3fc" },
  "Grade Ready":        { color: "#27ae60", bg: "#e8f5e9" },
};

/**
 * Shown after Task 1 scoring OR Task 2 scoring within Assessment 1.
 *
 * Props:
 *   badge          — step label
 *   task           — "task1" | "task2"
 *   scoreResult    — from score-task1: { task1_correct, task1_miscues, route, task2_type }
 *   part1Result    — from score-part1: { task1_correct, task2_correct, total_score, classification, route }
 *   passageWordCount — total words in the passage
 *   recordingTime  — seconds
 *   transcript     — confirmed transcript text
 *   g1Score        — task1_correct (carried over to task2 result page)
 *   onContinue()   — advance to next step
 *   continueLabel  — text for the continue button
 */
export default function A1TaskResultStep({
  badge,
  task,
  scoreResult,
  part1Result,
  passageWordCount,
  recordingTime,
  transcript,
  g1Score,
  onContinue,
  continueLabel = "Continue",
}) {
  const timeStr = recordingTime > 0
    ? `${Math.floor(recordingTime / 60)}:${String(recordingTime % 60).padStart(2, "0")}`
    : "—";

  const isTask1 = task === "task1";

  const wordsRead  = isTask1
    ? (scoreResult?.task1_correct ?? 0)
    : (part1Result?.task2_correct ?? 0);

  const totalScore = part1Result?.total_score ?? null;
  const classification = part1Result?.classification ?? null;
  const profileStyle = classification ? (PROFILE_COLOR[classification] ?? {}) : {};

  return (
    <div className="asp-page">
      <div className="asp-a1result-card">
        <span className="asp-reading-badge">{badge}</span>
        <h2 className="asp-a1result-card__title">
          {isTask1 ? "Task 1 Result" : "Task 2 Result"}
        </h2>

        {/* Classification badge — shown only on task2 result */}
        {!isTask1 && classification && (
          <div
            className="asp-a1result-classification"
            style={{ background: profileStyle.bg, color: profileStyle.color }}
          >
            {classification}
          </div>
        )}

        {/* Stats grid */}
        <div className="asp-a1result-stats">
          {!isTask1 && g1Score != null && (
            <div className="asp-a1result-stat">
              <span className="asp-a1result-stat__val">{g1Score}</span>
              <span className="asp-a1result-stat__lbl">Task 1 Score</span>
            </div>
          )}
          <div className="asp-a1result-stat">
            <span className="asp-a1result-stat__val">{passageWordCount ?? "—"}</span>
            <span className="asp-a1result-stat__lbl">Total Words in Passage</span>
          </div>
          <div className="asp-a1result-stat">
            <span className="asp-a1result-stat__val">{wordsRead}</span>
            <span className="asp-a1result-stat__lbl">Words Read Correctly</span>
          </div>
          {!isTask1 && totalScore != null && (
            <div className="asp-a1result-stat">
              <span className="asp-a1result-stat__val">{totalScore}</span>
              <span className="asp-a1result-stat__lbl">Total Score</span>
            </div>
          )}
          <div className="asp-a1result-stat">
            <span className="asp-a1result-stat__val">{timeStr}</span>
            <span className="asp-a1result-stat__lbl">Total Time</span>
          </div>
        </div>

        {/* Transcription preview */}
        <div className="asp-a1result-transcript">
          <p className="asp-a1result-transcript__label">Transcription</p>
          <p className="asp-a1result-transcript__text">{transcript || "—"}</p>
        </div>

        <button className="asp-continue-btn" onClick={onContinue}>
          {continueLabel} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { ChevronRight, Volume2 } from "lucide-react";
import "./component css/RhymeScoringStep.css";

const ANSWER_OPTIONS = ["Oo", "Hindi"];

/**
 * RhymeScoringStep — Teacher-led rhyme pair scoring for Grade 1 Task 2L.
 *
 * Displays each rhyme pair (e.g., "bata — mata") and the teacher
 * marks whether the student correctly identified if the pair rhymes (Oo/Hindi).
 *
 * @param {Array}    rhymePairs  Array of {id, pair: "bata — mata", answer: "Oo"}
 * @param {function} onComplete  Called with (score, answers) when teacher submits
 * @param {function} onBack      Go back to previous step
 */
export default function RhymeScoringStep({ rhymePairs = [], onComplete, onBack }) {
  const [answers, setAnswers] = useState({});

  const allAnswered = rhymePairs.length > 0 && rhymePairs.every((p) => answers[p.id]);

  function handleSubmit() {
    // Calculate score: number of correct answers matching the answer key
    let score = 0;
    const details = rhymePairs.map((pair) => {
      const studentAnswer = answers[pair.id];
      const isCorrect = studentAnswer === pair.answer;
      if (isCorrect) score++;
      return {
        id: pair.id,
        pair: pair.pair,
        expected: pair.answer,
        given: studentAnswer,
        correct: isCorrect,
      };
    });
    onComplete?.(score, details);
  }

  return (
    <div className="rhyme-page">
      <div className="rhyme-header">
        <span className="asp-reading-badge">Assessment 1 — Gawain 2L</span>
        <h2 className="rhyme-header__title">Rhyming Words (Tugmang Salita)</h2>
        <p className="rhyme-header__sub">
          Read each word pair aloud. Mark <strong>Oo</strong> if the student says
          they rhyme, or <strong>Hindi</strong> if they don't.
        </p>
      </div>

      <div className="rhyme-pairs">
        {rhymePairs.map((pair, idx) => (
          <div key={pair.id} className="rhyme-pair">
            <div className="rhyme-pair__info">
              <span className="rhyme-pair__num">{idx + 1}.</span>
              <div className="rhyme-pair__words">
                <Volume2 size={14} className="rhyme-pair__icon" />
                <span className="rhyme-pair__text">{pair.pair}</span>
              </div>
            </div>
            <div className="rhyme-pair__choices">
              {ANSWER_OPTIONS.map((opt) => {
                const isActive = answers[pair.id] === opt;
                const cls = opt === "Oo" ? "oo" : "hindi";
                return (
                  <button
                    key={opt}
                    className={`rhyme-choice rhyme-choice--${cls}${isActive ? " rhyme-choice--active" : ""}`}
                    onClick={() => setAnswers((prev) => ({ ...prev, [pair.id]: opt }))}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="rhyme-footer">
        {onBack && (
          <button className="rhyme-back-btn" onClick={onBack}>
            Back
          </button>
        )}
        <button
          className="asp-continue-btn"
          onClick={handleSubmit}
          disabled={!allAnswered}
        >
          Submit Rhyme Scores <ChevronRight size={16} />
        </button>
      </div>

      {/* Progress indicator */}
      <div className="rhyme-progress">
        {Object.keys(answers).length} of {rhymePairs.length} answered
      </div>
    </div>
  );
}

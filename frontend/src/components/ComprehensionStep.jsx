import { ChevronRight } from "lucide-react";

const ANSWER_OPTIONS = ["Correct", "Wrong", "N/A"];

export default function ComprehensionStep({
  a2Passage,
  answers,
  setAnswers,
  onSubmit,
}) {
  const questions   = a2Passage?.questions ?? [];
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id]);

  return (
    <div className="asp-page asp-page--wide">
      <div className="asp-comp-header">
        <span className="asp-reading-badge">Assessment 2 — Comprehension Check</span>
        <h2 className="asp-comp-header__title">{a2Passage?.title}</h2>
        <p className="asp-comp-header__sub">
          Mark each question based on the student's oral response.
        </p>
      </div>

      <div className="asp-comp-questions">
        {questions.map((q, idx) => (
          <div key={q.id} className="asp-comp-question">
            <p className="asp-comp-question__text">{idx + 1}. {q.text}</p>
            <div className="asp-comp-choices">
              {ANSWER_OPTIONS.map((opt) => {
                const key      = opt.toLowerCase().replace("/", "");
                const isActive = answers[q.id] === opt;
                return (
                  <button
                    key={opt}
                    className={`asp-comp-choice asp-comp-choice--${key}${isActive ? " asp-comp-choice--active" : ""}`}
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        className="asp-continue-btn"
        onClick={onSubmit}
        disabled={!allAnswered}
      >
        Submit and Continue <ChevronRight size={16} />
      </button>
    </div>
  );
}

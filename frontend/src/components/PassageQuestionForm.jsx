// ============================================================
// HearMeRead — PassageQuestionsForm Component
// Renders the "Passage Questions" card section
// Each question has: question text, answer text, and options[]
// Props:
//   questions   — array of question objects
//   setQuestions — state setter
// ============================================================
import { Plus, X } from "lucide-react";

// ── Blank question template ──────────────────────────────────
function blankQuestion() {
  return {
    id: crypto.randomUUID(),
    question: "",
    answer: "",
    options: [
      { id: crypto.randomUUID(), label: "Correct" },
      { id: crypto.randomUUID(), label: "Wrong" },
      { id: crypto.randomUUID(), label: "N/A" },
    ],
  };
}

export default function PassageQuestionsForm({ questions, setQuestions }) {
  // ── Add a new blank question ─────────────────────────────
  function addQuestion() {
    setQuestions((prev) => [...prev, blankQuestion()]);
  }

  // ── Remove a question by index ───────────────────────────
  function removeQuestion(index) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Update a field on a specific question ────────────────
  function updateQuestion(index, field, val) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: val } : q))
    );
  }

  // ── Add an option to a question ─────────────────────────
  function addOption(qIndex) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              options: [
                ...q.options,
                { id: crypto.randomUUID(), label: "" },
              ],
            }
          : q
      )
    );
  }

  // ── Update an option label ───────────────────────────────
  function updateOption(qIndex, oIndex, val) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              options: q.options.map((o, j) =>
                j === oIndex ? { ...o, label: val } : o
              ),
            }
          : q
      )
    );
  }

  // ── Remove an option ─────────────────────────────────────
  function removeOption(qIndex, oIndex) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? { ...q, options: q.options.filter((_, j) => j !== oIndex) }
          : q
      )
    );
  }

  return (
    <div className="ap-card">
      <h2 className="ap-card__title">Passage Questions</h2>
      <p className="ap-card__subtitle">Enter the passage questions.</p>

      {/* ── Question list ── */}
      {questions.map((q, qIndex) => (
        <div key={q.id} className="pq-block">
          {/* Question header with remove button */}
          <div className="pq-block__header">
            <span className="pq-block__num">Question {qIndex + 1}</span>
            {questions.length > 1 && (
              <button
                type="button"
                className="pq-block__remove"
                onClick={() => removeQuestion(qIndex)}
                aria-label={`Remove question ${qIndex + 1}`}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Question text */}
          <div className="ap-field">
            <label className="ap-label" htmlFor={`question-${q.id}`}>
              Question:
            </label>
            <input
              id={`question-${q.id}`}
              type="text"
              className="ap-input"
              value={q.question}
              onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
              placeholder="e.g. Sino ang pangunahing tauhan?"
            />
          </div>

          {/* Answer */}
          <div className="ap-field">
            <label className="ap-label" htmlFor={`answer-${q.id}`}>
              Answer:
            </label>
            <textarea
              id={`answer-${q.id}`}
              className="ap-textarea ap-textarea--sm"
              value={q.answer}
              onChange={(e) => updateQuestion(qIndex, "answer", e.target.value)}
              placeholder="Enter the correct answer…"
              rows={3}
            />
          </div>

          {/* Options */}
          <div className="ap-field">
            <label className="ap-label">Option:</label>
            <div className="pq-options">
              {q.options.map((opt, oIndex) => (
                <div key={opt.id} className="pq-option">
                  <input
                    type="text"
                    className="ap-input pq-option__input"
                    value={opt.label}
                    onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                    placeholder="Option text"
                  />
                  <button
                    type="button"
                    className="pq-option__remove"
                    onClick={() => removeOption(qIndex, oIndex)}
                    aria-label="Remove option"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}

              {/* Add option */}
              <button
                type="button"
                className="pq-add-option"
                onClick={() => addOption(qIndex)}
              >
                <Plus size={13} />
                Add option
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* ── Add Question button ── */}
      <button
        type="button"
        className="pq-add-question"
        onClick={addQuestion}
      >
        <Plus size={15} />
        Add Question
      </button>
    </div>
  );
}
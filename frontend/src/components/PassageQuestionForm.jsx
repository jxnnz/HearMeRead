import { Plus, X } from "lucide-react";

// ── Fixed options — always Yes, No, N/A ─────────────────────
const FIXED_OPTIONS = ["Yes", "No", "N/A"];

// ── Blank question template ──────────────────────────────────
function blankQuestion() {
  return {
    id:       crypto.randomUUID(),
    question: "",
    answer:   "",
  };
}

// ============================================================
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

  // ============================================================
  return (
    <div className="ap-card">
      <h2 className="ap-card__title">Passage Questions</h2>
      <p className="ap-card__subtitle">Enter the comprehension questions.</p>

      {/* ── Question blocks ── */}
      {questions.map((q, qIndex) => (
        <div key={q.id} className="pq-block">

          {/* Question header */}
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
              onChange={(e) =>
                updateQuestion(qIndex, "question", e.target.value)
              }
              placeholder="e.g. Sino ang pangunahing tauhan sa kwento?"
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
              onChange={(e) =>
                updateQuestion(qIndex, "answer", e.target.value)
              }
              placeholder="Enter the correct answer…"
              rows={3}
            />
          </div>

          {/* Fixed options — Yes, No, N/A (display only, not editable) */}
          <div className="ap-field">
            <label className="ap-label">Options:</label>
            <div className="pq-options">
              {FIXED_OPTIONS.map((opt) => (
                <div key={opt} className="pq-option pq-option--fixed">
                  <span className="pq-option__label">{opt}</span>
                </div>
              ))}
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
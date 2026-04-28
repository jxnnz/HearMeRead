import { ChevronRight } from "lucide-react";
import { OBSERVATION_LEVELS, EXPERIENCE_OPTIONS } from "../data/assessmentConstants";

const ANSWER_OPTIONS = ["Correct", "Wrong", "N/A"];

export default function ComprehensionStep({
  a2Passage,
  answers,
  setAnswers,
  observationLevel,
  setObservationLevel,
  teacherNotes,
  setTeacherNotes,
  learnerExperience,
  setLearnerExperience,
  onSubmit,
}) {
  const questions  = a2Passage?.questions ?? [];
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

      <div className="asp-comp-layout">
        {/* ── Left: Questions ── */}
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

        {/* ── Right: Teacher Observations ── */}
        <div className="asp-obs-panel">
          <h3 className="asp-obs-panel__title">Teacher Observations</h3>

          <div className="asp-obs-section">
            <p className="asp-obs-section__label">Reading Level</p>
            {OBSERVATION_LEVELS.map((level) => (
              <label key={level.value} className="asp-obs-radio">
                <input
                  type="radio"
                  name="observationLevel"
                  value={level.value}
                  checked={observationLevel === level.value}
                  onChange={() => setObservationLevel(level.value)}
                />
                <span className="asp-obs-radio__info">
                  <span className="asp-obs-radio__label">{level.label}</span>
                  <span className="asp-obs-radio__desc">{level.desc}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="asp-obs-section">
            <p className="asp-obs-section__label">Learner Experience</p>
            <div className="asp-exp-row">
              {EXPERIENCE_OPTIONS.map((exp) => (
                <button
                  key={exp.value}
                  type="button"
                  className={`asp-exp-btn${learnerExperience === exp.value ? " asp-exp-btn--active" : ""}`}
                  onClick={() => setLearnerExperience(exp.value)}
                >
                  <span className="asp-exp-btn__emoji">{exp.emoji}</span>
                  <span className="asp-exp-btn__label">{exp.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="asp-obs-section">
            <p className="asp-obs-section__label">Teacher Notes</p>
            <textarea
              className="asp-obs-textarea"
              placeholder="Write your observations here…"
              value={teacherNotes}
              onChange={(e) => setTeacherNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>
      </div>

      <button
        className="asp-continue-btn"
        onClick={onSubmit}
        disabled={!allAnswered}
      >
        Submit and View Results <ChevronRight size={16} />
      </button>
    </div>
  );
}

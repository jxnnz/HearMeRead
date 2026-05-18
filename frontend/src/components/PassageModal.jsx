import { X } from "lucide-react";
import "./component css/PassageModal.css";

const GRADE_OPTIONS = [
  { value: "grade_1", label: "Grade 1" },
  { value: "grade_2", label: "Grade 2" },
  { value: "grade_3", label: "Grade 3" },
];

export default function PassageModal({
  mode,
  assessmentType,
  form,
  setForm,
  onSubmit,
  onClose,
  saving,
  formError,
}) {
  const isA1 = assessmentType === 1;

  function update(field, val) {
    setForm((prev) => ({ ...prev, [field]: val }));
  }

  const wordCount = (form.content ?? "").trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal__header">
          <h2>Edit {isA1 ? "Assessment 1" : "Assessment 2"}</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form className="modal__form" onSubmit={onSubmit}>

          {formError && (
            <div className="modal__error" role="alert">{formError}</div>
          )}

          {/* Language + Grade row (both types) */}
          <div className="field-row">
            <div className="field">
              <label htmlFor="passage-language">Language <span className="req">*</span></label>
              <select
                id="passage-language"
                value={form.language}
                onChange={(e) => update("language", e.target.value)}
              >
                <option value="filipino">Filipino</option>
                <option value="english">English</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="passage-grade">Grade Level <span className="req">*</span></label>
              <select
                id="passage-grade"
                value={form.grade_level}
                onChange={(e) => update("grade_level", e.target.value)}
              >
                {GRADE_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {isA1 ? (
            <>
              {/* Assessment 1 fields */}
              <div className="field">
                <label htmlFor="a1-task1">Task 1 — Reading Passage <span className="req">*</span></label>
                <textarea
                  id="a1-task1"
                  value={form.task1_content}
                  onChange={(e) => update("task1_content", e.target.value)}
                  placeholder="Paste the reading passage here…"
                  rows={5}
                />
              </div>
              <div className="field">
                <label htmlFor="a1-words">Task 2 — Words <span className="req">*</span></label>
                <textarea
                  id="a1-words"
                  value={form.task2_words}
                  onChange={(e) => update("task2_words", e.target.value)}
                  placeholder="Comma-separated words…"
                  rows={3}
                />
              </div>
              <div className="field">
                <label htmlFor="a1-sentences">Task 2 — Sentences <span className="req">*</span></label>
                <textarea
                  id="a1-sentences"
                  value={form.task2_sentences}
                  onChange={(e) => update("task2_sentences", e.target.value)}
                  placeholder="One sentence per line…"
                  rows={3}
                />
              </div>
            </>
          ) : (
            <>
              {/* Assessment 2 fields */}
              <div className="field">
                <label htmlFor="passage-title">Title <span className="req">*</span></label>
                <input
                  id="passage-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="e.g. Ang Pagong at ang Matsing"
                />
              </div>
              <div className="field">
                <label htmlFor="passage-content">
                  Passage Content <span className="req">*</span>
                  <span className="field__hint">{wordCount} words</span>
                </label>
                <textarea
                  id="passage-content"
                  value={form.content}
                  onChange={(e) => update("content", e.target.value)}
                  placeholder="Paste or type the reading passage here…"
                  rows={8}
                />
              </div>
            </>
          )}

          {/* Footer buttons */}
          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
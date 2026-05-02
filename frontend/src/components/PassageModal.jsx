import { X } from "lucide-react";
import "./component css/PassageModal.css";

export default function PassageModal({
  mode, //  "add", "edit"
  form, // { title, content, language, grade_level }
  setForm, // state setter
  onSubmit, // form submit handler
  onClose, // close modal handler
  saving, // boolean, disables submit while API call runs
  formError, // string | null, displays error inside modal
}) {
  function update(field, val) {
    setForm((prev) => ({ ...prev, [field]: val }));
  }

  // Live word count shown next to the content label
  const wordCount = form.content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="modal__header">
          <h2>{mode === "add" ? "Add New Passage" : "Edit Passage"}</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* ── Form ── */}
        <form className="modal__form" onSubmit={onSubmit}>

          {/* Error banner */}
          {formError && (
            <div className="modal__error" role="alert">
              {formError}
            </div>
          )}

          {/* Title */}
          <div className="field">
            <label htmlFor="passage-title">
              Title <span className="req">*</span>
            </label>
            <input
              id="passage-title"
              type="text"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Ang Pagong at ang Matsing"
              autoFocus
            />
          </div>

          {/* Language + Grade row */}
          <div className="field-row">
            <div className="field">
              <label htmlFor="passage-language">
                Language <span className="req">*</span>
              </label>
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
              <label htmlFor="passage-grade">
                Grade Level <span className="req">*</span>
              </label>
              <select
                id="passage-grade"
                value={form.grade_level}
                onChange={(e) => update("grade_level", e.target.value)}
              >
                {[
                  { value: "grade_1", label: "Grade 1" },
                  { value: "grade_2", label: "Grade 2" },
                  { value: "grade_3", label: "Grade 3" },
                  { value: "grade_4", label: "Grade 4" },
                  { value: "grade_5", label: "Grade 5" },
                  { value: "grade_6", label: "Grade 6" },
                ].map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Content */}
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

          {/* Footer buttons */}
          <div className="modal__footer">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={saving}
            >
              {saving
                ? "Saving…"
                : mode === "add"
                ? "Add Passage"
                : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
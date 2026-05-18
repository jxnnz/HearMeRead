// ============================================================
// HearMeRead — PassageDetailsForm Component
// Renders the "Passage Details" card section
// Props:
//   form     — { title, grade_level, difficulty, language, content }
//   setForm  — state setter
// ============================================================
export default function PassageDetailsForm({ form, setForm }) {
  function update(field, val) {
    setForm((prev) => ({ ...prev, [field]: val }));
  }

  const wordCount = form.content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="ap-card">
      <h2 className="ap-card__title">Passage Details</h2>
      <p className="ap-card__subtitle">Enter the passage details.</p>

      {/* Passage Title */}
      <div className="ap-field">
        <label className="ap-label" htmlFor="passage-title">
          Passage Title:
        </label>
        <input
          id="passage-title"
          type="text"
          className="ap-input"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="e.g. Ang Pagong at ang Matsing"
        />
      </div>

      {/* Grade Level + Level of Difficulty */}
      <div className="ap-row">
        <div className="ap-field">
          <label className="ap-label" htmlFor="passage-grade">
            Grade Level:
          </label>
          <select
            id="passage-grade"
            className="ap-input"
            value={form.grade_level}
            onChange={(e) => update("grade_level", e.target.value)}
          >
            {["1", "2", "3"].map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </div>

        <div className="ap-field">
          <label className="ap-label" htmlFor="passage-difficulty">
            Level of Difficulty:
          </label>
          <select
            id="passage-difficulty"
            className="ap-input"
            value={form.difficulty}
            onChange={(e) => update("difficulty", e.target.value)}
          >
            <option value="easy">Easy</option>
            <option value="average">Average</option>
            <option value="difficult">Difficult</option>
          </select>
        </div>
      </div>

      {/* Language */}
      <div className="ap-field ap-field--half">
        <label className="ap-label" htmlFor="passage-language">
          Language:
        </label>
        <select
          id="passage-language"
          className="ap-input"
          value={form.language}
          onChange={(e) => update("language", e.target.value)}
        >
          <option value="filipino">Filipino</option>
          <option value="english">English</option>
        </select>
      </div>

      {/* Passage Content */}
      <div className="ap-field">
        <label className="ap-label" htmlFor="passage-content">
          Passage Content:
          <span className="ap-word-count">{wordCount} words</span>
        </label>
        <textarea
          id="passage-content"
          className="ap-textarea"
          value={form.content}
          onChange={(e) => update("content", e.target.value)}
          placeholder="Type or paste the reading passage here…"
          rows={8}
        />
      </div>
    </div>
  );
}
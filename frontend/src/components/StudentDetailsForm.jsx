export default function StudentDetailsForm({ form, setForm }) {
  function update(field, val) {
    setForm((prev) => ({ ...prev, [field]: val }));
  }

  return (
    <div className="as-card">
      <h2 className="as-card__title">Student Details</h2>
      <p className="as-card__subtitle">Enter the student details.</p>

      {/* ── Row 1: LRN + Sex ── */}
      <div className="as-row as-row--lrn-sex">
        <div className="as-field as-field--lrn">
          <label className="as-label" htmlFor="student-lrn">LRN:</label>
          <input
            id="student-lrn"
            type="text"
            className="as-input"
            value={form.lrn}
            onChange={(e) => update("lrn", e.target.value)}
            placeholder="Learner Reference Number"
            maxLength={12}
          />
        </div>

        <div className="as-field as-field--sex">
          <label className="as-label">Sex:</label>
          <div className="as-radio-group">
            {["Female", "Male"].map((option) => (
              <label key={option} className="as-radio-label">
                <input
                  type="radio"
                  name="sex"
                  value={option.toLowerCase()}
                  checked={form.sex === option.toLowerCase()}
                  onChange={() => update("sex", option.toLowerCase())}
                  className="as-radio"
                />
                {option}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 2: First Name + Last Name ── */}
      <div className="as-row">
        <div className="as-field">
          <label className="as-label" htmlFor="student-firstname">
            First Name:
          </label>
          <input
            id="student-firstname"
            type="text"
            className="as-input"
            value={form.first_name}
            onChange={(e) => update("first_name", e.target.value)}
            placeholder="First name"
            required
          />
        </div>

        <div className="as-field">
          <label className="as-label" htmlFor="student-lastname">
            Last Name:
          </label>
          <input
            id="student-lastname"
            type="text"
            className="as-input"
            value={form.last_name}
            onChange={(e) => update("last_name", e.target.value)}
            placeholder="Last name"
            required
          />
        </div>
      </div>

      {/* ── Row 3: Grade Level + Section ── */}
      <div className="as-row">
        <div className="as-field">
          <label className="as-label" htmlFor="student-grade">
            Grade Level:
          </label>
          <select
            id="student-grade"
            className="as-input"
            value={form.grade_level}
            onChange={(e) => update("grade_level", e.target.value)}
          >
            <option value="">Select grade</option>
            {["1", "2", "3"].map((g) => (
              <option key={g} value={g}>Grade {g}</option>
            ))}
          </select>
        </div>

        <div className="as-field">
          <label className="as-label" htmlFor="student-section">
            Section:
          </label>
          <input
            id="student-section"
            type="text"
            className="as-input"
            value={form.section}
            onChange={(e) => update("section", e.target.value)}
            placeholder="e.g. Sampaguita"
          />
        </div>
      </div>

      {/* ── Row 4: Teacher (full width) ── */}
      <div className="as-field as-field--full">
        <label className="as-label" htmlFor="student-teacher">
          Teacher:
        </label>
        <input
          id="student-teacher"
          type="text"
          className="as-input"
          value={form.teacher}
          onChange={(e) => update("teacher", e.target.value)}
          placeholder="Teacher's name"
        />
      </div>
    </div>
  );
}
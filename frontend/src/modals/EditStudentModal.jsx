import { useState, useEffect } from "react";
import { X } from "lucide-react";
import "./EditStudentModal.css";

const EMPTY_FORM = {
  first_name:  "",
  last_name:   "",
  lrn:         "",
  sex:         "female",
  grade_level: "",
  section:     "",
};

/**
 * EditStudentModal — popup form to edit a student's basic info
 *
 * Props:
 *   isOpen   : boolean
 *   student  : student object to prefill the form
 *   onClose  : () => void
 *   onSave   : (updatedFields) => void
 *   saving   : boolean  (shows loading state on Save button)
 *   error    : string | null
 */
export default function EditStudentModal({
  isOpen,
  student,
  onClose,
  onSave,
  saving = false,
  error  = null,
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (isOpen && student) {
      setForm({
        first_name:  student.first_name  ?? "",
        last_name:   student.last_name   ?? "",
        lrn:         student.lrn         ?? "",
        sex:         student.sex         ?? "female",
        grade_level: String(student.grade_level ?? ""),
        section:     student.section     ?? "",
      });
    }
  }, [isOpen, student]);

  if (!isOpen) return null;

  function update(field, val) {
    setForm((prev) => ({ ...prev, [field]: val }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ ...form, grade_level: parseInt(form.grade_level, 10) || form.grade_level });
  }

  return (
    <div className="esm-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="esm-title">
      <div className="esm-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="esm-header">
          <h3 className="esm-title" id="esm-title">Edit Student</h3>
          <button className="esm-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="esm-error" role="alert">{error}</div>
        )}

        {/* ── Form ── */}
        <form className="esm-form" onSubmit={handleSubmit}>

          {/* Row 1: LRN + Sex */}
          <div className="esm-row">
            <div className="esm-field">
              <label className="esm-label" htmlFor="esm-lrn">LRN</label>
              <input
                id="esm-lrn"
                type="text"
                className="esm-input"
                value={form.lrn}
                onChange={(e) => update("lrn", e.target.value.replace(/\D/g, ""))}
                placeholder="Learner Reference Number"
                maxLength={12}
              />
            </div>

            <div className="esm-field">
              <label className="esm-label">Sex</label>
              <div className="esm-radio-group">
                {["female", "male"].map((opt) => (
                  <label key={opt} className="esm-radio-label">
                    <input
                      type="radio"
                      name="esm-sex"
                      value={opt}
                      checked={form.sex === opt}
                      onChange={() => update("sex", opt)}
                    />
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: First Name + Last Name */}
          <div className="esm-row">
            <div className="esm-field">
              <label className="esm-label" htmlFor="esm-firstname">First Name</label>
              <input
                id="esm-firstname"
                type="text"
                className="esm-input"
                value={form.first_name}
                onChange={(e) => update("first_name", e.target.value)}
                placeholder="First name"
                required
              />
            </div>
            <div className="esm-field">
              <label className="esm-label" htmlFor="esm-lastname">Last Name</label>
              <input
                id="esm-lastname"
                type="text"
                className="esm-input"
                value={form.last_name}
                onChange={(e) => update("last_name", e.target.value)}
                placeholder="Last name"
                required
              />
            </div>
          </div>

          {/* Row 3: Grade Level + Section */}
          <div className="esm-row">
            <div className="esm-field">
              <label className="esm-label" htmlFor="esm-grade">Grade Level</label>
              <select
                id="esm-grade"
                className="esm-input"
                value={form.grade_level}
                onChange={(e) => update("grade_level", e.target.value)}
              >
                <option value="">Select grade</option>
                {["1", "2", "3"].map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>
            <div className="esm-field">
              <label className="esm-label" htmlFor="esm-section">Section</label>
              <input
                id="esm-section"
                type="text"
                className="esm-input"
                value={form.section}
                onChange={(e) => update("section", e.target.value)}
                placeholder="e.g. Sampaguita"
              />
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="esm-actions">
            <button type="button" className="esm-btn esm-btn--cancel" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="esm-btn esm-btn--save" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

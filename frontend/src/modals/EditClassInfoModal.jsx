import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { studentsApi } from "../services/api";
import "./EditClassInfoModal.css";

const GRADE_OPTIONS = [
  { value: "grade_1", label: "Grade 1" },
  { value: "grade_2", label: "Grade 2" },
  { value: "grade_3", label: "Grade 3" },
];

export default function EditClassInfoModal({ isOpen, onClose, onSuccess, students, currentGrade, currentSection }) {
  const [gradeLevel, setGradeLevel] = useState(currentGrade ?? "");
  const [section, setSection]       = useState(currentSection ?? "");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState(null);

  if (!isOpen) return null;

  async function handleSave(e) {
    e.preventDefault();
    if (!gradeLevel) { setError("Please select a grade level."); return; }

    setSaving(true);
    setError(null);

    try {
      const payload = {};
      if (gradeLevel !== currentGrade)   payload.grade_level = gradeLevel;
      if (section    !== currentSection) payload.section     = section || null;

      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }

      await Promise.all(students.map((s) => studentsApi.update(s.id, payload)));
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === "string" ? detail
        : Array.isArray(detail)   ? detail.map((d) => d.msg).join(", ")
        : err.message
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ecim-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ecim-modal" onClick={(e) => e.stopPropagation()}>

        <div className="ecim-header">
          <h3 className="ecim-title">Edit Class Info</h3>
          <button className="ecim-close" onClick={onClose} aria-label="Close" disabled={saving}>
            <X size={18} />
          </button>
        </div>

        <p className="ecim-desc">
          Updates will apply to all <strong>{students.length}</strong> student{students.length !== 1 ? "s" : ""} in this class.
        </p>

        {error && (
          <div className="ecim-error">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <form className="ecim-form" onSubmit={handleSave}>
          <div className="ecim-fields">
            <div className="ecim-field">
              <label htmlFor="ecim-grade">Grade Level</label>
              <select
                id="ecim-grade"
                className="ecim-input"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
              >
                <option value="">Select grade</option>
                {GRADE_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="ecim-field">
              <label htmlFor="ecim-section">Section</label>
              <input
                id="ecim-section"
                type="text"
                className="ecim-input"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. Star"
              />
            </div>
          </div>

          <div className="ecim-footer">
            <button type="button" className="ecim-btn ecim-btn--cancel" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="ecim-btn ecim-btn--save" disabled={saving}>
              {saving ? "Saving…" : `Update ${students.length} Student${students.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

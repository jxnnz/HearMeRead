import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import Layout             from "../components/Layout";
import StudentDetailsForm from "../components/StudentDetailsForm";
import { studentsApi }    from "../services/api";

import "./AddStudentPage.css";

const EMPTY_FORM = {
  lrn:         "",
  sex:         "female",
  first_name:  "",
  last_name:   "",
  grade_level: "",
  section:     "",
  teacher:     "",
};

export default function AddStudentPage() {
  const navigate = useNavigate();

  const [form, setForm]   = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  // ── Validation ───────────────────────────────────────────
  function validate() {
    if (!form.first_name.trim()) { setError("First name is required.");  return false; }
    if (!form.last_name.trim())  { setError("Last name is required.");   return false; }
    if (!form.grade_level)       { setError("Grade level is required."); return false; }
    return true;
  }

  // ── Save ─────────────────────────────────────────────────
  async function handleSave() {
    setError(null);
    if (!validate()) return;

    setSaving(true);
    try {
      await studentsApi.create({
        lrn:         form.lrn.trim() || null,
        sex:         form.sex,
        first_name:  form.first_name.trim(),
        last_name:   form.last_name.trim(),
        grade_level: parseInt(form.grade_level, 10),
        section:     form.section.trim() || null,
        teacher:     form.teacher.trim() || null,
      });
      navigate("/students");
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Failed to save student.");
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <Layout>
      <div className="as-page">

        {/* ── Top bar: back arrow + title ── */}
        <div className="as-topbar">
          <button
            className="as-back-btn"
            onClick={() => navigate("/students")}
            aria-label="Go back"
          >
            <ChevronLeft size={18} />
          </button>
          <h1 className="as-page__title">Add Student</h1>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="as-error" role="alert">{error}</div>
        )}

        {/* ── Student Details form card ── */}
        <StudentDetailsForm form={form} setForm={setForm} />

        {/* ── Footer buttons (outside the card) ── */}
        <div className="as-footer">
          <button
            className="as-btn as-btn--cancel"
            onClick={() => navigate("/students")}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="as-btn as-btn--save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Student"}
          </button>
        </div>

      </div>
    </Layout>
  );
}
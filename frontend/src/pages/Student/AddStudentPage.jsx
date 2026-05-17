import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import Layout                              from "../../components/Layout";
import StudentDetailsForm, { currentSchoolYear } from "../../components/StudentDetailsForm";
import { studentsApi, authApi }                    from "../../services/api";

import "../pages css/AddStudentPage.css";

const EMPTY_FORM = {
  lrn:         "",
  sex:         "female",
  first_name:  "",
  last_name:   "",
  grade_level: "",
  section:     "",
  school_year: currentSchoolYear(),
};

export default function AddStudentPage() {
  const navigate = useNavigate();

  const [form, setForm]   = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  useEffect(() => {
    authApi.me().then((user) => {
      setForm((prev) => ({
        ...prev,
        grade_level: user.grade_level || prev.grade_level,
        section: user.section || prev.section,
      }));
    }).catch((err) => {
      console.error("Failed to load teacher profile for autofill", err);
    });
  }, []);

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
        first_name:  form.first_name.trim(),
        last_name:   form.last_name.trim(),
        grade_level: form.grade_level,
        section:     form.section.trim() || null,
        sex:         form.sex || null,
        lrn:         form.lrn.trim() || null,
        school_year: form.school_year || null,
      });
      navigate("/students");
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d) => d.msg).join("; ")
        : (typeof detail === "string" ? detail : null);
      setError(msg || err.message || "Failed to save student.");
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
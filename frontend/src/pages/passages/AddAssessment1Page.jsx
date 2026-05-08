import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import Layout from "../../components/Layout";
import { passagesApi } from "../../services/api";
import { parseApiError } from "../../utils/apiError";
import "../pages css/AddPassagePage.css";

const EMPTY_FORM = {
  language: "filipino",
  grade_level: "grade_1",
  task1_content: "",
  task2_words: "",
  task2_sentences: "",
};

export default function AddAssessment1Page() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function update(field, val) {
    setForm((prev) => ({ ...prev, [field]: val }));
  }

  function validate() {
    if (!form.task1_content.trim()) {
      setError("Task 1 content is required.");
      return false;
    }
    if (!form.task2_words.trim()) {
      setError("Task 2 Words content is required.");
      return false;
    }
    if (!form.task2_sentences.trim()) {
      setError("Task 2 Sentences content is required.");
      return false;
    }
    return true;
  }

  async function handleSave() {
    setError(null);
    if (!validate()) return;
    setSaving(true);
    try {
      await passagesApi.create({
        language:        form.language,
        grade_level:     form.grade_level,
        assessment_type: 1,
        task1_content:   form.task1_content.trim(),
        task2_words:     form.task2_words.trim(),
        task2_sentences: form.task2_sentences.trim(),
      });
      navigate("/passages");
    } catch (err) {
      setError(parseApiError(err, "Failed to save passage. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="ap-page">

        {/* ── Top bar ── */}
        <div className="ap-topbar">
          <div className="ap-topbar__left">
            <button
              className="ap-back-btn"
              onClick={() => navigate("/passages")}
              aria-label="Go back"
            >
              <ChevronLeft size={18} />
            </button>
            <h1 className="ap-page__title">Add Assessment 1</h1>
          </div>
          <button className="ap-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {/* ── Error banner ── */}
        {error && <div className="ap-error" role="alert">{error}</div>}

        {/* ── Language & Grade Level Card ── */}
        <div className="ap-card">
          <h2 className="ap-card__title">Language &amp; Grade Level</h2>
          <div className="ap-row">
            <div className="ap-field">
              <label className="ap-label" htmlFor="a1-language">Language:</label>
              <select
                id="a1-language"
                className="ap-input"
                value={form.language}
                onChange={(e) => update("language", e.target.value)}
              >
                <option value="filipino">Filipino</option>
                <option value="english">English</option>
              </select>
            </div>
            <div className="ap-field">
              <label className="ap-label" htmlFor="a1-grade">Grade Level:</label>
              <select
                id="a1-grade"
                className="ap-input"
                value={form.grade_level}
                onChange={(e) => update("grade_level", e.target.value)}
              >
                {[
                  { value: "grade_1", label: "Grade 1" },
                  { value: "grade_2", label: "Grade 2" },
                  { value: "grade_3", label: "Grade 3" },
                ].map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="a1-note">
            Use a <strong>comma (,)</strong> to separate words in Task 2 Words,
            and a <strong>period (.)</strong> to separate sentences in Task 2 Sentences.
          </p>
        </div>

        {/* ── Task 1 Card ── */}
        <div className="ap-card">
          <h2 className="ap-card__title">Task 1</h2>
          <div className="ap-field">
            <label className="ap-label" htmlFor="a1-task1">Content:</label>
            <textarea
              id="a1-task1"
              className="ap-textarea"
              value={form.task1_content}
              onChange={(e) => update("task1_content", e.target.value)}
              placeholder="Type or paste the reading passage for Task 1…"
              rows={6}
            />
          </div>
        </div>

        {/* ── Task 2 Words Card ── */}
        <div className="ap-card">
          <h2 className="ap-card__title">Task 2 — Words</h2>
          <p className="ap-card__subtitle">Separate each word with a comma (e.g. aso, bata, pusa).</p>
          <div className="ap-field">
            <label className="ap-label" htmlFor="a1-words">Words:</label>
            <textarea
              id="a1-words"
              className="ap-textarea"
              value={form.task2_words}
              onChange={(e) => update("task2_words", e.target.value)}
              placeholder="e.g. aso, bata, pusa, bahay, tubig"
              rows={4}
            />
          </div>
        </div>

        {/* ── Task 2 Sentences Card ── */}
        <div className="ap-card">
          <h2 className="ap-card__title">Task 2 — Sentences</h2>
          <p className="ap-card__subtitle">Separate each sentence with a period (e.g. Ang bata ay masaya. Siya ay mabait.).</p>
          <div className="ap-field">
            <label className="ap-label" htmlFor="a1-sentences">Sentences:</label>
            <textarea
              id="a1-sentences"
              className="ap-textarea"
              value={form.task2_sentences}
              onChange={(e) => update("task2_sentences", e.target.value)}
              placeholder="e.g. Ang bata ay masaya. Mahal ko ang aking pamilya."
              rows={4}
            />
          </div>
        </div>

      </div>
    </Layout>
  );
}

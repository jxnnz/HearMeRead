import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, X, Upload, FileText } from "lucide-react";

import Layout from "../../components/Layout";
import { passagesApi, questionsApi } from "../../services/api";
import { parseApiError } from "../../utils/apiError";
import "../pages css/AddPassagePage.css";

const EMPTY_DETAILS = {
  title: "",
  grade_level: "grade_2",
  language: "filipino",
  content: "",
};

function blankQuestion() {
  return {
    id: crypto.randomUUID(),
    question: "",
    answer: "",
  };
}

export default function AddAssessment2Page() {
  const navigate = useNavigate();

  const [details, setDetails]     = useState(EMPTY_DETAILS);
  const [questions, setQuestions] = useState([blankQuestion()]);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);

  function updateDetails(field, val) {
    setDetails((prev) => ({ ...prev, [field]: val }));
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, blankQuestion()]);
  }

  function removeQuestion(index) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQuestion(index, field, val) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: val } : q))
    );
  }

  function validate() {
    if (!details.title.trim())   { setError("Passage title is required.");   return false; }
    if (!details.content.trim()) { setError("Passage content is required."); return false; }
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question.trim()) {
        setError(`Question ${i + 1} text is required.`);
        return false;
      }
    }
    return true;
  }

  async function handleSave() {
    setError(null);
    if (!validate()) return;
    setSaving(true);
    try {
      const passage = await passagesApi.create({
        title:           details.title.trim(),
        content:         details.content.trim(),
        language:        details.language,
        grade_level:     details.grade_level,
        assessment_type: 2,
      });

      for (const q of questions) {
        if (!q.question.trim()) continue;
        await questionsApi.create(passage.id, {
          text:       q.question.trim(),
          answer_key: q.answer.trim() || null,
        });
      }

      navigate("/passages");
    } catch (err) {
      setError(parseApiError(err, "Failed to save passage. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  const wordCount = details.content.trim().split(/\s+/).filter(Boolean).length;

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
            <h1 className="ap-page__title">Add Assessment 2</h1>
          </div>
          <button className="ap-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Passage"}
          </button>
        </div>

        {/* ── Error banner ── */}
        {error && <div className="ap-error" role="alert">{error}</div>}

        {/* ── Passage Details Card ── */}
        <div className="ap-card">
          <h2 className="ap-card__title">Passage Details</h2>
          <p className="ap-card__subtitle">Enter the passage details.</p>

          {/* Title */}
          <div className="ap-field">
            <label className="ap-label" htmlFor="a2-title">Passage Title:</label>
            <input
              id="a2-title"
              type="text"
              className="ap-input"
              value={details.title}
              onChange={(e) => updateDetails("title", e.target.value)}
              placeholder="e.g. Ang Pagong at ang Matsing"
            />
          </div>

          {/* Grade Level + Language side by side */}
          <div className="ap-row">
            <div className="ap-field">
              <label className="ap-label" htmlFor="a2-grade">Grade Level:</label>
              <select
                id="a2-grade"
                className="ap-input"
                value={details.grade_level}
                onChange={(e) => updateDetails("grade_level", e.target.value)}
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

            <div className="ap-field">
              <label className="ap-label" htmlFor="a2-language">Language:</label>
              <select
                id="a2-language"
                className="ap-input"
                value={details.language}
                onChange={(e) => updateDetails("language", e.target.value)}
              >
                <option value="filipino">Filipino</option>
                <option value="english">English</option>
              </select>
            </div>
          </div>

          {/* Content */}
          <div className="ap-card__header-row" style={{ marginBottom: -8 }}>
            <span />
            <button type="button" className="ap-upload-btn" onClick={() => {
              const input = document.createElement("input");
              input.type = "file"; input.accept = ".txt";
              input.onchange = (e) => {
                const file = e.target.files[0]; if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => updateDetails("content", ev.target.result);
                reader.readAsText(file);
              };
              input.click();
            }} title="Upload from .txt file">
              <Upload size={14} /> Upload .txt
            </button>
          </div>
          <div className="ap-field">
            <label className="ap-label" htmlFor="a2-content">
              Passage Content:
              <span className="ap-word-count">{wordCount} words</span>
            </label>
            <textarea
              id="a2-content"
              className="ap-textarea"
              value={details.content}
              onChange={(e) => updateDetails("content", e.target.value)}
              placeholder="Type or paste the reading passage here…"
              rows={8}
            />
          </div>
        </div>

        {/* ── Passage Questions Card ── */}
        <div className="ap-card">
          <h2 className="ap-card__title">Passage Questions</h2>
          <p className="ap-card__subtitle">Enter the comprehension questions.</p>

          {questions.map((q, qIndex) => (
            <div key={q.id} className="pq-block">
              <div className="pq-block__header">
                <span className="pq-block__num">Question {qIndex + 1}</span>
                {questions.length > 1 && (
                  <button
                    type="button"
                    className="pq-block__remove"
                    onClick={() => removeQuestion(qIndex)}
                    aria-label={`Remove question ${qIndex + 1}`}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="ap-field">
                <label className="ap-label" htmlFor={`question-${q.id}`}>Question:</label>
                <input
                  id={`question-${q.id}`}
                  type="text"
                  className="ap-input"
                  value={q.question}
                  onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
                  placeholder="e.g. Sino ang pangunahing tauhan sa kwento?"
                />
              </div>

              <div className="ap-field">
                <label className="ap-label" htmlFor={`answer-${q.id}`}>Answer:</label>
                <textarea
                  id={`answer-${q.id}`}
                  className="ap-textarea ap-textarea--sm"
                  value={q.answer}
                  onChange={(e) => updateQuestion(qIndex, "answer", e.target.value)}
                  placeholder="Enter the correct answer…"
                  rows={3}
                />
              </div>
            </div>
          ))}

          <button type="button" className="pq-add-question" onClick={addQuestion}>
            <Plus size={15} />
            Add Question
          </button>
        </div>

      </div>
    </Layout>
  );
}

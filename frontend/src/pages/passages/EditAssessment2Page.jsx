import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Plus, X } from "lucide-react";

import Layout from "../../components/Layout";
import { passagesApi, questionsApi } from "../../services/api";
import "../pages css/AddPassagePage.css";

function parseStoryTitle(t) {
  if (!t) return { num: "1", title: "" };
  const m = t.match(/^Story\s*(\d+)\s*:\s*(.+)$/i);
  return m ? { num: m[1], title: m[2] } : { num: "1", title: t };
}

export default function EditAssessment2Page() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [storyNum, setStoryNum] = useState("1");
  const [details, setDetails] = useState({
    title: "", grade_level: "grade_2", language: "filipino", content: "",
  });
  const [questions, setQuestions] = useState([]);
  const [removedIds, setRemovedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    passagesApi
      .get(id)
      .then((p) => {
        const { num, title } = parseStoryTitle(p.title ?? "");
        setStoryNum(num);
        setDetails({
          title,
          grade_level: p.grade_level ?? "grade_2",
          language:    p.language    ?? "filipino",
          content:     p.content     ?? "",
        });
        setQuestions(
          (p.questions ?? [])
            .filter((q) => !q.is_archived)
            .map((q) => ({
              localId:    crypto.randomUUID(),
              serverId:   q.id,
              text:       q.text,
              answer_key: q.answer_key ?? "",
            }))
        );
      })
      .catch((e) => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, [id]);

  function updateDetails(field, val) {
    setDetails((prev) => ({ ...prev, [field]: val }));
  }

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      { localId: crypto.randomUUID(), serverId: null, text: "", answer_key: "" },
    ]);
  }

  function removeQuestion(index) {
    const q = questions[index];
    if (q.serverId !== null) {
      setRemovedIds((prev) => [...prev, q.serverId]);
    }
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQuestion(index, field, value) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  }

  function validate() {
    if (!details.title.trim())   { setError("Passage title is required.");   return false; }
    if (!details.content.trim()) { setError("Passage content is required."); return false; }
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].text.trim()) {
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
      await passagesApi.update(id, {
        title:       `Story ${storyNum}: ${details.title.trim()}`,
        content:     details.content.trim(),
        language:    details.language,
        grade_level: details.grade_level,
      });

      for (const serverId of removedIds) {
        await questionsApi.archive(serverId);
      }

      for (const q of questions) {
        const payload = {
          text:       q.text.trim(),
          answer_key: q.answer_key.trim() || null,
        };
        if (q.serverId !== null) {
          await questionsApi.update(q.serverId, payload);
        } else {
          await questionsApi.create(Number(id), payload);
        }
      }

      navigate("/passages");
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setSaving(false);
    }
  }

  const wordCount = details.content.trim().split(/\s+/).filter(Boolean).length;

  if (loading) {
    return (
      <Layout>
        <div className="ap-page">
          <p style={{ padding: "32px", color: "#8a94b2" }}>Loading…</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="ap-page">

        {/* Top bar */}
        <div className="ap-topbar">
          <div className="ap-topbar__left">
            <button
              className="ap-back-btn"
              onClick={() => navigate("/passages")}
              aria-label="Go back"
            >
              <ChevronLeft size={18} />
            </button>
            <h1 className="ap-page__title">Edit Assessment 2</h1>
          </div>
          <button className="ap-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>

        {/* Error banner */}
        {error && <div className="ap-error" role="alert">{error}</div>}

        {/* Passage Details Card */}
        <div className="ap-card">
          <h2 className="ap-card__title">Passage Details</h2>
          <p className="ap-card__subtitle">Update the passage details.</p>

          <div className="ap-row">
            <div className="ap-field" style={{ flex: "0 0 auto", minWidth: 130 }}>
              <label className="ap-label" htmlFor="a2-story-num">Story Number:</label>
              <select
                id="a2-story-num"
                className="ap-input"
                value={storyNum}
                onChange={(e) => setStoryNum(e.target.value)}
              >
                <option value="1">Story 1</option>
                <option value="2">Story 2</option>
              </select>
            </div>
            <div className="ap-field" style={{ flex: 1 }}>
              <label className="ap-label" htmlFor="a2-title">Story Title:</label>
              <input
                id="a2-title"
                type="text"
                className="ap-input"
                value={details.title}
                onChange={(e) => updateDetails("title", e.target.value)}
                placeholder="e.g. Ang Pagong at ang Matsing"
              />
            </div>
          </div>

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

        {/* Questions Card */}
        <div className="ap-card">
          <h2 className="ap-card__title">Passage Questions</h2>
          <p className="ap-card__subtitle">Update the comprehension questions.</p>

          {questions.map((q, qIndex) => (
            <div key={q.localId} className="pq-block">
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
                <label className="ap-label" htmlFor={`question-${q.localId}`}>Question:</label>
                <input
                  id={`question-${q.localId}`}
                  type="text"
                  className="ap-input"
                  value={q.text}
                  onChange={(e) => updateQuestion(qIndex, "text", e.target.value)}
                  placeholder="e.g. Sino ang pangunahing tauhan sa kwento?"
                />
              </div>
              <div className="ap-field">
                <label className="ap-label" htmlFor={`answer-${q.localId}`}>Answer Key:</label>
                <textarea
                  id={`answer-${q.localId}`}
                  className="ap-textarea ap-textarea--sm"
                  value={q.answer_key}
                  onChange={(e) => updateQuestion(qIndex, "answer_key", e.target.value)}
                  placeholder="Enter the correct answer…"
                  rows={2}
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

// ============================================================
// HearMeRead — Add Passage Page
// Full page (not a modal) for creating a new reading passage
// Route: /passages/add
// Connects to: POST /passages, POST /questions (per question)
// ============================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import Layout from "../components/Layout";
import PassageDetailsForm from "../components/PassageDetailsForm";
import PassageQuestionsForm from "../components/PassageQuestionForm";
import { passagesApi } from "../services/api";

import "./pages css/AddPassagePage.css";

// ── Default form state ───────────────────────────────────────
const EMPTY_DETAILS = {
  title: "",
  grade_level: "2",
  difficulty: "average",
  language: "filipino",
  content: "",
};

function blankQuestion() {
  return {
    id: crypto.randomUUID(),
    question: "",
    answer: "",
    options: [
      { id: crypto.randomUUID(), label: "Correct" },
      { id: crypto.randomUUID(), label: "Wrong" },
      { id: crypto.randomUUID(), label: "N/A" },
    ],
  };
}

// ============================================================
// Page Component
// ============================================================
export default function AddPassagePage() {
  const navigate = useNavigate();

  const [details, setDetails]     = useState(EMPTY_DETAILS);
  const [questions, setQuestions] = useState([blankQuestion()]);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);

  // ── Validate before saving ───────────────────────────────
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

  // ── Save passage + questions ─────────────────────────────
  async function handleSave() {
    setError(null);
    if (!validate()) return;

    setSaving(true);
    try {
      // 1. Create the passage
      const passage = await passagesApi.create({
        title:       details.title.trim(),
        content:     details.content.trim(),
        language:    details.language,
        grade_level: parseInt(details.grade_level, 10),
        difficulty:  details.difficulty,
      });

      // 2. Create each question linked to the passage
      //    Adjust the endpoint to match your backend route
      for (const q of questions) {
        if (!q.question.trim()) continue; // skip blank questions
        await passagesApi.createQuestion(passage.id, {
          question: q.question.trim(),
          answer:   q.answer.trim(),
          options:  q.options.map((o) => o.label).filter(Boolean),
        });
      }

      // 3. Navigate back to passages list
      navigate("/passages");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // RENDER
  // ============================================================
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
            <h1 className="ap-page__title">Add Reading Passage</h1>
          </div>

          <button
            className="ap-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Passage"}
          </button>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="ap-error" role="alert">
            {error}
          </div>
        )}

        {/* ── Section 1: Passage Details ── */}
        <PassageDetailsForm form={details} setForm={setDetails} />

        {/* ── Section 2: Passage Questions ── */}
        <PassageQuestionsForm
          questions={questions}
          setQuestions={setQuestions}
        />

      </div>
    </Layout>
  );
}
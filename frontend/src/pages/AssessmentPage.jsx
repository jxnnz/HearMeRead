import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, Mic } from "lucide-react";

import Layout          from "../components/Layout";
import StudentInfoForm from "../components/StudentInfoForm";
import { studentsApi, passagesApi, sessionsApi } from "../services/api";

import "./AssessmentPage.css";

// ── Default form state ───────────────────────────────────────
function initForm() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;
  const schoolYear =
    month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;

  return {
    school_year:     schoolYear,
    assessment_type: "BoSY",
    student_id:      null,
    first_name:      "",
    last_name:       "",
    grade_level:     "",
    section:         "",
    teacher:         "",
    language:        "filipino",
    passage_id:      null,
    passage_title:   "",
  };
}

// ============================================================
export default function AssessmentPage() {
  const [step, setStep]       = useState(1); // 1 = form, 2 = recording
  const [form, setForm]       = useState(initForm());
  const [session, setSession] = useState(null);

  // ── Remote data ──────────────────────────────────────────
  const [students, setStudents]           = useState([]);
  const [passages, setPassages]           = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingPassages, setLoadingPassages] = useState(false);
  const [fetchError, setFetchError]       = useState(null);

  // ── Session create state ─────────────────────────────────
  const [creating, setCreating]   = useState(false);
  const [createError, setCreateError] = useState(null);

  // ── Load students once ───────────────────────────────────
  useEffect(() => {
    studentsApi
      .list()
      .then(setStudents)
      .catch((e) => setFetchError(e.message))
      .finally(() => setLoadingStudents(false));
  }, []);

  // ── Reload passages when language changes ────────────────
  useEffect(() => {
    setLoadingPassages(true);
    passagesApi
      .list({ language: form.language })
      .then((data) => setPassages(data.filter((p) => !p.is_archived)))
      .catch((e) => setFetchError(e.message))
      .finally(() => setLoadingPassages(false));
  }, [form.language]);

  // ── Validation ───────────────────────────────────────────
  function validate() {
    if (!form.student_id)  { setCreateError("Please select a student."); return false; }
    if (!form.passage_id)  { setCreateError("Please select a reading passage."); return false; }
    if (!form.school_year) { setCreateError("School year is required."); return false; }
    return true;
  }

  // ── Continue → create session ────────────────────────────
  async function handleContinue() {
    setCreateError(null);
    if (!validate()) return;
    setCreating(true);
    try {
      const res = await sessionsApi.create({
        student_id:  form.student_id,
        passage_id:  form.passage_id,
        language:    form.language,
        period:      form.assessment_type.toLowerCase(),
        school_year: form.school_year,
      });
      setSession(res.session ?? res);
      setStep(2);
    } catch (err) {
      setCreateError(
        err.response?.data?.detail || err.message || "Failed to create session."
      );
    } finally {
      setCreating(false);
    }
  }

  // ── Summary labels for step 2 ────────────────────────────
  const ASSESSMENT_LABELS = {
    BoSY: "Beginning of School Year",
    MoSY: "Middle of School Year",
    EoSY: "End of School Year",
  };

  // ============================================================
  // STEP 1 — Student Information Form
  // ============================================================
  if (step === 1) {
    return (
      <Layout>
        <div className="asp-page">
          <h1 className="asp-title">Assessment Session</h1>

          {fetchError && (
            <div className="asp-error">{fetchError}</div>
          )}

          {/* ── Student Information card (component) ── */}
          <StudentInfoForm
            form={form}
            setForm={setForm}
            students={students}
            passages={passages}
            loadingStudents={loadingStudents}
            loadingPassages={loadingPassages}
          />

          {/* ── Session create error ── */}
          {createError && (
            <div className="asp-error">{createError}</div>
          )}

          {/* ── Continue button ── */}
          <button
            className="asp-continue-btn"
            onClick={handleContinue}
            disabled={creating || !form.student_id || !form.passage_id}
          >
            {creating ? "Creating session…" : "Continue -->"}
            {!creating && <ChevronRight size={16} />}
          </button>
        </div>
      </Layout>
    );
  }

  // ============================================================
  // STEP 2 — Recording screen (stub for Whisper sprint)
  // ============================================================
  return (
    <Layout>
      <div className="asp-page">
        {/* ── Back button ── */}
        <div className="asp-breadcrumb">
          <button
            className="asp-back-btn"
            onClick={() => setStep(1)}
          >
            <ChevronLeft size={15} /> Back
          </button>
          <span className="asp-step-label">Recording Session</span>
        </div>

        <h1 className="asp-title">Assessment Session</h1>

        {/* ── Session summary bar ── */}
        <div className="asp-summary">
          <div className="asp-summary__item">
            <span className="asp-summary__key">Student</span>
            <span className="asp-summary__val">
              {form.first_name} {form.last_name}
            </span>
          </div>
          <div className="asp-summary__sep" />
          <div className="asp-summary__item">
            <span className="asp-summary__key">School Year</span>
            <span className="asp-summary__val">{form.school_year}</span>
          </div>
          <div className="asp-summary__sep" />
          <div className="asp-summary__item">
            <span className="asp-summary__key">Period</span>
            <span className="asp-summary__val">
              {ASSESSMENT_LABELS[form.assessment_type]}
            </span>
          </div>
          <div className="asp-summary__sep" />
          <div className="asp-summary__item">
            <span className="asp-summary__key">Language</span>
            <span className="asp-summary__val" style={{ textTransform: "capitalize" }}>
              {form.language}
            </span>
          </div>
        </div>

        {/* ── Passage display ── */}
        <div className="asp-passage-card">
          <h3 className="asp-passage-card__title">{form.passage_title}</h3>
          <p className="asp-passage-card__meta">
            Grade {form.grade_level} · {form.language}
          </p>
        </div>

        {/* ── Recording panel stub ── */}
        <div className="asp-recording">
          <div className="asp-recording__icon">
            <Mic size={32} />
          </div>
          <p className="asp-recording__label">Recording Interface</p>
          <p className="asp-recording__hint">
            Whisper ASR integration — coming in the next sprint.
          </p>
          {session?.id && (
            <p className="asp-recording__session">
              Session ID: <code>{session.id}</code>
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}
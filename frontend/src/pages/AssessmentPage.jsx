import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, Mic, Type } from "lucide-react";

import Layout               from "../components/Layout";
import StudentInfoForm      from "../components/StudentInfoForm";
import RecordingChoiceModal from "../modals/RecordingChoiceModal";
import { studentsApi, passagesApi, sessionsApi } from "../services/api";

// For mock data
import { MOCK_STUDENTS, MOCK_PASSAGES } from "../data/mockData";

import "./AssessmentPage.css";

// ── Default form state ───────────────────────────────────────
function initForm() {
  const now        = new Date();
  const year       = now.getFullYear();
  const month      = now.getMonth() + 1;
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
    language:        "filipino",
    passage_id:      null,
    passage_title:   "",
    passage_content: "",
    word_count:      0,
  };
}

const ASSESSMENT_LABELS = {
  BoSY: "Beginning of School Year",
  MoSY: "Middle of School Year",
  EoSY: "End of School Year",
};

// Font size steps for the Aa button
const FONT_SIZES = [15, 18, 22, 26];

// ============================================================
export default function AssessmentPage() {
  const [step, setStep]       = useState(1);
  const [form, setForm]       = useState(initForm());
  const [session, setSession] = useState(null);

  // ── Remote data ──────────────────────────────────────────
  const [students, setStudents]               = useState([]);
  const [passages, setPassages]               = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingPassages, setLoadingPassages] = useState(false);
  const [fetchError, setFetchError]           = useState(null);

  // ── Session state ────────────────────────────────────────
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState(null);

  // ── Recording modal & mode ───────────────────────────────
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [recordingMode, setRecordingMode]     = useState(null);

  // ── Reading screen controls ──────────────────────────────
  const [fontSizeIdx, setFontSizeIdx] = useState(1); // default 18px
  const fontSize = FONT_SIZES[fontSizeIdx];

  // ── Load students on mount ─────────────────────────────── FINAL CODE DO NOT DELETE!!
  /*
  useEffect(() => {
    setLoadingStudents(true);
    studentsApi
      .list()
      .then(setStudents)
      .catch((e) => setFetchError(e.response?.data?.detail || e.message))
      .finally(() => setLoadingStudents(false));
  }, []);

  // ── Reload passages when language changes ────────────────
  useEffect(() => {
    setLoadingPassages(true);
    passagesApi
      .list({ language: form.language })
      .then((data) => setPassages(data.filter((p) => !p.is_archived)))
      .catch((e) => setFetchError(e.response?.data?.detail || e.message))
      .finally(() => setLoadingPassages(false));
  }, [form.language]);
  */

  // ── Mock data (temporary) — DELETE AFTER backend is ready ──
  useEffect(() => {
    setStudents(MOCK_STUDENTS);
    setLoadingStudents(false);
  }, []);

  useEffect(() => {
    setLoadingPassages(true);
    const timer = setTimeout(() => {
      setPassages(
        MOCK_PASSAGES.filter((p) => p.language === form.language)
      );
      setLoadingPassages(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [form.language]);

  // ── Validation ───────────────────────────────────────────
  function validate() {
    if (!form.student_id) { setCreateError("Please select a student.");         return false; }
    return true;
  }

  // ── Continue → create session ──────────────────────────── FINAL CODE DO NOT DELETE!!
  /*
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
      setShowChoiceModal(true);
    } catch (err) {
      setCreateError(
        err.response?.data?.detail || err.message || "Failed to create session."
      );
    } finally {
      setCreating(false);
    }
  }
  */

  // ── Mock session — DELETE AFTER backend is ready ──
  async function handleContinue() {
    setCreateError(null);
    if (!validate()) return;
    setCreating(true);
    await new Promise((res) => setTimeout(res, 400));
    setSession({ id: `MOCK-SESSION-${Date.now()}` });
    setCreating(false);
    setShowChoiceModal(true);
  }

  function handleBack() {
    setStep(1);
    setRecordingMode(null);
    setSession(null);
  }

  function cycleFontSize() {
    setFontSizeIdx((i) => (i + 1) % FONT_SIZES.length);
  }

  // ── Word count from content ──────────────────────────────
  const wordCount =
    form.word_count ||
    form.passage_content.trim().split(/\s+/).filter(Boolean).length ||
    0;

  // ============================================================
  // STEP 1 — Student Information (compact)
  // ============================================================
  if (step === 1) {
    return (
      <Layout>
        <div className="asp-page asp-page--step1">
          <h1 className="asp-title">Assessment Session</h1>

          {fetchError && <div className="asp-error">⚠ {fetchError}</div>}

          <StudentInfoForm
            form={form}
            setForm={setForm}
            students={students}
            passages={passages}
            loadingStudents={loadingStudents}
            loadingPassages={loadingPassages}
          />

          {createError && <div className="asp-error">{createError}</div>}

          <button
            className="asp-continue-btn"
            onClick={handleContinue}
            disabled={creating || !form.student_id}
          >
            {creating ? "Creating session…" : "Continue"}
            {!creating && <ChevronRight size={16} />}
          </button>
        </div>

        <RecordingChoiceModal
          isOpen={showChoiceModal}
          onClose={() => setShowChoiceModal(false)}
          onUpload={() => {
            setRecordingMode("upload");
            setShowChoiceModal(false);
            setStep(2);
          }}
          onLive={() => {
            setRecordingMode("live");
            setShowChoiceModal(false);
            setStep(2);
          }}
        />
      </Layout>
    );
  }

  // ============================================================
  // STEP 2 — Reading Screen (full width, matches mockup)
  // ============================================================
  return (
    <Layout>
      <div className="asp-reading-screen">

        {/* ── Header bar ── */}
        <div className="asp-reading-header">
          <div className="asp-reading-header__left">
            <button
              className="asp-reading-back"
              onClick={handleBack}
              aria-label="Go back"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="asp-reading-header__info">
              <h2 className="asp-reading-title">
                {form.passage_title}
                <span className="asp-reading-wordcount">
                  ({wordCount} words)
                </span>
              </h2>
              <p className="asp-reading-meta">
                {form.first_name} {form.last_name} ·{" "}
                Grade {form.grade_level} ·{" "}
                {ASSESSMENT_LABELS[form.assessment_type]} ·{" "}
                {form.school_year}
              </p>
            </div>
          </div>

          <div className="asp-reading-header__right">
            {/* Font size toggle */}
            <button
              className="asp-reading-ctrl"
              onClick={cycleFontSize}
              aria-label="Change font size"
            >
              <Type size={15} />
              <span>Aa</span>
              <span className="asp-ctrl-size">{fontSize}px</span>
            </button>

            {/* Record / mode button */}
            <button
              className={`asp-reading-ctrl asp-reading-ctrl--mic${
                recordingMode ? " asp-reading-ctrl--active" : ""
              }`}
              onClick={() =>
                recordingMode
                  ? setRecordingMode(null)
                  : setShowChoiceModal(true)
              }
              aria-label={recordingMode ? "Stop recording" : "Start recording"}
            >
              <Mic size={16} />
            </button>
          </div>
        </div>

        {/* ── Passage content (large, scrollable) ── */}
        <div className="asp-reading-body">
          {form.passage_content ? (
            <p
              className="asp-reading-text"
              style={{ fontSize: `${fontSize}px` }}
            >
              {form.passage_content}
            </p>
          ) : (
            <p className="asp-reading-empty">No passage content available.</p>
          )}
        </div>

        {/* ── Bottom mic button ── */}
        <div className="asp-reading-footer">
          {!recordingMode ? (
            <button
              className="asp-mic-btn"
              onClick={() => setShowChoiceModal(true)}
              aria-label="Start assessment"
            >
              <Mic size={24} />
            </button>
          ) : (
            <div className="asp-recording-active">
              <div
                className="asp-mic-btn asp-mic-btn--recording"
                aria-label="Recording active"
              >
                <Mic size={24} />
              </div>
              <p className="asp-recording-mode-label">
                {recordingMode === "live"
                  ? "Live recording active…"
                  : "Upload mode selected"}
              </p>
              <button
                className="asp-recording-cancel"
                onClick={() => setRecordingMode(null)}
              >
                Cancel
              </button>
            </div>
          )}

          {session?.id && (
            <p className="asp-session-id">
              Session: <code>{session.id}</code>
            </p>
          )}
        </div>
      </div>

      {/* ── Recording Choice Modal ── */}
      <RecordingChoiceModal
        isOpen={showChoiceModal}
        onClose={() => setShowChoiceModal(false)}
        onUpload={() => {
          setRecordingMode("upload");
          setShowChoiceModal(false);
          setStep(2);
        }}
        onLive={() => {
          setRecordingMode("live");
          setShowChoiceModal(false);
          setStep(2);
        }}
      />
    </Layout>
  );
}
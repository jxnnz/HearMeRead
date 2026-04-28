import { useState, useEffect, useRef } from "react";
import { ChevronRight, ChevronLeft, Mic, Type, CheckCircle } from "lucide-react";

import Layout               from "../components/Layout";
import StudentInfoForm      from "../components/StudentInfoForm";
import RecordingChoiceModal from "../modals/RecordingChoiceModal";
import RetakeModal          from "../modals/RetakeModal";
import TimeLimitModal       from "../modals/TimeLimitModal";
import RecordingTimer       from "../components/RecordingTimer";
import ComprehensionStep    from "../components/ComprehensionStep";
import ResultsStep          from "../components/ResultsStep";

import "./pages css/AssessmentPage.css";

// ── Assessment step constants ────────────────────────────────
// Flow:
//  INFO → A1_G1 → A1_G1_SCORE
//    score 0–6  → A1_G2 (words)    → A1_G2_SCORE → RESULTS (stop)
//    score 7–10 → A1_G2 (sentences)→ A1_G2_SCORE → A2_SELECT → A2 → COMPREHENSION → RESULTS
const STEPS = {
  INFO:          "info",
  A1_G1:         "a1_g1",
  A1_G1_SCORE:   "a1_g1_score",
  A1_G2:         "a1_g2",
  A1_G2_SCORE:   "a1_g2_score",
  A2_SELECT:     "a2_select",
  A2:            "a2",
  COMPREHENSION: "comprehension",
  RESULTS:       "results",
};

// Step header labels shown on the reading screen badge
const STEP_LABELS = {
  [STEPS.A1_G1]: "Assessment 1 — Gawain 1",
  [STEPS.A1_G2]: "Assessment 1 — Gawain 2",
  [STEPS.A2]:    "Assessment 2",
};

const FONT_SIZES = [15, 18, 22, 26];


function initForm() {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth() + 1;
  return {
    school_year:     m >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}`,
    assessment_type: "BoSY",
    student_id:      null,
    first_name:      "",
    last_name:       "",
    grade_level:     "",
    section:         "",
    language:        "filipino",
    // A1G1 passage (teacher selects in step 1)
    passage_id:      null,
    passage_title:   "",
    passage_content: "",
    word_count:      0,
  };
}

// ── Auto-select the correct G2 passage based on G1 score ─────
function pickG2Passage(allPassages, language, g1Score) {
  const type = g1Score <= 6 ? "a1_g2_words" : "a1_g2_sentences";
  return allPassages.find(
    (p) => p.passage_type === type && p.language === language
  ) ?? null;
}

// ============================================================
export default function AssessmentPage() {
  const [step, setStep] = useState(STEPS.INFO);
  const [form, setForm] = useState(initForm());

  // ── Remote data ──────────────────────────────────────────
  const [students, setStudents]               = useState([]);
  const [allPassages, setAllPassages]         = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingPassages, setLoadingPassages] = useState(false);
  const [fetchError, setFetchError]           = useState(null);

  // ── Session ──────────────────────────────────────────────
  const [session, setSession]         = useState(null);
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState(null);

  // ── Scores (set by backend / editable by teacher) ────────
  const [g1Score, setG1Score] = useState("");
  const [g2Score, setG2Score] = useState("");

  // ── Passages for each sub-step ───────────────────────────
  const [g2Passage, setG2Passage] = useState(null);
  const [a2Passage, setA2Passage] = useState(null);

  // ── Comprehension answers { questionId: "Correct"|"Wrong"|"N/A" }
  const [answers, setAnswers] = useState({});

  // ── Teacher observations (filled during comprehension step)
  const [observationLevel,  setObservationLevel]  = useState("");
  const [teacherNotes,      setTeacherNotes]      = useState("");
  const [learnerExperience, setLearnerExperience] = useState("");
  const [a2RecordingTime,   setA2RecordingTime]   = useState(0);

  // ── Recording state ──────────────────────────────────────
  const [showChoiceModal,    setShowChoiceModal]    = useState(false);
  const [recordingMode,      setRecordingMode]      = useState(null);
  const [isRecording,        setIsRecording]        = useState(false);
  const [audioFile,          setAudioFile]          = useState(null);
  const [showRetakeModal,    setShowRetakeModal]    = useState(false);
  const [showTimeLimitModal, setShowTimeLimitModal] = useState(false);
  const [recordingTime,      setRecordingTime]      = useState(0);

  const fileInputRef  = useRef(null);
  const [fontSizeIdx, setFontSizeIdx] = useState(1);
  const fontSize = FONT_SIZES[fontSizeIdx];

  useEffect(() => {
    setLoadingStudents(true);
    studentsApi
      .list({ page_size: 200 })
      .then((data) => setStudents(data.students))
      .catch((e) => setFetchError(e.response?.data?.detail || e.message))
      .finally(() => setLoadingStudents(false));
  }, []);

  useEffect(() => {
    setLoadingPassages(true);
    passagesApi
      .list({ language: form.language, page_size: 100 })
      .then((data) => setPassages(data.passages))
      .catch((e) => setFetchError(e.response?.data?.detail || e.message))
      .finally(() => setLoadingPassages(false));
  }, [form.language]);

  const PERIOD_MAP = { BoSY: "beginning", MoSY: "middle", EoSY: "end" };

  async function handleContinue() {
    setCreateError(null);
    if (!form.student_id) { setCreateError("Please select a student."); return; }
    if (!form.passage_id) { setCreateError("Please select a passage."); return; }
    setCreating(true);
    try {
      const res = await sessionsApi.create({
        student_id:  form.student_id,
        passage_id:  form.passage_id,
        language:    form.language,
        period:      form.assessment_type,
        school_year: form.school_year,
      });
      setSession(res.session ?? res);
      setShowChoiceModal(true);
    } catch (err) {
      setCreateError(err.response?.data?.detail || err.message || "Failed to create session.");
    } finally {
      setCreating(false);
    }
  }

  // ── Recording helpers ─────────────────────────────────────
  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
    setRecordingMode("upload");
    e.target.value = "";
    if (step === STEPS.INFO) setStep(STEPS.A1_G1);
  }

  function handleStopRecording() {
    // Save A2 recording time before the timer effect resets it to 0
    if (step === STEPS.A2) setA2RecordingTime(recordingTime);
    setIsRecording(false);
    setShowRetakeModal(true);
  }

  // Called when teacher keeps the recording (no retake)
  function handleKeepRecording() {
    setShowRetakeModal(false);
    if (step === STEPS.A1_G1) setStep(STEPS.A1_G1_SCORE);
    if (step === STEPS.A1_G2) setStep(STEPS.A1_G2_SCORE);
    if (step === STEPS.A2)    setStep(STEPS.COMPREHENSION);
  }

  function handleRetake() {
    setShowRetakeModal(false);
    setIsRecording(false);
    setRecordingMode(null);
    setAudioFile(null);
    if (step === STEPS.A2) setA2RecordingTime(0);
  }

  function resetRecording() {
    setRecordingMode(null);
    setIsRecording(false);
    setAudioFile(null);
    setShowRetakeModal(false);
  }

  function cycleFontSize() {
    setFontSizeIdx((i) => (i + 1) % FONT_SIZES.length);
  }

  // ── Score review: confirm G1 score and branch ─────────────
  function handleConfirmG1Score() {
    const score = parseInt(g1Score, 10);
    if (isNaN(score) || score < 0 || score > 10) return;
    const g2 = pickG2Passage(allPassages, form.language, score);
    setG2Passage(g2);
    resetRecording();
    setStep(STEPS.A1_G2);
  }

  // ── Score review: confirm G2 score and branch ─────────────
  function handleConfirmG2Score() {
    const score = parseInt(g2Score, 10);
    if (isNaN(score) || score < 0 || score > 10) return;
    resetRecording();
    if (score <= 6) {
      setStep(STEPS.RESULTS);
    } else {
      setStep(STEPS.A2_SELECT);
    }
  }

  // ── A2 passage confirmed → start reading ─────────────────
  function handleSelectA2Passage(passage) {
    setA2Passage(passage);
    setStep(STEPS.A2);
  }

  // ── Comprehension: submit answers → results ───────────────
  function handleSubmitComprehension() {
    setStep(STEPS.RESULTS);
  }

  const comprehensionQuestions = a2Passage?.questions ?? [];

  // ── RecordingChoiceModal callbacks ────────────────────────
  const choiceModalProps = {
    isOpen:   showChoiceModal,
    onClose:  () => setShowChoiceModal(false),
    onUpload: () => {
      setShowChoiceModal(false);
      fileInputRef.current?.click();
    },
    // Recording does NOT auto-start — user presses Play manually
    onLive: () => {
      setRecordingMode("live");
      setIsRecording(false);
      setShowChoiceModal(false);
      if (step === STEPS.INFO) setStep(STEPS.A1_G1);
    },
  };

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="audio/*"
      style={{ display: "none" }}
      onChange={handleFileSelect}
    />
  );

  // ── Passage for the current reading step ─────────────────
  function currentPassage() {
    if (step === STEPS.A1_G1) return { title: form.passage_title, content: form.passage_content, word_count: form.word_count };
    if (step === STEPS.A1_G2) return g2Passage;
    if (step === STEPS.A2)    return a2Passage;
    return null;
  }

  const passage   = currentPassage();
  const wordCount = passage?.word_count || passage?.content?.trim().split(/\s+/).filter(Boolean).length || 0;

  // ── A2 story choices (student picks) ─────────────────────
  const a2Stories = allPassages.filter((p) => p.passage_type === "a2_story");

  // ============================================================
  // STEP: INFO — Student + Passage selection
  // ============================================================
  if (step === STEPS.INFO) {
    return (
      <Layout>
        {fileInput}
        <div className="asp-page asp-page--step1">
          <h1 className="asp-title">Assessment Session</h1>
          {fetchError && <div className="asp-error">⚠ {fetchError}</div>}

          <StudentInfoForm
            form={form}
            setForm={setForm}
            students={students}
            passages={allPassages}
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
        <RecordingChoiceModal {...choiceModalProps} />
      </Layout>
    );
  }

  // ============================================================
  // STEPS: A1_G1 / A1_G2 / A2 — Reading Screen (shared UI)
  // ============================================================
  const isReadingStep = [STEPS.A1_G1, STEPS.A1_G2, STEPS.A2].includes(step);
  if (isReadingStep) {
    return (
      <Layout>
        {fileInput}
        <div className="asp-reading-screen">

          {/* ── Header ── */}
          <div className="asp-reading-header">
            <div className="asp-reading-header__left">
              <button
                className="asp-reading-back"
                onClick={() => {
                  resetRecording();
                  if (step === STEPS.A1_G1) setStep(STEPS.INFO);
                  if (step === STEPS.A1_G2) setStep(STEPS.A1_G1_SCORE);
                  if (step === STEPS.A2)    setStep(STEPS.A2_SELECT);
                }}
              >
                <ChevronLeft size={18} />
              </button>
              <div className="asp-reading-header__info">
                <span className="asp-reading-badge">{STEP_LABELS[step]}</span>
                <h2 className="asp-reading-title">
                  {passage?.title || "Untitled Passage"}
                  <span className="asp-reading-wordcount">({wordCount} words)</span>
                </h2>
                <p className="asp-reading-meta">
                  {form.first_name} {form.last_name} · Grade {form.grade_level} ·{" "}
                  {form.section} · {form.school_year}
                </p>
              </div>
            </div>
            <div className="asp-reading-header__right">
              <button className="asp-reading-ctrl" onClick={cycleFontSize}>
                <Type size={15} /><span>Aa</span>
                <span className="asp-ctrl-size">{fontSize}px</span>
              </button>
              {isRecording && (
                <div className="asp-reading-ctrl asp-reading-ctrl--mic asp-reading-ctrl--active">
                  <Mic size={16} />
                </div>
              )}
            </div>
          </div>

          {/* ── Passage text ── */}
          <div className="asp-reading-body">
            {passage?.content ? (
              <p className="asp-reading-text" style={{ fontSize: `${fontSize}px` }}>
                {passage.content}
              </p>
            ) : (
              <p className="asp-reading-empty">No passage content available.</p>
            )}
          </div>

          {/* ── Footer: recording controls ── */}
          <div className="asp-reading-footer">
            {!recordingMode && (
              <button className="asp-mic-btn" onClick={() => setShowChoiceModal(true)}>
                <Mic size={24} />
              </button>
            )}

            {recordingMode === "live" && !isRecording && (
              <div className="asp-recording-active">
                <button className="asp-mic-btn asp-mic-btn--ready" onClick={() => setIsRecording(true)}>
                  <Mic size={24} />
                </button>
                <p className="asp-recording-mode-label asp-recording-mode-label--ready">
                  Press to start recording
                </p>
              </div>
            )}

            {recordingMode === "live" && isRecording && (
              <RecordingTimer
                recordingTime={recordingTime}
                isRecording={isRecording}
                onStop={handleStopRecording}
              />
            )}

            {recordingMode === "upload" && (
              <div className="asp-recording-active">
                <div className="asp-mic-btn asp-mic-btn--upload"><Mic size={24} /></div>
                <p className="asp-recording-mode-label">
                  {audioFile ? audioFile.name : "Audio file selected"}
                </p>
                <button className="asp-recording-cancel" onClick={resetRecording}>Remove</button>
              </div>
            )}
          </div>
        </div>

        <RecordingChoiceModal {...choiceModalProps} />

        <RetakeModal
          isOpen={showRetakeModal}
          onClose={() => setShowRetakeModal(false)}
          onRetake={handleRetake}
          onKeep={handleKeepRecording}
        />

        <TimeLimitModal
          isOpen={showTimeLimitModal}
          onContinue={() => { setShowTimeLimitModal(false); setIsRecording(true); }}
          onSubmit={() => { setShowTimeLimitModal(false); setShowRetakeModal(true); }}
        />
      </Layout>
    );
  }

  // ============================================================
  // STEP: A1_G1_SCORE — Review & edit Gawain 1 score
  // ============================================================
  if (step === STEPS.A1_G1_SCORE) {
    const scoreNum = parseInt(g1Score, 10);
    const valid    = !isNaN(scoreNum) && scoreNum >= 0 && scoreNum <= 10;
    return (
      <Layout>
        <div className="asp-page">
          <div className="asp-score-card">
            <span className="asp-reading-badge">Assessment 1 — Gawain 1</span>
            <h2 className="asp-score-card__title">Score Review</h2>
            <p className="asp-score-card__sub">
              The score below is auto-calculated. You may edit it if needed.
            </p>

            <div className="asp-score-input-wrap">
              <label className="asp-score-label">Score (0 – 10)</label>
              <input
                type="number"
                min={0} max={10}
                className="asp-score-input"
                value={g1Score}
                onChange={(e) => setG1Score(e.target.value)}
                placeholder="—"
              />
            </div>

            {valid && (
              <p className="asp-score-hint">
                {scoreNum <= 6
                  ? "Score 0–6: will proceed to Gawain 2 (Words)"
                  : "Score 7–10: will proceed to Gawain 2 (Sentences)"}
              </p>
            )}

            <button
              className="asp-continue-btn"
              onClick={handleConfirmG1Score}
              disabled={!valid}
            >
              Confirm & Continue <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // ============================================================
  // STEP: A1_G2_SCORE — Review & edit Gawain 2 score
  // ============================================================
  if (step === STEPS.A1_G2_SCORE) {
    const scoreNum = parseInt(g2Score, 10);
    const valid    = !isNaN(scoreNum) && scoreNum >= 0 && scoreNum <= 10;
    return (
      <Layout>
        <div className="asp-page">
          <div className="asp-score-card">
            <span className="asp-reading-badge">Assessment 1 — Gawain 2</span>
            <h2 className="asp-score-card__title">Score Review</h2>
            <p className="asp-score-card__sub">
              The score below is auto-calculated. You may edit it if needed.
            </p>

            <div className="asp-score-input-wrap">
              <label className="asp-score-label">Score (0 – 10)</label>
              <input
                type="number"
                min={0} max={10}
                className="asp-score-input"
                value={g2Score}
                onChange={(e) => setG2Score(e.target.value)}
                placeholder="—"
              />
            </div>

            {valid && (
              <p className="asp-score-hint">
                {scoreNum <= 6
                  ? "Score 0–6: assessment ends here — go to Summary"
                  : "Score 7–10: will proceed to Assessment 2 (Story)"}
              </p>
            )}

            <button
              className="asp-continue-btn"
              onClick={handleConfirmG2Score}
              disabled={!valid}
            >
              Confirm & Continue <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // ============================================================
  // STEP: A2_SELECT — Student picks a story passage
  // ============================================================
  if (step === STEPS.A2_SELECT) {
    return (
      <Layout>
        <div className="asp-page">
          <div className="asp-a2-select">
            <span className="asp-reading-badge">Assessment 2</span>
            <h2 className="asp-a2-select__title">Choose a Story</h2>
            <p className="asp-a2-select__sub">
              Let the student pick which story they would like to read.
            </p>
            <div className="asp-a2-select__grid">
              {a2Stories.map((p) => (
                <button
                  key={p.id}
                  className={`asp-a2-card${a2Passage?.id === p.id ? " asp-a2-card--selected" : ""}`}
                  onClick={() => setA2Passage(p)}
                >
                  <span className="asp-a2-card__title">{p.title}</span>
                  <span className="asp-a2-card__meta">{p.word_count} words</span>
                  {a2Passage?.id === p.id && <CheckCircle size={18} className="asp-a2-card__check" />}
                </button>
              ))}
            </div>
            <button
              className="asp-continue-btn"
              onClick={() => handleSelectA2Passage(a2Passage)}
              disabled={!a2Passage}
            >
              Start Reading <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // ============================================================
  // STEP: COMPREHENSION — Teacher marks student answers + observations
  // ============================================================
  if (step === STEPS.COMPREHENSION) {
    return (
      <Layout>
        <ComprehensionStep
          a2Passage={a2Passage}
          answers={answers}
          setAnswers={setAnswers}
          observationLevel={observationLevel}
          setObservationLevel={setObservationLevel}
          teacherNotes={teacherNotes}
          setTeacherNotes={setTeacherNotes}
          learnerExperience={learnerExperience}
          setLearnerExperience={setLearnerExperience}
          onSubmit={handleSubmitComprehension}
        />
      </Layout>
    );
  }

  // ============================================================
  // STEP: RESULTS — Final assessment report
  // ============================================================
  if (step === STEPS.RESULTS) {
    function handleReset() {
      setStep(STEPS.INFO);
      setForm(initForm());
      setG1Score(""); setG2Score("");
      setG2Passage(null); setA2Passage(null);
      setAnswers({});
      setObservationLevel(""); setTeacherNotes(""); setLearnerExperience("");
      setA2RecordingTime(0);
      setSession(null);
      resetRecording();
    }

    return (
      <Layout>
        <ResultsStep
          form={form}
          g1Score={g1Score}
          g2Score={g2Score}
          g2Passage={g2Passage}
          a2Passage={a2Passage}
          a2RecordingTime={a2RecordingTime}
          comprehensionQuestions={comprehensionQuestions}
          answers={answers}
          observationLevel={observationLevel}
          teacherNotes={teacherNotes}
          learnerExperience={learnerExperience}
          onReset={handleReset}
        />
      </Layout>
    );
  }

  return null;
}

import { useState, useEffect, useRef } from "react";

import Layout               from "../../components/Layout";
import LoadingScreen        from "../../components/LoadingScreen";
import ComprehensionStep    from "../../components/ComprehensionStep";
import ResultsStep          from "../../components/ResultsStep";
import Toast               from "../../modals/Toast";
import useToast            from "../../hooks/Usetoast";
import {
  studentsApi,
  passagesApi,
  sessionsApi,
} from "../../services/api";
import {
  PERIOD_MAP,
  OBSERVATION_LEVELS,
  EXPERIENCE_OPTIONS,
} from "../../data/assessmentConstants";

import InfoStep                 from "./InfoStep";
import ReadingStep              from "./ReadingStep";
import TranscriptionPreviewStep from "./TranscriptionPreviewStep";
import A1TaskResultStep         from "./A1TaskResultStep";
import A1OnlyResultsStep        from "../../components/A1OnlyResultsStep";
import A2SelectStep             from "./A2SelectStep";
import ObservationStep          from "./ObservationStep";
import LearnerExperienceStep    from "./LearnerExperienceStep";

import "../pages css/AssessmentPage.css";

// ── Step machine ──────────────────────────────────────────────────────────────
const STEPS = {
  INFO:          "info",
  // Assessment 1 — Task 1
  A1_G1:         "a1_g1",
  A1_G1_LOADING: "a1_g1_loading",
  A1_G1_PREVIEW: "a1_g1_preview",
  A1_G1_RESULT:  "a1_g1_result",
  // Assessment 1 — Task 2 (words 2L or sentences 2H)
  A1_G2:         "a1_g2",
  A1_G2_LOADING: "a1_g2_loading",
  A1_G2_PREVIEW: "a1_g2_preview",
  A1_G2_RESULT:  "a1_g2_result",
  // Dedicated result page for A1-only students (non-A2 path)
  A1_RESULTS:    "a1_results",
  // Learner experience — after A1 result (non-A2) or after comprehension (A2)
  LEARNER_EXP:   "learner_exp",
  // Observation (standalone — after learner experience)
  A1_G1_OBSERVE: "a1_g1_observe",
  // Assessment 2
  A2_SELECT:     "a2_select",
  A2:            "a2",
  A2_LOADING:    "a2_loading",
  A2_PREVIEW:    "a2_preview",
  COMPREHENSION: "comprehension",
  A2_OBSERVE:    "a2_observe",
  RESULTS:       "results",
};

const STEP_LABELS = {
  [STEPS.A1_G1]:         "Assessment 1 — Gawain 1",
  [STEPS.A1_G1_PREVIEW]: "Assessment 1 — Gawain 1",
  [STEPS.A1_G2]:         "Assessment 1 — Gawain 2",
  [STEPS.A1_G2_PREVIEW]: "Assessment 1 — Gawain 2",
  [STEPS.A2]:            "Assessment 2",
  [STEPS.A2_PREVIEW]:    "Assessment 2",
};

const FONT_SIZES = [15, 18, 22, 26];

const GRADE_TIME_LIMITS = { 1: 60, 2: 120, 3: 180 };

function getGradeNum(gradeLevel) {
  const n = parseInt(String(gradeLevel).replace(/\D/g, ""), 10);
  return isNaN(n) ? 1 : Math.min(3, Math.max(1, n));
}

function initForm() {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth() + 1;
  return {
    school_year:      m >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}`,
    assessment_type:  "BoSY",
    student_id:       null,
    first_name:       "",
    last_name:        "",
    grade_level:      "",
    section:          "",
    language:         "filipino",
    passage_id:       null,
    passage_title:    "",
    passage_content:  "",
    word_count:       0,
    selected_passage: null,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AssessmentPage() {
  const [step, setStep] = useState(STEPS.INFO);
  const [form, setForm] = useState(initForm());

  const { toasts, removeToast, showSaveSuccess } = useToast();

  // Student & passage loading
  const [availableGrades, setAvailableGrades] = useState([]);
  const [students,        setStudents]        = useState([]);
  const [a1Passages,      setA1Passages]      = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingPassages, setLoadingPassages] = useState(false);
  const [fetchError,      setFetchError]      = useState(null);

  // Session
  const [session,      setSession]      = useState(null);
  const [creating,     setCreating]     = useState(false);
  const [createError,  setCreateError]  = useState(null);

  // ── Duplicate session warning (commented out — re-enable after testing) ────
  // Holds the warning message returned by the backend when a session already
  // exists for the same student, school year, and assessment period (HTTP 207).
  // const [duplicateWarning, setDuplicateWarning] = useState(null);
  // ───────────────────────────────────────────────────────────────────────────

  // Passages for Task 2 and A2
  const [g2Passage,  setG2Passage]  = useState(null);
  const [a2Passage,  setA2Passage]  = useState(null);
  const [a2Passages, setA2Passages] = useState([]);

  // Transcripts (editable)
  const [g1Transcript, setG1Transcript] = useState("");
  const [g1Words,      setG1Words]      = useState([]);
  const [g2Transcript, setG2Transcript] = useState("");
  const [a2Transcript, setA2Transcript] = useState("");
  const [a2Words,      setA2Words]      = useState([]);

  // Scoring results from backend
  const [task1ScoreResult, setTask1ScoreResult] = useState(null); // from score-task1
  const [part1Result,      setPart1Result]      = useState(null); // from score-part1
  const [finalResult,      setFinalResult]      = useState(null); // from complete

  // Timing
  const [g1RecordingTime, setG1RecordingTime] = useState(0);
  const [g2RecordingTime, setG2RecordingTime] = useState(0);
  const [a2RecordingTime, setA2RecordingTime] = useState(0);

  // Comprehension / observation
  const [answers,          setAnswers]          = useState({});
  const [observationLevel, setObservationLevel] = useState("");
  const [teacherNotes,     setTeacherNotes]     = useState("");
  const [learnerExperience,setLearnerExperience]= useState("");

  // Async state
  const [isTranscribing, setIsTranscribing]   = useState(false);
  const [transcribeError,setTranscribeError]  = useState(null);
  const [isScoring,      setIsScoring]        = useState(false);
  const [scoreError,     setScoreError]       = useState(null);
  const [isCompleting,   setIsCompleting]     = useState(false);
  const [completeError,  setCompleteError]    = useState(null);

  // Recording state
  const [showChoiceModal,    setShowChoiceModal]    = useState(false);
  const [recordingMode,      setRecordingMode]      = useState(null);
  const [isRecording,        setIsRecording]        = useState(false);
  const [isPaused,           setIsPaused]           = useState(false);
  const [audioFile,          setAudioFile]          = useState(null);
  const [showRetakeModal,    setShowRetakeModal]     = useState(false);
  const [showTimeLimitModal, setShowTimeLimitModal]  = useState(false);
  const [recordingTime,      setRecordingTime]       = useState(0);
  const [timeLimitReached,   setTimeLimitReached]    = useState(false);

  const fileInputRef      = useRef(null);
  const mediaRecorderRef  = useRef(null);
  const audioChunksRef    = useRef([]);
  const streamRef         = useRef(null);
  const currentStepRef    = useRef(step);  // track step in callbacks

  const [fontSizeIdx, setFontSizeIdx] = useState(1);
  const fontSize = FONT_SIZES[fontSizeIdx];

  // Keep currentStepRef in sync
  useEffect(() => { currentStepRef.current = step; }, [step]);

  // ── Recording timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRecording || isPaused) return;
    const id = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isRecording, isPaused]);

  // ── A2 grade-level time limit trigger ────────────────────────────────────
  useEffect(() => {
    if (step !== STEPS.A2 || !isRecording || isPaused || timeLimitReached) return;
    const gradeNum = getGradeNum(form.grade_level);
    const limit    = GRADE_TIME_LIMITS[gradeNum] ?? 120;
    if (recordingTime >= limit) {
      setTimeLimitReached(true);
      setIsPaused(true);
      setShowTimeLimitModal(true);
    }
  }, [recordingTime, step, isRecording, isPaused, timeLimitReached, form.grade_level]);

  // ── Fetch available grade levels on mount ───────────────────────────────
  const GRADE_ORDER = ["grade_1", "grade_2", "grade_3"];
  useEffect(() => {
    studentsApi.listClasses()
      .then((data) => {
        const grades = [...new Set((data.classes || []).map((c) => c.grade_level))]
          .filter((g) => GRADE_ORDER.includes(g))
          .sort((a, b) => GRADE_ORDER.indexOf(a) - GRADE_ORDER.indexOf(b));
        setAvailableGrades(grades);
      })
      .catch(() => {});
  }, []);

  // ── Fetch students when grade level is selected ──────────────────────────
  useEffect(() => {
    if (!form.grade_level) { setStudents([]); return; }
    setLoadingStudents(true);
    setFetchError(null);
    studentsApi
      .list({ grade_level: form.grade_level, page_size: 500 })
      .then((data) => setStudents(data.students || []))
      .catch((e)  => setFetchError(e.response?.data?.detail || e.message))
      .finally(()  => setLoadingStudents(false));
  }, [form.grade_level]);

  // ── Fetch A1 passages when language or grade_level changes ───────────────
  useEffect(() => {
    if (!form.grade_level || !form.language) return;
    setLoadingPassages(true);
    setA1Passages([]);
    setForm((prev) => ({
      ...prev,
      passage_id: null, passage_title: "", passage_content: "",
      word_count: 0, selected_passage: null,
    }));

    passagesApi
      .list({
        language:        form.language,
        grade_level:     form.grade_level,
        assessment_type: 1,
        page_size:       50,
      })
      .then((data) => {
        const passages = data.passages ?? [];
        setA1Passages(passages);
        // Auto-select if exactly one passage matches
        if (passages.length === 1) {
          const p = passages[0];
          const wc = p.task1_content
            ? p.task1_content.trim().split(/\s+/).filter(Boolean).length
            : (p.word_count ?? 0);
          setForm((prev) => ({
            ...prev,
            passage_id:       p.id,
            passage_title:    p.title ?? "Assessment 1",
            passage_content:  p.task1_content ?? "",
            word_count:       wc,
            selected_passage: p,
          }));
        }
      })
      .catch((e) => setFetchError(e.response?.data?.detail || e.message))
      .finally(()  => setLoadingPassages(false));
  }, [form.language, form.grade_level]);

  // ── Fetch A2 passages when grade_level or language changes ───────────────
  useEffect(() => {
    if (!form.grade_level || !form.language) return;
    passagesApi
      .list({
        language:        form.language,
        grade_level:     form.grade_level,
        assessment_type: 2,
        page_size:       50,
      })
      .then((data) => setA2Passages(data.passages ?? []))
      .catch(() => {});
  }, [form.language, form.grade_level]);

  // ── Session creation ─────────────────────────────────────────────────────
  async function handleContinue() {
    setCreateError(null);
    // setDuplicateWarning(null); // (commented out — re-enable after testing)
    if (!form.student_id)  { setCreateError("Please select a student."); return; }
    if (!form.passage_id)  { setCreateError("Please select a passage."); return; }
    setCreating(true);
    try {
      const res = await sessionsApi.create({
        student_id:  form.student_id,
        passage_id:  form.passage_id,
        language:    form.language,
        period:      PERIOD_MAP[form.assessment_type] ?? "beginning",
        school_year: form.school_year,
      });

      // ── Duplicate warning check (commented out — re-enable after testing) ─
      // The backend returns HTTP 207 with a `warning` field when this student
      // already has a session for the same school year and assessment period.
      // When enabled, this shows the warning banner on the info page and stops
      // the teacher from proceeding until they acknowledge or choose to proceed.
      //
      // if (res.warning) {
      //   setDuplicateWarning(res.warning);
      //   setSession(res.session);
      //   setCreating(false);
      //   return; // stop here — teacher sees the warning, must click Continue again
      // }
      // ───────────────────────────────────────────────────────────────────────

      setSession(res.session ?? res);
      setStep(STEPS.A1_G1);
      setShowChoiceModal(true);
    } catch (err) {
      setCreateError(err.response?.data?.detail || err.message || "Failed to create session.");
    } finally {
      setCreating(false);
    }
  }

  // ── Transcription helper ─────────────────────────────────────────────────
  async function fireTranscription(file, forTask) {
    setIsTranscribing(true);
    setTranscribeError(null);

    const fd = new FormData();
    fd.append("audio", file);

    try {
      const result = await sessionsApi.transcribe(session.id, fd);

      if (forTask === "g1") {
        setG1Transcript(result.transcript ?? "");
        setG1Words(result.words ?? []);
        setStep(STEPS.A1_G1_PREVIEW);
      } else if (forTask === "g2") {
        setG2Transcript(result.transcript ?? "");
        setStep(STEPS.A1_G2_PREVIEW);
      } else if (forTask === "a2") {
        setA2Transcript(result.transcript ?? "");
        setA2Words(result.words ?? []);
        setStep(STEPS.A2_PREVIEW);
      }
    } catch (e) {
      setTranscribeError(e.response?.data?.detail || e.message || "Transcription failed.");
      // Return to the appropriate reading step on error
      if (forTask === "g1") setStep(STEPS.A1_G1);
      else if (forTask === "g2") setStep(STEPS.A1_G2);
      else setStep(STEPS.A2);
    } finally {
      setIsTranscribing(false);
    }
  }

  // ── Recording controls ───────────────────────────────────────────────────
  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setAudioFile(file);
    setRecordingMode("upload");

    // Extract exact duration from uploaded file
    const duration = await new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(Math.round(audio.duration));
      };
      audio.onerror = () => resolve(1); // fallback to 1 second
    });

    setRecordingTime(duration);

    const s = currentStepRef.current;
    if (s === STEPS.INFO || s === STEPS.A1_G1) {
      setG1RecordingTime(duration);
      setStep(STEPS.A1_G1_LOADING);
      fireTranscription(file, "g1");
    } else if (s === STEPS.A1_G2) {
      setG2RecordingTime(duration);
      setStep(STEPS.A1_G2_LOADING);
      fireTranscription(file, "g2");
    } else if (s === STEPS.A2) {
      setA2RecordingTime(duration);
      setStep(STEPS.A2_LOADING);
      fireTranscription(file, "a2");
    }
  }

  async function handleStartRecording() {
    try {
      audioChunksRef.current = [];
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioFile(new File([blob], "recording.webm", { type: "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      recorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setTimeLimitReached(false);
    } catch {
      setCreateError("Microphone access denied. Please allow access and try again.");
    }
  }

  function handlePauseRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
    }
    setIsPaused(true);
  }

  function handleResumeRecording() {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
    }
    setIsPaused(false);
  }

  function handleStopRecording() {
    // Save A2 time before timer resets
    if (step === STEPS.A2) setA2RecordingTime(recordingTime);
    setIsRecording(false);
    setIsPaused(false);
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    setShowRetakeModal(true);
  }

  // Called from RetakeModal "Keep" button
  function handleKeepRecording() {
    setShowRetakeModal(false);
    const file = audioFile;
    const s    = step;

    if (s === STEPS.A1_G1) {
      setG1RecordingTime(recordingTime);
      setStep(STEPS.A1_G1_LOADING);
      fireTranscription(file, "g1");
    } else if (s === STEPS.A1_G2) {
      setG2RecordingTime(recordingTime);
      setStep(STEPS.A1_G2_LOADING);
      fireTranscription(file, "g2");
    } else if (s === STEPS.A2) {
      setStep(STEPS.A2_LOADING);
      fireTranscription(file, "a2");
    }
    setRecordingTime(0);
  }

  function handleRetake() {
    setShowRetakeModal(false);
    resetRecording();
    if (step === STEPS.A2) { setA2RecordingTime(0); setTimeLimitReached(false); }
  }

  function resetRecording() {
    setRecordingMode(null);
    setIsRecording(false);
    setIsPaused(false);
    setAudioFile(null);
    setShowRetakeModal(false);
    setRecordingTime(0);
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
  }

  // ── TimeLimitModal handlers (A2 only) ────────────────────────────────────
  function handleTimeLimitContinue() {
    setShowTimeLimitModal(false);
    setTimeLimitReached(false);
    setIsPaused(false); // resume timer + recording
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
    }
  }

  function handleTimeLimitSubmit() {
    setShowTimeLimitModal(false);
    handleStopRecording();
  }

  // ── Transcription preview confirm handlers ───────────────────────────────
  async function handleConfirmG1Preview(editedText) {
    setG1Transcript(editedText);
    setStep(STEPS.A1_G1_LOADING);
    setIsScoring(true);
    setScoreError(null);
    try {
      const result = await sessionsApi.scoreTask1(session.id, {
        task1_reference_text:   form.selected_passage?.task1_content ?? "",
        task1_transcribed_text: editedText,
      });
      setTask1ScoreResult(result);
      handleProceedToG2();
    } catch (e) {
      setScoreError(e.response?.data?.detail || e.message || "Scoring failed.");
      setStep(STEPS.A1_G1_PREVIEW);
    } finally {
      setIsScoring(false);
    }
  }

  async function handleConfirmG2Preview(editedText) {
    setG2Transcript(editedText);
    setStep(STEPS.A1_G2_LOADING);
    setIsScoring(true);
    setScoreError(null);

    const p = form.selected_passage;
    const task2Ref = task1ScoreResult?.route === "task_2L"
      ? (p?.task2_words     ?? "")
      : (p?.task2_sentences ?? "");

    try {
      const result = await sessionsApi.scorePart1(session.id, {
        task1_reference_text:   p?.task1_content ?? "",
        task1_transcribed_text: g1Transcript,
        task2_reference_text:   task2Ref,
        task2_transcribed_text: editedText,
      });
      setPart1Result(result);
      if (result.route === "task_2H") handleProceedToA2();
      else setStep(STEPS.LEARNER_EXP);
    } catch (e) {
      setScoreError(e.response?.data?.detail || e.message || "Scoring failed.");
      setStep(STEPS.A1_G2_PREVIEW);
    } finally {
      setIsScoring(false);
    }
  }

  function handleConfirmA2Preview(editedText) {
    setA2Transcript(editedText);
    setStep(STEPS.COMPREHENSION);
  }

  // ── A1 G1 result — proceed to Task 2 ────────────────────────────────────
  function handleProceedToG2() {
    // Derive Task 2 content from route returned by backend
    const p       = form.selected_passage;
    const route   = task1ScoreResult?.route; // "task_2L" or "task_2H"
    const content = route === "task_2L"
      ? (p?.task2_words     ?? "")
      : (p?.task2_sentences ?? "");
    const wc = content.trim().split(/\s+/).filter(Boolean).length;

    setG2Passage({
      title:      p?.title ?? form.passage_title,
      content,
      word_count: wc,
    });
    resetRecording();
    // Show the choice modal again for Task 2
    setShowChoiceModal(true);
    setStep(STEPS.A1_G2);
  }

  // ── A1 G2 result — proceed to A2 or finish ──────────────────────────────
  function handleProceedToA2() {
    resetRecording();
    setStep(STEPS.A2_SELECT);
  }

  function handleSelectA2Passage(passage) {
    setA2Passage(passage);
    resetRecording();
    setShowChoiceModal(true);
    setStep(STEPS.A2);
  }

  // ── Final session completion ─────────────────────────────────────────────
  async function handleCompleteSession(learnerExpBackendValue = null) {
    if (!session?.id) { handleReset(); return; }
    setIsCompleting(true);
    setCompleteError(null);

    const p        = form.selected_passage;
    const gradeNum = getGradeNum(form.grade_level);
    const route    = part1Result?.route ?? task1ScoreResult?.route ?? "";
    const task2Ref = route === "task_2L"
      ? (p?.task2_words     ?? "")
      : (p?.task2_sentences ?? "");

    const reachedA2   = !!a2Passage;
    const compCorrect = Object.values(answers).filter((v) => v === "Correct").length;

    const payload = {
      part1: {
        task1_reference_text:   p?.task1_content ?? "",
        task1_transcribed_text: g1Transcript,
        task2_reference_text:   task2Ref,
        task2_transcribed_text: g2Transcript,
      },
      part2: reachedA2
        ? {
            passage_id:              a2Passage?.id,
            reference_text:          a2Passage?.content ?? "",
            transcribed_text:        a2Transcript,
            reading_time_sec:        a2RecordingTime > 0 ? a2RecordingTime : 1,
            grade_level:             gradeNum,
            comprehension_correct:   compCorrect,
            fluency_level:           null,
            learner_experience:      learnerExpBackendValue,
            teacher_remarks:         null,
            whisper_word_timestamps: a2Words.length > 0 ? a2Words : null,
          }
        : null,
    };

    try {
      const result = await sessionsApi.complete(session.id, payload);
      setFinalResult(result);
      // A2 students record observation after completing; non-A2 go straight to results
      setStep(reachedA2 ? STEPS.A2_OBSERVE : STEPS.A1_RESULTS);
    } catch (err) {
      setCompleteError(
        err.response?.data?.detail || err.message || "Failed to submit session."
      );
    } finally {
      setIsCompleting(false);
    }
  }

  function handleDoneAndSubmit() {
    showSaveSuccess("Assessment");
    setTimeout(handleReset, 1500);
  }

  function handleReset() {
    setStep(STEPS.INFO);
    setForm(initForm());
    setA1Passages([]);
    setA2Passages([]);
    setG2Passage(null);
    setA2Passage(null);
    setG1Transcript(""); setG1Words([]);
    setG2Transcript("");
    setA2Transcript(""); setA2Words([]);
    setTask1ScoreResult(null);
    setPart1Result(null);
    setFinalResult(null);
    setG1RecordingTime(0);
    setG2RecordingTime(0);
    setA2RecordingTime(0);
    setAnswers({});
    setObservationLevel(""); setTeacherNotes(""); setLearnerExperience("");
    setIsTranscribing(false); setTranscribeError(null);
    setIsScoring(false); setScoreError(null);
    setIsCompleting(false); setCompleteError(null);
    setSession(null);
    setTimeLimitReached(false);
    resetRecording();
  }

  function cycleFontSize() {
    setFontSizeIdx((i) => (i + 1) % FONT_SIZES.length);
  }

  // ── Derived values ────────────────────────────────────────────────────────
  function currentPassage() {
    if ([STEPS.A1_G1, STEPS.A1_G1_PREVIEW].includes(step)) return {
      title:      form.passage_title,
      content:    form.passage_content,
      word_count: form.word_count,
    };
    if ([STEPS.A1_G2, STEPS.A1_G2_PREVIEW].includes(step)) return g2Passage;
    if ([STEPS.A2, STEPS.A2_PREVIEW].includes(step))        return a2Passage;
    return null;
  }
  const passage   = currentPassage();
  const wordCount = passage?.word_count
    || passage?.content?.trim().split(/\s+/).filter(Boolean).length
    || 0;

  const gradeNum     = getGradeNum(form.grade_level);
  const a2TimeLimit  = GRADE_TIME_LIMITS[gradeNum] ?? 120;

  const isLiveReadingStep = [STEPS.A1_G1, STEPS.A1_G2, STEPS.A2].includes(step);
  const isLoadingStep     = [STEPS.A1_G1_LOADING, STEPS.A1_G2_LOADING, STEPS.A2_LOADING].includes(step);

  // ── Shared modal / input props ────────────────────────────────────────────
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="audio/*"
      style={{ display: "none" }}
      onChange={handleFileSelect}
    />
  );

  const choiceModalProps = {
    isOpen:  showChoiceModal,
    onClose: () => setShowChoiceModal(false),
    onUpload: () => {
      setShowChoiceModal(false);
      fileInputRef.current?.click();
    },
    onLive: () => {
      setRecordingMode("live");
      setIsRecording(false);
      setShowChoiceModal(false);
      // Step is already set to the correct reading step by the caller
    },
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (step === STEPS.INFO) {
    return (
      <Layout>
        {/* ── Duplicate session warning banner (commented out — re-enable after testing) ──
        {duplicateWarning && (
          <div className="asp-duplicate-warning">
            ⚠ {duplicateWarning}
          </div>
        )}
        ─────────────────────────────────────────────────────────────────────── */}
        <InfoStep
          form={form} setForm={setForm}
          availableGrades={availableGrades}
          students={students} allPassages={a1Passages}
          loadingStudents={loadingStudents} loadingPassages={loadingPassages}
          fetchError={fetchError} createError={createError}
          creating={creating} session={session} onContinue={handleContinue}
          fileInput={fileInput} choiceModalProps={choiceModalProps}
        />
      </Layout>
    );
  }

  if (isLoadingStep) {
    const msg = isScoring ? "Proceeding…" : "Processing audio…";
    return (
      <Layout>
        <LoadingScreen message={msg} />
        {(transcribeError || scoreError) && (
          <p className="asp-error" style={{ textAlign: "center" }}>
            ⚠ {transcribeError || scoreError}
          </p>
        )}
      </Layout>
    );
  }

  if (isLiveReadingStep) {
    return (
      <Layout>
        {fileInput}
        <ReadingStep
          stepLabel={STEP_LABELS[step]}
          step={step}
          passage={passage} wordCount={wordCount}
          form={form}
          fontSize={fontSize}
          isRecording={isRecording}
          isPaused={isPaused}
          recordingMode={recordingMode}
          audioFile={audioFile}
          recordingTime={recordingTime}
          a2TimeLimit={step === STEPS.A2 ? a2TimeLimit : null}
          showRetakeModal={showRetakeModal}
          showTimeLimitModal={showTimeLimitModal}
          choiceModalProps={choiceModalProps}
          onBack={() => {
            resetRecording();
            if (step === STEPS.A1_G1) setStep(STEPS.INFO);
            if (step === STEPS.A1_G2) setStep(STEPS.A1_G1);
            if (step === STEPS.A2)    setStep(STEPS.A2_SELECT);
          }}
          onCycleFontSize={cycleFontSize}
          onStartRecording={handleStartRecording}
          onPauseRecording={handlePauseRecording}
          onResumeRecording={handleResumeRecording}
          onStopRecording={handleStopRecording}
          onKeepRecording={handleKeepRecording}
          onRetake={handleRetake}
          onResetRecording={resetRecording}
          onShowChoiceModal={() => setShowChoiceModal(true)}
          onCloseRetakeModal={() => setShowRetakeModal(false)}
          onTimeLimitContinue={handleTimeLimitContinue}
          onTimeLimitSubmit={handleTimeLimitSubmit}
        />
      </Layout>
    );
  }

  if (step === STEPS.A1_G1_PREVIEW) {
    return (
      <Layout>
        <TranscriptionPreviewStep
          badge={STEP_LABELS[step]}
          transcript={g1Transcript}
          referenceText={form.selected_passage?.task1_content ?? form.passage_content ?? ""}
          words={g1Words}
          timeLimitSec={null}
          audioFile={audioFile}
          recordingTime={g1RecordingTime}
          onConfirm={handleConfirmG1Preview}
        />
        {scoreError && <p className="asp-error" style={{ textAlign: "center" }}>⚠ {scoreError}</p>}
      </Layout>
    );
  }

  if (step === STEPS.A1_G2_PREVIEW) {
    const g2Ref = task1ScoreResult?.route === "task_2L"
      ? (form.selected_passage?.task2_words     ?? "")
      : (form.selected_passage?.task2_sentences ?? "");
    return (
      <Layout>
        <TranscriptionPreviewStep
          badge={STEP_LABELS[step]}
          transcript={g2Transcript}
          referenceText={g2Ref}
          words={[]}
          timeLimitSec={null}
          audioFile={audioFile}
          recordingTime={g2RecordingTime}
          onConfirm={handleConfirmG2Preview}
        />
        {scoreError && <p className="asp-error" style={{ textAlign: "center" }}>⚠ {scoreError}</p>}
      </Layout>
    );
  }

  if (step === STEPS.A2_SELECT) {
    return (
      <Layout>
        <A2SelectStep
          a2Stories={a2Passages}
          a2Passage={a2Passage} setA2Passage={setA2Passage}
          onSelect={handleSelectA2Passage}
        />
      </Layout>
    );
  }

  if (step === STEPS.A2_PREVIEW) {
    return (
      <Layout>
        <TranscriptionPreviewStep
          badge={STEP_LABELS[step]}
          transcript={a2Transcript}
          referenceText={a2Passage?.content ?? ""}
          words={a2Words}
          timeLimitSec={a2TimeLimit}
          audioFile={audioFile}
          recordingTime={a2RecordingTime}
          onConfirm={handleConfirmA2Preview}
        />
      </Layout>
    );
  }

  if (step === STEPS.COMPREHENSION) {
    return (
      <Layout>
        <ComprehensionStep
          a2Passage={a2Passage}
          answers={answers} setAnswers={setAnswers}
          onSubmit={() => setStep(STEPS.LEARNER_EXP)}
        />
      </Layout>
    );
  }

  if (step === STEPS.LEARNER_EXP) {
    const isA2Path = !!a2Passage;
    return (
      <Layout>
        <LearnerExperienceStep
          onConfirm={(selectedValue) => {
            setLearnerExperience(selectedValue);
            const backendVal = EXPERIENCE_OPTIONS.find((e) => e.value === selectedValue)?.backendValue ?? null;
            if (isA2Path) {
              handleCompleteSession(backendVal);
            } else {
              setStep(STEPS.A1_G1_OBSERVE);
            }
          }}
          onBack={() => setStep(isA2Path ? STEPS.COMPREHENSION : STEPS.A1_G2)}
        />
        {isCompleting && <LoadingScreen message="Submitting results…" />}
        {completeError && (
          <p className="asp-error" style={{ textAlign: "center" }}>⚠ {completeError}</p>
        )}
      </Layout>
    );
  }

  if (step === STEPS.A1_G1_OBSERVE) {
    const leBackendVal = EXPERIENCE_OPTIONS.find((e) => e.value === learnerExperience)?.backendValue ?? null;
    return (
      <Layout>
        <ObservationStep
          sessionId={session?.id}
          learnerExperience={leBackendVal}
          onComplete={(data) => {
            const lvl = OBSERVATION_LEVELS.find((l) => l.backendValue === data.observation_level);
            setObservationLevel(lvl?.value ?? "");
            setTeacherNotes(data.teacher_remarks ?? "");
            handleCompleteSession();
          }}
          onBack={() => setStep(STEPS.LEARNER_EXP)}
        />
        {isCompleting && <LoadingScreen message="Submitting results…" />}
        {completeError && (
          <p className="asp-error" style={{ textAlign: "center" }}>⚠ {completeError}</p>
        )}
      </Layout>
    );
  }

  if (step === STEPS.A2_OBSERVE) {
    return (
      <Layout>
        <ObservationStep
          sessionId={session?.id}
          onComplete={(data) => {
            const lvl = OBSERVATION_LEVELS.find((l) => l.backendValue === data.observation_level);
            setObservationLevel(lvl?.value ?? "");
            setTeacherNotes(data.teacher_remarks ?? "");
            setStep(STEPS.RESULTS);
          }}
          onBack={undefined}
        />
      </Layout>
    );
  }

  if (step === STEPS.A1_RESULTS) {
    return (
      <Layout>
        <Toast toasts={toasts} onRemove={removeToast} />
        <A1OnlyResultsStep
          form={form}
          part1Result={part1Result}
          task1ScoreResult={task1ScoreResult}
          g1Transcript={g1Transcript}
          g2Transcript={g2Transcript}
          learnerExperience={learnerExperience}
          observationLevel={observationLevel}
          teacherNotes={teacherNotes}
          onDone={handleDoneAndSubmit}
        />
      </Layout>
    );
  }

  if (step === STEPS.RESULTS) {
    return (
      <Layout>
        <Toast toasts={toasts} onRemove={removeToast} />
        <ResultsStep
          form={form}
          finalResult={finalResult}
          part1Result={part1Result}
          a2Passage={a2Passage}
          a2RecordingTime={a2RecordingTime}
          a2TimeLimit={a2TimeLimit}
          comprehensionQuestions={a2Passage?.questions ?? []}
          answers={answers}
          observationLevel={observationLevel}
          teacherNotes={teacherNotes}
          learnerExperience={learnerExperience}
          a2Alignments={finalResult?.part2?.alignments ?? []}
          onDone={handleDoneAndSubmit}
        />
      </Layout>
    );
  }

  return null;
}

import { useState, useEffect, useRef } from "react";

import Layout            from "../../components/Layout";
import ComprehensionStep from "../../components/ComprehensionStep";
import ResultsStep       from "../../components/ResultsStep";
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

import InfoStep        from "./steps/InfoStep";
import ReadingStep     from "./steps/ReadingStep";
import ScoreReviewStep from "./steps/ScoreReviewStep";
import A2SelectStep    from "./steps/A2SelectStep";

import "../pages css/AssessmentPage.css";

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

export default function AssessmentPage() {
  const [step, setStep] = useState(STEPS.INFO);
  const [form, setForm] = useState(initForm());

  const [students, setStudents]               = useState([]);
  const [allPassages, setAllPassages]         = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingPassages, setLoadingPassages] = useState(false);
  const [fetchError, setFetchError]           = useState(null);

  const [session, setSession]         = useState(null);
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState(null);

  const [g1Score, setG1Score] = useState("");
  const [g2Score, setG2Score] = useState("");

  const [g2Passage, setG2Passage] = useState(null);
  const [a2Passage, setA2Passage] = useState(null);

  const [answers, setAnswers]                     = useState({});
  const [observationLevel, setObservationLevel]   = useState("");
  const [teacherNotes, setTeacherNotes]           = useState("");
  const [learnerExperience, setLearnerExperience] = useState("");
  const [a2RecordingTime, setA2RecordingTime]     = useState(0);

  const [g1Transcript, setG1Transcript] = useState("");
  const [g1Words, setG1Words]           = useState([]);
  const [g2Transcript, setG2Transcript] = useState("");
  const [a2Transcript, setA2Transcript] = useState("");
  const [a2Words, setA2Words]           = useState([]);
  const [isTranscribing, setIsTranscribing]   = useState(false);
  const [transcribeError, setTranscribeError] = useState(null);

  const [isCompleting, setIsCompleting]   = useState(false);
  const [completeError, setCompleteError] = useState(null);

  const [showChoiceModal, setShowChoiceModal]       = useState(false);
  const [recordingMode, setRecordingMode]           = useState(null);
  const [isRecording, setIsRecording]               = useState(false);
  const [audioFile, setAudioFile]                   = useState(null);
  const [showRetakeModal, setShowRetakeModal]       = useState(false);
  const [showTimeLimitModal, setShowTimeLimitModal] = useState(false);
  const [recordingTime, setRecordingTime]           = useState(0);

  const fileInputRef     = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const streamRef        = useRef(null);
  const a2TimeRef        = useRef(0);

  const [fontSizeIdx, setFontSizeIdx] = useState(1);
  const fontSize = FONT_SIZES[fontSizeIdx];

  // Recording timer resets when recording stops
  useEffect(() => {
    if (!isRecording) { setRecordingTime(0); return; }
    const id = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isRecording]);

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
      .then((data) => setAllPassages(data.passages))
      .catch((e) => setFetchError(e.response?.data?.detail || e.message))
      .finally(() => setLoadingPassages(false));
  }, [form.language]);

  // Commit A2 recording duration after MediaRecorder stops
  useEffect(() => {
    if (!isRecording && step === STEPS.A2 && a2TimeRef.current > 0) {
      setA2RecordingTime(a2TimeRef.current);
      a2TimeRef.current = 0;
    }
  }, [isRecording, step]);

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
        period:      PERIOD_MAP[form.assessment_type] ?? "beginning",
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

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
    setRecordingMode("upload");
    e.target.value = "";
    if (step === STEPS.INFO) setStep(STEPS.A1_G1);
  }

  async function handleStartRecording() {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
    } catch {
      setCreateError("Microphone access denied. Please allow access and try again.");
    }
  }

  function handleStopRecording() {
    // Snapshot time before the timer resets on isRecording=false
    if (step === STEPS.A2) {
      setRecordingTime((t) => { a2TimeRef.current = t; return t; });
    }
    setIsRecording(false);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setShowRetakeModal(true);
  }

  // Fire-and-forget transcription, then advance step
  function handleKeepRecording() {
    setShowRetakeModal(false);

    if (session?.id && audioFile) {
      setIsTranscribing(true);
      setTranscribeError(null);

      const fd = new FormData();
      fd.append("audio", audioFile);

      sessionsApi.transcribe(session.id, fd)
        .then((result) => {
          if (step === STEPS.A1_G1) {
            setG1Transcript(result.transcript ?? "");
            setG1Words(result.words ?? []);
          } else if (step === STEPS.A1_G2) {
            setG2Transcript(result.transcript ?? "");
          } else if (step === STEPS.A2) {
            setA2Transcript(result.transcript ?? "");
            setA2Words(result.words ?? []);
          }
        })
        .catch((e) =>
          setTranscribeError(e.response?.data?.detail || e.message || "Transcription failed.")
        )
        .finally(() => setIsTranscribing(false));
    }

    if (step === STEPS.A1_G1) setStep(STEPS.A1_G1_SCORE);
    if (step === STEPS.A1_G2) setStep(STEPS.A1_G2_SCORE);
    if (step === STEPS.A2)    setStep(STEPS.COMPREHENSION);
  }

  function handleRetake() {
    setShowRetakeModal(false);
    setIsRecording(false);
    setRecordingMode(null);
    setAudioFile(null);
    if (step === STEPS.A2) {
      setA2RecordingTime(0);
      a2TimeRef.current = 0;
    }
  }

  function resetRecording() {
    setRecordingMode(null);
    setIsRecording(false);
    setAudioFile(null);
    setShowRetakeModal(false);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  function cycleFontSize() {
    setFontSizeIdx((i) => (i + 1) % FONT_SIZES.length);
  }

  // G2 content is derived from the SAME A1 passage — task2_words or task2_sentences
  function handleConfirmG1Score() {
    const score = parseInt(g1Score, 10);
    if (isNaN(score) || score < 0 || score > 10) return;

    const p       = form.selected_passage;
    const content = score <= 6
      ? (p?.task2_words     ?? "")
      : (p?.task2_sentences ?? "");

    setG2Passage({
      title:      p?.title ?? form.passage_title,
      content,
      word_count: content.trim().split(/\s+/).filter(Boolean).length,
    });
    resetRecording();
    setStep(STEPS.A1_G2);
  }

  function handleConfirmG2Score() {
    const score = parseInt(g2Score, 10);
    if (isNaN(score) || score < 0 || score > 10) return;
    resetRecording();
    setStep(score <= 6 ? STEPS.RESULTS : STEPS.A2_SELECT);
  }

  function handleSelectA2Passage(passage) {
    setA2Passage(passage);
    setStep(STEPS.A2);
  }

  async function handleCompleteSession() {
    if (!session?.id) { handleReset(); return; }
    setIsCompleting(true);
    setCompleteError(null);

    const g1Num     = parseInt(g1Score, 10) || 0;
    const g2Num     = parseInt(g2Score, 10) || 0;
    const reachedA2 = !isNaN(parseInt(g2Score, 10)) && g2Num >= 7;

    const gradeNum = Math.min(3, Math.max(1,
      parseInt(String(form.grade_level).replace("Grade ", ""), 10) || 1
    ));

    const task2Ref = g1Num <= 6
      ? (form.selected_passage?.task2_words     ?? "")
      : (form.selected_passage?.task2_sentences ?? "");

    // Count only "Correct" answers per backend requirement
    const comprehensionCorrect =
      Object.values(answers).filter((v) => v === "Correct").length;

    const obsLevel = OBSERVATION_LEVELS.find((l) => l.value === observationLevel);
    const expOpt   = EXPERIENCE_OPTIONS.find((e) => e.value === learnerExperience);

    const payload = {
      part1: {
        task1_reference_text:   form.selected_passage?.task1_content ?? "",
        task1_transcribed_text: g1Transcript,
        task2_reference_text:   task2Ref,
        task2_transcribed_text: g2Transcript,
      },
      part2: reachedA2
        ? {
            reference_text:          a2Passage?.content ?? "",
            transcribed_text:        a2Transcript,
            reading_time_sec:        a2RecordingTime > 0 ? a2RecordingTime : 1,
            grade_level:             gradeNum,
            comprehension_correct:   comprehensionCorrect,
            fluency_level:           obsLevel?.backendValue ?? null,
            learner_experience:      expOpt?.backendValue   ?? null,
            teacher_remarks:         teacherNotes || null,
            whisper_word_timestamps: a2Words.length > 0 ? a2Words : null,
          }
        : null,
    };

    try {
      await sessionsApi.complete(session.id, payload);
      handleReset();
    } catch (err) {
      setCompleteError(
        err.response?.data?.detail || err.message || "Failed to submit session."
      );
    } finally {
      setIsCompleting(false);
    }
  }

  function handleReset() {
    setStep(STEPS.INFO);
    setForm(initForm());
    setG1Score(""); setG2Score("");
    setG2Passage(null); setA2Passage(null);
    setAnswers({});
    setObservationLevel(""); setTeacherNotes(""); setLearnerExperience("");
    setA2RecordingTime(0); a2TimeRef.current = 0;
    setG1Transcript(""); setG1Words([]);
    setG2Transcript("");
    setA2Transcript(""); setA2Words([]);
    setIsTranscribing(false); setTranscribeError(null);
    setIsCompleting(false); setCompleteError(null);
    setSession(null);
    resetRecording();
  }

  function currentPassage() {
    if (step === STEPS.A1_G1) return {
      title:      form.passage_title,
      content:    form.passage_content,   // set to task1_content in StudentInfoForm
      word_count: form.word_count,
    };
    if (step === STEPS.A1_G2) return g2Passage;
    if (step === STEPS.A2)    return a2Passage;
    return null;
  }

  const passage   = currentPassage();
  const wordCount = passage?.word_count
    || passage?.content?.trim().split(/\s+/).filter(Boolean).length
    || 0;

  const a2Stories     = allPassages.filter((p) => p.assessment_type === 2);
  const isReadingStep = [STEPS.A1_G1, STEPS.A1_G2, STEPS.A2].includes(step);

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
    isOpen:   showChoiceModal,
    onClose:  () => setShowChoiceModal(false),
    onUpload: () => { setShowChoiceModal(false); fileInputRef.current?.click(); },
    onLive:   () => {
      setRecordingMode("live");
      setIsRecording(false);
      setShowChoiceModal(false);
      if (step === STEPS.INFO) setStep(STEPS.A1_G1);
    },
  };

  if (step === STEPS.INFO) {
    return (
      <Layout>
        <InfoStep
          form={form} setForm={setForm}
          students={students} allPassages={allPassages}
          loadingStudents={loadingStudents} loadingPassages={loadingPassages}
          fetchError={fetchError} createError={createError}
          creating={creating} onContinue={handleContinue}
          fileInput={fileInput} choiceModalProps={choiceModalProps}
        />
      </Layout>
    );
  }

  if (isReadingStep) {
    return (
      <Layout>
        <ReadingStep
          stepLabel={STEP_LABELS[step]}
          step={step}
          passage={passage} wordCount={wordCount}
          form={form}
          fontSize={fontSize}
          isRecording={isRecording} recordingMode={recordingMode}
          audioFile={audioFile} recordingTime={recordingTime}
          showRetakeModal={showRetakeModal} showTimeLimitModal={showTimeLimitModal}
          choiceModalProps={choiceModalProps}
          onBack={() => {
            resetRecording();
            if (step === STEPS.A1_G1) setStep(STEPS.INFO);
            if (step === STEPS.A1_G2) setStep(STEPS.A1_G1_SCORE);
            if (step === STEPS.A2)    setStep(STEPS.A2_SELECT);
          }}
          onCycleFontSize={cycleFontSize}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onKeepRecording={handleKeepRecording}
          onRetake={handleRetake}
          onResetRecording={resetRecording}
          onShowChoiceModal={() => setShowChoiceModal(true)}
          onCloseRetakeModal={() => setShowRetakeModal(false)}
          onTimeLimitContinue={() => { setShowTimeLimitModal(false); handleStartRecording(); }}
          onTimeLimitSubmit={() => { setShowTimeLimitModal(false); setShowRetakeModal(true); }}
          fileInput={fileInput}
        />
      </Layout>
    );
  }

  if (step === STEPS.A1_G1_SCORE) {
    return (
      <Layout>
        <ScoreReviewStep
          badge="Assessment 1 — Gawain 1"
          score={g1Score} onScoreChange={setG1Score}
          hint={(s) => s <= 6
            ? "Score 0–6: will proceed to Gawain 2 (Words)"
            : "Score 7–10: will proceed to Gawain 2 (Sentences)"}
          onConfirm={handleConfirmG1Score}
          isTranscribing={isTranscribing}
        />
      </Layout>
    );
  }

  if (step === STEPS.A1_G2_SCORE) {
    return (
      <Layout>
        <ScoreReviewStep
          badge="Assessment 1 — Gawain 2"
          score={g2Score} onScoreChange={setG2Score}
          hint={(s) => s <= 6
            ? "Score 0–6: assessment ends here — go to Summary"
            : "Score 7–10: will proceed to Assessment 2 (Story)"}
          onConfirm={handleConfirmG2Score}
          isTranscribing={isTranscribing}
        />
      </Layout>
    );
  }

  if (step === STEPS.A2_SELECT) {
    return (
      <Layout>
        <A2SelectStep
          a2Stories={a2Stories}
          a2Passage={a2Passage} setA2Passage={setA2Passage}
          onSelect={handleSelectA2Passage}
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
          observationLevel={observationLevel} setObservationLevel={setObservationLevel}
          teacherNotes={teacherNotes} setTeacherNotes={setTeacherNotes}
          learnerExperience={learnerExperience} setLearnerExperience={setLearnerExperience}
          onSubmit={() => setStep(STEPS.RESULTS)}
        />
      </Layout>
    );
  }

  if (step === STEPS.RESULTS) {
    return (
      <Layout>
        <ResultsStep
          form={form}
          g1Score={g1Score} g2Score={g2Score}
          g2Passage={g2Passage} a2Passage={a2Passage}
          a2RecordingTime={a2RecordingTime}
          comprehensionQuestions={a2Passage?.questions ?? []}
          answers={answers}
          observationLevel={observationLevel}
          teacherNotes={teacherNotes}
          learnerExperience={learnerExperience}
          onComplete={handleCompleteSession}
          isCompleting={isCompleting}
          completeError={completeError}
        />
      </Layout>
    );
  }

  return null;
}
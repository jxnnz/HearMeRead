import { useState, useEffect, useRef } from "react";
import { ChevronRight, Mic, Square, Loader2, AlertCircle, Eye, EyeOff, Pause, Play, RotateCcw } from "lucide-react";
import { sessionsApi } from "../services/api";

const ANSWER_OPTIONS = ["Correct", "Wrong", "N/A"];

export default function ComprehensionStep({
  a2Passage,
  sessionId,
  answers,
  setAnswers,
  onSubmit,
}) {
  const questions   = a2Passage?.questions ?? [];
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id]);

  const [recordingQuestionId, setRecordingQuestionId] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [processingQuestionIds, setProcessingQuestionIds] = useState({});
  const [revealedAnswers, setRevealedAnswers] = useState({});
  const [transcripts, setTranscripts] = useState({});
  const [errors, setErrors] = useState({});
  const [audioUrls, setAudioUrls] = useState({});
  const [playingQuestionId, setPlayingQuestionId] = useState(null);

  const toggleRevealAnswer = (qId) => {
    setRevealedAnswers((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioPlayerRef = useRef(null);

  // Clean up recording stream and audio player on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  function pauseRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  }

  function resumeRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  }

  function togglePlayPreview(qId) {
    const url = audioUrls[qId];
    if (!url) return;

    if (playingQuestionId === qId) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingQuestionId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(url);
      audioPlayerRef.current = audio;
      audio.onended = () => setPlayingQuestionId(null);
      audio.play().catch((err) => console.error("Audio playback error:", err));
      setPlayingQuestionId(qId);
    }
  }

  // Web Audio RMS silence detection
  async function checkSilence(audioBlob, threshold = -50) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return { isSilent: false };

      const audioContext = new AudioContextClass();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);

      const duration = audioBuffer.duration;
      if (duration < 0.8) {
        await audioContext.close();
        return { isSilent: true, reason: "Too short" };
      }

      let sumSquares = 0.0;
      for (let i = 0; i < channelData.length; i++) {
        sumSquares += channelData[i] * channelData[i];
      }
      const rms = Math.sqrt(sumSquares / channelData.length);
      const db = rms > 0 ? 20 * Math.log10(rms) : -Infinity;

      await audioContext.close();

      if (db < threshold) {
        return { isSilent: true, reason: "Too quiet" };
      }
      return { isSilent: false };
    } catch (e) {
      console.error("Silence detection error:", e);
      return { isSilent: false };
    }
  }

  async function startRecording(questionId) {
    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        setPlayingQuestionId(null);
      }

      setErrors((prev) => ({ ...prev, [questionId]: null }));
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        // Store preview URL
        const previewUrl = URL.createObjectURL(blob);
        setAudioUrls((prev) => ({ ...prev, [questionId]: previewUrl }));

        // Mark this question as processing asynchronously
        setProcessingQuestionIds((prev) => ({ ...prev, [questionId]: true }));

        // Run silence detection
        const volumeCheck = await checkSilence(blob);
        if (volumeCheck.isSilent) {
          setAnswers((prev) => ({ ...prev, [questionId]: "N/A" }));
          setTranscripts((prev) => ({ ...prev, [questionId]: "" }));
          setErrors((prev) => ({ ...prev, [questionId]: "No voice detected. Marked as N/A." }));
          setProcessingQuestionIds((prev) => ({ ...prev, [questionId]: false }));
          return;
        }

        // Upload and grade asynchronously
        try {
          const formData = new FormData();
          formData.append("audio", blob, "answer.webm");

          const result = await sessionsApi.scoreComprehensionAnswer(sessionId, questionId, formData);

          setTranscripts((prev) => ({ ...prev, [questionId]: result.transcript }));

          let mark = "N/A";
          if (result.mark === "right") mark = "Correct";
          else if (result.mark === "wrong") mark = "Wrong";

          setAnswers((prev) => ({ ...prev, [questionId]: mark }));
        } catch (err) {
          console.error("Grading failed:", err);
          const errorMsg = err.response?.data?.detail || "AI Grading failed. Please mark manually.";
          setErrors((prev) => ({ ...prev, [questionId]: errorMsg }));
        } finally {
          setProcessingQuestionIds((prev) => ({ ...prev, [questionId]: false }));
        }
      };

      recorder.start();
      setRecordingQuestionId(questionId);
      setIsPaused(false);
    } catch (err) {
      console.error("Microphone access error:", err);
      setErrors((prev) => ({ ...prev, [questionId]: "Microphone access denied." }));
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecordingQuestionId(null);
    setIsPaused(false);
  }

  return (
    <div className="asp-page asp-page--wide">
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-spin {
          animation: spin 1.2s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="asp-comp-header">
        <span className="asp-reading-badge">Assessment 2 — Comprehension Check</span>
        <h2 className="asp-comp-header__title">{a2Passage?.title}</h2>
        <p className="asp-comp-header__sub">
          Mark each question based on the student's oral response or use the microphone to auto-grade.
        </p>
      </div>

      <div className="asp-comp-questions">
        {questions.map((q, idx) => {
          const isProcessing = !!processingQuestionIds[q.id];
          const isRecording = recordingQuestionId === q.id;
          const isPlaying = playingQuestionId === q.id;

          return (
            <div key={q.id} className="asp-comp-question" style={{ paddingBottom: "16px", borderBottom: "1px solid #f1f5f9" }}>
              <div className="asp-comp-question-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                <p className="asp-comp-question__text" style={{ margin: 0, flex: 1 }}>{idx + 1}. {q.text}</p>
                
                {/* Mic Recording / Controls */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  {isRecording ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {/* Pause / Resume Button */}
                      {isPaused ? (
                        <button
                          type="button"
                          className="asp-mic-btn"
                          style={{ 
                            background: "#f59e0b", 
                            color: "#fff", 
                            border: "none", 
                            borderRadius: "50%", 
                            width: "36px", 
                            height: "36px", 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center", 
                            cursor: "pointer",
                            boxShadow: "0 2px 4px rgba(245, 158, 11, 0.3)"
                          }}
                          onClick={resumeRecording}
                          title="Resume recording"
                        >
                          <Play size={16} fill="#fff" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="asp-mic-btn"
                          style={{ 
                            background: "#64748b", 
                            color: "#fff", 
                            border: "none", 
                            borderRadius: "50%", 
                            width: "36px", 
                            height: "36px", 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center", 
                            cursor: "pointer",
                            boxShadow: "0 2px 4px rgba(100, 116, 139, 0.3)"
                          }}
                          onClick={pauseRecording}
                          title="Pause recording"
                        >
                          <Pause size={16} fill="#fff" />
                        </button>
                      )}

                      {/* Stop & Finish Button */}
                      <button
                        type="button"
                        className="asp-mic-btn asp-mic-btn--recording"
                        style={{ 
                          background: "#ef4444", 
                          color: "#fff", 
                          border: "none", 
                          borderRadius: "50%", 
                          width: "36px", 
                          height: "36px", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center", 
                          cursor: "pointer",
                          animation: isPaused ? "none" : "pulse 1.5s infinite",
                          boxShadow: "0 2px 6px rgba(239, 68, 68, 0.4)"
                        }}
                        onClick={stopRecording}
                        title="Finish recording and grade answer"
                      >
                        <Square size={14} fill="#fff" />
                      </button>
                    </div>
                  ) : isProcessing ? (
                    <button
                      type="button"
                      className="asp-mic-btn"
                      style={{ 
                        background: "#f3f4f6", 
                        color: "#9ca3af", 
                        border: "none", 
                        borderRadius: "50%", 
                        width: "36px", 
                        height: "36px", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        cursor: "not-allowed" 
                      }}
                      disabled
                      title="Transcribing and AI grading audio..."
                    >
                      <Loader2 size={16} className="animate-spin" />
                    </button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {/* Audio Preview Button */}
                      {audioUrls[q.id] && (
                        <button
                          type="button"
                          className="asp-mic-btn"
                          style={{ 
                            background: isPlaying ? "#10b981" : "#0284c7", 
                            color: "#fff", 
                            border: "none", 
                            borderRadius: "50%", 
                            width: "36px", 
                            height: "36px", 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center", 
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            boxShadow: "0 2px 4px rgba(2, 132, 199, 0.3)"
                          }}
                          onClick={() => togglePlayPreview(q.id)}
                          title={isPlaying ? "Pause audio preview" : "Listen to recorded audio preview"}
                        >
                          {isPlaying ? <Pause size={16} fill="#fff" /> : <Play size={16} fill="#fff" style={{ marginLeft: "2px" }} />}
                        </button>
                      )}

                      {/* Record / Re-record Button */}
                      <button
                        type="button"
                        className="asp-mic-btn"
                        style={{ 
                          background: "#2c3e6b", 
                          color: "#fff", 
                          border: "none", 
                          borderRadius: "50%", 
                          width: "36px", 
                          height: "36px", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center", 
                          cursor: recordingQuestionId !== null ? "not-allowed" : "pointer",
                          opacity: recordingQuestionId !== null ? 0.6 : 1,
                          boxShadow: "0 2px 4px rgba(44, 62, 107, 0.3)"
                        }}
                        disabled={recordingQuestionId !== null}
                        onClick={() => startRecording(q.id)}
                        title={audioUrls[q.id] ? "Re-record student answer" : "Record student answer"}
                      >
                        {audioUrls[q.id] ? <RotateCcw size={15} /> : <Mic size={16} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>

            {/* Covered Answer Key */}
            {q.answer_key && (
              <div style={{ marginTop: "6px", marginBottom: "6px" }}>
                {revealedAnswers[q.id] ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <p className="asp-comp-question__answer" style={{ margin: 0 }}>
                      <span className="asp-comp-question__answer-label">Answer:</span> {q.answer_key}
                    </p>
                    <button
                      type="button"
                      onClick={() => toggleRevealAnswer(q.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#64748b",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: 0,
                        textDecoration: "underline"
                      }}
                      title="Hide answer key"
                    >
                      <EyeOff size={13} /> Hide
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleRevealAnswer(q.id)}
                    style={{
                      background: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      padding: "4px 10px",
                      fontSize: "0.82rem",
                      fontWeight: "600",
                      color: "#334155",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.15s ease"
                    }}
                    title="Click to reveal expected answer"
                  >
                    <Eye size={14} /> Reveal Answer
                  </button>
                )}
              </div>
            )}

            {/* Transcribed Spoken Answer */}
            {transcripts[q.id] && (
              <p className="asp-comp-question__transcript" style={{ 
                fontSize: "0.9rem", 
                color: "#4b5563", 
                background: "#f9fafb", 
                padding: "6px 10px", 
                borderRadius: "6px", 
                borderLeft: "3px solid #000000",
                marginTop: "6px",
                marginBottom: "4px"
              }}>
                <strong style={{ color: "#1f2937" }}>Spoken Answer: </strong>"{transcripts[q.id]}"
              </p>
            )}

            {/* Error message */}
            {errors[q.id] && (
              <p className="asp-comp-question__error" style={{ 
                fontSize: "0.85rem", 
                color: "#ef4444", 
                display: "flex", 
                alignItems: "center", 
                gap: "4px",
                marginTop: "4px",
                marginBottom: "4px"
              }}>
                <AlertCircle size={14} /> {errors[q.id]}
              </p>
            )}

            <div className="asp-comp-choices" style={{ marginTop: "12px" }}>
              {ANSWER_OPTIONS.map((opt) => {
                const isActive = answers[q.id] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`asp-comp-choice${isActive ? " asp-comp-choice--active" : ""}`}
                    style={isActive ? {
                      background: "#ffffff",
                      border: "2.5px solid #000000",
                      color: "#000000",
                      fontWeight: "700",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.12)"
                    } : {
                      background: "#ffffff",
                      border: "1.5px solid #cbd5e1",
                      color: "#475569",
                      fontWeight: "500"
                    }}
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      </div>

      <button
        className="asp-continue-btn"
        onClick={onSubmit}
        disabled={!allAnswered}
      >
        Submit and Continue <ChevronRight size={16} />
      </button>
    </div>
  );
}

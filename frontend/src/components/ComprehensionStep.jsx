import { useState, useEffect, useRef } from "react";
import { ChevronRight, Mic, Square, Loader2, AlertCircle } from "lucide-react";
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
  const [processingQuestionId, setProcessingQuestionId] = useState(null);
  const [transcripts, setTranscripts] = useState({});
  const [errors, setErrors] = useState({});

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  // Clean up recording stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

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

        setProcessingQuestionId(questionId);

        // Run silence detection
        const volumeCheck = await checkSilence(blob);
        if (volumeCheck.isSilent) {
          setAnswers((prev) => ({ ...prev, [questionId]: "N/A" }));
          setTranscripts((prev) => ({ ...prev, [questionId]: "" }));
          setErrors((prev) => ({ ...prev, [questionId]: "No voice detected. Marked as N/A." }));
          setProcessingQuestionId(null);
          return;
        }

        // Upload and grade
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
          setProcessingQuestionId(null);
        }
      };

      recorder.start();
      setRecordingQuestionId(questionId);
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
        {questions.map((q, idx) => (
          <div key={q.id} className="asp-comp-question" style={{ paddingBottom: "16px", borderBottom: "1px solid #f1f5f9" }}>
            <div className="asp-comp-question-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
              <p className="asp-comp-question__text" style={{ margin: 0, flex: 1 }}>{idx + 1}. {q.text}</p>
              
              {/* Mic Recording Controls */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                {recordingQuestionId === q.id ? (
                  <button
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
                      animation: "pulse 1.5s infinite"
                    }}
                    onClick={stopRecording}
                    title="Stop recording and grade"
                  >
                    <Square size={16} fill="#fff" />
                  </button>
                ) : (
                  <button
                    className="asp-mic-btn"
                    style={{ 
                      background: processingQuestionId === q.id ? "#f3f4f6" : "#2c3e6b", 
                      color: processingQuestionId === q.id ? "#9ca3af" : "#fff", 
                      border: "none", 
                      borderRadius: "50%", 
                      width: "36px", 
                      height: "36px", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      cursor: processingQuestionId === q.id ? "not-allowed" : "pointer" 
                    }}
                    disabled={processingQuestionId !== null}
                    onClick={() => startRecording(q.id)}
                    title="Record student answer"
                  >
                    {processingQuestionId === q.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Mic size={16} />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Expected Answer */}
            {q.answer_key && (
              <p className="asp-comp-question__answer" style={{ marginTop: "6px", marginBottom: "4px" }}>
                <span className="asp-comp-question__answer-label">Answer:</span> {q.answer_key}
              </p>
            )}

            {/* Transcribed Spoken Answer */}
            {transcripts[q.id] && (
              <p className="asp-comp-question__transcript" style={{ 
                fontSize: "0.9rem", 
                color: "#4b5563", 
                background: "#f9fafb", 
                padding: "6px 10px", 
                borderRadius: "6px", 
                borderLeft: "3px solid #2c3e6b",
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
                const key      = opt.toLowerCase().replace("/", "");
                const isActive = answers[q.id] === opt;
                return (
                  <button
                    key={opt}
                    className={`asp-comp-choice asp-comp-choice--${key}${isActive ? " asp-comp-choice--active" : ""}`}
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
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

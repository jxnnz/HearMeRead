import { useState, useRef, useCallback } from "react";
import {
  Mic, Square, Upload, Volume2, RefreshCw,
  CheckCircle, Clock, RotateCcw, FlaskConical,
} from "lucide-react";
import Layout from "../components/Layout";
import AppButton from "../components/AppButton";
import { sessionsApi } from "../services/api";
import "./pages css/ASRTestPage.css";

const formatTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function ASRTestPage() {
  const [sessionId, setSessionId]   = useState("");
  const [mode, setMode]             = useState("record"); // "record" | "upload"

  // ── Record state ──────────────────────────────────────────────────────────
  const [isRecording, setIsRecording]   = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl]   = useState(null);
  const [recSeconds, setRecSeconds]     = useState(0);

  // ── Upload state ──────────────────────────────────────────────────────────
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedUrl, setUploadedUrl]   = useState(null);

  // ── Submission state ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [result, setResult]   = useState(null);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const timerRef         = useRef(null);
  const fileInputRef     = useRef(null);

  // ── Recording controls ────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr     = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current        = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url  = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start();
      setIsRecording(true);
      setRecSeconds(0);
      setRecordedBlob(null);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);

      timerRef.current = setInterval(() => setRecSeconds((t) => t + 1), 1000);
    } catch {
      setError("Microphone access denied — please allow microphone permissions in your browser.");
    }
  }, [recordedUrl]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  }, [isRecording]);

  const resetRecording = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecSeconds(0);
    setResult(null);
    setError(null);
  };

  // ── File upload ───────────────────────────────────────────────────────────
  const acceptFile = (file) => {
    if (!file) return;
    if (uploadedUrl) URL.revokeObjectURL(uploadedUrl);
    setUploadedFile(file);
    setUploadedUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const handleFileChange = (e) => acceptFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    acceptFile(e.dataTransfer.files[0]);
  };

  // ── Transcribe ────────────────────────────────────────────────────────────
  const handleTranscribe = async () => {
    if (!sessionId.trim()) {
      setError("Please enter a session ID.");
      return;
    }
    const audioBlob = mode === "record" ? recordedBlob : uploadedFile;
    if (!audioBlob) {
      setError(
        mode === "record"
          ? "Please record some audio first."
          : "Please upload an audio file first."
      );
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const fd       = new FormData();
      const filename = mode === "record" ? "recording.webm" : uploadedFile.name;
      fd.append("audio", audioBlob, filename);
      const data = await sessionsApi.transcribe(sessionId.trim(), fd);
      setResult(data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : detail
          ? JSON.stringify(detail)
          : err.message || "Transcription failed."
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const audioUrl  = mode === "record" ? recordedUrl  : uploadedUrl;
  const hasAudio  = Boolean(audioUrl);
  const canSubmit = hasAudio && !isRecording && !loading;

  return (
    <Layout>
      <div className="asr-page">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="asr-page__header">
          <div className="asr-page__title-row">
            <FlaskConical size={20} className="asr-page__icon" />
            <h2 className="asr-page__title">ASR Model Tester</h2>
          </div>
          <p className="asr-page__subtitle">
            Verify Whisper transcription quality for English and Filipino oral reading
          </p>
        </div>

        {/* ── Session ID ────────────────────────────────────────────────── */}
        <div className="asr-card">
          <label className="asr-label" htmlFor="session-id-input">
            Session ID
          </label>
          <input
            id="session-id-input"
            className="asr-input"
            type="number"
            min="1"
            placeholder="e.g. 42"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
          />
          <p className="asr-hint">
            Must be a session that belongs to your account. The language (EN/FIL)
            and Whisper model are determined automatically from the session.
          </p>
        </div>

        {/* ── Mode tabs ─────────────────────────────────────────────────── */}
        <div className="asr-tabs">
          <button
            className={`asr-tab${mode === "record" ? " asr-tab--active" : ""}`}
            onClick={() => setMode("record")}
          >
            <Mic size={14} />
            Record
          </button>
          <button
            className={`asr-tab${mode === "upload" ? " asr-tab--active" : ""}`}
            onClick={() => setMode("upload")}
          >
            <Upload size={14} />
            Upload File
          </button>
        </div>

        {/* ── Record panel ──────────────────────────────────────────────── */}
        {mode === "record" && (
          <div className="asr-card">
            <div className="asr-recorder">
              {isRecording ? (
                <div className="asr-recorder__status">
                  <span className="asr-recorder__dot" />
                  <span className="asr-recorder__timer">{formatTime(recSeconds)}</span>
                  <span className="asr-recorder__label">Recording…</span>
                </div>
              ) : recordedBlob ? (
                <div className="asr-recorder__status asr-recorder__status--done">
                  <CheckCircle size={18} className="asr-recorder__check" />
                  <span className="asr-recorder__label">
                    Recording ready &mdash; {formatTime(recSeconds)}
                  </span>
                </div>
              ) : (
                <p className="asr-recorder__idle">
                  Press <strong>Start Recording</strong> and read the passage aloud
                </p>
              )}

              <div className="asr-recorder__controls">
                {!isRecording ? (
                  <AppButton variant="primary" onClick={startRecording}>
                    <Mic size={14} />
                    {recordedBlob ? "Re-record" : "Start Recording"}
                  </AppButton>
                ) : (
                  <AppButton variant="danger" onClick={stopRecording}>
                    <Square size={13} />
                    Stop
                  </AppButton>
                )}
                {recordedBlob && !isRecording && (
                  <AppButton variant="ghost" size="sm" onClick={resetRecording}>
                    <RotateCcw size={13} />
                    Reset
                  </AppButton>
                )}
              </div>
            </div>

            {recordedUrl && (
              <div className="asr-audio">
                <Volume2 size={14} className="asr-audio__icon" />
                <audio controls src={recordedUrl} className="asr-audio__player" />
              </div>
            )}
          </div>
        )}

        {/* ── Upload panel ──────────────────────────────────────────────── */}
        {mode === "upload" && (
          <div className="asr-card">
            <div
              className="asr-dropzone"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            >
              <Upload size={26} className="asr-dropzone__icon" />
              <p className="asr-dropzone__text">Drop a file here or click to browse</p>
              <p className="asr-dropzone__hint">WebM · MP3 · WAV · M4A · OGG — max 25 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/webm,audio/mp3,audio/mpeg,audio/wav,audio/ogg,audio/mp4,.webm,.mp3,.wav,.m4a,.ogg"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
            </div>

            {uploadedFile && (
              <div className="asr-file-info">
                <CheckCircle size={14} className="asr-file-info__icon" />
                <span className="asr-file-info__name">{uploadedFile.name}</span>
                <span className="asr-file-info__size">
                  {(uploadedFile.size / 1024).toFixed(1)} KB
                </span>
              </div>
            )}

            {uploadedUrl && (
              <div className="asr-audio">
                <Volume2 size={14} className="asr-audio__icon" />
                <audio controls src={uploadedUrl} className="asr-audio__player" />
              </div>
            )}
          </div>
        )}

        {/* ── Submit ────────────────────────────────────────────────────── */}
        <div className="asr-actions">
          <AppButton
            variant="primary"
            size="lg"
            onClick={handleTranscribe}
            disabled={!canSubmit}
          >
            {loading ? (
              <RefreshCw size={14} className="asr-spin" />
            ) : (
              <Mic size={14} />
            )}
            {loading ? "Transcribing…" : "Transcribe"}
          </AppButton>
        </div>

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error && <div className="asr-error">{error}</div>}

        {/* ── Results ───────────────────────────────────────────────────── */}
        {result && (
          <div className="asr-results">
            <div className="asr-results__header">
              <h3 className="asr-results__title">Transcription Result</h3>
              <div className="asr-results__badges">
                <span className="asr-badge asr-badge--accent">
                  lang: {result.language}
                </span>
                <span className="asr-badge asr-badge--neutral">
                  model: {result.model_used}
                </span>
                <span className="asr-badge asr-badge--neutral">
                  {result.word_count} words
                </span>
                {result.audio_expires_at && (
                  <span className="asr-badge asr-badge--dim">
                    <Clock size={11} />
                    audio expires{" "}
                    {new Date(result.audio_expires_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* Transcript */}
            <div className="asr-section">
              <span className="asr-label">Transcript</span>
              <div className="asr-transcript">
                {result.transcript || <em className="asr-transcript--empty">(empty transcript)</em>}
              </div>
            </div>

            {/* Word timestamps */}
            {result.words?.length > 0 && (
              <details className="asr-words">
                <summary className="asr-words__summary">
                  Word-level timestamps &mdash; {result.words.length} words
                </summary>
                <div className="asr-words__scroll">
                  <table className="asr-words__table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Word</th>
                        <th>Start (s)</th>
                        <th>End (s)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.words.map((w, i) => (
                        <tr key={i}>
                          <td className="asr-words__num">{i + 1}</td>
                          <td>
                            <code className="asr-word-code">{w.word}</code>
                          </td>
                          <td className="asr-words__ts">{w.start.toFixed(3)}</td>
                          <td className="asr-words__ts">{w.end.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

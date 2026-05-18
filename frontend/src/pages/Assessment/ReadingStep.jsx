import { ChevronLeft, Mic, Type, Pause, Play } from "lucide-react";
import RecordingChoiceModal from "../../modals/RecordingChoiceModal";
import RetakeModal          from "../../modals/RetakeModal";
import TimeLimitModal       from "../../modals/TimeLimitModal";

function formatTime(secs) {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

export default function ReadingStep({
  stepLabel,
  passage,
  wordCount,
  form,
  fontSize,
  isRecording,
  isPaused,
  recordingMode,
  audioFile,
  recordingTime,
  a2TimeLimit,      // null for A1, number (seconds) for A2
  showRetakeModal,
  showTimeLimitModal,
  choiceModalProps,
  onBack,
  onCycleFontSize,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  onKeepRecording,
  onRetake,
  onResetRecording,
  onShowChoiceModal,
  onCloseRetakeModal,
  onTimeLimitContinue,
  onTimeLimitSubmit,
}) {
  const timeLimitLabel = a2TimeLimit != null ? ` / ${formatTime(a2TimeLimit)}` : "";

  return (
    <>
      <div className="asp-reading-screen">

        {/* Header */}
        <div className="asp-reading-header">
          <div className="asp-reading-header__left">
            <button className="asp-reading-back" onClick={onBack}>
              <ChevronLeft size={18} />
            </button>
            <div className="asp-reading-header__info">
              <span className="asp-reading-badge">{stepLabel}</span>
              <h2 className="asp-reading-title">
                {passage?.title || "Untitled Passage"}
                <span className="asp-reading-wordcount">({wordCount} words)</span>
              </h2>
              <p className="asp-reading-meta">
                {form.first_name} {form.last_name} · Grade {String(form.grade_level || "").replace("grade_", "")} ·{" "}
                {form.section} · {form.school_year}
              </p>
            </div>
          </div>
          <div className="asp-reading-header__right">
            <button className="asp-reading-ctrl" onClick={onCycleFontSize}>
              <Type size={15} /><span>Aa</span>
              <span className="asp-ctrl-size">{fontSize}px</span>
            </button>

            {/* Recording indicator in header */}
            {isRecording && !isPaused && (
              <div className="asp-reading-ctrl asp-reading-ctrl--mic asp-reading-ctrl--active">
                <Mic size={16} />
                <span className="asp-recording-dot" />
              </div>
            )}
            {isRecording && isPaused && (
              <div className="asp-reading-ctrl asp-reading-ctrl--mic asp-reading-ctrl--paused">
                <Pause size={16} />
              </div>
            )}
          </div>
        </div>

        {/* Passage text */}
        <div className="asp-reading-body">
          {passage?.content ? (
            <p className="asp-reading-text" style={{ fontSize: `${fontSize}px` }}>
              {passage.content}
            </p>
          ) : (
            <p className="asp-reading-empty">No passage content available.</p>
          )}
        </div>

        {/* Footer: recording controls */}
        <div className="asp-reading-footer">

          {/* No mode chosen yet — plain mic to open modal */}
          {!recordingMode && (
            <button className="asp-mic-btn" onClick={onShowChoiceModal}>
              <Mic size={24} />
            </button>
          )}

          {/* Live mode — ready to start */}
          {recordingMode === "live" && !isRecording && (
            <div className="asp-recording-active">
              <button className="asp-mic-btn asp-mic-btn--ready" onClick={onStartRecording}>
                <Mic size={24} />
              </button>
              <p className="asp-recording-mode-label asp-recording-mode-label--ready">
                Press to start recording
              </p>
            </div>
          )}

          {/* Live mode — recording in progress */}
          {recordingMode === "live" && isRecording && (
            <div className="asp-recording-active">
              <div className="asp-recording-controls">
                {/* Red stop/finish button */}
                <button
                  className="asp-record-btn asp-record-btn--recording"
                  onClick={onStopRecording}
                  title="Stop recording"
                >
                  <span className="asp-record-btn__dot" />
                </button>

                {/* Pause / Resume */}
                {isPaused ? (
                  <button
                    className="asp-record-btn asp-record-btn--pause"
                    onClick={onResumeRecording}
                    title="Resume recording"
                  >
                    <Play size={18} />
                  </button>
                ) : (
                  <button
                    className="asp-record-btn asp-record-btn--pause"
                    onClick={onPauseRecording}
                    title="Pause recording"
                  >
                    <Pause size={18} />
                  </button>
                )}
              </div>

              <p className="asp-recording-mode-label asp-recording-mode-label--active">
                {isPaused ? "Paused — press play to resume" : "Recording… press ● to finish"}
              </p>
            </div>
          )}

          {/* Upload mode */}
          {recordingMode === "upload" && (
            <div className="asp-recording-active">
              <div className="asp-mic-btn asp-mic-btn--upload"><Mic size={24} /></div>
              <p className="asp-recording-mode-label">
                {audioFile ? audioFile.name : "Audio file selected"}
              </p>
              <button className="asp-recording-cancel" onClick={onResetRecording}>Remove</button>
            </div>
          )}
        </div>
      </div>

      <RecordingChoiceModal {...choiceModalProps} />

      <RetakeModal
        isOpen={showRetakeModal}
        onClose={onCloseRetakeModal}
        onRetake={onRetake}
        onKeep={onKeepRecording}
      />

      <TimeLimitModal
        isOpen={showTimeLimitModal}
        onContinue={onTimeLimitContinue}
        onSubmit={onTimeLimitSubmit}
      />
    </>
  );
}

import { ChevronLeft, Mic, Type } from "lucide-react";
import RecordingChoiceModal from "../../modals/RecordingChoiceModal";
import RetakeModal from "../../modals/RetakeModal";
import TimeLimitModal from "../../modals/TimeLimitModal";
import RecordingTimer from "../../components/RecordingTimer";

export default function ReadingStep({
  stepLabel,
  passage,
  wordCount,
  form,
  fontSize,
  isRecording,
  recordingMode,
  audioFile,
  recordingTime,
  showRetakeModal,
  showTimeLimitModal,
  choiceModalProps,
  onBack,
  onCycleFontSize,
  onStartRecording,
  onStopRecording,
  onKeepRecording,
  onRetake,
  onResetRecording,
  onShowChoiceModal,
  onCloseRetakeModal,
  onTimeLimitContinue,
  onTimeLimitSubmit,
  fileInput,
}) {
  return (
    <>
      {fileInput}
      <div className="asp-reading-screen">

        {/* ── Header ── */}
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
                {form.first_name} {form.last_name} · Grade {form.grade_level} ·{" "}
                {form.section} · {form.school_year}
              </p>
            </div>
          </div>
          <div className="asp-reading-header__right">
            <button className="asp-reading-ctrl" onClick={onCycleFontSize}>
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
            <button className="asp-mic-btn" onClick={onShowChoiceModal}>
              <Mic size={24} />
            </button>
          )}

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

          {recordingMode === "live" && isRecording && (
            <RecordingTimer
              recordingTime={recordingTime}
              isRecording={isRecording}
              onStop={onStopRecording}
            />
          )}

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

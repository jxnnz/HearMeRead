import { AlertTriangle } from "lucide-react";

export default function TranscriptionWarningBanner() {
  return (
    <div className="asp-transcription-warning">
      <AlertTriangle size={15} />
      <span>Check the transcription for any error — the model is not perfect.</span>
    </div>
  );
}

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { OBSERVATION_LEVELS } from "../../data/assessmentConstants";
import { sessionsApi } from "../../services/api";

export default function ObservationStep({ sessionId, learnerExperience, onComplete, onBack }) {
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [remarks, setRemarks]             = useState("");
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState(null);

  async function handleSubmit() {
    if (!selectedLevel) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        observation_level: selectedLevel,
        teacher_remarks:   remarks.trim() || null,
      };
      if (learnerExperience != null) payload.learner_experience = learnerExperience;
      const data = await sessionsApi.saveObservation(sessionId, payload);
      onComplete(data);
    } catch (e) {
      setError(e.response?.data?.detail || e.message || "Failed to save observation.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="asp-page asp-page--wide">
      <div className="asp-comp-header">
        <span className="asp-reading-badge">Teacher Observation</span>
        <h2 className="asp-comp-header__title">Reading Level &amp; Remarks</h2>
        <p className="asp-comp-header__sub">
          Record your observation of the student's reading before finishing.
        </p>
      </div>

      <div className="asp-obs-panel">
        <div className="asp-obs-section">
          <p className="asp-obs-section__label">Reading Level</p>
          {OBSERVATION_LEVELS.map((level) => (
            <label key={level.value} className="asp-obs-radio">
              <input
                type="radio"
                name="observationLevel"
                value={level.backendValue}
                checked={selectedLevel === level.backendValue}
                onChange={() => setSelectedLevel(level.backendValue)}
              />
              <span className="asp-obs-radio__info">
                <span className="asp-obs-radio__label">{level.label}</span>
                <span className="asp-obs-radio__desc">{level.desc}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="asp-obs-section">
          <p className="asp-obs-section__label">Teacher Remarks</p>
          <textarea
            className="asp-obs-textarea"
            placeholder="Write your observations here…"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            maxLength={1000}
            rows={5}
          />
        </div>
      </div>

      {error && (
        <p className="asp-error" style={{ textAlign: "center", marginTop: "12px" }}>
          ⚠ {error}
        </p>
      )}

      <div className="asp-obs-footer">
        {onBack && (
          <button className="asp-obs-footer__back" onClick={onBack} disabled={saving}>
            <ChevronLeft size={16} /> Back
          </button>
        )}
        <button
          className="asp-continue-btn"
          onClick={handleSubmit}
          disabled={!selectedLevel || saving}
        >
          {saving ? "Saving…" : "Save & Continue"} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

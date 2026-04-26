// ============================================================
// HearMeRead — StudentStatsBar Component
// 4 stat boxes: Total Assessments, Accuracy, WPM, Observation
// ============================================================
import "./StudentInfoPage.css";

export default function StudentStatsBar({ stats = {} }) {
  const {
    totalAssessments = 0,
    accuracy         = null,
    avgWpm           = null,
    observationLevel = null,
  } = stats;

  return (
    <div className="sip-stats-bar">
      <div className="sip-stat">
        <span className="sip-stat__value sip-stat__value--blue">
          {totalAssessments}
        </span>
        <span className="sip-stat__label">Total Assessments</span>
      </div>

      <div className="sip-stats-divider" />

      <div className="sip-stat">
        <span className="sip-stat__value sip-stat__value--green">
          {accuracy != null ? `${accuracy}%` : "—"}
        </span>
        <span className="sip-stat__label">Accuracy</span>
      </div>

      <div className="sip-stats-divider" />

      <div className="sip-stat">
        <span className="sip-stat__value sip-stat__value--navy">
          {avgWpm ?? "—"}
        </span>
        <span className="sip-stat__label">Average WPM</span>
      </div>

      <div className="sip-stats-divider" />

      <div className="sip-stat">
        <span className="sip-stat__value sip-stat__value--orange">
          {observationLevel ?? "—"}
        </span>
        <span className="sip-stat__label">Observation Level</span>
      </div>
    </div>
  );
}
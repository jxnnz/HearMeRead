
import "./component css/StudentCard.css";

// ── Reading profile → badge color mapping ─────────────────────
const LEVEL_COLORS = {
  "Reading at Grade Level": "#639922",
  "Transitioning Reader":    "#378ADD",
  "Developing Reader":     "#EF9F27",
  "High Emerging Reader":   "#D4537E",
  "Low Emerging Reader":   "#E24B4A",
};

function LevelBadge({ level }) {
  const bg = LEVEL_COLORS[level] ?? "#f9c74f";
  return (
    <span className="sc-badge" style={{ background: bg }}>
      {level ?? "—"}
    </span>
  );
}

function StatBox({ value, label, isPercent = false, showTrend = false }) {
  return (
    <div className="sc-stat">
      <span className="sc-stat__value">
        {value ?? "—"}
        {isPercent && value != null ? "%" : ""}
        {showTrend && value != null && (
          <span className="sc-stat__arrow">↑</span>
        )}
      </span>
      <span className="sc-stat__label">{label}</span>
    </div>
  );
}

export default function StudentCard({ student, onClick }) {
  const fullName = `${student.first_name} ${student.last_name}`;

  // Latest session stats — backend may return these pre-computed
  const accuracy  = student.latest_accuracy;
  const wpm       = student.latest_wpm;
  const sessions  = student.session_count ?? 0;
  const trend     = student.trend;

  return (
    <div
      className="sc-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      aria-label={`View ${fullName}`}
    >
      {/* ── Name & LRN ── */}
      <h3 className="sc-name">{fullName}</h3>
      <p className="sc-lrn">LRN: {student.lrn ?? student.id}</p>

      {/* ── Badges: Grade + Reading Level ── */}
      <div className="sc-badges">
        <span className="sc-badge sc-badge--grade">
          {student.grade_level}
        </span>
        <LevelBadge level={student.reading_profile} />
      </div>

      {/* ── 2×2 Stats grid ── */}
      <div className="sc-stats">
        <StatBox value={accuracy} label="Accuracy"  isPercent />
        <StatBox value={wpm}      label="WPM" />
        <StatBox value={sessions} label="Sessions" />
        <StatBox value={trend}    label="Trend" isPercent showTrend />
      </div>
    </div>
  );
}
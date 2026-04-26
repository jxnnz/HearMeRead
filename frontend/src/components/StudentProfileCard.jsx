// ============================================================
// StudentProfileCard Component
// student full name, reading level
// badge, LRN, sex, and grade + section
// ============================================================

import "./StudentInfoPage.css";

// ── Reading profile badge colors ───────────────────────────────
const LEVEL_COLORS = {
    "Reading at Grade Level": "#639922",
    "Transitioning Reader":   "#378ADD",
    "Developing Reader":      "#EF9F27",
    "High Emerging Reader":   "#D4537E",
    "Low Emerging Reader":    "#E24B4A",
};

export default function StudentProfileCard({ student }) {
  if (!student) return null;

  const initials = `${student.first_name?.[0] ?? ""}${student.last_name?.[0] ?? ""}`.toUpperCase();
  const fullName = `${student.first_name} ${student.last_name}`;
  const levelStyle = LEVEL_COLORS[student.reading_profile] ?? { bg: "#eef0f8", color: "#5a6382" };

  return (
    <div className="sip-profile-card">
      {/* ── Avatar ── */}
      <div className="sip-avatar">
        <span className="sip-avatar__initials">{initials}</span>
      </div>

      {/* ── Info ── */}
      <div className="sip-profile-info">
        <div className="sip-profile-name-row">
          <h2 className="sip-profile-name">{fullName}</h2>
          {student.reading_level && (
            <span
              className="sip-level-badge"
              style={{ background: levelStyle.bg, color: levelStyle.color }}
            >
              {student.reading_profile}
            </span>
          )}
        </div>

        <div className="sip-profile-meta">
          <span>
            <span className="sip-meta-icon">🪪</span>
            LRN: {student.lrn ?? "—"}
          </span>
          <span>
            <span className="sip-meta-icon">⚥</span>
            {student.sex
              ? student.sex.charAt(0).toUpperCase() + student.sex.slice(1)
              : "—"}
          </span>
          <span>
            <span className="sip-meta-icon">📚</span>
            Grade {student.grade_level} – {student.section ?? "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
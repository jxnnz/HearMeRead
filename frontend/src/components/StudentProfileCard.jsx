// ============================================================
// HearMeRead — StudentProfileCard Component
// Shows student avatar, name, reading level badge, and meta info.
//
// Props:
//   student — student object
// ============================================================
import "../pages/StudentInfoPage.css";

const LEVEL_COLORS = {
  "Reading at Grade Level": { background: "#639922", color: "#ffffff" },
  "Transitioning Reader": { background: "#378ADD", color: "#ffffff" },
  "Developing Reader":    { background: "#EF9F27", color: "#ffffff" },
  "High Emerging Reader": { background: "#D4537E", color: "#ffffff" },
  "Low Emerging Reader": { background: "#E24B4A", color: "#ffffff"},
};

function getInitials(first = "", last = "") {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export default function StudentProfileCard({ student }) {
  if (!student) return null;

  const {
    first_name,
    last_name,
    lrn,
    sex,
    grade_level,
    section,
    teacher,
    reading_profile,
  } = student;

  const badgeStyle = LEVEL_COLORS[reading_profile] ?? { background: "#f4f6fb", color: "#5a6382" };

  return (
    <div className="spc-card">
      {/* ── Profile row ── */}
      <div className="spc-profile">
        <div className="spc-avatar">{getInitials(first_name, last_name)}</div>

        <div className="spc-info">
          <div className="spc-info__top">
            <h2 className="spc-name">{first_name} {last_name}</h2>
            {reading_profile && (
              <span className="spc-level-badge" style={badgeStyle}>
                {reading_profile}
              </span>
            )}
          </div>

          <div className="spc-info__meta">
            <span>LRN: {lrn ?? "—"}</span>
            <span>·</span>
            <span style={{ textTransform: "capitalize" }}>{sex ?? "—"}</span>
            <span>·</span>
            <span>Grade {grade_level} — {section}</span>
            {teacher && (
              <>
                <span>·</span>
                <span>{teacher}</span>
              </>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
// ============================================================
// HearMeRead — DashboardStatCard Component
// Single stat box with colored value + label
//
// Props:
//   value  — the big number/text to display
//   label  — description below the value
//   color  — CSS color string for the value
// ============================================================
export default function DashboardStatCard({ value, label, color }) {
  return (
    <div className="db-stat-card">
      <span className="db-stat-card__value" style={{ color }}>
        {value ?? "—"}
      </span>
      <span className="db-stat-card__label">{label}</span>
    </div>
  );
}
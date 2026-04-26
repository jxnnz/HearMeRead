// ============================================================
// HearMeRead — StudentStatsBar Component
// 4 icon stat cards: Total Assessments, Accuracy, WPM, Level
//
// Props:
//   stats — { totalAssessments, accuracy, avgWpm, observationLevel }
// ============================================================
import { ClipboardList, Target, Gauge, Star } from "lucide-react";
import "../pages/StudentInfoPage.css";

const STATS_CONFIG = [
  {
    key:   "totalAssessments",
    label: "Total Assessments",
    icon:  ClipboardList,
    color: "#2c7fc1",
    bg:    "#e8f0fe",
    format: (v) => v ?? 0,
  },
  {
    key:   "accuracy",
    label: "Accuracy",
    icon:  Target,
    color: "#27ae60",
    bg:    "#e8f5e9",
    format: (v) => (v != null ? `${v}%` : "—"),
  },
  {
    key:   "avgWpm",
    label: "Average WPM",
    icon:  Gauge,
    color: "#2c3e6b",
    bg:    "#eef0f8",
    format: (v) => v ?? "—",
  },
  {
    key:   "observationLevel",
    label: "Observation Level",
    icon:  Star,
    color: "#e67e22",
    bg:    "#fef3e8",
    format: (v) => v ?? "—",
  },
];

export default function StudentStatsBar({ stats = {} }) {
  return (
    <div className="ssb-wrap">
      {STATS_CONFIG.map(({ key, label, icon: Icon, color, bg, format }) => (
        <div key={key} className="ssb-card">
          <div className="ssb-icon-badge" style={{ background: bg, color }}>
            <Icon size={17} strokeWidth={2.2} />
          </div>
          <span className="ssb-value" style={{ color }}>
            {format(stats[key])}
          </span>
          <span className="ssb-label">{label}</span>
        </div>
      ))}
    </div>
  );
}
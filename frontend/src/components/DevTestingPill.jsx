import React from "react";
import { Link } from "react-router-dom";
import { FlaskConical } from "lucide-react";

export default function DevTestingPill() {
  // Only display in non-production builds
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <Link
      to="/testing-dashboard"
      id="dev-testing-pill"
      className="position-fixed d-flex align-items-center gap-2 shadow-lg text-decoration-none"
      style={{
        bottom: "18px",
        right: "18px",
        zIndex: 9999,
        backgroundColor: "#1e293b",
        color: "#38bdf8",
        padding: "8px 14px",
        borderRadius: "24px",
        fontSize: "13px",
        fontWeight: 600,
        border: "1px solid #334155",
        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
      }}
      title="Open HearMeRead Testing & Simulation Dashboard"
    >
      <FlaskConical size={16} className="text-info" />
      <span>Dev Testing</span>
    </Link>
  );
}

import React, { useState, useEffect } from "react";
import HmrLogo from "../assets/HMR-LOGO.png";
import "./LoadingPage.css";

function getProgressColor(p) {
  if (p < 15) return "transparent";
  if (p < 30) return "#e63946"; // Red
  if (p < 50) return "#f5c518"; // Yellow
  if (p < 70) return "#3d5a8a"; // Blue
  if (p < 85) return "#4caf50"; // Green
  if (p < 95) return "#e63946"; // Red
  if (p < 100) return "#f5c518"; // Yellow
  return "#1e2d4a"; // Dark Blue (100%)
}

export default function LoadingPage({ progress: externalProgress }) {
  const isControlled = externalProgress !== undefined;
  const [localProgress, setLocalProgress] = useState(0);

  useEffect(() => {
    if (isControlled) return;

    // Uncontrolled fallback (for Suspense routing fallbacks)
    const interval = setInterval(() => {
      setLocalProgress((prev) => {
        if (prev < 100) return prev + 2;
        return 0;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [isControlled]);

  const progress = isControlled ? externalProgress : localProgress;
  const color = getProgressColor(progress);

  // Circle parameters for SVG
  const radius = 68;
  const strokeWidth = progress === 100 ? 10 : 8; // Thicker ring when complete
  const circumference = 2 * Math.PI * radius;
  // Calculate dash offset representing progress
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="lp-bg">
      <div className="lp-card">
        <div className="lp-logo-container">
          <svg className="lp-svg" viewBox="0 0 160 160">
            {/* Faint background track */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              className="lp-track"
              strokeWidth={8}
            />
            {/* Drawing arc */}
            {progress > 0 && (
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="lp-arc"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            )}
          </svg>
          <img src={HmrLogo} alt="HearMeRead mascot" className="lp-mascot" />
        </div>
        <div className="lp-text-container">
          <h1 className="lp-brand-name">HearMeRead</h1>
          <p className="lp-tagline">Learn to read for a better future</p>
        </div>
      </div>
    </div>
  );
}


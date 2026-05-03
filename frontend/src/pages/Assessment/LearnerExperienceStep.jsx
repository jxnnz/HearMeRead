import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EXPERIENCE_OPTIONS } from "../../data/assessmentConstants";

const SCALE_COLORS = ["#c0392b", "#d35400", "#d4ac0d", "#1e8449", "#117a65"];
const SCALE_BG     = ["#fdecea", "#fef0e7", "#fef9e7", "#eafaf1", "#e8f8f5"];

export default function LearnerExperienceStep({ onConfirm, onBack }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="asp-page asp-page--wide">
      <div className="asp-comp-header">
        <span className="asp-reading-badge">Learner Experience</span>
        {/* <h2 className="asp-comp-header__title">Kumusta nag iyong pagbabasa?</h2> */}
        <p className="asp-comp-header__sub">
          I-tap ang mukha na naglalarawan ng iyong naramdaman.
        </p>
      </div>

      <div className="asp-lexp-container">
        <div className="asp-lexp-bar" />

        <div className="asp-lexp-faces">
          {EXPERIENCE_OPTIONS.map((opt, idx) => {
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                className={`asp-lexp-face${isSelected ? " asp-lexp-face--selected" : ""}`}
                style={{
                  borderColor: isSelected ? SCALE_COLORS[idx] : "#dde2f0",
                  background:  isSelected ? SCALE_BG[idx]     : "#fff",
                }}
                onClick={() => setSelected(opt.value)}
              >
                <span className="asp-lexp-face__emoji">{opt.emoji}</span>
                <span
                  className="asp-lexp-face__label"
                  style={{ color: isSelected ? SCALE_COLORS[idx] : "#5a6382" }}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="asp-obs-footer">
        {onBack && (
          <button className="asp-obs-footer__back" onClick={onBack}>
            <ChevronLeft size={16} /> Back
          </button>
        )}
        <button
          className="asp-continue-btn"
          onClick={() => selected && onConfirm(selected)}
          disabled={!selected}
        >
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

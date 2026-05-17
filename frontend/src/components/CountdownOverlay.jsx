import { useEffect, useState } from "react";
import "./component css/CountdownOverlay.css";

/**
 * CountdownOverlay — Fullscreen 3-2-1 countdown before recording starts.
 * Renders on top of the current step with a semi-transparent backdrop.
 *
 * @param {number}   count     Current countdown number (3, 2, 1)
 * @param {function} onDone    Called when countdown finishes (reaches 0)
 */
export default function CountdownOverlay({ count, onDone }) {
  const [display, setDisplay] = useState(count);

  useEffect(() => {
    setDisplay(count);
  }, [count]);

  useEffect(() => {
    if (display <= 0) {
      onDone?.();
      return;
    }
    const timer = setTimeout(() => {
      setDisplay((d) => d - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [display, onDone]);

  if (display <= 0) return null;

  return (
    <div className="countdown-overlay">
      <div className="countdown-content">
        <div className="countdown-number" key={display}>
          {display}
        </div>
        <p className="countdown-label">Get ready to read…</p>
        <div className="countdown-dots">
          {[3, 2, 1].map((n) => (
            <span
              key={n}
              className={`countdown-dot ${n >= display ? "countdown-dot--active" : ""}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

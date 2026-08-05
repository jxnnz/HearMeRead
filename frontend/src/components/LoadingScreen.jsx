import React, { useState, useEffect } from "react";

const SHORT_PASSAGES = [
  {
    title: "Alam mo ba?",
    text: "Ang pagbabasa ng 15 minuto lamang araw-araw ay nakakatulong upang matuto ng higit sa 1,000 bagong salita bawat taon!",
    category: "Kaalaman"
  },
  {
    title: "Maikling Kuwento",
    text: "Si Pagong at si Matsing ay nagtanim ng saging. Ang kay Pagong ay namunga ng matamis na saging dahil inalagaan niya ito nang mabuti sa araw-araw.",
    category: "Kuwento"
  },
  {
    title: "Subok-Wika (Tongue Twister)",
    text: "Pitong puting tupa, pinitpit ng pitong puting bata sa gitna ng pitong puting patag!",
    category: "Palaro"
  },
  {
    title: "Did You Know?",
    text: "Reading out loud helps improve your memory, listening skills, and confidence when speaking in front of others!",
    category: "Fun Fact"
  },
  {
    title: "Maikling Kuwento",
    text: "Sa tuktok ng bundok, may isang maliit na pipit na umaawit sa tuwing sumisikat ang araw. Ang awit niya ay nagbibigay ng saya sa buong kagubatan.",
    category: "Kuwento"
  },
  {
    title: "Paalala sa Pagbabasa",
    text: "Hindi mahalaga kung gaano ka mabilis magbasa, ang mahalaga ay naiintindihan mo ang bawat kuwento at natututo ka araw-araw!",
    category: "Inspirasyon"
  },
  {
    title: "Bugtong",
    text: "Maliit pa si Nene, marunong nang manahi. Ano ito? (Sagot: Gagamba)",
    category: "Bugtong"
  },
  {
    title: "The Wise Owl",
    text: "An owl sat on an oak tree, watching the world below. The more he listened, the less he spoke, and the wiser he became.",
    category: "Short Story"
  }
];

function getProcessStatusText(percent) {
  if (percent < 15) {
    return "0% - 15%: Inihahanda ang audio recording...";
  } else if (percent < 60) {
    return "15% - 60%: Sinusuri ang boses sa AI speech model...";
  } else if (percent < 85) {
    return "60% - 85%: Tinataya ang bilis at kawastuhan ng pagbabasa...";
  } else if (percent < 98) {
    return "85% - 98%: Inihahanda ang resulta at marka...";
  }
  return "100%: Kumpleto na!";
}

export default function LoadingScreen({ message = "Processing audio…", progress: externalProgress }) {
  const [progress, setProgress] = useState(0);
  const [passageIndex, setPassageIndex] = useState(0);
  const [fade, setFade] = useState(true);

  // Pick a random passage on initial render
  useEffect(() => {
    const randomIdx = Math.floor(Math.random() * SHORT_PASSAGES.length);
    setPassageIndex(randomIdx);
  }, []);

  // Handler to switch passage when clicked (no hint text as requested)
  const handleNextPassage = (e) => {
    e.stopPropagation();
    setFade(false);
    setTimeout(() => {
      setPassageIndex((prev) => (prev + 1) % SHORT_PASSAGES.length);
      setFade(true);
    }, 150);
  };

  // Smooth dynamic progress animation
  useEffect(() => {
    if (typeof externalProgress === "number") {
      setProgress(externalProgress);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95; // Wait at 95% for server response
        // Easing curve: faster at start, slows down near 95%
        const step = Math.max(0.4, (95 - prev) * 0.07);
        return Math.min(95, prev + step);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [externalProgress]);

  const roundedProgress = Math.round(progress);
  const currentPassage = SHORT_PASSAGES[passageIndex];
  const processStatus = getProcessStatusText(roundedProgress);

  return (
    <div className="asp-loading-screen">
      <div className="asp-loading-card">
        <h3 className="asp-loading-message">{message}</h3>

        {/* Loading Bar Container matching sketch visual */}
        <div className="asp-loading-bar-wrapper">
          <div className="asp-loading-bar-track">
            <div
              className="asp-loading-bar-fill"
              style={{ width: `${roundedProgress}%` }}
            >
              <div className="asp-loading-bar-shimmer" />
            </div>

            {/* Vertical segment tick marks */}
            <div className="asp-loading-ticks">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="asp-loading-tick" />
              ))}
            </div>
          </div>

          {/* Percentage badge below loading bar */}
          <div className="asp-loading-percentage-badge">{roundedProgress}%</div>
        </div>

        {/* Process status text showing step details */}
        <p className="asp-loading-process-text">{processStatus}</p>

        {/* Short passage container (always visible, click to change) */}
        <div
          className={`asp-loading-passage-box ${fade ? "fade-in" : "fade-out"}`}
          onClick={handleNextPassage}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleNextPassage(e);
          }}
        >
          <div className="asp-loading-passage-header">
            <span className="asp-loading-passage-icon">📖</span>
            <span className="asp-loading-passage-cat">{currentPassage.category}</span>
            <span className="asp-loading-passage-title">— {currentPassage.title}</span>
          </div>
          <p className="asp-loading-passage-text">"{currentPassage.text}"</p>
        </div>
      </div>
    </div>
  );
}

// ── Reading observation levels ────────────────────────────────
export const OBSERVATION_LEVELS = [
  { value: "frustration",   label: "Frustration Level",   desc: "Below 90% accuracy"  },
  { value: "instructional", label: "Instructional Level",  desc: "90–94% accuracy"     },
  { value: "independent",   label: "Independent Level",   desc: "95–100% accuracy"    },
  { value: "advanced",      label: "Advanced Level",      desc: "Reads with fluency"   },
];

// ── Learner experience options ────────────────────────────────
export const EXPERIENCE_OPTIONS = [
  { value: "very_hard", label: "Very Hard", emoji: "😰", score: 2  },
  { value: "struggled", label: "Struggled", emoji: "😟", score: 4  },
  { value: "okay",      label: "Okay",      emoji: "😊", score: 6  },
  { value: "good",      label: "Good",      emoji: "😄", score: 8  },
  { value: "excellent", label: "Excellent", emoji: "🌟", score: 10 },
];

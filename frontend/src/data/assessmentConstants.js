// Reading observation levels
// backendValue maps to fluency_level (int 1–4) in CompleteSessionIn
export const OBSERVATION_LEVELS = [
  { value: "level1", label: "Level 1", desc: "Reads word by word", backendValue: 1 },
  { value: "level2", label: "Level 2", desc: "Reads word in chunks", backendValue: 2 },
  { value: "level3", label: "Level 3", desc: "Reads fluently but not observing punctuation marks", backendValue: 3 },
  { value: "level4", label: "Level 4", desc: "Reads fluently with proper expression", backendValue: 4 },
];

// Learner experience options
// backendValue maps to learner_experience (int 1–5) in CompleteSessionIn
export const EXPERIENCE_OPTIONS = [
  { value: "very_hard", label: "Very Hard", emoji: "😰", score: 2,  backendValue: 1 },
  { value: "struggled", label: "Struggled", emoji: "😟", score: 4,  backendValue: 2 },
  { value: "okay",      label: "Okay",      emoji: "😊", score: 6,  backendValue: 3 },
  { value: "good",      label: "Good",      emoji: "😄", score: 8,  backendValue: 4 },
  { value: "excellent", label: "Excellent", emoji: "🌟", score: 10, backendValue: 5 },
];

// Assessment period display → backend enum
export const PERIOD_MAP = {
  BoSY: "beginning",
  MoSY: "middle",
  EoSY: "end",
};

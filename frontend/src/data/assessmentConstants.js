// ── Reading observation levels ────────────────────────────────
// backendValue maps to fluency_level (int 1–4) in CompleteSessionIn
export const OBSERVATION_LEVELS = [
  { value: "frustration",   label: "Frustration Level",   desc: "Below 90% accuracy",  backendValue: 1 },
  { value: "instructional", label: "Instructional Level",  desc: "90–94% accuracy",     backendValue: 2 },
  { value: "independent",   label: "Independent Level",   desc: "95–100% accuracy",    backendValue: 3 },
  { value: "advanced",      label: "Advanced Level",      desc: "Reads with fluency",   backendValue: 4 },
];

// ── Learner experience options ────────────────────────────────
// backendValue maps to learner_experience (int 1–5) in CompleteSessionIn
export const EXPERIENCE_OPTIONS = [
  { value: "very_hard", label: "Very Hard", emoji: "😰", score: 2,  backendValue: 1 },
  { value: "struggled", label: "Struggled", emoji: "😟", score: 4,  backendValue: 2 },
  { value: "okay",      label: "Okay",      emoji: "😊", score: 6,  backendValue: 3 },
  { value: "good",      label: "Good",      emoji: "😄", score: 8,  backendValue: 4 },
  { value: "excellent", label: "Excellent", emoji: "🌟", score: 10, backendValue: 5 },
];

// ── Assessment period display → backend enum ──────────────────
export const PERIOD_MAP = {
  BoSY: "beginning",
  MoSY: "middle",
  EoSY: "end",
};

/**
 * gradeAssessmentConfig.js
 * Central configuration for grade-level and language-specific assessment rules.
 *
 * Each config entry defines:
 *  - task1/task2L/task2H: content type, ASR mode, and labels
 *  - threshold: Task 1 score cutoff for routing (≤ threshold → 2L, > threshold → 2H)
 *  - classification: which classification band set to use
 *  - timeLimits: Part 2 passage reading time limits (seconds)
 */

// ── Filipino Grades 1–3 ──────────────────────────────────────────────────────

const FILIPINO_GRADE_1 = {
  task1: {
    type: "letters",
    count: 10,
    label: "Gawain 1",
    asrMode: "full_recording",   // one continuous recording for all 10 letters
    prompt: "b ng T e p s H G u L",
    useLetterNormalizer: true,   // enable letter-sound post-processing
  },
  task2L: {
    type: "rhymes",
    count: 10,
    label: "Gawain 2 (L) — Rhyming Words",
    asrMode: "teacher_input",    // teacher marks Oo/Hindi per pair
  },
  task2H: {
    type: "sentences",
    label: "Gawain 2 (H) — Mga Pangungusap",
    asrMode: "full_recording",
  },
  threshold: 6,                  // ≤6 → 2L (Rhymes), ≥7 → 2H (Sentences)
  classification: "filipino_route_dependent",
};

const FILIPINO_GRADE_2 = {
  task1: {
    type: "sentences",
    count: 10,
    label: "Gawain 1",
    asrMode: "full_recording",
    useLetterNormalizer: false,
  },
  task2L: {
    type: "words",
    count: 10,
    label: "Gawain 2 — Mga Salita",
    asrMode: "full_recording",
  },
  task2H: {
    type: "sentences",
    label: "Gawain 2 — Mga Pangungusap",
    asrMode: "full_recording",
  },
  threshold: 6,
  classification: "filipino_route_dependent",
};

const FILIPINO_GRADE_3 = {
  ...FILIPINO_GRADE_2,           // same structure as Grade 2, just different content
};

// ── English Grade 3 ──────────────────────────────────────────────────────────

const ENGLISH_GRADE_3 = {
  task1: {
    type: "words",
    count: 10,
    label: "Task 1: Words",
    asrMode: "full_recording",
    useLetterNormalizer: false,
  },
  task2L: {
    type: "words",
    count: 10,
    label: "Task 2: Words",
    asrMode: "full_recording",
  },
  task2H: null,                  // English has NO sentence route — always Words
  threshold: 0,                  // score=0 → end assessment, ≥1 → Task 2
  classification: "english_single_scale",
};

// ── Exported config ──────────────────────────────────────────────────────────

export const ASSESSMENT_CONFIG = {
  filipino: {
    grade_1: FILIPINO_GRADE_1,
    grade_2: FILIPINO_GRADE_2,
    grade_3: FILIPINO_GRADE_3,
  },
  english: {
    grade_3: ENGLISH_GRADE_3,
  },
};

// Part 2 time limits (seconds) by language and grade
export const PART2_TIME_LIMITS = {
  filipino: { grade_1: 60, grade_2: 120, grade_3: 180 },
  english:  { grade_3: 120 },
};

// ── Classification bands ─────────────────────────────────────────────────────

/**
 * Filipino (all grades) — classification depends on which route was taken.
 * Max total is 20 (Task 1 out of 10 + Task 2 out of 10).
 */
export const FILIPINO_CLASSIFICATION = {
  // Route: Task 2L (Rhymes or Words path)
  task_2L: [
    { min: 0,  max: 14, label: "Full Refresher" },
    { min: 15, max: 20, label: "Moderate Refresher" },
  ],
  // Route: Task 2H (Sentences path)
  task_2H: [
    { min: 7,  max: 16, label: "Light Refresher" },
    { min: 17, max: 20, label: "Grade Ready" },
  ],
};

/**
 * English Grade 3 — single scale, no route dependency.
 * Score of 0 on Task 1 ends the assessment immediately.
 */
export const ENGLISH_CLASSIFICATION = {
  bands: [
    { min: 0,  max: 0,  label: "Full Refresher" },
    { min: 1,  max: 6,  label: "Moderate Refresher" },
    { min: 8,  max: 16, label: "Light Refresher" },
    { min: 17, max: 20, label: "Grade Ready" },
  ],
};

// ── Helper to get config for a student ───────────────────────────────────────

/**
 * Returns the assessment config for a given language + grade combination.
 * @param {string} language  - "filipino" or "english"
 * @param {string} gradeLevel - "grade_1", "grade_2", or "grade_3"
 * @returns {object|null} Grade assessment config or null if unsupported
 */
export function getAssessmentConfig(language, gradeLevel) {
  const lang = (language || "filipino").toLowerCase();
  const grade = (gradeLevel || "").toLowerCase().replace(/\s+/g, "_");
  return ASSESSMENT_CONFIG[lang]?.[grade] ?? null;
}

/**
 * Returns Part 2 time limit in seconds.
 * @param {string} language  - "filipino" or "english"
 * @param {string} gradeLevel - "grade_1", "grade_2", or "grade_3"
 * @returns {number} Time limit in seconds (defaults to 120)
 */
export function getPart2TimeLimit(language, gradeLevel) {
  const lang = (language || "filipino").toLowerCase();
  const grade = (gradeLevel || "").toLowerCase().replace(/\s+/g, "_");
  return PART2_TIME_LIMITS[lang]?.[grade] ?? 120;
}

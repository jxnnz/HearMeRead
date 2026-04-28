import * as XLSX from "xlsx";
import { CheckCircle } from "lucide-react";
import { OBSERVATION_LEVELS, EXPERIENCE_OPTIONS } from "../data/assessmentConstants";

// ── Reading profile levels ────────────────────────────────────
const PROFILE_MAP = {
  grade_level:   { label: "Reading at Grade Level", color: "#27ae60", bg: "#e8f5e9" },
  transitioning: { label: "Transitioning Reader",   color: "#2c7fc1", bg: "#e8f3fc" },
  developing:    { label: "Developing Reader",      color: "#00897b", bg: "#e0f2f1" },
  high_emerging: { label: "High Emerging Reader",   color: "#e67e22", bg: "#fff3e0" },
  low_emerging:  { label: "Low Emerging Reader",    color: "#c0392b", bg: "#fdecea" },
};

// Map teacher observation → reading profile; fallback to accuracy thresholds
function getReadingProfile(accuracy, obsLevelValue) {
  if (obsLevelValue === "advanced")      return PROFILE_MAP.grade_level;
  if (obsLevelValue === "independent")   return PROFILE_MAP.transitioning;
  if (obsLevelValue === "instructional") return PROFILE_MAP.developing;
  if (obsLevelValue === "frustration")   return accuracy >= 60 ? PROFILE_MAP.high_emerging : PROFILE_MAP.low_emerging;
  // No observation set — derive from accuracy
  if (accuracy >= 95) return PROFILE_MAP.grade_level;
  if (accuracy >= 85) return PROFILE_MAP.transitioning;
  if (accuracy >= 75) return PROFILE_MAP.developing;
  if (accuracy >= 60) return PROFILE_MAP.high_emerging;
  return PROFILE_MAP.low_emerging;
}

export default function ResultsStep({
  form,
  g1Score,
  g2Score,
  g2Passage,
  a2Passage,
  a2RecordingTime,
  comprehensionQuestions,
  answers,
  observationLevel,
  teacherNotes,
  learnerExperience,
  onComplete,
  isCompleting,
  completeError,
}) {
  const g1Num     = parseInt(g1Score, 10) || 0;
  const g2Num     = parseInt(g2Score, 10) || 0;
  const reachedA2 = !isNaN(parseInt(g2Score, 10)) && parseInt(g2Score, 10) >= 7;

  const correctAnswers = comprehensionQuestions.filter((q) => answers[q.id] === "Correct").length;
  const totalQuestions = comprehensionQuestions.length;
  const totalMiscues   = (10 - g1Num) + (reachedA2 ? 10 - g2Num : 0);

  const wpm = (a2RecordingTime > 0 && a2Passage?.word_count)
    ? Math.round((a2Passage.word_count / a2RecordingTime) * 60)
    : null;

  const timeStr = a2RecordingTime > 0
    ? `${Math.floor(a2RecordingTime / 60)}:${String(a2RecordingTime % 60).padStart(2, "0")}`
    : "—";

  const accuracy    = reachedA2
    ? Math.round(((g1Num + g2Num) / 20) * 100)
    : Math.round((g1Num / 10) * 100);
  const compPercent = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const fluencyPct  = wpm ? Math.min(100, Math.round((wpm / 60) * 100)) : 0;

  const today = new Date().toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  });

  const expOption = EXPERIENCE_OPTIONS.find((e) => e.value === learnerExperience);
  const obsLevel  = OBSERVATION_LEVELS.find((l) => l.value === observationLevel);
  const profile   = getReadingProfile(accuracy, observationLevel);

  const statCards = [
    { label: "% Correct Words Read",   value: `${g1Num * 10}%`,                                             color: "#2c7fc1" },
    { label: "Words Per Minute (WPM)", value: wpm ?? "—",                                                   color: "#27ae60" },
    { label: "Words in 2 mins",        value: a2Passage?.word_count ?? "—",                                color: "#9b59b6" },
    { label: "Total Reading Miscues",  value: totalMiscues,                                                color: "#e67e22" },
    { label: "Time Used",              value: timeStr,                                                      color: "#e63b2e" },
    { label: "Total Correct Answer",   value: totalQuestions ? `${correctAnswers}/${totalQuestions}` : "—", color: "#1a2340" },
  ];

  // ── Excel export ─────────────────────────────────────────
  function handleExport() {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryRows = [
      ["HearMeRead — Assessment Report"],
      [],
      ["STUDENT INFORMATION"],
      ["Name",             `${form.first_name} ${form.last_name}`],
      ["Reading Profile",  profile.label],
      ["Grade Level",      `Grade ${form.grade_level}`],
      ["Section",          form.section],
      ["School Year",      form.school_year],
      ["Assessment Type",  form.assessment_type],
      ["Language",         form.language === "filipino" ? "Filipino" : "English"],
      ["Date",             today],
      [],
      ["ASSESSMENT SCORES"],
      ["% Correct Words Read",   `${g1Num * 10}%`],
      ["Words Per Minute (WPM)", wpm ?? "—"],
      ["Words in 2 mins",        a2Passage?.word_count ?? "—"],
      ["Total Reading Miscues",  totalMiscues],
      ["Time Used",              timeStr],
      ["Total Correct Answer",   totalQuestions ? `${correctAnswers}/${totalQuestions}` : "—"],
      [],
      ["PERFORMANCE SUMMARY"],
      ["Accuracy",       `${accuracy}%`],
      ["Comprehension",  `${compPercent}%`],
      ["Fluency (WPM)",  `${fluencyPct}%`],
      [],
      ["LEARNER FEEDBACK"],
      ["Experience Rating", expOption ? `${expOption.score}/10 (${expOption.label})` : "—"],
      ["Total Miscues",     totalMiscues],
      ["Observation Level", obsLevel?.label ?? "—"],
      ["Teacher's Note",    teacherNotes || "No notes added."],
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
    ws1["!cols"] = [{ wch: 26 }, { wch: 44 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Summary");

    // Sheet 2: Comprehension questions (if applicable)
    if (comprehensionQuestions.length > 0) {
      const compRows = [
        ["Comprehension Questions"],
        [],
        ["#", "Question", "Teacher's Mark"],
        ...comprehensionQuestions.map((q, idx) => [
          idx + 1,
          q.text,
          answers[q.id] ?? "—",
        ]),
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(compRows);
      ws2["!cols"] = [{ wch: 4 }, { wch: 52 }, { wch: 32 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws2, "Comprehension");
    }

    const filename = `${form.last_name}_${form.first_name}_${form.assessment_type}_${form.school_year}`
      .replace(/\s+/g, "_") + ".xlsx";
    XLSX.writeFile(wb, filename);
  }

  return (
    <div className="asp-page asp-page--wide">

      {/* ── Header card ── */}
      <div className="asp-res-header">
        <div className="asp-res-header__left">
          <div className="asp-res-name-row">
            <h1 className="asp-res-header__name">
              {form.first_name} {form.last_name}
            </h1>
            <span
              className="asp-res-profile-badge"
              style={{ background: profile.bg, color: profile.color }}
            >
              {profile.label}
            </span>
          </div>
          <div className="asp-res-header__badges">
            <span className="asp-res-badge asp-res-badge--lang">
              {form.language === "filipino" ? "🇵🇭 Filipino" : "🇬🇧 English"}
            </span>
            <span className="asp-res-badge asp-res-badge--grade">Grade {form.grade_level}</span>
            <span className="asp-res-badge asp-res-badge--period">{form.assessment_type}</span>
          </div>
          <p className="asp-res-header__sub">
            {reachedA2 ? a2Passage?.title : (g2Passage?.title || form.passage_title)} · {today}
          </p>
        </div>
        <div className="asp-res-header__right">
          <div className="asp-res-complete-badge">
            <CheckCircle size={16} />
            Assessment Complete
          </div>
          <div className="asp-res-header__actions">
            <button className="asp-res-action-btn" onClick={() => window.print()}>🖨 Print</button>
            <button className="asp-res-action-btn" onClick={handleExport}>↓ Export Excel</button>
          </div>
        </div>
      </div>

      {/* ── 6 stat cards ── */}
      <div className="asp-res-stats">
        {statCards.map((card) => (
          <div key={card.label} className="asp-res-stat-card">
            <span className="asp-res-stat-card__value" style={{ color: card.color }}>
              {card.value}
            </span>
            <span className="asp-res-stat-card__label">{card.label}</span>
          </div>
        ))}
      </div>

      {/* ── Lower: Performance + Learner Feedback ── */}
      <div className="asp-res-lower">
        {/* Performance Summary */}
        <div className="asp-res-perf">
          <h3 className="asp-res-section-title">Performance Summary</h3>
          {[
            { label: "Accuracy",      pct: accuracy,    color: "#2c7fc1" },
            { label: "Comprehension", pct: compPercent, color: "#27ae60" },
            { label: "Fluency (WPM)", pct: fluencyPct,  color: "#9b59b6" },
          ].map((bar) => (
            <div key={bar.label} className="asp-res-perf-row">
              <span className="asp-res-perf-label">{bar.label}</span>
              <div className="asp-res-perf-bar-wrap">
                <div
                  className="asp-res-perf-bar"
                  style={{ width: `${bar.pct}%`, background: bar.color }}
                />
              </div>
              <span className="asp-res-perf-pct">{bar.pct}%</span>
            </div>
          ))}
        </div>

        {/* Learner Feedback */}
        <div className="asp-res-feedback">
          <h3 className="asp-res-section-title">Learner Feedback</h3>
          <div className="asp-res-feedback-grid">
            <div className="asp-res-fb-item">
              <span className="asp-res-fb-item__val">
                {expOption ? `${expOption.score}/10` : "—"}
              </span>
              <span className="asp-res-fb-item__label">Experience Rating</span>
            </div>
            <div className="asp-res-fb-item">
              <span className="asp-res-fb-item__val">{correctAnswers}</span>
              <span className="asp-res-fb-item__label">Correct Answers</span>
            </div>
            <div className="asp-res-fb-item">
              <span className="asp-res-fb-item__val">{totalMiscues}</span>
              <span className="asp-res-fb-item__label">Total Miscues</span>
            </div>
            <div className="asp-res-fb-item">
              <span className="asp-res-fb-item__val asp-res-fb-item__val--obs">
                {obsLevel ? obsLevel.label.split(" ")[0] : "—"}
              </span>
              <span className="asp-res-fb-item__label">Observation</span>
            </div>
          </div>

          <div className="asp-res-teacher-note">
            <p className="asp-res-teacher-note__label">Teacher's Note</p>
            <p className="asp-res-teacher-note__text">
              {teacherNotes || "No notes added."}
            </p>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="asp-res-footer">
        <p className="asp-res-footer__info">
          Assessed by teacher · Section {form.section} · {form.school_year}
        </p>
        {completeError && (
          <p className="asp-error" style={{ textAlign: "center", marginBottom: "0.5rem" }}>
            ⚠ {completeError}
          </p>
        )}
        <div className="asp-res-footer__actions">
          <button
            className="asp-res-footer__btn asp-res-footer__btn--submit"
            onClick={onComplete}
            disabled={isCompleting}
          >
            {isCompleting ? "Submitting…" : "Done & Submit"}
          </button>
        </div>
      </div>

    </div>
  );
}

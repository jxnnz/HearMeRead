import * as XLSX from "xlsx";
import { CheckCircle } from "lucide-react";
import { OBSERVATION_LEVELS, EXPERIENCE_OPTIONS } from "../data/assessmentConstants";

const PROFILE_MAP = {
  "Reading at Grade Level": { label: "Reading at Grade Level", color: "#27ae60", bg: "#e8f5e9" },
  "Transitioning Reader":   { label: "Transitioning Reader",   color: "#2c7fc1", bg: "#e8f3fc" },
  "Developing Reader":      { label: "Developing Reader",      color: "#00897b", bg: "#e0f2f1" },
  "High Emerging Reader":   { label: "High Emerging Reader",   color: "#e67e22", bg: "#fff3e0" },
  "Low Emerging Reader":    { label: "Low Emerging Reader",    color: "#c0392b", bg: "#fdecea" },
};

function timeLimitLabel(secs) {
  const mins = Math.round(secs / 60);
  return mins === 1 ? "1 minute" : `${mins} minutes`;
}

function fmtTime(secs) {
  if (!secs) return "—";
  return `${Math.floor(secs / 60)}:${String(Math.round(secs) % 60).padStart(2, "0")}`;
}

export default function ResultsStep({
  form,
  finalResult,       // CompleteSessionOut from backend
  a2Passage,
  a2RecordingTime,
  a2TimeLimit,       // grade-level time limit in seconds
  comprehensionQuestions,
  answers,
  observationLevel,
  teacherNotes,
  learnerExperience,
  onDone,
}) {
  const part1 = finalResult?.part1 ?? null;
  const part2 = finalResult?.part2 ?? null;

  const profileKey  = part2?.reading_profile || (part1 ? "Low Emerging Reader" : null);
  const profile     = PROFILE_MAP[profileKey] ?? PROFILE_MAP["Low Emerging Reader"];

  const today = new Date().toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  });

  const expOption = EXPERIENCE_OPTIONS.find((e) => e.value === learnerExperience);
  const obsLevel  = OBSERVATION_LEVELS.find((l) => l.value === observationLevel);

  // ── Stat card values from backend ────────────────────────────────────────
  const storyNumber        = a2Passage?.title ?? "—";
  const totalMiscues       = part2?.total_miscues ?? "—";
  const wordsWithinTime    = part2?.words_read_within_time ?? "—";
  const totalTimeUsed      = part2 ? fmtTime(part2.reading_time_sec) : "—";
  const wpm                = part2?.cwpm != null ? Math.round(part2.cwpm) : "—";
  const correctAnswers     = part2?.comprehension_correct
    ?? Object.values(answers).filter((v) => v === "Correct").length;
  const totalQuestions     = comprehensionQuestions?.length ?? 0;
  const learnerExp         = expOption ? `${expOption.score}/10` : (part2?.learner_experience ?? "—");
  const obsLevelDisplay    = part2?.observation_level
    ? `Level ${part2.observation_level}`
    : (obsLevel?.label?.split(" ")[0] ?? "—");

  const statCards = [
    { label: "Story",                                           value: storyNumber,                                    color: "#1a2340" },
    { label: "Total Reading Miscues",                          value: totalMiscues,                                   color: "#e63b2e" },
    { label: `Words read within ${timeLimitLabel(a2TimeLimit)}`, value: wordsWithinTime,                             color: "#9b59b6" },
    { label: "Total Time Used",                                value: totalTimeUsed,                                  color: "#e67e22" },
    { label: "Words Per Minute (WPM)",                         value: wpm,                                           color: "#27ae60" },
    { label: "Total Correct Answers",                          value: totalQuestions ? `${correctAnswers}/${totalQuestions}` : "—", color: "#2c7fc1" },
    { label: "Learner Experience",                             value: learnerExp,                                    color: "#8e44ad" },
    { label: "Observation Level",                             value: obsLevelDisplay,                               color: "#16a085" },
  ];

  // ── Excel export ─────────────────────────────────────────────────────────
  function handleExport() {
    const wb = XLSX.utils.book_new();

    const summaryRows = [
      ["HearMeRead — Assessment Report"],
      [],
      ["STUDENT INFORMATION"],
      ["Name",            `${form.first_name} ${form.last_name}`],
      ["Reading Profile", profile.label],
      ["Grade Level",     `Grade ${form.grade_level}`],
      ["Section",         form.section],
      ["School Year",     form.school_year],
      ["Assessment Type", form.assessment_type],
      ["Language",        form.language === "filipino" ? "Filipino" : "English"],
      ["Date",            today],
      [],
      ["ASSESSMENT 2 RESULTS"],
      ["Story",                         storyNumber],
      ["Total Reading Miscues",         totalMiscues],
      [`Words within ${timeLimitLabel(a2TimeLimit)}`, wordsWithinTime],
      ["Total Time Used",               totalTimeUsed],
      ["Words Per Minute (WPM)",        wpm],
      ["Total Correct Answers",         totalQuestions ? `${correctAnswers}/${totalQuestions}` : "—"],
      ["Learner Experience",            learnerExp],
      ["Observation Level",             obsLevelDisplay],
      [],
      ["ASSESSMENT 1 SUMMARY"],
      ["Task 1 Correct",   part1?.task1_correct  ?? "—"],
      ["Task 2 Correct",   part1?.task2_correct  ?? "—"],
      ["Total Part 1 Score", part1?.total_score  ?? "—"],
      ["Classification",   part1?.classification ?? "—"],
      [],
      ["TEACHER NOTES"],
      ["Remarks", teacherNotes || "No notes added."],
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
    ws1["!cols"] = [{ wch: 32 }, { wch: 44 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Summary");

    if (comprehensionQuestions?.length > 0) {
      const compRows = [
        ["Comprehension Questions"],
        [],
        ["#", "Question", "Teacher's Mark"],
        ...comprehensionQuestions.map((q, idx) => [
          idx + 1, q.text, answers[q.id] ?? "—",
        ]),
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(compRows);
      ws2["!cols"] = [{ wch: 4 }, { wch: 52 }, { wch: 16 }];
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
            {a2Passage?.title ?? "Assessment 1 Only"} · {today}
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

      {/* ── Stat cards ── */}
      <div className="asp-res-stats asp-res-stats--8">
        {statCards.map((card) => (
          <div key={card.label} className="asp-res-stat-card">
            <span className="asp-res-stat-card__value" style={{ color: card.color }}>
              {card.value}
            </span>
            <span className="asp-res-stat-card__label">{card.label}</span>
          </div>
        ))}
      </div>

      {/* ── Reading Profile Detail ── */}
      <div className="asp-res-profile-detail">
        <h3 className="asp-res-section-title">Reading Profile</h3>
        <div
          className="asp-res-profile-block"
          style={{ borderLeft: `4px solid ${profile.color}`, background: profile.bg }}
        >
          <strong style={{ color: profile.color }}>{profile.label}</strong>
          <p className="asp-res-profile-desc">
            {profileKey === "Low Emerging Reader" &&
              "Learner scores 0–10 in Assessment Part 1."}
            {profileKey === "High Emerging Reader" &&
              "Learner reads less than 25% of the passages in the time limit and cannot answer any of the questions."}
            {profileKey === "Developing Reader" &&
              "Learner reads between 26% to 50% of passages accurately and answers 1 to 2 questions correctly."}
            {profileKey === "Transitioning Reader" &&
              "Learner reads between 51% to 75% of the passage accurately and answers 3 to 4 questions correctly."}
            {profileKey === "Reading at Grade Level" &&
              "Learner reads between 76% to 100% of passages accurately and answers 5 to 6 questions correctly."}
          </p>
        </div>
      </div>

      {/* ── Observation Level detail ── */}
      <div className="asp-res-lower">
        <div className="asp-res-perf">
          <h3 className="asp-res-section-title">Observation Level</h3>
          {[
            { n: 1, desc: "Reads word by word" },
            { n: 2, desc: "Reads words in chunks" },
            { n: 3, desc: "Reads fluently but not observing punctuation marks" },
            { n: 4, desc: "Reads fluently with proper expression" },
          ].map((lvl) => {
            const active = (part2?.observation_level ?? null) === lvl.n
              || obsLevel?.backendValue === lvl.n;
            return (
              <div
                key={lvl.n}
                className={`asp-obs-level-row${active ? " asp-obs-level-row--active" : ""}`}
              >
                <span className="asp-obs-level-num">Level {lvl.n}</span>
                <span className="asp-obs-level-desc">{lvl.desc}</span>
              </div>
            );
          })}
        </div>

        {/* Teacher note */}
        <div className="asp-res-feedback">
          <h3 className="asp-res-section-title">Teacher's Note</h3>
          <p className="asp-res-teacher-note__text">
            {teacherNotes || "No notes added."}
          </p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="asp-res-footer">
        <p className="asp-res-footer__info">
          Assessed by teacher · Section {form.section} · {form.school_year}
        </p>
        <div className="asp-res-footer__actions">
          <button
            className="asp-res-footer__btn asp-res-footer__btn--submit"
            onClick={onDone}
          >
            Done
          </button>
        </div>
      </div>

    </div>
  );
}

import * as XLSX from "xlsx";
import { CheckCircle } from "lucide-react";
import { OBSERVATION_LEVELS, EXPERIENCE_OPTIONS } from "../data/assessmentConstants";
import WordHighlightView from "./WordHighlightView";

const PROFILE_COLOR = {
  "Full Refresher":     { color: "#c0392b", bg: "#fdecea" },
  "Moderate Refresher": { color: "#e67e22", bg: "#fff3e0" },
  "Light Refresher":    { color: "#2c7fc1", bg: "#e8f3fc" },
  "Grade Ready":        { color: "#27ae60", bg: "#e8f5e9" },
};

const PROFILE_DESC = {
  "Full Refresher":     "Learner scores below the threshold and needs full instructional refresher support.",
  "Moderate Refresher": "Learner shows some word recognition but needs moderate support to reach grade level.",
  "Light Refresher":    "Learner is close to grade level and needs light reinforcement.",
  "Grade Ready":        "Learner demonstrates grade-level reading readiness.",
};

function gradeLabel(g) {
  return String(g ?? "").replace("grade_", "Grade ").replace("kindergarten", "Kindergarten");
}

export default function A1OnlyResultsStep({
  form,
  part1Result,
  task1ScoreResult,
  g1Transcript,
  g2Transcript,
  learnerExperience,
  observationLevel,
  teacherNotes,
  onDone,
}) {
  const classification = part1Result?.classification ?? null;
  const profile = PROFILE_COLOR[classification] ?? PROFILE_COLOR["Full Refresher"];

  const today = new Date().toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  });

  const task1Correct  = part1Result?.task1_correct  ?? task1ScoreResult?.task1_correct ?? "—";
  const task2Correct  = part1Result?.task2_correct  ?? "—";
  const totalScore    = part1Result?.total_score    ?? "—";
  const totalWrong    = totalScore !== "—" ? Math.max(0, 20 - Number(totalScore)) : "—";

  const expOption  = EXPERIENCE_OPTIONS.find((e) => e.value === learnerExperience);
  const obsLevel   = OBSERVATION_LEVELS.find((l) => l.value === observationLevel);
  const learnerExp = expOption ? `${expOption.score}/10` : "—";

  const task1Alignments = part1Result?.task1_alignments ?? [];
  const task2Alignments = part1Result?.task2_alignments ?? [];

  function handleExport() {
    const wb = XLSX.utils.book_new();

    const summaryRows = [
      ["HearMeRead — Assessment 1 Report"],
      [],
      ["STUDENT INFORMATION"],
      ["Name",            `${form.first_name} ${form.last_name}`],
      ["Classification",  classification ?? "—"],
      ["Grade Level",     gradeLabel(form.grade_level)],
      ["Section",         form.section],
      ["School Year",     form.school_year],
      ["Assessment Type", form.assessment_type],
      ["Language",        form.language === "filipino" ? "Filipino" : "English"],
      ["Date",            today],
      [],
      ["ASSESSMENT 1 RESULTS"],
      ["Task 1 — Words Read Correctly", task1Correct !== "—" ? `${task1Correct}/10` : "—"],
      ["Task 2 — Words Read Correctly", task2Correct !== "—" ? `${task2Correct}/10` : "—"],
      ["Total Part 1 Score",            totalScore   !== "—" ? `${totalScore}/20`   : "—"],
      ["Total Wrong Words",             totalWrong],
      ["Classification",                classification ?? "—"],
      [],
      ["LEARNER & TEACHER FEEDBACK"],
      ["Learner Experience",    learnerExp],
      ["Observation Level",     (obsLevel?.label ?? observationLevel) || "—"],
      ["Teacher Remarks",       teacherNotes || "No notes added."],
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
    ws1["!cols"] = [{ wch: 32 }, { wch: 44 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Summary");

    const filename = `${form.last_name}_${form.first_name}_A1_${form.assessment_type}_${form.school_year}`
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
              {classification ?? "—"}
            </span>
          </div>
          <div className="asp-res-header__badges">
            <span className="asp-res-badge asp-res-badge--lang">
              {form.language === "filipino" ? "🇵🇭 Filipino" : "🇬🇧 English"}
            </span>
            <span className="asp-res-badge asp-res-badge--grade">
              {gradeLabel(form.grade_level)}
            </span>
            <span className="asp-res-badge asp-res-badge--period">{form.assessment_type}</span>
          </div>
          <p className="asp-res-header__sub">
            {form.section} · {form.school_year} · {today}
          </p>
        </div>
        <div className="asp-res-header__right">
          <div className="asp-res-complete-badge">
            <CheckCircle size={16} />
            Assessment 1 Complete
          </div>
          <div className="asp-res-header__actions">
            <button className="asp-res-action-btn" onClick={() => window.print()}>🖨 Print</button>
            <button className="asp-res-action-btn" onClick={handleExport}>↓ Export Excel</button>
          </div>
        </div>
      </div>

      {/* ── Score stat cards ── */}
      <div className="asp-res-stats asp-res-stats--4">
        <div className="asp-res-stat-card">
          <span className="asp-res-stat-card__value" style={{ color: "#2c7fc1" }}>
            {task1Correct !== "—" ? `${task1Correct}/10` : "—"}
          </span>
          <span className="asp-res-stat-card__label">Task 1 — Words Correct</span>
        </div>
        <div className="asp-res-stat-card">
          <span className="asp-res-stat-card__value" style={{ color: "#9b59b6" }}>
            {task2Correct !== "—" ? `${task2Correct}/10` : "—"}
          </span>
          <span className="asp-res-stat-card__label">Task 2 — Words Correct</span>
        </div>
        <div className="asp-res-stat-card">
          <span className="asp-res-stat-card__value" style={{ color: "#27ae60" }}>
            {totalScore !== "—" ? `${totalScore}/20` : "—"}
          </span>
          <span className="asp-res-stat-card__label">Total Part 1 Score</span>
        </div>
        <div className="asp-res-stat-card">
          <span className="asp-res-stat-card__value" style={{ color: "#e63b2e" }}>
            {totalWrong}
          </span>
          <span className="asp-res-stat-card__label">Total Wrong Words</span>
        </div>
      </div>

      {/* ── Classification detail ── */}
      {classification && (
        <div className="asp-res-profile-detail">
          <h3 className="asp-res-section-title">Reading Classification</h3>
          <div
            className="asp-res-profile-block"
            style={{ borderLeft: `4px solid ${profile.color}`, background: profile.bg }}
          >
            <strong style={{ color: profile.color }}>{classification}</strong>
            <p className="asp-res-profile-desc">{PROFILE_DESC[classification] ?? ""}</p>
          </div>
        </div>
      )}

      {/* ── Task 1 transcription ── */}
      {task1Alignments.length > 0 && (
        <div className="asp-res-profile-detail">
          <WordHighlightView
            alignments={task1Alignments}
            label="Task 1 — Reading Transcription"
          />
        </div>
      )}

      {/* ── Task 2 transcription ── */}
      {task2Alignments.length > 0 && (
        <div className="asp-res-profile-detail">
          <WordHighlightView
            alignments={task2Alignments}
            label="Task 2 — Reading Transcription"
          />
        </div>
      )}

      {/* ── Observation & Teacher note ── */}
      <div className="asp-res-lower">
        <div className="asp-res-perf">
          <h3 className="asp-res-section-title">Observation Level</h3>
          {[
            { n: 1, desc: "Reads word by word" },
            { n: 2, desc: "Reads words in chunks" },
            { n: 3, desc: "Reads fluently but not observing punctuation marks" },
            { n: 4, desc: "Reads fluently with proper expression" },
          ].map((lvl) => {
            const active = obsLevel?.backendValue === lvl.n;
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

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {learnerExperience && (
            <div className="asp-res-feedback">
              <h3 className="asp-res-section-title">Learner Experience</h3>
              <div className="asp-res-fb-item">
                <span className="asp-res-fb-item__val" style={{ fontSize: 16 }}>
                  {expOption?.label ?? learnerExperience}
                </span>
              </div>
            </div>
          )}
          <div className="asp-res-feedback">
            <h3 className="asp-res-section-title">Teacher's Note</h3>
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

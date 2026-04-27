// ============================================================
// HearMeRead — Student Info Page
// Route: /students/:id
// Shows: profile card, stats bar, assessment history table
//
// API (final — DO NOT DELETE):
// GET /students/:id          → student details
// GET /sessions?student_id=X → assessment records
// ============================================================
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import Layout                  from "../components/Layout";
import StudentProfileCard      from "../components/StudentProfileCard";
import StudentStatsBar         from "../components/StudentStatsBar";
import AssessmentHistoryTable  from "../components/AssessmentHistoryTable";

// ── Mock data ─────────────────────────────────────────────────
import { MOCK_STUDENTS } from "../data/mockData";

import "./StudentInfoPage.css";

// ── Mock assessment records per student ──────────────────────
// DELETE AFTER backend is ready
const MOCK_RECORDS = {
  1: [
    { id: 1, assessment_date: "2025-08-15", period: "BoSY", language: "filipino", task1: 18, task2l_word: 14, task2h_sentences: 10, total_score: 42, part1_reading_level: "Instructional", story_number: 1, num_miscues: 8,  words_read: 90,  total_time: "1:55", wpm: 82,  pct_correct_words: 89, total_correct: 37, learner_experience: 3, observation_level: 3, reading_profile: "Developing Reader",    remarks: "" },
    { id: 2, assessment_date: "2025-11-20", period: "MoSY", language: "filipino", task1: 19, task2l_word: 15, task2h_sentences: 11, total_score: 45, part1_reading_level: "Instructional", story_number: 2, num_miscues: 6,  words_read: 95,  total_time: "1:45", wpm: 88,  pct_correct_words: 91, total_correct: 40, learner_experience: 3, observation_level: 3, reading_profile: "Developing Reader",    remarks: "" },
    { id: 3, assessment_date: "2026-02-10", period: "EoSY", language: "english",  task1: 20, task2l_word: 16, task2h_sentences: 12, total_score: 48, part1_reading_level: "Independent",   story_number: 3, num_miscues: 4,  words_read: 99,  total_time: "1:34", wpm: 95,  pct_correct_words: 94, total_correct: 45, learner_experience: 4, observation_level: 4, reading_profile: "Transitioning Reader", remarks: "Improved significantly" },
  ],
  2: [
    { id: 1, assessment_date: "2025-08-12", period: "BoSY", language: "filipino", task1: 12, task2l_word:  9, task2h_sentences:  6, total_score: 27, part1_reading_level: "Frustration",   story_number: 1, num_miscues: 18, words_read: 69,  total_time: "2:45", wpm: 50,  pct_correct_words: 71, total_correct: 24, learner_experience: 2, observation_level: 1, reading_profile: "Low Emerging Reader",  remarks: "Needs intervention" },
    { id: 2, assessment_date: "2025-11-18", period: "MoSY", language: "filipino", task1: 13, task2l_word: 10, task2h_sentences:  7, total_score: 30, part1_reading_level: "Frustration",   story_number: 1, num_miscues: 15, words_read: 72,  total_time: "2:30", wpm: 55,  pct_correct_words: 74, total_correct: 27, learner_experience: 2, observation_level: 2, reading_profile: "Transitioning Reader", remarks: "Slight improvement" },
  ],
  3: [
    { id: 1, assessment_date: "2025-08-14", period: "BoSY", language: "filipino", task1: 15, task2l_word: 11, task2h_sentences:  8, total_score: 34, part1_reading_level: "Instructional", story_number: 1, num_miscues: 13, words_read: 83,  total_time: "2:10", wpm: 70,  pct_correct_words: 81, total_correct: 30, learner_experience: 3, observation_level: 2, reading_profile: "Transitioning Reader", remarks: "" },
    { id: 2, assessment_date: "2025-11-22", period: "MoSY", language: "filipino", task1: 16, task2l_word: 12, task2h_sentences:  9, total_score: 37, part1_reading_level: "Instructional", story_number: 2, num_miscues: 11, words_read: 86,  total_time: "2:00", wpm: 75,  pct_correct_words: 84, total_correct: 33, learner_experience: 3, observation_level: 2, reading_profile: "Transitioning Reader", remarks: "" },
    { id: 3, assessment_date: "2026-02-08", period: "EoSY", language: "english",  task1: 17, task2l_word: 13, task2h_sentences: 10, total_score: 40, part1_reading_level: "Instructional", story_number: 3, num_miscues: 9,  words_read: 89,  total_time: "1:50", wpm: 80,  pct_correct_words: 86, total_correct: 36, learner_experience: 3, observation_level: 3, reading_profile: "Transitioning Reader", remarks: "" },
    { id: 4, assessment_date: "2026-03-01", period: "BoSY", language: "filipino", task1: 18, task2l_word: 14, task2h_sentences: 10, total_score: 42, part1_reading_level: "Instructional", story_number: 1, num_miscues: 8,  words_read: 91,  total_time: "1:48", wpm: 83,  pct_correct_words: 88, total_correct: 38, learner_experience: 3, observation_level: 3, reading_profile: "Developing Reader",    remarks: "Consistent progress" },
  ],
  4: [
    { id: 1, assessment_date: "2025-08-10", period: "BoSY", language: "filipino", task1: 20, task2l_word: 17, task2h_sentences: 13, total_score: 50, part1_reading_level: "Independent",   story_number: 1, num_miscues: 3,  words_read: 101, total_time: "1:37", wpm: 98,  pct_correct_words: 95, total_correct: 47, learner_experience: 4, observation_level: 4, reading_profile: "High Emerging Reader", remarks: "" },
    { id: 2, assessment_date: "2025-11-15", period: "MoSY", language: "english",  task1: 20, task2l_word: 18, task2h_sentences: 14, total_score: 52, part1_reading_level: "Independent",   story_number: 2, num_miscues: 2,  words_read: 106, total_time: "1:30", wpm: 104, pct_correct_words: 97, total_correct: 50, learner_experience: 5, observation_level: 4, reading_profile: "High Emerging Reader", remarks: "" },
    { id: 3, assessment_date: "2026-02-05", period: "EoSY", language: "filipino", task1: 20, task2l_word: 18, task2h_sentences: 14, total_score: 52, part1_reading_level: "Independent",   story_number: 3, num_miscues: 2,  words_read: 110, total_time: "1:26", wpm: 108, pct_correct_words: 98, total_correct: 51, learner_experience: 5, observation_level: 4, reading_profile: "High Emerging Reader", remarks: "Excellent reader" },
    { id: 4, assessment_date: "2026-03-10", period: "BoSY", language: "filipino", task1: 20, task2l_word: 18, task2h_sentences: 14, total_score: 52, part1_reading_level: "Independent",   story_number: 1, num_miscues: 2,  words_read: 112, total_time: "1:24", wpm: 110, pct_correct_words: 98, total_correct: 51, learner_experience: 5, observation_level: 4, reading_profile: "High Emerging Reader", remarks: "" },
    { id: 5, assessment_date: "2026-04-01", period: "MoSY", language: "english",  task1: 20, task2l_word: 19, task2h_sentences: 15, total_score: 54, part1_reading_level: "Independent",   story_number: 2, num_miscues: 1,  words_read: 113, total_time: "1:22", wpm: 112, pct_correct_words: 99, total_correct: 53, learner_experience: 5, observation_level: 4, reading_profile: "Reading at Grade Level", remarks: "" },
  ],
  5: [
    { id: 1, assessment_date: "2025-08-13", period: "BoSY", language: "filipino", task1: 16, task2l_word: 12, task2h_sentences:  9, total_score: 37, part1_reading_level: "Instructional", story_number: 1, num_miscues: 11, words_read: 87,  total_time: "1:58", wpm: 76,  pct_correct_words: 86, total_correct: 33, learner_experience: 3, observation_level: 3, reading_profile: "Developing Reader",    remarks: "" },
    { id: 2, assessment_date: "2025-11-19", period: "MoSY", language: "filipino", task1: 17, task2l_word: 13, task2h_sentences: 10, total_score: 40, part1_reading_level: "Instructional", story_number: 2, num_miscues: 9,  words_read: 91,  total_time: "1:50", wpm: 82,  pct_correct_words: 90, total_correct: 37, learner_experience: 3, observation_level: 3, reading_profile: "Developing Reader",    remarks: "" },
  ],
};

// ── Compute stats from records ───────────────────────────────
function computeStats(records = []) {
  if (records.length === 0) {
    return { totalAssessments: 0, accuracy: null, avgWpm: null, observationLevel: null };
  }
  const avgAccuracy = Math.round(
    records.reduce((sum, r) => sum + (r.pct_correct_words ?? r.accuracy ?? 0), 0) / records.length
  );
  const avgWpm = Math.round(
    records.reduce((sum, r) => sum + (r.wpm ?? r.cwpm ?? 0), 0) / records.length
  );
  const latest = records[records.length - 1];
  const observationLevel = latest?.observation_level
    ?? (avgAccuracy >= 95 ? 4 : avgAccuracy >= 85 ? 3 : avgAccuracy >= 75 ? 2 : 1);

  return { totalAssessments: records.length, accuracy: avgAccuracy, avgWpm, observationLevel };
}

// ============================================================
export default function StudentInfoPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // ── Load student + records ───────────────────────────────
  // FINAL CODE — DO NOT DELETE:
  /*
  useEffect(() => {
    setLoading(true);
    Promise.all([
      studentsApi.get(id),
      sessionsApi.list({ student_id: id }),
    ])
      .then(([studentData, sessionData]) => {
        setStudent(studentData);
        setRecords(sessionData);
      })
      .catch((e) => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, [id]);
  */

  // ── Mock data (temporary) — DELETE AFTER backend is ready ──
  useEffect(() => {
    setLoading(true);
    const studentId = parseInt(id, 10);
    const found = MOCK_STUDENTS.find((s) => s.id === studentId);
    if (!found) {
      setError("Student not found.");
    } else {
      setStudent(found);
      setRecords(MOCK_RECORDS[studentId] ?? []);
    }
    setLoading(false);
  }, [id]);

  // ── Handlers ─────────────────────────────────────────────
  function handleEdit(record) {
    // TODO: open edit modal or navigate to edit page
    alert(`Edit record #${record.id} — coming soon.`);
  }

  function handleDelete(record) {
    if (!confirm(`Delete assessment record #${record.id}?`)) return;
    // FINAL CODE — DO NOT DELETE:
    // sessionsApi.delete(record.id).then(() =>
    //   setRecords((prev) => prev.filter((r) => r.id !== record.id))
    // );

    // Mock delete
    setRecords((prev) => prev.filter((r) => r.id !== record.id));
  }

  const stats = computeStats(records);

  // ============================================================
  // RENDER — single <Layout> wraps everything, no nesting
  // ============================================================
  return (
    <Layout>
      {/* ── Loading state ── */}
      {loading && (
        <div className="sip-state">
          <div className="sip-spinner" />
          <p>Loading student…</p>
        </div>
      )}

      {/* ── Error state ── */}
      {!loading && (error || !student) && (
        <div className="sip-state sip-state--error">
          <p>⚠ {error ?? "Student not found."}</p>
          <button
            className="sip-back-btn"
            onClick={() => navigate("/students")}
          >
            <ChevronLeft size={15} /> Back to Students
          </button>
        </div>
      )}

      {/* ── Main content ── */}
      {!loading && !error && student && (
        <div className="sip-page">

          {/* Back button */}
          <button
            className="sip-back-btn"
            onClick={() => navigate("/students")}
            aria-label="Back to students"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Profile card */}
          <StudentProfileCard student={student} />

          {/* Stats bar */}
          <StudentStatsBar stats={stats} />

          {/* Assessment history table */}
          <AssessmentHistoryTable
            records={records}
            student={student}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

        </div>
      )}
    </Layout>
  );
}
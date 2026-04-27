import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import Layout                  from "../components/Layout";
import StudentProfileCard      from "../components/StudentProfileCard";
import StudentStatsBar         from "../components/StudentStatsBar";
import AssessmentHistoryTable  from "../components/AssessmentHistoryTable";
import { studentsApi, sessionsApi } from "../services/api";

import "./pages css/StudentInfoPage.css";

const PERIOD_MAP = { beginning: "BoSY", middle: "MoSY", end: "EoSY" };

function sessionToRecord(session) {
  const rr  = session.reading_result;
  const obs = session.observation;
  const pctCorrect =
    rr && rr.total_words > 0
      ? Math.round(((rr.total_words - (rr.miscue_count ?? 0)) / rr.total_words) * 100)
      : null;
  return {
    id:                session.id,
    assessment_date:   session.created_at,
    period:            PERIOD_MAP[session.period] ?? session.period,
    language:          session.language,
    num_miscues:       rr?.miscue_count ?? null,
    words_read:        rr?.total_words ?? null,
    wpm:               rr?.cwpm != null ? Math.round(rr.cwpm) : null,
    pct_correct_words: pctCorrect,
    total_correct:     obs?.comprehension_correct ?? null,
    learner_experience: obs?.learner_experience ?? null,
    observation_level: obs?.fluency_level ?? null,
    remarks:           obs?.teacher_remarks ?? null,
  };
}

function computeStats(records = []) {
  const withResults = records.filter((r) => r.wpm != null);
  if (withResults.length === 0) {
    return { totalAssessments: records.length, accuracy: null, avgWpm: null, observationLevel: null };
  }
  const avgAccuracy = Math.round(
    withResults.reduce((sum, r) => sum + (r.pct_correct_words ?? 0), 0) / withResults.length
  );
  const avgWpm = Math.round(
    withResults.reduce((sum, r) => sum + (r.wpm ?? 0), 0) / withResults.length
  );
  const latest = withResults[withResults.length - 1];
  const observationLevel = latest?.observation_level ?? null;
  return { totalAssessments: records.length, accuracy: avgAccuracy, avgWpm, observationLevel };
}

export default function StudentInfoPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      studentsApi.get(id),
      sessionsApi.list({ student_id: id, page_size: 200 }),
    ])
      .then(([studentData, sessionData]) => {
        setStudent(studentData);
        setRecords((sessionData.sessions ?? []).map(sessionToRecord));
      })
      .catch((e) => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, [id]);

  function handleDelete(record) {
    if (!confirm(`Delete assessment record #${record.id}?`)) return;
    sessionsApi
      .archive(record.id)
      .then(() => setRecords((prev) => prev.filter((r) => r.id !== record.id)))
      .catch((e) => alert(e.response?.data?.detail || "Failed to delete record."));
  }

  const stats = computeStats(records);

  return (
    <Layout>
      {loading && (
        <div className="sip-state">
          <div className="sip-spinner" />
          <p>Loading student…</p>
        </div>
      )}

      {!loading && (error || !student) && (
        <div className="sip-state sip-state--error">
          <p>⚠ {error ?? "Student not found."}</p>
          <button className="sip-back-btn" onClick={() => navigate("/students")}>
            <ChevronLeft size={15} /> Back to Students
          </button>
        </div>
      )}

      {!loading && !error && student && (
        <div className="sip-page">
          <button
            className="sip-back-btn"
            onClick={() => navigate("/students")}
            aria-label="Back to students"
          >
            <ChevronLeft size={18} />
          </button>

          <StudentProfileCard student={student} />
          <StudentStatsBar stats={stats} />
          <AssessmentHistoryTable
            records={records}
            student={student}
            onDelete={handleDelete}
          />
        </div>
      )}
    </Layout>
  );
}

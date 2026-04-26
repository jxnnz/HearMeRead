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
    { id: 1, date: "2025-08-14", period: "beginning", passage_title: "Ang Pagong at ang Matsing", cwpm: 82,  accuracy: 89 },
    { id: 2, date: "2025-11-20", period: "middle",    passage_title: "Ang Aking Paaralan",        cwpm: 88,  accuracy: 91 },
    { id: 3, date: "2026-02-05", period: "end",       passage_title: "Ang Pagong at ang Matsing", cwpm: 95,  accuracy: 94 },
  ],
  2: [
    { id: 1, date: "2025-08-14", period: "beginning", passage_title: "The Helpful Little Star", cwpm: 50, accuracy: 72 },
    { id: 2, date: "2025-11-20", period: "middle",    passage_title: "The Mango Tree",           cwpm: 55, accuracy: 74 },
  ],
  3: [
    { id: 1, date: "2025-08-14", period: "beginning", passage_title: "Ang Pagong at ang Matsing",      cwpm: 68, accuracy: 80 },
    { id: 2, date: "2025-11-20", period: "middle",    passage_title: "Ang Aking Paaralan",             cwpm: 72, accuracy: 83 },
    { id: 3, date: "2026-02-05", period: "end",       passage_title: "Si Pedro at ang Mahiwagang Bato", cwpm: 78, accuracy: 86 },
    { id: 4, date: "2026-03-10", period: "end",       passage_title: "Ang Pagong at ang Matsing",      cwpm: 80, accuracy: 87 },
  ],
  4: [
    { id: 1, date: "2025-08-14", period: "beginning", passage_title: "The Helpful Little Star", cwpm: 95,  accuracy: 94 },
    { id: 2, date: "2025-11-20", period: "middle",    passage_title: "The Mango Tree",           cwpm: 102, accuracy: 96 },
    { id: 3, date: "2026-02-05", period: "end",       passage_title: "The Helpful Little Star", cwpm: 108, accuracy: 97 },
    { id: 4, date: "2026-03-10", period: "end",       passage_title: "The Mango Tree",           cwpm: 112, accuracy: 98 },
    { id: 5, date: "2026-04-01", period: "end",       passage_title: "The Helpful Little Star", cwpm: 115, accuracy: 99 },
  ],
  5: [
    { id: 1, date: "2025-08-14", period: "beginning", passage_title: "Ang Aking Paaralan",        cwpm: 74, accuracy: 85 },
    { id: 2, date: "2025-11-20", period: "middle",    passage_title: "Ang Pagong at ang Matsing", cwpm: 79, accuracy: 88 },
  ],
};

// ── Compute stats from records ───────────────────────────────
function computeStats(records = []) {
  if (records.length === 0) {
    return { totalAssessments: 0, accuracy: null, avgWpm: null, observationLevel: null };
  }
  const avgAccuracy = Math.round(
    records.reduce((sum, r) => sum + (r.accuracy ?? 0), 0) / records.length
  );
  const avgWpm = Math.round(
    records.reduce((sum, r) => sum + (r.cwpm ?? r.wpm ?? 0), 0) / records.length
  );
  const observationLevel =
    avgAccuracy >= 95 ? 5 :
    avgAccuracy >= 85 ? 4 :
    avgAccuracy >= 75 ? 3 :
    avgAccuracy >= 65 ? 2 : 1;

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
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

        </div>
      )}
    </Layout>
  );
}
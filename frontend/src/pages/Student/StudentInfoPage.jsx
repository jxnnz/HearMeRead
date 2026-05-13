import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import Layout from "../../components/Layout";
import StudentProfileCard from "../../components/StudentProfileCard";
import StudentStatsBar from "../../components/StudentStatsBar";
import AssessmentHistoryTable from "../../components/AssessmentHistoryTable";
import ConfirmModal from "../../modals/ConfirmModal";
import EditStudentModal from "../../modals/EditStudentModal";
import Toast from "../../modals/Toast";
import useToast from "../../hooks/Usetoast";
import { studentsApi, sessionsApi } from "../../services/api";
import { parseApiError } from "../../utils/apiError";

import "../pages css/StudentInfoPage.css";

const PERIOD_MAP = { beginning: "BoSY", middle: "MoSY", end: "EoSY" };

function formatTime(seconds) {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = String(Math.round(seconds % 60)).padStart(2, "0");
  return `${m}:${s}`;
}

function sessionToRecord(session) {
  const rr = session.reading_result;
  const obs = session.observation;

  const pctCorrect = rr && rr.total_words > 0
    ? Math.round(((rr.total_words - (rr.miscue_count ?? 0)) / rr.total_words) * 100)
    : null;

  return {
    id: session.id,
    assessment_date: session.created_at,
    period: PERIOD_MAP[session.period] ?? session.period,
    language: session.language,

    // Assessment 1 Part 1
    task1: rr?.part1_task1_correct ?? null,
    task2l_word: rr?.part1_route === "task_2L" ? rr?.part1_task2_correct : null,
    task2h_sentences: rr?.part1_route === "task_2H" ? rr?.part1_task2_correct : null,
    total_score: rr?.part1_total_score ?? null,
    part1_reading_level: rr?.part1_classification ?? null,
    reading_profile: rr?.reading_profile ?? null,

    // Assessment 2 (Part 2)
    story_number: session.passage?.title ?? null,
    num_miscues: rr?.miscue_count ?? null,
    words_read: rr?.total_words ?? null,
    wpm: rr?.cwpm != null ? Math.round(rr.cwpm) : null,
    pct_correct_words: pctCorrect,
    total_time: formatTime(rr?.reading_time_seconds),
    total_correct: obs?.comprehension_correct ?? null,
    learner_experience: obs?.learner_experience ?? null,
    observation_level: obs?.fluency_level ?? null,
    remarks: obs?.teacher_remarks ?? null,
  };
}

function computeStats(records = []) {
  const done = records.filter((r) => r.wpm != null);
  if (done.length === 0) {
    return { totalAssessments: records.length, accuracy: null, avgWpm: null, observationLevel: null };
  }
  const avgAccuracy = Math.round(
    done.reduce((s, r) => s + (r.pct_correct_words ?? 0), 0) / done.length
  );
  const avgWpm = Math.round(
    done.reduce((s, r) => s + (r.wpm ?? 0), 0) / done.length
  );
  const latest = done[done.length - 1];
  return { totalAssessments: records.length, accuracy: avgAccuracy, avgWpm, observationLevel: latest?.observation_level ?? null };
}

export default function StudentInfoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backTo      = location.state?.from ?? "/students";
  const backOptions = location.state?.classState ? { state: location.state.classState } : {};
  const { toasts, removeToast, showSaveSuccess, showError } = useToast();

  const [student, setStudent] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editStudentOpen, setEditStudentOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingStudentDelete, setPendingStudentDelete] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      studentsApi.get(id),
      sessionsApi.list({ student_id: id, page_size: 100 }),
    ])
      .then(([studentData, sessionData]) => {
        setStudent(studentData);
        setRecords((sessionData.sessions ?? []).map(sessionToRecord));
      })
      .catch((e) => setError(parseApiError(e, "Failed to load student.")))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSaveStudent(updatedFields) {
    setEditSaving(true);
    setEditError(null);
    try {
      const payload = {};
      if (updatedFields.first_name) payload.first_name = updatedFields.first_name;
      if (updatedFields.last_name) payload.last_name = updatedFields.last_name;
      if (updatedFields.grade_level) payload.grade_level = String(updatedFields.grade_level);
      if (updatedFields.section) payload.section = updatedFields.section;
      if (updatedFields.sex) payload.sex = updatedFields.sex;
      if (updatedFields.lrn) payload.lrn = updatedFields.lrn;
      const updated = await studentsApi.update(id, payload);
      setStudent(updated);
      setEditStudentOpen(false);
      showSaveSuccess("Student");
    } catch (e) {
      setEditError(parseApiError(e, "Failed to save changes."));
    } finally {
      setEditSaving(false);
    }
  }

  function handleDelete(record) {
    setPendingDelete(record);
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    sessionsApi
      .archive(pendingDelete.id)
      .then(() => setRecords((prev) => prev.filter((r) => r.id !== pendingDelete.id)))
      .catch((e) => showError(parseApiError(e, "Failed to delete record.")));
    setPendingDelete(null);
  }

  async function handleDeleteStudent() {
    try {
      await studentsApi.delete(student.id);
      navigate("/students");
    } catch (e) {
      showError(parseApiError(e, "Failed to delete student."));
    }
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
          <button className="sip-back-btn" onClick={() => navigate(backTo, backOptions)}>
            <ChevronLeft size={15} /> Back to Class
          </button>
        </div>
      )}

      {!loading && !error && student && (
        <div className="sip-page">
          <button
            className="sip-back-btn"
            onClick={() => navigate(backTo, backOptions)}
            aria-label="Back to Class"
          >
            <ChevronLeft size={18} />
          </button>

          <StudentProfileCard
            student={student}
            onEdit={() => { setEditError(null); setEditStudentOpen(true); }}
            onDelete={() => setPendingStudentDelete(true)}
          />

          <StudentStatsBar stats={stats} />

          <AssessmentHistoryTable
            records={records}
            student={student}
            onDelete={handleDelete}
          />
        </div>
      )}

      {/* ── Delete assessment record ── */}
      <ConfirmModal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        variant="danger"
        title="Delete Record?"
        message={`This assessment record will be permanently deleted and cannot be recovered.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />

      {/* ── Delete student ── */}
      <ConfirmModal
        isOpen={pendingStudentDelete}
        onClose={() => setPendingStudentDelete(false)}
        onConfirm={() => { setPendingStudentDelete(false); handleDeleteStudent(); }}
        variant="danger"
        title="Delete Student?"
        message={`${student?.first_name} ${student?.last_name} and all their assessment records will be permanently deleted.`}
        confirmLabel="Delete Student"
        cancelLabel="Cancel"
      />

      {/* ── Edit student ── */}
      <EditStudentModal
        isOpen={editStudentOpen}
        student={student}
        onClose={() => setEditStudentOpen(false)}
        onSave={handleSaveStudent}
        saving={editSaving}
        error={editError}
      />

      <Toast toasts={toasts} onRemove={removeToast} />
    </Layout>
  );
}

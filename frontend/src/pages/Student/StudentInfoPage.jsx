import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Pencil, X, Check } from "lucide-react";

import Layout                  from "../../components/Layout";
import StudentProfileCard      from "../../components/StudentProfileCard";
import StudentStatsBar         from "../../components/StudentStatsBar";
import AssessmentHistoryTable  from "../../components/AssessmentHistoryTable";
import { studentsApi, sessionsApi } from "../../services/api";

import "../pages css/StudentInfoPage.css";

const PERIOD_MAP   = { beginning: "BoSY", middle: "MoSY", end: "EoSY" };
const GRADE_OPTIONS = ["Grade 1", "Grade 2", "Grade 3"];

function formatTime(seconds) {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = String(Math.round(seconds % 60)).padStart(2, "0");
  return `${m}:${s}`;
}

function sessionToRecord(session) {
  const rr  = session.reading_result;
  const obs = session.observation;

  const pctCorrect = rr && rr.total_words > 0
    ? Math.round(((rr.total_words - (rr.miscue_count ?? 0)) / rr.total_words) * 100)
    : null;

  return {
    id:                 session.id,
    assessment_date:    session.created_at,
    period:             PERIOD_MAP[session.period] ?? session.period,
    language:           session.language,
    num_miscues:        rr?.miscue_count         ?? null,
    words_read:         rr?.total_words          ?? null,
    wpm:                rr?.cwpm != null ? Math.round(rr.cwpm) : null,
    pct_correct_words:  pctCorrect,
    total_time:         formatTime(rr?.reading_time_seconds),
    total_correct:      obs?.comprehension_correct ?? null,
    learner_experience: obs?.learner_experience    ?? null,
    observation_level:  obs?.fluency_level         ?? null,
    remarks:            obs?.teacher_remarks        ?? null,
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
  const { id }   = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const [editing,   setEditing]   = useState(false);
  const [editForm,  setEditForm]   = useState({});
  const [saving,    setSaving]     = useState(false);
  const [saveError, setSaveError]  = useState(null);

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
      .catch((e) => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, [id]);

  function openEdit() {
    setEditForm({
      first_name:  student.first_name  ?? "",
      last_name:   student.last_name   ?? "",
      grade_level: student.grade_level ?? "",
      section:     student.section     ?? "",
      sex:         student.sex         ?? "",
      lrn:         student.lrn         ?? "",
    });
    setSaveError(null);
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {};
      if (editForm.first_name)  payload.first_name  = editForm.first_name;
      if (editForm.last_name)   payload.last_name   = editForm.last_name;
      if (editForm.grade_level) payload.grade_level = editForm.grade_level;
      if (editForm.section)     payload.section     = editForm.section;
      if (editForm.sex)         payload.sex         = editForm.sex;
      if (editForm.lrn)         payload.lrn         = editForm.lrn;
      const updated = await studentsApi.update(id, payload);
      setStudent(updated);
      setEditing(false);
    } catch (e) {
      setSaveError(e.response?.data?.detail || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

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
          <div className="sip-top-bar">
            <button
              className="sip-back-btn"
              onClick={() => navigate("/students")}
              aria-label="Back to students"
            >
              <ChevronLeft size={18} />
            </button>

            <button className="sip-edit-btn" onClick={openEdit}>
              <Pencil size={14} />
              Edit Student
            </button>
          </div>

          <StudentProfileCard student={student} />
          <StudentStatsBar stats={stats} />
          <AssessmentHistoryTable
            records={records}
            student={student}
            onDelete={handleDelete}
          />
        </div>
      )}

      {editing && (
        <div className="sip-modal-overlay" onClick={() => setEditing(false)}>
          <div className="sip-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sip-modal__header">
              <h3 className="sip-modal__title">Edit Student Info</h3>
              <button className="sip-modal__close" onClick={() => setEditing(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="sip-modal__body">
              <div className="sip-modal__row">
                <div className="sip-modal__field">
                  <label className="sip-modal__label">First Name</label>
                  <input
                    className="sip-modal__input"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))}
                  />
                </div>
                <div className="sip-modal__field">
                  <label className="sip-modal__label">Last Name</label>
                  <input
                    className="sip-modal__input"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="sip-modal__row">
                <div className="sip-modal__field">
                  <label className="sip-modal__label">Grade Level</label>
                  <select
                    className="sip-modal__input"
                    value={editForm.grade_level}
                    onChange={(e) => setEditForm((f) => ({ ...f, grade_level: e.target.value }))}
                  >
                    <option value="">— Select —</option>
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="sip-modal__field">
                  <label className="sip-modal__label">Section</label>
                  <input
                    className="sip-modal__input"
                    value={editForm.section}
                    onChange={(e) => setEditForm((f) => ({ ...f, section: e.target.value }))}
                    placeholder="e.g. Sampaguita"
                  />
                </div>
              </div>

              <div className="sip-modal__field">
                <label className="sip-modal__label">LRN (12 digits)</label>
                <input
                  className="sip-modal__input"
                  value={editForm.lrn}
                  maxLength={12}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, lrn: e.target.value.replace(/\D/g, "") }))
                  }
                  placeholder="Learner Reference Number"
                />
              </div>

              {saveError && <p className="sip-modal__error">⚠ {saveError}</p>}
            </div>

            <div className="sip-modal__footer">
              <button
                className="sip-modal__cancel"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="sip-modal__save"
                onClick={handleSave}
                disabled={saving}
              >
                <Check size={14} />
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

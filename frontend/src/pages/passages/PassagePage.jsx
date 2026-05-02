import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText } from "lucide-react";

import Layout from "../../components/Layout";
import PassageCard from "../../components/PassageCard";
import PassageModal from "../../components/PassageModal";
import AppButton from "../../components/AppButton";
import ConfirmModal from "../../modals/ConfirmModal";
import Toast from "../../modals/Toast";
import useToast from "../../hooks/Usetoast";
import { passagesApi } from "../../services/api";

import "../pages css/PassagePage.css";

const EMPTY_FORM = {
  title: "", content: "", language: "filipino", grade_level: "grade_2",
  task1_content: "", task2_words: "", task2_sentences: "",
};

export default function PassagePage() {
  const navigate = useNavigate();
  const { toasts, removeToast, showSaveSuccess } = useToast();

  const [passages, setPassages]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [pageError, setPageError] = useState(null);

  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState(null);

  const [pendingArchive, setPendingArchive] = useState(null);

  useEffect(() => {
    passagesApi
      .list({ page_size: 100 })
      .then((data) => setPassages(data.passages))
      .catch((e) => setPageError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, []);

  const assessment1 = passages.filter((p) => p.assessment_type === 1);
  const assessment2 = passages.filter((p) => p.assessment_type === 2);

  function openEdit(passage, e) {
    e.stopPropagation();
    setForm({
      title:           passage.title           ?? "",
      content:         passage.content         ?? "",
      language:        passage.language        ?? "filipino",
      grade_level:     passage.grade_level     ?? "grade_2",
      task1_content:   passage.task1_content   ?? "",
      task2_words:     passage.task2_words     ?? "",
      task2_sentences: passage.task2_sentences ?? "",
    });
    setFormError(null);
    setEditTarget(passage);
  }

  function closeEdit() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    const isA2 = editTarget?.assessment_type === 2;
    if (isA2 && !form.title.trim())   { setFormError("Title is required.");           return; }
    if (isA2 && !form.content.trim()) { setFormError("Passage content is required."); return; }
    setSaving(true);
    try {
      const updateData = { language: form.language };
      if (form.grade_level) updateData.grade_level = form.grade_level;
      if (isA2) {
        if (form.title.trim())   updateData.title   = form.title.trim();
        if (form.content.trim()) updateData.content = form.content.trim();
      } else {
        if (form.task1_content.trim())   updateData.task1_content   = form.task1_content.trim();
        if (form.task2_words.trim())     updateData.task2_words     = form.task2_words.trim();
        if (form.task2_sentences.trim()) updateData.task2_sentences = form.task2_sentences.trim();
      }
      await passagesApi.update(editTarget.id, updateData);
      setPassages((prev) =>
        prev.map((p) => (p.id === editTarget.id ? { ...p, ...updateData } : p))
      );
      closeEdit();
      showSaveSuccess("Passage");
    } catch (err) {
      setFormError(err.response?.data?.detail || err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleRemove(passage, e) {
    e.stopPropagation();
    setPendingArchive(passage);
  }

  async function confirmArchive() {
    if (!pendingArchive) return;
    try {
      await passagesApi.archive(pendingArchive.id);
      setPassages((prev) => prev.filter((p) => p.id !== pendingArchive.id));
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to remove passage.");
    } finally {
      setPendingArchive(null);
    }
  }

  function AssessmentSection({ label, list }) {
    return (
      <div className="ph-card">
        <div className="ph-card__header">
          <div className="ph-card__header-left">
            <h2 className="ph-card__title">{label}</h2>
            <span className="ph-card__count">{list.length} passages</span>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="ph-empty">
            <FileText size={36} strokeWidth={1.2} />
            <p>No {label} passages yet.</p>
          </div>
        ) : (
          <div className="ph-grid">
            {list.map((p) => (
              <PassageCard
                key={p.id}
                passage={p}
                onClick={() => {}}
                onEdit={openEdit}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Layout>
      <div className="ph-page">

        <div className="ph-topbar">
          <h1 className="ph-title">Reading Passages</h1>
          <div className="ph-topbar__actions">
            <AppButton
              variant="teal"
              onClick={() => navigate("/passages/add-assessment-1")}
            >
              <Plus size={15} />
              Add Assessment 1
            </AppButton>
            <AppButton
              variant="teal"
              onClick={() => navigate("/passages/add-assessment-2")}
            >
              <Plus size={15} />
              Add Assessment 2
            </AppButton>
          </div>
        </div>

        {loading && (
          <div className="ph-empty">
            <div className="sr-spinner" />
            <p>Loading passages…</p>
          </div>
        )}

        {pageError && !loading && (
          <div className="ap-error" role="alert">{pageError}</div>
        )}

        {!loading && !pageError && (
          <>
            <AssessmentSection label="Assessment 1" list={assessment1} />
            <AssessmentSection label="Assessment 2" list={assessment2} />
          </>
        )}

      </div>

      {editTarget && (
        <PassageModal
          mode="edit"
          assessmentType={editTarget.assessment_type}
          form={form}
          setForm={setForm}
          onSubmit={handleEditSubmit}
          onClose={closeEdit}
          saving={saving}
          formError={formError}
        />
      )}

      <ConfirmModal
        isOpen={!!pendingArchive}
        onClose={() => setPendingArchive(null)}
        onConfirm={confirmArchive}
        variant="danger"
        title="Remove Passage?"
        message={`"${pendingArchive?.title || "This passage"}" will be removed and no longer available for assessments.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
      />

      <Toast toasts={toasts} onRemove={removeToast} />
    </Layout>
  );
}

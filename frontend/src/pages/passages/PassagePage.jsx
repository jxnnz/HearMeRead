import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText } from "lucide-react";

import Layout from "../../components/Layout";
import PassageCard from "../../components/PassageCard";
import AppButton from "../../components/AppButton";
import ConfirmModal from "../../modals/ConfirmModal";
import Toast from "../../modals/Toast";
import useToast from "../../hooks/Usetoast";
import { passagesApi } from "../../services/api";
import { parseApiError } from "../../utils/apiError";

import "../pages css/PassagePage.css";

export default function PassagePage() {
  const navigate = useNavigate();
  const { toasts, removeToast } = useToast();

  const [passages, setPassages]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [pageError, setPageError] = useState(null);

  const [pendingArchive, setPendingArchive] = useState(null);
  const [archiveError, setArchiveError]     = useState(null);

  useEffect(() => {
    passagesApi
      .list({ page_size: 100 })
      .then((data) => setPassages(data.passages))
      .catch((e) => setPageError(parseApiError(e, "Failed to load passages.")))
      .finally(() => setLoading(false));
  }, []);

  const assessment1 = passages.filter((p) => p.assessment_type === 1);
  const assessment2 = passages.filter((p) => p.assessment_type === 2);

  function openEdit(passage, e) {
    e.stopPropagation();
    if (passage.assessment_type === 1) {
      navigate(`/passages/edit-assessment-1/${passage.id}`);
    } else {
      navigate(`/passages/edit-assessment-2/${passage.id}`);
    }
  }

  function handleRemove(passage, e) {
    e.stopPropagation();
    setPendingArchive(passage);
  }

  async function confirmArchive() {
    if (!pendingArchive) return;
    setArchiveError(null);
    try {
      await passagesApi.archive(pendingArchive.id);
      setPassages((prev) => prev.filter((p) => p.id !== pendingArchive.id));
    } catch (err) {
      setArchiveError(parseApiError(err, "Failed to remove passage."));
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
        {archiveError && (
          <div className="ap-error" role="alert">{archiveError}</div>
        )}

        {!loading && !pageError && (
          <>
            <AssessmentSection label="Assessment 1" list={assessment1} />
            <AssessmentSection label="Assessment 2" list={assessment2} />
          </>
        )}

      </div>

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

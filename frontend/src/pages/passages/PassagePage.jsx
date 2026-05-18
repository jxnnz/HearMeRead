import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Globe, Lock, Upload } from "lucide-react";
import { useWindowWidth } from "../../hooks/useWindowWidth";

import Layout from "../../components/Layout";
import TopBar from "../../components/TopBar";
import PassageCard from "../../components/PassageCard";
import AppButton from "../../components/AppButton";
import ConfirmModal from "../../modals/ConfirmModal";
import Toast from "../../modals/Toast";
import UploadModal from "../../components/UploadModal";
import useToast from "../../hooks/Usetoast";
import { passagesApi } from "../../services/api";
import { parseApiError } from "../../utils/apiError";

import "../pages css/PassagePage.css";
import "../pages css/AddPassagePage.css";

export default function PassagePage() {
  const navigate = useNavigate();
  const { toasts, removeToast } = useToast();
  const isMobile = useWindowWidth() <= 768;

  const [passages, setPassages]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [pageError, setPageError] = useState(null);

  const [pendingArchive, setPendingArchive] = useState(null);
  const [archiveError, setArchiveError]     = useState(null);

  // View-only modal for public passages
  const [viewPassage, setViewPassage] = useState(null);

  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    passagesApi
      .list({ page_size: 100 })
      .then((data) => setPassages(data.passages))
      .catch((e) => setPageError(parseApiError(e, "Failed to load passages.")))
      .finally(() => setLoading(false));
  }, []);

  // Separate by visibility first, then by assessment type
  const myPassages = useMemo(() => passages.filter((p) => p.visibility !== "public"), [passages]);
  const publicPassages = useMemo(() => passages.filter((p) => p.visibility === "public"), [passages]);

  const myA1 = useMemo(() => myPassages.filter((p) => p.assessment_type === 1), [myPassages]);
  const myA2 = useMemo(() => myPassages.filter((p) => p.assessment_type === 2), [myPassages]);

  const publicA1 = useMemo(() => publicPassages.filter((p) => p.assessment_type === 1), [publicPassages]);
  const publicA2 = useMemo(() => publicPassages.filter((p) => p.assessment_type === 2), [publicPassages]);

  const openEdit = useCallback((passage, e) => {
    e.stopPropagation();
    if (passage.assessment_type === 1) {
      navigate(`/passages/edit-assessment-1/${passage.id}`);
    } else {
      navigate(`/passages/edit-assessment-2/${passage.id}`);
    }
  }, [navigate]);

  const handleRemove = useCallback((passage, e) => {
    e.stopPropagation();
    setPendingArchive(passage);
  }, []);

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

  function AssessmentSection({ label, list, readOnly = false, icon }) {
    return (
      <div className="ph-card">
        <div className="ph-card__header">
          <div className="ph-card__header-left">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {icon}
              <h2 className="ph-card__title">{label}</h2>
            </div>
            <span className="ph-card__count">{list.length} passages</span>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="ph-empty">
            <FileText size={36} strokeWidth={1.2} />
            <p>No {label.toLowerCase()} passages yet.</p>
          </div>
        ) : (
          <div className="ph-grid">
            {list.map((p) => (
              <PassageCard
                key={p.id}
                passage={p}
                onClick={() => readOnly ? setViewPassage(p) : null}
                onEdit={openEdit}
                onRemove={handleRemove}
                readOnly={readOnly}
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

        <TopBar title="Reading Passages">
          <button className="ap-save-btn" onClick={() => setUploadOpen(true)} style={{ display: "flex", alignItems: "center", gap: isMobile ? 0 : 6, background: "#fff", borderColor: "#c8d0e4", padding: isMobile ? "7px 10px" : undefined }}>
            <Upload size={15} />
            {!isMobile && " Upload"}
          </button>
          <button className="ap-save-btn" onClick={() => navigate("/passages/add-assessment-1")} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={15} />{isMobile ? "A1" : "Add Assessment 1"}
          </button>
          <button className="ap-save-btn" onClick={() => navigate("/passages/add-assessment-2")} style={{ display: "flex", alignItems: "center", gap: 6, background: "#2c3e6b", color: "#fff", borderColor: "#2c3e6b" }}>
            <Plus size={15} />{isMobile ? "A2" : "Add Assessment 2"}
          </button>
        </TopBar>

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {[1, 2].map((s) => (
              <div key={s} className="ph-skeleton-card">
                <div className="ph-skeleton-header">
                  <div className="ph-skeleton ph-skeleton-title" />
                  <div className="ph-skeleton ph-skeleton-count" />
                </div>
                <div className="ph-grid">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="ph-skeleton-passage">
                      <div className="ph-skeleton ph-skeleton-meta" />
                      <div className="ph-skeleton ph-skeleton-ptitle" />
                      <div className="ph-skeleton ph-skeleton-line" />
                      <div className="ph-skeleton ph-skeleton-line ph-skeleton-line--short" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
            {/* Public Passages (read-only, shown first) */}
            {publicA1.length > 0 && (
              <AssessmentSection
                label="Assessment 1"
                list={publicA1}
                readOnly
                icon={null}
              />
            )}
            {publicA2.length > 0 && (
              <AssessmentSection
                label="Assessment 2"
                list={publicA2}
                readOnly
                icon={null}
              />
            )}

            {/* My Passages (private, full CRUD) */}
            {(myA1.length > 0 || myA2.length > 0) && (
              <>
                <div className="ph-section-label">
                  <Lock size={14} color="#6b7280" />
                  <span>My Passages</span>
                </div>
                {myA1.length > 0 && (
                  <AssessmentSection
                    label="Assessment 1"
                    list={myA1}
                    icon={null}
                  />
                )}
                {myA2.length > 0 && (
                  <AssessmentSection
                    label="Assessment 2"
                    list={myA2}
                    icon={null}
                  />
                )}
              </>
            )}
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

      {/* View-only modal for public passages */}
      {viewPassage && (
        <div className="ph-preview-overlay" onClick={() => setViewPassage(null)}>
          <div className="ph-preview-card" onClick={(e) => e.stopPropagation()}>

            <div className="ph-preview-header">
              <div>
                <h2 className="ph-preview-title">
                  {viewPassage.title || "Untitled"}
                </h2>
                <div className="ph-preview-meta">
                  <span>{viewPassage.grade_level ? viewPassage.grade_level.replace("grade_", "Grade ").replace("kindergarten", "Kindergarten") : ""}</span>
                  <span>·</span>
                  <span>{viewPassage.language === "filipino" ? "Filipino" : "English"}</span>
                  {viewPassage.word_count > 0 && <><span>·</span><span>{viewPassage.word_count} words</span></>}
                </div>
              </div>
              <button className="ph-preview-close" onClick={() => setViewPassage(null)}>✕</button>
            </div>

            <div className="ph-preview-body">
              {viewPassage.assessment_type === 2 && viewPassage.content && (
                <div className="ph-preview-content">{viewPassage.content}</div>
              )}
              {viewPassage.assessment_type === 1 && (
                <div className="ph-preview-section">
                  {viewPassage.task1_content && (
                    <div>
                      <strong className="ph-preview-block-label">Task 1:</strong>
                      <div className="ph-preview-block-content">{viewPassage.task1_content}</div>
                    </div>
                  )}
                  {viewPassage.task2_words && (
                    <div>
                      <strong className="ph-preview-block-label">Task 2 — Words:</strong>
                      <div className="ph-preview-block-content">{viewPassage.task2_words}</div>
                    </div>
                  )}
                  {viewPassage.task2_sentences && (
                    <div>
                      <strong className="ph-preview-block-label">Task 2 — Sentences:</strong>
                      <div className="ph-preview-block-content">{viewPassage.task2_sentences}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {viewPassage.questions?.length > 0 && (
              <div className="ph-preview-questions">
                <h3 className="ph-preview-questions-title">
                  Questions ({viewPassage.questions.length})
                </h3>
                <ol className="ph-preview-questions-list">
                  {viewPassage.questions.map((q) => (
                    <li key={q.id}>{q.text}</li>
                  ))}
                </ol>
              </div>
            )}

          </div>
        </div>
      )}

      <Toast toasts={toasts} onRemove={removeToast} />

      {uploadOpen && (
        <UploadModal 
          defaultType={2}
          eng3={false}
          onClose={() => setUploadOpen(false)}
          onUpload={(type, parsedData) => {
            if (type === 1) {
              navigate("/passages/add-assessment-1", { state: { parsedData } });
            } else {
              navigate("/passages/add-assessment-2", { state: { parsedData } });
            }
          }}
        />
      )}
    </Layout>
  );
}

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Globe, Lock } from "lucide-react";

import Layout from "../../components/Layout";
import TopBar from "../../components/TopBar";
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

  // View-only modal for public passages
  const [viewPassage, setViewPassage] = useState(null);

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
            {/* ── Public Passages (read-only, shown first) ── */}
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

            {/* ── My Passages (private, full CRUD) ── */}
            <div className="ph-section-label">
              <Lock size={14} color="#6b7280" />
              <span>My Passages</span>
            </div>
            <AssessmentSection
              label="Assessment 1"
              list={myA1}
              icon={null}
            />
            <AssessmentSection
              label="Assessment 2"
              list={myA2}
              icon={null}
            />
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

      {/* ── View-only modal for public passages ── */}
      {viewPassage && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 16,
          }}
          onClick={() => setViewPassage(null)}
        >
          <div
            style={{
              background: "#fff", borderRadius: 16, width: "100%", maxWidth: 600,
              maxHeight: "80vh", overflow: "auto",
              boxShadow: "0 8px 32px rgba(0,0,0,.18)", padding: "28px 28px 24px",
              fontFamily: "Poppins, sans-serif",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a2340", fontFamily: "Georgia, serif" }}>
                  {viewPassage.title || "Untitled"}
                </h2>
                <div style={{ display: "flex", gap: 8, marginTop: 6, fontSize: 12, color: "#8a94b2" }}>
                  <span>{viewPassage.grade_level ? viewPassage.grade_level.replace("grade_", "Grade ").replace("kindergarten", "Kindergarten") : ""}</span>
                  <span>·</span>
                  <span>{viewPassage.language === "filipino" ? "Filipino" : "English"}</span>
                  <span>·</span>
                  <span>{viewPassage.word_count} words</span>
                </div>
              </div>
              <button
                onClick={() => setViewPassage(null)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, fontSize: 18, color: "#8a94b2" }}
              >
                ✕
              </button>
            </div>
            <div style={{
              fontSize: 14, lineHeight: 1.8, color: "#1a2340",
              whiteSpace: "pre-wrap", marginTop: 12,
            }}>
              {viewPassage.assessment_type === 1
                ? viewPassage.task1_content
                : viewPassage.content}
            </div>
            {viewPassage.questions && viewPassage.questions.length > 0 && (
              <div style={{ marginTop: 20, borderTop: "1px solid #eef0f8", paddingTop: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1a2340", marginBottom: 10 }}>
                  Questions ({viewPassage.questions.length})
                </h3>
                <ol style={{ paddingLeft: 20, fontSize: 13, color: "#4a5568", lineHeight: 1.8 }}>
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
    </Layout>
  );
}

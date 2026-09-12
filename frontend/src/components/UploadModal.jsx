import { useState, useRef } from "react";
import { Upload, FileText, X, ChevronDown, ChevronUp, Download } from "lucide-react";
import { parseFile, parseDocument } from "../utils/fileParser";
import { useWindowWidth } from "../hooks/useWindowWidth";
import { passagesApi, studentsApi } from "../services/api";

const ALL_TEMPLATE_OPTIONS = [
  { id: "a1_g1_fil", label: "Grade 1 — Filipino (Combined A1 & A2)", type: "Combined Grade Template", fileType: ".txt" },
  { id: "a1_g2_fil", label: "Grade 2 — Filipino (Combined A1 & A2)", type: "Combined Grade Template", fileType: ".txt" },
  { id: "a1_g3_fil", label: "Grade 3 — Filipino (Combined A1 & A2)", type: "Combined Grade Template", fileType: ".txt" },
  { id: "a1_g3_eng", label: "Grade 3 — English (Combined A1 & A2)",  type: "Combined Grade Template", fileType: ".txt" },
];

export default function UploadModal({
  onClose,
  onUpload,
  onBulkUpload,
  eng3         = false,
  teacherGrade = null,   // pass teacher's grade_level from authApi.me()
}) {
  const fileInputRef  = useRef(null);
  const [loading, setLoading]           = useState(false);
  const [guideOpen, setGuideOpen]       = useState(false);

  // Template download & selection modal state (Admin role multi-select)
  const [selectedFormat, setSelectedFormat]           = useState("docx");
  const [downloading, setDownloading]                 = useState(false);
  const [downloadProgress, setDownloadProgress]       = useState("");
  const [showTemplateModal, setShowTemplateModal]     = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([
    "a1_g1_fil", "a1_g2_fil", "a1_g3_fil", "a1_g3_eng"
  ]);

  // Drag & drop state
  const [isDragging, setIsDragging]     = useState(false);
  const dragCounterRef = useRef(0); // tracks nested dragenter/dragleave pairs

  // Staged files awaiting review before upload
  const [stagedFiles, setStagedFiles]   = useState([]); // File[]
  const [stageError, setStageError]     = useState(null);

  const isMobile = useWindowWidth() <= 768;

  const ACCEPTED_EXTENSIONS = [".txt", ".docx"];
  const MAX_FILES = 10;

  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function isAcceptedFile(file) {
    const name = (file.name || "").toLowerCase();
    return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
  }

  // ── Stage files — adds to the preview list ──────────────────────────
  function stageFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    setStageError(null);

    const incoming = Array.from(fileList);
    const accepted = incoming.filter(isAcceptedFile);
    const rejected = incoming.length - accepted.length;

    setStagedFiles((prev) => {
      // De-dupe by name+size so dragging the same file twice doesn't double it
      const existingKeys = new Set(prev.map((f) => `${f.name}__${f.size}`));
      const merged = [...prev];
      for (const f of accepted) {
        const key = `${f.name}__${f.size}`;
        if (!existingKeys.has(key)) {
          merged.push(f);
          existingKeys.add(key);
        }
      }
      return merged.slice(0, MAX_FILES);
    });

    if (rejected > 0) {
      setStageError(
        `${rejected} file${rejected > 1 ? "s were" : " was"} skipped — only .docx and .txt files are accepted.`
      );
    }
  }

  function removeStagedFile(index) {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function clearStagedFiles() {
    setStagedFiles([]);
    setStageError(null);
  }

  // ── Drag & drop handlers ──────────────────────────────────────────────
  function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer?.types?.includes("Files")) {
      setIsDragging(true);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    stageFiles(e.dataTransfer?.files);
  }

  // ── Submit handler — parses staged files dynamically ─────────────────────
  const handleUploadStaged = async () => {
    if (stagedFiles.length === 0) return;
    setLoading(true);
    try {
      const allExtractedItems = [];

      for (const file of stagedFiles) {
        const rawText = await parseFile(file);
        const parsedPassages = parseDocument(rawText, null, eng3);
        for (const pData of parsedPassages) {
          // Extra guard: never include an A1 that has zero valid task content
          if (pData.assessment_type === 1) {
            const t1 = (pData.task1 || "").trim();
            const t2w = (pData.task2Words || "").trim();
            const t2s = (pData.task2Sentences || "").trim();
            const rhymes = (pData.task2Rhymes || []).filter((r) => r.pair && r.pair.trim());
            if (!t1 && !t2w && !t2s && rhymes.length === 0) {
              continue;
            }
          }
          // Extra guard: never include an A2 that has zero content, title, and questions
          if (pData.assessment_type === 2) {
            const content = (pData.content || "").trim();
            const title = (pData.title || "").trim();
            const questions = (pData.questions || []).filter((q) => q.question?.trim());
            if (!content && !title && questions.length === 0) {
              continue;
            }
          }

          allExtractedItems.push({
            assessment_type: pData.assessment_type,
            parsedData: pData,
            fileName: file.name,
            file,
          });
        }
      }

      if (allExtractedItems.length === 0) {
        alert("No valid passage content was found in the uploaded file(s). Please check the template format.");
        return;
      }

      onClose();

      if (allExtractedItems.length === 1 && onUpload) {
        const item = allExtractedItems[0];
        onUpload(item.assessment_type, item.parsedData, item.fileName, item.file);
      } else if (onBulkUpload) {
        onBulkUpload(allExtractedItems);
      } else if (onUpload) {
        const item = allExtractedItems[0];
        onUpload(item.assessment_type, item.parsedData, item.fileName, item.file);
      }
    } catch (err) {
      alert("Failed to read file. Make sure it matches the required template format.");
    } finally {
      setLoading(false);
    }
  };

  // ── Template download logic ─────────────────────────────────────────────
  async function doDownloadSingle(templateId, format = selectedFormat) {
    if (templateId === "a1_g1_fil") await passagesApi.downloadA1Template("grade_1", "filipino", format);
    else if (templateId === "a1_g2_fil") await passagesApi.downloadA1Template("grade_2", "filipino", format);
    else if (templateId === "a1_g3_fil") await passagesApi.downloadA1Template("grade_3", "filipino", format);
    else if (templateId === "a1_g3_eng") await passagesApi.downloadA1Template("grade_3", "english", format);
    else if (templateId === "student_bulk") await studentsApi.downloadBulkTemplate();
  }

  function handleDownloadTemplateClick() {
    if (teacherGrade) {
      const lang = eng3 ? "english" : "filipino";
      const gradeKey = teacherGrade;
      if (gradeKey === "grade_3") {
        doDownloadSingle(lang === "english" ? "a1_g3_eng" : "a1_g3_fil", selectedFormat);
      } else if (gradeKey === "grade_2") {
        doDownloadSingle("a1_g2_fil", selectedFormat);
      } else {
        doDownloadSingle("a1_g1_fil", selectedFormat);
      }
      return;
    }

    setShowTemplateModal(true);
  }

  function toggleTemplateSelection(id) {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function handleConfirmDownloadSelected() {
    if (selectedTemplateIds.length === 0) return;
    setDownloading(true);
    try {
      for (let i = 0; i < selectedTemplateIds.length; i++) {
        const id = selectedTemplateIds[i];
        setDownloadProgress(`Downloading ${i + 1} of ${selectedTemplateIds.length}...`);
        await doDownloadSingle(id, selectedFormat);
        if (i < selectedTemplateIds.length - 1) {
          await new Promise((res) => setTimeout(res, 300));
        }
      }
      setShowTemplateModal(false);
    } catch (err) {
      alert("Failed to download template file. Please try again.");
    } finally {
      setDownloading(false);
      setDownloadProgress("");
    }
  }

  // ── Derived label for grade format guide ────────────────────────────────
  const effectiveGrade    = teacherGrade || "grade_1";
  const isEnglishGrade3   = eng3 || (effectiveGrade === "grade_3" && !teacherGrade);
  const isGrade1Filipino  = !isEnglishGrade3 && (effectiveGrade === "grade_1" || (!teacherGrade && !eng3));
  const isGrade3Filipino  = !isEnglishGrade3 && effectiveGrade === "grade_3" && !eng3;
  const isGrade2Filipino  = effectiveGrade === "grade_2";

  return (
    <div
      className="cr-modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        className="cr-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 12, width: "100%",
          maxWidth: 650, margin: isMobile ? "0 12px" : 0,
          padding: 0, overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,.15)",
          display: "flex", flexDirection: "column",
          maxHeight: isMobile ? "88vh" : "90vh",
        }}
      >

        {/* Header */}
        <div style={{ padding: isMobile ? "14px 16px" : "20px 24px", borderBottom: "1px solid #eaecf8", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8f9fd" }}>
          <h3 style={{ margin: 0, fontSize: isMobile ? 15 : 18, color: "#1a2340", display: "flex", alignItems: "center", gap: 8 }}>
            <Upload size={isMobile ? 16 : 20} color="#2c3e6b" /> Upload Passage Document
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#666" }}>
            <X size={18} />
          </button>
        </div>

        <div className="cr-modal-body" style={{ padding: isMobile ? "14px 16px" : "24px", overflowY: "auto" }}>

          {/* Drop zone — multiple files allowed */}
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${isDragging ? "#2c3e6b" : "#c8d0e4"}`,
              borderRadius: 10,
              padding: isMobile ? "16px 12px" : "30px 20px",
              textAlign: "center",
              background: isDragging ? "#eef2fb" : "#fcfdff",
              marginBottom: stagedFiles.length > 0 ? 12 : (isMobile ? 14 : 24),
              transition: "background 0.15s ease, border-color 0.15s ease",
            }}
          >
            <Upload size={isMobile ? 22 : 32} color={isDragging ? "#2c3e6b" : "#8a94b2"} style={{ marginBottom: isMobile ? 8 : 12 }} />
            <p style={{ margin: isMobile ? "0 0 4px" : "0 0 6px", fontSize: isMobile ? 12 : 14, color: "#444", fontWeight: 500 }}>
              {isDragging
                ? "Drop your files here"
                : <>Drag and drop, or select a <strong>.docx</strong> or <strong>.txt</strong> file.</>
              }
            </p>
            <p style={{ margin: isMobile ? "0 0 10px" : "0 0 14px", fontSize: isMobile ? 11 : 12, color: "#8a94b2" }}>
              You can select multiple files at once.
            </p>
            <input
              type="file"
              accept=".txt,.docx"
              multiple
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={(e) => {
                stageFiles(e.target.files);
                e.target.value = ""; // allow re-selecting the same file later
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="ap-save-btn"
              style={{ background: "#FDC210", color: "#1a2340", borderColor: "#FDC210" }}
            >
              Browse Files
            </button>
          </div>

          {/* Staging error (e.g. unsupported file type dropped) */}
          {stageError && (
            <p style={{ fontSize: isMobile ? 11 : 12, color: "#c0392b", margin: "0 0 12px" }}>
              {stageError}
            </p>
          )}

          {/* Staged file preview list — shown once files are selected/dropped */}
          {stagedFiles.length > 0 && (
            <div style={{
              border: "1px solid #dde2f0", borderRadius: 8,
              marginBottom: isMobile ? 14 : 24, overflow: "hidden",
            }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: isMobile ? "8px 12px" : "10px 16px",
                background: "#f8f9fd", borderBottom: "1px solid #eaecf8",
              }}>
                <span style={{ fontSize: isMobile ? 11 : 12, fontWeight: 700, color: "#2c3e6b" }}>
                  {stagedFiles.length} file{stagedFiles.length > 1 ? "s" : ""} ready to upload
                </span>
                <button
                  onClick={clearStagedFiles}
                  disabled={loading}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: isMobile ? 11 : 12, color: "#8a94b2", fontWeight: 600 }}
                >
                  Clear all
                </button>
              </div>

              <div style={{ maxHeight: isMobile ? 180 : 220, overflowY: "auto" }}>
                {stagedFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${file.size}-${idx}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: isMobile ? "8px 12px" : "10px 16px",
                      borderBottom: idx < stagedFiles.length - 1 ? "1px solid #f0f2f8" : "none",
                    }}
                  >
                    <FileText size={isMobile ? 14 : 16} color="#8a94b2" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: 0, fontSize: isMobile ? 12 : 13, color: "#1a2340", fontWeight: 500,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {file.name}
                      </p>
                      <p style={{ margin: 0, fontSize: isMobile ? 10 : 11, color: "#8a94b2" }}>
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeStagedFile(idx)}
                      disabled={loading}
                      aria-label={`Remove ${file.name}`}
                      title="Remove"
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "#8a94b2", padding: 4, flexShrink: 0,
                        display: "flex", alignItems: "center",
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ padding: isMobile ? "10px 12px" : "12px 16px", background: "#f8f9fd", borderTop: "1px solid #eaecf8" }}>
                <button
                  onClick={handleUploadStaged}
                  disabled={loading}
                  className="ap-save-btn"
                  style={{ width: "100%", background: "#2c3e6b", color: "#fff", borderColor: "#2c3e6b" }}
                >
                  {loading
                    ? "Reading Files…"
                    : `Upload ${stagedFiles.length} file${stagedFiles.length > 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          )}

          {/* Document Format Guide — collapsible on mobile */}
          <div style={{ background: "#f8f9fd", borderRadius: 8, border: "1px solid #eaecf8", padding: isMobile ? "12px 14px" : "16px 20px" }}>

            {/* Guide header row — title + Download Template button */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: (!isMobile || guideOpen) ? 16 : 0 }}>
              <button
                onClick={() => isMobile && setGuideOpen((o) => !o)}
                style={{ background: "none", border: "none", padding: 0, cursor: isMobile ? "pointer" : "default", textAlign: "left", flex: 1 }}
              >
                <h4 style={{ margin: isMobile ? 0 : "0 0 8px", fontSize: isMobile ? 12 : 13, fontWeight: 700, color: "#2c3e6b", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <FileText size={isMobile ? 13 : 16} /> Document Format Guide
                  </span>
                  {isMobile && (guideOpen ? <ChevronUp size={14} color="#8a94b2" /> : <ChevronDown size={14} color="#8a94b2" />)}
                </h4>
              </button>

              {/* Format Toggle & Download Template button */}
              <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 8, flexShrink: 0 }}>
                {teacherGrade && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 2,
                    background: "#fff", border: "1px solid #c8d4f5", borderRadius: 7, padding: "2px 3px",
                  }}>
                    <button
                      type="button"
                      onClick={() => setSelectedFormat("docx")}
                      disabled={downloading}
                      style={{
                        border: "none", borderRadius: 5, padding: isMobile ? "2px 6px" : "3px 8px", fontSize: 11, fontWeight: 700,
                        background: selectedFormat === "docx" ? "#2c3e6b" : "transparent",
                        color: selectedFormat === "docx" ? "#fff" : "#555",
                        cursor: "pointer", transition: "all 0.15s ease",
                      }}
                    >
                      .docx
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFormat("txt")}
                      disabled={downloading}
                      style={{
                        border: "none", borderRadius: 5, padding: isMobile ? "2px 6px" : "3px 8px", fontSize: 11, fontWeight: 700,
                        background: selectedFormat === "txt" ? "#2c3e6b" : "transparent",
                        color: selectedFormat === "txt" ? "#fff" : "#555",
                        cursor: "pointer", transition: "all 0.15s ease",
                      }}
                    >
                      .txt
                    </button>
                  </div>
                )}

                <button
                  onClick={handleDownloadTemplateClick}
                  disabled={downloading}
                  style={{
                    display: "flex", alignItems: "center", gap: isMobile ? 4 : 6,
                    background: "#f0f4ff", border: "1px solid #c8d4f5",
                    borderRadius: 7, padding: isMobile ? "5px 8px" : "6px 12px",
                    fontSize: isMobile ? 11 : 12, color: "#2c3e6b",
                    cursor: downloading ? "not-allowed" : "pointer",
                    fontWeight: 600, whiteSpace: "nowrap",
                    flexShrink: 0,
                    opacity: downloading ? 0.55 : 1,
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => { if (!downloading) e.currentTarget.style.background = "#dce8ff"; }}
                  onMouseLeave={(e) => { if (!downloading) e.currentTarget.style.background = "#f0f4ff"; }}
                  title={teacherGrade ? `Download .${selectedFormat}` : "Download Templates"}
                >
                  <Download size={13} />
                  {downloading
                    ? (downloadProgress || "Downloading…")
                    : (isMobile
                        ? (teacherGrade ? `.${selectedFormat}` : "Templates")
                        : (teacherGrade ? `Download .${selectedFormat}` : "Download Templates")
                      )
                  }
                </button>
              </div>
            </div>

            {/* Template Download Chooser & Confirmation Modal (Admin Role) */}
            {showTemplateModal && (
              <div
                className="cr-modal-overlay"
                style={{
                  position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.55)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  zIndex: 10000, padding: 16,
                }}
                onClick={() => !downloading && setShowTemplateModal(false)}
              >
                <div
                  className="cr-modal"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: "#fff", borderRadius: 12, width: "100%",
                    maxWidth: 520, overflow: "hidden",
                    boxShadow: "0 12px 36px rgba(0,0,0,0.25)",
                    display: "flex", flexDirection: "column",
                  }}
                >
                  {/* Modal Header */}
                  <div style={{
                    padding: "16px 20px", borderBottom: "1px solid #eaecf8",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: "#f8f9fd",
                  }}>
                    <h3 style={{ margin: 0, fontSize: 16, color: "#1a2340", display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                      <Download size={18} color="#2c3e6b" /> Select Templates to Download
                    </h3>
                    <button
                      onClick={() => !downloading && setShowTemplateModal(false)}
                      disabled={downloading}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#666" }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div style={{ padding: "20px", overflowY: "auto", maxHeight: "70vh" }}>
                    <p style={{ margin: "0 0 14px", fontSize: 13, color: "#555", lineHeight: 1.5 }}>
                      Select the templates you want to download and choose your preferred file format.
                    </p>

                    {/* Format Selector Row */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 16,
                      marginBottom: 14, background: "#f8f9fd", padding: "10px 14px",
                      borderRadius: 8, border: "1px solid #e2e8f0",
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2340" }}>Download Format:</span>
                      
                      {/* docx radio button */}
                      <label
                        onClick={() => !downloading && setSelectedFormat("docx")}
                        style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: selectedFormat === "docx" ? 700 : 500, color: selectedFormat === "docx" ? "#1a2340" : "#555" }}
                      >
                        <span style={{
                          width: 16, height: 16, borderRadius: "50%",
                          border: `2px solid ${selectedFormat === "docx" ? "#2c3e6b" : "#64748b"}`,
                          background: "transparent",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, transition: "all 0.15s ease",
                        }}>
                          {selectedFormat === "docx" && (
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2c3e6b" }} />
                          )}
                        </span>
                        .docx (Word)
                      </label>

                      {/* txt radio button */}
                      <label
                        onClick={() => !downloading && setSelectedFormat("txt")}
                        style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: selectedFormat === "txt" ? 700 : 500, color: selectedFormat === "txt" ? "#1a2340" : "#555" }}
                      >
                        <span style={{
                          width: 16, height: 16, borderRadius: "50%",
                          border: `2px solid ${selectedFormat === "txt" ? "#2c3e6b" : "#64748b"}`,
                          background: "transparent",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, transition: "all 0.15s ease",
                        }}>
                          {selectedFormat === "txt" && (
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2c3e6b" }} />
                          )}
                        </span>
                        .txt (Text)
                      </label>
                    </div>

                    {/* Select All Row */}
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      paddingBottom: 10, marginBottom: 12, borderBottom: "1px solid #edf0f8",
                    }}>
                      {/* Custom Select All Checkbox */}
                      <label
                        onClick={() => {
                          if (downloading) return;
                          if (selectedTemplateIds.length === ALL_TEMPLATE_OPTIONS.length) {
                            setSelectedTemplateIds([]);
                          } else {
                            setSelectedTemplateIds(ALL_TEMPLATE_OPTIONS.map((t) => t.id));
                          }
                        }}
                        style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#1a2340" }}
                      >
                        <span style={{
                          width: 16, height: 16, borderRadius: 4,
                          border: `2px solid ${selectedTemplateIds.length === ALL_TEMPLATE_OPTIONS.length ? "#2c3e6b" : "#64748b"}`,
                          background: "transparent",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, transition: "all 0.15s ease",
                        }}>
                          {selectedTemplateIds.length === ALL_TEMPLATE_OPTIONS.length && (
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#2c3e6b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </span>
                        Select All ({ALL_TEMPLATE_OPTIONS.length})
                      </label>
                      <span style={{ fontSize: 12, color: "#7783a0", fontWeight: 500 }}>
                        {selectedTemplateIds.length} of {ALL_TEMPLATE_OPTIONS.length} selected
                      </span>
                    </div>

                    {/* Checkboxes List */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {ALL_TEMPLATE_OPTIONS.map((item) => {
                        const isChecked = selectedTemplateIds.includes(item.id);
                        return (
                          <label
                            key={item.id}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              padding: "10px 14px", borderRadius: 8,
                              border: `1.5px solid ${isChecked ? "#2c3e6b" : "#e2e8f0"}`,
                              background: isChecked ? "#f0f4ff" : "#fff",
                              cursor: downloading ? "not-allowed" : "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              {/* Custom Item Checkbox */}
                              <span
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (!downloading) toggleTemplateSelection(item.id);
                                }}
                                style={{
                                  width: 16, height: 16, borderRadius: 4,
                                  border: `2px solid ${isChecked ? "#2c3e6b" : "#64748b"}`,
                                  background: "transparent",
                                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                                  flexShrink: 0, transition: "all 0.15s ease",
                                }}
                              >
                                {isChecked && (
                                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#2c3e6b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </span>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: isChecked ? 600 : 500, color: isChecked ? "#1a2340" : "#444" }}>
                                  {item.label}
                                </div>
                                <div style={{ fontSize: 11, color: "#7783a0" }}>
                                  Category: {item.type}
                                </div>
                              </div>
                            </div>
                            <span style={{
                              fontSize: 11, padding: "2px 8px", borderRadius: 4,
                              background: selectedFormat === "docx" ? "#dcfce7" : "#e0f2fe",
                              color: selectedFormat === "docx" ? "#15803d" : "#0369a1",
                              fontWeight: 600, flexShrink: 0, marginLeft: 8
                            }}>
                              .{selectedFormat}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div style={{
                    padding: "14px 20px", borderTop: "1px solid #eaecf8",
                    display: "flex", justifyContent: "flex-end", gap: 10,
                    background: "#f8f9fd",
                  }}>
                    <button
                      onClick={() => setShowTemplateModal(false)}
                      disabled={downloading}
                      style={{
                        padding: "8px 16px", borderRadius: 7, border: "1px solid #c8d0e4",
                        background: "#fff", color: "#555", cursor: "pointer", fontSize: 13, fontWeight: 500,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmDownloadSelected}
                      disabled={downloading || selectedTemplateIds.length === 0}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "8px 18px", borderRadius: 7,
                        border: "none",
                        background: selectedTemplateIds.length === 0 ? "#cbd5e1" : "#2c3e6b",
                        color: "#fff",
                        cursor: (downloading || selectedTemplateIds.length === 0) ? "not-allowed" : "pointer",
                        fontSize: 13, fontWeight: 600,
                        opacity: downloading ? 0.7 : 1,
                        boxShadow: "0 2px 6px rgba(44,62,107,0.2)",
                      }}
                    >
                      <Download size={14} />
                      {downloading
                        ? (downloadProgress || "Downloading...")
                        : `Confirm & Download (${selectedTemplateIds.length} File${selectedTemplateIds.length > 1 ? "s" : ""})`
                      }
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Format guide body */}
            {(!isMobile || guideOpen) && (
              <>
                <div style={{
                  background: "#fff", border: "1px solid #dde2f0", borderRadius: 6,
                  padding: isMobile ? "10px 14px" : "16px 24px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  fontFamily: "monospace", fontSize: isMobile ? 11 : 13,
                  color: "#333", lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre-wrap",
                }}>
                  <div style={{ color: "#9333ea", fontWeight: 700 }}>Language:</div>
                  <div>Filipino</div>
                  <div style={{ color: "#9333ea", fontWeight: 700, marginTop: 4 }}>Grade:</div>
                  <div>2</div>
                  <br />
                  <div style={{ color: "#2c5fc1", fontWeight: 700 }}>--- FILLABLE ASSESSMENT 1 (PIST) ---</div>
                  <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Task 1:</div>
                  <div>b, ng, T, e, p, s, H, G, u, L</div>
                  <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Task 2 (Grade 1 Rhyme Pairs):</div>
                  <div><span style={{ color: "#d97706", fontWeight: 600 }}>W:</span> sanay, tunay</div>
                  <div><span style={{ color: "#059669", fontWeight: 600 }}>R:</span> Oo</div>
                  <div><span style={{ color: "#d97706", fontWeight: 600 }}>W:</span> ulam, anim</div>
                  <div><span style={{ color: "#059669", fontWeight: 600 }}>R:</span> Hindi</div>
                  <div style={{ color: "#2c5fc1", fontWeight: 700, marginTop: 4 }}>Task 2 Words (Grade 2/3):</div>
                  <div>aklat, lapis, mesa, silya, kotse, puno</div>
                  <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Task 2 Sentences:</div>
                  <div>Ang bata ay pumunta sa paaralan.</div>
                  <br />
                  <div style={{ color: "#2c5fc1", fontWeight: 700 }}>--- FILLABLE ASSESSMENT 2 (STORY & QUESTIONS) ---</div>
                  <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Story Number:</div>
                  <div>1</div>
                  <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Title:</div>
                  <div>Ang Pagong at ang Matsing</div>
                  <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Content:</div>
                  <div>Isulat dito ang buong teksto ng kwento.</div>
                  <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Questions:</div>
                  <div><span style={{ color: "#d97706", fontWeight: 600 }}>Q:</span> Sino ang pangunahing tauhan?</div>
                  <div><span style={{ color: "#059669", fontWeight: 600 }}>A:</span> Ang Pagong at ang Matsing</div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
import { useRef, useState } from "react";
import {
  X, Upload, FileSpreadsheet, CheckCircle,
  AlertCircle, AlertTriangle, Download,
} from "lucide-react";
import { studentsApi } from "../services/api";
import "./ImportRecordsModal.css"; // reuses the same CSS — no new styles needed

export default function BulkUploadStudentsModal({ isOpen, onClose, onSuccess }) {
  const fileInputRef = useRef(null);

  const [file, setFile]         = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState(null);

  if (!isOpen) return null;

  function handleFile(f) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".xlsx") && !f.name.toLowerCase().endsWith(".xls")) {
      setError("Only .xlsx files are supported.");
      return;
    }
    setError(null);
    setResult(null);
    setFile(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  function handleClose() {
    setFile(null);
    setResult(null);
    setError(null);
    setLoading(false);
    onClose();
  }

  async function handleDownloadTemplate() {
    setDownloading(true);
    try {
      await studentsApi.downloadBulkTemplate();
    } catch {
      setError("Failed to download template. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleUpload() {
    if (!file) { setError("Please select an Excel file."); return; }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await studentsApi.bulkUploadStudents(fd);
      setResult(data);
      if (onSuccess) onSuccess();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === "string" ? detail
        : Array.isArray(detail)   ? detail.map((d) => d.msg).join(", ")
        : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="im-overlay" onClick={handleClose} role="dialog" aria-modal="true">
      <div className="im-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="im-header">
          <h2 className="im-title">Upload Student List</h2>
          <button className="im-close" onClick={handleClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="im-body">

          {/* Context note */}
          <p className="im-note">
            Add multiple students to your roster at once using the HearMeRead Excel template.
            This does <strong>not</strong> import assessment scores — use <em>Import Records</em> for that.
          </p>

          {/* Template download */}
          <button
            className="im-btn im-btn--template"
            onClick={handleDownloadTemplate}
            disabled={downloading}
          >
            <Download size={14} />
            {downloading ? "Downloading…" : "Download Template (.xlsx)"}
          </button>

          {/* Drop zone */}
          <div
            className={`im-dropzone${dragging ? " im-dropzone--over" : ""}${file ? " im-dropzone--has-file" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && !file && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="im-file-input"
              onChange={(e) => handleFile(e.target.files[0])}
            />

            {file ? (
              <div className="im-file-info">
                <FileSpreadsheet size={28} className="im-file-icon" />
                <span className="im-file-name">{file.name}</span>
                <button
                  className="im-file-remove"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); setError(null); }}
                  aria-label="Remove file"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="im-dropzone-prompt">
                <Upload size={28} className="im-upload-icon" />
                <p className="im-dropzone-text">
                  Drag &amp; drop your filled template here,<br />
                  or <span className="im-dropzone-link">click to browse</span>
                </p>
                <p className="im-dropzone-hint">.xlsx files only</p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="im-error">
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          {/* Result summary */}
          {result && (
            <div className="im-result">
              <div className="im-result__header">
                <CheckCircle size={16} className="im-result__icon" />
                Upload complete
              </div>
              <ul className="im-result__list">
                <li><strong>{result.students_created}</strong> new students added</li>
                {result.students_skipped > 0 && (
                  <li><strong>{result.students_skipped}</strong> skipped (LRN already in roster)</li>
                )}
                {result.students_invalid > 0 && (
                  <li className="im-result__list-item--warn">
                    <AlertTriangle size={13} className="im-result__warn-icon" />
                    <strong>{result.students_invalid}</strong> rows skipped — missing required name fields
                  </li>
                )}
              </ul>
              {result.errors?.length > 0 && (
                <div className="im-result__errors">
                  <p className="im-result__errors-title">Warnings ({result.errors.length}):</p>
                  <ul>
                    {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="im-footer">
          <button className="im-btn im-btn--ghost" onClick={handleClose} disabled={loading}>
            {result ? "Close" : "Cancel"}
          </button>
          {!result && (
            <button
              className="im-btn im-btn--primary"
              onClick={handleUpload}
              disabled={loading || !file}
            >
              {loading ? "Uploading…" : "Upload Students"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

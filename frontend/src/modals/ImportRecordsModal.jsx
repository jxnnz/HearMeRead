import { useRef, useState, useEffect } from "react";
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, AlertTriangle } from "lucide-react";
import { studentsApi } from "../services/api";
import "./ImportRecordsModal.css";

const PERIOD_OPTIONS = [
  { value: "beginning", label: "Beginning" },
  { value: "middle",    label: "Middle"    },
  { value: "end",       label: "End"       },
];



export default function ImportRecordsModal({ isOpen, onClose, onSuccess }) {
  const fileInputRef = useRef(null);

  const [file, setFile]               = useState(null);
  const [schoolYear, setSchoolYear]   = useState("");
  const [schoolYears, setSchoolYears] = useState([]);
  const [period, setPeriod]           = useState("beginning");
  const [dragging, setDragging]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    studentsApi.getCurrentSchoolYear()
      .then((data) => {
        setSchoolYear(data.school_year);
        setSchoolYears([data.school_year]);
      })
      .catch(() => {});
  }, [isOpen]);

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

  async function handleImport() {
    if (!file)       { setError("Please select an Excel file."); return; }
    if (!schoolYear) { setError("School year is required.");     return; }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("school_year", schoolYear);
      fd.append("period", period);

      const data = await studentsApi.importExcel(fd);
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
          <h2 className="im-title">Import Records from Excel</h2>
          <button className="im-close" onClick={handleClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="im-body">

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
                  Drag &amp; drop your CRLA Excel file here,<br />
                  or <span className="im-dropzone-link">click to browse</span>
                </p>
                <p className="im-dropzone-hint">.xlsx files only</p>
              </div>
            )}
          </div>

          {/* Form fields */}
          <div className="im-fields">
            <div className="im-field">
              <label htmlFor="im-year">School Year</label>
              <select
                id="im-year"
                className="im-input"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
              >
                {schoolYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="im-field">
              <label htmlFor="im-period">Assessment Period</label>
              <select
                id="im-period"
                className="im-input"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                {PERIOD_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
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
                Import complete
              </div>
              <ul className="im-result__list">
                <li><strong>{result.students_created}</strong> new students added</li>
                <li><strong>{result.students_found}</strong> existing students matched</li>
                <li><strong>{result.sessions_created}</strong> sessions imported</li>
                {result.sessions_skipped > 0 && (
                  <li><strong>{result.sessions_skipped}</strong> sessions skipped (already exist)</li>
                )}
                {/* NEW — empty assessment warning */}
                {result.sessions_empty_assessment > 0 && (
                  <li className="im-result__list-item--warn">
                    <AlertTriangle size={13} className="im-result__warn-icon" />
                    <strong>{result.sessions_empty_assessment}</strong> student{result.sessions_empty_assessment !== 1 ? "s" : ""} imported with no assessment data — run an assessment in HearMeRead to fill these in.
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
              onClick={handleImport}
              disabled={loading || !file}
            >
              {loading ? "Importing…" : "Import Records"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

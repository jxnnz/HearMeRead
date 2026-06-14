import { useState, useRef } from "react";
import { Upload, FileText, X, ChevronDown, ChevronUp, Download } from "lucide-react";
import { parseFile, parseDocument } from "../utils/fileParser";
import { useWindowWidth } from "../hooks/useWindowWidth";
import { passagesApi } from "../services/api";

export default function UploadModal({
  onClose,
  onUpload,
  defaultType  = 2,
  eng3         = false,
  teacherGrade = null,   // NEW — pass teacher's grade_level from authApi.me()
}) {
  const fileInputRef  = useRef(null);
  const [loading, setLoading]           = useState(false);
  const [selectedType, setSelectedType] = useState(defaultType);
  const [guideOpen, setGuideOpen]       = useState(false);

  // Template download state
  const [downloading, setDownloading]         = useState(false);
  // Admin picker: shown when admin clicks Download Template on A1
  const [showA1Picker, setShowA1Picker]       = useState(false);
  const [pickerGrade, setPickerGrade]         = useState("grade_1");
  const [pickerLanguage, setPickerLanguage]   = useState("filipino");

  const isMobile = useWindowWidth() <= 768;

  // ── File handler — now supports multiple files ──────────────────────────
  const handleFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setLoading(true);
    try {
      // Process each file sequentially; call onUpload per file
      for (const file of Array.from(fileList)) {
        const rawText    = await parseFile(file);
        const parsedData = parseDocument(rawText, selectedType, eng3);
        onUpload(selectedType, parsedData, file.name);
      }
      onClose();
    } catch (err) {
      alert("Failed to read file. Make sure it matches the format shown below.");
    } finally {
      setLoading(false);
    }
  };

  // ── Template download logic ─────────────────────────────────────────────
  async function doDownloadA1(grade, language) {
    setDownloading(true);
    try {
      await passagesApi.downloadA1Template(grade, language);
    } catch {
      alert("Failed to download template. Please try again.");
    } finally {
      setDownloading(false);
      setShowA1Picker(false);
    }
  }

  async function handleDownloadTemplate() {
    if (selectedType === 2) {
      // A2: single template, no picker needed
      setDownloading(true);
      try {
        await passagesApi.downloadA2Template();
      } catch {
        alert("Failed to download template. Please try again.");
      } finally {
        setDownloading(false);
      }
      return;
    }

    // A1 — teacher side: use their grade automatically
    if (teacherGrade) {
      // Derive language: grade_3 can be english or filipino;
      // all others are always filipino
      const language = eng3 ? "english" : "filipino";
      await doDownloadA1(teacherGrade, language);
      return;
    }

    // A1 — admin side: show picker
    setShowA1Picker(true);
  }

  // ── Derived label for grade format guide ────────────────────────────────
  // Determine which guide to show based on selectedType + eng3 + teacherGrade
  const effectiveGrade    = teacherGrade || "grade_1";
  const isEnglishGrade3   = eng3 || (effectiveGrade === "grade_3" && !teacherGrade);
  const isGrade1Filipino  = !isEnglishGrade3 && (effectiveGrade === "grade_1" || (!teacherGrade && !eng3));
  const isGrade3Filipino  = !isEnglishGrade3 && effectiveGrade === "grade_3" && !eng3;
  const isGrade2Filipino  = effectiveGrade === "grade_2";

  // ── A1 grade picker options ─────────────────────────────────────────────
  const A1_PICKER_OPTIONS = [
    { grade: "grade_1", language: "filipino", label: "Grade 1 — Filipino" },
    { grade: "grade_2", language: "filipino", label: "Grade 2 — Filipino" },
    { grade: "grade_3", language: "filipino", label: "Grade 3 — Filipino" },
    { grade: "grade_3", language: "english",  label: "Grade 3 — English"  },
  ];

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
            <Upload size={isMobile ? 16 : 20} color="#2c3e6b" /> Upload Document
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#666" }}>
            <X size={18} />
          </button>
        </div>

        <div className="cr-modal-body" style={{ padding: isMobile ? "14px 16px" : "24px", overflowY: "auto" }}>

          {/* Assessment type selector */}
          <div style={{ display: "flex", gap: isMobile ? 10 : 16, marginBottom: isMobile ? 14 : 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: isMobile ? 12 : 14, fontWeight: selectedType === 1 ? 700 : 500, color: selectedType === 1 ? "#2c3e6b" : "#666" }}>
              <input type="radio" className="custom-radio" name="uploadType" checked={selectedType === 1} onChange={() => setSelectedType(1)} />
              Assessment 1 Format
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: isMobile ? 12 : 14, fontWeight: selectedType === 2 ? 700 : 500, color: selectedType === 2 ? "#2c3e6b" : "#666" }}>
              <input type="radio" className="custom-radio" name="uploadType" checked={selectedType === 2} onChange={() => setSelectedType(2)} />
              Assessment 2 Format
            </label>
          </div>

          {/* Drop zone — multiple files allowed */}
          <div style={{ border: "2px dashed #c8d0e4", borderRadius: 10, padding: isMobile ? "16px 12px" : "30px 20px", textAlign: "center", background: "#fcfdff", marginBottom: isMobile ? 14 : 24 }}>
            <Upload size={isMobile ? 22 : 32} color="#8a94b2" style={{ marginBottom: isMobile ? 8 : 12 }} />
            <p style={{ margin: isMobile ? "0 0 4px" : "0 0 6px", fontSize: isMobile ? 12 : 14, color: "#444", fontWeight: 500 }}>
              Select a <strong>.docx</strong> or <strong>.txt</strong> file to extract text.
            </p>
            {/* NEW — multi-file hint */}
            <p style={{ margin: isMobile ? "0 0 10px" : "0 0 14px", fontSize: isMobile ? 11 : 12, color: "#8a94b2" }}>
              You can select multiple files at once.
            </p>
            <input
              type="file"
              accept=".txt,.docx"
              multiple              // NEW — enables multi-select
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="ap-save-btn"
              style={{ background: "#2c3e6b", color: "#fff", borderColor: "#2c3e6b" }}
            >
              {loading ? "Reading File…" : "Browse Files"}
            </button>
          </div>

          {/* Document Format Guide — collapsible on mobile */}
          <div style={{ background: "#f8f9fd", borderRadius: 8, border: "1px solid #eaecf8", padding: isMobile ? "12px 14px" : "16px 20px" }}>

            {/* Guide header row — title + Download Template button */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: (!isMobile || guideOpen) ? 0 : 0 }}>
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

              {/* NEW — Download Template button */}
              <button
                onClick={handleDownloadTemplate}
                disabled={downloading}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "none", border: "1px solid #c8d0e4",
                  borderRadius: 6, padding: "5px 10px",
                  fontSize: isMobile ? 11 : 12, color: "#2c3e6b",
                  cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
                  flexShrink: 0, marginLeft: 8,
                  opacity: downloading ? 0.55 : 1,
                }}
              >
                <Download size={12} />
                {downloading ? "Downloading…" : "Download Template"}
              </button>
            </div>

            {/* NEW — A1 grade picker (admin side only, shown after clicking Download Template) */}
            {showA1Picker && (
              <div style={{
                marginTop: 10, background: "#fff", border: "1px solid #c8d0e4",
                borderRadius: 8, padding: "14px 16px",
              }}>
                <p style={{ margin: "0 0 10px", fontSize: 13, color: "#444", fontWeight: 600 }}>
                  Select which template to download:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  {A1_PICKER_OPTIONS.map(({ grade, language, label }) => (
                    <label
                      key={`${grade}-${language}`}
                      style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", color: pickerGrade === grade && pickerLanguage === language ? "#2c3e6b" : "#555", fontWeight: pickerGrade === grade && pickerLanguage === language ? 600 : 400 }}
                    >
                      <input
                        type="radio"
                        name="a1picker"
                        checked={pickerGrade === grade && pickerLanguage === language}
                        onChange={() => { setPickerGrade(grade); setPickerLanguage(language); }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setShowA1Picker(false)}
                    style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #c8d0e4", background: "#fff", color: "#555", cursor: "pointer", fontSize: 12 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => doDownloadA1(pickerGrade, pickerLanguage)}
                    disabled={downloading}
                    style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "#2c3e6b", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                  >
                    {downloading ? "Downloading…" : "Download"}
                  </button>
                </div>
              </div>
            )}

            {/* Format guide body */}
            {(!isMobile || guideOpen) && (
              <>
                <p style={{ fontSize: isMobile ? 11 : 12, color: "#666", margin: isMobile ? "8px 0 10px" : "8px 0 16px" }}>
                  Format your document exactly like the preview below for auto-filling to work.
                </p>

                <div style={{
                  background: "#fff", border: "1px solid #dde2f0", borderRadius: 6,
                  padding: isMobile ? "10px 14px" : "16px 24px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  fontFamily: "monospace", fontSize: isMobile ? 11 : 13,
                  color: "#333", lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre-wrap",
                }}>
                  {selectedType === 1 ? (

                    // ── A1 Grade 3 English ──────────────────────────────
                    eng3 ? (
                      <>
                        <div style={{ color: "#9333ea", fontWeight: 700 }}>Language:</div>
                        <div>English</div>
                        <div style={{ color: "#9333ea", fontWeight: 700, marginTop: 4 }}>Grade:</div>
                        <div>3</div>
                        <br />
                        <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Task 1:</div>
                        <div>beautiful, environment, community, responsibility, friendship,</div>
                        <div>knowledge, adventure, imagination, celebration, determination</div>
                        <br />
                        <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Task 2 Words:</div>
                        <div>running, jumping, playing, reading, writing,</div>
                        <div>eating, sleeping, helping, listening, learning</div>
                      </>

                    // ── A1 Grade 1 Filipino (default / no teacherGrade) ─
                    ) : isGrade2Filipino ? (
                      <>
                        <div style={{ color: "#9333ea", fontWeight: 700 }}>Language:</div>
                        <div>Filipino</div>
                        <div style={{ color: "#9333ea", fontWeight: 700, marginTop: 4 }}>Grade:</div>
                        <div>2</div>
                        <br />
                        <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Task 1:</div>
                        <div>aso, bata, kuya, isda, damit, bahay, paaralan, mahal, tahimik, maganda</div>
                        <br />
                        <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Task 2 Words:</div>
                        <div>aklat, lapis, mesa, silya, kotse, puno, bundok, ilog, dagat, langit</div>
                        <br />
                        <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Task 2 Sentences:</div>
                        <div>Ang bata ay pumunta sa paaralan. Siya ay nagdala ng kanyang bag.</div>
                      </>

                    ) : isGrade3Filipino ? (
                      <>
                        <div style={{ color: "#9333ea", fontWeight: 700 }}>Language:</div>
                        <div>Filipino</div>
                        <div style={{ color: "#9333ea", fontWeight: 700, marginTop: 4 }}>Grade:</div>
                        <div>3</div>
                        <br />
                        <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Task 1:</div>
                        <div>magulang, kaibigan, kalikasan, pamayanan, kasipagan,</div>
                        <div>katapatan, pagmamahal, pagiging, katahimikan, responsibilidad</div>
                        <br />
                        <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Task 2 Words:</div>
                        <div>naglalaro, kumakain, nagaaral, tumatakbo, nagtatrabaho,</div>
                        <div>natutulog, nagbabasa, sumusulat, naglalakad, nagtatanong</div>
                        <br />
                        <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Task 2 Sentences:</div>
                        <div>Ang mga bata ay masayang naglalaro sa parke tuwing hapon.</div>
                        <div>Tinutulungan nila ang isa't isa sa oras ng pangangailangan.</div>
                      </>

                    ) : (
                      // Grade 1 Filipino (default)
                      <>
                        <div style={{ color: "#9333ea", fontWeight: 700 }}>Language:</div>
                        <div>Filipino</div>
                        <div style={{ color: "#9333ea", fontWeight: 700, marginTop: 4 }}>Grade:</div>
                        <div>1</div>
                        <br />
                        <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Task 1:</div>
                        <div>b, ng, T, e, p, s, H, G, u, L</div>
                        <br />
                        <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Task 2:</div>
                        <br />
                        <div><span style={{ color: "#d97706", fontWeight: 600 }}>W:</span> sanay, tunay</div>
                        <div><span style={{ color: "#059669", fontWeight: 600 }}>R:</span> Oo</div>
                        <div><span style={{ color: "#d97706", fontWeight: 600 }}>W:</span> ulam, anim</div>
                        <div><span style={{ color: "#059669", fontWeight: 600 }}>R:</span> Hindi</div>
                        <div><span style={{ color: "#d97706", fontWeight: 600 }}>W:</span> hinog, lamig</div>
                        <div><span style={{ color: "#059669", fontWeight: 600 }}>R:</span> Hindi</div>
                        <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>… (10 pairs total)</div>
                        <br />
                        <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Task 2 Sentences:</div>
                        <div>Ang bata ay masaya. Siya ay mabait. Mahal niya ang kanyang pamilya.</div>
                      </>
                    )

                  ) : (

                    // ── A2 ──────────────────────────────────────────────
                    <>
                      <div style={{ color: "#9333ea", fontWeight: 700 }}>Language:</div>
                      <div>Filipino</div>
                      <div style={{ color: "#9333ea", fontWeight: 700, marginTop: 4 }}>Grade Level:</div>
                      <div>2</div>
                      <br />
                      <div style={{ color: "#2c5fc1", fontWeight: 700 }}>[PASSAGE]</div>
                      <div>Si Juan ay isang mabuting bata.</div>
                      <div>Minamahal niya ang kanyang pamilya.</div>
                      <br />
                      <div style={{ color: "#2c5fc1", fontWeight: 700 }}>[QUESTIONS]</div>
                      <div><span style={{ color: "#d97706", fontWeight: 600 }}>Q:</span> Sino ang mabuting bata?</div>
                      <div><span style={{ color: "#059669", fontWeight: 600 }}>A:</span> Si Juan</div>
                      <br />
                      <div><span style={{ color: "#d97706", fontWeight: 600 }}>Q:</span> Ano ang ginagawa niya?</div>
                      <div><span style={{ color: "#059669", fontWeight: 600 }}>A:</span> Minamahal ang pamilya</div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

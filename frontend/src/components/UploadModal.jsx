import { useState, useRef } from "react";
import { Upload, FileText, X } from "lucide-react";
import { parseFile, parseDocument } from "../utils/fileParser";

export default function UploadModal({ onClose, onUpload, defaultType = 2, eng3 = false }) {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState(defaultType);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const rawText = await parseFile(file);
      const parsedData = parseDocument(rawText, selectedType, eng3);
      onUpload(selectedType, parsedData);
      onClose();
    } catch (err) {
      alert("Failed to read file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="cr-modal-overlay" 
      onClick={onClose} 
      style={{ 
        position: "fixed", 
        top: 0, left: 0, right: 0, bottom: 0, 
        backgroundColor: "rgba(0,0,0,0.45)", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        zIndex: 9999 
      }}
    >
      <div 
        className="cr-modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          background: "#fff",
          borderRadius: 12,
          width: "100%",
          maxWidth: 650, 
          padding: 0, 
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,.15)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh"
        }}
      >
        
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #eaecf8", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8f9fd" }}>
          <h3 style={{ margin: 0, fontSize: 18, color: "#1a2340", display: "flex", alignItems: "center", gap: 8 }}>
            <Upload size={20} color="#2c3e6b" /> Upload Document
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#666" }}><X size={20} /></button>
        </div>

        <div className="cr-modal-body" style={{ padding: "24px", overflowY: "auto" }}>
          
          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, fontWeight: selectedType === 1 ? 700 : 500, color: selectedType === 1 ? "#2c3e6b" : "#666" }}>
              <input type="radio" className="custom-radio" name="uploadType" checked={selectedType === 1} onChange={() => setSelectedType(1)} />
              Assessment 1 Format
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, fontWeight: selectedType === 2 ? 700 : 500, color: selectedType === 2 ? "#2c3e6b" : "#666" }}>
              <input type="radio" className="custom-radio" name="uploadType" checked={selectedType === 2} onChange={() => setSelectedType(2)} />
              Assessment 2 Format
            </label>
          </div>

          <div style={{ border: "2px dashed #c8d0e4", borderRadius: 12, padding: "30px 20px", textAlign: "center", background: "#fcfdff", marginBottom: 24 }}>
            <Upload size={32} color="#8a94b2" style={{ marginBottom: 12 }} />
            <p style={{ margin: "0 0 12px", fontSize: 14, color: "#444", fontWeight: 500 }}>Select a <strong>.docx</strong> or <strong>.txt</strong> file to extract text.</p>
            <input type="file" accept=".txt,.docx" ref={fileInputRef} style={{ display: "none" }} onChange={handleFile} />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="ap-save-btn" style={{ background: "#2c3e6b", color: "#fff", borderColor: "#2c3e6b" }}>
              {loading ? "Reading File..." : "Browse Files"}
            </button>
          </div>

          {/* Document Preview Guide */}
          <div style={{ background: "#f8f9fd", borderRadius: 8, border: "1px solid #eaecf8", padding: "16px 20px" }}>
            <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#2c3e6b", display: "flex", alignItems: "center", gap: 6 }}>
              <FileText size={16} /> Document Format Guide
            </h4>
            <p style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>
              For auto-filling to work, please format your document exactly like the preview below.
            </p>
            
            <div style={{
              background: "#fff",
              border: "1px solid #dde2f0",
              borderRadius: 6,
              padding: "16px 24px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              fontFamily: "monospace",
              fontSize: 13,
              color: "#333",
              lineHeight: 1.6,
              overflowX: "auto",
              whiteSpace: "pre-wrap"
            }}>
              {selectedType === 1 ? (
                <>
                  <div style={{ color: "#9333ea", fontWeight: 700 }}>Language:</div>
                  <div>{eng3 ? "English" : "Filipino"}</div>
                  <div style={{ color: "#9333ea", fontWeight: 700, marginTop: 4 }}>Grade Level:</div>
                  <div>{eng3 ? "3" : "1"}</div>
                  <br/>
                  <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Task 1:</div>
                  <div>{eng3 ? "cat, dog, bird, fish" : "Isang araw, si Maria ay naglalakad sa bukid."}</div>
                  <br/>
                  <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Task 2 Words:</div>
                  <div>{eng3 ? "sun, moon, star" : "aso, bata, pusa"}</div>
                  {!eng3 && (
                    <>
                      <br/>
                      <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Task 2 Sentences:</div>
                      <div>Ang bata ay masaya. Siya ay mabait.</div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div style={{ color: "#9333ea", fontWeight: 700 }}>Language:</div>
                  <div>Filipino</div>
                  <div style={{ color: "#9333ea", fontWeight: 700, marginTop: 4 }}>Grade Level:</div>
                  <div>2</div>
                  <br/>
                  <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Title:</div>
                  <div>Ang Pagong at Matsing</div>
                  <br/>
                  <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Content:</div>
                  <div>Si Juan ay isang mabuting bata.</div>
                  <div>Minamahal niya ang kanyang pamilya.</div>
                  <br/>
                  <div style={{ color: "#2c5fc1", fontWeight: 700 }}>Questions:</div>
                  <div><span style={{ color: "#d97706", fontWeight: 600 }}>Q:</span> Sino ang mabuting bata?</div>
                  <div><span style={{ color: "#059669", fontWeight: 600 }}>A:</span> Si Juan</div>
                  <br/>
                  <div><span style={{ color: "#d97706", fontWeight: 600 }}>Q:</span> Ano ang ginagawa niya?</div>
                  <div><span style={{ color: "#059669", fontWeight: 600 }}>A:</span> Minamahal ang pamilya</div>
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

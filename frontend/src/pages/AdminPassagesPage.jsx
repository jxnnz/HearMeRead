import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Search, BookOpen, Pencil, Trash2, X, ChevronLeft, ChevronRight, Eye, Upload, FileText, Info } from "lucide-react";
import Layout from "../components/Layout";
import ConfirmModal from "../modals/ConfirmModal";
import UploadModal from "../components/UploadModal";
import { adminApi, questionsApi } from "../services/api";
import "./pages css/AddPassagePage.css";

const GRADES = [
  { value: "", label: "All Grades" },
  { value: "grade_1", label: "Grade 1" },
  { value: "grade_2", label: "Grade 2" },
  { value: "grade_3", label: "Grade 3" },
];
const LANGS = [{ value: "", label: "All Languages" }, { value: "filipino", label: "Filipino" }, { value: "english", label: "English" }];
const TYPES = [{ value: "", label: "All Types" }, { value: "1", label: "Assessment 1" }, { value: "2", label: "Assessment 2" }];

function fmtGrade(g) { return !g ? "—" : g === "kindergarten" ? "K" : `G${g.replace("grade_", "")}`; }
function isEng3(form) { return form.language === "english" && form.grade_level === "grade_3"; }



/* ═══════════════════ Assessment 1 Form ═══════════════════ */
function A1Form({ form, update, eng3 }) {
  return (
    <>
      <div className="ap-card">
        <div className="ap-card__header-row">
          <h2 className="ap-card__title">{eng3 ? "Task 1 — Words" : "Task 1"}</h2>
        </div>
        {eng3 && <p className="ap-card__subtitle">Separate each word with a comma (e.g. cat, dog, bird).</p>}
        <div className="ap-field">
          <label className="ap-label">{eng3 ? "Words:" : "Content:"}</label>
          <textarea className="ap-textarea" value={form.task1_content} onChange={(e) => update("task1_content", e.target.value)}
            placeholder={eng3 ? "e.g. cat, dog, bird, fish" : "Type or paste the reading passage…"} rows={eng3 ? 4 : 6} />
        </div>
      </div>
      <div className="ap-card">
        <div className="ap-card__header-row">
          <h2 className="ap-card__title">Task 2 — Words</h2>
        </div>
        <p className="ap-card__subtitle">Separate each word with a comma.</p>
        <div className="ap-field">
          <textarea className="ap-textarea" value={form.task2_words} onChange={(e) => update("task2_words", e.target.value)}
            placeholder={eng3 ? "e.g. sun, moon, star" : "e.g. aso, bata, pusa"} rows={4} />
        </div>
      </div>
      {!eng3 && (
        <div className="ap-card">
          <div className="ap-card__header-row">
            <h2 className="ap-card__title">Task 2 — Sentences</h2>
          </div>
          <p className="ap-card__subtitle">Separate each sentence with a period.</p>
          <div className="ap-field">
            <textarea className="ap-textarea" value={form.task2_sentences} onChange={(e) => update("task2_sentences", e.target.value)}
              placeholder="e.g. Ang bata ay masaya. Mahal ko ang aking pamilya." rows={4} />
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════ Assessment 2 Form ═══════════════════ */
function A2Form({ form, update, questions, setQuestions }) {
  const wc = form.content?.trim().split(/\s+/).filter(Boolean).length || 0;
  function addQ() { setQuestions((p) => [...p, { id: crypto.randomUUID(), question: "", answer: "" }]); }
  function rmQ(i) { setQuestions((p) => p.filter((_, j) => j !== i)); }
  function upQ(i, f, v) { setQuestions((p) => p.map((q, j) => j === i ? { ...q, [f]: v } : q)); }

  return (
    <>
      <div className="ap-card">
        <div className="ap-card__header-row">
          <h2 className="ap-card__title">Passage Content</h2>
        </div>
        <div className="ap-field">
          <label className="ap-label">Title: *</label>
          <input className="ap-input" value={form.title} onChange={(e) => update("title", e.target.value)}
            placeholder="e.g. Ang Pagong at ang Matsing" />
        </div>
        <div className="ap-field">
          <label className="ap-label">Content: <span className="ap-word-count">{wc} words</span></label>
          <textarea className="ap-textarea" value={form.content} onChange={(e) => update("content", e.target.value)}
            placeholder="Type or paste the reading passage here…" rows={8} />
        </div>
      </div>
      <div className="ap-card">
        <h2 className="ap-card__title">Comprehension Questions</h2>
        <p className="ap-card__subtitle">Add questions students will answer after reading.</p>
        {questions.map((q, i) => (
          <div key={q.id} className="pq-block">
            <div className="pq-block__header">
              <span className="pq-block__num">Question {i + 1}</span>
              {questions.length > 1 && (
                <button type="button" className="pq-block__remove" onClick={() => rmQ(i)}><X size={14} /></button>
              )}
            </div>
            <div className="ap-field">
              <input className="ap-input" value={q.question} onChange={(e) => upQ(i, "question", e.target.value)}
                placeholder="e.g. Sino ang pangunahing tauhan sa kwento?" />
            </div>
            <div className="ap-field">
              <label className="ap-label" style={{ fontSize: 11 }}>Answer (optional):</label>
              <textarea className="ap-textarea ap-textarea--sm" value={q.answer} onChange={(e) => upQ(i, "answer", e.target.value)}
                placeholder="Enter the correct answer…" rows={2} />
            </div>
          </div>
        ))}
        <button type="button" className="pq-add-question" onClick={addQ}><Plus size={15} /> Add Question</button>
      </div>
    </>
  );
}

/* ═══════════════════ Main Page ═══════════════════ */
export default function AdminPassagesPage() {
  const [passages, setPassages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gradeF, setGradeF] = useState("");
  const [langF, setLangF] = useState("");
  const [typeF, setTypeF] = useState("");
  const [page, setPage] = useState(1);
  const PER = 10;

  // Editor state
  const [view, setView] = useState("list"); // list | add | edit
  const [assType, setAssType] = useState(null); // 1 or 2
  const [form, setForm] = useState({});
  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [previewTarget, setPreviewTarget] = useState(null);
  const [editId, setEditId] = useState(null);

  // Archive modal state
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);

  // Upload modal state
  const [uploadTargetField, setUploadTargetField] = useState(null);
  const [globalUploadOpen, setGlobalUploadOpen] = useState(false);

  const eng3 = isEng3(form);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = {}; if (langF) p.language = langF; if (gradeF) p.grade_level = gradeF; if (typeF) p.assessment_type = Number(typeF);
      setPassages(await adminApi.listPassages(p));
    } catch { setPassages([]); }
    finally { setLoading(false); }
  }, [langF, gradeF, typeF]);

  useEffect(() => { load(); }, [load]);

  const filtered = passages.filter((p) => {
    if (!search) return true;
    const t = search.toLowerCase();
    return (p.title || "").toLowerCase().includes(t) || (p.content || "").toLowerCase().includes(t) || (p.task1_content || "").toLowerCase().includes(t);
  });
  const totalPages = Math.ceil(filtered.length / PER);
  const paginated = filtered.slice((page - 1) * PER, page * PER);

  function update(field, val) { setForm((prev) => ({ ...prev, [field]: val })); }

  function startAdd(type, parsedData = null) {
    setAssType(type);
    setEditId(null);
    
    let initForm = type === 1
      ? { language: "filipino", grade_level: "grade_1", task1_content: "", task2_words: "", task2_sentences: "" }
      : { title: "", language: "filipino", grade_level: "grade_2", content: "" };
      
    if (parsedData) {
      if (parsedData.language) initForm.language = parsedData.language;
      if (parsedData.grade_level) initForm.grade_level = parsedData.grade_level;
      if (type === 1) {
        initForm.task1_content = parsedData.task1 || "";
        initForm.task2_words = parsedData.task2Words || "";
        initForm.task2_sentences = parsedData.task2Sentences || "";
      } else {
        initForm.title = parsedData.title || "";
        initForm.content = parsedData.content || "";
      }
    }
    
    setForm(initForm);
    
    if (parsedData && parsedData.questions && parsedData.questions.length > 0) {
      setQuestions(parsedData.questions);
    } else {
      setQuestions(type === 2 ? [{ id: crypto.randomUUID(), question: "", answer: "" }] : []);
    }
    
    setError(null);
    setView("add");
  }

  async function startEdit(p) {
    setAssType(p.assessment_type);
    setEditId(p.id);
    setForm(p.assessment_type === 1
      ? { language: p.language, grade_level: p.grade_level, task1_content: p.task1_content || "", task2_words: p.task2_words || "", task2_sentences: p.task2_sentences || "" }
      : { title: p.title || "", language: p.language, grade_level: p.grade_level, content: p.content || "" });
    
    if (p.assessment_type === 2) {
      try {
        const qRes = await questionsApi.list(p.id);
        const fetchedQs = qRes.questions || qRes || [];
        const mappedQs = fetchedQs.map(q => ({
          id: q.id,
          question: q.text,
          answer: q.answer_key || ""
        }));
        setQuestions(mappedQs.length > 0 ? mappedQs : [{ id: crypto.randomUUID(), question: "", answer: "" }]);
      } catch (e) {
        setQuestions([{ id: crypto.randomUUID(), question: "", answer: "" }]);
      }
    } else {
      setQuestions([]);
    }
    
    setError(null);
    setView("edit");
  }

  async function handleSave() {
    setError(null);
    if (assType === 1) {
      if (eng3) {
        if (!form.task1_content?.trim()) { setError("Task 1 Words is required."); return; }
        if (!form.task2_words?.trim()) { setError("Task 2 Words is required."); return; }
      } else {
        if (!form.task1_content?.trim()) { setError("Task 1 content is required."); return; }
        if (!form.task2_words?.trim()) { setError("Task 2 Words is required."); return; }
        if (!form.task2_sentences?.trim()) { setError("Task 2 Sentences is required."); return; }
      }
    } else {
      if (!form.title?.trim()) { setError("Title is required."); return; }
      if (!form.content?.trim()) { setError("Passage content is required."); return; }
    }

    setSaving(true);
    try {
      const payload = { ...form, assessment_type: assType };
      if (assType === 1 && eng3) payload.task2_sentences = "";
      
      let passageId = editId;
      if (editId) {
        await adminApi.updatePassage(editId, payload);
      } else {
        const created = await adminApi.createPassage(payload);
        passageId = created.id;
      }
      
      // Handle questions for Assessment 2
      if (assType === 2) {
        let existingQs = [];
        if (editId) {
          try {
            const qRes = await questionsApi.list(editId);
            existingQs = qRes.questions || qRes || [];
          } catch(e) {}
        }
        
        const keepIds = questions.map(q => q.id).filter(id => typeof id === "number");
        
        // Archive removed questions
        for (const eq of existingQs) {
          if (!keepIds.includes(eq.id)) {
            await questionsApi.archive(eq.id).catch(()=>{});
          }
        }
        
        // Create or update remaining questions
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          if (!q.question?.trim()) continue;
          try {
            const qPayload = { text: q.question.trim(), answer_key: q.answer?.trim() || null, order: i };
            if (typeof q.id === "number") {
              await questionsApi.update(q.id, qPayload);
            } else {
              await questionsApi.create(passageId, qPayload);
            }
          } catch { /* ignore */ }
        }
      }
      
      setView("list");
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save passage.");
    } finally {
      setSaving(false);
    }
  }

  function handleArchive(p) {
    setArchiveTarget(p);
  }

  async function handleArchiveConfirm() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await adminApi.archivePassage(archiveTarget.id);
      load();
    } catch {
      // ignore
    } finally {
      setArchiving(false);
      setArchiveTarget(null);
    }
  }

  /* ── Editor view (add / edit) ── */
  if (view === "add" || view === "edit") {
    return (
      <Layout>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px 40px", fontFamily: "'Poppins', sans-serif" }}>

          {/* Sticky Topbar */}
          <div className="ap-topbar">
            <div className="ap-topbar__left">
              <button className="ap-back-btn" onClick={() => setView("list")}><ChevronLeft size={18} /></button>
              <h1 className="ap-page__title">{view === "edit" ? "Edit" : "Add"} Assessment {assType}</h1>
            </div>
            <button className="ap-save-btn" onClick={handleSave} disabled={saving} style={{ background: "#2c3e6b", color: "#fff", borderColor: "#2c3e6b" }}>
              {saving ? "Saving…" : (view === "edit" ? "Save Changes" : "Save Passage")}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {error && <div className="ap-error" role="alert">{error}</div>}

            <div className="ap-card">
              <h2 className="ap-card__title">Language &amp; Grade Level</h2>
              <div className="ap-row">
                <div className="ap-field">
                  <label className="ap-label">Language:</label>
                  <select className="ap-input" value={form.language} onChange={(e) => update("language", e.target.value)}>
                    <option value="filipino">Filipino</option><option value="english">English</option>
                  </select>
                </div>
                <div className="ap-field">
                  <label className="ap-label">Grade Level:</label>
                  <select className="ap-input" value={form.grade_level} onChange={(e) => update("grade_level", e.target.value)}>
                    {GRADES.filter(g => g.value).map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
              </div>
              {assType === 1 && eng3 && (
                <div className="ap-info-banner"><Info size={14} /><span><strong>English Grade 3</strong> — Task 1 and Task 2 are both <strong>word lists</strong> (comma-separated).</span></div>
              )}
              {assType === 1 && !eng3 && (
                <p className="a1-note">Use a <strong>comma (,)</strong> to separate words, and a <strong>period (.)</strong> to separate sentences.</p>
              )}
            </div>

            {assType === 1
              ? <A1Form form={form} update={update} eng3={eng3} />
              : <A2Form form={form} update={update} questions={questions} setQuestions={setQuestions} />
            }
          </div>


        </div>
      </Layout>
    );
  }

  const pv = previewTarget;

  /* ── List view ── */
  return (
    <Layout>
      <div style={{ fontFamily: "'Poppins', sans-serif", width: "100%" }}>

        {/* Topbar matching other nav pages */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1a2340", margin: 0, fontFamily: "Poppins, sans-serif" }}>
            Public Passages
          </h1>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setGlobalUploadOpen(true)} className="ap-save-btn" style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", borderColor: "#c8d0e4" }}>
              <Upload size={16} /> Upload
            </button>
            <button onClick={() => startAdd(1)} className="ap-save-btn" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Plus size={16} /> Assessment 1
            </button>
            <button onClick={() => startAdd(2)} className="ap-save-btn" style={{ display: "flex", alignItems: "center", gap: 6, background: "#2c3e6b", color: "#fff", borderColor: "#2c3e6b" }}>
              <Plus size={16} /> Assessment 2
            </button>
          </div>
        </div>

        {/* Global Upload Modal */}
        {globalUploadOpen && (
          <UploadModal
            defaultType={2}
            eng3={false}
            onClose={() => setGlobalUploadOpen(false)}
            onUpload={(type, parsedData) => {
              // startAdd now handles all the parsing logic directly
              startAdd(type, parsedData);
            }}
          />
        )}

        <div>

          {/* Filters with clear labels */}
          <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 300 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>Search</label>
              <Search size={15} style={{ position: "absolute", left: 10, bottom: 10, color: "#999" }} />
              <input type="text" placeholder="Search by title or content..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="ap-input" style={{ paddingLeft: 32 }} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>Grade Level</label>
              <select value={gradeF} onChange={(e) => { setGradeF(e.target.value); setPage(1); }} className="ap-input" style={{ minWidth: 140 }}>
                {GRADES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>Language</label>
              <select value={langF} onChange={(e) => { setLangF(e.target.value); setPage(1); }} className="ap-input" style={{ minWidth: 140 }}>
                {LANGS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>Assessment Type</label>
              <select value={typeF} onChange={(e) => { setTypeF(e.target.value); setPage(1); }} className="ap-input" style={{ minWidth: 140 }}>
                {TYPES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Loading…</div>
            : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "#888", border: "1px dashed #ccc", borderRadius: 12 }}>
                <BookOpen size={40} style={{ marginBottom: 8, opacity: 0.4 }} />
                <p>No public passages found. Adjust your filters or click an <strong>Add</strong> button above.</p>
              </div>
            ) : (
              <>
                <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e5e7eb" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f1f3f8" }}>
                        {["#", "Title", "Type", "Grade", "Lang", "Words", "Actions"].map((h, i) => (
                          <th key={i} style={{ padding: "12px 14px", fontWeight: 700, color: "#1a2340", textAlign: i === 0 || i === 6 ? "center" : "left", borderBottom: "2px solid #dde2f0", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((p, idx) => (
                        <tr key={p.id} onClick={() => setPreviewTarget(p)} style={{ borderBottom: "1px solid #eee", background: "#fff", cursor: "pointer" }}>
                          <td style={{ padding: "12px 14px", textAlign: "center", color: "#888" }}>{(page - 1) * PER + idx + 1}</td>
                          <td style={{ padding: "12px 14px", fontWeight: 600, color: "#1a2340" }}>{p.title || "(Assessment 1)"}</td>
                          <td style={{ padding: "12px 14px" }}>
                            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: p.assessment_type === 1 ? "#e0edff" : "#e8f5e9", color: p.assessment_type === 1 ? "#1e40af" : "#166534", fontWeight: 600 }}>
                              Assessment {p.assessment_type}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>{fmtGrade(p.grade_level)}</td>
                          <td style={{ padding: "12px 14px", textTransform: "capitalize" }}>{p.language}</td>
                          <td style={{ padding: "12px 14px", textAlign: "center" }}>{p.word_count}</td>
                          <td style={{ padding: "12px 14px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                              <button onClick={() => startEdit(p)} title="Edit" style={{ background: "#f8f9fd", border: "1px solid #dde2f0", borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}><Pencil size={14} color="#555" /></button>
                              <button onClick={() => handleArchive(p)} title="Archive" style={{ background: "#fdf2f2", border: "1px solid #f9caca", borderRadius: 6, padding: "6px 8px", cursor: "pointer" }}><Trash2 size={14} color="#c44" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 20 }}>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="ap-back-btn" style={{ width: 32, height: 32 }}><ChevronLeft size={16} /></button>
                    <span style={{ fontSize: 13, color: "#555", fontWeight: 600 }}>Page {page} of {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="ap-back-btn" style={{ width: 32, height: 32 }}><ChevronRight size={16} /></button>
                  </div>
                )}
              </>
            )}

          {/* Preview modal */}
          {pv && (
            <div className="cr-modal-overlay" onClick={() => setPreviewTarget(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
              <div className="cr-modal" onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 650, maxHeight: "85vh", overflow: "auto", boxShadow: "0 8px 32px rgba(0,0,0,.15)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 18, color: "#1a2340" }}>{pv.title || "Assessment 1 Passage"}</h3>
                  <button onClick={() => setPreviewTarget(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color="#666" /></button>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, background: "#eef3ff", color: "#2c3e6b", fontWeight: 600 }}>{fmtGrade(pv.grade_level)}</span>
                  <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, background: "#f0fdf4", color: "#166534", fontWeight: 600 }}>{pv.language}</span>
                  <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, background: pv.assessment_type === 1 ? "#e0edff" : "#e8f5e9", color: pv.assessment_type === 1 ? "#1e40af" : "#166534", fontWeight: 600 }}>Assessment {pv.assessment_type} · {pv.word_count} words</span>
                </div>
                {pv.assessment_type === 2 && pv.content && (
                  <div style={{ background: "#f9fafb", border: "1px solid #eaecf8", padding: 20, borderRadius: 10, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.8, color: "#333", maxHeight: 400, overflow: "auto" }}>{pv.content}</div>
                )}
                {pv.assessment_type === 1 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {pv.task1_content && <div><strong style={{ fontSize: 13, color: "#2c3e6b" }}>Task 1:</strong><div style={{ background: "#f9fafb", border: "1px solid #eaecf8", padding: 16, borderRadius: 10, marginTop: 6, fontSize: 14, lineHeight: 1.7 }}>{pv.task1_content}</div></div>}
                    {pv.task2_words && <div><strong style={{ fontSize: 13, color: "#2c3e6b" }}>Task 2 — Words:</strong><div style={{ background: "#f9fafb", border: "1px solid #eaecf8", padding: 16, borderRadius: 10, marginTop: 6, fontSize: 14 }}>{pv.task2_words}</div></div>}
                    {pv.task2_sentences && <div><strong style={{ fontSize: 13, color: "#2c3e6b" }}>Task 2 — Sentences:</strong><div style={{ background: "#f9fafb", border: "1px solid #eaecf8", padding: 16, borderRadius: 10, marginTop: 6, fontSize: 14, lineHeight: 1.7 }}>{pv.task2_sentences}</div></div>}
                  </div>
                )}
              </div>
            </div>
          )}

          <ConfirmModal
            isOpen={!!archiveTarget}
            title="Archive Passage"
            message={`Are you sure you want to archive "${archiveTarget?.title || 'this passage'}"? Teachers will no longer see it.`}
            confirmLabel={archiving ? "Archiving..." : "Archive"}
            variant="danger"
            onConfirm={handleArchiveConfirm}
            onClose={() => !archiving && setArchiveTarget(null)}
          />
        </div>
      </div>
    </Layout>
  );
}

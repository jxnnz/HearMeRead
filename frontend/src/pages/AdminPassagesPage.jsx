import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Search, BookOpen, Pencil, Trash2, X, ChevronLeft, ChevronRight, Eye, Upload, FileText, Info } from "lucide-react";
import Layout from "../components/Layout";
import ConfirmModal from "../modals/ConfirmModal";
import UploadModal from "../components/UploadModal";
import { adminApi, questionsApi } from "../services/api";
import { useWindowWidth } from "../hooks/useWindowWidth";
import "./pages css/AddPassagePage.css";

// Rhyme pair helpers
function makeEmptyRhymePairs() {
  return Array.from({ length: 10 }, (_, i) => ({ id: i, pair: "", answer: "Oo" }));
}

function parseRhymePairs(str) {
  if (!str || !str.includes("|")) return makeEmptyRhymePairs();
  const lines = str.split("\n").filter((l) => l.includes("|"));
  const pairs = lines.map((line, i) => {
    const last = line.lastIndexOf("|");
    return { id: i, pair: line.slice(0, last).trim(), answer: line.slice(last + 1).trim() || "Oo" };
  });
  while (pairs.length < 10) pairs.push({ id: pairs.length, pair: "", answer: "Oo" });
  return pairs;
}

function serializeRhymePairs(pairs) {
  return pairs.filter((p) => p.pair.trim()).map((p) => `${p.pair}|${p.answer}`).join("\n");
}

function isG1Filipino(form) { return form.language === "filipino" && form.grade_level === "grade_1"; }

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
function A1Form({ form, update, eng3, rhymePairs, setRhymePairs }) {
  const g1fil = isG1Filipino(form);

  function updatePair(i, field, val) {
    setRhymePairs((prev) => prev.map((p, j) => (j === i ? { ...p, [field]: val } : p)));
  }

  return (
    <>
      <div className="ap-card">
        <div className="ap-card__header-row">
          <h2 className="ap-card__title">{eng3 ? "Task 1 — Words" : g1fil ? "Gawain 1 — Mga Titik" : "Task 1"}</h2>
        </div>
        {eng3 && <p className="ap-card__subtitle">Separate each word with a comma (e.g. cat, dog, bird).</p>}
        {g1fil && <p className="ap-card__subtitle">Enter the 10 letters separated by spaces (e.g. b ng T e p s H G u L).</p>}
        <div className="ap-field">
          <label className="ap-label">{eng3 ? "Words:" : "Content:"}</label>
          <textarea className="ap-textarea" value={form.task1_content} onChange={(e) => update("task1_content", e.target.value)}
            placeholder={eng3 ? "e.g. cat, dog, bird, fish" : g1fil ? "e.g. b ng T e p s H G u L" : "Type or paste the reading passage…"} rows={eng3 ? 4 : 3} />
        </div>
      </div>

      {g1fil ? (
        <div className="ap-card">
          <div className="ap-card__header-row">
            <h2 className="ap-card__title">Gawain 2L — Rhyming Word Pairs</h2>
          </div>
          <p className="ap-card__subtitle">
            Enter 10 word pairs. The teacher reads each pair aloud; mark <strong>Oo</strong> if they rhyme, <strong>Hindi</strong> if they don't.
          </p>
          <div className="rhyme-edit-grid">
            {rhymePairs.map((rp, i) => (
              <div key={i} className="rhyme-edit-row">
                <span className="rhyme-edit-num">{i + 1}.</span>
                <input
                  className="ap-input rhyme-edit-pair"
                  value={rp.pair}
                  onChange={(e) => updatePair(i, "pair", e.target.value)}
                  placeholder="e.g. sanay, tunay"
                />
                <div className="rhyme-edit-choices">
                  {["Oo", "Hindi"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`rhyme-edit-btn${rp.answer === opt ? ` rhyme-edit-btn--${opt === "Oo" ? "oo" : "hindi"} rhyme-edit-btn--active` : ""}`}
                      onClick={() => updatePair(i, "answer", opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
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
      )}

      {!eng3 && (
        <div className="ap-card">
          <div className="ap-card__header-row">
            <h2 className="ap-card__title">{g1fil ? "Gawain 2H — Mga Pangungusap" : "Task 2 — Sentences"}</h2>
          </div>
          <p className="ap-card__subtitle">Separate each sentence with a period.</p>
          <div className="ap-field">
            <textarea className="ap-textarea" value={form.task2_sentences} onChange={(e) => update("task2_sentences", e.target.value)}
              placeholder={g1fil ? "e.g. Ang bata ay masaya. Siya ay mabait." : "e.g. Ang bata ay masaya. Mahal ko ang aking pamilya."} rows={4} />
          </div>
        </div>
      )}
    </>
  );
}

function parseStoryTitle(t) {
  if (!t) return { num: "1", title: "" };
  const m = t.match(/^Story\s*(\d+)\s*:\s*(.+)$/i);
  return m ? { num: m[1], title: m[2] } : { num: "1", title: t };
}

function storyLabel(t) {
  if (!t) return "—";
  const m = t.match(/^Story\s*(\d+)\s*:/i);
  return m ? `Story ${m[1]}` : t;
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
        <div className="ap-row">
          <div className="ap-field" style={{ flex: "0 0 auto", minWidth: 130 }}>
            <label className="ap-label">Story Number: *</label>
            <select className="ap-input" value={form.story_number || "1"} onChange={(e) => update("story_number", e.target.value)}>
              <option value="1">Story 1</option>
              <option value="2">Story 2</option>
            </select>
          </div>
          <div className="ap-field" style={{ flex: 1 }}>
            <label className="ap-label">Story Title: *</label>
            <input className="ap-input" value={form.title} onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Ang Pagong at ang Matsing" />
          </div>
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

  // Rhyme pairs for Grade 1 Filipino A1 passages
  const [rhymePairs, setRhymePairs] = useState(makeEmptyRhymePairs);

  // Archive modal state
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);

  // Upload modal state
  const [uploadTargetField, setUploadTargetField] = useState(null);
  const [globalUploadOpen, setGlobalUploadOpen] = useState(false);

  // Bulk upload state
  const [bulkSaving, setBulkSaving]   = useState(false);
  const [bulkResult, setBulkResult]   = useState(null);  // { saved, failed, total }

  // Pending file for single upload → form flow
  const [pendingFile, setPendingFile] = useState(null);

  const isMobile = useWindowWidth() <= 768;
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

  // ── Bulk upload handler ──────────────────────────────────────────────
  async function handleBulkUpload(type, parsedItems) {
    setBulkSaving(true);
    let saved = 0;
    let failed = 0;
    const total = parsedItems.length;

    for (const item of parsedItems) {
      const { parsedData } = item;
      try {
        if (type === 1) {
          // Assessment 1
          const g1fil = (parsedData.language || "filipino") === "filipino" &&
                        (parsedData.grade_level || "grade_1") === "grade_1";
          let task2Words = parsedData.task2Words || "";
          if (g1fil && parsedData.task2Rhymes?.length > 0) {
            task2Words = parsedData.task2Rhymes
              .filter((p) => p.pair.trim())
              .map((p) => `${p.pair}|${p.answer}`)
              .join("\n");
          }
          const isE3 = (parsedData.language || "filipino") === "english" &&
                       (parsedData.grade_level || "grade_1") === "grade_3";
          const passage = await adminApi.createPassage({
            language:        parsedData.language || "filipino",
            grade_level:     parsedData.grade_level || "grade_1",
            assessment_type: 1,
            task1_content:   (parsedData.task1 || "").trim(),
            task2_words:     task2Words.trim(),
            task2_sentences: isE3 ? "" : (parsedData.task2Sentences || "").trim(),
          });
          if (item.file) await adminApi.uploadPassageFile(passage.id, item.file).catch(() => {});
        } else {
          // Assessment 2
          const passage = await adminApi.createPassage({
            title:           parsedData.title ? `Story 1: ${parsedData.title.trim()}` : "Untitled",
            content:         (parsedData.content || "").trim(),
            language:        parsedData.language || "filipino",
            grade_level:     parsedData.grade_level || "grade_2",
            assessment_type: 2,
          });
          if (item.file) await adminApi.uploadPassageFile(passage.id, item.file).catch(() => {});
          // Save questions if present
          if (parsedData.questions?.length > 0) {
            for (const q of parsedData.questions) {
              if (!q.question?.trim()) continue;
              await questionsApi.create(passage.id, {
                text:       q.question.trim(),
                answer_key: q.answer?.trim() || null,
              });
            }
          }
        }
        saved++;
      } catch {
        failed++;
      }
    }

    setBulkSaving(false);
    setBulkResult({ saved, failed, total });
    load(); // Refresh passages list
  }

  function startAdd(type, parsedData = null) {
    setAssType(type);
    setEditId(null);
    
    let initForm = type === 1
      ? { language: "filipino", grade_level: "grade_1", task1_content: "", task2_words: "", task2_sentences: "" }
      : { title: "", story_number: "1", language: "filipino", grade_level: "grade_2", content: "" };

    if (parsedData) {
      if (parsedData.language) initForm.language = parsedData.language;
      if (parsedData.grade_level) initForm.grade_level = parsedData.grade_level;
      if (type === 1) {
        initForm.task1_content = parsedData.task1 || "";
        initForm.task2_words = parsedData.task2Words || "";
        initForm.task2_sentences = parsedData.task2Sentences || "";
      } else {
        const { num, title } = parseStoryTitle(parsedData.title || "");
        initForm.story_number = num;
        initForm.title = title;
        initForm.content = parsedData.content || "";
      }
    }
    
    setForm(initForm);

    // Init rhyme pairs for Grade 1 Filipino Assessment 1
    if (type === 1 && initForm.language === "filipino" && initForm.grade_level === "grade_1") {
      if (parsedData?.task2Rhymes?.length > 0) {
        const pairs = parsedData.task2Rhymes.map((rp, i) => ({ id: i, pair: rp.pair, answer: rp.answer }));
        while (pairs.length < 10) pairs.push({ id: pairs.length, pair: "", answer: "Oo" });
        setRhymePairs(pairs);
      } else {
        setRhymePairs(makeEmptyRhymePairs());
      }
    }

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
    if (p.assessment_type === 1) {
      setForm({ language: p.language, grade_level: p.grade_level, task1_content: p.task1_content || "", task2_words: p.task2_words || "", task2_sentences: p.task2_sentences || "" });
    } else {
      const { num, title } = parseStoryTitle(p.title || "");
      setForm({ title, story_number: num, language: p.language, grade_level: p.grade_level, content: p.content || "" });
    }
    
    // Parse rhyme pairs for Grade 1 Filipino Assessment 1
    if (p.assessment_type === 1 && p.grade_level === "grade_1" && p.language === "filipino") {
      setRhymePairs(parseRhymePairs(p.task2_words ?? ""));
    } else {
      setRhymePairs(makeEmptyRhymePairs());
    }

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
    const g1fil = isG1Filipino(form);
    if (assType === 1) {
      if (!form.task1_content?.trim()) { setError("Task 1 content is required."); return; }
      if (g1fil) {
        const serialized = serializeRhymePairs(rhymePairs);
        if (!serialized) { setError("Please enter at least one rhyming word pair."); return; }
        if (!form.task2_sentences?.trim()) { setError("Gawain 2H sentences are required."); return; }
      } else if (eng3) {
        if (!form.task2_words?.trim()) { setError("Task 2 Words is required."); return; }
      } else {
        if (!form.task2_words?.trim()) { setError("Task 2 Words is required."); return; }
        if (!form.task2_sentences?.trim()) { setError("Task 2 Sentences is required."); return; }
      }
    } else {
      if (!form.title?.trim()) { setError("Story title is required."); return; }
      if (!form.content?.trim()) { setError("Passage content is required."); return; }
    }

    setSaving(true);
    try {
      const payload = { ...form, assessment_type: assType };
      if (assType === 1 && g1fil) payload.task2_words = serializeRhymePairs(rhymePairs);
      if (assType === 1 && eng3) payload.task2_sentences = "";
      if (assType === 2) payload.title = `Story ${form.story_number || "1"}: ${(form.title || "").trim()}`;
      
      if (assType === 2) {
        payload.questions = questions
          .filter(q => q.question?.trim())
          .map((q, idx) => ({
            id: typeof q.id === "number" ? q.id : null,
            text: q.question.trim(),
            answer_key: q.answer?.trim() || null,
            order: idx,
          }));
      }

      let passageId = editId;
      if (editId) {
        const updated = await adminApi.updatePassage(editId, payload);
        passageId = updated.id;
      } else {
        const created = await adminApi.createPassage(payload);
        passageId = created.id;
      }

      // Upload original file to R2
      if (pendingFile && passageId) {
        await adminApi.uploadPassageFile(passageId, pendingFile).catch(() => {});
        setPendingFile(null);
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

  /* Editor view (add / edit) */
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

            {view === "add" && (
              <div className="ap-info-banner" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Info size={16} style={{ flexShrink: 0 }} />
                <span>Only DepEd passages should be added.</span>
              </div>
            )}

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
              ? <A1Form form={form} update={update} eng3={eng3} rhymePairs={rhymePairs} setRhymePairs={setRhymePairs} />
              : <A2Form form={form} update={update} questions={questions} setQuestions={setQuestions} />
            }
          </div>


        </div>
      </Layout>
    );
  }

  const pv = previewTarget;

  /* List view */
  return (
    <Layout>
      <div style={{ fontFamily: "'Poppins', sans-serif", width: "100%" }}>

        {/* Topbar matching other nav pages */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: isMobile ? 16 : 24 }}>
          <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: "#1a2340", margin: 0, fontFamily: "Poppins, sans-serif" }}>
            Public Passages
          </h1>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setGlobalUploadOpen(true)} className="ap-save-btn" style={{ display: "flex", alignItems: "center", gap: isMobile ? 0 : 6, background: "#fff", borderColor: "#c8d0e4", padding: isMobile ? "7px 10px" : undefined }}>
              <Upload size={15} />{!isMobile && " Upload"}
            </button>
            <button onClick={() => startAdd(1)} className="ap-save-btn" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Plus size={15} />{isMobile ? "A1" : " Assessment 1"}
            </button>
            <button onClick={() => startAdd(2)} className="ap-save-btn" style={{ display: "flex", alignItems: "center", gap: 6, background: "#2c3e6b", color: "#fff", borderColor: "#2c3e6b" }}>
              <Plus size={15} />{isMobile ? "A2" : " Assessment 2"}
            </button>
          </div>
        </div>

        {/* Global Upload Modal */}
        {globalUploadOpen && (
          <UploadModal
            defaultType={2}
            eng3={false}
            onClose={() => setGlobalUploadOpen(false)}
            onUpload={(type, parsedData, fileName, file) => {
              // Single file → store file and open form for editing
              setPendingFile(file || null);
              startAdd(type, parsedData);
            }}
            onBulkUpload={handleBulkUpload}
          />
        )}

        {/* Bulk saving overlay */}
        <ConfirmModal
          isOpen={bulkSaving}
          title="Saving Passages…"
          message="Please wait while your passages are being saved."
          confirmLabel={null}
          cancelLabel={null}
          onClose={() => {}}
          onConfirm={() => {}}
        />

        {/* Bulk result modal */}
        <ConfirmModal
          isOpen={!!bulkResult}
          title={bulkResult?.failed > 0 ? "Upload Complete" : "Passages Saved!"}
          message={
            bulkResult?.failed > 0
              ? `${bulkResult.saved} of ${bulkResult.total} passages saved successfully. ${bulkResult.failed} failed to save.`
              : `${bulkResult?.saved || 0} passage${(bulkResult?.saved || 0) !== 1 ? "s" : ""} saved successfully.`
          }
          variant={bulkResult?.failed > 0 ? "danger" : "default"}
          confirmLabel="OK"
          cancelLabel={null}
          onConfirm={() => setBulkResult(null)}
          onClose={() => setBulkResult(null)}
        />

        <div>

          {/* Filters */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {/* Search — always full width */}
            <div style={{ position: "relative" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>Search</label>
              <Search size={15} style={{ position: "absolute", left: 10, bottom: 10, color: "#999" }} />
              <input type="text" placeholder="Search by title or content..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="ap-input"
                style={{ paddingLeft: 32, width: "100%", boxSizing: "border-box" }} />
            </div>

            {/* Selects — 2-column grid on mobile, row on desktop */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, auto)",
              gap: 10,
              alignItems: "end",
            }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>Grade Level</label>
                <select value={gradeF} onChange={(e) => { setGradeF(e.target.value); setPage(1); }} className="ap-input" style={{ width: "100%", boxSizing: "border-box" }}>
                  {GRADES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>Language</label>
                <select value={langF} onChange={(e) => { setLangF(e.target.value); setPage(1); }} className="ap-input" style={{ width: "100%", boxSizing: "border-box" }}>
                  {LANGS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                </select>
              </div>

              <div style={isMobile ? { gridColumn: "1 / -1" } : {}}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>Assessment Type</label>
                <select value={typeF} onChange={(e) => { setTypeF(e.target.value); setPage(1); }} className="ap-input" style={{ width: "100%", boxSizing: "border-box" }}>
                  {TYPES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                </select>
              </div>
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
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: isMobile ? 11 : 13 }}>
                    <thead>
                      <tr style={{ background: "#f1f3f8" }}>
                        {(isMobile
                          ? ["#", "Title", "Type", "Grade", ""]
                          : ["#", "Title", "Type", "Grade", "Lang", "Words", "Actions"]
                        ).map((h, i) => (
                          <th key={i} style={{ padding: isMobile ? "8px 8px" : "12px 14px", fontWeight: 700, color: "#1a2340", textAlign: "left", borderBottom: "2px solid #dde2f0", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((p, idx) => (
                        <tr key={p.id} onClick={() => setPreviewTarget(p)} style={{ borderBottom: "1px solid #eee", background: "#fff", cursor: "pointer" }}>
                          <td style={{ padding: isMobile ? "8px 8px" : "12px 14px", color: "#888" }}>{(page - 1) * PER + idx + 1}</td>
                          <td style={{ padding: isMobile ? "8px 8px" : "12px 14px", fontWeight: 600, color: "#1a2340", maxWidth: isMobile ? 110 : "none" }}>
                            {p.assessment_type === 2 ? (() => {
                              const { num, title } = parseStoryTitle(p.title);
                              return num ? (
                                <>
                                  <span style={{ fontSize: isMobile ? 10 : 11, color: "#2c3e6b", fontWeight: 700, marginRight: 4 }}>Story {num}:</span>
                                  <span style={{ fontWeight: 400, color: "#555" }}>{title}</span>
                                </>
                              ) : (p.title || "—");
                            })() : (p.title || "(Assessment 1)")}
                          </td>
                          <td style={{ padding: isMobile ? "8px 8px" : "12px 14px", whiteSpace: "nowrap" }}>
                            <span style={{ fontSize: isMobile ? 10 : 11, padding: isMobile ? "2px 6px" : "3px 10px", borderRadius: 6, background: p.assessment_type === 1 ? "#e0edff" : "#e8f5e9", color: p.assessment_type === 1 ? "#1e40af" : "#166534", fontWeight: 600, whiteSpace: "nowrap" }}>
                              {isMobile ? `A${p.assessment_type}` : `Assessment ${p.assessment_type}`}
                            </span>
                          </td>
                          <td style={{ padding: isMobile ? "8px 8px" : "12px 14px", whiteSpace: "nowrap" }}>{fmtGrade(p.grade_level)}</td>
                          {!isMobile && <td style={{ padding: "12px 14px", textTransform: "capitalize" }}>{p.language}</td>}
                          {!isMobile && <td style={{ padding: "12px 14px" }}>{p.word_count}</td>}
                          <td style={{ padding: isMobile ? "8px 6px" : "12px 14px" }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: "flex", gap: isMobile ? 4 : 6 }}>
                              <button onClick={() => startEdit(p)} title="Edit" style={{ background: "#f8f9fd", border: "1px solid #dde2f0", borderRadius: 6, padding: isMobile ? "5px 6px" : "6px 8px", cursor: "pointer" }}><Pencil size={isMobile ? 12 : 14} color="#555" /></button>
                              <button onClick={() => handleArchive(p)} title="Archive" style={{ background: "#fdf2f2", border: "1px solid #f9caca", borderRadius: 6, padding: isMobile ? "5px 6px" : "6px 8px", cursor: "pointer" }}><Trash2 size={isMobile ? 12 : 14} color="#c44" /></button>
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
                  <h3 style={{ margin: 0, fontSize: 18, color: "#1a2340" }}>
                    {pv.assessment_type === 2 && pv.title ? (() => {
                      const { num, title } = parseStoryTitle(pv.title);
                      return num ? <><span style={{ color: "#2c3e6b" }}>Story {num}:</span> {title}</> : pv.title;
                    })() : (pv.title || "Assessment 1 Passage")}
                  </h3>
                  <button onClick={() => setPreviewTarget(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color="#666" /></button>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, background: "#eef3ff", color: "#2c3e6b", fontWeight: 600 }}>{fmtGrade(pv.grade_level)}</span>
                  <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, background: "#f0fdf4", color: "#166534", fontWeight: 600 }}>{pv.language}</span>
                  <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, background: pv.assessment_type === 1 ? "#e0edff" : "#e8f5e9", color: pv.assessment_type === 1 ? "#1e40af" : "#166534", fontWeight: 600 }}>Assessment {pv.assessment_type} · {pv.word_count} words</span>
                </div>
                {pv.assessment_type === 2 && pv.content && (
                  <div className="ap-scrollbar" style={{ background: "#f9fafb", border: "1px solid #eaecf8", padding: 20, borderRadius: 10, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.8, color: "#333", maxHeight: 400, overflow: "auto" }}>{pv.content}</div>
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

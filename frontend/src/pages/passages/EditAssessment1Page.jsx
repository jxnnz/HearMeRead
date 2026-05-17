import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Info } from "lucide-react";

import Layout from "../../components/Layout";
import { passagesApi } from "../../services/api";
import "../pages css/AddPassagePage.css";

function isEnglishGrade3(form) {
  return form.language === "english" && form.grade_level === "grade_3";
}

function isG1Filipino(form) {
  return form.language === "filipino" && form.grade_level === "grade_1";
}

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

export default function EditAssessment1Page() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState({
    language: "filipino",
    grade_level: "grade_1",
    task1_content: "",
    task2_words: "",
    task2_sentences: "",
  });
  const [rhymePairs, setRhymePairs] = useState(makeEmptyRhymePairs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const eng3 = isEnglishGrade3(form);
  const g1fil = isG1Filipino(form);

  useEffect(() => {
    passagesApi
      .get(id)
      .then((p) => {
        setForm({
          language:        p.language        ?? "filipino",
          grade_level:     p.grade_level     ?? "grade_1",
          task1_content:   p.task1_content   ?? "",
          task2_words:     p.task2_words     ?? "",
          task2_sentences: p.task2_sentences ?? "",
        });
        if (p.grade_level === "grade_1" && p.language === "filipino") {
          setRhymePairs(parseRhymePairs(p.task2_words ?? ""));
        }
      })
      .catch((e) => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, [id]);

  function update(field, val) { setForm((prev) => ({ ...prev, [field]: val })); }

  function validate() {
    if (!form.task1_content.trim()) { setError("Task 1 content is required."); return false; }
    if (g1fil) {
      if (!serializeRhymePairs(rhymePairs)) { setError("Please enter at least one rhyming word pair."); return false; }
      if (!form.task2_sentences.trim()) { setError("Gawain 2H sentences are required."); return false; }
    } else if (eng3) {
      if (!form.task2_words.trim()) { setError("Task 2 Words is required."); return false; }
    } else {
      if (!form.task2_words.trim())     { setError("Task 2 Words content is required.");     return false; }
      if (!form.task2_sentences.trim()) { setError("Task 2 Sentences content is required."); return false; }
    }
    return true;
  }

  async function handleSave() {
    setError(null);
    if (!validate()) return;
    setSaving(true);
    try {
      await passagesApi.update(id, {
        language:        form.language,
        grade_level:     form.grade_level,
        task1_content:   form.task1_content.trim(),
        task2_words:     g1fil ? serializeRhymePairs(rhymePairs) : form.task2_words.trim(),
        task2_sentences: eng3 ? "" : form.task2_sentences.trim(),
      });
      navigate("/passages");
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="ap-page">
          <p style={{ padding: "32px", color: "#8a94b2" }}>Loading…</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="ap-page" style={{ paddingBottom: 40, fontFamily: "'Poppins', sans-serif", maxWidth: 680, margin: "0 auto" }}>

        {/* ── Top bar ── */}
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#f0f2fa", padding: "20px 0", borderBottom: "1px solid #dde2f0", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div className="ap-topbar__left">
            <button className="ap-back-btn" onClick={() => navigate("/passages")} aria-label="Go back">
              <ChevronLeft size={18} />
            </button>
            <h1 className="ap-page__title">Edit Assessment 1</h1>
          </div>
          <button className="ap-save-btn" onClick={handleSave} disabled={saving} style={{ background: "#2c3e6b", color: "#fff", borderColor: "#2c3e6b" }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {error && <div className="ap-error" role="alert">{error}</div>}

          {/* ── Language & Grade Level ── */}
          <div className="ap-card">
            <h2 className="ap-card__title">Language &amp; Grade Level</h2>
            <div className="ap-row">
              <div className="ap-field">
                <label className="ap-label" htmlFor="a1-language">Language:</label>
                <select id="a1-language" className="ap-input" value={form.language}
                  onChange={(e) => update("language", e.target.value)}>
                  <option value="filipino">Filipino</option>
                  <option value="english">English</option>
                </select>
              </div>
              <div className="ap-field">
                <label className="ap-label" htmlFor="a1-grade">Grade Level:</label>
                <select id="a1-grade" className="ap-input" value={form.grade_level}
                  onChange={(e) => update("grade_level", e.target.value)}>
                  {[
                    { value: "grade_1", label: "Grade 1" },
                    { value: "grade_2", label: "Grade 2" },
                    { value: "grade_3", label: "Grade 3" },
                  ].map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            {eng3 ? (
              <div className="ap-info-banner">
                <Info size={14} />
                <span><strong>English Grade 3</strong> — Task 1 and Task 2 are both <strong>word lists</strong> (comma-separated).</span>
              </div>
            ) : g1fil ? (
              <p className="a1-note">
                Grade 1 Filipino uses <strong>Gawain 1</strong> (letters), <strong>Gawain 2L</strong> (rhyming pairs), and <strong>Gawain 2H</strong> (sentences).
              </p>
            ) : (
              <p className="a1-note">
                Use a <strong>comma (,)</strong> to separate words in Task 2 Words,
                and a <strong>period (.)</strong> to separate sentences in Task 2 Sentences.
              </p>
            )}
          </div>

          {/* ── Task 1 ── */}
          <div className="ap-card">
            <div className="ap-card__header-row">
              <h2 className="ap-card__title">{eng3 ? "Task 1 — Words" : g1fil ? "Gawain 1 — Mga Titik" : "Task 1"}</h2>
            </div>
            {eng3 && <p className="ap-card__subtitle">Separate each word with a comma (e.g. cat, dog, bird).</p>}
            {g1fil && <p className="ap-card__subtitle">Enter the 10 letters separated by spaces (e.g. b ng T e p s H G u L).</p>}
            <div className="ap-field">
              <label className="ap-label" htmlFor="a1-task1">{eng3 ? "Words:" : "Content:"}</label>
              <textarea id="a1-task1" className="ap-textarea" value={form.task1_content}
                onChange={(e) => update("task1_content", e.target.value)}
                placeholder={eng3 ? "e.g. cat, dog, bird, fish, house" : g1fil ? "e.g. b ng T e p s H G u L" : "Type or paste the reading passage for Task 1…"}
                rows={eng3 || g1fil ? 3 : 6} />
            </div>
          </div>

          {/* ── Task 2 — Rhyme pairs (Grade 1 Filipino) or Words (others) ── */}
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
                      onChange={(e) => setRhymePairs((prev) => prev.map((p, j) => j === i ? { ...p, pair: e.target.value } : p))}
                      placeholder="e.g. sanay, tunay"
                    />
                    <div className="rhyme-edit-choices">
                      {["Oo", "Hindi"].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`rhyme-edit-btn${rp.answer === opt ? ` rhyme-edit-btn--${opt === "Oo" ? "oo" : "hindi"} rhyme-edit-btn--active` : ""}`}
                          onClick={() => setRhymePairs((prev) => prev.map((p, j) => j === i ? { ...p, answer: opt } : p))}
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
              <p className="ap-card__subtitle">
                Separate each word with a comma (e.g. {eng3 ? "sun, moon, star" : "aso, bata, pusa"}).
              </p>
              <div className="ap-field">
                <label className="ap-label" htmlFor="a1-words">Words:</label>
                <textarea id="a1-words" className="ap-textarea" value={form.task2_words}
                  onChange={(e) => update("task2_words", e.target.value)}
                  placeholder={eng3 ? "e.g. sun, moon, star, tree, house" : "e.g. aso, bata, pusa, bahay, tubig"}
                  rows={4} />
              </div>
            </div>
          )}

          {/* ── Task 2H / Sentences (hidden for Eng Grade 3) ── */}
          {!eng3 && (
            <div className="ap-card">
              <div className="ap-card__header-row">
                <h2 className="ap-card__title">{g1fil ? "Gawain 2H — Mga Pangungusap" : "Task 2 — Sentences"}</h2>
              </div>
              <p className="ap-card__subtitle">Separate each sentence with a period.</p>
              <div className="ap-field">
                <label className="ap-label" htmlFor="a1-sentences">Sentences:</label>
                <textarea id="a1-sentences" className="ap-textarea" value={form.task2_sentences}
                  onChange={(e) => update("task2_sentences", e.target.value)}
                  placeholder={g1fil ? "e.g. Ang bata ay masaya. Siya ay mabait." : "e.g. Ang bata ay masaya. Mahal ko ang aking pamilya."}
                  rows={4} />
              </div>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}

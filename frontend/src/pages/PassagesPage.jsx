import { MOCK_PASSAGES } from "../data/mockData";

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, X, FileText } from "lucide-react";

import Layout        from "../components/Layout";
import PassageCard   from "../components/PassageCard";
import PassageModal  from "../components/PassageModal";
import DetailDrawer  from "../components/DetailDrawer";
import AppButton     from "../components/AppButton";
import FilterButton  from "../components/FilterButton";
import { passagesApi } from "../services/api";

import "./PassagesPage.css";

// ── Filter config for FilterButton ──────────────────────────
const FILTER_CONFIG = [
  {
    key: "language",
    label: "Language",
    options: [
      { value: "filipino", label: "Filipino" },
      { value: "english",  label: "English" },
    ],
  },
  {
    key: "grade_level",
    label: "Grade Level",
    options: ["1", "2", "3", "4", "5", "6"].map((g) => ({
      value: g,
      label: `Grade ${g}`,
    })),
  },
  {
    key: "status",
    label: "Status",
    options: [
      { value: "active",   label: "Active" },
      { value: "archived", label: "Archived" },
    ],
  },
];

const EMPTY_FILTERS = { language: "", grade_level: "", status: "" };

const EMPTY_FORM = {
  title:       "",
  content:     "",
  language:    "filipino",
  grade_level: "2",
};

// ============================================================
// Page Component
// ============================================================
export default function PassagesPage() {
  const navigate = useNavigate();

  // ── Data ─────────────────────────────────────────────────
  const [passages, setPassages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  // ── Search & filter ──────────────────────────────────────
  const [search, setSearch]   = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  // ── Edit modal state ─────────────────────────────────────
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState(null);

  // ── Detail drawer ─────────────────────────────────────────
  const [detailPassage, setDetailPassage] = useState(null);

  // ── Fetch ───────────────────────────────────────────────── MAIN CODE DO NOT DELETE
  /*const fetchPassages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filters.language)    params.language    = filters.language;
      if (filters.grade_level) params.grade_level = filters.grade_level;
      if (filters.status)      params.is_archived = filters.status === "archived";
      const data = await passagesApi.list(params);
      setPassages(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchPassages(); }, [fetchPassages]);
*/
// ── MOCK UP DATA ───────────────────────────────────────────────── DELETE IF NOT USING
// ── AFTER (mock data) ──
const fetchPassages = useCallback(() => {
  setLoading(true);
  setError(null);

  let data = [...MOCK_PASSAGES];

  if (filters.language)
    data = data.filter((p) => p.language === filters.language);
  if (filters.grade_level)
    data = data.filter((p) => String(p.grade_level) === filters.grade_level);
  if (filters.status === "active")
    data = data.filter((p) => !p.is_archived);
  if (filters.status === "archived")
    data = data.filter((p) => p.is_archived);

  setPassages(data);
  setLoading(false);
}, [filters]);

  // ── Client-side search ────────────────────────────────────
  const displayed = passages.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.content?.toLowerCase().includes(q)
    );
  });

  // ── Filter handlers ───────────────────────────────────────
  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  // ── Active filter pills ───────────────────────────────────
  const activePills = FILTER_CONFIG
    .filter((f) => filters[f.key])
    .map((f) => ({
      key:   f.key,
      label: f.options.find((o) => o.value === filters[f.key])?.label ?? filters[f.key],
    }));

  // ── Edit modal handlers ───────────────────────────────────
  function openEdit(passage, e) {
    e.stopPropagation();
    setForm({
      title:       passage.title,
      content:     passage.content,
      language:    passage.language,
      grade_level: String(passage.grade_level ?? "2"),
    });
    setFormError(null);
    setEditTarget(passage);
  }

  function closeEdit() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!form.title.trim())   { setFormError("Title is required.");           return; }
    if (!form.content.trim()) { setFormError("Passage content is required."); return; }
    setSaving(true);
    setFormError(null);
    try {
      await passagesApi.update(editTarget.id, {
        ...form,
        grade_level: parseInt(form.grade_level, 10),
      });
      closeEdit();
      fetchPassages();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Archive ───────────────────────────────────────────────
  async function handleArchive(passage, e) {
    e.stopPropagation();
    if (!confirm(`Archive "${passage.title}"?\nIt will no longer appear in active assessment lists.`)) return;
    try {
      await passagesApi.archive(passage.id);
      fetchPassages();
    } catch (err) {
      alert(err.message);
    }
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <Layout>
      <div className="passages">

        {/* ── Page title ── */}
        <h1 className="passages__title">Reading Passages</h1>

        {/* ── Toolbar: subtitle+count LEFT / search+filter+add RIGHT ── */}
        <div className="passages__toolbar">
          <div className="passages__toolbar-left">
            <h2 className="passages__subtitle">All Passages</h2>
            <span className="passages__count">{displayed.length} passages</span>
          </div>

          <div className="passages__toolbar-right">
            {/* Search */}
            <div className="passages__search">
              <Search size={14} className="passages__search-icon" />
              <input
                type="text"
                className="passages__search-input"
                placeholder="Search Passage"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="passages__search-clear"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter */}
            <FilterButton
              filters={FILTER_CONFIG}
              values={filters}
              onChange={handleFilterChange}
              onClear={clearFilters}
            />

            {/* Add Passage */}
            <AppButton
              variant="teal"
              onClick={() => navigate("/passages/add")}
            >
              <Plus size={15} />
              Add Passage
            </AppButton>
          </div>
        </div>

        {/* ── Active filter pills ── */}
        {activePills.length > 0 && (
          <div className="passages__pills">
            {activePills.map((p) => (
              <span key={p.key} className="passages__pill">
                {p.label}
                <button
                  onClick={() => handleFilterChange(p.key, "")}
                  aria-label={`Remove ${p.label} filter`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            <button className="passages__pill-clear" onClick={clearFilters}>
              Clear all
            </button>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="passages__state">
            <div className="passages__spinner" />
            <p>Loading passages…</p>
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div className="passages__state passages__state--error">
            <p>⚠ {error}</p>
            <AppButton variant="outline" size="sm" onClick={fetchPassages}>
              Retry
            </AppButton>
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && !error && displayed.length === 0 && (
          <div className="passages__state">
            <FileText size={42} strokeWidth={1.2} />
            <p>
              {search || activePills.length > 0
                ? "No passages match your search."
                : "No passages yet."}
            </p>
            {!search && activePills.length === 0 && (
              <AppButton variant="teal" onClick={() => navigate("/passages/add")}>
                <Plus size={15} /> Add your first passage
              </AppButton>
            )}
          </div>
        )}

        {/* ── Passage grid ── */}
        {!loading && !error && displayed.length > 0 && (
          <div className="passages__grid">
            {displayed.map((passage) => (
              <PassageCard
                key={passage.id}
                passage={passage}
                onClick={() => setDetailPassage(passage)}
                onEdit={openEdit}
                onArchive={handleArchive}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editTarget && (
        <PassageModal
          mode="edit"
          form={form}
          setForm={setForm}
          onSubmit={handleEditSubmit}
          onClose={closeEdit}
          saving={saving}
          formError={formError}
        />
      )}

      {/* ── Detail Drawer ── */}
      {detailPassage && (
        <DetailDrawer
          passage={detailPassage}
          onClose={() => setDetailPassage(null)}
          onEdit={(p) => {
            setDetailPassage(null);
            openEdit(p, { stopPropagation: () => {} });
          }}
        />
      )}
    </Layout>
  );
}
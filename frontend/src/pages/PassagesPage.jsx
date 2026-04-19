// ============================================================
// HearMeRead — Reading Passages Page
// Clean version: all sub-components live in /components/
// Connects to: GET /passages, POST /passages,
//              PUT /passages/:id, PATCH /passages/:id/archive
// ============================================================
import { useState, useEffect, useCallback } from "react";
import { Search, Plus, X, ChevronDown, FileText } from "lucide-react";

import Layout from "../components/Layout";
import PassageCard from "../components/PassageCard";
import PassageModal from "../components/PassageModal";
import DetailDrawer from "../components/DetailDrawer";
import { passagesApi } from "../services/api";

import "./PassagesPage.css";

// ── Constants ────────────────────────────────────────────────
const LANGUAGE_OPTIONS = [
  { value: "",         label: "All Languages" },
  { value: "filipino", label: "Filipino" },
  { value: "english",  label: "English" },
];

const GRADE_OPTIONS = ["", "1", "2", "3", "4", "5", "6"];

const EMPTY_FORM = {
  title: "",
  content: "",
  language: "filipino",
  grade_level: "2",
};

// ============================================================
// PassagesPage
// ============================================================
export default function PassagesPage() {
  // ── Data state ───────────────────────────────────────────
  const [passages, setPassages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  // ── Search & filter state ────────────────────────────────
  const [search, setSearch]           = useState("");
  const [filterOpen, setFilterOpen]   = useState(false);
  const [langFilter, setLangFilter]   = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "" | "active" | "archived"

  // ── Modal state ──────────────────────────────────────────
  const [modalMode, setModalMode]   = useState(null); // null | "add" | "edit"
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState(null);

  // ── Detail drawer state ──────────────────────────────────
  const [detailPassage, setDetailPassage] = useState(null);

  // ── Fetch passages from backend ──────────────────────────
  const fetchPassages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (langFilter)  params.language    = langFilter;
      if (gradeFilter) params.grade_level = gradeFilter;
      if (statusFilter) params.is_archived = statusFilter === "archived";
      const data = await passagesApi.list(params);
      setPassages(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [langFilter, gradeFilter, statusFilter]);

  useEffect(() => { fetchPassages(); }, [fetchPassages]);

  // ── Client-side search filter ────────────────────────────
  const displayed = passages.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.content?.toLowerCase().includes(q)
    );
  });

  // ── Modal helpers ────────────────────────────────────────
  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditTarget(null);
    setModalMode("add");
  }

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
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  // ── Submit add / edit ────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim())   { setFormError("Title is required.");            return; }
    if (!form.content.trim()) { setFormError("Passage content is required.");  return; }

    setSaving(true);
    setFormError(null);
    try {
      const payload = { ...form, grade_level: parseInt(form.grade_level, 10) };
      if (modalMode === "add") {
        await passagesApi.create(payload);
      } else {
        await passagesApi.update(editTarget.id, payload);
      }
      closeModal();
      fetchPassages();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Archive ──────────────────────────────────────────────
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

  // ── Clear all filters ────────────────────────────────────
  function clearFilters() {
    setLangFilter("");
    setGradeFilter("");
    setStatusFilter("");
    setFilterOpen(false);
  }

  const hasActiveFilters = langFilter || gradeFilter || statusFilter;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <Layout>
      <div className="passages">

        {/* ── Page header ── */}
        <div className="passages__header">
          <h1 className="passages__title">Reading Passages</h1>
          <button className="passages__add-btn" onClick={openAdd}>
            <Plus size={16} />
            Add Passage
          </button>
        </div>

        {/* ── Search + Filter toolbar ── */}
        <div className="passages__toolbar">
          {/* Search */}
          <div className="search-box">
            <Search size={15} className="search-box__icon" />
            <input
              className="search-box__input"
              type="text"
              placeholder="Search Passage"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-box__clear" onClick={() => setSearch("")} aria-label="Clear search">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter dropdown trigger */}
          <div className="filter-wrap">
            <button
              className={`filter-btn${filterOpen ? " filter-btn--active" : ""}`}
              onClick={() => setFilterOpen((o) => !o)}
            >
              Filter
              <ChevronDown size={14} className={filterOpen ? "chevron--up" : ""} />
            </button>

            {filterOpen && (
              <div className="filter-panel">
                <div className="filter-panel__row">
                  <label>Language</label>
                  <select value={langFilter} onChange={(e) => setLangFilter(e.target.value)}>
                    {LANGUAGE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-panel__row">
                  <label>Grade</label>
                  <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g === "" ? "All Grades" : `Grade ${g}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-panel__row">
                  <label>Status</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <button className="filter-panel__clear" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Active filter pills ── */}
        {hasActiveFilters && (
          <div className="passages__pills">
            {langFilter && (
              <span className="pill">
                {LANGUAGE_OPTIONS.find((o) => o.value === langFilter)?.label}
                <button onClick={() => setLangFilter("")} aria-label="Remove language filter"><X size={11} /></button>
              </span>
            )}
            {gradeFilter && (
              <span className="pill">
                Grade {gradeFilter}
                <button onClick={() => setGradeFilter("")} aria-label="Remove grade filter"><X size={11} /></button>
              </span>
            )}
            {statusFilter && (
              <span className="pill">
                {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                <button onClick={() => setStatusFilter("")} aria-label="Remove status filter"><X size={11} /></button>
              </span>
            )}
          </div>
        )}

        {/* ── Loading state ── */}
        {loading && (
          <div className="passages__state">
            <div className="spinner" />
            <p>Loading passages…</p>
          </div>
        )}

        {/* ── Error state ── */}
        {error && !loading && (
          <div className="passages__state passages__state--error">
            <p>⚠ {error}</p>
            <button className="passages__retry-btn" onClick={fetchPassages}>
              Retry
            </button>
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && !error && displayed.length === 0 && (
          <div className="passages__state">
            <FileText size={40} strokeWidth={1.2} />
            <p>{search || hasActiveFilters ? "No passages match your search." : "No passages yet."}</p>
            {!search && !hasActiveFilters && (
              <button className="passages__add-btn passages__add-btn--sm" onClick={openAdd}>
                Add your first passage
              </button>
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

      {/* ── Add / Edit Modal ── */}
      {modalMode && (
        <PassageModal
          mode={modalMode}
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onClose={closeModal}
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
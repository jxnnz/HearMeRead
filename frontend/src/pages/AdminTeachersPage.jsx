import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, Pencil, Archive, X, ChevronLeft,
  ChevronRight, Check, AlertCircle, Activity, CalendarDays,
  Search, ArrowUpDown,
} from "lucide-react";
import Layout from "../components/Layout";
import TopBar from "../components/TopBar";
import ConfirmModal from "../modals/ConfirmModal";
import { adminApi } from "../services/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

const GRADE_OPTIONS = [
  { value: "",        label: "Not set" },
  { value: "grade_1", label: "Grade 1" },
  { value: "grade_2", label: "Grade 2" },
  { value: "grade_3", label: "Grade 3" },
];

function formatGrade(gl) {
  if (!gl) return "—";
  if (gl === "kindergarten") return "Kindergarten";
  return `Grade ${gl.replace("grade_", "")}`;
}

function formatAction(action) {
  return action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatTs(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

const ACTION_COLORS = {
  logged_in:        { bg: "#e8f5e9", color: "#27ae60" },
  created_student:  { bg: "#e3f2fd", color: "#1565c0" },
  archived_student: { bg: "#fff3e0", color: "#e65100" },
  uploaded_passage: { bg: "#f3e5f5", color: "#6a1b9a" },
  started_session:  { bg: "#e8eaf6", color: "#283593" },
  completed_session:{ bg: "#e0f2f1", color: "#00695c" },
  archived_session: { bg: "#fce4ec", color: "#880e4f" },
};

function ActionBadge({ action }) {
  const { bg, color } = ACTION_COLORS[action] ?? { bg: "#f5f5f5", color: "#555" };
  return (
    <span style={{
      background: bg, color, borderRadius: 20,
      padding: "2px 8px", fontSize: 11, fontWeight: 600,
    }}>
      {formatAction(action)}
    </span>
  );
}

// ── Assign Modal ──────────────────────────────────────────────────────────────

function AssignTeacherModal({ teacher, onClose, onSaved }) {
  const currentYear = new Date().getFullYear();
  const fallbackSY = `${currentYear}-${currentYear + 1}`;
  // Remember the last school year the admin used
  const savedSY = localStorage.getItem("admin_last_school_year") || fallbackSY;

  const [form, setForm] = useState({
    grade_level: teacher.grade_level ?? "",
    section:     teacher.section     ?? "",
    school_year: savedSY,
  });
  const [saving, setSaving]  = useState(false);
  const [error,  setError]   = useState(null);

  async function handleSave() {
    if (!form.grade_level || !form.section) {
      setError("Grade level and section are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await adminApi.createAssignment({
        teacher_id:  teacher.id,
        grade_level: form.grade_level,
        section:     form.section,
        school_year: form.school_year,
      });
      // Persist school year for next time
      localStorage.setItem("admin_last_school_year", form.school_year);
      onSaved();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === "string" ? detail
        : Array.isArray(detail) ? detail.map(d => d.msg).join("; ")
        : "Failed to assign teacher."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "9px 12px", border: "1.5px solid #2c3e6b",
    borderRadius: 8, fontSize: 13, fontFamily: "Poppins, sans-serif",
    outline: "none", boxSizing: "border-box",
    background: "transparent", color: "#1a2340",
  };
  const labelStyle = {
    fontSize: 11, fontWeight: 600, color: "#4a5568",
    textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5, display: "block",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420,
        boxShadow: "0 8px 32px rgba(0,0,0,.18)", padding: "28px 28px 24px",
        fontFamily: "Poppins, sans-serif",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a2340" }}>
              Assign Teacher
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#8a94b2" }}>
              {teacher.first_name} {teacher.last_name}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={18} color="#8a94b2" />
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>School Year</label>
          <input
            style={inputStyle}
            value={form.school_year}
            onChange={e => setForm(f => ({ ...f, school_year: e.target.value }))}
            placeholder="e.g. 2025-2026"
            maxLength={9}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Grade Level</label>
          <select
            style={{ ...inputStyle, background: "transparent" }}
            value={form.grade_level}
            onChange={e => setForm(f => ({ ...f, grade_level: e.target.value }))}
          >
            <option value="" disabled>Select grade level</option>
            {GRADE_OPTIONS.filter(o => o.value !== "").map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Section</label>
          <input
            style={inputStyle}
            value={form.section}
            onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
            placeholder="e.g. Sampaguita"
            maxLength={100}
          />
        </div>

        {error && (
          <div style={{
            background: "#fde8e8", border: "1px solid #f5c6c6", borderRadius: 8,
            padding: "9px 12px", marginBottom: 14,
            display: "flex", gap: 8, alignItems: "center",
          }}>
            <AlertCircle size={14} color="#c0392b" />
            <span style={{ fontSize: 12, color: "#c0392b" }}>{error}</span>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "9px 18px", borderRadius: 8, border: "1.5px solid #dde1ee",
            background: "#fff", cursor: "pointer", fontSize: 13,
            fontFamily: "Poppins, sans-serif", color: "#4a5568",
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: "9px 18px", borderRadius: 8, border: "none",
            background: saving ? "#a0b4d6" : "#2c7fc1",
            color: "#fff", cursor: saving ? "not-allowed" : "pointer",
            fontSize: 13, fontFamily: "Poppins, sans-serif", fontWeight: 600,
          }}>{saving ? "Assigning…" : "Assign"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditTeacherModal({ teacher, onClose, onSaved }) {
  const [form, setForm] = useState({
    employee_id: teacher.employee_id ?? "",
    grade_level: teacher.grade_level ?? "",
    section:     teacher.section     ?? "",
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        grade_level: form.grade_level || null,
        section:     form.section     || null,
      };
      await adminApi.updateTeacher(teacher.id, payload);
      onSaved();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        Array.isArray(detail) ? detail.map(d => d.msg).join("; ")
        : typeof detail === "string" ? detail
        : "Save failed. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "9px 12px", border: "1.5px solid #2c3e6b",
    borderRadius: 8, fontSize: 13, fontFamily: "Poppins, sans-serif",
    outline: "none", boxSizing: "border-box",
    background: "transparent", color: "#1a2340",
  };
  const labelStyle = {
    fontSize: 11, fontWeight: 600, color: "#4a5568",
    textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5, display: "block",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420,
        boxShadow: "0 8px 32px rgba(0,0,0,.18)", padding: "28px 28px 24px",
        fontFamily: "Poppins, sans-serif",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a2340" }}>
              Edit Teacher Info
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#8a94b2" }}>
              {teacher.first_name} {teacher.last_name}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={18} color="#8a94b2" />
          </button>
        </div>

        {/* Employee ID — read-only for admin */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Employee ID</label>
          <input
            style={{ ...inputStyle, background: "#f3f5fa", color: "#6b7280", cursor: "not-allowed" }}
            value={form.employee_id}
            readOnly
          />
          <span style={{ fontSize: 10, color: "#8a94b2", marginTop: 3, display: "block" }}>
            Permanent ID — set by the teacher and cannot be changed here.
          </span>
        </div>

        {/* Grade Level */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Grade Level</label>
          <select
            style={{ ...inputStyle, background: "transparent" }}
            value={form.grade_level}
            onChange={e => setForm(f => ({ ...f, grade_level: e.target.value }))}
          >
            {GRADE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Section */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Section</label>
          <input
            style={inputStyle}
            value={form.section}
            onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
            placeholder="e.g. Sampaguita"
            maxLength={100}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "#fde8e8", border: "1px solid #f5c6c6", borderRadius: 8,
            padding: "9px 12px", marginBottom: 14,
            display: "flex", gap: 8, alignItems: "center",
          }}>
            <AlertCircle size={14} color="#c0392b" />
            <span style={{ fontSize: 12, color: "#c0392b" }}>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "9px 18px", borderRadius: 8,
              border: "1.5px solid #dde1ee", background: "#fff",
              cursor: "pointer", fontSize: 13, fontFamily: "Poppins, sans-serif",
              color: "#4a5568",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "9px 18px", borderRadius: 8, border: "none",
              background: saving ? "#a0b4d6" : "#2c7fc1",
              color: "#fff", cursor: saving ? "not-allowed" : "pointer",
              fontSize: 13, fontFamily: "Poppins, sans-serif", fontWeight: 600,
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Logs Drawer ───────────────────────────────────────────────────────────────

const DAY_FILTERS = [
  { key: "all",        label: "All" },
  { key: "today",      label: "Today" },
  { key: "yesterday",  label: "Yesterday" },
  { key: "this_week",  label: "This Week" },
  { key: "last_week",  label: "Last Week" },
];

function getDateRange(filterKey) {
  const now = new Date();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay   = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (filterKey) {
    case "today":
      return [startOfDay(now), endOfDay(now)];
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return [startOfDay(y), endOfDay(y)];
    }
    case "this_week": {
      const d = new Date(now);
      const day = d.getDay(); // 0=Sun
      d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); // Monday
      return [startOfDay(d), endOfDay(now)];
    }
    case "last_week": {
      const d = new Date(now);
      const day = d.getDay();
      const thisMonday = new Date(d);
      thisMonday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(thisMonday.getDate() - 7);
      const lastSunday = new Date(thisMonday);
      lastSunday.setDate(thisMonday.getDate() - 1);
      return [startOfDay(lastMonday), endOfDay(lastSunday)];
    }
    default:
      return null; // "all"
  }
}

function LogsDrawer({ teacher, onClose }) {
  const [allLogs,   setAllLogs]   = useState([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);

  // Search & filter state
  const [search,    setSearch]    = useState("");
  const [dayFilter, setDayFilter] = useState("all");

  // Display pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch a large batch for client-side search/filter
      const data = await adminApi.getTeacherLogs(teacher.id, { page: 1, page_size: 100 });
      setAllLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [teacher.id]);

  useEffect(() => { load(); }, [load]);

  // Reset page when search or filter changes
  useEffect(() => { setPage(1); }, [search, dayFilter]);

  // Filtered logs
  const filtered = useMemo(() => {
    let list = [...allLogs];

    // Day filter
    const range = getDateRange(dayFilter);
    if (range) {
      const [start, end] = range;
      list = list.filter(log => {
        const d = new Date(log.created_at);
        return d >= start && d <= end;
      });
    }

    // Search filter — matches activity, date string, time string, and metadata
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(log => {
        const action = formatAction(log.action).toLowerCase();
        const ts = formatTs(log.created_at).toLowerCase();
        const meta = log.log_metadata
          ? Object.entries(log.log_metadata).map(([k, v]) => `${k} ${v}`).join(" ").toLowerCase()
          : "";
        return action.includes(q) || ts.includes(q) || meta.includes(q);
      });
    }

    return list;
  }, [allLogs, search, dayFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);



  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 900,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)" }}
      />
      {/* Full-screen Panel */}
      <div style={{
        position: "relative", zIndex: 1,
        background: "#fff", width: "100%", height: "100%",
        maxWidth: 1200, maxHeight: "100%",
        borderRadius: 16,
        display: "flex", flexDirection: "column",
        boxShadow: "0 8px 40px rgba(0,0,0,.2)",
        fontFamily: "Poppins, sans-serif",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 28px", borderBottom: "1px solid #eef0f8",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a2340" }}>
              Activity Logs
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#4a5568" }}>
              {teacher.first_name} {teacher.last_name} · {filtered.length} of {total} entries
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}>
            <X size={20} color="#8a94b2" />
          </button>
        </div>

        {/* Search + Day filters toolbar */}
        <div style={{
          padding: "14px 28px", borderBottom: "1px solid #eef0f8",
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          flexShrink: 0,
        }}>
          {/* Search bar */}
          <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 360 }}>
            <Search size={14} color="#8a94b2" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
            <input
              style={{
                width: "100%", padding: "8px 12px 8px 34px",
                border: "1.5px solid #dde1ee", borderRadius: 8,
                fontSize: 13, fontFamily: "Poppins, sans-serif",
                outline: "none", background: "#fff", color: "#1a2340",
                boxSizing: "border-box",
              }}
              placeholder="Search activity, date, or time…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Day filter dropdown */}
          <select
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
            style={{
              padding: "8px 12px", border: "1.5px solid #dde1ee", borderRadius: 8,
              fontSize: 13, fontFamily: "Poppins, sans-serif", fontWeight: 600,
              outline: "none", background: "#fff", color: "#1a2340",
              cursor: "pointer",
            }}
          >
            {DAY_FILTERS.map(f => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Log list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 28px" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#4a5568", fontSize: 14 }}>
              Loading…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#4a5568", fontSize: 14 }}>
              {search || dayFilter !== "all" ? "No logs match your search or filter." : "No activity recorded yet."}
            </div>
          )}
          {!loading && paginated.map(log => (
            <div key={log.id} style={{
              borderBottom: "1px solid #f0f2f8",
              padding: "14px 0",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <ActionBadge action={log.action} />
                <span style={{ fontSize: 11, color: "#1a2340", flexShrink: 0, fontWeight: 500 }}>
                  {formatTs(log.created_at)}
                </span>
              </div>
              {log.log_metadata && Object.keys(log.log_metadata).length > 0 && (
                <div style={{
                  marginTop: 8, fontSize: 12, color: "#1a2340",
                  background: "#f8f9fd", borderRadius: 8, padding: "8px 12px",
                }}>
                  {Object.entries(log.log_metadata).map(([k, v]) => (
                    <span key={k} style={{ marginRight: 16 }}>
                      <strong>{k}:</strong> {v ?? "—"}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div style={{
            padding: "14px 28px", borderTop: "1px solid #eef0f8",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 12, color: "#1a2340", fontWeight: 500 }}>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#1a2340", fontWeight: 500 }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  border: "1.5px solid #dde1ee", background: "#fff",
                  borderRadius: 6, padding: "4px 8px", cursor: page === 1 ? "not-allowed" : "pointer",
                }}
              >
                <ChevronLeft size={14} color={page === 1 ? "#c0c8d8" : "#4a5568"} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  border: "1.5px solid #dde1ee", background: "#fff",
                  borderRadius: 6, padding: "4px 8px",
                  cursor: page === totalPages ? "not-allowed" : "pointer",
                }}
              >
                <ChevronRight size={14} color={page === totalPages ? "#c0c8d8" : "#4a5568"} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminTeachersPage() {
  const [teachers,  setTeachers]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const [editTeacher,   setEditTeacher]   = useState(null);
  const [assignTeacher, setAssignTeacher] = useState(null);
  const [logsTeacher,   setLogsTeacher]   = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving,     setArchiving]     = useState(false);

  // Search, sort, pagination
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name"); // "name" | "grade"
  const [page,   setPage]   = useState(1);
  const PAGE_SIZE = 10;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getTeachers();
      setTeachers(data);
    } catch {
      setError("Failed to load teachers. Please refresh.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Reset page when search changes
  useEffect(() => { setPage(1); }, [search]);

  async function handleArchive() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await adminApi.archiveTeacher(archiveTarget.id);
      setArchiveTarget(null);
      load();
    } catch {
      // keep modal open
    } finally {
      setArchiving(false);
    }
  }

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let list = [...teachers];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        `${t.first_name} ${t.last_name}`.toLowerCase().includes(q) ||
        (t.email || "").toLowerCase().includes(q) ||
        (t.employee_id || "").toLowerCase().includes(q) ||
        (t.section || "").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortBy === "grade") {
        return (a.grade_level || "zzz").localeCompare(b.grade_level || "zzz");
      }
      return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
    });
    return list;
  }, [teachers, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const thStyle = {
    textAlign: "left", padding: "8px 12px",
    color: "#1a2340", fontWeight: 700,
    fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px",
    borderBottom: "2px solid #e8eaf2", whiteSpace: "nowrap",
  };
  const tdStyle = {
    padding: "11px 12px", borderBottom: "1px solid #f0f2f8",
    fontSize: 13, color: "#1a2340", verticalAlign: "middle",
  };
  const inputStyle = {
    padding: "8px 12px 8px 34px", border: "1.5px solid #dde1ee", borderRadius: 8,
    fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none",
    background: "#fff", color: "#1a2340", width: 240,
  };
  const sortBtnStyle = (active) => ({
    padding: "7px 12px", border: `1.5px solid ${active ? "#2c3e6b" : "#dde1ee"}`,
    borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
    background: active ? "#eef3ff" : "#fff", color: active ? "#2c5fc1" : "#4a5568",
    display: "flex", alignItems: "center", gap: 4, fontFamily: "Poppins, sans-serif",
  });

  return (
    <Layout>
      <div style={{ fontFamily: "Poppins, sans-serif", width: "100%" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1a2340", margin: "0 0 24px", fontFamily: "Poppins, sans-serif" }}>
          Teachers
        </h1>

        <div style={{
          background: "#fff", borderRadius: 16,
          boxShadow: "0 2px 16px rgba(44,62,107,.09)",
          padding: "24px 28px",
        }}>
          {/* Toolbar: count + search + sort */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={16} color="#2c7fc1" />
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1a2340" }}>
                Teachers {!loading && `(${filtered.length})`}
              </h2>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Search */}
              <div style={{ position: "relative" }}>
                <Search size={14} color="#8a94b2" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  style={inputStyle}
                  placeholder="Search teachers…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* Sort buttons */}
              <button style={sortBtnStyle(sortBy === "name")} onClick={() => setSortBy("name")}>
                <ArrowUpDown size={12} /> Name
              </button>
              <button style={sortBtnStyle(sortBy === "grade")} onClick={() => setSortBy("grade")}>
                <ArrowUpDown size={12} /> Grade
              </button>
            </div>
          </div>

          {loading && (
            <div style={{ padding: "40px 0", textAlign: "center", color: "#8a94b2", fontSize: 13 }}>
              Loading teachers…
            </div>
          )}

          {error && !loading && (
            <div style={{ padding: "40px 0", textAlign: "center", color: "#c0392b", fontSize: 13 }}>
              {error}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div style={{ padding: "40px 0", textAlign: "center", color: "#8a94b2", fontSize: 13 }}>
              {search ? "No teachers match your search." : "No teachers have joined your school yet."}
            </div>
          )}

          {!loading && !error && paginated.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Name", "Email", "Employee ID", "Grade Level", "Section", "Verified", "Status", ""].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(t => (
                    <tr key={t.id} style={{ opacity: t.is_active ? 1 : 0.5 }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>
                        {t.first_name} {t.last_name}
                      </td>
                      <td style={{ ...tdStyle, color: "#4a5568" }}>{t.email}</td>
                      <td style={{ ...tdStyle, fontFamily: "monospace", letterSpacing: 1 }}>
                        {t.employee_id ?? <span style={{ color: "#c0c8d8" }}>—</span>}
                      </td>
                      <td style={tdStyle}>{formatGrade(t.grade_level)}</td>
                      <td style={tdStyle}>{t.section ?? <span style={{ color: "#c0c8d8" }}>—</span>}</td>
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                          background: t.is_verified ? "#e8f5e9" : "#fff3e0",
                          color: t.is_verified ? "#27ae60" : "#f39c12",
                          display: "inline-flex", alignItems: "center", gap: 3,
                        }}>
                          {t.is_verified && <Check size={9} />}
                          {t.is_verified ? "Verified" : "Pending"}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                          background: t.is_active ? "#e8f5e9" : "#f5f5f5",
                          color: t.is_active ? "#27ae60" : "#9e9e9e",
                        }}>
                          {t.is_active ? "Active" : "Archived"}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => setAssignTeacher(t)} title="Assign grade & section" style={{ background: "#e8f5e9", border: "none", borderRadius: 7, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#27ae60", fontSize: 11, fontFamily: "Poppins, sans-serif" }}>
                            <CalendarDays size={13} /> Assign
                          </button>
                          <button onClick={() => setLogsTeacher(t)} title="View activity logs" style={{ background: "#f0f6ff", border: "none", borderRadius: 7, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#2c7fc1", fontSize: 11, fontFamily: "Poppins, sans-serif" }}>
                            <Activity size={13} /> Logs
                          </button>
                          {t.is_active && (
                            <>
                              <button onClick={() => setEditTeacher(t)} title="Edit" style={{ background: "#f0f6ff", border: "none", borderRadius: 7, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#2c7fc1", fontSize: 11, fontFamily: "Poppins, sans-serif" }}>
                                <Pencil size={13} /> Edit
                              </button>
                              <button onClick={() => setArchiveTarget(t)} title="Archive" style={{ background: "#fff3e0", border: "none", borderRadius: 7, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#e65100", fontSize: 11, fontFamily: "Poppins, sans-serif" }}>
                                <Archive size={13} /> Archive
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && filtered.length > PAGE_SIZE && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, padding: "10px 0 0", borderTop: "1px solid #eef0f8" }}>
              <span style={{ fontSize: 12, color: "#8a94b2" }}>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#8a94b2" }}>
                  Page {page} of {totalPages}
                </span>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ border: "1.5px solid #dde1ee", background: "#fff", borderRadius: 6, padding: "4px 8px", cursor: page === 1 ? "not-allowed" : "pointer" }}>
                  <ChevronLeft size={14} color={page === 1 ? "#c0c8d8" : "#4a5568"} />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ border: "1.5px solid #dde1ee", background: "#fff", borderRadius: 6, padding: "4px 8px", cursor: page === totalPages ? "not-allowed" : "pointer" }}>
                  <ChevronRight size={14} color={page === totalPages ? "#c0c8d8" : "#4a5568"} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Assign modal ── */}
      {assignTeacher && (
        <AssignTeacherModal
          teacher={assignTeacher}
          onClose={() => setAssignTeacher(null)}
          onSaved={() => { setAssignTeacher(null); load(); }}
        />
      )}

      {/* ── Edit modal ── */}
      {editTeacher && (
        <EditTeacherModal
          teacher={editTeacher}
          onClose={() => setEditTeacher(null)}
          onSaved={() => { setEditTeacher(null); load(); }}
        />
      )}

      {/* ── Archive confirm ── */}
      <ConfirmModal
        isOpen={!!archiveTarget}
        title="Archive Teacher?"
        message={archiveTarget ? (
          <>
            <strong>{archiveTarget.first_name} {archiveTarget.last_name}</strong> will be
            deactivated and will no longer be able to log in. This can be undone by contacting support.
          </>
        ) : ""}
        confirmLabel={archiving ? "Archiving..." : "Archive"}
        variant="danger"
        onConfirm={handleArchive}
        onClose={() => !archiving && setArchiveTarget(null)}
      />

      {/* ── Logs drawer ── */}
      {logsTeacher && (
        <LogsDrawer
          teacher={logsTeacher}
          onClose={() => setLogsTeacher(null)}
        />
      )}
    </Layout>
  );
}

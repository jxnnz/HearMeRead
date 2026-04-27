import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: `${API_BASE_URL}/routes`,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Attach token to every request automatically ───────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auto-logout on 401 (expired / invalid token) ─────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  /**
   * Login with email + password.
   * Returns { access_token, token_type }
   */
  login: async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    return res.data;
  },

  /**
   * Register a new teacher account.
   * Expects { first_name, last_name, email, password }
   */
  register: async (data) => {
    const res = await api.post("/auth/register", data);
    return res.data;
  },

  /**
   * Validate the stored token and return the current teacher's profile.
   * Call this on app load to check if the token is still valid.
   */
  me: async () => {
    const res = await api.get("/auth/me");
    return res.data;
  },

  resendVerification: async (email) => {
    const res = await api.post("/auth/resend-verification", { email });
    return res.data;
  },
};

// ── Passages ──────────────────────────────────────────────────────────────────
export const passagesApi = {
  /**
   * List passages with optional filters.
   * Params: { page, page_size, language, grade_level, include_archived }
   */
  list: async (params = {}) => {
    const res = await api.get("/passages", { params });
    return res.data;
  },

  get: async (id) => {
    const res = await api.get(`/passages/${id}`);
    return res.data;
  },

  /** Create a passage manually with a plain JSON body. */
  create: async (data) => {
    const res = await api.post("/passages", data);
    return res.data;
  },

  /** Update passage fields. Uses PATCH (partial update). */
  update: async (id, data) => {
    const res = await api.patch(`/passages/${id}`, data);
    return res.data;
  },

  /**
   * Soft-delete (archive) a passage.
   * Backend: DELETE /passages/:id
   */
  archive: async (id) => {
    const res = await api.delete(`/passages/${id}`);
    return res.data;
  },

  /**
   * Upload a .docx containing BOTH the passage and questions
   * (uses [PASSAGE] / [QUESTIONS] section markers).
   * formData must include: file (Blob), title, language, grade_level
   */
  uploadCombined: async (formData) => {
    const res = await api.post("/passages/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  /**
   * Upload a .docx containing only the passage text (no section markers needed).
   * formData must include: file (Blob), title, language, grade_level
   */
  uploadPassageOnly: async (formData) => {
    const res = await api.post("/passages/upload/passage-only", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};

// ── Questions ─────────────────────────────────────────────────────────────────
export const questionsApi = {
  /** List all questions for a passage. */
  list: async (passageId, params = {}) => {
    const res = await api.get(`/passages/${passageId}/questions`, { params });
    return res.data;
  },

  /** Add a single question to a passage manually. */
  create: async (passageId, data) => {
    const res = await api.post(`/passages/${passageId}/questions`, data);
    return res.data;
  },

  /**
   * Bulk-upload questions from a .docx file.
   * formData must include: file (Blob)
   */
  uploadBulk: async (passageId, formData) => {
    const res = await api.post(
      `/passages/${passageId}/questions/upload`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res.data;
  },

  /** Update a question's text. Uses PATCH. */
  update: async (questionId, data) => {
    const res = await api.patch(`/questions/${questionId}`, data);
    return res.data;
  },

  /** Soft-delete (archive) a question. */
  archive: async (questionId) => {
    const res = await api.delete(`/questions/${questionId}`);
    return res.data;
  },
};

// ── Students ──────────────────────────────────────────────────────────────────
export const studentsApi = {
  /**
   * List students with optional filters.
   * Params: { page, page_size, search, grade_level }
   */
  list: async (params = {}) => {
    const res = await api.get("/students", { params });
    return res.data;
  },

  get: async (id) => {
    const res = await api.get(`/students/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await api.post("/students", data);
    return res.data;
  },

  /** Update student fields. Uses PATCH (partial update). */
  update: async (id, data) => {
    const res = await api.patch(`/students/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/students/${id}`);
    return res.data;
  },

  /**
   * List all assessment sessions for a specific student.
   * Params: { school_year, period, page, page_size }
   */
  listSessions: async (studentId, params = {}) => {
    const res = await api.get(`/students/${studentId}/sessions`, { params });
    return res.data;
  },
};

// ── Sessions ──────────────────────────────────────────────────────────────────
export const sessionsApi = {
  /**
   * List sessions with optional filters.
   * Params: { page, page_size, student_id, school_year, period, is_completed, include_archived }
   * NOTE: May return 207 if a duplicate was created.
   */
  create: async (data) => {
    const res = await api.post("/sessions", data);
    return res.data;
  },

  /**
   * Submit assessment results and mark the session as complete.
   * Computes CWPM automatically on the backend.
   */
  complete: async (id, data) => {
    const res = await api.post(`/sessions/${id}/complete`, data);
    return res.data;
  },

  list: async (params = {}) => {
    const res = await api.get("/sessions", { params });
    return res.data;
  },

  get: async (id) => {
    const res = await api.get(`/sessions/${id}`);
    return res.data;
  },

  /**
   * Update session metadata (e.g. school_year, period, passage).
   * Uses PATCH. May return 207 if this creates a duplicate.
   */
  update: async (id, data) => {
    const res = await api.patch(`/sessions/${id}`, data);
    return res.data;
  },

  /** Soft-delete (archive) a session. */
  archive: async (id) => {
    const res = await api.delete(`/sessions/${id}`);
    return res.data;
  },

  /**
   * Upload an audio recording for transcription via Whisper ASR.
   * formData must include: audio (Blob/File)
   * Returns: { session_id, transcript, words, language, model_used, word_count,
   *            audio_stored, audio_expires_at }
   *
   * NOTE: This does NOT complete the session — the teacher reviews the
   * transcript first before calling sessionsApi.complete().
   */
  transcribe: async (sessionId, formData) => {
    const res = await api.post(`/sessions/${sessionId}/transcribe`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};

export default api;
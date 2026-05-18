import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000" || "http://hearmeread-production.up.railway.app";

// Axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/routes`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401 (expired / invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? "";
    const isUnauthRoute =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/forgot-password") ||
      url.includes("/auth/reset-password") ||
      url.includes("/auth/resend-verification") ||
      url.includes("/auth/school-lookup");

    if (error.response?.status === 401 && !isUnauthRoute) {
      localStorage.removeItem("token");
      window.dispatchEvent(new CustomEvent("session-expired"));
    }
    return Promise.reject(error);
  }
);

// In-Memory Cache Helper
const apiCache = new Map();

async function withCache(key, fetcher, ttl = 300000) { // Default 5 min TTL
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  const data = await fetcher();
  apiCache.set(key, { data, timestamp: Date.now() });
  return data;
}

export function clearApiCache() {
  apiCache.clear();
}

// Auth
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

  updateProfile: async (data) => {
    const res = await api.patch("/auth/me", data);
    return res.data;
  },

  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/auth/me/profile-picture", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  resendVerification: async (email) => {
    const res = await api.post("/auth/resend-verification", { email });
    return res.data;
  },

  forgotPassword: async (email) => {
    const res = await api.post("/auth/forgot-password", { email });
    return res.data;
  },

  resetPassword: async (token, newPassword) => {
    const res = await api.post("/auth/reset-password", { token, new_password: newPassword });
    return res.data;
  },

  lookupSchool: async ({ schoolCode, depedSchoolId } = {}) => {
    const params = {};
    if (schoolCode)    params.school_code = schoolCode;
    if (depedSchoolId) params.school_id   = depedSchoolId;
    const res = await api.get("/auth/school-lookup", { params });
    return res.data;
  },
};

// Admin
export const adminApi = {
  getDashboard: async () => {
    return withCache("admin_dashboard", async () => {
      const res = await api.get("/admin/dashboard");
      return res.data;
    });
  },

  getTeachers: async () => {
    const res = await api.get("/admin/teachers");
    return res.data;
  },

  updateTeacher: async (teacherId, data) => {
    const res = await api.patch(`/admin/teachers/${teacherId}`, data);
    return res.data;
  },

  archiveTeacher: async (teacherId) => {
    const res = await api.patch(`/admin/teachers/${teacherId}/archive`);
    return res.data;
  },

  getTeacherLogs: async (teacherId, params = {}) => {
    const res = await api.get(`/admin/teachers/${teacherId}/logs`, { params });
    return res.data;
  },

  getClassCards: async () => {
    const res = await api.get("/admin/students");
    return res.data;
  },

  getClassRecord: async (teacherId, params = {}) => {
    const res = await api.get(`/admin/students/${teacherId}`, { params });
    return res.data;
  },

  reassignStudents: async (payload) => {
    const res = await api.post("/admin/students/reassign", payload);
    return res.data;
  },

  // Teacher Assignments
  getAssignments: async (params = {}) => {
    const res = await api.get("/admin/assignments", { params });
    return res.data;
  },

  createAssignment: async (data) => {
    const res = await api.post("/admin/assignments", data);
    return res.data;
  },

  updateAssignment: async (id, data) => {
    const res = await api.patch(`/admin/assignments/${id}`, data);
    return res.data;
  },

  deleteAssignment: async (id) => {
    const res = await api.delete(`/admin/assignments/${id}`);
    return res.data;
  },

  // Public Passage Management
  listPassages: async (params = {}) => {
    const res = await api.get("/admin/passages", { params });
    return res.data;
  },

  createPassage: async (data) => {
    const res = await api.post("/admin/passages", data);
    return res.data;
  },

  updatePassage: async (id, data) => {
    const res = await api.patch(`/admin/passages/${id}`, data);
    return res.data;
  },

  archivePassage: async (id) => {
    const res = await api.delete(`/admin/passages/${id}`);
    return res.data;
  },
};

// Passages
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

// Questions
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

// Students
export const studentsApi = {
  /**
   * List students with optional filters.
   * Params: { page, page_size, search, grade_level }
   */
  list: async (params = {}) => {
    const res = await api.get("/students", { params });
    return res.data;
  },

  listClasses: async () => {
    const res = await api.get("/students/classes");
    return res.data;
  },

  listSchoolYears: async () => {
    const res = await api.get("/students/school-years");
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

  importExcel: async (formData) => {
    const res = await api.post("/students/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};

// Sessions
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

  /**
   * Score Task 1 only using Levenshtein alignment.
   * Does NOT mark the session as complete.
   * Returns: { task1_correct, task1_miscues, route, task2_type, alignments }
   */
  scoreTask1: async (sessionId, data) => {
    const res = await api.post(`/sessions/${sessionId}/score-task1`, data);
    return res.data;
  },

  /**
   * Score Part 1 (both Task 1 + Task 2) using Levenshtein alignment.
   * Does NOT mark the session as complete.
   * Returns: { task1_correct, task2_correct, total_score, classification, route, … }
   */
  scorePart1: async (sessionId, data) => {
    const res = await api.post(`/sessions/${sessionId}/score-part1`, data);
    return res.data;
  },

  saveObservation: async (sessionId, data) => {
    const res = await api.post(`/sessions/${sessionId}/observe`, data);
    return res.data;
  },
};

// Dashboard
export const dashboardApi = {
  /**
   * Fetch all dashboard summary stats and chart data for a school year.
   * Params: school_year (optional, e.g. "2024-2025") — defaults to current year.
   * Returns: { school_year, stats, profile_distribution, gender_distribution,
   *            fluency_accuracy, fluency_wpm }
   */
  getSummary: async (schoolYear) => {
    return withCache(`dashboard_summary_${schoolYear || 'current'}`, async () => {
      const params = schoolYear ? { school_year: schoolYear } : {};
      const res = await api.get("/dashboard/summary", { params });
      return res.data;
    });
  },
};

export default api;
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Axios instance ────────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Attach token to every request automatically ───────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  login: async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    return res.data; // { access_token: "..." }
  },
  register: async (data) => {
    const res = await api.post("/auth/register", data);
    return res.data;
  },
};

// ── Passages ──────────────────────────────────────────────────
export const passagesApi = {
  list: async (params = {}) => {
    const res = await api.get("/passages", { params });
    return res.data;
  },
  get: async (id) => {
    const res = await api.get(`/passages/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post("/passages", data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/passages/${id}`, data);
    return res.data;
  },
  archive: async (id) => {
    const res = await api.patch(`/passages/${id}/archive`);
    return res.data;
  },
  createQuestion: async (passageId, data) => {
    const res = await api.post(`/passages/${passageId}/questions`, data);
    return res.data;
  },
};

// ── Students ──────────────────────────────────────────────────
export const studentsApi = {
  list: async () => {
    const res = await api.get("/students");
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
  update: async (id, data) => {
    const res = await api.put(`/students/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/students/${id}`);
    return res.data;
  },
};

// ── Sessions ──────────────────────────────────────────────────
export const sessionsApi = {
  create: async (data) => {
    const res = await api.post("/sessions", data);
    return res.data;
  },
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
};

export default api;
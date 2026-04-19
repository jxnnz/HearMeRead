import axios from "axios";

const API_BASE_URL = "http://localhost:8000"; // change this to your backend URL

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const authApi = {
  login: async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    return res.data; // expects { access_token: "..." }
  },
};

export const passagesApi = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/passages${q ? "?" + q : ""}`);
  },
  get: (id) => request(`/passages/${id}`),
  create: (data) =>
    request("/passages", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/passages/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  archive: (id) =>
    request(`/passages/${id}/archive`, { method: "PATCH" }),
};

export default api;
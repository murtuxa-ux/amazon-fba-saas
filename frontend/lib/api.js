/**
 * Ecom Era FBA SaaS v6.0 — Centralized API Client
 * JWT-authenticated Axios instance with interceptors
 * Exports: api (default), API_BASE, authAPI, token helpers, user helpers
 */
import axios from "axios";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://amazon-fba-saas-production.up.railway.app";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// ── Token helpers ────────────────────────────────────────────────────────────
function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ecomera_token") || null;
}

function setToken(token) {
  if (typeof window !== "undefined") {
    localStorage.setItem("ecomera_token", token);
  }
}

function removeToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("ecomera_token");
    localStorage.removeItem("ecomera_user");
  }
}

// ── Stored user helpers ──────────────────────────────────────────────────────
function getStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("ecomera_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  if (typeof window !== "undefined") {
    localStorage.setItem("ecomera_user", JSON.stringify(user));
  }
}

// ── Attach JWT token to every request ────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Handle 401 responses — redirect to login ─────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      removeToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth API methods (used by AuthContext) ────────────────────────────────────
const authAPI = {
  login: (username, password) =>
    api.post("/auth/login", { username, password }),

  signup: (data) => api.post("/auth/signup", data),

  logout: () => api.post("/auth/logout"),

  me: () => api.get("/auth/me"),
};

export default api;
export { API_BASE, authAPI, getToken, setToken, removeToken, getStoredUser, setStoredUser };

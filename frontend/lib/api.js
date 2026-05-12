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
    localStorage.removeItem("ecomera_refresh_token");
  }
}

// ── Refresh token helpers (Day-7 dispatch item 5) ────────────────────────────
function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ecomera_refresh_token") || null;
}

function setRefreshToken(token) {
  if (typeof window !== "undefined" && token) {
    localStorage.setItem("ecomera_refresh_token", token);
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

// ── snake_case → camelCase response transformer ──────────────────────────────
// Backend AI modules emit snake_case JSON. Existing pages (buybox, recommendations,
// scout, analyze, etc.) read camelCase keys. This transformer bridges the two
// without requiring page edits. Idempotent: keys without underscores pass through.
function snakeToCamel(input) {
  if (Array.isArray(input)) return input.map(snakeToCamel);
  if (
    input !== null &&
    typeof input === "object" &&
    input.constructor === Object
  ) {
    const out = {};
    for (const key of Object.keys(input)) {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      out[camelKey] = snakeToCamel(input[key]);
    }
    return out;
  }
  return input;
}

// Apply to axios responses
api.interceptors.response.use((response) => {
  if (response && response.data && typeof response.data === "object") {
    response.data = snakeToCamel(response.data);
  }
  return response;
});

// ── 401 → /auth/refresh → retry once interceptor ─────────────────────────────
// Day-7 dispatch item 5: when an axios request returns 401, try to refresh
// the access token using the stored refresh token, then retry the original
// request transparently. If the refresh also fails, fall through (the caller
// sees the 401 and the AuthGuard / login.js boots back to /login as before).
//
// Single-flight refresh: parallel 401s share one refresh promise to avoid
// stampeding /auth/refresh.
let inFlightRefresh = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    // Bypass the request interceptor's Authorization header — the refresh
    // route takes the refresh token in the body, not the Authorization.
    const res = await axios.post(
      `${API_BASE}/auth/refresh`,
      { refresh_token: refreshToken },
      { headers: { "Content-Type": "application/json" } },
    );
    const newToken = res?.data?.token;
    if (newToken) {
      setToken(newToken);
      return newToken;
    }
  } catch (err) {
    // Refresh failed (expired, invalid, server error). Clear stored auth so
    // the next mount of AuthGuard / login.js bounces cleanly to /login.
    removeToken();
  }
  return null;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config;
    if (!error?.response || error.response.status !== 401 || !original) {
      return Promise.reject(error);
    }
    // Don't recurse on /auth/refresh itself, and don't retry twice.
    if (original.__retried || original.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }
    original.__retried = true;
    if (!inFlightRefresh) {
      inFlightRefresh = refreshAccessToken().finally(() => {
        inFlightRefresh = null;
      });
    }
    const newToken = await inFlightRefresh;
    if (!newToken) {
      return Promise.reject(error);
    }
    original.headers = original.headers || {};
    original.headers.Authorization = `Bearer ${newToken}`;
    return api.request(original);
  },
);

// Patch window.fetch globally so existing pages that use raw fetch() (rather
// than the axios instance above) also receive camelCase responses. Installed
// once on app boot from _app.js. Guarded against double-install.
function installCamelCaseFetch() {
  if (typeof window === "undefined" || window.__camelFetchInstalled) return;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const res = await originalFetch(...args);
    if (!res.ok) return res;
    const ct =
      (res.headers && res.headers.get && res.headers.get("content-type")) || "";
    if (!ct.includes("application/json")) return res;
    let json;
    try {
      json = await res.clone().json();
    } catch {
      return res;
    }
    if (json == null) return res;
    const transformed = snakeToCamel(json);
    const newHeaders = new Headers(res.headers);
    newHeaders.delete("content-length");
    return new Response(JSON.stringify(transformed), {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  };
  window.__camelFetchInstalled = true;
}

// ── Final-fallback 401 handler — redirect to /login ──────────────────────────
// Registered AFTER the refresh-and-retry interceptor above. Because axios
// runs response interceptors in reverse registration order, the refresh
// interceptor fires first; only if it can't recover does the request
// re-emerge here as a 401 and we bounce to /login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Avoid an infinite redirect from the /auth/login route itself.
      const url = error.config?.url || "";
      if (!url.includes("/auth/login") && !url.includes("/auth/refresh")) {
        removeToken();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
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
export {
  API_BASE,
  authAPI,
  getToken,
  setToken,
  removeToken,
  getRefreshToken,
  setRefreshToken,
  getStoredUser,
  setStoredUser,
  snakeToCamel,
  installCamelCaseFetch,
};

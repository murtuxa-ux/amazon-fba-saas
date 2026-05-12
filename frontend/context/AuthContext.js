/**
 * Ecom Era FBA SaaS v6.0 — Auth Context
 * Provides authentication state across the app
 */
import { createContext, useContext, useState, useEffect, useCallback } from "react";

// Tag Sentry events with the authed user. Imported lazily inside the
// callbacks so SSR doesn't pull the SDK into the server-side render path
// of unauthenticated routes. No-op when @sentry/nextjs is missing or the
// DSN env var is empty (rollback flag).
function tagSentryUser(user) {
  if (typeof window === "undefined") return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require("@sentry/nextjs");
    Sentry.setUser({
      id: user.username,
      username: user.username,
      email: user.email,
    });
    if (user.org_id != null) Sentry.setTag("organization_id", user.org_id);
  } catch (_e) {
    // SDK absent or DSN unset — silently skip.
  }
}

function clearSentryUser() {
  if (typeof window === "undefined") return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require("@sentry/nextjs");
    Sentry.setUser(null);
  } catch (_e) {
    // SDK absent — silently skip.
  }
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://amazon-fba-saas-production.up.railway.app";

const TOKEN_KEY = "ecomera_token";
const USER_KEY = "ecomera_user";
const REFRESH_TOKEN_KEY = "ecomera_refresh_token";

// ── Token & user helpers ───────────────────────────────────────────────────
export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t) {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, t);
}
export function setRefreshToken(t) {
  if (typeof window !== "undefined" && t) {
    localStorage.setItem(REFRESH_TOKEN_KEY, t);
  }
}
export function removeToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}
export function getStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function setStoredUser(u) {
  if (typeof window !== "undefined")
    localStorage.setItem(USER_KEY, JSON.stringify(u));
}

// ── Auth API helpers ───────────────────────────────────────────────────────
async function apiLogin(username, password) {
  const resp = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || "Login failed.");
  }
  return resp.json();
}

async function apiSignup(data) {
  const resp = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || "Signup failed.");
  }
  return resp.json();
}

async function apiMe(token) {
  const resp = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    // Tag the error with the status so the caller can distinguish a real
    // 401 (token actually invalid → clear and log out) from a transient
    // failure (network blip, 5xx → keep session, retry later).
    const err = new Error(`auth/me failed with status ${resp.status}`);
    err.status = resp.status;
    throw err;
  }
  return resp.json();
}

// ── Context ────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: check localStorage for existing session.
  //
  // This used to await /auth/me before flipping `loading` to false, AND
  // it cleared localStorage on ANY apiMe error (network blip, 5xx,
  // transformer hiccup, real 401 — they all hit the same .catch).
  // The result on refresh: any transient hiccup wiped the user's
  // session and bounced them back to /login. (Issue #15, Bug A
  // refresh-persistence regression — separate from the original
  // redirect-loop fix in PR #19.)
  //
  // The fix splits hydration from validation:
  //   1. Hydrate from localStorage synchronously → user and loading
  //      flip together, AuthGuard can render the protected page on
  //      the very next render.
  //   2. Run apiMe in the background. Refresh user data on success.
  //      On 401 (token actually dead), clear and log out. On any other
  //      error, KEEP the session — a real bad token will surface as a
  //      401 on the user's next protected fetch, where dedicated
  //      logout-on-401 handling can take over.
  useEffect(() => {
    const token = getToken();
    const storedUser = getStoredUser();

    if (!token || !storedUser) {
      // Nothing to hydrate. Clean up any half-written state and finish.
      removeToken();
      setLoading(false);
      return;
    }

    // Trust storage. Render the dashboard.
    setUser(storedUser);
    tagSentryUser(storedUser);
    setLoading(false);

    // Background validation — best-effort.
    apiMe(token)
      .then((data) => {
        const u = {
          username: data.username,
          name: data.name,
          role: data.role,
          email: data.email,
          avatar: data.avatar,
          org_id: data.org_id,
          org_name: data.org_name,
        };
        setUser(u);
        setStoredUser(u);
        tagSentryUser(u);
      })
      .catch((err) => {
        if (err && err.status === 401) {
          // Token genuinely invalid (expired, revoked, or signed by a
          // different secret after a JWT_SECRET rotation). Clear and
          // sign out.
          removeToken();
          setUser(null);
        }
        // For any other error (network, 5xx, CORS, transformer noise),
        // do nothing. The user keeps their session; a later 401 on a
        // real protected fetch is the correct trigger for logout.
      });
  }, []);

  // Listen for storage changes (e.g., login.js sets token directly)
  useEffect(() => {
    function onStorage() {
      const token = getToken();
      const storedUser = getStoredUser();
      if (token && storedUser && !user) {
        setUser(storedUser);
      } else if (!token && user) {
        setUser(null);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [user]);

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password);
    // Backend returns: { token, refresh_token, username, name, role, email, avatar, org_id, org_name }
    // refresh_token is post-Day-7 (PR #56). Pre-PR-56 backends won't return
    // it; we tolerate that — the axios interceptor's refresh-and-retry just
    // becomes a no-op when getRefreshToken() returns null.
    const userData = {
      username: data.username,
      name: data.name,
      role: data.role,
      email: data.email,
      avatar: data.avatar,
      org_id: data.org_id,
      org_name: data.org_name,
    };
    setToken(data.token);
    if (data.refresh_token) setRefreshToken(data.refresh_token);
    setStoredUser(userData);
    setUser(userData);
    tagSentryUser(userData);
    return userData;
  }, []);

  const signup = useCallback(async (formData) => {
    const data = await apiSignup(formData);
    // Backend returns same shape as login
    const userData = {
      username: data.username,
      name: data.name,
      role: data.role,
      email: data.email,
      avatar: data.avatar,
      org_id: data.org_id,
      org_name: data.org_name,
    };
    setToken(data.token);
    if (data.refresh_token) setRefreshToken(data.refresh_token);
    setStoredUser(userData);
    setUser(userData);
    tagSentryUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    const token = getToken();
    if (token) {
      fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    removeToken();
    setUser(null);
    clearSentryUser();
    window.location.href = "/login";
  }, []);

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
    isOwner: user?.role === "owner",
    isAdmin: user?.role === "admin" || user?.role === "owner",
    isManager: ["owner", "admin", "manager"].includes(user?.role),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthContext;

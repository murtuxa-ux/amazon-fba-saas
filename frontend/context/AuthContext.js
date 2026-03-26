/**
 * Ecom Era FBA SaaS v6.0 — Auth Context
 * Provides authentication state across the app
 */
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://amazon-fba-saas-production.up.railway.app";

const TOKEN_KEY = "ecomera_token";
const USER_KEY = "ecomera_user";

// ── Token & user helpers ───────────────────────────────────────────────────
export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t) {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, t);
}
export function removeToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
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
  if (!resp.ok) throw new Error("Token invalid");
  return resp.json();
}

// ── Context ────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: check localStorage for existing session
  useEffect(() => {
    const token = getToken();
    const storedUser = getStoredUser();

    if (token && storedUser) {
      setUser(storedUser);
      // Validate token in background
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
        })
        .catch(() => {
          removeToken();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      removeToken();
      setLoading(false);
    }
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
    // Backend returns: { token, username, name, role, email, avatar, org_id, org_name }
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
    setStoredUser(userData);
    setUser(userData);
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
    setStoredUser(userData);
    setUser(userData);
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

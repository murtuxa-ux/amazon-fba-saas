/**
 * Ecom Era FBA SaaS v6.0 — Auth Context
 * Provides authentication state across the app
 */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI, getToken, setToken, removeToken, getStoredUser, setStoredUser } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const token = getToken();
    const storedUser = getStoredUser();
    if (token && storedUser) {
      setUser(storedUser);
      // Validate token in background
      authAPI
        .me()
        .then((res) => {
          setUser(res.data);
          setStoredUser(res.data);
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

  const login = useCallback(async (username, password) => {
    const res = await authAPI.login(username, password);
    const { access_token, user: userData } = res.data;
    setToken(access_token);
    setStoredUser(userData);
    setUser(userData);
    return userData;
  }, []);

  const signup = useCallback(async (data) => {
    const res = await authAPI.signup(data);
    const { access_token, user: userData } = res.data;
    setToken(access_token);
    setStoredUser(userData);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
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

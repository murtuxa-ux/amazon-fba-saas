/**
 * Ecom Era FBA SaaS v6.0 — Centralized API Client
 * JWT-authenticated Axios instance with interceptors
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

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("ecomera_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 responses — redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("ecomera_token");
        localStorage.removeItem("ecomera_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE };

/**
 * Ecom Era FBA SaaS v6.0 — App Wrapper
 * AuthProvider + route guarding
 */
import "../styles/globals.css";
import { useRouter } from "next/router";
import { AuthProvider, useAuth } from "../context/AuthContext";

const PUBLIC_ROUTES = ["/login", "/signup"];

function AuthGuard({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !PUBLIC_ROUTES.includes(router.pathname)) {
    if (typeof window !== "undefined") {
      router.replace("/login");
    }
    return null;
  }

  if (isAuthenticated && PUBLIC_ROUTES.includes(router.pathname)) {
    if (typeof window !== "undefined") {
      router.replace("/");
    }
    return null;
  }

  return children;
}

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <Component {...pageProps} />
      </AuthGuard>
    </AuthProvider>
  );
}

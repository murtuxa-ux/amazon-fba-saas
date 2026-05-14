/**
 * Ecom Era FBA SaaS v6.0 — App Wrapper
 * AuthProvider + route guarding
 */
import "../styles/globals.css";
import Head from "next/head";
import { useRouter } from "next/router";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { installCamelCaseFetch } from "../lib/api";

// Install the snake_case -> camelCase response transformer once at app boot.
// Module-level (rather than useEffect) so it lands before any page's own fetch.
if (typeof window !== "undefined") {
  installCamelCaseFetch();
}

// BUG-36/37/38 (Sprint 2): /pricing /landing /onboarding are
// "marketing-style" pages embedded in the app. They used to live in
// PUBLIC_ROUTES, which redirected AUTHENTICATED users to /. The UX
// test caught this — visiting /pricing while logged in bounced back
// to the dashboard. Moving them to BYPASS_AUTH_ROUTES so both signed-
// in and signed-out users see the same content with no redirect. Once
// the public marketing site at ecomera.us ships (separate dispatch),
// these will flip to client-side 301 redirects to ecomera.us/<route>.
const PUBLIC_ROUTES = ["/login", "/signup", "/portal"];
// /404 (and /_error) bypass AuthGuard entirely. They render for both auth
// states without redirect — sending an unauthenticated visitor from a 404
// to /login swallows the bad URL, and sending an authenticated user to /
// hides the fact that the path they reached doesn't exist.
const BYPASS_AUTH_ROUTES = ["/404", "/_error", "/landing", "/pricing", "/onboarding"];

function AuthGuard({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  if (BYPASS_AUTH_ROUTES.includes(router.pathname)) {
    return children;
  }

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
      <Head>
        <title>Ecom Era — Amazon FBA Management</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <AuthGuard>
        <Component {...pageProps} />
      </AuthGuard>
    </AuthProvider>
  );
}

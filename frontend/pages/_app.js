import { useEffect } from "react";
import { useRouter } from "next/router";
import "../styles/globals.css";

const PUBLIC_ROUTES = ["/login"];

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("ecomera_token") : null;
    const isPublic = PUBLIC_ROUTES.includes(router.pathname);
    if (!token && !isPublic) {
      router.replace("/login");
    }
    if (token && router.pathname === "/login") {
      router.replace("/");
    }
  }, [router.pathname]);

  return <Component {...pageProps} />;
}

import { useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";

const S = {
  page: {
    minHeight: "100vh",
    background: "#0A0A0A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  card: {
    background: "#111111",
    border: "1px solid #2A2A2A",
    borderRadius: "20px",
    padding: "2.5rem 2.75rem",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
  },
  logo: { textAlign: "center", marginBottom: "2rem" },
  title: {
    fontSize: "1.15rem",
    fontWeight: 700,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: "0.3rem",
  },
  subtitle: {
    fontSize: "0.8rem",
    color: "#666",
    textAlign: "center",
    marginBottom: "2rem",
  },
  label: {
    display: "block",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "0.5rem",
  },
  input: {
    width: "100%",
    padding: "0.8rem 1rem",
    background: "#0F0F0F",
    border: "1px solid #2A2A2A",
    borderRadius: "10px",
    color: "#FFFFFF",
    fontSize: "0.95rem",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  btn: {
    width: "100%",
    padding: "0.9rem",
    background: "#FFD700",
    color: "#000000",
    border: "none",
    borderRadius: "10px",
    fontWeight: 800,
    fontSize: "1rem",
    cursor: "pointer",
    marginTop: "1.5rem",
    transition: "background 0.2s, transform 0.1s",
  },
  error: {
    background: "#2D0A0A",
    border: "1px solid #7F1D1D",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    color: "#FCA5A5",
    fontSize: "0.85rem",
    marginTop: "1rem",
    textAlign: "center",
  },
  divider: { borderTop: "1px solid #1E1E1E", margin: "1.75rem 0" },
  hint: {
    fontSize: "0.75rem",
    color: "#444",
    textAlign: "center",
    lineHeight: 1.6,
  },
  hintKey: { color: "#666", fontWeight: 600 },
};

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter your username and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(username.trim(), password);
      router.push("/");
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Logo */}
        <div style={S.logo}>
          <img
            src="/logo.png"
            alt="Ecom Era"
            style={{ height: "44px", objectFit: "contain" }}
          />
        </div>

        <p style={S.title}>Welcome back</p>
        <p style={S.subtitle}>Sign in to your Ecom Era dashboard</p>

        <form onSubmit={handleLogin} autoComplete="on">
          <div style={{ marginBottom: "1.1rem" }}>
            <label style={S.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. murtaza"
              autoComplete="username"
              style={S.input}
              onFocus={(e) => (e.target.style.borderColor = "#FFD700")}
              onBlur={(e) => (e.target.style.borderColor = "#2A2A2A")}
            />
          </div>

          <div>
            <label style={S.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={S.input}
              onFocus={(e) => (e.target.style.borderColor = "#FFD700")}
              onBlur={(e) => (e.target.style.borderColor = "#2A2A2A")}
            />
          </div>

          {error && <div style={S.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}
            onMouseEnter={(e) => {
              if (!loading) e.target.style.background = "#E6B800";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#FFD700";
            }}
          >
            {loading ? "Signing in\u2026" : "Sign In \u2192"}
          </button>
        </form>

        <div style={S.divider} />

        <div style={S.hint}>
          <span style={S.hintKey}>Admin:</span> murtaza / Admin@2024
          <br />
          <span style={S.hintKey}>Managers:</span> bilal, ali, sarah, hamza /
          Manager@123
          <br />
          <span style={{ color: "#333" }}>
            Change passwords in Settings after first login.
          </span>
        </div>
      </div>
    </div>
  );
}

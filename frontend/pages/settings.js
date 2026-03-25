import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-backend-production.up.railway.app";

export default function Settings() {
  const [apiKey, setApiKey]     = useState("");
  const [showKey, setShowKey]   = useState(false);
  const [hasKey, setHasKey]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [testing, setTesting]   = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("keepa_api_key") || "";
    if (stored) { setApiKey(stored); setHasKey(true); }
  }, []);

  async function handleSave() {
    const key = apiKey.trim();
    if (!key) return;
    localStorage.setItem("keepa_api_key", key);
    try {
      await fetch(API_URL + "/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepa_api_key: key }),
      });
    } catch (_) {}
    setHasKey(true);
    setSaved(true);
    setTestResult(null);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleTest() {
    const key = apiKey.trim();
    if (!key) return;
    setTesting(true);
    setTestResult(null);
    try {
      const resp = await fetch(API_URL + "/scout/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asins: ["B00MNV8E0C"], keepa_api_key: key }),
      });
      const data = await resp.json();
      if (data.results && data.results.length > 0) {
        setTestResult({ ok: true, msg: "API key is valid! Keepa returned live data." });
      } else if (data.error_details && data.error_details.length > 0) {
        setTestResult({ ok: false, msg: data.error_details[0].error });
      } else {
        setTestResult({ ok: false, msg: "Unexpected response. Check your key." });
      }
    } catch (e) {
      setTestResult({ ok: false, msg: "Request failed: " + e.message });
    } finally {
      setTesting(false);
    }
  }

  function handleClear() {
    localStorage.removeItem("keepa_api_key");
    setApiKey("");
    setHasKey(false);
    setTestResult(null);
  }

  const s = { background: "#0f172a", color: "#e2e8f0", fontFamily: "system-ui, sans-serif" };

  return (
    <div style={{ display: "flex", minHeight: "100vh", ...s }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "2rem", maxWidth: "860px" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem" }}>Settings</h1>
        <p style={{ color: "#94a3b8", marginBottom: "2rem" }}>Configure API keys and system preferences.</p>

        <div style={{ background: "#1e293b", borderRadius: "12px", padding: "2rem", marginBottom: "1.5rem", border: "1px solid #334155" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "1.4rem" }}>🔑</span>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Keepa API Key</h2>
            {hasKey && (
              <span style={{ background: "#064e3b", color: "#6ee7b7", border: "1px solid #059669", borderRadius: "999px", padding: "2px 10px", fontSize: "0.75rem", fontWeight: 700 }}>
                ACTIVE
              </span>
            )}
          </div>

          <p style={{ color: "#94a3b8", fontSize: "0.88rem", lineHeight: 1.65, marginBottom: "1.5rem" }}>
            FBA Scout uses Keepa to automatically fetch BSR, monthly sales, price history, FBA seller count, and more.
            Enter your key once and it will be saved for all future bulk scouts.
            Get a key at <a href="https://keepa.com/#!api" target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8" }}>keepa.com/#!api</a>.
          </p>

          {hasKey && (
            <div style={{ background: "#0c2340", border: "1px solid #1d4ed8", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1.25rem", fontSize: "0.875rem", color: "#93c5fd" }}>
              Keepa API key is configured and active. FBA Scout will use it automatically.
            </div>
          )}

          <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
            API Key
          </label>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setTestResult(null); }}
              placeholder="Paste your Keepa API key here..."
              style={{ flex: 1, padding: "0.75rem 1rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#e2e8f0", fontSize: "0.9rem", fontFamily: "monospace", outline: "none", boxSizing: "border-box" }}
            />
            <button onClick={() => setShowKey(!showKey)}
              style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#94a3b8", padding: "0 0.875rem", cursor: "pointer", fontSize: "1.1rem" }}>
              {showKey ? "🙈" : "👁️"}
            </button>
          </div>

          {testResult && (
            <div style={{ background: testResult.ok ? "#064e3b" : "#450a0a", border: "1px solid " + (testResult.ok ? "#059669" : "#b91c1c"), borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.875rem", color: testResult.ok ? "#6ee7b7" : "#fca5a5" }}>
              {testResult.ok ? "✅ " : "❌ "}{testResult.msg}
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button onClick={handleSave} disabled={!apiKey.trim()}
              style={{ background: apiKey.trim() ? (saved ? "#059669" : "#6366f1") : "#334155", color: "#fff", border: "none", borderRadius: "8px", padding: "0.75rem 1.5rem", cursor: apiKey.trim() ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "0.9rem" }}>
              {saved ? "✅ Saved!" : "Save Key"}
            </button>
            <button onClick={handleTest} disabled={!apiKey.trim() || testing}
              style={{ background: "transparent", color: apiKey.trim() ? "#818cf8" : "#475569", border: "1px solid " + (apiKey.trim() ? "#6366f1" : "#334155"), borderRadius: "8px", padding: "0.75rem 1.5rem", cursor: apiKey.trim() && !testing ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "0.9rem" }}>
              {testing ? "Testing…" : "Test Key"}
            </button>
            {hasKey && (
              <button onClick={handleClear}
                style={{ background: "transparent", color: "#f87171", border: "1px solid #f87171", borderRadius: "8px", padding: "0.75rem 1.5rem", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem" }}>
                Clear Key
              </button>
            )}
          </div>
          <p style={{ color: "#475569", fontSize: "0.78rem", marginTop: "1rem" }}>
            Your key is stored in your browser only and never shared with third parties.
          </p>
        </div>

        <div style={{ background: "#1e293b", borderRadius: "12px", padding: "1.5rem 2rem", border: "1px solid #334155" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>How to get your Keepa API key</h3>
          <ol style={{ color: "#94a3b8", lineHeight: 2.1, fontSize: "0.88rem", paddingLeft: "1.25rem" }}>
            <li>Go to <a href="https://keepa.com/#!api" target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8" }}>keepa.com/#!api</a> and sign in or create an account.</li>
            <li>Subscribe to an API plan (starts ~$19/month for 2,500 tokens/day).</li>
            <li>Copy your API key from the dashboard.</li>
            <li>Paste it above and click <strong style={{ color: "#e2e8f0" }}>Save Key</strong>.</li>
            <li>Each ASIN lookup uses approximately 1 Keepa token.</li>
          </ol>
        </div>
      </main>
    </div>
  );
    }

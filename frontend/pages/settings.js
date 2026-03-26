import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";

const token = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("ecomera_token");
  }
  return null;
};

const authHeader = () => ({
  Authorization: `Bearer ${token()}`,
  "Content-Type": "application/json",
});

const userRole = () => {
  if (typeof window !== "undefined") {
    const user = localStorage.getItem("ecomera_user");
    if (user) {
      try {
        return JSON.parse(user).role;
      } catch (e) {
        return null;
      }
    }
  }
  return null;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keepaApiKey, setKeepaApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [user, setUser] = useState(null);

  const currentRole = userRole();
  const isAdmin = currentRole === "admin" || currentRole === "owner";

  useEffect(() => {
    fetchSettings();
    fetchUser();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/settings`, {
        headers: authHeader(),
      });
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();
      setSettings(data);
      setKeepaApiKey(data.keepa_api_key || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      const userData = localStorage.getItem("ecomera_user");
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (err) {
      console.error("Failed to parse user data:", err);
    }
  };

  const handleSaveKeepaKey = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      setMessage({ type: "error", text: "Only admins can update settings" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_URL}/settings`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({ keepa_api_key: keepaApiKey }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save settings");
      }

      const data = await response.json();
      setSettings(data);
      setMessage({ type: "success", text: "Keepa API key updated successfully" });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const bg = "#0A0A0A";
  const cardBg = "#111111";
  const border = "#1E1E1E";
  const yellow = "#FFD700";
  const text = "#FFFFFF";
  const textSec = "#888888";
  const green = "#22C55E";
  const red = "#EF4444";
  const blue = "#3B82F6";

  const inputStyle = {
    padding: "0.75rem",
    background: cardBg,
    border: `1px solid ${border}`,
    borderRadius: "6px",
    color: text,
    fontSize: "0.875rem",
    width: "100%",
  };

  const buttonStyle = {
    padding: "0.75rem 1.5rem",
    background: blue,
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "0.875rem",
  };

  const sectionStyle = {
    background: cardBg,
    border: `1px solid ${border}`,
    borderRadius: "8px",
    padding: "1.5rem",
    marginBottom: "1.5rem",
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.875rem",
    fontWeight: "600",
    color: text,
    marginBottom: "0.5rem",
  };

  const statusBadgeStyle = (isSet) => ({
    display: "inline-block",
    padding: "0.25rem 0.75rem",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: "600",
    backgroundColor: isSet ? green : red,
    color: "#fff",
    marginTop: "0.25rem",
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: bg, color: text, fontFamily: "system-ui" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "2rem" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "bold", margin: "0 0 2rem 0" }}>Settings</h1>

          {!isAdmin && (
            <div
              style={{
                padding: "1rem",
                background: "#1a1a1a",
                border: `1px solid ${border}`,
                borderRadius: "8px",
                marginBottom: "2rem",
                color: textSec,
              }}
            >
              You have limited access. Settings can only be modified by administrators.
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: textSec }}>Loading settings...</div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "3rem", color: red }}>Error: {error}</div>
          ) : (
            <>
              <div style={sectionStyle}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1.5rem" }}>Account Information</h2>

                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={labelStyle}>Organization</label>
                  <div
                    style={{
                      padding: "0.75rem",
                      background: "#1a1a1a",
                      border: `1px solid ${border}`,
                      borderRadius: "6px",
                      color: text,
                    }}
                  >
                    {user?.org_name || "Not set"}
                  </div>
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={labelStyle}>Plan</label>
                  <div
                    style={{
                      padding: "0.75rem",
                      background: "#1a1a1a",
                      border: `1px solid ${border}`,
                      borderRadius: "6px",
                      color: text,
                    }}
                  >
                    {user?.plan || "Free"}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Role</label>
                  <div
                    style={{
                      padding: "0.75rem",
                      background: "#1a1a1a",
                      border: `1px solid ${border}`,
                      borderRadius: "6px",
                      color: text,
                    }}
                  >
                    {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "User"}
                  </div>
                </div>
              </div>

              <div style={sectionStyle}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Keepa API Key</h2>

                <div style={{ marginBottom: "1rem" }}>
                  <span style={statusBadgeStyle(settings?.keepa_api_key_set)}>
                    {settings?.keepa_api_key_set ? "✓ Configured" : "Not Set"}
                  </span>
                </div>

                <p style={{ color: textSec, fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                  Add your Keepa API key to enable advanced product tracking and pricing analysis.
                </p>

                <form onSubmit={handleSaveKeepaKey}>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={labelStyle}>API Key</label>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
                      <div style={{ flex: 1 }}>
                        <input
                          type={showKey ? "text" : "password"}
                          value={keepaApiKey}
                          onChange={(e) => setKeepaApiKey(e.target.value)}
                          placeholder="Enter your Keepa API key"
                          style={inputStyle}
                          disabled={!isAdmin}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        style={{
                          padding: "0.75rem 0.75rem",
                          background: "#1a1a1a",
                          border: `1px solid ${border}`,
                          borderRadius: "6px",
                          color: text,
                          cursor: "pointer",
                          fontSize: "0.875rem",
                        }}
                        disabled={!isAdmin}
                      >
                        {showKey ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  {message && (
                    <div
                      style={{
                        padding: "0.75rem",
                        background: message.type === "success" ? green : red,
                        color: message.type === "success" ? "#fff" : "#fff",
                        borderRadius: "6px",
                        marginBottom: "1rem",
                        fontSize: "0.875rem",
                      }}
                    >
                      {message.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={saving || !isAdmin}
                    style={{
                      ...buttonStyle,
                      opacity: saving || !isAdmin ? 0.6 : 1,
                      cursor: saving || !isAdmin ? "not-allowed" : "pointer",
                    }}
                  >
                    {saving ? "Saving..." : "Save API Key"}
                  </button>
                </form>
              </div>

              <div style={sectionStyle}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem" }}>API Integration</h2>

                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.875rem", color: textSec, marginBottom: "0.5rem" }}>API Base URL</div>
                  <div
                    style={{
                      padding: "0.75rem",
                      background: "#1a1a1a",
                      border: `1px solid ${border}`,
                      borderRadius: "6px",
                      color: text,
                      fontFamily: "monospace",
                      fontSize: "0.75rem",
                      overflow: "auto",
                    }}
                  >
                    {API_URL}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.875rem", color: textSec, marginBottom: "0.5rem" }}>
                    Authentication
                  </div>
                  <div
                    style={{
                      padding: "0.75rem",
                      background: "#1a1a1a",
                      border: `1px solid ${border}`,
                      borderRadius: "6px",
                      color: text,
                      fontSize: "0.875rem",
                    }}
                  >
                    Bearer Token (stored in localStorage)
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: "1rem",
                  background: "#1a1a1a",
                  border: `1px solid ${border}`,
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  color: textSec,
                  lineHeight: "1.5",
                }}
              >
                <strong>Need help?</strong> For API documentation and integration support, contact your administrator or
                refer to the platform documentation.
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

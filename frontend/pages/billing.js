/**
 * Ecom Era FBA SaaS — Billing Page (§2.2 + §2.4)
 * Trial countdown banner + current plan + usage stats + plan switcher.
 * Hits /billing/status (extended) and /billing/portal (Owner/Admin only).
 */
import { useState, useEffect } from "react";
import Head from "next/head";
import Sidebar from "../components/Sidebar";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://amazon-fba-saas-production.up.railway.app";

const T = {
  bg: "#0A0A0A",
  card: "#111111",
  border: "#1E1E1E",
  yellow: "#FFD700",
  text: "#FFFFFF",
  textSec: "#888",
  textMut: "#444",
  red: "#FF4444",
  green: "#22C55E",
};

function token() {
  return typeof window !== "undefined"
    ? localStorage.getItem("ecomera_token") || ""
    : "";
}

function authHeader() {
  return {
    Authorization: `Bearer ${token()}`,
    "Content-Type": "application/json",
  };
}

// Source-of-truth pricing matches backend stripe_billing.PLANS. Update both
// together when pricing changes.
const TIERS = [
  { id: "scout", name: "Scout", price: 29 },
  { id: "growth", name: "Growth", price: 79 },
  { id: "professional", name: "Professional", price: 149 },
  { id: "enterprise", name: "Enterprise", price: 299 },
];

export default function Billing() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/billing/status`, { headers: authHeader() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("status fetch failed"))))
      .then((data) => {
        setStatus(data);
        setLoading(false);
      })
      .catch((e) => {
        setMessage(e.message || "Could not load billing status.");
        setLoading(false);
      });
  }, []);

  async function handleSelectPlan(slug) {
    if (status?.plan === slug) return;
    setActionLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_URL}/billing/checkout`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({ plan: slug }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      setMessage(data.detail || data.message || "Checkout could not be started.");
    } catch (e) {
      setMessage("Unable to connect to billing. Please try again.");
    }
    setActionLoading(false);
  }

  async function openPortal() {
    setActionLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_URL}/billing/portal`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({ return_url: window.location.href }),
      });
      const data = await res.json();
      if (data.portal_url) {
        window.location.href = data.portal_url;
        return;
      }
      // 400 from "No billing account found." until first checkout completes.
      setMessage(data.detail || "Could not open billing portal.");
    } catch (e) {
      setMessage("Unable to open billing portal.");
    }
    setActionLoading(false);
  }

  if (loading) {
    return (
      <Shell>
        <div style={{ color: T.textSec }}>Loading billing status…</div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.2rem" }}>
          Billing &amp; Plans
        </h1>
        <p style={{ color: T.textSec, fontSize: "0.88rem" }}>
          Manage your subscription, view usage, and change plan.
        </p>
      </div>

      {/* Trial banner */}
      {status?.is_trialing && (
        <Banner tone="yellow">
          <strong>
            Trial ends in {status.trial_days_remaining}{" "}
            day{status.trial_days_remaining !== 1 ? "s" : ""}.
          </strong>{" "}
          Add a payment method to keep access uninterrupted after your trial.
        </Banner>
      )}

      {/* Past-due banner */}
      {status?.is_past_due && (
        <Banner tone="red">
          <strong>Payment failed.</strong> Update your card via the billing portal
          to restore access.
        </Banner>
      )}

      {/* Canceled banner */}
      {status?.is_canceled && (
        <Banner tone="red">
          <strong>Subscription canceled.</strong> Pick a plan below to reactivate.
        </Banner>
      )}

      {message && <Banner tone="yellow">{message}</Banner>}

      {/* Current plan card */}
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: "14px",
          padding: "1.25rem 1.5rem",
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: "0.75rem", color: T.textSec }}>Current Plan</div>
          <div
            style={{
              fontSize: "1.3rem",
              fontWeight: 800,
              color: T.yellow,
              textTransform: "capitalize",
            }}
          >
            {status?.plan_name || status?.plan || "Scout"}
          </div>
          <div style={{ fontSize: "0.75rem", color: T.textSec, marginTop: 4 }}>
            Status: {status?.status || "active"}
          </div>
        </div>
        <button
          onClick={openPortal}
          disabled={actionLoading}
          style={{
            background: "#1A1A1A",
            border: `1px solid ${T.border}`,
            color: T.text,
            padding: "0.65rem 1.25rem",
            borderRadius: "10px",
            cursor: actionLoading ? "not-allowed" : "pointer",
            fontSize: "0.85rem",
          }}
        >
          {actionLoading ? "Opening…" : "Manage Billing"}
        </button>
      </div>

      {/* Usage grid */}
      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 1rem" }}>
        Usage
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: "2.5rem",
        }}
      >
        {status?.usage &&
          Object.entries(status.usage).map(([resource, data]) => (
            <UsageTile key={resource} resource={resource} data={data} />
          ))}
        {!status?.usage && (
          <div style={{ color: T.textSec, fontSize: "0.85rem" }}>
            Usage stats unavailable.
          </div>
        )}
      </div>

      {/* Plan switcher */}
      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 1rem" }}>
        Change Plan
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        {TIERS.map((tier) => {
          const isCurrent = status?.plan === tier.id;
          return (
            <div
              key={tier.id}
              style={{
                background: isCurrent ? "#1C1400" : T.card,
                border: `2px solid ${isCurrent ? T.yellow : "transparent"}`,
                borderRadius: 14,
                padding: 24,
              }}
            >
              <div style={{ color: T.yellow, fontWeight: 800, fontSize: "1rem" }}>
                {tier.name}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, margin: "12px 0" }}>
                ${tier.price}
                <span style={{ fontSize: 12, color: T.textSec, fontWeight: 400 }}>
                  /mo
                </span>
              </div>
              {isCurrent ? (
                <div style={{ color: T.yellow, fontWeight: 700, fontSize: "0.85rem" }}>
                  Current Plan
                </div>
              ) : (
                <button
                  onClick={() => handleSelectPlan(tier.id)}
                  disabled={actionLoading}
                  style={{
                    width: "100%",
                    background: T.yellow,
                    color: "#1A1A1A",
                    padding: 12,
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  Switch to {tier.name}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <>
    <Head>
      <title>Billing &amp; Plans · Ecom Era</title>
    </Head>
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: T.bg,
        color: T.text,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <Sidebar />
      <main style={{ flex: 1, padding: "2rem", minWidth: 0 }}>{children}</main>
    </div>
    </>
  );
}

function Banner({ tone, children }) {
  const palette = tone === "red"
    ? { bg: "#1A0000", border: T.red, text: T.red }
    : { bg: "#1C1400", border: "#854D0E", text: T.yellow };
  return (
    <div
      style={{
        background: palette.bg,
        borderLeft: `4px solid ${palette.border}`,
        padding: "12px 16px",
        margin: "12px 0",
        borderRadius: 8,
        color: palette.text,
        fontSize: "0.88rem",
      }}
    >
      {children}
    </div>
  );
}

function UsageTile({ resource, data }) {
  const limit = data.limit;
  const current = data.current ?? 0;
  const pct = data.unlimited || !limit
    ? 0
    : Math.min(100, Math.round((current / limit) * 100));
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: T.textSec,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {resource.replace(/_/g, " ")}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>
        {(current || 0).toLocaleString()}
        {!data.unlimited && limit != null && (
          <span style={{ fontSize: 12, color: T.textSec, fontWeight: 400 }}>
            {" "}/ {limit.toLocaleString()}
          </span>
        )}
        {data.unlimited && (
          <span style={{ fontSize: 12, color: T.textSec, fontWeight: 400 }}>
            {" "}/ unlimited
          </span>
        )}
      </div>
      {!data.unlimited && limit != null && (
        <div
          style={{
            height: 4,
            background: "#222",
            marginTop: 10,
            borderRadius: 2,
          }}
        >
          <div
            style={{
              height: "100%",
              background: pct >= 90 ? T.red : T.yellow,
              width: `${pct}%`,
              borderRadius: 2,
              transition: "width 0.2s ease",
            }}
          />
        </div>
      )}
    </div>
  );
}

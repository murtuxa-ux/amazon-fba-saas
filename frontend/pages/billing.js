/**
 * Ecom Era FBA SaaS v6.0 — Billing Page
 * Subscription management with Stripe integration
 */
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import PricingCard from "../components/PricingCard";

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
  green: "#22C55E",
  blue: "#3B82F6",
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

const PLANS = [
  {
    slug: "starter",
    name: "Starter",
    price_monthly: 97,
    description: "For small teams getting started with FBA wholesale",
    popular: false,
    limits: {
      max_users: 3,
      max_clients: 10,
      max_scouts_per_month: 500,
      max_suppliers: 50,
      export_enabled: false,
      ai_features: false,
      client_portal: false,
      api_access: false,
    },
  },
  {
    slug: "growth",
    name: "Growth",
    price_monthly: 197,
    description: "For growing agencies scaling their wholesale operations",
    popular: true,
    limits: {
      max_users: 10,
      max_clients: 50,
      max_scouts_per_month: 2000,
      max_suppliers: 200,
      export_enabled: true,
      ai_features: true,
      client_portal: false,
      api_access: false,
    },
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    price_monthly: 497,
    description: "For established agencies with advanced needs",
    popular: false,
    limits: {
      max_users: 50,
      max_clients: 999,
      max_scouts_per_month: 10000,
      max_suppliers: 999,
      export_enabled: true,
      ai_features: true,
      client_portal: true,
      api_access: true,
    },
  },
];

export default function Billing() {
  const [currentPlan, setCurrentPlan] = useState("starter");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/billing/subscription`, { headers: authHeader() })
      .then((r) => r.json())
      .then((data) => {
        if (data.plan) setCurrentPlan(data.plan);
      })
      .catch(() => {});
  }, []);

  async function handleSelectPlan(slug) {
    if (slug === currentPlan) return;
    setLoading(true);
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
      } else if (data.message) {
        setMessage(data.message);
      }
    } catch (e) {
      setMessage("Unable to connect to billing. Please try again.");
    }
    setLoading(false);
  }

  async function openPortal() {
    try {
      const res = await fetch(`${API_URL}/billing/portal`, {
        method: "POST",
        headers: authHeader(),
      });
      const data = await res.json();
      if (data.portal_url) {
        window.location.href = data.portal_url;
      }
    } catch (e) {
      setMessage("Unable to open billing portal.");
    }
  }

  return (
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
      <main style={{ flex: 1, padding: "2rem", minWidth: 0 }}>
        {/* Header */}
        <div style={{ marginBottom: "1.75rem" }}>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              marginBottom: "0.2rem",
            }}
          >
            Billing & Plans
          </h1>
          <p style={{ color: T.textSec, fontSize: "0.88rem" }}>
            Manage your subscription and upgrade your plan
          </p>
        </div>

        {/* Current plan banner */}
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
          }}
        >
          <div>
            <div style={{ fontSize: "0.75rem", color: T.textSec }}>
              Current Plan
            </div>
            <div
              style={{
                fontSize: "1.3rem",
                fontWeight: 800,
                color: T.yellow,
                textTransform: "capitalize",
              }}
            >
              {currentPlan}
            </div>
          </div>
          <button
            onClick={openPortal}
            style={{
              background: "#1A1A1A",
              border: `1px solid ${T.border}`,
              color: T.textSec,
              padding: "0.65rem 1.25rem",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            Manage Billing
          </button>
        </div>

        {message && (
          <div
            style={{
              background: "#1C1400",
              border: "1px solid #854D0E",
              borderRadius: "10px",
              padding: "0.85rem 1.25rem",
              marginBottom: "1.5rem",
              color: T.yellow,
              fontSize: "0.88rem",
            }}
          >
            {message}
          </div>
        )}

        {/* Pricing cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1.5rem",
            alignItems: "start",
          }}
        >
          {PLANS.map((plan) => (
            <PricingCard
              key={plan.slug}
              plan={plan}
              isCurrentPlan={currentPlan === plan.slug}
              onSelect={handleSelectPlan}
              loading={loading}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

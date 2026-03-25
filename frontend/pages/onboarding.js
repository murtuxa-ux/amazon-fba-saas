/**
 * Ecom Era FBA SaaS v6.0 — Onboarding Wizard
 * 3-step guided setup for new organizations after signup
 */
import { useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";

const STEPS = [
  { id: 1, title: "Your Business", icon: "🏢" },
  { id: 2, title: "First Client", icon: "👤" },
  { id: 3, title: "Keepa API", icon: "🔑" },
];

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Business details
  const [bizName, setBizName] = useState("");
  const [bizType, setBizType] = useState("wholesale");

  // Step 2: First client
  const [clientName, setClientName] = useState("");
  const [clientStore, setClientStore] = useState("");

  // Step 3: Keepa key
  const [keepaKey, setKeepaKey] = useState("");

  const API = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  async function apiCall(url, body) {
    const res = await fetch(`${API}${url}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res;
  }

  async function handleStep1() {
    if (!bizName.trim()) { setError("Enter your business name"); return; }
    setLoading(true);
    setError("");
    try {
      // Update org name via settings
      const res = await fetch(`${API}/settings/org`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: bizName, business_type: bizType }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.detail || "Failed to save. Continuing anyway...");
      }
      setStep(2);
    } catch {
      // Non-blocking — continue even if update fails
      setStep(2);
    } finally {
      setLoading(false);
    }
  }

  async function handleStep2() {
    setLoading(true);
    setError("");
    if (clientName.trim()) {
      try {
        await apiCall("/clients", {
          name: clientName,
          store_name: clientStore || clientName,
          status: "active",
        });
      } catch {
        // Non-blocking
      }
    }
    setStep(3);
    setLoading(false);
  }

  async function handleStep3() {
    setLoading(true);
    setError("");
    if (keepaKey.trim()) {
      try {
        await fetch(`${API}/settings/keepa`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ keepa_api_key: keepaKey }),
        });
      } catch {
        // Non-blocking
      }
    }
    router.push("/");
  }

  function handleSkip() {
    if (step < 3) {
      setStep(step + 1);
      setError("");
    } else {
      router.push("/");
    }
  }

  return (
    <div className="min-h-screen bg-[#060e1a] flex items-center justify-center px-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-lg mx-auto mb-4">
            EE
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Welcome to Ecom Era FBA</h1>
          <p className="text-gray-400 text-sm">Let's get your workspace set up in 2 minutes.</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  s.id === step
                    ? "bg-blue-600 text-white"
                    : s.id < step
                    ? "bg-green-600 text-white"
                    : "bg-gray-700 text-gray-400"
                }`}
              >
                {s.id < step ? "✓" : s.id}
              </div>
              {s.id < STEPS.length && (
                <div className={`w-12 h-0.5 ${s.id < step ? "bg-green-600" : "bg-gray-700"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Card */}
        <div className="bg-[#0a1628] border border-gray-700 rounded-xl p-8">
          <div className="text-center mb-6">
            <span className="text-3xl mb-2 block">{STEPS[step - 1].icon}</span>
            <h2 className="text-lg font-bold text-white">{STEPS[step - 1].title}</h2>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          {/* Step 1: Business Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Business / Agency Name</label>
                <input
                  type="text"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  placeholder="e.g. Ecom Era"
                  className="w-full bg-[#0d1b2a] border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Business Type</label>
                <select
                  value={bizType}
                  onChange={(e) => setBizType(e.target.value)}
                  className="w-full bg-[#0d1b2a] border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="wholesale">Amazon Wholesale</option>
                  <option value="private_label">Private Label</option>
                  <option value="agency">FBA Agency</option>
                  <option value="hybrid">Hybrid / Both</option>
                </select>
              </div>
              <button
                onClick={handleStep1}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-semibold transition mt-2"
              >
                {loading ? "Saving..." : "Continue"}
              </button>
            </div>
          )}

          {/* Step 2: First Client */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400 text-center mb-2">
                Add your first client to get started. You can skip this and add clients later.
              </p>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Client Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Ahmed's FBA Store"
                  className="w-full bg-[#0d1b2a] border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Amazon Store Name (optional)</label>
                <input
                  type="text"
                  value={clientStore}
                  onChange={(e) => setClientStore(e.target.value)}
                  placeholder="e.g. Ahmed's Store"
                  className="w-full bg-[#0d1b2a] border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleStep2}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-semibold transition mt-2"
              >
                {loading ? "Adding..." : clientName.trim() ? "Add & Continue" : "Continue"}
              </button>
            </div>
          )}

          {/* Step 3: Keepa API */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400 text-center mb-2">
                Enter your Keepa API key to power the product scouting engine. Get one at{" "}
                <a href="https://keepa.com/#!api" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                  keepa.com
                </a>.
              </p>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Keepa API Key</label>
                <input
                  type="password"
                  value={keepaKey}
                  onChange={(e) => setKeepaKey(e.target.value)}
                  placeholder="Enter your Keepa API key"
                  className="w-full bg-[#0d1b2a] border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleStep3}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-semibold transition mt-2"
              >
                {loading ? "Finishing..." : "Complete Setup"}
              </button>
            </div>
          )}

          {/* Skip */}
          <button
            onClick={handleSkip}
            className="w-full text-center text-sm text-gray-500 hover:text-gray-300 mt-4 transition"
          >
            Skip this step
          </button>
        </div>

        {/* Step indicator */}
        <p className="text-center text-xs text-gray-600 mt-4">
          Step {step} of {STEPS.length}
        </p>
      </div>
    </div>
  
  

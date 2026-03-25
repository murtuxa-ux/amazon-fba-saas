/**
 * Ecom Era FBA SaaS v6.0 — Public Pricing Page
 * Shows plan comparison for prospective customers
 */
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import PricingCard from "../components/PricingCard";

const PLAN_DESCRIPTIONS = {
  starter: "Perfect for solo sellers getting started with wholesale FBA.",
  growth: "For growing teams managing multiple clients and suppliers.",
  enterprise: "Unlimited power for agencies running wholesale at scale.",
};

const FAQS = [
  {
    q: "Can I switch plans later?",
    a: "Yes! You can upgrade or downgrade anytime from your billing dashboard. Changes take effect immediately and are prorated.",
  },
  {
    q: "Is there a free trial?",
    a: "Every new account starts on the Starter plan. You can explore the platform and upgrade when you're ready to unlock more features.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards via Stripe. Enterprise clients can also pay via invoice.",
  },
  {
    q: "What happens if I hit a plan limit?",
    a: "You'll see a friendly prompt to upgrade. We never delete your data — you just won't be able to add more until you upgrade or the next billing cycle.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. No contracts, no hidden fees. Cancel from your billing portal and you'll retain access until the end of your billing period.",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";
      const res = await fetch(`${API}/billing/plans`);
      const data = await res.json();
      // Enrich with descriptions and popular flag
      const enriched = data.map((p) => ({
        ...p,
        description: PLAN_DESCRIPTIONS[p.slug] || "",
        popular: p.slug === "growth",
      }));
      setPlans(enriched);
    } catch {
      // Fallback static plans
      setPlans([
        {
          slug: "starter", name: "Starter", price_monthly: 97, popular: false,
          description: PLAN_DESCRIPTIONS.starter,
          limits: { max_users: 3, max_clients: 10, max_scouts_per_month: 200, max_suppliers: 50, export_enabled: false, api_access: false, ai_features: false, client_portal: false },
        },
        {
          slug: "growth", name: "Growth", price_monthly: 247, popular: true,
          description: PLAN_DESCRIPTIONS.growth,
          limits: { max_users: 10, max_clients: 50, max_scouts_per_month: 1000, max_suppliers: 200, export_enabled: true, api_access: false, ai_features: true, client_portal: true },
        },
        {
          slug: "enterprise", name: "Enterprise", price_monthly: 497, popular: false,
          description: PLAN_DESCRIPtIONS.enterprise,
          limits: { max_users: 999, max_clients: 999, max_scouts_per_month: 10000, max_suppliers: 999, export_enabled: true, api_access: true, ai_features: true, client_portal: true },
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(slug) {
    router.push(`/signup?plan=${slug}`);
  }

  return (
    <div className="min-h-screen bg-[#060e1a] text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/landing")}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">EE</div>
            <span className="text-lg font-bold">Ecom Era FBA</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/login")} className="text-sm text-gray-300 hover:text-white transition">
              Log In
            </button>
            <button
              onClick={() => router.push("/signup")}
              className="text-sm bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-medium transition"
            >
              Start Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="text-center pt-20 pb-12 px-6">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Choose the plan that fits your wholesale business. All plans include the core FBA scouting engine. Upgrade anytime.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        {loading ? (
          <div className="text-center text-gray-400 py-20">Loading plans...</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 items-start">
            {plans.map((plan) => (
              <PricingCard
                key={plan.slug}
                plan={plan}
                isCurrentPlan={false}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* Feature Comparison Table */}
      <div className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-center mb-8">Feature Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 text-gray-400 font-medium">Feature</th>
                <th className="text-center py-3 text-gray-400 font-medium">Starter</th>
                <th className="text-center py-3 text-blue-400 font-medium">Growth</th>
                <th className="text-center py-3 text-gray-400 font-medium">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {[
                ["Team Members", "3", "10", "Unlimited"],
                ["Clients", "10", "50", "Unlimited"],
                ["Scouts / Month", "200", "1,000", "10,000"],
                ["Suppliers", "50", "200", "Unlimited"],
                ["CSV / PDF Export", false, true, true],
                ["AI Insights", false, true, true],
                ["Client Portal", false, true, true],
                ["API Access", false, false, true],
                ["Priority Support", false, false, true],
              ].map(([feature, s, g, e], i) => (
                <tr key={i} className="hover:bg-gray-800/30">
                  <td className="py-3 text-gray-300">{feature}</td>
                  {[s, g, e].map((val, j) => (
                    <td key={j} className="text-center py-3">
                      {typeof val === "boolean" ? (
                        val ? (
                          <span className="text-green-400">&#10003;</span>
                        ) : (
                          <span className="text-gray-600">&#10005;</span>
                        )
                      ) : (
                        <span className="text-gray-200">{val}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="border border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800/30 transition"
              >
                <span className="font-medium text-gray-200">{faq.q}</span>
                <span className="text-gray-400 text-xl ml-4">
                  {openFaq === i ? "−" : "+"}
                </span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-gray-400">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="text-center pb-20 px-6">
        <h2 className="text-2xl font-bold mb-3">Ready to scale your wholesale business?</h2>
        <p className="text-gray-400 mb-6">Join hundreds of sellers using Ecom Era FBA to find winning products.</p>
        <button
          onClick={() => router.push("/signup")}
          className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-lg font-semibold transition shadow-lg shadow-blue-600/25"
        >
          Get Started Free
        </button>
      </div>
    </div>
  );
}

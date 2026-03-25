/**
 * Ecom Era FBA SaaS v6.0 — Public Landing Page
 * Marketing page for selling the SaaS to prospective customers
 */
import { useRouter } from "next/router";

const FEATURES = [
  {
    icon: "🔍",
    title: "Bulk ASIN Scouter",
    desc: "Paste up to 50 ASINs and get instant profitability scores powered by Keepa data. BSR, price history, competition — all in one view.",
  },
  {
    icon: "📊",
    title: "Client Management",
    desc: "Track every wholesale client, their stores, revenue, and weekly performance reports. Built for agencies managing multiple accounts.",
  },
  {
    icon: "🏭",
    title: "Supplier CRM",
    desc: "Full supplier pipeline from first contact to active partnership. Track contacts, terms, and product catalogs in one place.",
  },
  {
    icon: "🤖",
    title: "AI Buy Decisions",
    desc: "Our scoring engine analyzes BSR velocity, price stability, competition density, and margins to give you a clear BUY, TEST, or REJECT verdict.",
  },
  {
    icon: "📈",
    title: "KPI Dashboard",
    desc: "Real-time metrics across your entire operation — revenue, scouting success rate, client health, and team performance at a glance.",
  },
  {
    icon: "👥",
    title: "Team & Roles",
    desc: "Invite your team with granular role-based access. Owners, admins, managers, and viewers — everyone sees only what they need.",
  },
];

const STATS = [
  { value: "10K+", label: "Products Scouted Monthly" },
  { value: "95%", label: "Scoring Accuracy" },
  { value: "3x", label: "Faster Than Manual Research" },
  { value: "$2M+", label: "Revenue Managed" },
];

const TESTIMONIALS = [
  {
    name: "Ahmed R.",
    role: "Wholesale Seller",
    text: "This platform cut my product research time by 70%. The bulk scouter alone is worth the subscription.",
  },
  {
    name: "Sarah K.",
    role: "FBA Agency Owner",
    text: "Managing 15 clients was chaos before Ecom Era FBA. Now everything is in one dashboard with real-time reporting.",
  },
  {
    name: "Omar M.",
    role: "Private Label + Wholesale",
    text: "The AI scoring is surprisingly accurate. It flagged products I would have missed and saved me from bad buys.",
  },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#060e1a] text-white">
      {/* Navigation */}
      <nav className="border-b border-gray-800 px-6 py-4 sticky top-0 bg-[#060e1a]/95 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">EE</div>
            <span className="text-lg font-bold">Ecom Era FBA</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-300">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#stats" className="hover:text-white transition">Results</a>
            <a href="#testimonials" className="hover:text-white transition">Testimonials</a>
            <button onClick={() => router.push("/pricing")} className="hover:text-white transition">Pricing</button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/login")} className="text-sm text-gray-300 hover:text-white transition">
              Log In
            </button>
            <button
              onClick={() => router.push("/signup")}
              className="text-sm bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-lg font-medium transition shadow-lg shadow-blue-600/20"
            >
              Start Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-1.5 bg-blue-900/30 border border-blue-800 rounded-full text-blue-400 text-xs font-medium">
            The #1 Platform for Amazon FBA Wholesale Teams
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
            Scout Winning Products.
            <br />
            <span className="text-blue-400">Scale Your Wholesale Business.</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Ecom Era FBA is the all-in-one platform for Amazon wholesale sellers and agencies.
            Bulk product scouting, client management, supplier CRM, AI-powered buy decisions — all under one roof.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/signup")}
              className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-xl font-semibold text-lg transition shadow-xl shadow-blue-600/25"
            >
              Get Started Free
            </button>
            <button
              onClick={() => router.push("/pricing")}
              className="border border-gray-600 hover:border-gray-400 px-8 py-4 rounded-xl font-semibold text-lg transition text-gray-300 hover:text-white"
            >
              View Pricing
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="py-16 px-6 border-y border-gray-800 bg-[#0a1628]/50">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s, i) => (
            <div key={i}>
              <div className="text-3xl md:text-4xl font-extrabold text-blue-400 mb-1">{s.value}</div>
              <div className="text-sm text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Everything You Need to Win at Wholesale</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Built by wholesale sellers, for wholesale sellers. Every feature is designed to save you time and increase profitability.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="bg-[#0a1628] border border-gray-700 rounded-xl p-6 hover:border-blue-600/50 transition group"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition">
                  {f.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            )]}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-[#0a1628]/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-extrabold text-center mb-16">How It Works</h2>
          <div className="space-y-12">
            {[
              { num: "01", title: "Sign Up & Set Up", desc: "Create your account, invite your team, and connect your Keepa API key. Takes under 2 minutes." },
              { num: "02", title: "Scout & Analyze", desc: "Paste ASINs from your supplier catalogs. Our engine pulls Keepa data and scores every product instantly." },
              { num: "03", title: "Make Smart Buys", desc: "Use AI-powered BUY/TEST/REJECT verdicts to build profitable inventory. Track everything in your dashboard." },
              { num: "04", title: "Scale With Confidence", desc: "Manage clients, suppliers, and your team from one platform. Weekly reports and KPIs keep everyone aligned." },
            ].map((s, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="text-4xl font-extrabold text-blue-600/30 flex-shrink-0 w-16">{s.num}</div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-gray-400">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold text-center mb-12">What Sellers Are Saying</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-[#0a1628] border border-gray-700 rounded-xl p-6">
                <div className="flex items-center gap-1 mb-4 text-yellow-400">
                  {"★★★★★".split("").map((s, j) => (
                    <span key={j}>{s}</span>
                  ))}
                </div>
                <p className="text-gray-300 text-sm mb-4 leading-relaxed">"{t.text}"</p>
                <div>
                  <div className="text-white font-semibold text-sm">{t.name}</div>
                  <div className="text-gray-500 text-xs">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 text-center bg-gradient-to-b from-transparent to-blue-950/20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
            Ready to Find Your Next Winning Product?
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Join the platform trusted by wholesale sellers and FBA agencies. Start scouting for free today.
          </p>
          <button
            onClick={() => router.push("/signup")}
            className="bg-blue-600 hover:bg-blue-500 px-10 py-4 rounded-xl font-semibold text-lg transition shadow-xl shadow-blue-600/25"
          >
            Get Started — It's Free
          </button>
          <p className="text-xs text-gray-600 mt-4">No credit card required. Upgrade anytime.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center font-bold text-xs">EE</div>
            <span className="text-sm text-gray-400">Ecom Era FBA SaaS v6.0</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <button onClick={() => router.push("/pricing")} className="hover:text-gray-300 transition">Pricing</button>
            <button onClick={() => router.push("/login")} className="hover:text-gray-300 transition">Login</button>
            <button onClick={() => router.push("/signup")} className="hover:text-gray-300 transition">Sign Up</button>
          </div>
          <div className="text-xs text-gray-600">
            Built by Ecom Era
          </div>
        </div>
      </footer>
  (>

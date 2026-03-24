import Link from "next/link";
import { useRouter } from "next/router";

const links = [
  { href: "/",           label: "Dashboard",   icon: "📊" },
  { href: "/analyze",    label: "Analyze ASIN", icon: "🔍" },
  { href: "/products",   label: "Products",    icon: "📦" },
  { href: "/weekly",     label: "Weekly Report",icon: "📅" },
  { href: "/leaderboard",label: "Leaderboard", icon: "🏆" },
  { href: "/suppliers",  label: "Suppliers",   icon: "🤝" },
];

export default function Sidebar() {
  const router = useRouter();
  return (
    <aside className="w-60 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col py-6 px-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-blue-400">🛒 FBA HQ</h1>
        <p className="text-xs text-gray-500 mt-1">Ecom Era Wholesale</p>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map(({ href, label, icon }) => {
          const active = router.pathname === href;
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${active
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
            >
              <span>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto text-xs text-gray-600 px-3">
        v4.0 · Ecom Era
      </div>
    </aside>
  );
}

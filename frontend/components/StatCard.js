/**
 * Ecom Era FBA SaaS v6.0 — Stat Card Component
 */
export default function StatCard({ title, value, color = "white" }) {
  const colorMap = {
    white: "text-white",
    green: "text-green-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
    amber: "text-amber-400",
    red: "text-red-400",
  };
  return (
    <div className="bg-[#12121e] border border-gray-800 rounded-xl p-4">
      <p className="text-gray-400 text-xs uppercase tracking-wide">{title}</p>
      <p className={`text-xl font-bold mt-1 ${colorMap[color] || colorMap.white}`}>{value}</p>
    </div>
  );
}

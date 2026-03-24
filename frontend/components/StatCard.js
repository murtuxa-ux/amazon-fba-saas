export default function StatCard({ title, value, sub, color = "blue" }) {
  const colors = {
    blue:   "border-blue-500 text-blue-400",
    green:  "border-green-500 text-green-400",
    red:    "border-red-500 text-red-400",
    yellow: "border-yellow-500 text-yellow-400",
  };
  return (
    <div className={`bg-gray-900 border-l-4 ${colors[color]} rounded-xl p-5`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{title}</p>
      <p className={`text-3xl font-bold ${colors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
      }

/**
 * Ecom Era FBA SaaS v6.0 — Decision Badge Component
 */
export default function DecisionBadge({ decision }) {
  const styles = {
    BUY: "bg-green-500/10 text-green-400 border-green-500/30",
    TEST: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    REJECT: "bg-red-500/10 text-red-400 border-red-500/30",
  };
  const key = (decision || "").toUpperCase();
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[key] || "bg-gray-500/10 text-gray-400 border-gray-500/30"}`}>
      {decision || "—"}
    </span>
  );
}

export default function DecisionBadge({ decision }) {
  const styles = {
    BUY:    "bg-green-900 text-green-300 border border-green-700",
    TEST:   "bg-yellow-900 text-yellow-300 border border-yellow-700",
    REJECT: "bg-red-900 text-red-300 border border-red-700",
  };
  return (
    <span className={`text-xs font-bold px-2 py-1 rounded ${styles[decision] || "bg-gray-800 text-gray-400"}`}>
      {decision}
    </span>
  );
}

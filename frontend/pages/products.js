import { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import DecisionBadge from "../components/DecisionBadge";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [filter, setFilter]     = useState("ALL");

  useEffect(() => {
    axios.get(`${API}/products`).then(r => setProducts(r.data.products || [])).catch(() => {});
  }, []);

  const visible = filter === "ALL" ? products : products.filter(p => p.decision === filter);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <h2 className="text-2xl font-bold mb-1">Product Database</h2>
        <p className="text-gray-500 text-sm mb-6">All analyzed ASINs · AI-scored</p>

        <div className="flex gap-2 mb-6">
          {["ALL","BUY","TEST","REJECT"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition
                ${filter === f ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
              {f}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-600">
            <p className="text-4xl mb-3">📦</p>
            <p>No products yet. Go to Analyze ASIN to add some.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400 text-xs">
                <tr>
                  {["ASIN","Net Profit","ROI %","AI Score","Monthly Sales","Competition","Risk","Decision"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((p, i) => (
                  <tr key={i} className={`border-t border-gray-800 ${i % 2 === 0 ? "bg-gray-950" : "bg-gray-900"}`}>
                    <td className="px-4 py-3 font-mono text-blue-400">{p.asin}</td>
                    <td className="px-4 py-3 text-green-400">${p.net_profit}</td>
                    <td className="px-4 py-3">{p.roi_pct}%</td>
                    <td className="px-4 py-3 font-bold">{p.ai_score}</td>
                    <td className="px-4 py-3">{p.monthly_sales}</td>
                    <td className="px-4 py-3">{p.competition}</td>
                    <td className={`px-4 py-3 text-xs font-semibold ${p.risk_level === "HIGH RISK" ? "text-red-400" : "text-green-400"}`}>{p.risk_level}</td>
                    <td className="px-4 py-3"><DecisionBadge decision={p.decision} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

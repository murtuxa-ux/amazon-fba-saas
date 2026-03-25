/**
 * Ecom Era FBA SaaS v6.0 ‚Äî Leaderboard
 * Manager rankings based on performance scoring
 */
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { leaderboardAPI } from "../lib/api";

const MEDAL = ["text-yellow-400", "text-gray-300", "text-amber-600"];

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leaderboardAPI.get()
      .then((res) => setLeaders(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a14]">
      <Sidebar />
      <main className="ml-60 p-6">
        <h1 className="text-2xl font-bold text-white mb-1">Leaderboard</h1>
        <p className="text-gray-400 text-sm mb-6">Manager rankings by performance</p>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leaders.length === 0 ? (
          <div className="text-center py-20"><p className="text-gray-500">No leaderboard data yet</p></div>
        ) : (
          <div className="space-y-3">
            {leaders.map((l, i) => (
              <div key={l.manager} className={`bg-[#12121e] border rounded-xl p-5 flex items-center gap-5 ${i === 0 ? "border-yellow-500/30" : "border-gray-800"}`}>
                <div className={`text-3xl font-bold w-12 text-center ${MEDAL[i] || "text-gray-500"}`}>
                  #{i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-lg">{l.manager}</p>
                  <div className="flex gap-6 mt-2 text-sm">
                    <span className="text-gray-400">Approved: <span className="text-white">{l.total_approved || 0}</span></span>
                    <span className="text-gray-400">Purchased: <span className="text-white">{l.total_purchased || 0}</span></span>
                    <span className="text-gray-400">Revenue: <span className="text-green-400">${(l.total_revenue || 0).toLocaleString()}</span></span>
                    <span className="text-gray-400">Profit: <span className="text-green-400">${(l.total_profit || 0).toLocaleString()}</span></span>
                    <span className="text-gray-400">Weeks: <span className="text-white">{l.profitable_weeks || 0}</span></span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-purple-400">{l.score?.toFixed(0) || 0}</p>
                  <p className="text-gray-500 text-xs">points</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  
  
ËÔ»È’ºò-ä35RL–‹ò@’„œ‰©îcCd6Cs~'
  }
}

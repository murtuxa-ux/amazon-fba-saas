import { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const medals = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
  const [board, setBoard] = useState([]);

  useEffect(() => {
    axios.get(`${API}/leaderboard`).then(r => setBoard(r.data.leaderboard || [])).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <h2 className="text-2xl font-bold mb-1">Manager Leaderboard</h2>
        <p className="text-gray-500 text-sm mb-6">
          Score = (Approved x 2) + (Purchased x 5) + (Profitable Weeks x 10)
        </p>

        {board.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-600">
            <p className="text-4xl mb-3">🏆</p>
            <p>No data yet. Submit weekly reports to see rankings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {board.map((m, i) => (
              <div key={m.manager}
                className={`rounded-xl p-5 border ${i === 0
                  ? "border-yellow-600 bg-yellow-950"
                  : "border-gray-800 bg-gray-900"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{medals[i] || `#${i+1}`}</span>
                  <span className="text-2xl font-black text-white">{m.score}</span>
                </div>
                <p className="font-bold text-lg">{m.manager}</p>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                  <div className="bg-gray-800 rounded p-2">
                    <p className="text-gray-500">Approved</p>
                    <p className="font-bold text-white">{m.approved}</p>
                  </div>
                  <div className="bg-gray-800 rounded p-2">
                    <p className="text-gray-500">Purchased</p>
                    <p className="font-bold text-white">{m.purchased}</p>
                  </div>
                  <div className="bg-gray-800 rounded p-2">
                    <p className="text-gray-500">Profitable</p>
                    <p className="font-bold text-green-400">{m.profitable}</p>
                  </div>
                </div>
                <div className="flex justify-between mt-3 text-xs text-gray-500">
                  <span>Revenue: <strong className="text-white">${m.revenue?.toLocaleString()}</strong></span>
                  <span>Profit: <strong className="text-green-400">${m.profit?.toLocaleString()}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

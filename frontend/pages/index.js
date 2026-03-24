import { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Dashboard() {
  const [kpis, setKpis]   = useState(null);
  const [weeks, setWeeks] = useState([]);

  useEffect(() => {
    axios.get(`${API}/dashboard`).then(r => setKpis(r.data)).catch(() => {});
    axios.get(`${API}/weekly`).then(r => setWeeks(r.data.weeks || [])).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <h2 className="text-2xl font-bold mb-1">Master Dashboard</h2>
        <p className="text-gray-500 text-sm mb-6">Real-time overview · Ecom Era Wholesale</p>

        {kpis ? (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            <StatCard title="Total Revenue"        value={`$${kpis.total_revenue.toLocaleString()}`} color="blue"   />
            <StatCard title="Total Profit"         value={`$${kpis.total_profit.toLocaleString()}`}  color="green"  />
            <StatCard title="Avg ROI"              value={`${kpis.avg_roi_pct}%`}                    color="yellow" />
            <StatCard title="BUY Decisions"        value={kpis.buy_decisions}                         color="green"  />
            <StatCard title="High Risk ASINs"      value={kpis.high_risk_asins}                       color="red"    />
            <StatCard title="Products Analyzed"    value={kpis.total_products_analyzed}               color="blue"   />
          </div>
        ) : (
          <div className="text-gray-600 mb-8">Loading KPIs… (make sure backend is running)</div>
        )}

        {weeks.length > 0 && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-gray-900 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">Weekly Revenue</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeks}>
                  <XAxis dataKey="week" tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#111827", border: "none" }} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-gray-900 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">Profit Trend</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={weeks}>
                  <XAxis dataKey="week" tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#111827", border: "none" }} />
                  <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {weeks.length === 0 && (
          <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-600">
            <p className="text-4xl mb-3">📅</p>
            <p>No weekly reports yet. Go to <strong className="text-gray-400">Weekly Report</strong> to add data.</p>
          </div>
        )}
      </main>
    </div>
  );
          }

import { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const Field = ({ label, name, value, onChange, type = "text" }) => (
  <div>
    <label className="block text-xs text-gray-400 mb-1">{label}</label>
    <input type={type} name={name} value={value} onChange={onChange}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
  </div>
);

export default function Weekly() {
  const [form, setForm] = useState({
    week: "", manager: "", hunted: "", analyzed: "", contacted: "",
    approved: "", purchased: "", revenue: "", profit: "",
  });
  const [weeks, setWeeks]   = useState([]);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState("");

  const load = () => axios.get(`${API}/weekly`).then(r => setWeeks(r.data.weeks || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async () => {
    if (!form.week || !form.manager) { setError("Week and Manager are required."); return; }
    setError("");
    try {
      await axios.post(`${API}/weekly`, {
        week: form.week, manager: form.manager,
        hunted:    parseInt(form.hunted)    || 0,
        analyzed:  parseInt(form.analyzed)  || 0,
        contacted: parseInt(form.contacted) || 0,
        approved:  parseInt(form.approved)  || 0,
        purchased: parseInt(form.purchased) || 0,
        revenue:   parseFloat(form.revenue) || 0,
        profit:    parseFloat(form.profit)  || 0,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setForm({ week:"", manager:"", hunted:"", analyzed:"", contacted:"", approved:"", purchased:"", revenue:"", profit:"" });
      load();
    } catch { setError("Could not reach backend."); }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <h2 className="text-2xl font-bold mb-1">Weekly Report</h2>
        <p className="text-gray-500 text-sm mb-6">Submit your team's weekly performance numbers</p>

        <div className="bg-gray-900 rounded-xl p-6 mb-8 max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Week (e.g. Week 12)" name="week"      value={form.week}      onChange={handle} />
            <Field label="Manager Name"         name="manager"  value={form.manager}   onChange={handle} />
            <Field label="Products Hunted"      name="hunted"   value={form.hunted}    onChange={handle} type="number" />
            <Field label="Products Analyzed"    name="analyzed" value={form.analyzed}  onChange={handle} type="number" />
            <Field label="Suppliers Contacted"  name="contacted" value={form.contacted} onChange={handle} type="number" />
            <Field label="Products Approved"    name="approved" value={form.approved}  onChange={handle} type="number" />
            <Field label="Products Purchased"   name="purchased" value={form.purchased} onChange={handle} type="number" />
            <Field label="Revenue ($)"          name="revenue"  value={form.revenue}   onChange={handle} type="number" />
            <Field label="Profit ($)"           name="profit"   value={form.profit}    onChange={handle} type="number" />
          </div>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          {saved && <p className="text-green-400 text-sm mt-3">Report saved!</p>}
          <button onClick={submit}
            className="mt-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition">
            Submit Report
          </button>
        </div>

        {weeks.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400 text-xs">
                <tr>
                  {["Week","Manager","Hunted","Analyzed","Contacted","Approved","Purchased","Revenue","Profit","ROI %"].map(h => (
                    <th key={h} className="px-3 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((w, i) => (
                  <tr key={i} className={`border-t border-gray-800 ${i%2===0?"bg-gray-950":"bg-gray-900"}`}>
                    <td className="px-3 py-2 text-blue-400">{w.week}</td>
                    <td className="px-3 py-2">{w.manager}</td>
                    <td className="px-3 py-2">{w.hunted}</td>
                    <td className="px-3 py-2">{w.analyzed}</td>
                    <td className="px-3 py-2">{w.contacted}</td>
                    <td className="px-3 py-2 text-green-400">{w.approved}</td>
                    <td className="px-3 py-2 text-green-400">{w.purchased}</td>
                    <td className="px-3 py-2">${w.revenue?.toLocaleString()}</td>
                    <td className="px-3 py-2 text-green-400">${w.profit?.toLocaleString()}</td>
                    <td className="px-3 py-2">{w.roi_pct}%</td>
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

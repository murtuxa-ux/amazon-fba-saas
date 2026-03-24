import { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const Field = ({ label, name, value, onChange, type = "text", placeholder = "" }) => (
  <div>
    <label className="block text-xs text-gray-400 mb-1">{label}</label>
    <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
  </div>
);

export default function Suppliers() {
  const [form, setForm] = useState({ name:"", brand:"", contact:"", response_rate:"", approval_rate:"", notes:"" });
  const [suppliers, setSuppliers] = useState([]);
  const [saved, setSaved]         = useState(false);

  const load = () => axios.get(`${API}/suppliers`).then(r => setSuppliers(r.data.suppliers || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async () => {
    if (!form.name || !form.brand) return;
    await axios.post(`${API}/suppliers`, {
      ...form,
      response_rate: parseFloat(form.response_rate) || 0.5,
      approval_rate: parseFloat(form.approval_rate) || 0.5,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    setForm({ name:"", brand:"", contact:"", response_rate:"", approval_rate:"", notes:"" });
    load();
  };

  const priorityColor = (score) => {
    if (score >= 0.7) return "text-green-400";
    if (score >= 0.4) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <h2 className="text-2xl font-bold mb-1">Supplier CRM</h2>
        <p className="text-gray-500 text-sm mb-6">Track suppliers, approval rates, and priority scores</p>

        <div className="bg-gray-900 rounded-xl p-6 mb-8 max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Supplier Name"       name="name"          value={form.name}          onChange={handle} />
            <Field label="Brand"               name="brand"         value={form.brand}         onChange={handle} />
            <Field label="Contact Info"        name="contact"       value={form.contact}       onChange={handle} placeholder="email / phone" />
            <Field label="Response Rate (0-1)" name="response_rate" value={form.response_rate} onChange={handle} type="number" placeholder="0.8" />
            <Field label="Approval Rate (0-1)" name="approval_rate" value={form.approval_rate} onChange={handle} type="number" placeholder="0.6" />
            <Field label="Notes"               name="notes"         value={form.notes}         onChange={handle} />
          </div>
          {saved && <p className="text-green-400 text-sm mt-3">Supplier saved!</p>}
          <button onClick={submit}
            className="mt-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition">
            Add Supplier
          </button>
        </div>

        {suppliers.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400 text-xs">
                <tr>
                  {["Supplier","Brand","Contact","Response","Approval","Priority","Notes"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s, i) => (
                  <tr key={i} className={`border-t border-gray-800 ${i%2===0?"bg-gray-950":"bg-gray-900"}`}>
                    <td className="px-4 py-2 font-medium">{s.name}</td>
                    <td className="px-4 py-2 text-blue-400">{s.brand}</td>
                    <td className="px-4 py-2 text-gray-400">{s.contact}</td>
                    <td className="px-4 py-2">{(s.response_rate*100).toFixed(0)}%</td>
                    <td className="px-4 py-2">{(s.approval_rate*100).toFixed(0)}%</td>
                    <td className={`px-4 py-2 font-bold ${priorityColor(s.priority_score)}`}>{s.priority_score}</td>
                    <td className="px-4 py-2 text-gray-500">{s.notes}</td>
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

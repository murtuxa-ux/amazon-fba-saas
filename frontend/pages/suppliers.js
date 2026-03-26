import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://amazon-fba-saas-production.up.railway.app";

const token = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("ecomera_token");
  }
  return null;
};

const authHeader = () => ({
  Authorization: `Bearer ${token()}`,
  "Content-Type": "application/json",
});

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    contact: "",
    response_rate: "",
    approval_rate: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/suppliers`, {
        headers: authHeader(),
      });
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      const data = await response.json();
      setSuppliers(data.suppliers || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      const payload = {
        ...formData,
        response_rate: parseFloat(formData.response_rate) || 0,
        approval_rate: parseFloat(formData.approval_rate) || 0,
      };

      const response = await fetch(`${API_URL}/suppliers`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add supplier");
      }

      const data = await response.json();
      setSuppliers([...suppliers, data.supplier]);
      setFormData({
        name: "",
        brand: "",
        contact: "",
        response_rate: "",
        approval_rate: "",
        notes: "",
      });
      setShowModal(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const calculatePriorityScore = (responseRate, approvalRate) => {
    return (responseRate * 0.5 + approvalRate * 0.5).toFixed(1);
  };

  const getPriorityColor = (score) => {
    if (score > 75) return green;
    if (score > 50) return yellow;
    return red;
  };

  const bg = "#0A0A0A";
  const cardBg = "#111111";
  const border = "#1E1E1E";
  const yellow = "#FFD700";
  const text = "#FFFFFF";
  const textSec = "#888888";
  const green = "#22C55E";
  const red = "#EF4444";
  const blue = "#3B82F6";

  const inputStyle = {
    padding: "0.75rem",
    background: cardBg,
    border: `1px solid ${border}`,
    borderRadius: "6px",
    color: text,
    fontSize: "0.875rem",
    width: "100%",
  };

  const buttonStyle = {
    padding: "0.75rem 1.5rem",
    background: blue,
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "0.875rem",
  };

  const modalStyle = {
    display: showModal ? "flex" : "none",
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  };

  const modalContentStyle = {
    background: cardBg,
    border: `1px solid ${border}`,
    borderRadius: "8px",
    padding: "2rem",
    maxWidth: "500px",
    width: "90%",
    maxHeight: "90vh",
    overflowY: "auto",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "1.5rem",
  };

  const thStyle = {
    background: "#1a1a1a",
    border: `1px solid ${border}`,
    padding: "0.75rem",
    textAlign: "left",
    fontSize: "0.75rem",
    fontWeight: "600",
    color: textSec,
  };

  const tdStyle = {
    border: `1px solid ${border}`,
    padding: "0.75rem",
    fontSize: "0.875rem",
    color: text,
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.875rem",
    fontWeight: "600",
    color: text,
    marginBottom: "0.5rem",
  };

  const sortedSuppliers = [...suppliers].sort((a, b) => {
    const scoreA = calculatePriorityScore(a.response_rate || 0, a.approval_rate || 0);
    const scoreB = calculatePriorityScore(b.response_rate || 0, b.approval_rate || 0);
    return scoreB - scoreA;
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: bg, color: text, fontFamily: "system-ui" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "2rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: "bold", margin: 0 }}>Suppliers</h1>
            <button onClick={() => setShowModal(true)} style={buttonStyle}>
              + Add Supplier
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: textSec }}>Loading suppliers...</div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "3rem", color: red }}>Error: {error}</div>
          ) : sortedSuppliers.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                color: textSec,
                background: cardBg,
                border: `1px solid ${border}`,
                borderRadius: "8px",
              }}
            >
              <p style={{ marginBottom: "1rem" }}>No suppliers added yet</p>
              <button onClick={() => setShowModal(true)} style={buttonStyle}>
                Add Your First Supplier
              </button>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Brand</th>
                    <th style={thStyle}>Contact</th>
                    <th style={thStyle}>Response Rate %</th>
                    <th style={thStyle}>Approval Rate %</th>
                    <th style={thStyle}>Priority Score</th>
                    <th style={thStyle}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSuppliers.map((supplier, idx) => {
                    const priorityScore = calculatePriorityScore(supplier.response_rate || 0, supplier.approval_rate || 0);
                    const scoreColor = getPriorityColor(parseFloat(priorityScore));

                    return (
                      <tr key={idx}>
                        <td style={tdStyle}>
                          <strong>{supplier.name}</strong>
                        </td>
                        <td style={tdStyle}>{supplier.brand || "-"}</td>
                        <td style={tdStyle}>{supplier.contact || "-"}</td>
                        <td style={tdStyle}>{(supplier.response_rate || 0).toFixed(1)}%</td>
                        <td style={tdStyle}>{(supplier.approval_rate || 0).toFixed(1)}%</td>
                        <td style={tdStyle}>
                          <span style={{ color: scoreColor, fontWeight: "bold" }}>{priorityScore}</span>
                        </td>
                        <td style={tdStyle}>{supplier.notes || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={modalStyle} onClick={() => setShowModal(false)}>
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem" }}>Add New Supplier</h2>

              <form onSubmit={handleAddSupplier}>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={labelStyle}>Supplier Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="e.g., Alibaba Supplier Inc."
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={labelStyle}>Brand</label>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleFormChange}
                    placeholder="e.g., Brand Name"
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={labelStyle}>Contact</label>
                  <input
                    type="text"
                    name="contact"
                    value={formData.contact}
                    onChange={handleFormChange}
                    placeholder="e.g., contact@supplier.com or +1234567890"
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={labelStyle}>Response Rate % (0-100)</label>
                    <input
                      type="number"
                      name="response_rate"
                      value={formData.response_rate}
                      onChange={handleFormChange}
                      placeholder="75"
                      min="0"
                      max="100"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Approval Rate % (0-100)</label>
                    <input
                      type="number"
                      name="approval_rate"
                      value={formData.approval_rate}
                      onChange={handleFormChange}
                      placeholder="85"
                      min="0"
                      max="100"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={labelStyle}>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleFormChange}
                    placeholder="Add any additional information about this supplier..."
                    style={{
                      ...inputStyle,
                      minHeight: "80px",
                      resize: "vertical",
                    }}
                  />
                </div>

                {formError && (
                  <div
                    style={{
                      padding: "0.75rem",
                      background: red,
                      color: "#fff",
                      borderRadius: "6px",
                      marginBottom: "1rem",
                      fontSize: "0.875rem",
                    }}
                  >
                    Error: {formError}
                  </div>
                )}

                <div style={{ display: "flex", gap: "1rem" }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      ...buttonStyle,
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {saving ? "Adding..." : "Add Supplier"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      padding: "0.75rem 1.5rem",
                      background: "#1a1a1a",
                      border: `1px solid ${border}`,
                      color: text,
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "0.875rem",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

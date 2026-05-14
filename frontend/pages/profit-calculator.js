import { useState } from "react";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";

const T = {
  bg: "#0A0A0A",
  card: "#111111",
  border: "#1E1E1E",
  yellow: "#FFD700",
  yellowDim: "rgba(255,215,0,0.12)",
  text: "#FFFFFF",
  textSec: "#888888",
  textMut: "#555555",
  green: "#22C55E",
  red: "#EF4444",
};

export default function ProfitCalculator() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    productCost: "",
    amazonPrice: "",
    fbaFee: "",
    referralPct: "15",
    shippingCost: "",
    unitsPerCase: "1",
    casesOrdered: "1",
    otherFees: "",
  });
  const [result, setResult] = useState(null);

  const update = (field, value) => setForm({ ...form, [field]: value });

  const calculate = () => {
    const cost = parseFloat(form.productCost) || 0;
    const price = parseFloat(form.amazonPrice) || 0;
    const fba = parseFloat(form.fbaFee) || 0;
    const referral = (parseFloat(form.referralPct) || 15) / 100;
    const shipping = parseFloat(form.shippingCost) || 0;
    const units = (parseFloat(form.unitsPerCase) || 1) * (parseFloat(form.casesOrdered) || 1);
    const other = parseFloat(form.otherFees) || 0;

    const referralFee = price * referral;
    const totalCostPerUnit = cost + fba + referralFee + shipping + other;
    const profitPerUnit = price - totalCostPerUnit;
    const roi = cost > 0 ? ((profitPerUnit / cost) * 100) : 0;
    const margin = price > 0 ? ((profitPerUnit / price) * 100) : 0;
    const totalProfit = profitPerUnit * units;
    const totalRevenue = price * units;
    const totalCost = totalCostPerUnit * units;

    setResult({
      referralFee: referralFee.toFixed(2),
      totalCostPerUnit: totalCostPerUnit.toFixed(2),
      profitPerUnit: profitPerUnit.toFixed(2),
      roi: roi.toFixed(1),
      margin: margin.toFixd(1),
      totalUnits: units,
      totalProfit: totalProfit.toFixed(2),
      totalRevenue: totalRevenue.toFixed(2),
      totalCost: totalCost.toFixed(2),
    });
  };

  const S = {
    page: { display: "flex", minHeight: "100vh", backgroundColor: T.bg, color: T.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    // BUG-27 Sprint 2: marginLeft offsets the position:fixed Sidebar.
    main: { flex: 1, marginLeft: "250px", padding: "32px", overflowY: "auto" },
    title: { fontSize: "24px", fontWeight: 700, marginBottom: "8px" },
    subtitle: { fontSize: "14px", color: T.textSec, marginBottom: "32px" },
    grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" },
    card: { backgroundColor: T.card, border: "1px solid " + T.border, borderRadius: "8px", padding: "24px" },
    cardTitle: { fontSize: "16px", fontWeight: 600, marginBottom: "20px" },
    fieldGroup: { marginBottom: "16px" },
    label: { display: "block", fontSize: "12px", color: T.textSec, textTransform: "uppercase", letterSpacing: "0.05em",  marginBottom: "6px" },
    input: { width: "100%", padding: "10px 12px", backgroundColor: T.bg, border: "1px solid " + T.border, borderRadius: "6px", color: T.text, fontSize: "14px", boxSizing: "border-box", outline: "none" },
    btn: { width: "100%", padding: "12px", backgroundColor: T.yellow, color: "#000", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: 600, cursor: "pointer", marginTop: "8px" },
    resultGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
    resultItem: { backgroundColor: T.bg, border: "1px solid " + T.border, borderRadius: "6px", padding: "16px" },
    resultLabel: { fontSize: "11px", color: T.textMut, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" },
    resultValue: { fontSize: "22px", fontWeight: 700 },
    resultBig: { backgroundColor: T.bg, border: "1px solid " + T.border, borderRadius: "6px", padding: "20px", gridColumn: "1 / -1", textAlign: "center" },
  };

  const Field = ({ label, field, placeholder, prefix }) => (
    <div style={S.fieldGroup}>
      <label style={S.label}>{label}</label>
      <div style={{ position: "relative" }}>
        {prefix && <span style={{ position: "absolute", left: "12px", top: "10px", color: T.textMut, fontSize: "14px" }}>{prefix}</span>}
        <input
          style={{ ...S.input, paddingLeft: prefix ? "24px" : "12px" }}
          type="number"
          step="0.01"
          placeholder={placeholder || "0.00"}
          value={form[field]}
          onChange={(e) => update(field, e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <Sidebar />
      <main style={S.main}>
        {/* BUG-28 Sprint 3: was <div>; bumped to <h1> for a11y / SEO. */}
        <h1 style={{ ...S.title, margin: 0 }}>Wholesale Profit Calculator</h1>
        <div style={S.subtitle}>Calculate ROI, margins, and profitability for wholesale products</div>

        <div style={S.grid}>
          <div style={S.card}>
            <div style={S.cardTitle}>Product Details</div>
            <Field label="Product Cost (per unit)" field="productCost" prefix="$" />
            <Field label="Amazon Selling Price" field="amazonPrice" prefix="$" />
            <Field label="FBA Fee (per unit)" field="fbaFee" prefix="$" />
            <Field label="Referral Fee %" field="referralPct" placeholder="15" />
            <Field label="Inbound Shipping (per unit)" field="shippingCost" prefix="$" />
            <Field label="Other Fees (per unit)" field="otherFees" prefix="$" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Field label="Units per Case" field="unitsPerCase" placeholder="1" />
              <Field label="Cases to Order" field="casesOrdered" placeholder="1" />
            </div>
            <button style={S.btn} onClick={calculate}>Calculate Profit</button>
          </div>

          <div style={S.card}>
            <div style={S.cardTitle}>Profitability Analysis</div>
            {result ? (
              <div style={S.resultGrid}>
                <div style={S.resultItem}>
                  <div style={S.resultLabel}>Profit per Unit</div>
                  <div style={{ ...S.resultValue, color: parseFloat(result.profitPerUnit) >= 0 ? T.green : T.red }}>
                    ${result.profitPerUnit}
                  </div>
                </div>
                <div style={S.resultItem}>
                  <div style={S.resultLabel}>ROI</div>
                  <div style={{ ...S.resultValue, color: parseFloat(result.roi) >= 30 ? T.green : parseFloat(result.roi) >= 15 ? T.yellow : T.red }}>
                    {result.roi}%
                  </div>
                </div>
                <div style={S.resultItem}>
                  <div style={S.resultLabel}>Margin</div>
                  <div style={{ ...S.resultValue, color: parseFloat(result.margin) >= 20 ? T.green : T.yellow }}>
                    {result.margin}%
                  </div>
                </div>
                <div style={S.resultItem}>
                  <div style={S.resultLabel}>Referral Fee</div>
                  <div style={S.resultValue}>${result.referralFee}</div>
                </div>
                <div style={S.resultItem}>
                  <div style={S.resultLabel}>Total Cost/Unit</div>
                  <div style={S.resultValue}>${result.totalCostPerUnit}</div>
                </div>
                <div style={S.resultItem}>
                  <div style={S.resultLabel}>Total Units</div>
                  <div style={S.resultValue}>{result.totalUnits}</div>
                </div>
                <div style={S.resultBig}>
                  <div style={S.resultLabel}>Total Estimated Profit</div>
                  <div style={{ ...S.resultValue, fontSize: "32px", color: parseFloat(result.totalProfit) >= 0 ? T.green : T.red }}>
                    ${parseFloat(result.totalProfit).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: "12px", color: T.textMut, marginTop: "8px" }}>
                    Revenue: ${parseFloat(result.totalRevenue).toLocaleString("en-US", { minimumFractionDigits: 2 })} |
                    Cost: ${parseFloat(result.totalCost).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>&#9638;</div>
                <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>Enter Product Details</div>
                <div style={{ fontSize: "13px", color: T.textSec }}>
                  Fill in the product costs and pricing on the left, then click Calculate to see profitability analysis.
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

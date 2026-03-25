/**
 * Ecom Era FBA SaaS v6.0 — Analysis Page
 * Competitor analysis, price trends
 */
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { analysisAPI } from "../lib/api";

export default function AnalyzesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analysisAPI.get()
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

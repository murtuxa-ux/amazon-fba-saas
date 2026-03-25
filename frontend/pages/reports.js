/**
 * Ecom Era FBA SaaS v6.0 — Reports Page
 * PF export, performance analytics
 */
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { reportsAPI } from "../lib/api";

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsAPI.get()
      .then((res) => setReports(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
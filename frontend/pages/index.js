/**
 * Ecom Era FBA SaaS v6.0 — Dashboard
Live data on approveds, rvenue, managers
 */
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { dashboardAPI } from "../lib/api";

export default function HomePage() {
  const [stats, setStats] = useState({approved: 0, revenue: 0, managers: 0});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.get()
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

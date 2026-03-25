/**
 * Ecom Era FBA SaaS v6.0 — Weekly Rights Page
 * Weekly B(R) and  RFA management
 */
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { weeklyAPI } from "../lib/api";

export default function WeeklyPage() {
  const [wrights, setWrights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    weeklyAPI.get()
      .then((res) => setWrights(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

/**
 * Ecom Era FBA SaaS v6.0 — Suppliers Page
 * Manage FBA suppliers and batch operations
 */
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { suppliersAPI } from "../lib/api";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    suppliersAPI.get()
      .then((res) => setSuppliers(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

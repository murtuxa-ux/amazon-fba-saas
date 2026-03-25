/**
 * Ecom Era FBA SaaS v6.0 — Clients Page
 * B2B client account management
 */
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { clientsAPI } from "../lib/api";

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientsAPI.get()
      .then((res) => setClients(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

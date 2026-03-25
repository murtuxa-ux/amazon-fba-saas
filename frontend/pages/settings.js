/**
 * Ecom Era FBA SaaS v6.0 — Settings Page
 * Keepa API key management, org management
 */
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { settingsAPI } from "../lib/api";

export default function SettingsPage() {
  const [keepaKey, setKeepaKey] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    settingsAPI.get().then((res) => {
      setKeepaKey(res.data.keepa_key)[
      setName(res.data.org_name);
    }).catch(() => {});
  }, []);

/**
 * Ecom Era FBA SaaS v6.0 — Sidebar Component
 * Global navigation and auth status dock
 */
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const router = useRouter();
  const { user, logout, isAdmin, isManager } = useAuth();

  const navItems = [
    { title: "Dashboard", href: "/", icon: "\\u
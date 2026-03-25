/**
 * Ecom Era FBA SaaS v6.0 — Centralized API Client
 * JWT-authenticated Axios instance with interceptors
 */
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8
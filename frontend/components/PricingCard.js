/**
 * Ecom Era FBA SaaS v6.0 — PricingCard Component
 * Reusable pricing tier card with feature list and CTA
 */
import { useState } from "react";

const CHECK = (
  <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);
const CROSS = (
  <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function PricingCard({ plan, isCurrentPlan, onSelect, loading }) {
  const {
    slug,
    name,
    price_monthly,
    limits,
    popular,
    description,
  } = plan;

  const features = [
    { label: `Up to ${limits.max_users} team members`, enabled: true },
    { label: `Up to ${limits.max_clients} clients`, enabled: true },
    { label: `${limits.max_scouts_per_month.toLocaleString()} scouts/month`, enabled: true },
    { label: `Up to ${limits.max_suppliers} suppliers`, enabled: true },
    { label: "CSV / PDF Export", enabled: limits.export_enabled },
    { label: "AI-Powered Insights", enabled: limits.ai_features },
    { label: "Client Portal", enabled: limits.client_portal },
    { label: "API Access", enabled: limits.api_access },
  ];

  return (
    <div
      className={`relative rounded-2xl border p-8 flex flex-col transition-all duration-200 ${
        popular
          ? "border-blue-500 bg-[#0d1b2a] shadow-lg shadow-blue-500/10 scale-105"
          : "border-gray-700 bg-[#0a1628] hover:border-gray-500"
      }`}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
          Most Popular
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-1">{name}</h3>
        <p className="text-sm text-gray-400">{description}</p>
      </div>

      <div className="mb-8">
        <span className="text-4xl font-extrabold text-white">${price_monthly}</span>
        <span className="text-gray-400 text-sm ml-1">/month</span>
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            {f.enabled ? CHECK : CROSS}
            <span className={f.enabled ? "text-gray-200" : "text-gray-500 line-through"}>
              {f.label}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect && onSelect(slug)}
        disabled={isCurrentPlan || loading}
        className={`w-full py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
          isCurrentPlan
            ? "bg-gray-700 text-gray-400 cursor-not-allowed"
            : popular
            ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25"
            : "bg-gray-700 hover:bg-gray-600 text-white"
        }`}
      >
        {isCurrentPlan ? "Current Plan" : loading ? "Processing..." : `Get ${name}`}
      </button>
    </div>
  (>

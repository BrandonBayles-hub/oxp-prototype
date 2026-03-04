"use client";

import {
  LayoutDashboard,
  Users,
  FileText,
  Home,
  DollarSign,
  Wrench,
  Settings,
  AppWindow,
  Search,
  Bell,
  CircleHelp,
  UserCircle,
} from "lucide-react";
import { useRole, ROLES, type Role } from "@/lib/role-context";
import { useContract } from "@/lib/contract-context";

const NAV_ITEMS = [
  { label: "OXP", active: true },
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Leads", icon: Users },
  { label: "Applicants", icon: FileText },
  { label: "Residents", icon: Home },
  { label: "Accounting", icon: DollarSign },
  { label: "Tools", icon: Wrench },
  { label: "Tools", icon: Settings },
  { label: "Apps", icon: AppWindow },
  { label: "Settings", icon: Settings },
  { label: "Settings", icon: Settings },
] as const;

export function EntrataTopNav() {
  const { role, setRole } = useRole();
  const { contracted, setContracted, r1Mode, setR1Mode } = useContract();

  return (
    <div className="shrink-0 select-none" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Primary bar */}
      <div
        className="relative flex items-center justify-between"
        style={{ background: "#F5F5F5", height: 40, padding: "0 16px", borderBottom: "1px solid #E0E0E0", zIndex: 10 }}
      >
        <div className="flex items-center gap-0">
          {/* Entrata wordmark */}
          <svg width="62" height="16" viewBox="0 0 62 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text
              x="0"
              y="13"
              style={{ fontSize: 15, fontWeight: 700, fontFamily: "Inter, system-ui, sans-serif", letterSpacing: "0.3px" }}
              fill="#CC0000"
            >
              entrata
            </text>
          </svg>
          <span style={{ color: "rgba(0,0,0,0.15)", margin: "0 12px", fontSize: 18, fontWeight: 300 }}>
            |
          </span>
          <span style={{ color: "#333", fontSize: 13, fontWeight: 400 }}>Harvest Peak Capital</span>
        </div>

        {/* Role switcher */}
        <div
          className="absolute left-1/2 flex -translate-x-1/2 items-center"
          style={{ background: "#E8E8E8", borderRadius: 6, padding: 2, gap: 2 }}
        >
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value as Role)}
              style={{
                height: 26,
                padding: "0 12px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: role === r.value ? 600 : 500,
                color: role === r.value ? "#1a1a1a" : "rgba(0,0,0,0.45)",
                background: role === r.value ? "#fff" : "transparent",
                boxShadow: role === r.value ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                transition: "all 150ms",
                whiteSpace: "nowrap",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {/* R1 demo toggle */}
          <button
            type="button"
            onClick={() => setR1Mode(!r1Mode)}
            className="flex items-center gap-1.5 rounded"
            style={{
              height: 28,
              padding: "0 10px",
              fontSize: 11,
              fontWeight: 600,
              color: r1Mode ? "#1e40af" : "#6b7280",
              background: r1Mode ? "#dbeafe" : "#f3f4f6",
              border: `1.5px solid ${r1Mode ? "#3b82f6" : "#d1d5db"}`,
              transition: "all 150ms",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: r1Mode ? "#3b82f6" : "#9ca3af",
                flexShrink: 0,
              }}
            />
            R1
          </button>

          {/* Contract demo toggle */}
          <button
            type="button"
            onClick={() => setContracted(!contracted)}
            className="flex items-center gap-1.5 rounded"
            style={{
              height: 28,
              padding: "0 10px",
              fontSize: 11,
              fontWeight: 600,
              color: contracted ? "#92400e" : "#92400e",
              background: contracted ? "#fef3c7" : "#fef9c3",
              border: `1.5px solid ${contracted ? "#fbbf24" : "#facc15"}`,
              transition: "all 150ms",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: contracted ? "#16a34a" : "#dc2626",
                flexShrink: 0,
              }}
            />
            {contracted ? "Contracted" : "Not Contracted"}
          </button>

          <button
            type="button"
            className="flex items-center justify-center rounded"
            style={{ width: 32, height: 32, color: "rgba(0,0,0,0.45)" }}
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex items-center justify-center rounded"
            style={{ width: 32, height: 32, color: "rgba(0,0,0,0.45)" }}
          >
            <CircleHelp className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex items-center justify-center rounded"
            style={{ width: 32, height: 32, color: "rgba(0,0,0,0.45)" }}
          >
            <UserCircle className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded px-2.5"
            style={{
              height: 28,
              background: "rgba(0,0,0,0.04)",
              color: "rgba(0,0,0,0.45)",
              fontSize: 12,
              border: "1px solid rgba(0,0,0,0.1)",
            }}
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* Tab navigation bar */}
      <div
        className="flex items-center"
        style={{ background: "#333333", height: 36, padding: "0 8px", gap: 2 }}
      >
        {NAV_ITEMS.map((item, i) => {
          const Icon = "icon" in item ? item.icon : null;
          return (
            <button
              key={`${item.label}-${i}`}
              type="button"
              className="flex items-center gap-1 whitespace-nowrap rounded-sm"
              style={{
                height: 26,
                padding: "0 10px",
                fontSize: 11.5,
                fontWeight: 500,
                color: "active" in item && item.active ? "#fff" : "rgba(255,255,255,0.75)",
                background: "active" in item && item.active ? "#CC0000" : "transparent",
                transition: "background 150ms",
              }}
              onMouseEnter={(e) => {
                if (!("active" in item && item.active)) e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              }}
              onMouseLeave={(e) => {
                if (!("active" in item && item.active)) e.currentTarget.style.background = "transparent";
              }}
            >
              {Icon && <Icon style={{ width: 13, height: 13, strokeWidth: 1.5 }} />}
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

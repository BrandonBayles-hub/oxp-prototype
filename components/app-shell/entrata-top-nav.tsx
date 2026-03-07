"use client";

import { useEffect, useState } from "react";
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
  Rocket,
  Clock,
} from "lucide-react";
import { useRole, ROLES, type Role } from "@/lib/role-context";
import { useR1Demo } from "@/lib/r1-demo-context";
import { useComingSoon } from "@/lib/coming-soon-context";

const DEMO_CONTROLS_KEY = "oxp-demo-controls-visible";

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

function ComingSoonToggle() {
  const { isComingSoonEnabled, toggleComingSoon } = useComingSoon();

  return (
    <button
      type="button"
      onClick={toggleComingSoon}
      title="Demo control — toggle coming soon overlay on unreleased pages"
      className="flex items-center gap-1.5 rounded-md transition-all"
      style={{
        height: 28,
        padding: "0 10px",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.3px",
        color: isComingSoonEnabled ? "#fff" : "rgba(0,0,0,0.5)",
        background: isComingSoonEnabled
          ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
          : "rgba(0,0,0,0.04)",
        border: isComingSoonEnabled ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(0,0,0,0.1)",
        boxShadow: isComingSoonEnabled ? "0 1px 4px rgba(245,158,11,0.3)" : "none",
      }}
    >
      <Clock style={{ width: 12, height: 12, strokeWidth: 2 }} />
      Coming Soon
    </button>
  );
}

function R1DemoToggle() {
  const { isR1Preview, toggleR1Preview } = useR1Demo();

  return (
    <button
      type="button"
      onClick={toggleR1Preview}
      title="Demo control — toggle R1 release preview"
      className="flex items-center gap-1.5 rounded-md transition-all"
      style={{
        height: 28,
        padding: "0 10px",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.5px",
        color: isR1Preview ? "#fff" : "rgba(0,0,0,0.5)",
        background: isR1Preview
          ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
          : "rgba(0,0,0,0.04)",
        border: isR1Preview ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(0,0,0,0.1)",
        boxShadow: isR1Preview ? "0 1px 4px rgba(99,102,241,0.3)" : "none",
      }}
    >
      <Rocket style={{ width: 12, height: 12, strokeWidth: 2 }} />
      R1
    </button>
  );
}

export function EntrataTopNav() {
  const { role, setRole } = useRole();
  const [showDemoControls, setShowDemoControls] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DEMO_CONTROLS_KEY);
      if (stored !== null) setShowDemoControls(stored === "true");
    } catch { /* ignore */ }
  }, []);

  const toggleDemoControls = () => {
    setShowDemoControls((prev) => {
      const next = !prev;
      try { localStorage.setItem(DEMO_CONTROLS_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  return (
    <div className="shrink-0 select-none" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Primary bar */}
      <div
        className="flex items-center justify-between"
        style={{ background: "#F5F5F5", height: 40, padding: "0 16px", borderBottom: "1px solid #E0E0E0" }}
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

        {/* Role switcher + Contract view toggle */}
        {showDemoControls && (
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-3">
            <div
              className="flex items-center"
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
          </div>
        )}

        <div className="flex items-center gap-1">
          {showDemoControls && (
            <>
              <ComingSoonToggle />
              <R1DemoToggle />
            </>
          )}
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
          <label
            title="Show/hide demo controls"
            className="ml-1 flex cursor-pointer items-center gap-1"
          >
            <input
              type="checkbox"
              checked={showDemoControls}
              onChange={toggleDemoControls}
              className="h-3 w-3 rounded border-gray-300 accent-gray-500"
            />
            <span style={{ fontSize: 9, fontWeight: 500, color: "rgba(0,0,0,0.3)", letterSpacing: "0.3px" }}>
              DEMO
            </span>
          </label>
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
                color: ("active" in item && item.active) ? "#1a1a1a" : "rgba(255,255,255,0.75)",
                background: ("active" in item && item.active) ? "#fff" : "transparent",
                borderRadius: ("active" in item && item.active) ? 4 : undefined,
                transition: "background 150ms",
              }}
              onMouseEnter={(e) => {
                if (!("active" in item && item.active)) e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              }}
              onMouseLeave={(e) => {
                if (!("active" in item && item.active)) e.currentTarget.style.background = "transparent";
              }}
            >
              {("active" in item && item.active) && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 2 }}>
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="m3.3 7 8.7 5 8.7-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 22V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {Icon && <Icon style={{ width: 13, height: 13, strokeWidth: 1.5 }} />}
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

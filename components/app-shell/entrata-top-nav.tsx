"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
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
  ChevronDown,
  Beaker,
  Map,
  Smartphone,
} from "lucide-react";
import { MobileAppPreview } from "@/components/mobile-app-preview";
import { useRole, ROLES, type Role } from "@/lib/role-context";

import { useR1Release } from "@/lib/r1-release-context";
import { useR2Release } from "@/lib/r2-release-context";
import { useRoadmap } from "@/lib/roadmap-context";

import { useWorkforce } from "@/lib/workforce-context";
import { useEscalations } from "@/lib/escalations-context";
import { useConversations } from "@/lib/conversations-context";

const NAV_ITEMS = [
  { label: "OXP", active: true },
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Leads", icon: Users },
  { label: "Applicants", icon: FileText },
  { label: "Residents", icon: Home },
  { label: "Accounting", icon: DollarSign },
  { label: "Tools", icon: Wrench },
  { label: "Apps", icon: AppWindow },
  { label: "Settings", icon: Settings },
  { label: "Setup", icon: Settings, href: "/getting-started" },
] as const;

export function EntrataTopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { role, setRole, isRouteAllowed } = useRole();
  const { isR1Release, setR1Release } = useR1Release();
  const { isR2Release, setR2Release } = useR2Release();
  const isFullVersion = !isR1Release && !isR2Release;

  const { getCurrentUser } = useWorkforce();
  const { items: escalations } = useEscalations();
  const { items: conversations } = useConversations();
  const { showRoadmap, setShowRoadmap } = useRoadmap();

  const currentUser = useMemo(() => getCurrentUser(role), [getCurrentUser, role]);

  const hasOXPAlerts = useMemo(() => {
    if (!currentUser) return false;
    const hasAssignedEscalation = escalations.some(
      (e) => e.assignee === currentUser.name && e.status !== "Done"
    );
    const hasAssignedConversation = conversations.some(
      (c) => c.assignee === currentUser.name && c.status === "open"
    );
    return hasAssignedEscalation || hasAssignedConversation;
  }, [currentUser, escalations, conversations]);

  const [demoOpen, setDemoOpen] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const demoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!demoOpen) return;
    function handleClick(e: MouseEvent) {
      if (demoRef.current && !demoRef.current.contains(e.target as Node)) setDemoOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [demoOpen]);

  const [appsOpen, setAppsOpen] = useState(false);
  const appsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!appsOpen) return;
    function handleClick(e: MouseEvent) {
      if (appsRef.current && !appsRef.current.contains(e.target as Node)) setAppsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [appsOpen]);

  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!helpOpen) return;
    function handleClick(e: MouseEvent) {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) setHelpOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [helpOpen]);

  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountOpen) return;
    function handleClick(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [accountOpen]);

  const activeRoleLabel = useMemo(
    () => ROLES.find((r) => r.value === role)?.label ?? "Corporate Admin",
    [role]
  );

  const appsActive = pathname.startsWith("/apps");
  const appsMenuItems: Array<{ label: string; href?: string }> = [
    { label: "API Access" },
    { label: "Contracts" },
    { label: "Billing Accounts" },
    { label: "Billing Requests" },
    { label: "Order Forms" },
    { label: "API Access Report" },
    { label: "Entrata Marketplace", href: "/apps/entrata-marketplace" },
  ];

  const anyDemoActive = isR1Release || isR2Release;

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

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex items-center justify-center rounded"
            style={{ width: 32, height: 32, color: "rgba(0,0,0,0.45)" }}
          >
            <Bell className="h-4 w-4" />
          </button>
          {/* Help / previews dropdown */}
          <div ref={helpRef} className="relative">
            <button
              type="button"
              onClick={() => setHelpOpen((prev) => !prev)}
              aria-label="Help"
              aria-haspopup="menu"
              aria-expanded={helpOpen}
              className="flex items-center justify-center rounded transition-colors"
              style={{
                width: 32,
                height: 32,
                color: "rgba(0,0,0,0.45)",
                background: helpOpen ? "rgba(0,0,0,0.06)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!helpOpen) e.currentTarget.style.background = "rgba(0,0,0,0.04)";
              }}
              onMouseLeave={(e) => {
                if (!helpOpen) e.currentTarget.style.background = "transparent";
              }}
            >
              <CircleHelp className="h-4 w-4" />
            </button>

            {helpOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  width: 272,
                  background: "#fff",
                  borderRadius: 10,
                  border: "1px solid #E0E0E0",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
                  zIndex: 100,
                  padding: "8px 0",
                }}
              >
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "rgba(0,0,0,0.35)",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    padding: "2px 14px 6px",
                  }}
                >
                  Previews
                </p>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowRoadmap(true);
                    setHelpOpen(false);
                  }}
                  className="flex w-full items-start gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-gray-50"
                >
                  <Map
                    className="mt-0.5 shrink-0"
                    style={{ width: 16, height: 16, strokeWidth: 2, color: "#8b5cf6" }}
                  />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>
                      OXP 2026 Roadmap
                    </p>
                    <p style={{ fontSize: 10, color: "rgba(0,0,0,0.45)", marginTop: 1 }}>
                      View upcoming features and epics
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMobilePreviewOpen(true);
                    setHelpOpen(false);
                  }}
                  className="flex w-full items-start gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-gray-50"
                >
                  <Smartphone
                    className="mt-0.5 shrink-0 text-violet-500"
                    style={{ width: 16, height: 16, strokeWidth: 2 }}
                  />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>
                      Mobile App Preview
                    </p>
                    <p style={{ fontSize: 10, color: "rgba(0,0,0,0.45)", marginTop: 1 }}>
                      View the mobile app vision and screen concepts
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Account / role switcher */}
          <div ref={accountRef} className="relative">
            <button
              type="button"
              onClick={() => setAccountOpen((prev) => !prev)}
              aria-label="Account"
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              className="flex items-center justify-center rounded transition-colors"
              style={{
                width: 32,
                height: 32,
                color: "rgba(0,0,0,0.45)",
                background: accountOpen ? "rgba(0,0,0,0.06)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!accountOpen) e.currentTarget.style.background = "rgba(0,0,0,0.04)";
              }}
              onMouseLeave={(e) => {
                if (!accountOpen) e.currentTarget.style.background = "transparent";
              }}
            >
              <UserCircle className="h-4 w-4" />
            </button>

            {accountOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  width: 256,
                  background: "#fff",
                  borderRadius: 10,
                  border: "1px solid #E0E0E0",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
                  zIndex: 100,
                  padding: "10px 0",
                }}
              >
                {currentUser && (
                  <div style={{ padding: "2px 14px 8px" }}>
                    <p style={{ fontSize: 10, color: "rgba(0,0,0,0.45)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 2 }}>
                      Acting as
                    </p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.2 }}>
                      {currentUser.name}
                    </p>
                    <p style={{ fontSize: 11, color: "rgba(0,0,0,0.55)", marginTop: 1 }}>
                      {activeRoleLabel}
                    </p>
                  </div>
                )}

                <div style={{ borderTop: currentUser ? "1px solid #F0F0F0" : "none", margin: "0 14px", paddingTop: currentUser ? 8 : 0 }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.35)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 4 }}>
                    Switch Role
                  </p>
                  <div className="flex flex-col gap-0.5" role="radiogroup" aria-label="Switch role">
                    {ROLES.map((r) => {
                      const isActive = role === r.value;
                      return (
                        <button
                          key={r.value}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          onClick={() => {
                            setRole(r.value as Role);
                            setAccountOpen(false);
                            if (r.value !== "admin") {
                              router.push("/command-center/");
                            }
                          }}
                          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors"
                          style={{ background: isActive ? "rgba(99,102,241,0.08)" : "transparent" }}
                        >
                          <span
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: "50%",
                              border: isActive ? "none" : "2px solid #D4D4D4",
                              background: isActive ? "#6366f1" : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              transition: "all 150ms",
                            }}
                          >
                            {isActive && (
                              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff" }} />
                            )}
                          </span>
                          <p style={{ fontSize: 12, fontWeight: isActive ? 600 : 500, color: isActive ? "#1a1a1a" : "rgba(0,0,0,0.7)" }}>
                            {r.label}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

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

          {/* Demo dropdown */}
          <div ref={demoRef} className="relative ml-1">
            <button
              type="button"
              onClick={() => setDemoOpen((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-md transition-all"
              style={{
                height: 28,
                padding: "0 8px 0 10px",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.3px",
                color: anyDemoActive ? "#fff" : "rgba(0,0,0,0.45)",
                background: anyDemoActive
                  ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                  : "rgba(0,0,0,0.04)",
                border: anyDemoActive ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(0,0,0,0.1)",
                boxShadow: anyDemoActive ? "0 1px 4px rgba(99,102,241,0.3)" : "none",
              }}
            >
              <Beaker style={{ width: 12, height: 12, strokeWidth: 2 }} />
              Demo
              <ChevronDown style={{ width: 10, height: 10, strokeWidth: 2, marginLeft: 1, transform: demoOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
            </button>

            {demoOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  width: 320,
                  background: "#fff",
                  borderRadius: 10,
                  border: "1px solid #E0E0E0",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
                  zIndex: 100,
                  padding: "12px 0",
                }}
              >
                {/* Release */}
                <div style={{ padding: "0 14px 10px" }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.35)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 6 }}>
                    Release
                  </p>
                  <div className="flex flex-col gap-0.5" role="radiogroup" aria-label="Release version">
                    {([
                      {
                        id: "full",
                        label: "Full Version",
                        tagline: "Full OXP Studio prototype",
                        isActive: isFullVersion,
                        onSelect: () => { setR1Release(false); setR2Release(false); },
                      },
                      {
                        id: "r2",
                        label: "R2 Release State",
                        tagline: "+ Comms, Agent Roster V2, Autonomous L2L, etc.",
                        isActive: isR2Release,
                        onSelect: () => { setR2Release(true); setR1Release(false); },
                      },
                      {
                        id: "r1",
                        label: "R1 Release State",
                        tagline: "Initial release view of OXP",
                        isActive: isR1Release,
                        onSelect: () => { setR1Release(true); setR2Release(false); },
                      },
                    ]).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        role="radio"
                        aria-checked={r.isActive}
                        onClick={r.onSelect}
                        className="flex items-start gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors"
                        style={{ background: r.isActive ? "rgba(99,102,241,0.08)" : "transparent" }}
                      >
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            border: r.isActive ? "none" : "2px solid #D4D4D4",
                            background: r.isActive ? "#6366f1" : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: 2,
                            transition: "all 150ms",
                          }}
                        >
                          {r.isActive && (
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                background: "#fff",
                              }}
                            />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            style={{
                              display: "block",
                              fontSize: 12,
                              fontWeight: r.isActive ? 600 : 500,
                              color: r.isActive ? "#1a1a1a" : "rgba(0,0,0,0.7)",
                            }}
                          >
                            {r.label}
                          </span>
                          <span
                            style={{
                              display: "block",
                              fontSize: 10,
                              color: "rgba(0,0,0,0.45)",
                              marginTop: 1,
                              lineHeight: 1.35,
                            }}
                          >
                            {r.tagline}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab navigation bar */}
      <div
        className="flex items-center"
        style={{ background: "#333333", height: 36, padding: "0 8px", gap: 2 }}
      >
        {NAV_ITEMS.map((item, i) => {
          const Icon = "icon" in item ? item.icon : null;
          const href = "href" in item ? item.href : undefined;
          const isAppsItem = item.label === "Apps";
          const isOxpActive = "active" in item && item.active && !appsActive;
          const isActive = isOxpActive || (isAppsItem && appsActive) || (href ? pathname.startsWith(href) : false);

          if (isAppsItem) {
            return (
              <div key={`${item.label}-${i}`} ref={appsRef} className="relative">
                <button
                  type="button"
                  onClick={() => setAppsOpen((prev) => !prev)}
                  className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm"
                  style={{
                    height: 26,
                    padding: "0 10px",
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: isActive ? "#1a1a1a" : "rgba(255,255,255,0.75)",
                    background: isActive ? "#fff" : "transparent",
                    borderRadius: isActive ? 4 : undefined,
                    transition: "background 150ms",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {Icon && <Icon style={{ width: 14, height: 14, strokeWidth: 1.5 }} />}
                  <span style={{ lineHeight: 1, marginTop: 1 }}>{item.label}</span>
                  <ChevronDown style={{ width: 10, height: 10, strokeWidth: 2, marginLeft: 1, transform: appsOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
                </button>

                {appsOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      right: 0,
                      minWidth: 200,
                      background: "#fff",
                      borderRadius: 6,
                      border: "1px solid #E0E0E0",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
                      zIndex: 100,
                      padding: "4px 0",
                    }}
                  >
                    {appsMenuItems.map((mi) => {
                      const interactive = Boolean(mi.href);
                      return (
                        <button
                          key={mi.label}
                          type="button"
                          onClick={() => {
                            if (mi.href) {
                              router.push(mi.href);
                              setAppsOpen(false);
                            }
                          }}
                          className="flex w-full items-center text-left"
                          style={{
                            padding: "8px 16px",
                            fontSize: 12,
                            fontWeight: 400,
                            color: interactive ? "#1a1a1a" : "rgba(0,0,0,0.45)",
                            background: "transparent",
                            cursor: interactive ? "pointer" : "default",
                            transition: "background 120ms",
                          }}
                          onMouseEnter={(e) => {
                            if (interactive) e.currentTarget.style.background = "rgba(0,0,0,0.04)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          {mi.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isOxpItem = item.label === "OXP";
          return (
            <button
              key={`${item.label}-${i}`}
              type="button"
              onClick={isOxpItem ? () => router.push("/") : (href ? () => router.push(href) : undefined)}
              className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm"
              style={{
                height: 26,
                padding: "0 10px",
                fontSize: 11.5,
                fontWeight: 500,
                color: isActive ? "#1a1a1a" : "rgba(255,255,255,0.75)",
                background: isActive ? "#fff" : "transparent",
                borderRadius: isActive ? 4 : undefined,
                transition: "background 150ms",
                cursor: (isOxpItem || href) ? "pointer" : "default",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              {isOxpActive && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="m3.3 7 8.7 5 8.7-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 22V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {Icon && <Icon style={{ width: 14, height: 14, strokeWidth: 1.5 }} />}
              <span style={{ lineHeight: 1, marginTop: 1 }}>{item.label}</span>
              {item.label === "OXP" && hasOXPAlerts && (
                <div className="ml-0.5 h-1.5 w-1.5 rounded-full bg-red-500" style={{ marginTop: 1 }} />
              )}
            </button>
          );
        })}
      </div>

      <MobileAppPreview open={mobilePreviewOpen} onClose={() => setMobilePreviewOpen(false)} />
    </div>
  );
}

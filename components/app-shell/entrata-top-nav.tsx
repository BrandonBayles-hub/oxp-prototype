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
  MessageCircle,
  Map,
} from "lucide-react";
import { useRole, ROLES, type Role } from "@/lib/role-context";

import { useR1Release } from "@/lib/r1-release-context";
import { useR1_2Release } from "@/lib/r1-2-release-context";
import { useRoadmap } from "@/lib/roadmap-context";

import { useWorkforce } from "@/lib/workforce-context";
import { useEscalations } from "@/lib/escalations-context";
import { useConversations } from "@/lib/conversations-context";
import { useClickToCallDemo } from "@/lib/click-to-call-demo-context";
import { useConversationsDemo } from "@/lib/conversations-demo-context";

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
  const router = useRouter();
  const pathname = usePathname();
  const { requestProfileCommsPopup } = useConversationsDemo();
  const { role, setRole, isRouteAllowed } = useRole();
  const { isR1Release, setR1Release } = useR1Release();
  const { isR1_2Release, setR1_2Release } = useR1_2Release();
  const isFullVersion = !isR1Release && !isR1_2Release;

  const { getCurrentUser } = useWorkforce();
  const { items: escalations } = useEscalations();
  const { items: conversations } = useConversations();
  const { clickToCallEnabled, toggleClickToCallEnabled } = useClickToCallDemo();
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
  const demoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!demoOpen) return;
    function handleClick(e: MouseEvent) {
      if (demoRef.current && !demoRef.current.contains(e.target as Node)) setDemoOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [demoOpen]);

  const anyDemoActive = isFullVersion || isR1Release || isR1_2Release;

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
                {/* Demo Controls */}
                <div style={{ padding: "0 14px 10px" }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.35)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8 }}>
                    Demo Controls
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => { setR1Release(false); setR1_2Release(false); }}
                      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors"
                      style={{ background: isFullVersion ? "rgba(99,102,241,0.08)" : "transparent" }}
                    >
                      <div
                        style={{
                          width: 30,
                          height: 17,
                          borderRadius: 9,
                          background: isFullVersion ? "#6366f1" : "#D4D4D4",
                          position: "relative",
                          transition: "background 150ms",
                          flexShrink: 0,
                        }}
                      >
                        <div style={{
                          width: 13,
                          height: 13,
                          borderRadius: "50%",
                          background: "#fff",
                          position: "absolute",
                          top: 2,
                          left: isFullVersion ? 15 : 2,
                          transition: "left 150ms",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                        }} />
                      </div>
                      <div className="text-left">
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>Full Version</p>
                        <p style={{ fontSize: 10, color: "rgba(0,0,0,0.45)", marginTop: 1 }}>Full OXP Studio prototype</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setR1Release(true); setR1_2Release(false); }}
                      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors"
                      style={{ background: isR1Release ? "rgba(99,102,241,0.08)" : "transparent" }}
                    >
                      <div
                        style={{
                          width: 30,
                          height: 17,
                          borderRadius: 9,
                          background: isR1Release ? "#6366f1" : "#D4D4D4",
                          position: "relative",
                          transition: "background 150ms",
                          flexShrink: 0,
                        }}
                      >
                        <div style={{
                          width: 13,
                          height: 13,
                          borderRadius: "50%",
                          background: "#fff",
                          position: "absolute",
                          top: 2,
                          left: isR1Release ? 15 : 2,
                          transition: "left 150ms",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                        }} />
                      </div>
                      <div className="text-left">
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>R1 Release State</p>
                        <p style={{ fontSize: 10, color: "rgba(0,0,0,0.45)", marginTop: 1 }}>R1 release view with updated command center</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setR1_2Release(true); setR1Release(false); }}
                      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors"
                      style={{ background: isR1_2Release ? "rgba(99,102,241,0.08)" : "transparent" }}
                    >
                      <div
                        style={{
                          width: 30,
                          height: 17,
                          borderRadius: 9,
                          background: isR1_2Release ? "#6366f1" : "#D4D4D4",
                          position: "relative",
                          transition: "background 150ms",
                          flexShrink: 0,
                        }}
                      >
                        <div style={{
                          width: 13,
                          height: 13,
                          borderRadius: "50%",
                          background: "#fff",
                          position: "absolute",
                          top: 2,
                          left: isR1_2Release ? 15 : 2,
                          transition: "left 150ms",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                        }} />
                      </div>
                      <div className="text-left">
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>R1.2</p>
                        <p style={{ fontSize: 10, color: "rgba(0,0,0,0.45)", marginTop: 1 }}>R1.2 release updates</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={toggleClickToCallEnabled}
                      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors"
                      style={{ background: clickToCallEnabled ? "rgba(34,197,94,0.08)" : "transparent" }}
                    >
                      <div
                        style={{
                          width: 30,
                          height: 17,
                          borderRadius: 9,
                          background: clickToCallEnabled ? "#22c55e" : "#D4D4D4",
                          position: "relative",
                          transition: "background 150ms",
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            width: 13,
                            height: 13,
                            borderRadius: "50%",
                            background: "#fff",
                            position: "absolute",
                            top: 2,
                            left: clickToCallEnabled ? 15 : 2,
                            transition: "left 150ms",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                          }}
                        />
                      </div>
                      <div className="text-left">
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>Click To Call</p>
                        <p style={{ fontSize: 10, color: "rgba(0,0,0,0.45)", marginTop: 1 }}>
                          Show call controls on Communications (prototype)
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        requestProfileCommsPopup();
                        router.push("/conversations");
                        setDemoOpen(false);
                      }}
                      className="flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-gray-50"
                    >
                      <MessageCircle
                        className="mt-0.5 shrink-0 text-indigo-500"
                        style={{ width: 16, height: 16, strokeWidth: 2 }}
                      />
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>
                          Profile Comms Pop Up
                        </p>
                        <p style={{ fontSize: 10, color: "rgba(0,0,0,0.45)", marginTop: 1 }}>
                          Open Communications resident profile without the conversation panel
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Role Switcher */}
                <div style={{ borderTop: "1px solid #F0F0F0", margin: "0 14px", paddingTop: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.35)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 6 }}>
                    Role
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {ROLES.map((r) => {
                      const isActive = role === r.value;
                      return (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => {
                            setRole(r.value as Role);
                            if (r.value !== "admin") {
                              router.push("/command-center");
                            }
                          }}
                          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors"
                          style={{ background: isActive ? "rgba(0,0,0,0.05)" : "transparent" }}
                        >
                          <div
                            style={{
                              width: 16,
                              height: 16,
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
                              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
                            )}
                          </div>
                          <p style={{ fontSize: 12, fontWeight: isActive ? 600 : 500, color: isActive ? "#1a1a1a" : "rgba(0,0,0,0.55)" }}>
                            {r.label}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Roadmap */}
                <div style={{ borderTop: "1px solid #F0F0F0", margin: "0 14px", paddingTop: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.35)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 6 }}>
                    Roadmap
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRoadmap(true);
                      setDemoOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-gray-50"
                  >
                    <Map
                      className="shrink-0"
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
          return (
            <button
              key={`${item.label}-${i}`}
              type="button"
              className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm"
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
    </div>
  );
}

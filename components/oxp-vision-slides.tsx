"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Zap, Shield, LayoutDashboard, RefreshCw, Layers } from "lucide-react";

type Slide = {
  id: string;
  render: () => React.ReactNode;
};

function SlideShell({ children, accentColor, center }: { children: React.ReactNode; accentColor?: string; center?: boolean }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: center ? "center" : "flex-start",
        padding: center ? "48px 80px" : "56px 80px 48px",
        background: "#fff",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {accentColor && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: accentColor,
        }} />
      )}
      {children}
      <div style={{
        position: "absolute",
        bottom: 20,
        right: 32,
        fontSize: 10,
        color: "rgba(0,0,0,0.25)",
        fontWeight: 500,
        letterSpacing: "0.3px",
      }}>
        Entrata | OXP Studio | April 2026
      </div>
    </div>
  );
}

function PillarCard({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: string }) {
  return (
    <div style={{
      flex: 1,
      padding: "36px 28px",
      borderRadius: 14,
      border: `1px solid ${color}22`,
      background: `${color}08`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: 16,
    }}>
      <div style={{
        width: 56,
        height: 56,
        borderRadius: 14,
        background: `${color}15`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color,
      }}>
        {icon}
      </div>
      <p style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a" }}>{title}</p>
      <p style={{ fontSize: 15, color: "rgba(0,0,0,0.55)", lineHeight: 1.7 }}>{description}</p>
    </div>
  );
}

function TableRow({ cells, header }: { cells: string[]; header?: boolean }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: cells.length === 4 ? "60px 1fr 1fr 1fr" : cells.length === 3 ? "1fr 1fr 1fr" : "240px 1fr",
      gap: 0,
      padding: header ? "12px 20px" : "16px 20px",
      background: header ? "#fafafa" : "#fff",
      borderBottom: "1px solid #f0f0f0",
    }}>
      {cells.map((cell, i) => (
        <span key={i} style={{
          fontSize: header ? 11 : 15,
          fontWeight: header ? 600 : (i === 0 && !header ? 600 : 400),
          color: header ? "rgba(0,0,0,0.4)" : (i === 0 ? "#1a1a1a" : "rgba(0,0,0,0.65)"),
          textTransform: header ? "uppercase" : "none",
          letterSpacing: header ? "0.5px" : "0",
          lineHeight: 1.6,
          paddingRight: 16,
        }}>
          {cell}
        </span>
      ))}
    </div>
  );
}

const SLIDES: Slide[] = [
  {
    id: "title",
    render: () => (
      <SlideShell center>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 20 }}>
          <div style={{
            width: 88,
            height: 88,
            borderRadius: 22,
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
          }}>
            <Layers style={{ width: 44, height: 44, color: "#fff" }} />
          </div>
          <h1 style={{ fontSize: 48, fontWeight: 800, color: "#1a1a1a", margin: 0, letterSpacing: "-0.5px", fontFamily: "Inter, system-ui, sans-serif" }}>
            OXP Studio
          </h1>
          <p style={{ fontSize: 22, color: "rgba(0,0,0,0.5)", fontWeight: 500, maxWidth: 600 }}>
            Vision & Platform Overview
          </p>
          <div style={{ width: 56, height: 3, background: "linear-gradient(90deg, #6366f1, #8b5cf6)", borderRadius: 2, marginTop: 8 }} />
          <p style={{ fontSize: 15, color: "rgba(0,0,0,0.35)", marginTop: 8 }}>April 2026</p>
        </div>
      </SlideShell>
    ),
  },
  {
    id: "the-shift",
    render: () => (
      <SlideShell accentColor="#6366f1">
        <p style={{ fontSize: 13, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 24 }}>
          The Shift
        </p>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#1a1a1a", margin: 0, lineHeight: 1.3, maxWidth: 900, letterSpacing: "-0.3px" }}>
          AI is no longer a tool you add on top — it&apos;s becoming the operating layer.
        </h2>
        <p style={{ fontSize: 20, color: "rgba(0,0,0,0.55)", marginTop: 28, lineHeight: 1.7, maxWidth: 800 }}>
          Property management is entering the same transformation that reshaped financial services, healthcare, and logistics.
        </p>
        <div style={{ marginTop: "auto", padding: "28px 32px", borderRadius: 14, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)", maxWidth: 850 }}>
          <p style={{ fontSize: 18, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.7 }}>
            Entrata is building OXP as <span style={{ color: "#6366f1" }}>the operating system for that shift</span> — a platform for managing a blended human and AI workforce at the scale and complexity that enterprise operators demand.
          </p>
        </div>
      </SlideShell>
    ),
  },
  {
    id: "what-is-oxp",
    render: () => (
      <SlideShell accentColor="#8b5cf6">
        <p style={{ fontSize: 13, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 24 }}>
          What Is OXP Studio?
        </p>
        <h2 style={{ fontSize: 34, fontWeight: 800, color: "#1a1a1a", margin: 0, lineHeight: 1.3, maxWidth: 900, letterSpacing: "-0.3px" }}>
          The centralized workspace where you manage your entire workforce — human and AI — from one place.
        </h2>
        <p style={{ fontSize: 18, color: "rgba(0,0,0,0.5)", marginTop: 20, lineHeight: 1.7, maxWidth: 800 }}>
          It is not a separate product. It is the management layer that sits on top of everything you already use in Entrata.
        </p>
        <div style={{ display: "flex", gap: 20, marginTop: "auto" }}>
          {[
            { emoji: "🤖", label: "AI Agents", desc: "Handle routine, repetitive work — answering inquiries, sending reminders, triaging requests at 2 AM" },
            { emoji: "👥", label: "Your People", desc: "Handle work that requires judgment, empathy, and relationship building" },
            { emoji: "🎛️", label: "OXP Studio", desc: "Where you orchestrate all of it from a single workspace" },
          ].map((item) => (
            <div key={item.label} style={{ flex: 1, padding: "28px 24px", borderRadius: 12, border: "1px solid #ebebeb", background: "#fafafa" }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>{item.emoji}</p>
              <p style={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>{item.label}</p>
              <p style={{ fontSize: 14, color: "rgba(0,0,0,0.55)", lineHeight: 1.7 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </SlideShell>
    ),
  },
  {
    id: "three-pillars",
    render: () => (
      <SlideShell accentColor="linear-gradient(90deg, #3b82f6, #22c55e, #f59e0b)">
        <p style={{ fontSize: 13, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 24 }}>
          Three Pillars
        </p>
        <h2 style={{ fontSize: 34, fontWeight: 800, color: "#1a1a1a", margin: 0, lineHeight: 1.3, letterSpacing: "-0.3px", marginBottom: 16 }}>
          Everything in OXP is built around three pillars.
        </h2>
        <div style={{ display: "flex", gap: 24, marginTop: "auto", flex: 1, minHeight: 0, paddingTop: 24 }}>
          <PillarCard
            icon={<Eye style={{ width: 28, height: 28 }} />}
            title="Visibility"
            description="See what's happening across your portfolio — in real time. Know which agents are active, what needs attention, and how work flows."
            color="#3b82f6"
          />
          <PillarCard
            icon={<Zap style={{ width: 28, height: 28 }} />}
            title="Automation"
            description="Let the platform do the work. 100+ built-in agents across leasing, maintenance, payments, renewals, and operations."
            color="#22c55e"
          />
          <PillarCard
            icon={<Shield style={{ width: 28, height: 28 }} />}
            title="Control"
            description="You decide what AI does. Configure routing, upload your SOPs, choose which agents run and where — and turn anything off instantly."
            color="#f59e0b"
          />
        </div>
      </SlideShell>
    ),
  },
  {
    id: "visibility",
    render: () => (
      <SlideShell accentColor="#3b82f6">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Eye style={{ width: 22, height: 22, color: "#3b82f6" }} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "1.5px" }}>Visibility</p>
        </div>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#1a1a1a", margin: "0 0 32px", lineHeight: 1.3 }}>
          See what&apos;s happening across your portfolio — in real time.
        </h2>
        <div style={{ borderRadius: 12, border: "1px solid #ebebeb", overflow: "hidden" }}>
          <TableRow header cells={["What You See", "Where You See It"]} />
          <TableRow cells={["Which agents are active and outcomes they drive", "Command Center — Recommended Agents"]} />
          <TableRow cells={["What needs your team's attention right now", "Command Center — Needs Attention"]} />
          <TableRow cells={["Your full blended workforce — staff and AI", "Command Center — Your Team"]} />
        </div>
        <div style={{ marginTop: "auto", padding: "20px 24px", borderRadius: 10, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}>
          <p style={{ fontSize: 15, color: "#1a1a1a", lineHeight: 1.7 }}>
            <span style={{ fontWeight: 700, color: "#3b82f6" }}>Coming next:</span> ELI+ performance metrics and agent work attribution — so you see not just what&apos;s happening, but what AI is actually delivering in measurable outcomes.
          </p>
        </div>
      </SlideShell>
    ),
  },
  {
    id: "automation",
    render: () => (
      <SlideShell accentColor="#22c55e">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap style={{ width: 22, height: 22, color: "#22c55e" }} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#22c55e", textTransform: "uppercase", letterSpacing: "1.5px" }}>Automation</p>
        </div>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#1a1a1a", margin: "0 0 32px", lineHeight: 1.3 }}>
          Let the platform do the work so your team can focus on what matters.
        </h2>
        <div style={{ borderRadius: 12, border: "1px solid #ebebeb", overflow: "hidden" }}>
          <TableRow header cells={["Capability", "What It Means"]} />
          <TableRow cells={["100+ built-in agents", "Agents across leasing, maintenance, payments, renewals, compliance, and operations"]} />
          <TableRow cells={["Four agent tiers (L1–L4)", "From generative AI assistance to full conversational autonomy"]} />
          <TableRow cells={["Agent Builder", "Custom automation when built-in agents don't cover your use case"]} />
        </div>
        <div style={{ marginTop: "auto", padding: "20px 24px", borderRadius: 10, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.12)" }}>
          <p style={{ fontSize: 15, color: "#1a1a1a", lineHeight: 1.7 }}>
            <span style={{ fontWeight: 700, color: "#22c55e" }}>Coming next:</span> Unified communications inside OXP. ELI+ managed from one place. Autonomous lead-to-lease agents that orchestrate entire workflows end-to-end.
          </p>
        </div>
      </SlideShell>
    ),
  },
  {
    id: "control",
    render: () => (
      <SlideShell accentColor="#f59e0b">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield style={{ width: 22, height: 22, color: "#f59e0b" }} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "1.5px" }}>Control</p>
        </div>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#1a1a1a", margin: "0 0 32px", lineHeight: 1.3 }}>
          You decide what AI does in your portfolio.
        </h2>
        <div style={{ borderRadius: 12, border: "1px solid #ebebeb", overflow: "hidden" }}>
          <TableRow header cells={["Control", "How It Works"]} />
          <TableRow cells={["Workforce routing", "Determines who gets what work — humans and AI — based on your rules"]} />
          <TableRow cells={["Trainings & SOP Vault", "Upload your SOPs and policies — agents read them, train on them, and follow your rules"]} />
          <TableRow cells={["Agent configuration", "Choose which agents are on, which properties they cover, and turn any off immediately"]} />
        </div>
        <div style={{ marginTop: "auto", padding: "20px 24px", borderRadius: 10, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
          <p style={{ fontSize: 15, color: "#1a1a1a", lineHeight: 1.7 }}>
            <span style={{ fontWeight: 700, color: "#f59e0b" }}>Coming next:</span> SOP versioning and approval routing. Brand & Voice at every level. Agent guardrails for compliance. Simulation tools to test before going live.
          </p>
        </div>
      </SlideShell>
    ),
  },
  {
    id: "command-center",
    render: () => (
      <SlideShell accentColor="#6366f1">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LayoutDashboard style={{ width: 22, height: 22, color: "#6366f1" }} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "1.5px" }}>Command Center</p>
        </div>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#1a1a1a", margin: "0 0 10px", lineHeight: 1.3 }}>
          Your home base. The first screen your team sees every morning.
        </h2>
        <p style={{ fontSize: 18, color: "rgba(0,0,0,0.5)", marginBottom: 16 }}>Three sections that tell you everything you need to know.</p>
        <div style={{ display: "flex", gap: 20, marginTop: "auto", flex: 1, minHeight: 0, paddingTop: 16 }}>
          {[
            { num: "01", title: "Recommended Agents", desc: "Each card shows the agent, the outcome it drives, and whether it's activated. Agents you haven't turned on show what value you could be capturing — with a direct path to activate." },
            { num: "02", title: "Needs Attention", desc: "Every escalation requiring a human — organized by urgency. Open, urgent, overdue — your team sees exactly where to focus." },
            { num: "03", title: "Your Team", desc: "Your full blended workforce in one view. Human staff and AI agents, side by side. See who's working, what's active, and how work flows." },
          ].map((s) => (
            <div key={s.num} style={{ flex: 1, padding: "28px 24px", borderRadius: 12, border: "1px solid #ebebeb" }}>
              <p style={{ fontSize: 36, fontWeight: 800, color: "rgba(99,102,241,0.15)", marginBottom: 14 }}>{s.num}</p>
              <p style={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a", marginBottom: 10 }}>{s.title}</p>
              <p style={{ fontSize: 14, color: "rgba(0,0,0,0.55)", lineHeight: 1.7 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </SlideShell>
    ),
  },
  {
    id: "operating-loop",
    render: () => (
      <SlideShell accentColor="#8b5cf6">
        <p style={{ fontSize: 13, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 24 }}>
          The Operating Loop
        </p>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#1a1a1a", margin: "0 0 10px", lineHeight: 1.3 }}>
          A closed loop where every piece reinforces the others.
        </h2>
        <p style={{ fontSize: 18, color: "rgba(0,0,0,0.5)", marginBottom: 20, maxWidth: 700 }}>
          The more SOPs you upload, the better your agents perform. The better your agents perform, the fewer escalations your team handles.
        </p>
        <div style={{ display: "flex", justifyContent: "center", flex: 1, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {[
              { label: "Agents do\nthe work", color: "#6366f1", icon: "🤖" },
              { label: "Escalations catch\nwhat agents can't", color: "#ef4444", icon: "🚨" },
              { label: "Playbooks guide\nresolution", color: "#f59e0b", icon: "📋" },
              { label: "SOPs train\nthe agents", color: "#22c55e", icon: "📚" },
            ].map((step, i) => (
              <div key={step.label} style={{ display: "flex", alignItems: "center" }}>
                <div style={{
                  width: 180,
                  height: 180,
                  borderRadius: "50%",
                  border: `3px solid ${step.color}`,
                  background: `${step.color}0a`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: 16,
                }}>
                  <p style={{ fontSize: 36, marginBottom: 6 }}>{step.icon}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: step.color, whiteSpace: "pre-line", lineHeight: 1.4 }}>{step.label}</p>
                </div>
                {i < 3 && (
                  <div style={{ display: "flex", alignItems: "center", margin: "0 -4px", zIndex: 1 }}>
                    <RefreshCw style={{ width: 20, height: 20, color: "rgba(0,0,0,0.2)" }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </SlideShell>
    ),
  },
  {
    id: "agent-tiers",
    render: () => (
      <SlideShell accentColor="#6366f1">
        <p style={{ fontSize: 13, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 24 }}>
          Agent Tiers
        </p>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#1a1a1a", margin: "0 0 10px", lineHeight: 1.3 }}>
          Not all agents are the same. The tier tells you how much independence the agent has.
        </h2>
        <p style={{ fontSize: 18, color: "rgba(0,0,0,0.5)", marginBottom: 16 }}>Four tiers — from assisted intelligence to full conversational autonomy.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, justifyContent: "center" }}>
          {[
            { tier: "L1", name: "ELI Essentials", color: "#94a3b8", desc: "Generative AI functions that assist your team with content creation and summarization", examples: "Work order notes, blog generation, AI-generated emails" },
            { tier: "L2", name: "Operational Efficiency", color: "#3b82f6", desc: "Automated workflows that handle repetitive operational processes", examples: "Renewal offers, move-in processing, application approval" },
            { tier: "L3", name: "Processing at Scale", color: "#8b5cf6", desc: "Autonomous workflows with configurability to increase automation across your portfolio", examples: "Autonomous lead-to-lease, bulk processing, mass communications" },
            { tier: "L4", name: "Conversational AI (ELI+)", color: "#6366f1", desc: "Full conversational agents that interact with residents and prospects 24/7", examples: "Leasing AI, Maintenance AI, Renewals AI, Payments AI" },
          ].map((t) => (
            <div key={t.tier} style={{ display: "flex", alignItems: "center", gap: 20, padding: "20px 24px", borderRadius: 12, border: "1px solid #ebebeb" }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: `${t.color}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: t.color }}>{t.tier}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a" }}>{t.name}</p>
                <p style={{ fontSize: 14, color: "rgba(0,0,0,0.55)", marginTop: 4 }}>{t.desc}</p>
              </div>
              <p style={{ fontSize: 13, color: "rgba(0,0,0,0.4)", maxWidth: 280, lineHeight: 1.6, flexShrink: 0, textAlign: "right" }}>{t.examples}</p>
            </div>
          ))}
        </div>
      </SlideShell>
    ),
  },
];

export function OxpVisionSlides() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const total = SLIDES.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Slide content */}
      <div style={{ flex: 1, overflow: "hidden", borderRadius: 10, border: "1px solid #ebebeb", background: "#fff" }}>
        {SLIDES[currentSlide].render()}
      </div>

      {/* Navigation bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 16,
        flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={() => setCurrentSlide((p) => Math.max(0, p - 1))}
          disabled={currentSlide === 0}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #e5e5e5",
            background: currentSlide === 0 ? "#fafafa" : "#fff",
            cursor: currentSlide === 0 ? "default" : "pointer",
            opacity: currentSlide === 0 ? 0.4 : 1,
            fontSize: 12,
            fontWeight: 600,
            color: "#1a1a1a",
          }}
        >
          <ChevronLeft style={{ width: 14, height: 14 }} />
          Previous
        </button>

        {/* Slide dots */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentSlide(i)}
              style={{
                width: i === currentSlide ? 24 : 8,
                height: 8,
                borderRadius: 4,
                border: "none",
                background: i === currentSlide ? "#6366f1" : "#d4d4d4",
                cursor: "pointer",
                transition: "all 200ms",
                padding: 0,
              }}
            />
          ))}
          <span style={{ fontSize: 11, color: "rgba(0,0,0,0.35)", marginLeft: 8 }}>
            {currentSlide + 1} / {total}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setCurrentSlide((p) => Math.min(total - 1, p + 1))}
          disabled={currentSlide === total - 1}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #e5e5e5",
            background: currentSlide === total - 1 ? "#fafafa" : "#fff",
            cursor: currentSlide === total - 1 ? "default" : "pointer",
            opacity: currentSlide === total - 1 ? 0.4 : 1,
            fontSize: 12,
            fontWeight: 600,
            color: "#1a1a1a",
          }}
        >
          Next
          <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
}

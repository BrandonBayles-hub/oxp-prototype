"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRoadmap } from "@/lib/roadmap-context";
import { X, Rocket, ArrowUpRight, TrendingUp, List, FileText, LayoutGrid, Presentation, Layers, Milestone } from "lucide-react";
import { OxpVisionSlides } from "@/components/oxp-vision-slides";

type RoadmapItem = {
  release: string;
  domain: string;
  features: string;
  theme: "Adoption" | "Growth";
  jiraId: string;
  detail?: {
    description: string;
    whyItMatters: string;
  };
};

const DOMAIN_ROUTES: Record<string, string> = {
  "Trainings & SOPs": "/sops-knowledge",
  "Escalations": "/escalations",
  "Workforce": "/workforce",
  "Communications": "/conversations",
  "Agent Builder": "/workflows",
  "Voice & Brand": "/voice",
  "Agent Roster": "/agent-roster",
  "Governance": "/governance",
  "SOP Intelligence": "/sops-knowledge",
  "Command Center": "/command-center",
  "Performance": "/performance",
  "AI & Agent Activation": "/getting-started",
};

const ROADMAP_DATA: RoadmapItem[] = [
  {
    release: "R1.1", domain: "Trainings & SOPs",
    features: "Versioning, Property Groups, Approval Routing, Agent SOP Association",
    theme: "Adoption", jiraId: "DEV-276821",
    detail: {
      description: "Document versioning for SOPs and training materials, property group scoping so documents can be assigned to specific property sets, approval routing workflows so documents go through a review cycle before agents train on them, and agent SOP association to bind specific documents to specific agents.",
      whyItMatters: "Enterprise customers consistently cite the Vault as their biggest friction point. Without versioning, teams can't track what changed. Without property groups, a student housing SOP applies to conventional properties. Without approval routing, there's no governance over what agents learn. Agent SOP association gives operators precise control over which documents inform which agent's behavior. This is the single most-requested improvement from post-R1 feedback.",
    },
  },
  {
    release: "R1.1", domain: "Escalations",
    features: "Generating Playbooks from SOPs",
    theme: "Adoption", jiraId: "DEV-276834",
    detail: {
      description: "The ability to auto-generate playbook checklists from uploaded SOPs in the Vault. When a team uploads a maintenance SOP, the system can suggest a structured playbook with steps, assignees, and checkpoints derived from that document.",
      whyItMatters: "Bridges the gap between \"we uploaded our SOPs\" and \"our team actually follows them.\" Playbooks are the operational execution layer — this feature turns static documents into actionable task lists. For customers drowning in escalations, this reduces manual playbook creation time and ensures consistency across properties.",
    },
  },
  {
    release: "R1.1", domain: "Trainings & SOPs",
    features: "Connectors Google Drive and Microsoft (Bulk Import of Policies, SOP, Knowledge Management)",
    theme: "Adoption", jiraId: "DEV-276847",
    detail: {
      description: "Direct integration connectors for Google Drive and Microsoft (SharePoint/OneDrive) enabling bulk import of policies, SOPs, and knowledge management documents into the Vault.",
      whyItMatters: "This was the most requested enterprise feature from R1 feedback. Large operators have hundreds of policies across corporate systems. Manually re-uploading is a non-starter for enterprise adoption. This removes the single biggest blocker to Vault adoption at scale and eliminates the \"second library\" objection.",
    },
  },
  {
    release: "R1.1", domain: "Workforce",
    features: "Roles & Access - Sync Reports To",
    theme: "Adoption", jiraId: "DEV-276853",
    detail: {
      description: "Synchronization of reporting structure data into the Workforce module from upstream Entrata configuration, ensuring the org chart reflects actual reporting relationships.",
      whyItMatters: "Dirty user-property data in Entrata core was a recurring issue in R1 customer calls. If the org chart in Workforce is wrong, escalation routing breaks. This sync ensures Workforce reflects reality, which is the foundation for all routing, access control, and agent assignment decisions.",
    },
  },
  {
    release: "R1.1", domain: "Communications",
    features: "Nexus (Unified Communications) In OXP (Including ELI+ Integration, Contact Points, Message Center, Command Center & Communications Tab)",
    theme: "Growth", jiraId: "DEV-276869",
    detail: {
      description: "Integration of Nexus — Entrata's unified communications platform — directly into OXP Studio, including ELI+ Integration, Contact Points, Message Center, and a Command Center Communications Tab.",
      whyItMatters: "R1's most common question was \"Is there a centralized inbox for all resident communications?\" This delivers it. Operators get a single view of all resident and prospect conversations within their OXP workspace, eliminating the need to context-switch between systems. The Command Center gains a Communications tab, making conversation volume, response times, and handoff rates visible alongside escalations and agent status.",
    },
  },
  {
    release: "R1.1", domain: "Agent Builder",
    features: "Updates (additional Blue Prints & Request)",
    theme: "Growth", jiraId: "DEV-276872",
    detail: {
      description: "Expanded library of pre-built agent blueprints and improvements to the agent request submission workflow.",
      whyItMatters: "The Agent Builder is how customers extend OXP beyond built-in agents. More blueprints means faster time-to-value for common automation patterns. Customers have 8+ custom agent use cases they want to explore — a richer blueprint library gives them starting points.",
    },
  },
  {
    release: "R1.2", domain: "Voice & Brand",
    features: "Company, Vertical, Property, Agent Brand & Voice Configuration",
    theme: "Growth", jiraId: "DEV-278104",
    detail: {
      description: "The Brand & Voice module for OXP Studio — configurable tone, personality, and communication style at every level (company-wide defaults, vertical/property-type overrides, property-level settings, and individual agent tuning).",
      whyItMatters: "Every R1 customer call included the question \"Can I control the tone and style of how the AI communicates?\" Operators need agents to sound like their brand, not like generic AI — especially for luxury, student, and affordable segments where communication tone carries significant weight. This delivers that control with granularity from the company level all the way down to individual agents.",
    },
  },
  {
    release: "R1.2", domain: "Agent Roster",
    features: "ELI+ In OXP (Including Leasing AI, PaymentsAI, RenewalsAI, MaintenanceAI)",
    theme: "Growth", jiraId: "DEV-278117",
    detail: {
      description: "Full integration of the ELI+ platform into OXP Studio, encompassing all four core AI modules: Leasing AI (deeper OXP integration, SOP-aware conversations), Payments AI (unified management, enhanced escalation routing), Renewals AI (OXP-native settings, student-specific enhancements), and Maintenance AI (full OXP lifecycle management, improved triage logic).",
      whyItMatters: "ELI+ eliminates the split management experience where ELI+ agents live outside OXP Studio. After this release, every AI agent — from L1 automation to L4 conversational — is configured, monitored, and governed from OXP Studio. This is the \"single pane of glass\" promise fulfilled.",
    },
  },
  {
    release: "R1.2", domain: "Command Center",
    features: "ELI+ Metrics and Dashboard (Including ELI+ Performance Metrics in OXP, Agent Work Attribution)",
    theme: "Growth", jiraId: "DEV-278123",
    detail: {
      description: "Detailed metrics for every ELI+ agent including AI-attributed value, conversation outcomes, accuracy rates, and side-by-side human vs. AI comparisons. Agent work attribution tracks which outcomes are driven by AI vs. human effort.",
      whyItMatters: "Every R1 customer call included the question \"Can I see how the AI is performing?\" This delivers it. Operators can finally quantify the ROI of their AI workforce — which is essential for executive buy-in, budget justification, and expansion decisions.",
    },
  },
  {
    release: "R1.2", domain: "AI & Agent Activation",
    features: "ELI+ Settings (Including ELI+ Implementation Staging Engine & Marketplace)",
    theme: "Growth", jiraId: "DEV-278136",
    detail: {
      description: "Centralized configuration for all ELI+ agents within OXP Studio, a staging environment for implementing and testing ELI+ configurations before going live, and a marketplace for sharing and discovering agent configurations.",
      whyItMatters: "Enterprise customers need a way to test AI configurations without impacting live operations. The staging engine provides a safe sandbox. The marketplace accelerates adoption by letting customers discover proven configurations. Centralized settings replace the current distributed approach.",
    },
  },
  {
    release: "R1.2", domain: "Trainings & SOPs",
    features: "ELI+ SOP Association (Context For Prompt Builder)",
    theme: "Growth", jiraId: "DEV-278142",
    detail: {
      description: "Direct binding between ELI+ agents and specific SOPs in the Vault, providing explicit context for the prompt builder that shapes agent behavior. This builds on the basic agent SOP association introduced in R1.1.",
      whyItMatters: "This is the \"teach the AI your rules\" feature made explicit for conversational agents. Instead of agents generally learning from the Vault, operators can precisely control which documents inform which L4 agent's conversational behavior — critical for compliance-sensitive verticals like affordable housing.",
    },
  },
  {
    release: "R1.2", domain: "AI & Agent Activation",
    features: "ELI+ Simulation (Including In App Eval & Simulation)",
    theme: "Growth", jiraId: "DEV-278159",
    detail: {
      description: "Simulation tools to test agent conversations before going live, plus in-app evaluation tools to assess agent performance on an ongoing basis.",
      whyItMatters: "The #1 trust barrier is \"how do I know the AI won't say something wrong?\" Simulation lets teams test conversations against their SOPs before activating agents. In-app eval provides ongoing quality monitoring without leaving OXP Studio.",
    },
  },
  {
    release: "R1.2", domain: "Trainings & SOPs",
    features: "LMS AI Trainings",
    theme: "Growth", jiraId: "DEV-278165",
    detail: {
      description: "AI-powered training content generation and management within the learning management system, integrated with OXP.",
      whyItMatters: "Bridges the gap between SOP documentation and team enablement. Instead of just uploading documents, organizations can generate training materials that help human staff understand and work alongside AI agents effectively.",
    },
  },
  {
    release: "R1.2", domain: "Agent Roster",
    features: "L2 Agent Scheduling",
    theme: "Growth", jiraId: "DEV-278178",
    detail: {
      description: "Time-based scheduling for L2 operational efficiency agents — run specific agents at specific times, days, or intervals.",
      whyItMatters: "L2 agents surface insights and recommendations. Scheduling means operators can align agent activity with business rhythms (e.g., run rent optimization analysis every Monday, run occupancy alerts before month-end).",
    },
  },
  {
    release: "R1.2", domain: "Agent Roster",
    features: "L2 Agents Task Escalation Framework",
    theme: "Growth", jiraId: "DEV-278183",
    detail: {
      description: "Framework for L2 agents to create structured task escalations when they identify issues that require human action.",
      whyItMatters: "Closes the loop between \"L2 agents surface insights\" and \"someone actually acts on them.\" Currently L2 agents can alert, but the path to resolution is manual. This framework automates the handoff.",
    },
  },
  {
    release: "R1.3", domain: "Agent Roster",
    features: "Autonomous Move-In",
    theme: "Growth", jiraId: "DEV-279201",
    detail: {
      description: "A purpose-built autonomous agent for the move-in process — automating reconciliation, readiness checks, and move-in workflows.",
      whyItMatters: "Move-in is a high-volume, high-stakes operational moment — especially for student housing operators dealing with massive simultaneous move-ins concentrated in a short window. Automating this process reduces errors, improves resident experience, and frees staff during the most intensive operational periods.",
    },
  },
  {
    release: "R1.3", domain: "Workforce",
    features: "Roles & Access - HRIS Integration",
    theme: "Growth", jiraId: "DEV-279215",
    detail: {
      description: "Integration between OXP Studio's Workforce module and external HRIS (Human Resource Information System) platforms, enabling automatic sync of employee records, roles, reporting structures, and property assignments.",
      whyItMatters: "Enterprise PMCs manage workforce data in HR systems like Workday, ADP, or BambooHR. Without HRIS integration, Workforce data in OXP is manually maintained and quickly drifts from reality. This ensures the org chart, routing rules, and access controls always reflect current staffing.",
    },
  },
  {
    release: "R2", domain: "Agent Roster",
    features: "Autonomous Lease Progression",
    theme: "Growth", jiraId: "DEV-281034",
    detail: {
      description: "A fully autonomous agent that manages the entire lead-to-lease funnel — from initial inquiry through qualification, tour scheduling, application processing, screening, and lease execution — without human intervention for standard scenarios.",
      whyItMatters: "This is the first true L3 autonomous agent operating across the complete leasing workflow. It moves beyond L4 conversational AI (which handles conversations) to orchestrate the entire process end-to-end. For high-volume conventional and student housing operators, this represents a step-change in operational efficiency.",
    },
  },
  {
    release: "R2", domain: "Governance",
    features: "Agent Guardrails",
    theme: "Growth", jiraId: "DEV-281047",
    detail: {
      description: "Configurable guardrails for AI agent behavior — approval gates for high-risk activities, compliance controls, and boundaries for what agents can and cannot do autonomously.",
      whyItMatters: "Guardrails are the prerequisite for enterprise trust in autonomous AI. Without approval gates and compliance controls, large operators (especially affordable/LIHTC) cannot activate high-risk agents. This unlocks L4 and L3 adoption for compliance-sensitive segments and gives operators confidence to expand automation.",
    },
  },
  {
    release: "R2", domain: "Agent Builder",
    features: "Workflow Builder",
    theme: "Growth", jiraId: "DEV-281053",
    detail: {
      description: "A dedicated workflow builder within OXP Studio for designing, configuring, and deploying multi-step automated workflows across the platform.",
      whyItMatters: "While Agent Builder provides blueprints and recipe-based automation, Workflow Builder gives operators a visual, purpose-built tool for designing end-to-end operational workflows. This supports the growing demand from customers who need sophisticated, custom automation beyond pre-built templates.",
    },
  },
  {
    release: "R2", domain: "Trainings & SOPs",
    features: "DAP (Digital Adoption Platform) In-app training based on SOPs and Trainings",
    theme: "Growth", jiraId: "DEV-281068",
    detail: {
      description: "A digital adoption platform layer within OXP Studio that provides contextual, in-app training and guidance derived from uploaded SOPs and training materials.",
      whyItMatters: "Bridges the gap between \"we have SOPs in the Vault\" and \"our team actually knows what to do.\" Instead of training being a separate activity, DAP surfaces relevant guidance in the moment — when a user is configuring an agent, resolving an escalation, or building a workflow. This reduces onboarding time and improves consistency across teams.",
    },
  },
  {
    release: "R2", domain: "SOP Intelligence",
    features: "Chat with your SOPs/Knowledge Base",
    theme: "Growth", jiraId: "DEV-281076",
    detail: {
      description: "Natural language chat interface that allows users to query their entire SOP and knowledge base — asking questions and getting answers sourced from their uploaded documents.",
      whyItMatters: "The Vault today is a document library. SOP Intelligence transforms it into a conversational knowledge base. Instead of searching through documents, staff can ask questions like \"What's our policy on emotional support animals?\" and get instant, sourced answers. This makes the Vault useful for humans, not just AI agents.",
    },
  },
];

const RELEASE_META: Record<string, { label: string; color: string; bg: string; border: string; themeNote: string }> = {
  "R1.1": { label: "Release 1.1", color: "#6366f1", bg: "rgba(99,102,241,0.06)", border: "rgba(99,102,241,0.15)", themeNote: "Adoption & Growth — SOP Foundation, Comms, Agent Builder" },
  "R1.2": { label: "Release 1.2", color: "#8b5cf6", bg: "rgba(139,92,246,0.06)", border: "rgba(139,92,246,0.15)", themeNote: "Growth — ELI+, Brand & Voice, Agent Maturity" },
  "R1.3": { label: "Release 1.3", color: "#0ea5e9", bg: "rgba(14,165,233,0.06)", border: "rgba(14,165,233,0.15)", themeNote: "Growth — Vertical Agents & HRIS Integration" },
  "R2":   { label: "Release 2",   color: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.15)", themeNote: "Growth — Autonomous Agents, Guardrails, Workflow Builder, SOP Intelligence" },
};

const releases = ["R1.1", "R1.2", "R1.3", "R2"] as const;

function ThemeBadge({ theme }: { theme: "Adoption" | "Growth" }) {
  const isAdoption = theme === "Adoption";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 99,
        background: isAdoption ? "rgba(34,197,94,0.1)" : "rgba(99,102,241,0.1)",
        color: isAdoption ? "#16a34a" : "#6366f1",
        letterSpacing: "0.2px",
      }}
    >
      {isAdoption ? <ArrowUpRight style={{ width: 10, height: 10 }} /> : <TrendingUp style={{ width: 10, height: 10 }} />}
      {theme}
    </span>
  );
}

function DomainLink({ domain, onNavigate }: { domain: string; onNavigate: (route: string) => void }) {
  const route = DOMAIN_ROUTES[domain];
  if (!route) {
    return <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>{domain}</span>;
  }
  return (
    <button
      type="button"
      onClick={() => onNavigate(route)}
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: "#6366f1",
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        textAlign: "left",
        textDecoration: "none",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
      onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
    >
      {domain}
    </button>
  );
}

export function RoadmapOverlay() {
  const router = useRouter();
  const { showRoadmap, setShowRoadmap } = useRoadmap();
  const [viewMode, setViewMode] = useState<"milestones" | "themes" | "quick" | "domain">("themes");

  if (!showRoadmap) return null;

  const handleNavigate = (route: string) => {
    setShowRoadmap(false);
    router.push(route);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
        }}
        onClick={() => setShowRoadmap(false)}
      />

      {/* Panel */}
      <div
        style={{
          position: "relative",
          width: "min(1400px, 96vw)",
          height: "96vh",
          maxHeight: "96vh",
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 24px 64px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "none",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 28px 20px",
            borderBottom: "1px solid #f0f0f0",
            background: "linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(139,92,246,0.04) 100%)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Rocket style={{ width: 20, height: 20, color: "#fff" }} />
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", margin: 0, fontFamily: "Inter, system-ui, sans-serif" }}>
                  OXP 2026 Roadmap
                </h2>
                <p style={{ fontSize: 13, color: "rgba(0,0,0,0.5)", marginTop: 2 }}>
                  Upcoming features and epics across functional domains
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* View mode toggle */}
              <div
                style={{
                  display: "flex",
                  borderRadius: 8,
                  border: "1px solid #e5e5e5",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode("milestones")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 12px",
                    fontSize: 11,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    background: viewMode === "milestones" ? "#6366f1" : "#fff",
                    color: viewMode === "milestones" ? "#fff" : "rgba(0,0,0,0.5)",
                    transition: "all 150ms",
                  }}
                >
                  <Milestone style={{ width: 13, height: 13 }} />
                  OXP Studio Milestones
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("quick")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 12px",
                    fontSize: 11,
                    fontWeight: 600,
                    border: "none",
                    borderLeft: "1px solid #e5e5e5",
                    cursor: "pointer",
                    background: viewMode === "quick" ? "#6366f1" : "#fff",
                    color: viewMode === "quick" ? "#fff" : "rgba(0,0,0,0.5)",
                    transition: "all 150ms",
                  }}
                >
                  <List style={{ width: 13, height: 13 }} />
                  Quick View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("themes")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 12px",
                    fontSize: 11,
                    fontWeight: 600,
                    border: "none",
                    borderLeft: "1px solid #e5e5e5",
                    cursor: "pointer",
                    background: viewMode === "themes" ? "#6366f1" : "#fff",
                    color: viewMode === "themes" ? "#fff" : "rgba(0,0,0,0.5)",
                    transition: "all 150ms",
                  }}
                >
                  <Layers style={{ width: 13, height: 13 }} />
                  Themes
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("domain")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 12px",
                    fontSize: 11,
                    fontWeight: 600,
                    border: "none",
                    borderLeft: "1px solid #e5e5e5",
                    cursor: "pointer",
                    background: viewMode === "domain" ? "#6366f1" : "#fff",
                    color: viewMode === "domain" ? "#fff" : "rgba(0,0,0,0.5)",
                    transition: "all 150ms",
                  }}
                >
                  <LayoutGrid style={{ width: 13, height: 13 }} />
                  By Domain
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowRoadmap(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "1px solid #e5e5e5",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "rgba(0,0,0,0.4)",
                  flexShrink: 0,
                }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 28px 28px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* OXP Studio Milestones View */}
          {viewMode === "milestones" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {/* Milestone Overview Table */}
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", margin: "0 0 6px", fontFamily: "Inter, system-ui, sans-serif" }}>
                  Milestone Overview
                </h3>
                <div style={{ borderRadius: 10, border: "1px solid #ebebeb", overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "260px 140px 1fr", padding: "8px 16px", background: "#fafafa", borderBottom: "1px solid #ebebeb" }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Milestone</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Theme</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>One-Liner</span>
                  </div>
                  {[
                    { milestone: "Prove the Value & Drive Agent Adoption", theme: "Visibility + Intelligence", oneLiner: "Operators see what AI is doing, measure it against outcomes, manage agents at scale, and the knowledge layer gets smarter" },
                    { milestone: "Go Everywhere — OXP Studio Mobile", theme: "Mobility", oneLiner: "OXP Studio goes mobile — escalations, comms, performance, and agent oversight from anywhere" },
                    { milestone: "Full Platform", theme: "Autonomous Workflow", oneLiner: "Complete agent configuration in Studio, the first L3 autonomous workflow (Lease Progression), and a build-your-own agent framework" },
                  ].map((row, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "260px 140px 1fr", padding: "10px 16px", borderBottom: idx < 2 ? "1px solid #f5f5f5" : "none", alignItems: "start" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>{row.milestone}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: "#6366f1" }}>{row.theme}</span>
                      <span style={{ fontSize: 12, color: "rgba(0,0,0,0.65)", lineHeight: 1.5 }}>{row.oneLiner}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Milestone 1 */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#6366f1", padding: "4px 14px", borderRadius: 6, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
                    Milestone 1
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>Prove the Value & Drive Agent Adoption</span>
                </div>
                <div style={{ background: "rgba(99,102,241,0.04)", borderRadius: 8, padding: "12px 16px", marginBottom: 16, borderLeft: "3px solid #6366f1" }}>
                  <p style={{ fontSize: 12, color: "rgba(0,0,0,0.65)", lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>
                    After this milestone, an operator can open OXP Studio, see exactly what work both L2 and ELI+ agents are doing, measure that work against business outcomes, and manage their agents at scale — for the first time.
                  </p>
                </div>
                <p style={{ fontSize: 12, color: "rgba(0,0,0,0.6)", lineHeight: 1.7, marginBottom: 20 }}>
                  OXP Studio launched successfully with 110 L2 agents deployed. But the immediate follow-up question from every operator is: <strong>&quot;Is it working?&quot;</strong> This milestone answers that question definitively — for both ELI+ and L2 agents. It also makes the knowledge layer smarter and more connected, and matures agent management from a basic tool into a production-grade experience.
                </p>

                {/* Initiative: OXP Data and Performance */}
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px" }}>Initiative: OXP Data and Performance</h4>
                  <p style={{ fontSize: 11, color: "rgba(0,0,0,0.55)", lineHeight: 1.6, marginBottom: 10 }}>
                    This is the &quot;show me the ROI&quot; answer. For the first time, ELI+ agent work is visible in Performance dashboards and attributed in the Command Center. Operators stop guessing whether AI is helping and start seeing the direct connection between agent activity and property outcomes.
                  </p>
                  <div style={{ borderRadius: 8, border: "1px solid #ebebeb", overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", padding: "8px 14px", background: "#fafafa", borderBottom: "1px solid #ebebeb" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Epic</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>What It Delivers</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Value</span>
                    </div>
                    {[
                      { epic: "ELI+ Dashboards in OXP Studio Performance", delivers: "Dedicated dashboards showing ELI+ agent activity, resolution rates, and outcome impact alongside human performance", value: "Operators see AI and human contributions side-by-side — enables data-driven decisions about workforce mix and justifies AI investment to asset managers" },
                      { epic: "Command Center — ELI+ Work Attribution Metrics", delivers: "The daily operational hub surfaces what ELI+ agents accomplished, what they escalated, and how that work maps to business metrics", value: "Answers \"what did AI do today?\" at a glance — the daily proof point that builds operator trust and drives adoption" },
                      { epic: "L2 Agent Work Metrics", delivers: "Performance tracking for the existing fleet of L2 agents — the 110+ agents already deployed and handling work", value: "Closes the visibility gap on the agents operators already have. L2 agents have been working; now operators can see and measure that work" },
                    ].map((row, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", padding: "10px 14px", borderBottom: idx < 2 ? "1px solid #f5f5f5" : "none", alignItems: "start" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#1a1a1a", paddingRight: 8 }}>{row.epic}</span>
                        <span style={{ fontSize: 11, color: "rgba(0,0,0,0.6)", lineHeight: 1.5, paddingRight: 8 }}>{row.delivers}</span>
                        <span style={{ fontSize: 11, color: "rgba(0,0,0,0.6)", lineHeight: 1.5 }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Initiative: OXP Studio Advanced SOP & Policies */}
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px" }}>Initiative: OXP Studio Advanced SOP & Policies</h4>
                  <p style={{ fontSize: 11, color: "rgba(0,0,0,0.55)", lineHeight: 1.6, marginBottom: 10 }}>
                    The knowledge layer goes from a document repository to an intelligent, connected system. SOPs don&apos;t just sit in a vault — they generate playbooks, integrate with existing tools, and can be conversed with directly.
                  </p>
                  <div style={{ borderRadius: 8, border: "1px solid #ebebeb", overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", padding: "8px 14px", background: "#fafafa", borderBottom: "1px solid #ebebeb" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Epic</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>What It Delivers</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Value</span>
                    </div>
                    {[
                      { epic: "AI-Generated Playbooks from SOPs", delivers: "The system reads SOPs and automatically generates multi-step playbook templates for common scenarios", value: "Reduces setup time from hours to minutes — operators get structured response plans without manually building every step" },
                      { epic: "Google Drive and Microsoft Document Integration", delivers: "SOPs and policies can be sourced from Google Drive and Microsoft (SharePoint/OneDrive)", value: "Meets operators where their content already lives — eliminates the \"copy everything into another system\" barrier" },
                      { epic: "In-line Version Editing and Notes", delivers: "Edit SOPs directly in OXP Studio with tracked changes, inline notes, and version history", value: "Knowledge stays current without leaving the platform — reduces the gap between \"policy changed\" and \"agents know about it\"" },
                      { epic: "SOP AI — Talk with Your SOPs", delivers: "Conversational interface for querying the document library — operators ask questions and get answers grounded in their own policies", value: "Turns a static document library into an active knowledge assistant — staff find answers in seconds" },
                    ].map((row, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", padding: "10px 14px", borderBottom: idx < 3 ? "1px solid #f5f5f5" : "none", alignItems: "start" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#1a1a1a", paddingRight: 8 }}>{row.epic}</span>
                        <span style={{ fontSize: 11, color: "rgba(0,0,0,0.6)", lineHeight: 1.5, paddingRight: 8 }}>{row.delivers}</span>
                        <span style={{ fontSize: 11, color: "rgba(0,0,0,0.6)", lineHeight: 1.5 }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Initiative: Agent Roster 2.0 */}
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px" }}>Initiative: Agent Roster 2.0</h4>
                  <p style={{ fontSize: 11, color: "rgba(0,0,0,0.55)", lineHeight: 1.6, marginBottom: 10 }}>
                    The agent management experience matures from its initial launch form into a production-grade tool. Advanced filtering handles scale, the refreshed UI reflects platform maturity, and Marketplace Integration signals the beginning of the ecosystem story.
                  </p>
                  <div style={{ borderRadius: 8, border: "1px solid #ebebeb", overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", padding: "8px 14px", background: "#fafafa", borderBottom: "1px solid #ebebeb" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Epic</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>What It Delivers</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Value</span>
                    </div>
                    {[
                      { epic: "Advanced Filtering", delivers: "Filter agents by type, status, bucket, property, performance metrics, and more", value: "Operators managing dozens of agents can find and focus on what matters — critical as agent adoption scales" },
                      { epic: "Updated UI", delivers: "Refreshed agent roster interface with improved information density and interaction patterns", value: "Reflects platform maturity — first impressions matter for new users and expansion conversations" },
                      { epic: "Marketplace Integration", delivers: "Connect to the agent marketplace from within the roster", value: "Opens the ecosystem — operators discover and adopt new agents without leaving their management workflow" },
                    ].map((row, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", padding: "10px 14px", borderBottom: idx < 2 ? "1px solid #f5f5f5" : "none", alignItems: "start" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#1a1a1a", paddingRight: 8 }}>{row.epic}</span>
                        <span style={{ fontSize: 11, color: "rgba(0,0,0,0.6)", lineHeight: 1.5, paddingRight: 8 }}>{row.delivers}</span>
                        <span style={{ fontSize: 11, color: "rgba(0,0,0,0.6)", lineHeight: 1.5 }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Milestone 2 */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0ea5e9", padding: "4px 14px", borderRadius: 6, background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.15)" }}>
                    Milestone 2
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>Go Everywhere — OXP Studio Mobile</span>
                </div>
                <div style={{ background: "rgba(14,165,233,0.04)", borderRadius: 8, padding: "12px 16px", marginBottom: 16, borderLeft: "3px solid #0ea5e9" }}>
                  <p style={{ fontSize: 12, color: "rgba(0,0,0,0.65)", lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>
                    After this milestone, operators manage their blended workforce from their phone — escalations, communications, performance, and agent oversight are no longer tied to a desk.
                  </p>
                </div>
                <p style={{ fontSize: 12, color: "rgba(0,0,0,0.6)", lineHeight: 1.7, marginBottom: 20 }}>
                  Regional managers visit properties. Maintenance leads walk units. Property managers are in and out of the office. OXP Mobile fundamentally changes when and where OXP Studio is used — and it&apos;s not a lightweight companion app. It brings the critical operational surfaces to mobile with purpose-built experiences.
                </p>

                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px" }}>Initiative: OXP Mobile</h4>
                  <p style={{ fontSize: 11, color: "rgba(0,0,0,0.55)", lineHeight: 1.6, marginBottom: 10 }}>
                    OXP Studio breaks free from the desktop. The three epics target the highest-impact mobile use cases: acting on escalations in real time, staying connected through comms, and checking performance from anywhere.
                  </p>
                  <div style={{ borderRadius: 8, border: "1px solid #ebebeb", overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", padding: "8px 14px", background: "#fafafa", borderBottom: "1px solid #ebebeb" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Epic</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>What It Delivers</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Value</span>
                    </div>
                    {[
                      { epic: "Mobile Tasks & Escalations", delivers: "Manage, triage, and resolve escalations and tasks from a mobile device", value: "Regional managers handle time-sensitive escalations during property visits — SLA compliance improves, nothing waits" },
                      { epic: "Mobile Comms (Nexus & ELI+)", delivers: "Access the communications layer — conversations with residents, leads, and ELI+ agent interactions — from mobile", value: "Operators stay in the loop on live conversations and can intervene or hand off work without being at a workstation" },
                      { epic: "Performance Data & Agent Metrics", delivers: "View agent performance, team metrics, and property KPIs from mobile", value: "Property managers check performance during site walks, portfolio reviews, or regional meetings — decisions happen in real time" },
                    ].map((row, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", padding: "10px 14px", borderBottom: idx < 2 ? "1px solid #f5f5f5" : "none", alignItems: "start" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#1a1a1a", paddingRight: 8 }}>{row.epic}</span>
                        <span style={{ fontSize: 11, color: "rgba(0,0,0,0.6)", lineHeight: 1.5, paddingRight: 8 }}>{row.delivers}</span>
                        <span style={{ fontSize: 11, color: "rgba(0,0,0,0.6)", lineHeight: 1.5 }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Milestone 3 */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b", padding: "4px 14px", borderRadius: 6, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                    Milestone 3
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>Full Platform</span>
                </div>
                <div style={{ background: "rgba(245,158,11,0.04)", borderRadius: 8, padding: "12px 16px", marginBottom: 16, borderLeft: "3px solid #f59e0b" }}>
                  <p style={{ fontSize: 12, color: "rgba(0,0,0,0.65)", lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>
                    After this milestone, OXP Studio is a complete platform — operators fully configure and control ELI+ agents inside Studio, the first L3 autonomous agents automate the most revenue-critical workflow in property management, and operators can build their own agents.
                  </p>
                </div>
                <p style={{ fontSize: 12, color: "rgba(0,0,0,0.6)", lineHeight: 1.7, marginBottom: 20 }}>
                  This milestone has three stories running in parallel. <strong>ELI+ In OXP</strong> brings full agent configuration and voice control inside the platform. <strong>OXP Autonomous Lease Progression</strong> delivers the first L3 agents — 11 autonomous agents that automate the leasing funnel end-to-end. And <strong>Agent Builder</strong> opens the platform for operators to create their own agents.
                </p>

                {/* Initiative: ELI+ In OXP */}
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px" }}>Initiative: ELI+ In OXP</h4>
                  <p style={{ fontSize: 11, color: "rgba(0,0,0,0.55)", lineHeight: 1.6, marginBottom: 10 }}>
                    ELI+ agent configuration moves fully inside OXP Studio. Operators visualize and control every aspect of their ELI+ agents within the platform they already use daily. And with Voice, Tone, & Brand landing in the same initiative, the control story is complete.
                  </p>
                  <div style={{ borderRadius: 8, border: "1px solid #ebebeb", overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 1fr", padding: "8px 14px", background: "#fafafa", borderBottom: "1px solid #ebebeb" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Epic</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>What It Delivers</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Value</span>
                    </div>
                    {[
                      { epic: "Visualization and Control of ELI+ Agent Settings in OXP Studio", delivers: "Full agent configuration, monitoring, and tuning inside Studio — settings, capabilities, tools, guardrails, and lifecycle management all in one place", value: "Single pane of glass for the entire agent lifecycle. Reduces onboarding friction and eliminates the need to leave Studio for any agent management task" },
                      { epic: "Voice, Tone, & Brand", delivers: "Per-property and per-agent control over communication style — tone, phrasing rules, prohibited terms, required terms, and replacements", value: "Operators control exactly how every agent represents their brand. Controlled phrasing reduces legal risk and ensures compliance with fair housing regulations" },
                    ].map((row, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "240px 1fr 1fr", padding: "10px 14px", borderBottom: idx < 1 ? "1px solid #f5f5f5" : "none", alignItems: "start" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#1a1a1a", paddingRight: 8 }}>{row.epic}</span>
                        <span style={{ fontSize: 11, color: "rgba(0,0,0,0.6)", lineHeight: 1.5, paddingRight: 8 }}>{row.delivers}</span>
                        <span style={{ fontSize: 11, color: "rgba(0,0,0,0.6)", lineHeight: 1.5 }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Initiative: OXP Autonomous Lease Progression */}
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px" }}>Initiative: OXP Autonomous Lease Progression</h4>
                  <p style={{ fontSize: 11, color: "rgba(0,0,0,0.55)", lineHeight: 1.6, marginBottom: 10 }}>
                    Lease Progression is the marquee initiative — eleven L3 autonomous agents targeting the highest-value workflow in property management: turning leads into signed leases. These aren&apos;t chatbots — they&apos;re event-triggered, proactive agents that drive prospects through the funnel.
                  </p>
                  <div style={{ borderRadius: 8, border: "1px solid #ebebeb", overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 1fr", padding: "8px 14px", background: "#fafafa", borderBottom: "1px solid #ebebeb" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Epic</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>What It Delivers</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Value</span>
                    </div>
                    {[
                      { epic: "Autonomous Lease Progression L3 Agents (11) in OXP Agent Roster", delivers: "Eleven L3 autonomous agents covering the lead-to-lease workflow — from initial lead engagement through application processing — managed inside the Agent Roster", value: "The first L3 agents in OXP Studio. Faster response time to inquiries, proactive follow-up, and automated application handling — all with human-in-the-loop for high-risk decisions" },
                      { epic: "Lease Progression Data/Metrics in OXP Data Performance", delivers: "Dedicated Lease Progression performance dashboards showing leasing funnel metrics, agent contribution, conversion rates, and cost-per-lease impact", value: "Operators don't just deploy Lease Progression — they prove its value. Connects directly to cost per lease, lead-to-lease conversion, response time, and vacancy loss" },
                    ].map((row, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "240px 1fr 1fr", padding: "10px 14px", borderBottom: idx < 1 ? "1px solid #f5f5f5" : "none", alignItems: "start" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#1a1a1a", paddingRight: 8 }}>{row.epic}</span>
                        <span style={{ fontSize: 11, color: "rgba(0,0,0,0.6)", lineHeight: 1.5, paddingRight: 8 }}>{row.delivers}</span>
                        <span style={{ fontSize: 11, color: "rgba(0,0,0,0.6)", lineHeight: 1.5 }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "rgba(245,158,11,0.06)", borderRadius: 8, padding: "10px 14px", marginTop: 10, border: "1px solid rgba(245,158,11,0.15)" }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#92400e", margin: 0, lineHeight: 1.6 }}>
                      Why Lease Progression is the headline: Every other initiative builds the platform. Lease Progression demonstrates what the platform enables. &quot;Our AI doesn&apos;t just manage your operation — it closes your leases.&quot;
                    </p>
                  </div>
                </div>

                {/* Initiative: Agent Builder */}
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px" }}>Initiative: Agent Builder</h4>
                  <p style={{ fontSize: 11, color: "rgba(0,0,0,0.55)", lineHeight: 1.6, marginBottom: 10 }}>
                    Pre-built agents cover common scenarios, but every PMC has unique processes. Agent Builder opens OXP Studio as a platform — operators build their own agents tailored to their operation.
                  </p>
                  <div style={{ borderRadius: 8, border: "1px solid #ebebeb", overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 1fr", padding: "8px 14px", background: "#fafafa", borderBottom: "1px solid #ebebeb" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Epic</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>What It Delivers</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Value</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 1fr", padding: "10px 14px", alignItems: "start" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#1a1a1a", paddingRight: 8 }}>Build Your Own Agent Framework in OXP Studio</span>
                      <span style={{ fontSize: 11, color: "rgba(0,0,0,0.6)", lineHeight: 1.5, paddingRight: 8 }}>A framework for operators to create, configure, and submit custom agents — with Entrata&apos;s review and approval process ensuring quality and safety</span>
                      <span style={{ fontSize: 11, color: "rgba(0,0,0,0.6)", lineHeight: 1.5 }}>Extensibility — operators aren&apos;t limited to what ships out of the box. Positions OXP Studio as a platform, not just a product</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* The Full Narrative Arc */}
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", margin: "0 0 12px", fontFamily: "Inter, system-ui, sans-serif" }}>
                  The Full Narrative Arc
                </h3>
                <div style={{ borderRadius: 10, border: "1px solid #ebebeb", overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "160px 260px 1fr", padding: "8px 16px", background: "#fafafa", borderBottom: "1px solid #ebebeb" }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Phase</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Milestone</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>What We Can Say</span>
                  </div>
                  {[
                    { phase: "Prove it works", milestone: "Prove the Value & Drive Agent Adoption", canSay: "\"Here's exactly what AI is doing for you — L2 and ELI+ — and here's the data to prove it's working. The knowledge layer is smarter, and agent management is ready for scale.\"" },
                    { phase: "Take it everywhere", milestone: "Go Everywhere — OXP Studio Mobile", canSay: "\"Your blended workforce management goes wherever you go — escalations, comms, performance, all from your phone.\"" },
                    { phase: "The complete platform", milestone: "Full Platform", canSay: "\"One platform to configure and control your agents, build your own, and automate your leasing funnel with 11 L3 autonomous agents.\"" },
                  ].map((row, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "160px 260px 1fr", padding: "10px 16px", borderBottom: idx < 2 ? "1px solid #f5f5f5" : "none", alignItems: "start" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#6366f1" }}>{row.phase}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>{row.milestone}</span>
                      <span style={{ fontSize: 12, color: "rgba(0,0,0,0.6)", lineHeight: 1.6, fontStyle: "italic" }}>{row.canSay}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Themes View */}
          {viewMode === "themes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {(() => {
                const THEME_GROUPS: { title: string; color: string; bg: string; border: string; items: { features: string; release: string; domain: string }[] }[] = [
                  {
                    title: "ELI+ in OXP",
                    color: "#8b5cf6",
                    bg: "rgba(139,92,246,0.06)",
                    border: "rgba(139,92,246,0.15)",
                    items: ROADMAP_DATA.filter((item) => item.features.includes("ELI+")).map((item) => ({
                      features: item.features,
                      release: item.release,
                      domain: item.domain,
                    })),
                  },
                  {
                    title: "Brand & Voice",
                    color: "#ec4899",
                    bg: "rgba(236,72,153,0.06)",
                    border: "rgba(236,72,153,0.15)",
                    items: [
                      { features: "Company Brand & Voice Configuration", release: "R1.2", domain: "Voice & Brand" },
                      { features: "Vertical Brand & Voice Configuration", release: "R1.2", domain: "Voice & Brand" },
                      { features: "Property Brand & Voice Configuration", release: "R1.2", domain: "Voice & Brand" },
                      { features: "Agent Brand & Voice Configuration", release: "R1.2", domain: "Voice & Brand" },
                    ],
                  },
                  {
                    title: "Agent Roster",
                    color: "#0ea5e9",
                    bg: "rgba(14,165,233,0.06)",
                    border: "rgba(14,165,233,0.15)",
                    items: ROADMAP_DATA.filter((item) => item.domain === "Agent Roster").map((item) => ({
                      features: item.features,
                      release: item.release,
                      domain: item.domain,
                    })),
                  },
                ];

                return THEME_GROUPS.map((group) => (
                  <div key={group.title}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: group.color,
                          padding: "4px 12px",
                          borderRadius: 6,
                          background: group.bg,
                          border: `1px solid ${group.border}`,
                          letterSpacing: "0.2px",
                        }}
                      >
                        {group.title}
                      </div>
                      <span style={{ fontSize: 11, color: "rgba(0,0,0,0.35)" }}>
                        {group.items.length} {group.items.length === 1 ? "item" : "items"}
                      </span>
                    </div>

                    <div style={{ borderRadius: 10, border: "1px solid #ebebeb", overflow: "hidden" }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 160px",
                          gap: 0,
                          padding: "8px 16px",
                          background: group.bg,
                          borderBottom: "1px solid #ebebeb",
                        }}
                      >
                        <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Epic & Features
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Functional Domain
                        </span>
                      </div>
                      {group.items.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 160px",
                              gap: 0,
                              padding: "10px 16px",
                              borderBottom: idx < group.items.length - 1 ? "1px solid #f5f5f5" : "none",
                              alignItems: "center",
                            }}
                          >
                            <span style={{ fontSize: 12, color: "rgba(0,0,0,0.7)", lineHeight: 1.5, paddingRight: 12 }}>
                              {item.features}
                            </span>
                            <DomainLink domain={item.domain} onNavigate={handleNavigate} />
                          </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* Domain View */}
          {viewMode === "domain" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {(() => {
                const DOMAIN_SORT_ORDER = [
                  "Command Center",
                  "Communications",
                  "Escalations",
                  "Performance",
                  "Agent Roster",
                  "Workforce",
                  "AI & Agent Activation",
                  "Agent Builder",
                  "Trainings & SOPs",
                  "Voice & Brand",
                  "Governance",
                  "SOP Intelligence",
                ];
                const allDomains = [...new Set(ROADMAP_DATA.map((d) => d.domain))];
                const domainOrder = allDomains.sort((a, b) => {
                  const ai = DOMAIN_SORT_ORDER.indexOf(a);
                  const bi = DOMAIN_SORT_ORDER.indexOf(b);
                  return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
                });
                return domainOrder.map((domain) => {
                  const items = ROADMAP_DATA.filter((item) => item.domain === domain);
                  const route = DOMAIN_ROUTES[domain];
                  return (
                    <div key={domain}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        {route ? (
                          <button
                            type="button"
                            onClick={() => handleNavigate(route)}
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#6366f1",
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                              textDecoration: "none",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
                          >
                            {domain}
                          </button>
                        ) : (
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{domain}</span>
                        )}
                        <span style={{ fontSize: 11, color: "rgba(0,0,0,0.35)" }}>
                          {items.length} {items.length === 1 ? "item" : "items"}
                        </span>
                      </div>

                      <div style={{ borderRadius: 10, border: "1px solid #ebebeb", overflow: "hidden" }}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 70px 90px",
                            gap: 0,
                            padding: "8px 16px",
                            background: "#fafafa",
                            borderBottom: "1px solid #ebebeb",
                          }}
                        >
                          <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Epic & Features
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Release
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Theme
                          </span>
                        </div>
                        {items.map((item, idx) => {
                          const rMeta = RELEASE_META[item.release];
                          return (
                            <div
                              key={idx}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 70px 90px",
                                gap: 0,
                                padding: "10px 16px",
                                borderBottom: idx < items.length - 1 ? "1px solid #f5f5f5" : "none",
                                alignItems: "center",
                              }}
                            >
                              <span style={{ fontSize: 12, color: "rgba(0,0,0,0.7)", lineHeight: 1.5, paddingRight: 12 }}>
                                {item.features}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: rMeta?.color ?? "#666",
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  background: rMeta?.bg ?? "transparent",
                                  border: `1px solid ${rMeta?.border ?? "transparent"}`,
                                  width: "fit-content",
                                }}
                              >
                                {item.release}
                              </span>
                              <ThemeBadge theme={item.theme} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* Quick View (grouped by milestone/initiative) */}
          {viewMode === "quick" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {[
              {
                milestone: "Milestone 1: Prove the Value & Drive Agent Adoption",
                color: "#6366f1",
                bg: "rgba(99,102,241,0.06)",
                border: "rgba(99,102,241,0.15)",
                initiatives: [
                  {
                    name: "OXP Data and Performance",
                    epics: [
                      { epic: "ELI+ Dashboards in OXP Studio Performance", jiraId: "DEV-278123" },
                      { epic: "Command Center — ELI+ Work Attribution Metrics", jiraId: "DEV-278129" },
                      { epic: "L2 Agent Work Metrics", jiraId: "DEV-278135" },
                    ],
                  },
                  {
                    name: "OXP Studio Advanced SOP & Policies",
                    epics: [
                      { epic: "AI-Generated Playbooks from SOPs", jiraId: "DEV-276834" },
                      { epic: "Google Drive and Microsoft Document Integration", jiraId: "DEV-276847" },
                      { epic: "In-line Version Editing and Notes", jiraId: "DEV-276821" },
                      { epic: "SOP AI — Talk with Your SOPs", jiraId: "DEV-281076" },
                    ],
                  },
                  {
                    name: "Agent Roster 2.0",
                    epics: [
                      { epic: "Advanced Filtering", jiraId: "DEV-278117" },
                      { epic: "Updated UI", jiraId: "DEV-278191" },
                      { epic: "Marketplace Integration", jiraId: "DEV-278204" },
                    ],
                  },
                ],
              },
              {
                milestone: "Milestone 2: Go Everywhere — OXP Studio Mobile",
                color: "#0ea5e9",
                bg: "rgba(14,165,233,0.06)",
                border: "rgba(14,165,233,0.15)",
                initiatives: [
                  {
                    name: "OXP Mobile",
                    epics: [
                      { epic: "Mobile Tasks & Escalations", jiraId: "DEV-279201" },
                      { epic: "Mobile Comms (Nexus & ELI+)", jiraId: "DEV-279218" },
                      { epic: "Performance Data & Agent Metrics", jiraId: "DEV-279225" },
                    ],
                  },
                ],
              },
              {
                milestone: "Milestone 3: Full Platform",
                color: "#f59e0b",
                bg: "rgba(245,158,11,0.06)",
                border: "rgba(245,158,11,0.15)",
                initiatives: [
                  {
                    name: "ELI+ In OXP",
                    epics: [
                      { epic: "Visualization and Control of ELI+ Agent Settings in OXP Studio", jiraId: "DEV-281089" },
                      { epic: "Voice, Tone, & Brand", jiraId: "DEV-278104" },
                    ],
                  },
                  {
                    name: "OXP Autonomous Lease Progression",
                    epics: [
                      { epic: "Autonomous Lease Progression L3 Agents (11) in OXP Agent Roster", jiraId: "DEV-281034" },
                      { epic: "Lease Progression Data/Metrics in OXP Data Performance", jiraId: "DEV-281041" },
                    ],
                  },
                  {
                    name: "Agent Builder",
                    epics: [
                      { epic: "Build Your Own Agent Framework in OXP Studio", jiraId: "DEV-281053" },
                    ],
                  },
                ],
              },
            ].map((ms) => (
              <div key={ms.milestone}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: ms.color,
                      padding: "4px 12px",
                      borderRadius: 6,
                      background: ms.bg,
                      border: `1px solid ${ms.border}`,
                      letterSpacing: "0.2px",
                    }}
                  >
                    {ms.milestone}
                  </div>
                  <span style={{ fontSize: 11, color: "rgba(0,0,0,0.35)" }}>
                    {ms.initiatives.reduce((sum, i) => sum + i.epics.length, 0)} epics
                  </span>
                </div>

                <div style={{ borderRadius: 10, border: "1px solid #ebebeb", overflow: "hidden" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "220px 1fr 110px",
                      gap: 0,
                      padding: "8px 16px",
                      background: ms.bg,
                      borderBottom: "1px solid #ebebeb",
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Initiative
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Epic
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Jira
                    </span>
                  </div>
                  {ms.initiatives.flatMap((initiative) =>
                    initiative.epics.map((ep, idx) => ({
                      ...ep,
                      initiativeName: initiative.name,
                      showInitiative: idx === 0,
                      initiativeSpan: initiative.epics.length,
                    }))
                  ).map((row, idx, allRows) => (
                    <div
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "220px 1fr 110px",
                        gap: 0,
                        padding: "10px 16px",
                        borderBottom: idx < allRows.length - 1 ? "1px solid #f5f5f5" : "none",
                        alignItems: "center",
                        background: row.showInitiative ? "transparent" : "transparent",
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: row.showInitiative ? 600 : 400, color: row.showInitiative ? "#1a1a1a" : "transparent", paddingRight: 12 }}>
                        {row.showInitiative ? row.initiativeName : ""}
                      </span>
                      <span style={{ fontSize: 12, color: "rgba(0,0,0,0.7)", lineHeight: 1.5, paddingRight: 12 }}>
                        {row.epic}
                      </span>
                      <a
                        href={`https://entrata.atlassian.net/browse/${row.jiraId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 11,
                          fontWeight: 500,
                          color: "#6366f1",
                          textDecoration: "none",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M11.53 2c0 4.97 4.03 9 9 9h1.47v2h-1.47c-4.97 0-9 4.03-9 9v1.47h-2V22c0-4.97-4.03-9-9-9H0v-2h.53c4.97 0 9-4.03 9-9V.53h2V2z" fill="#6366f1"/>
                        </svg>
                        {row.jiraId}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

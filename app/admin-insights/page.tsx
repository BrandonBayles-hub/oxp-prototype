"use client";

import * as React from "react";
import { PageHeader } from "@/components/page-header";
import { TrainingsSopInsights } from "@/components/admin-insights/trainings-sop-insights";
import { EscalationsInsights } from "@/components/admin-insights/escalations-insights";
import { CommunicationsInsights } from "@/components/admin-insights/communications-insights";
import { AcademyTab } from "../trainings-sop/academy/AcademyTab";
import { AcademyDemoControls } from "../trainings-sop/academy/AcademyDemoControls";
import { BookOpen, AlertCircle, MessageSquare, GraduationCap } from "lucide-react";
import { SavedInsightsProvider } from "@/lib/entrata-experts-v2/saved-insights-store";

// The Entrata Experts source used to live here too. It now lives on the
// Entrata Experts page itself (chat-first hub → Admin Insights tab, peer to
// Tokens & Usage). This page keeps the cross-platform sources that aren't part
// of Entrata Experts.
type SourceId = "trainings" | "escalations" | "communications" | "academy";

interface SourceMeta {
  id: SourceId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  heading: string;
  description: string;
}

const SOURCES: SourceMeta[] = [
  {
    id: "trainings",
    label: "Trainings & SOP",
    icon: BookOpen,
    heading: "SOP health, compliance coverage & agent training",
    description:
      "Document inventory, approval pipeline, compliance area coverage, and which agents are trained on which SOPs. Surface gaps before they become audit findings.",
  },
  {
    id: "escalations",
    label: "Escalations",
    icon: AlertCircle,
    heading: "Escalation queue health & handoff patterns",
    description:
      "Queue status, volume by category and agent, workload distribution, SLA performance, and automatically detected patterns that may indicate SOP gaps or training needs.",
  },
  {
    id: "communications",
    label: "Communications",
    icon: MessageSquare,
    heading: "How your team and AI are handling conversations",
    description:
      "Thread volume by channel and property, AI vs. human handling, escalation rates, and threads that need attention — giving you a complete picture of your communication operations.",
  },
  {
    id: "academy",
    label: "Entrata Academy",
    icon: GraduationCap,
    heading: "Entrata Academy admin",
    description:
      "Full LMS admin hub — assign courses, track progress, manage certifications and learning plans, send nudges, configure enrollment rules and content visibility, run Spotlight Studio, manage policies and KB instances, edit brand kit, schedule reports, and review audit logs. The same admin surface that used to live inside Entrata Academy's Admin tab, now consolidated here as part of OXP's admin-tools-in-one-place reorganization.",
  },
];

// localStorage key used to remember which Admin Insights source the user
// last selected. We persist this so that the Academy demo-user switcher's
// full-page reload (writes localStorage.academy_demo_user_email, replays
// login, reloads) doesn't drop the user back to the default source — which is
// what was happening before this key existed.
const SOURCE_PREF_KEY = "admin_insights_source";

// The Admin Insights > Entrata Academy view is hard-pinned to the Admin
// demo persona. Source-of-truth for the email lives in
// app/trainings-sop/academy/source/demo-data.js (DEMO_USERS_MAP key for
// DEMO_ADMIN). Keep these in sync; if the upstream Academy bundle ever
// renames the admin user, the source-pinning effect below will silently
// fail (current === ADMIN_EMAIL never satisfied) and the page will
// reload-loop. Should be a startup test if Academy is ever swapped.
const ADMIN_EMAIL = "admin@sunsetpm.com";
const DEFAULT_SOURCE: SourceId = "trainings";
const VALID_SOURCES: ReadonlyArray<SourceId> = [
  "trainings",
  "escalations",
  "communications",
  "academy",
];

function readSavedSource(): SourceId | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(SOURCE_PREF_KEY);
    return v && (VALID_SOURCES as ReadonlyArray<string>).includes(v) ? (v as SourceId) : null;
  } catch {
    return null;
  }
}

export default function AdminInsightsPage() {
  // We initialize from the default on the server pass (SSR/static export has
  // no localStorage), then sync to the saved source in a useEffect once the
  // client hydrates. This avoids hydration-mismatch warnings while still
  // restoring the correct source after a reload caused by the user-switcher.
  const [source, setSource] = React.useState<SourceId>(DEFAULT_SOURCE);
  React.useEffect(() => {
    const saved = readSavedSource();
    if (saved && saved !== source) setSource(saved);
    // Intentionally no dependency on `source` — only runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whenever the active source becomes "academy", force the Academy demo
  // persona to the Admin user (Alex Chen). This view is admin-only by
  // design — the user switcher is hidden, the workflow sub-tabs are
  // stripped, and the only content rendered is the high-level admin
  // dashboard stats. If the user previously selected a non-admin persona
  // somewhere else (e.g. picked Parker Williams in Trainings & SOP),
  // Academy would otherwise boot as that persona, fail to find an Admin
  // tab to render, and show that persona's "My Learning" / "Team" view
  // instead — which is what "the admin stuff isn't actually showing"
  // looked like.
  //
  // The reload is necessary because Academy's demo-data.js reads its
  // module-level currentUser exactly once at module load (and the
  // auto-login-demo replay happens via /api/auth/login at boot). Just
  // writing localStorage from a React effect doesn't move the needle
  // for the live tree — we need a fresh load so seedAcademyDemoSession
  // → /api/auth/login → demo-data sets currentUser = DEMO_ADMIN before
  // App.jsx hydrates.
  React.useEffect(() => {
    if (source !== "academy") return;
    if (typeof window === "undefined") return;
    try {
      const current = window.localStorage.getItem("academy_demo_user_email");
      if (current && current !== ADMIN_EMAIL) {
        window.localStorage.setItem("academy_demo_user_email", ADMIN_EMAIL);
        // Clear the cached token so auto-login-demo writes a fresh one
        // bound to the admin user on the next load.
        window.localStorage.removeItem("academy_token");
        window.location.reload();
      }
    } catch {
      /* localStorage unavailable; non-fatal — the page still renders, just
         possibly under the wrong persona. */
    }
  }, [source]);

  const currentSource = SOURCES.find((s) => s.id === source)!;
  const SourceIcon = currentSource.icon;

  return (
    <SavedInsightsProvider>
      <PageHeader
        title="Admin Insights"
        description="Cross-platform observability — see what your team is doing with AI across OXP, surface gaps, and graduate patterns into automation."
      />

      {/* Source selector */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {SOURCES.map((s) => {
          const Icon = s.icon;
          const isActive = source === s.id;
          return (
            <button
              key={s.id}
              onClick={() => {
                setSource(s.id);
                // Persist the selection so a reload (e.g. from the Academy
                // demo user-switcher in the academy source) lands the user
                // back on the same source instead of resetting.
                if (typeof window !== "undefined") {
                  try {
                    window.localStorage.setItem(SOURCE_PREF_KEY, s.id);
                  } catch {
                    /* localStorage unavailable; non-fatal for the demo */
                  }
                }
              }}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-foreground/20 bg-foreground/5 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Source description */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <SourceIcon className="h-3.5 w-3.5" />
          {currentSource.label} · Wynbrook Living
        </div>
        <h2
          className="text-lg font-semibold tracking-tight text-foreground"
          style={{
            fontFamily:
              "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {currentSource.heading}
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {currentSource.description}
        </p>
      </div>

      {/* Source-specific content */}
      <div className="mt-5">
        {source === "trainings" && <TrainingsSopInsights />}
        {source === "escalations" && <EscalationsInsights />}
        {source === "communications" && <CommunicationsInsights />}
        {source === "academy" && (
          // Render the Academy app with the Admin top-tab forced active and
          // the workflow sub-tabs stripped — see host-overrides.css rule 9
          // and the persona-pinning useEffect above. We deliberately hide
          // the user switcher in this surface (showUserSwitcher={false}):
          // this view is admin-only by definition (per PM decision), and
          // exposing the switcher would invite the same persona-mismatch
          // bug the pin guards against. Tier / Release / State remain
          // because they're orthogonal to who you are.
          <div className="space-y-3">
            <div className="flex justify-end">
              <AcademyDemoControls showUserSwitcher={false} />
            </div>
            <AcademyTab mode="admin" />
          </div>
        )}
      </div>
    </SavedInsightsProvider>
  );
}

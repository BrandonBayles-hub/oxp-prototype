"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ExpertsConfigPanel } from "@/components/entrata-experts-v2/admin/experts-config-sheet";

/**
 * Entrata Experts setup page.
 *
 * Renders the same admin panel that powers the right-side ExpertsConfigSheet
 * on the Agent Roster, so any change to the panel is reflected in both
 * surfaces.
 *
 * Layout note: this route is registered in app-shell.tsx's FULL_BLEED_ROUTES,
 * which strips the default `page-content` padding and gives us a flex main
 * that fills the viewport. We just need to fill that container — no negative
 * margins required — and let the panel handle its own internal scrolling.
 */
export default function EntrataExpertsSetupPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {/* Breadcrumb back to AI & Agent Activation */}
      <div className="flex items-center gap-3 border-b border-[hsl(var(--border))] bg-white px-5 py-2.5">
        <Link
          href="/getting-started"
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
        >
          <ChevronRight className="h-3.5 w-3.5 rotate-180" />
          AI &amp; Agent Activation
        </Link>
        <span className="text-[hsl(var(--border))]">|</span>
        <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
          Entrata Experts Setup
        </span>
      </div>

      <ExpertsConfigPanel />
    </div>
  );
}

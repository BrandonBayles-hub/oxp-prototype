"use client";

import { ArrowRight, ExternalLink, Bot, RotateCcw } from "lucide-react";
import { useState } from "react";

// =============================================================================
//  Simulation Panel (formerly "Internal Demo")
//
//  Resident-side simulation surface that lives under each ELI+ agent's
//  per-property settings (Property Settings ▸ Simulation). The actual
//  conversational engine is hosted externally (admin-ui-nu-one.vercel.app —
//  a custom voice stack using OpenAI + Grok TTS, not ElevenLabs Conv AI), so
//  we embed it as an iframe and own the wrapper chrome on this side: the
//  "Internal only" header, framing, sizing, "open in new tab" affordance,
//  and a Coming Soon placeholder for agents that don't have a demo URL yet.
//
//  The inside of the iframe is cross-origin and therefore unstyleable from
//  here. Restyling the cube / voice-chat toggle inside the iframe would
//  require changes in the external app itself or replacing the engine with a
//  natively-controllable provider (e.g. an ElevenLabs Conv AI agent we own).
// =============================================================================

const INTERNAL_DEMO_AGENTS: Record<string, { url: string }> = {
  "Renewal AI": {
    url: "https://admin-ui-nu-one.vercel.app/#/demo/b631d233-e2ff-4391-8e6f-76d7afee8c18",
  },
  "Leasing AI": {
    url: "https://admin-ui-nu-one.vercel.app/#/demo/fc36d78b-6922-48cd-b00e-97619f7058b1",
  },
  "Maintenance AI": {
    url: "https://admin-ui-nu-one.vercel.app/#/demo/b21d4592-ad80-4ca8-a10d-990d1c9f29d6",
  },
};

export function isInternalDemoEnabled(agentName: string): boolean {
  return agentName in INTERNAL_DEMO_AGENTS;
}

export function InternalDemoPanel({
  agentName,
  propertyName,
}: {
  agentName: string;
  propertyName: string;
}) {
  const config = INTERNAL_DEMO_AGENTS[agentName];
  // Bumped each time the user clicks "Reload simulation"; used as the iframe
  // key so React tears down and re-mounts it (which re-triggers the external
  // app's agent fetch). Lets users recover without a full page reload.
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-white px-8 pt-8 pb-5">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">Simulation</h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                Internal only
              </span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              A live resident-side simulation of {agentName} at {propertyName}. Use
              the embedded experience below to test the call or chat exactly as a
              resident would.
            </p>
          </div>
          {config?.url && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted/50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reload simulation
              </button>
              <a
                href={config.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted/50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in new tab
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>

      </div>

      <div className="flex-1 min-h-0 overflow-hidden bg-zinc-50 p-6">
        {config ? (
          <div className="mx-auto h-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <iframe
              key={reloadKey}
              src={config.url}
              title={`${agentName} internal demo`}
              className="h-full w-full"
              style={{ border: "none", minHeight: 760 }}
              allow="microphone; autoplay; clipboard-read; clipboard-write"
            />
          </div>
        ) : (
          <div className="mx-auto flex h-full max-w-5xl flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-white px-6 py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100">
              <Bot className="h-7 w-7 text-zinc-400" aria-hidden />
            </div>
            <div className="space-y-1.5">
              <p className="text-base font-semibold text-foreground">Coming Soon</p>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                A resident-side simulation for {agentName} at {propertyName} isn&apos;t
                available yet. We&apos;re wiring up the live voice and chat
                experience — check back here once it&apos;s ready.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

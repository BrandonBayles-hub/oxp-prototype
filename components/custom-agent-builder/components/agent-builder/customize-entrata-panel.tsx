"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Agent } from "../../lib/agents-context";
import { useCustomAgents } from "../../lib/custom-agents-context";
import { canAccessCustomAgentBuilder } from "../../clientGuard";

/**
 * "Build your own version" panel dropped into native Entrata agent sheets.
 *
 * Shows the system prompt read-only (so PMCs can see what Entrata actually
 * runs), then offers a CTA to fork the agent into a custom agent they own.
 * Forking preloads the wizard with the native agent's prompt, guardrails,
 * triggers, inferred data + skills, and channel config — the PMC only edits
 * what they want to change.
 *
 * On confirm we stamp the new custom agent with `forkedFromEntrataId`, which
 * (a) tells the Agent Roster to hide the original, and (b) gives us signal
 * later to diff what PMCs customize about a given system agent.
 */
export function CustomizeEntrataAgentPanel({ agent }: { agent: Agent }) {
  const router = useRouter();
  const { agents: customAgents, createForkedDraft } = useCustomAgents();
  const [expanded, setExpanded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const systemPrompt = useMemo(
    () => agent.systemPrompt?.trim() || agent.prompt?.trim() || "",
    [agent.systemPrompt, agent.prompt]
  );
  const hasPrompt = systemPrompt.length > 0;

  const existingFork = useMemo(
    () =>
      customAgents.find((ca) => ca.forkedFromEntrataId === agent.id && ca.lifecycle !== "draft"),
    [customAgents, agent.id]
  );
  const existingDraft = useMemo(
    () =>
      customAgents.find((ca) => ca.forkedFromEntrataId === agent.id && ca.lifecycle === "draft"),
    [customAgents, agent.id]
  );

  const handleFork = () => {
    if (existingDraft) {
      router.push(`/agent-builder?view=new&id=${existingDraft.id}&v=${existingDraft.activeVersion}`);
      return;
    }
    const forked = createForkedDraft(agent);
    router.push(`/agent-builder?view=new&id=${forked.id}&v=${forked.activeVersion}`);
  };

  if (!canAccessCustomAgentBuilder()) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-[hsl(var(--primary))]/5 via-transparent to-[hsl(var(--primary))]/5 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">Customize this agent</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {existingFork
              ? `You already have a custom version of ${agent.name} on your roster. Open it in the Agent Builder to continue editing.`
              : `Fork ${agent.name} into your own custom agent. We'll preload the prompt, triggers, data, and skills so you can start by editing rather than building from scratch.`}
          </p>

          {hasPrompt && (
            <div className="mt-3">
              <button
                type="button"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                onClick={() => setExpanded((e) => !e)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" /> Hide system prompt
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" /> View system prompt
                  </>
                )}
              </button>
              {expanded && (
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed text-foreground">
                  {systemPrompt}
                </pre>
              )}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {existingFork ? (
              <Button
                size="sm"
                onClick={() =>
                  router.push(`/agent-builder?view=detail&id=${existingFork.id}`)
                }
              >
                Open my version
              </Button>
            ) : (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Build your own version
              </Button>
            )}
            {existingDraft && !existingFork && (
              <Button size="sm" variant="outline" onClick={handleFork}>
                Resume draft
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Take ownership of {agent.name}?</DialogTitle>
            <DialogDescription>
              You&apos;re about to create your own custom version of this agent.
              Before you continue, here&apos;s what changes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm text-foreground">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-primary">•</span>
              <p>
                Your custom version will <span className="font-medium">replace the Entrata-maintained {agent.name}</span>{" "}
                on your Agent Roster. You can always delete it to fall back to the system version.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-primary">•</span>
              <p>
                You own the prompt, guardrails, triggers, data, skills, and
                escalations going forward. Nothing about your version updates
                unless you change it.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-amber-600">•</span>
              <p>
                Entrata will keep improving the system {agent.name} — those
                improvements <span className="font-medium">won&apos;t flow into your custom version</span>{" "}
                automatically. You&apos;ll need to review and re-apply them
                yourself.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                We recommend using the system agent as-is unless you have a
                specific reason to customize. Custom agents require more ongoing
                maintenance from you.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Never mind
            </Button>
            <Button
              onClick={() => {
                setDialogOpen(false);
                handleFork();
              }}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Build my own version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

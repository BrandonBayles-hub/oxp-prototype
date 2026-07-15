"use client";
import * as React from "react";
import { Bookmark, Play, Pencil, Trash2, Share2, Check, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useSavedInsights,
  slugify,
} from "@/lib/entrata-experts-v2/saved-insights-store";
import { LENS_BY_ID } from "@/lib/entrata-experts-v2/lenses";
import { useAnalyticsHandoff } from "@/lib/analytics-handoff-context";
import { isHandoffEligible } from "@/lib/entrata-experts-v2/analytics-handoff";
import type { SavedInsight } from "@/lib/entrata-experts-v2/types";
import { formatRelative } from "@/lib/entrata-experts-v2/format";

const HEADING_FONT =
  "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif";

/**
 * Lightweight management view for the Saved Insights library.
 *
 * Each row supports: Run (queues into Analyst and navigates there),
 * Rename (inline edit), Delete (confirm), and Send to Analytics Platform.
 * Heavy editing (re-parameterizing prompt/lens/scope) is deliberately not
 * supported — re-save from chat instead.
 */
export function SavedInsightsLibrary({
  onRunStarted,
}: {
  /** Called after Run dispatches; the hub uses this to switch to Analyst. */
  onRunStarted: () => void;
}) {
  const { insights, rename, remove, setPendingRun } = useSavedInsights();
  const { handoffEnabled, openHandoff } = useAnalyticsHandoff();

  function handleRun(insight: SavedInsight) {
    setPendingRun(insight);
    onRunStarted();
  }

  function handleHandoff(insight: SavedInsight) {
    // Use the cached lastResult artifact if available; the dialog requires
    // an Artifact to build its dashboard.py source. If we don't have one
    // yet, we route the user to run it first (the action is disabled below).
    const eligible = insight.lastResult?.find(isHandoffEligible);
    if (!eligible) return;
    openHandoff(eligible, {
      scopeLabel: insight.scope.label,
      prompt: insight.prompt,
      savedInsight: {
        id: insight.id,
        slug: insight.slug,
        name: insight.name,
        prompt: insight.prompt,
        lens: insight.lens,
        scopeLabel: insight.scope.label,
      },
    });
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-border px-5 py-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-md"
          style={{ background: "#4338ca14", color: "#4338ca" }}
        >
          <Bookmark className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            className="text-base font-semibold leading-tight text-foreground"
            style={{ fontFamily: HEADING_FONT }}
          >
            Saved Insights
          </h2>
          <p className="truncate text-[12px] text-muted-foreground">
            Reusable, one-click prompts. Run them inline with{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px] text-foreground">/insight-name</code>{" "}
            in chat, or hand them off to the Analytics Platform.
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-hover px-6 py-5">
        {insights.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-2">
            {insights.map((i) => (
              <SavedInsightRow
                key={i.id}
                insight={i}
                handoffEnabled={handoffEnabled}
                onRun={() => handleRun(i)}
                onRename={(name) => rename(i.id, { name })}
                onDelete={() => remove(i.id)}
                onHandoff={() => handleHandoff(i)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
      <Bookmark className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60" />
      <div className="text-sm font-medium text-foreground">No Saved Insights yet</div>
      <div className="mx-auto mt-1 max-w-md text-[12px]">
        Ask Entrata Analyst a question and click <span className="font-medium">Save to Insights</span>{" "}
        on the result, or promote a recurring question from{" "}
        <span className="font-medium">Admin Insights → What people are asking</span>.
      </div>
    </div>
  );
}

function SavedInsightRow({
  insight,
  handoffEnabled,
  onRun,
  onRename,
  onDelete,
  onHandoff,
}: {
  insight: SavedInsight;
  handoffEnabled: boolean;
  onRun: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onHandoff: () => void;
}) {
  const lensDef = LENS_BY_ID[insight.lens];
  const LIcon = lensDef?.icon;
  const hasPreview = insight.lastResult?.some(isHandoffEligible) ?? false;

  const [editing, setEditing] = React.useState(false);
  const [draftName, setDraftName] = React.useState(insight.name);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (!editing) setDraftName(insight.name);
  }, [editing, insight.name]);

  const previewSlug = slugify(draftName) || insight.slug;

  function commitRename() {
    const next = draftName.trim();
    if (next && next !== insight.name) onRename(next);
    setEditing(false);
  }

  return (
    <li className="rounded-lg border border-border bg-card transition-colors hover:bg-muted/20">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
          <Bookmark className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitRename();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setEditing(false);
                  }
                }}
                autoFocus
                className="h-7 max-w-xs text-sm"
              />
              <code className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                /{previewSlug}
              </code>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={commitRename}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={() => setEditing(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-sm font-semibold text-foreground">{insight.name}</span>
              <code className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                /{insight.slug}
              </code>
              <span className="text-[11px] text-muted-foreground">
                · {formatRelative(insight.updatedAt)}
              </span>
            </div>
          )}

          <div className="mt-1 line-clamp-2 text-[13px] italic text-muted-foreground">
            &ldquo;{insight.prompt}&rdquo;
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {lensDef && (
              <span
                className="inline-flex items-center gap-1 rounded-full border bg-background px-1.5 py-0.5 text-[10px] font-medium"
                style={{ borderColor: `${lensDef.hue}55`, color: lensDef.hue }}
              >
                {LIcon && <LIcon className="h-2.5 w-2.5" />}
                {lensDef.label}
              </span>
            )}
            <span className="rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground">
              {insight.scope.label}
            </span>
            <span className="rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {insight.source === "chat" ? "From chat" : "From admin"}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            className="gap-1.5"
            onClick={onRun}
            title="Re-run in Entrata Analyst"
          >
            <Play className="h-3 w-3" />
            Run
            <ArrowRight className="h-3 w-3" />
          </Button>
          {handoffEnabled && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={onHandoff}
              disabled={!hasPreview}
              title={
                hasPreview
                  ? "Send to Analytics Platform"
                  : "Run this insight at least once first"
              }
            >
              <Share2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {!editing && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setEditing(true)}
              title="Rename"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {confirmDelete ? (
            <>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 px-2 text-[11px]"
                onClick={() => {
                  onDelete();
                  setConfirmDelete(false);
                }}
              >
                Confirm
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setConfirmDelete(false)}
                title="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-rose-600"
              onClick={() => setConfirmDelete(true)}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

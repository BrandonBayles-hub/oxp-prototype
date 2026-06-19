"use client";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bookmark, Check } from "lucide-react";
import type { Artifact, Depth, LensId, ModelId, Scope, SavedInsight } from "@/lib/entrata-experts-v2/types";
import { LENS_BY_ID } from "@/lib/entrata-experts-v2/lenses";
import {
  slugify,
  useSavedInsights,
} from "@/lib/entrata-experts-v2/saved-insights-store";

/**
 * The condensed-prompt definition the dialog will persist. Lens/depth/model/
 * scope are captured at the moment of save so the insight re-runs with the
 * exact same params later, regardless of the composer's current state.
 */
export interface InsightDraft {
  prompt: string;
  lens: LensId;
  depth: Depth;
  model: ModelId;
  scope: Scope;
  /** Where this save was initiated (chat artifact vs. admin graduation). */
  source: SavedInsight["source"];
  /** Optional cached artifacts so the library can preview the most recent run. */
  lastResult?: Artifact[];
  /** Optional seed name — pre-fills the name field. */
  suggestedName?: string;
}

export function SaveAsInsightDialog({
  open,
  draft,
  onClose,
  onSaved,
}: {
  open: boolean;
  draft: InsightDraft | null;
  onClose: () => void;
  onSaved?: (insight: SavedInsight) => void;
}) {
  const { create } = useSavedInsights();
  const defaultName = React.useMemo(
    () => draft?.suggestedName?.trim() || suggestNameFromPrompt(draft?.prompt ?? ""),
    [draft],
  );
  const [name, setName] = React.useState(defaultName);
  const [saved, setSaved] = React.useState<SavedInsight | null>(null);

  React.useEffect(() => {
    if (open) {
      setName(defaultName);
      setSaved(null);
    }
  }, [open, defaultName]);

  if (!draft) return null;

  const slug = slugify(name) || "insight";
  const lensDef = LENS_BY_ID[draft.lens];
  const LIcon = lensDef?.icon;

  function handleSave() {
    if (!draft) return;
    const created = create({
      name: name.trim() || defaultName,
      prompt: draft.prompt,
      lens: draft.lens,
      depth: draft.depth,
      model: draft.model,
      scope: draft.scope,
      source: draft.source,
      lastResult: draft.lastResult,
    });
    setSaved(created);
    onSaved?.(created);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {!saved ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-indigo-600" />
                Save as a Saved Insight
              </DialogTitle>
              <DialogDescription>
                Re-run this question on demand with{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px] text-foreground">/{slug}</code>,
                or hand it off to the Analytics Platform later.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-1">
              <div className="space-y-1.5">
                <Label htmlFor="insight-name">Name</Label>
                <Input
                  id="insight-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Delinquency by aging bucket"
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground">
                  Command: <code className="rounded bg-muted px-1 py-0.5 text-foreground">/{slug}</code>
                </p>
              </div>

              {/* Captured params summary — what will actually re-run. */}
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                  Captured prompt + params
                </div>
                <div className="line-clamp-2 text-[13px] font-medium text-foreground">
                  &ldquo;{draft.prompt}&rdquo;
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
                    {draft.depth}
                  </span>
                  {draft.model && draft.model !== "auto" && (
                    <span className="rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                      {String(draft.model)}
                    </span>
                  )}
                  <span className="rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                    {draft.scope.label}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleSave} disabled={!name.trim()}>
                Save insight
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-5 w-5 text-emerald-600" />
              </div>
              <DialogTitle className="text-center">Saved</DialogTitle>
              <DialogDescription className="text-center">
                <span className="font-medium text-foreground">{saved.name}</span> is now in your
                Saved Insights library. Type{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px] text-foreground">/{saved.slug}</code>{" "}
                in the composer to re-run it.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" size="sm" onClick={onClose} className="mx-auto">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Heuristic — take the first sentence (or first 50 chars) of the prompt. */
function suggestNameFromPrompt(prompt: string): string {
  const trimmed = prompt.trim().replace(/[?!.]+$/, "");
  if (trimmed.length <= 50) return trimmed;
  const cut = trimmed.slice(0, 50).split(" ").slice(0, -1).join(" ");
  return cut || trimmed.slice(0, 50);
}

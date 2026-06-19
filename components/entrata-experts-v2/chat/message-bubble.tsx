"use client";
import * as React from "react";
import type { AssistantMessage, UserMessage } from "@/lib/entrata-experts-v2/types";
import { MessageBody } from "./message-body";
import { Artifact } from "./artifact";
import { TraceView } from "./trace-view";
import { LENS_BY_ID, MODEL_BY_ID, DEPTH_BY_ID } from "@/lib/entrata-experts-v2/lenses";
import { describeModel } from "@/lib/entrata-experts-v2/llm/model-catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ThumbsUp,
  ThumbsDown,
  Copy,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ShieldX,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function UserBubble({ message }: { message: UserMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl bg-muted px-4 py-2.5 text-[15px] leading-relaxed text-foreground">
        {message.body}
      </div>
    </div>
  );
}

export function AssistantBubble({
  message,
  onFollowUp,
  priorPrompt,
}: {
  message: AssistantMessage;
  onFollowUp?: (text: string) => void;
  /** The user prompt that produced this answer — seeds the handoff / Mode B. */
  priorPrompt?: string;
}) {
  const lensDef = LENS_BY_ID[message.lens];
  const Icon = lensDef.icon;
  const modelDef = MODEL_BY_ID[message.model ?? "auto"] ?? describeModel(message.model ?? "auto");
  const depthDef = DEPTH_BY_ID[message.depth];

  const outcomeBadge =
    message.outcome === "refused" ? (
      <Badge variant="destructive" className="gap-1 text-[10px]">
        <ShieldX className="h-3 w-3" />Out of scope
      </Badge>
    ) : message.outcome === "low-confidence" ? (
      <Badge variant="yellow" className="gap-1 text-[10px]">
        <AlertTriangle className="h-3 w-3" />Low confidence
      </Badge>
    ) : message.outcome === "escalated" ? (
      <Badge variant="yellow" className="gap-1 text-[10px]">
        <AlertTriangle className="h-3 w-3" />Escalated
      </Badge>
    ) : (
      <Badge variant="green" className="gap-1 text-[10px]">
        <CheckCircle2 className="h-3 w-3" />Answered
      </Badge>
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
          style={{ borderColor: `${lensDef.hue}55` }}
        >
          <Icon className="h-3 w-3" style={{ color: lensDef.hue }} />
          {lensDef.label}
        </span>
        <Badge variant="gray" className="text-[10px]">{depthDef?.label ?? "Auto"}</Badge>
        {message.model && message.model !== "auto" && (
          <span
            className="inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[11px] font-medium"
            style={{
              background: `${modelDef.hue}14`,
              color: modelDef.hue,
              borderColor: `${modelDef.hue}40`,
            }}
          >
            {modelDef.short}
            <span className="text-[10px] opacity-70">· {modelDef.provider}</span>
          </span>
        )}
        <Badge variant="gray" className="text-[10px]">{message.scope.label}</Badge>
        <span className="ml-auto">{outcomeBadge}</span>
      </div>

      <MessageBody body={message.body} citations={message.citations} />

      {message.artifacts.map((art) => (
        <Artifact
          key={art.id}
          artifact={art}
          handoffContext={{ scopeLabel: message.scope.label, prompt: priorPrompt }}
          insightContext={
            priorPrompt
              ? {
                  prompt: priorPrompt,
                  lens: message.lens,
                  depth: message.depth,
                  model: message.model,
                  scope: message.scope,
                }
              : undefined
          }
        />
      ))}

      {message.trace.length > 0 && (
        <TraceView trace={message.trace} citations={message.citations} />
      )}

      {message.citations.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground">
            <span className="font-medium">Sources</span>
            <span className="ml-2 text-muted-foreground/70">{message.citations.length} cited</span>
          </summary>
          <ol className="mt-2 space-y-1.5 text-xs">
            {message.citations.map((c, i) => (
              <li key={c.id} className="flex gap-2">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                <span className="leading-relaxed">
                  <span className="font-medium text-foreground">{c.label}</span>
                  <span className="text-muted-foreground"> · {c.source}</span>
                </span>
              </li>
            ))}
          </ol>
        </details>
      )}

      <div className="flex items-center gap-1 border-t border-border/60 pt-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Helpful">
          <ThumbsUp className={cn("h-3.5 w-3.5", message.rating === "up" && "text-emerald-600")} />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Not helpful">
          <ThumbsDown className={cn("h-3.5 w-3.5", message.rating === "down" && "text-rose-600")} />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Copy">
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Regenerate">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {message.followUps.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {message.followUps.map((f) => (
            <button
              key={f}
              onClick={() => onFollowUp?.(f)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground transition-colors hover:bg-muted/50"
            >
              <span>{f}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

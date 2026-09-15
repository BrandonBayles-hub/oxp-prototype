"use client";

/**
 * Inline "new SMS conversation" panel, rendered in the OXP
 * `/conversations/` right pane whenever the shared
 * `pendingSmsCompose` slot on `ConversationsContext` is set.
 *
 * Visually this is the SAME shell as an existing SMS thread —
 * same header (name + property on the left, controls on the right),
 * same message scroll region, and same Message/Private Note tab bar
 * + rounded-xl textarea + Attach + Send composer footer used by the
 * primary thread view in `app/conversations/page.tsx`. The only
 * differences from a real thread are:
 *
 *   • The right-side header controls (tag count / AI On pill /
 *     assignee avatar / Resolve dropdown) are replaced by a subtle
 *     "New SMS · not yet saved" indicator. None of those controls
 *     apply until the conversation exists.
 *   • The messages region is empty and shows a small centered
 *     helper reminding staff that no messages exist yet.
 *
 * On Send: commits a new SMS conversation via
 * `useConversations().addConversation(...)`, clears the pending
 * slot, and navigates to `/conversations/?id=<newId>` so the right
 * pane swaps back into the normal thread view showing the just-sent
 * SMS as the first outgoing bubble.
 *
 * On Cancel / Escape: only clears the pending slot. We're already
 * on the conversations page, so cancelling should NOT navigate —
 * the right pane simply falls back to the previously-selected
 * thread (or the empty state if none was selected).
 *
 * Staff SMS composition is a manual human action — per the workspace
 * rules, NO Eli/AI styling (`bg-eli-warm-bg`, `<AiStatusBadge>`,
 * `<Switch variant="eli">`) belongs here.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  CircleAlert,
  MessageSquare,
  Paperclip,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useConversations } from "@/lib/conversations-context";
import type { Result } from "@/components/app-shell/entrata-global-search";

export function EntrataInlineSmsComposer({
  recipient,
}: {
  recipient: Result;
}) {
  const router = useRouter();
  const { addConversation, setPendingSmsCompose } = useConversations();
  const [draft, setDraft] = useState("");
  const [inputMode, setInputMode] = useState<"message" | "private_note">(
    "message",
  );
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Reset the draft + mode every time this panel mounts with a
  // different recipient so an abandoned draft doesn't leak across
  // sessions.
  useEffect(() => {
    setDraft("");
    setInputMode("message");
  }, [recipient.id]);

  // Focus the textarea so staff can start typing without an extra
  // click after clicking the search-row's SMS button.
  useEffect(() => {
    textareaRef.current?.focus();
  }, [recipient.id]);

  // Escape clears the pending recipient — same net effect as Cancel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPendingSmsCompose(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPendingSmsCompose]);

  const trimmed = draft.trim();
  // Only actual SMS sends are wired up on this "new conversation"
  // shell. Private Note is visible for parity with real threads but
  // starting a conversation via private note isn't a real flow, so
  // we short-circuit Send unless we're in Message mode.
  const canSend = trimmed.length > 0 && inputMode === "message";

  // "Abel, Ann" → "Ann"; fall back gracefully for any name that
  // isn't in "Last, First" form.
  const firstName =
    recipient.name.split(",")[1]?.trim() ||
    recipient.name.split(",")[0]?.trim() ||
    recipient.name;

  const handleSend = () => {
    if (!canSend) return;
    // Commit a new SMS thread. This is the ONLY place we mutate
    // global state — until this handler runs, no conversation exists
    // for this person, preserving the "don't start until sent"
    // invariant.
    const newId = addConversation({
      resident: recipient.name,
      unit: recipient.bldgUnit === "-" ? null : recipient.bldgUnit,
      preview: trimmed,
      agent: "None",
      time: "just now",
      contactType: recipient.type === "Resident" ? "Resident" : "Lead",
      property: recipient.property,
      channel: "SMS",
      assignee: "Abe Kashiwagi",
      labels: [recipient.type === "Resident" ? "Resident" : "Lead"],
      status: "open",
      hasUnread: false,
      messages: [
        {
          role: "staff",
          text: trimmed,
          timestamp:
            new Date().toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }) + " MST",
          type: "message",
        },
      ],
    });
    // Clear the pending slot first so the right pane doesn't briefly
    // render the composer for the just-selected thread, then push
    // the new id so the URL sync in `page.tsx` selects it.
    setPendingSmsCompose(null);
    router.push(`/conversations/?id=${newId}`);
  };

  // The parent right-pane in `app/conversations/page.tsx` is already a
  // `flex min-w-0 flex-1 flex-col`, so we lay ourselves out as a
  // Fragment (header shrink-0 / messages flex-1 / footer shrink-0) —
  // exactly like the `selected` branch alongside us — instead of
  // wrapping in another flex column that would nest inside it.
  return (
    <>
      {/* Header — matches the primary thread header (px-5 py-3,
          name in text-base semibold, property in text-sm muted).
          The right-side controls (tag count / AI pill / avatar /
          Resolve) are replaced by a subtle "New SMS · not yet
          saved" indicator because none of them apply until the
          conversation exists. */}
      <div
        role="region"
        aria-label={`Send SMS to ${recipient.name}`}
        className="shrink-0 border-b border-border bg-card px-5 py-3"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-base font-semibold leading-tight text-foreground truncate">
              {recipient.name}
            </span>
            <span className="text-sm text-muted-foreground truncate">
              {recipient.property}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-md bg-status-warning px-2.5 text-xs font-medium text-status-warning-foreground">
              <CircleAlert className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              New SMS · not yet saved
            </span>
          </div>
        </div>
      </div>

      {/* Empty messages area — same wrapper classes as the real
          thread's scroll region so the right pane matches pixel-for-
          pixel. */}
      <div className="flex-1 overflow-y-auto scrollbar-hover bg-background px-5 py-4">
        <div className="flex h-full min-h-[240px] items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
            <MessageSquare className="h-5 w-5 opacity-40" aria-hidden />
            <p className="text-xs">
              No messages yet — your first SMS will start this conversation.
            </p>
          </div>
        </div>
      </div>

      {/* Composer footer — verbatim copy of the primary thread
          composer's Message/Private Note tab bar + rounded-xl
          textarea shell + Attach + Send button. Private Note is
          visible for visual parity with the real thread view but
          Send is disabled outside Message mode. */}
      <div className="shrink-0 border-t border-border bg-muted/40 shadow-[0_-2px_6px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-1 px-5 pt-3 pb-2">
          <Button
            variant={inputMode === "message" ? "default" : "ghost"}
            size="sm"
            className="gap-1.5 rounded-full text-xs"
            onClick={() => setInputMode("message")}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Message
          </Button>
          <Button
            variant={inputMode === "private_note" ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "gap-1.5 rounded-full text-xs",
              inputMode === "private_note" &&
                "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
            )}
            onClick={() => setInputMode("private_note")}
          >
            <StickyNote className="h-3.5 w-3.5" />
            Private Note
          </Button>
        </div>
        <div className="px-5 pb-4">
          <div
            className={cn(
              "relative flex flex-col rounded-xl border transition-colors focus-within:ring-1 focus-within:ring-ring",
              inputMode === "private_note"
                ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
                : "border-input bg-background",
            )}
          >
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && inputMode === "message") {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                inputMode === "private_note"
                  ? "Write a private note…"
                  : `Write an SMS to ${firstName}…`
              }
              rows={2}
              className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none"
              aria-label={
                inputMode === "private_note" ? "Private note" : "Message"
              }
            />
            <div className="flex items-center justify-between px-3 pb-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-muted-foreground"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  Attach
                </Button>
              </div>
              <Button
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-full",
                  inputMode === "private_note" && "bg-amber-600 hover:bg-amber-700",
                )}
                disabled={!canSend}
                onClick={handleSend}
                aria-label="Send"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

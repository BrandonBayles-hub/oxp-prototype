"use client";

/**
 * Inline "new Email conversation" panel, rendered in the OXP
 * `/conversations/` right pane whenever the shared
 * `pendingEmailCompose` slot on `ConversationsContext` is set.
 *
 * Mirror of `entrata-inline-sms-composer.tsx` — same Fragment shell
 * (header shrink-0 / empty messages area flex-1 / composer footer
 * shrink-0) and same Tailwind classes lifted from the primary thread
 * view. Email-specific differences:
 *
 *   • The Message / Private Note tab bar is REMOVED — email is a
 *     single-mode surface, so there's no `inputMode` state to track.
 *   • The composer container exposes a **Subject** input above the
 *     body textarea; Send is disabled unless BOTH subject and body
 *     are non-empty.
 *   • The body textarea is `rows={4}` (SMS uses `rows={2}`) since
 *     email is a longer-form message than a text.
 *   • The empty messages helper uses the `Mail` icon and reminds
 *     staff their first email will start this conversation.
 *   • Hovering the recipient name in the header pops a tooltip
 *     showing the From/To email addresses the send will use;
 *     clicking the name opens a compact profile preview dialog
 *     (name / role / property / unit / email / phone) while keeping
 *     the in-progress subject + body intact in local state.
 *
 * Unlike SMS, this composer has no "existing thread" branch — the
 * user requested that email ALWAYS creates a fresh new thread from
 * the search-row Email button. So the top-nav never routes an email
 * click at an existing thread; every commit path here goes through
 * `addConversation`.
 *
 * On Send: commits a new Email conversation via
 * `useConversations().addConversation(...)`, storing the subject in
 * the existing `ConversationItem.emailSubject` field (already defined
 * on the type — no new field was needed, we just reuse the same slot
 * the seeded Nina Ortiz thread and every other Email thread already
 * populates), clears the pending slot, and navigates to
 * `/conversations/?id=<newId>` so the right pane swaps back into the
 * normal thread view.
 *
 * On Cancel / Escape: only clears the pending slot. We're already on
 * the conversations page, so cancelling should NOT navigate — the
 * right pane simply falls back to the previously-selected thread (or
 * the empty state if none was selected).
 *
 * Staff email composition is a manual human action — per the workspace
 * rules, NO Eli/AI styling (`bg-eli-warm-bg`, `<AiStatusBadge>`,
 * `<Switch variant="eli">`) belongs here.
 *
 * Gated behind `useConversationsDemo().email2DemoEnabled === false`,
 * i.e. this is the DEFAULT experience. The legacy
 * `EntrataComposeEmail` modal (dark top bar, three-column body, orange
 * Send Email footer) lives behind the ON position of that toggle.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  Building2,
  CircleAlert,
  Home,
  Mail,
  Paperclip,
  Phone,
  User as UserIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useConversations } from "@/lib/conversations-context";
import type { Result } from "@/components/app-shell/entrata-global-search";

/**
 * Best-effort recipient email for the tooltip on the header. Priority:
 *   1. `Result.email` — the canonical field the search overlay sets.
 *   2. First entry in `otherResults` labeled "Email" (case-insensitive).
 *   3. A synthesized demo address from the person's name so the tooltip
 *      always has something to show, even if the seeded row didn't set
 *      an explicit email.
 */
function resolveRecipientEmail(recipient: Result): string {
  if (recipient.email) return recipient.email;
  const other = recipient.otherResults.find(
    (o) => (o.label ?? "").toLowerCase() === "email",
  );
  if (other?.value) return other.value;
  const parts = recipient.name.split(",").map((p) => p.trim());
  const first = parts[1] ?? parts[0] ?? "";
  const last = parts[0] ?? "";
  const localPart = `${first}.${last}`
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "")
    .replace(/^\.+|\.+$/g, "");
  return `${localPart || "resident"}@example.com`;
}

/**
 * Staff-side "From" address for the tooltip. Derived from the recipient's
 * property so the demo reads as if the sending mailbox is the leasing
 * inbox for that property (matches how the seeded email threads render
 * their From: line, e.g. `Hillside Living Leasing <leasing@hillsideliving.com>`).
 */
function resolveSenderEmail(recipient: Result): string {
  const slug = recipient.property
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return `leasing@${slug || "property"}.com`;
}

export function EntrataInlineEmailComposer({
  recipient,
}: {
  recipient: Result;
}) {
  const router = useRouter();
  const { addConversation, setPendingEmailCompose } = useConversations();
  const [subject, setSubject] = useState("");
  const [draft, setDraft] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const subjectRef = useRef<HTMLInputElement | null>(null);
  // Precomputed once per recipient render so the header tooltip and any
  // downstream send-time metadata stay in sync (only the tooltip uses
  // them today, but keeping them at component scope avoids drift if we
  // decide to persist them on the ConversationItem later).
  const senderEmail = resolveSenderEmail(recipient);
  const recipientEmail = resolveRecipientEmail(recipient);

  // Reset both fields every time this panel mounts with a different
  // recipient so an abandoned draft doesn't leak across sessions.
  useEffect(() => {
    setSubject("");
    setDraft("");
  }, [recipient.id]);

  // Focus the Subject input on mount — email typically starts with
  // the subject, so jumping the cursor there is better UX than
  // landing in the body.
  useEffect(() => {
    subjectRef.current?.focus();
  }, [recipient.id]);

  // Escape clears the pending recipient — same net effect as Cancel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPendingEmailCompose(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPendingEmailCompose]);

  const trimmedSubject = subject.trim();
  const trimmedBody = draft.trim();
  const canSend = trimmedSubject.length > 0 && trimmedBody.length > 0;

  // "Abel, Ann" → "Ann"; fall back gracefully for any name that
  // isn't in "Last, First" form.
  const firstName =
    recipient.name.split(",")[1]?.trim() ||
    recipient.name.split(",")[0]?.trim() ||
    recipient.name;

  const handleSend = () => {
    if (!canSend) return;
    // Commit a new Email thread. This is the ONLY place we mutate
    // global state — until this handler runs, no conversation exists
    // for this person, preserving the "don't start until sent"
    // invariant.
    //
    // Subject is stored via the existing `ConversationItem.emailSubject`
    // field on `lib/conversations-context.tsx` (already defined on the
    // type and populated by every seeded Email thread, e.g. the Nina
    // Ortiz pool-deck resurfacing thread), so we reuse that slot rather
    // than adding a parallel `subject?: string` field.
    const newId = addConversation({
      resident: recipient.name,
      unit: recipient.bldgUnit === "-" ? null : recipient.bldgUnit,
      preview: trimmedBody,
      emailSubject: trimmedSubject,
      agent: "None",
      time: "just now",
      contactType: recipient.type === "Resident" ? "Resident" : "Lead",
      property: recipient.property,
      channel: "Email",
      assignee: "Abe Kashiwagi",
      labels: [recipient.type === "Resident" ? "Resident" : "Lead"],
      status: "open",
      hasUnread: false,
      messages: [
        {
          role: "staff",
          text: trimmedBody,
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
    // render the composer for the just-selected thread, then push the
    // new id so the URL sync in `page.tsx` selects it.
    setPendingEmailCompose(null);
    router.push(`/conversations/?id=${newId}`);
  };

  // The parent right-pane in `app/conversations/page.tsx` is already a
  // `flex min-w-0 flex-1 flex-col`, so we lay ourselves out as a
  // Fragment (header shrink-0 / messages flex-1 / footer shrink-0) —
  // exactly like the SMS composer alongside us — instead of wrapping
  // in another flex column that would nest inside it.
  return (
    <>
      {/* Header — matches the primary thread header (px-5 py-3,
          name in text-base semibold, property in text-sm muted).
          The right-side controls (tag count / AI pill / avatar /
          Resolve) are replaced by a subtle "New Email · not yet
          saved" indicator because none of them apply until the
          conversation exists. */}
      <div
        role="region"
        aria-label={`Send Email to ${recipient.name}`}
        className="shrink-0 border-b border-border bg-card px-5 py-3"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hover the name for a quick From/To preview; click to
                open the recipient's profile card without discarding
                the in-progress email (subject + draft body remain in
                local state and re-render behind the dialog). */}
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setProfileOpen(true)}
                    className="text-base font-semibold leading-tight text-foreground truncate transition-colors hover:text-blue-600 hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                    aria-label={`Open profile for ${recipient.name}`}
                  >
                    {recipient.name}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="max-w-[320px]">
                  <div className="flex flex-col gap-1.5 text-xs">
                    <div className="flex items-baseline gap-2">
                      <span className="w-9 shrink-0 text-muted-foreground">From</span>
                      <span className="font-medium text-foreground break-all">
                        {senderEmail}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="w-9 shrink-0 text-muted-foreground">To</span>
                      <span className="font-medium text-foreground break-all">
                        {recipientEmail}
                      </span>
                    </div>
                    <p className="mt-1 pt-1.5 border-t border-border/60 text-[11px] text-muted-foreground">
                      Click to open profile
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-sm text-muted-foreground truncate">
              {recipient.property}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-md bg-status-warning px-2.5 text-xs font-medium text-status-warning-foreground">
              <CircleAlert className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              New Email · not yet saved
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
            <Mail className="h-5 w-5 opacity-40" aria-hidden />
            <p className="text-xs">
              No messages yet — your first email will start this conversation.
            </p>
          </div>
        </div>
      </div>

      {/* Composer footer — verbatim copy of the primary thread
          composer's rounded-xl shell + Attach + Send button, with the
          Message/Private Note tab bar REMOVED (email is a single mode)
          and a Subject input inserted above the body textarea. */}
      <div className="shrink-0 border-t border-border bg-muted/40 shadow-[0_-2px_6px_rgba(0,0,0,0.04)]">
        <div className="px-5 pt-3 pb-4">
          <div className="relative flex flex-col rounded-xl border border-input bg-background transition-colors focus-within:ring-1 focus-within:ring-ring">
            <input
              ref={subjectRef}
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && canSend) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Subject"
              className="w-full bg-transparent px-4 pt-3 pb-2 text-sm font-medium placeholder:text-muted-foreground focus-visible:outline-none border-b border-border/60"
              aria-label="Subject"
            />
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && canSend) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Write an email to ${firstName}…`}
              rows={4}
              className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none"
              aria-label="Message"
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
                className="h-8 w-8 rounded-full"
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

      {/* Profile preview — opened by clicking the recipient's name in
          the header. Local to this component so the compose state
          (subject + body) survives the open/close cycle. Uses the
          same Result data the search overlay already carries; no
          network fetch or side effects. */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-md gap-0 p-0 overflow-hidden">
          <DialogHeader className="border-b border-border bg-card px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <UserIcon className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
              {recipient.type === "Resident" ? "Resident Profile" : "Lead Profile"}
            </DialogTitle>
          </DialogHeader>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                {recipient.name
                  .split(",")
                  .map((p) => p.trim().charAt(0))
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground leading-tight">
                  {recipient.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {recipient.role} · {recipient.status}
                </p>
              </div>
              <span className="inline-flex h-6 items-center gap-1 rounded-md bg-status-warning px-2 text-[11px] font-medium text-status-warning-foreground">
                <CircleAlert className="h-3 w-3" strokeWidth={2} aria-hidden />
                New Email · not yet saved
              </span>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 divide-y divide-border/70">
              <ProfileRow
                icon={<Building2 className="h-3.5 w-3.5" strokeWidth={2} />}
                label="Property"
                value={recipient.property}
              />
              {recipient.bldgUnit && recipient.bldgUnit !== "-" && (
                <ProfileRow
                  icon={<Home className="h-3.5 w-3.5" strokeWidth={2} />}
                  label="Unit"
                  value={recipient.bldgUnit}
                />
              )}
              <ProfileRow
                icon={<Mail className="h-3.5 w-3.5" strokeWidth={2} />}
                label="Email"
                value={recipientEmail}
                mono
              />
              {recipient.phone && (
                <ProfileRow
                  icon={<Phone className="h-3.5 w-3.5" strokeWidth={2} />}
                  label="Phone"
                  value={recipient.phone}
                  mono
                />
              )}
            </div>

            <p className="text-[11px] text-muted-foreground leading-snug">
              Your in-progress email is still open behind this dialog —
              close it to return to the composer with your subject and
              draft body intact.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProfileOpen(false)}
            >
              <X className="h-3.5 w-3.5 mr-1" strokeWidth={2} />
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setProfileOpen(false);
                // Small deferral so focus doesn't fight the closing
                // dialog's own focus-restoration.
                setTimeout(() => subjectRef.current?.focus(), 0);
              }}
            >
              Continue email
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Compact key-value row inside the profile preview dialog. Kept local
 * to this file — the design is specific to the "profile from an
 * in-progress compose" surface and doesn't need to be reused
 * elsewhere.
 */
function ProfileRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground"
        aria-hidden
      >
        {icon}
      </span>
      <span className="w-16 shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={
          "min-w-0 flex-1 truncate text-xs text-foreground " +
          (mono ? "font-mono" : "font-medium")
        }
      >
        {value}
      </span>
    </div>
  );
}

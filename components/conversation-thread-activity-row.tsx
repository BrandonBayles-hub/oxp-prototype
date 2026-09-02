"use client";

import type { ReactNode } from "react";
import {
  BellRing,
  Bot,
  BotOff,
  CheckCircle2,
  Eye,
  Mail,
  Phone,
  RotateCcw,
  UserMinus,
  UserPlus,
} from "lucide-react";
import type { ConversationMessage } from "@/lib/conversations-context";

function channelOptLabel(
  channel: "phone" | "email",
  choice: "opt-in" | "opt-out" | "no-indication"
): { lead: string; detail: string } {
  const ch = channel === "phone" ? "phone" : "email";
  if (choice === "opt-in") return { lead: "opted in", detail: `to ${ch} communications` };
  if (choice === "opt-out") return { lead: "opted out", detail: `of ${ch} communications` };
  return { lead: "set preference", detail: `to no indication for ${ch}` };
}

export function ConversationThreadActivityRow({
  message,
}: {
  message: ConversationMessage;
}) {
  if (message.type !== "thread_activity" || !message.threadActivity) return null;

  const { threadActivity: a } = message;
  const IconWrap = ({ children }: { children: ReactNode }) => (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border/80 bg-background text-muted-foreground">
      {children}
    </span>
  );

  let icon: ReactNode;
  let body: ReactNode;

  switch (a.kind) {
    case "status":
      if (a.action === "resolved") {
        const resLabel = a.resolutionType === "incoming" ? " (Incoming Call)" : a.resolutionType === "outgoing" ? " (Outgoing Call)" : "";
        icon = (
          <IconWrap>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </IconWrap>
        );
        body = (
          <>
            <span className="font-medium text-foreground">{a.actor}</span>
            {" marked the conversation "}
            <span className="font-medium text-foreground">resolved</span>
            {resLabel && <span className="text-muted-foreground">{resLabel}</span>}
            {a.notes && (
              <span className="mt-1 block text-left text-muted-foreground">
                <span className="font-medium text-foreground/90">Notes: </span>
                {a.notes}
              </span>
            )}
          </>
        );
      } else {
        icon = (
          <IconWrap>
            <RotateCcw className="h-3.5 w-3.5" />
          </IconWrap>
        );
        body = (
          <>
            <span className="font-medium text-foreground">{a.actor}</span>
            {" reopened the conversation"}
          </>
        );
      }
      break;
    case "assignment":
      icon = (
        <IconWrap>
          <UserPlus className="h-3.5 w-3.5" />
        </IconWrap>
      );
      body = (
        <>
          <span className="font-medium text-foreground">{a.assignedBy}</span>
          {" assigned "}
          <span className="font-medium text-foreground">{a.assignee}</span>
          {" to this conversation"}
          {a.previousAssignee ? (
            <>
              {" "}
              <span className="text-muted-foreground/90">
                (was <span className="font-medium text-foreground/90">{a.previousAssignee}</span>)
              </span>
            </>
          ) : null}
        </>
      );
      break;
    case "assignment_cleared":
      icon = (
        <IconWrap>
          <UserMinus className="h-3.5 w-3.5" />
        </IconWrap>
      );
      body = (
        <>
          <span className="font-medium text-foreground">{a.actor}</span>
          {" unassigned this conversation"}
          {a.previousAssignee ? (
            <>
              {" "}
              <span className="text-muted-foreground/90">
                (was <span className="font-medium text-foreground/90">{a.previousAssignee}</span>)
              </span>
            </>
          ) : null}
        </>
      );
      break;
    case "ai_activation":
      icon = (
        <IconWrap>
          <Bot className="h-3.5 w-3.5" />
        </IconWrap>
      );
      body = (
        <>
          <span className="font-medium text-foreground">{a.actor}</span>
          {a.active ? (
            <>
              {" turned AI "}
              <span className="font-medium text-foreground">on</span>
            </>
          ) : (
            <>
              {" turned AI "}
              <span className="font-medium text-foreground">off</span>
            </>
          )}
        </>
      );
      break;
    case "channel_opt": {
      const { lead, detail } = channelOptLabel(a.channel, a.choice);
      icon = (
        <IconWrap>
          {a.channel === "phone" ? (
            <Phone className="h-3.5 w-3.5" />
          ) : (
            <Mail className="h-3.5 w-3.5" />
          )}
        </IconWrap>
      );
      body = (
        <>
          <span className="font-medium text-foreground">{a.actor}</span>
          {` ${lead} `}
          <span className="text-muted-foreground">{detail}</span>
        </>
      );
      break;
    }
    case "read":
      icon = (
        <IconWrap>
          <Eye className="h-3.5 w-3.5" />
        </IconWrap>
      );
      body = (
        <>
          <span className="font-medium text-foreground">{a.reader}</span>
          {" read the conversation"}
        </>
      );
      break;
    case "follow_up_reminder": {
      const senderLabel = a.sinceRole === "staff" ? "staff" : "the AI agent";
      icon = (
        <IconWrap>
          <BellRing className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
        </IconWrap>
      );
      body = (
        <>
          <span className="font-medium text-foreground">
            Follow-up reminder triggered by Thread Automation
          </span>
          <span className="mt-0.5 block text-left">
            {`No reply in ${a.daysIdle} day${a.daysIdle === 1 ? "" : "s"} since ${senderLabel} last responded`}
            {a.sinceTimestamp ? (
              <span className="text-muted-foreground">{` (${a.sinceTimestamp})`}</span>
            ) : null}
            {"."}
          </span>
          {/* The `suggestedAction` field is still honored on the underlying
              activity type (see `follow_up_reminder` in lib/conversations-context.tsx)
              so demo data doesn't need to be scrubbed, but we intentionally
              don't render it — per design feedback the "Suggested: …" line
              on the follow-up reminder card was pulling focus away from the
              trigger itself. If we ever want to bring the suggestion back
              (e.g. behind a "Show suggestion" affordance) the data is
              already there. */}
        </>
      );
      break;
    }
    case "eli_mode_change": {
      /*
       * SA 1.2 Eli mode transitions on the thread. Renders one of two
       * shapes depending on the target mode:
       *   • On   → Bot icon, "turned Eli on for this thread"
       *   • Off  → BotOff icon, tailored copy per policy:
       *       – "until-resolved" → Eli auto-resumes when the escalation
       *         clears.
       *       – "indefinite"     → someone must manually flip Eli back on.
       * `source` narrows the verb ("triggered from the Eli Prompt" vs.
       * "manually toggled" vs. "from the Resolve dialog" vs. auto-resume)
       * so the audit trail is clear about who/what changed it.
       */
      const sourceLabel =
        a.source === "prompt"
          ? "from the Eli Prompt"
          : a.source === "resolve"
            ? "from the Resolve dialog"
            : a.source === "auto-resume"
              ? "automatically (escalation resolved)"
              : "manually";
      let modeIcon: ReactNode;
      let modeCopy: ReactNode;
      if (a.mode.kind === "on") {
        modeIcon = <Bot className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
        modeCopy = (
          <>
            <span className="font-medium text-foreground">{a.actor}</span>
            {" turned Eli "}
            <span className="font-medium text-foreground">on</span>
            {" for this thread — "}
            <span className="text-muted-foreground">{sourceLabel}</span>
            {"."}
          </>
        );
      } else {
        const offLabel =
          a.mode.policy === "indefinite"
            ? "off indefinitely"
            : "off until the escalation is resolved";
        const trailingCopy =
          a.mode.policy === "indefinite"
            ? ". Someone will need to turn Eli back on manually."
            : ". Eli will resume automatically once the escalation clears.";
        modeIcon = <BotOff className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />;
        modeCopy = (
          <>
            <span className="font-medium text-foreground">{a.actor}</span>
            {" turned Eli "}
            <span className="font-medium text-foreground">{offLabel}</span>
            {" — "}
            <span className="text-muted-foreground">{sourceLabel}</span>
            {trailingCopy}
          </>
        );
      }
      icon = <IconWrap>{modeIcon}</IconWrap>;
      body = modeCopy;
      break;
    }
    case "phone_call": {
      const directionLabel =
        a.direction === "inbound" ? "incoming" : a.direction === "outbound" ? "outgoing" : null;
      const outcomePhrase =
        a.outcome === "connected"
          ? `completed${a.durationLabel ? ` (${a.durationLabel})` : ""}`
          : a.outcome === "failed"
            ? "did not connect"
            : "cancelled before connect";
      icon = (
        <IconWrap>
          <Phone className="h-3.5 w-3.5" />
        </IconWrap>
      );
      body = (
        <>
          <span className="font-medium text-foreground">{a.actor}</span>
          {directionLabel ? (
            <>
              {` documented an ${directionLabel} call`}
              {a.phoneNumber ? (
                <>
                  {" with "}
                  <span className="font-mono text-[10px] text-foreground/90">{a.phoneNumber}</span>
                </>
              ) : null}
            </>
          ) : (
            <>
              {" logged a phone call to "}
              <span className="font-mono text-[10px] text-foreground/90">{a.phoneNumber}</span>
              {" · "}
              <span className="text-muted-foreground">{outcomePhrase}</span>
            </>
          )}
          {a.notes.trim() ? (
            <>
              <span className="mt-1 block text-left text-muted-foreground">
                <span className="font-medium text-foreground/90">Notes: </span>
                {a.notes.trim()}
              </span>
            </>
          ) : (
            <span className="mt-1 block text-left italic text-muted-foreground/80">No call notes entered.</span>
          )}
          {a.followUpAssignee || a.followUpDue ? (
            <span className="mt-1 block text-left text-muted-foreground">
              <span className="font-medium text-foreground/90">Follow-up: </span>
              {a.followUpAssignee ? <>assigned to {a.followUpAssignee}</> : null}
              {a.followUpAssignee && a.followUpDue ? " · " : null}
              {a.followUpDue ? <>due {a.followUpDue}</> : null}
              {a.followUpNotes?.trim() ? (
                <span className="mt-0.5 block pl-3 text-left text-muted-foreground/90">
                  {"“"}
                  {a.followUpNotes.trim()}
                  {"”"}
                </span>
              ) : null}
            </span>
          ) : null}
        </>
      );
      break;
    }
    default:
      return null;
  }

  return (
    <div className="flex items-start justify-center gap-2.5 rounded-md border border-dashed border-border/70 bg-muted/25 py-2.5 px-3">
      {icon}
      <p className="min-w-0 flex-1 text-center text-[11px] leading-relaxed text-muted-foreground sm:text-left">
        {body}
        {message.timestamp ? (
          <>
            <span className="text-muted-foreground/70"> · </span>
            <span>{message.timestamp}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}

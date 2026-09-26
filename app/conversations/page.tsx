"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type MouseEvent,
  type SetStateAction,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  BotOff,
  MessageCircle,
  Search,
  Plus,
  X,
  Check,
  ChevronDown,
  Paperclip,
  ArrowUp,
  MessageSquare,
  MessageSquareText,
  StickyNote,
  CornerDownRight,
  Inbox,
  AtSign,
  Clock,
  Tag,
  BarChart3,
  Settings,
  Phone,
  PhoneCall,
  PhoneForwarded,
  Headphones,
  Mail,
  MailOpen,
  Building,
  Hash,
  CalendarIcon,
  CheckCircle2,
  XCircle,
  MinusCircle,
  FileText,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Bell,
  BellRing,
  Smile,
  Mic,
  SendHorizontal,
  Sparkles,
  RefreshCw,
  UserMinus,
  Link2,
  SlidersHorizontal,
  CircleHelp,
  Copy,
  Info,
  HelpCircle,
  Beaker,
  PhoneIncoming,
  PhoneOutgoing,
  User,
  UserCheck,
  UserX,
  Zap,
  PauseCircle,
  PlayCircle,
  Languages,
  ListChecks,
  CheckCheck,
  CircleAlert,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import {
  useConversations,
  CONVERSATION_UNASSIGNED_ASSIGNEE,
  UNASSIGN_CONVERSATION_VALUE,
  type ConversationItem,
  type ConversationMessage,
  type BulkOutboundEmailRef,
  type EmailAttachmentRef,
  isConversationUnattended,
  needsStaffResponse,
  hasActiveFollowUpReminder,
  hasActiveAiEscalation,
  parseAgeMinutes,
  isWaitingOnResidentPublicReply,
  satisfiesEscalatedPropertyInboxLabels,
  conversationHasCurrentUserPrivateNoteMention,
  getLinkedConversationsByEscalation,
  isSuperAgentDemoThread,
  isSuperAgent1DemoThread,
  isClickToCallDemoThread,
  isTranslationDemoThread,
  getEscalationReason,
  DEFAULT_CONVERSATION_ACTIVITY_ACTOR,
} from "@/lib/conversations-context";
import { useAgents } from "@/lib/agents-context";
import { useWorkforce } from "@/lib/workforce-context";
import { cn } from "@/lib/utils";
import { makeSessionId, buildRatingForThread } from "@/lib/eli-trace";
import { EliTraceModal } from "@/components/conversations/eli-trace-modal";
import {
  buildStaffEmailSignatureBody,
  getEmailThreadRoutingAddresses,
  getPropertyFromChannelOptionsForProperty,
  getVoiceOrSmsThreadRoutingNumbers,
} from "@/lib/email-signature";
import { useClickToCallDemo } from "@/lib/click-to-call-demo-context";
import { useCallSystemDemo, type IncomingCallerType } from "@/lib/call-system-demo-context";
import {
  collectLeafPropertyNames,
  portfolioData,
} from "@/lib/property-selector-data";
import {
  useConversationsDemo,
  getEffectiveEliMode,
  cadenceToMinutes,
  type EliMode,
  type EliPromptCadenceUnit,
  type ViewportPreset,
} from "@/lib/conversations-demo-context";
import { useTranslationDemo } from "@/lib/translation-demo-context";
import {
  ClickToCallFloatingPanel,
  type ClickToCallSessionInput,
} from "@/components/click-to-call-floating-panel";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConversationThreadActivityRow } from "@/components/conversation-thread-activity-row";
import {
  ConversationBulkEmailCard,
  ConversationBulkEmailModal,
} from "@/components/conversation-bulk-email";
import { VoicemailPlayer } from "@/components/voicemail-player";
import { MissedCallBubble } from "@/components/missed-call-bubble";
import { EntrataInlineSmsComposer } from "@/components/app-shell/entrata-inline-sms-composer";
import { EntrataInlineEmailComposer } from "@/components/app-shell/entrata-inline-email-composer";
import type { Result as EntrataSearchResult } from "@/components/app-shell/entrata-global-search";
import { CommunicationsNotificationBell } from "@/components/app-shell/communications-notification-bell";
import { CallQueuePanel } from "@/components/call-system/call-queue-panel";
import { CallRoutingPanel } from "@/components/call-system/call-routing-panel";

const AVATAR_COLORS = [
  "bg-emerald-100 text-emerald-700",
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
  "bg-teal-100 text-teal-700",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

/** Matches @mentions in private notes (e.g. Abe Kashiwagi → abekashiwagi). */
function staffMentionHandle(displayName: string): string {
  return displayName.toLowerCase().replace(/[^a-z0-9]/g, "");
}

type PrivateNoteMentionActive = { triggerIndex: number; query: string };

function getActivePrivateNoteMention(text: string, caret: number): PrivateNoteMentionActive | null {
  if (caret < 1) return null;
  const end = caret;
  let i = end - 1;
  while (i >= 0 && text[i] !== "@") {
    if (/\s/.test(text[i])) return null;
    i -= 1;
  }
  if (i < 0 || text[i] !== "@") return null;
  if (i > 0 && !/\s/.test(text[i - 1])) return null;
  const query = text.slice(i + 1, end);
  if (/\s/.test(query)) return null;
  return { triggerIndex: i, query };
}

/** Live AI lane labels (no * AI Escalation); inbox also requires read + waiting on resident. */
const LIVE_AI_PROPERTY_ALLOWED = new Set([
  "Leasing AI",
  "Maintenance AI",
  "Renewal AI",
  "Renewals AI",
  "Payments AI",
]);

const LIVE_AI_PROPERTY_FORBIDDEN = new Set([
  "Leasing AI Escalation",
  "Maintenance AI Escalation",
  "Renewal AI Escalation",
  "Payments AI Escalation",
]);

/**
 * Maps a *Escalation label to the AI agent that gets paused while the escalation
 * is open (and resumed when it's resolved). Returns null for non-AI-specific
 * escalations (e.g. "Other Escalation") so the UI can suppress the indicator.
 */
const ESCALATION_LABEL_TO_AGENT: Record<string, string> = {
  "Leasing AI Escalation": "Leasing AI",
  "Maintenance AI Escalation": "Maintenance AI",
  "Renewal AI Escalation": "Renewals AI",
  "Renewals AI Escalation": "Renewals AI",
  "Payments AI Escalation": "Payments AI",
};

/**
 * Maps an escalation label to its AI agent, including numbered same-type escalations
 * (e.g. "Maintenance AI 1 Escalation" / "Maintenance AI 2 Escalation" → "Maintenance AI").
 */
function aiAgentFromEscalationLabel(label: string): string | null {
  const direct = ESCALATION_LABEL_TO_AGENT[label];
  if (direct) return direct;
  const m = label.match(
    /^(Leasing AI|Maintenance AI|Renewal AI|Renewals AI|Payments AI)(?: \d+)? Escalation$/
  );
  if (!m) return null;
  return m[1] === "Renewal AI" ? "Renewals AI" : m[1];
}
/** Resolve a list of unique paused/resumed AI agents from a list of escalation labels. */
function aiAgentsFromLabels(labels: string[]): string[] {
  const out: string[] = [];
  for (const l of labels) {
    const a = aiAgentFromEscalationLabel(l);
    if (a && !out.includes(a)) out.push(a);
  }
  return out;
}

type ThreadCardLabelChip =
  | { kind: "plain"; label: string }
  | { kind: "escalation"; labels: string[]; displayLabel: string };

/**
 * Small "i" info-tip used inside SA 1.2 sidebar rows and next to section headers.
 * Wraps a tiny `Info` glyph in a Tooltip; stops click propagation so tapping the
 * icon doesn't accidentally activate the enclosing button/nav item.
 *
 * When `hoverOnly` is true the icon collapses out of layout at rest and only
 * appears when the parent row (marked with `group`) is hovered or focused.
 */
function SidebarInfoTip({
  label,
  children,
  hoverOnly = false,
}: {
  label: string;
  children: React.ReactNode;
  hoverOnly?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") e.stopPropagation();
          }}
          className={cn(
            "ml-1 inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:text-foreground",
            hoverOnly &&
              "hidden group-hover:inline-flex group-focus-within:inline-flex focus-visible:inline-flex"
          )}
        >
          <Info className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" align="start" className="max-w-[260px] text-[11px] leading-snug">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Derive the persona chip ("Lead" / "Resident") from the AI labels present on a
 * conversation. Leasing agents work with leads (prospects); Payments, Renewals,
 * and Maintenance agents work with existing residents.
 */
function personaFromAILabels(labels: string[]): "Lead" | "Resident" | null {
  const isLeasing = (l: string) => l === "Leasing AI" || l.startsWith("Leasing AI ");
  const isResidentAgent = (l: string) =>
    l === "Payments AI" ||
    l.startsWith("Payments AI ") ||
    l === "Renewals AI" ||
    l === "Renewal AI" ||
    l.startsWith("Renewals AI ") ||
    l.startsWith("Renewal AI ") ||
    l === "Maintenance AI" ||
    l.startsWith("Maintenance AI ") ||
    /^Maintenance AI \d/.test(l);
  if (labels.some(isLeasing)) return "Lead";
  if (labels.some(isResidentAgent)) return "Resident";
  return null;
}

/** Base AI product labels — SA 1.2 hides these because ownership is already
 * conveyed by the Property/Eli chip on the card. Escalation variants stay. */
const AI_PRODUCT_LABEL_SET = new Set([
  "Leasing AI",
  "Renewals AI",
  "Renewal AI",
  "Maintenance AI",
  "Payments AI",
]);

/**
 * Collapse same-agent escalations on the thread list card into one chip + count
 * (e.g. Maintenance AI 1 + 2 → "Maintenance AI Escalation" with count 2).
 * Underlying labels stay intact for reply / resolve.
 *
 * When `omitAIProductLabels` is true (SA 1.2), the plain AI-product chips are
 * suppressed since the Property/Eli ownership chip already carries that info.
 */
function collapseLabelsForThreadCard(
  labels: string[],
  omitAIProductLabels = false,
): ThreadCardLabelChip[] {
  const chips: ThreadCardLabelChip[] = [];
  const agentGroupIndex = new Map<string, number>();

  for (const label of labels) {
    if (!label.endsWith("Escalation")) {
      if (omitAIProductLabels && AI_PRODUCT_LABEL_SET.has(label)) continue;
      chips.push({ kind: "plain", label });
      continue;
    }
    const agent = aiAgentFromEscalationLabel(label);
    if (!agent) {
      chips.push({ kind: "escalation", labels: [label], displayLabel: label.replace(/\s+\d+(?=\s+Escalation)/, "") });
      continue;
    }
    const existing = agentGroupIndex.get(agent);
    if (existing === undefined) {
      agentGroupIndex.set(agent, chips.length);
      chips.push({
        kind: "escalation",
        labels: [label],
        displayLabel: `${agent} Escalation`,
      });
    } else {
      const chip = chips[existing];
      if (chip.kind === "escalation") chip.labels.push(label);
    }
  }

  // Ensure the persona label (Lead / Resident) matches the AI agents on the
  // thread. If the source labels didn't already include one, prepend it so the
  // card visually leads with who the conversation is with.
  const persona = personaFromAILabels(labels);
  if (persona) {
    const alreadyPresent = chips.some(
      (c) => c.kind === "plain" && c.label === persona
    );
    if (!alreadyPresent) {
      chips.unshift({ kind: "plain", label: persona });
    }
  }
  return chips;
}

/** Seeded per-escalation instance IDs for demo threads (stable, copyable). */
const SEEDED_ESCALATION_INSTANCE_IDS: Record<string, Record<string, string>> = {
  "sa1-1": {
    "Maintenance AI 1 Escalation": "ESC-JL-MAINT-001",
    "Maintenance AI 2 Escalation": "ESC-JL-MAINT-002",
  },
  "sa-1": {
    "Renewals AI Escalation": "ESC-MR-REN-001",
    "Payments AI Escalation": "ESC-MR-PAY-001",
    "Other Escalation": "ESC-MR-OTH-001",
  },
  "lc-3": {
    "Leasing AI Escalation": "ESC-AS-LEASE-001",
  },
  "lc-20": {
    "Renewals AI Escalation": "ESC-AS-REN-001",
  },
};

function getEscalationInstanceId(conversationId: string, label: string): string {
  const seeded = SEEDED_ESCALATION_INSTANCE_IDS[conversationId]?.[label];
  if (seeded) return seeded;
  const slug = label
    .replace(/\s+Escalation$/i, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const conv = conversationId.toUpperCase().replace(/[^A-Z0-9]+/g, "-");
  return `ESC-${conv}-${slug || "TOPIC"}`;
}

/**
 * Hover tip next to an escalation label showing its unique escalation ID + copy.
 * Super Agent 1.0 threads only. Uses a non-button trigger so it can sit inside
 * thread-list row buttons. Pass `labels` to show multiple IDs (collapsed same-agent group).
 */
function EscalationIdHint({
  conversationId,
  label,
  labels: labelsProp,
  className,
  iconClassName,
}: {
  conversationId: string;
  label?: string;
  labels?: string[];
  className?: string;
  iconClassName?: string;
}) {
  const labels = labelsProp ?? (label ? [label] : []);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyId = (e: MouseEvent | KeyboardEvent, escalationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    void navigator.clipboard.writeText(escalationId).then(() => {
      setCopiedId(escalationId);
      toast.success("Escalation ID copied");
      window.setTimeout(() => setCopiedId(null), 1500);
    });
  };

  if (!isSuperAgent1DemoThread(conversationId) || labels.length === 0) return null;

  const title = labels.length === 1 ? "Escalation ID" : "Escalation IDs";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="button"
            tabIndex={0}
            aria-label={
              labels.length === 1
                ? `Show escalation ID for ${labels[0]}`
                : `Show escalation IDs (${labels.length})`
            }
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-sm text-current/70 outline-none transition-colors hover:text-current focus-visible:ring-1 focus-visible:ring-ring",
              className
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            <Info className={cn("h-3 w-3", iconClassName)} aria-hidden />
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="z-[220] max-w-[300px] p-2.5"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-2">
            <p className="text-xxs font-medium uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
            {labels.map((escLabel) => {
              const escalationId = getEscalationInstanceId(conversationId, escLabel);
              const shortName = escLabel.replace(/\s+Escalation$/i, "").replace(/\s+\d+$/, "");
              return (
                <div key={escLabel} className="space-y-1">
                  {labels.length > 1 && (
                    <p className="text-xxs font-medium text-foreground">{shortName}</p>
                  )}
                  <div className="flex items-center gap-1.5">
                    <code className="min-w-0 flex-1 truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                      {escalationId}
                    </code>
                    <button
                      type="button"
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-muted"
                      aria-label={`Copy escalation ID ${escalationId}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => copyId(e, escalationId)}
                    >
                      {copiedId === escalationId ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                      ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
            <p className="text-xxs text-muted-foreground">Click the copy icon to copy an ID.</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Logged-in user for the My Inbox tab (human assignee name). */
const MY_INBOX_ASSIGNEE = "Abe Kashiwagi";

/** Primary ELI+ lane agents — omit from AssigneePicker (routing stays label/automation-driven). */
const ASSIGNMENT_PICKER_EXCLUDED_AUTONOMOUS_AGENT_NAMES = new Set([
  "Leasing AI",
  "Maintenance AI",
  "Payments AI",
  "Renewal AI",
]);

/** Prototype display line for click-to-call confirmation and floating panel. */
function formatClickToCallDisplayPhone(residentPhone: string): string {
  const d = residentPhone.replace(/\D/g, "");
  if (d.length === 10) return `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d.startsWith("1")) {
    return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  return residentPhone;
}

/**
 * Click-to-call / SA1 phone demo threads that are missed-call or voicemail only.
 * These use a Resolve dropdown to document a call/note instead of a plain resolve.
 */
function isPhoneDocumentResolveThread(c: ConversationItem): boolean {
  if (!isClickToCallDemoThread(c.id)) return false;
  return c.messages.some((m) => m.type === "missed_call" || m.type === "voicemail");
}

function phoneNumberFromDemoThread(c: ConversationItem): string {
  for (let i = c.messages.length - 1; i >= 0; i--) {
    const m = c.messages[i];
    if (m.voicemail?.fromNumber) return m.voicemail.fromNumber;
    if (m.missedCall?.fromNumber) return m.missedCall.fromNumber;
  }
  return "";
}

type PhoneDocumentKind = "incoming" | "outgoing" | "other";

type ResidentProfileActivityEntry = {
  id: string;
  kind: PhoneDocumentKind;
  notes: string;
  actor: string;
  timestamp: string;
  conversationId: string;
  phoneNumber?: string;
};

function handoffAssigneeLabel(assignee: string, isHuman: (a: string) => boolean): string {
  if (assignee === CONVERSATION_UNASSIGNED_ASSIGNEE) return "Unassigned";
  if (isHuman(assignee)) return assignee;
  return "Staff";
}

/** Staff bubble header when {@link ConversationItem.staffRespondentIsExternalAgent} is set. */
function handoffAssigneeLabelForConversation(
  assignee: string,
  isHuman: (a: string) => boolean,
  staffRespondentIsExternalAgent: boolean | undefined
): string {
  const base = handoffAssigneeLabel(assignee, isHuman);
  if (!staffRespondentIsExternalAgent) return base;
  if (assignee !== MY_INBOX_ASSIGNEE) return base;
  return `${base} (External Agent)`;
}

function handoffAssigneeInitials(assignee: string, isHuman: (a: string) => boolean): string {
  if (assignee === CONVERSATION_UNASSIGNED_ASSIGNEE) return "—";
  if (isHuman(assignee)) return initials(assignee);
  return initials("Staff");
}

/**
 * Plain div + img for thread rows — avoids Radix AvatarImage/Fallback getting out of sync
 * (empty circle on the first agent message, etc.).
 */
function ThreadMessageAvatar({
  variant,
  isAgent,
  isStaff,
  selected,
  isHumanAssignee,
  staffInitialsOverride,
}: {
  variant: "threadEmail" | "threadBubble";
  isAgent: boolean;
  isStaff: boolean;
  selected: ConversationItem;
  isHumanAssignee: (a: string) => boolean;
  /** Entrata side panel uses per-thread assignee, not always `selected.assignee`. */
  staffInitialsOverride?: string;
}) {
  const base = "relative flex h-7 w-7 shrink-0 overflow-hidden rounded-full";
  if (isAgent) {
    return (
      <div
        className={cn(
          base,
          "items-center justify-center p-1",
          variant === "threadBubble"
            ? "bg-blue-100 dark:bg-blue-900/40"
            : "bg-muted"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static public asset */}
        <img src="/eli-cube.svg" alt="ELI" className="h-full w-full object-contain" />
      </div>
    );
  }
  if (isStaff) {
    const staffCls =
      variant === "threadBubble"
        ? "bg-blue-100 text-[9px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
        : "bg-muted text-[9px] font-semibold text-foreground";
    return (
      <div className={cn(base, "items-center justify-center", staffCls)}>
        {staffInitialsOverride ?? handoffAssigneeInitials(selected.assignee, isHumanAssignee)}
      </div>
    );
  }
  return (
    <div
      className={cn(
        base,
        "items-center justify-center text-[9px] font-semibold",
        avatarColor(selected.resident)
      )}
    >
      {initials(selected.resident)}
    </div>
  );
}

type ChannelOptChoice = "opt-in" | "opt-out" | "no-indication";

/**
 * SMS / Voice replies must never include the email signature block. The composer
 * can still carry one over if staff just left an Email thread; strip from the
 * first standalone `--` line to the end.
 */
function stripEmailSignatureFromNonEmailDraft(text: string): string {
  const match = text.match(/(?:^|\n)--[ \t]*(?:\n|$)/);
  if (!match || match.index === undefined) return text;
  return text.slice(0, match.index).trimEnd();
}

function staffEmailSignatureForConversation(
  convo: ConversationItem,
  humanNameSet: Set<string>,
  humanMembers: { name: string; role: string }[]
): string | undefined {
  if (convo.channel !== "Email") return undefined;
  const staffName = humanNameSet.has(convo.assignee) ? convo.assignee : MY_INBOX_ASSIGNEE;
  const staffTitle = humanMembers.find((m) => m.name === staffName)?.role ?? "Leasing Specialist";
  return buildStaffEmailSignatureBody({
    staffName,
    staffTitle,
    propertyName: convo.property,
  });
}

/** Same merge template as main inbox email replies, for a given property (Entrata email thread may differ from inbox channel). */
function staffEmailSignatureForProperty(
  convo: ConversationItem,
  propertyName: string,
  humanNameSet: Set<string>,
  humanMembers: { name: string; role: string }[]
): string {
  const staffName = humanNameSet.has(convo.assignee) ? convo.assignee : MY_INBOX_ASSIGNEE;
  const staffTitle = humanMembers.find((m) => m.name === staffName)?.role ?? "Leasing Specialist";
  return buildStaffEmailSignatureBody({
    staffName,
    staffTitle,
    propertyName,
  });
}

/** AI Activated + phone/email opt-in for primary ELI lanes (Renewals AI = renewal lane in data). */
const AI_ACTIVATION_OPT_IN_LABELS = new Set([
  "Leasing AI",
  "Maintenance AI",
  "Payments AI",
  "Renewal AI",
  "Renewals AI",
  "AI Conversation",
  "ELI Conversation",
]);

/**
 * Super Agent 1.0 — known ELI+ AI sub-agents. The presence of a "{name} Escalation"
 * label on the conversation means that specific sub-agent is blocked from responding
 * (Column 1 of the SA 1.0 schematic — "Blocking Sub Agent"). Sub-agents not listed
 * here keep responding (Columns 3 & 4 — non-blocking escalations).
 */
const SA1_KNOWN_SUB_AGENTS = [
  "Renewals AI",
  "Payments AI",
  "Leasing AI",
  "Maintenance AI",
] as const;
type Sa1SubAgent = (typeof SA1_KNOWN_SUB_AGENTS)[number];

/**
 * Super Agent 1.0 — blocking super-agent escalation label (Column 2 of the schematic).
 * When present, EVERY AI agent is paused until staff resolves it via the Resolve picker.
 */
const SA1_SUPER_AGENT_BLOCK_LABEL = "Super Agent Escalation";

/**
 * Super Agent 1.0 — profile-level "never reply with AI" mark. This represents a resident
 * profile setting (in the prototype it lives as a conversation label) where staff have
 * decided AI must never auto-reply to this resident on any conversation, indefinitely,
 * until a human lifts the block. Beats every conversation-scoped state.
 */
const SA1_RESIDENT_PROFILE_BLOCK_LABEL = "Profile · No AI";

type Sa1AiStateKind =
  | "on"
  | "partial"
  | "off-all-subs"
  | "off-super"
  | "off-manual"
  | "off-profile";
type Sa1AiState = {
  kind: Sa1AiStateKind;
  hasSuperAgentBlock: boolean;
  hasResidentProfileBlock: boolean;
  blockedSubAgents: Sa1SubAgent[];
};

function computeSa1AiState(c: ConversationItem, manualOn: boolean): Sa1AiState {
  const hasResidentProfileBlock = c.labels.includes(SA1_RESIDENT_PROFILE_BLOCK_LABEL);
  const hasSuperAgentBlock = c.labels.includes(SA1_SUPER_AGENT_BLOCK_LABEL);
  const blockedSubAgents = SA1_KNOWN_SUB_AGENTS.filter((a) =>
    c.labels.some((l) => aiAgentFromEscalationLabel(l) === a)
  );
  let kind: Sa1AiStateKind;
  if (hasResidentProfileBlock) kind = "off-profile";
  else if (!manualOn) kind = "off-manual";
  else if (hasSuperAgentBlock) kind = "off-super";
  else if (blockedSubAgents.length === SA1_KNOWN_SUB_AGENTS.length)
    kind = "off-all-subs";
  else if (blockedSubAgents.length > 0) kind = "partial";
  else kind = "on";
  return { kind, hasSuperAgentBlock, hasResidentProfileBlock, blockedSubAgents };
}

function isLiveAiPropertyInbox(c: ConversationItem, property: string): boolean {
  if (c.property !== property) return false;
  if (c.labels.some((l) => LIVE_AI_PROPERTY_FORBIDDEN.has(l))) return false;
  return c.labels.some((l) => LIVE_AI_PROPERTY_ALLOWED.has(l));
}

function labelIsEscalation(label: string): boolean {
  return label.endsWith("Escalation");
}

function conversationHasEscalationLabel(c: ConversationItem): boolean {
  return c.labels.some(labelIsEscalation);
}

/** Primary ELI lane without an *Escalation companion label (any property). */
function isPrimaryAiLaneConversation(c: ConversationItem): boolean {
  if (c.labels.some((l) => LIVE_AI_PROPERTY_FORBIDDEN.has(l))) return false;
  return c.labels.some((l) => LIVE_AI_PROPERTY_ALLOWED.has(l));
}

/**
 * “Escalated” thread-list filter: any unresolved (open) thread where the lead or resident is
 * waiting on staff to reply on the public thread — includes escalation-labeled lanes and
 * other inbound (e.g. lead) threads. Unread always counts as needing staff attention.
 */
function matchesThreadListEscalatedFilter(c: ConversationItem): boolean {
  return c.status === "open";
}

/**
 * Live AI / non-escalated bucket: primary AI lane without escalation, or any thread where
 * the last public message is staff/agent (waiting on resident).
 */
function matchesThreadListLiveAiNonEscalatedFilter(c: ConversationItem): boolean {
  if (isWaitingOnResidentPublicReply(c)) return true;
  if (conversationHasEscalationLabel(c)) return false;
  return isPrimaryAiLaneConversation(c);
}

/** Live AI: primary lane, no escalation labels, fully read, waiting on lead/resident to reply. */
function isLiveAiJamisonConversation(c: ConversationItem): boolean {
  if (!isLiveAiPropertyInbox(c, "Jamison Apartments")) return false;
  if (c.hasUnread) return false;
  return isWaitingOnResidentPublicReply(c);
}

function isLiveAiHillsideConversation(c: ConversationItem): boolean {
  if (!isLiveAiPropertyInbox(c, "Hillside Living")) return false;
  if (c.hasUnread) return false;
  return isWaitingOnResidentPublicReply(c);
}

/** Union of the former custom-inbox rows (escalations + property + live AI). */
function conversationMatchesCustomInbox1(c: ConversationItem): boolean {
  if (c.labels.some(labelIsEscalation)) return true;
  if (
    (c.property === "Hillside Living" || c.property === "Jamison Apartments") &&
    satisfiesEscalatedPropertyInboxLabels(c)
  ) {
    return true;
  }
  return isLiveAiHillsideConversation(c) || isLiveAiJamisonConversation(c);
}

type SidebarFilter =
  | "all"
  | "mentions"
  | "unattended"
  /** SA 1.2 only — dedicated inboxes. */
  | "sa12-escalated"
  | "sa12-property"
  | "sa12-closed"
  | { type: "label"; value: string }
  | { type: "property"; value: string }
  | { type: "live-ai-jamison" }
  | { type: "live-ai-hillside" }
  | { type: "custom-inbox-1" };

/** SA 1.2 channel sub-filter (applied on top of the primary inbox). */
type Sa12ChannelFilter = "all" | "sms" | "chat" | "email" | "voice";

/**
 * SA 1.2 inline escalation Quick Filter (below the search bar).
 *   - "all"          → both classes of thread pass
 *   - "escalated"    → threads carrying at least one AI escalation label
 *                      (e.g. "Maintenance AI Escalation"). Eli routed these
 *                      to staff.
 *   - "non-escalated" → threads with no AI escalation label — plain
 *                       property↔lead/resident conversations.
 */
type Sa12EscalationFilter = "all" | "escalated" | "non-escalated";

type ThreadListConvoTypeFilter = "escalated" | "liveAi";

/**
 * SA 1.2 only — "Action Needed" filter. Lets staff scope the thread list to
 * only threads that require them to act. The two flavors correspond exactly
 * to the two corner markers on the thread card:
 *   - "followup"   → cyan bell marker (Thread Automation nudge, staff idle)
 *   - "escalation" → red dot marker  (resident/lead has replied and is
 *                                     waiting on staff)
 * When neither is selected the filter is a no-op (all threads pass).
 * When both are selected the union of the two sets is shown.
 */
type ThreadListActionFilter = "followup" | "escalation";
type ThreadListDateRangePreset =
  | "all"
  | "today"
  | "last7"
  | "last30"
  | "custom";
type ThreadListChannelFilter = "email" | "sms" | "voice";

// `all` is the default (see `useState<ThreadListDateRangePreset>("all")`
// below) — it's an unfiltered pass-through that the resolver short-circuits
// in `conversationMatchesThreadListDateRange`. Keeps every archived thread
// visible until staff explicitly narrows the window.
const THREAD_LIST_DATE_RANGE_OPTIONS: {
  value: ThreadListDateRangePreset;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "custom", label: "Custom Date Range" },
];

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function endOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
}

function parseYmdLocal(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const date = new Date(y, mo, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo || date.getDate() !== d) return null;
  return date;
}

function formatYmdShort(ymd: string): string {
  const d = parseYmdLocal(ymd);
  if (!d) return ymd;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Approximate last-activity ms from relative list time, else latest message timestamp. */
function conversationActivityMs(c: ConversationItem, now = Date.now()): number {
  const t = c.time.trim().toLowerCase();
  if (t === "just now" || t === "now") return now;
  const rel = t.match(
    /^(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|wk|wks|week|weeks)\s*ago$/
  );
  if (rel) {
    const n = Number(rel[1]);
    const u = rel[2];
    const mult =
      u.startsWith("m") && !u.startsWith("mo")
        ? 60_000
        : u.startsWith("h")
          ? 3_600_000
          : u.startsWith("d")
            ? 86_400_000
            : 7 * 86_400_000;
    return now - n * mult;
  }
  let latest = 0;
  for (const msg of c.messages) {
    const raw = msg.timestamp?.replace(/\s+(MST|MDT|PST|PDT|EST|EDT|CST|CDT|UTC|GMT)\b/gi, "");
    const ms = parseThreadMessageTimestamp(raw);
    if (ms > latest) latest = ms;
  }
  return latest || now;
}

function conversationMatchesThreadListDateRange(
  c: ConversationItem,
  preset: ThreadListDateRangePreset,
  customFrom: string,
  customTo: string
): boolean {
  // `all` is the unfiltered pass-through — no date bound, matches every
  // thread. Short-circuits before we bother computing activity/now, which
  // matters when the caller is running the check over every archived
  // conversation in the demo dataset.
  if (preset === "all") return true;
  const activity = conversationActivityMs(c);
  const now = new Date();
  if (preset === "today") {
    return activity >= startOfLocalDay(now) && activity <= endOfLocalDay(now);
  }
  if (preset === "last7") {
    const start = startOfLocalDay(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
    );
    return activity >= start && activity <= endOfLocalDay(now);
  }
  if (preset === "last30") {
    const start = startOfLocalDay(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
    );
    return activity >= start && activity <= endOfLocalDay(now);
  }
  const fromDate = customFrom ? parseYmdLocal(customFrom) : null;
  const toDate = customTo ? parseYmdLocal(customTo) : null;
  if (!fromDate && !toDate) return true;
  const from = fromDate ? startOfLocalDay(fromDate) : Number.NEGATIVE_INFINITY;
  const to = toDate ? endOfLocalDay(toDate) : Number.POSITIVE_INFINITY;
  return activity >= from && activity <= to;
}

/**
 * Normalized channel-id set for a thread. A thread carries its primary
 * `channel` plus any `additionalChannels` accumulated when staff or Eli
 * touched the thread on a different medium (SMS reply on a voice thread,
 * outbound call on an SMS thread, etc.). Callers should use this — not
 * `c.channel` alone — for any "is channel X involved on this thread"
 * question so cross-channel threads register on every filter and count
 * their labels appear on.
 *
 * Returns a Set of stable lowercase IDs ("voice" | "sms" | "chat" |
 * "email"). "Phone" (legacy) and "Voice" both collapse to "voice";
 * "Resident Chat" collapses to "chat". Unknown labels are dropped.
 */
function conversationChannelIds(
  c: ConversationItem
): Set<"voice" | "sms" | "chat" | "email"> {
  const ids = new Set<"voice" | "sms" | "chat" | "email">();
  const add = (raw: string | undefined | null) => {
    if (!raw) return;
    const norm = raw.toLowerCase();
    if (norm === "sms") ids.add("sms");
    else if (norm === "email") ids.add("email");
    else if (norm === "resident chat" || norm === "chat") ids.add("chat");
    else if (norm === "voice" || norm === "phone") ids.add("voice");
  };
  add(c.channel);
  c.additionalChannels?.forEach(add);
  return ids;
}

function conversationMatchesThreadListChannel(
  c: ConversationItem,
  channels: Set<ThreadListChannelFilter>
): boolean {
  // Cross-channel threads (a Voice thread with an SMS follow-up, say)
  // surface on every filter their labels touch, so both "Voice" alone
  // and "SMS" alone will show the same thread — matching the chip
  // badges rendered on the thread card.
  const ids = conversationChannelIds(c);
  if (channels.has("email") && ids.has("email")) return true;
  if (channels.has("sms") && ids.has("sms")) return true;
  if (channels.has("voice") && ids.has("voice")) return true;
  return false;
}

/** Open Threads: all open conversations stay visible regardless of read/reply state. */
function conversationMatchesAllThreadsInbox(c: ConversationItem): boolean {
  return c.status === "open";
}

function isPublicThreadMessageForUnreadCount(m: ConversationMessage): boolean {
  if (m.type === "label_activity" || m.type === "thread_activity") return false;
  return (
    m.type === undefined ||
    m.type === "message" ||
    m.type === "voicemail" ||
    m.type === "missed_call"
  );
}

/** Count resident public messages after the last agent/staff public message (unread batch when thread is marked unread). */
function countUnreadResidentMessagesInThread(c: ConversationItem): number {
  if (!c.hasUnread) return 0;
  let n = 0;
  for (let i = c.messages.length - 1; i >= 0; i--) {
    const m = c.messages[i];
    if (!isPublicThreadMessageForUnreadCount(m)) continue;
    if (m.role === "resident") n++;
    else break;
  }
  return n;
}

/** Resolve / Reopen + Add a label for Entrata profile side panel (z above z-[60] overlay). */
function ProfilePanelConversationActionsMenu({
  selected,
  allLabels,
  newLabelText,
  setNewLabelText,
  resolveConversation,
  reopenConversation,
  addLabel,
  removeLabel,
}: {
  selected: ConversationItem;
  allLabels: string[];
  newLabelText: string;
  setNewLabelText: Dispatch<SetStateAction<string>>;
  resolveConversation: (id: string, actor: string) => void;
  reopenConversation: (id: string, actor: string) => void;
  addLabel: (id: string, label: string, actor: string) => void;
  removeLabel: (id: string, label: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          aria-label="Conversation actions"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[70] w-48">
        {selected.status === "open" ? (
          <DropdownMenuItem
            onSelect={() => resolveConversation(selected.id, MY_INBOX_ASSIGNEE)}
            className="gap-2"
          >
            <Check className="h-3.5 w-3.5" />
            Resolve
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onSelect={() => reopenConversation(selected.id, MY_INBOX_ASSIGNEE)}
            className="gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reopen
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            <Tag className="h-3.5 w-3.5" />
            Add a label
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="z-[70] w-52 p-0" sideOffset={4}>
            <div className="p-2" onKeyDown={(e) => e.stopPropagation()}>
              <Input
                value={newLabelText}
                onChange={(e) => setNewLabelText(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter" && newLabelText.trim()) {
                    addLabel(selected.id, newLabelText.trim(), MY_INBOX_ASSIGNEE);
                    setNewLabelText("");
                  }
                }}
                placeholder="Search labels…"
                className="h-7 text-xs"
              />
            </div>
            <div className="max-h-40 overflow-y-auto border-t border-border">
              {allLabels
                .filter((l) => !newLabelText.trim() || l.toLowerCase().includes(newLabelText.toLowerCase()))
                .map((label) => {
                  const applied = selected.labels.includes(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                      onClick={() => {
                        if (applied) {
                          removeLabel(selected.id, label);
                        } else {
                          addLabel(selected.id, label, MY_INBOX_ASSIGNEE);
                        }
                      }}
                    >
                      <Check className={cn("h-3.5 w-3.5 shrink-0", applied ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">{label.replace(/\s+\d+(?=\s+Escalation)/, "")}</span>
                    </button>
                  );
                })}
              {newLabelText.trim() &&
                !allLabels.some((l) => l.toLowerCase() === newLabelText.toLowerCase()) && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
                    onClick={() => {
                      addLabel(selected.id, newLabelText.trim(), MY_INBOX_ASSIGNEE);
                      setNewLabelText("");
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Create &ldquo;{newLabelText.trim()}&rdquo;</span>
                  </button>
                )}
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Human-readable label for an ISO 639-1 language code (falls back to the raw code).
 * Uses the browser's Intl.DisplayNames when available.
 */
function languageDisplayName(code: string): string {
  const normalized = code.toLowerCase();
  const map: Record<string, string> = {
    es: "Spanish",
    en: "English",
    fr: "French",
    de: "German",
    pt: "Portuguese",
    zh: "Chinese",
    vi: "Vietnamese",
    ko: "Korean",
    ja: "Japanese",
  };
  if (map[normalized]) return map[normalized];
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "language" });
    return dn.of(normalized) ?? code;
  } catch {
    return code;
  }
}

/** True when this conversation contains any resident message in a non-English language. */
function conversationHasNonEnglishContent(c: ConversationItem): boolean {
  return c.messages.some((m) => m.language && m.language.toLowerCase() !== "en");
}

/** First non-English language code detected across the conversation's messages. */
function conversationDetectedLanguage(c: ConversationItem): string | null {
  for (const m of c.messages) {
    if (m.language && m.language.toLowerCase() !== "en") return m.language.toLowerCase();
  }
  return null;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Demo-only English → Spanish translator (real-time, deterministic)
   ─────────────────────────────────────────────────────────────────────────────
   Two-stage pipeline runs on every keystroke:
     1. Multi-word phrase substitution (longest phrase first) — catches idioms,
        greetings, and property-manager stock replies so they read naturally.
     2. Word-by-word substitution — every remaining English token is looked up
        in a ~200-word dictionary covering pronouns, verbs, prepositions, time
        words, and maintenance / leasing vocab.
   Also fixes Spanish sentence punctuation: any sentence ending in ? gets an
   opening ¿, any sentence ending in ! gets an opening ¡.
   Real Communications will call a translation service; this stub keeps the
   prototype self-contained and produces convincing real-time output.
   ───────────────────────────────────────────────────────────────────────────── */

/** Multi-word English → Spanish phrases (case-insensitive). Longest first wins. */
const EN_ES_PHRASES: Record<string, string> = {
  // Greetings & closings
  "good morning": "buenos días",
  "good afternoon": "buenas tardes",
  "good evening": "buenas noches",
  "good night": "buenas noches",
  "have a nice day": "que tenga un buen día",
  "have a great day": "que tenga un excelente día",
  "take care": "cuídese",
  "best regards": "saludos cordiales",
  "kind regards": "saludos cordiales",
  "warm regards": "un cordial saludo",
  "regards": "saludos",
  "sincerely": "atentamente",
  "cheers": "saludos",
  "talk to you soon": "hablamos pronto",
  "see you soon": "hasta pronto",
  "see you later": "hasta luego",
  "how are you doing": "cómo está",
  "how are you": "cómo está",
  "how is it going": "cómo va todo",
  "how's it going": "cómo va todo",
  "what's up": "qué tal",
  "nice to meet you": "encantado de conocerle",

  // Common polite phrases
  "thank you so much": "muchísimas gracias",
  "thank you very much": "muchas gracias",
  "thank you": "gracias",
  "you're welcome": "de nada",
  "no problem": "no hay problema",
  "you are welcome": "de nada",
  "i'm sorry": "lo siento",
  "i am sorry": "lo siento",
  "sorry for the inconvenience": "disculpe las molestias",
  "sorry about that": "disculpe eso",
  "my apologies": "mis disculpas",
  "of course": "por supuesto",
  "no worries": "no se preocupe",
  "please let me know": "por favor hágamelo saber",
  "let me know": "hágamelo saber",
  "i understand": "entiendo",
  "i see": "ya veo",
  "i know": "lo sé",
  "i think": "pienso que",
  "i believe": "creo que",
  "i'm not sure": "no estoy seguro",
  "i am not sure": "no estoy seguro",

  // Action / dispatch phrases (maintenance context)
  "right away": "de inmediato",
  "as soon as possible": "lo antes posible",
  "on the way": "en camino",
  "on my way": "en camino",
  "i'll send": "enviaré",
  "i will send": "enviaré",
  "i'll dispatch": "enviaré",
  "i will dispatch": "enviaré",
  "we'll send": "enviaremos",
  "we will send": "enviaremos",
  "we're sending": "estamos enviando",
  "we are sending": "estamos enviando",
  "i'm sending": "estoy enviando",
  "i am sending": "estoy enviando",
  "will be there": "estará allí",
  "will arrive": "llegará",
  "should arrive": "debería llegar",
  "should be there": "debería estar allí",
  "in about": "en aproximadamente",
  "shortly": "en breve",
  "a few minutes": "unos minutos",
  "a moment": "un momento",
  "one moment": "un momento",
  "hold on": "espere un momento",
  "give me a second": "deme un segundo",
  "give me a moment": "deme un momento",
  "check on": "revisar",
  "check it out": "revisarlo",
  "look into": "investigar",
  "follow up": "hacer seguimiento",

  // Time phrases
  "right now": "ahora mismo",
  "this morning": "esta mañana",
  "this afternoon": "esta tarde",
  "this evening": "esta noche",
  "tonight": "esta noche",
  "tomorrow morning": "mañana por la mañana",
  "tomorrow afternoon": "mañana por la tarde",
  "next week": "la próxima semana",
  "last week": "la semana pasada",
  "next month": "el próximo mes",
  "last month": "el mes pasado",
  "in the morning": "por la mañana",
  "in the afternoon": "por la tarde",
  "in the evening": "por la noche",
  "at night": "por la noche",

  // Property / maintenance vocab
  "air conditioning": "aire acondicionado",
  "air conditioner": "aire acondicionado",
  "hot water": "agua caliente",
  "cold water": "agua fría",
  "work order": "orden de trabajo",
  "service request": "solicitud de servicio",
  "maintenance technician": "técnico de mantenimiento",
  "maintenance team": "equipo de mantenimiento",
  "leasing office": "oficina de arrendamiento",
  "property manager": "gerente de la propiedad",
  "front desk": "recepción",
  "rent increase": "aumento de alquiler",
  "lease renewal": "renovación del contrato",
  "lease agreement": "contrato de arrendamiento",
  "move in": "mudanza",
  "move out": "desalojo",
  "check in": "registro",
  "check out": "salida",
  "sign the lease": "firmar el contrato",
  "pay rent": "pagar el alquiler",
  "late fee": "cargo por retraso",
  "security deposit": "depósito de seguridad",
};

/** Single-word English → Spanish dictionary. Case-preserved on output. */
const EN_ES_WORDS: Record<string, string> = {
  // Greetings
  hi: "hola",
  hello: "hola",
  hey: "hola",
  bye: "adiós",
  goodbye: "adiós",

  // Politeness
  thanks: "gracias",
  please: "por favor",
  sorry: "lo siento",
  welcome: "bienvenido",
  yes: "sí",
  no: "no",
  ok: "está bien",
  okay: "está bien",
  sure: "claro",
  maybe: "quizás",
  perfect: "perfecto",
  great: "excelente",
  good: "bueno",
  bad: "malo",
  fine: "bien",
  well: "bien",

  // Pronouns
  i: "yo",
  me: "me",
  my: "mi",
  mine: "mío",
  you: "usted",
  your: "su",
  yours: "suyo",
  he: "él",
  him: "él",
  his: "su",
  she: "ella",
  her: "ella",
  hers: "suyo",
  it: "eso",
  its: "su",
  we: "nosotros",
  us: "nosotros",
  our: "nuestro",
  ours: "nuestro",
  they: "ellos",
  them: "ellos",
  their: "su",
  theirs: "suyo",
  this: "esto",
  that: "eso",
  these: "estos",
  those: "esos",
  someone: "alguien",
  something: "algo",
  anyone: "alguien",
  anything: "algo",
  everyone: "todos",
  everything: "todo",
  nobody: "nadie",
  nothing: "nada",

  // Articles / determiners
  a: "un",
  an: "un",
  the: "el",
  some: "algún",
  any: "cualquier",
  all: "todo",
  every: "cada",
  each: "cada",
  many: "muchos",
  few: "pocos",
  more: "más",
  less: "menos",
  most: "la mayoría",
  another: "otro",
  other: "otro",
  same: "mismo",
  both: "ambos",

  // Verbs (rough present-tense/base form)
  am: "estoy",
  is: "está",
  are: "está",
  was: "estaba",
  were: "estaban",
  be: "ser",
  been: "sido",
  being: "siendo",
  have: "tener",
  has: "tiene",
  had: "tenía",
  do: "hacer",
  does: "hace",
  did: "hizo",
  done: "hecho",
  can: "puedo",
  could: "podría",
  will: "voy a",
  would: "sería",
  should: "debería",
  might: "podría",
  must: "debe",
  go: "ir",
  going: "yendo",
  went: "fui",
  come: "venir",
  coming: "viniendo",
  came: "vino",
  see: "ver",
  seeing: "viendo",
  saw: "vi",
  know: "sé",
  knew: "sabía",
  think: "pienso",
  thought: "pensé",
  want: "quiero",
  wants: "quiere",
  wanted: "quería",
  need: "necesito",
  needs: "necesita",
  needed: "necesitaba",
  send: "envío",
  sends: "envía",
  sending: "enviando",
  sent: "envié",
  get: "obtener",
  gets: "obtiene",
  got: "obtuvo",
  give: "dar",
  gives: "da",
  gave: "dio",
  take: "tomar",
  takes: "toma",
  took: "tomó",
  make: "hacer",
  makes: "hace",
  made: "hizo",
  say: "decir",
  says: "dice",
  said: "dijo",
  tell: "decir",
  tells: "dice",
  told: "dijo",
  ask: "preguntar",
  asks: "pregunta",
  asked: "preguntó",
  help: "ayudar",
  helps: "ayuda",
  helped: "ayudó",
  fix: "reparar",
  fixes: "repara",
  fixed: "reparado",
  check: "revisar",
  checking: "revisando",
  checked: "revisado",
  call: "llamar",
  calls: "llama",
  called: "llamó",
  arrive: "llegar",
  arrives: "llega",
  arriving: "llegando",
  arrived: "llegó",
  dispatch: "enviar",
  schedule: "programar",
  scheduled: "programado",
  resolve: "resolver",
  resolved: "resuelto",
  work: "trabajar",
  works: "funciona",
  working: "funcionando",
  worked: "trabajó",

  // Conjunctions / prepositions
  and: "y",
  or: "o",
  but: "pero",
  so: "así que",
  because: "porque",
  if: "si",
  when: "cuando",
  while: "mientras",
  though: "aunque",
  although: "aunque",
  to: "a",
  from: "de",
  of: "de",
  in: "en",
  on: "en",
  at: "en",
  with: "con",
  without: "sin",
  for: "para",
  about: "sobre",
  over: "sobre",
  under: "debajo de",
  before: "antes",
  after: "después",
  between: "entre",
  among: "entre",
  through: "a través de",
  during: "durante",
  since: "desde",
  until: "hasta",
  by: "por",
  as: "como",
  than: "que",

  // Question words
  what: "qué",
  where: "dónde",
  when_q: "cuándo",
  why: "por qué",
  how: "cómo",
  who: "quién",
  which: "cuál",

  // Time
  now: "ahora",
  today: "hoy",
  tomorrow: "mañana",
  yesterday: "ayer",
  morning: "mañana",
  afternoon: "tarde",
  evening: "noche",
  night: "noche",
  day: "día",
  week: "semana",
  month: "mes",
  year: "año",
  hour: "hora",
  minute: "minuto",
  second: "segundo",
  soon: "pronto",
  later: "más tarde",
  earlier: "antes",
  always: "siempre",
  never: "nunca",
  sometimes: "a veces",
  often: "a menudo",

  // Numbers
  zero: "cero",
  one: "uno",
  two: "dos",
  three: "tres",
  four: "cuatro",
  five: "cinco",
  six: "seis",
  seven: "siete",
  eight: "ocho",
  nine: "nueve",
  ten: "diez",
  eleven: "once",
  twelve: "doce",
  fifteen: "quince",
  twenty: "veinte",
  thirty: "treinta",
  forty: "cuarenta",
  fifty: "cincuenta",
  sixty: "sesenta",

  // Property vocab
  apartment: "apartamento",
  unit: "unidad",
  room: "habitación",
  kitchen: "cocina",
  bathroom: "baño",
  bedroom: "dormitorio",
  building: "edificio",
  property: "propiedad",
  home: "casa",
  house: "casa",
  door: "puerta",
  window: "ventana",
  key: "llave",
  keys: "llaves",
  lock: "cerradura",
  package: "paquete",
  mail: "correo",
  parking: "estacionamiento",
  garage: "garaje",
  pool: "piscina",
  gym: "gimnasio",
  laundry: "lavandería",
  resident: "residente",
  tenant: "inquilino",
  neighbor: "vecino",

  // Maintenance vocab
  maintenance: "mantenimiento",
  repair: "reparación",
  technician: "técnico",
  plumber: "plomero",
  electrician: "electricista",
  handyman: "empleado de mantenimiento",
  broken: "roto",
  leak: "fuga",
  leaking: "goteando",
  clogged: "atascado",
  heat: "calefacción",
  heating: "calefacción",
  cooling: "refrigeración",
  temperature: "temperatura",
  hot: "caliente",
  cold: "frío",
  warm: "cálido",
  cool: "fresco",
  water: "agua",
  power: "electricidad",
  electricity: "electricidad",
  gas: "gas",
  ac: "aire acondicionado",

  // Leasing vocab
  rent: "alquiler",
  lease: "contrato de arrendamiento",
  payment: "pago",
  deposit: "depósito",
  application: "solicitud",
  renewal: "renovación",
  tour: "recorrido",
  showing: "muestra",
  signing: "firma",
  approved: "aprobado",
  denied: "denegado",
  pending: "pendiente",

  // Filler common words
  really: "realmente",
  very: "muy",
  just: "solo",
  only: "solo",
  also: "también",
  too: "también",
  even: "incluso",
  still: "todavía",
  already: "ya",
  yet: "aún",
  again: "otra vez",
  back: "de vuelta",
  here: "aquí",
  there: "allí",
  up: "arriba",
  down: "abajo",
  out: "fuera",
  off: "apagado",
  away: "lejos",
  around: "alrededor",
  ready: "listo",
  new: "nuevo",
  old: "viejo",
  big: "grande",
  small: "pequeño",
  right: "correcto",
  wrong: "incorrecto",
  first: "primero",
  last: "último",
  next: "siguiente",
  best: "mejor",
  better: "mejor",
  worse: "peor",
  early: "temprano",
  late: "tarde",
  full: "lleno",
  empty: "vacío",
  free: "gratis",
  busy: "ocupado",
  open: "abierto",
  closed: "cerrado",
};

/** Preserve the capitalization of `original` on `replacement`. */
function matchCase(original: string, replacement: string): string {
  if (!original || !replacement) return replacement;
  if (original === original.toUpperCase() && original.length > 1) {
    return replacement.toUpperCase();
  }
  if (original[0] === original[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/**
 * Convert English sentence punctuation to Spanish. Questions get an opening ¿ and
 * exclamations get an opening ¡ inserted at the start of the sentence.
 */
function fixSpanishPunctuation(text: string): string {
  return text.replace(/([^.!?\n]+)([.!?])/g, (_, sentence: string, terminator: string) => {
    const trimmed = sentence.trimStart();
    const leading = sentence.slice(0, sentence.length - trimmed.length);
    if (terminator === "?") {
      if (trimmed.startsWith("¿")) return `${leading}${trimmed}${terminator}`;
      return `${leading}¿${trimmed}${terminator}`;
    }
    if (terminator === "!") {
      if (trimmed.startsWith("¡")) return `${leading}${trimmed}${terminator}`;
      return `${leading}¡${trimmed}${terminator}`;
    }
    return `${leading}${trimmed}${terminator}`;
  });
}

/** Sorted phrase list (longest first) so "how are you doing" wins over "how are you". */
const EN_ES_PHRASE_LIST = Object.entries(EN_ES_PHRASES).sort(
  ([a], [b]) => b.length - a.length
);

/** Regex-escape a phrase for use in a RegExp constructor. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function translateEnglishToSpanish(text: string): string {
  if (!text.trim()) return "";
  let out = text;

  // 1) Multi-word phrase substitution. Sentinel tokens keep the phrase from being
  //    re-tokenized by the word-by-word pass below (e.g. "how are you" was
  //    already replaced so we must not re-translate "how" / "are" / "you").
  const phraseSentinels: string[] = [];
  for (const [phrase, spanish] of EN_ES_PHRASE_LIST) {
    const pattern = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "gi");
    out = out.replace(pattern, (match) => {
      const cased = matchCase(match, spanish);
      const idx = phraseSentinels.push(cased) - 1;
      return `\u0000P${idx}\u0000`;
    });
  }

  // 2) Word-by-word substitution over the surviving English tokens. Anything that
  //    isn't a letter (punctuation, digits, whitespace, sentinels) is left alone.
  out = out.replace(/[A-Za-z']+/g, (word) => {
    const lower = word.toLowerCase();
    // "when" appears both as time-when and as question-when; the phrase map handles
    // the question form, so single-word "when" always translates to time-when.
    const key = lower === "when" ? "when" : lower;
    const es = EN_ES_WORDS[key];
    if (!es) return word;
    return matchCase(word, es);
  });

  // Restore phrase sentinels.
  out = out.replace(/\u0000P(\d+)\u0000/g, (_, idxStr) => {
    const idx = parseInt(idxStr, 10);
    return phraseSentinels[idx] ?? "";
  });

  return fixSpanishPunctuation(out);
}

function translateStaffDraftTo(text: string, targetLanguage: string): string {
  const code = targetLanguage.toLowerCase();
  if (code === "es") return translateEnglishToSpanish(text);
  return text;
}

/**
 * Renders a message body that may have a translation. There are two authoring
 * paths a translated bubble can come from:
 *
 *   1. Resident authored in a non-English language. `msg.text` is the original
 *      (e.g. Spanish), `msg.translation` is the English rendering.
 *   2. Staff typed in English with auto-translate on. `msg.text` is what got sent
 *      (e.g. Spanish), `msg.originalText` is the English draft.
 *
 * Which side of the bubble is shown is controlled by `showEnglish`, which is
 * driven by a single toggle in the conversation header so the reviewer can flip
 * the entire thread with one click.
 *
 * A small "Auto-translated" chip appears on translated staff bubbles regardless
 * of the toggle so it's obvious the bubble went through the translator.
 */
function TranslatableMessageBody({
  msg,
  translationEnabled,
  showEnglish,
  className,
  chipVariant = "muted",
}: {
  /** Minimal message shape — the ConversationMessage in the main thread carries these;
   * the Entrata profile side-panel mock (EntrataProfileThreadMessage) never has them,
   * so translation just doesn't apply there. */
  msg: {
    text: string;
    language?: string;
    translation?: string;
    originalText?: string;
  };
  translationEnabled: boolean;
  /** When true, show the English equivalent (if present) instead of the sent text. */
  showEnglish: boolean;
  /** Applied to the text container. */
  className?: string;
  /** Chip color variant — "onDark" for blue staff/agent bubbles, "muted" elsewhere. */
  chipVariant?: "onDark" | "muted";
}) {
  const englishEquivalent = msg.translation ?? msg.originalText ?? null;
  const canTranslate = translationEnabled && !!englishEquivalent;
  const isStaffAutoTranslated = !!msg.originalText;
  const languageCode = msg.language ?? "es";
  const languageLabel = languageDisplayName(languageCode);

  const displayed =
    canTranslate && showEnglish ? (englishEquivalent as string) : msg.text;

  const chipLabel = (() => {
    if (!canTranslate) return null;
    if (showEnglish) {
      return isStaffAutoTranslated
        ? "What you typed · English"
        : "Translated · English";
    }
    if (isStaffAutoTranslated) return `Auto-translated · ${languageLabel}`;
    return null;
  })();

  return (
    <div className={className}>
      {chipLabel && (
        <div
          className={cn(
            "mb-1.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
            chipVariant === "onDark"
              ? "bg-white/20 text-white ring-1 ring-inset ring-white/30"
              : "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-100"
          )}
        >
          <Languages className="h-3 w-3" aria-hidden />
          {chipLabel}
        </div>
      )}
      {displayed.split("\n").map((line, li) => (
        <span key={li}>
          {line}
          {li < displayed.split("\n").length - 1 && <br />}
        </span>
      ))}
    </div>
  );
}

/**
 * Compact "Spanish" / "French" chip. Rendered on the conversation card and header
 * when translation demo mode is on and the thread carries at least one non-English
 * message. Uses the same tonal-fill / borderless treatment as the channel chip.
 */
function ConversationListLanguageChip({ language }: { language: string }) {
  const label = languageDisplayName(language);
  return (
    <span
      className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-purple-100 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-purple-800 dark:bg-purple-900/40 dark:text-purple-200"
      aria-label={`${label} language thread`}
    >
      <Languages className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      {label}
    </span>
  );
}

function ConversationListChannelChip({ channel }: { channel: string }) {
  if (channel === "Email") {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-200"
        aria-label="Email thread"
      >
        <Mail className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
        Email
      </span>
    );
  }
  if (channel === "SMS") {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200"
        aria-label="SMS thread"
      >
        <Phone className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
        SMS
      </span>
    );
  }
  if (channel === "Phone" || channel === "Voice") {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-purple-200 bg-purple-50 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-purple-800 dark:border-purple-900/60 dark:bg-purple-950/50 dark:text-purple-200"
        aria-label="Voice thread"
      >
        <PhoneCall className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
        Voice
      </span>
    );
  }
  return (
    <span
      className="inline-flex max-w-[9rem] shrink-0 items-center gap-0.5 truncate rounded-md border border-border bg-muted/60 px-1.5 py-px text-[9px] font-semibold text-muted-foreground"
      aria-label={`Channel: ${channel}`}
    >
      <MessageSquare className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
      <span className="truncate">{channel}</span>
    </span>
  );
}

/** Mock threads in the Entrata resident profile side panel (+ optional OXP bulk email row). */
type EntrataProfileThreadMessage = {
  role: "user" | "agent" | "staff";
  text: string;
  timestamp: string;
  emailSignature?: string;
};

type EntrataProfileThreadRow = {
  property: string;
  type: string;
  channel: "SMS" | "Email";
  status: "active" | "closed";
  assignee: string | null;
  labels?: string[];
  messages: EntrataProfileThreadMessage[];
  bulkOutboundEmail?: BulkOutboundEmailRef;
  emailSubject?: string;
};

/**
 * Parse a thread message timestamp (e.g. "Aug 21 2025 · 9:10am") into ms.
 * Returns 0 if it can't be parsed so unparseable rows sort to the bottom.
 */
function parseThreadMessageTimestamp(ts: string | undefined): number {
  if (!ts) return 0;
  const cleaned = ts.replace("·", " ").replace(/\s+/g, " ").trim();
  const match = cleaned.match(
    /^([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})(?:\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM))?$/
  );
  if (!match) {
    const fallback = Date.parse(cleaned);
    return Number.isFinite(fallback) ? fallback : 0;
  }
  const [, monthStr, dayStr, yearStr, hourStr, minStr, mer] = match;
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const monthKey = monthStr.slice(0, 3).toLowerCase();
  const month = months[monthKey];
  if (month === undefined) return 0;
  const day = parseInt(dayStr, 10);
  const year = parseInt(yearStr, 10);
  let hour = hourStr ? parseInt(hourStr, 10) % 12 : 0;
  if (mer && mer.toLowerCase() === "pm") hour += 12;
  const minute = minStr ? parseInt(minStr, 10) : 0;
  return new Date(year, month, day, hour, minute).getTime();
}

/** Treat the most recent message timestamp on a thread as its close date. */
function getThreadCloseTimestamp(thread: EntrataProfileThreadRow): number {
  if (!thread.messages.length) return 0;
  let latest = 0;
  for (const m of thread.messages) {
    const ms = parseThreadMessageTimestamp(m.timestamp);
    if (ms > latest) latest = ms;
  }
  return latest;
}

function formatThreadCloseDate(thread: EntrataProfileThreadRow): string | null {
  const ms = getThreadCloseTimestamp(thread);
  if (!ms) return null;
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function ConversationsContent() {
  const {
    filteredItems: conversations,
    addMessage,
    updateAssignee,
    resolveConversation,
    reopenConversation,
    recordThreadActivity,
    addLabel,
    removeLabel,
    markRead,
    markUnread,
    pendingSmsCompose,
    pendingEmailCompose,
    setPendingSmsCompose,
    setPendingEmailCompose,
  } = useConversations();
  const { agents } = useAgents();
  const { humanMembers } = useWorkforce();

  const scrollRef = useRef<HTMLDivElement>(null);

  const agentsByName = useMemo(() => {
    const map = new Map<string, (typeof agents)[number]>();
    for (const a of agents) map.set(a.name, a);
    return map;
  }, [agents]);

  const resolveAgentLabel = (name: string) => {
    const a = agentsByName.get(name);
    return a ? `${a.type === "autonomous" ? "ELI+ " : ""}${a.name}` : name;
  };

  const humanNameSet = useMemo(
    () => new Set(humanMembers.map((m) => m.name)),
    [humanMembers]
  );
  const isHumanAssignee = (assignee: string) => humanNameSet.has(assignee);

  const privateNoteMentionCandidates = useMemo(
    () =>
      humanMembers
        .map((m) => ({
          name: m.name,
          handle: staffMentionHandle(m.name),
          role: m.role,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [humanMembers]
  );

  const autonomousAgents = useMemo(
    () => agents.filter((a) => a.type === "autonomous"),
    [agents]
  );

  const groupedAssignees = useMemo(() => {
    const ai = autonomousAgents
      .filter((a) => !ASSIGNMENT_PICKER_EXCLUDED_AUTONOMOUS_AGENT_NAMES.has(a.name))
      .map((a) => ({ value: `ELI+ ${a.name}`, label: `ELI+ ${a.name}` }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const humans = humanMembers
      .map((m) => ({ value: m.name, label: `${m.name} · ${m.role}` }))
      .sort((a, b) => a.value.localeCompare(b.value));
    return { ai, humans };
  }, [autonomousAgents, humanMembers]);

  const { clickToCallEnabled, toggleClickToCallEnabled } = useClickToCallDemo();
  const { callSystemEnabled, toggleCallSystemEnabled, simulateInboundCall } = useCallSystemDemo();
  const {
    superAgent1Enabled,
    toggleSuperAgent1Enabled,
    superAgent12Enabled,
    toggleSuperAgent12Enabled,
    propertyOwnedThreadIds,
    setThreadPropertyOwned,
    simulateUserEnabled,
    toggleSimulateUserEnabled,
    breakoutsExampleEnabled,
    toggleBreakoutsExampleEnabled,
    email2DemoEnabled,
    toggleEmail2DemoEnabled,
    notificationsEnabled,
    toggleNotificationsEnabled,
    triggerNotificationPop,
    notifChannelVoice,
    setNotifChannelVoice,
    notifChannelSms,
    setNotifChannelSms,
    notifChannelEmail,
    setNotifChannelEmail,
    notifChannelResidentPortal,
    setNotifChannelResidentPortal,
    viewportPreset,
    setViewportPreset,
    followUpEnabled,
    setFollowUpEnabled,
    followUpDaysList,
    setFollowUpDaysList,
    autoCloseEnabled,
    setAutoCloseEnabled,
    autoCloseDays,
    setAutoCloseDays,
    threadSortMode,
    setThreadSortMode,
    eliPromptEnabled,
    setEliPromptEnabled,
    promptOptionOffEnabled,
    setPromptOptionOffEnabled,
    promptOptionKeepOnEnabled,
    setPromptOptionKeepOnEnabled,
    eliPromptCadenceMinutes,
    setEliPromptCadenceMinutes,
    eliPromptCadenceUnit,
    setEliPromptCadenceUnit,
    eliPromptDefaultOption,
    setEliPromptDefaultOption,
    eliModeByThreadId,
    setEliMode,
    eliPromptShownAt,
    markEliPromptShown,
    goLiveAutomationEnabled,
    toggleGoLiveAutomationEnabled,
    testingModeEnabled,
    toggleTestingModeEnabled,
  } = useConversationsDemo();
  const { translationEnabled, toggleTranslationEnabled } = useTranslationDemo();
  /** Call controls + phone demo threads (missed/voicemail) for Click To Call or Super Agent 1.0. */
  const phoneDemoEnabled = clickToCallEnabled || superAgent1Enabled;
  const [callSystemPanelOpen, setCallSystemPanelOpen] = useState(false);
  const [manageInboxPanelOpen, setManageInboxPanelOpen] = useState(false);
  /** Manage Inbox → Defaults: whether the Quick Filter block is visible in the sidebar. */
  const [quickFilterEnabled, setQuickFilterEnabled] = useState(true);

  const [clickToCallSession, setClickToCallSession] = useState<ClickToCallSessionInput | null>(null);
  const [callConfirmOpen, setCallConfirmOpen] = useState(false);
  const [callConfirmDraft, setCallConfirmDraft] = useState<ClickToCallSessionInput | null>(null);
  const [showCallbackInput, setShowCallbackInput] = useState(false);
  const [callbackNumber, setCallbackNumber] = useState("");
  /**
   * Hardcoded staff callback numbers for the click-to-call dialog. The
   * primary is the default selection; secondaries appear in the picker.
   * (Prototype data — real product would pull these from the user's
   * profile settings.)
   */
  const STAFF_CALLBACK_NUMBERS = useMemo(
    () => [
      { value: "+1 (555) 123-4567", label: "Mobile", isPrimary: true },
      { value: "+1 (555) 987-6543", label: "Office" },
    ],
    []
  );
  const primaryStaffCallbackNumber = STAFF_CALLBACK_NUMBERS[0].value;

  const beginClickToCallForConversation = useCallback(
    (convo: Pick<ConversationItem, "id" | "resident" | "property" | "contactType">) => {
      const { residentPhone, propertyLine } = getVoiceOrSmsThreadRoutingNumbers(
        convo.resident,
        convo.property
      );
      setCallConfirmDraft({
        conversationId: convo.id,
        residentName: convo.resident,
        propertyName: convo.property,
        phoneDisplay: formatClickToCallDisplayPhone(residentPhone),
        propertyRingNumberDisplay: propertyLine
          ? formatClickToCallDisplayPhone(propertyLine)
          : undefined,
        contactRole: convo.contactType?.toLowerCase() === "lead" ? "lead" : "resident",
      });
      setCallConfirmOpen(true);
    },
    []
  );

  // --- Sidebar + filter state ---
  const [sidebarFilter, setSidebarFilter] = useState<SidebarFilter>("all");
  const [inboxTab, setInboxTab] = useState("all");
  // In SA 1.2 the My Inbox / Unassigned / All tab strip is hidden, so make sure
  // any prior selection doesn't stay applied invisibly.
  useEffect(() => {
    if (superAgent12Enabled && inboxTab !== "all") setInboxTab("all");
  }, [superAgent12Enabled, inboxTab]);
  // Clicking any inbox in the sidebar should pull the user out of a settings
  // panel (Call System, Manage Inbox) back to the thread list. Settings items
  // don't mutate `sidebarFilter`, so this effect only fires on real inbox clicks.
  useEffect(() => {
    setCallSystemPanelOpen(false);
    setManageInboxPanelOpen(false);
  }, [sidebarFilter]);
  // Previous sidebar filter tracker for the SA 1.2 auto-select-first-thread
  // effect (declared below, after `filtered` and `setSelectedId` are in scope).
  const prevSidebarFilterRef = useRef(sidebarFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
  const [bulkResolveConfirmOpen, setBulkResolveConfirmOpen] = useState(false);
  /**
   * Right-click context menu on thread rows. Anchored to the exact cursor
   * position (viewport coordinates) rather than to the row DOM, which
   * matches native OS context menus. Currently exposes read/unread toggling
   * so staff can flip the red inbox dot back on for triage.
   */
  const [threadContextMenu, setThreadContextMenu] = useState<{
    threadId: string;
    x: number;
    y: number;
  } | null>(null);
  useEffect(() => {
    if (!threadContextMenu) return;
    const close = () => setThreadContextMenu(null);
    // Explicit `globalThis.KeyboardEvent` here — this file imports React's
    // `KeyboardEvent` type at the top for synthetic-event handlers
    // (e.g. `copyId` on line 456), so an unqualified `KeyboardEvent` in
    // scope resolves to `React.KeyboardEvent<Element>`. `window.addEventListener`
    // takes the DOM event, and CI's strict typecheck breaks the deploy build
    // if we mix them here.
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    // Any click anywhere (including on menu items — items call close before
    // acting) closes the menu; scroll / resize also close so the menu never
    // sits detached from its anchor position.
    window.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [threadContextMenu]);
  /** SA 1.2: sidebar-help modal explaining the inboxes and badges. */
  const [inboxHelpOpen, setInboxHelpOpen] = useState(false);
  /** SA 1.2: channel sub-filter applied to the sidebar-selected inbox. */
  const [sa12ChannelFilter, setSa12ChannelFilter] = useState<Sa12ChannelFilter>("all");
  const [sa12EscalationFilter, setSa12EscalationFilter] = useState<Sa12EscalationFilter>("all");
  /**
   * SA 1.2 thread-list grouping — split the visible thread list into a
   * "Needs Action" section (property-owned threads waiting on staff or with
   * an active follow-up reminder) and a "No Action Needed" section (property
   * threads staff is already on top of, plus Eli-owned threads that don't
   * surface action markers). Each section header is a collapsible bar so
   * staff can hide the group they aren't triaging. Default: both expanded.
   * Only surfaces in Open Threads + Property Threads — Eli Threads and
   * Closed Threads don't have an action-needed dimension.
   */
  const [sa12ActionCollapsed, setSa12ActionCollapsed] = useState(false);
  const [sa12NoActionCollapsed, setSa12NoActionCollapsed] = useState(false);

  /**
   * SA 1.2 Eli Prompt modal state — fires after a public staff reply to an
   * escalated thread whose Eli mode is currently On. We stash the
   * captured-at-fire-time thread id so dismissing/reopening the modal
   * doesn't accidentally target the wrong conversation (users can switch
   * threads while the modal is open).
   */
  const [eliPromptOpen, setEliPromptOpen] = useState(false);
  const [eliPromptForThreadId, setEliPromptForThreadId] = useState<string | null>(null);
  /**
   * SA 1.2 pre-send gate — when staff hits Send on an escalated thread with
   * Eli currently on, we hold the reply here and open the Eli Prompt modal
   * instead of committing the send. The modal picks how Eli behaves going
   * forward and _then_ commits the buffered message. Cancelling the modal
   * discards the pending record and leaves the composer text alone so
   * staff can edit and try again.
   */
  const [eliPromptPendingSend, setEliPromptPendingSend] = useState<{
    threadId: string;
    inputMode: "message" | "private_note";
    payload: Parameters<typeof addMessage>[1];
  } | null>(null);
  /**
   * Which of the two options is picked in the modal (drives the Send button's
   * disabled state — Send is off until staff makes a choice).
   */
  const [eliPromptChoice, setEliPromptChoice] = useState<
    "off" | "on" | null
  >(null);
  const [threadListFiltersOpen, setThreadListFiltersOpen] = useState(false);
  /**
   * Snapshot of every filter dimension the Filters popover controls, taken
   * the moment the popover opens. Backs the "Cancel" button + auto-revert
   * behavior on outside-click / ESC: if a snapshot is present when the
   * popover closes, its values are restored. "Apply" bypasses the revert
   * by clearing the snapshot before closing, so the tweaks the user made
   * while the popover was open become the new committed state.
   * (List updates preview live while the popover is open — clicking Apply
   * confirms the preview, Cancel throws it away.)
   */
  const filterSnapshotRef = useRef<null | {
    propertyKeys: Set<string> | null;
    convoTypes: Set<ThreadListConvoTypeFilter>;
    actionFilters: Set<ThreadListActionFilter>;
    sa12Escalation: Sa12EscalationFilter;
    statusFilters: Set<"active" | "completed">;
    dateRange: ThreadListDateRangePreset;
    customDateFrom: string;
    customDateTo: string;
    channels: Set<ThreadListChannelFilter> | null;
  }>(null);
  const [threadListConvoTypes, setThreadListConvoTypes] = useState<Set<ThreadListConvoTypeFilter>>(
    () => new Set(["escalated"])
  );
  /**
   * SA 1.2 only — "Action Needed" filter. Empty set = show every thread
   * (the filter is off). Any populated set narrows the list to threads whose
   * corner marker matches at least one of the selected kinds.
   */
  const [threadListActionFilters, setThreadListActionFilters] = useState<Set<ThreadListActionFilter>>(
    () => new Set()
  );
  /** `null` = all properties (default). */
  const [threadListPropertyKeys, setThreadListPropertyKeys] = useState<Set<string> | null>(null);
  const [threadListStatusFilters, setThreadListStatusFilters] = useState<Set<"active" | "completed">>(
    () => new Set(["active"])
  );
  // Auto-flip the Status filter when the user changes inboxes so Closed Threads
  // actually renders its resolved contents (the default "active" filter would
  // otherwise hide everything). Open / Property / Eli inboxes flip back to
  // "active" so switching from Closed back to Open doesn't leave the user
  // staring at an unexpected empty state. The filter remains user-editable in
  // both cases — this only handles the automatic transition.
  useEffect(() => {
    setThreadListStatusFilters(
      sidebarFilter === "sa12-closed" ? new Set(["completed"]) : new Set(["active"])
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the sidebar inbox changes
  }, [sidebarFilter]);
  const [threadListDateRange, setThreadListDateRange] =
    useState<ThreadListDateRangePreset>("all");
  const [threadListCustomDateFrom, setThreadListCustomDateFrom] = useState("");
  const [threadListCustomDateTo, setThreadListCustomDateTo] = useState("");
  /** `null` = all channels (default). */
  const [threadListChannels, setThreadListChannels] = useState<Set<ThreadListChannelFilter> | null>(
    null
  );

  const isEscalationLabel = (label: string) => label.endsWith("Escalation");

  /**
   * SA 1.2 routing rule: any voice thread that carries a voicemail or missed
   * call is inherently a staff-handled workflow (someone has to call the person
   * back — Eli doesn't do that). Such threads route to Property Threads regardless
   * of labels or explicit takeover, so Eli Threads only ever shows voice threads
   * where Eli itself handled the call.
   */
  const isPropertyOwnedByVoiceOrigin = (c: (typeof conversations)[number]) => {
    const ch = (c.channel || "").toLowerCase();
    if (ch !== "voice" && ch !== "phone") return false;
    return c.messages.some((m) => m.type === "voicemail" || m.type === "missed_call");
  };

  /**
   * SA 1.2 shortcut: what Eli mode is currently in effect for this thread.
   * All read sites should go through this so we have a single accessor.
   */
  const eliModeFor = (id: string): EliMode =>
    getEffectiveEliMode(eliModeByThreadId, id);

  /**
   * SA 1.2 "is this a Property Threads item?" — a thread belongs to Property
   * Threads when *any* of the ownership signals fire:
   *   1. Staff explicitly took it over (`propertyOwnedThreadIds`)
   *   2. It carries an AI Escalation label
   *   3. It's a voicemail / missed-call voice thread that Eli couldn't
   *      complete (see `isPropertyOwnedByVoiceOrigin`)
   *   4. Eli mode is not "on" (i.e. off-indefinite). Staff has flipped
   *      Eli off on the thread (either via the Eli Prompt outcome or the
   *      manual AI On/Off popover), so staff owns it until they turn Eli
   *      back on. This is what makes "Non-Escalated in Property Threads"
   *      a real state after every escalation on a thread is resolved.
   * The Escalation Quick Filter inside Property Threads is a separate
   * dimension — it slices on `hasActiveAiEscalation`, NOT ownership.
   */
  const isPropertyOwnedSA12 = (c: (typeof conversations)[number]) => {
    if (propertyOwnedThreadIds.has(c.id)) return true;
    if (c.labels.some(isEscalationLabel)) return true;
    if (isPropertyOwnedByVoiceOrigin(c)) return true;
    if (eliModeFor(c.id).kind !== "on") return true;
    return false;
  };

  // `parseAgeMinutes` used to live here as a component-local closure.
  // It's now exported from `lib/conversations-context.tsx` so the
  // Communications notification bell (and any other surface that
  // orders threads by recency) uses the identical model. See there
  // for the recency parsing rules.

  const allConversationPropertyNames = useMemo(() => {
    const s = new Set<string>();
    for (const c of conversations) s.add(c.property);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [conversations]);

  // The Conversation Type filter is hidden and bypassed in SA 1.2 mode — so
  // don't let its leftover state (default is "only Escalated") light up the
  // "non-default filter" dot on the filters button when SA 1.2 is on.
  const threadListConvoTypeIsNonDefault =
    !superAgent12Enabled &&
    (threadListConvoTypes.size !== 1 || !threadListConvoTypes.has("escalated"));
  // The SA 1.2 Escalation filter (All / Escalated / Non-Escalated) only takes
  // effect inside the Property Threads inbox, so it should only mark the
  // Filters popover "dirty" when the user is actually viewing that inbox with
  // a non-"all" value selected. Anywhere else it's inert and shouldn't light
  // up the non-default dot.
  const threadListEscalationIsNonDefault =
    superAgent12Enabled &&
    sidebarFilter === "sa12-escalated" &&
    sa12EscalationFilter !== "all";
  // The Communication Channel filter is hidden and bypassed in SA 1.2 mode
  // (the channel Quick Filter above the search bar owns that dimension), so
  // don't let leftover checkboxes there light up the non-default dot when
  // the user can't see or clear the control.
  const threadListChannelIsNonDefault =
    !superAgent12Enabled && threadListChannels !== null;
  // The Status filter is hidden in SA 1.2 mode — the sidebar owns it
  // (Closed Threads → "completed", everything else → "active"), and a
  // `useEffect` keeps `threadListStatusFilters` in sync. Any value it holds
  // there is authored by the sidebar, not by the user, so it must never
  // light up the non-default dot in SA 1.2.
  const threadListStatusIsNonDefault =
    !superAgent12Enabled &&
    (threadListStatusFilters.size !== 1 || !threadListStatusFilters.has("active"));
  const threadFiltersAreNonDefault =
    threadListPropertyKeys !== null ||
    threadListConvoTypeIsNonDefault ||
    threadListStatusIsNonDefault ||
    threadListDateRange !== "all" ||
    Boolean(threadListCustomDateFrom) ||
    Boolean(threadListCustomDateTo) ||
    threadListChannelIsNonDefault ||
    threadListActionFilters.size > 0 ||
    threadListEscalationIsNonDefault;

  const threadListConvoSummary = useMemo(() => {
    const parts: string[] = [];
    if (threadListConvoTypes.has("escalated")) parts.push("Escalated");
    if (threadListConvoTypes.has("liveAi")) parts.push("Non-Escalated");
    if (parts.length === 0) return "None selected";
    if (parts.length === 1) return parts[0];
    return "Conversation Type";
  }, [threadListConvoTypes]);

  const threadListConvoTypeCount = threadListConvoTypes.size;

  /**
   * SA 1.2 only — pill summary for the Action Needed trigger button. Mirrors
   * the `threadListConvoSummary` pattern so the two filter triggers look and
   * feel identical.
   */
  const threadListActionSummary = useMemo(() => {
    const parts: string[] = [];
    if (threadListActionFilters.has("followup")) parts.push("Follow-up");
    if (threadListActionFilters.has("escalation")) parts.push("Escalation");
    if (parts.length === 0) return "Any action";
    if (parts.length === 1) return `${parts[0]} needed`;
    return "Action Needed";
  }, [threadListActionFilters]);

  const threadListActionCount = threadListActionFilters.size;

  const threadListPropertySummary = useMemo(() => {
    if (threadListPropertyKeys === null) return "Properties";
    const n = threadListPropertyKeys.size;
    if (n === 0) return "No properties";
    if (n === allConversationPropertyNames.length) return "Properties";
    if (n === 1) return [...threadListPropertyKeys][0];
    return "Properties";
  }, [threadListPropertyKeys, allConversationPropertyNames]);

  const threadListPropertyCount =
    threadListPropertyKeys === null ? 0 : threadListPropertyKeys.size;

  const threadListStatusSummary = useMemo(() => {
    const parts: string[] = [];
    if (threadListStatusFilters.has("active")) parts.push("Open");
    if (threadListStatusFilters.has("completed")) parts.push("Closed");
    if (parts.length === 0) return "None selected";
    if (parts.length === 1) return parts[0];
    return "Status";
  }, [threadListStatusFilters]);

  const threadListStatusCount = threadListStatusFilters.size;

  const threadListDateRangeSummary = useMemo(() => {
    if (threadListDateRange === "custom") {
      if (threadListCustomDateFrom && threadListCustomDateTo) {
        return `${formatYmdShort(threadListCustomDateFrom)} – ${formatYmdShort(threadListCustomDateTo)}`;
      }
      if (threadListCustomDateFrom) return `From ${formatYmdShort(threadListCustomDateFrom)}`;
      if (threadListCustomDateTo) return `Through ${formatYmdShort(threadListCustomDateTo)}`;
      return "Custom Date Range";
    }
    return (
      THREAD_LIST_DATE_RANGE_OPTIONS.find((o) => o.value === threadListDateRange)?.label ??
      "Date Range"
    );
  }, [threadListDateRange, threadListCustomDateFrom, threadListCustomDateTo]);

  const threadListChannelSummary = useMemo(() => {
    if (threadListChannels === null) return "Communication Channel";
    const parts: string[] = [];
    if (threadListChannels.has("email")) parts.push("Email");
    if (threadListChannels.has("sms")) parts.push("SMS");
    if (threadListChannels.has("voice")) parts.push("Voice");
    if (parts.length === 0) return "None selected";
    if (parts.length === 1) return parts[0];
    return "Communication Channel";
  }, [threadListChannels]);

  const threadListChannelCount = threadListChannels === null ? 0 : threadListChannels.size;

  const toggleThreadListChannel = (channel: ThreadListChannelFilter) => {
    setThreadListChannels((prev) => {
      const all: ThreadListChannelFilter[] = ["email", "sms", "voice"];
      const base = prev === null ? new Set(all) : new Set(prev);
      if (base.has(channel)) base.delete(channel);
      else base.add(channel);
      if (base.size === all.length) return null;
      return base;
    });
  };

  const toggleThreadListProperty = (propertyName: string) => {
    setThreadListPropertyKeys((prev) => {
      const all = allConversationPropertyNames;
      const base = prev === null ? new Set(all) : new Set(prev);
      if (base.has(propertyName)) base.delete(propertyName);
      else base.add(propertyName);
      if (base.size === all.length) return null;
      return base;
    });
  };

  /**
   * For Super Agent 1.0 threads: tracks which escalation labels a staff member has already
   * replied to with a public message. Once the replied-set covers every `*Escalation` label
   * on the conversation, the thread is added to `sa1HiddenConversationIds` and removed from
   * the thread list on the left + the unread / needs-action / mentions badge counters.
   * The escalation labels themselves stay on the conversation — this is purely a "staff is
   * done responding" UI signal, NOT a resolution. Another staff who can answer a different
   * escalation will still see the thread until they reply too.
   */
  const sa1RepliedEscalationsRef = useRef<Map<string, Set<string>>>(new Map());
  const [sa1HiddenConversationIds, setSa1HiddenConversationIds] = useState<Set<string>>(new Set());

  /** Sum of unread resident messages across threads in “Open Threads” (mention/unattended-only threads contribute 0). */
  const allThreadsUnreadCount = useMemo(() => {
    let total = 0;
    for (const c of conversations) {
      if (sa1HiddenConversationIds.has(c.id)) continue;
      if (!conversationMatchesAllThreadsInbox(c)) continue;
      total += countUnreadResidentMessagesInThread(c);
    }
    return total;
  }, [conversations, sa1HiddenConversationIds]);

  const mentionsInboxCount = useMemo(
    () =>
      conversations.filter(
        (c) => !sa1HiddenConversationIds.has(c.id) && conversationHasCurrentUserPrivateNoteMention(c)
      ).length,
    [conversations, sa1HiddenConversationIds]
  );

  const unattendedInboxCount = useMemo(
    () =>
      conversations.filter(
        (c) => !sa1HiddenConversationIds.has(c.id) && isConversationUnattended(c)
      ).length,
    [conversations, sa1HiddenConversationIds]
  );

  /**
   * SA 1.2 sidebar badge counts — one source of truth used by both the sidebar
   * badges *and* the channel-filter "All channels" total, so they always agree.
   * Keys map to `sidebarFilter` values: "all" | "sa12-escalated" | "sa12-property" | "sa12-closed".
   */
  const sa12InboxTotals = useMemo(() => {
    const totals = { all: 0, escalated: 0, property: 0, closed: 0 };
    for (const c of conversations) {
      const isPropertyOwned = isPropertyOwnedSA12(c);
      if (c.status === "open") {
        totals.all += 1;
        if (isPropertyOwned) totals.escalated += 1;
        else totals.property += 1;
      } else if (c.status === "resolved") {
        totals.closed += 1;
      }
    }
    return totals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, propertyOwnedThreadIds, eliModeByThreadId]);

  /**
   * "Effective unread" predicate — used everywhere the UI has to decide
   * whether a card gets a red dot, whether a preview bolds, and whether
   * the thread contributes to sidebar / quick-filter / section-header
   * unread counts.
   *
   * Today this is a straight passthrough of the raw `hasUnread` flag.
   * In SA 1.2 the two-bucket list ("Needs Action" / "No Action Needed")
   * *organizes* threads by whether staff still owes a reply, but it
   * does NOT gate the unread signal itself:
   *   - A thread in "Needs Action" reads as unread iff `hasUnread` is
   *     true (usually because the resident just replied).
   *   - A thread in "No Action Needed" ALSO reads as unread iff
   *     `hasUnread` is true. That flag will typically be false there
   *     (staff already replied, which called `markRead`), but a staffer
   *     can right-click → "Mark as unread" on any thread — including
   *     one in No Action Needed — to force the red dot back on for
   *     triage purposes. When that happens the dot re-appears on the
   *     card, the "No Action Needed" section-header chip lights up,
   *     and the thread contributes to every downstream count.
   *
   * This helper stays a separate function (rather than inlining
   * `c.hasUnread`) so a future reintroduction of bucket-scoped
   * unread masking has one obvious place to plug back into.
   */
  const isEffectivelyUnread = (c: (typeof conversations)[number]): boolean => {
    return c.hasUnread;
  };

  /**
   * SA 1.2 sidebar-badge counts — mirrors the standard inbox convention of
   * "unread messages," not "needs action." Only property-owned threads
   * (`isPropertyOwnedSA12`) contribute, so the badge tracks unread work that
   * a human is expected to handle. Eli Threads and Closed Threads are
   * intentionally excluded (Eli handles those / closed is done).
   */
  const sa12InboxActionCounts = useMemo(() => {
    const counts = { all: 0, escalated: 0 };
    for (const c of conversations) {
      if (c.status !== "open") continue;
      if (!isEffectivelyUnread(c)) continue;
      if (!isPropertyOwnedSA12(c)) continue;
      counts.all += 1;
      counts.escalated += 1;
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, propertyOwnedThreadIds, eliModeByThreadId, superAgent12Enabled]);

  /** Backwards-compatible alias for the Property Threads sidebar badge. */
  const sa12EscalatedCount = sa12InboxTotals.escalated;

  /**
   * SA 1.2: per-channel counts of *unread* threads inside the currently
   * selected sidebar inbox. Mirrors the sidebar badge convention (unread
   * count, not "needs action"), so the "All channels" total equals the
   * sidebar badge.
   *
   * Cross-channel threads (a Voice thread with an SMS follow-up on it,
   * or an SMS thread that received an outbound call) count once for
   * *every* channel bucket they touch — 1 for Voice AND 1 for SMS on
   * the same thread. This matches the badges rendered on the card and
   * the filter-matching rule below (selecting either Voice or SMS
   * surfaces that same thread). Because of this, SMS + Chat + Email +
   * Voice can now exceed "All" whenever multi-channel threads exist;
   * that's the honest count, not a bug.
   */
  const sa12ChannelActionCounts = useMemo(() => {
    const counts = { all: 0, sms: 0, chat: 0, email: 0, voice: 0 };
    if (!superAgent12Enabled) return counts;
    // Eli Threads is Eli's territory — Eli handles those conversations, so
    // there's no unread-for-staff work to surface here. The channel filter
    // therefore reports zero across the board when the Eli inbox is active.
    if (sidebarFilter === "sa12-property") return counts;
    // Closed Threads by definition are done, so no unread surface. Reopening
    // a thread is the only way for it to acquire an unread flag again, and
    // reopening moves it back to Open Threads. The Quick Filter should never
    // surface red badges here, even though there's real data behind the counts.
    if (sidebarFilter === "sa12-closed") return counts;
    for (const c of conversations) {
      // Match the "sidebar-filtered but without channel filter" base set.
      // For open inboxes ("all" and "sa12-escalated") we additionally require
      // isPropertyOwnedSA12 so the total mirrors the sidebar badge — because
      // the sidebar badge is defined as "Property-owned + unread." Eli
      // Threads never contribute to the unread count.
      // ("sa12-property" and "sa12-closed" are handled by the early returns
      // above, so they never reach this switch — TypeScript narrows them out.)
      if (sidebarFilter === "all") {
        if (c.status !== "open" || !isPropertyOwnedSA12(c)) continue;
      } else if (sidebarFilter === "sa12-escalated") {
        if (c.status !== "open" || !isPropertyOwnedSA12(c)) continue;
      } else {
        continue;
      }
      // Only include unread threads — matches the sidebar badge.
      // Uses `isEffectivelyUnread`, which is a straight `hasUnread` check:
      // any thread staff has explicitly marked unread contributes here,
      // whether it lives in "Needs Action" or "No Action Needed."
      if (!isEffectivelyUnread(c)) continue;
      counts.all += 1;
      // Increment every channel bucket the thread touches — primary
      // channel plus any additional channels accrued when the thread
      // crossed mediums (e.g. Voice → SMS follow-up). See the header
      // comment on `sa12ChannelActionCounts` for why the parts can
      // now exceed "all".
      const ids = conversationChannelIds(c);
      if (ids.has("sms")) counts.sms += 1;
      if (ids.has("email")) counts.email += 1;
      if (ids.has("chat")) counts.chat += 1;
      if (ids.has("voice")) counts.voice += 1;
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, sidebarFilter, propertyOwnedThreadIds, superAgent12Enabled, eliModeByThreadId]);

  /** Sidebar badge: unread threads in Custom Inbox 1. */
  const customInbox1UnreadCount = useMemo(
    () => conversations.filter((c) => conversationMatchesCustomInbox1(c) && c.hasUnread).length,
    [conversations]
  );

  const sidebarFiltered = useMemo(() => {
    return conversations.filter((c) => {
      // SA 1.2 rule: Resident Chat = resident-portal-only channel, so any thread
      // that would render with a "Lead" persona is filtered out entirely (chat
      // isn't a valid channel for prospects in SA 1.2).
      if (
        superAgent12Enabled &&
        (c.channel || "").toLowerCase() === "resident chat" &&
        personaFromAILabels(c.labels) === "Lead"
      ) {
        return false;
      }
      if (sidebarFilter === "all") {
        // SA 1.2: "All Threads" shows every open thread (union of Property Threads + Eli Threads).
        // Closed threads live in their own inbox.
        if (superAgent12Enabled) {
          return c.status === "open";
        }
        return conversationMatchesAllThreadsInbox(c);
      }
      if (sidebarFilter === "mentions") return conversationHasCurrentUserPrivateNoteMention(c);
      if (sidebarFilter === "unattended") return isConversationUnattended(c);
      if (sidebarFilter === "sa12-escalated") {
        // SA 1.2 "Property Threads" — staff owns because the thread is escalated,
        // staff explicitly took it over, OR the voice thread has a voicemail /
        // missed call that a human has to call back on.
        return c.status === "open" && isPropertyOwnedSA12(c);
      }
      if (sidebarFilter === "sa12-property") {
        // SA 1.2 "Eli Threads" — everything Eli is still handling: open and NOT
        // property-owned. Voicemail / missed-call voice threads are excluded
        // even without escalation, since callbacks are staff work.
        return c.status === "open" && !isPropertyOwnedSA12(c);
      }
      if (sidebarFilter === "sa12-closed") {
        return c.status === "resolved";
      }
      if (typeof sidebarFilter === "object" && sidebarFilter.type === "label") {
        if (sidebarFilter.value === "__escalation__")
          return c.labels.some(isEscalationLabel);
        return c.labels.includes(sidebarFilter.value);
      }
      if (typeof sidebarFilter === "object" && sidebarFilter.type === "property") {
        if (c.property !== sidebarFilter.value) return false;
        if (
          sidebarFilter.value === "Hillside Living" ||
          sidebarFilter.value === "Jamison Apartments"
        ) {
          return satisfiesEscalatedPropertyInboxLabels(c);
        }
        return true;
      }
      if (typeof sidebarFilter === "object" && sidebarFilter.type === "live-ai-jamison")
        return isLiveAiJamisonConversation(c);
      if (typeof sidebarFilter === "object" && sidebarFilter.type === "live-ai-hillside")
        return isLiveAiHillsideConversation(c);
      if (typeof sidebarFilter === "object" && sidebarFilter.type === "custom-inbox-1")
        return conversationMatchesCustomInbox1(c);
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, sidebarFilter, superAgent12Enabled, propertyOwnedThreadIds, eliModeByThreadId]);

  const tabFiltered = useMemo(() => {
    return sidebarFiltered.filter((c) => {
      // SA 1.2 channel sub-filter (applied only when SA 1.2 is on).
      // Uses the union of primary + additional channels so a cross-channel
      // thread (Voice+SMS, SMS+Voice, etc.) surfaces on whichever channel
      // filter matches — the same thread appears under Voice AND under
      // SMS, mirroring the labels rendered on the card.
      if (superAgent12Enabled && sa12ChannelFilter !== "all") {
        const ids = conversationChannelIds(c);
        if (!ids.has(sa12ChannelFilter)) return false;
      }
      // SA 1.2 inline Escalation Quick Filter — only applies inside the
      // Property Threads inbox (where the control is actually rendered).
      // Any other inbox unconditionally passes through, so a stale filter
      // value can't silently hide threads in an inbox where this control is
      // hidden.
      //
      // Escalation state is about "is there an *active* escalation on this
      // thread right now," not "was Eli ever in the loop." Escalations can
      // be resolved while the thread stays open, which flips the thread to
      // Non-Escalated. That happens in two ways:
      //
      //   1. Label-based (DEV-301687 partial resolve flow) — staff picks a
      //      subset of Escalation labels, a `label_activity` row with
      //      `action: "resolved_escalation"` is appended, AND the resolved
      //      labels are removed from `c.labels`. So the label check alone
      //      already handles this case: no active Escalation labels = not
      //      currently escalated.
      //   2. Voice-origin — voicemail / missed-call voice threads. Eli
      //      always picks up the phone first, so the voicemail or
      //      missed-transfer state IS an escalation. But once staff calls
      //      back and the escalation is resolved (a `resolved_escalation`
      //      activity is recorded on the thread), the voice thread flips
      //      to Non-Escalated even though the voicemail / missed_call
      //      message is still in the transcript for reference.
      //
      // "Non-Escalated within Property Threads" therefore includes: threads
      // whose active Escalation labels have all been resolved, voice-origin
      // threads whose voice escalation has been resolved, threads staff
      // explicitly took over (`propertyOwnedThreadIds`), and — when it
      // ships — threads with "AI turned off from the start."
      if (
        superAgent12Enabled &&
        sidebarFilter === "sa12-escalated" &&
        sa12EscalationFilter !== "all"
      ) {
        const hasActiveEscalationLabel = c.labels.some((l) => l.endsWith("Escalation"));
        const hasResolvedEscalationMarker = c.messages.some(
          (m) => m.type === "label_activity" && m.labelActivity?.action === "resolved_escalation",
        );
        // A voice-origin thread is "still escalated" until a
        // `resolved_escalation` activity is stamped on it.
        const hasUnresolvedVoiceEscalation =
          isPropertyOwnedByVoiceOrigin(c) && !hasResolvedEscalationMarker;
        const isEscalated = hasActiveEscalationLabel || hasUnresolvedVoiceEscalation;
        if (sa12EscalationFilter === "escalated" && !isEscalated) return false;
        if (sa12EscalationFilter === "non-escalated" && isEscalated) return false;
      }
      if (inboxTab === "all") return true;
      if (inboxTab === "mine") return c.assignee === MY_INBOX_ASSIGNEE;
      if (inboxTab === "unassigned")
        return c.assignee.startsWith("ELI+") || c.assignee === CONVERSATION_UNASSIGNED_ASSIGNEE;
      return true;
    });
  }, [sidebarFiltered, inboxTab, superAgent12Enabled, sa12ChannelFilter, sa12EscalationFilter, sidebarFilter]);

  const threadListConvoFiltered = useMemo(() => {
    const baseFiltered = tabFiltered.filter((c) => !sa1HiddenConversationIds.has(c.id));
    // SA 1.2 owns escalation filtering via the inline Quick Filter above the
    // thread list — bypass the popover's Conversation Type filter entirely so
    // its default ("only Escalated") doesn't silently hide non-escalated
    // threads when the user has "All" selected in the inline filter.
    if (superAgent12Enabled) return baseFiltered;
    if (threadListConvoTypes.size === 0) return baseFiltered;
    return baseFiltered.filter((c) => {
      if (threadListConvoTypes.has("escalated") && matchesThreadListEscalatedFilter(c)) return true;
      if (threadListConvoTypes.has("liveAi") && matchesThreadListLiveAiNonEscalatedFilter(c)) return true;
      return false;
    });
  }, [tabFiltered, threadListConvoTypes, sa1HiddenConversationIds, superAgent12Enabled]);

  /**
   * SA 1.2 "Action Needed" filter. Gated to super-agent 1.2 mode so it doesn't
   * accidentally scope the classic inbox to a subset that the classic UI has
   * no way to visualize. Empty set = pass-through; any populated set filters
   * to the UNION of the selected action kinds so "both boxes checked" reads
   * naturally as "anything that needs my attention."
   */
  const threadListActionFiltered = useMemo(() => {
    if (!superAgent12Enabled) return threadListConvoFiltered;
    if (threadListActionFilters.size === 0) return threadListConvoFiltered;
    const wantsFollowup = threadListActionFilters.has("followup");
    const wantsEscalation = threadListActionFilters.has("escalation");
    return threadListConvoFiltered.filter((c) => {
      const hasFollowup = hasActiveFollowUpReminder(c);
      const hasEscalation = needsStaffResponse(c) && !hasFollowup;
      if (wantsFollowup && hasFollowup) return true;
      if (wantsEscalation && hasEscalation) return true;
      return false;
    });
  }, [threadListConvoFiltered, threadListActionFilters, superAgent12Enabled]);

  const threadListFiltered = useMemo(() => {
    if (threadListPropertyKeys === null) return threadListActionFiltered;
    return threadListActionFiltered.filter((c) => threadListPropertyKeys.has(c.property));
  }, [threadListActionFiltered, threadListPropertyKeys]);

  const threadListCompletedFiltered = useMemo(() => {
    if (threadListStatusFilters.size === 0) return [];
    return threadListFiltered.filter((c) => {
      if (threadListStatusFilters.has("active") && c.status === "open") return true;
      if (threadListStatusFilters.has("completed") && c.status === "resolved") return true;
      return false;
    });
  }, [threadListFiltered, threadListStatusFilters]);

  const threadListChannelFiltered = useMemo(() => {
    // The Communication Channel filter is hidden in SA 1.2 mode — bypass it
    // in the pipeline too so a stale value can't silently filter threads
    // that the user can't see the control for.
    if (superAgent12Enabled) return threadListCompletedFiltered;
    if (threadListChannels === null) return threadListCompletedFiltered;
    if (threadListChannels.size === 0) return [];
    return threadListCompletedFiltered.filter((c) =>
      conversationMatchesThreadListChannel(c, threadListChannels)
    );
  }, [threadListCompletedFiltered, threadListChannels, superAgent12Enabled]);

  const threadListDateFiltered = useMemo(() => {
    return threadListChannelFiltered.filter((c) =>
      conversationMatchesThreadListDateRange(
        c,
        threadListDateRange,
        threadListCustomDateFrom,
        threadListCustomDateTo
      )
    );
  }, [
    threadListChannelFiltered,
    threadListDateRange,
    threadListCustomDateFrom,
    threadListCustomDateTo,
  ]);

  const filtered = useMemo(() => {
    const base = !searchQuery.trim()
      ? threadListDateFiltered
      : (() => {
    const q = searchQuery.toLowerCase();
          return threadListDateFiltered.filter(
      (c) =>
        c.resident.toLowerCase().includes(q) ||
        c.preview.toLowerCase().includes(q) ||
        c.labels.some((l) => l.toLowerCase().includes(q))
    );
        })();

    // Sort by recency across EVERY mode (SA 1.0, SA 1.2, and default).
    // Historically only SA 1.2 sorted the list — SA 1.0 rendered the raw
    // seed order — but staff reasonably expect newest-first ordering to be
    // universal so a fresh reply always jumps to the top of the visible
    // list. SA 1.2 keeps its Thread Settings → Sorting override so the
    // oldest-first toggle there still flips the direction; every other
    // mode is pinned to newest-first. Sort is stable on the source array;
    // we clone before sorting to avoid mutating memo inputs. Age is
    // derived from the pre-formatted `time` string (e.g. "5m ago").
    const arr = [...base];
    if (superAgent12Enabled && threadSortMode === "oldest") {
      arr.sort((a, b) => parseAgeMinutes(b.time) - parseAgeMinutes(a.time));
    } else {
      arr.sort((a, b) => parseAgeMinutes(a.time) - parseAgeMinutes(b.time));
    }
    return arr;
  }, [threadListDateFiltered, searchQuery, superAgent12Enabled, threadSortMode]);

  const myInboxUnreadCount = useMemo(
    () =>
      sidebarFiltered.filter((c) => c.assignee === MY_INBOX_ASSIGNEE && c.hasUnread).length,
    [sidebarFiltered]
  );

  const searchParams = useSearchParams();
  const initialConvoId = searchParams.get("id");

  const [selectedId, setSelectedId] = useState<string | null>(initialConvoId);

  // Sync `?id=` in the URL → `selectedId` on mount AND on every
  // subsequent URL change. This is what the Entrata global-search
  // "SMS" button relies on when the user is already on
  // `/conversations/` and clicks the row-level SMS action: the
  // top-nav `router.push`es `/conversations/?id=<threadId>`, we pick
  // up the new `id`, and force-select that thread even if it's not
  // in the currently-filtered sidebar list. The right pane's
  // fallback (`filtered.find(...) ?? conversations.find(...)`, see
  // `selected` below) means the thread renders even when a filter
  // like "My Inbox" would otherwise hide it from the left column,
  // so we never need to auto-switch sidebar tabs to make it visible.
  //
  // We intentionally do NOT gate this with a plain "run once" ref
  // — that would keep the effect from firing on subsequent URL
  // pushes and is what caused the SMS button to "click but not
  // switch" once the user had already navigated to this page once.
  // Instead we track the last URL id we synced (`lastSyncedInitialIdRef`)
  // so we only push `initialConvoId` → `selectedId` when the URL
  // param actually *changes*. Without this, `markRead` (called by
  // every thread-list click) mutates the `conversations` reference,
  // this effect re-fires, sees the URL param is still pointing at
  // the *previous* thread, and slams `selectedId` right back —
  // making the right pane feel "stuck" on whatever thread the URL
  // last landed on regardless of what you click. `conversations`
  // stays in the deps so we can catch the case where a URL id
  // shows up before that conversation has finished loading.
  const lastSyncedInitialIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialConvoId) {
      lastSyncedInitialIdRef.current = null;
      return;
    }
    if (lastSyncedInitialIdRef.current === initialConvoId) return;
    if (conversations.some((c) => c.id === initialConvoId)) {
      setSelectedId(initialConvoId);
      lastSyncedInitialIdRef.current = initialConvoId;
    }
  }, [initialConvoId, conversations]);

  // Independent fallback: keep `selectedId` valid against the current
  // filter / conversation set. Doesn't touch selections that came in
  // via `?id=` because those threads always exist in `conversations`,
  // so `idStillValid` short-circuits the clobber path below.
  useEffect(() => {
    if (filtered.length > 0 && (!selectedId || !filtered.find((c) => c.id === selectedId))) {
      const idStillValid = Boolean(selectedId && conversations.some((c) => c.id === selectedId));
      if (!idStillValid) {
        setSelectedId(filtered[0].id);
      }
    } else if (filtered.length === 0) {
      if (!selectedId || !conversations.some((c) => c.id === selectedId)) {
        setSelectedId(null);
      }
    }
  }, [filtered, selectedId, conversations]);

  // SA 1.2: when the user clicks an inbox in the sidebar (Open Threads,
  // Property Threads, Eli Threads, Closed Threads), auto-select the first
  // thread in that inbox so the conversation panel opens on the right
  // immediately — no extra click required. `prevSidebarFilterRef` (declared
  // near the sidebar-state block above) gates this to actual sidebar
  // transitions so a `filtered` change from a resolved thread or a sort
  // toggle doesn't hijack the current selection. SA 1.0 preserves its
  // existing behavior of keeping the current selection until it falls out
  // of the list.
  useEffect(() => {
    if (!superAgent12Enabled) {
      prevSidebarFilterRef.current = sidebarFilter;
      return;
    }
    if (prevSidebarFilterRef.current === sidebarFilter) return;
    prevSidebarFilterRef.current = sidebarFilter;
    if (filtered.length > 0) {
      setSelectedId(filtered[0].id);
    } else {
      setSelectedId(null);
    }
  }, [sidebarFilter, superAgent12Enabled, filtered]);

  const selected: ConversationItem | null = useMemo(() => {
    if (selectedId) {
      const match =
        filtered.find((c) => c.id === selectedId) ??
        conversations.find((c) => c.id === selectedId) ??
        null;
      if (match) return match;
    }
    // Fallback: if a NEW SMS/Email is being composed (no real thread yet)
    // and staff clicks the recipient name to open the Entrata profile
    // curtain, we still need a `ConversationItem` shape for the curtain
    // to render — property, unit, etc. So synthesize a lightweight item
    // from the pending compose recipient. The right pane always prefers
    // `pendingSmsCompose` / `pendingEmailCompose` over `selected` when
    // rendering, so this fallback never leaks into the main pane.
    const pending = pendingSmsCompose ?? pendingEmailCompose;
    if (pending) {
      const channel = pendingSmsCompose ? "SMS" : "Email";
      const synthetic: ConversationItem = {
        id: `__pending_${channel.toLowerCase()}_${pending.id}__`,
        resident: pending.name,
        unit: pending.bldgUnit === "-" ? null : pending.bldgUnit,
        preview: "",
        agent: "None",
        time: "just now",
        contactType: pending.type === "Resident" ? "Resident" : "Lead",
        property: pending.property,
        channel,
        assignee: "Abe Kashiwagi",
        labels: [pending.type === "Resident" ? "Resident" : "Lead"],
        status: "open",
        hasUnread: false,
        messages: [],
      };
      return synthetic;
    }
    return null;
  }, [selectedId, filtered, conversations, pendingSmsCompose, pendingEmailCompose]);

  // Safety net: when `selectedId` *changes* to a different real
  // conversation (URL nav, sidebar-filter auto-select, thread-list click,
  // etc.), dismiss any stale inline compose slot so the newly-selected
  // thread wins the right pane. Individual click handlers already clear
  // `pendingSmsCompose` / `pendingEmailCompose`, but this catches every
  // other path — without it, once staff opens an inline SMS/Email
  // composer, the right pane stays pinned to that recipient even after
  // clicking a different thread. We compare against the previous
  // `selectedId` so this doesn't fire when a pending compose is *newly*
  // set on top of an unchanged `selectedId` (the compose-from-search
  // flow) — that path deliberately shows the composer.
  const prevSelectedIdForPendingRef = useRef<string | null>(selectedId);
  useEffect(() => {
    const prev = prevSelectedIdForPendingRef.current;
    const cur = selectedId;
    prevSelectedIdForPendingRef.current = cur;
    if (!cur || cur === prev) return;
    if (!pendingSmsCompose && !pendingEmailCompose) return;
    if (!conversations.some((c) => c.id === cur)) return;
    setPendingSmsCompose(null);
    setPendingEmailCompose(null);
  }, [
    selectedId,
    conversations,
    pendingSmsCompose,
    pendingEmailCompose,
    setPendingSmsCompose,
    setPendingEmailCompose,
  ]);

  const linkedByEscalation = useMemo(() => {
    if (!selected?.escalationId) return [];
    return getLinkedConversationsByEscalation(conversations, selected.id, selected.escalationId);
  }, [conversations, selected?.id, selected?.escalationId]);

  const [linkedExpanded, setLinkedExpanded] = useState(false);

  const selectedEmailRouting =
    selected?.channel === "Email"
      ? getEmailThreadRoutingAddresses(selected.resident, selected.property)
      : null;

  // scroll to bottom on message change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [selected?.messages.length]);

  const scrollToEscalationLabel = useCallback((label: string) => {
    if (!scrollRef.current) return;
    const el = scrollRef.current.querySelector(
      `[data-escalation-label="${CSS.escape(label)}"]`
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-orange-400", "ring-offset-2");
      setTimeout(() => el.classList.remove("ring-2", "ring-orange-400", "ring-offset-2"), 1500);
    }
  }, []);

  // Clear escalation error when switching conversations (but preserve selections for super agent)
  const superAgentSelectionsRef = useRef<Map<string, Set<string>>>(new Map());
  const previousSelectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    setEscalationError(false);
    if (selectedId && (isSuperAgentDemoThread(selectedId) || isSuperAgent1DemoThread(selectedId))) {
      const saved = superAgentSelectionsRef.current.get(selectedId);
      if (saved && saved.size > 0) {
        setSelectedEscalationTypes(saved);
      } else {
        setSelectedEscalationTypes(new Set());
      }
    } else {
      setSelectedEscalationTypes(new Set());
    }
  }, [selectedId]);

  // --- Chat input ---
  const [inputMode, setInputMode] = useState<"message" | "private_note">("message");
  const [draft, setDraft] = useState("");
  /**
   * Composer auto-translate. When on and the selected thread has a detected
   * non-English language, the draft is treated as English and translated to the
   * thread's language on send. A live preview shows the translated payload under
   * the composer so staff can sanity-check before hitting Send.
   */
  const [autoTranslateReply, setAutoTranslateReply] = useState(true);
  /**
   * Translation demo: per-conversation "view in English" flag. When a conversation
   * ID is in this set, every bubble in that thread renders its English equivalent
   * (staff drafts + resident translations) instead of the original-language text.
   * Toggled from a single button in the conversation header — no more per-bubble
   * clicks. Scoped per-conversation so switching threads doesn't leak state.
   */
  const [viewInEnglishIds, setViewInEnglishIds] = useState<Set<string>>(new Set());
  const isViewingInEnglish = !!selected && viewInEnglishIds.has(selected.id);
  const toggleViewInEnglish = useCallback(() => {
    if (!selected) return;
    const id = selected.id;
    setViewInEnglishIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [selected]);

  /**
   * Email composer body prefix: two blank lines + property/staff signature. Staff types their
   * reply at the top of the textarea; the signature stays editable inline so they can tweak or
   * remove it as needed. Cursor is parked at position 0 after the fill so typing lands above
   * the signature block.
   */
  const buildEmailComposerSignatureDraft = useCallback(
    (convo: ConversationItem | null): string => {
      if (!convo || convo.channel !== "Email") return "";
      const sig = staffEmailSignatureForConversation(convo, humanNameSet, humanMembers);
      if (!sig) return "";
      return `\n\n${sig}`;
    },
    [humanNameSet, humanMembers]
  );

  /** Parks the composer caret at position 0 so the next keystroke lands above the signature. */
  const parkCaretAtStart = useCallback(() => {
    requestAnimationFrame(() => {
      const el = chatTextareaRef.current;
      if (!el) return;
      el.selectionStart = 0;
      el.selectionEnd = 0;
      el.scrollTop = 0;
    });
  }, []);

  /**
   * Called from handleSend after a message goes out. Clears the draft and, for Email + Message
   * conversations, immediately re-seeds the signature so staff can start typing the next reply
   * above it without having to reopen the thread.
   */
  const resetComposerAfterSend = useCallback(
    (convo: ConversationItem | null, mode: "message" | "private_note") => {
      const seed = mode === "message" ? buildEmailComposerSignatureDraft(convo) : "";
      setDraft(seed);
      if (seed) parkCaretAtStart();
    },
    [buildEmailComposerSignatureDraft, parkCaretAtStart]
  );
  const [selectedEscalationTypes, setSelectedEscalationTypes] = useState<Set<string>>(new Set());
  const [privateNoteModalOpen, setPrivateNoteModalOpen] = useState(false);
  const [privateNoteModalDraft, setPrivateNoteModalDraft] = useState("");
  const [escalationError, setEscalationError] = useState(false);
  const [escalationSummaryOpen, setEscalationSummaryOpen] = useState(false);
  const [contextDetailOpenIdx, setContextDetailOpenIdx] = useState<number | null>(null);
  const [escalationPickerOpen, setEscalationPickerOpen] = useState(false);
  const [escalationPickerSelections, setEscalationPickerSelections] = useState<Set<string>>(new Set());
  const [sa1ResolvePickerOpen, setSa1ResolvePickerOpen] = useState(false);
  const [sa1ResolveSelections, setSa1ResolveSelections] = useState<Set<string>>(new Set());
  const [phoneDocumentKind, setPhoneDocumentKind] = useState<PhoneDocumentKind | null>(null);
  const [phoneDocumentNotes, setPhoneDocumentNotes] = useState("");
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolveModalAction, setResolveModalAction] = useState<"general" | "incoming" | "outgoing">("general");
  const [resolveModalNotes, setResolveModalNotes] = useState("");
  /**
   * SA 1.2: staff's pick from the Resolve dialog's "What should Eli do
   * next?" section. Only surfaced when SA 1.2 is on AND the thread has
   * active AI escalations (otherwise Eli mode is already whatever staff
   * wants). Default "resume" mirrors the safe "get back to normal"
   * behavior; "off-indefinite" is the deliberate opt-out that keeps Eli
   * from picking the thread back up when the resident messages again.
   */
  const [resolveModalEliChoice, setResolveModalEliChoice] = useState<
    "resume" | "off-indefinite"
  >("resume");
  /**
   * SA 1.2: which escalation labels staff is resolving in this Resolve
   * dialog session. Only rendered as a picker when the thread carries
   * more than one active AI escalation — otherwise we auto-resolve the
   * single escalation on Save. Seeded from the thread's active
   * escalations at open time (all selected by default) so the picker
   * behaves as "opt-out any you don't want to resolve." Mirrors SA 1.0's
   * `sa1ResolveSelections` semantics.
   */
  const [resolveModalEscalationsToResolve, setResolveModalEscalationsToResolve] =
    useState<Set<string>>(new Set());
  const [profileMainTab, setProfileMainTab] = useState("Financial");
  const [residentProfileActivity, setResidentProfileActivity] = useState<
    Record<string, ResidentProfileActivityEntry[]>
  >({});
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null);
  /** Entrata profile “current inbox” composer — same draft/inputMode as main, separate ref for @mentions. */
  const profilePanelInboxComposerRef = useRef<HTMLTextAreaElement>(null);
  const [privateNoteMention, setPrivateNoteMention] = useState<PrivateNoteMentionActive | null>(null);
  const [privateNoteMentionIndex, setPrivateNoteMentionIndex] = useState(0);

  /**
   * Seed the composer on conversation or mode switch:
   *   - Email + Message → editable signature (staff types above it)
   *   - SMS / Voice / private note → empty draft
   * Signatures must never leak onto SMS. We intentionally do NOT re-seed when the
   * user clears the draft mid-conversation — if they deleted the signature on
   * purpose, it stays gone until they change threads or hit send.
   */
  useEffect(() => {
    if (!selected) return;
    if (inputMode !== "message" || selected.channel !== "Email") {
      setDraft("");
      return;
    }
    const seed = buildEmailComposerSignatureDraft(selected);
    setDraft(seed);
    if (seed) parkCaretAtStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on conversation / mode switch
  }, [selectedId, inputMode]);

  const privateNoteMentionFiltered = useMemo(() => {
    if (!privateNoteMention) return [];
    const q = privateNoteMention.query.toLowerCase();
    return privateNoteMentionCandidates
      .filter(
        (c) =>
          q === "" ||
          c.name.toLowerCase().includes(q) ||
          c.handle.includes(q)
      )
      .slice(0, 8);
  }, [privateNoteMention, privateNoteMentionCandidates]);

  useEffect(() => {
    setPrivateNoteMentionIndex(0);
  }, [privateNoteMention?.triggerIndex, privateNoteMention?.query]);

  useEffect(() => {
    if (privateNoteMentionFiltered.length === 0) return;
    setPrivateNoteMentionIndex((i) => Math.min(i, privateNoteMentionFiltered.length - 1));
  }, [privateNoteMentionFiltered.length]);

  const [newLabelText, setNewLabelText] = useState("");
  const [addLabelOpen, setAddLabelOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  // SA 1.2 Testing mode: opens the Trace panel for the currently-
  // selected thread. Rendered from the session-id chip in the
  // conversation header — see `<EliTraceModal>` at the bottom of the
  // page.
  const [traceModalOpen, setTraceModalOpen] = useState(false);
  /**
   * SA 1.2 Testing mode: per-thread state of the "quality analysis"
   * that the session-id chip kicks off. The analysis is imagined to be
   * a separate rating tool the orchestrator hands off to — we just
   * simulate the round-trip with a short delay before flipping to
   * `loaded`. States:
   *   • missing entry    — never clicked → chip shows the session id only
   *   • `loading`        — analysis in flight → chip shows session id + spinner
   *   • `loaded`         — analysis complete → chip shows session id + score
   *                        pill; modal banner shows the full rating
   */
  const [ratingAnalysisByThread, setRatingAnalysisByThread] = useState<
    Map<string, "loading" | "loaded">
  >(() => new Map());
  /**
   * When a conversation has multiple resident profiles (see `additionalResidents`) and
   * staff picks one from the "See Records" dropdown, the profile curtain displays that
   * resident instead of `selected.resident`. Cleared when the modal closes.
   */
  const [profileResidentOverride, setProfileResidentOverride] = useState<string | null>(null);
  const [multiProfilePickerOpen, setMultiProfilePickerOpen] = useState(false);
  const [emailAttachmentPreview, setEmailAttachmentPreview] = useState<EmailAttachmentRef | null>(null);
  const [bulkEmailModal, setBulkEmailModal] = useState<BulkOutboundEmailRef | null>(null);
  const [threadsPanelOpen, setThreadsPanelOpen] = useState(false);
  /** When opening the Entrata profile, show the current inbox thread in the right panel (not the mock thread list). */
  const [profilePanelInboxOpen, setProfilePanelInboxOpen] = useState(false);
  const [threadsFilter, setThreadsFilter] = useState<"active" | "closed">("active");
  const [openThreadIdx, setOpenThreadIdx] = useState<number | null>(null);
  const [threadInputMode, setThreadInputMode] = useState<"message" | "private_note">("message");
  const [threadDraft, setThreadDraft] = useState("");
  const [newThreadDialogOpen, setNewThreadDialogOpen] = useState(false);
  const [newThreadFromSelection, setNewThreadFromSelection] = useState("");
  const [newThreadOutbound, setNewThreadOutbound] = useState<{
    channel: "SMS" | "Email";
    /**
     * Sender vanity number (SMS) / property email (Email). Optional
     * because some entry paths (e.g. click-through from the top-level
     * SMS/Email composer's recipient name) haven't asked the user to
     * pick a channel yet — for those cases the "From" panel is hidden
     * and the outbound message is treated as coming from whatever the
     * previous composer would have sent from.
     */
    from?: string;
    propertyName: string;
  } | null>(null);
  const [newThreadSubject, setNewThreadSubject] = useState("");
  const [newThreadSubjectError, setNewThreadSubjectError] = useState(false);
  /** Staff / private-note messages sent from the Entrata profile thread composer (prototype; not persisted). */
  const [entSideSentByThreadKey, setEntSideSentByThreadKey] = useState<
    Record<
      string,
      {
        role: "staff";
        text: string;
        timestamp: string;
        privateNote?: boolean;
        emailSignature?: string;
      }[]
    >
  >({});
  const [threadAssignments, setThreadAssignments] = useState<Record<number, string | null>>({});

  const THREAD_AGENTS = [
    "Hillary Avates",
    "Omar Bates",
    "Tiffany Courtland",
    "Diego Diaz",
    "Travis Eggers",
  ];

  const assignThread = (globalIdx: number, name: string | null) => {
    setThreadAssignments((prev) => ({ ...prev, [globalIdx]: name }));
    if (!selected) return;
    if (name === null) {
      updateAssignee(selected.id, UNASSIGN_CONVERSATION_VALUE, MY_INBOX_ASSIGNEE);
    } else if (name !== selected.assignee) {
      updateAssignee(selected.id, name, MY_INBOX_ASSIGNEE);
    }
  };
  const [aiActivated, setAiActivated] = useState(true);
  const [reactivationDate, setReactivationDate] = useState<Date | null>(null);
  const [noLimit, setNoLimit] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [phoneOpt, setPhoneOpt] = useState("opt-in");
  const [emailOpt, setEmailOpt] = useState("opt-in");

  const sunValleyProfileThreads = useMemo((): EntrataProfileThreadRow[] => {
    return [
    {
      property: "Sun Valley", type: "Facilities", channel: "SMS", status: "active", assignee: "Court White",
      labels: ["Resident", "Maintenance AI", "Work Order"],
      messages: [
        { role: "user" as const, text: "Hi, my kitchen sink has been leaking for two days now. Can someone come take a look?", timestamp: "Sep 15 2025 · 3:12pm" },
        { role: "agent" as const, text: "I'm sorry to hear that! I've submitted a work order for your kitchen sink leak. A maintenance technician will reach out to schedule a time.", timestamp: "Sep 15 2025 · 3:14pm" },
        { role: "user" as const, text: "Thank you. Is there anything I should do in the meantime?", timestamp: "Sep 15 2025 · 3:15pm" },
        { role: "agent" as const, text: "If it's a slow drip, placing a bucket underneath should be fine. If it worsens, please call our emergency maintenance line.", timestamp: "Sep 15 2025 · 3:16pm" },
      ],
    },
    {
      property: "Sun Valley", type: "Office", channel: "SMS", status: "active", assignee: null,
      labels: ["Resident", "Payments AI"],
      messages: [
        { role: "user" as const, text: "I noticed a late fee on my account but I paid rent on time. Can you look into this?", timestamp: "Sep 14 2025 · 10:05am" },
        { role: "staff" as const, text: "Let me pull up your payment history. One moment please.", timestamp: "Sep 14 2025 · 10:08am" },
        { role: "staff" as const, text: "It looks like your payment was processed on the 4th but didn't clear until the 6th due to a bank delay. I've removed the late fee from your ledger.", timestamp: "Sep 14 2025 · 10:12am" },
        { role: "user" as const, text: "Great, thank you for fixing that so quickly!", timestamp: "Sep 14 2025 · 10:13am" },
      ],
    },
    {
      property: "Sun Valley", type: "Facilities", channel: "SMS", status: "active", assignee: "Jane Doe",
      labels: ["Resident", "Maintenance AI", "Work Order"],
      messages: [
        { role: "user" as const, text: "The A/C in my unit isn't blowing cold air. It's been warm all day.", timestamp: "Sep 13 2025 · 1:30pm" },
        { role: "agent" as const, text: "I'm sorry about the discomfort. I've created a work order for your A/C unit. Our maintenance team will be in touch to schedule a visit.", timestamp: "Sep 13 2025 · 1:32pm" },
        { role: "user" as const, text: "Any idea when they can come? It's really hot in here.", timestamp: "Sep 13 2025 · 1:33pm" },
        { role: "staff" as const, text: "Hi, this is Jane from maintenance. I can come by tomorrow between 9-11am. Does that work for you?", timestamp: "Sep 13 2025 · 2:15pm" },
        { role: "user" as const, text: "Yes, that works. Thank you Jane!", timestamp: "Sep 13 2025 · 2:17pm" },
      ],
    },
    {
      property: "Sun Valley", type: "Leasing", channel: "Email", status: "closed", assignee: "Court White",
      labels: ["Resident", "Renewals AI", "Renewal Offer"],
      messages: [
        { role: "user" as const, text: "Hi, I'm interested in renewing my lease. What are the renewal options?", timestamp: "Aug 20 2025 · 9:00am" },
        { role: "agent" as const, text: "Great to hear you'd like to stay! We have 6-month and 12-month renewal options available. I'll have our leasing team send over the details.", timestamp: "Aug 20 2025 · 9:03am" },
        { role: "staff" as const, text: "Hi! I've attached the renewal offer to your resident portal. The 12-month option includes a rate lock. Let me know if you have questions.", timestamp: "Aug 20 2025 · 11:30am" },
        { role: "user" as const, text: "I'll go with the 12-month renewal. Thanks!", timestamp: "Aug 21 2025 · 8:45am" },
        { role: "staff" as const, text: "Wonderful! Your renewal has been processed. Welcome back for another year!", timestamp: "Aug 21 2025 · 9:10am" },
      ],
    },
    {
      property: "Sun Valley", type: "Office", channel: "SMS", status: "closed", assignee: "Court White",
      labels: ["Resident", "Payments AI"],
      messages: [
        { role: "user" as const, text: "I need a copy of my payment history for the last 6 months for my tax filing.", timestamp: "Aug 10 2025 · 2:00pm" },
        { role: "staff" as const, text: "Of course! I've generated a ledger statement for the past 6 months and uploaded it to your resident portal under Documents.", timestamp: "Aug 10 2025 · 2:15pm" },
        { role: "user" as const, text: "Perfect, I see it. Thank you!", timestamp: "Aug 10 2025 · 2:20pm" },
      ],
    },
    {
      property: "Sun Valley", type: "Facilities", channel: "SMS", status: "closed", assignee: "Jane Doe",
      labels: ["Resident", "Work Order"],
      messages: [
        { role: "user" as const, text: "The garage gate clicker stopped working again.", timestamp: "Jul 18 2025 · 4:42pm" },
        { role: "staff" as const, text: "Sorry about that. I've reprogrammed your remote and tested it just now — please let me know if it gives you any more trouble.", timestamp: "Jul 18 2025 · 5:01pm" },
        { role: "user" as const, text: "Working great, thank you!", timestamp: "Jul 18 2025 · 5:10pm" },
      ],
    },
    {
      property: "Sun Valley", type: "Leasing", channel: "Email", status: "closed", assignee: "Mark Lee",
      labels: ["Resident", "Leasing AI"],
      messages: [
        { role: "user" as const, text: "Following up on the parking permit transfer to my new vehicle.", timestamp: "Jun 30 2025 · 10:15am" },
        { role: "staff" as const, text: "Got it — transferred the permit to your new plate and emailed the updated decal info.", timestamp: "Jun 30 2025 · 11:02am" },
      ],
    },
    {
      property: "Sun Valley", type: "Office", channel: "SMS", status: "closed", assignee: "Court White",
      labels: ["Resident"],
      messages: [
        { role: "user" as const, text: "Can you confirm the office is closed on the Fourth of July?", timestamp: "Jun 15 2025 · 9:30am" },
        { role: "staff" as const, text: "Yes, the leasing office will be closed July 4th and reopen on the 5th at 9am.", timestamp: "Jun 15 2025 · 9:45am" },
      ],
    },
    ];
  }, []);

  const profilePanelThreads: EntrataProfileThreadRow[] = useMemo(() => {
    if (selected?.bulkOutboundEmail && selected.channel === "Email") {
      const linkedThread: EntrataProfileThreadRow = {
        property: selected.property,
        type: "Bulk email",
        channel: "Email",
        status: "active",
        assignee: selected.assignee,
        labels: selected.labels,
        bulkOutboundEmail: selected.bulkOutboundEmail,
        emailSubject: selected.emailSubject,
        messages: selected.messages
          .filter((m) => m.type === undefined || m.type === "message")
          .map((m) => ({
            role:
              m.role === "resident"
                ? ("user" as const)
                : m.role === "agent"
                  ? ("agent" as const)
                  : ("staff" as const),
            text: m.text,
            timestamp: m.timestamp ?? "",
            ...(m.emailSignature ? { emailSignature: m.emailSignature } : {}),
          })),
      };
      return [linkedThread, ...sunValleyProfileThreads];
    }
    return [...sunValleyProfileThreads];
  }, [selected]);

  const getThreadAssignee = (globalIdx: number) =>
    globalIdx in threadAssignments
      ? threadAssignments[globalIdx]
      : profilePanelThreads[globalIdx]?.assignee ?? null;

  const allLabels = useMemo(() => {
    const set = new Set<string>();
    conversations.forEach((c) => c.labels.forEach((l) => set.add(l)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [conversations]);

  const newThreadPropertyFromOptions = useMemo(
    () => (selected ? getPropertyFromChannelOptionsForProperty(selected.property) : []),
    [selected]
  );

  useEffect(() => {
    if (!newThreadFromSelection) return;
    if (!newThreadPropertyFromOptions.some((o) => o.id === newThreadFromSelection)) {
      setNewThreadFromSelection("");
    }
  }, [newThreadPropertyFromOptions, newThreadFromSelection]);

  const handleCreateNewThreadFromDialog = () => {
    const opt = newThreadPropertyFromOptions.find((o) => o.id === newThreadFromSelection);
    if (!opt) return;
    setNewThreadOutbound({
      channel: opt.channel,
      from: opt.from,
      propertyName: opt.propertyName,
    });
    setProfilePanelInboxOpen(false);
    setOpenThreadIdx(-1);
    setNewThreadDialogOpen(false);
    setNewThreadFromSelection("");
  };

  const applyPrivateNoteMention = (
    candidate: (typeof privateNoteMentionCandidates)[number],
    el: HTMLTextAreaElement | null = chatTextareaRef.current
  ) => {
    if (!el) return;
    const caret = el.selectionStart ?? el.value.length;
    const m = getActivePrivateNoteMention(el.value, caret);
    if (!m) return;
    const before = el.value.slice(0, m.triggerIndex);
    const after = el.value.slice(caret);
    const insert = `@${candidate.handle} `;
    const next = before + insert + after;
    setDraft(next);
    setPrivateNoteMention(null);
    const pos = before.length + insert.length;
    queueMicrotask(() => {
      el.setSelectionRange(pos, pos);
      el.focus();
    });
  };

  const syncPrivateNoteMentionFromTextarea = (el: HTMLTextAreaElement) => {
    if (inputMode !== "private_note") {
      setPrivateNoteMention(null);
      return;
    }
    const caret = el.selectionStart ?? el.value.length;
    setPrivateNoteMention(getActivePrivateNoteMention(el.value, caret));
  };

  const handleComposerDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    syncPrivateNoteMentionFromTextarea(e.target);
  };

  const openPrivateNoteModal = () => {
    setInputMode("message");
    setPrivateNoteMention(null);
    setPrivateNoteModalDraft("");
    setPrivateNoteModalOpen(true);
  };

  const submitPrivateNoteFromModal = () => {
    if (!selected || !privateNoteModalDraft.trim()) return;
    const notes = privateNoteModalDraft.trim();
    const timestamp = new Date()
      .toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZoneName: "short",
      })
      .replace(",", " ·");
    addMessage(selected.id, {
      role: "staff",
      text: notes,
      timestamp,
      type: "private_note",
      privateNoteAuthor: MY_INBOX_ASSIGNEE,
    });
    const entry: ResidentProfileActivityEntry = {
      id: `pa-${Date.now()}`,
      kind: "other",
      notes,
      actor: MY_INBOX_ASSIGNEE,
      timestamp,
      conversationId: selected.id,
    };
    setResidentProfileActivity((prev) => ({
      ...prev,
      [selected.resident]: [entry, ...(prev[selected.resident] ?? [])],
    }));
    setPrivateNoteModalDraft("");
    setPrivateNoteModalOpen(false);
    toast.success("Private note saved to conversation and profile Activity Log");
  };

  /**
   * True only when there's real, sendable content in the composer.
   * - SMS / Voice / private note → must have any non-whitespace text.
   * - Email + message → the pre-seeded signature block doesn't count; something
   *   must have been typed above (or in place of) the `-- ` signature marker,
   *   otherwise the "send" is just the signature and gets blocked.
   */
  const hasSendableDraft = useMemo(() => {
    if (!draft.trim()) return false;
    if (selected?.channel === "Email" && inputMode === "message") {
      return stripEmailSignatureFromNonEmailDraft(draft).trim().length > 0;
    }
    return true;
  }, [draft, selected?.channel, inputMode]);

  /**
   * SA 1.2: apply a new Eli mode to a thread and log the transition on the
   * timeline. Centralized so every entry point (post-send prompt, thread
   * AI On/Off popover, keyboard shortcuts, etc.) uses the same shape.
   */
  const applyEliModeChange = useCallback(
    (
      threadId: string,
      mode: EliMode,
      source: "prompt" | "manual" | "resolve" | "auto-resume" = "manual",
    ) => {
      setEliMode(threadId, mode);
      const activityMode =
        mode.kind === "on"
          ? { kind: "on" as const }
          : { kind: "off" as const, policy: mode.policy };
      addMessage(threadId, {
        role: "staff",
        text: "",
        timestamp: new Date()
          .toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZoneName: "short",
          })
          .replace(",", " ·"),
        type: "thread_activity",
        threadActivity: {
          kind: "eli_mode_change",
          mode: activityMode,
          source,
          actor: source === "auto-resume" ? "System" : MY_INBOX_ASSIGNEE,
        },
      });
    },
    [setEliMode, addMessage],
  );

  /**
   * SA 1.2 auto-resume: when a thread is Eli-off with policy
   * "until-resolved" AND has no active AI escalations, flip Eli back to
   * On. This backs the modal option "Turn off Eli — Until escalation is
   * resolved" — the moment the last escalation on the thread gets
   * resolved (regardless of which path triggered the resolution — a
   * Resolve dialog, another Eli Prompt "resolve" pick, or a manual
   * label removal from the header chip), Eli picks the thread back up.
   * Threads that were flipped off with policy "indefinite" (e.g. from
   * the Resolve dialog's "Keep Eli off indefinitely" option) are
   * *excluded* from auto-resume — they only come back on via a manual
   * flip from the AI On/Off popover. Runs whenever the items list or
   * the eli-mode map changes.
   */
  useEffect(() => {
    if (!superAgent12Enabled) return;
    const toResume: string[] = [];
    for (const c of conversations) {
      const mode = eliModeByThreadId[c.id];
      if (!mode || mode.kind !== "off") continue;
      if (mode.policy !== "until-resolved") continue;
      if (hasActiveAiEscalation(c)) continue;
      toResume.push(c.id);
    }
    if (toResume.length === 0) return;
    for (const id of toResume) {
      applyEliModeChange(id, { kind: "on" }, "auto-resume");
    }
  }, [conversations, eliModeByThreadId, superAgent12Enabled, applyEliModeChange]);

  const handleSend = () => {
    if (!selected) return;
    if (!hasSendableDraft) {
      if (selected.channel === "Email" && inputMode === "message" && draft.trim()) {
        toast.error("Type a message above your signature before sending.");
      }
      return;
    }
    if (isSuperAgentDemoThread(selected.id) && aiActivated && inputMode === "message" && selectedEscalationTypes.size === 0) {
      setEscalationError(true);
      return;
    }
    // SA 1.0 conversations with active escalations: staff must pick which escalation(s) they're
    // replying to before the message can go out. This mirrors the SA 2.0 gate so it's consistent.
    if (
      isSuperAgent1DemoThread(selected.id) &&
      inputMode === "message" &&
      selected.labels.some((l) => l.includes("Escalation")) &&
      selectedEscalationTypes.size === 0
    ) {
      setEscalationError(true);
      return;
    }
    // SA 1.2 conversations with active escalations: same gate as SA 1.0 —
    // staff picks which escalation(s) they're replying to before the
    // message goes out. The picker + summary UI in the composer is shared
    // with SA 1.0. This gate runs BEFORE the Eli-Prompt pre-send gate so
    // the flow is: pick escalation → click Send → pick Eli behavior →
    // reply commits.
    if (
      superAgent12Enabled &&
      !isSuperAgent1DemoThread(selected.id) &&
      inputMode === "message" &&
      selected.labels.some((l) => l.includes("Escalation")) &&
      selectedEscalationTypes.size === 0
    ) {
      setEscalationError(true);
      return;
    }
    setEscalationError(false);
    const now = new Date();
    const timestamp = now.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
    // Composer flow: the signature is edited inline in the draft body, so we no longer add it
    // as a separate emailSignature field on the outbound message. Non-composer flows (bulk email,
    // Entrata profile side panel) still populate this field explicitly where needed.
    const emailSignature: string | undefined = undefined;
    // "Reply is answering these escalations" tag on the outbound message.
    // Rendered on SA 1.0 threads today; SA 1.2 threads now use the same
    // picker so we attach the same field for parity with the SA 1.0
    // timeline treatment.
    const sa1ReplyToEscalations =
      (isSuperAgent1DemoThread(selected.id) ||
        (superAgent12Enabled && !isSuperAgentDemoThread(selected.id))) &&
      inputMode === "message" &&
      selectedEscalationTypes.size > 0
        ? Array.from(selectedEscalationTypes)
        : undefined;
    // Translation demo: when auto-translate is on for a non-English thread + Message
    // mode, translate the English draft into the thread's language before it goes out.
    // The English draft is preserved as `originalText` so the reviewer can flip back.
    const rawDraft =
      selected.channel === "Email"
        ? draft.trim()
        : stripEmailSignatureFromNonEmailDraft(draft).trim();
    if (!rawDraft) return;
    const detectedLanguage =
      translationEnabled && inputMode === "message"
        ? conversationDetectedLanguage(selected)
        : null;
    const shouldTranslateReply = !!(detectedLanguage && autoTranslateReply);
    const outboundText = shouldTranslateReply
      ? translateStaffDraftTo(rawDraft, detectedLanguage as string)
      : rawDraft;
    const stagedOutboundMessage: Parameters<typeof addMessage>[1] = {
      role: "staff",
      text: outboundText,
      timestamp,
      type: inputMode,
      ...(emailSignature ? { emailSignature } : {}),
      ...(inputMode === "private_note" ? { privateNoteAuthor: MY_INBOX_ASSIGNEE } : {}),
      ...(sa1ReplyToEscalations ? { replyToEscalations: sa1ReplyToEscalations } : {}),
      ...(shouldTranslateReply
        ? { language: detectedLanguage as string, originalText: rawDraft }
        : {}),
    };

    // SA 1.2 pre-send gate: any thread where Eli is still on and the Eli
    // Prompt automation is enabled buffers the outbound reply and opens
    // the Eli Prompt modal instead of committing the send. The modal
    // couples the "how does Eli behave next" decision to the send itself
    // so staff always makes a conscious hand-off call before jumping into
    // an Eli-managed thread — whether or not the thread carries an active
    // AI Escalation label. The modal's copy + commit path (below) adapts
    // its wording and post-send bookkeeping based on whether the thread
    // has an active escalation to resolve; when there's nothing to
    // resolve, the "keep Eli on" option simply keeps Eli responding and
    // skips the resolve-activity stamp. The cadence stamp is only
    // written when they pick an option (i.e., when they actually send),
    // so cancelling re-opens the modal on the next Send attempt. Private
    // notes skip the gate.
    if (
      superAgent12Enabled &&
      inputMode === "message" &&
      eliPromptEnabled &&
      eliModeFor(selected.id).kind === "on"
    ) {
      const lastShown = eliPromptShownAt[selected.id];
      const cadenceMs = eliPromptCadenceMinutes * 60_000;
      const withinCadenceWindow =
        typeof lastShown === "number" && Date.now() - lastShown < cadenceMs;
      if (!withinCadenceWindow) {
        // Resolve the initial radio selection from the workspace default,
        // then fall back to the other enabled option so we never seed the
        // modal with a choice whose card isn't rendered.
        const defaultOptionEnabled =
          (eliPromptDefaultOption === "off" && promptOptionOffEnabled) ||
          (eliPromptDefaultOption === "on" && promptOptionKeepOnEnabled);
        const fallbackChoice: "off" | "on" | null = promptOptionKeepOnEnabled
          ? "on"
          : promptOptionOffEnabled
            ? "off"
            : null;
        const initialChoice = defaultOptionEnabled
          ? eliPromptDefaultOption
          : fallbackChoice;
        setEliPromptPendingSend({
          threadId: selected.id,
          inputMode,
          payload: stagedOutboundMessage,
        });
        setEliPromptChoice(initialChoice);
        setEliPromptForThreadId(selected.id);
        setEliPromptOpen(true);
        return;
      }
    }

    addMessage(selected.id, stagedOutboundMessage);

    // Super Agent 1.0 (and SA 1.2 escalated threads): staff selected
    // escalation(s) to reply to. This is purely a context affordance — the
    // message itself is the public reply. We do NOT remove escalation
    // labels or resolve the conversation. We track which escalations have
    // been replied to for UI state.
    if (
      (isSuperAgent1DemoThread(selected.id) ||
        (superAgent12Enabled && !isSuperAgentDemoThread(selected.id))) &&
      inputMode === "message" &&
      selectedEscalationTypes.size > 0
    ) {
      const conversationId = selected.id;
      const replied = new Set(sa1RepliedEscalationsRef.current.get(conversationId) ?? []);
      for (const esc of selectedEscalationTypes) replied.add(esc);
      sa1RepliedEscalationsRef.current.set(conversationId, replied);

      setSelectedEscalationTypes(new Set());
      superAgentSelectionsRef.current.set(conversationId, new Set());
      resetComposerAfterSend(selected, inputMode);
    setPrivateNoteMention(null);
      return;
    }

    if (
      isSuperAgentDemoThread(selected.id) &&
      aiActivated &&
      inputMode === "message" &&
      selectedEscalationTypes.size > 0
    ) {
      const escalationsResolved = Array.from(selectedEscalationTypes);

      addMessage(selected.id, {
        role: "staff",
        text: "",
        timestamp,
        type: "label_activity",
        labelActivity: {
          actor: MY_INBOX_ASSIGNEE,
          labelsAdded: escalationsResolved,
          action: "context_provided",
        },
      });
      for (const esc of selectedEscalationTypes) {
        removeLabel(selected.id, esc);
      }

      const remainingEscalations = selected.labels.filter(
        (l) => l.includes("Escalation") && !selectedEscalationTypes.has(l)
      );
      if (remainingEscalations.length === 0) {
        resolveConversation(selected.id, MY_INBOX_ASSIGNEE);
        superAgentSelectionsRef.current.delete(selected.id);
      } else {
        superAgentSelectionsRef.current.set(selected.id, new Set());
      }
      setSelectedEscalationTypes(new Set());

      const selectedId = selected.id;
      setTimeout(() => {
        const aiTimestamp = new Date().toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZoneName: "short",
        });
        const aiResponseMap: Record<string, string> = {
          "Renewals AI Escalation": `I've looked into your renewal and have some good news. Based on your excellent 2-year payment history and residency, we're able to offer you a reduced increase. Your renewal rate will be adjusted to $1,820/mo (a 1.4% increase instead of 3%). I'll send over the updated offer for your review shortly.`,
          "Payments AI Escalation": `Regarding your payment — given your consistent 2-year payment history, we're happy to waive the $50 late fee as a one-time courtesy. The credit has been applied to your account and your current balance reflects the adjustment.`,
          "Other Escalation": `About the pool party — great news! You're welcome to reserve the pool area for your birthday. Here's what you need to know:\n\n• Reservations can be made up to 30 days in advance at the leasing office\n• For groups over 10, there's a refundable $100 deposit\n• Pool hours for private events are 10am–8pm on weekends\n• Please review the community pool guidelines posted at the pool entrance\n\nWould you like me to help you pick a date and get the reservation started?`,
        };
        const parts = escalationsResolved.map((esc) =>
          aiResponseMap[esc] ?? `I've addressed the ${esc.replace(" Escalation", "").replace(/\s+\d+$/, "").toLowerCase()} topic based on the team's guidance.`
        );
        const combinedText = escalationsResolved.length > 1
          ? `Hi Marcus! I have updates on your questions.\n\n${parts.join("\n\n")}\n\nLet me know if there's anything else I can help with!`
          : `Hi Marcus! ${parts[0]} Let me know if you have any questions!`;
        addMessage(selectedId, {
          role: "agent",
          text: combinedText,
          timestamp: aiTimestamp,
          type: "message",
        });
      }, 1500);
    }

    resetComposerAfterSend(selected, inputMode);
    setPrivateNoteMention(null);
  };

  /** Entrata profile side-panel thread composer (mock threads + new thread). */
  const handleProfileEntThreadSend = () => {
    const text = threadDraft.trim();
    if (!text || openThreadIdx === null || !selected) return;
    if (openThreadIdx === -1 && newThreadOutbound?.channel === "Email" && !newThreadSubject.trim()) {
      setNewThreadSubjectError(true);
      return;
    }
    const now = new Date();
    const timestamp = now.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
    const isEmailEntThread =
      openThreadIdx === -1
        ? newThreadOutbound?.channel === "Email"
        : openThreadIdx >= 0 && profilePanelThreads[openThreadIdx]?.channel === "Email";
    const signatureProperty =
      openThreadIdx === -1
        ? (newThreadOutbound?.propertyName ?? selected.property)
        : (profilePanelThreads[openThreadIdx]?.property ?? selected.property);
    const emailSignature =
      isEmailEntThread && threadInputMode === "message"
        ? staffEmailSignatureForProperty(selected, signatureProperty, humanNameSet, humanMembers)
        : undefined;
    if (threadInputMode === "private_note") {
      addMessage(selected.id, {
        role: "staff",
        text,
        timestamp,
        type: "private_note",
        privateNoteAuthor: MY_INBOX_ASSIGNEE,
      });
    } else {
      addMessage(selected.id, {
        role: "staff",
        text,
        timestamp,
        type: "message",
        ...(emailSignature ? { emailSignature } : {}),
      });
    }
    const key = String(openThreadIdx);
    setEntSideSentByThreadKey((prev) => ({
      ...prev,
      [key]: [
        ...(prev[key] ?? []),
        {
          role: "staff" as const,
          text,
          timestamp,
          privateNote: threadInputMode === "private_note",
          ...(emailSignature ? { emailSignature } : {}),
        },
      ],
    }));
    setThreadDraft("");
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (inputMode === "private_note" && privateNoteMention && privateNoteMentionFiltered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setPrivateNoteMentionIndex((i) => Math.min(i + 1, privateNoteMentionFiltered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setPrivateNoteMentionIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setPrivateNoteMention(null);
        return;
      }
      if ((e.key === "Enter" || e.key === "Tab") && !e.shiftKey) {
        e.preventDefault();
        applyPrivateNoteMention(
          privateNoteMentionFiltered[privateNoteMentionIndex],
          e.currentTarget
        );
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isSidebarActive = (filter: SidebarFilter) => {
    if (typeof sidebarFilter === "string" && typeof filter === "string")
      return sidebarFilter === filter;
    if (typeof sidebarFilter === "object" && typeof filter === "object") {
      if (sidebarFilter.type !== filter.type) return false;
      if (
        sidebarFilter.type === "live-ai-jamison" ||
        sidebarFilter.type === "live-ai-hillside" ||
        sidebarFilter.type === "custom-inbox-1"
      )
        return true;
      return (
        "value" in sidebarFilter &&
        "value" in filter &&
        sidebarFilter.value === filter.value
      );
    }
    return false;
  };

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* ===== LEFT SIDEBAR ===== */}
      <aside className="flex w-[220px] shrink-0 flex-col border-r border-border bg-card">
        <Link
          href="/command-center"
          className="mx-2 mt-1 flex items-center gap-2 rounded-md px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
          aria-label="Back to Command Center"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground">
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          </span>
          <span>Back</span>
        </Link>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {superAgent12Enabled ? (
            <TooltipProvider delayDuration={200}>
              <ul className="space-y-0.5">
              <li>
                <Button
                  variant={isSidebarActive("all") ? "secondary" : "ghost"}
                  className={cn(
                    "group w-full justify-start gap-2 px-2 font-normal",
                    isSidebarActive("all") && "font-medium"
                  )}
                  onClick={() => setSidebarFilter("all")}
                >
                  <Inbox className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-left">Open Threads</span>
                  <SidebarInfoTip label="About Open Threads" hoverOnly>
                    Every active conversation — both those Eli is handling and those a
                    property teammate owns. The count is the sum of Property Threads
                    and Eli Threads — and because Eli Threads never require staff
                    action, this number always matches Property Threads.
                  </SidebarInfoTip>
                  {/* No badge — the count is identical to Property Threads (Eli contributes 0), so it's redundant. */}
                </Button>
              </li>
              {([
                {
                  id: "sa12-escalated" as const,
                  icon: Building,
                  label: "Property Threads",
                  tip: (
                    <>
                      Threads a property teammate is handling — either escalated to a
                      human or taken over from Eli. Eli is paused on these until they
                      close.
                    </>
                  ),
                },
                {
                  id: "sa12-property" as const,
                  icon: Bot,
                  label: "Eli Threads",
                  tip: (
                    <>
                      Threads Eli is actively handling on the property&apos;s behalf.
                      No badge because these don&apos;t require your action right now.
                    </>
                  ),
                },
              ] as const).map((item) => (
                <li key={item.id} className="relative">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-[15px] top-0 bottom-0 w-px bg-border"
                  />
                  <Button
                    variant={isSidebarActive(item.id) ? "secondary" : "ghost"}
                    /* Tightened gutter (`pl-6` + `pr-1` + `gap-1`) plus a
                       smaller `text-xs` label + `h-3.5 w-3.5` icon so
                       "Property Threads" fits in full alongside a double-
                       digit badge. The nested-item indent line is at
                       15px, so pl-6 (24px) keeps the icon clear of the
                       vertical rule and the smaller label creates the
                       hierarchy expected of a nested inbox row. */
                    className={cn(
                      "group w-full justify-start gap-1 pl-6 pr-1 text-xs font-normal",
                      isSidebarActive(item.id) && "font-medium"
                    )}
                    onClick={() => setSidebarFilter(item.id)}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                    <SidebarInfoTip label={`About ${item.label}`} hoverOnly>{item.tip}</SidebarInfoTip>
                    {item.id === "sa12-escalated" && sa12InboxActionCounts.escalated > 0 && (
                      <Badge
                        variant="destructive"
                        /* Compact 16px round chip that still reads clean
                           for double-digit counts:
                             • `py-0` overrides Badge's default `py-0.5`,
                               so the disc stays a true circle instead of
                               an oval at this size.
                             • `h-4 min-w-4 px-1` gives 8px of horizontal
                               room for the number without pushing the
                               label into a truncate.
                             • `text-[10px] font-semibold tabular-nums`
                               keeps single- and double-digit widths
                               aligned. */
                        className="h-4 min-w-4 shrink-0 justify-center rounded-full border-0 px-1 py-0 text-[10px] font-semibold leading-none tabular-nums"
                      >
                        {sa12InboxActionCounts.escalated}
                      </Badge>
                    )}
                  </Button>
                </li>
              ))}
              <li>
                <Button
                  variant={isSidebarActive("sa12-closed") ? "secondary" : "ghost"}
                  className={cn(
                    "group w-full justify-start gap-2 px-2 font-normal",
                    isSidebarActive("sa12-closed") && "font-medium"
                  )}
                  onClick={() => setSidebarFilter("sa12-closed")}
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-left">Closed Threads</span>
                  <SidebarInfoTip label="About Closed Threads" hoverOnly>
                    Resolved conversations, archived for reference. No badge because
                    completed work doesn&apos;t need attention.
                  </SidebarInfoTip>
                </Button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setInboxHelpOpen(true)}
                  className="mt-1 inline-flex w-full items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-left text-[10px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  <HelpCircle className="h-3 w-3 shrink-0" strokeWidth={2} />
                  <span className="underline decoration-dotted underline-offset-2">
                    Understand the inbox?
                  </span>
                </button>
              </li>
              </ul>
            </TooltipProvider>
          ) : (
          <ul className="space-y-0.5">
            {([
              { id: "all" as const, icon: Inbox, label: "Open Threads" },
              // "Mentions" nav item hidden for now — will be re-enabled
              // in a future pass. Kept the "mentions" filter id + sidebar
              // logic intact so restoring is a one-line uncomment.
              // { id: "mentions" as const, icon: AtSign, label: "Mentions" },
              { id: "unattended" as const, icon: Clock, label: "Needs Action" },
            ] as const).map((item) => (
              <li key={item.id}>
                <Button
                  variant={isSidebarActive(item.id) ? "secondary" : "ghost"}
                  className={cn(
                      "w-full justify-start gap-2 px-2 font-normal",
                    isSidebarActive(item.id) && "font-medium"
                  )}
                  onClick={() => setSidebarFilter(item.id)}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                  {item.id === "all" && allThreadsUnreadCount > 0 && (
                      <Badge variant="destructive" className="h-[18px] min-w-[18px] shrink-0 justify-center rounded-full px-1 text-[10px] leading-none">
                      {allThreadsUnreadCount}
                    </Badge>
                  )}
                  {/* Mentions badge — hidden while the Mentions nav item is
                      commented out above. Restore alongside the nav entry. */}
                  {/* {item.id === "mentions" && mentionsInboxCount > 0 && (
                      <Badge variant="destructive" className="h-[18px] min-w-[18px] shrink-0 justify-center rounded-full px-1 text-[10px] leading-none">
                      {mentionsInboxCount}
                    </Badge>
                  )} */}
                  {item.id === "unattended" && unattendedInboxCount > 0 && (
                      <Badge variant="destructive" className="h-[18px] min-w-[18px] shrink-0 justify-center rounded-full px-1 text-[10px] leading-none">
                      {unattendedInboxCount}
                    </Badge>
                  )}
                </Button>
              </li>
            ))}
          </ul>
          )}

          <div className="my-3 h-px bg-border" />

          {!simulateUserEnabled && (
            <>
              {!superAgent12Enabled && (
                <>
          <h3 className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Custom Inboxes
          </h3>
          <ul className="space-y-0.5">
            <li>
              <Button
                        variant={isSidebarActive({ type: "custom-inbox-1" }) ? "secondary" : "ghost"}
                className={cn(
                          "w-full items-center justify-start gap-2 px-2 font-normal",
                          isSidebarActive({ type: "custom-inbox-1" }) && "font-medium"
                        )}
                        onClick={() => setSidebarFilter({ type: "custom-inbox-1" })}
                      >
                        <span className="min-w-0 flex-1 truncate text-left">Custom Inbox 1</span>
                        {customInbox1UnreadCount > 0 && (
                          <Badge variant="destructive" className="h-[18px] min-w-[18px] shrink-0 justify-center rounded-full px-1 text-[10px] leading-none">
                            {customInbox1UnreadCount}
                  </Badge>
                )}
              </Button>
            </li>
          </ul>

          <div className="my-3 h-px bg-border" />
                </>
              )}

          <h3 className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Settings
          </h3>
          <ul className="space-y-0.5">
                {(["Call System", "Email Integration", "Manage Vanity Numbers", "Manage Inboxes", "Thread Settings", "Manage Labels", "Reporting"]).map((label) => {
              if (label === "Call System" && !callSystemEnabled) return null;
                  // Thread Settings is a SA 1.2-only surface — the settings inside
                  // (Thread Automation, Quick Filter defaults, One Time Setup)
                  // only make sense once the SA 1.2 inbox model is turned on.
                  if (label === "Thread Settings" && !superAgent12Enabled) return null;
                  // SA 1.2 trims the Settings list — these three surfaces move elsewhere.
                  if (
                    superAgent12Enabled &&
                    (label === "Manage Vanity Numbers" ||
                      label === "Manage Inboxes" ||
                      label === "Reporting")
                  ) {
                    return null;
                  }
              return (
              <li key={label}>
                {label === "Call System" ? (
                  <Button
                    variant={callSystemPanelOpen ? "secondary" : "ghost"}
                        className={cn("w-full justify-start px-2 font-normal", callSystemPanelOpen && "font-medium")}
                        onClick={() => {
                          setManageInboxPanelOpen(false);
                          setCallSystemPanelOpen((v) => !v);
                        }}
                      >
                        {label}
                      </Button>
                    ) : label === "Thread Settings" ? (
                      <Button
                        variant={manageInboxPanelOpen ? "secondary" : "ghost"}
                        className={cn("w-full justify-start px-2 font-normal", manageInboxPanelOpen && "font-medium")}
                        onClick={() => {
                          setCallSystemPanelOpen(false);
                          setManageInboxPanelOpen((v) => !v);
                        }}
                  >
                    {label}
                  </Button>
                ) : label === "Email Integration" ? (
                  <Link href="/communications-setup/custom-email">
                        <Button variant="ghost" className="w-full justify-start px-2 font-normal" onClick={() => { setCallSystemPanelOpen(false); setManageInboxPanelOpen(false); }}>
                      {label}
                    </Button>
                  </Link>
                ) : label === "Manage Vanity Numbers" ? (
                  <Link href="/communications-setup/phone-numbers">
                        <Button variant="ghost" className="w-full justify-start px-2 font-normal" onClick={() => { setCallSystemPanelOpen(false); setManageInboxPanelOpen(false); }}>
                      {label}
                    </Button>
                  </Link>
                ) : (
                      <Button variant="ghost" className="w-full justify-start px-2 font-normal" onClick={() => { setCallSystemPanelOpen(false); setManageInboxPanelOpen(false); }}>
                    {label}
                  </Button>
                )}
              </li>
              );
            })}
          </ul>
            </>
          )}
        </nav>

        {/* ===== COMMUNICATIONS DEMO CONTROL ===== */}
        <CommunicationsDemoControl
          clickToCallEnabled={clickToCallEnabled}
          onToggleClickToCall={toggleClickToCallEnabled}
          callSystemEnabled={callSystemEnabled}
          onToggleCallSystem={toggleCallSystemEnabled}
          onSimulateInboundCall={simulateInboundCall}
          superAgent1Enabled={superAgent1Enabled}
          onToggleSuperAgent1={toggleSuperAgent1Enabled}
          superAgent12Enabled={superAgent12Enabled}
          onToggleSuperAgent12={toggleSuperAgent12Enabled}
          translationEnabled={translationEnabled}
          onToggleTranslation={toggleTranslationEnabled}
          simulateUserEnabled={simulateUserEnabled}
          onToggleSimulateUser={toggleSimulateUserEnabled}
          breakoutsExampleEnabled={breakoutsExampleEnabled}
          onToggleBreakoutsExample={toggleBreakoutsExampleEnabled}
          email2DemoEnabled={email2DemoEnabled}
          onToggleEmail2Demo={toggleEmail2DemoEnabled}
          notificationsEnabled={notificationsEnabled}
          onToggleNotifications={toggleNotificationsEnabled}
          onPreviewNotificationPop={triggerNotificationPop}
          viewportPreset={viewportPreset}
          onSetViewportPreset={setViewportPreset}
          goLiveAutomationEnabled={goLiveAutomationEnabled}
          onToggleGoLiveAutomation={toggleGoLiveAutomationEnabled}
          testingModeEnabled={testingModeEnabled}
          onToggleTestingMode={toggleTestingModeEnabled}
        />
      </aside>

      {/* ===== SA 1.2 TESTING · TRACE PANEL ===== */}
      {/*
        Rendered unconditionally so open/close animates cleanly; the
        chip that fires it is already gated on SA 1.2 + Testing being
        on. `thread={selected}` uses the real ConversationItem the
        header is currently rendering.
      */}
      <EliTraceModal
        open={traceModalOpen}
        onOpenChange={setTraceModalOpen}
        thread={selected}
        /*
          `ratingReady` tells the modal whether the quality-analysis
          round-trip has completed for this thread. While it's false,
          the banner shows a "running analysis" placeholder instead of
          the score — matches the chip in the header.
        */
        ratingReady={selected ? ratingAnalysisByThread.get(selected.id) === "loaded" : false}
      />

      {/* ===== CALL SYSTEM SETTINGS PANEL ===== */}
      {callSystemPanelOpen && <CallSystemSettingsPanel onClose={() => setCallSystemPanelOpen(false)} />}

      {/* ===== MANAGE INBOX SETTINGS PANEL ===== */}
      {manageInboxPanelOpen && (
        <ManageInboxSettingsPanel
          onClose={() => setManageInboxPanelOpen(false)}
          quickFilterEnabled={quickFilterEnabled}
          onToggleQuickFilter={setQuickFilterEnabled}
          followUpEnabled={followUpEnabled}
          onToggleFollowUpEnabled={setFollowUpEnabled}
          followUpDaysList={followUpDaysList}
          onSetFollowUpDaysList={setFollowUpDaysList}
          autoCloseEnabled={autoCloseEnabled}
          onToggleAutoCloseEnabled={setAutoCloseEnabled}
          autoCloseDays={autoCloseDays}
          onSetAutoCloseDays={setAutoCloseDays}
          sortMode={threadSortMode}
          onSetSortMode={setThreadSortMode}
          eliPromptEnabled={eliPromptEnabled}
          onToggleEliPromptEnabled={setEliPromptEnabled}
          eliPromptCadenceMinutes={eliPromptCadenceMinutes}
          onSetEliPromptCadenceMinutes={setEliPromptCadenceMinutes}
          eliPromptCadenceUnit={eliPromptCadenceUnit}
          onSetEliPromptCadenceUnit={setEliPromptCadenceUnit}
          eliPromptDefaultOption={eliPromptDefaultOption}
          onSetEliPromptDefaultOption={setEliPromptDefaultOption}
          promptOptionOffEnabled={promptOptionOffEnabled}
          onTogglePromptOptionOffEnabled={setPromptOptionOffEnabled}
          promptOptionKeepOnEnabled={promptOptionKeepOnEnabled}
          onTogglePromptOptionKeepOnEnabled={setPromptOptionKeepOnEnabled}
        />
      )}

      {/* ===== CONVERSATION LIST ===== */}
      <div className={cn("flex w-[340px] shrink-0 flex-col border-r border-border bg-card", (callSystemPanelOpen || manageInboxPanelOpen) && "hidden")}>
        {/* Tabs bar — hidden in SA 1.2 (the sidebar inboxes already partition the list). */}
        {!superAgent12Enabled && (
          <div className="px-3 py-2">
            <Tabs value={inboxTab} onValueChange={setInboxTab} className="w-full">
              <TabsList className="h-9 w-full">
                <TabsTrigger value="mine" className="flex-1 gap-1.5 px-1.5 text-xs">
                  My Inbox
                  {myInboxUnreadCount > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 justify-center px-1.5 text-[10px]">
                      {myInboxUnreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="unassigned" className="flex-1 px-1.5 text-xs">
                  Unassigned
                </TabsTrigger>
                <TabsTrigger value="all" className="flex-1 px-1.5 text-xs">
                  All
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Search + floating filters + (SA 1.2) channel Quick Filter.
            In SA 1.2 the channel Quick Filter renders inside the same
            container as the search input, directly below it — so the two
            controls read as one filter block instead of two stacked strips.
            SA 1.0 shows just the search + floating filters row.
            Padding is asymmetric on purpose: `px-3` (12px) matches the
            rest of the sidebar's horizontal rhythm, and `py-2.5` (10px)
            leaves a comfortable margin around the two `h-8` control
            rows — enough that the bottom border never feels like it's
            hugging the controls. Inter-row gap dropped to `gap-2` (8px)
            so it matches the horizontal `gap-2` between the search input
            and the filter icon — the whole block reads as one evenly-
            gridded filter cluster instead of two loosely stacked strips.
            Net: the container is ~6px shorter than the old
            `p-3 gap-2.5` version without any control itself shrinking. */}
        <div className="flex flex-col gap-2 border-b border-border px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Threads"
                className="h-8 pl-8 text-xs"
              />
            </div>
          <Popover
            open={threadListFiltersOpen}
            /* Snapshot filter state on open so Cancel / outside-click / ESC
               can roll back the preview. Apply clears the snapshot ref
               (see the Apply button in the popover footer) before flipping
               the popover closed, which short-circuits the revert branch. */
            onOpenChange={(nextOpen) => {
              if (nextOpen) {
                filterSnapshotRef.current = {
                  propertyKeys:
                    threadListPropertyKeys === null ? null : new Set(threadListPropertyKeys),
                  convoTypes: new Set(threadListConvoTypes),
                  actionFilters: new Set(threadListActionFilters),
                  sa12Escalation: sa12EscalationFilter,
                  statusFilters: new Set(threadListStatusFilters),
                  dateRange: threadListDateRange,
                  customDateFrom: threadListCustomDateFrom,
                  customDateTo: threadListCustomDateTo,
                  channels: threadListChannels === null ? null : new Set(threadListChannels),
                };
              } else {
                const snap = filterSnapshotRef.current;
                if (snap) {
                  setThreadListPropertyKeys(snap.propertyKeys);
                  setThreadListConvoTypes(snap.convoTypes);
                  setThreadListActionFilters(snap.actionFilters);
                  setSa12EscalationFilter(snap.sa12Escalation);
                  setThreadListStatusFilters(snap.statusFilters);
                  setThreadListDateRange(snap.dateRange);
                  setThreadListCustomDateFrom(snap.customDateFrom);
                  setThreadListCustomDateTo(snap.customDateTo);
                  setThreadListChannels(snap.channels);
                  filterSnapshotRef.current = null;
                }
              }
              setThreadListFiltersOpen(nextOpen);
            }}
          >
            <PopoverTrigger asChild>
            <Button
              type="button"
              variant={threadListFiltersOpen || threadFiltersAreNonDefault ? "secondary" : "ghost"}
              size="icon"
                className="relative h-8 w-8 shrink-0"
                aria-label="Thread filters"
              aria-expanded={threadListFiltersOpen}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {threadFiltersAreNonDefault && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              )}
            </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              side="bottom"
              sideOffset={6}
              className="w-72 space-y-3 p-3"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <TooltipProvider delayDuration={200}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">Filters</p>
                {threadFiltersAreNonDefault && (
                  <button
                    type="button"
                    className="text-xxs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => {
                      setThreadListConvoTypes(new Set(["escalated"]));
                      setThreadListPropertyKeys(null);
                      setThreadListStatusFilters(new Set(["active"]));
                      setThreadListDateRange("all");
                      setThreadListCustomDateFrom("");
                      setThreadListCustomDateTo("");
                      setThreadListChannels(null);
                      setThreadListActionFilters(new Set());
                      setSa12EscalationFilter("all");
                    }}
                  >
                    Reset
                  </button>
                )}
          </div>

              {/* Properties */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <p className="text-xxs font-semibold uppercase tracking-wide text-muted-foreground">
                    Properties
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        tabIndex={-1}
                        className="rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="About Properties filter"
                      >
                        <CircleHelp className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="z-[220] max-w-[240px] text-xs leading-snug">
                      Limit the thread list to one or more properties. Leave All properties selected to
                      include every property in your inbox.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Popover modal>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex h-8 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50",
                        threadListPropertyKeys !== null && "border-primary/40"
                      )}
                    >
                      <span className="truncate">{threadListPropertySummary}</span>
                      {threadListPropertyCount > 1 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1.5 text-xxs font-semibold leading-none text-primary-foreground">
                          {threadListPropertyCount}
                        </span>
                      )}
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="z-[200] w-[var(--radix-popover-trigger-width)] max-h-[min(280px,50vh)] overflow-y-auto p-2"
                    align="start"
                    sideOffset={4}
                  >
                    <div className="space-y-1">
                      <label className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 hover:bg-accent/60">
                        <Checkbox
                          className="mt-0.5"
                          checked={threadListPropertyKeys === null}
                          onCheckedChange={(c) => {
                            if (c === "indeterminate") return;
                            if (c) setThreadListPropertyKeys(null);
                            else setThreadListPropertyKeys(new Set());
                          }}
                        />
                        <span className="text-xs leading-snug text-foreground">All properties</span>
                      </label>
                      <div className="my-1 h-px bg-border" />
                      {allConversationPropertyNames.map((prop) => {
                        const propChecked =
                          threadListPropertyKeys === null || threadListPropertyKeys.has(prop);
                        return (
                          <label
                            key={prop}
                            className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 hover:bg-accent/60"
                          >
                            <Checkbox
                              className="mt-0.5"
                              checked={propChecked}
                              onCheckedChange={(c) => {
                                if (c === "indeterminate") return;
                                const shouldCheck = c === true;
                                if (shouldCheck !== propChecked) toggleThreadListProperty(prop);
                              }}
                            />
                            <span className="text-xs leading-snug text-foreground">{prop}</span>
                          </label>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Conversation Type — hidden in SA 1.2 mode because the same
                  slice is available as an inline Quick Filter directly under
                  the search bar. Keeping both would leave two competing
                  sources of truth for the same dimension. */}
              {!superAgent12Enabled && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <p className="text-xxs font-semibold uppercase tracking-wide text-muted-foreground">
                    Conversation Type
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        tabIndex={-1}
                        className="rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="About Conversation Type filter"
                      >
                        <CircleHelp className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="z-[220] max-w-[240px] space-y-1.5 text-xs leading-snug">
                      <p>
                        Escalated: when the lead or resident conversation is waiting on staff to reply or
                        resolve.
                      </p>
                      <p>
                        Non-Escalated: when the lead or resident conversation is being taken care of by
                        ELI+ and needs no escalation or intervention.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Popover modal>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex h-8 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50",
                        (threadListConvoTypeCount !== 1 || !threadListConvoTypes.has("escalated")) &&
                          "border-primary/40"
                      )}
                    >
                      <span className="truncate">{threadListConvoSummary}</span>
                      {threadListConvoTypeCount > 1 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1.5 text-xxs font-semibold leading-none text-primary-foreground">
                          {threadListConvoTypeCount}
                        </span>
                      )}
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="z-[200] w-[var(--radix-popover-trigger-width)] p-2"
                    align="start"
                    sideOffset={4}
                  >
                      <div className="space-y-1">
                        <div className="flex items-start gap-1.5 rounded-md px-1 py-1 hover:bg-accent/60">
                          <Checkbox
                            id="thread-filter-escalated"
                            className="mt-0.5 shrink-0"
                            checked={threadListConvoTypes.has("escalated")}
                            onCheckedChange={(c) => {
                              if (c === "indeterminate") return;
                              setThreadListConvoTypes((prev) => {
                                const next = new Set(prev);
                                if (c) next.add("escalated");
                                else next.delete("escalated");
                                return next;
                              });
                            }}
                          />
                          <label
                            htmlFor="thread-filter-escalated"
                            className="min-w-0 flex-1 cursor-pointer text-xs leading-snug text-foreground"
                          >
                            Escalated
                          </label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                tabIndex={-1}
                                className="mt-0.5 shrink-0 rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label="What counts as Escalated"
                              >
                                <CircleHelp className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="z-[220] max-w-[240px] text-xs leading-snug">
                              Open, unresolved threads where the lead or resident is waiting on staff next on
                              the public thread: includes unread messages and threads whose last public
                              message is from the lead or resident (not staff or the AI).
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex items-start gap-1.5 rounded-md px-1 py-1 hover:bg-accent/60">
                          <Checkbox
                            id="thread-filter-live-ai"
                            className="mt-0.5 shrink-0"
                            checked={threadListConvoTypes.has("liveAi")}
                            onCheckedChange={(c) => {
                              if (c === "indeterminate") return;
                              setThreadListConvoTypes((prev) => {
                                const next = new Set(prev);
                                if (c) next.add("liveAi");
                                else next.delete("liveAi");
                                return next;
                              });
                            }}
                          />
                          <label
                            htmlFor="thread-filter-live-ai"
                            className="min-w-0 flex-1 cursor-pointer text-xs leading-snug text-foreground"
                          >
                            Non-Escalated
                          </label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                tabIndex={-1}
                                className="mt-0.5 shrink-0 rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label="What counts as Non-Escalated"
                              >
                                <CircleHelp className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="z-[220] max-w-[240px] text-xs leading-snug">
                              Threads where the last public message is from staff or the AI (waiting on the
                              lead or resident next), plus primary ELI AI lanes that do not carry an escalation
                              label.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                  </PopoverContent>
                </Popover>
              </div>
              )}

              {/* Action Needed — SA 1.2 only.
                  Maps 1:1 to the two thread-card corner markers, so staff can
                  scope the list to only threads that show a red dot, only
                  threads that show a cyan bell, or both. */}
              {superAgent12Enabled && (
              <div className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    <p className="text-xxs font-semibold uppercase tracking-wide text-muted-foreground">
                      Action Needed
                    </p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          tabIndex={-1}
                          className="rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="About Action Needed filter"
                        >
                          <CircleHelp className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="z-[220] max-w-[260px] space-y-1.5 text-xs leading-snug">
                        <p>
                          Follow-up: Thread Automation nudged a staff-idle thread (red unread dot plus a cyan
                          &quot;Follow up&quot; chip in the card metadata).
                        </p>
                        <p>
                          Escalation: the lead or resident sent the last public message and staff hasn&apos;t
                          replied (red unread dot on the card).
                        </p>
                        <p className="text-muted-foreground">
                          Leave both unchecked to show every thread regardless of action state.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Popover modal>
                  <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "flex h-8 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50",
                          threadListActionCount > 0 && "border-primary/40"
                        )}
                      >
                        <span className="truncate">{threadListActionSummary}</span>
                        {threadListActionCount > 1 && (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1.5 text-xxs font-semibold leading-none text-primary-foreground">
                            {threadListActionCount}
                          </span>
                        )}
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                      </button>
                  </PopoverTrigger>
                  <PopoverContent
                      className="z-[200] w-[var(--radix-popover-trigger-width)] p-2"
                    align="start"
                    sideOffset={4}
                  >
                      <div className="space-y-1">
                        <div className="flex items-start gap-1.5 rounded-md px-1 py-1 hover:bg-accent/60">
                        <Checkbox
                            id="thread-filter-action-followup"
                            className="mt-0.5 shrink-0"
                            checked={threadListActionFilters.has("followup")}
                          onCheckedChange={(c) => {
                            if (c === "indeterminate") return;
                              setThreadListActionFilters((prev) => {
                                const next = new Set(prev);
                                if (c) next.add("followup");
                                else next.delete("followup");
                                return next;
                              });
                          }}
                        />
                        <label
                            htmlFor="thread-filter-action-followup"
                            className="min-w-0 flex-1 cursor-pointer text-xs leading-snug text-foreground"
                          >
                            <span className="inline-flex items-center gap-1">
                              <BellRing
                                className="h-3 w-3 text-cyan-600 dark:text-cyan-400"
                                strokeWidth={2.5}
                                aria-hidden
                              />
                              Follow-up reminders
                            </span>
                            <span className="mt-0.5 block text-[10px] text-muted-foreground">
                              Thread Automation nudge (red dot + &quot;Follow up&quot; chip)
                            </span>
                        </label>
                      </div>
                        <div className="flex items-start gap-1.5 rounded-md px-1 py-1 hover:bg-accent/60">
                          <Checkbox
                            id="thread-filter-action-escalation"
                            className="mt-0.5 shrink-0"
                            checked={threadListActionFilters.has("escalation")}
                            onCheckedChange={(c) => {
                              if (c === "indeterminate") return;
                              setThreadListActionFilters((prev) => {
                                const next = new Set(prev);
                                if (c) next.add("escalation");
                                else next.delete("escalation");
                                return next;
                              });
                            }}
                          />
                          <label
                            htmlFor="thread-filter-action-escalation"
                            className="min-w-0 flex-1 cursor-pointer text-xs leading-snug text-foreground"
                          >
                            <span className="inline-flex items-center gap-1">
                              <span
                                className="inline-flex h-3 w-3 items-center justify-center"
                                aria-hidden
                              >
                                <span className="h-2 w-2 rounded-full bg-destructive" />
                              </span>
                              Escalations
                            </span>
                            <span className="mt-0.5 block text-[10px] text-muted-foreground">
                              Lead or resident waiting on staff (red dot)
                            </span>
                          </label>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Escalation — SA 1.2 only, only when viewing Property Threads.
                  Single-select dropdown (All / Escalated / Non-Escalated)
                  styled to match the other popover filters: labelled trigger
                  button that opens a nested option list with a leading
                  check-mark marking the current selection. */}
              {superAgent12Enabled && sidebarFilter === "sa12-escalated" && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    <p className="text-xxs font-semibold uppercase tracking-wide text-muted-foreground">
                      Escalation
                    </p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          tabIndex={-1}
                          className="rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="About Escalation filter"
                        >
                          <CircleHelp className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="z-[220] max-w-[260px] space-y-1.5 text-xs leading-snug">
                        <p>
                          Escalated: an active AI escalation is on the thread right now — AI-labeled
                          escalations plus unresolved voicemails and missed calls (Eli always picks up
                          first).
                        </p>
                        <p>
                          Non-Escalated: property staff owns the thread with no active escalation. Includes
                          resolved escalations kept open and threads staff explicitly took over.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Popover modal>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "flex h-8 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50",
                          sa12EscalationFilter !== "all" && "border-primary/40"
                        )}
                      >
                        <span className="truncate">
                          {sa12EscalationFilter === "escalated"
                            ? "Escalated"
                            : sa12EscalationFilter === "non-escalated"
                              ? "Non-Escalated"
                              : "All"}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="z-[200] w-[var(--radix-popover-trigger-width)] p-2"
                      align="start"
                      sideOffset={4}
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <div role="listbox" aria-label="Escalation filter" className="space-y-1">
                        {(
                          [
                            { id: "all", label: "All" },
                            { id: "escalated", label: "Escalated" },
                            { id: "non-escalated", label: "Non-Escalated" },
                          ] as const
                        ).map((opt) => {
                          const selected = sa12EscalationFilter === opt.id;
                        return (
                            <button
                              key={opt.id}
                              type="button"
                              role="option"
                              aria-selected={selected}
                              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 text-left hover:bg-accent/60"
                              onClick={() => setSa12EscalationFilter(opt.id)}
                            >
                              <Check
                                className={cn(
                                  "h-3.5 w-3.5 shrink-0",
                                  selected ? "opacity-100" : "opacity-0"
                                )}
                                aria-hidden
                              />
                              <span className="text-xs leading-snug text-foreground">{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Status — hidden in SA 1.2 mode because the sidebar owns
                  this dimension: Open Threads / Property Threads / Eli
                  Threads pin status to "active" and Closed Threads pins it
                  to "completed" via the sidebar-sync effect. Surfacing a
                  redundant checkbox pair here would let staff put the
                  status filter and the sidebar out of sync. */}
              {!superAgent12Enabled && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <p className="text-xxs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        tabIndex={-1}
                        className="rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="About Status filter"
                      >
                        <CircleHelp className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="z-[220] max-w-[240px] text-xs leading-snug">
                      Open shows active threads still in progress. Closed shows conversations that have
                      already been resolved. Select both to include every status.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Popover modal>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex h-8 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50",
                        (threadListStatusCount !== 1 || !threadListStatusFilters.has("active")) &&
                          "border-primary/40"
                      )}
                    >
                      <span className="truncate">{threadListStatusSummary}</span>
                      {threadListStatusCount > 1 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1.5 text-xxs font-semibold leading-none text-primary-foreground">
                          {threadListStatusCount}
                        </span>
                      )}
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="z-[200] w-[var(--radix-popover-trigger-width)] p-2"
                    align="start"
                    sideOffset={4}
                  >
                    <div className="space-y-1">
                      <label className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 hover:bg-accent/60">
                            <Checkbox
                              className="mt-0.5"
                          checked={threadListStatusFilters.has("active")}
                              onCheckedChange={(c) => {
                                if (c === "indeterminate") return;
                            setThreadListStatusFilters((prev) => {
                              const next = new Set(prev);
                              if (c) next.add("active");
                              else next.delete("active");
                              return next;
                            });
                          }}
                        />
                        <span className="text-xs leading-snug text-foreground">Open</span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 hover:bg-accent/60">
                        <Checkbox
                          className="mt-0.5"
                          checked={threadListStatusFilters.has("completed")}
                          onCheckedChange={(c) => {
                            if (c === "indeterminate") return;
                            setThreadListStatusFilters((prev) => {
                              const next = new Set(prev);
                              if (c) next.add("completed");
                              else next.delete("completed");
                              return next;
                            });
                          }}
                        />
                        <span className="text-xs leading-snug text-foreground">Closed</span>
                            </label>
                          </div>
                  </PopoverContent>
                </Popover>
              </div>
              )}

              {/* Date Range */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <p className="text-xxs font-semibold uppercase tracking-wide text-muted-foreground">
                    Date Range
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        tabIndex={-1}
                        className="rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="About Date Range filter"
                      >
                        <CircleHelp className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="z-[220] max-w-[240px] text-xs leading-snug">
                      Limit threads by when they were last active. Custom Date Range lets you pick a
                      start and end date.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Popover modal>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex h-8 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50",
                        // Filter-pill selected treatment: any non-default
                        // date range (anything other than "All") tints the
                        // border. `custom` also always counts, even if the
                        // From/To pair is empty, so the pill signals that
                        // the user is inside a narrower mode.
                        threadListDateRange !== "all" && "border-primary/40"
                      )}
                    >
                      <span className="truncate">{threadListDateRangeSummary}</span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="z-[200] w-[var(--radix-popover-trigger-width)] p-2"
                    align="start"
                    sideOffset={4}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    <div role="listbox" aria-label="Date range" className="space-y-1">
                      {THREAD_LIST_DATE_RANGE_OPTIONS.map((opt) => {
                        const selected = threadListDateRange === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 text-left hover:bg-accent/60"
                            onClick={() => {
                              setThreadListDateRange(opt.value);
                              if (opt.value !== "custom") {
                                setThreadListCustomDateFrom("");
                                setThreadListCustomDateTo("");
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                "h-3.5 w-3.5 shrink-0",
                                selected ? "opacity-100" : "opacity-0"
                              )}
                              aria-hidden
                            />
                            <span className="text-xs leading-snug text-foreground">{opt.label}</span>
                          </button>
                        );
                      })}
                      {threadListDateRange === "custom" && (
                        <div className="mt-1 space-y-2 border-t border-border pt-2">
                          <label className="block space-y-1 px-1">
                            <span className="text-xxs font-medium text-muted-foreground">From</span>
                            <Input
                              type="date"
                              value={threadListCustomDateFrom}
                              onChange={(e) => setThreadListCustomDateFrom(e.target.value)}
                              className="h-8 text-xs"
                            />
                          </label>
                          <label className="block space-y-1 px-1">
                            <span className="text-xxs font-medium text-muted-foreground">To</span>
                            <Input
                              type="date"
                              value={threadListCustomDateTo}
                              onChange={(e) => setThreadListCustomDateTo(e.target.value)}
                              min={threadListCustomDateFrom || undefined}
                              className="h-8 text-xs"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Communication Channel — hidden in SA 1.2 mode because the
                  same slice is available as the channel Quick Filter row
                  directly under the search input. Keeping both would leave
                  two competing sources of truth for the same dimension. */}
              {!superAgent12Enabled && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <p className="text-xxs font-semibold uppercase tracking-wide text-muted-foreground">
                    Communication Channel
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        tabIndex={-1}
                        className="rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="About Communication Channel filter"
                      >
                        <CircleHelp className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="z-[220] max-w-[240px] text-xs leading-snug">
                      Limit the thread list to Email, SMS, and/or Voice (phone) conversations. Leave all
                      selected to include every channel.
                    </TooltipContent>
                  </Tooltip>
              </div>
                <Popover modal>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex h-8 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50",
                        threadListChannels !== null && "border-primary/40"
                      )}
                    >
                      <span className="truncate">{threadListChannelSummary}</span>
                      {threadListChannelCount > 1 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1.5 text-xxs font-semibold leading-none text-primary-foreground">
                          {threadListChannelCount}
                        </span>
                      )}
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="z-[200] w-[var(--radix-popover-trigger-width)] p-2"
                    align="start"
                    sideOffset={4}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    <div className="space-y-1">
                      {(
                        [
                          { id: "email" as const, label: "Email" },
                          { id: "sms" as const, label: "SMS" },
                          { id: "voice" as const, label: "Voice" },
                        ] as const
                      ).map((opt) => {
                        const checked =
                          threadListChannels === null || threadListChannels.has(opt.id);
                        return (
                          <label
                            key={opt.id}
                            className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 hover:bg-accent/60"
                          >
                            <Checkbox
                              className="mt-0.5"
                              checked={checked}
                              onCheckedChange={(c) => {
                                if (c === "indeterminate") return;
                                const shouldCheck = c === true;
                                if (shouldCheck !== checked) toggleThreadListChannel(opt.id);
                              }}
                            />
                            <span className="text-xs leading-snug text-foreground">{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
            </div>
          )}

              {/* Apply / Cancel footer. The popover previews changes live
                  while it's open, but only Apply commits them to the
                  thread list; Cancel (and closing the popover any other
                  way) rolls back to the snapshot taken on open. */}
              <div className="-mx-3 -mb-3 mt-1 flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-3 py-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setThreadListFiltersOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    // Clear the snapshot first so the onOpenChange revert
                    // branch is a no-op — the live preview becomes the
                    // committed state.
                    filterSnapshotRef.current = null;
                    setThreadListFiltersOpen(false);
                  }}
                >
                  Apply
                </Button>
              </div>
              </TooltipProvider>
              </PopoverContent>
          </Popover>
        </div>

          {/* SA 1.2 channel Quick Filter — nested below the search input in
              the same container so search + channel narrow read as a single
              filter block. Hidden when the workspace disables the Quick
              Filter in Thread Settings. */}
          {superAgent12Enabled && quickFilterEnabled && (
            <TooltipProvider delayDuration={200}>
              <div className="flex items-center gap-1">
                {([
                  { id: "all" as const, label: "All", Icon: null },
                  { id: "voice" as const, label: "Voice", Icon: Phone },
                  { id: "sms" as const, label: "SMS", Icon: MessageSquareText },
                  { id: "chat" as const, label: "Chat", Icon: MessageCircle },
                  { id: "email" as const, label: "Email", Icon: Mail },
                ] as const).map((opt) => {
                  const active = sa12ChannelFilter === opt.id;
                  const count = sa12ChannelActionCounts[opt.id];
                  const btn = (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSa12ChannelFilter(opt.id)}
                      aria-pressed={active}
                      aria-label={`Filter by ${opt.label}${count > 0 ? ` (${count} unread)` : ""}`}
                      className={cn(
                        "relative flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-all",
                        active
                          ? "bg-[hsl(207_73%_95%)] text-[hsl(207_73%_25%)] ring-1 ring-inset ring-[hsl(207_73%_75%)] dark:bg-[hsl(207_73%_20%)] dark:text-[hsl(207_73%_92%)] dark:ring-[hsl(207_73%_35%)]"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      {opt.Icon ? (
                        <opt.Icon className="h-4 w-4" strokeWidth={active ? 2.5 : 2} />
                      ) : (
                        <span className={cn("text-[11px] uppercase tracking-wide", active ? "font-bold" : "font-semibold")}>All</span>
                      )}
                      {count > 0 && (
                        <span
                          className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground tabular-nums"
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                  return opt.Icon ? (
                    <Tooltip key={opt.id}>
                      <TooltipTrigger asChild>{btn}</TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[11px]">
                        {opt.label}
                        {count > 0 ? ` · ${count} unread` : ""}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    btn
                  );
                })}
              </div>
            </TooltipProvider>
          )}
        </div>

        {bulkSelectMode && (
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-1.5">
            <Checkbox
              checked={filtered.length > 0 && bulkSelectedIds.size === filtered.length}
              onCheckedChange={(checked) => {
                if (checked) {
                  setBulkSelectedIds(new Set(filtered.map((c) => c.id)));
                } else {
                  setBulkSelectedIds(new Set());
                }
              }}
            />
            <span className="text-[11px] text-muted-foreground">
              {bulkSelectedIds.size === 0
                ? "Select all"
                : `${bulkSelectedIds.size} selected`}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              {bulkSelectedIds.size > 0 && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="h-7 gap-1 text-[11px]"
                  onClick={() => setBulkResolveConfirmOpen(true)}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Resolve ({bulkSelectedIds.size})
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] text-muted-foreground"
                onClick={() => {
                  setBulkSelectMode(false);
                  setBulkSelectedIds(new Set());
                }}
              >
                Cancel
              </Button>
          </div>
        </div>
        )}

        <Dialog open={inboxHelpOpen} onOpenChange={setInboxHelpOpen}>
          {/* Dialog width bumped from `sm:max-w-2xl` (672 px) to
              `sm:max-w-4xl` (896 px). The extra ~224 px of horizontal room
              cuts the wrap count in half on most copy blocks — the two SA
              1.2 panels ("Thread Automation follow-ups", "Quick Filter")
              and the "What the red count means" summary are the biggest
              beneficiaries — and lets the four-inbox roll-up fit as a 2×2
              grid at md+ instead of a tall single-column stack, so the
              modal reads as one screen of context instead of a scroll. */}
          <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Understanding your inbox</DialogTitle>
              <DialogDescription>
                A tour of the four inboxes in the sidebar, the red unread
                badges next to them, and how Property Threads is organized
                inside.
              </DialogDescription>
            </DialogHeader>
            <div className="-mx-6 flex-1 space-y-4 overflow-y-auto px-6 text-sm">
              {/* Four-inbox overview. Single column on narrow viewports so
                  each icon + description reads as a full row; 2 columns at
                  md+ so the taller Property Threads description sits next
                  to the shorter Open Threads paragraph without dominating
                  the whole modal. Reading order stays natural (Open →
                  Property → Eli → Closed) because CSS grid fills row by
                  row. */}
              <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Inbox className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">Open Threads</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Every active conversation — the ones Eli is handling
                      and the ones a property teammate owns. Think of it as
                      the combined view of Property Threads and Eli Threads.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Building className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">Property Threads</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Threads a property teammate owns — either because an
                      AI escalation is active, staff took the thread over,
                      or Eli was turned off on it. Inside, the list is split
                      into two collapsible sections (see below), and the
                      Escalation filter under{" "}
                      <span className="font-medium text-foreground">Filters</span>{" "}
                      can narrow the view to Escalated, Non-Escalated, or
                      All.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Bot className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">Eli Threads</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Threads Eli is actively handling on the
                      property&apos;s behalf. No badge — these don&apos;t
                      need staff action right now.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">Closed Threads</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Resolved conversations, kept for reference. No badge
                      — completed work doesn&apos;t need attention.
                    </p>
                  </div>
                </div>
              </div>

              {/* What the red count means — SA 1.2 semantics.
                  The sidebar badge, the channel-filter chips (ALL / Voice /
                  SMS / Email), and the section-header chips inside Property
                  Threads all draw from the same rule: property-owned + still
                  unread. Prior copy claimed the number was "needs staff
                  action" (last-message-from-resident + follow-ups), which is
                  no longer accurate — we switched to raw unread so
                  acknowledgement / thank-you messages that don't move the
                  thread out of "No Action Needed" still light the badge. */}
              <div className="rounded-md border border-border/60 bg-muted/40 p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="h-[18px] min-w-[18px] shrink-0 justify-center rounded-full px-1 text-[10px] leading-none">
                    N
                  </Badge>
                  <p className="text-xs font-semibold">What the red count means</p>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  The number shows how many threads in that inbox are{" "}
                  <span className="font-medium text-foreground">unread</span>.
                  A thread counts as long as it&apos;s property-owned and
                  hasn&apos;t been marked read yet — so new resident messages,
                  follow-up reminders, and even quick acknowledgements
                  (&ldquo;thanks!&rdquo;) all count toward it. Opening the
                  thread — or right-clicking it and choosing{" "}
                  <span className="font-medium text-foreground">Mark read</span>{" "}
                  — clears the count.
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Only{" "}
                  <span className="font-medium text-foreground">Property Threads</span>{" "}
                  carries a red count.{" "}
                  <span className="font-medium text-foreground">Eli Threads</span>{" "}
                  and{" "}
                  <span className="font-medium text-foreground">Closed Threads</span>{" "}
                  never do — Eli is handling those, and closed work is done.
                  Open Threads would be the sum of both, but since Eli
                  contributes zero, its count would just duplicate Property
                  Threads, so we hide the Open Threads badge too.
                </p>
              </div>

              {/* Section grouping inside Property Threads. Documents the SA
                  1.2 change that split the list into two collapsible groups
                  driven by needsStaffResponse. Both section headers can
                  show a red unread chip when the underlying threads have
                  `hasUnread: true` — "Needs Action" typically lights up
                  from fresh resident replies, and "No Action Needed"
                  lights up whenever staff explicitly marks one of its
                  threads as unread. */}
              <div className="rounded-md border border-border/60 bg-muted/40 p-3">
                <p className="text-xs font-semibold">Needs Action vs No Action Needed</p>

                {/* Mini illustration of the actual collapsible section
                    headers that appear inside Property Threads / Open
                    Threads. Gated on SA 1.2 because this UI only exists in
                    that mode — showing it while the workspace is in SA 1.0
                    would be misleading. Styling mirrors the live sticky
                    header at src=`headers.map(...)` above (bg-muted/70 with
                    a chevron + uppercase label + optional red unread chip),
                    just scaled down and framed in a rounded container so it
                    reads as a screenshot inside the copy. */}
                {superAgent12Enabled && (
                  <div className="mt-2 max-w-sm overflow-hidden rounded-md border border-border/60 bg-background">
                    <div className="flex items-center gap-1.5 border-b border-border/70 bg-muted/70 px-3 py-1.5">
                      <ChevronRight
                        className="h-3.5 w-3.5 shrink-0 rotate-90 text-muted-foreground"
                        aria-hidden
                      />
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground">
                        Needs Action
                      </span>
                      <span
                        className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold leading-none tabular-nums text-destructive-foreground"
                        aria-hidden
                      >
                        3
                      </span>
                    </div>
                    <div className="flex items-center gap-2 border-b border-border/40 px-3 py-1.5">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive ring-2 ring-background"
                        aria-hidden
                      />
                      <span className="truncate text-[10px] text-foreground">
                        Alma Sanchez
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        · SMS · 3m ago
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-muted/70 px-3 py-1.5">
                      <ChevronRight
                        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground">
                        No Action Needed
                      </span>
                    </div>
                  </div>
                )}

                <p className="mt-2 text-xs text-muted-foreground">
                  Inside Property Threads (and Open Threads), the list is
                  split into two collapsible sections so the most urgent work
                  is always at the top:
                </p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                  <li>
                    <span className="font-medium text-foreground">Needs Action</span>{" "}
                    — threads still waiting on a staff reply (the resident or
                    lead sent the last public message, or a Thread Automation
                    follow-up reminder has fired). This section is uncapped
                    so nothing that needs attention drops below the fold.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">No Action Needed</span>{" "}
                    — threads a staff member has already replied to. Kept as
                    context and capped at 15 rows so the section reads as a
                    &ldquo;recently handled&rdquo; log, not a working queue.
                  </li>
                </ul>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  The red unread chip lights up on whichever section contains
                  unread threads. Most of the time that&apos;s just{" "}
                  <span className="font-medium text-foreground">Needs Action</span>,
                  because staff typically read a thread the moment they
                  reply and it slides down to{" "}
                  <span className="font-medium text-foreground">No Action Needed</span>{" "}
                  already read. If you ever right-click a thread in{" "}
                  <span className="font-medium text-foreground">No Action Needed</span>{" "}
                  and pick <span className="font-medium text-foreground">Mark as unread</span>,
                  it gets the red dot back on the card, contributes to the
                  sidebar and quick-filter counts, and lights its own
                  section-header chip — so triage marks stay visible no
                  matter where the thread lives.
                </p>
              </div>

              {/* Thread Automation follow-ups — copy updated to reflect the
                  marker change: follow-up threads no longer show a cyan
                  bell in the top-left corner. They use the standard red
                  unread dot like anything else and gain a cyan "Follow up"
                  chip in the metadata row so the automation trigger is
                  still identifiable at a glance. */}
              <div className="rounded-md border border-border/60 bg-muted/40 p-3">
                <div className="flex items-center gap-2">
                  <BellRing className="h-3.5 w-3.5 shrink-0 text-cyan-700 dark:text-cyan-300" strokeWidth={2} aria-hidden />
                  <p className="text-xs font-semibold">Thread Automation follow-ups</p>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Under{" "}
                  <span className="font-medium text-foreground">
                    Thread Settings → Thread Automation
                  </span>
                  , you can set follow-up thresholds (for example, 3, 7, or
                  10 days). When staff has sent the last reply and the
                  resident or lead hasn&apos;t responded within one of those
                  windows, the thread gets a follow-up reminder — it flips
                  back to unread, moves into{" "}
                  <span className="font-medium text-foreground">Needs Action</span>
                  , and starts counting toward the red badges, so nothing
                  waiting on the resident quietly falls off the list.
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  A reminded thread keeps the same{" "}
                  <span
                    className="inline-flex h-3.5 w-3.5 items-center justify-center align-middle"
                    aria-hidden
                  >
                    <span className="h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
                  </span>{" "}
                  red unread dot as any other unread thread and picks up a{" "}
                  <span className="inline-flex items-center gap-1 rounded bg-cyan-100/70 px-1.5 py-px align-middle text-[10px] font-semibold text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200">
                    <BellRing className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                    Follow up
                  </span>{" "}
                  chip in the metadata row, so you can tell reminder-driven
                  threads apart from new-message threads at a glance. Every
                  trigger is also logged on the thread&apos;s activity
                  timeline.
                </p>
              </div>

              {/* Quick Filter — copy updated so the "add up to the sidebar
                  badge" claim describes the current unread math instead of
                  the retired "needs action" math. */}
              <div className="rounded-md border border-border/60 bg-muted/40 p-3">
                <p className="text-xs font-semibold">Quick Filter</p>

                {/* Mini illustration of the actual channel Quick Filter row
                    that sits above the search bar. Gated on SA 1.2 because
                    the tile row only exists in that mode. Styling mirrors
                    the live tiles (see the `superAgent12Enabled &&
                    quickFilterEnabled` block earlier in this file): a
                    `hsl(207 73% 95%)` fill + inset ring for the active
                    tile, muted foreground icons for the rest, and a red
                    destructive-bg unread pill next to whichever tile has
                    work waiting. Scaled slightly smaller so it reads as a
                    screenshot inside the copy rather than a functional
                    control. */}
                {superAgent12Enabled && (
                  <div className="mt-2 max-w-sm rounded-md border border-border/60 bg-background p-1.5">
                    <div className="flex items-center gap-1">
                      <div className="flex h-7 flex-1 items-center justify-center rounded-md bg-[hsl(207_73%_95%)] text-[hsl(207_73%_25%)] ring-1 ring-inset ring-[hsl(207_73%_75%)] dark:bg-[hsl(207_73%_20%)] dark:text-[hsl(207_73%_92%)] dark:ring-[hsl(207_73%_35%)]">
                        <span className="text-[10px] font-bold uppercase tracking-wide">
                          All
                        </span>
                      </div>
                      <div className="flex h-7 flex-1 items-center justify-center rounded-md text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                      </div>
                      <div className="flex h-7 flex-1 items-center justify-center gap-1 rounded-md text-muted-foreground">
                        <MessageSquareText className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                        <span
                          className="inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold leading-none tabular-nums text-destructive-foreground"
                          aria-hidden
                        >
                          3
                        </span>
                      </div>
                      <div className="flex h-7 flex-1 items-center justify-center rounded-md text-muted-foreground">
                        <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                      </div>
                      <div className="flex h-7 flex-1 items-center justify-center rounded-md text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                      </div>
                    </div>
                  </div>
                )}

                <p className="mt-2 text-xs text-muted-foreground">
                  The compact channel row above the search bar narrows the
                  current inbox to a single channel (Voice, SMS, Chat, or
                  Email). Each tile carries its own red unread count, and the
                  four counts always add up to the sidebar badge — so
                  you&apos;re looking at the same unread set, just sliced by
                  channel. You can toggle the Quick Filter&apos;s visibility
                  under{" "}
                  <span className="font-medium text-foreground">
                    Thread Settings → Defaults
                  </span>
                  .
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" onClick={() => setInboxHelpOpen(false)}>Got it</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={bulkResolveConfirmOpen} onOpenChange={setBulkResolveConfirmOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Resolve {bulkSelectedIds.size} {bulkSelectedIds.size === 1 ? "conversation" : "conversations"}?</DialogTitle>
              <DialogDescription>
                This will mark the selected {bulkSelectedIds.size === 1 ? "thread" : "threads"} as resolved. You can reopen them later if needed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setBulkResolveConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  for (const id of bulkSelectedIds) {
                    resolveConversation(id, MY_INBOX_ASSIGNEE);
                  }
                  setBulkSelectedIds(new Set());
                  setBulkSelectMode(false);
                  setBulkResolveConfirmOpen(false);
                }}
              >
                Resolve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* SA 1.2: Eli Prompt modal — pre-send gate.
            Opens whenever staff hits Send on ANY thread where Eli is
            still on (escalated or not). The reply is buffered in
            `eliPromptPendingSend` and _will not_ send until staff picks
            one of the two options:
              • Turn Eli off (until the escalation is resolved, or
                indefinitely if there's no escalation on the thread)
              • Keep Eli on — resolves any active escalation labels as
                a side effect and lets Eli continue responding
            Picking an option + clicking "Send reply" commits both the
            Eli mode change and the buffered message together. Cancel /
            ESC / X discard the pending record but leave the composer
            text alone so staff can edit and try again — no cadence
            stamp is written, so the modal re-opens on the next Send
            attempt. */}
        <Dialog
          open={eliPromptOpen}
          onOpenChange={(open) => {
            if (open) return;
            // Cancel path — release the buffered send without committing.
            // Composer text is intentionally left intact.
            setEliPromptOpen(false);
            setEliPromptPendingSend(null);
            setEliPromptChoice(null);
          }}
        >
          <DialogContent className="sm:max-w-md">
            {(() => {
              // Look up the thread we're prompting for so the modal can
              // reference the resident by name in the body copy.
              const eliPromptConversation = eliPromptForThreadId
                ? conversations.find((c) => c.id === eliPromptForThreadId)
                : undefined;
              const eliPromptResidentName = eliPromptConversation?.resident;
              // Active escalation label(s) on this thread. "Keep Eli on"
              // is paired with resolving these — the staff reply is
              // treated as the resolution, escalation labels are cleared,
              // and Eli picks the thread back up. If the thread is a
              // voice-origin escalation with no literal label, we still
              // stamp a generic resolved_escalation activity so
              // `hasActiveAiEscalation` flips false. If the thread has
              // NO active escalation at all (post-DEV-321796: the gate
              // now fires for any Eli-on thread, not just escalated
              // ones), we skip the resolve-activity stamp entirely and
              // just let "keep Eli on" mean "keep responding" without
              // pretending anything was resolved.
              const eliPromptActiveEscalationLabels =
                eliPromptConversation?.labels.filter((l) =>
                  l.endsWith("Escalation"),
                ) ?? [];
              const eliPromptHasMultipleEscalations =
                eliPromptActiveEscalationLabels.length > 1;
              const eliPromptHasEscalationToResolve =
                eliPromptConversation !== undefined &&
                hasActiveAiEscalation(eliPromptConversation);

              // Commit path — apply the Eli mode change chosen in the radio
              // group, then addMessage the buffered reply, then reset the
              // composer and close. Guards against the (unlikely) race where
              // the modal is open with no choice picked and no pending send.
              const commitPendingSend = () => {
                if (!eliPromptChoice || !eliPromptPendingSend) return;
                const { threadId, payload, inputMode: pendingMode } =
                  eliPromptPendingSend;
                if (eliPromptChoice === "off") {
                  // Eli-Prompt "Turn off Eli":
                  //   • Escalated thread → "off until the escalation is
                  //     resolved"; the auto-resume effect flips Eli back
                  //     on the moment the last escalation clears.
                  //   • Non-escalated thread → "off indefinitely" because
                  //     there IS no escalation to resolve. If we stamped
                  //     until-resolved here, Eli would never auto-resume
                  //     and the effect would look identical anyway — but
                  //     the audit trail should reflect that this was a
                  //     manual, staff-driven takeover, not an escalation
                  //     handoff.
                  applyEliModeChange(
                    threadId,
                    {
                      kind: "off",
                      policy: eliPromptHasEscalationToResolve
                        ? "until-resolved"
                        : "indefinite",
                    },
                    "prompt",
                  );
                } else {
                  // "on" means "keep Eli responding". If there was an
                  // active escalation, staff's reply is treated as the
                  // resolution — that's handled below. If not (SA 1.2
                  // demo where the gate fires on any Eli-on thread), we
                  // just stamp a manual "on" mode-change so the audit
                  // trail records the decision and let the reply through.
                  applyEliModeChange(threadId, { kind: "on" }, "prompt");
                }
                addMessage(threadId, payload);

                // "Resolve escalation" post-send bookkeeping. Only runs
                // when the thread actually had an active AI escalation at
                // gate time — on a non-escalated Eli-on thread there's
                // nothing to resolve, so we skip the activity stamp
                // (avoids a misleading "resolved_escalation" card on a
                // thread that was never escalated). Stamped AFTER the
                // staff reply so the timeline reads: reply → resolution
                // notice → thread continues.
                if (eliPromptChoice === "on" && eliPromptHasEscalationToResolve) {
                  const resolveTimestamp = new Date().toLocaleString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                      timeZoneName: "short",
                    },
                  );
                  const labelsForResolveActivity =
                    eliPromptActiveEscalationLabels.length > 0
                      ? eliPromptActiveEscalationLabels
                      : ["AI Escalation"];
                  addMessage(threadId, {
                    role: "staff",
                    text: "",
                    timestamp: resolveTimestamp,
                    type: "label_activity",
                    labelActivity: {
                      actor: MY_INBOX_ASSIGNEE,
                      labelsAdded: labelsForResolveActivity,
                      action: "resolved_escalation",
                    },
                  });
                  for (const label of eliPromptActiveEscalationLabels) {
                    removeLabel(threadId, label);
                  }
                }

                // Clear the SA 1.2 escalation-reply picker selections so the
                // composer resets cleanly. Mirrors the non-gated post-send
                // path where `selectedEscalationTypes` gets drained.
                setSelectedEscalationTypes(new Set());
                superAgentSelectionsRef.current.set(threadId, new Set());

                markEliPromptShown(threadId);
                const convo =
                  conversations.find((c) => c.id === threadId) ?? null;
                resetComposerAfterSend(convo, pendingMode);
                setPrivateNoteMention(null);
                setEliPromptOpen(false);
                setEliPromptPendingSend(null);
                setEliPromptChoice(null);
              };

              // Renders one big option tile. The tile is the click-target
              // (role="radio"); an icon + one-word title + short subtitle
              // makes the choice legible at a glance. The selected tile
              // takes a colored ring + faint tint in its "own" semantic
              // color (green for resolve, muted for turn-off) so the two
              // choices read as *different in kind*, not just different in
              // position. Keyboard support (Space/Enter) is wired manually.
              const renderOptionTile = (
                id: "off" | "on",
                {
                  icon: Icon,
                  iconBg,
                  iconRing,
                  selectedBorder,
                  selectedBg,
                  title,
                  subtitle,
                }: {
                  icon: typeof CheckCircle2;
                  iconBg: string;
                  iconRing: string;
                  selectedBorder: string;
                  selectedBg: string;
                  title: string;
                  subtitle: string;
                },
              ) => {
                const selected = eliPromptChoice === id;
                return (
                  <div
                    key={id}
                    role="radio"
                    tabIndex={0}
                    aria-checked={selected}
                    onClick={() => setEliPromptChoice(id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setEliPromptChoice(id);
                      }
                    }}
                    className={cn(
                      "group relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      selected
                        ? cn(selectedBorder, selectedBg, "shadow-sm")
                        : "border-input bg-background hover:border-input hover:bg-accent/30",
                    )}
                  >
                    {/* Selected-state check mark in the top-right corner —
                        gives an unambiguous "this is the picked one"
                        indicator on top of the ring + tint. */}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full transition-opacity",
                        selected
                          ? cn(iconBg, "opacity-100")
                          : "opacity-0",
                      )}
                    >
                      <Check
                        className={cn("h-3 w-3", iconRing)}
                        strokeWidth={3}
                      />
                    </span>
                    {/* Circular icon — semantic color per option. */}
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        iconBg,
                      )}
                    >
                      <Icon
                        className={cn("h-5 w-5", iconRing)}
                        strokeWidth={2.25}
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight">
                        {title}
                      </p>
                      <p className="mt-1 text-xs leading-snug text-muted-foreground">
                        {subtitle}
                      </p>
                    </div>
                  </div>
                );
              };

              return (
                <>
                  <DialogHeader>
                    <DialogTitle>What should Eli do next?</DialogTitle>
                    <DialogDescription>
                      Your reply
                      {eliPromptResidentName ? ` to ${eliPromptResidentName}` : ""}{" "}
                      won&apos;t send until you pick. Change it any time from
                      the AI On/Off control on the thread.
                    </DialogDescription>
                  </DialogHeader>

                  <div
                    role="radiogroup"
                    aria-label="What should Eli do on this thread going forward?"
                    className="grid grid-cols-2 gap-3"
                  >
                    {promptOptionKeepOnEnabled &&
                      renderOptionTile("on", {
                        icon: CheckCircle2,
                        iconBg: "bg-status-success",
                        iconRing: "text-status-success-foreground",
                        selectedBorder: "border-status-success",
                        selectedBg: "bg-status-success/10",
                        title: eliPromptHasEscalationToResolve
                          ? eliPromptHasMultipleEscalations
                            ? "Resolve escalations"
                            : "Resolve escalation"
                          : "Keep Eli on",
                        subtitle: eliPromptHasEscalationToResolve
                          ? "Eli turns back on"
                          : "Eli continues responding",
                      })}

                    {promptOptionOffEnabled &&
                      renderOptionTile("off", {
                        icon: BotOff,
                        iconBg: "bg-muted-foreground",
                        iconRing: "text-background",
                        selectedBorder: "border-foreground",
                        selectedBg: "bg-muted/60",
                        title: "Turn off Eli",
                        subtitle: eliPromptHasEscalationToResolve
                          ? eliPromptHasMultipleEscalations
                            ? "Until escalations are resolved"
                            : "Until escalation is resolved"
                          : "Staff will handle this thread",
                      })}
                  </div>

                  <DialogFooter className="gap-2 sm:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEliPromptOpen(false);
                        setEliPromptPendingSend(null);
                        setEliPromptChoice(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={!eliPromptChoice || !eliPromptPendingSend}
                      onClick={commitPendingSend}
                    >
                      Send reply
                    </Button>
                  </DialogFooter>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* List */}
        <TooltipProvider delayDuration={250}>
          {/*
            SA 1.2 renders the two buckets ("Needs Action" and "No Action
            Needed") as inline section headers inside a single scrolling
            list — one column, one scrollbar, one flow. The headers are
            still full-width toggle buttons that can collapse their bucket,
            so the grouping affordance stays intact; they just aren't
            pinned inside their own independent scroll containers anymore.
            For SA 1.0, Eli Threads, Closed Threads (or any SA 1.2
            sub-filter that isn't "all" / "sa12-escalated") the same
            single-scroll region drops the section headers entirely — the
            `sa12GroupingActive` check below handles the branch.

            The outer wrapper is `relative` so the "Breakouts Example"
            peek pill (see the SA 1.2 branch below) can be absolutely
            positioned inside the list column, floating over the bottom
            edge of the scroll region without being clipped by it.
          */}
          <div className="relative flex flex-1 flex-col min-h-0">
            {(() => {
              /*
                Bucket computation (SA 1.2 only). When grouping is off,
                both bucket arrays stay empty and the dispatch below
                short-circuits to the flat-list branch — we never render
                the `renderHeader` calls in that case.
              */
              const sa12GroupingActive =
                superAgent12Enabled &&
                (sidebarFilter === "all" || sidebarFilter === "sa12-escalated");
              // "No Action Needed" is capped at 15 rows — the section is
              // context, not a working queue, so keeping it short
              // prevents it from dominating the inbox. "Needs Action" is
              // intentionally uncapped in the *data* so nothing that
              // requires staff attention gets hidden below the fold; the
              // visible-3-rows cap is a *scroll-container* max-height,
              // not a slice, so extra rows scroll into view.
              const needsActionThreads = sa12GroupingActive
                ? filtered.filter(
                    (c) => isPropertyOwnedSA12(c) && needsStaffResponse(c),
                  )
                : [];
              const noActionThreads = sa12GroupingActive
                ? filtered
                    .filter(
                      (c) => !(isPropertyOwnedSA12(c) && needsStaffResponse(c)),
                    )
                    .slice(0, 15)
                : [];
              // Header chips: only the red "unread" chip is shown, and
              // only when the section contains at least one unread
              // thread. `isEffectivelyUnread` is a straight passthrough
              // of `hasUnread` (see the helper's JSDoc), so both
              // sections can light their chip — a "No Action Needed"
              // thread that staff manually marked unread lights the
              // "No Action Needed" header chip; the section is no
              // longer force-read.
              const needsActionUnreadCount = needsActionThreads.filter((c) =>
                isEffectivelyUnread(c),
              ).length;
              const noActionUnreadCount = noActionThreads.filter((c) =>
                isEffectivelyUnread(c),
              ).length;

              /*
                Section-header button used by both SA 1.2 buckets.
                Rendered inline in the shared scroll region — it scrolls
                out of view along with the section's rows, matching the
                "one continuous listing" behavior. Clicking the header
                still toggles that bucket's collapse state.
              */
              const renderHeader = (h: {
                key: string;
                label: string;
                unread: number;
                collapsed: boolean;
                onToggle: () => void;
              }) => {
                const unreadLabel =
                  h.unread === 1 ? "1 unread" : `${h.unread} unread`;
                return (
                  <button
                    key={h.key}
                    type="button"
                    onClick={h.onToggle}
                    aria-expanded={!h.collapsed}
                    aria-label={`${h.label}${h.unread > 0 ? ` · ${unreadLabel}` : ""}`}
                    className="flex w-full shrink-0 items-center gap-1.5 border-b border-border/70 bg-muted/70 px-3 py-1 text-left backdrop-blur transition-colors hover:bg-muted"
                  >
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                        !h.collapsed && "rotate-90",
                      )}
                      aria-hidden
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
                      {h.label}
                    </span>
                    {h.unread > 0 && (
                      <span
                        className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none tabular-nums text-destructive-foreground"
                        aria-hidden
                      >
                        {h.unread}
                      </span>
                    )}
                  </button>
                );
              };

              /*
                Full thread-card renderer. Kept as a closure so both the
                SA 1.2 split-pane branches and the flat-list branch below
                can reuse the same JSX. Closes over `selectedId`,
                `bulkSelectMode`, all the mark-read / open-context-menu
                handlers, `superAgent12Enabled`, and everything else
                from the surrounding component scope.
              */
              const renderThreadLi = (convo: (typeof filtered)[number]) => {
                  const isActive = convo.id === selectedId;
                  const emailRouting =
                    convo.channel === "Email"
                      ? getEmailThreadRoutingAddresses(convo.resident, convo.property)
                      : null;
                  const phoneRouting = emailRouting
                    ? null
                    : getVoiceOrSmsThreadRoutingNumbers(convo.resident, convo.property);
                  return (
                    <li key={convo.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (bulkSelectMode) {
                            setBulkSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(convo.id)) next.delete(convo.id);
                              else next.add(convo.id);
                              return next;
                            });
                            return;
                          }
                          // If an inline SMS/Email composer is currently
                          // winning the right pane (see
                          // `pendingSmsCompose` / `pendingEmailCompose`
                          // in the render block below), clicking a
                          // thread should "click away" from the
                          // composer and reveal the just-selected
                          // thread's conversation. Without this, the
                          // composer keeps rendering because both
                          // pending slots take precedence over
                          // `selected` in the right-pane ternary. The
                          // draft is intentionally discarded — the user
                          // explicitly navigated away.
                          setPendingSmsCompose(null);
                          setPendingEmailCompose(null);
                          if (isSuperAgentDemoThread(convo.id)) {
                            previousSelectedIdRef.current = selectedId;
                            setSelectedId(convo.id);
                            markRead(convo.id, MY_INBOX_ASSIGNEE);
                            const saved = superAgentSelectionsRef.current.get(convo.id);
                            if (!saved || saved.size === 0) {
                              setEscalationPickerSelections(new Set());
                              setEscalationPickerOpen(true);
                            }
                          } else {
                            setSelectedId(convo.id);
                            markRead(convo.id, MY_INBOX_ASSIGNEE);
                          }
                        }}
                        /* Right-click → open the read/unread context menu at
                           the cursor. Suppressed in bulk-select mode (the
                           row is a checkbox target then, not a thread
                           entry). Prevents the browser's default context
                           menu so ours can take over. */
                        onContextMenu={(e) => {
                          if (bulkSelectMode) return;
                          e.preventDefault();
                          setThreadContextMenu({
                            threadId: convo.id,
                            x: e.clientX,
                            y: e.clientY,
                          });
                        }}
                        className={cn(
                          // pl-6 (was pl-4): dedicate a 24px left gutter for the
                          // needs-action / follow-up markers so a 14px marker has
                          // ~5px of breathing room on both sides instead of sitting
                          // flush against the property name.
                          "relative flex w-full gap-1 py-3 pl-6 pr-4 text-left transition-colors",
                          bulkSelectMode ? "items-start" : "flex-col",
                          isActive && !bulkSelectMode
                            ? "border-l-2 border-l-primary bg-accent"
                            : bulkSelectedIds.has(convo.id)
                              ? "bg-primary/5"
                            : "hover:bg-accent/50"
                        )}
                      >
                        {bulkSelectMode && (
                          <div className="mt-0.5 mr-2 shrink-0">
                            <Checkbox
                              checked={bulkSelectedIds.has(convo.id)}
                              onCheckedChange={() => {}}
                              className="pointer-events-none"
                            />
                          </div>
                        )}
                        <div className={cn("flex w-full flex-col gap-1", bulkSelectMode && "min-w-0 flex-1")}>
                        {/* Unread indicator — classic red inbox dot pinned to
                            the top-left corner of the row. Uses the SA 1.2
                            "effective unread" helper so threads that fall
                            into the "No Action Needed" group render as read
                            regardless of their stored `hasUnread`; in SA 1.0
                            / non-SA modes it falls back to `hasUnread`
                            directly. Cleared when staff opens the thread via
                            markRead. Follow-up threads keep the same dot
                            here — their "Follow up" identity comes from the
                            inline bell chip in the metadata row instead.
                            Bulk-select mode reclaims the corner for the
                            checkbox, so we suppress there. */}
                        {isEffectivelyUnread(convo) && !bulkSelectMode && (
                          <span
                            aria-label="Unread message"
                            title="Unread message"
                            className="absolute left-1 top-3 flex h-3.5 w-3.5 items-center justify-center"
                          >
                            <span className="h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background shadow-[0_0_2px_rgba(255,255,255,0.9)] dark:shadow-none" />
                          </span>
                        )}
                        <div className="flex items-start justify-between gap-2 pr-0.5">
                          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[10px] font-medium tracking-wide text-muted-foreground">
                            {emailRouting ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-default border-b border-dotted border-muted-foreground/50 hover:border-muted-foreground hover:text-foreground">
                                    {convo.property}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" align="start" className="max-w-[min(280px,calc(100vw-2rem))] p-0">
                                  <div className="space-y-2 px-3 py-2">
                                    <div>
                                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                        From (resident)
                                      </p>
                                      <p className="break-all text-[11px] leading-snug text-foreground">
                                        {emailRouting.residentEmail}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                        To (property)
                                      </p>
                                      <p className="break-all text-[11px] leading-snug text-foreground">
                                        {emailRouting.propertyInboxEmail}
                                      </p>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ) : phoneRouting?.propertyLine ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-default border-b border-dotted border-muted-foreground/50 hover:border-muted-foreground hover:text-foreground">
                                    {convo.property}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" align="start" className="max-w-[min(280px,calc(100vw-2rem))] p-0">
                                  <div className="space-y-2 px-3 py-2">
                                    <div>
                                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                        From (resident)
                                      </p>
                                      <p className="font-mono text-[11px] tabular-nums leading-snug text-foreground">
                                        {phoneRouting.residentPhone}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                        To (property)
                                      </p>
                                      <p className="font-mono text-[11px] tabular-nums leading-snug text-foreground">
                                        {phoneRouting.propertyLine}
                                      </p>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              convo.property
                            )}
                          </span>
                          {/*
                            Thread Automation follow-up chip — lives in the top
                            metadata row (alongside the channel chip) so it reads
                            as thread provenance rather than a resident-applied
                            label. Amber matches the corner dot and the activity
                            timeline row so the automation is visually unified.
                            Suppressed on Eli-owned threads: Eli handles those
                            conversations, so staff has no action to take even
                            when a reminder is logged on the thread.
                          */}
                          {(() => {
                            if (!superAgent12Enabled) return false;
                            if (convo.status !== "open") return false;
                            if (!hasActiveFollowUpReminder(convo)) return false;
                            return isPropertyOwnedSA12(convo);
                          })() && (
                            <span
                              aria-label="Follow-up reminder triggered by Thread Automation"
                              title="Follow-up reminder triggered by Thread Automation"
                              className="inline-flex shrink-0 items-center gap-1 rounded bg-cyan-100/70 px-1.5 py-px text-[10px] font-semibold text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200"
                            >
                              <BellRing className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
                              Follow up
                            </span>
                          )}
                          <ConversationListChannelChip channel={convo.channel} />
                          {convo.additionalChannels?.map((ch) => (
                            <ConversationListChannelChip key={ch} channel={ch} />
                          ))}
                          {translationEnabled && (() => {
                            const lang = conversationDetectedLanguage(convo);
                            return lang ? <ConversationListLanguageChip language={lang} /> : null;
                          })()}
                        </div>
                      <div className="flex items-center justify-between gap-2">
                        {convo.additionalResidents && convo.additionalResidents.length > 0 ? (
                          <span
                            className={cn(
                              "truncate text-sm italic text-muted-foreground",
                              isEffectivelyUnread(convo) && "font-semibold text-foreground",
                            )}
                            title="Multiple resident profiles are linked to this conversation"
                          >
                            Multiple Profiles
                          </span>
                        ) : (
                          <span className={cn("truncate text-sm", isEffectivelyUnread(convo) ? "font-bold" : "font-semibold")}>
                          {convo.resident}
                        </span>
                        )}
                        <div className="flex shrink-0 items-center gap-1.5">
                          {(() => {
                            if (!followUpEnabled) return null;
                            if (convo.status !== "open") return null;
                            const ch = (convo.channel || "").toLowerCase();
                            if (ch !== "sms" && ch !== "email") return null;
                            if (!isWaitingOnResidentPublicReply(convo)) return null;
                            // SA 1.2: Eli owns Eli Threads end-to-end, so no
                            // staff-directed "no reply" prompt shows there.
                            if (superAgent12Enabled) {
                              if (!isPropertyOwnedSA12(convo)) return null;
                            }
                            // Multi-threshold display: use the shortest configured
                            // threshold since it's when the marker first fires. Additional
                            // thresholds (7d, 10d, …) still exist and drive their own
                            // reminders — this badge just shows the entry point.
                            const shortest = Math.min(...followUpDaysList);
                            const persona = personaFromAILabels(convo.labels) === "Resident" ? "resident" : "lead";
                            const listLabel = followUpDaysList.length > 1
                              ? `Follow-up thresholds: ${followUpDaysList.map((n) => `${n}d`).join(", ")}`
                              : `No reply from ${persona} for ${shortest} day${shortest === 1 ? "" : "s"}`;
                            return (
                              <Badge
                                variant="secondary"
                                title={listLabel}
                                className="h-auto gap-1 bg-status-warning px-1.5 py-0.5 text-[10px] leading-none text-status-warning-foreground"
                              >
                                <Clock className="h-3 w-3" strokeWidth={2} />
                                No reply · {shortest}d{followUpDaysList.length > 1 ? "+" : ""}
                              </Badge>
                            );
                          })()}
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {convo.time}
                          </span>
                      </div>
                      </div>
                      <p className={cn("truncate text-xs", isEffectivelyUnread(convo) ? "text-foreground" : "text-muted-foreground")}>{convo.preview}</p>
                      {(superAgent12Enabled && convo.status === "open") || convo.labels.length > 0 ? (
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {superAgent12Enabled && convo.status === "open" && (
                            isPropertyOwnedSA12(convo) ? (
                            <Badge
                                variant="secondary"
                                className="h-auto gap-1 bg-blue-100 px-1.5 py-0 text-[10px] text-blue-900 dark:bg-blue-900/40 dark:text-blue-100"
                              >
                                <Building className="h-3 w-3" strokeWidth={2} />
                                Property
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="h-auto gap-1 border border-eli-purple/30 bg-eli-warm-bg px-1.5 py-0 text-[10px] text-eli-warm-bg-foreground"
                              >
                                <Bot className="h-3 w-3" strokeWidth={2} />
                                Eli
                              </Badge>
                            )
                          )}
                          {collapseLabelsForThreadCard(convo.labels, superAgent12Enabled).map((chip) => {
                            if (chip.kind === "plain") {
                              return (
                                <Badge
                                  key={chip.label}
                                  variant="secondary"
                              className="h-auto px-1.5 py-0 text-[10px]"
                            >
                                  {chip.label}
                            </Badge>
                              );
                            }
                            const count = chip.labels.length;
                            return (
                              <span
                                key={chip.displayLabel}
                                className="inline-flex items-center gap-0.5"
                              >
                                <Badge
                                  variant="destructive"
                                  className="h-auto gap-1 px-1.5 py-0 text-[10px]"
                                >
                                  {chip.displayLabel}
                                  {count > 1 && (
                                    <span className="inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive-foreground/20 px-1 text-[9px] font-semibold leading-none text-destructive-foreground">
                                      {count}
                                    </span>
                                  )}
                                </Badge>
                                <EscalationIdHint
                                  conversationId={convo.id}
                                  labels={chip.labels}
                                  className="text-destructive"
                                />
                              </span>
                            );
                          })}
                        </div>
                      ) : null}
                      </div>
                      </button>
                    </li>
                  );
                };
                // ─── Dispatch ────────────────────────────────────────
                // Empty state first — cheapest exit and covers "search
                // matched nothing" identically for both grouping modes.
                if (filtered.length === 0) {
                  return (
                    <div className="flex flex-1 items-center justify-center p-6">
                      <p className="text-sm text-muted-foreground">
                        No conversations match the filters.
                      </p>
                    </div>
                  );
                }
                // SA 1.2 grouped layout: one scroll region, section
                // headers inline as row-like dividers that scroll along
                // with the content. Collapsing a header hides that
                // bucket's rows but keeps the header visible so it can
                // be re-expanded. The 15-item cap on `noActionThreads`
                // is still enforced upstream (bucket-computation
                // block) — that's a business rule about how much
                // context to surface, unrelated to layout — but it no
                // longer has anything to do with keeping "Needs Action"
                // pinned to the top.
                if (sa12GroupingActive) {
                  const hasAction = needsActionThreads.length > 0;
                  const hasNoAction = noActionThreads.length > 0;
                  /*
                    "Breakouts Example" peek pill. Only surfaces when:
                      · The Breakouts Example demo toggle is on (staff
                        opted into the proposed affordance for evaluation).
                      · "Needs Action" is expanded — a collapsed section
                        already frees the "No Action Needed" header, so
                        the pill would be redundant.
                      · There's at least one "No Action Needed" thread —
                        otherwise there's nothing to peek at.
                    Clicking it snaps the two-bucket state to "focus on
                    No Action Needed": collapse Needs Action, expand No
                    Action Needed. Absolutely positioned bottom-center of
                    the list column (the wrapper is `relative`) so the
                    pill floats over the last visible thread card
                    regardless of scroll position — same pattern as
                    Gmail's "N new" pill.
                  */
                  const showPeekPill =
                    breakoutsExampleEnabled &&
                    !sa12ActionCollapsed &&
                    hasNoAction;
                  return (
                    <>
                      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hover">
                        {hasAction && (
                          <>
                            {renderHeader({
                              key: "hdr-action-needed",
                              label: "Needs Action",
                              unread: needsActionUnreadCount,
                              collapsed: sa12ActionCollapsed,
                              onToggle: () => setSa12ActionCollapsed((v) => !v),
                            })}
                            {!sa12ActionCollapsed && (
                              <ul>{needsActionThreads.map((c) => renderThreadLi(c))}</ul>
                            )}
                          </>
                        )}
                        {hasNoAction && (
                          <>
                            {renderHeader({
                              key: "hdr-no-action-needed",
                              label: "No Action Needed",
                              unread: noActionUnreadCount,
                              collapsed: sa12NoActionCollapsed,
                              onToggle: () => setSa12NoActionCollapsed((v) => !v),
                            })}
                            {!sa12NoActionCollapsed && (
                              <ul>{noActionThreads.map((c) => renderThreadLi(c))}</ul>
                            )}
                          </>
                        )}
              </div>
                      {showPeekPill && (
                        <div
                          className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center"
                          aria-hidden={false}
                        >
                          {/*
                            Pronounced peek pill: OXP-primary filled (black on
                            light, inverted on dark) so it reads as an active
                            action pinned to the list column rather than a
                            passive hint. A small numeric count chip on the
                            left uses a translucent-white pill so the "N"
                            reads instantly without competing with the label.
                            Shadow steps up on hover along with a lift and a
                            gentle chevron drop.
                          */}
                          <button
                            type="button"
                            onClick={() => {
                              // Snap to "focus on No Action Needed": hide
                              // the working queue, expand the read bucket.
                              setSa12ActionCollapsed(true);
                              setSa12NoActionCollapsed(false);
                            }}
                            className={cn(
                              "pointer-events-auto group flex items-center gap-2 whitespace-nowrap rounded-full border border-primary/20 bg-primary px-4 py-2",
                              "text-xs font-semibold text-primary-foreground shadow-xl",
                              "transition-all duration-150 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-2xl",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                            )}
                            aria-label={`Jump to ${noActionThreads.length} No Action Needed conversations`}
                          >
                            <span
                              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground/15 px-1.5 text-[11px] font-bold leading-none tabular-nums text-primary-foreground"
                              aria-hidden
                            >
                              {noActionThreads.length}
                            </span>
                            <span>
                              {noActionThreads.length === 1
                                ? "No Action Needed conversation"
                                : "No Action Needed conversations"}
                            </span>
                            <span className="flex items-center gap-1 border-l border-primary-foreground/25 pl-2 text-primary-foreground/80 group-hover:text-primary-foreground">
                              Tap to view
                              <ChevronDown
                                className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-y-0.5"
                                aria-hidden
                              />
                            </span>
                          </button>
                        </div>
                      )}
                    </>
                  );
                }
                // Flat-list fallback — SA 1.0, Eli Threads, Closed
                // Threads, and any SA 1.2 sidebar filter that isn't
                // "all" or "sa12-escalated". Single scroll container,
                // no grouping.
                return (
                  <div className="flex-1 overflow-y-auto scrollbar-hover">
                    <ul>{filtered.map((c) => renderThreadLi(c))}</ul>
                  </div>
                );
              })()}
          </div>
        </TooltipProvider>

        {/* Thread-list right-click context menu. Rendered inline (not
            portaled) but pinned with `fixed` positioning to the exact
            cursor coordinates captured on `onContextMenu`. High z-index
            (`z-[500]`) so it sits above the profile overlay, escalation
            panels, and the call-panel stack. The window-level effect on
            `threadContextMenu` handles outside-click / ESC / scroll
            dismissal, so we intentionally don't wire onBlur here. */}
        {threadContextMenu && (() => {
          const target = filtered.find((c) => c.id === threadContextMenu.threadId);
          if (!target) return null;
          return (
            <div
              role="menu"
              aria-label="Thread actions"
              style={{ left: threadContextMenu.x, top: threadContextMenu.y }}
              className="fixed z-[500] min-w-[180px] rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-lg"
              // Swallow the initial mousedown that opens the menu so the
              // window-level "close on any mousedown" listener doesn't
              // immediately close it before the click has a chance to
              // register on a menu item.
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (target.hasUnread) {
                    markRead(target.id, MY_INBOX_ASSIGNEE);
                  } else {
                    markUnread(target.id);
                  }
                  setThreadContextMenu(null);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-accent focus:bg-accent focus:outline-none"
              >
                {target.hasUnread ? (
                  <>
                    <MailOpen className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    <span>Mark as read</span>
                  </>
                ) : (
                  <>
                    <span className="inline-flex h-3.5 w-3.5 items-center justify-center" aria-hidden>
                      <span className="h-2 w-2 rounded-full bg-destructive" />
                    </span>
                    <span>Mark as unread</span>
                  </>
                )}
              </button>
            </div>
          );
        })()}
      </div>

      {/* ===== CONVERSATION DETAIL ===== */}
      {/*
        Right-pane switch: when the Entrata global-search "SMS" or
        "Email" button hands off a `pendingSmsCompose` /
        `pendingEmailCompose` recipient, we render the matching inline
        composer in this exact slot instead of the selected-thread
        view. Both composers fill the same flex column, so the
        thread-list left column stays anchored and only the right pane
        swaps. Cancel/Escape inside either composer clears its pending
        slot, which drops us back into the ternary below and re-renders
        the previously-selected thread (or the empty state if none was
        selected).

        SMS takes precedence over Email if both slots are somehow set
        simultaneously — arbitrary but deterministic; in practice the
        top-nav only ever populates one at a time.
      */}
      <div className={cn("flex min-w-0 flex-1 flex-col", (callSystemPanelOpen || manageInboxPanelOpen) && "hidden")}>
        {pendingSmsCompose ? (
          <EntrataInlineSmsComposer
            recipient={pendingSmsCompose}
            onNameClick={(draft) => {
              // Open the Entrata profile curtain for the SMS recipient
              // AND seed the curtain's right-side "new thread" composer
              // with the in-progress SMS draft — so the message the staff
              // was typing "flows over" into the profile view instead of
              // being hidden behind the curtain. `pendingSmsCompose` is
              // intentionally NOT cleared so closing the curtain returns
              // the user to the same top-level SMS composer with their
              // draft intact.
              const fromOpts = getPropertyFromChannelOptionsForProperty(
                pendingSmsCompose.property
              );
              const smsFrom = fromOpts.find((o) => o.channel === "SMS");
              setNewThreadOutbound({
                channel: "SMS",
                // Omit `from` when we don't have real vanity data — the
                // panel hides the FROM section rather than showing a
                // placeholder like "(property vanity)".
                ...(smsFrom?.from ? { from: smsFrom.from } : {}),
                propertyName: pendingSmsCompose.property,
              });
              setThreadDraft(draft);
              setNewThreadSubject("");
              setOpenThreadIdx(-1);
              setProfileResidentOverride(pendingSmsCompose.name);
              setProfileModalOpen(true);
              setThreadsPanelOpen(true);
              setProfilePanelInboxOpen(false);
            }}
          />
        ) : pendingEmailCompose ? (
          <EntrataInlineEmailComposer
            recipient={pendingEmailCompose}
            onNameClick={(subject, body) => {
              // Same pattern as the SMS composer above — bring the
              // in-progress email (subject + body) into the curtain's
              // right-side new-thread composer, keep `pendingEmailCompose`
              // set so closing the curtain returns to the top-level
              // email composer with everything intact.
              const fromOpts = getPropertyFromChannelOptionsForProperty(
                pendingEmailCompose.property
              );
              const emailFrom = fromOpts.find((o) => o.channel === "Email");
              setNewThreadOutbound({
                channel: "Email",
                // Same as SMS above — hide FROM section when no real
                // property email is on file.
                ...(emailFrom?.from ? { from: emailFrom.from } : {}),
                propertyName: pendingEmailCompose.property,
              });
              setThreadDraft(body);
              setNewThreadSubject(subject);
              setOpenThreadIdx(-1);
              setProfileResidentOverride(pendingEmailCompose.name);
              setProfileModalOpen(true);
              setThreadsPanelOpen(true);
              setProfilePanelInboxOpen(false);
            }}
          />
        ) : selected ? (
          <>
            {/* Header */}
            <div className="shrink-0 border-b border-border bg-card px-5 py-3">
              {/* Row 1: Name + Assignee + Resolve */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {selected.additionalResidents && selected.additionalResidents.length > 0 ? (
                    <Popover open={multiProfilePickerOpen} onOpenChange={setMultiProfilePickerOpen}>
                      <PopoverTrigger asChild>
                  <button
                          type="button"
                          className="flex items-center gap-1.5 text-base font-semibold leading-tight text-foreground hover:text-blue-600 transition-colors cursor-pointer"
                          title="Multiple resident profiles are linked to this conversation"
                        >
                          <span className="italic">View Multiple Profiles</span>
                          <ChevronDown className="h-4 w-4 opacity-70" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-72 p-1">
                        <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Linked resident profiles
                        </p>
                        {[
                          { name: selected.resident, property: selected.property },
                          ...selected.additionalResidents.map((r) => ({
                            name: r.name,
                            property: r.property ?? selected.property,
                          })),
                        ].map((profile) => (
                          <button
                            key={`${profile.name}::${profile.property}`}
                            type="button"
                            onClick={() => {
                              setProfileResidentOverride(profile.name);
                              setMultiProfilePickerOpen(false);
                              setProfileModalOpen(true);
                              setThreadsPanelOpen(true);
                              setOpenThreadIdx(null);
                              setProfilePanelInboxOpen(true);
                            }}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/60"
                          >
                            <div className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                              avatarColor(profile.name),
                            )}>
                              {initials(profile.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-foreground">{profile.name}</p>
                              <p className="truncate text-[11px] text-muted-foreground">{profile.property}</p>
                            </div>
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <button
                    type="button"
                    onClick={() => {
                      setProfileModalOpen(true);
                      setThreadsPanelOpen(true);
                      setOpenThreadIdx(null);
                      setProfilePanelInboxOpen(true);
                    }}
                    className="text-base font-semibold leading-tight hover:underline hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    {selected.resident}
                  </button>
                  )}
                  {(!selected.additionalResidents || selected.additionalResidents.length === 0) && (
                  <span className="text-sm text-muted-foreground">{selected.property}</span>
                  )}
                  {/*
                    SA 1.2 Testing mode — session-id chip sits to the
                    right of the property. Clicking opens the Trace
                    panel (Entrata Internal / User View) so demoers can
                    inspect the MCP tool calls Eli made to produce the
                    last reply on this thread. Hidden entirely unless
                    both SA 1.2 and Testing are on so the header stays
                    quiet in every other mode.
                  */}
                  {superAgent12Enabled && testingModeEnabled && (() => {
                    /*
                      Combined session-id + rating chip. Starts as a
                      plain session-id pill; the first click kicks off
                      a simulated "quality analysis" call (imagined to
                      be a separate rating tool the orchestrator hands
                      off to). During the analysis the chip shows a
                      spinner appended to the session id; once the
                      analysis returns, the score pill fuses into the
                      same button so it reads as one control (session
                      id | score). Every click also opens the trace
                      modal — subsequent clicks are cheap because the
                      analysis result is cached per thread.
                    */
                    const analysisState = ratingAnalysisByThread.get(selected.id);
                    const rating = analysisState === "loaded" ? buildRatingForThread(selected) : null;
                    const isPass = rating ? rating.finalScore >= 85 : false;

                    // Score segment coloring — green when passing, red
                    // (or amber for capped) otherwise. Applied only to
                    // the score half of the fused pill so the session
                    // id half stays visually neutral.
                    const scoreSegmentClass = !rating
                      ? ""
                      : isPass
                      ? "bg-emerald-50 text-emerald-800 border-l-emerald-300"
                      : "bg-red-50 text-red-800 border-l-red-300";

                    const handleClick = () => {
                      // First click on a thread we haven't analyzed
                      // yet: kick off the loading state and simulate a
                      // ~900ms round-trip to the rating tool.
                      if (!analysisState) {
                        setRatingAnalysisByThread((prev) => {
                          const next = new Map(prev);
                          next.set(selected.id, "loading");
                          return next;
                        });
                        window.setTimeout(() => {
                          setRatingAnalysisByThread((prev) => {
                            // Guard against a stale timeout arriving
                            // after the entry was reset — unlikely, but
                            // keeps the state machine tidy.
                            if (prev.get(selected.id) !== "loading") return prev;
                            const next = new Map(prev);
                            next.set(selected.id, "loaded");
                            return next;
                          });
                        }, 900);
                      }
                      setTraceModalOpen(true);
                    };

                    return (
                      <button
                        type="button"
                        onClick={handleClick}
                        title={
                          !analysisState
                            ? "Open the trace for the last Eli reply on this thread — quality analysis runs on first click"
                            : analysisState === "loading"
                            ? "Running quality analysis…"
                            : rating!.capped
                            ? `ELI+ score ${rating!.finalScore}/100 — capped at ${rating!.capMaxScore} from weighted ${rating!.weightedScore}. Click for full trace + evaluation.`
                            : `ELI+ score ${rating!.finalScore}/100. Click for full trace + evaluation.`
                        }
                        aria-label={
                          rating
                            ? `Session ${makeSessionId(selected.id)} — ELI+ score ${rating.finalScore} out of 100. Open trace.`
                            : `Session ${makeSessionId(selected.id)}. Open trace and run quality analysis.`
                        }
                        className="inline-flex h-6 shrink-0 items-stretch overflow-hidden rounded-md border border-border bg-muted/50 font-mono text-[10px] text-muted-foreground transition-colors hover:border-eli-purple/40 hover:bg-eli-warm-bg hover:text-eli-purple"
                      >
                        {/* Session-id segment — always visible */}
                        <span className="inline-flex items-center gap-1 px-1.5">
                          {makeSessionId(selected.id)}
                          {analysisState === "loading" && (
                            <RefreshCw
                              className="h-2.5 w-2.5 animate-spin opacity-70"
                              aria-hidden
                            />
                          )}
                        </span>

                        {/* Score segment — appears once analysis is loaded, fused into the same pill */}
                        {rating && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 border-l px-1.5 font-semibold tabular-nums",
                              scoreSegmentClass,
                            )}
                          >
                            {rating.capped && (
                              <Lock className="h-2.5 w-2.5 opacity-70" aria-hidden />
                            )}
                            {rating.finalScore}
                            <span className="opacity-60">/100</span>
                          </span>
                        )}
                      </button>
                    );
                  })()}
                  {translationEnabled && (() => {
                    const lang = conversationDetectedLanguage(selected);
                    if (!lang) return null;
                    const langLabel = languageDisplayName(lang);
                    return (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                      <button
                        type="button"
                              onClick={toggleViewInEnglish}
                              aria-pressed={isViewingInEnglish}
                            className={cn(
                                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors",
                                isViewingInEnglish
                                  ? "border-purple-300 bg-purple-50 text-purple-900 hover:bg-purple-100 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-100"
                                  : "border-input bg-background text-foreground hover:bg-muted"
                              )}
                            >
                              <Languages className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              {isViewingInEnglish ? "Show original" : "Translate"}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" align="start">
                            {isViewingInEnglish
                              ? `Showing English for every message. Click to switch back to ${langLabel}.`
                              : `Detected ${langLabel}. Click to translate the entire thread to English.`}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-1.5 [&>*]:shrink-0">
                  {/* Labels icon popover */}
                  <Popover open={addLabelOpen} onOpenChange={(open) => { setAddLabelOpen(open); if (!open) setNewLabelText(""); }}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-[11px] font-medium transition-colors hover:bg-muted"
                        title="Labels"
                      >
                        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{selected.labels.length}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="end">
                      <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                {selected.labels.map((label) => (
                          <div key={label} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/60">
                            <span className="inline-flex min-w-0 items-center gap-0.5">
                  <Badge
                    variant={label.includes("Escalation") ? "destructive" : "outline"}
                    className={cn(
                      "gap-1 rounded-md text-xs font-normal",
                      label.includes("Escalation")
                                    ? "border-sky-200 bg-sky-50 text-sky-700"
                        : "border-border"
                    )}
                  >
                                {label.replace(/\s+\d+(?=\s+Escalation)/, "")}
                              </Badge>
                              {label.includes("Escalation") && (
                                <EscalationIdHint conversationId={selected.id} label={label} />
                              )}
                            </span>
                    <button
                      type="button"
                      onClick={() => removeLabel(selected.id, label)}
                              className="rounded-sm p-0.5 opacity-60 transition-opacity hover:opacity-100 hover:bg-muted"
                    >
                      <X className="h-3 w-3" />
                    </button>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-border p-2">
                      <Input
                        autoFocus
                        value={newLabelText}
                        onChange={(e) => setNewLabelText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newLabelText.trim()) {
                              const exists = allLabels.some((l) => l.toLowerCase() === newLabelText.toLowerCase());
                              if (exists) {
                                const match = allLabels.find((l) => l.toLowerCase() === newLabelText.toLowerCase())!;
                                if (!selected.labels.includes(match)) addLabel(selected.id, match, MY_INBOX_ASSIGNEE);
                              } else {
                            addLabel(selected.id, newLabelText.trim(), MY_INBOX_ASSIGNEE);
                              }
                            setNewLabelText("");
                          }
                        }}
                          placeholder="Search or create label…"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto border-t border-border">
                        {[...allLabels]
                          .sort((a, b) => a.localeCompare(b))
                        .filter((l) => !newLabelText.trim() || l.toLowerCase().includes(newLabelText.toLowerCase()))
                        .map((label) => {
                          const applied = selected.labels.includes(label);
                          return (
                            <button
                              key={label}
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                              onClick={() => {
                                if (applied) {
                                  removeLabel(selected.id, label);
                                } else {
                                  addLabel(selected.id, label, MY_INBOX_ASSIGNEE);
                                }
                              }}
                            >
                                <Check className={cn("h-3.5 w-3.5 shrink-0", applied ? "opacity-100 text-emerald-500" : "opacity-0")} />
                                <span className="truncate">{label.replace(/\s+\d+(?=\s+Escalation)/, "")}</span>
                            </button>
                          );
                        })}
                      {newLabelText.trim() && !allLabels.some((l) => l.toLowerCase() === newLabelText.toLowerCase()) && (
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors text-muted-foreground"
                          onClick={() => {
                            addLabel(selected.id, newLabelText.trim(), MY_INBOX_ASSIGNEE);
                            setNewLabelText("");
                            setAddLabelOpen(false);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">Create &ldquo;{newLabelText.trim()}&rdquo;</span>
                        </button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                  {(() => {
                    // In SA 1.2 the AI On/Off pill also appears on any thread carrying an
                    // "X AI Escalation" label, even without the base "X AI" activation
                    // label — since these threads are inherently AI-owned until staff
                    // takes over.
                    const hasAiLabel = selected.labels.some((label) => AI_ACTIVATION_OPT_IN_LABELS.has(label));
                    const hasAiEscalationLabel =
                      superAgent12Enabled && selected.labels.some((l) => l.endsWith(" AI Escalation"));
                    return hasAiLabel || hasAiEscalationLabel;
                  })() && (() => {
                    // SA 1.2 uses the same rich AI On/Off popover as SA 1.0: per-sub-agent
                    // status (Leasing / Renewals / Maintenance / Payments), AI Activated
                    // selector, phone/email opt-ins, and demo toggles for adding blocks.
                    const useSa1PopoverModel = isSuperAgent1DemoThread(selected.id) || superAgent12Enabled;
                    const sa1State = useSa1PopoverModel
                      ? computeSa1AiState(selected, aiActivated)
                      : null;
                    // SA 1.2: per-thread Eli mode. When Off, this trumps the
                    // SA 1.0-style per-product state on the pill — Eli mode
                    // is a thread-wide override (staff explicitly turned
                    // Eli off on this conversation). "On" defers back to
                    // the SA 1.0 computation so the rich AI-Product state
                    // remains visible for threads Eli is actively working.
                    const eliMode: EliMode | null = superAgent12Enabled
                      ? eliModeFor(selected.id)
                      : null;
                    const eliModeOverride = eliMode && eliMode.kind !== "on";
                    const pillVariant: "on" | "partial" | "off" = eliModeOverride
                      ? "off"
                      : sa1State
                      ? sa1State.kind === "on"
                        ? "on"
                        : sa1State.kind === "partial"
                        ? "partial"
                        : "off"
                      : aiActivated
                      ? "on"
                      : "off";
                    const pillLabel = eliModeOverride
                      ? "Eli Off"
                      : sa1State
                      ? sa1State.kind === "on"
                        ? "AI On"
                        : sa1State.kind === "partial"
                        ? "AI Partially Off"
                        : "AI Off"
                      : aiActivated
                      ? "AI On"
                      : "AI Off";
                    const pillClass =
                      pillVariant === "on"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                        : pillVariant === "partial"
                        ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                        : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300";
                    return (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors",
                            pillClass
                          )}
                          title="AI activation & opt-in settings"
                        >
                          <Zap className="h-3.5 w-3.5" />
                          {pillLabel}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className={cn("p-3", sa1State ? "w-[360px]" : "w-auto")}
                        align="end"
                      >
                        {/* SA 1.2: Eli Mode section — always visible at the top
                            of the popover in SA 1.2. Even when Eli is On (no
                            override), staff can preemptively turn off Eli
                            from here. This is the single source of truth
                            for the AI On/Off control per the user's spec. */}
                        {superAgent12Enabled && eliMode && (
                          <div className="mb-3 overflow-hidden rounded-md border border-border/70 bg-background">
                            {/* Status strip — semantic status tokens per the
                                design system so the current Eli state is
                                unambiguous at a glance:
                                  · On   → status-success (green)
                                  · Off  → muted (neutral)
                                The colored circular icon + bold state line +
                                short qualifier reads as a single "hero" chip. */}
                            {(() => {
                              const isOn = eliMode.kind === "on";
                              const isOff = eliMode.kind === "off";
                              // Policy is only defined on the "off" branch;
                              // pull it out so the qualifier can distinguish
                              // "off until resolved" (auto-resume) from
                              // "off indefinitely" (manual-only resume).
                              const offPolicy =
                                eliMode.kind === "off" ? eliMode.policy : null;
                              const hasEscalation = hasActiveAiEscalation(selected);
                              const stateLabel = isOn ? "On" : "Off";
                              const stateQualifier = isOn
                                ? "Eli is responding on this thread"
                                : offPolicy === "indefinite"
                                  ? "Handed to staff indefinitely"
                                  : hasEscalation
                                    ? "Auto-resumes when the escalation is resolved"
                                    : "Handed to staff";
                              return (
                                <div
                                  className={cn(
                                    "flex items-center gap-2.5 border-b border-border/70 px-2.5 py-2.5",
                                    isOn && "bg-status-success/10",
                                    isOff && "bg-muted/60",
                                  )}
                                >
                                  <span
                                    aria-hidden
                                    className={cn(
                                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                                      isOn && "bg-status-success text-status-success-foreground",
                                      isOff && "bg-muted-foreground/80 text-background",
                                    )}
                                  >
                                    {isOn && <Bot className="h-4 w-4" strokeWidth={2.25} />}
                                    {isOff && <BotOff className="h-4 w-4" strokeWidth={2.25} />}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                      Eli Mode
                                    </p>
                                    <p className="text-sm font-semibold leading-tight">
                                      {stateLabel}
                                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                                        · {stateQualifier}
                                      </span>
                                    </p>
              </div>
                                </div>
                              );
                            })()}

                            <div className="space-y-2 p-2.5">
                              <p className="text-[11px] text-muted-foreground leading-snug">
                                {(() => {
                                  // Copy under the status strip is tuned
                                  // per (state × policy × escalation).
                                  //   • On + escalation → offer to hand off
                                  //     with the "auto-resume when
                                  //     resolved" promise.
                                  //   • On + no escalation → offer to hand
                                  //     off indefinitely (nothing to
                                  //     auto-resume against).
                                  //   • Off "indefinite" → hard-set state,
                                  //     manual flip only.
                                  //   • Off "until-resolved" + escalation
                                  //     → tell staff Eli will resume when
                                  //     the escalation clears.
                                  //   • Off "until-resolved" + no
                                  //     escalation → transient/awaiting
                                  //     auto-resume (rare, but honest).
                                  if (eliMode.kind === "on") {
                                    return hasActiveAiEscalation(selected)
                                      ? "Turn Eli off below to hand this thread to staff — Eli comes back on automatically once the escalation is resolved."
                                      : "Turn Eli off below to hand this thread to staff.";
                                  }
                                  if (eliMode.policy === "indefinite") {
                                    return "Staff owns this thread until you turn Eli back on.";
                                  }
                                  return hasActiveAiEscalation(selected)
                                    ? "Eli will resume automatically when the escalation is resolved — or turn it back on now."
                                    : "Eli will resume as soon as the escalation clears.";
                                })()}
                              </p>

                            {/* Quick actions — a single primary CTA that
                                flips Eli to the other mode. */}
                            <div className="space-y-1.5">
                              {eliMode.kind !== "on" && (
                                <Button
                                  size="sm"
                                  className="h-8 w-full text-xs"
                                  onClick={() =>
                                    applyEliModeChange(selected.id, { kind: "on" }, "manual")
                                  }
                                >
                                  Turn Eli back on
                                </Button>
                              )}
                              {eliMode.kind !== "off" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-full text-xs"
                                  onClick={() =>
                                    // Popover "Turn Eli off" — derive the
                                    // policy from the thread's escalation
                                    // state so the semantics stay coherent:
                                    //   • Thread has an active escalation →
                                    //     "until resolved" (auto-resume when
                                    //     the escalation clears).
                                    //   • Thread has no active escalation →
                                    //     "indefinite" (staff is
                                    //     deliberately taking over an
                                    //     otherwise-quiet thread; no
                                    //     escalation resolution to trigger
                                    //     auto-resume).
                                    applyEliModeChange(
                                      selected.id,
                                      {
                                        kind: "off",
                                        policy: hasActiveAiEscalation(selected)
                                          ? "until-resolved"
                                          : "indefinite",
                                      },
                                      "manual",
                                    )
                                  }
                                >
                                  <BotOff className="mr-1 h-3.5 w-3.5" strokeWidth={2} />
                                  Turn Eli off
                                </Button>
                              )}
                            </div>
                            </div>
                          </div>
                        )}
                        {/* SA 1.2 simplified popover: the Eli Mode section
                            above already covers the overall AI on/off state
                            for the thread. Below it we still show the
                            per-sub-agent breakdown (Leasing / Renewals /
                            Payments / Maintenance) so staff can see WHICH AI
                            is responding — Eli-mode trumps the per-agent
                            state, so when Eli is Off every row is forced
                            Off; when Eli is On, the per-agent state falls
                            back to the escalation-label logic shared with
                            SA 1.0. The AI Activated dropdown, DEMO buttons,
                            and super-agent block controls are intentionally
                            hidden for SA 1.2 — Eli Mode is the single
                            control point. */}
                        {superAgent12Enabled ? (
                          <div className="space-y-3">
                            {sa1State && (() => {
                              // Eli-mode override: when Eli is Off on this
                              // thread, the sub-agents are effectively paused
                              // too (Eli is the umbrella). Otherwise fall
                              // back to the escalation-label view.
                              const eliOverridesOff = eliMode && eliMode.kind !== "on";
                              return (
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    AI Agent status
                                  </p>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {SA1_KNOWN_SUB_AGENTS.map((agent) => {
                                      const blocked =
                                        eliOverridesOff ||
                                        sa1State.kind === "off-manual" ||
                                        sa1State.kind === "off-super" ||
                                        sa1State.kind === "off-all-subs" ||
                                        sa1State.kind === "off-profile" ||
                                        sa1State.blockedSubAgents.includes(agent);
                                      return (
                                        <div
                                          key={agent}
                                          className={cn(
                                            "flex items-center justify-between rounded-md border px-2 py-1.5 text-[11px]",
                                            blocked
                                              ? "border-red-200 bg-red-50/60 dark:border-red-900/50 dark:bg-red-950/20"
                                              : "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                                          )}
                                        >
                                          <span className="font-medium text-foreground">{agent}</span>
                                          <span
                                            className={cn(
                                              "text-[10px] font-bold uppercase tracking-wide",
                                              blocked
                                                ? "text-red-700 dark:text-red-300"
                                                : "text-emerald-700 dark:text-emerald-300"
                                            )}
                                          >
                                            {blocked ? "Off" : "On"}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {eliOverridesOff && (
                                    <p className="text-[10px] leading-snug text-muted-foreground">
                                      All AI agents are paused because Eli is off on this thread.
                                    </p>
                                  )}
                                </div>
                              );
                            })()}
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Contact preferences
                            </p>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <label className="whitespace-nowrap text-[11px] font-medium text-muted-foreground">
                                  Phone
                                </label>
                                <Select
                                  value={phoneOpt}
                                  onValueChange={(v) => {
                                    const choice = v as ChannelOptChoice;
                                    setPhoneOpt(choice);
                          recordThreadActivity(selected.id, {
                                      kind: "channel_opt",
                                      channel: "phone",
                                      choice,
                            actor: MY_INBOX_ASSIGNEE,
                          });
                                  }}
                                >
                                  <SelectTrigger className="h-7 w-[110px] text-[11px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="opt-in">
                                      <span className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                        Opt In
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="opt-out">
                                      <span className="flex items-center gap-2">
                                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                                        Opt Out
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="no-indication">
                                      <span className="flex items-center gap-2">
                                        <MinusCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                        No Indication
                                      </span>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="whitespace-nowrap text-[11px] font-medium text-muted-foreground">
                                  Email
                                </label>
                                <Select
                                  value={emailOpt}
                                  onValueChange={(v) => {
                                    const choice = v as ChannelOptChoice;
                                    setEmailOpt(choice);
                                    recordThreadActivity(selected.id, {
                                      kind: "channel_opt",
                                      channel: "email",
                                      choice,
                                      actor: MY_INBOX_ASSIGNEE,
                                    });
                                  }}
                                >
                                  <SelectTrigger className="h-7 w-[110px] text-[11px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="opt-in">
                                      <span className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                        Opt In
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="opt-out">
                                      <span className="flex items-center gap-2">
                                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                                        Opt Out
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="no-indication">
                                      <span className="flex items-center gap-2">
                                        <MinusCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                        No Indication
                                      </span>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        ) : sa1State ? (() => {
                          const residentLabel = selected.resident || "this resident";
                          const bannerCopy =
                            sa1State.kind === "on"
                              ? "All AI agents will respond on this conversation."
                              : sa1State.kind === "partial"
                              ? `${sa1State.blockedSubAgents.join(" and ")} ${sa1State.blockedSubAgents.length === 1 ? "is" : "are"} paused until staff resolves the blocking escalation. Other AI agents continue to respond.`
                              : sa1State.kind === "off-profile"
                              ? `${residentLabel}'s profile is marked "no AI" by staff. AI will never reply to this resident on any conversation until the profile block is lifted.`
                              : sa1State.kind === "off-super"
                              ? "All AI agents are paused — the resident asked for a human. AI will not reply until staff resolves the super-agent escalation."
                              : sa1State.kind === "off-all-subs"
                              ? "Every AI agent is blocked by a sub-agent escalation. AI will not reply until staff resolves at least one."
                              : "AI has been manually deactivated for this conversation by staff.";
                          const bannerClass =
                            sa1State.kind === "on"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                              : sa1State.kind === "partial"
                              ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
                              : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200";
                          const allOffByAuto =
                            sa1State.kind === "off-super" ||
                            sa1State.kind === "off-all-subs" ||
                            sa1State.kind === "off-profile";
                          return (
                            <div className="space-y-3">
                              <div className={cn("rounded-md border px-2.5 py-2 text-[11px] leading-snug", bannerClass)}>
                                {bannerCopy}
                              </div>

                              <div className="space-y-1.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  AI Agent status
                                </p>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {SA1_KNOWN_SUB_AGENTS.map((agent) => {
                                    const blocked =
                                      sa1State.kind === "off-manual" ||
                                      allOffByAuto ||
                                      sa1State.blockedSubAgents.includes(agent);
                                    return (
                                      <div
                                        key={agent}
                                        className={cn(
                                          "flex items-center justify-between rounded-md border px-2 py-1.5 text-[11px]",
                                          blocked
                                            ? "border-red-200 bg-red-50/60 dark:border-red-900/50 dark:bg-red-950/20"
                                            : "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                                        )}
                                      >
                                        <span className="font-medium text-foreground">{agent}</span>
                                        <span
                                          className={cn(
                                            "text-[10px] font-bold uppercase tracking-wide",
                                            blocked
                                              ? "text-red-700 dark:text-red-300"
                                              : "text-emerald-700 dark:text-emerald-300"
                                          )}
                                        >
                                          {blocked ? "Off" : "On"}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 border-t border-border pt-2">
                                <span className="text-xs font-medium text-foreground whitespace-nowrap">
                                  AI Activated
                                </span>
                                <Select
                                  value={sa1State.hasResidentProfileBlock ? "off-profile" : "active"}
                                  onValueChange={(v) => {
                                    const next = v as "active" | "off-profile";
                                    const wasProfileBlocked = sa1State.hasResidentProfileBlock;

                                    if (next === "off-profile") {
                                      if (!wasProfileBlocked) {
                                        addLabel(
                                          selected.id,
                                          SA1_RESIDENT_PROFILE_BLOCK_LABEL,
                                          "ELI+ Super Agent",
                                        );
                                      }
                                      toast.info(`${residentLabel}'s profile marked "no AI"`, {
                                        description:
                                          "AI will never reply to this resident on any conversation until staff lifts the block.",
                                      });
                                    } else {
                                      if (wasProfileBlocked) {
                                        removeLabel(selected.id, SA1_RESIDENT_PROFILE_BLOCK_LABEL);
                                        toast.success("Profile AI block cleared", {
                                          description: "AI agents can resume responding to this resident.",
                                        });
                                      } else if (
                                        sa1State.hasSuperAgentBlock ||
                                        sa1State.blockedSubAgents.length > 0
                                      ) {
                                        toast.info("AI activation set on", {
                                          description:
                                            "Some agents stay paused until the blocking escalations are resolved.",
                                        });
                                      } else {
                                        toast.success("AI activated for this conversation", {
                                          description:
                                            "Replies will be drafted by AI on this thread.",
                                        });
                                      }
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-7 flex-1 text-[11px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="active">
                                      <span className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                        Active
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="off-profile">
                                      <span className="flex items-center gap-2">
                                        <UserX className="h-3.5 w-3.5 text-red-500" />
                                        Off — profile (indefinite)
                                      </span>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="flex items-center gap-3 border-t border-border pt-2">
                                <div className="flex items-center gap-2">
                                  <label className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Phone</label>
                                  <Select
                                    value={phoneOpt}
                                    onValueChange={(v) => {
                                      const choice = v as ChannelOptChoice;
                                      setPhoneOpt(choice);
                                      recordThreadActivity(selected.id, {
                                        kind: "channel_opt",
                                        channel: "phone",
                                        choice,
                                        actor: MY_INBOX_ASSIGNEE,
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="h-7 w-[110px] text-[11px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="opt-in"><span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />Opt In</span></SelectItem>
                                      <SelectItem value="opt-out"><span className="flex items-center gap-2"><XCircle className="h-3.5 w-3.5 text-red-500" />Opt Out</span></SelectItem>
                                      <SelectItem value="no-indication"><span className="flex items-center gap-2"><MinusCircle className="h-3.5 w-3.5 text-muted-foreground" />No Indication</span></SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Email</label>
                                  <Select
                                    value={emailOpt}
                                    onValueChange={(v) => {
                                      const choice = v as ChannelOptChoice;
                                      setEmailOpt(choice);
                                      recordThreadActivity(selected.id, {
                                        kind: "channel_opt",
                                        channel: "email",
                                        choice,
                                        actor: MY_INBOX_ASSIGNEE,
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="h-7 w-[110px] text-[11px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="opt-in"><span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />Opt In</span></SelectItem>
                                      <SelectItem value="opt-out"><span className="flex items-center gap-2"><XCircle className="h-3.5 w-3.5 text-red-500" />Opt Out</span></SelectItem>
                                      <SelectItem value="no-indication"><span className="flex items-center gap-2"><MinusCircle className="h-3.5 w-3.5 text-muted-foreground" />No Indication</span></SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 border-t border-dashed border-border pt-2">
                                <Beaker className="h-3 w-3 text-muted-foreground" />
                                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Demo
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (sa1State.hasSuperAgentBlock) {
                                      removeLabel(selected.id, SA1_SUPER_AGENT_BLOCK_LABEL);
                                      toast.success("Super-agent block cleared");
                                    } else {
                                      addLabel(selected.id, SA1_SUPER_AGENT_BLOCK_LABEL, "ELI+ Super Agent");
                                      toast.info("Super-agent block added", {
                                        description: "All AI agents are now paused for this thread.",
                                      });
                                    }
                                  }}
                                  className="rounded border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-foreground transition-colors hover:bg-muted"
                                >
                                  {sa1State.hasSuperAgentBlock ? "Clear super-agent block" : "Add super-agent block"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const missing = SA1_KNOWN_SUB_AGENTS.filter(
                                      (a) =>
                                        !selected.labels.some((l) => aiAgentFromEscalationLabel(l) === a)
                                    );
                                    if (missing.length > 0) {
                                      for (const a of missing) {
                                        addLabel(selected.id, `${a} Escalation`, "ELI+ Super Agent");
                                      }
                                      toast.info("All sub-agent blocks added", {
                                        description: "Every known AI sub-agent is now blocked on this thread.",
                                      });
                                    } else {
                                      for (const l of [...selected.labels]) {
                                        if (aiAgentFromEscalationLabel(l)) {
                                          removeLabel(selected.id, l);
                                        }
                                      }
                                      toast.success("Sub-agent blocks cleared", {
                                        description: "All known AI sub-agents are back on.",
                                      });
                                    }
                                  }}
                                  className="rounded border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-foreground transition-colors hover:bg-muted"
                                >
                                  {SA1_KNOWN_SUB_AGENTS.every((a) =>
                                    selected.labels.some((l) => aiAgentFromEscalationLabel(l) === a)
                                  )
                                    ? "Clear all sub-agent blocks"
                                    : "Block all sub-agents"}
                                </button>
                              </div>
                            </div>
                          );
                        })() : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={aiActivated}
                              onCheckedChange={(checked) => {
                          if (checked) {
                                  setAiActivated(true);
                            setReactivationDate(null);
                            setNoLimit(false);
                            setShowDatePicker(false);
                                  recordThreadActivity(selected.id, {
                                    kind: "ai_activation",
                                    active: true,
                                    actor: MY_INBOX_ASSIGNEE,
                                  });
                          } else {
                            setShowDatePicker(true);
                          }
                        }}
                      />
                            <span className="text-xs font-medium text-foreground whitespace-nowrap">
                        AI Activated
                      </span>
                            {(!aiActivated || showDatePicker) && (
                              <div className="flex items-center gap-1.5 ml-1">
                                <span className="text-[11px] text-muted-foreground whitespace-nowrap">until</span>
                        {noLimit ? (
                          <button
                            type="button"
                            onClick={() => {
                              setNoLimit(false);
                              setShowDatePicker(true);
                            }}
                                    className="rounded-md border border-input bg-background px-2 py-0.5 text-[11px] transition-colors hover:bg-accent"
                          >
                            No Limit
                          </button>
                        ) : (
                                  <Popover open={showDatePicker} onOpenChange={(open) => {
                                    setShowDatePicker(open);
                                    if (!open && aiActivated && !reactivationDate && !noLimit) {
                                      setShowDatePicker(false);
                                    }
                                  }}>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                        className="flex items-center gap-1 rounded-md border border-input bg-background px-2 py-0.5 text-[11px] transition-colors hover:bg-accent"
                              >
                                        <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                                {reactivationDate
                                          ? reactivationDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                          : "Date"}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <MiniCalendar
                                selected={reactivationDate}
                                onSelect={(date) => {
                                  setReactivationDate(date);
                                  setNoLimit(false);
                                  setShowDatePicker(false);
                                          setAiActivated(false);
                                          recordThreadActivity(selected.id, {
                                            kind: "ai_activation",
                                            active: false,
                                            actor: MY_INBOX_ASSIGNEE,
                                          });
                                }}
                                onNoLimit={() => {
                                  setReactivationDate(null);
                                  setNoLimit(true);
                                  setShowDatePicker(false);
                                          setAiActivated(false);
                                          recordThreadActivity(selected.id, {
                                            kind: "ai_activation",
                                            active: false,
                                            actor: MY_INBOX_ASSIGNEE,
                                          });
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    )}
                  </div>
                          <div className="flex items-center gap-3 border-t border-border pt-2">
                            <div className="flex items-center gap-2">
                              <label className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Phone</label>
                      <Select
                        value={phoneOpt}
                        onValueChange={(v) => {
                          const choice = v as ChannelOptChoice;
                          setPhoneOpt(choice);
                          recordThreadActivity(selected.id, {
                            kind: "channel_opt",
                            channel: "phone",
                            choice,
                            actor: MY_INBOX_ASSIGNEE,
                          });
                        }}
                      >
                                <SelectTrigger className="h-7 w-[110px] text-[11px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="opt-in"><span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />Opt In</span></SelectItem>
                          <SelectItem value="opt-out"><span className="flex items-center gap-2"><XCircle className="h-3.5 w-3.5 text-red-500" />Opt Out</span></SelectItem>
                          <SelectItem value="no-indication"><span className="flex items-center gap-2"><MinusCircle className="h-3.5 w-3.5 text-muted-foreground" />No Indication</span></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                            <div className="flex items-center gap-2">
                              <label className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Email</label>
                      <Select
                        value={emailOpt}
                        onValueChange={(v) => {
                          const choice = v as ChannelOptChoice;
                          setEmailOpt(choice);
                          recordThreadActivity(selected.id, {
                            kind: "channel_opt",
                            channel: "email",
                            choice,
                            actor: MY_INBOX_ASSIGNEE,
                          });
                        }}
                      >
                                <SelectTrigger className="h-7 w-[110px] text-[11px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="opt-in"><span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />Opt In</span></SelectItem>
                          <SelectItem value="opt-out"><span className="flex items-center gap-2"><XCircle className="h-3.5 w-3.5 text-red-500" />Opt Out</span></SelectItem>
                          <SelectItem value="no-indication"><span className="flex items-center gap-2"><MinusCircle className="h-3.5 w-3.5 text-muted-foreground" />No Indication</span></SelectItem>
                        </SelectContent>
                      </Select>
                            </div>
                          </div>
                        </div>
                        )}
                      </PopoverContent>
                    </Popover>
                    );
                  })()}
                  {phoneDemoEnabled && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 px-3 text-xs"
                      title="Call lead or resident on primary number"
                      onClick={() => beginClickToCallForConversation(selected)}
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Call
                    </Button>
                  )}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-transparent transition-colors hover:border-border hover:bg-muted"
                        aria-label="Change assignee"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarFallback
                            className={cn(
                              "text-[10px]",
                              isHumanAssignee(selected.assignee)
                                ? avatarColor(selected.assignee)
                                : selected.assignee === CONVERSATION_UNASSIGNED_ASSIGNEE
                                  ? "border border-dashed border-muted-foreground/40 bg-muted/40 text-muted-foreground"
                                  : avatarColor(selected.assignee)
                            )}
                          >
                            {isHumanAssignee(selected.assignee)
                              ? initials(selected.assignee)
                              : selected.assignee === CONVERSATION_UNASSIGNED_ASSIGNEE
                                ? "—"
                                : "AI"}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="end">
                      <AssigneePicker
                        groupedAssignees={groupedAssignees}
                        currentAssignee={selected.assignee}
                        onSelect={(value) => updateAssignee(selected.id, value, MY_INBOX_ASSIGNEE)}
                      />
                    </PopoverContent>
                  </Popover>
                  {isSuperAgentDemoThread(selected.id) && aiActivated ? null : selected.status === "open" ? (
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 px-3 text-xs"
                        onClick={() => {
                          if (isSuperAgent1DemoThread(selected.id)) {
                            const escalations = selected.labels.filter((l) => l.includes("Escalation"));
                            if (escalations.length > 0) {
                              setSa1ResolveSelections(new Set());
                              setSa1ResolvePickerOpen(true);
                              return;
                            }
                          }
                          setResolveModalAction("general");
                          setResolveModalNotes("");
                          setResolveModalEliChoice("resume");
                          // SA 1.2 with active AI escalations — seed the
                          // picker with every active escalation label so
                          // the dialog opens with "resolve everything"
                          // pre-picked. Staff opts out of any escalation
                          // they aren't resolving right now. The picker
                          // itself only renders when there are 2+
                          // escalations — for a single escalation, the
                          // seeded selection auto-resolves it on Save.
                          if (superAgent12Enabled) {
                            const activeEscalations = selected.labels.filter(
                              (l) => l.includes("Escalation"),
                            );
                            setResolveModalEscalationsToResolve(
                              new Set(activeEscalations),
                            );
                          } else {
                            setResolveModalEscalationsToResolve(new Set());
                          }
                          setResolveModalOpen(true);
                        }}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Resolve
                        <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                      </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 px-3 text-xs"
                      onClick={() => reopenConversation(selected.id, MY_INBOX_ASSIGNEE)}
                    >
                      Reopen
                    </Button>
                  )}
                    </div>
                  </div>

              {/* Row 2: Labels — hidden behind icon popover */}

              {selected.labels.some((label) => AI_ACTIVATION_OPT_IN_LABELS.has(label)) && (
                <>
                  {selected.escalationId && linkedByEscalation.length > 0 && (
                    <div
                      className="mt-2 overflow-hidden rounded-lg border border-violet-200/80 bg-violet-50/50 shadow-sm dark:border-violet-900/50 dark:bg-violet-950/20"
                      role="region"
                      aria-label="Related escalated conversations"
                    >
                      <button
                        type="button"
                        onClick={() => setLinkedExpanded(!linkedExpanded)}
                        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-violet-100/50 dark:hover:bg-violet-900/30"
                      >
                        <Link2 className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-300" />
                        <span className="text-[11px] font-semibold text-violet-800 dark:text-violet-200">
                          {linkedByEscalation.length} Linked Conversation{linkedByEscalation.length > 1 ? "s" : ""}
                        </span>
                        <ChevronRight
                          className={cn(
                            "ml-auto h-3.5 w-3.5 shrink-0 text-violet-500 transition-transform duration-200",
                            linkedExpanded && "rotate-90"
                          )}
                        />
                      </button>
                      {linkedExpanded && (
                        <ul className="space-y-0.5 border-t border-violet-200/60 bg-background/60 px-1.5 py-1.5 dark:border-violet-800/40 dark:bg-background/40">
                        {linkedByEscalation.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => {
                                  // Mirror the main thread-list click
                                  // handler: clicking a linked thread
                                  // should also close any open inline
                                  // compose panel (see the pending-slot
                                  // ternary in the right-pane render).
                                  setPendingSmsCompose(null);
                                  setPendingEmailCompose(null);
                                setSelectedId(c.id);
                                markRead(c.id, MY_INBOX_ASSIGNEE);
                              }}
                                className="flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-left text-[11px] transition-colors hover:border-violet-200 hover:bg-violet-50/80 dark:hover:border-violet-800 dark:hover:bg-violet-950/40"
                            >
                                <span className="shrink-0 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/60 dark:text-violet-300">
                                {c.channel}
                              </span>
                                <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                                  {c.resident}
                                </span>
                              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                            </button>
                          </li>
                        ))}
                      </ul>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hover bg-background px-5 py-4">
              <div className="space-y-4">
                {selected.channel === "Email" && (
                  <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                    <div className="border-b border-border bg-muted/50 px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background border border-border">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Subject
                            </p>
                            <p className="text-sm font-semibold text-foreground leading-snug">
                              {selected.emailSubject ?? selected.preview}
                            </p>
                          </div>
                          <div className="grid gap-1.5 text-xs">
                            <p>
                              <span className="text-muted-foreground">From:</span>{" "}
                              <span className="font-medium text-foreground">
                                {selected.resident} &lt;
                                {selectedEmailRouting?.residentEmail}
                                &gt;
                              </span>
                            </p>
                            <p>
                              <span className="text-muted-foreground">To:</span>{" "}
                              <span className="font-medium text-foreground">
                                {selected.property} Leasing &lt;
                                {selectedEmailRouting?.propertyInboxEmail}
                                &gt;
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4 bg-background px-4 py-4">
                      {selected.bulkOutboundEmail && (
                        <ConversationBulkEmailCard
                          bulk={selected.bulkOutboundEmail}
                          onClick={() => setBulkEmailModal(selected.bulkOutboundEmail!)}
                        />
                      )}
                      {selected.messages.map((msg, idx) => {
                        if (msg.type === "handoff") {
                          if (isSuperAgentDemoThread(selected.id) || isSuperAgent1DemoThread(selected.id)) return null;
                          // SA 1.2 threads: the escalation is already
                          // rendered as a `label_activity` card in the
                          // timeline (see the `label_activity` branch
                          // below), so the compact orange "Handoff X ·
                          // <label>" banner would just duplicate the same
                          // information. Suppress it here — the label
                          // activity card is now the single source of
                          // truth for "an escalation was opened on this
                          // thread." Handoffs without an escalation
                          // aren't a case that lands on SA 1.2 threads
                          // in the demo, but if one ever does it will
                          // still fall through the SA 1.0 / SA 2.0
                          // paths.
                          if (superAgent12Enabled) return null;
                          const escalationLabel = selected.labels.find((l) => l.includes("Escalation"));
                          return (
                            <div key={idx} className={cn(
                              "flex items-center justify-center gap-2 py-1",
                              escalationLabel && "rounded-md border border-orange-200 bg-orange-50/80 px-3 py-2 dark:border-orange-900/50 dark:bg-orange-950/20"
                            )}>
                              {escalationLabel ? (
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                              ) : (
                              <CornerDownRight className="h-3 w-3 text-muted-foreground" />
                              )}
                              <span className={cn("text-[11px]", escalationLabel ? "text-orange-800 dark:text-orange-200" : "text-muted-foreground")}>
                                Handoff {handoffAssigneeLabelForConversation(
                                selected.assignee,
                                isHumanAssignee,
                                selected.staffRespondentIsExternalAgent
                              )}
                                {escalationLabel && (
                                  <span className="ml-1.5 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200">
                                    {escalationLabel}
                                    <EscalationIdHint
                                      conversationId={selected.id}
                                      label={escalationLabel}
                                      className="text-orange-800 dark:text-orange-200"
                                    />
                                  </span>
                                )}
                                {" · "}{msg.timestamp}
                              </span>
                            </div>
                          );
                        }
                        if (msg.type === "thread_activity" && msg.threadActivity) {
                          if (isSuperAgent1DemoThread(selected.id) && msg.threadActivity.kind === "status" && msg.threadActivity.action === "resolved") {
                            return null;
                          }
                          return <ConversationThreadActivityRow key={idx} message={msg} />;
                        }
                        if (msg.type === "label_activity" && msg.labelActivity) {
                          const { actor, labelsAdded, action } = msg.labelActivity;
                          const isEscalation = labelsAdded.some((l) => l.includes("Escalation"));

                          if (action === "resolved_escalation") {
                            const resumedAgents = aiAgentsFromLabels(labelsAdded);
                            return (
                              <div key={idx} className="flex flex-col items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50/80 py-2.5 px-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                                <div className="flex items-center gap-2">
                                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                                  <p className="text-center text-[11px] text-emerald-800 dark:text-emerald-200">
                                    <span className="font-semibold text-emerald-900 dark:text-emerald-100">{actor}</span>
                                    {" resolved "}
                                    {labelsAdded.map((label, i) => (
                                      <span key={label}>
                                        {i > 0 && <span className="text-emerald-600">{" & "}</span>}
                                        <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                                          {label}
                                          {label.includes("Escalation") && (
                                            <EscalationIdHint
                                              conversationId={selected.id}
                                              label={label}
                                              className="text-emerald-800 dark:text-emerald-200"
                                            />
                                          )}
                                        </span>
                                      </span>
                                    ))}
                                    {msg.timestamp && (
                                      <>
                                        <span className="opacity-60"> · </span>
                                        <span>{msg.timestamp}</span>
                                      </>
                                    )}
                                  </p>
                                </div>
                                {resumedAgents.length > 0 && (
                                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-700/80 dark:text-emerald-300/80">
                                    <PlayCircle className="h-3 w-3 shrink-0 text-emerald-600" aria-hidden />
                                    <span>
                                      {resumedAgents.map((a, i) => (
                                        <span key={a}>
                                          {i > 0 && ", "}
                                          <span className="font-semibold">{a}</span>
                                        </span>
                                      ))}
                                      {" turned back on"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          const pausedAgents = isEscalation ? aiAgentsFromLabels(labelsAdded) : [];
                          const escalationLabel = isEscalation
                            ? labelsAdded.find((l) => l.includes("Escalation"))
                            : undefined;
                          const escalationReason = isEscalation
                            ? (msg.labelActivity?.reason ??
                              (escalationLabel ? getEscalationReason(escalationLabel) : undefined))
                            : undefined;
                          return (
                            <div
                              key={idx}
                              data-escalation-label={escalationLabel}
                              className={cn(
                                "flex flex-col items-center gap-1 rounded-md border py-2.5 px-3 transition-all",
                                isEscalation
                                  ? "border-orange-200 bg-orange-50/80 dark:border-orange-900/50 dark:bg-orange-950/20"
                                  : "border-dashed border-border/70 bg-muted/25"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                {isEscalation ? (
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-500" aria-hidden />
                                ) : (
                              <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                                )}
                                <p className={cn(
                                  "text-center text-[11px] leading-relaxed",
                                  isEscalation ? "text-orange-800 dark:text-orange-200" : "text-muted-foreground"
                                )}>
                                  <span className={cn("font-medium", isEscalation ? "text-orange-900 dark:text-orange-100" : "text-foreground")}>{actor}</span>
                                  {" escalated → "}
                                  {labelsAdded.map((label, i) => (
                                    <span key={label}>
                                      {i > 0 && ", "}
                                      <span className={cn(
                                        "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                                        isEscalation
                                          ? "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200"
                                          : "font-medium text-foreground"
                                      )}>
                                        {label.replace(" Escalation", "").replace(/\s+\d+$/, "")}
                                        {isEscalation && (
                                          <EscalationIdHint
                                            conversationId={selected.id}
                                            label={label}
                                            className="text-orange-800 dark:text-orange-200"
                                          />
                                        )}
                                      </span>
                                    </span>
                                  ))}
                                {msg.timestamp && (
                                  <>
                                      <span className="opacity-60"> · </span>
                                    <span>{msg.timestamp}</span>
                                  </>
                                )}
                              </p>
                              </div>
                              {escalationReason && (
                                <p className="max-w-xl text-center text-xxs leading-relaxed text-orange-800/80 dark:text-orange-200/80">
                                  <span className="font-semibold text-orange-900/90 dark:text-orange-100/90">Reason: </span>
                                  {escalationReason}
                                </p>
                              )}
                              {pausedAgents.length > 0 && (
                                <div className="flex items-center gap-1.5 text-[10px] text-orange-700/80 dark:text-orange-300/80">
                                  <PauseCircle className="h-3 w-3 shrink-0 text-orange-500" aria-hidden />
                                  <span>
                                    {pausedAgents.map((a, i) => (
                                      <span key={a}>
                                        {i > 0 && ", "}
                                        <span className="font-semibold">{a}</span>
                                      </span>
                                    ))}
                                    {" turned off until resolved"}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        }
                        if (msg.type === "private_note") {
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                <Avatar className="h-7 w-7">
                                  <AvatarFallback
                                    className={cn(
                                      "text-[9px] font-semibold",
                                      msg.privateNoteAuthor
                                        ? avatarColor(msg.privateNoteAuthor)
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                    )}
                                  >
                                    {msg.privateNoteAuthor ? (
                                      initials(msg.privateNoteAuthor)
                                    ) : (
                                      <StickyNote className="h-3.5 w-3.5" />
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                  Private Note
                                  {msg.privateNoteAuthor ? (
                                    <>
                                      <span className="font-normal text-muted-foreground"> · </span>
                                      <span className="font-medium text-amber-800 dark:text-amber-200">
                                        {msg.privateNoteAuthor}
                                      </span>
                                    </>
                                  ) : null}
                                </span>
                                {msg.timestamp && <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>}
                              </div>
                              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                                {msg.text}
                              </div>
                            </div>
                          );
                        }
                        const isAgent = msg.role === "agent";
                        const isStaff = msg.role === "staff";
                        return (
                          <div key={idx} className="space-y-2 border-l-2 border-l-primary/25 pl-4">
                            <div className="flex items-center gap-2">
                              <ThreadMessageAvatar
                                variant="threadEmail"
                                isAgent={isAgent}
                                isStaff={isStaff}
                                selected={selected}
                                isHumanAssignee={isHumanAssignee}
                              />
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-foreground">
                                  {isAgent
                                    ? resolveAgentLabel(selected.agent)
                                    : isStaff
                                      ? handoffAssigneeLabelForConversation(
                                          selected.assignee,
                                          isHumanAssignee,
                                          selected.staffRespondentIsExternalAgent
                                        )
                                      : selected.resident}
                                </span>
                                {msg.timestamp && <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>}
                              </div>
                            </div>
                            {isStaff && msg.replyToEscalations && msg.replyToEscalations.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {msg.replyToEscalations.map((esc) => (
                                  <span
                                    key={esc}
                                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                  >
                                    Replying to {esc.replace(" Escalation", "").replace(/\s+\d+$/, "")}
                                    <EscalationIdHint
                                      conversationId={selected.id}
                                      label={esc}
                                      className="text-blue-700 dark:text-blue-300"
                                    />
                                </span>
                              ))}
                            </div>
                            )}
                            <TranslatableMessageBody
                              msg={msg}
                              translationEnabled={translationEnabled}
                              showEnglish={isViewingInEnglish}
                              className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm leading-relaxed text-foreground"
                            />
                            {msg.emailAttachments && msg.emailAttachments.length > 0 && (
                              <div className="space-y-2 pt-1">
                                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                  Attachments
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {msg.emailAttachments.map((att, ai) =>
                                    att.kind === "image" ? (
                                      <button
                                        key={`${att.name}-${ai}`}
                                        type="button"
                                        onClick={() => setEmailAttachmentPreview(att)}
                                        className="flex w-[min(100%,12rem)] flex-col gap-1.5 rounded-md border border-border bg-card p-2 text-left shadow-sm transition-colors hover:bg-muted/50 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                      >
                                        <div className="flex aspect-[4/3] w-full items-center justify-center rounded border border-dashed border-border bg-gradient-to-br from-muted/80 to-muted/40">
                                          <ImageIcon className="h-6 w-6 text-muted-foreground/70" aria-hidden />
                                        </div>
                                        <span className="truncate text-[11px] font-medium text-foreground" title={att.name}>
                                          {att.name}
                                        </span>
                                      </button>
                                    ) : (
                                      <button
                                        key={`${att.name}-${ai}`}
                                        type="button"
                                        onClick={() => setEmailAttachmentPreview(att)}
                                        className="flex max-w-[14rem] items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-left shadow-sm transition-colors hover:bg-muted/50 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                      >
                                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                                        <span className="truncate text-[11px] font-medium text-foreground" title={att.name}>
                                          {att.name}
                                        </span>
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                            {msg.emailSignature?.trim() && (
                              <div className="mt-3 border-t border-border pt-3">
                                <div className="flex gap-3">
                                  {(isStaff || msg.role === "resident") && (
                                    <Avatar className="mt-0.5 h-8 w-8 shrink-0 border border-border bg-background">
                                      <AvatarFallback
                                        className={cn(
                                          "text-[9px]",
                                          isStaff
                                            ? selected.assignee === CONVERSATION_UNASSIGNED_ASSIGNEE
                                              ? "border border-dashed border-muted-foreground/35 bg-muted/50 text-muted-foreground"
                                              : avatarColor(selected.assignee)
                                            : "bg-muted text-muted-foreground"
                                        )}
                                      >
                                        {isStaff
                                          ? selected.assignee === CONVERSATION_UNASSIGNED_ASSIGNEE
                                            ? "—"
                                            : isHumanAssignee(selected.assignee)
                                              ? initials(selected.assignee)
                                              : "ST"
                                          : initials(selected.resident)}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                  <p className="min-w-0 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                                    {msg.emailSignature}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {selected.channel !== "Email" &&
                selected.messages.map((msg, idx) => {
                  if (msg.type === "handoff") {
                    if (isSuperAgentDemoThread(selected.id) || isSuperAgent1DemoThread(selected.id)) return null;
                    // SA 1.2: suppress — see the Email path above for the
                    // full rationale. Short version: the escalation
                    // `label_activity` card is the canonical timeline
                    // representation, and rendering a second orange
                    // banner here just duplicates it.
                    if (superAgent12Enabled) return null;
                    // Orange escalation banner — mirrors the Email render
                    // path so SMS / Chat / Voice threads with an active
                    // "* AI Escalation" label surface the escalation on the
                    // timeline instead of silently showing a plain handoff
                    // arrow. Falls back to the plain handoff row when no
                    // escalation label is on the thread.
                    const escalationLabel = selected.labels.find((l) => l.includes("Escalation"));
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center justify-center gap-2 py-1",
                          escalationLabel &&
                            "rounded-md border border-orange-200 bg-orange-50/80 px-3 py-2 dark:border-orange-900/50 dark:bg-orange-950/20",
                        )}
                      >
                        {escalationLabel ? (
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                        ) : (
                        <CornerDownRight className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span
                          className={cn(
                            "text-[11px]",
                            escalationLabel
                              ? "text-orange-800 dark:text-orange-200"
                              : "text-muted-foreground",
                          )}
                        >
                          Handoff {handoffAssigneeLabelForConversation(
                                selected.assignee,
                                isHumanAssignee,
                                selected.staffRespondentIsExternalAgent
                          )}
                          {escalationLabel && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800 dark:bg-orange-900/40 dark:text-orange-200">
                              {escalationLabel}
                              <EscalationIdHint
                                conversationId={selected.id}
                                label={escalationLabel}
                                className="text-orange-800 dark:text-orange-200"
                              />
                            </span>
                          )}
                          {" · "}{msg.timestamp}
                        </span>
                      </div>
                    );
                  }

                  if (msg.type === "thread_activity" && msg.threadActivity) {
                    if (isSuperAgent1DemoThread(selected.id) && msg.threadActivity.kind === "status" && msg.threadActivity.action === "resolved") {
                      return null;
                    }
                    return <ConversationThreadActivityRow key={idx} message={msg} />;
                  }

                  if (msg.type === "missed_call" && msg.missedCall) {
                    return (
                      <div key={idx} className="flex flex-col items-start gap-1">
                        <MissedCallBubble
                          fromNumber={msg.missedCall.fromNumber}
                          attemptCount={msg.missedCall.attemptCount}
                          rangForSec={msg.missedCall.rangForSec}
                          onCallBack={
                            phoneDemoEnabled
                              ? () => beginClickToCallForConversation(selected)
                              : undefined
                          }
                        />
                        {msg.timestamp && (
                          <p className="pl-1 text-[10px] text-muted-foreground">
                            {msg.timestamp}
                          </p>
                        )}
                      </div>
                    );
                  }

                  if (msg.type === "voicemail" && msg.voicemail) {
                    return (
                      <div key={idx} className="flex flex-col items-start gap-1">
                        <VoicemailPlayer
                          durationSec={msg.voicemail.durationSec}
                          transcript={msg.voicemail.transcript}
                          turns={msg.voicemail.turns}
                          fromNumber={msg.voicemail.fromNumber}
                          onCallBack={
                            phoneDemoEnabled
                              ? () => beginClickToCallForConversation(selected)
                              : undefined
                          }
                        />
                        {msg.timestamp && (
                          <p className="pl-1 text-[10px] text-muted-foreground">
                            {msg.timestamp}
                          </p>
                        )}
                      </div>
                    );
                  }

                  if (msg.type === "label_activity" && msg.labelActivity) {
                    const { actor, labelsAdded, action } = msg.labelActivity;
                    const isEscalation = labelsAdded.some((l) => l.includes("Escalation"));
                    const isContextProvided = action === "context_provided";

                    if (isContextProvided) {
                      return (
                        <div key={idx} className="rounded-md border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                          <div className="flex items-center gap-2">
                            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                            <p className="flex-1 text-[11px] text-emerald-800 dark:text-emerald-200">
                              <span className="font-semibold text-emerald-900 dark:text-emerald-100">{actor}</span>
                              {" provided context for "}
                              {labelsAdded.map((label, i) => (
                                <span key={label}>
                                  {i > 0 && <span className="text-emerald-600">{" & "}</span>}
                                  <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                                    {label}
                                    {label.includes("Escalation") && (
                                      <EscalationIdHint
                                        conversationId={selected.id}
                                        label={label}
                                        className="text-emerald-800 dark:text-emerald-200"
                                      />
                                    )}
                                  </span>
                                </span>
                              ))}
                              {msg.timestamp && (
                                <>
                                  <span className="opacity-60"> · </span>
                                  <span>{msg.timestamp}</span>
                                </>
                              )}
                            </p>
                            <button
                              type="button"
                              onClick={() => setContextDetailOpenIdx(contextDetailOpenIdx === idx ? null : idx)}
                              className="rounded-md border border-emerald-300 bg-white px-2 py-0.5 text-[10px] font-medium text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            >
                              {contextDetailOpenIdx === idx ? "Hide" : "Details"}
                            </button>
                          </div>
                          {contextDetailOpenIdx === idx && (
                            <div className="mt-2 rounded-md border border-emerald-100 bg-white p-2.5 text-[11px] leading-relaxed text-foreground/80 dark:border-emerald-900/40 dark:bg-card">
                              {selected.messages[idx - 1]?.role === "staff" ? selected.messages[idx - 1].text : "Context provided to AI."}
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (action === "resolved_escalation") {
                      const resumedAgents = aiAgentsFromLabels(labelsAdded);
                      return (
                        <div key={idx} className="flex flex-col items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50/80 py-2.5 px-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                          <div className="flex items-center gap-2">
                            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                            <p className="text-center text-[11px] text-emerald-800 dark:text-emerald-200">
                              <span className="font-semibold text-emerald-900 dark:text-emerald-100">{actor}</span>
                              {" resolved "}
                              {labelsAdded.map((label, i) => (
                                <span key={label}>
                                  {i > 0 && <span className="text-emerald-600">{" & "}</span>}
                                  <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                                    {label}
                                    {label.includes("Escalation") && (
                                      <EscalationIdHint
                                        conversationId={selected.id}
                                        label={label}
                                        className="text-emerald-800 dark:text-emerald-200"
                                      />
                                    )}
                                  </span>
                                </span>
                              ))}
                              {msg.timestamp && (
                                <>
                                  <span className="opacity-60"> · </span>
                                  <span>{msg.timestamp}</span>
                                </>
                              )}
                            </p>
                          </div>
                          {resumedAgents.length > 0 && (
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-700/80 dark:text-emerald-300/80">
                              <PlayCircle className="h-3 w-3 shrink-0 text-emerald-600" aria-hidden />
                              <span>
                                {resumedAgents.map((a, i) => (
                                  <span key={a}>
                                    {i > 0 && ", "}
                                    <span className="font-semibold">{a}</span>
                                  </span>
                                ))}
                                {" turned back on"}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    const pausedAgents = isEscalation ? aiAgentsFromLabels(labelsAdded) : [];
                    const escalationLabel = isEscalation
                      ? labelsAdded.find((l) => l.includes("Escalation"))
                      : undefined;
                    const escalationReason = isEscalation
                      ? (msg.labelActivity?.reason ??
                        (escalationLabel ? getEscalationReason(escalationLabel) : undefined))
                      : undefined;
                    return (
                      <div
                        key={idx}
                        data-escalation-label={escalationLabel}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-md border py-2.5 px-3 transition-all",
                          isEscalation
                            ? "border-orange-200 bg-orange-50/80 dark:border-orange-900/50 dark:bg-orange-950/20"
                            : "border-dashed border-border/70 bg-muted/25"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {isEscalation ? (
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-500" aria-hidden />
                          ) : (
                        <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                          )}
                          <p className={cn(
                            "text-center text-[11px] leading-relaxed",
                            isEscalation ? "text-orange-800 dark:text-orange-200" : "text-muted-foreground"
                          )}>
                            <span className={cn("font-medium", isEscalation ? "text-orange-900 dark:text-orange-100" : "text-foreground")}>{actor}</span>
                            {" escalated → "}
                            {labelsAdded.map((label, i) => (
                              <span key={label}>
                                {i > 0 && ", "}
                                <span className={cn(
                                  "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                                  isEscalation
                                    ? "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200"
                                    : "font-medium text-foreground"
                                )}>
                                  {label.replace(" Escalation", "").replace(/\s+\d+$/, "")}
                                  {isEscalation && (
                                    <EscalationIdHint
                                      conversationId={selected.id}
                                      label={label}
                                      className="text-orange-800 dark:text-orange-200"
                                    />
                                  )}
                                </span>
                              </span>
                            ))}
                          {msg.timestamp && (
                            <>
                                <span className="opacity-60"> · </span>
                              <span>{msg.timestamp}</span>
                            </>
                          )}
                        </p>
                        </div>
                        {escalationReason && (
                          <p className="max-w-xl text-center text-xxs leading-relaxed text-orange-800/80 dark:text-orange-200/80">
                            <span className="font-semibold text-orange-900/90 dark:text-orange-100/90">Reason: </span>
                            {escalationReason}
                          </p>
                        )}
                        {pausedAgents.length > 0 && (
                          <div className="flex items-center gap-1.5 text-[10px] text-orange-700/80 dark:text-orange-300/80">
                            <PauseCircle className="h-3 w-3 shrink-0 text-orange-500" aria-hidden />
                            <span>
                              {pausedAgents.map((a, i) => (
                                <span key={a}>
                                  {i > 0 && ", "}
                                  <span className="font-semibold">{a}</span>
                                </span>
                              ))}
                              {" turned off until resolved"}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (msg.type === "private_note") {
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback
                              className={cn(
                                "text-[9px] font-semibold",
                                msg.privateNoteAuthor
                                  ? avatarColor(msg.privateNoteAuthor)
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                              )}
                            >
                              {msg.privateNoteAuthor ? (
                                initials(msg.privateNoteAuthor)
                              ) : (
                                <StickyNote className="h-3.5 w-3.5" />
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                            Private Note
                            {msg.privateNoteAuthor ? (
                              <>
                                <span className="font-normal text-muted-foreground"> · </span>
                                <span className="font-medium text-amber-800 dark:text-amber-200">
                                  {msg.privateNoteAuthor}
                                </span>
                              </>
                            ) : null}
                          </span>
                          {msg.timestamp && <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>}
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                          {msg.text}
                        </div>
                      </div>
                    );
                  }

                  const isAgent = msg.role === "agent";
                  const isStaff = msg.role === "staff";

                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ThreadMessageAvatar
                          variant="threadBubble"
                          isAgent={isAgent}
                          isStaff={isStaff}
                          selected={selected}
                          isHumanAssignee={isHumanAssignee}
                        />
                        <div className="flex flex-col">
                          <span className={cn("text-xs font-semibold", (isAgent || isStaff) ? "text-foreground" : "text-foreground")}>
                            {isAgent
                              ? resolveAgentLabel(selected.agent)
                              : isStaff
                                ? handoffAssigneeLabelForConversation(
                                    selected.assignee,
                                    isHumanAssignee,
                                    selected.staffRespondentIsExternalAgent
                                  )
                                : selected.resident}
                          </span>
                          {msg.timestamp && <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                          (isAgent || isStaff) && "bg-blue-500 text-white dark:bg-blue-600",
                          !isAgent && !isStaff && "border border-border bg-card text-card-foreground shadow-sm"
                        )}
                      >
                        {isStaff && msg.replyToEscalations && msg.replyToEscalations.length > 0 && (
                          <div className="mb-1.5 flex flex-wrap gap-1">
                            {msg.replyToEscalations.map((esc) => (
                              <span
                                key={esc}
                                className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white ring-1 ring-inset ring-white/30"
                              >
                                Replying to {esc.replace(" Escalation", "").replace(/\s+\d+$/, "")}
                                <EscalationIdHint
                                  conversationId={selected.id}
                                  label={esc}
                                  className="text-white/90"
                                />
                          </span>
                        ))}
                          </div>
                        )}
                        <TranslatableMessageBody
                          msg={msg}
                          translationEnabled={translationEnabled}
                          showEnglish={isViewingInEnglish}
                          chipVariant={isAgent || isStaff ? "onDark" : "muted"}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chat input */}
            <div className="shrink-0 border-t border-border bg-muted/40 shadow-[0_-2px_6px_rgba(0,0,0,0.04)]">
              {/* Mode toggle — hidden for Super Agent when AI is active */}
              {!(selected && isSuperAgentDemoThread(selected.id) && aiActivated) && (
              <div className="flex items-center gap-1 px-5 pt-3 pb-2">
                <Button
                  variant={inputMode === "message" ? "default" : "ghost"}
                  size="sm"
                  className="gap-1.5 rounded-full text-xs"
                  onClick={() => {
                    setInputMode("message");
                    setPrivateNoteMention(null);
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Message
                </Button>
                <Button
                    variant="ghost"
                  size="sm"
                    className="gap-1.5 rounded-full text-xs"
                    onClick={openPrivateNoteModal}
                  >
                    <StickyNote className="h-3.5 w-3.5" />
                    Private Note
                  </Button>
                  {selected && isSuperAgent1DemoThread(selected.id) && (
                    <button
                      type="button"
                      onClick={() => setEscalationSummaryOpen((v) => !v)}
                      className="ml-auto flex items-center gap-1.5 rounded-md bg-gradient-to-r from-indigo-500 to-blue-500 px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-sm transition-all hover:from-indigo-600 hover:to-blue-600 hover:shadow-md"
                    >
                      <Sparkles className="h-3 w-3" />
                      AI Summary
                    </button>
                  )}
                </div>
              )}

              {/* Compact escalation-reply selector — instructive label +
                  helper sub-line + pill checkboxes. Rendered on both SA 1.0
                  demo threads AND SA 1.2 threads with active escalations so
                  staff always mark which escalation(s) their public reply
                  is answering before Send commits. */}
              {selected &&
                (isSuperAgent1DemoThread(selected.id) ||
                  (superAgent12Enabled &&
                    !isSuperAgentDemoThread(selected.id))) &&
                inputMode === "message" &&
                selected.labels.some((l) => l.includes("Escalation")) && (() => {
                  const sa1Escalations = selected.labels.filter((l) => l.includes("Escalation"));
                  const selectedCount = selectedEscalationTypes.size;
                  const isError = escalationError && selectedCount === 0;
                  return (
                    <div className="px-5 pb-2">
                      <div
                  className={cn(
                          "rounded-md border px-2.5 py-1.5 transition-all",
                          isError
                            ? "border-red-400 bg-red-50 dark:border-red-600 dark:bg-red-950/20"
                            : "border-orange-300 bg-orange-50/70 dark:border-orange-700/60 dark:bg-orange-950/20"
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "flex items-center gap-1.5 text-[11px] font-semibold",
                              isError ? "text-red-700 dark:text-red-300" : "text-orange-800 dark:text-orange-200"
                            )}
                          >
                            {isError && <AlertTriangle className="h-3 w-3 animate-pulse" />}
                            {isError
                              ? "Pick an escalation before sending:"
                              : `Which escalation(s) does this reply address? (${selectedCount}/${sa1Escalations.length})`}
                            <TooltipProvider delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    aria-label="What does this do?"
                                    className={cn(
                                      "flex h-3.5 w-3.5 items-center justify-center rounded-full transition-colors",
                                      isError
                                        ? "text-red-700 hover:bg-red-200/60 dark:text-red-300 dark:hover:bg-red-900/40"
                                        : "text-orange-700 hover:bg-orange-200/60 dark:text-orange-300 dark:hover:bg-orange-900/40"
                                    )}
                                  >
                                    <CircleHelp className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[280px] text-[11px] leading-relaxed">
                                  Marks which escalation this reply is for. Escalations no one has answered stay in everyone&apos;s queue so a teammate can step in. The thread leaves your list only after every escalation has had at least one staff reply.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </span>
                          {sa1Escalations.map((label) => {
                            const isSelected = selectedEscalationTypes.has(label);
                            return (
                              <span key={label} className="inline-flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedEscalationTypes((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(label)) next.delete(label);
                                      else next.add(label);
                                      if (selected) superAgentSelectionsRef.current.set(selected.id, next);
                                      return next;
                                    });
                                    setEscalationError(false);
                                    scrollToEscalationLabel(label);
                                    chatTextareaRef.current?.focus();
                                  }}
                                  className={cn(
                                    "flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all",
                                    isSelected
                                      ? "border-orange-500 bg-orange-500 text-white shadow-sm dark:border-orange-400 dark:bg-orange-500"
                                      : isError
                                        ? "border-red-400 bg-white text-red-700 animate-pulse dark:border-red-600 dark:bg-card dark:text-red-300"
                                        : "border-orange-300 bg-white text-orange-800 hover:border-orange-500 hover:bg-orange-100/60 dark:border-orange-700 dark:bg-card dark:text-orange-200 dark:hover:bg-orange-950/40"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "flex h-3 w-3 shrink-0 items-center justify-center rounded-sm border",
                                      isSelected
                                        ? "border-white bg-white text-orange-600"
                                        : isError
                                          ? "border-red-400"
                                          : "border-orange-400"
                                    )}
                                  >
                                    {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                  </span>
                                  {label.replace(" Escalation", "").replace(/\s+\d+$/, "")}
                                </button>
                                <EscalationIdHint
                                  conversationId={selected.id}
                                  label={label}
                                  className={
                                    isError
                                      ? "text-red-700 dark:text-red-300"
                                      : "text-orange-800 dark:text-orange-200"
                                  }
                                />
                              </span>
                            );
                          })}
                          {selectedCount > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEscalationTypes(new Set());
                                if (selected) superAgentSelectionsRef.current.set(selected.id, new Set());
                              }}
                              className="ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium text-orange-700 transition-colors hover:bg-orange-200/50 dark:text-orange-300 dark:hover:bg-orange-900/40"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {/* Escalation selector + context summary for Super Agent */}
              {selected && isSuperAgentDemoThread(selected.id) && aiActivated && inputMode === "message" && (
                <div className="px-5 pt-3 pb-2">
                  {escalationSummaryOpen ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setEscalationSummaryOpen(false)}
                        className="flex w-full items-center gap-2 rounded-t-lg border border-b-0 border-blue-200 bg-blue-50/70 px-3 py-2 text-left transition-colors hover:bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30"
                      >
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-blue-100 dark:bg-blue-900/50">
                          <FileText className="h-3 w-3 text-blue-600 dark:text-blue-300" />
                        </div>
                        <span className="flex-1 text-xs font-semibold text-blue-800 dark:text-blue-200">
                          Escalation Context Summary
                        </span>
                        <ChevronDown className="h-4 w-4 text-blue-500" />
                      </button>
                      <div className="space-y-2 rounded-b-lg border border-t-0 border-blue-200 bg-white p-3 dark:border-blue-900/50 dark:bg-card">
                        {selected.labels
                          .filter((l) => l.includes("Escalation"))
                          .map((label) => {
                            const summary = getEscalationReason(label);
                            return (
                              <div
                                key={label}
                                className="rounded-md border-l-[3px] border-l-orange-400 bg-orange-50/50 px-3 py-2 dark:bg-orange-950/10"
                              >
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="text-[11px] font-bold text-orange-800 dark:text-orange-200">
                                    {label.replace(" Escalation", "").replace(/\s+\d+$/, "")}
                                  </span>
                                  <EscalationIdHint
                                    conversationId={selected.id}
                                    label={label}
                                    className="text-orange-800 dark:text-orange-200"
                                  />
                                </div>
                                <p className="text-[11px] leading-relaxed text-foreground/80">
                                  {summary}
                                </p>
                              </div>
                            );
                          })}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mb-1.5 flex items-center justify-between">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Select The Escalation You Want To Give Context For
                        </p>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={openPrivateNoteModal}
                            className="flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-700 shadow-sm transition-all hover:bg-amber-100 hover:shadow-md dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                          >
                            <StickyNote className="h-3 w-3" />
                  Private Note
                          </button>
                          <button
                            type="button"
                            onClick={() => setEscalationSummaryOpen(true)}
                            className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-indigo-500 to-blue-500 px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-sm transition-all hover:from-indigo-600 hover:to-blue-600 hover:shadow-md"
                          >
                            <Sparkles className="h-3 w-3" />
                            AI Summary
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {selected.labels
                          .filter((l) => l.includes("Escalation"))
                          .map((label) => {
                            const isSelected = selectedEscalationTypes.has(label);
                            return (
                              <span key={label} className="inline-flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedEscalationTypes((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(label)) next.delete(label);
                                      else next.add(label);
                                      if (selected) superAgentSelectionsRef.current.set(selected.id, next);
                                      return next;
                                    });
                                    setEscalationError(false);
                                    chatTextareaRef.current?.focus();
                                  }}
                                  className={cn(
                                    "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                                    isSelected
                                      ? "border-orange-400 bg-orange-50 text-orange-800 ring-1 ring-orange-400 dark:border-orange-600 dark:bg-orange-950/30 dark:text-orange-200"
                                      : escalationError
                                        ? "border-red-400 bg-red-50 text-red-700 ring-1 ring-red-300 animate-pulse dark:border-red-600 dark:bg-red-950/20 dark:text-red-300"
                                        : "border-border bg-background text-muted-foreground hover:border-orange-300 hover:bg-orange-50/50 hover:text-orange-700"
                                  )}
                                >
                                  <span className={cn(
                                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                                    isSelected
                                      ? "border-orange-500 bg-orange-500 text-white"
                                      : "border-muted-foreground/30"
                                  )}>
                                    {isSelected && <Check className="h-2.5 w-2.5" />}
                                  </span>
                                  {label.replace(" Escalation", "").replace(/\s+\d+$/, "")}
                                </button>
                                <EscalationIdHint
                                  conversationId={selected.id}
                                  label={label}
                                  className="text-orange-800 dark:text-orange-200"
                                />
                              </span>
                            );
                          })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Escalation context summary — visible when AI deactivated for Super Agent */}
              {selected && isSuperAgentDemoThread(selected.id) && !aiActivated && inputMode === "message" && (
                <div className="px-5 pt-3 pb-2">
                  <button
                    type="button"
                    onClick={() => setEscalationSummaryOpen(!escalationSummaryOpen)}
                    className="flex w-full items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-left transition-colors hover:bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-blue-100 dark:bg-blue-900/50">
                      <FileText className="h-3 w-3 text-blue-600 dark:text-blue-300" />
                    </div>
                    <span className="flex-1 text-xs font-semibold text-blue-800 dark:text-blue-200">
                      Escalation Context Summary
                    </span>
                    <ChevronRight className={cn(
                      "h-4 w-4 text-blue-500 transition-transform duration-200",
                      escalationSummaryOpen && "rotate-90"
                    )} />
                  </button>
                  {escalationSummaryOpen && (
                    <div className="mt-1.5 space-y-2 rounded-lg border border-blue-100 bg-white p-3 shadow-sm dark:border-blue-900/40 dark:bg-card">
                      {selected.labels
                        .filter((l) => l.includes("Escalation"))
                        .map((label) => {
                          const summary = getEscalationReason(label);
                          return (
                            <div
                              key={label}
                              className="rounded-md border-l-[3px] border-l-orange-400 bg-orange-50/50 px-3 py-2 dark:bg-orange-950/10"
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-[11px] font-bold text-orange-800 dark:text-orange-200">
                                  {label.replace(" Escalation", "").replace(/\s+\d+$/, "")}
                                </span>
                                <EscalationIdHint
                                  conversationId={selected.id}
                                  label={label}
                                  className="text-orange-800 dark:text-orange-200"
                                />
                              </div>
                              <p className="text-[11px] leading-relaxed text-foreground/80">
                                {summary}
                              </p>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* AI Summary panel for Super Agent 1.0 — overall conversation snapshot + action items */}
              {selected && isSuperAgent1DemoThread(selected.id) && inputMode === "message" && escalationSummaryOpen && (() => {
                const escalations = selected.labels.filter((l) => l.includes("Escalation"));
                const actionMap: Record<string, string> = {
                  "Maintenance AI 1 Escalation":
                    "Confirm technician ETA for dishwasher work order #48219 and reply with a schedule window.",
                  "Maintenance AI 2 Escalation":
                    "Open or prioritize a separate A/C work order (not blowing cold) and reply independently of the dishwasher ticket.",
                };
                return (
                  <div className="px-5 pb-2">
                    <button
                      type="button"
                      onClick={() => setEscalationSummaryOpen(false)}
                      className="flex w-full items-center gap-2 rounded-t-lg border border-b-0 border-blue-200 bg-blue-50/70 px-3 py-2 text-left transition-colors hover:bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30"
                    >
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-blue-100 dark:bg-blue-900/50">
                        <Sparkles className="h-3 w-3 text-blue-600 dark:text-blue-300" />
                      </div>
                      <span className="flex-1 text-xs font-semibold text-blue-800 dark:text-blue-200">
                        AI Summary
                      </span>
                      <ChevronDown className="h-4 w-4 text-blue-500" />
                    </button>
                    <div className="space-y-3 rounded-b-lg border border-t-0 border-blue-200 bg-white p-3.5 dark:border-blue-900/50 dark:bg-card">
                      <p className="text-[13px] leading-relaxed text-foreground/80">
                        <span className="font-semibold text-foreground">{selected.resident}</span>
                        {selected.unit ? ` (${selected.unit}, ${selected.property})` : ` (${selected.property})`}{" "}
                        asked Maintenance AI about an existing dishwasher work order, then reported a separate A/C
                        issue while that first escalation was still open. The AI escalated each topic on its own so
                        staff can reply to and resolve them independently — even though both are Maintenance AI.
                      </p>
                      {escalations.length > 0 && (
                        <div className="space-y-2 rounded-md border-l-[3px] border-l-orange-400 bg-orange-50/50 px-3 py-2.5 dark:bg-orange-950/10">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-orange-800 dark:text-orange-200">
                            Needs your response
                          </p>
                          {escalations.map((label) => {
                            const action = actionMap[label] ?? "Review the conversation and respond on this escalation.";
                            return (
                              <div key={label} className="flex gap-2">
                                <span className="inline-flex shrink-0 items-center gap-0.5 text-[13px] font-semibold text-orange-700 dark:text-orange-300">
                                  {label.replace(" Escalation", "").replace(/\s+\d+$/, "")}
                                  <EscalationIdHint
                                    conversationId={selected.id}
                                    label={label}
                                    className="text-orange-700 dark:text-orange-300"
                                  />
                                  :
                                </span>
                                <span className="text-[13px] leading-relaxed text-foreground/80">
                                  {action}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Private Note modal — posts to thread + resident Activity Log */}
              <Dialog
                open={privateNoteModalOpen && !!selected}
                onOpenChange={(open) => {
                  setPrivateNoteModalOpen(open);
                  if (!open) setPrivateNoteModalDraft("");
                }}
              >
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Private Note</DialogTitle>
                    <DialogDescription>
                      Internal notes are visible only to your team on this conversation. They will also
                      appear on the resident profile Activity Log.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 pt-1">
                    <textarea
                      value={privateNoteModalDraft}
                      onChange={(e) => setPrivateNoteModalDraft(e.target.value)}
                      placeholder="Write a private note…"
                      rows={4}
                      className="w-full resize-none rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 dark:border-amber-800 dark:bg-amber-900/20"
                      autoFocus
                    />
                    <p className="text-xxs leading-snug text-muted-foreground">
                      This note stays private to staff and will also be logged on the Activity Log for{" "}
                      {selected?.resident ?? "this resident"}.
                    </p>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPrivateNoteModalOpen(false);
                          setPrivateNoteModalDraft("");
                        }}
                      >
                        Cancel
                </Button>
                      <Button
                        size="sm"
                        className="bg-amber-600 text-white hover:bg-amber-700"
                        disabled={!privateNoteModalDraft.trim() || !selected}
                        onClick={submitPrivateNoteFromModal}
                      >
                        <StickyNote className="mr-1.5 h-3.5 w-3.5" />
                        Add Note
                      </Button>
                    </DialogFooter>
              </div>
                </DialogContent>
              </Dialog>

              {/* Escalation picker modal for Super Agent */}
              {selected && isSuperAgentDemoThread(selected.id) && (
                <Dialog open={escalationPickerOpen} onOpenChange={setEscalationPickerOpen}>
                  <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Which escalation are you resolving?</DialogTitle>
                      <DialogDescription>
                        Select the AI escalation(s) you want to respond to in this conversation.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 pt-2">
                      {selected.labels
                        .filter((l) => l.includes("Escalation"))
                        .map((label) => {
                          const isSelected = escalationPickerSelections.has(label);
                          return (
                            <button
                              key={label}
                              type="button"
                              onClick={() => {
                                setEscalationPickerSelections((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(label)) next.delete(label);
                                  else next.add(label);
                                  return next;
                                });
                              }}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all",
                                isSelected
                                  ? "border-orange-400 bg-orange-50 text-orange-800 ring-1 ring-orange-400"
                                  : "border-border bg-background text-foreground hover:border-orange-300 hover:bg-orange-50/50"
                              )}
                            >
                              <span className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                                isSelected
                                  ? "border-orange-500 bg-orange-500 text-white"
                                  : "border-muted-foreground/30"
                              )}>
                                {isSelected && <Check className="h-3 w-3" />}
                              </span>
                              <span className={cn("h-2 w-2 rounded-full shrink-0", isSelected ? "bg-orange-500" : "bg-muted-foreground/30")} />
                              <span className="inline-flex min-w-0 flex-1 items-center gap-1">
                                <span className="truncate">{label.replace(" Escalation", "").replace(/\s+\d+$/, "")}</span>
                                <EscalationIdHint
                                  conversationId={selected.id}
                                  label={label}
                                  className="text-orange-800"
                                />
                              </span>
                            </button>
                          );
                        })}
                    </div>
                    <div className="flex justify-end gap-2 pt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEscalationPickerOpen(false);
                          if (previousSelectedIdRef.current !== null) {
                            setSelectedId(previousSelectedIdRef.current);
                          }
                        }}
                      >
                        Nevermind
                      </Button>
                      <Button
                        size="sm"
                        disabled={escalationPickerSelections.size === 0}
                        onClick={() => {
                          const selections = new Set(escalationPickerSelections);
                          setSelectedEscalationTypes(selections);
                          if (selected) superAgentSelectionsRef.current.set(selected.id, selections);
                          setEscalationPickerOpen(false);
                          setTimeout(() => {
                            if (scrollRef.current) {
                              const allEscalationEls = scrollRef.current.querySelectorAll("[data-escalation-label]");
                              for (const el of allEscalationEls) {
                                const label = el.getAttribute("data-escalation-label");
                                if (label && selections.has(label)) {
                                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                                  break;
                                }
                              }
                            }
                          }, 300);
                        }}
                      >
                        Continue
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* SA1 Resolve escalation picker modal */}
              {selected && isSuperAgent1DemoThread(selected.id) && (
                <Dialog open={sa1ResolvePickerOpen} onOpenChange={setSa1ResolvePickerOpen}>
                  <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Which escalation are you resolving?</DialogTitle>
                      <DialogDescription>
                        Select the AI escalation(s) you are resolving for this conversation.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 pt-2">
                      {selected.labels
                        .filter((l) => l.includes("Escalation"))
                        .map((label) => {
                          const isSelected = sa1ResolveSelections.has(label);
                          return (
                            <button
                              key={label}
                              type="button"
                              onClick={() => {
                                setSa1ResolveSelections((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(label)) next.delete(label);
                                  else next.add(label);
                                  return next;
                                });
                              }}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all",
                                isSelected
                                  ? "border-emerald-400 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-400"
                                  : "border-border bg-background text-foreground hover:border-emerald-300 hover:bg-emerald-50/50"
                              )}
                            >
                              <span className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                                isSelected
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : "border-muted-foreground/30"
                              )}>
                                {isSelected && <Check className="h-3 w-3" />}
                              </span>
                              <span className={cn("h-2 w-2 rounded-full shrink-0", isSelected ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                              <span className="inline-flex min-w-0 flex-1 items-center gap-1">
                                <span className="truncate">{label.replace(" Escalation", "").replace(/\s+\d+$/, "")}</span>
                                <EscalationIdHint
                                  conversationId={selected.id}
                                  label={label}
                                  className="text-emerald-800"
                                />
                              </span>
                            </button>
                          );
                        })}
                    </div>
                    <div className="flex justify-end gap-2 pt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSa1ResolvePickerOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={sa1ResolveSelections.size === 0}
                        onClick={() => {
                          if (!selected) return;
                          const resolved = Array.from(sa1ResolveSelections);
                          addMessage(selected.id, {
                            role: "staff",
                            text: "",
                            timestamp: new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short" }).replace(",", " ·"),
                            type: "label_activity",
                            labelActivity: {
                              actor: MY_INBOX_ASSIGNEE,
                              labelsAdded: resolved,
                              action: "resolved_escalation",
                            },
                          });
                          for (const esc of resolved) {
                            removeLabel(selected.id, esc);
                          }
                          const remaining = selected.labels.filter(
                            (l) => l.includes("Escalation") && !sa1ResolveSelections.has(l)
                          );
                          if (remaining.length === 0) {
                            resolveConversation(selected.id, MY_INBOX_ASSIGNEE);
                          }
                          setSa1ResolvePickerOpen(false);
                          setSa1ResolveSelections(new Set());
                        }}
                      >
                        Resolve
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Document call / other note for missed-call & voicemail demo threads */}
              <Dialog
                open={phoneDocumentKind !== null && !!selected}
                onOpenChange={(open) => {
                  if (!open) {
                    setPhoneDocumentKind(null);
                    setPhoneDocumentNotes("");
                  }
                }}
              >
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {phoneDocumentKind === "incoming"
                        ? "Document incoming call"
                        : phoneDocumentKind === "outgoing"
                          ? "Document outgoing call"
                          : "Other note"}
                    </DialogTitle>
                    <DialogDescription>
                      Once you log the notes, they will be posted to this conversation and the resident profile Activity Log, and this conversation will be resolved.
                    </DialogDescription>
                  </DialogHeader>
                  <textarea
                    value={phoneDocumentNotes}
                    onChange={(e) => setPhoneDocumentNotes(e.target.value)}
                    rows={4}
                    className="input-base min-h-[96px] resize-y text-sm"
                    placeholder={
                      phoneDocumentKind === "other"
                        ? "Write a note…"
                        : "What was discussed on the call?"
                    }
                    autoFocus
                  />
                  <DialogFooter>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPhoneDocumentKind(null);
                        setPhoneDocumentNotes("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={!phoneDocumentNotes.trim() || !selected || !phoneDocumentKind}
                      onClick={() => {
                        if (!selected || !phoneDocumentKind) return;
                        const notes = phoneDocumentNotes.trim();
                        const timestamp = new Date()
                          .toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                            timeZoneName: "short",
                          })
                          .replace(",", " ·");
                        const phoneNumber = phoneNumberFromDemoThread(selected);

                        if (phoneDocumentKind === "other") {
                          addMessage(selected.id, {
                            role: "staff",
                            text: notes,
                            timestamp,
                            type: "private_note",
                            privateNoteAuthor: MY_INBOX_ASSIGNEE,
                          });
                        } else {
                          recordThreadActivity(selected.id, {
                            kind: "phone_call",
                            actor: DEFAULT_CONVERSATION_ACTIVITY_ACTOR,
                            phoneNumber: phoneNumber || "Unknown",
                            outcome: "connected",
                            notes,
                            direction: phoneDocumentKind === "incoming" ? "inbound" : "outbound",
                          });
                        }

                        const entry: ResidentProfileActivityEntry = {
                          id: `pa-${Date.now()}`,
                          kind: phoneDocumentKind,
                          notes,
                          actor: MY_INBOX_ASSIGNEE,
                          timestamp,
                          conversationId: selected.id,
                          phoneNumber: phoneNumber || undefined,
                        };
                        setResidentProfileActivity((prev) => ({
                          ...prev,
                          [selected.resident]: [entry, ...(prev[selected.resident] ?? [])],
                        }));
                        setProfileMainTab("Activity Log");
                        resolveConversation(selected.id, MY_INBOX_ASSIGNEE);
                        setPhoneDocumentKind(null);
                        setPhoneDocumentNotes("");
                        toast.success(
                          phoneDocumentKind === "other"
                            ? "Note saved to conversation and profile Activity Log"
                            : "Call documented on conversation and profile Activity Log"
                        );
                      }}
                    >
                      Save & resolve
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Resolve conversation modal */}
              <Dialog
                open={resolveModalOpen && !!selected}
                onOpenChange={(open) => {
                  if (!open) {
                    setResolveModalOpen(false);
                    setResolveModalNotes("");
                    // Reset Eli-choice back to the safe default whenever the
                    // dialog is dismissed so the next open starts fresh.
                    setResolveModalEliChoice("resume");
                    setResolveModalEscalationsToResolve(new Set());
                  }
                }}
              >
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Resolve conversation</DialogTitle>
                    <DialogDescription>
                      Select the action type and add any notes. The note will be posted to this conversation before it is resolved.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Action type</label>
                      <Select value={resolveModalAction} onValueChange={(v) => setResolveModalAction(v as "general" | "incoming" | "outgoing")}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Resolution</SelectItem>
                          <SelectItem value="incoming">Incoming Call</SelectItem>
                          <SelectItem value="outgoing">Outgoing Call</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
                      <textarea
                        value={resolveModalNotes}
                        onChange={(e) => setResolveModalNotes(e.target.value)}
                        rows={4}
                        className="input-base min-h-[96px] resize-y text-sm"
                        placeholder={
                          resolveModalAction === "general"
                            ? "Add a note about this resolution…"
                            : "What was discussed on the call?"
                        }
                        autoFocus
                      />
                    </div>
                    {/* SA 1.2 "Which escalations are you resolving?"
                        picker — only rendered when the thread carries
                        MORE THAN ONE active AI escalation. A single-
                        escalation thread auto-resolves that one on Save,
                        matching SA 1.0's "no picker if just one" rule.
                        Seeded with all active escalations pre-selected so
                        the default action is "resolve everything"; staff
                        opts out of any escalation they aren't answering
                        yet. Mirrors the SA 1.0 resolve picker's visual
                        language (orange escalation tint + checkbox +
                        EscalationIdHint). */}
                    {superAgent12Enabled &&
                      selected &&
                      (() => {
                        const activeEscalations = selected.labels.filter(
                          (l) => l.includes("Escalation"),
                        );
                        if (activeEscalations.length < 2) return null;
                        return (
                          <div className="space-y-2 border-t border-border/60 pt-4">
                            <div>
                              <p className="text-sm font-medium">
                                Which escalations are you resolving?
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                Uncheck any escalation you&apos;re not
                                resolving in this pass — those stay
                                open on the thread.
                              </p>
                            </div>
                            <div className="space-y-1.5">
                              {activeEscalations.map((label) => {
                                const isChecked =
                                  resolveModalEscalationsToResolve.has(label);
                                return (
                                  <label
                                    key={label}
                                    className={cn(
                                      "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                                      isChecked
                                        ? "border-status-success/60 bg-status-success/5"
                                        : "border-input bg-background hover:border-input hover:bg-accent/30",
                                    )}
                                  >
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={(v) =>
                                        setResolveModalEscalationsToResolve(
                                          (prev) => {
                                            const next = new Set(prev);
                                            if (v) next.add(label);
                                            else next.delete(label);
                                            return next;
                                          },
                                        )
                                      }
                                    />
                                    <span className="inline-flex min-w-0 flex-1 items-center gap-1">
                                      <span className="truncate text-sm font-medium text-foreground">
                                        {label
                                          .replace(" Escalation", "")
                                          .replace(/\s+\d+$/, "")}
                                      </span>
                                      <EscalationIdHint
                                        conversationId={selected.id}
                                        label={label}
                                        className="text-muted-foreground"
                                      />
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    {/* SA 1.2 "What should Eli do next?" section — only
                        surfaced when SA 1.2 is on AND the thread has an
                        active AI escalation. Mirrors the tile pattern used
                        by the Eli Prompt modal so the two "pick how Eli
                        behaves" moments feel like the same control. */}
                    {superAgent12Enabled &&
                      selected &&
                      hasActiveAiEscalation(selected) && (
                        <div className="space-y-2 border-t border-border/60 pt-4">
                          <div>
                            <p className="text-sm font-medium">
                              What should Eli do next?
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Choose how Eli behaves after this thread is
                              resolved.
                            </p>
                          </div>
                          <div
                            role="radiogroup"
                            aria-label="What should Eli do on this thread after it's resolved?"
                            className="grid grid-cols-2 gap-3"
                          >
                            {(() => {
                              /**
                               * Local helper that reuses the same tile
                               * pattern as the Eli Prompt modal so both
                               * "pick how Eli behaves" moments feel like
                               * the same control. Kept local because it
                               * closes over the resolve-modal state, not
                               * the pre-send Eli-prompt state.
                               */
                              const renderResolveTile = (
                                id: "resume" | "off-indefinite",
                                {
                                  icon: Icon,
                                  iconBg,
                                  iconRing,
                                  selectedBorder,
                                  selectedBg,
                                  title,
                                  subtitle,
                                }: {
                                  icon: typeof CheckCircle2;
                                  iconBg: string;
                                  iconRing: string;
                                  selectedBorder: string;
                                  selectedBg: string;
                                  title: string;
                                  subtitle: string;
                                },
                              ) => {
                                const isSelected =
                                  resolveModalEliChoice === id;
                                return (
                                  <div
                                    key={id}
                                    role="radio"
                                    tabIndex={0}
                                    aria-checked={isSelected}
                                    onClick={() => setResolveModalEliChoice(id)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        setResolveModalEliChoice(id);
                                      }
                                    }}
                                    className={cn(
                                      "group relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                      isSelected
                                        ? cn(
                                            selectedBorder,
                                            selectedBg,
                                            "shadow-sm",
                                          )
                                        : "border-input bg-background hover:border-input hover:bg-accent/30",
                                    )}
                                  >
                                    <span
                                      aria-hidden
                                      className={cn(
                                        "absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full transition-opacity",
                                        isSelected
                                          ? cn(iconBg, "opacity-100")
                                          : "opacity-0",
                                      )}
                                    >
                                      <Check
                                        className={cn("h-3 w-3", iconRing)}
                                        strokeWidth={3}
                                      />
                                    </span>
                                    <span
                                      aria-hidden
                                      className={cn(
                                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                                        iconBg,
                                      )}
                                    >
                                      <Icon
                                        className={cn("h-5 w-5", iconRing)}
                                        strokeWidth={2.25}
                                      />
                                    </span>
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold leading-tight">
                                        {title}
                                      </p>
                                      <p className="mt-1 text-xs leading-snug text-muted-foreground">
                                        {subtitle}
                                      </p>
                                    </div>
                                  </div>
                                );
                              };
                              return (
                                <>
                                  {renderResolveTile("resume", {
                                    icon: CheckCircle2,
                                    iconBg: "bg-status-success",
                                    iconRing: "text-status-success-foreground",
                                    selectedBorder: "border-status-success",
                                    selectedBg: "bg-status-success/10",
                                    title: "Eli turns back on",
                                    subtitle:
                                      "Future messages get Eli's automation",
                                  })}
                                  {renderResolveTile("off-indefinite", {
                                    icon: BotOff,
                                    iconBg: "bg-muted-foreground",
                                    iconRing: "text-background",
                                    selectedBorder: "border-foreground",
                                    selectedBg: "bg-muted/60",
                                    title: "Keep Eli off",
                                    subtitle:
                                      "Future messages go to Property Threads",
                                  })}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setResolveModalOpen(false);
                        setResolveModalNotes("");
                        setResolveModalEliChoice("resume");
                        setResolveModalEscalationsToResolve(new Set());
                      }}
                    >
                      Cancel
                    </Button>
                    {(() => {
                      // Save button — disabled when the picker is
                      // rendered (2+ escalations) but staff has unchecked
                      // every option. Anything else is always send-able.
                      const activeEscalations = selected
                        ? selected.labels.filter((l) => l.includes("Escalation"))
                        : [];
                      const pickerVisible = activeEscalations.length >= 2;
                      const saveDisabled =
                        pickerVisible &&
                        resolveModalEscalationsToResolve.size === 0;
                      return (
                        <Button
                          size="sm"
                          disabled={saveDisabled}
                          onClick={() => {
                            if (!selected) return;
                            const notes = resolveModalNotes.trim();
                            // SA 1.2 escalated-thread branch: resolve
                            // exactly the escalation labels staff picked
                            // (all of them by default when the picker is
                            // hidden; the "pick which" subset when the
                            // picker is visible). The mode change is
                            // stamped BEFORE any resolveConversation call
                            // so the timeline reads:
                            //   resolved_escalation activity → eli_mode
                            //   change → thread status resolved.
                            const shouldApplyEliBranch =
                              superAgent12Enabled &&
                              hasActiveAiEscalation(selected);
                            let remainingEscalationCount =
                              activeEscalations.length;
                            if (shouldApplyEliBranch) {
                              // "Labels this Save resolves" — either the
                              // full active list (auto path) or exactly
                              // the picker selection (2+ path).
                              const labelsToResolve = pickerVisible
                                ? Array.from(resolveModalEscalationsToResolve)
                                : activeEscalations;
                              const labelsForActivity =
                                labelsToResolve.length > 0
                                  ? labelsToResolve
                                  : ["AI Escalation"];
                              const resolveTimestamp = new Date()
                                .toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                  timeZoneName: "short",
                                })
                                .replace(",", " ·");
                              addMessage(selected.id, {
                                role: "staff",
                                text: "",
                                timestamp: resolveTimestamp,
                                type: "label_activity",
                                labelActivity: {
                                  actor: MY_INBOX_ASSIGNEE,
                                  labelsAdded: labelsForActivity,
                                  action: "resolved_escalation",
                                },
                              });
                              for (const label of labelsToResolve) {
                                removeLabel(selected.id, label);
                              }
                              remainingEscalationCount = Math.max(
                                0,
                                activeEscalations.length - labelsToResolve.length,
                              );
                              // Apply the Eli mode change per staff's
                              // pick. Note: "resume" is a no-op state-wise
                              // when Eli is already On on the thread, but
                              // we still stamp a mode-change audit entry
                              // so the timeline records the staff
                              // decision — mirroring the Eli-Prompt "on"
                              // branch. "off-indefinite" uses the
                              // "indefinite" policy so the auto-resume
                              // effect leaves it alone.
                              if (
                                resolveModalEliChoice === "off-indefinite"
                              ) {
                                applyEliModeChange(
                                  selected.id,
                                  { kind: "off", policy: "indefinite" },
                                  "resolve",
                                );
                              } else {
                                applyEliModeChange(
                                  selected.id,
                                  { kind: "on" },
                                  "resolve",
                                );
                              }
                            }
                            // Only close the conversation when every
                            // active escalation has been resolved (or
                            // when the thread has no escalations at all,
                            // i.e. classic "resolve conversation" flow).
                            // If some escalations remain, staff will
                            // hit Resolve again later.
                            if (remainingEscalationCount === 0) {
                              resolveConversation(
                                selected.id,
                                MY_INBOX_ASSIGNEE,
                                {
                                  notes: notes || undefined,
                                  resolutionType: resolveModalAction,
                                },
                              );
                            }
                            setResolveModalOpen(false);
                            setResolveModalNotes("");
                            setResolveModalEliChoice("resume");
                            setResolveModalEscalationsToResolve(new Set());
                          }}
                        >
                          Save &amp; resolve
                        </Button>
                      );
                    })()}
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Input box */}
              <div className="px-5 pb-4">
                <div
                  className={cn(
                    "relative flex flex-col rounded-xl border transition-colors focus-within:ring-1 focus-within:ring-ring",
                    inputMode === "private_note"
                      ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
                      : selected && isSuperAgentDemoThread(selected.id) && aiActivated && selectedEscalationTypes.size > 0
                        ? "border-orange-300 bg-orange-50/30 dark:border-orange-700 dark:bg-orange-950/10"
                      : "border-input bg-background"
                  )}
                >
                  {escalationError && inputMode !== "private_note" && (
                    <div className="flex items-center gap-2 px-4 pt-2.5 pb-0">
                      <span className="text-[11px] font-medium text-red-600 dark:text-red-400">
                        Please select an escalation above to send context for.
                      </span>
                    </div>
                  )}
                  {inputMode === "private_note" &&
                    privateNoteMention &&
                    (privateNoteMentionFiltered.length > 0 ? (
                      <div
                        className="absolute bottom-full left-0 right-0 z-50 mb-1 overflow-hidden rounded-md border border-border bg-popover shadow-md"
                        role="listbox"
                        aria-label="Mention a teammate"
                      >
                        <ul className="max-h-48 overflow-y-auto py-1">
                          {privateNoteMentionFiltered.map((c, idx) => (
                            <li key={c.handle} role="option" aria-selected={idx === privateNoteMentionIndex}>
                              <button
                                type="button"
                                className={cn(
                                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                                  idx === privateNoteMentionIndex && "bg-accent"
                                )}
                                onMouseDown={(e) => e.preventDefault()}
                                onMouseEnter={() => setPrivateNoteMentionIndex(idx)}
                                onClick={() => applyPrivateNoteMention(c)}
                              >
                                <Avatar className="h-7 w-7">
                                  <AvatarFallback className={cn("text-[10px]", avatarColor(c.name))}>
                                    {initials(c.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-medium text-foreground">{c.name}</p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    @{c.handle} · {c.role}
                                  </p>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : privateNoteMention.query.length > 0 ? (
                      <div className="absolute bottom-full left-0 right-0 z-50 mb-1 rounded-md border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-md">
                        No matching staff
                      </div>
                    ) : null)}
                  <textarea
                    ref={chatTextareaRef}
                    value={draft}
                    onChange={handleComposerDraftChange}
                    onSelect={(e) => {
                      if (inputMode === "private_note") {
                        syncPrivateNoteMentionFromTextarea(e.currentTarget);
                      }
                    }}
                    onKeyUp={(e) => {
                      if (inputMode === "private_note") {
                        syncPrivateNoteMentionFromTextarea(e.currentTarget);
                      }
                    }}
                    onKeyDown={handleComposerKeyDown}
                    placeholder={
                      inputMode === "private_note"
                        ? "Write a private note…"
                        : selected && isSuperAgentDemoThread(selected.id) && aiActivated
                          ? selectedEscalationTypes.size > 0
                            ? "Provide context for this escalation response…"
                            : "Select an escalation above to respond…"
                          : "Write a message…"
                    }
                    rows={selected?.channel === "Email" && inputMode === "message" ? 4 : 2}
                    className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none"
                    aria-label={inputMode === "private_note" ? "Private note" : "Message"}
                    aria-autocomplete={inputMode === "private_note" ? "list" : undefined}
                    aria-haspopup={inputMode === "private_note" ? "listbox" : undefined}
                    aria-expanded={
                      inputMode === "private_note" && !!privateNoteMention
                        ? privateNoteMentionFiltered.length > 0 || privateNoteMention.query.length > 0
                        : undefined
                    }
                  />
                  {(() => {
                    // Translation composer preview: single-line inline preview above the
                    // composer footer. Only shown when auto-translate is on AND the draft has
                    // content — otherwise the toggle in the footer is the only affordance.
                    if (!translationEnabled || inputMode !== "message" || !selected) return null;
                    const detected = conversationDetectedLanguage(selected);
                    if (!detected || !autoTranslateReply || !draft.trim()) return null;
                    const langLabel = languageDisplayName(detected);
                    const previewTranslated = translateStaffDraftTo(draft, detected);
                    return (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="mx-3 mb-1 flex items-center gap-1.5 rounded-md bg-purple-50/70 px-2 py-1 text-[11px] text-purple-900 dark:bg-purple-900/15 dark:text-purple-100"
                              aria-label={`Will send in ${langLabel}`}
                            >
                              <Languages className="h-3 w-3 shrink-0 text-purple-700 dark:text-purple-300" />
                              <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                                {langLabel}
                              </span>
                              <span className="min-w-0 flex-1 truncate italic text-purple-900/90 dark:text-purple-100/90">
                                {previewTranslated}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="start" className="max-w-sm whitespace-pre-wrap">
                            {previewTranslated}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })()}
                  <div className="flex items-center justify-between px-3 pb-2">
                    <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
                      <Paperclip className="h-3.5 w-3.5" />
                      Attach
                    </Button>
                      {(() => {
                        // Compact "translate to <lang>" toggle inline with Attach. Only visible
                        // when the thread has a detected non-English language and we're in
                        // Message mode. Click to flip between on/off.
                        if (!translationEnabled || inputMode !== "message" || !selected) return null;
                        const detected = conversationDetectedLanguage(selected);
                        if (!detected) return null;
                        const langLabel = languageDisplayName(detected);
                        return (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => setAutoTranslateReply((v) => !v)}
                                  className={cn(
                                    "inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-medium transition-colors",
                                    autoTranslateReply
                                      ? "bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-100"
                                      : "text-muted-foreground hover:bg-muted"
                                  )}
                                  aria-pressed={autoTranslateReply}
                                >
                                  <Languages className="h-3.5 w-3.5" />
                                  <span>{langLabel}</span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" align="start">
                                {autoTranslateReply
                                  ? `Auto-translating your reply to ${langLabel}. Click to send in English instead.`
                                  : `Click to auto-translate your reply to ${langLabel}.`}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })()}
                    </div>
                    <Button
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-full",
                        inputMode === "private_note" && "bg-amber-600 hover:bg-amber-700"
                      )}
                      disabled={!hasSendableDraft}
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
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <MessageCircle className="h-10 w-10 opacity-30" />
            <p className="text-sm">Select a conversation to view</p>
          </div>
        )}
      </div>

      {/* Resident Profile Curtain Overlay */}
      {profileModalOpen && selected && (() => {
        const profileResidentName = profileResidentOverride ?? selected.resident;
        const closeProfileCurtain = () => {
              setProfileModalOpen(false);
              setProfilePanelInboxOpen(false);
          setProfileResidentOverride(null);
          setProfileMainTab("Financial");
        };
        /**
         * Opens the profile-curtain right-side panel in "new thread"
         * mode with the chosen channel pre-locked. Shared by:
         *   · The top-header quick-action row (Message row's SMS/Email
         *     buttons)
         *   · The right-rail pill buttons at the bottom of the profile
         *     inbox view (Email / SMS pills)
         * Keeps the curtain open so the profile info stays visible on
         * the left while staff compose on the right. Mirrors the
         * "New SMS · not yet saved" / "New Email · not yet saved"
         * surface staff see on the Communications tab.
         */
        const openNewThreadInPanel = (channel: "SMS" | "Email") => {
          const fromOpts = getPropertyFromChannelOptionsForProperty(
            selected.property
          );
          const channelFrom = fromOpts.find((o) => o.channel === channel);
          // Drop any main-pane composer state so the in-curtain panel
          // wins the render.
          setPendingSmsCompose(null);
          setPendingEmailCompose(null);
          setNewThreadOutbound({
            channel,
            ...(channelFrom?.from ? { from: channelFrom.from } : {}),
            propertyName: selected.property,
          });
          setNewThreadSubject("");
          setNewThreadSubjectError(false);
          setThreadDraft("");
          setOpenThreadIdx(-1);
          setThreadsPanelOpen(true);
          setProfilePanelInboxOpen(false);
        };
        return (
        <>
        {/* Entrata brand bar — separate top layer, above call panel */}
        <div className="fixed top-0 inset-x-0 z-[120] flex items-center justify-between bg-[#b71c1c] px-4 py-2.5">
              <span className="text-[16px] font-semibold italic text-white/90 tracking-wide">entrata</span>
              <div className="flex items-center gap-4">
                <button
                  type="button"
              onClick={closeProfileCurtain}
                  className="flex items-center gap-1.5 text-[14px] font-medium text-white/90 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>
            </div>
        <div className="fixed inset-0 z-[60] flex pt-[44px]">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={closeProfileCurtain}
          />
          <div className="relative z-10 flex flex-1 flex-col animate-in slide-in-from-top duration-300 bg-white">

            {/* Content row below brand bar */}
            <div className="flex flex-1 min-h-0">
            {/* LEFT: Entrata profile (header + tabs + ledger) */}
            <div className="flex flex-1 min-w-0 flex-col bg-white">
              {/* Profile header row */}
              <div className="flex items-center bg-white px-5 py-5 shrink-0 border-b border-gray-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2e7d32] text-sm font-bold text-white shrink-0">
                    {initials(profileResidentName)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[15px] font-bold text-gray-900">{profileResidentName}</span>
                    <p className="text-[12px] text-gray-500">{selected.property} | #32</p>
                  </div>
                </div>
                <span className="mx-4 text-gray-300">·</span>
                <div className="ml-auto flex items-center gap-1.5">
                  {[
                    {
                      label: "Message",
                      Icon: MessageCircle,
                      action: () => {
                        setThreadsPanelOpen((v) => {
                          const next = !v;
                          if (!next) setProfilePanelInboxOpen(false);
                          return next;
                        });
                      },
                    },
                    {
                      label: "SMS",
                      Icon: MessageSquare,
                      action: () => openNewThreadInPanel("SMS"),
                    },
                    {
                      label: "Email",
                      Icon: Mail,
                      action: () => openNewThreadInPanel("Email"),
                    },
                    { label: "Appointment", Icon: CalendarIcon },
                    { label: "Schedule Manual Contact", Icon: Phone },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      onClick={btn.action}
                      className="relative flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
                    >
                      <btn.Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" strokeWidth={1.5} />
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Profile tabs */}
              <div className="flex items-center gap-0 border-b border-gray-200 bg-[#f5f5f5] px-2 shrink-0">
                {["Financial", "Household", "Lease", "Utilities", "Documents", "Maintenance", "Activity Log"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setProfileMainTab(tab)}
                    className={`px-3 py-2 text-[11px] font-medium transition-colors rounded-t ${
                      profileMainTab === tab
                        ? "bg-white text-[#c0392b] border border-gray-200 border-b-white -mb-px relative z-10"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              {profileMainTab === "Activity Log" ? (
                <div className="flex flex-1 min-h-0 flex-col overflow-hidden bg-white">
                  <div className="border-b border-gray-200 px-5 py-3">
                    <p className="text-[13px] font-semibold text-gray-900">Activity Log</p>
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      Staff-documented calls and notes for {profileResidentName}
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto px-5 py-4">
                    {(residentProfileActivity[profileResidentName] ?? []).length === 0 ? (
                      <p className="text-[12px] text-gray-400 italic">No activity logged yet.</p>
                    ) : (
                      <ul className="space-y-3">
                        {(residentProfileActivity[profileResidentName] ?? []).map((entry) => (
                          <li
                            key={entry.id}
                            className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5"
                          >
                            <div className="flex items-center gap-2">
                              {entry.kind === "incoming" ? (
                                <PhoneIncoming className="h-3.5 w-3.5 text-gray-500" />
                              ) : entry.kind === "outgoing" ? (
                                <PhoneOutgoing className="h-3.5 w-3.5 text-gray-500" />
                              ) : (
                                <StickyNote className="h-3.5 w-3.5 text-amber-600" />
                              )}
                              <span className="text-[11px] font-semibold text-gray-800">
                                {entry.kind === "incoming"
                                  ? "Incoming call"
                                  : entry.kind === "outgoing"
                                    ? "Outgoing call"
                                    : "Private Note"}
                              </span>
                              <span className="ml-auto text-[10px] text-gray-400">{entry.timestamp}</span>
                            </div>
                            <p className="mt-1 text-[11px] text-gray-600">
                              <span className="font-medium text-gray-800">{entry.actor}</span>
                              {entry.phoneNumber ? (
                                <>
                                  {" · "}
                                  <span className="font-mono">{entry.phoneNumber}</span>
                                </>
                              ) : null}
                            </p>
                            <p className="mt-1.5 text-[12px] leading-relaxed text-gray-800">{entry.notes}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : (
              <>
              {/* Sub-tabs */}
              <div className="flex items-center gap-0 border-b border-gray-200 bg-white px-3 shrink-0">
                {["Ledger", "Recurring Charges and Credits", "One Time Charges and Credits", "Recurring Payments", "MoneyGram", "Customer Invoices", "Payment Methods"].map((tab, i) => (
                  <button
                    key={tab}
                    className={`px-2.5 py-2 text-[10px] font-medium transition-colors border-b-2 ${
                      i === 0
                        ? "text-[#333] border-[#c0392b]"
                        : "text-gray-400 border-transparent hover:text-gray-600"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              {/* Main ledger area */}
              <div className="flex flex-1 min-h-0">
                {/* Ledger sidebar */}
                <div className="w-[130px] shrink-0 border-r border-gray-200 bg-white p-3 space-y-3 text-[10px]">
                  <div><span className="text-gray-700 font-semibold">Resident:</span> <span className="text-gray-700">$3,482.35</span></div>
                  <div className="text-gray-400">Group: $0</div>
                  <div className="text-gray-400">Harris/Ledger: $0</div>
                  <div className="text-gray-400">HP/Ledger: $0</div>
                  <div className="text-gray-400">Subsidy ledger custom: $0</div>
                  <div className="text-gray-400">Deposits Held: $390</div>
                </div>
                {/* Ledger table area */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-2 shrink-0">
                    <button className="rounded border border-gray-300 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1"><span className="text-gray-400">▾</span> Add</button>
                    <button className="rounded border border-gray-300 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1"><span className="text-gray-400">▾</span> Filter</button>
                    <div className="flex-1" />
                    <button className="rounded border border-gray-300 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50">Generate Statement</button>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-1.5 border-b border-gray-100 shrink-0">
                    <button className="rounded bg-gray-200 px-2.5 py-0.5 text-[10px] font-medium text-gray-700">Open Items</button>
                    <button className="rounded px-2.5 py-0.5 text-[10px] font-medium text-gray-400 hover:bg-gray-100">Full Ledger</button>
                    <label className="flex items-center gap-1 text-[10px] text-gray-400 ml-3">Resident Friendly Mode: <input type="checkbox" className="h-3 w-3 accent-gray-500" /></label>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-[10px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b border-gray-200 bg-gray-50 text-left text-[9px] text-gray-500 uppercase tracking-wide">
                          <th className="px-2 py-1.5 font-medium w-6"><input type="checkbox" className="h-3 w-3" /></th>
                          <th className="px-2 py-1.5 font-medium">Post Date</th>
                          <th className="px-2 py-1.5 font-medium">Due Date</th>
                          <th className="px-2 py-1.5 font-medium">Post Mon</th>
                          <th className="px-2 py-1.5 font-medium">Created On</th>
                          <th className="px-2 py-1.5 font-medium">Trans ID</th>
                          <th className="px-2 py-1.5 font-medium">Invoice</th>
                          <th className="px-2 py-1.5 font-medium">Charge Code</th>
                          <th className="px-2 py-1.5 font-medium">Memo</th>
                          <th className="px-2 py-1.5 font-medium text-right">Charges</th>
                          <th className="px-2 py-1.5 font-medium text-right">Unapplied</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { postDate: "Jun 08, 2024", dueDate: "Jun 08, 2024", postMon: "06/2024", createdOn: "Jun 08, 2024 06:1", transId: "504369305", charge: "$5", unapplied: "$5", memo: "live testing", code: "live testing" },
                          { postDate: "Jun 07, 2024", dueDate: "Jun 07, 2024", postMon: "06/2024", createdOn: "Jun 07, 2024 06:0", transId: "604381115", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                          { postDate: "Jun 06, 2024", dueDate: "Jun 05, 2024", postMon: "06/2024", createdOn: "Jun 06, 2024 06:0", transId: "604184319", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                          { postDate: "Jun 05, 2024", dueDate: "Jun 05, 2024", postMon: "06/2024", createdOn: "Jun 05, 2024 06:0", transId: "503983188", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                          { postDate: "Jun 04, 2024", dueDate: "Jun 04, 2024", postMon: "06/2024", createdOn: "Jun 04, 2024 06:1", transId: "503980039", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                          { postDate: "Jun 03, 2024", dueDate: "Jun 03, 2024", postMon: "06/2024", createdOn: "Jun 03, 2024 06:2", transId: "503905723", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                          { postDate: "Jun 02, 2024", dueDate: "Jun 02, 2024", postMon: "06/2024", createdOn: "Jun 02, 2024 06:1", transId: "502313004", charge: "$20", unapplied: "$20", memo: "live testing", code: "live testing", highlight: true },
                          { postDate: "Jun 01, 2024", dueDate: "Jun 01, 2024", postMon: "06/2024", createdOn: "May 31, 2024 11:2", transId: "502049706", charge: "$120", unapplied: "$120", memo: "Monthly Credit", code: "Credit Fees", bold: true },
                          { postDate: "Jun 01, 2024", dueDate: "Jun 01, 2024", postMon: "06/2024", createdOn: "May 31, 2024 11:2", transId: "502049722", charge: "$500", unapplied: "$500", memo: "Monthly Admin", code: "Admin Fee", bold: true },
                          { postDate: "May 08, 2024", dueDate: "May 08, 2024", postMon: "05/2024", createdOn: "May 08, 2024 06:1", transId: "498473699", charge: "$5", unapplied: "$5", memo: "live testing", code: "live testing" },
                          { postDate: "May 07, 2024", dueDate: "May 07, 2024", postMon: "05/2024", createdOn: "May 07, 2024 06:1", transId: "498293910", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                          { postDate: "May 06, 2024", dueDate: "May 06, 2024", postMon: "05/2024", createdOn: "May 06, 2024 06:1", transId: "498108783", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                          { postDate: "May 05, 2024", dueDate: "May 05, 2024", postMon: "05/2024", createdOn: "May 05, 2024 06:1", transId: "498010055", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                          { postDate: "May 04, 2024", dueDate: "May 04, 2024", postMon: "05/2024", createdOn: "May 04, 2024 06:1", transId: "497940941", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                          { postDate: "May 03, 2024", dueDate: "May 03, 2024", postMon: "05/2024", createdOn: "May 03, 2024 06:1", transId: "497697662", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                          { postDate: "May 02, 2024", dueDate: "May 02, 2024", postMon: "05/2024", createdOn: "May 02, 2024 06:1", transId: "497477395", charge: "$20", unapplied: "$20", memo: "live testing", code: "live testing" },
                          { postDate: "May 01, 2024", dueDate: "May 01, 2024", postMon: "05/2024", createdOn: "Apr 30, 2024 11:3", transId: "497101603", charge: "$120", unapplied: "$120", memo: "Monthly Credit", code: "Credit Fees", bold: true },
                          { postDate: "May 01, 2024", dueDate: "May 01, 2024", postMon: "05/2024", createdOn: "Apr 30, 2024 11:3", transId: "497101655", charge: "$500", unapplied: "$500", memo: "Monthly Admin", code: "Admin Fee", bold: true },
                          { postDate: "Apr 25, 2024", dueDate: "Apr 25, 2024", postMon: "04/2024", createdOn: "Apr 25, 2024 06:1", transId: "496188940", charge: "$5", unapplied: "$5", memo: "live testing", code: "live testing" },
                        ].map((row, i) => (
                          <tr key={i} className={`border-b border-gray-100 ${(row as { highlight?: boolean }).highlight ? "bg-yellow-50" : ""}`}>
                            <td className="px-2 py-1.5"><input type="checkbox" className="h-3 w-3" /></td>
                            <td className="px-2 py-1.5 text-gray-700 whitespace-nowrap">{row.postDate}</td>
                            <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{row.dueDate}</td>
                            <td className="px-2 py-1.5 text-gray-500">{row.postMon}</td>
                            <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{row.createdOn}</td>
                            <td className="px-2 py-1.5 text-gray-500">{row.transId}</td>
                            <td className="px-2 py-1.5 text-blue-600 cursor-pointer hover:underline">Generate</td>
                            <td className="px-2 py-1.5 text-gray-700">{row.code}</td>
                            <td className={`px-2 py-1.5 ${(row as { bold?: boolean }).bold ? "text-blue-600 font-semibold cursor-pointer hover:underline" : "text-blue-600 cursor-pointer hover:underline"}`}>{row.memo}</td>
                            <td className="px-2 py-1.5 text-right text-gray-700">{row.charge}</td>
                            <td className="px-2 py-1.5 text-right text-gray-700">{row.unapplied}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              </>
              )}
            </div>

            {/* MIDDLE: Quick View sidebar — full height from top to bottom */}
            <div className="w-[190px] shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
              <div className="border-b border-gray-200 px-3 py-2.5">
                <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2.5 text-center">
                  <p className="text-[9px] font-medium text-gray-500 leading-tight">Lease Status: Current -</p>
                  <p className="text-[9px] text-gray-500 leading-tight">Month To Month</p>
                  <p className="mt-1.5 text-[10px] font-medium text-gray-700">Balance: <span className="text-[#c0392b] font-semibold">$3,482.35</span></p>
                </div>
                <button className="mt-2 w-full text-center text-[10px] text-blue-600 hover:underline">More Actions</button>
              </div>
              <div className="border-b border-gray-200 px-3 py-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-gray-700">Quick View</span>
                  <button className="text-[10px] text-blue-600 hover:underline">Edit</button>
                </div>
                <div className="space-y-1.5 text-[9px] leading-tight">
                  <div><span className="text-gray-400 font-medium">Primary Ph:</span><br /><span className="text-gray-700">+1 554-444-1111 · Mobile</span></div>
                  <div><span className="text-gray-400 font-medium">Email:</span><br /><span className="text-gray-700">rgadkar345@entrat...</span></div>
                  <div className="pt-1.5 border-t border-gray-100">
                    <span className="text-gray-400 font-medium">Transferred</span><br />
                    <span className="text-gray-400 font-medium">From:</span> <span className="text-blue-600 cursor-pointer hover:underline">629</span>
                  </div>
                  <div><span className="text-gray-400 font-medium">Move-in Date:</span> <span className="text-gray-700">Aug 19, 2014</span> <span className="text-gray-300 ml-0.5">📅</span></div>
                  <div><span className="text-gray-400 font-medium">Lease Start:</span> <span className="text-gray-700">Dec 06, 2023</span></div>
                  <div><span className="text-gray-400 font-medium">Lease End:</span> <span className="text-gray-700">Mar 05, 2024</span></div>
                  <div className="pt-1.5 border-t border-gray-100">
                    <span className="text-gray-400 font-medium">Late Payments:</span> <span className="text-blue-600 cursor-pointer hover:underline">9</span>
                  </div>
                  <div><span className="text-gray-400 font-medium">Returned</span><br /><span className="text-gray-400 font-medium">Payments:</span> <span className="text-blue-600 cursor-pointer hover:underline">0</span></div>
                  <div><span className="text-gray-400 font-medium">MTM Start:</span> <span className="text-gray-700">Mar 06, 2024</span></div>
                </div>
                <button className="mt-2 text-[10px] text-blue-600 hover:underline">Resident Login</button>
              </div>
              <div className="border-b border-gray-200 px-3 py-2.5">
                <p className="text-[10px] font-semibold text-gray-700 mb-1.5">Add Activity</p>
                <div className="flex items-center gap-1">
                  <button className="rounded border border-gray-200 p-1 text-gray-400 hover:bg-gray-50">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                  </button>
                  <input className="flex-1 rounded border border-gray-200 px-2 py-1 text-[10px] text-gray-500 placeholder:text-gray-300" placeholder="Add Note" />
                </div>
              </div>
              <div className="px-3 py-2.5">
                <p className="text-[10px] font-semibold text-gray-700 mb-2">Open Work Orders</p>
                <button className="mb-2.5 flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50">
                  <span className="text-green-600">⊕</span> Create Work Order
                </button>
                <div className="space-y-0 text-[9px]">
                  <div className="flex items-center justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-400 font-medium">Location</span>
                    <span className="text-gray-400 font-medium">Submitted</span>
                  </div>
                  {[
                    { loc: "Unit Wide fvf", date: "Mar 28, 2018" },
                    { loc: "Unit Wide fvf", date: "Mar 28, 2018" },
                    { loc: "00fresh kooldid", date: "Mar 21, 2018" },
                    { loc: "Unit Wide fvf", date: "Mar 21, 2018" },
                    { loc: "Unit Wide fvf", date: "Mar 14, 2018" },
                  ].map((wo, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-gray-50">
                      <span className="text-gray-600">{wo.loc}</span>
                      <span className="text-gray-400">{wo.date}</span>
                    </div>
                  ))}
                </div>
                <button className="mt-2.5 w-full text-center text-[10px] font-medium text-blue-600 hover:underline tracking-wide">VIEW ALL WORK ORDERS</button>
              </div>
            </div>

            </div>
          </div>

          {/* RIGHT: Conversation Threads panel — slides in from right */}
          {threadsPanelOpen && <div className="relative z-10 w-[320px] shrink-0 border-l border-gray-200 flex flex-col bg-white animate-in slide-in-from-right duration-200">

            {openThreadIdx !== null ? (
              /* ===== CONVERSATION THREAD VIEW ===== */
              <>
                {/* Thread header */}
                <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenThreadIdx(null);
                      setNewThreadOutbound(null);
                      setNewThreadSubject("");
                      setNewThreadSubjectError(false);
                    }}
                    className="text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors hover:ring-2 hover:ring-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400",
                          getThreadAssignee(openThreadIdx)
                            ? avatarColor(getThreadAssignee(openThreadIdx)!)
                            : "bg-[#2e7d32] text-white"
                        )}
                        title={
                          getThreadAssignee(openThreadIdx)
                            ? `Assigned to ${getThreadAssignee(openThreadIdx)}. Click to change.`
                            : "Assign an agent to this thread"
                        }
                        aria-label="Assign agent to this thread"
                      >
                        {getThreadAssignee(openThreadIdx)
                          ? initials(getThreadAssignee(openThreadIdx)!)
                          : initials(selected.resident)}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="z-[70] w-[280px] p-0"
                      align="start"
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      <ThreadAssignPicker
                        agents={THREAD_AGENTS}
                        currentAssignee={getThreadAssignee(openThreadIdx)}
                        onAssign={(name) => assignThread(openThreadIdx, name)}
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900">{selected.resident}</p>
                    <p className="text-[11px] text-gray-500">
                      {openThreadIdx === -1
                        ? newThreadOutbound
                          ? `New thread · ${newThreadOutbound.channel} · ${newThreadOutbound.propertyName}`
                          : "New thread"
                        : `${profilePanelThreads[openThreadIdx]?.property}: ${profilePanelThreads[openThreadIdx]?.type}`}
                    </p>
                  </div>
                  {phoneDemoEnabled && (
                    <button
                      type="button"
                      title="Call primary number"
                      onClick={() => beginClickToCallForConversation(selected)}
                      className="flex h-8 shrink-0 items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Phone className="h-3.5 w-3.5 text-gray-500" />
                      Call
                    </button>
                  )}
                  <ProfilePanelConversationActionsMenu
                    selected={selected}
                    allLabels={allLabels}
                    newLabelText={newLabelText}
                    setNewLabelText={setNewLabelText}
                    resolveConversation={resolveConversation}
                    reopenConversation={reopenConversation}
                    addLabel={addLabel}
                    removeLabel={removeLabel}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setOpenThreadIdx(null);
                      setNewThreadOutbound(null);
                      setNewThreadSubject("");
                      setNewThreadSubjectError(false);
                      setThreadsPanelOpen(false);
                      setProfilePanelInboxOpen(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Messages area — same style as inbox conversation panel */}
                <div className="flex-1 overflow-y-auto bg-muted/30 px-4 py-4">
                  <div className="space-y-4">
                    {openThreadIdx >= 0 && profilePanelThreads[openThreadIdx]?.channel === "Email" && (
                      <>
                        {(profilePanelThreads[openThreadIdx]?.emailSubject ?? profilePanelThreads[openThreadIdx]?.bulkOutboundEmail?.subject) && (
                          <div className="rounded-md border border-border bg-card px-3 py-2 shadow-sm">
                            <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Subject</p>
                            <p className="text-[11px] font-semibold text-foreground leading-snug line-clamp-2">
                              {profilePanelThreads[openThreadIdx]?.emailSubject ??
                                profilePanelThreads[openThreadIdx]?.bulkOutboundEmail?.subject}
                            </p>
                          </div>
                        )}
                        {profilePanelThreads[openThreadIdx]?.bulkOutboundEmail && (
                          <ConversationBulkEmailCard
                            dense
                            bulk={profilePanelThreads[openThreadIdx].bulkOutboundEmail!}
                            onClick={() =>
                              setBulkEmailModal(profilePanelThreads[openThreadIdx].bulkOutboundEmail!)
                            }
                          />
                        )}
                      </>
                    )}
                    {openThreadIdx === -1 &&
                    (entSideSentByThreadKey["-1"] ?? []).length === 0 ? (
                      <div className="mx-2 my-2 flex items-start gap-2 rounded-md bg-status-warning px-3 py-2.5 text-[12px] leading-relaxed text-status-warning-foreground">
                        <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                        <p>
                          {newThreadOutbound?.from ? (
                            <>
                              <span className="font-semibold">
                                New {newThreadOutbound.channel} · not yet saved.
                              </span>{" "}
                              This {newThreadOutbound.channel === "SMS" ? "SMS" : "email"} will send from{" "}
                              <span className="font-medium">
                                {newThreadOutbound.from}
                              </span>
                              . Compose below to start the thread.
                            </>
                          ) : newThreadOutbound ? (
                            <>
                              <span className="font-semibold">
                                New {newThreadOutbound.channel} · not yet saved.
                              </span>{" "}
                              Compose below to start the thread.
                            </>
                          ) : (
                            <>
                              <span className="font-semibold">
                                New thread · not yet saved.
                              </span>{" "}
                              Choose a channel in New Thread to set the From line.
                            </>
                          )}
                        </p>
                      </div>
                    ) : null}
                    {[
                      ...(openThreadIdx >= 0 ? profilePanelThreads[openThreadIdx]?.messages ?? [] : []),
                      ...(entSideSentByThreadKey[String(openThreadIdx)] ?? []),
                    ].map((msg, idx) => {
                      if (
                        "privateNote" in msg &&
                        msg.privateNote &&
                        msg.role === "staff"
                      ) {
                        return (
                          <div key={`ent-pn-${openThreadIdx}-${idx}`} className="space-y-1">
                            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback
                                  className={cn("text-[9px] font-semibold", avatarColor(MY_INBOX_ASSIGNEE))}
                                >
                                  {initials(MY_INBOX_ASSIGNEE)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-[10px] font-semibold text-amber-700">
                                Private Note · {MY_INBOX_ASSIGNEE}
                              </span>
                              {msg.timestamp && (
                                <span className="text-[9px] text-muted-foreground">{msg.timestamp}</span>
                              )}
                            </div>
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                              {msg.text}
                            </div>
                          </div>
                        );
                      }
                      const isAgent = msg.role === "agent";
                      const isStaff = msg.role === "staff";
                      const threadData =
                        openThreadIdx >= 0 ? profilePanelThreads[openThreadIdx] : undefined;
                      const assigneeName =
                        getThreadAssignee(openThreadIdx) ??
                        threadData?.assignee ??
                        MY_INBOX_ASSIGNEE;
                      const emailSig =
                        isStaff && "emailSignature" in msg
                          ? (msg as { emailSignature?: string }).emailSignature?.trim()
                          : undefined;

                      return (
                        <div key={`ent-${openThreadIdx}-${idx}`} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <ThreadMessageAvatar
                              variant="threadBubble"
                              isAgent={isAgent}
                              isStaff={isStaff}
                              selected={selected}
                              isHumanAssignee={isHumanAssignee}
                              staffInitialsOverride={isStaff ? initials(assigneeName) : undefined}
                            />
                            <div className="flex flex-col">
                              <span className="text-[11px] font-semibold text-foreground">
                                {isAgent
                                  ? `ELI+ ${threadData?.type ?? ""} AI`
                                  : isStaff
                                    ? assigneeName
                                    : selected.resident}
                              </span>
                              {msg.timestamp && (
                                <span className="text-[9px] text-muted-foreground">{msg.timestamp}</span>
                              )}
                            </div>
                          </div>
                          <div
                            className={cn(
                              "max-w-[85%] rounded-2xl px-3.5 py-2 text-[12px] leading-relaxed",
                              (isAgent || isStaff) && "bg-blue-500 text-white",
                              !isAgent && !isStaff &&
                                "border border-border bg-card text-card-foreground shadow-sm"
                            )}
                          >
                            <TranslatableMessageBody
                              msg={msg}
                              translationEnabled={translationEnabled}
                              showEnglish={isViewingInEnglish}
                              chipVariant={isAgent || isStaff ? "onDark" : "muted"}
                            />
                            {emailSig ? (
                              <div className="mt-2 border-t border-white/25 pt-2">
                                <div className="flex gap-2">
                                  <Avatar className="mt-0.5 h-7 w-7 shrink-0 border border-white/50 bg-white">
                                    <AvatarFallback
                                      className={cn(
                                        "text-[8px]",
                                        isHumanAssignee(selected.assignee)
                                          ? avatarColor(selected.assignee)
                                          : selected.assignee === CONVERSATION_UNASSIGNED_ASSIGNEE
                                            ? "bg-white/90 text-slate-600"
                                            : "bg-muted text-muted-foreground"
                                      )}
                                    >
                                      {isHumanAssignee(selected.assignee)
                                        ? initials(selected.assignee)
                                        : selected.assignee === CONVERSATION_UNASSIGNED_ASSIGNEE
                                          ? "—"
                                          : "ST"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <p className="min-w-0 whitespace-pre-line text-[10px] leading-relaxed text-blue-50">
                                    {emailSig}
                                  </p>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                    {selected.messages.some(
                      (m) => m.type === "thread_activity" || m.type === "label_activity"
                    ) ? (
                      <div className="space-y-2 border-t border-border/60 pt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 px-0.5">
                          Conversation activity
                        </p>
                        {selected.messages
                          .map((m, actIdx) => ({ m, actIdx }))
                          .filter(
                            ({ m }) =>
                              m.type === "thread_activity" || m.type === "label_activity"
                          )
                          .slice(-12)
                          .map(({ m, actIdx }) => {
                            if (m.type === "thread_activity" && m.threadActivity) {
                              return (
                                <ConversationThreadActivityRow
                                  key={`ent-act-${actIdx}-${m.timestamp ?? actIdx}`}
                                  message={m}
                                />
                              );
                            }
                            if (m.type === "label_activity" && m.labelActivity) {
                              const { actor, labelsAdded } = m.labelActivity;
                              const isEscalation = labelsAdded.some((l) => l.includes("Escalation"));
                              return (
                                <div
                                  key={`ent-act-la-${actIdx}`}
                                  className={cn(
                                    "flex items-center justify-center gap-2 rounded-md border py-2 px-2",
                                    isEscalation
                                      ? "border-orange-200 bg-orange-50/80 dark:border-orange-900/50 dark:bg-orange-950/20"
                                      : "border-dashed border-border/70 bg-muted/25"
                                  )}
                                >
                                  {isEscalation ? (
                                    <AlertTriangle className="h-3 w-3 shrink-0 text-orange-500" aria-hidden />
                                  ) : (
                                    <Tag className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                                  )}
                                  <p className={cn(
                                    "text-center text-[10px] leading-relaxed",
                                    isEscalation ? "text-orange-800 dark:text-orange-200" : "text-muted-foreground"
                                  )}>
                                    <span className={cn("font-medium", isEscalation ? "text-orange-900 dark:text-orange-100" : "text-foreground")}>{actor}</span>
                                    {" added "}
                                    <span className={cn("font-medium", isEscalation ? "text-orange-900 dark:text-orange-100" : "text-foreground")}>
                                      {labelsAdded.join(", ")}
                                    </span>
                                    {m.timestamp && (
                                      <>
                                        <span className={cn(isEscalation ? "opacity-60" : "text-muted-foreground/70")}> · </span>
                                        <span>{m.timestamp}</span>
                                      </>
                                    )}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          })}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Chat input — same style as inbox */}
                <div className="shrink-0 bg-muted/50">
                  <div className="flex items-center gap-1 px-4 pt-2 pb-1">
                    <Button
                      variant={threadInputMode === "message" ? "default" : "ghost"}
                      size="sm"
                      className="gap-1.5 rounded-full text-[11px] h-7"
                      onClick={() => setThreadInputMode("message")}
                    >
                      <MessageSquare className="h-3 w-3" />
                      Message
                    </Button>
                    <Button
                      variant={threadInputMode === "private_note" ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "gap-1.5 rounded-full text-[11px] h-7",
                        threadInputMode === "private_note" &&
                          "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
                      )}
                      onClick={() => setThreadInputMode("private_note")}
                    >
                      <StickyNote className="h-3 w-3" />
                      Private Note
                    </Button>
                  </div>
                  <div className="px-4 pb-3">
                    <div
                      className={cn(
                        "flex flex-col rounded-xl border transition-colors focus-within:ring-1 focus-within:ring-ring",
                        threadInputMode === "private_note"
                          ? "border-amber-200 bg-amber-50"
                          : "border-input bg-background"
                      )}
                    >
                      {/* Subject line — only for a brand-new Email
                          thread in message mode. Sits INSIDE the
                          rounded-xl composer shell above the body
                          textarea, mirroring the Communications-tab
                          inline Email composer's layout (see
                          `entrata-inline-email-composer.tsx`). */}
                      {openThreadIdx === -1 &&
                        newThreadOutbound?.channel === "Email" &&
                        threadInputMode === "message" && (
                        <input
                          type="text"
                          value={newThreadSubject}
                          onChange={(e) => {
                            setNewThreadSubject(e.target.value);
                            if (
                              newThreadSubjectError &&
                              e.target.value.trim()
                            )
                              setNewThreadSubjectError(false);
                          }}
                          placeholder="Subject"
                          aria-label="Subject"
                          className={cn(
                            "w-full bg-transparent px-3 pt-2.5 pb-2 text-[12px] font-medium placeholder:text-muted-foreground focus-visible:outline-none border-b",
                            newThreadSubjectError
                              ? "border-red-300"
                              : "border-border/60"
                          )}
                        />
                      )}
                      <textarea
                        value={threadDraft}
                        onChange={(e) => setThreadDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleProfileEntThreadSend();
                          }
                        }}
                        placeholder={threadInputMode === "private_note" ? "Write a private note…" : "Write a message…"}
                        rows={2}
                        className="w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-[12px] placeholder:text-muted-foreground focus-visible:outline-none"
                      />
                      <div className="flex items-center justify-between px-2 pb-1.5">
                        <Button variant="ghost" size="sm" className="gap-1 text-[10px] text-muted-foreground h-7">
                          <Paperclip className="h-3 w-3" />
                          Attach
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          className={cn(
                            "h-7 w-7 rounded-full",
                            threadInputMode === "private_note" && "bg-amber-600 hover:bg-amber-700"
                          )}
                          disabled={!threadDraft.trim()}
                          onClick={handleProfileEntThreadSend}
                          aria-label="Send"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : profilePanelInboxOpen ? (
              /* ===== CURRENT INBOX CONVERSATION (same thread as main panel) ===== */
              <>
                <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setProfilePanelInboxOpen(false)}
                    className="text-gray-500 hover:text-gray-800 transition-colors"
                    aria-label="Back to threads list"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="shrink-0 rounded-full transition-colors hover:ring-2 hover:ring-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400"
                        aria-label="Change assignee"
                        title="Change assignee"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback
                            className={cn(
                              "text-[11px] font-bold",
                              isHumanAssignee(selected.assignee)
                                ? avatarColor(selected.assignee)
                                : selected.assignee === CONVERSATION_UNASSIGNED_ASSIGNEE
                                  ? "border border-dashed border-gray-300 bg-gray-50 text-gray-500"
                                  : "bg-[#2e7d32] text-white"
                            )}
                          >
                            {isHumanAssignee(selected.assignee)
                              ? initials(selected.assignee)
                              : selected.assignee === CONVERSATION_UNASSIGNED_ASSIGNEE
                                ? "—"
                                : "AI"}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="z-[70] w-64 p-0" align="start">
                      <AssigneePicker
                        groupedAssignees={groupedAssignees}
                        currentAssignee={selected.assignee}
                        onSelect={(value) => updateAssignee(selected.id, value, MY_INBOX_ASSIGNEE)}
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900">{selected.resident}</p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {selected.property}
                      {selected.channel === "Email" && (
                        <>
                          <span className="text-gray-300"> · </span>
                          Email
                        </>
                      )}
                      {selected.channel === "SMS" && (
                        <>
                          <span className="text-gray-300"> · </span>
                          SMS
                        </>
                      )}
                    </p>
                  </div>
                  {phoneDemoEnabled && (
                    <button
                      type="button"
                      title="Call primary number"
                      onClick={() => beginClickToCallForConversation(selected)}
                      className="flex h-8 shrink-0 items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Phone className="h-3.5 w-3.5 text-gray-500" />
                      Call
                    </button>
                  )}
                  <ProfilePanelConversationActionsMenu
                    selected={selected}
                    allLabels={allLabels}
                    newLabelText={newLabelText}
                    setNewLabelText={setNewLabelText}
                    resolveConversation={resolveConversation}
                    reopenConversation={reopenConversation}
                    addLabel={addLabel}
                    removeLabel={removeLabel}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setProfilePanelInboxOpen(false);
                      setThreadsPanelOpen(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close conversation panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-muted/30 px-4 py-4">
                  {selected.channel === "Email" && (
                    <div className="mb-3 rounded-md border border-border bg-card px-3 py-2 shadow-sm">
                      <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Subject</p>
                      <p className="text-[11px] font-semibold text-foreground leading-snug line-clamp-2">
                        {selected.emailSubject ?? selected.preview}
                      </p>
                    </div>
                  )}
                  <div className="space-y-4">
                    {selected.bulkOutboundEmail && (
                      <ConversationBulkEmailCard
                        dense
                        bulk={selected.bulkOutboundEmail}
                        onClick={() => setBulkEmailModal(selected.bulkOutboundEmail!)}
                      />
                    )}
                    {selected.messages.map((msg, idx) => {
                      if (msg.type === "handoff") {
                        return (
                          <div key={idx} className="flex items-center justify-center gap-2 py-1">
                            <CornerDownRight className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">
                              Handoff {handoffAssigneeLabelForConversation(
                                selected.assignee,
                                isHumanAssignee,
                                selected.staffRespondentIsExternalAgent
                              )} · {msg.timestamp}
                            </span>
                          </div>
                        );
                      }
                      if (msg.type === "thread_activity" && msg.threadActivity) {
                        return <ConversationThreadActivityRow key={idx} message={msg} />;
                      }
                      if (msg.type === "missed_call" && msg.missedCall) {
                        return (
                          <MissedCallBubble
                            key={idx}
                            fromNumber={msg.missedCall.fromNumber}
                            attemptCount={msg.missedCall.attemptCount}
                            rangForSec={msg.missedCall.rangForSec}
                          />
                        );
                      }
                      if (msg.type === "voicemail" && msg.voicemail) {
                        return (
                          <VoicemailPlayer
                            key={idx}
                            durationSec={msg.voicemail.durationSec}
                            transcript={msg.voicemail.transcript}
                            turns={msg.voicemail.turns}
                            fromNumber={msg.voicemail.fromNumber}
                          />
                        );
                      }
                      if (msg.type === "label_activity" && msg.labelActivity) {
                        const { actor, labelsAdded } = msg.labelActivity;
                        const isEscalation = labelsAdded.some((l) => l.includes("Escalation"));
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "flex items-center justify-center gap-2 rounded-md border py-2 px-2",
                              isEscalation
                                ? "border-orange-200 bg-orange-50/80 dark:border-orange-900/50 dark:bg-orange-950/20"
                                : "border-dashed border-border/70 bg-muted/25"
                            )}
                          >
                            {isEscalation ? (
                              <AlertTriangle className="h-3 w-3 shrink-0 text-orange-500" aria-hidden />
                            ) : (
                              <Tag className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                            )}
                            <p className={cn(
                              "text-center text-[10px] leading-relaxed",
                              isEscalation ? "text-orange-800 dark:text-orange-200" : "text-muted-foreground"
                            )}>
                              <span className={cn("font-medium", isEscalation ? "text-orange-900 dark:text-orange-100" : "text-foreground")}>{actor}</span>
                              {" added "}
                              <span className={cn("font-medium", isEscalation ? "text-orange-900 dark:text-orange-100" : "text-foreground")}>{labelsAdded.join(", ")}</span>
                              {msg.timestamp && (
                                <>
                                  <span className={cn(isEscalation ? "opacity-60" : "text-muted-foreground/70")}> · </span>
                                  <span>{msg.timestamp}</span>
                                </>
                              )}
                            </p>
                          </div>
                        );
                      }
                      if (msg.type === "private_note") {
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback
                                  className={cn(
                                    "text-[9px] font-semibold",
                                    msg.privateNoteAuthor
                                      ? avatarColor(msg.privateNoteAuthor)
                                      : "bg-amber-100 text-amber-700"
                                  )}
                                >
                                  {msg.privateNoteAuthor ? initials(msg.privateNoteAuthor) : <StickyNote className="h-3.5 w-3.5" />}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-[10px] font-semibold text-amber-700">
                                Private Note
                                {msg.privateNoteAuthor ? (
                                  <>
                                    <span className="font-normal text-muted-foreground"> · </span>
                                    {msg.privateNoteAuthor}
                                  </>
                                ) : null}
                              </span>
                              {msg.timestamp && <span className="text-[9px] text-muted-foreground">{msg.timestamp}</span>}
                            </div>
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                              {msg.text}
                            </div>
                          </div>
                        );
                      }
                      const isAgent = msg.role === "agent";
                      const isStaff = msg.role === "staff";
                      return (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <ThreadMessageAvatar
                              variant="threadBubble"
                              isAgent={isAgent}
                              isStaff={isStaff}
                              selected={selected}
                              isHumanAssignee={isHumanAssignee}
                            />
                            <div className="flex flex-col">
                              <span className="text-[11px] font-semibold text-foreground">
                                {isAgent
                                  ? resolveAgentLabel(selected.agent)
                                  : isStaff
                                    ? handoffAssigneeLabelForConversation(
                                        selected.assignee,
                                        isHumanAssignee,
                                        selected.staffRespondentIsExternalAgent
                                      )
                                    : selected.resident}
                              </span>
                              {msg.timestamp && <span className="text-[9px] text-muted-foreground">{msg.timestamp}</span>}
                            </div>
                          </div>
                          <div
                            className={cn(
                              "max-w-[85%] rounded-2xl px-3.5 py-2 text-[12px] leading-relaxed",
                              (isAgent || isStaff) && "bg-blue-500 text-white",
                              !isAgent && !isStaff && "border border-border bg-card text-card-foreground shadow-sm"
                            )}
                          >
                            <TranslatableMessageBody
                              msg={msg}
                              translationEnabled={translationEnabled}
                              showEnglish={isViewingInEnglish}
                              chipVariant={isAgent || isStaff ? "onDark" : "muted"}
                            />
                          </div>
                          {msg.emailAttachments && msg.emailAttachments.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {msg.emailAttachments.map((att, ai) => (
                                <button
                                  key={`${att.name}-${ai}`}
                                  type="button"
                                  onClick={() => setEmailAttachmentPreview(att)}
                                  className="truncate max-w-full rounded border border-border bg-card px-2 py-1 text-left text-[10px] font-medium text-foreground hover:bg-muted/50"
                                >
                                  {att.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="shrink-0 bg-muted/50 border-t border-gray-200">
                  <div className="flex items-center gap-1 px-4 pt-2 pb-1">
                    <Button
                      variant={inputMode === "message" ? "default" : "ghost"}
                      size="sm"
                      className="gap-1.5 rounded-full text-[11px] h-7"
                      onClick={() => {
                        setInputMode("message");
                        setPrivateNoteMention(null);
                      }}
                    >
                      <MessageSquare className="h-3 w-3" />
                      Message
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 rounded-full text-[11px] h-7"
                      onClick={openPrivateNoteModal}
                    >
                      <StickyNote className="h-3 w-3" />
                      Private Note
                    </Button>
                  </div>
                  <div className="px-4 pb-3">
                    <div
                      className={cn(
                        "relative flex flex-col rounded-xl border transition-colors focus-within:ring-1 focus-within:ring-ring",
                        inputMode === "private_note"
                          ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
                          : "border-input bg-background"
                      )}
                    >
                      {inputMode === "private_note" &&
                        privateNoteMention &&
                        (privateNoteMentionFiltered.length > 0 ? (
                          <div
                            className="absolute bottom-full left-0 right-0 z-[70] mb-1 overflow-hidden rounded-md border border-border bg-popover shadow-md"
                            role="listbox"
                            aria-label="Mention a teammate"
                          >
                            <ul className="max-h-40 overflow-y-auto py-1">
                              {privateNoteMentionFiltered.map((c, idx) => (
                                <li
                                  key={c.handle}
                                  role="option"
                                  aria-selected={idx === privateNoteMentionIndex}
                                >
                                  <button
                                    type="button"
                                    className={cn(
                                      "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent",
                                      idx === privateNoteMentionIndex && "bg-accent"
                                    )}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onMouseEnter={() => setPrivateNoteMentionIndex(idx)}
                                    onClick={() =>
                                      applyPrivateNoteMention(c, profilePanelInboxComposerRef.current)
                                    }
                                  >
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback
                                        className={cn("text-[9px]", avatarColor(c.name))}
                                      >
                                        {initials(c.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate font-medium text-foreground">{c.name}</p>
                                      <p className="truncate text-[10px] text-muted-foreground">
                                        @{c.handle} · {c.role}
                                      </p>
                                    </div>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : privateNoteMention.query.length > 0 ? (
                          <div className="absolute bottom-full left-0 right-0 z-[70] mb-1 rounded-md border border-border bg-popover px-2.5 py-1.5 text-[11px] text-muted-foreground shadow-md">
                            No matching staff
                          </div>
                        ) : null)}
                      <textarea
                        ref={profilePanelInboxComposerRef}
                        value={draft}
                        onChange={handleComposerDraftChange}
                        onSelect={(e) => {
                          if (inputMode === "private_note") {
                            syncPrivateNoteMentionFromTextarea(e.currentTarget);
                          }
                        }}
                        onKeyUp={(e) => {
                          if (inputMode === "private_note") {
                            syncPrivateNoteMentionFromTextarea(e.currentTarget);
                          }
                        }}
                        onKeyDown={handleComposerKeyDown}
                        placeholder={
                          inputMode === "private_note"
                            ? "Write a private note…"
                            : "Write a message…"
                        }
                        rows={2}
                        className="w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-[12px] placeholder:text-muted-foreground focus-visible:outline-none"
                        aria-label={inputMode === "private_note" ? "Private note" : "Message"}
                        aria-autocomplete={inputMode === "private_note" ? "list" : undefined}
                        aria-haspopup={inputMode === "private_note" ? "listbox" : undefined}
                        aria-expanded={
                          inputMode === "private_note" && !!privateNoteMention
                            ? privateNoteMentionFiltered.length > 0 ||
                              privateNoteMention.query.length > 0
                            : undefined
                        }
                      />
                      <div className="flex items-center justify-between px-2 pb-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-[10px] text-muted-foreground h-7"
                        >
                          <Paperclip className="h-3 w-3" />
                          Attach
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          className={cn(
                            "h-7 w-7 rounded-full",
                            inputMode === "private_note" && "bg-amber-600 hover:bg-amber-700"
                          )}
                          disabled={!hasSendableDraft}
                          onClick={handleSend}
                          aria-label="Send"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* ===== THREADS LIST VIEW ===== */
              <>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 shrink-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-[11px] font-bold text-gray-600">
                      {initials(selected.resident)}
                    </div>
                    <span className="truncate text-sm font-semibold text-gray-900">
                      {selected.resident}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {phoneDemoEnabled && (
                      <button
                        type="button"
                        title="Call primary number"
                        onClick={() => beginClickToCallForConversation(selected)}
                        className="flex h-8 items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Phone className="h-3.5 w-3.5 text-gray-500" />
                        Call
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setThreadsPanelOpen(false);
                        setProfilePanelInboxOpen(false);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                      aria-label="Close profile panel"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Threads */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Threads</h3>
                  {/* Active / Closed toggle */}
                  <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                    {(["active", "closed"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setThreadsFilter(tab)}
                        className={`rounded-md px-4 py-1.5 text-[12px] font-medium transition-colors ${
                          threadsFilter === tab
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {tab === "active" ? "Active" : "Closed"}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-5">
                    {profilePanelThreads
                        .map((thread, originalIdx) => ({ thread, originalIdx }))
                        .filter(({ thread }) => thread.status === threadsFilter)
                        .sort((a, b) => {
                          const aTs = getThreadCloseTimestamp(a.thread);
                          const bTs = getThreadCloseTimestamp(b.thread);
                          return bTs - aTs;
                        })
                        .map(({ thread, originalIdx }, i) => {
                          const globalIdx = originalIdx;
                          const assignee = getThreadAssignee(globalIdx);
                          const dateLabel = formatThreadCloseDate(thread);
                          const isClosed = thread.status === "closed";
                          return (
                            <div
                              key={i}
                              className="flex items-start gap-3 cursor-pointer rounded-lg p-1.5 -mx-1.5 transition-colors hover:bg-gray-50"
                              onClick={() => {
                                setProfilePanelInboxOpen(false);
                                setNewThreadOutbound(null);
                                setNewThreadSubject("");
                                setNewThreadSubjectError(false);
                                setOpenThreadIdx(globalIdx);
                              }}
                            >
                              <div className="mt-0.5 flex items-center">
                                <span className={`inline-block h-2 w-2 rounded-full ${thread.status === "active" ? "bg-blue-500" : "bg-transparent"}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-gray-900">{thread.property}: {thread.type}</p>
                                {assignee && (
                                  <p className="text-[11px] text-gray-500 mt-0.5">
                                    {isClosed ? `Closed by ${assignee}` : assignee}
                                  </p>
                                )}
                                {dateLabel && (
                                  <p className="text-[11px] text-gray-500 mt-0.5">
                                    {isClosed ? `Closed on ${dateLabel}` : `Last message ${dateLabel}`}
                                  </p>
                                )}
                                <div className="mt-1 flex flex-wrap items-center gap-1">
                                  {(thread.labels ?? []).map((label) => (
                                    <Badge
                                      key={label}
                                      variant={isEscalationLabel(label) ? "destructive" : "secondary"}
                                      className="h-auto px-1.5 py-0 text-[10px]"
                                    >
                                      {label}
                                    </Badge>
                                  ))}
                                  <Badge
                                    variant="secondary"
                                    className="h-auto px-1.5 py-0 text-[10px]"
                                  >
                                    {thread.channel}
                                  </Badge>
                                </div>
                              </div>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    className={
                                      assignee
                                        ? `flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold transition-colors hover:ring-2 hover:ring-gray-300 ${avatarColor(assignee)}`
                                        : "shrink-0 flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                                    }
                                    title={assignee ? `Assigned to ${assignee}. Click to reassign.` : "Assign someone to this thread"}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {assignee ? initials(assignee) : <Plus className="h-4 w-4" />}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="z-[70] w-[280px] p-0" align="end" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                  <ThreadAssignPicker
                                    agents={THREAD_AGENTS}
                                    currentAssignee={assignee}
                                    onAssign={(name) => assignThread(globalIdx, name)}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          );
                        })}
                  </div>
                  {/* Email / SMS quick-compose buttons.
                      Each button opens the profile curtain's right-side
                      new-thread composer with the chosen channel
                      pre-locked — matching the "New SMS · not yet
                      saved" / "New Email · not yet saved" surface the
                      Communications tab shows when creating a fresh
                      thread. We stay inside the curtain (the profile
                      pane on the left remains visible), just swap the
                      right rail into new-thread mode:
                        · `openThreadIdx = -1` puts the panel in
                          new-thread mode
                        · `newThreadOutbound` locks the channel +
                          FROM branding (property vanity number/email
                          when available)
                        · `pending{Sms,Email}Compose` is cleared so the
                          hidden main-pane composer doesn't race with
                          the in-curtain one. */}
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    {(
                      [
                        { channel: "Email", icon: Mail, label: "Email" },
                        { channel: "SMS", icon: MessageSquare, label: "SMS" },
                      ] as const
                    ).map(({ channel, icon: Icon, label }) => (
                  <button
                        key={channel}
                    type="button"
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-1.5 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
                        onClick={() => openNewThreadInPanel(channel)}
                      >
                        <Icon
                          className="h-3.5 w-3.5 text-gray-400"
                          strokeWidth={1.5}
                        />
                        {label}
                  </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>}
        </div>
        </>
        );
      })()}

      <Dialog
        open={newThreadDialogOpen}
        onOpenChange={(open) => {
          setNewThreadDialogOpen(open);
          if (!open) setNewThreadFromSelection("");
        }}
      >
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md z-[101]">
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
            <DialogTitle className="text-base font-semibold leading-tight">New Thread</DialogTitle>
            <button
              type="button"
              onClick={() => {
                setNewThreadDialogOpen(false);
                setNewThreadFromSelection("");
              }}
              className="rounded-sm text-muted-foreground opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-6 py-5 space-y-3">
            <DialogDescription className="sr-only">
              Pick SMS vanity or property email as the outbound From line for this thread.
            </DialogDescription>
            <p className="text-sm font-semibold text-foreground">Select Communication Method</p>
            {selected && newThreadPropertyFromOptions.length === 0 ? (
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                No SMS vanity or email is configured for{" "}
                <span className="font-medium text-foreground">{selected.property}</span> in this
                prototype. Add it under property vanity contact data to enable new threads.
              </p>
            ) : (
              <Select
                value={newThreadFromSelection || undefined}
                onValueChange={setNewThreadFromSelection}
              >
                <SelectTrigger className="h-11 w-full text-left text-[13px]">
                  <SelectValue placeholder="Select Channel" />
                </SelectTrigger>
                <SelectContent className="z-[110] max-h-[min(280px,50vh)]">
                  {newThreadPropertyFromOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id} className="text-[13px]">
                      {o.channel} — {o.from}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter className="border-t border-border px-6 py-4 sm:justify-end">
            <Button
              type="button"
              className="rounded-full bg-gray-900 px-6 text-white hover:bg-gray-800"
              disabled={!newThreadFromSelection || newThreadPropertyFromOptions.length === 0}
              onClick={handleCreateNewThreadFromDialog}
            >
              Create Thread
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={emailAttachmentPreview !== null} onOpenChange={(open) => { if (!open) setEmailAttachmentPreview(null); }}>
        <DialogContent className="flex max-h-[min(90vh,760px)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="shrink-0 space-y-1 border-b border-border px-6 py-4 text-left">
            <DialogTitle className="pr-8 text-base font-semibold leading-snug">
              {emailAttachmentPreview?.name ?? "Attachment"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Preview of the selected email attachment. Prototype sample; not a live file.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40 p-6">
            {emailAttachmentPreview?.kind === "image" ? (
              <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1400&q=80"
                  alt=""
                  className="block h-auto w-full max-h-[min(65vh,520px)] object-cover"
                />
                <p className="border-t border-border px-4 py-2.5 text-center text-[11px] text-muted-foreground">
                  Sample preview for prototype — stand-in image for the attachment.
                </p>
              </div>
            ) : emailAttachmentPreview ? (
              <div className="mx-auto max-w-xl rounded-lg border border-border bg-background shadow-sm">
                <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2">
                  <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span className="truncate text-xs font-medium text-foreground">{emailAttachmentPreview.name}</span>
                </div>
                <div className="space-y-4 p-6">
                  <div className="mx-auto flex max-w-[240px] flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      {/* Simple floor-plan style mock */}
                      <div className="h-14 w-14 rounded-sm border-2 border-foreground/25 bg-muted/60" />
                      <div className="flex flex-1 flex-col justify-between gap-2 min-w-[100px]">
                        <div className="h-6 rounded-sm border border-foreground/20 bg-muted/40" />
                        <div className="h-8 rounded-sm border border-foreground/20 bg-muted/30" />
                      </div>
                    </div>
                    <div className="h-20 rounded-sm border border-dashed border-foreground/15 bg-muted/20" />
                  </div>
                  <div className="space-y-2">
                    {[85, 100, 72, 95, 88, 100].map((w, i) => (
                      <div
                        key={i}
                        className="h-2 rounded-full bg-muted-foreground/15"
                        style={{ width: `${w}%` }}
                      />
                    ))}
                  </div>
                  <p className="text-center text-[11px] text-muted-foreground">
                    Sample document preview for prototype — not the real PDF.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <ConversationBulkEmailModal
        bulk={bulkEmailModal}
        open={bulkEmailModal !== null}
        onOpenChange={(o) => {
          if (!o) setBulkEmailModal(null);
        }}
        onAttachmentClick={(att) => {
          setBulkEmailModal(null);
          setEmailAttachmentPreview(att);
        }}
      />

      <Dialog
        open={callConfirmOpen}
        onOpenChange={(open) => {
          setCallConfirmOpen(open);
          if (!open) {
            setCallConfirmDraft(null);
            setShowCallbackInput(false);
            setCallbackNumber("");
          }
        }}
      >
        <DialogContent className="gap-5 sm:max-w-md">
          <DialogHeader className="space-y-1.5">
            <DialogTitle>Place this call?</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {callConfirmDraft ? (
                <>
                  You are about to call the {callConfirmDraft.contactRole ?? "resident"},{" "}
                  <span className="font-semibold text-foreground">
                    {callConfirmDraft.residentName}
                  </span>
                  , on{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    {callConfirmDraft.phoneDisplay}
                  </span>{" "}
                  (primary on file). Choose how you&apos;d like to connect.
                </>
              ) : (
                "Confirm the outbound call."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2.5">
            {/* Option A — VoIP / computer audio */}
            <button
              type="button"
              className="group flex items-start gap-3 rounded-lg border border-border bg-background p-3 text-left transition hover:border-primary/60 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => {
                if (callConfirmDraft) {
                  setClickToCallSession({ ...callConfirmDraft, origin: "voip" });
                }
                setCallConfirmOpen(false);
                setCallConfirmDraft(null);
                setShowCallbackInput(false);
                setCallbackNumber("");
              }}
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Headphones className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  Call from computer (VoIP)
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                  Use your computer&apos;s mic and speakers to connect directly to the{" "}
                  {callConfirmDraft?.contactRole ?? "resident"}.
                </span>
              </span>
            </button>

            {/* Option B — Click-to-call to another number */}
            {!showCallbackInput ? (
              <button
                type="button"
                className="group flex items-start gap-3 rounded-lg border border-border bg-background p-3 text-left transition hover:border-primary/60 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setShowCallbackInput(true);
                  // Default to the staff's primary callback number (Mobile).
                  // Staff can pick another saved number from the dropdown
                  // in the next step. Property callback line remains
                  // available via the primary "Call from property" option
                  // outside this branch.
                  setCallbackNumber(primaryStaffCallbackNumber);
                }}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <PhoneForwarded className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    Call from another number
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                    We&apos;ll ring the number your property set for callbacks
                    {callConfirmDraft?.propertyRingNumberDisplay ? (
                      <>
                        {" "}
                        (
                        <span className="font-mono tabular-nums text-foreground">
                          {callConfirmDraft.propertyRingNumberDisplay}
                        </span>
                        )
                      </>
                    ) : null}
                    , or a custom number from your profile. Once you pick up, we&apos;ll connect you
                    to {callConfirmDraft?.residentName ?? "the contact"}.
                  </span>
                </span>
              </button>
            ) : (
              <div className="rounded-lg border border-primary/50 bg-accent/40 p-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <PhoneForwarded className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      Call from another number
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                      We&apos;ll ring this number first. Once you pick up, we&apos;ll connect the{" "}
                      {callConfirmDraft?.contactRole ?? "resident"},{" "}
                      <span className="font-semibold text-foreground">
                        {callConfirmDraft?.residentName ?? "contact"}
                      </span>
                      .
                    </p>
                    <div className="mt-2.5 space-y-1.5">
                      <label
                        htmlFor="callback-number"
                        className="flex items-center justify-between text-[11px] font-medium text-muted-foreground"
                      >
                        <span>Number we&apos;ll ring</span>
                        <span className="font-normal text-[10px] text-muted-foreground/80">
                          Default: your primary number
                        </span>
                      </label>
                      <Select
                        value={callbackNumber}
                        onValueChange={(v) => setCallbackNumber(v)}
                      >
                        <SelectTrigger
                          id="callback-number"
                          className="h-9 font-mono tabular-nums"
                        >
                          <SelectValue placeholder="Pick a number" />
                        </SelectTrigger>
                        <SelectContent>
                          {STAFF_CALLBACK_NUMBERS.map((n) => (
                            <SelectItem
                              key={n.value}
                              value={n.value}
                              className="font-mono tabular-nums"
                            >
                              <span className="flex items-center gap-2">
                                <span>{n.value}</span>
                                <span className="font-sans text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                  {n.label}
                                  {n.isPrimary ? " · Primary" : ""}
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] leading-snug text-muted-foreground">
                        Pick which of your saved numbers to ring for this call.
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          setShowCallbackInput(false);
                          setCallbackNumber("");
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 gap-1.5"
                        disabled={callbackNumber.trim().length < 7}
                        onClick={() => {
                          if (callConfirmDraft && callbackNumber.trim()) {
                            setClickToCallSession({
                              ...callConfirmDraft,
                              origin: "callback",
                              callbackNumberDisplay: callbackNumber.trim(),
                            });
                          }
                          setCallConfirmOpen(false);
                          setCallConfirmDraft(null);
                          setShowCallbackInput(false);
                          setCallbackNumber("");
                        }}
                      >
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        Ring this number
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex w-full flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => {
                setCallConfirmOpen(false);
                setCallConfirmDraft(null);
                setShowCallbackInput(false);
                setCallbackNumber("");
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClickToCallFloatingPanel
        session={clickToCallSession}
        onDismiss={() => setClickToCallSession(null)}
      />

      {/* Floating chatbot-shaped notifications widget for OXP
          Communications. Renders no DOM at all until the
          Notifications demo control is turned on (self-guarded via
          `notificationsEnabled` inside the component), so the
          /conversations layout stays byte-identical for every user
          who hasn't flipped the toggle. */}
      <CommunicationsNotificationBell />

    </div>
  );
}

function AssigneePicker({
  groupedAssignees,
  currentAssignee,
  onSelect,
}: {
  groupedAssignees: { ai: { value: string; label: string }[]; humans: { value: string; label: string }[] };
  currentAssignee: string;
  onSelect: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.toLowerCase().trim();

  const filteredAi = groupedAssignees.ai.filter((a) => !q || a.label.toLowerCase().includes(q));
  const filteredHumans = groupedAssignees.humans.filter((h) => !q || h.label.toLowerCase().includes(q));
  const hasResults = filteredAi.length > 0 || filteredHumans.length > 0;
  const alreadyUnassigned = currentAssignee === CONVERSATION_UNASSIGNED_ASSIGNEE;

  return (
    <div>
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search assignees..."
            className="h-8 w-full rounded-md border border-input bg-background pl-7 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
        </div>
      </div>
      <div className="max-h-56 overflow-y-auto p-1">
        <div className="sticky top-0 z-[1] -mx-0 mb-1 border-b border-border bg-popover pb-1.5 pt-0.5">
          <button
            type="button"
            disabled={alreadyUnassigned}
            title={alreadyUnassigned ? "No assignee on this conversation" : "Clear assignee (no AI routing)"}
            onClick={() => onSelect(UNASSIGN_CONVERSATION_VALUE)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
              alreadyUnassigned
                ? "cursor-not-allowed text-muted-foreground/70"
                : "text-foreground hover:bg-muted"
            )}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border/80 bg-muted/40 text-muted-foreground">
              <UserMinus className="h-3 w-3" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Unassign</span>
              <span className="block text-[10px] text-muted-foreground">
                Remove assignee — not routed to an AI agent
              </span>
            </span>
          </button>
        </div>
        {!hasResults ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matching assignees</p>
        ) : (
          <>
            {filteredAi.length > 0 && (
              <div>
                <p className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">AI Agents</p>
                {filteredAi.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => onSelect(a.value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted",
                      a.value === currentAssignee && "bg-muted font-medium"
                    )}
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src="/eli-cube.svg" alt="ELI" className="p-0.5" />
                      <AvatarFallback className="bg-blue-100 text-[8px] text-blue-700">AI</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{a.label}</span>
                    {a.value === currentAssignee && <Check className="ml-auto h-3 w-3 shrink-0 text-primary" />}
                  </button>
                ))}
              </div>
            )}
            {filteredHumans.length > 0 && (
              <div>
                <p className="px-2 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Staff</p>
                {filteredHumans.map((h) => (
                  <button
                    key={h.value}
                    onClick={() => onSelect(h.value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted",
                      h.value === currentAssignee && "bg-muted font-medium"
                    )}
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="bg-muted text-[8px] text-muted-foreground">
                        {h.value.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{h.label}</span>
                    {h.value === currentAssignee && <Check className="ml-auto h-3 w-3 shrink-0 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ThreadAssignPicker({
  agents,
  currentAssignee,
  onAssign,
}: {
  agents: string[];
  currentAssignee: string | null;
  onAssign: (name: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.toLowerCase().trim();
  const filtered = agents.filter((a) => !q || a.toLowerCase().includes(q));

  return (
    <div>
      <div className="border-b border-gray-200 px-4 py-2.5">
        <button
          type="button"
          disabled={currentAssignee === null}
          title={currentAssignee === null ? "Thread is already unassigned" : "Clear thread assignee"}
          onClick={() => onAssign(null)}
          className={`flex w-full items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-left text-[13px] font-medium transition-colors ${
            currentAssignee === null
              ? "cursor-not-allowed bg-gray-50 text-gray-400"
              : "bg-white text-gray-800 hover:bg-gray-50"
          }`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-500">
            <UserMinus className="h-4 w-4" />
          </span>
          <span className="flex-1">Unassign thread</span>
        </button>
      </div>
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for Agent or Queue"
            className="flex-1 text-[13px] bg-transparent outline-none placeholder:text-gray-400"
          />
        </div>
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {filtered.map((name) => {
          const isAssigned = currentAssignee === name;
          return (
            <div
              key={name}
              className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onAssign(name)}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${isAssigned ? "bg-[#2e7d32] text-white" : avatarColor(name)}`}>
                {initials(name)}
              </div>
              <span className="flex-1 text-[14px] font-medium text-gray-800">{name}</span>
              {isAssigned ? (
                <span className="text-[13px] font-bold text-gray-900">Assigned</span>
              ) : (
                <span className="text-[13px] font-medium text-blue-600">Assign</span>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-[12px] text-gray-400">No agents found</p>
        )}
      </div>
    </div>
  );
}

function MiniCalendar({
  selected,
  onSelect,
  onNoLimit,
}: {
  selected: Date | null;
  onSelect: (date: Date) => void;
  onNoLimit: () => void;
}) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(
    selected?.getMonth() ?? today.getMonth()
  );
  const [viewYear, setViewYear] = useState(
    selected?.getFullYear() ?? today.getFullYear()
  );

  const MONTH_NAMES = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];
  const MONTHS_SHORT = [
    "JAN","FEB","MAR","APR","MAY","JUN",
    "JUL","AUG","SEP","OCT","NOV","DEC",
  ];
  const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const isBeforeToday = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return d < t;
  };

  const [pendingDate, setPendingDate] = useState<Date | null>(selected);

  return (
    <div className="w-[280px]">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <button
          type="button"
          className="text-sm font-semibold text-foreground flex items-center gap-1"
        >
          {MONTH_NAMES[viewMonth].toUpperCase()} {viewYear}{" "}
          <ChevronDown className="h-3 w-3" />
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded p-1 hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded p-1 hover:bg-accent transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 px-3">
        {DAYS.map((d) => (
          <div
            key={d}
            className="flex h-8 items-center justify-center text-[11px] font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="px-4 pb-1">
        <span className="text-[11px] font-semibold text-muted-foreground">
          {MONTHS_SHORT[viewMonth]}
        </span>
      </div>

      <div className="grid grid-cols-7 px-3 pb-2">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(viewYear, viewMonth, day);
          const isToday = isSameDay(date, today);
          const isSelected = pendingDate && isSameDay(date, pendingDate);
          const disabled = isBeforeToday(day);
          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => setPendingDate(date)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors mx-auto",
                disabled && "text-muted-foreground/40 cursor-not-allowed",
                !disabled && !isSelected && !isToday && "hover:bg-accent text-foreground",
                isToday && !isSelected && "ring-1 ring-primary text-primary font-medium",
                isSelected && "bg-primary text-primary-foreground font-medium"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
        <button
          type="button"
          onClick={onNoLimit}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          No limit
        </button>
        <Button
          size="sm"
          onClick={() => { if (pendingDate) onSelect(pendingDate); }}
          disabled={!pendingDate}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   COMMUNICATIONS DEMO CONTROL (sidebar footer)
   ───────────────────────────────────────────────────────────────────────────── */

function CommunicationsDemoControl({
  clickToCallEnabled,
  onToggleClickToCall,
  callSystemEnabled,
  onToggleCallSystem,
  onSimulateInboundCall,
  superAgent1Enabled,
  onToggleSuperAgent1,
  superAgent12Enabled,
  onToggleSuperAgent12,
  translationEnabled,
  onToggleTranslation,
  simulateUserEnabled,
  onToggleSimulateUser,
  breakoutsExampleEnabled,
  onToggleBreakoutsExample,
  email2DemoEnabled,
  onToggleEmail2Demo,
  notificationsEnabled,
  onToggleNotifications,
  onPreviewNotificationPop,
  viewportPreset,
  onSetViewportPreset,
  goLiveAutomationEnabled,
  onToggleGoLiveAutomation,
  testingModeEnabled,
  onToggleTestingMode,
}: {
  clickToCallEnabled: boolean;
  onToggleClickToCall: () => void;
  callSystemEnabled: boolean;
  onToggleCallSystem: () => void;
  onSimulateInboundCall: (callerType?: IncomingCallerType) => void;
  superAgent1Enabled: boolean;
  onToggleSuperAgent1: () => void;
  superAgent12Enabled: boolean;
  onToggleSuperAgent12: () => void;
  translationEnabled: boolean;
  onToggleTranslation: () => void;
  simulateUserEnabled: boolean;
  onToggleSimulateUser: () => void;
  breakoutsExampleEnabled: boolean;
  onToggleBreakoutsExample: () => void;
  email2DemoEnabled: boolean;
  onToggleEmail2Demo: () => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  goLiveAutomationEnabled: boolean;
  onToggleGoLiveAutomation: () => void;
  /**
   * Super Agent 1.2-only "Testing" mode. When on, the conversation
   * header exposes a clickable session-id chip that opens the
   * Trace panel for the thread's last Eli reply. Disabled until
   * SA 1.2 is on.
   */
  testingModeEnabled: boolean;
  onToggleTestingMode: () => void;
  /**
   * Fires the "pretend a new notification just arrived" pop animation
   * on the floating bell. Used by the "Preview pop-out" sub-button
   * under the Notifications row so demoers can replicate the peek
   * animation on demand without waiting for a real unread count to
   * change.
   */
  onPreviewNotificationPop: () => void;
  viewportPreset: ViewportPreset;
  onSetViewportPreset: (preset: ViewportPreset) => void;
}) {
  const [open, setOpen] = useState(false);
  const anyActive =
    clickToCallEnabled ||
    callSystemEnabled ||
    superAgent1Enabled ||
    superAgent12Enabled ||
    translationEnabled ||
    simulateUserEnabled ||
    breakoutsExampleEnabled ||
    email2DemoEnabled ||
    notificationsEnabled ||
    viewportPreset !== "off" ||
    goLiveAutomationEnabled ||
    (testingModeEnabled && superAgent12Enabled);

  return (
    <div className="shrink-0 border-t border-border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/60"
        aria-expanded={open}
        aria-controls="communications-demo-control-panel"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <Beaker className="h-3 w-3 text-muted-foreground" strokeWidth={2} />
          <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Communications Demo Control
          </span>
          {anyActive && (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
              aria-label="One or more demo controls are active"
            />
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div id="communications-demo-control-panel" className="px-3 pb-3">
          <label className="flex cursor-pointer items-start justify-between gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted/60">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold leading-tight text-foreground">Click To Call</p>
              <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                Show call controls on Communications
              </p>
            </div>
            <Switch
              checked={clickToCallEnabled}
              onCheckedChange={onToggleClickToCall}
              className="mt-0.5"
            />
          </label>

          <label className="flex cursor-pointer items-start justify-between gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted/60">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold leading-tight text-foreground">Call System</p>
              <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                Show Call System settings in sidebar
              </p>
            </div>
            <Switch
              checked={callSystemEnabled}
              onCheckedChange={onToggleCallSystem}
              className="mt-0.5"
            />
          </label>

          {callSystemEnabled && (
            <div className="mt-1 rounded-md border border-border/60 bg-background px-2 py-2">
              <div className="mb-1.5 flex items-center gap-1.5">
                <PhoneIncoming className="h-3 w-3 text-emerald-500" strokeWidth={2} />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Replicate Incoming Call
                </p>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {([
                  { type: "prospect" as IncomingCallerType, label: "Prospect", Icon: UserX },
                  { type: "lead" as IncomingCallerType, label: "Lead", Icon: User },
                  { type: "resident" as IncomingCallerType, label: "Resident", Icon: UserCheck },
                ]).map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => onSimulateInboundCall(opt.type)}
                    className="flex flex-col items-center gap-1 rounded-md border border-border bg-background px-1.5 py-1.5 text-center transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    <opt.Icon className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.75} />
                    <span className="text-[10px] font-semibold text-foreground">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex cursor-pointer items-start justify-between gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted/60">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold leading-tight text-foreground">Super Agent 1.0</p>
              <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                Resolve flow plus missed-call and voicemail examples
              </p>
            </div>
            <Switch
              checked={superAgent1Enabled}
              onCheckedChange={onToggleSuperAgent1}
              className="mt-0.5"
            />
          </label>

          <label className="flex cursor-pointer items-start justify-between gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted/60">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold leading-tight text-foreground">Super Agent 1.2</p>
              <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                V2 Super Agent
              </p>
            </div>
            <Switch
              checked={superAgent12Enabled}
              onCheckedChange={onToggleSuperAgent12}
              className="mt-0.5"
            />
          </label>

          <label className="flex cursor-pointer items-start justify-between gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted/60">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold leading-tight text-foreground">Translation</p>
              <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                Detect non-English threads and translate replies live
              </p>
            </div>
            <Switch
              checked={translationEnabled}
              onCheckedChange={onToggleTranslation}
              className="mt-0.5"
            />
          </label>

          <label className="flex cursor-pointer items-start justify-between gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted/60">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold leading-tight text-foreground">Simulate User</p>
              <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                Hide Custom Inboxes and Settings from the sidebar
              </p>
            </div>
            <Switch
              checked={simulateUserEnabled}
              onCheckedChange={onToggleSimulateUser}
              className="mt-0.5"
            />
          </label>

          {/*
            "Breakouts Example" — SA 1.2 scenario toggle. When on, ten extra
            escalated / needs-staff-response threads are injected so the
            "Needs Action" bucket balloons past what fits on screen, and a
            floating "N no action needed" peek pill appears near the bottom
            of the list column. Clicking the pill collapses "Needs Action"
            and expands "No Action Needed" so staff can jump straight to
            that bucket without hand-scrolling past a huge working queue.
            Requires Super Agent 1.2 to be on — outside SA 1.2 the two
            buckets don't exist, so the seeded threads flow into the flat
            list and the peek pill never renders.
          */}
          <label className="flex cursor-pointer items-start justify-between gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted/60">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold leading-tight text-foreground">Super Agent 1.2 (Breakout example)</p>
              <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                Flood Needs Action with 10 extra threads and surface a peek
                pill that jumps to No Action Needed
              </p>
            </div>
            <Switch
              checked={breakoutsExampleEnabled}
              onCheckedChange={onToggleBreakoutsExample}
              className="mt-0.5"
            />
          </label>

          {/*
            "Email 2 Demo" — swaps the row-level Email button in the
            Entrata global-search overlay between the new inline OXP
            email composer (OFF, default) and the legacy
            `EntrataComposeEmail` modal (ON). Plain `<Switch>` — this
            is a manual/staff demo control, not an AI activation.
          */}
          <label className="flex cursor-pointer items-start justify-between gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted/60">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold leading-tight text-foreground">Email 2 Demo</p>
              <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                With composer
              </p>
            </div>
            <Switch
              checked={email2DemoEnabled}
              onCheckedChange={onToggleEmail2Demo}
              className="mt-0.5"
            />
          </label>

          {/*
            "Notifications" — surfaces the floating chatbot-shaped
            notification bell in the bottom-right of the OXP
            Communications page. SA 1.2-only: the bell's count is
            the SA 1.2 "Needs Action" bucket (property-owned + needs
            staff response), so the toggle is disabled while SA 1.2
            is off. Per-channel silencing lives in Thread Settings →
            Notifications; both this toggle and the per-channel
            toggles are session-scoped demo state (nothing is
            persisted).
          */}
          <label
            className={cn(
              "flex items-start justify-between gap-2 rounded-md px-1.5 py-1.5 transition-colors",
              superAgent12Enabled
                ? "cursor-pointer hover:bg-muted/60"
                : "cursor-not-allowed opacity-60",
            )}
            title={
              superAgent12Enabled
                ? undefined
                : "Turn on Super Agent 1.2 first — Notifications count from its Needs Action bucket."
            }
          >
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold leading-tight text-foreground">
                Notifications
                <span className="ml-1 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                  SA 1.2
                </span>
              </p>
              <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                Floating bell showing the SA 1.2 Needs Action count
              </p>
            </div>
            <Switch
              checked={notificationsEnabled && superAgent12Enabled}
              onCheckedChange={onToggleNotifications}
              disabled={!superAgent12Enabled}
              className="mt-0.5"
            />
          </label>
          {/*
            Demo-only sub-action: fires the bell's attention-getter
            animation on demand so walk-throughs don't have to wait
            for a fake inbound message. Bell pops AND a toast card
            slides in beside the FAB showing the person and their
            message. Primary "default" variant (black) because it
            simulates the everyday real-world notification arrival
            (per workspace rule primary = black/white in OXP).
            Disabled when either the Notifications toggle or SA 1.2
            is off — clicking with the bell hidden would be a
            no-op, so the disabled state makes that explicit.
          */}
          <div className="-mt-0.5 flex justify-end px-1.5 pb-1.5">
            <Button
              type="button"
              size="sm"
              variant="default"
              className="h-6 gap-1 px-2 text-[10px] font-semibold shadow-sm"
              onClick={onPreviewNotificationPop}
              disabled={!notificationsEnabled || !superAgent12Enabled}
              title={
                !superAgent12Enabled
                  ? "Turn on Super Agent 1.2 first"
                  : notificationsEnabled
                  ? "Simulate an incoming notification (bell + preview card)"
                  : "Turn Notifications on to preview"
              }
            >
              <BellRing className="h-3 w-3" strokeWidth={2.5} aria-hidden />
              Preview pop-out
            </Button>
          </div>

          {/*
            Viewport-emulation presets — letter-box the whole OXP shell into
            a fixed-size window centered in the browser so we can spot-check
            the layout at the two most common laptop-monitor sizes property
            staff actually use. Purely visual (no CDP / real viewport
            change), so all app behavior stays identical — the toggles are
            safe to leave on during a live demo. Modeled as mutually
            exclusive switches: turning one on turns the other off, driven
            by a single `viewportPreset` enum in the demo context.
          */}
          <label className="flex cursor-pointer items-start justify-between gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted/60">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold leading-tight text-foreground">
                1366 × 768 preview
              </p>
              <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                Frame the whole app at 1366 × 768 to preview a small-laptop
                monitor
              </p>
            </div>
            <Switch
              checked={viewportPreset === "1366x768"}
              onCheckedChange={(checked) =>
                onSetViewportPreset(checked ? "1366x768" : "off")
              }
              className="mt-0.5"
            />
          </label>

          <label className="flex cursor-pointer items-start justify-between gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted/60">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold leading-tight text-foreground">
                1600 × 900 preview
              </p>
              <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                Frame the whole app at 1600 × 900 to preview a 15-inch
                laptop or entry-level desktop
              </p>
            </div>
            <Switch
              checked={viewportPreset === "1600x900"}
              onCheckedChange={(checked) =>
                onSetViewportPreset(checked ? "1600x900" : "off")
              }
              className="mt-0.5"
            />
          </label>

          <label className="flex cursor-pointer items-start justify-between gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted/60">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold leading-tight text-foreground">Go Live Automation</p>
            </div>
            <Switch
              checked={goLiveAutomationEnabled}
              onCheckedChange={onToggleGoLiveAutomation}
              className="mt-0.5"
            />
          </label>

          {/*
            Testing (SA 1.2 only) — exposes the session-id chip in the
            conversation header. Clicking that chip opens the Trace
            panel showing the tool calls Eli executed to produce the
            last reply. Intentionally no description text: this is a
            debugging surface, not a user-facing feature, and every
            other affordance lives inside the Trace panel itself.
            Gated on SA 1.2 because the trace / MCP tool metadata is
            only wired up for the SA 1.2 threads.
          */}
          <label
            className={cn(
              "flex cursor-pointer items-start justify-between gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted/60",
              !superAgent12Enabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
            )}
            title={
              superAgent12Enabled
                ? undefined
                : "Turn on Super Agent 1.2 first — Testing exposes the SA 1.2 trace surface."
            }
          >
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold leading-tight text-foreground">
                Testing
                <span className="ml-1 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                  SA 1.2
                </span>
              </p>
            </div>
            <Switch
              checked={testingModeEnabled && superAgent12Enabled}
              onCheckedChange={onToggleTestingMode}
              disabled={!superAgent12Enabled}
              className="mt-0.5"
            />
          </label>

        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CALL SYSTEM SETTINGS PANEL
   ───────────────────────────────────────────────────────────────────────────── */

type CallSystemTab = "softphone" | "routing" | "queue";

const CALL_SYSTEM_TABS: { id: CallSystemTab; label: string }[] = [
  { id: "softphone", label: "Softphone & WebRTC" },
  { id: "routing", label: "Call Routing" },
  { id: "queue", label: "Call Queue" },
];

/**
 * Compact "labeled switch" row used inside the Manage Inbox settings panel.
 * Kept local because this file doesn't otherwise use the shared ToggleRow.
 */
function ManageInboxToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5" />
    </div>
  );
}

function ManageInboxSettingsPanel({
  onClose,
  quickFilterEnabled,
  onToggleQuickFilter,
  followUpEnabled,
  onToggleFollowUpEnabled,
  followUpDaysList,
  onSetFollowUpDaysList,
  autoCloseEnabled,
  onToggleAutoCloseEnabled,
  autoCloseDays,
  onSetAutoCloseDays,
  sortMode,
  onSetSortMode,
  eliPromptEnabled,
  onToggleEliPromptEnabled,
  eliPromptCadenceMinutes,
  onSetEliPromptCadenceMinutes,
  eliPromptCadenceUnit,
  onSetEliPromptCadenceUnit,
  eliPromptDefaultOption,
  onSetEliPromptDefaultOption,
  promptOptionOffEnabled,
  onTogglePromptOptionOffEnabled,
  promptOptionKeepOnEnabled,
  onTogglePromptOptionKeepOnEnabled,
}: {
  onClose: () => void;
  quickFilterEnabled: boolean;
  onToggleQuickFilter: (v: boolean) => void;
  followUpEnabled: boolean;
  onToggleFollowUpEnabled: (v: boolean) => void;
  followUpDaysList: number[];
  onSetFollowUpDaysList: (days: number[]) => void;
  autoCloseEnabled: boolean;
  onToggleAutoCloseEnabled: (v: boolean) => void;
  autoCloseDays: number;
  onSetAutoCloseDays: (n: number) => void;
  sortMode: "newest" | "oldest";
  onSetSortMode: (m: "newest" | "oldest") => void;
  eliPromptEnabled: boolean;
  onToggleEliPromptEnabled: (v: boolean) => void;
  eliPromptCadenceMinutes: number;
  onSetEliPromptCadenceMinutes: (n: number) => void;
  eliPromptCadenceUnit: EliPromptCadenceUnit;
  onSetEliPromptCadenceUnit: (u: EliPromptCadenceUnit) => void;
  eliPromptDefaultOption: "off" | "on";
  onSetEliPromptDefaultOption: (choice: "off" | "on") => void;
  promptOptionOffEnabled: boolean;
  onTogglePromptOptionOffEnabled: (v: boolean) => void;
  promptOptionKeepOnEnabled: boolean;
  onTogglePromptOptionKeepOnEnabled: (v: boolean) => void;
}) {
  type SectionId = "notifications" | "defaults" | "setup" | "follow-up";
  const SECTIONS: { id: SectionId; label: string; description: string }[] = [
    { id: "setup", label: "One Time Setup", description: "One-time actions to prep the inbox" },
    { id: "defaults", label: "Defaults", description: "Which inbox, filter, and sort open by default" },
    // Notifications — governs the floating chatbot-shaped notification
    // bell in the bottom-right of the Communications page. Per-channel
    // toggles below silence individual lanes (Voice / SMS / Email /
    // Resident Portal). Section is unconditionally exposed as of the
    // Notifications demo; the bell itself is still gated behind the
    // Communications Demo Control's Notifications switch so this page
    // remains inert for anyone who hasn't turned it on yet.
    { id: "notifications", label: "Notifications", description: "Bell notifications across every channel" },
    // Sorting was folded into Defaults — the standalone section is gone.
    { id: "follow-up", label: "Thread Automation", description: "Follow-up and auto-close rules" },
  ];
  const [activeSection, setActiveSection] = useState<SectionId>("setup");

  // Per-channel notification toggles live in the demo context so the
  // bell and this settings tab stay in sync — flipping "Voice" off
  // here silences the bell's Voice contributions instantly. The two
  // legacy toggles below (sound / desktop) are still purely local; if
  // we ever wire them to a real notification store, hoist them into
  // the context too.
  const {
    notifChannelVoice,
    setNotifChannelVoice,
    notifChannelSms,
    setNotifChannelSms,
    notifChannelEmail,
    setNotifChannelEmail,
    notifChannelResidentPortal,
    setNotifChannelResidentPortal,
  } = useConversationsDemo();
  // Local state — none of this is persisted yet. Wire to a real store later.
  const [soundOnNewMessage, setSoundOnNewMessage] = useState(false);
  const [desktopNotifications, setDesktopNotifications] = useState(false);
  const [defaultInbox, setDefaultInbox] = useState<"all" | "escalated" | "property">("all");
  const [defaultChannel, setDefaultChannel] = useState<"all" | "voice" | "sms" | "chat" | "email">("all");

  // Setup — one-time inbox cleanup. Uses the same context as the rest of the page,
  // so resolved threads flow through into the Closed Threads inbox and honor
  // the SA 1.2 activity log.
  const { items: allConversations, resolveConversation } = useConversations();
  // Property scope for the one-time sweep. Empty set = every property (the
  // filter treats an empty selection as "unscoped"). Stored as a set of
  // leaf property display names (matching `ConversationItem.property`)
  // because the picker below is a flat property-name list, not the shared
  // portfolio tree — per design feedback we intentionally skip the
  // portfolio/region/group nesting for this cleanup setting and just let
  // staff tick individual properties.
  const [setupPropertyFilters, setSetupPropertyFilters] = useState<Set<string>>(
    () => new Set(),
  );
  const setupPropertyNames = setupPropertyFilters;
  // All leaf property names available in the portfolio tree, sorted
  // alphabetically once. Used by the flat picker below.
  const allSetupPropertyNames = useMemo(() => {
    return Array.from(collectLeafPropertyNames(portfolioData)).sort((a, b) =>
      a.localeCompare(b),
    );
  }, []);
  const [setupPropertySearch, setSetupPropertySearch] = useState("");
  const filteredSetupPropertyNames = useMemo(() => {
    const q = setupPropertySearch.trim().toLowerCase();
    if (!q) return allSetupPropertyNames;
    return allSetupPropertyNames.filter((n) => n.toLowerCase().includes(q));
  }, [allSetupPropertyNames, setupPropertySearch]);
  const toggleSetupProperty = useCallback(
    (name: string) => {
      setSetupPropertyFilters((prev) => {
        const next = new Set(prev);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        return next;
      });
    },
    [],
  );
  // Setup-sweep filter. Two important shape decisions here:
  //
  //  1. Assignee-agnostic. The one-time cleanup is meant to zero out the
  //     entire pre-existing SMS + Email backlog so the new resolve-based
  //     workflow starts from a clean slate — Eli-owned AND property-
  //     teammate-owned threads both get closed. Anyone who needs a
  //     specific thread back can reopen it from Closed Threads, which is
  //     what makes the aggressive close acceptable as a one-time cutover.
  //
  //  2. Live-escalation carve-out. If the client is using ELI+ and a
  //     thread carries an active escalation label ("Leasing AI Escalation",
  //     "Renewals AI Escalation", "Payments AI Escalation", "Maintenance
  //     AI Escalation", "Other Escalation", or the "Renewal AI Escalation"
  //     variant), that thread was escalated to staff by Eli and is still
  //     waiting on a resolution — closing it out from under staff would
  //     drop live work on the floor. Those stay open. The check is a
  //     suffix match on ` Escalation` because every current escalation
  //     label follows the `<Bucket> AI Escalation` / `Other Escalation`
  //     naming pattern (see `lib/conversations-context.tsx`), so this
  //     stays correct if a new escalation bucket is added later without
  //     needing a hardcoded list here.
  const isOpenEliEscalation = useCallback((c: ConversationItem) => {
    return c.labels.some((l) => l.endsWith(" Escalation"));
  }, []);
  const setupTargets = useMemo(
    () =>
      allConversations.filter((c) => {
        if (c.status !== "open") return false;
        if (c.channel !== "SMS" && c.channel !== "Email") return false;
        if (isOpenEliEscalation(c)) return false;
        // Property scope — empty selection means "every property," matching
        // how the shared PropertySelector reports "nothing selected."
        if (
          setupPropertyNames.size > 0 &&
          !setupPropertyNames.has(c.property)
        ) {
          return false;
        }
        return true;
      }),
    [allConversations, isOpenEliEscalation, setupPropertyNames],
  );
  // Cutoff date — the client picks how far back "pre-existing" goes. Defaults
  // to yesterday, which is the recommended value (today's messages are still
  // active work). Stored as an ISO yyyy-mm-dd string so it works with the
  // native <input type="date">. Use LOCAL date parts (not `toISOString`) so
  // late-evening users don't see today's date reported as tomorrow.
  const toIsoDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const todayIso = useMemo(() => toIsoDate(new Date()), []);
  const yesterdayIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toIsoDate(d);
  }, []);
  const [setupCutoffDate, setSetupCutoffDate] = useState<string>(yesterdayIso);
  const [setupConfirmOpen, setSetupConfirmOpen] = useState(false);
  const [setupResolvedCount, setSetupResolvedCount] = useState<number | null>(null);
  const runInboxSetup = () => {
    const ids = setupTargets.map((c) => c.id);
    // Compact human-readable scope line for the activity-log note so admins
    // reviewing a closed thread can tell (a) it was closed by the one-time
    // sweep (not a manual resolve) and (b) which scope the sweep ran with.
    const scopeSummary =
      setupPropertyNames.size === 0
        ? "all properties"
        : setupPropertyNames.size === 1
          ? Array.from(setupPropertyNames)[0]
          : `${setupPropertyNames.size} properties`;
    ids.forEach((id) =>
      resolveConversation(id, undefined, {
        resolutionType: "general",
        notes: `Auto-closed by inbox setup (cutoff ${setupCutoffDate}, scope: ${scopeSummary}, active ELI+ escalations excluded) to give site staff a fresh starting point.`,
      }),
    );
    setSetupResolvedCount(ids.length);
    setSetupConfirmOpen(false);
  };

  // Follow-up + auto-close day choices (dropdown values). Auto-close ranges
  // farther out because an idle-close usually happens on the order of weeks.
  const followUpDayChoices = [1, 2, 3, 5, 7, 10, 14, 21, 30];
  const autoCloseDayChoices = [3, 5, 7, 10, 14, 21, 30, 45, 60, 90];

  // Eli Prompt cadence — allowed values per unit. Kept minimal so the
  // dropdown feels like Slack DND / Gmail snooze rather than an arbitrary
  // number entry. Anything below 1 minute would be noisy; anything above
  // 30 days stops behaving like an automation.
  const ELI_PROMPT_CADENCE_CHOICES: Record<EliPromptCadenceUnit, number[]> = {
    minutes: [5, 15, 30, 45],
    hours: [1, 2, 4, 6, 12, 24],
    days: [1, 3, 7, 14, 30],
  };
  // Local editing buffer for the cadence controls. We only push the parsed
  // combined "minutes" value into context when both value + unit are settled,
  // otherwise flipping units mid-edit would clobber the stored value.
  const [pendingCadenceValue, setPendingCadenceValue] = useState<number>(() => {
    if (eliPromptCadenceUnit === "days") return Math.max(1, Math.round(eliPromptCadenceMinutes / (60 * 24)));
    if (eliPromptCadenceUnit === "hours") return Math.max(1, Math.round(eliPromptCadenceMinutes / 60));
    return Math.max(1, eliPromptCadenceMinutes);
  });
  // Keep the local value in sync when the unit switches — pick the largest
  // choice that's <= the current minute total so switching feels lossless.
  useEffect(() => {
    const choices = ELI_PROMPT_CADENCE_CHOICES[eliPromptCadenceUnit];
    let raw: number;
    if (eliPromptCadenceUnit === "days") raw = eliPromptCadenceMinutes / (60 * 24);
    else if (eliPromptCadenceUnit === "hours") raw = eliPromptCadenceMinutes / 60;
    else raw = eliPromptCadenceMinutes;
    // Snap to the nearest available choice (prefer floor to avoid over-shooting).
    const snapped = [...choices].reverse().find((c) => c <= raw) ?? choices[0];
    setPendingCadenceValue(snapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eliPromptCadenceUnit]);
  // Human-readable cadence label ("6 hours", "3 days") for confirm dialogs.
  const cadenceLabelFor = (value: number, unit: EliPromptCadenceUnit) => {
    const one = value === 1;
    if (unit === "minutes") return `${value} minute${one ? "" : "s"}`;
    if (unit === "hours") return `${value} hour${one ? "" : "s"}`;
    return `${value} day${one ? "" : "s"}`;
  };

  // Sort options — labels live here so the shared confirm dialog can resolve
  // them for the "from → to" sentence. A "priority" mode used to live here
  // too, but it was retired when SA 1.2's Needs Action / No Action Needed
  // collapsible groups became the canonical way to surface work that needs
  // attention.
  type SortMode = "newest" | "oldest";
  const SORT_OPTIONS: { id: SortMode; label: string }[] = [
    { id: "newest", label: "Newest activity first" },
    { id: "oldest", label: "Oldest activity first" },
  ];
  const sortLabelFor = (id: SortMode) => SORT_OPTIONS.find((o) => o.id === id)?.label ?? "";
  const inboxLabelFor = (id: string) => {
    switch (id) {
      case "all": return "Open Threads";
      case "escalated": return "Property Threads";
      case "property": return "Eli Threads";
      default: return id;
    }
  };
  const channelLabelFor = (id: string) => {
    switch (id) {
      case "all": return "All channels";
      case "voice": return "Voice";
      case "sms": return "SMS";
      case "chat": return "Chat";
      case "email": return "Email";
      default: return id;
    }
  };

  // Shared "change this setting live?" confirm dialog. Any live-affecting
  // control routes its change through this pattern so the UX stays consistent:
  //   1. User picks a new value (or clicks Deactivate).
  //   2. We store the intent in `pendingChange` and open the dialog.
  //   3. Confirm → run `onApply`; Cancel → discard.
  // Controls that are NOT live (e.g. tweaking the day count while Follow-up is
  // inactive) call their setter directly and skip this flow.
  type PendingChange = {
    title: string;
    fromLabel: string;
    toLabel: string;
    impact: string;
    applyLabel?: string;
    onApply: () => void;
  };
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const requestConfirmedChange = (change: PendingChange) => setPendingChange(change);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Thread Settings</h2>
          <p className="text-sm text-muted-foreground">
            Configure how the thread inbox looks and behaves. Changes apply to every inbox in this workspace.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close Thread Settings">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Section navigation */}
        <div className="w-[220px] shrink-0 border-r border-border bg-muted/30 p-2">
          <ul className="space-y-0.5">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left transition-colors",
                    activeSection === section.id
                      ? "bg-background font-medium text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                  )}
                >
                  <p className="text-sm">{section.label}</p>
                  <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground/80">
                    {section.description}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Section content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl space-y-6">
            {activeSection === "notifications" && (
              <>
                <div>
                  <h3 className="text-base font-semibold">Notifications</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Decide when the app should alert you about new inbox activity.
                  </p>
                </div>

                {/* Channel notifications — surfaces the per-channel
                    switches that feed the Communications-page bell.
                    Flipping any switch off here removes that channel's
                    threads from the bell's list and its unread count
                    live, and hides the channel's chip from the panel's
                    filter row. Kept in its own card (separate from the
                    legacy sound/desktop toggles below) because these
                    switches govern the bell's data, not its delivery
                    method. */}
                <div className="rounded-lg border border-border bg-background p-4">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-foreground">
                      Notify me across these channels
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Silences the Communications-page notification bell for the channels you turn off — unread counts and list rows both respect these switches.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <ManageInboxToggleRow
                      title="Voice"
                      description="Inbound calls and voicemails. Turn off to silence the phone lane without hiding voicemails from the inbox."
                      checked={notifChannelVoice}
                      onCheckedChange={setNotifChannelVoice}
                    />
                    <ManageInboxToggleRow
                      title="SMS"
                      description="Text messages exchanged with leads and residents."
                      checked={notifChannelSms}
                      onCheckedChange={setNotifChannelSms}
                    />
                    <ManageInboxToggleRow
                      title="Email"
                      description="Emails routed to your property mailboxes."
                      checked={notifChannelEmail}
                      onCheckedChange={setNotifChannelEmail}
                    />
                    <ManageInboxToggleRow
                      title="Resident Portal"
                      description="Chat and messenger threads originating from the resident portal."
                      checked={notifChannelResidentPortal}
                      onCheckedChange={setNotifChannelResidentPortal}
                    />
                  </div>
                </div>

                <div className="space-y-4 rounded-lg border border-border bg-background p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Delivery
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      How the app grabs your attention when a new
                      notification arrives.
                    </p>
                  </div>
                  <ManageInboxToggleRow
                    title="Play sound on new message"
                    description="Play a subtle chime when a new resident or lead message arrives."
                    checked={soundOnNewMessage}
                    onCheckedChange={setSoundOnNewMessage}
                  />
                  <ManageInboxToggleRow
                    title="Desktop notifications"
                    description="Show a system notification while the app is in the background."
                    checked={desktopNotifications}
                    onCheckedChange={setDesktopNotifications}
                  />
                </div>
              </>
            )}

            {activeSection === "defaults" && (
              <>
                <div>
                  <h3 className="text-base font-semibold">Defaults</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose which inbox, quick filter, and sort order appear at
                    the start of each session.
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-background p-4">
                  <ManageInboxToggleRow
                    title="Show Quick Filter"
                    description="Display the Voice / SMS / Chat / Email channel filter under the inbox list. Turn off if you prefer a cleaner sidebar."
                    checked={quickFilterEnabled}
                    onCheckedChange={(next) => {
                      if (next === quickFilterEnabled) return;
                      requestConfirmedChange({
                        title: next
                          ? "Show the Quick Filter live?"
                          : "Hide the Quick Filter live?",
                        fromLabel: quickFilterEnabled ? "Shown" : "Hidden",
                        toLabel: next ? "Shown" : "Hidden",
                        impact: next
                          ? "The Voice / SMS / Chat / Email tiles will appear in the sidebar for everyone in this workspace right after you confirm."
                          : "The Voice / SMS / Chat / Email tiles will disappear from the sidebar for everyone in this workspace right after you confirm.",
                        onApply: () => onToggleQuickFilter(next),
                      });
                    }}
                  />
                </div>

                <div className="rounded-lg border border-border bg-background p-4">
                  <p className="text-sm font-medium">Default inbox</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Which inbox is selected at the start of each logged-in
                    session when a staff member opens OXP Communications.
                    They can still switch to another inbox afterward —
                    this setting only picks the starting view.
                  </p>
                  <Select
                    value={defaultInbox}
                    onValueChange={(v) => {
                      const next = v as typeof defaultInbox;
                      if (next === defaultInbox) return;
                      requestConfirmedChange({
                        title: "Change the default inbox live?",
                        fromLabel: inboxLabelFor(defaultInbox),
                        toLabel: inboxLabelFor(next),
                        impact:
                          "Applies to every staff member in this workspace the next time they open Conversations.",
                        onApply: () => setDefaultInbox(next),
                      });
                    }}
                  >
                    <SelectTrigger className="mt-3 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Open Threads</SelectItem>
                      <SelectItem value="escalated">Property Threads</SelectItem>
                      <SelectItem value="property">Eli Threads</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border border-border bg-background p-4">
                  <p className="text-sm font-medium">Default quick filter</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Which communication channel is pre-selected in the Quick
                    Filter row (the ALL / Voice / SMS / Email tiles above the
                    search bar) at the start of each session. Staff can still
                    switch channels afterward — this only sets the starting
                    tile.
                  </p>
                  <Select
                    value={defaultChannel}
                    onValueChange={(v) => {
                      const next = v as typeof defaultChannel;
                      if (next === defaultChannel) return;
                      requestConfirmedChange({
                        title: "Change the default quick filter live?",
                        fromLabel: channelLabelFor(defaultChannel),
                        toLabel: channelLabelFor(next),
                        impact:
                          "Applies to every staff member in this workspace the next time they open Conversations.",
                        onApply: () => setDefaultChannel(next),
                      });
                    }}
                  >
                    <SelectTrigger className="mt-3 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All channels</SelectItem>
                      <SelectItem value="voice">Voice</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="chat">Chat</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Default sort order — moved out of the retired "Sorting"
                    section so all "how the inbox opens" preferences live in
                    one place. Two-option Select for consistency with the
                    Default inbox / Default quick filter rows above; the
                    old three-radio card layout (Newest / Oldest / Priority)
                    was retired alongside the Priority sort itself. */}
                <div className="rounded-lg border border-border bg-background p-4">
                  <p className="text-sm font-medium">Default sort order</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    How threads are ordered inside every inbox at the start of
                    each session. Staff can still resort afterward — this only
                    sets the starting order.
                  </p>
                  <Select
                    value={sortMode}
                    onValueChange={(v) => {
                      const next = v as SortMode;
                      if (next === sortMode) return;
                      requestConfirmedChange({
                        title: "Change the default sort order live?",
                        fromLabel: sortLabelFor(sortMode),
                        toLabel: sortLabelFor(next),
                        impact:
                          "Applies immediately to every inbox in the workspace — threads on staff screens will re-order right after you confirm.",
                        onApply: () => onSetSortMode(next),
                      });
                    }}
                  >
                    <SelectTrigger className="mt-3 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {activeSection === "setup" && (
              <>
                <div>
                  <h3 className="text-base font-semibold">One Time Setup</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Give site staff a clean starting point by closing pre-existing
                    SMS &amp; Email threads that pre-date the new resolve-based
                    workflow.{" "}
                    <span className="font-medium text-foreground">
                      This closes every open thread in the selected scope.
                    </span>{" "}
                    <span className="font-medium text-foreground">
                      Active ELI+ escalations stay open
                    </span>{" "}
                    — any conversation currently escalated to staff by Eli and
                    still awaiting a resolution is left untouched so live work
                    isn&apos;t dropped. Staff can reopen any individual closed
                    thread from Closed Threads afterward — this is intended as
                    a one-time cutover, not a routine cleanup.
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-background p-4">
                  {/* Row 1 — cutoff-date sentence. */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
                    <span>
                      Close open SMS &amp; Email threads with activity through
                    </span>
                    <input
                      type="date"
                      value={setupCutoffDate}
                      max={todayIso}
                      onChange={(e) => setSetupCutoffDate(e.target.value || yesterdayIso)}
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    {setupCutoffDate === yesterdayIso ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Recommended
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSetupCutoffDate(yesterdayIso)}
                        className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Use recommended (yesterday)
                      </button>
                    )}
                  </div>

                  {/* Row 2 — property scope. Flat property-name list per
                      design feedback: this setting doesn't need portfolio /
                      region / group nesting, staff just wants to check off
                      the properties they want the sweep to hit. Empty
                      selection = every property. */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
                    <span className="text-muted-foreground">
                      Scope to properties:
                    </span>
                    <Popover modal>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50",
                            setupPropertyFilters.size > 0 && "border-primary/40",
                          )}
                        >
                          <Building className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">
                            {setupPropertyFilters.size === 0
                              ? "All properties"
                              : setupPropertyFilters.size === 1
                                ? Array.from(setupPropertyFilters)[0]
                                : "Properties"}
                          </span>
                          {setupPropertyFilters.size > 1 && (
                            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-none text-primary-foreground">
                              {setupPropertyFilters.size}
                            </span>
                          )}
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="z-[200] w-[320px] p-0"
                        align="start"
                        sideOffset={4}
                      >
                        {/* Flat property picker — search box + scrollable
                            checkbox list of leaf property names, plus a
                            "Select all / Clear" affordance in the header
                            that operates on whatever's currently visible
                            after the search filter. */}
                        <div className="flex h-[360px] flex-col">
                          <div className="border-b border-border/70 p-2">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                value={setupPropertySearch}
                                onChange={(e) =>
                                  setSetupPropertySearch(e.target.value)
                                }
                                placeholder="Search properties…"
                                className="h-8 pl-7 text-xs"
                              />
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>
                                {setupPropertyFilters.size === 0
                                  ? "All properties"
                                  : `${setupPropertyFilters.size} selected`}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSetupPropertyFilters((prev) => {
                                      const next = new Set(prev);
                                      for (const n of filteredSetupPropertyNames) {
                                        next.add(n);
                                      }
                                      return next;
                                    });
                                  }}
                                  disabled={filteredSetupPropertyNames.length === 0}
                                  className="font-medium text-primary underline-offset-2 hover:underline disabled:opacity-40"
                                >
                                  Select all
                                </button>
                                <span aria-hidden>·</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSetupPropertyFilters(new Set())
                                  }
                                  disabled={setupPropertyFilters.size === 0}
                                  className="font-medium text-primary underline-offset-2 hover:underline disabled:opacity-40"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          </div>
                          <div
                            role="listbox"
                            aria-label="Properties"
                            aria-multiselectable="true"
                            className="flex-1 overflow-y-auto py-1"
                          >
                            {filteredSetupPropertyNames.length === 0 ? (
                              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                                No properties match{" "}
                                <span className="font-medium text-foreground">
                                  &ldquo;{setupPropertySearch}&rdquo;
                                </span>
                                .
                              </p>
                            ) : (
                              filteredSetupPropertyNames.map((name) => {
                                const checked = setupPropertyFilters.has(name);
                                const rowId = `setup-prop-${name}`;
                                return (
                                  <label
                                    key={name}
                                    htmlFor={rowId}
                                    role="option"
                                    aria-selected={checked}
                                    className={cn(
                                      "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-muted/60",
                                      checked && "bg-muted/40",
                                    )}
                                  >
                                    <Checkbox
                                      id={rowId}
                                      checked={checked}
                                      onCheckedChange={() =>
                                        toggleSetupProperty(name)
                                      }
                                    />
                                    <span className="flex-1 truncate text-foreground">
                                      {name}
                                    </span>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    {setupPropertyFilters.size > 0 && (
                      <button
                        type="button"
                        onClick={() => setSetupPropertyFilters(new Set())}
                        className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Reset to all properties
                      </button>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                    <p className="text-sm">
                      <span className="font-medium">
                        {setupTargets.length.toLocaleString()}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        conversation{setupTargets.length === 1 ? "" : "s"} will
                        be closed
                      </span>
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={setupTargets.length === 0}
                      onClick={() => setSetupConfirmOpen(true)}
                    >
                      Close All conversations
                    </Button>
                  </div>

                  {setupResolvedCount !== null && (
                    <div className="mt-3 flex items-start gap-2 rounded-md border border-status-success-border bg-status-success/10 p-3 text-sm text-status-success-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="font-medium">
                          Closed {setupResolvedCount.toLocaleString()}{" "}
                          conversation
                          {setupResolvedCount === 1 ? "" : "s"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          They&apos;re now in Closed Threads. Staff can reopen any
                          individual thread from there.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <Dialog open={setupConfirmOpen} onOpenChange={setSetupConfirmOpen}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        Close all pre-existing SMS &amp; Email conversations?
                      </DialogTitle>
                      <DialogDescription className="pt-2">
                        This will close{" "}
                        {setupTargets.length.toLocaleString()} open SMS and Email
                        thread{setupTargets.length === 1 ? "" : "s"} with activity
                        through{" "}
                        <span className="font-medium text-foreground">
                          {setupCutoffDate}
                        </span>
                        {setupPropertyNames.size > 0 && (
                          <>
                            {" "}across{" "}
                            <span className="font-medium text-foreground">
                              {setupPropertyNames.size === 1
                                ? Array.from(setupPropertyNames)[0]
                                : `${setupPropertyNames.size} selected properties`}
                            </span>
                          </>
                        )}
                        {" "}and move them to Closed Threads.{" "}
                        <span className="font-medium text-foreground">
                          This includes threads currently assigned to a property
                          teammate
                        </span>{" "}
                        — every open thread in the selected scope will be closed,
                        regardless of assignee.{" "}
                        <span className="font-medium text-foreground">
                          Active ELI+ escalations are excluded
                        </span>{" "}
                        — any conversation currently escalated to staff by Eli
                        and still awaiting a resolution stays open. Staff can
                        reopen any individual closed thread from Closed Threads
                        if a teammate needs to pick one back up. This is
                        intended as a one-time cutover to the new resolve-based
                        workflow, not a routine cleanup.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSetupConfirmOpen(false)}>
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={runInboxSetup}>
                        Close {setupTargets.length.toLocaleString()} conversation
                        {setupTargets.length === 1 ? "" : "s"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}

            {activeSection === "follow-up" && (
              <>
                <div>
                  <h3 className="text-base font-semibold">Thread Automation</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Set up rules that flag stale conversations and quietly clean up
                    idle ones — so site staff only see threads that still need
                    attention.
                  </p>
                </div>

                {/*
                  Cleaned-up card structure. Each automation is a
                  self-contained rounded card with three tiers:
                    · Header    — icon tile + title + short lead paragraph +
                                  a compact inline audit-note callout so
                                  admins see the log contract right on the
                                  setting they're configuring.
                    · Config    — the actual controls, on a subtle muted tint
                                  so the input area reads as distinct from
                                  the descriptive header.
                    · Footer    — status pill on the left, primary Activate /
                                  Deactivate action on the right.
                  The redundant shared "Every automation event…" Info banner
                  that used to sit above the three cards was removed — each
                  card now carries its own inline audit-note, which reads
                  better and never gets stale if we retire one of the
                  automations later.
                */}

                {/* --- Follow-up flagging --- */}
                <div className="overflow-hidden rounded-lg border border-border bg-background">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <BellRing className="h-4 w-4" strokeWidth={2} aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          Flag threads waiting on a reply
                        </p>
                        <p className="mt-1 text-xs leading-snug text-muted-foreground">
                          Nudges SMS &amp; Email threads where a property
                          teammate sent the last message and the lead or
                          resident hasn&apos;t replied. Threads already
                          waiting on staff (flagged red) are unaffected.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-start gap-2 rounded-md border border-border/50 bg-muted/40 px-2.5 py-1.5 text-xxs leading-snug text-muted-foreground">
                      <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                      <p>
                        When a threshold fires, an{" "}
                        <span className="font-medium text-foreground">
                          activity note
                        </span>{" "}
                        is written to the thread naming this setting and the
                        idle window that triggered it (e.g. &ldquo;3 days
                        without a resident reply&rdquo;).
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-border/60 bg-muted/20 p-4">
                  {/*
                    Multi-threshold list: each row is one "flag after N days"
                    rule. Users can add more (e.g. 3 days, 7 days, 10 days) so
                    staff get progressively firmer nudges as a thread ages.
                  */}
                  <div className="space-y-2">
                    {followUpDaysList.map((n, idx) => {
                      // Options: this row's current value plus any not-yet-used choices.
                      const usedElsewhere = new Set(
                        followUpDaysList.filter((_, i) => i !== idx),
                      );
                      const availableChoices = followUpDayChoices.filter(
                        (choice) => choice === n || !usedElsewhere.has(choice),
                      );
                      const isOnlyRow = followUpDaysList.length === 1;
                      const applyReplacement = (nextList: number[]) => {
                        if (followUpEnabled) {
                          requestConfirmedChange({
                            title: "Change follow-up thresholds live?",
                            fromLabel: followUpDaysList.map((d) => `${d}d`).join(", "),
                            toLabel: nextList.map((d) => `${d}d`).join(", "),
                            impact:
                              "Applies immediately to every SMS and Email thread in the inbox — cards that were flagged may fall off, and new ones may light up.",
                            onApply: () => onSetFollowUpDaysList(nextList),
                          });
                        } else {
                          onSetFollowUpDaysList(nextList);
                        }
                      };
                      return (
                        <div
                          key={`follow-up-row-${idx}`}
                          className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm"
                        >
                          <span>Flag threads with no reply after</span>
                          <Select
                            value={String(n)}
                            onValueChange={(v) => {
                              const next = Number(v);
                              if (!Number.isFinite(next) || next === n) return;
                              const nextList = followUpDaysList.map((d, i) => (i === idx ? next : d));
                              applyReplacement(nextList);
                            }}
                          >
                            <SelectTrigger className="h-8 w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableChoices.map((choice) => (
                                <SelectItem key={choice} value={String(choice)}>
                                  {choice} day{choice === 1 ? "" : "s"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-muted-foreground">from the lead or resident.</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-auto h-7 w-7 text-muted-foreground hover:text-destructive"
                            disabled={isOnlyRow}
                            title={isOnlyRow ? "At least one threshold is required" : "Remove this threshold"}
                            aria-label={isOnlyRow ? "At least one threshold is required" : `Remove ${n}-day threshold`}
                            onClick={() => {
                              if (isOnlyRow) return;
                              const nextList = followUpDaysList.filter((_, i) => i !== idx);
                              applyReplacement(nextList);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add-another-threshold row. Suggests the next unused choice. */}
                  {(() => {
                    const used = new Set(followUpDaysList);
                    const nextChoice = followUpDayChoices.find((c) => !used.has(c));
                    const canAdd = nextChoice !== undefined;
                    return (
                      <div className="mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          disabled={!canAdd}
                          title={canAdd ? undefined : "All available thresholds are already in use"}
                          onClick={() => {
                            if (!canAdd) return;
                            const nextList = [...followUpDaysList, nextChoice];
                            if (followUpEnabled) {
                              requestConfirmedChange({
                                title: "Add a new follow-up threshold live?",
                                fromLabel: followUpDaysList.map((d) => `${d}d`).join(", "),
                                toLabel: [...followUpDaysList, nextChoice].sort((a, b) => a - b).map((d) => `${d}d`).join(", "),
                                impact:
                                  "A new reminder threshold will start firing on qualifying threads immediately.",
                                onApply: () => onSetFollowUpDaysList(nextList),
                              });
                            } else {
                              onSetFollowUpDaysList(nextList);
                            }
                          }}
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Add follow-up threshold
                        </Button>
                      </div>
                    );
                  })()}

                  </div>

                  {/* Footer: status pill + primary action, one row. */}
                  <div className="flex items-center justify-between gap-3 border-t border-border/60 px-4 py-2.5">
                    {followUpEnabled ? (
                      <Badge className="h-auto gap-1.5 bg-status-success px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-status-success-foreground">
                        <span className="relative inline-flex h-1.5 w-1.5">
                          <span className="absolute inset-0 animate-ping rounded-full bg-status-success-foreground/60" />
                          <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-status-success-foreground" />
                        </span>
                        Active
                      </Badge>
                    ) : (
                      <Badge className="h-auto gap-1.5 border-transparent bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/50 ring-1 ring-muted-foreground/30" />
                        Inactive
                      </Badge>
                    )}
                    {followUpEnabled ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          requestConfirmedChange({
                            title: "Deactivate follow-up flagging live?",
                            fromLabel: "Active",
                            toLabel: "Inactive",
                            impact:
                              "Every card currently carrying a follow-up marker will lose it immediately.",
                            applyLabel: "Deactivate",
                            onApply: () => onToggleFollowUpEnabled(false),
                          })
                        }
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => onToggleFollowUpEnabled(true)}>
                        Activate follow-up
                      </Button>
                    )}
                  </div>
                </div>

                {/* --- Auto-close idle threads --- */}
                <div className="overflow-hidden rounded-lg border border-border bg-background">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Clock className="h-4 w-4" strokeWidth={2} aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          Auto-close idle threads
                        </p>
                        <p className="mt-1 text-xs leading-snug text-muted-foreground">
                          Automatically closes conversations that have gone
                          silent for the configured window. Only real messages
                          between staff, the lead, and the resident reset the
                          idle clock — non-message activity like escalation
                          labels, mode changes, private notes, or read
                          receipts doesn&apos;t count. Nothing is deleted;
                          closed threads stay in Closed Threads and can be
                          reopened any time.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-start gap-2 rounded-md border border-border/50 bg-muted/40 px-2.5 py-1.5 text-xxs leading-snug text-muted-foreground">
                      <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                      <p>
                        When a thread auto-closes, an{" "}
                        <span className="font-medium text-foreground">
                          activity note
                        </span>{" "}
                        is written to its timeline naming this setting and
                        the idle window that triggered it, so staff can tell
                        exactly why a conversation was closed.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-border/60 bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
                    <span>Close threads with no messages for</span>
                    <Select
                      value={String(autoCloseDays)}
                      onValueChange={(v) => {
                        const next = Number(v);
                        if (!Number.isFinite(next) || next === autoCloseDays) return;
                        if (autoCloseEnabled) {
                          requestConfirmedChange({
                            title: "Change the auto-close threshold live?",
                            fromLabel: `${autoCloseDays} day${autoCloseDays === 1 ? "" : "s"}`,
                            toLabel: `${next} day${next === 1 ? "" : "s"}`,
                            impact:
                              "Applies immediately to every open thread — some may auto-close on the next sweep, and some that were already queued may stay open longer.",
                            onApply: () => onSetAutoCloseDays(next),
                          });
                        } else {
                          onSetAutoCloseDays(next);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 w-[110px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {autoCloseDayChoices.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} day{n === 1 ? "" : "s"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">
                      from the lead, resident, or staff.
                    </span>
                  </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-border/60 px-4 py-2.5">
                    {autoCloseEnabled ? (
                      <Badge className="h-auto gap-1.5 bg-status-success px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-status-success-foreground">
                        <span className="relative inline-flex h-1.5 w-1.5">
                          <span className="absolute inset-0 animate-ping rounded-full bg-status-success-foreground/60" />
                          <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-status-success-foreground" />
                        </span>
                        Active
                      </Badge>
                    ) : (
                      <Badge className="h-auto gap-1.5 border-transparent bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/50 ring-1 ring-muted-foreground/30" />
                        Inactive
                      </Badge>
                    )}
                    {autoCloseEnabled ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          requestConfirmedChange({
                            title: "Deactivate auto-close live?",
                            fromLabel: "Active",
                            toLabel: "Inactive",
                            impact:
                              "No threads will be auto-closed while this is off — idle threads will simply sit in the inbox until someone resolves them.",
                            applyLabel: "Deactivate",
                            onApply: () => onToggleAutoCloseEnabled(false),
                          })
                        }
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => onToggleAutoCloseEnabled(true)}>
                        Activate auto-close
                      </Button>
                    )}
                  </div>
                </div>

                {/* --- Eli Prompt (SA 1.2 only) ---
                    When active, staff who reply to an escalated thread while
                    Eli is On get a modal asking whether to resolve the
                    escalation (Eli turns back on) or turn Eli off until the
                    escalation is resolved. Private notes never trigger it —
                    only public messages. The re-prompt cadence below
                    governs how often we re-nudge if staff dismisses. When
                    deactivated, staff replies leave Eli mode untouched. */}
                <div className="overflow-hidden rounded-lg border border-border bg-background">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Bot className="h-4 w-4" strokeWidth={2} aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          Prompt staff to manage Eli on escalated threads
                        </p>
                        <p className="mt-1 text-xs leading-snug text-muted-foreground">
                          When staff sends the first public reply on an
                          escalated thread while Eli is on, show a modal so
                          they can resolve the escalation (Eli turns back on)
                          or turn Eli off until the escalation is resolved.
                          Only fires on public messages — private notes are
                          ignored. Dismissing counts as &ldquo;decide later&rdquo;
                          and we&apos;ll re-nudge per the cadence below.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-start gap-2 rounded-md border border-border/50 bg-muted/40 px-2.5 py-1.5 text-xxs leading-snug text-muted-foreground">
                      <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                      <p>
                        When deactivated, staff replies leave Eli mode
                        untouched — staff manage Eli manually from the AI
                        On/Off popover on each thread.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-border/60 bg-muted/20 p-4">
                  {/* Cadence explainer — makes the "when does the prompt
                      fire again?" contract explicit before the picker.
                      Rule: the prompt fires the *first* time a staff
                      member sends a public reply on an escalated thread
                      while Eli is on. If they dismiss it, subsequent
                      sends do NOT re-fire the prompt until the cadence
                      window below has elapsed. The window is tracked
                      per (staff member × thread), so different staff
                      members are re-prompted independently. */}
                  <p className="mb-3 text-xs text-muted-foreground">
                    When a staff member sends a public reply, the Eli
                    Prompt fires the first time. If they dismiss it, the
                    prompt only re-appears on a later send if this much
                    time has passed since their last dismissal on this
                    thread.
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
                    <span>Re-prompt me every</span>
                    <Select
                      value={String(pendingCadenceValue)}
                      onValueChange={(v) => {
                        const nextValue = Number(v);
                        if (!Number.isFinite(nextValue) || nextValue === pendingCadenceValue) return;
                        const nextMinutes = cadenceToMinutes(nextValue, eliPromptCadenceUnit);
                        if (eliPromptEnabled) {
                          requestConfirmedChange({
                            title: "Change the Eli Prompt cadence live?",
                            fromLabel: cadenceLabelFor(pendingCadenceValue, eliPromptCadenceUnit),
                            toLabel: cadenceLabelFor(nextValue, eliPromptCadenceUnit),
                            impact:
                              "Applies immediately — staff who dismiss the prompt won't see it again until the new cadence has elapsed.",
                            onApply: () => {
                              setPendingCadenceValue(nextValue);
                              onSetEliPromptCadenceMinutes(nextMinutes);
                            },
                          });
                        } else {
                          setPendingCadenceValue(nextValue);
                          onSetEliPromptCadenceMinutes(nextMinutes);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 w-[80px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ELI_PROMPT_CADENCE_CHOICES[eliPromptCadenceUnit].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={eliPromptCadenceUnit}
                      onValueChange={(v) => {
                        const nextUnit = v as EliPromptCadenceUnit;
                        if (nextUnit === eliPromptCadenceUnit) return;
                        // Snap to the first choice in the new unit so we always
                        // land on a valid dropdown value.
                        const firstChoice = ELI_PROMPT_CADENCE_CHOICES[nextUnit][0];
                        const nextMinutes = cadenceToMinutes(firstChoice, nextUnit);
                        if (eliPromptEnabled) {
                          requestConfirmedChange({
                            title: "Change the Eli Prompt cadence live?",
                            fromLabel: cadenceLabelFor(pendingCadenceValue, eliPromptCadenceUnit),
                            toLabel: cadenceLabelFor(firstChoice, nextUnit),
                            impact:
                              "Applies immediately — staff who dismiss the prompt won't see it again until the new cadence has elapsed.",
                            onApply: () => {
                              onSetEliPromptCadenceUnit(nextUnit);
                              setPendingCadenceValue(firstChoice);
                              onSetEliPromptCadenceMinutes(nextMinutes);
                            },
                          });
                        } else {
                          onSetEliPromptCadenceUnit(nextUnit);
                          setPendingCadenceValue(firstChoice);
                          onSetEliPromptCadenceMinutes(nextMinutes);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 w-[110px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">
                      per staff member per thread.
                    </span>
                  </div>

                  {/* Default option — which of the two cards is
                      pre-selected when the Eli Prompt modal opens for staff.
                      The modal itself always shows both options; the picker
                      here just decides which one starts highlighted. Both
                      `promptOptionOffEnabled` / `promptOptionKeepOnEnabled`
                      state still exists in the demo context (and gates the
                      modal rendering + `handleSend` fallback), but the
                      per-option "hide from modal" checkboxes were removed
                      per design feedback — staff always sees the full choice
                      set. */}
                  <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-border/60 pt-3 text-sm">
                    <span className="font-medium text-foreground">Default option</span>
                    <Select
                      value={eliPromptDefaultOption}
                      onValueChange={(v) => {
                        const next = v as "off" | "on";
                        if (next === eliPromptDefaultOption) return;
                        onSetEliPromptDefaultOption(next);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="on">
                          Resolve escalation and Eli turns back on
                        </SelectItem>
                        <SelectItem value="off">
                          Turn Eli off until the escalation is resolved
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">
                      pre-selected when the modal opens.
                    </span>
                  </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-border/60 px-4 py-2.5">
                    {eliPromptEnabled ? (
                      <Badge className="h-auto gap-1.5 bg-status-success px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-status-success-foreground">
                        <span className="relative inline-flex h-1.5 w-1.5">
                          <span className="absolute inset-0 animate-ping rounded-full bg-status-success-foreground/60" />
                          <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-status-success-foreground" />
                        </span>
                        Active
                      </Badge>
                    ) : (
                      <Badge className="h-auto gap-1.5 border-transparent bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/50 ring-1 ring-muted-foreground/30" />
                        Inactive
                      </Badge>
                    )}
                    {eliPromptEnabled ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          requestConfirmedChange({
                            title: "Deactivate the Eli Prompt live?",
                            fromLabel: "Active",
                            toLabel: "Inactive",
                            impact:
                              "Staff won't see a modal when they reply to escalated threads. Nothing will happen to Eli automatically — staff will need to manage Eli's mode manually from the thread's AI On/Off popover.",
                            applyLabel: "Deactivate",
                            onApply: () => onToggleEliPromptEnabled(false),
                          })
                        }
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => onToggleEliPromptEnabled(true)}>
                        Activate Eli Prompt
                      </Button>
                    )}
                  </div>
                </div>

              </>
            )}
          </div>
        </div>
      </div>

      {/* Shared "change this setting live?" dialog. Any control that produces a
          live change calls `requestConfirmedChange({...})` and this dialog opens
          with a consistent title/from-to/impact/footer format across the panel. */}
      <Dialog
        open={pendingChange !== null}
        onOpenChange={(open) => {
          if (!open) setPendingChange(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{pendingChange?.title ?? "Change this setting live?"}</DialogTitle>
            <DialogDescription className="pt-2">
              {pendingChange ? (
                <>
                  You&apos;re about to change this setting from{" "}
                  <span className="font-medium text-foreground">
                    {pendingChange.fromLabel}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-foreground">
                    {pendingChange.toLabel}
                  </span>
                  . {pendingChange.impact}
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingChange(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                pendingChange?.onApply();
                setPendingChange(null);
              }}
            >
              {pendingChange?.applyLabel ?? "Apply change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CallSystemSettingsPanel({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<CallSystemTab>("softphone");
  // Routing/queue state moved into `lib/call-routing-context.tsx`. The
  // Routing and Queue tabs now render the extracted panels directly.

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Call System Settings</h2>
          <p className="text-sm text-muted-foreground">Configure call routing, IVR, AI voice agents, and phone system settings</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Tab navigation */}
        <div className="w-[200px] shrink-0 border-r border-border bg-muted/30 p-2">
          <ul className="space-y-0.5">
            {CALL_SYSTEM_TABS.map((tab) => (
              <li key={tab.id}>
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                    activeTab === tab.id
                      ? "bg-background font-medium text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "softphone" && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h3 className="text-base font-semibold">Softphone & WebRTC Client</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Browser-based softphone powered by Twilio Client SDK. Agents answer and make calls directly within Entrata — no desk phone, personal cell, or separate app required.
                </p>
              </div>

              <div className="rounded-lg border border-border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">WebRTC Softphone</label>
                    <p className="text-xs text-muted-foreground mt-0.5">Enable browser-based calling for agents</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="rounded-lg border border-border p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium">Agent Status Options</label>
                  <p className="text-xs text-muted-foreground mt-0.5">Configure available agent presence states</p>
                </div>
                <div className="space-y-2">
                  {[
                    { status: "Available", desc: "Ready to receive calls", color: "bg-emerald-500", enabled: true },
                    { status: "Away", desc: "Temporarily unavailable", color: "bg-amber-500", enabled: true },
                    { status: "On Break", desc: "Scheduled break, no calls", color: "bg-orange-500", enabled: true },
                    { status: "In Meeting", desc: "Do not disturb", color: "bg-purple-500", enabled: true },
                    { status: "Offline", desc: "Logged out of phone system", color: "bg-gray-400", enabled: true },
                  ].map((s) => (
                    <div key={s.status} className="flex items-center justify-between rounded border border-border px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className={cn("h-2.5 w-2.5 rounded-full", s.color)} />
                        <div>
                          <p className="text-sm font-medium">{s.status}</p>
                          <p className="text-xs text-muted-foreground">{s.desc}</p>
                        </div>
                      </div>
                      <Switch defaultChecked={s.enabled} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium">Call Controls</label>
                  <p className="text-xs text-muted-foreground mt-0.5">Active call features available to agents</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { feature: "Mute/Unmute", enabled: true },
                    { feature: "Hold", enabled: true },
                    { feature: "Blind Transfer", enabled: true },
                    { feature: "Warm Transfer", enabled: true },
                    { feature: "DTMF Keypad", enabled: true },
                    { feature: "Conference (3-way)", enabled: false },
                  ].map((f) => (
                    <div key={f.feature} className="flex items-center justify-between rounded border border-border px-3 py-2">
                      <span className="text-sm">{f.feature}</span>
                      <Switch defaultChecked={f.enabled} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium">Browser & Audio</label>
                  <p className="text-xs text-muted-foreground mt-0.5">Audio and connectivity settings</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <div>
                      <p className="text-sm">Network quality indicator</p>
                      <p className="text-xs text-muted-foreground">Show connection quality during calls</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <div>
                      <p className="text-sm">Desktop notifications for incoming calls</p>
                      <p className="text-xs text-muted-foreground">Browser push notification when a call comes in</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <div>
                      <p className="text-sm">Ringtone sound</p>
                      <p className="text-xs text-muted-foreground">Audio alert for incoming calls</p>
                    </div>
                    <Select defaultValue="default">
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="gentle">Gentle</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="silent">Silent (visual only)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium">Supported Browsers</label>
                  <p className="text-xs text-muted-foreground mt-0.5">WebRTC support status</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { browser: "Chrome", status: "Full support" },
                    { browser: "Edge", status: "Full support" },
                    { browser: "Firefox", status: "Full support" },
                    { browser: "Safari", status: "Partial (no DTMF)" },
                    { browser: "Mobile browsers", status: "Not supported (V1)" },
                  ].map((b) => (
                    <div key={b.browser} className="rounded border border-border px-3 py-2 text-center">
                      <p className="text-sm font-medium">{b.browser}</p>
                      <p className="text-[10px] text-muted-foreground">{b.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "queue" && <CallQueuePanel />}

          {activeTab === "routing" && <CallRoutingPanel />}



              </div>
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <ConversationsContent />
    </Suspense>
  );
}

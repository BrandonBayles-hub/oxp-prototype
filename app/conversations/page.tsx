"use client";

import {
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  MessageCircle,
  Search,
  Plus,
  X,
  Check,
  ChevronDown,
  Paperclip,
  ArrowUp,
  MessageSquare,
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
  Smile,
  Mic,
  SendHorizontal,
  Sparkles,
  RefreshCw,
  UserMinus,
  Link2,
  SlidersHorizontal,
  CircleHelp,
} from "lucide-react";
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
  videoDialogOverlayClassName,
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
  isWaitingOnResidentPublicReply,
  satisfiesEscalatedPropertyInboxLabels,
  conversationHasCurrentUserPrivateNoteMention,
  getLinkedConversationsByEscalation,
} from "@/lib/conversations-context";
import { useAgents } from "@/lib/agents-context";
import { useWorkforce } from "@/lib/workforce-context";
import { cn } from "@/lib/utils";
import {
  buildStaffEmailSignatureBody,
  getEmailThreadRoutingAddresses,
  getPropertyFromChannelOptionsForProperty,
  getVoiceOrSmsThreadRoutingNumbers,
} from "@/lib/email-signature";
import { useClickToCallDemo } from "@/lib/click-to-call-demo-context";
import { useConversationsDemo } from "@/lib/conversations-demo-context";
import {
  ClickToCallFloatingPanel,
  CLICK_TO_CALL_FOLLOWUP_UNASSIGNED,
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

/** Canonical property id → sidebar inbox name (filter value stays canonical). */
const PROPERTY_INBOX_SIDEBAR_LABELS: Record<string, string> = {
  "Hillside Living": "Escalated Hillside Living",
  "Jamison Apartments": "Escalated Jamison Apartments",
};

function propertyInboxSidebarLabel(property: string) {
  return PROPERTY_INBOX_SIDEBAR_LABELS[property] ?? property;
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
]);

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
  if (c.status !== "open") return false;
  if (c.hasUnread) return true;
  return !isWaitingOnResidentPublicReply(c);
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

type SidebarFilter =
  | "all"
  | "mentions"
  | "unattended"
  | { type: "label"; value: string }
  | { type: "property"; value: string }
  | { type: "live-ai-jamison" }
  | { type: "live-ai-hillside" };

type ThreadListConvoTypeFilter = "escalated" | "liveAi";

/** Open Threads: open only; unread, @mention in a private note, or unattended. Resolved threads never appear here. */
function conversationMatchesAllThreadsInbox(c: ConversationItem): boolean {
  if (c.status !== "open") return false;
  return (
    c.hasUnread ||
    conversationHasCurrentUserPrivateNoteMention(c) ||
    isConversationUnattended(c)
  );
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
                      <span className="truncate">{label}</span>
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
  if (channel === "Phone") {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-purple-200 bg-purple-50 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-purple-800 dark:border-purple-900/60 dark:bg-purple-950/50 dark:text-purple-200"
        aria-label="Phone thread"
      >
        <PhoneCall className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
        Phone
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

  const { clickToCallEnabled } = useClickToCallDemo();
  const { profileCommsPopupRequest } = useConversationsDemo();

  const clickToCallAssigneeOptions = useMemo(() => {
    const rest = humanMembers
      .filter((m) => m.name !== MY_INBOX_ASSIGNEE)
      .map((m) => ({ value: m.name, label: m.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [
      { value: CLICK_TO_CALL_FOLLOWUP_UNASSIGNED, label: "Unassigned" },
      { value: MY_INBOX_ASSIGNEE, label: "Assign to me" },
      ...rest,
    ];
  }, [humanMembers]);

  const [clickToCallSession, setClickToCallSession] = useState<ClickToCallSessionInput | null>(null);
  const [callConfirmOpen, setCallConfirmOpen] = useState(false);
  const [callConfirmDraft, setCallConfirmDraft] = useState<ClickToCallSessionInput | null>(null);
  const [showCallbackInput, setShowCallbackInput] = useState(false);
  const [callbackNumber, setCallbackNumber] = useState("");

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
  const [searchQuery, setSearchQuery] = useState("");
  const [threadListFiltersOpen, setThreadListFiltersOpen] = useState(false);
  const [threadListConvoTypes, setThreadListConvoTypes] = useState<Set<ThreadListConvoTypeFilter>>(
    () => new Set(["escalated"])
  );
  /** `null` = all properties (default). */
  const [threadListPropertyKeys, setThreadListPropertyKeys] = useState<Set<string> | null>(null);

  const isEscalationLabel = (label: string) => label.endsWith("Escalation");

  const allConversationPropertyNames = useMemo(() => {
    const s = new Set<string>();
    for (const c of conversations) s.add(c.property);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [conversations]);

  const threadFiltersAreNonDefault =
    threadListPropertyKeys !== null ||
    threadListConvoTypes.size !== 1 ||
    !threadListConvoTypes.has("escalated");

  const threadListConvoSummary = useMemo(() => {
    const parts: string[] = [];
    if (threadListConvoTypes.has("escalated")) parts.push("Escalated");
    if (threadListConvoTypes.has("liveAi")) parts.push("Non-Escalated");
    if (parts.length === 0) return "None selected";
    return parts.join(", ");
  }, [threadListConvoTypes]);

  const threadListPropertySummary = useMemo(() => {
    if (threadListPropertyKeys === null) return "All properties";
    const n = threadListPropertyKeys.size;
    if (n === 0) return "No properties";
    if (n === allConversationPropertyNames.length) return "All properties";
    if (n <= 2) return [...threadListPropertyKeys].sort((a, b) => a.localeCompare(b)).join(", ");
    return `${n} properties`;
  }, [threadListPropertyKeys, allConversationPropertyNames]);

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

  /** Sum of unread resident messages across threads in “Open Threads” (mention/unattended-only threads contribute 0). */
  const allThreadsUnreadCount = useMemo(() => {
    let total = 0;
    for (const c of conversations) {
      if (!conversationMatchesAllThreadsInbox(c)) continue;
      total += countUnreadResidentMessagesInThread(c);
    }
    return total;
  }, [conversations]);

  const mentionsInboxCount = useMemo(
    () => conversations.filter((c) => conversationHasCurrentUserPrivateNoteMention(c)).length,
    [conversations]
  );

  const unattendedInboxCount = useMemo(
    () => conversations.filter((c) => isConversationUnattended(c)).length,
    [conversations]
  );

  /** Sidebar badges: unread threads in that inbox’s conversation list (hasUnread). */
  const escalationUnreadCount = useMemo(
    () =>
      conversations.filter((c) => c.labels.some(isEscalationLabel) && c.hasUnread).length,
    [conversations]
  );

  const liveAiJamisonUnreadCount = useMemo(
    () => conversations.filter((c) => isLiveAiJamisonConversation(c) && c.hasUnread).length,
    [conversations]
  );

  const liveAiHillsideUnreadCount = useMemo(
    () => conversations.filter((c) => isLiveAiHillsideConversation(c) && c.hasUnread).length,
    [conversations]
  );

  const properties = useMemo(() => {
    const unreadByProp = new Map<string, number>();
    const seenProp = new Set<string>();
    for (const c of conversations) {
      if (
        (c.property === "Hillside Living" || c.property === "Jamison Apartments") &&
        !satisfiesEscalatedPropertyInboxLabels(c)
      ) {
        continue;
      }
      seenProp.add(c.property);
      if (c.hasUnread) {
        unreadByProp.set(c.property, (unreadByProp.get(c.property) ?? 0) + 1);
      }
    }
    return Array.from(seenProp)
      .sort((a, b) => a.localeCompare(b))
      .map((prop) => [prop, unreadByProp.get(prop) ?? 0] as [string, number]);
  }, [conversations]);

  const sidebarFiltered = useMemo(() => {
    return conversations.filter((c) => {
      if (sidebarFilter === "all") return conversationMatchesAllThreadsInbox(c);
      if (sidebarFilter === "mentions") return conversationHasCurrentUserPrivateNoteMention(c);
      if (sidebarFilter === "unattended") return isConversationUnattended(c);
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
      return true;
    });
  }, [conversations, sidebarFilter]);

  const tabFiltered = useMemo(() => {
    return sidebarFiltered.filter((c) => {
      if (inboxTab === "all") return true;
      if (inboxTab === "mine") return c.assignee === MY_INBOX_ASSIGNEE;
      if (inboxTab === "unassigned")
        return c.assignee.startsWith("ELI+") || c.assignee === CONVERSATION_UNASSIGNED_ASSIGNEE;
      return true;
    });
  }, [sidebarFiltered, inboxTab]);

  const threadListConvoFiltered = useMemo(() => {
    if (threadListConvoTypes.size === 0) return tabFiltered;
    return tabFiltered.filter((c) => {
      if (threadListConvoTypes.has("escalated") && matchesThreadListEscalatedFilter(c)) return true;
      if (threadListConvoTypes.has("liveAi") && matchesThreadListLiveAiNonEscalatedFilter(c)) return true;
      return false;
    });
  }, [tabFiltered, threadListConvoTypes]);

  const threadListFiltered = useMemo(() => {
    if (threadListPropertyKeys === null) return threadListConvoFiltered;
    return threadListConvoFiltered.filter((c) => threadListPropertyKeys.has(c.property));
  }, [threadListConvoFiltered, threadListPropertyKeys]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return threadListFiltered;
    const q = searchQuery.toLowerCase();
    return threadListFiltered.filter(
      (c) =>
        c.resident.toLowerCase().includes(q) ||
        c.preview.toLowerCase().includes(q) ||
        c.labels.some((l) => l.toLowerCase().includes(q))
    );
  }, [threadListFiltered, searchQuery]);

  const myInboxUnreadCount = useMemo(
    () =>
      sidebarFiltered.filter((c) => c.assignee === MY_INBOX_ASSIGNEE && c.hasUnread).length,
    [sidebarFiltered]
  );

  const searchParams = useSearchParams();
  const initialConvoId = searchParams.get("id");

  const [selectedId, setSelectedId] = useState<string | null>(initialConvoId);
  const didInitFromParam = useRef(false);

  useEffect(() => {
    if (initialConvoId && !didInitFromParam.current) {
      const match = conversations.find((c) => c.id === initialConvoId);
      if (match) {
        setSelectedId(initialConvoId);
        didInitFromParam.current = true;
        return;
      }
    }
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
  }, [filtered, selectedId, initialConvoId, conversations]);

  const selected: ConversationItem | null = useMemo(() => {
    if (!selectedId) return null;
    return filtered.find((c) => c.id === selectedId) ?? conversations.find((c) => c.id === selectedId) ?? null;
  }, [selectedId, filtered, conversations]);

  const linkedByEscalation = useMemo(() => {
    if (!selected?.escalationId) return [];
    return getLinkedConversationsByEscalation(conversations, selected.id, selected.escalationId);
  }, [conversations, selected?.id, selected?.escalationId]);

  const selectedEmailRouting =
    selected?.channel === "Email"
      ? getEmailThreadRoutingAddresses(selected.resident, selected.property)
      : null;

  // scroll to bottom on message change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [selected?.messages.length]);

  // --- Chat input ---
  const [inputMode, setInputMode] = useState<"message" | "private_note">("message");
  const [draft, setDraft] = useState("");
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null);
  /** Entrata profile “current inbox” composer — same draft/inputMode as main, separate ref for @mentions. */
  const profilePanelInboxComposerRef = useRef<HTMLTextAreaElement>(null);
  const [privateNoteMention, setPrivateNoteMention] = useState<PrivateNoteMentionActive | null>(null);
  const [privateNoteMentionIndex, setPrivateNoteMentionIndex] = useState(0);

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
    from: string;
    propertyName: string;
  } | null>(null);
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
  const [messageIntroDismissed, setMessageIntroDismissed] = useState(false);
  const [showMessageIntro, setShowMessageIntro] = useState(false);
  const messageIntroVideoRef = useRef<HTMLVideoElement>(null);
  /** True after the muted 0–3s cover preview has finished (paused at ~3s). Next play restarts from 0 with sound. */
  const messageIntroPreviewCompletedRef = useRef(false);

  /** Demo control: Entrata profile overlay only (no right-hand conversation / threads panel). */
  useEffect(() => {
    if (profileCommsPopupRequest === 0) return;
    if (!selected) return;
    setShowMessageIntro(false);
    setProfileModalOpen(true);
    setThreadsPanelOpen(false);
    setProfilePanelInboxOpen(false);
    setOpenThreadIdx(null);
    setNewThreadOutbound(null);
  }, [profileCommsPopupRequest, selected]);

  useEffect(() => {
    if (!showMessageIntro) {
      messageIntroVideoRef.current?.pause();
      messageIntroPreviewCompletedRef.current = false;
      return;
    }

    const v = messageIntroVideoRef.current;
    if (!v) return;

    messageIntroPreviewCompletedRef.current = false;

    const onTimeUpdate = () => {
      if (v.currentTime >= 3) {
        v.pause();
        v.removeEventListener("timeupdate", onTimeUpdate);
        messageIntroPreviewCompletedRef.current = true;
      }
    };

    const startCoverPreview = () => {
      v.muted = true;
      v.currentTime = 0;
      v.addEventListener("timeupdate", onTimeUpdate);
      void v.play().catch(() => {
        v.removeEventListener("timeupdate", onTimeUpdate);
      });
    };

    if (v.readyState >= 2) startCoverPreview();
    else v.addEventListener("loadeddata", startCoverPreview, { once: true });

    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("loadeddata", startCoverPreview);
    };
  }, [showMessageIntro]);

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
      messages: [
        { role: "user" as const, text: "Hi, my kitchen sink has been leaking for two days now. Can someone come take a look?", timestamp: "Sep 15 2025 · 3:12pm" },
        { role: "agent" as const, text: "I'm sorry to hear that! I've submitted a work order for your kitchen sink leak. A maintenance technician will reach out to schedule a time.", timestamp: "Sep 15 2025 · 3:14pm" },
        { role: "user" as const, text: "Thank you. Is there anything I should do in the meantime?", timestamp: "Sep 15 2025 · 3:15pm" },
        { role: "agent" as const, text: "If it's a slow drip, placing a bucket underneath should be fine. If it worsens, please call our emergency maintenance line.", timestamp: "Sep 15 2025 · 3:16pm" },
      ],
    },
    {
      property: "Sun Valley", type: "Office", channel: "SMS", status: "active", assignee: null,
      messages: [
        { role: "user" as const, text: "I noticed a late fee on my account but I paid rent on time. Can you look into this?", timestamp: "Sep 14 2025 · 10:05am" },
        { role: "staff" as const, text: "Let me pull up your payment history. One moment please.", timestamp: "Sep 14 2025 · 10:08am" },
        { role: "staff" as const, text: "It looks like your payment was processed on the 4th but didn't clear until the 6th due to a bank delay. I've removed the late fee from your ledger.", timestamp: "Sep 14 2025 · 10:12am" },
        { role: "user" as const, text: "Great, thank you for fixing that so quickly!", timestamp: "Sep 14 2025 · 10:13am" },
      ],
    },
    {
      property: "Sun Valley", type: "Facilities", channel: "SMS", status: "active", assignee: "Jane Doe",
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
      messages: [
        { role: "user" as const, text: "I need a copy of my payment history for the last 6 months for my tax filing.", timestamp: "Aug 10 2025 · 2:00pm" },
        { role: "staff" as const, text: "Of course! I've generated a ledger statement for the past 6 months and uploaded it to your resident portal under Documents.", timestamp: "Aug 10 2025 · 2:15pm" },
        { role: "user" as const, text: "Perfect, I see it. Thank you!", timestamp: "Aug 10 2025 · 2:20pm" },
      ],
    },
    {
      property: "Sun Valley", type: "Facilities", channel: "SMS", status: "closed", assignee: "Jane Doe",
      messages: [
        { role: "user" as const, text: "The garage gate clicker stopped working again.", timestamp: "Jul 18 2025 · 4:42pm" },
        { role: "staff" as const, text: "Sorry about that. I've reprogrammed your remote and tested it just now — please let me know if it gives you any more trouble.", timestamp: "Jul 18 2025 · 5:01pm" },
        { role: "user" as const, text: "Working great, thank you!", timestamp: "Jul 18 2025 · 5:10pm" },
      ],
    },
    {
      property: "Sun Valley", type: "Leasing", channel: "Email", status: "closed", assignee: "Mark Lee",
      messages: [
        { role: "user" as const, text: "Following up on the parking permit transfer to my new vehicle.", timestamp: "Jun 30 2025 · 10:15am" },
        { role: "staff" as const, text: "Got it — transferred the permit to your new plate and emailed the updated decal info.", timestamp: "Jun 30 2025 · 11:02am" },
      ],
    },
    {
      property: "Sun Valley", type: "Office", channel: "SMS", status: "closed", assignee: "Court White",
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

  const handleSend = () => {
    if (!draft.trim() || !selected) return;
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
    const emailSignature =
      selected.channel === "Email" && inputMode === "message"
        ? staffEmailSignatureForConversation(selected, humanNameSet, humanMembers)
        : undefined;
    addMessage(selected.id, {
      role: "staff",
      text: draft.trim(),
      timestamp,
      type: inputMode,
      ...(emailSignature ? { emailSignature } : {}),
      ...(inputMode === "private_note" ? { privateNoteAuthor: MY_INBOX_ASSIGNEE } : {}),
    });
    setDraft("");
    setPrivateNoteMention(null);
  };

  /** Entrata profile side-panel thread composer (mock threads + new thread). */
  const handleProfileEntThreadSend = () => {
    const text = threadDraft.trim();
    if (!text || openThreadIdx === null || !selected) return;
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
        sidebarFilter.type === "live-ai-hillside"
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
          <ul className="space-y-0.5">
            {([
              { id: "all" as const, icon: Inbox, label: "Open Threads" },
              { id: "mentions" as const, icon: AtSign, label: "Mentions" },
              { id: "unattended" as const, icon: Clock, label: "Needs Action" },
            ] as const).map((item) => (
              <li key={item.id}>
                <Button
                  variant={isSidebarActive(item.id) ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2.5 font-normal",
                    isSidebarActive(item.id) && "font-medium"
                  )}
                  onClick={() => setSidebarFilter(item.id)}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 text-left">{item.label}</span>
                  {item.id === "all" && allThreadsUnreadCount > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 shrink-0 justify-center px-1.5 text-[10px]">
                      {allThreadsUnreadCount}
                    </Badge>
                  )}
                  {item.id === "mentions" && mentionsInboxCount > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 shrink-0 justify-center px-1.5 text-[10px]">
                      {mentionsInboxCount}
                    </Badge>
                  )}
                  {item.id === "unattended" && unattendedInboxCount > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 shrink-0 justify-center px-1.5 text-[10px]">
                      {unattendedInboxCount}
                    </Badge>
                  )}
                </Button>
              </li>
            ))}
          </ul>

          <div className="my-3 h-px bg-border" />

          <h3 className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Custom Inboxes
          </h3>
          <ul className="space-y-0.5">
            <li>
              <Button
                variant={isSidebarActive({ type: "label", value: "__escalation__" }) ? "secondary" : "ghost"}
                className={cn(
                  "h-auto min-h-9 w-full items-start justify-start gap-2.5 whitespace-normal py-2 font-normal",
                  isSidebarActive({ type: "label", value: "__escalation__" }) && "font-medium"
                )}
                onClick={() => setSidebarFilter({ type: "label", value: "__escalation__" })}
              >
                <span className="min-w-0 flex-1 text-left leading-snug break-words">AI Escalations</span>
                {escalationUnreadCount > 0 && (
                  <Badge variant="destructive" className="mt-0.5 h-5 min-w-5 shrink-0 justify-center px-1.5 text-[10px]">
                    {escalationUnreadCount}
                  </Badge>
                )}
              </Button>
            </li>
            {properties.map(([prop, unreadCount]) => (
              <Fragment key={prop}>
                <li>
                  <Button
                    variant={isSidebarActive({ type: "property", value: prop }) ? "secondary" : "ghost"}
                    className={cn(
                      "h-auto min-h-9 w-full items-start justify-start gap-2.5 whitespace-normal py-2 font-normal",
                      isSidebarActive({ type: "property", value: prop }) && "font-medium"
                    )}
                    onClick={() => setSidebarFilter({ type: "property", value: prop })}
                  >
                    <span className="min-w-0 flex-1 text-left leading-snug break-words">
                      {propertyInboxSidebarLabel(prop)}
                    </span>
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="mt-0.5 h-5 min-w-5 shrink-0 justify-center px-1.5 text-[10px]">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </li>
                {prop === "Hillside Living" && (
                  <li>
                    <Button
                      variant={isSidebarActive({ type: "live-ai-hillside" }) ? "secondary" : "ghost"}
                      className={cn(
                        "h-auto min-h-9 w-full items-start justify-start gap-2.5 whitespace-normal py-2 font-normal",
                        isSidebarActive({ type: "live-ai-hillside" }) && "font-medium"
                      )}
                      onClick={() => setSidebarFilter({ type: "live-ai-hillside" })}
                    >
                      <span className="min-w-0 flex-1 text-left leading-snug break-words">
                        Live AI Hillside Living
                      </span>
                      {liveAiHillsideUnreadCount > 0 && (
                        <Badge variant="destructive" className="mt-0.5 h-5 min-w-5 shrink-0 justify-center px-1.5 text-[10px]">
                          {liveAiHillsideUnreadCount}
                        </Badge>
                      )}
                    </Button>
                  </li>
                )}
                {prop === "Jamison Apartments" && (
                  <li>
                    <Button
                      variant={isSidebarActive({ type: "live-ai-jamison" }) ? "secondary" : "ghost"}
                      className={cn(
                        "h-auto min-h-9 w-full items-start justify-start gap-2.5 whitespace-normal py-2 font-normal",
                        isSidebarActive({ type: "live-ai-jamison" }) && "font-medium"
                      )}
                      onClick={() => setSidebarFilter({ type: "live-ai-jamison" })}
                    >
                      <span className="min-w-0 flex-1 text-left leading-snug break-words">
                        Live AI Jamison Apartments
                      </span>
                      {liveAiJamisonUnreadCount > 0 && (
                        <Badge variant="destructive" className="mt-0.5 h-5 min-w-5 shrink-0 justify-center px-1.5 text-[10px]">
                          {liveAiJamisonUnreadCount}
                        </Badge>
                      )}
                    </Button>
                  </li>
                )}
              </Fragment>
            ))}
          </ul>

          <div className="my-3 h-px bg-border" />

          <h3 className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Settings
          </h3>
          <ul className="space-y-0.5">
            {(["Email Integration", "Manage Inboxes", "Manage Labels", "Reporting"]).map((label) => (
              <li key={label}>
                {label === "Email Integration" ? (
                  <Link href="/communications-setup/custom-email">
                    <Button variant="ghost" className="w-full justify-start font-normal">
                      {label}
                    </Button>
                  </Link>
                ) : (
                  <Button variant="ghost" className="w-full justify-start font-normal">
                    {label}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* ===== CONVERSATION LIST ===== */}
      <div className="flex w-[340px] shrink-0 flex-col border-r border-border bg-card">
        {/* Tabs bar + thread list filters */}
        <div className="space-y-2 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Tabs value={inboxTab} onValueChange={setInboxTab} className="min-w-0 flex-1">
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
            <Button
              type="button"
              variant={threadListFiltersOpen || threadFiltersAreNonDefault ? "secondary" : "ghost"}
              size="icon"
              className="relative h-9 w-9 shrink-0"
              aria-label="More thread filters"
              aria-expanded={threadListFiltersOpen}
              onClick={() => setThreadListFiltersOpen((open) => !open)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {threadFiltersAreNonDefault && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              )}
            </Button>
          </div>

          {threadListFiltersOpen && (
            <div className="space-y-2.5 rounded-lg border border-border bg-muted/30 p-2.5">
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Conversations filter
                </p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-full justify-between gap-2 px-2 text-xs font-normal"
                    >
                      <span className="truncate">{threadListConvoSummary}</span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] max-h-[min(320px,70vh)] overflow-y-auto p-2"
                    align="start"
                    sideOffset={4}
                  >
                    <TooltipProvider delayDuration={200}>
                      <p className="mb-2 text-[10px] font-medium text-muted-foreground">
                        Select one or both
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-start gap-1.5 rounded-md px-1 py-0.5 hover:bg-accent/60">
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
                            className="min-w-0 flex-1 cursor-pointer text-xs font-normal leading-snug text-foreground"
                          >
                            Escalated conversations
                          </label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="mt-0.5 shrink-0 rounded-sm text-muted-foreground outline-none ring-offset-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label="What counts as Escalated conversations"
                              >
                                <CircleHelp className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[240px] text-xs leading-snug">
                              Open, unresolved threads where the lead or resident is waiting on staff next on
                              the public thread: includes unread messages and threads whose last public
                              message is from the lead or resident (not staff or the AI).
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex items-start gap-1.5 rounded-md px-1 py-0.5 hover:bg-accent/60">
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
                            className="min-w-0 flex-1 cursor-pointer text-xs font-normal leading-snug text-foreground"
                          >
                            Non-Escalated
                          </label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="mt-0.5 shrink-0 rounded-sm text-muted-foreground outline-none ring-offset-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label="What counts as Non-Escalated"
                              >
                                <CircleHelp className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[240px] text-xs leading-snug">
                              Threads where the last public message is from staff or the AI (waiting on the
                              lead or resident next), plus primary ELI AI lanes that do not carry an escalation
                              label.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </TooltipProvider>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Properties filter
                </p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-full justify-between gap-2 px-2 text-xs font-normal"
                    >
                      <span className="truncate">{threadListPropertySummary}</span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] max-h-[min(320px,70vh)] overflow-y-auto p-2"
                    align="start"
                    sideOffset={4}
                  >
                    <p className="mb-2 text-[10px] font-medium text-muted-foreground">Properties</p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 rounded-md px-1 py-0.5 hover:bg-accent/60">
                        <Checkbox
                          id="thread-filter-prop-all"
                          className="mt-0.5"
                          checked={threadListPropertyKeys === null}
                          onCheckedChange={(c) => {
                            if (c === "indeterminate") return;
                            if (c) setThreadListPropertyKeys(null);
                            else setThreadListPropertyKeys(new Set());
                          }}
                        />
                        <label
                          htmlFor="thread-filter-prop-all"
                          className="cursor-pointer text-xs font-normal leading-snug text-foreground"
                        >
                          All properties
                        </label>
                      </div>
                      <div className="my-1 h-px bg-border" />
                      {allConversationPropertyNames.map((prop) => {
                        const propChecked =
                          threadListPropertyKeys === null || threadListPropertyKeys.has(prop);
                        return (
                          <div
                            key={prop}
                            className="flex items-start gap-2 rounded-md px-1 py-0.5 hover:bg-accent/60"
                          >
                            <Checkbox
                              id={`thread-filter-prop-${prop}`}
                              className="mt-0.5"
                              checked={propChecked}
                              onCheckedChange={(c) => {
                                if (c === "indeterminate") return;
                                const shouldCheck = c === true;
                                if (shouldCheck !== propChecked) toggleThreadListProperty(prop);
                              }}
                            />
                            <label
                              htmlFor={`thread-filter-prop-${prop}`}
                              className="cursor-pointer text-xs font-normal leading-snug text-foreground"
                            >
                              {prop}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>

        {/* Search + actions */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Threads"
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* List */}
        <TooltipProvider delayDuration={250}>
          <div className="flex-1 overflow-y-auto scrollbar-hover">
            {filtered.length > 0 ? (
              <ul>
                {filtered.map((convo) => {
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
                        onClick={() => { setSelectedId(convo.id); markRead(convo.id, MY_INBOX_ASSIGNEE); }}
                        className={cn(
                          "relative flex w-full flex-col gap-1 py-3 pl-4 pr-4 text-left transition-colors",
                          isActive
                            ? "border-l-2 border-l-primary bg-accent"
                            : "hover:bg-accent/50"
                        )}
                      >
                        {convo.hasUnread && !isActive && (
                          <span className="absolute left-1.5 top-4 h-2 w-2 rounded-full bg-destructive" />
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
                          <ConversationListChannelChip channel={convo.channel} />
                        </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("truncate text-sm", convo.hasUnread ? "font-bold" : "font-semibold")}>
                          {convo.resident}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{convo.time}</span>
                      </div>
                      <p className={cn("truncate text-xs", convo.hasUnread ? "text-foreground" : "text-muted-foreground")}>{convo.preview}</p>
                      {convo.labels.length > 0 && (
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {convo.labels.map((label) => (
                            <Badge
                              key={label}
                              variant={isEscalationLabel(label) ? "destructive" : "secondary"}
                              className="h-auto px-1.5 py-0 text-[10px]"
                            >
                              {label}
                            </Badge>
                          ))}
                        </div>
                      )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                <p className="text-sm text-muted-foreground">No conversations match the filters.</p>
              </div>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/* ===== CONVERSATION DETAIL ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {selected ? (
          <>
            {/* Header */}
            <div className="shrink-0 border-b border-border bg-card px-5 py-3">
              {/* Row 1: Name + Assignee + Resolve */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
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
                  <span className="text-sm text-muted-foreground">{selected.property}</span>
                </div>
                <div className="flex items-center gap-3 [&>*]:shrink-0">
                  {clickToCallEnabled && (
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
                  {selected.status === "open" ? (
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 px-3 text-xs"
                      onClick={() => resolveConversation(selected.id, MY_INBOX_ASSIGNEE)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Resolve
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

              {/* Row 2: Labels */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {selected.labels.map((label) => (
                  <Badge
                    key={label}
                    variant={label.includes("Escalation") ? "destructive" : "outline"}
                    className={cn(
                      "gap-1 rounded-md text-xs font-normal",
                      label.includes("Escalation")
                        ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                        : "border-border"
                    )}
                  >
                    {label}
                    <button
                      type="button"
                      onClick={() => removeLabel(selected.id, label)}
                      className="ml-0.5 rounded-sm opacity-60 transition-opacity hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Popover open={addLabelOpen} onOpenChange={(open) => { setAddLabelOpen(open); if (!open) setNewLabelText(""); }}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 rounded-full border-dashed"
                      aria-label="Add label"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-0" align="start">
                    <div className="p-2">
                      <Input
                        autoFocus
                        value={newLabelText}
                        onChange={(e) => setNewLabelText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newLabelText.trim()) {
                            addLabel(selected.id, newLabelText.trim(), MY_INBOX_ASSIGNEE);
                            setNewLabelText("");
                            setAddLabelOpen(false);
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
                              <span className="truncate">{label}</span>
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
              </div>

              {selected.labels.some((label) => AI_ACTIVATION_OPT_IN_LABELS.has(label)) && (
                <>
                  {/* Row 3: AI Activated toggle */}
                  <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Switch
                        checked={aiActivated}
                        onCheckedChange={(checked) => {
                          setAiActivated(checked);
                          recordThreadActivity(selected.id, {
                            kind: "ai_activation",
                            active: checked,
                            actor: MY_INBOX_ASSIGNEE,
                          });
                          if (checked) {
                            setReactivationDate(null);
                            setNoLimit(false);
                            setShowDatePicker(false);
                          } else {
                            setShowDatePicker(true);
                          }
                        }}
                      />
                      <span className="text-sm font-medium text-foreground whitespace-nowrap">
                        AI Activated
                      </span>
                      {!aiActivated && (reactivationDate || noLimit) && (
                        <span className="ml-auto text-xs text-muted-foreground truncate">
                          {noLimit
                            ? "Will not reactivate"
                            : `Reactivates ${reactivationDate!.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}`}
                        </span>
                      )}
                    </div>
                    {!aiActivated && (
                      <div className="mt-2 flex items-center gap-2 pl-[46px]">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">
                          Deactivation up to:
                        </label>
                        {noLimit ? (
                          <button
                            type="button"
                            onClick={() => {
                              setNoLimit(false);
                              setShowDatePicker(true);
                            }}
                            className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs transition-colors hover:bg-accent"
                          >
                            No Limit
                          </button>
                        ) : (
                          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs transition-colors hover:bg-accent"
                              >
                                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                {reactivationDate
                                  ? reactivationDate.toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })
                                  : "Select date"}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <MiniCalendar
                                selected={reactivationDate}
                                onSelect={(date) => {
                                  setReactivationDate(date);
                                  setNoLimit(false);
                                  setShowDatePicker(false);
                                }}
                                onNoLimit={() => {
                                  setReactivationDate(null);
                                  setNoLimit(true);
                                  setShowDatePicker(false);
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Row 4: Phone / Email opt-in */}
                  <div className="mt-3 flex gap-3">
                    <div className="flex-1 min-w-0">
                      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Phone</label>
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
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="opt-in"><span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />Opt In</span></SelectItem>
                          <SelectItem value="opt-out"><span className="flex items-center gap-2"><XCircle className="h-3.5 w-3.5 text-red-500" />Opt Out</span></SelectItem>
                          <SelectItem value="no-indication"><span className="flex items-center gap-2"><MinusCircle className="h-3.5 w-3.5 text-muted-foreground" />No Indication</span></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Email</label>
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
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="opt-in"><span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />Opt In</span></SelectItem>
                          <SelectItem value="opt-out"><span className="flex items-center gap-2"><XCircle className="h-3.5 w-3.5 text-red-500" />Opt Out</span></SelectItem>
                          <SelectItem value="no-indication"><span className="flex items-center gap-2"><MinusCircle className="h-3.5 w-3.5 text-muted-foreground" />No Indication</span></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selected.escalationId && linkedByEscalation.length > 0 && (
                    <div
                      className="mt-2 overflow-hidden rounded-lg border border-violet-200/80 bg-violet-50/50 shadow-sm dark:border-violet-900/50 dark:bg-violet-950/20"
                      role="region"
                      aria-label="Related escalated conversations"
                    >
                      <div className="flex gap-2 border-b border-violet-200/60 px-2.5 py-2 dark:border-violet-800/40">
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200"
                          aria-hidden
                        >
                          <Link2 className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-200">
                            Linked conversations
                          </p>
                          <p className="mt-0.5 text-[10px] leading-snug text-violet-950/70 dark:text-violet-100/70">
                            Any related escalated conversations will also be resolved automatically together when you
                            resolve one.
                          </p>
                        </div>
                      </div>
                      <ul className="space-y-0.5 bg-background/60 px-1.5 py-1.5 dark:bg-background/40">
                        {linkedByEscalation.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedId(c.id);
                                markRead(c.id, MY_INBOX_ASSIGNEE);
                              }}
                              className="flex w-full items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1.5 text-left text-[11px] transition-colors hover:border-violet-200 hover:bg-violet-50/80 dark:hover:border-violet-800 dark:hover:bg-violet-950/40"
                            >
                              <span className="shrink-0 font-medium text-violet-700/90 dark:text-violet-300/90">
                                {c.channel}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-foreground">{c.preview}</span>
                              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hover bg-muted/30 px-5 py-4">
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
                          return (
                            <div key={idx} className="flex items-center justify-center gap-2 py-1">
                              <CornerDownRight className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[11px] text-muted-foreground">
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
                        if (msg.type === "label_activity" && msg.labelActivity) {
                          const { actor, labelsAdded } = msg.labelActivity;
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/25 py-2.5 px-3"
                            >
                              <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                                <span className="font-medium text-foreground">{actor}</span>
                                {" added "}
                                {labelsAdded.length === 1 ? "label " : "labels "}
                                <span className="font-medium text-foreground">{labelsAdded.join(", ")}</span>
                                {msg.timestamp && (
                                  <>
                                    <span className="text-muted-foreground/70"> · </span>
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
                            <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm leading-relaxed text-foreground">
                              {msg.text.split("\n").map((line, li) => (
                                <span key={li}>
                                  {line}
                                  {li < msg.text.split("\n").length - 1 && <br />}
                                </span>
                              ))}
                            </div>
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
                    return (
                      <div key={idx} className="flex items-center justify-center gap-2 py-1">
                        <CornerDownRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">
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
                      <div key={idx} className="flex flex-col items-start gap-1">
                        <MissedCallBubble
                          fromNumber={msg.missedCall.fromNumber}
                          attemptCount={msg.missedCall.attemptCount}
                          rangForSec={msg.missedCall.rangForSec}
                          onCallBack={
                            clickToCallEnabled
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
                          fromNumber={msg.voicemail.fromNumber}
                          onCallBack={
                            clickToCallEnabled
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
                    const { actor, labelsAdded } = msg.labelActivity;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/25 py-2.5 px-3"
                      >
                        <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                          <span className="font-medium text-foreground">{actor}</span>
                          {" added "}
                          {labelsAdded.length === 1 ? "label " : "labels "}
                          <span className="font-medium text-foreground">{labelsAdded.join(", ")}</span>
                          {msg.timestamp && (
                            <>
                              <span className="text-muted-foreground/70"> · </span>
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
                        {msg.text.split("\n").map((line, li) => (
                          <span key={li}>
                            {line}
                            {li < msg.text.split("\n").length - 1 && <br />}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chat input */}
            <div className="shrink-0 bg-muted/50">
              {/* Mode toggle */}
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
                  variant={inputMode === "private_note" ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-1.5 rounded-full text-xs",
                    inputMode === "private_note" && "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
                  )}
                  onClick={() => setInputMode("private_note")}
                >
                  <StickyNote className="h-3.5 w-3.5" />
                  Private Note
                </Button>
              </div>

              {/* Input box */}
              <div className="px-5 pb-4">
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
                    placeholder={inputMode === "private_note" ? "Write a private note…" : "Write a message…"}
                    rows={2}
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
                  <div className="flex items-center justify-between px-3 pb-2">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
                      <Paperclip className="h-3.5 w-3.5" />
                      Attach
                    </Button>
                    <Button
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-full",
                        inputMode === "private_note" && "bg-amber-600 hover:bg-amber-700"
                      )}
                      disabled={!draft.trim()}
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

      {/* Instructional video modal for Message panel */}
      <Dialog open={showMessageIntro} onOpenChange={setShowMessageIntro}>
        <DialogContent
          overlayClassName={videoDialogOverlayClassName}
          className="sm:max-w-[640px] p-0 gap-0 overflow-hidden"
        >
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-lg font-semibold">How to Use the Conversation Panel</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Watch this short walkthrough to learn how to message residents, manage threads, and assign conversations.
            </DialogDescription>
          </DialogHeader>

          <div className="relative w-full aspect-video bg-black">
            <video
              ref={messageIntroVideoRef}
              className="h-full w-full object-contain"
              controls
              playsInline
              preload="auto"
              src="/media/oxp-conversation-panel-video.mp4"
              onPlay={(e) => {
                const el = e.currentTarget;
                if (messageIntroPreviewCompletedRef.current) {
                  messageIntroPreviewCompletedRef.current = false;
                  el.currentTime = 0;
                  el.muted = false;
                }
              }}
            >
              Your browser does not support the video tag.
            </video>
          </div>

          <div className="px-6 py-5 flex flex-col gap-4 border-t border-gray-100">
            <div className="flex flex-col gap-1.5">
              <p className="text-[13px] font-semibold text-gray-900">What you&apos;ll learn:</p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  Open &amp; navigate conversation threads
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  Send messages &amp; private notes
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  Assign agents to threads
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  Filter active &amp; closed threads
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                className="text-[12px]"
                onClick={() => {
                  setShowMessageIntro(false);
                  setThreadsPanelOpen(true);
                }}
              >
                Skip for now
              </Button>
              <Button
                size="sm"
                className="gap-2 text-[12px] bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  setMessageIntroDismissed(true);
                  setShowMessageIntro(false);
                  setThreadsPanelOpen(true);
                }}
              >
                Don&apos;t show this again
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resident Profile Curtain Overlay */}
      {profileModalOpen && selected && (
        <div className="fixed inset-0 z-[60] flex">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => {
              setProfileModalOpen(false);
              setProfilePanelInboxOpen(false);
            }}
          />
          <div className="relative z-10 flex flex-1 flex-col animate-in slide-in-from-top duration-300 bg-white">
            {/* Entrata brand bar — full width */}
            <div className="flex items-center justify-between bg-[#b71c1c] px-4 py-2.5 shrink-0">
              <span className="text-[16px] font-semibold italic text-white/90 tracking-wide">entrata</span>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setProfileModalOpen(false);
                    setProfilePanelInboxOpen(false);
                  }}
                  className="flex items-center gap-1.5 text-[14px] font-medium text-white/90 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>
            </div>

            {/* Content row below brand bar */}
            <div className="flex flex-1 min-h-0">
            {/* LEFT: Entrata profile (header + tabs + ledger) */}
            <div className="flex flex-1 min-w-0 flex-col bg-white">
              {/* Profile header row */}
              <div className="flex items-center bg-white px-5 py-5 shrink-0 border-b border-gray-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2e7d32] text-sm font-bold text-white shrink-0">
                    {initials(selected.resident)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[15px] font-bold text-gray-900">{selected.resident}</span>
                    <p className="text-[12px] text-gray-500">{selected.property} | #32</p>
                  </div>
                </div>
                <span className="mx-4 text-gray-300">·</span>
                <div className="ml-auto flex items-center gap-1.5">
                  {[
                    { label: "Message", Icon: MessageCircle, action: () => {
                        if (!messageIntroDismissed) {
                          setShowMessageIntro(true);
                        } else {
                          setThreadsPanelOpen((v) => {
                            const next = !v;
                            if (!next) setProfilePanelInboxOpen(false);
                            return next;
                          });
                        }
                      }},
                    { label: "SMS", Icon: MessageSquare },
                    { label: "Email", Icon: Mail },
                    { label: "Appointment", Icon: CalendarIcon },
                    { label: "Schedule Manual Contact", Icon: Phone },
                  ].map((btn) => (
                    <div key={btn.label} className="relative">
                      {btn.label === "Message" && !threadsPanelOpen && !messageIntroDismissed && (
                        <>
                          <span className="absolute -top-2 -right-2 z-10 flex items-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[8px] font-bold text-white shadow-sm animate-bounce" style={{ animationDuration: "2s" }}>
                            NEW
                          </span>
                          <span className="absolute inset-0 rounded-md animate-pulse ring-2 ring-blue-400/50" style={{ animationDuration: "2s" }} />
                        </>
                      )}
                    <button
                      onClick={btn.action}
                      className={`relative flex items-center gap-1.5 rounded-md border bg-white px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-gray-50 ${
                        btn.label === "Message" && threadsPanelOpen
                          ? "border-blue-400 text-blue-600"
                          : btn.label === "Message"
                            ? "border-blue-300 text-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                            : "border-gray-200 text-gray-600"
                      }`}
                    >
                      <btn.Icon className={`h-3.5 w-3.5 shrink-0 ${btn.label === "Message" ? "text-blue-400" : "text-gray-400"}`} strokeWidth={1.5} />
                      {btn.label}
                    </button>
                    </div>
                  ))}
                </div>
              </div>
              {/* Profile tabs */}
              <div className="flex items-center gap-0 border-b border-gray-200 bg-[#f5f5f5] px-2 shrink-0">
                {["Financial", "Household", "Lease", "Utilities", "Documents", "Maintenance", "Activity Log"].map((tab, i) => (
                  <button
                    key={tab}
                    className={`px-3 py-2 text-[11px] font-medium transition-colors rounded-t ${
                      i === 0
                        ? "bg-white text-[#c0392b] border border-gray-200 border-b-white -mb-px relative z-10"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
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
                  {clickToCallEnabled && (
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
                      setThreadsPanelOpen(false);
                      setProfilePanelInboxOpen(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {openThreadIdx === -1 && newThreadOutbound && (
                  <div className="shrink-0 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">From</p>
                    <p className="text-[12px] font-medium text-gray-900 mt-0.5 tabular-nums">{newThreadOutbound.from}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {newThreadOutbound.channel === "SMS"
                        ? "Property SMS vanity"
                        : "Property email"}{" "}
                      · {newThreadOutbound.propertyName}
                    </p>
                  </div>
                )}

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
                      <p className="text-center text-[12px] text-gray-500 py-8 px-2 leading-relaxed">
                        {newThreadOutbound ? (
                          <>
                            Outbound messages will send from{" "}
                            <span className="font-medium text-gray-800">{newThreadOutbound.from}</span>.
                            Compose below to start the thread.
                          </>
                        ) : (
                          "Choose a channel in New Thread to set the From line."
                        )}
                      </p>
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
                            {msg.text.split("\n").map((line, li) => (
                              <span key={li}>
                                {line}
                                {li < msg.text.split("\n").length - 1 && <br />}
                              </span>
                            ))}
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
                              return (
                                <div
                                  key={`ent-act-la-${actIdx}`}
                                  className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/25 py-2 px-2"
                                >
                                  <Tag className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                                  <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
                                    <span className="font-medium text-foreground">{actor}</span>
                                    {" added "}
                                    <span className="font-medium text-foreground">
                                      {labelsAdded.join(", ")}
                                    </span>
                                    {m.timestamp && (
                                      <>
                                        <span className="text-muted-foreground/70"> · </span>
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
                  {clickToCallEnabled && (
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
                            fromNumber={msg.voicemail.fromNumber}
                          />
                        );
                      }
                      if (msg.type === "label_activity" && msg.labelActivity) {
                        const { actor, labelsAdded } = msg.labelActivity;
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/25 py-2 px-2"
                          >
                            <Tag className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                            <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
                              <span className="font-medium text-foreground">{actor}</span>
                              {" added "}
                              <span className="font-medium text-foreground">{labelsAdded.join(", ")}</span>
                              {msg.timestamp && (
                                <>
                                  <span className="text-muted-foreground/70"> · </span>
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
                            {msg.text.split("\n").map((line, li) => (
                              <span key={li}>
                                {line}
                                {li < msg.text.split("\n").length - 1 && <br />}
                              </span>
                            ))}
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
                      variant={inputMode === "private_note" ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "gap-1.5 rounded-full text-[11px] h-7",
                        inputMode === "private_note" &&
                          "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
                      )}
                      onClick={() => setInputMode("private_note")}
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
                          disabled={!draft.trim()}
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
                    {clickToCallEnabled && (
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
                                <span className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">{thread.channel}</span>
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
                  {/* New Thread button */}
                  <button
                    type="button"
                    className="mt-5 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-1.5 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
                    onClick={() => {
                      setNewThreadFromSelection("");
                      setNewThreadDialogOpen(true);
                    }}
                  >
                    New Thread
                    <Plus className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.5} />
                  </button>
                </div>
              </>
            )}
          </div>}
        </div>
      )}

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
                  setCallbackNumber(callConfirmDraft?.propertyRingNumberDisplay ?? "");
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
                        {callConfirmDraft?.propertyRingNumberDisplay && (
                          <span className="font-normal text-[10px] text-muted-foreground/80">
                            Default: property callback line
                          </span>
                        )}
                      </label>
                      <Input
                        id="callback-number"
                        type="tel"
                        inputMode="tel"
                        autoFocus
                        value={callbackNumber}
                        onChange={(e) => setCallbackNumber(e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className="h-9 font-mono tabular-nums"
                      />
                      <p className="text-[10px] leading-snug text-muted-foreground">
                        {callConfirmDraft?.propertyRingNumberDisplay
                          ? "Pre-filled with the number your property chose for callbacks. Edit to use a profile or custom number for this call only."
                          : "Use a number from your profile, or enter a custom one for this call."}
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
        assigneeOptions={clickToCallAssigneeOptions}
        defaultAssigneeValue={CLICK_TO_CALL_FOLLOWUP_UNASSIGNED}
      />
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

export default function ConversationsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <ConversationsContent />
    </Suspense>
  );
}

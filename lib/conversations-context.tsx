"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRole, matchesRoleProperties } from "@/lib/role-context";
import { useClickToCallDemo } from "@/lib/click-to-call-demo-context";
import { useConversationsDemo } from "@/lib/conversations-demo-context";
import { useTranslationDemo } from "@/lib/translation-demo-context";
import { CLICK_TO_CALL_DEMO_THREADS } from "@/lib/click-to-call-demo-threads";

export type EmailAttachmentRef = {
  name: string;
  kind: "image" | "file";
};

/** Outbound bulk send summarized in the thread; full message opens in a modal. */
export type BulkOutboundEmailRef = {
  sentAt: string;
  /** e.g. "All residents · 612 recipients" */
  recipientSummary: string;
  subject: string;
  body: string;
  sentBy?: string;
  emailSignature?: string;
  emailAttachments?: EmailAttachmentRef[];
};

/** Staff-facing timeline entries (resolve, assign, read, AI preference, etc.). */
export type ThreadActivity =
  | { kind: "status"; action: "resolved" | "reopened"; actor: string; notes?: string; resolutionType?: "general" | "incoming" | "outgoing" }
  | {
      // SA 1.2 Thread Automation → Follow-Up Threads. Fires when the lead or
      // resident has gone silent for N days after a staff/agent reply. Treated
      // as a fresh call-to-action by needsStaffResponse so the thread comes
      // back into the "needs action" set until staff responds again.
      kind: "follow_up_reminder";
      /** How many days of resident/lead silence triggered the reminder. */
      daysIdle: number;
      /** Who sent the last message that started the countdown. */
      sinceRole: "staff" | "agent";
      /** Human-readable timestamp of that last reply (used in body copy). */
      sinceTimestamp?: string;
      /** Optional prompt for staff, e.g. "Suggested action: send a nudge asking if they're still interested." */
      suggestedAction?: string;
    }
  | {
      kind: "assignment";
      assignee: string;
      assignedBy: string;
      previousAssignee: string;
    }
  | {
      kind: "assignment_cleared";
      actor: string;
      previousAssignee: string;
    }
  | { kind: "ai_activation"; active: boolean; actor: string }
  | {
      kind: "channel_opt";
      channel: "phone" | "email";
      choice: "opt-in" | "opt-out" | "no-indication";
      actor: string;
    }
  | { kind: "read"; reader: string }
  | {
      kind: "phone_call";
      actor: string;
      phoneNumber: string;
      outcome: "connected" | "failed" | "cancelled";
      /** Present when outcome is connected (e.g. "3:02"). */
      durationLabel?: string;
      notes: string;
      followUpAssignee?: string;
      followUpDue?: string;
      /** Free-form notes attached to the follow-up task itself (separate from call notes). */
      followUpNotes?: string;
      /** "voip" = computer audio, "callback" = platform rings agent's phone first. */
      origin?: "voip" | "callback";
      /** Display form of agent's callback number when origin === "callback". */
      callbackNumber?: string;
      /** Staff-documented direction when logging a call without a live session. */
      direction?: "inbound" | "outbound";
    };

export type VoicemailTranscriptTurn = {
  speaker: "ai" | "resident";
  text: string;
};

export type VoicemailRef = {
  /** Length of the recording in seconds. */
  durationSec: number;
  /**
   * Flat AI-generated transcript. Used when `turns` is absent, and as a
   * compact preview/search string when structured turns are provided.
   */
  transcript: string;
  /**
   * Optional structured call transcript with speaker turns (ELI vs resident).
   * When present, the voicemail player renders a dialog instead of a monologue.
   */
  turns?: VoicemailTranscriptTurn[];
  /**
   * Inbound phone number the voicemail came from (display form, e.g. "+1 (720) 555-5264").
   * Used to render a "Call back" action on the voicemail card.
   */
  fromNumber?: string;
};

export type MissedCallRef = {
  /** Inbound phone number that called in. */
  fromNumber: string;
  /** How many times they tried to reach out in a row (optional). */
  attemptCount?: number;
  /** How long the phone rang before the caller gave up, in seconds (optional). */
  rangForSec?: number;
};

export type ConversationMessage = {
  role: "resident" | "agent" | "staff";
  text: string;
  timestamp?: string;
  type?:
    | "message"
    | "private_note"
    | "handoff"
    | "label_activity"
    | "thread_activity"
    | "missed_call"
    | "voicemail";
  /**
   * ISO 639-1 code of the language `text` was authored in (e.g. "es"). Missing
   * or "en" is treated as English.
   */
  language?: string;
  /**
   * English rendering of `text` when `language` is a non-English source; used
   * when the reviewer toggles "Show English" on a translated bubble.
   */
  translation?: string;
  /**
   * Staff-composed text that was auto-translated before sending (e.g. staff typed
   * English → thread carries the translated Spanish `text`). Preserved so we can
   * show the original English underneath the translated bubble.
   */
  originalText?: string;
  /** Rendered in email-channel threads: footer block after the body. */
  emailSignature?: string;
  /** Rendered as file/image chips (and thumbnail for images) in email-channel threads. */
  emailAttachments?: EmailAttachmentRef[];
  /** Staff member who wrote the private note (internal-only). */
  privateNoteAuthor?: string;
  /** Timeline entry when a label is applied (staff-only activity). */
  labelActivity?: {
    actor: string;
    labelsAdded: string[];
    action: "added" | "context_provided" | "resolved_escalation";
    /**
     * Plain-English reason the AI escalated (shown on the escalation banner).
     * Only set when `action === "added"` for Escalation labels.
     */
    reason?: string;
  };
  /** Structured staff activity (resolve, assignment, read, etc.). */
  threadActivity?: ThreadActivity;
  /**
   * Super Agent 1.0 only: when a staff member sends a public reply with one or more escalation
   * checkboxes selected, the chosen escalation labels are stamped on the message so the thread
   * shows which escalation each staff reply was addressing. Purely a context tag — does not
   * change resolution state or remove labels.
   */
  replyToEscalations?: string[];
  /** Populated when `type === "voicemail"` — inbound recording with transcript. */
  voicemail?: VoicemailRef;
  /** Populated when `type === "missed_call"` — inbound call that went unanswered. */
  missedCall?: MissedCallRef;
};

export type ConversationItem = {
  id: string;
  resident: string;
  unit: string | null;
  preview: string;
  agent: string;
  time: string;
  contactType: string;
  property: string;
  channel: string;
  /** Additional communication channels used in this thread (e.g. Voice added to SMS thread). */
  additionalChannels?: string[];
  /** When `channel` is Email, shown as the thread subject in the conversation panel. */
  emailSubject?: string;
  /**
   * When set on an Email thread, the outbound bulk send is shown as one summary card in the
   * thread body; clicking opens a modal with the full message. Other `messages` still render below.
   */
  bulkOutboundEmail?: BulkOutboundEmailRef;
  assignee: string;
  labels: string[];
  status: "open" | "resolved";
  messages: ConversationMessage[];
  hasUnread: boolean;
  /** When set, threads with the same id are one escalation case across channels. */
  escalationId?: string;
  /**
   * When true, staff-authored thread bubbles show the assignee name with
   * `(External Agent)` — responder is not an Entrata user (e.g. ELI+ escalation console).
   */
  staffRespondentIsExternalAgent?: boolean;
  /**
   * When set, this conversation is linked to multiple resident profiles and we don't
   * know for sure which one is speaking. The thread-list card and conversation header
   * hide the primary resident name and show a "Multiple Profiles" / "See Profiles"
   * affordance instead; the header dropdown lists `[resident, ...additionalResidents]`
   * for the staff to pick which profile to open. Each entry can carry its own
   * `property` since different profiles may live at different properties.
   */
  additionalResidents?: { name: string; property?: string }[];
};

/** Login / profile handles matched in private notes as @handle (prototype viewer). */
export const CURRENT_USER_MENTION_HANDLES = ["abekashiwagi"] as const;

function privateNoteTextMentionsCurrentUser(text: string): boolean {
  const lower = text.toLowerCase();
  return CURRENT_USER_MENTION_HANDLES.some((h) => {
    const i = lower.indexOf(`@${h.toLowerCase()}`);
    if (i === -1) return false;
    const after = lower[i + 1 + h.length];
    return after === undefined || /\W/.test(after);
  });
}

export function conversationHasCurrentUserPrivateNoteMention(c: ConversationItem): boolean {
  return c.messages.some(
    (m) => m.type === "private_note" && privateNoteTextMentionsCurrentUser(m.text)
  );
}

/** Other conversations in the same escalation case (excludes `currentId`). */
export function getLinkedConversationsByEscalation(
  all: ConversationItem[],
  currentId: string,
  escalationId: string | undefined
): ConversationItem[] {
  if (!escalationId) return [];
  return all.filter((c) => c.id !== currentId && c.escalationId === escalationId);
}

function isPublicThreadMessage(m: ConversationMessage): boolean {
  if (m.type === "label_activity" || m.type === "thread_activity") return false;
  return (
    m.type === undefined ||
    m.type === "message" ||
    m.type === "voicemail" ||
    m.type === "missed_call"
  );
}

function getLastPublicMessage(messages: ConversationMessage[]): ConversationMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (isPublicThreadMessage(messages[i])) return messages[i];
  }
  return undefined;
}

/** Unread badge only if the last public message is from the lead/resident. */
function clampHasUnread(messages: ConversationMessage[], hasUnread: boolean): boolean {
  const last = getLastPublicMessage(messages);
  if (!last || last.role !== "resident") return false;
  return hasUnread;
}

function nextHasUnreadAfterAppend(c: ConversationItem, message: ConversationMessage): boolean {
  const next = [...c.messages, message];
  const last = getLastPublicMessage(next);
  if (!last || last.role !== "resident") return false;
  if (
    message.type === "private_note" ||
    message.type === "handoff" ||
    message.type === "label_activity" ||
    message.type === "thread_activity"
  )
    return c.hasUnread;
  return message.role === "resident";
}

/** A logged phone call by staff/agent counts as a reply to inbound voicemail/missed calls. */
function isStaffPhoneCallReplyActivity(m: ConversationMessage): boolean {
  if (m.type !== "thread_activity") return false;
  if (m.role !== "staff" && m.role !== "agent") return false;
  return m.threadActivity?.kind === "phone_call";
}

/**
 * Unattended thread: still open, fully read (no unread indicator), and the last
 * resident-visible message is from the lead/resident with no agent or staff
 * response after it. Private notes and handoffs do not count as replies, but a
 * logged phone call activity does — so that a missed-call / voicemail thread
 * drops out of Open Threads once staff has called the lead/resident back.
 */
export function isConversationUnattended(c: ConversationItem): boolean {
  if (c.status !== "open" || c.hasUnread) return false;

  const { messages: msgs } = c;
  let lastResidentPublicIdx = -1;
  for (let i = 0; i < msgs.length; i++) {
    if (msgs[i].role === "resident" && isPublicThreadMessage(msgs[i])) {
      lastResidentPublicIdx = i;
    }
  }
  if (lastResidentPublicIdx === -1) return false;

  for (let i = lastResidentPublicIdx + 1; i < msgs.length; i++) {
    const m = msgs[i];
    if (isStaffPhoneCallReplyActivity(m)) return false;
    if (!isPublicThreadMessage(m)) continue;
    if (m.role === "agent" || m.role === "staff") return false;
  }
  return true;
}

/**
 * The thread has an active Thread Automation "follow-up reminder" that hasn't
 * been cleared yet — i.e. a reminder was fired, and no staff/agent reply (or
 * documented phone call) has followed it. Used so reminder-triggered need-action
 * shows a marker even in Eli-owned inboxes.
 */
export function hasActiveFollowUpReminder(c: ConversationItem): boolean {
  const { messages: msgs } = c;
  let lastReminderIdx = -1;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    if (
      m.type === "thread_activity" &&
      m.threadActivity?.kind === "follow_up_reminder"
    ) {
      lastReminderIdx = i;
    }
  }
  if (lastReminderIdx === -1) return false;
  for (let i = lastReminderIdx + 1; i < msgs.length; i++) {
    const m = msgs[i];
    if (isStaffPhoneCallReplyActivity(m)) return false;
    if (!isPublicThreadMessage(m)) continue;
    if (m.role === "agent" || m.role === "staff") return false;
  }
  return true;
}

/**
 * Open thread that still needs staff attention. Two ways this can be true:
 *   1. The most recent public message is from the lead/resident and no staff
 *      or agent has publicly replied after it.
 *   2. Thread Automation dropped a follow-up reminder on the thread because
 *      the lead/resident has gone silent for N days after a staff/agent reply,
 *      and staff has not yet acted on that reminder.
 * Unlike isConversationUnattended, this ignores read/unread state — the dot
 * stays until staff responds.
 */
export function needsStaffResponse(c: ConversationItem): boolean {
  if (c.status !== "open") return false;

  const { messages: msgs } = c;
  // Most recent "call to action" — either a resident/lead public message, or
  // a follow-up-reminder activity fired by inbox automation.
  let lastCtaIdx = -1;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    if (m.role === "resident" && isPublicThreadMessage(m)) {
      lastCtaIdx = i;
    } else if (
      m.type === "thread_activity" &&
      m.threadActivity?.kind === "follow_up_reminder"
    ) {
      lastCtaIdx = i;
    }
  }
  if (lastCtaIdx === -1) return false;

  for (let i = lastCtaIdx + 1; i < msgs.length; i++) {
    const m = msgs[i];
    if (isStaffPhoneCallReplyActivity(m)) return false;
    if (!isPublicThreadMessage(m)) continue;
    if (m.role === "agent" || m.role === "staff") return false;
  }
  return true;
}

/**
 * Last public thread message is from agent or staff — conversation is waiting on the
 * lead or resident to reply next. Private notes and handoffs are ignored.
 */
export function isWaitingOnResidentPublicReply(c: ConversationItem): boolean {
  const { messages: msgs } = c;
  let lastPublicIdx = -1;
  for (let i = 0; i < msgs.length; i++) {
    if (isPublicThreadMessage(msgs[i])) lastPublicIdx = i;
  }
  if (lastPublicIdx === -1) return false;
  const last = msgs[lastPublicIdx];
  return last.role === "agent" || last.role === "staff";
}

/**
 * Auto-added companions on load / addLabel. Only Maintenance → Work Order here so
 * "Live AI" inboxes can stay primary-lane-only (no * AI Escalation labels).
 * Escalated property inboxes require explicit companions in data; see satisfiesEscalatedPropertyInboxLabels.
 */
const AI_LABEL_COMPANIONS: Record<string, string> = {
  "Maintenance AI": "Work Order",
};

export function ensureAiLabelCompanions(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of labels) {
    if (seen.has(l)) continue;
    out.push(l);
    seen.add(l);
    const companion = AI_LABEL_COMPANIONS[l];
    if (companion && !seen.has(companion)) {
      out.push(companion);
      seen.add(companion);
    }
  }
  return out;
}

/** Escalated Hillside / Jamison: if a primary lane label exists, its companion must be present. */
export function satisfiesEscalatedPropertyInboxLabels(c: ConversationItem): boolean {
  const { labels } = c;
  if (labels.includes("Leasing AI") && !labels.includes("Leasing AI Escalation")) return false;
  if (labels.includes("Payments AI") && !labels.includes("Payments AI Escalation")) return false;
  if (labels.includes("Maintenance AI") && !labels.includes("Work Order")) return false;
  if (
    (labels.includes("Renewal AI") || labels.includes("Renewals AI")) &&
    !labels.includes("Renewal AI Escalation")
  )
    return false;
  return true;
}

/** Prototype default for activity attribution when the viewer performs an action. */
export const DEFAULT_CONVERSATION_ACTIVITY_ACTOR = "Abe Kashiwagi";

/** Canonical assignee string when no person or AI queue owns the conversation. */
export const CONVERSATION_UNASSIGNED_ASSIGNEE = "Unassigned";

/**
 * Pass to `updateAssignee` to clear the assignee (see {@link CONVERSATION_UNASSIGNED_ASSIGNEE}).
 */
export const UNASSIGN_CONVERSATION_VALUE = "__oxp_unassign_conversation__";

export function formatThreadActivityTimestamp(d = new Date()): string {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}

function buildThreadActivityMessage(activity: ThreadActivity): ConversationMessage {
  return {
    role: "staff",
    text: "",
    timestamp: formatThreadActivityTimestamp(),
    type: "thread_activity",
    threadActivity: activity,
  };
}

const INITIAL: ConversationItem[] = [
  {
    id: "lc-22",
    resident: "Nina Ortiz",
    unit: "Unit 445",
    preview: "Thanks — will the gym stay open during the deck work?",
    agent: "Staff",
    time: "1m ago",
    contactType: "Resident",
    property: "Hillside Living",
    channel: "Email",
    emailSubject: "Re: Pool deck resurfacing — April schedule (all residents)",
    assignee: "Abe Kashiwagi",
    labels: ["Resident"],
    status: "open",
    hasUnread: true,
    bulkOutboundEmail: {
      sentAt: "Apr 6 2026 · 8:30am MST",
      recipientSummary: "All residents · 612 recipients",
      subject: "Pool deck resurfacing — April schedule (all residents)",
      body: "Hello Hillside residents,\n\nWe'll be resurfacing the pool deck from Tuesday, April 8 through Friday, April 11. The pool will be closed during this time; the spa remains open until Thursday.\n\nContractors will need access to the north service gate — please do not block the service drive. We'll send a second reminder the day before work begins.\n\nThank you for your patience,",
      sentBy: "Abe Kashiwagi",
      emailSignature: `Best regards,
Abe Kashiwagi
Leasing Specialist

Hillside Living
(720) 555-0140
1800 Hillside Parkway, Denver, CO 80205`,
      emailAttachments: [{ name: "Pool-Deck-Project-Timeline-April2026.pdf", kind: "file" }],
    },
    messages: [
      {
        role: "resident",
        text: "Thanks for the notice. Will the gym stay open during the deck work? I also attached a photo of the current deck condition near unit 445 — there's a crack that might need extra attention during resurfacing.",
        timestamp: "Apr 6 2026 · 10:12am MST",
        type: "message",
        emailSignature: "—\nNina Ortiz\nUnit 445\nnina.ortiz@email.com",
        emailAttachments: [
          { name: "deck-crack-unit445.jpg", kind: "image" },
          { name: "Resident-Pool-Access-Request.pdf", kind: "file" },
        ],
      },
    ],
  },
  {
    id: "lc-1",
    resident: "Maria Santos",
    unit: null,
    preview: "Perfect — I have 10am or 11am Saturday. Which wor...",
    agent: "Leasing AI",
    time: "just now",
    contactType: "Lead",
    property: "Hillside Living",
    channel: "SMS",
    assignee: "ELI+ Leasing AI",
    labels: ["Leasing AI"],
    status: "open",
    hasUnread: false,
    messages: [
      { role: "agent", text: "Hi Maria! Thanks for reaching out. I'd love to help you find the perfect apartment. What are you looking for?", timestamp: "Sep 15 2025 · 7:00pm MST", type: "message" },
      { role: "resident", text: "Hi! I'm looking for a 1-bedroom, ideally with in-unit laundry. My budget is around $1,800/mo.", timestamp: "Sep 15 2025 · 7:02pm MST", type: "message" },
      { role: "agent", text: "Great news — we have three 1-bedroom units available that fit your criteria. Unit 205 and Unit 310 both have in-unit washer/dryer and are listed at $1,750/mo. Would you like to schedule a tour?", timestamp: "Sep 15 2025 · 7:03pm MST", type: "message" },
      { role: "resident", text: "That sounds great — can I schedule a tour for Saturday morning?", timestamp: "Sep 15 2025 · 7:05pm MST", type: "message" },
      { role: "agent", text: "Perfect — I have 10am or 11am Saturday. Which works best for you?", timestamp: "Sep 15 2025 · 7:06pm MST", type: "message" },
    ],
  },
  {
    id: "lc-2",
    resident: "Robert Hernandez",
    unit: "Unit 318",
    preview: "Can I split this into two payments this month?",
    agent: "Payments AI",
    time: "2m ago",
    contactType: "Resident",
    property: "Hillside Living",
    channel: "Resident Chat",
    assignee: "Abe Kashiwagi",
    labels: ["Payments AI"],
    status: "open",
    hasUnread: false,
    messages: [
      { role: "resident", text: "Hey, I wanted to ask about my rent this month. I'm having a bit of a cash flow issue.", timestamp: "Sep 15 2025 · 6:50pm MST", type: "message" },
      { role: "agent", text: "Hi Robert, I'm sorry to hear that. I can help you explore your options. Your balance for this month is $1,650, due on the 1st. Would you like to set up a payment plan?", timestamp: "Sep 15 2025 · 6:51pm MST", type: "message" },
      { role: "resident", text: "Can I split this into two payments this month?", timestamp: "Sep 15 2025 · 6:53pm MST", type: "message" },
      { role: "agent", text: "Absolutely. I can set up two installments: $825 due March 1st and $825 due March 15th. There's a one-time $25 arrangement fee. Shall I proceed?", timestamp: "Sep 15 2025 · 6:54pm MST", type: "message" },
    ],
  },
  {
    id: "lc-11",
    resident: "Elena Voss",
    unit: null,
    preview: "Do you have any 2x2s opening in the next 60 days?",
    agent: "Staff",
    time: "3m ago",
    contactType: "Lead",
    property: "Hillside Living",
    channel: "Email",
    emailSubject: "Question: 2-bedroom availability in the next 60 days — Hillside Living",
    assignee: "Abe Kashiwagi",
    labels: ["Lead"],
    status: "open",
    hasUnread: false,
    messages: [
      {
        role: "resident",
        text: "Hi — do you have any 2x2s opening in the next 60 days?",
        timestamp: "Sep 15 2025 · 6:10pm MST",
        type: "message",
        emailSignature:
          "—\nElena Voss\nProspective resident\nMobile: (415) 555-0142",
      },
      {
        role: "staff",
        text: "Yes, we expect two 2-bedroom units to turn in the next 45 days. I can send floor plans and pricing if you share your email.\n\nI've attached a sample 2x2 floor plan (PDF) and a recent photo of Building C so you can get a feel for the community.",
        timestamp: "Sep 15 2025 · 6:12pm MST",
        type: "message",
        emailAttachments: [
          { name: "Hillside-2BR-Summer-Availability-Floorplan.pdf", kind: "file" },
          { name: "Building-C-Exterior-March2025.jpg", kind: "image" },
        ],
        emailSignature: `Best regards,
Abe Kashiwagi
Leasing Specialist

Hillside Living
(720) 555-0140
1800 Hillside Parkway, Denver, CO 80205`,
      },
    ],
  },
  {
    id: "lc-3",
    resident: "Alma Sanchez",
    unit: null,
    preview: "Amazing — thanks!",
    agent: "Leasing AI",
    time: "5m ago",
    contactType: "Lead",
    property: "Hillside Living",
    channel: "SMS",
    assignee: "ELI+ Leasing AI",
    labels: ["Leasing AI", "Leasing AI Escalation"],
    escalationId: "esc-hillside-alma-12",
    status: "open",
    hasUnread: true,
    messages: [
      { role: "agent", text: "Thanks Alma!\n\nTo ensure this request is properly handled, I am escalating it to a member of our team who can discuss the possibility of an exception with you. You can expect to hear from them within 24-48 business hours.", timestamp: "Sep 15 2025 · 7:05pm MST", type: "message" },
      { role: "staff", text: "", timestamp: "Sep 15 2025 · 7:05pm MST", type: "handoff" },
      { role: "staff", text: "Hi Alma! That shouldn't be a problem — we should be good to continue with the leasing process.", timestamp: "Sep 15 2025 · 7:06pm MST", type: "message" },
      { role: "resident", text: "Amazing — thanks!", timestamp: "Sep 15 2025 · 8:12pm MST", type: "message" },
      {
        role: "staff",
        text: "PM confirmed the exception in Entrata (Notes tab). She’s good to move forward — if we don’t see an application by Thu EOD, I’ll ping her with the pre-app checklist + ID upload link.",
        timestamp: "Sep 15 2025 · 8:17pm MST",
        type: "private_note",
        privateNoteAuthor: "Abe Kashiwagi",
      },
    ],
  },
  {
    id: "lc-20",
    resident: "Alma Sanchez",
    unit: "Unit 312",
    preview: "Can we talk about the rent increase? That’s more than I expected.",
    agent: "Staff",
    time: "4m ago",
    contactType: "Resident",
    property: "Hillside Living",
    channel: "Email",
    emailSubject: "Re: Your Lease Renewal Offer — Unit 312",
    assignee: "Abe Kashiwagi",
    staffRespondentIsExternalAgent: true,
    labels: ["Renewals AI", "Renewals AI Escalation"],
    escalationId: "esc-hillside-alma-12",
    status: "open",
    hasUnread: false,
    messages: [
      {
        role: "staff",
        text: "Hi Alma — I wanted to follow up on your renewal offer for Unit 312. Your current lease ends November 30, and we’ve sent a renewal proposal with updated terms. Please let me know if you have any questions or would like to discuss the options.",
        timestamp: "Sep 15 2025 · 7:20pm MST",
        type: "message",
        emailSignature: `Best regards,
Abe Kashiwagi
Renewals Specialist

Hillside Living
(720) 555-0140
1800 Hillside Parkway, Denver, CO 80205`,
      },
      {
        role: "resident",
        text: "Can we talk about the rent increase? That’s more than I expected.",
        timestamp: "Sep 15 2025 · 7:22pm MST",
        type: "message",
        emailSignature: "—\nAlma Sanchez\nUnit 312, Hillside Living",
      },
    ],
  },
  {
    id: "lc-4",
    resident: "Davis Calzoni",
    unit: null,
    preview: "Follow-up reminder — no reply in 5 days since the AI agent last responded",
    agent: "Renewals AI",
    time: "just now",
    contactType: "Lead",
    property: "Hillside Living",
    channel: "SMS",
    assignee: "ELI+ Renewal AI",
    labels: ["Leasing AI"],
    status: "open",
    hasUnread: false,
    messages: [
      { role: "resident", text: "I was wondering if you could help me know what the lighting situation is like in the 2-bedroom units?", timestamp: "Sep 10 2025 · 6:45pm MST", type: "message" },
      { role: "agent", text: "Great question! Our 2-bedroom units feature large windows in both bedrooms and the living area, providing plenty of natural light. The kitchen also has under-cabinet LED lighting. Would you like to schedule a tour to see for yourself?", timestamp: "Sep 10 2025 · 6:46pm MST", type: "message" },
      {
        role: "staff",
        type: "thread_activity",
        text: "",
        timestamp: "Sep 15 2025 · 8:00am MST",
        threadActivity: {
          kind: "follow_up_reminder",
          daysIdle: 5,
          sinceRole: "agent",
          sinceTimestamp: "Sep 10 · 6:46pm",
          suggestedAction: "Send a quick nudge asking if they're still interested in a tour — Leasing AI's offer went unanswered.",
        },
      },
    ],
  },
  {
    id: "lc-13",
    resident: "Keisha Monroe",
    additionalResidents: [{ name: "John Monroe", property: "Jamison Apartments" }],
    unit: "Unit 412",
    preview: "Will the desk stay open until 8pm? Want to double-check b...",
    agent: "Staff",
    time: "9m ago",
    contactType: "Resident",
    property: "Hillside Living",
    channel: "SMS",
    assignee: "Abe Kashiwagi",
    labels: ["Resident"],
    status: "open",
    hasUnread: true,
    messages: [
      { role: "resident", text: "Thanks for the package hold — I’ll pick it up tonight after 6.", timestamp: "Sep 15 2025 · 6:00pm MST", type: "message" },
      { role: "staff", text: "Sounds good — front desk has it under your unit number. See you then!", timestamp: "Sep 15 2025 · 6:01pm MST", type: "message" },
      {
        role: "resident",
        text: "Will the desk stay open until 8pm? Want to double-check before I head over.",
        timestamp: "Sep 15 2025 · 6:55pm MST",
        type: "message",
      },
    ],
  },
  {
    id: "lc-5",
    resident: "Lindsey Carder",
    unit: "Unit 204",
    preview: "Follow-up reminder — no reply in 3 days since the AI agent last responded",
    agent: "Renewals AI",
    time: "just now",
    contactType: "Resident",
    property: "Hillside Living",
    channel: "Resident Chat",
    assignee: "ELI+ Renewals AI",
    labels: ["Renewals AI"],
    status: "open",
    hasUnread: false,
    messages: [
      { role: "resident", text: "My lease is up in December and I'm thinking about a shorter renewal — is a 6-month option available, or is it always 12 months?", timestamp: "Sep 12 2025 · 6:40pm MST", type: "message" },
      { role: "agent", text: "Great question, Lindsey! We do offer a 6-month renewal at a slightly higher monthly rate ($1,595 vs your current $1,520 for a 12-month term). I can send both offer letters side-by-side so you can compare — want me to?", timestamp: "Sep 12 2025 · 6:41pm MST", type: "message" },
      {
        role: "staff",
        type: "thread_activity",
        text: "",
        timestamp: "Sep 15 2025 · 8:00am MST",
        threadActivity: {
          kind: "follow_up_reminder",
          daysIdle: 3,
          sinceRole: "agent",
          sinceTimestamp: "Sep 12 · 6:41pm",
          suggestedAction: "Follow up with Lindsey — she asked about a 6-month renewal and hasn't answered whether to send both offer letters.",
        },
      },
    ],
  },
  {
    id: "lc-6",
    resident: "Omar Culhane",
    unit: "Unit 517",
    preview: "I have a question about when the technician will be able to c...",
    agent: "Maintenance AI",
    time: "12m ago",
    contactType: "Resident",
    property: "Hillside Living",
    channel: "SMS",
    assignee: "ELI+ Maintenance AI",
    labels: ["Maintenance AI", "Work Order"],
    status: "open",
    hasUnread: false,
    messages: [
      { role: "resident", text: "I have a question about when the technician will be able to come fix my dishwasher. The work order was submitted last week.", timestamp: "Sep 15 2025 · 6:35pm MST", type: "message" },
      { role: "agent", text: "I apologize for the delay, Omar. Let me check on work order WO #4485 for you. It looks like the part we needed has arrived. I'm scheduling a technician visit for tomorrow between 10am-12pm. Does that work for you?", timestamp: "Sep 15 2025 · 6:36pm MST", type: "message" },
      {
        role: "staff",
        text: "@abekashiwagi — can you confirm parts received on WO #4485 before I lock the visit window?",
        timestamp: "Sep 15 2025 · 6:37pm MST",
        type: "private_note",
        privateNoteAuthor: "Carlos Ruiz",
      },
    ],
  },
  {
    id: "lc-12",
    resident: "Noah Feldman",
    unit: null,
    preview: "Is the rooftop amenity open on weekends?",
    agent: "Staff",
    time: "13m ago",
    contactType: "Lead",
    property: "Jamison Apartments",
    channel: "SMS",
    assignee: "Alex Johnson",
    labels: ["Lead"],
    status: "open",
    hasUnread: false,
    messages: [
      { role: "resident", text: "Is the rooftop amenity open on weekends?", timestamp: "Sep 15 2025 · 6:05pm MST", type: "message" },
      { role: "staff", text: "It is — Saturday 10am–8pm and Sunday 10am–6pm. Want me to add you to a tour invite?", timestamp: "Sep 15 2025 · 6:06pm MST", type: "message" },
    ],
  },
  {
    id: "lc-7",
    resident: "Ahmad Tupiz",
    unit: null,
    preview: "I was wondering if my roommate would be able to rent a sp...",
    agent: "Leasing AI",
    time: "15m ago",
    contactType: "Lead",
    property: "Jamison Apartments",
    channel: "SMS",
    assignee: "ELI+ Leasing AI",
    labels: ["Leasing AI"],
    status: "open",
    hasUnread: false,
    messages: [
      { role: "resident", text: "I was wondering if my roommate would be able to rent a space as well? We'd like to be neighbors if possible.", timestamp: "Sep 15 2025 · 6:30pm MST", type: "message" },
      { role: "agent", text: "Absolutely! We'd love to have you both. We currently have adjacent units available on the 3rd floor. I can reserve both while you complete your applications. Shall I send the application links for both of you?", timestamp: "Sep 15 2025 · 6:31pm MST", type: "message" },
    ],
  },
  {
    id: "lc-8",
    resident: "Terry Lubin",
    unit: "Unit 102",
    preview: "How can I alter my lease so that I can have a shorter lease te...",
    agent: "Renewal AI",
    time: "18m ago",
    contactType: "Resident",
    property: "Hillside Living",
    channel: "Email",
    emailSubject: "Lease term / renewal options — Unit 102",
    assignee: "ELI+ Renewal AI",
    labels: ["Renewal AI", "Renewal Offer"],
    status: "open",
    hasUnread: false,
    messages: [
      { role: "resident", text: "How can I alter my lease so that I can have a shorter lease term? I may need to relocate for work.", timestamp: "Sep 15 2025 · 6:25pm MST", type: "message" },
      { role: "agent", text: "I understand, Terry. We do offer some flexibility. I can present you with a 6-month renewal option at a slightly adjusted rate of $1,520/mo (compared to your current $1,450/mo for the 12-month term). We also have an early termination clause option. Would you like details on either?", timestamp: "Sep 15 2025 · 6:26pm MST", type: "message" },
    ],
  },
  {
    id: "lc-14",
    resident: "Diego Castillo",
    unit: "Unit 908",
    preview: "Can we reschedule the quarterly inspection?",
    agent: "Staff",
    time: "19m ago",
    contactType: "Resident",
    property: "Jamison Apartments",
    channel: "Email",
    emailSubject: "Re: Quarterly unit inspection — reschedule request",
    assignee: "Abe Kashiwagi",
    labels: ["Resident"],
    status: "open",
    hasUnread: false,
    messages: [
      { role: "resident", text: "Can we reschedule the quarterly inspection? Thursday isn’t ideal.", timestamp: "Sep 15 2025 · 5:55pm MST", type: "message" },
      {
        role: "staff",
        text: "Absolutely — I’ve moved you to next Tuesday 10am. You’ll get a calendar invite shortly.",
        timestamp: "Sep 15 2025 · 5:57pm MST",
        type: "message",
        emailSignature: `Best regards,
Abe Kashiwagi
Leasing Specialist

Jamison Apartments
(720) 555-0280
2400 Jamison Circle, Aurora, CO 80014`,
      },
    ],
  },
  {
    id: "lc-15",
    resident: "Priya Nandakumar",
    unit: null,
    preview: "Sounds good — I’ll upload my last 12 months of sta...",
    agent: "Leasing AI",
    time: "17m ago",
    contactType: "Lead",
    property: "Jamison Apartments",
    channel: "SMS",
    assignee: "ELI+ Leasing AI",
    labels: ["Leasing AI", "Leasing AI Escalation"],
    status: "open",
    hasUnread: false,
    messages: [
      { role: "resident", text: "I’m self-employed — can I qualify with 12 months of bank statements instead of pay stubs?", timestamp: "Sep 15 2025 · 5:50pm MST", type: "message" },
      { role: "agent", text: "Thanks for sharing that. I’ve looped in a specialist who can review income documentation with you and walk through next steps. You should hear back within one business day.", timestamp: "Sep 15 2025 · 5:52pm MST", type: "message" },
      { role: "resident", text: "Sounds good — I’ll upload my last 12 months of statements to the portal tonight.", timestamp: "Sep 15 2025 · 5:54pm MST", type: "message" },
      { role: "staff", text: "Perfect Priya — once they're up I'll review overnight and get back to you tomorrow morning with a decision. Thanks for turning these around so fast.", timestamp: "Sep 15 2025 · 5:58pm MST", type: "message" },
    ],
  },
  {
    id: "lc-9",
    resident: "Martin Torff",
    unit: null,
    preview: "If I wanted to add someone who is currently living overseas 3...",
    agent: "Leasing AI",
    time: "20m ago",
    contactType: "Lead",
    property: "Jamison Apartments",
    channel: "SMS",
    assignee: "ELI+ Leasing AI",
    labels: ["Leasing AI"],
    status: "open",
    hasUnread: false,
    messages: [
      { role: "resident", text: "If I wanted to add someone who is currently living overseas to the lease, is that possible? They would be joining me in 3 months.", timestamp: "Sep 15 2025 · 6:20pm MST", type: "message" },
      { role: "agent", text: "Yes, that's possible! We can add them as a co-applicant. They would need to complete a background check and provide proof of income, which can all be done remotely. Once approved, we can amend the lease to include them. Want me to send the co-applicant form?", timestamp: "Sep 15 2025 · 6:21pm MST", type: "message" },
    ],
  },
  {
    id: "lc-10",
    resident: "Cristofer Schleifer",
    unit: null,
    preview: "Yes please — send both application links when you h...",
    agent: "Leasing AI",
    time: "22m ago",
    contactType: "Lead",
    property: "Hillside Living",
    channel: "SMS",
    assignee: "ELI+ Leasing AI",
    labels: ["Leasing AI", "Leasing AI Escalation"],
    status: "open",
    hasUnread: false,
    messages: [
      { role: "resident", text: "I was wondering if my roommate would be able to rent a space as well? We're looking for units near each other.", timestamp: "Sep 15 2025 · 6:15pm MST", type: "message" },
      { role: "agent", text: "Of course! We have several adjacent units available. Let me pull up the options for you. In the meantime, I'm flagging this for a leasing specialist who can help coordinate both applications.", timestamp: "Sep 15 2025 · 6:16pm MST", type: "message" },
      { role: "resident", text: "Yes please — send both application links when you have them.", timestamp: "Sep 15 2025 · 6:17pm MST", type: "message" },
      { role: "staff", text: "Here are both application links — one for you and one for your roommate. I've soft-held Units 214 and 216 (adjacent 1BRs) for 48 hours while you both apply. Let me know if you want a different pair.", timestamp: "Sep 15 2025 · 6:22pm MST", type: "message" },
    ],
  },
  {
    id: "lc-16",
    resident: "Jordan Blake",
    unit: null,
    preview: "Great. Let me know when you have an update on par...",
    agent: "Leasing AI",
    time: "25m ago",
    contactType: "Lead",
    property: "Hillside Living",
    channel: "SMS",
    assignee: "ELI+ Leasing AI",
    labels: ["Leasing AI"],
    status: "open",
    hasUnread: false,
    messages: [
      { role: "resident", text: "Hi — do you have any covered parking for the 2-bedroom units?", timestamp: "Sep 15 2025 · 5:20pm MST", type: "message" },
      { role: "agent", text: "Hi Jordan! Yes — several 2x2s include one covered space. I can send availability for your move-in window.", timestamp: "Sep 15 2025 · 5:21pm MST", type: "message" },
      { role: "resident", text: "Great. Let me know when you have an update on parking spots for Building C.", timestamp: "Sep 15 2025 · 5:25pm MST", type: "message" },
      { role: "staff", text: "Two Building C covered spaces just opened up — G-14 and G-22. Both come with the 2BR on the 4th floor (Unit 405). Want me to hold either while you decide?", timestamp: "Sep 15 2025 · 5:41pm MST", type: "message" },
    ],
  },
  {
    id: "lc-17",
    resident: "Maya Chen",
    unit: null,
    preview: "Follow-up reminder — no reply in 7 days since staff last responded",
    agent: "Staff",
    time: "just now",
    contactType: "Lead",
    property: "Jamison Apartments",
    channel: "Email",
    emailSubject: "Visitor parking policy — weekend stay (prospect)",
    assignee: "Abe Kashiwagi",
    labels: ["Lead"],
    status: "open",
    hasUnread: false,
    messages: [
      {
        role: "resident",
        text: "Hi leasing team — I’m comparing a few communities and wanted to ask: can overnight guests use visitor parking for a full weekend, or is there a nightly limit? I host family fairly often.",
        timestamp: "Sep 8 2025 · 5:08pm MST",
        type: "message",
        emailSignature: "—\nMaya Chen\nProspective resident",
      },
      {
        role: "staff",
        text: "Thanks for asking, Maya. Visitor parking is available on a first-come basis; there isn’t a formal nightly cap for registered guests, but vehicles can’t stay longer than 72 consecutive hours without management approval so we can rotate spaces fairly.\n\nI’ve attached our guest-parking quick guide (where to register a plate and which lots to use).",
        timestamp: "Sep 8 2025 · 5:14pm MST",
        type: "message",
        emailAttachments: [
          { name: "Jamison-Guest-Parking-Quick-Guide.pdf", kind: "file" },
        ],
        emailSignature: `Best regards,
Abe Kashiwagi
Leasing Specialist

Jamison Apartments
(720) 555-0280
2400 Jamison Circle, Aurora, CO 80014`,
      },
      {
        role: "staff",
        type: "thread_activity",
        text: "",
        timestamp: "Sep 15 2025 · 8:00am MST",
        threadActivity: {
          kind: "follow_up_reminder",
          daysIdle: 7,
          sinceRole: "staff",
          sinceTimestamp: "Sep 8 · 5:14pm",
          suggestedAction: "Nudge Maya on the visitor-parking answer and offer to schedule a tour while she's evaluating communities.",
        },
      },
    ],
  },
  {
    id: "lc-18",
    resident: "Ian Moss",
    unit: "Unit 611",
    preview: "Can someone confirm my package locker code was reset?",
    agent: "Staff",
    time: "31m ago",
    contactType: "Resident",
    property: "Hillside Living",
    channel: "Email",
    emailSubject: "Re: Package locker — Unit 611 access issue",
    assignee: "Abe Kashiwagi",
    labels: ["Resident"],
    status: "open",
    hasUnread: false,
    messages: [
      {
        role: "resident",
        text: "The Luxer One locker still won’t take my code after the battery swap yesterday. Can someone confirm it was reset on your side? I have two deliveries stuck.",
        timestamp: "Sep 15 2025 · 4:52pm MST",
        type: "message",
        emailSignature: "Ian Moss\nUnit 611\nian.moss@email.com",
      },
      {
        role: "staff",
        text: "Hi Ian — sorry for the hassle. I reprovisioned your compartment in Entrata and pushed a fresh code to your phone on file (ends in 8824). Try the new 6-digit code within the Luxer app first; if it still fails, ping me here and I’ll put in a vendor ticket today.\n\nCarrier showed one of the packages as “ready for pickup” as of 4:45pm.",
        timestamp: "Sep 15 2025 · 5:01pm MST",
        type: "message",
        emailSignature: `Best regards,
Abe Kashiwagi
Leasing Specialist

Hillside Living
(720) 555-0140
1800 Hillside Parkway, Denver, CO 80205`,
      },
    ],
  },

  // ============================================================================
  // Voice (missed calls / voicemails) — need-action for SA 1.2 demos so the
  // Quick Filter "Voice" tile has content and the Property Threads inbox has
  // callback obligations to show.
  // ============================================================================
  {
    id: "voice-vm-jordan",
    resident: "Jordan Whitaker",
    unit: "Unit 507",
    preview: "Voicemail · 1:34 — Front-door lock keypad is dead, can't get in tonight.",
    agent: "Staff",
    time: "6m ago",
    contactType: "Resident",
    property: "Hillside Living",
    channel: "Voice",
    assignee: "Abe Kashiwagi",
    labels: ["Resident", "Maintenance Escalation"],
    status: "open",
    hasUnread: true,
    messages: [
      {
        role: "resident",
        type: "voicemail",
        text: "Voicemail — see transcript",
        timestamp: "Aug 29 2026 · 8:42pm MST",
        voicemail: {
          durationSec: 94,
          fromNumber: "+1 (720) 555-4402",
          transcript:
            "Jordan Whitaker in unit 507 reported the front-door keypad is unresponsive and they can't get into the building; requested an urgent callback for after-hours access.",
          turns: [
            {
              speaker: "ai",
              text: "Thanks for calling Hillside Living. This is ELI. How can I help you today?",
            },
            {
              speaker: "resident",
              text: "Yeah hi, this is Jordan in unit 507. The keypad on the main entrance is completely dead — I've been trying my code for the last ten minutes and it's not lighting up at all. I'm standing outside with groceries.",
            },
            {
              speaker: "ai",
              text: "I'm sorry, Jordan. Let me flag this for the on-call maintenance team so they can get you in tonight. Is 720-555-4402 the best number for a callback?",
            },
            {
              speaker: "resident",
              text: "Yes, please have someone call me back — I don't have another way in.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "voice-missed-priya",
    resident: "Priya Balakrishnan",
    unit: null,
    preview: "Missed call · rang 42s · 3 attempts in a row",
    agent: "Staff",
    time: "11m ago",
    contactType: "Lead",
    property: "Hillside Living",
    channel: "Voice",
    assignee: "Unassigned",
    labels: ["Lead", "Leasing Escalation"],
    status: "open",
    hasUnread: true,
    messages: [
      {
        role: "resident",
        type: "missed_call",
        text: "Missed call",
        timestamp: "Aug 29 2026 · 8:18pm MST",
        missedCall: {
          fromNumber: "+1 (415) 555-7710",
          attemptCount: 3,
          rangForSec: 42,
        },
      },
      {
        role: "resident",
        type: "missed_call",
        text: "Missed call",
        timestamp: "Aug 29 2026 · 8:22pm MST",
        missedCall: {
          fromNumber: "+1 (415) 555-7710",
          rangForSec: 38,
        },
      },
      {
        role: "resident",
        type: "missed_call",
        text: "Missed call",
        timestamp: "Aug 29 2026 · 8:29pm MST",
        missedCall: {
          fromNumber: "+1 (415) 555-7710",
          rangForSec: 45,
        },
      },
    ],
  },
  {
    id: "voice-vm-mateo",
    resident: "Mateo Alvarez",
    unit: null,
    preview: "Callback complete — booked studio tour for Saturday 10:30am.",
    agent: "Leasing AI",
    time: "24m ago",
    contactType: "Lead",
    property: "Jamison Apartments",
    channel: "Voice",
    assignee: "ELI+ Leasing AI",
    labels: ["Leasing AI"],
    status: "open",
    hasUnread: false,
    messages: [
      {
        role: "resident",
        type: "voicemail",
        text: "Voicemail — see transcript",
        timestamp: "Aug 29 2026 · 8:05pm MST",
        voicemail: {
          durationSec: 48,
          fromNumber: "+1 (602) 555-3391",
          transcript:
            "Mateo Alvarez asked about scheduling a studio tour this weekend and left a callback number.",
          turns: [
            {
              speaker: "resident",
              text: "Hi, this is Mateo Alvarez — I filled out the studio inquiry yesterday and I wanted to lock in a tour for Saturday if any morning times are still open. You can reach me at this number, thanks.",
            },
          ],
        },
      },
      {
        role: "staff",
        type: "thread_activity",
        text: "",
        timestamp: "Aug 29 2026 · 8:14pm MST",
        threadActivity: {
          kind: "phone_call",
          actor: "Abe Kashiwagi",
          phoneNumber: "+1 (602) 555-3391",
          outcome: "connected",
          durationLabel: "4:12",
          notes: "Returned VM. Booked studio tour Sat 10:30am; sent calendar invite and unit link.",
        },
      },
    ],
  },
  {
    id: "voice-vm-natalie",
    resident: "Natalie Ortega",
    unit: "Unit 312",
    preview: "Callback complete — HVAC tech dispatched, ETA under 2 hours.",
    agent: "Staff",
    time: "18m ago",
    contactType: "Resident",
    property: "Jamison Apartments",
    channel: "Voice",
    assignee: "Abe Kashiwagi",
    labels: ["Resident", "Maintenance Escalation"],
    status: "open",
    hasUnread: false,
    messages: [
      {
        role: "resident",
        type: "voicemail",
        text: "Voicemail — see transcript",
        timestamp: "Aug 29 2026 · 8:24pm MST",
        voicemail: {
          durationSec: 72,
          fromNumber: "+1 (480) 555-2288",
          transcript:
            "Natalie Ortega in unit 312 reported the AC unit has been off since 8am and interior temps are climbing past 88°F. Requested same-day service.",
          turns: [
            {
              speaker: "resident",
              text: "Hi, this is Natalie in 312 — our AC has been dead since about 8 this morning and it's up to 88 in here. My two kids are home and it's really uncomfortable. Please have someone come out today if at all possible.",
            },
          ],
        },
      },
      {
        role: "staff",
        type: "thread_activity",
        text: "",
        timestamp: "Aug 29 2026 · 8:33pm MST",
        threadActivity: {
          kind: "phone_call",
          actor: "Abe Kashiwagi",
          phoneNumber: "+1 (480) 555-2288",
          outcome: "connected",
          durationLabel: "5:47",
          notes: "Callback complete. Dispatched on-call HVAC (ETA under 2 hrs). Offered lobby AC while she waits; opened WO #4712.",
        },
      },
    ],
  },
  {
    id: "voice-missed-devon",
    resident: "Devon Cross",
    unit: null,
    preview: "Callback complete — sent tour options for Fri PM & Sat AM.",
    agent: "Leasing AI",
    time: "27m ago",
    contactType: "Lead",
    property: "Jamison Apartments",
    channel: "Voice",
    assignee: "ELI+ Leasing AI",
    labels: ["Leasing AI"],
    status: "open",
    hasUnread: false,
    messages: [
      {
        role: "resident",
        type: "missed_call",
        text: "Missed call",
        timestamp: "Aug 29 2026 · 8:02pm MST",
        missedCall: {
          fromNumber: "+1 (971) 555-6104",
          rangForSec: 31,
        },
      },
      {
        role: "staff",
        type: "thread_activity",
        text: "",
        timestamp: "Aug 29 2026 · 8:11pm MST",
        threadActivity: {
          kind: "phone_call",
          actor: "Abe Kashiwagi",
          phoneNumber: "+1 (971) 555-6104",
          outcome: "connected",
          durationLabel: "2:36",
          notes: "Reached Devon. Wants a 1BR facing the courtyard, budget $1.9k. Sent tour options for Fri 4pm and Sat 10am — waiting on preference.",
        },
      },
    ],
  },
  {
    id: "voice-vm-simone",
    resident: "Simone Bakari",
    unit: "Unit 1104",
    preview: "Callback complete — late fee waived, autopay re-verified for Oct.",
    agent: "Staff",
    time: "38m ago",
    contactType: "Resident",
    property: "Hillside Living",
    channel: "Voice",
    assignee: "Abe Kashiwagi",
    labels: ["Resident", "Payments Escalation"],
    status: "open",
    hasUnread: false,
    messages: [
      {
        role: "resident",
        type: "voicemail",
        text: "Voicemail — see transcript",
        timestamp: "Aug 29 2026 · 7:51pm MST",
        voicemail: {
          durationSec: 52,
          fromNumber: "+1 (206) 555-8823",
          transcript:
            "Simone Bakari in unit 1104 says autopay did not run for September rent and she just received a late-fee notice. Wants a callback before the office closes tomorrow to sort out the fee and reconfirm autopay.",
          turns: [
            {
              speaker: "resident",
              text: "Hi, this is Simone in 1104. My autopay was supposed to run on the first and it looks like it never did — I just got the late-fee text. I've had autopay on for two years so something's off. Please call me back before you close tomorrow.",
            },
          ],
        },
      },
      {
        role: "staff",
        type: "thread_activity",
        text: "",
        timestamp: "Aug 29 2026 · 8:04pm MST",
        threadActivity: {
          kind: "phone_call",
          actor: "Abe Kashiwagi",
          phoneNumber: "+1 (206) 555-8823",
          outcome: "connected",
          durationLabel: "6:18",
          notes: "Reached Simone. Confirmed her card on file expired 8/31 — she updated it on the call. Waived $75 late fee, re-armed autopay for Oct 1. Sent receipt of fee waiver via email.",
        },
      },
    ],
  },
  {
    id: "voice-missed-hannah",
    resident: "Hannah Delacroix",
    unit: null,
    preview: "Callback complete — texted pet-friendly 2BR list.",
    agent: "Leasing AI",
    time: "51m ago",
    contactType: "Lead",
    property: "Hillside Living",
    channel: "Voice",
    assignee: "ELI+ Leasing AI",
    labels: ["Leasing AI"],
    status: "open",
    hasUnread: false,
    messages: [
      {
        role: "resident",
        type: "missed_call",
        text: "Missed call",
        timestamp: "Aug 29 2026 · 7:38pm MST",
        missedCall: {
          fromNumber: "+1 (503) 555-4471",
          attemptCount: 2,
          rangForSec: 46,
        },
      },
      {
        role: "resident",
        type: "missed_call",
        text: "Missed call",
        timestamp: "Aug 29 2026 · 7:44pm MST",
        missedCall: {
          fromNumber: "+1 (503) 555-4471",
          rangForSec: 40,
        },
      },
      {
        role: "staff",
        type: "thread_activity",
        text: "",
        timestamp: "Aug 29 2026 · 7:55pm MST",
        threadActivity: {
          kind: "phone_call",
          actor: "Abe Kashiwagi",
          phoneNumber: "+1 (503) 555-4471",
          outcome: "connected",
          durationLabel: "3:22",
          notes: "Called Hannah back. Two large dogs, 2BR needed, move-in 10/15. Texted her the pet-friendly 2BR list with pet deposit info and tour slots.",
        },
      },
    ],
  },
  {
    id: "voice-vm-terrence",
    resident: "Terrence Yao",
    unit: "Unit 706",
    preview: "Follow-up reminder — no reply in 4 days since staff last responded",
    agent: "Renewals AI",
    time: "just now",
    contactType: "Resident",
    property: "Jamison Apartments",
    channel: "Voice",
    assignee: "ELI+ Renewals AI",
    labels: ["Renewals AI"],
    status: "open",
    hasUnread: false,
    messages: [
      {
        role: "resident",
        type: "voicemail",
        text: "Voicemail — see transcript",
        timestamp: "Aug 25 2026 · 7:29pm MST",
        voicemail: {
          durationSec: 65,
          fromNumber: "+1 (971) 555-2245",
          transcript:
            "Terrence Yao in unit 706 has a question about the renewal offer that arrived by email — wants to walk through the two term options with a person before signing, deadline is Sept 15.",
          turns: [
            {
              speaker: "resident",
              text: "Hey, this is Terrence in 706. I got the renewal offer email and I have some questions before I sign — I want to talk through the twelve versus fifteen month option with somebody. Give me a call whenever, thanks.",
            },
          ],
        },
      },
      {
        role: "staff",
        type: "thread_activity",
        text: "",
        timestamp: "Aug 25 2026 · 8:12pm MST",
        threadActivity: {
          kind: "phone_call",
          actor: "Abe Kashiwagi",
          phoneNumber: "+1 (971) 555-2245",
          outcome: "failed",
          notes: "Called back — went to voicemail. Left a message walking through 12-mo vs 15-mo renewal pricing and offered to book a 15-min call.",
        },
      },
      {
        role: "staff",
        type: "thread_activity",
        text: "",
        timestamp: "Aug 29 2026 · 8:00am MST",
        threadActivity: {
          kind: "follow_up_reminder",
          daysIdle: 4,
          sinceRole: "staff",
          sinceTimestamp: "Aug 25 · 8:12pm",
          suggestedAction: "Renewal deadline is Sept 15 — try a second callback or send the two pricing options via SMS.",
        },
      },
    ],
  },

  // ============================================================================
  // Chat need-action — resident sent the last public message, awaiting a
  // property reply. Uses the "Resident Chat" channel (maps to the Chat quick-
  // filter tile).
  // ============================================================================
  {
    id: "chat-need-derek",
    resident: "Derek Simmons",
    unit: "Unit 208",
    preview: "Can I still get on the reserved parking waitlist if I signed my lease last week?",
    agent: "Staff",
    time: "9m ago",
    contactType: "Resident",
    property: "Hillside Living",
    channel: "Resident Chat",
    assignee: "Abe Kashiwagi",
    labels: ["Resident"],
    status: "open",
    hasUnread: true,
    messages: [
      {
        role: "resident",
        text: "Hey — I saw the note about reserved parking on the community board. I just moved into 208 last Wednesday. Can I still get on the waitlist even though I already signed my lease?",
        timestamp: "Aug 29 2026 · 8:20pm MST",
        type: "message",
      },
    ],
  },
  {
    id: "chat-need-yasmin",
    resident: "Yasmin El-Sayed",
    unit: "Unit 1104",
    preview: "The elevator on the 11th floor makes a grinding noise — is that being looked at?",
    agent: "Staff",
    time: "16m ago",
    contactType: "Resident",
    property: "Jamison Apartments",
    channel: "Resident Chat",
    assignee: "Alex Johnson",
    labels: ["Resident", "Maintenance Escalation"],
    status: "open",
    hasUnread: true,
    messages: [
      {
        role: "resident",
        text: "Hi, the elevator on the 11th floor has been making a grinding noise every time it opens on my floor for the last three days. Is that being looked at? Happy to demo it if maintenance wants to come up.",
        timestamp: "Aug 29 2026 · 8:12pm MST",
        type: "message",
      },
    ],
  },

  // ============================================================================
  // Follow-up reminder demo threads (SA 1.2). Each one lands with an amber
  // marker on the thread card, driven by Thread Automation. Kept together so
  // they're easy to find and adjust.
  // ============================================================================
  {
    // SMS · Property Threads · Payments Escalation · single 4-day threshold fired.
    id: "sa12-followup-marcus",
    resident: "Marcus Doyle",
    unit: "Unit 302",
    preview: "Follow-up reminder — no reply in 4 days since staff last responded",
    agent: "Staff",
    time: "just now",
    contactType: "Resident",
    property: "Hillside Living",
    channel: "SMS",
    assignee: "Abe Kashiwagi",
    labels: ["Resident", "Payments Escalation"],
    status: "open",
    hasUnread: false,
    messages: [
      {
        role: "resident",
        text: "My rent hasn't gone through this month even though autopay is on — can someone look into it? I don't want a late fee.",
        timestamp: "Sep 10 2025 · 3:14pm MST",
        type: "message",
      },
      {
        role: "staff",
        text: "Hey Marcus — pulled up your ledger. Looks like the card on file expired 9/1 so the pull failed. I've disabled the late fee for this cycle. Want to update the card in the portal or use a bank draft this month?",
        timestamp: "Sep 11 2025 · 9:22am MST",
        type: "message",
      },
      {
        role: "staff",
        type: "thread_activity",
        text: "",
        timestamp: "Sep 15 2025 · 8:00am MST",
        threadActivity: {
          kind: "follow_up_reminder",
          daysIdle: 4,
          sinceRole: "staff",
          sinceTimestamp: "Sep 11 · 9:22am",
          suggestedAction: "Nudge Marcus — payment still isn't posted and the grace period ends Friday.",
        },
      },
    ],
  },
  {
    // Email · Property Threads · Leasing AI Escalation · MULTI-threshold demo:
    // both the 3-day and 7-day rules have fired.
    id: "sa12-followup-genevieve",
    resident: "Genevieve Marchetti",
    unit: null,
    preview: "Follow-up reminder — no reply in 7 days since staff last responded",
    agent: "Staff",
    time: "just now",
    contactType: "Lead",
    property: "Jamison Apartments",
    channel: "Email",
    emailSubject: "Re: Availability + pricing — 2-bed corner units, October move-in",
    assignee: "Abe Kashiwagi",
    labels: ["Lead", "Leasing AI Escalation"],
    status: "open",
    hasUnread: false,
    messages: [
      {
        role: "resident",
        text: "Hi — I filled out the corner-unit inquiry on the website last week. Do you have any 2-beds with the corner floorplan opening between Oct 1–15? Looking for around $2,400 and I have two indoor cats.",
        timestamp: "Sep 7 2025 · 4:18pm MST",
        type: "message",
        emailSignature: "—\nGenevieve Marchetti\nProspective resident\ngenevieve.m@example.com",
      },
      {
        role: "staff",
        text: "Hi Genevieve — thanks for reaching out. Two corner 2-beds fit your window: Unit 812 (Oct 3, $2,395) and Unit 1108 (Oct 12, $2,450). Both are pet-friendly with a $300 refundable pet deposit. I've attached the floorplans and a corner-unit walkthrough video — happy to hold either while you decide.",
        timestamp: "Sep 8 2025 · 10:04am MST",
        type: "message",
        emailAttachments: [
          { name: "Jamison-2BR-Corner-Floorplan.pdf", kind: "file" },
          { name: "Corner-Unit-Walkthrough-Sept2025.mp4", kind: "file" },
        ],
        emailSignature: `Best regards,
Abe Kashiwagi
Leasing Specialist

Jamison Apartments
(720) 555-0280
2400 Jamison Circle, Aurora, CO 80014`,
      },
      {
        role: "staff",
        type: "thread_activity",
        text: "",
        timestamp: "Sep 11 2025 · 8:00am MST",
        threadActivity: {
          kind: "follow_up_reminder",
          daysIdle: 3,
          sinceRole: "staff",
          sinceTimestamp: "Sep 8 · 10:04am",
          suggestedAction: "Send a friendly nudge asking if she'd like to lock in Unit 812 or 1108 before someone else does.",
        },
      },
      {
        role: "staff",
        type: "thread_activity",
        text: "",
        timestamp: "Sep 15 2025 · 8:00am MST",
        threadActivity: {
          kind: "follow_up_reminder",
          daysIdle: 7,
          sinceRole: "staff",
          sinceTimestamp: "Sep 8 · 10:04am",
          suggestedAction: "Second threshold hit — try a phone call before Genevieve moves on. Both units still available.",
        },
      },
    ],
  },
  {
    // SMS · Eli Threads · Renewals AI · single 5-day threshold fired.
    // Demonstrates the amber marker firing in the Eli inbox (not just Property).
    id: "sa12-followup-priya-r",
    resident: "Priya Ranganathan",
    unit: "Unit 507",
    preview: "Follow-up reminder — no reply in 5 days since the AI agent last responded",
    agent: "Renewals AI",
    time: "just now",
    contactType: "Resident",
    property: "Hillside Living",
    channel: "SMS",
    assignee: "ELI+ Renewals AI",
    labels: ["Renewals AI"],
    status: "open",
    hasUnread: false,
    messages: [
      {
        role: "resident",
        text: "Got the renewal email — is the 13-month special still available if I sign this week?",
        timestamp: "Sep 9 2025 · 6:32pm MST",
        type: "message",
      },
      {
        role: "agent",
        text: "Hi Priya — yes, the 13-month promo is locked in for anyone who signs before Sept 20 ($1,585/mo vs $1,620 for a straight 12-month). Want me to prep the addendum for signature?",
        timestamp: "Sep 9 2025 · 6:34pm MST",
        type: "message",
      },
      {
        role: "staff",
        type: "thread_activity",
        text: "",
        timestamp: "Sep 15 2025 · 8:00am MST",
        threadActivity: {
          kind: "follow_up_reminder",
          daysIdle: 5,
          sinceRole: "agent",
          sinceTimestamp: "Sep 9 · 6:34pm",
          suggestedAction: "Sept 20 deadline is 5 days out — send a nudge or call to confirm before the promo expires.",
        },
      },
    ],
  },

  // ============================================================================
  // Closed Threads — resolved conversations across channels, so the Closed
  // Threads inbox is not empty on first load.
  // ============================================================================
  {
    id: "closed-sms-daniela",
    resident: "Daniela Cruz",
    unit: "Unit 402",
    preview: "Perfect, thank you! Got the new fob and the code works now.",
    agent: "Staff",
    time: "Yesterday",
    contactType: "Resident",
    property: "Hillside Living",
    channel: "SMS",
    assignee: "Abe Kashiwagi",
    labels: ["Resident"],
    status: "resolved",
    hasUnread: false,
    messages: [
      {
        role: "resident",
        text: "Hi — my fob stopped working at the garage door this morning.",
        timestamp: "Aug 28 2026 · 9:14am MST",
        type: "message",
      },
      {
        role: "staff",
        text: "Sorry about that Daniela — I re-provisioned the fob and it should work now. Give it a try and let me know.",
        timestamp: "Aug 28 2026 · 9:32am MST",
        type: "message",
      },
      {
        role: "resident",
        text: "Perfect, thank you! Got the new fob and the code works now.",
        timestamp: "Aug 28 2026 · 10:02am MST",
        type: "message",
      },
    ],
  },
  {
    id: "closed-email-marcus",
    resident: "Marcus Chen",
    unit: null,
    preview: "Signed the application — thanks for the fast turnaround.",
    agent: "Leasing AI",
    time: "Yesterday",
    contactType: "Lead",
    property: "Hillside Living",
    channel: "Email",
    emailSubject: "Application submitted — 1BR pricing question",
    assignee: "ELI+ Leasing AI",
    labels: ["Leasing AI", "Lead"],
    status: "resolved",
    hasUnread: false,
    messages: [
      {
        role: "resident",
        text: "Hi — I'd like to apply for the 1-bedroom listed at $1,750. What's the application fee and is there anything I should have ready?",
        timestamp: "Aug 28 2026 · 3:04pm MST",
        type: "message",
      },
      {
        role: "agent",
        text: "Hi Marcus — application fee is $50, and you'll want a photo ID and last 30 days of income docs. I've sent the application link to this email.",
        timestamp: "Aug 28 2026 · 3:05pm MST",
        type: "message",
      },
      {
        role: "resident",
        text: "Signed the application — thanks for the fast turnaround.",
        timestamp: "Aug 28 2026 · 4:41pm MST",
        type: "message",
      },
    ],
  },
  {
    id: "closed-chat-yolanda",
    resident: "Yolanda Perez",
    unit: "Unit 613",
    preview: "Got the confirmation email, thanks!",
    agent: "Payments AI",
    time: "2d ago",
    contactType: "Resident",
    property: "Hillside Living",
    channel: "Resident Chat",
    assignee: "ELI+ Payments AI",
    labels: ["Payments AI", "Resident"],
    status: "resolved",
    hasUnread: false,
    messages: [
      {
        role: "resident",
        text: "I paid rent this morning but I don't see it reflected on my ledger yet.",
        timestamp: "Aug 27 2026 · 11:20am MST",
        type: "message",
      },
      {
        role: "agent",
        text: "I see the payment posted at 11:04am — it should reflect on the ledger within an hour. I've kicked off a manual refresh for you.",
        timestamp: "Aug 27 2026 · 11:22am MST",
        type: "message",
      },
      {
        role: "resident",
        text: "Got the confirmation email, thanks!",
        timestamp: "Aug 27 2026 · 12:08pm MST",
        type: "message",
      },
    ],
  },
  {
    id: "closed-voice-anna",
    resident: "Anna Bergstrom",
    unit: "Unit 305",
    preview: "Voicemail · 0:38 — resolved after callback, package located.",
    agent: "Staff",
    time: "3d ago",
    contactType: "Resident",
    property: "Hillside Living",
    channel: "Voice",
    assignee: "Abe Kashiwagi",
    labels: ["Resident"],
    status: "resolved",
    hasUnread: false,
    messages: [
      {
        role: "resident",
        type: "voicemail",
        text: "Voicemail — see transcript",
        timestamp: "Aug 26 2026 · 2:15pm MST",
        voicemail: {
          durationSec: 38,
          fromNumber: "+1 (720) 555-9821",
          transcript:
            "Anna Bergstrom in unit 305 called about a missing package she was expecting; ELI logged a callback request.",
          turns: [
            {
              speaker: "resident",
              text: "Hi, this is Anna in 305 — my package says it was delivered to the parcel room but I can't find it. Can someone call me back? Thanks.",
            },
          ],
        },
      },
      {
        role: "staff",
        text: "Called Anna back at 2:32pm — package was in locker C-12; she has the pickup code. Closing out.",
        timestamp: "Aug 26 2026 · 2:33pm MST",
        type: "message",
      },
    ],
  },
  {
    id: "closed-email-terrence",
    resident: "Terrence Ho",
    unit: "Unit 811",
    preview: "Renewal signed — see you Sept 1.",
    agent: "Renewal AI",
    time: "5d ago",
    contactType: "Resident",
    property: "Jamison Apartments",
    emailSubject: "Renewal offer — Unit 811",
    channel: "Email",
    assignee: "ELI+ Renewal AI",
    labels: ["Renewal AI", "Renewal Offer", "Resident"],
    status: "resolved",
    hasUnread: false,
    messages: [
      {
        role: "agent",
        text: "Hi Terrence — attached is your renewal offer for Unit 811. The 12-month term keeps your current rate.",
        timestamp: "Aug 24 2026 · 10:00am MST",
        type: "message",
      },
      {
        role: "resident",
        text: "Renewal signed — see you Sept 1.",
        timestamp: "Aug 24 2026 · 3:47pm MST",
        type: "message",
      },
    ],
  },
];

/**
 * Canonical short reasons for Super Agent escalation labels.
 * Used by escalation timeline banners and the Escalation Context / AI Summary panels.
 */
export const ESCALATION_REASON_BY_LABEL: Record<string, string> = {
  "Renewals AI Escalation":
    "Resident is requesting a rate exception on their 12-month renewal offer ($1,850/mo, 3% increase). They've been a tenant for 2 years with on-time payment history and feel the increase is higher than expected.",
  "Payments AI Escalation":
    "Resident's October rent payment ($1,795) was returned due to insufficient funds (employer payroll delay). A $50 late fee was applied. Resident is requesting a late fee waiver given their clean 2-year payment history.",
  "Other Escalation":
    "Resident wants to host a birthday party at the pool area next month (15–20 guests, Saturday afternoon). Needs info on reservation process, community guidelines, and any applicable fees.",
  "Maintenance AI 1 Escalation":
    "Resident asked when a technician will arrive for dishwasher work order #48219 (submitted last week). Maintenance AI could not confirm a schedule from available data and escalated for staff to check the queue.",
  "Maintenance AI 2 Escalation":
    "While still waiting on the dishwasher update, resident reported a separate issue — A/C not blowing cold air. Maintenance AI escalated so staff can open or prioritize a second work order independent of #48219.",
};

export function getEscalationReason(label: string): string {
  return ESCALATION_REASON_BY_LABEL[label] ?? "AI escalated this topic for staff review.";
}

export const SUPER_AGENT_DEMO_THREADS: ConversationItem[] = [
  {
    id: "sa-1",
    resident: "Marcus Rivera",
    unit: "Unit 208",
    preview: "Sounds good, thank you. Let me know what they say about everything.",
    agent: "AI Super Agent",
    time: "3m ago",
    contactType: "Resident",
    property: "Hillside Living",
    channel: "SMS",
    assignee: "ELI+ Super Agent",
    labels: ["AI Conversation", "Renewals AI Escalation", "Payments AI Escalation", "Other Escalation"],
    escalationId: "esc-super-marcus-01",
    status: "open",
    hasUnread: true,
    messages: [
      { role: "agent", text: "Hi Marcus! This is Hillside Living's AI assistant. How can I help you today?", timestamp: "Sep 16 2025 \u00b7 10:00am MST", type: "message" },
      { role: "resident", text: "Hey, I have a couple of things. First, I want to know about renewing my lease \u2014 my current one ends in December and I want to understand my options.", timestamp: "Sep 16 2025 \u00b7 10:01am MST", type: "message" },
      { role: "agent", text: "Of course! I can help with your lease renewal. Your current lease for Unit 208 expires December 31, 2025. I see we have a few renewal options available:\n\n\u2022 12-month renewal at $1,850/mo (3% increase)\n\u2022 6-month renewal at $1,925/mo\n\u2022 Month-to-month at $2,050/mo\n\nWould you like more details on any of these, or would you like me to send a formal renewal offer?", timestamp: "Sep 16 2025 \u00b7 10:02am MST", type: "message" },
      { role: "resident", text: "The 3% increase is more than I was expecting. Is there any flexibility on that? I've been here two years and always pay on time.", timestamp: "Sep 16 2025 \u00b7 10:04am MST", type: "message" },
      { role: "agent", text: "I completely understand, Marcus. Since you're asking about a rate exception on your renewal offer, I'm going to bring in a team member who can review your account history and discuss options with you. They'll follow up shortly.\n\nIn the meantime, is there anything else I can help with?", timestamp: "Sep 16 2025 \u00b7 10:05am MST", type: "message" },
      { role: "staff", text: "", timestamp: "Sep 16 2025 \u00b7 10:05am MST", type: "handoff" },
      { role: "staff", text: "", timestamp: "Sep 16 2025 \u00b7 10:05am MST", type: "label_activity", labelActivity: { actor: "ELI+ Super Agent", labelsAdded: ["Renewals AI Escalation"], action: "added", reason: ESCALATION_REASON_BY_LABEL["Renewals AI Escalation"] } },
      { role: "resident", text: "Also, my rent payment bounced and I got a late fee. Can you help with that too?", timestamp: "Sep 16 2025 \u00b7 10:06am MST", type: "message" },
      { role: "agent", text: "I'm sorry to hear that, Marcus. Let me look into your payment situation.\n\nI can see your October payment of $1,795 was returned on Oct 3rd due to insufficient funds, and a $50 late fee was applied on Oct 6th. To get this resolved, I'll need a team member to review the late fee waiver request since this involves account adjustments.\n\nI've flagged this for the team alongside your renewal question. They'll be able to help with both!", timestamp: "Sep 16 2025 \u00b7 10:07am MST", type: "message" },
      { role: "staff", text: "", timestamp: "Sep 16 2025 \u00b7 10:07am MST", type: "label_activity", labelActivity: { actor: "ELI+ Super Agent", labelsAdded: ["Payments AI Escalation"], action: "added", reason: ESCALATION_REASON_BY_LABEL["Payments AI Escalation"] } },
      { role: "resident", text: "Ok thanks. Yeah the payment bounced because my direct deposit was delayed from my employer. It's never happened before.", timestamp: "Sep 16 2025 \u00b7 10:08am MST", type: "message" },
      { role: "agent", text: "That makes sense \u2014 those payroll delays are frustrating. Given your clean payment history over two years, the team will definitely take that into account when reviewing the late fee. Hang tight and someone will follow up on both the renewal rate and the late fee.", timestamp: "Sep 16 2025 \u00b7 10:09am MST", type: "message" },
      { role: "resident", text: "One more thing \u2014 I'm thinking about hosting a birthday party at the pool area next month. Is that something I need to reserve or get permission for? It would be maybe 15\u201320 people on a Saturday afternoon.", timestamp: "Sep 16 2025 \u00b7 10:10am MST", type: "message" },
      { role: "agent", text: "Great question! The pool area can be reserved for private events. However, for parties over 10 guests I'll need to connect you with our team to go over the community guidelines, reservation process, and any applicable fees. Let me flag this for them.", timestamp: "Sep 16 2025 \u00b7 10:11am MST", type: "message" },
      { role: "staff", text: "", timestamp: "Sep 16 2025 \u00b7 10:11am MST", type: "label_activity", labelActivity: { actor: "ELI+ Super Agent", labelsAdded: ["Other Escalation"], action: "added", reason: ESCALATION_REASON_BY_LABEL["Other Escalation"] } },
      { role: "resident", text: "Sounds good, thank you. Let me know what they say about everything.", timestamp: "Sep 16 2025 \u00b7 10:12am MST", type: "message" },
    ],
  },
];

const SUPER_AGENT_DEMO_THREAD_IDS = new Set(SUPER_AGENT_DEMO_THREADS.map((c) => c.id));

export function isSuperAgentDemoThread(id: string): boolean {
  return SUPER_AGENT_DEMO_THREAD_IDS.has(id);
}

/** Super Agent 1.0 demo threads — same escalation structure but uses normal composer + resolve button. */
const SUPER_AGENT_1_DEMO_THREADS: ConversationItem[] = [
  {
    id: "sa1-1",
    resident: "Jordan Lee",
    unit: "Unit 312",
    preview: "Thanks — just keep me posted on both when you can.",
    agent: "AI Super Agent",
    time: "5m ago",
    contactType: "Resident",
    property: "Hillside Living",
    channel: "SMS",
    assignee: "ELI+ Super Agent",
    labels: ["ELI Conversation", "Maintenance AI 1 Escalation", "Maintenance AI 2 Escalation"],
    escalationId: "esc-super1-jordan-01",
    status: "open",
    hasUnread: true,
    messages: [
      {
        role: "agent",
        text: "Hi Jordan! This is Hillside Living's AI assistant. How can I help you today?",
        timestamp: "Sep 18 2025 · 9:00am MST",
        type: "message",
      },
      {
        role: "resident",
        text: "Hey — I submitted a work order last week for my dishwasher (WO #48219) and still haven't heard when someone is coming. Any update on timing?",
        timestamp: "Sep 18 2025 · 9:01am MST",
        type: "message",
      },
      {
        role: "agent",
        text: "Thanks for checking in, Jordan. I can see work order #48219 for the dishwasher in Unit 312, but I don't have a confirmed technician window in my system yet.\n\nI'm escalating this so our maintenance team can pull the schedule and get you a real ETA.",
        timestamp: "Sep 18 2025 · 9:02am MST",
        type: "message",
      },
      { role: "staff", text: "", timestamp: "Sep 18 2025 · 9:02am MST", type: "handoff" },
      {
        role: "staff",
        text: "",
        timestamp: "Sep 18 2025 · 9:02am MST",
        type: "label_activity",
        labelActivity: {
          actor: "ELI+ Super Agent",
          labelsAdded: ["Maintenance AI 1 Escalation"],
          action: "added",
          reason: ESCALATION_REASON_BY_LABEL["Maintenance AI 1 Escalation"],
        },
      },
      {
        role: "resident",
        text: "Ok thanks. While I have you — the A/C in my unit isn't blowing cold either. It got warm this afternoon. Can someone look at that too? That's separate from the dishwasher.",
        timestamp: "Sep 18 2025 · 9:04am MST",
        type: "message",
      },
      {
        role: "agent",
        text: "Got it — that's a second issue from the dishwasher work order. I'll escalate the A/C problem on its own so maintenance can open or prioritize a separate ticket without delaying your dishwasher follow-up.",
        timestamp: "Sep 18 2025 · 9:05am MST",
        type: "message",
      },
      {
        role: "staff",
        text: "",
        timestamp: "Sep 18 2025 · 9:05am MST",
        type: "label_activity",
        labelActivity: {
          actor: "ELI+ Super Agent",
          labelsAdded: ["Maintenance AI 2 Escalation"],
          action: "added",
          reason: ESCALATION_REASON_BY_LABEL["Maintenance AI 2 Escalation"],
        },
      },
      {
        role: "resident",
        text: "Thanks — just keep me posted on both when you can.",
        timestamp: "Sep 18 2025 · 9:06am MST",
        type: "message",
      },
    ],
  },
];

const SUPER_AGENT_1_DEMO_THREAD_IDS = new Set(SUPER_AGENT_1_DEMO_THREADS.map((c) => c.id));

export function isSuperAgent1DemoThread(id: string): boolean {
  return SUPER_AGENT_1_DEMO_THREAD_IDS.has(id);
}

/**
 * Translation demo: Spanish-speaking resident thread. Surfaces only when the
 * Translation toggle in Communications Demo Controls is on. Each resident-authored
 * message carries `language: "es"` + an `translation` field so the reviewer can
 * flip between Spanish and English inline.
 */
export const TRANSLATION_DEMO_THREADS: ConversationItem[] = [
  {
    id: "translation-demo-alma",
    resident: "Alma Sanchez",
    unit: "Unit 214",
    preview: "¿Podría alguien venir a revisar el aire acondicionado hoy?",
    agent: "Leasing AI",
    time: "6m ago",
    contactType: "Resident",
    property: "Hillside Living",
    channel: "SMS",
    assignee: "Abe Kashiwagi",
    labels: ["Resident"],
    status: "open",
    hasUnread: true,
    messages: [
      {
        role: "resident",
        text: "Hola, buenos días. El aire acondicionado en mi apartamento no está enfriando desde anoche.",
        timestamp: "Aug 14 2026 · 9:02am MST",
        type: "message",
        language: "es",
        translation:
          "Hi, good morning. The air conditioning in my apartment hasn't been cooling since last night.",
      },
      {
        role: "resident",
        text: "¿Podría alguien venir a revisar el aire acondicionado hoy? Hace mucho calor y tengo a mi hija en casa.",
        timestamp: "Aug 14 2026 · 9:03am MST",
        type: "message",
        language: "es",
        translation:
          "Could someone come check the air conditioning today? It's very hot and I have my daughter at home.",
      },
    ],
  },
];

const TRANSLATION_DEMO_THREAD_IDS = new Set(TRANSLATION_DEMO_THREADS.map((c) => c.id));

/** True when the thread was injected by the translation demo toggle. */
export function isTranslationDemoThread(id: string): boolean {
  return TRANSLATION_DEMO_THREAD_IDS.has(id);
}

type ConversationsContextValue = {
  items: ConversationItem[];
  filteredItems: ConversationItem[];
  propertyCount: number;
  addMessage: (conversationId: string, message: ConversationMessage) => void;
  addConversation: (item: Omit<ConversationItem, "id">) => string;
  updateAssignee: (conversationId: string, assignee: string, assignedBy?: string) => void;
  getConversation: (id: string) => ConversationItem | undefined;
  resolveConversation: (id: string, resolvedBy?: string, opts?: { notes?: string; resolutionType?: "general" | "incoming" | "outgoing" }) => void;
  reopenConversation: (id: string, reopenedBy?: string) => void;
  recordThreadActivity: (conversationId: string, activity: ThreadActivity) => void;
  addLabel: (id: string, label: string, appliedBy?: string) => void;
  removeLabel: (id: string, label: string) => void;
  markRead: (id: string, reader?: string) => void;
};

const ConversationsContext = createContext<ConversationsContextValue | null>(null);

const CLICK_TO_CALL_DEMO_THREAD_IDS = new Set(CLICK_TO_CALL_DEMO_THREADS.map((c) => c.id));

/** True when the thread was injected by the click-to-call demo toggle. */
export function isClickToCallDemoThread(id: string): boolean {
  return CLICK_TO_CALL_DEMO_THREAD_IDS.has(id);
}

export function ConversationsProvider({ children }: { children: React.ReactNode }) {
  const { roleProperties } = useRole();
  const { clickToCallEnabled } = useClickToCallDemo();
  const { superAgentEnabled, superAgent1Enabled } = useConversationsDemo();
  const { translationEnabled } = useTranslationDemo();
  const [items, setItems] = useState<ConversationItem[]>(() => {
    const seeded = [
      ...CLICK_TO_CALL_DEMO_THREADS,
      ...SUPER_AGENT_DEMO_THREADS,
      ...SUPER_AGENT_1_DEMO_THREADS,
      ...TRANSLATION_DEMO_THREADS,
      ...INITIAL,
    ];
    return seeded.map((c) => {
      const labels = ensureAiLabelCompanions(c.labels);
      return { ...c, labels, hasUnread: clampHasUnread(c.messages, c.hasUnread) };
    });
  });

  const filteredItems = useMemo(
    () =>
      items.filter((c) => {
        // Phone demo threads (missed call / voicemail) surface for Click To Call
        // or Super Agent 1.0 — SA1 needs those inbox examples without a second toggle.
        if (!clickToCallEnabled && !superAgent1Enabled && isClickToCallDemoThread(c.id)) return false;
        if (!superAgentEnabled && isSuperAgentDemoThread(c.id)) return false;
        if (!superAgent1Enabled && isSuperAgent1DemoThread(c.id)) return false;
        if (!translationEnabled && isTranslationDemoThread(c.id)) return false;
        return matchesRoleProperties(c.property, roleProperties);
      }),
    [items, clickToCallEnabled, superAgentEnabled, superAgent1Enabled, translationEnabled, roleProperties]
  );

  const propertyCount = new Set(filteredItems.map((c) => c.property)).size;

  const addMessage = useCallback((conversationId: string, message: ConversationMessage) => {
    setItems((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;
        const nextMessages = [...c.messages, message];
        if (message.type === "label_activity" || message.type === "thread_activity") {
          return {
            ...c,
            messages: nextMessages,
            hasUnread: nextHasUnreadAfterAppend(c, message),
          };
        }
        const truncated = message.text.length > 50 ? message.text.slice(0, 50) + "..." : message.text;
        return {
          ...c,
          messages: nextMessages,
          preview: truncated,
          time: "just now",
          hasUnread: nextHasUnreadAfterAppend(c, message),
        };
      })
    );
  }, []);

  const addConversation = useCallback((item: Omit<ConversationItem, "id">) => {
    const id = `lc-${Date.now()}`;
    const labels = ensureAiLabelCompanions(item.labels);
    const normalized: ConversationItem = {
      ...item,
      id,
      labels,
      hasUnread: clampHasUnread(item.messages, item.hasUnread),
    };
    setItems((prev) => [normalized, ...prev]);
    return id;
  }, []);

  const recordThreadActivity = useCallback((conversationId: string, activity: ThreadActivity) => {
    const message = buildThreadActivityMessage(activity);
    setItems((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          messages: [...c.messages, message],
          hasUnread: nextHasUnreadAfterAppend(c, message),
        };
      })
    );
  }, []);

  const updateAssignee = useCallback(
    (conversationId: string, assignee: string, assignedBy = DEFAULT_CONVERSATION_ACTIVITY_ACTOR) => {
      setItems((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c;
          if (assignee === UNASSIGN_CONVERSATION_VALUE) {
            if (c.assignee === CONVERSATION_UNASSIGNED_ASSIGNEE) return c;
            const message = buildThreadActivityMessage({
              kind: "assignment_cleared",
              actor: assignedBy,
              previousAssignee: c.assignee,
            });
            const nextMessages = [...c.messages, message];
            return {
              ...c,
              assignee: CONVERSATION_UNASSIGNED_ASSIGNEE,
              messages: nextMessages,
              hasUnread: nextHasUnreadAfterAppend(c, message),
            };
          }
          if (c.assignee === assignee) return c;
          const message = buildThreadActivityMessage({
            kind: "assignment",
            assignee,
            assignedBy,
            previousAssignee: c.assignee,
          });
          const nextMessages = [...c.messages, message];
          return {
            ...c,
            assignee,
            messages: nextMessages,
            hasUnread: nextHasUnreadAfterAppend(c, message),
          };
        })
      );
    },
    []
  );

  const getConversation = useCallback((id: string) => {
    return items.find((c) => c.id === id);
  }, [items]);

  const resolveConversation = useCallback((id: string, resolvedBy = DEFAULT_CONVERSATION_ACTIVITY_ACTOR, opts?: { notes?: string; resolutionType?: "general" | "incoming" | "outgoing" }) => {
    setItems((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (c.status === "resolved") return c;
        const message = buildThreadActivityMessage({
          kind: "status",
          action: "resolved",
          actor: resolvedBy,
          notes: opts?.notes || undefined,
          resolutionType: opts?.resolutionType || undefined,
        });
        const nextMessages = [...c.messages, message];
        return {
          ...c,
          status: "resolved" as const,
          messages: nextMessages,
          hasUnread: nextHasUnreadAfterAppend(c, message),
        };
      })
    );
  }, []);

  const reopenConversation = useCallback((id: string, reopenedBy = DEFAULT_CONVERSATION_ACTIVITY_ACTOR) => {
    setItems((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (c.status === "open") return c;
        const message = buildThreadActivityMessage({
          kind: "status",
          action: "reopened",
          actor: reopenedBy,
        });
        const nextMessages = [...c.messages, message];
        return {
          ...c,
          status: "open" as const,
          messages: nextMessages,
          hasUnread: nextHasUnreadAfterAppend(c, message),
        };
      })
    );
  }, []);

  const addLabel = useCallback((id: string, label: string, appliedBy = "Abe Kashiwagi") => {
    setItems((prev) =>
      prev.map((c) => {
        if (c.id !== id || c.labels.includes(label)) return c;
        const prevLabels = c.labels;
        const nextLabels = ensureAiLabelCompanions([...prevLabels, label]);
        const labelsAdded = nextLabels.filter((l) => !prevLabels.includes(l));
        const timestamp = formatThreadActivityTimestamp();
        const activityMessage: ConversationMessage = {
          role: "staff",
          text: "",
          timestamp,
          type: "label_activity",
          labelActivity: {
            actor: appliedBy,
            labelsAdded,
            action: "added",
          },
        };
        const nextMessages = [...c.messages, activityMessage];
        return {
          ...c,
          labels: nextLabels,
          messages: nextMessages,
          hasUnread: nextHasUnreadAfterAppend(c, activityMessage),
        };
      })
    );
  }, []);

  const markRead = useCallback((id: string, reader = DEFAULT_CONVERSATION_ACTIVITY_ACTOR) => {
    setItems((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (!c.hasUnread) return { ...c, hasUnread: false };
        const message = buildThreadActivityMessage({ kind: "read", reader });
        return {
          ...c,
          messages: [...c.messages, message],
          hasUnread: false,
        };
      })
    );
  }, []);

  const removeLabel = useCallback((id: string, label: string) => {
    setItems((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        let next = c.labels.filter((l) => l !== label);
        const companion = AI_LABEL_COMPANIONS[label];
        if (companion) next = next.filter((l) => l !== companion);
        return { ...c, labels: ensureAiLabelCompanions(next) };
      })
    );
  }, []);

  return (
    <ConversationsContext.Provider
      value={{
        items,
        filteredItems,
        propertyCount,
        addMessage,
        addConversation,
        updateAssignee,
        getConversation,
        resolveConversation,
        reopenConversation,
        recordThreadActivity,
        addLabel,
        removeLabel,
        markRead,
      }}
    >
      {children}
    </ConversationsContext.Provider>
  );
}

export function useConversations() {
  const ctx = useContext(ConversationsContext);
  if (!ctx) throw new Error("useConversations must be used within ConversationsProvider");
  return ctx;
}

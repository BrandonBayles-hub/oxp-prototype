"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRole, matchesRoleProperties } from "@/lib/role-context";
import { useClickToCallDemo } from "@/lib/click-to-call-demo-context";
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
  | { kind: "status"; action: "resolved" | "reopened"; actor: string }
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
    };

export type VoicemailRef = {
  /** Length of the recording in seconds. */
  durationSec: number;
  /** AI-generated transcript (rendered inline below the audio player). */
  transcript: string;
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
    action: "added";
  };
  /** Structured staff activity (resolve, assignment, read, etc.). */
  threadActivity?: ThreadActivity;
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
    id: "lc-21",
    resident: "Jordan Lee",
    unit: null,
    preview: "Is Saturday at 2pm OK for a tour? I can do Sunday too if that wor...",
    agent: "Staff",
    time: "just now",
    contactType: "Lead",
    property: "Hillside Living",
    channel: "SMS",
    assignee: "Abe Kashiwagi",
    staffRespondentIsExternalAgent: true,
    labels: ["Lead"],
    status: "open",
    hasUnread: true,
    messages: [
      {
        role: "staff",
        text: "Hi Jordan — thanks for your interest in Hillside Living. I’ve sent the floor plan you asked for. Let me know when you’d like to tour.",
        timestamp: "Apr 1 2026 · 4:12pm MST",
        type: "message",
      },
      {
        role: "resident",
        text: "Is Saturday at 2pm OK for a tour? I can do Sunday too if that works better.",
        timestamp: "Apr 1 2026 · 4:18pm MST",
        type: "message",
      },
    ],
  },
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
        text: "Thanks for the notice. Will the gym stay open during the deck work?",
        timestamp: "Apr 6 2026 · 10:12am MST",
        type: "message",
        emailSignature: "—\nNina Ortiz\nUnit 445\nnina.ortiz@email.com",
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
    channel: "Resident Portal",
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
    unit: null,
    preview: "Got it — I’ll upload ID tonight. Thanks!",
    agent: "Staff",
    time: "4m ago",
    contactType: "Lead",
    property: "Hillside Living",
    channel: "Email",
    emailSubject: "Re: Your application — ID upload (same case as web chat)",
    assignee: "Abe Kashiwagi",
    staffRespondentIsExternalAgent: true,
    labels: ["Leasing AI", "Leasing AI Escalation"],
    escalationId: "esc-hillside-alma-12",
    status: "open",
    hasUnread: false,
    messages: [
      {
        role: "staff",
        text: "Hi Alma — following up on your web chat thread. When you have a moment, please reply with a clear photo of your government ID (or use the secure upload link from my last message in chat). This email is tied to the same escalated case on our side.",
        timestamp: "Sep 15 2025 · 7:20pm MST",
        type: "message",
        emailSignature: `Best regards,
Abe Kashiwagi
Leasing Specialist

Hillside Living
(720) 555-0140
1800 Hillside Parkway, Denver, CO 80205`,
      },
      {
        role: "resident",
        text: "Got it — I’ll upload ID tonight. Thanks!",
        timestamp: "Sep 15 2025 · 7:22pm MST",
        type: "message",
        emailSignature: "—\nAlma Sanchez\nProspective resident",
      },
    ],
  },
  {
    id: "lc-4",
    resident: "Davis Calzoni",
    unit: null,
    preview: "I was wondering if you could help me know what the light...",
    agent: "Renewals AI",
    time: "8m ago",
    contactType: "Lead",
    property: "Hillside Living",
    channel: "SMS",
    assignee: "ELI+ Renewal AI",
    labels: ["Renewals AI"],
    status: "open",
    hasUnread: false,
    messages: [
      { role: "resident", text: "I was wondering if you could help me know what the lighting situation is like in the 2-bedroom units?", timestamp: "Sep 15 2025 · 6:45pm MST", type: "message" },
      { role: "agent", text: "Great question! Our 2-bedroom units feature large windows in both bedrooms and the living area, providing plenty of natural light. The kitchen also has under-cabinet LED lighting. Would you like to schedule a tour to see for yourself?", timestamp: "Sep 15 2025 · 6:46pm MST", type: "message" },
    ],
  },
  {
    id: "lc-13",
    resident: "Keisha Monroe",
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
    preview: "If I am not ready to move in when the lease is signed can I...",
    agent: "Leasing AI",
    time: "10m ago",
    contactType: "Resident",
    property: "Hillside Living",
    channel: "Resident Portal",
    assignee: "ELI+ Leasing AI",
    labels: ["Leasing AI"],
    status: "open",
    hasUnread: false,
    messages: [
      { role: "resident", text: "If I am not ready to move in when the lease is signed can I delay my move-in date?", timestamp: "Sep 15 2025 · 6:40pm MST", type: "message" },
      { role: "agent", text: "I understand the concern! In most cases, we can work with you on adjusting the move-in date. Typically, we can hold a unit for up to 2 weeks after lease signing. Let me check with the property manager about your specific situation.", timestamp: "Sep 15 2025 · 6:41pm MST", type: "message" },
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
    hasUnread: true,
    messages: [
      { role: "resident", text: "I’m self-employed — can I qualify with 12 months of bank statements instead of pay stubs?", timestamp: "Sep 15 2025 · 5:50pm MST", type: "message" },
      { role: "agent", text: "Thanks for sharing that. I’ve looped in a specialist who can review income documentation with you and walk through next steps. You should hear back within one business day.", timestamp: "Sep 15 2025 · 5:52pm MST", type: "message" },
      { role: "resident", text: "Sounds good — I’ll upload my last 12 months of statements to the portal tonight.", timestamp: "Sep 15 2025 · 5:54pm MST", type: "message" },
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
    hasUnread: true,
    messages: [
      { role: "resident", text: "I was wondering if my roommate would be able to rent a space as well? We're looking for units near each other.", timestamp: "Sep 15 2025 · 6:15pm MST", type: "message" },
      { role: "agent", text: "Of course! We have several adjacent units available. Let me pull up the options for you. In the meantime, I'm flagging this for a leasing specialist who can help coordinate both applications.", timestamp: "Sep 15 2025 · 6:16pm MST", type: "message" },
      { role: "resident", text: "Yes please — send both application links when you have them.", timestamp: "Sep 15 2025 · 6:17pm MST", type: "message" },
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
    ],
  },
  {
    id: "lc-17",
    resident: "Maya Chen",
    unit: null,
    preview: "Can overnight guests use visitor parking for a full weekend?",
    agent: "Staff",
    time: "28m ago",
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
        timestamp: "Sep 15 2025 · 5:08pm MST",
        type: "message",
        emailSignature: "—\nMaya Chen\nProspective resident",
      },
      {
        role: "staff",
        text: "Thanks for asking, Maya. Visitor parking is available on a first-come basis; there isn’t a formal nightly cap for registered guests, but vehicles can’t stay longer than 72 consecutive hours without management approval so we can rotate spaces fairly.\n\nI’ve attached our guest-parking quick guide (where to register a plate and which lots to use).",
        timestamp: "Sep 15 2025 · 5:14pm MST",
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
];

type ConversationsContextValue = {
  items: ConversationItem[];
  filteredItems: ConversationItem[];
  propertyCount: number;
  addMessage: (conversationId: string, message: ConversationMessage) => void;
  addConversation: (item: Omit<ConversationItem, "id">) => string;
  updateAssignee: (conversationId: string, assignee: string, assignedBy?: string) => void;
  getConversation: (id: string) => ConversationItem | undefined;
  resolveConversation: (id: string, resolvedBy?: string) => void;
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
  const [items, setItems] = useState<ConversationItem[]>(() => {
    const seeded = [...CLICK_TO_CALL_DEMO_THREADS, ...INITIAL];
    return seeded.map((c) => {
      const labels = ensureAiLabelCompanions(c.labels);
      return { ...c, labels, hasUnread: clampHasUnread(c.messages, c.hasUnread) };
    });
  });

  const filteredItems = useMemo(
    () =>
      items.filter((c) => {
        if (!clickToCallEnabled && isClickToCallDemoThread(c.id)) return false;
        return matchesRoleProperties(c.property, roleProperties);
      }),
    [items, clickToCallEnabled, roleProperties]
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

  const resolveConversation = useCallback((id: string, resolvedBy = DEFAULT_CONVERSATION_ACTIVITY_ACTOR) => {
    setItems((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (c.status === "resolved") return c;
        const message = buildThreadActivityMessage({
          kind: "status",
          action: "resolved",
          actor: resolvedBy,
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

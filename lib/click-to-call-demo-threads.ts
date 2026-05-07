import type { ConversationItem } from "@/lib/conversations-context";

/**
 * Prototype threads that show up only when the "Click To Call" demo toggle is on.
 * They illustrate inbound phone activity: missed calls and a voicemail with an
 * AI transcript. They are intentionally labeled as a plain `Lead` / `Resident`
 * (no `*Escalation` label) — the purple `Phone` channel chip is enough to
 * signal the medium, and the inbox-level "needs staff callback" rule keeps
 * them surfaced until staff actually responds.
 *
 * Keep IDs stable and prefixed with `ctc-demo-` so they are easy to filter or
 * strip in production.
 */
export const CLICK_TO_CALL_DEMO_THREADS: ConversationItem[] = [
  {
    id: "ctc-demo-voicemail-ayla",
    resident: "Ayla Ramirez",
    unit: null,
    preview:
      "Voicemail · 0:38 — Hi, I saw the 2-bedroom with a balcony online, can someone call me back today? Thanks!",
    agent: "Staff",
    time: "3m ago",
    contactType: "Lead",
    property: "Hillside Living",
    channel: "Phone",
    assignee: "Unassigned",
    labels: ["Lead"],
    status: "open",
    hasUnread: true,
    messages: [
      {
        role: "resident",
        type: "voicemail",
        text: "Voicemail — see transcript",
        timestamp: "Apr 1 2026 · 2:47pm MST",
        voicemail: {
          durationSec: 38,
          fromNumber: "+1 (720) 555-0182",
          transcript:
            "Hi, this is Ayla Ramirez. I saw the two-bedroom unit with the balcony on your website and I was wondering if someone could call me back today? I'd love to schedule a tour this weekend if you have any times open. My number is 720-555-0182. Thanks so much, talk soon!",
        },
      },
    ],
  },
  {
    id: "ctc-demo-missed-call-dre",
    resident: "Dre Okafor",
    unit: null,
    preview: "Missed call · rang 28s · 2 attempts in a row",
    agent: "Staff",
    time: "12m ago",
    contactType: "Lead",
    property: "Hillside Living",
    channel: "Phone",
    assignee: "Unassigned",
    labels: ["Lead"],
    status: "open",
    hasUnread: true,
    messages: [
      {
        role: "resident",
        type: "missed_call",
        text: "Missed call",
        timestamp: "Apr 1 2026 · 2:38pm MST",
        missedCall: {
          fromNumber: "+1 (480) 555-2947",
          attemptCount: 2,
          rangForSec: 28,
        },
      },
      {
        role: "resident",
        type: "missed_call",
        text: "Missed call",
        timestamp: "Apr 1 2026 · 2:35pm MST",
        missedCall: {
          fromNumber: "+1 (480) 555-2947",
          rangForSec: 22,
        },
      },
    ],
  },
  {
    id: "ctc-demo-voicemail-rosa",
    resident: "Rosa Delgado",
    unit: "Unit 312",
    preview:
      "Voicemail · 0:22 — Hey, my kitchen sink is leaking pretty bad, can maintenance call me back asap?",
    agent: "Staff",
    time: "22m ago",
    contactType: "Resident",
    property: "Hillside Living",
    channel: "Phone",
    assignee: "Unassigned",
    labels: ["Resident"],
    status: "open",
    hasUnread: true,
    messages: [
      {
        role: "resident",
        type: "missed_call",
        text: "Missed call",
        timestamp: "Apr 1 2026 · 2:12pm MST",
        missedCall: {
          fromNumber: "+1 (303) 555-4410",
          rangForSec: 31,
        },
      },
      {
        role: "resident",
        type: "voicemail",
        text: "Voicemail — see transcript",
        timestamp: "Apr 1 2026 · 2:25pm MST",
        voicemail: {
          durationSec: 22,
          fromNumber: "+1 (303) 555-4410",
          transcript:
            "Hey, this is Rosa in 312. My kitchen sink is leaking pretty bad — there's water on the floor. Can maintenance call me back as soon as possible? Thanks!",
        },
      },
    ],
  },
];

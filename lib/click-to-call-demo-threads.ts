import type { ConversationItem } from "@/lib/conversations-context";

/**
 * Prototype threads that show up only when the "Click To Call" demo toggle is on.
 * They illustrate inbound phone activity: a missed call and a voicemail with an
 * AI transcript. Keep IDs stable and prefixed with `ctc-demo-` so they are easy
 * to filter or strip in production.
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
    assignee: "Abe Kashiwagi",
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
    preview: "Missed call · rang 28s",
    agent: "Staff",
    time: "12m ago",
    contactType: "Lead",
    property: "Hillside Living",
    channel: "Phone",
    assignee: "Abe Kashiwagi",
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
];

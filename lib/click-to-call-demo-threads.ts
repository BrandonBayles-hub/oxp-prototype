import type { ConversationItem } from "@/lib/conversations-context";

/**
 * Prototype threads for inbound phone activity: missed calls and voicemails
 * with an AI transcript. Shown when either the "Click To Call" or
 * "Super Agent 1.0" Communications Demo Control toggle is on.
 *
 * They are intentionally labeled as a plain `Lead` / `Resident`
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
      "Voicemail · 1:52 — Hi, I saw the 2-bedroom with a balcony online, can someone call me back today?",
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
          durationSec: 112,
          fromNumber: "+1 (720) 555-0182",
          transcript:
            "Ayla Ramirez asked about touring the two-bedroom with a balcony this weekend; ELI confirmed availability and offered a staff callback.",
          turns: [
            {
              speaker: "ai",
              text: "Thanks for calling Hillside Living. This is ELI, your leasing assistant. How can I help you today?",
            },
            {
              speaker: "resident",
              text: "Hi — this is Ayla Ramirez. I saw the two-bedroom with the balcony on your website and I was hoping someone could call me back today.",
            },
            {
              speaker: "ai",
              text: "Happy to help, Ayla. Just to confirm — you're interested in the two-bedroom with the balcony. Are you looking to schedule a tour?",
            },
            {
              speaker: "resident",
              text: "Yeah, I'd love to tour this weekend if you have any times open. Saturday morning would be ideal if that's possible.",
            },
            {
              speaker: "ai",
              text: "Got it — Saturday morning for a tour of the two-bedroom with balcony. I can have a leasing agent call you back to lock in a time. Is 720-555-0182 the best number to reach you?",
            },
            {
              speaker: "resident",
              text: "Yes, that's my cell. Anytime after 10am works for the callback.",
            },
            {
              speaker: "ai",
              text: "Perfect. I've noted the callback request for after 10am, and a leasing agent will follow up to schedule your Saturday tour. Is there anything else I can help with?",
            },
            {
              speaker: "resident",
              text: "That's all — thanks so much!",
            },
            {
              speaker: "ai",
              text: "You're welcome, Ayla. Talk soon — have a great day.",
            },
          ],
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
    time: "18m ago",
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
        timestamp: "Apr 1 2026 · 2:28pm MST",
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
      "Voicemail · 1:48 — Kitchen sink leaking in 312, water on the floor — needs maintenance callback.",
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
          durationSec: 108,
          fromNumber: "+1 (303) 555-4410",
          transcript:
            "Rosa Delgado in unit 312 reported a kitchen sink leak with water on the floor; ELI gathered details and queued a maintenance callback.",
          turns: [
            {
              speaker: "ai",
              text: "Thanks for calling Hillside Living maintenance. This is ELI. How can I help you today?",
            },
            {
              speaker: "resident",
              text: "Hey, this is Rosa Delgado in unit 312. My kitchen sink is leaking pretty bad — there's water on the floor.",
            },
            {
              speaker: "ai",
              text: "I'm sorry you're dealing with that, Rosa. Is the water still actively dripping, or has it slowed down?",
            },
            {
              speaker: "resident",
              text: "It's still dripping under the sink. I put a bowl under it but it's filling up pretty fast. I don't know where the shutoff is.",
            },
            {
              speaker: "ai",
              text: "Understood. Under most kitchen sinks there's a small valve on the cold-water line — if you can reach it safely, turning it clockwise usually stops the flow. Don't force anything if it's stuck. Can maintenance call you back at this number?",
            },
            {
              speaker: "resident",
              text: "Yes — 303-555-4410. Please have them call as soon as possible. I've got towels down but I'm worried about the cabinets.",
            },
            {
              speaker: "ai",
              text: "I've noted unit 312, active kitchen sink leak with standing water, and a priority callback to 303-555-4410. A maintenance tech will call you back shortly. Is there anything else going on in the unit I should flag?",
            },
            {
              speaker: "resident",
              text: "No, that's it. Thanks — I appreciate it.",
            },
            {
              speaker: "ai",
              text: "Of course, Rosa. Hang tight — help is on the way. Goodbye.",
            },
          ],
        },
      },
    ],
  },
];

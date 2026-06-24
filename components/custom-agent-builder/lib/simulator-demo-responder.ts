/**
 * Client-side "demo" responder — a prompt-aware fallback that lets authors
 * experience a truly two-way conversation with their agent even when no
 * real LLM is reachable. No API keys, no backend, no network.
 *
 * WHY THIS EXISTS
 *   The referenced Smarty PR (135850) and Jacob's ai_agent branch both
 *   assume a running backend (Entrata PHP → Python agent service, or
 *   local FastAPI). OXP authors rarely have either running. Without a
 *   fallback, the simulator opens but can't actually converse — which
 *   is exactly the "not truly two way" failure mode the user called out.
 *
 * DESIGN GOALS
 *   1. Feel authentic. Responses should reference the agent's domain,
 *      use first-person, acknowledge what the user said, and advance
 *      the conversation — not just parrot templates.
 *   2. Be prompt-aware. The author's prompt text directly seeds topic
 *      extraction; the tone of the response should roughly match.
 *   3. Be deterministic enough to be useful. A given (prompt, history,
 *      message) triple should always return the same reply so test-
 *      recordings don't drift between plays.
 *   4. Be obvious. The first response always includes a subtle disclaimer
 *      so the author doesn't mistake demo output for real LLM output.
 *
 * DESIGN NON-GOALS
 *   - Real reasoning. This is *not* trying to be an LLM. If the author
 *     wants authentic model behavior they can paste an OpenAI key (see
 *     simulator-transport.ts).
 *   - Tool calls. The demo responder never invents tool call records —
 *     that path requires a real backend to be meaningful.
 */

import type { ChatTurn } from "./agent-chat-client";

export type DemoReplyInput = {
  systemPrompt: string;
  history: ChatTurn[];
  callerMessage: string;
  personaName: string;
  /** sms | email | voice | chat — used to tune register (casual vs formal). */
  channel?: "sms" | "email" | "voice" | "chat";
};

/**
 * Produce a plausible, deterministic reply. Pure function — no side effects.
 */
export function demoReply(input: DemoReplyInput): string {
  const { systemPrompt, history, callerMessage, personaName, channel } = input;

  const userMsg = callerMessage.trim();
  if (!userMsg) {
    return fallbackGreeting(personaName, channel);
  }

  const topic = extractTopic(systemPrompt);
  const lcMsg = userMsg.toLowerCase();
  const turnIndex = history.filter((t) => t.role === "user").length;

  // Intent detection is intentionally shallow — we're not trying to be
  // clever, just plausible. Order matters: more specific intents first.
  if (matchesGreeting(lcMsg) && turnIndex === 0) {
    return withRegister(
      `Hi${firstNameOrEmpty(history)}! ${topic.greeting} What's on your mind today?`,
      channel
    );
  }

  if (matchesGoodbye(lcMsg)) {
    return withRegister(
      `Thanks for chatting — I'll note this conversation for the team. Have a great rest of your day!`,
      channel
    );
  }

  if (matchesHelpRequest(lcMsg)) {
    return withRegister(
      `Happy to help${topic.scopeHint ? ` with ${topic.scopeHint}` : ""}. Could you share a bit more about what you're looking to do? ${topic.probe}`,
      channel
    );
  }

  if (matchesQuestion(lcMsg)) {
    return withRegister(
      `Good question. ${topic.answerLead} ${topic.probe} Can you confirm a couple of details so I can give you a more specific answer?`,
      channel
    );
  }

  if (matchesComplaint(lcMsg)) {
    return withRegister(
      `I'm sorry that's been your experience. I want to make sure we get this resolved. Can you walk me through what happened, step by step?`,
      channel
    );
  }

  if (matchesYes(lcMsg)) {
    return withRegister(
      `Great — let's move forward. ${topic.nextStep}`,
      channel
    );
  }

  if (matchesNo(lcMsg)) {
    return withRegister(
      `Understood — no pressure. Would you like me to ${topic.noFallback}?`,
      channel
    );
  }

  if (userMsg.endsWith("?")) {
    return withRegister(
      `Let me check on that for you. ${topic.answerLead} What's the best way to follow up once I have a firm answer — this thread, or another channel?`,
      channel
    );
  }

  // Default: acknowledge, mirror, advance. This is the catch-all that
  // keeps the conversation moving when nothing else matches.
  return withRegister(
    `Got it — "${truncate(userMsg, 90)}". ${topic.acknowledge} ${topic.probe}`,
    channel
  );
}

/**
 * Best-effort topic extraction from the author's prompt. This is plumbing
 * for the response templates below — we look for domain keywords and
 * build a small bag of phrases we can swap into replies.
 */
function extractTopic(prompt: string): {
  greeting: string;
  acknowledge: string;
  probe: string;
  answerLead: string;
  nextStep: string;
  noFallback: string;
  scopeHint: string;
} {
  const p = (prompt || "").toLowerCase();

  if (/(tour|showing|visit|leasing|apply|application)/.test(p)) {
    return {
      greeting: "I help folks schedule tours and walk through the application process.",
      acknowledge: "I'll make a note of that on your file.",
      probe: "Are you looking for a specific floor plan or move-in window?",
      answerLead: "Based on what we usually see for properties like this…",
      nextStep: "I'll pencil you in and send a confirmation once I have a time that works.",
      noFallback: "send you some basic info so you can decide on your own time",
      scopeHint: "your tour or application",
    };
  }

  if (/(renew|renewal|lease|offer|price|rate)/.test(p)) {
    return {
      greeting: "I work with residents on their lease renewals.",
      acknowledge: "I'll capture that in our renewal notes.",
      probe: "Are you thinking about extending your current lease, or exploring a different term length?",
      answerLead: "Renewal offers depend on term length and current-market rates…",
      nextStep: "I'll put together a couple of options and send them over for your review.",
      noFallback: "email you a quick summary you can think over",
      scopeHint: "your renewal",
    };
  }

  if (/(maintenance|repair|work order|broken|leak|fix)/.test(p)) {
    return {
      greeting: "I triage maintenance requests and help get them scheduled.",
      acknowledge: "I'll log that on the work order.",
      probe: "How urgent is this? (Emergency, same-day, or whenever works?)",
      answerLead: "For that kind of issue, the usual next step is…",
      nextStep: "I'll open a work order and a technician will reach out to confirm a time.",
      noFallback: "just create a low-priority ticket so the team is aware",
      scopeHint: "the maintenance request",
    };
  }

  if (/(payment|bill|balance|charge|invoice|ar\b|accounts receivable|pre-?bill)/.test(p)) {
    return {
      greeting: "I help residents with questions about billing and payments.",
      acknowledge: "Noted on your account.",
      probe: "Is this about a specific charge, or your overall balance?",
      answerLead: "Looking at typical account activity for that…",
      nextStep: "I'll get the details pulled up and we can walk through the line items together.",
      noFallback: "send a copy of the statement so you can review it later",
      scopeHint: "your account",
    };
  }

  if (/(tour|showings?)/.test(p)) {
    return {
      greeting: "I schedule tours and answer quick questions about the property.",
      acknowledge: "I'll save that to your file.",
      probe: "What days tend to work best for you?",
      answerLead: "Tour availability depends on the day…",
      nextStep: "I'll book you in and send a confirmation shortly.",
      noFallback: "hold off and just send you floor plans instead",
      scopeHint: "your tour",
    };
  }

  // Generic fallback — works for any agent.
  return {
    greeting: "I'm here to help out on behalf of the property team.",
    acknowledge: "I'll make a note of that.",
    probe: "Can you tell me a little more about what you're looking for?",
    answerLead: "From what I typically see…",
    nextStep: "I'll get that moving on my end.",
    noFallback: "just send some info so you can decide later",
    scopeHint: "this",
  };
}

function matchesGreeting(lc: string): boolean {
  return /\b(hi|hello|hey|howdy|good (morning|afternoon|evening))\b/.test(lc);
}

function matchesGoodbye(lc: string): boolean {
  return /\b(bye|goodbye|thanks?|thank you|ttyl|talk later|that'?s all)\b/.test(
    lc
  );
}

function matchesHelpRequest(lc: string): boolean {
  return /\b(help|assist|can you|could you|please|i need|i'?m looking)\b/.test(
    lc
  );
}

function matchesQuestion(lc: string): boolean {
  return /\b(how|what|why|when|where|which|who|can i|do i|is it|are (there|you))\b/.test(
    lc
  );
}

function matchesComplaint(lc: string): boolean {
  return /\b(problem|issue|not working|broken|doesn'?t work|bad|wrong|angry|frustrated|unhappy)\b/.test(
    lc
  );
}

function matchesYes(lc: string): boolean {
  return /^(yes|yeah|yep|sure|ok|okay|sounds good|let'?s do it|please do)\b/.test(
    lc.trim()
  );
}

function matchesNo(lc: string): boolean {
  return /^(no|nope|not (right )?now|not yet|maybe later|pass)\b/.test(
    lc.trim()
  );
}

/**
 * Lightly tune the register per channel. Voice and SMS are casual and
 * concise; email is slightly more formal; chat is neutral.
 */
function withRegister(text: string, channel?: DemoReplyInput["channel"]): string {
  if (channel === "email") {
    // Email gets a sign-off; everything else stays inline.
    return text + "\n\n— Thanks!";
  }
  if (channel === "voice") {
    // Voice responses feel more natural without sign-offs, dashes, or
    // parentheticals. Keep it spoken-word.
    return text.replace(/\s*—\s*/g, ", ").replace(/\([^)]*\)\s*/g, "");
  }
  return text;
}

function fallbackGreeting(personaName: string, channel?: DemoReplyInput["channel"]): string {
  if (channel === "email") {
    return `Hi there — this is ${personaName}. I just wanted to check in and see how I can help today.\n\n— Thanks!`;
  }
  if (channel === "voice") {
    return `Hi, this is ${personaName}. How can I help you today?`;
  }
  return `Hi! This is ${personaName}. What can I help with today?`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

/**
 * Pull the caller's first name out of a previous user turn if it looks like
 * they introduced themselves. Best-effort — returns "" when unclear.
 */
function firstNameOrEmpty(history: ChatTurn[]): string {
  const firstUser = history.find((h) => h.role === "user")?.content ?? "";
  const m = firstUser.match(/(?:my name is|i'?m|this is)\s+([A-Z][a-z]+)/);
  return m ? ` ${m[1]}` : "";
}

"use client";

import { useState, type ReactNode } from "react";
import {
  Phone,
  Mail,
  Volume2,
  MessageSquare,
  Box,
  Globe,
  BookOpen,
  Wrench,
  Database,
  Lightbulb,
  Cog,
  ArrowLeft,
  CheckCircle,
  XCircle,
  ChevronDown,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

/* ═══════════════════════════════════════════════════════════════════════
   Agent History & Logging — conversation logs with trace drill-down
   ═══════════════════════════════════════════════════════════════════════ */

export type TraceStep = {
  type:
    | "instruction"
    | "tool_call"
    | "knowledge"
    | "reasoning"
    | "response"
    | "mcp_tool"
    | "http_api"
    | "prompt_citation";
  label: string;
  detail?: string;
  durationMs: number;
  status?: "success" | "error" | "warning";
  /** MCP tool name as registered on the gateway (e.g. entrata.renewals.getLeaseSnapshot). */
  mcpToolName?: string;
  /** Full MCP JSON-RPC style request payload (prototype demo). */
  mcpRequestJson?: string;
  /** Full MCP JSON-RPC style response payload (prototype demo). */
  mcpResponseJson?: string;
  /** HTTP-style trace when the host still calls REST instead of MCP. */
  httpMethod?: string;
  httpPath?: string;
  httpRequestHeaders?: string;
  httpRequestBody?: string;
  httpResponseStatus?: number;
  httpResponseHeaders?: string;
  httpResponseBody?: string;
  /** Agent chain-of-thought: how tool outputs + policy led to the visible reply. */
  thoughtProcess?: string;
  /** Label for where the excerpt came from (system prompt block, SOP, etc.). */
  promptSourceLabel?: string;
  /** Verbatim or near-verbatim excerpt from the agent prompt / policy pack. */
  promptExcerpt?: string;
};

export type ConversationMessage = {
  role: "resident" | "agent";
  text: string;
  timestamp: string;
  /** Per-reply trace (L4 conversational agents — one trace per agent message). */
  trace?: TraceStep[];
};

export type ConversationChannel = "SMS" | "Chat" | "Email" | "Voice";

export type ConversationLog = {
  id: string;
  residentName: string;
  channel: ConversationChannel;
  topic: string;
  summary: string;
  outcome: "resolved" | "escalated" | "pending";
  sentiment: "positive" | "neutral" | "negative";
  startedAt: string;
  /** Days back from "today" for date-range filtering. 0 = today, 1 = yesterday, etc. */
  daysAgo: number;
  duration: string;
  turns: number;
  messages: ConversationMessage[];
  /** Whole-conversation trace (legacy). L4 agents use `messages[].trace` per agent reply instead. */
  trace: TraceStep[];
  monitors: { label: string; passed: boolean }[];
};

export const CONVERSATION_CHANNELS: ConversationChannel[] = ["Chat", "SMS", "Voice", "Email"];

export function conversationChannelIcon(channel: ConversationChannel) {
  if (channel === "SMS") return <Phone className="h-2.5 w-2.5" />;
  if (channel === "Email") return <Mail className="h-2.5 w-2.5" />;
  if (channel === "Voice") return <Volume2 className="h-2.5 w-2.5" />;
  return <MessageSquare className="h-2.5 w-2.5" />;
}

export const L4_AGENTS_PER_REPLY_TRACE = new Set(["Leasing AI", "Payments AI", "Maintenance AI", "Renewal AI"]);

export function countLogTraceSteps(log: ConversationLog, agentName: string): number {
  if (L4_AGENTS_PER_REPLY_TRACE.has(agentName)) {
    return log.messages.reduce((sum, m) => sum + (m.role === "agent" ? (m.trace?.length ?? 0) : 0), 0);
  }
  return log.trace.length;
}

function TracePayloadBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-2 rounded-md border border-border bg-muted/60">
      <p className="border-b border-border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-words p-2 font-mono text-[10px] leading-snug text-foreground">{body}</pre>
    </div>
  );
}

function AgentTraceTimeline({ trace }: { trace: TraceStep[] }) {
  const totalTraceMs = trace.reduce((sum, s) => sum + s.durationMs, 0);
  const traceIcon = (type: TraceStep["type"]) => {
    if (type === "mcp_tool") return <Box className="h-3 w-3" />;
    if (type === "http_api") return <Globe className="h-3 w-3" />;
    if (type === "prompt_citation") return <BookOpen className="h-3 w-3" />;
    if (type === "tool_call") return <Wrench className="h-3 w-3" />;
    if (type === "knowledge") return <Database className="h-3 w-3" />;
    if (type === "reasoning") return <Lightbulb className="h-3 w-3" />;
    if (type === "response") return <MessageSquare className="h-3 w-3" />;
    return <Cog className="h-3 w-3" />;
  };
  const iconRing = (step: TraceStep) => {
    if (step.type === "mcp_tool") return "bg-sky-50 text-sky-700";
    if (step.type === "http_api") return "bg-cyan-50 text-cyan-700";
    if (step.type === "prompt_citation") return "bg-violet-50 text-violet-700";
    if (step.type === "tool_call") return "bg-blue-50 text-blue-600";
    if (step.type === "knowledge") return "bg-purple-50 text-purple-600";
    if (step.type === "reasoning") return "bg-amber-50 text-amber-600";
    if (step.type === "response") return "bg-emerald-50 text-emerald-600";
    return "bg-zinc-100 text-zinc-500";
  };
  return (
    <div className="space-y-0">
      {trace.map((step, i) => (
        <div key={i} className="flex gap-3 pb-4 last:pb-0">
          <div className="flex flex-col items-center">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${iconRing(step)}`}>{traceIcon(step.type)}</div>
            {i < trace.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium text-foreground">{step.label}</p>
              {step.mcpToolName && (
                <span className="rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 font-mono text-[9px] font-medium text-sky-800">{step.mcpToolName}</span>
              )}
              <span className="text-[10px] text-muted-foreground">{step.durationMs}ms</span>
              {step.status && (
                <span className="text-[9px] font-medium uppercase text-muted-foreground">{step.status}</span>
              )}
            </div>
            {step.detail && <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{step.detail}</p>}

            {step.promptSourceLabel && step.promptExcerpt && (
              <div className="mt-2 rounded-md border border-violet-200 bg-violet-50/50 p-2">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-violet-800">{step.promptSourceLabel}</p>
                <blockquote className="mt-1 border-l-2 border-violet-400 pl-2 text-[11px] italic leading-relaxed text-foreground">{step.promptExcerpt}</blockquote>
              </div>
            )}

            {step.thoughtProcess && (
              <div className="mt-2 rounded-md border border-amber-200 bg-amber-50/40 p-2">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-900">Agent thought process</p>
                <p className="mt-1 text-[11px] leading-relaxed text-foreground whitespace-pre-wrap">{step.thoughtProcess}</p>
              </div>
            )}

            {(step.type === "mcp_tool" || step.mcpRequestJson || step.mcpResponseJson) && (step.mcpRequestJson || step.mcpResponseJson) ? (
              <div className="mt-1 space-y-2">
                {step.mcpRequestJson ? <TracePayloadBlock title="Tool request (technical)" body={step.mcpRequestJson} /> : null}
                {step.mcpResponseJson ? <TracePayloadBlock title="Tool response (technical)" body={step.mcpResponseJson} /> : null}
              </div>
            ) : null}

            {step.type === "http_api" || step.httpMethod || step.httpResponseBody ? (
              <div className="mt-1 space-y-2">
                {step.httpMethod && step.httpPath ? (
                  <p className="mt-1 font-mono text-[10px] text-foreground">
                    {step.httpMethod} {step.httpPath}
                    {step.httpResponseStatus != null ? <span className="ml-2 text-muted-foreground">→ {step.httpResponseStatus}</span> : null}
                  </p>
                ) : null}
                {step.httpRequestHeaders ? <TracePayloadBlock title="HTTP request headers" body={step.httpRequestHeaders} /> : null}
                {step.httpRequestBody ? <TracePayloadBlock title="HTTP request body" body={step.httpRequestBody} /> : null}
                {step.httpResponseHeaders ? <TracePayloadBlock title="HTTP response headers" body={step.httpResponseHeaders} /> : null}
                {step.httpResponseBody ? <TracePayloadBlock title="HTTP response body" body={step.httpResponseBody} /> : null}
              </div>
            ) : null}
          </div>
        </div>
      ))}
      <div className="mt-3 flex justify-between border-t border-border pt-3 text-[10px] text-muted-foreground">
        <span>Total trace time</span>
        <span className="font-medium text-foreground">{totalTraceMs}ms</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   User-friendly trace — plain-language, grouped view for non-Entrata
   users. No payloads, schemas, durations, status codes, or the term
   "MCP". Just the phases of how the answer was built: what guidance it
   followed, what information it gathered, how it reasoned, and the reply.
   ───────────────────────────────────────────────────────────────────── */

/** Strips internal jargon (MCP, REST, payloads) from text shown to users. */
function sanitizeFriendly(text: string): string {
  return text
    .replace(/\bMCP\s+(tool\s+call|call|lease snapshot|ledger summary|response|request|tools?)/gi, (_m, g) => g)
    .replace(/\b(via|over|through)\s+MCP\b/gi, "")
    .replace(/\bduring\s+(the\s+)?MCP\s+cutover\b/gi, "")
    .replace(/\bmirrored to REST(\s+for parity)?\b/gi, "logged for parity")
    .replace(/\bMCP\b/gi, "the system")
    .replace(/\bREST\b/gi, "the system")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;])/g, "$1")
    .trim();
}

/** Maps a technical tool/knowledge step to a plain-language source name. */
function friendlyTraceSource(step: TraceStep): string {
  if (step.type === "knowledge") return "Property knowledge base";
  const key = `${step.mcpToolName ?? ""} ${step.label ?? ""}`.toLowerCase();
  const map: { match: string; label: string }[] = [
    { match: "getleasesnapshot", label: "Your lease & renewal terms" },
    { match: "loyalty", label: "Loyalty pricing eligibility" },
    { match: "getcomparables", label: "Market & comparable rents" },
    { match: "market.", label: "Market data" },
    { match: "renewals.", label: "Renewal records" },
    { match: "knowledge.search", label: "Property knowledge base" },
    { match: "createescalation", label: "Staff escalation" },
    { match: "escalation", label: "Staff escalation" },
    { match: "billing", label: "Billing & payment records" },
    { match: "payment", label: "Payment records" },
    { match: "screening", label: "Screening & qualification rules" },
    { match: "tour", label: "Tour scheduling" },
    { match: "amenit", label: "Amenity details" },
    { match: "parking", label: "Parking availability" },
    { match: "petpolicy", label: "Pet policy" },
    { match: "policy", label: "Property policies" },
    { match: "inventory", label: "Unit availability" },
    { match: "furnished", label: "Unit availability" },
    { match: "schooldistrict", label: "Local school district info" },
    { match: "movein", label: "Move-in scheduling" },
    { match: "pricing", label: "Pricing & term options" },
    { match: "term", label: "Lease term options" },
  ];
  for (const m of map) if (key.includes(m.match)) return m.label;
  const seg = (step.mcpToolName ?? "").split(".").pop() ?? "";
  const humanized = seg
    .replace(/^(get|create|evaluate|check|lookup|adjust|start|send|open|refund)/i, "")
    .replace(/([A-Z])/g, " $1")
    .trim();
  return humanized ? humanized.charAt(0).toUpperCase() + humanized.slice(1) : "Information lookup";
}

function FriendlyTraceSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-white">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">{icon}</span>
        <h5 className="text-xs font-semibold text-foreground">{title}</h5>
      </div>
      <div className="divide-y divide-border/60">{children}</div>
    </div>
  );
}

export function FriendlyTraceView({ trace, agentName }: { trace: TraceStep[]; agentName: string }) {
  const guidelines = trace.filter((s) => s.type === "instruction" || s.type === "prompt_citation");
  // Exclude legacy/shadow REST parity calls — they're technical artifacts, not
  // distinct information sources a user should see.
  const lookups = trace.filter(
    (s) =>
      s.type === "mcp_tool" ||
      s.type === "tool_call" ||
      s.type === "knowledge" ||
      (s.type === "http_api" && !/legacy|shadow/i.test(s.label))
  );
  const reasoning = trace.filter((s) => s.type === "reasoning");
  const hasResponse = trace.some((s) => s.type === "response");

  // De-duplicate lookups that resolve to the same friendly source so users see
  // one clean line per source.
  const seenSources = new Set<string>();
  const friendlyLookups = lookups
    .map((s) => ({ source: friendlyTraceSource(s), detail: s.detail ? sanitizeFriendly(s.detail) : undefined }))
    .filter((l) => {
      if (seenSources.has(l.source)) {
        return false;
      }
      seenSources.add(l.source);
      return true;
    });

  const firstSentence = (text: string) => {
    const trimmed = sanitizeFriendly(text).trim();
    const match = trimmed.match(/^.*?[.!?](\s|$)/);
    const sentence = match ? match[0].trim() : trimmed;
    const capped = sentence.replace(/^([a-z])/, (c) => c.toUpperCase());
    return capped.length > 220 ? `${capped.slice(0, 217)}…` : capped;
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        A plain-language summary of how {agentName} built this reply. Technical details are available in the
        Entrata Internal view.
      </p>

      {guidelines.length > 0 && (
        <FriendlyTraceSection icon={<BookOpen className="h-3 w-3" />} title="Guidelines it followed">
          {guidelines.map((s, i) => (
            <div key={i} className="px-3 py-2.5">
              <p className="text-xs font-medium text-foreground">
                {(s.promptSourceLabel ?? s.label).replace(/\s*·.*$/, "")}
              </p>
              {s.promptExcerpt && (
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{firstSentence(s.promptExcerpt)}</p>
              )}
            </div>
          ))}
        </FriendlyTraceSection>
      )}

      {friendlyLookups.length > 0 && (
        <FriendlyTraceSection icon={<Database className="h-3 w-3" />} title="Information it gathered">
          {friendlyLookups.map((l, i) => (
            <div key={i} className="px-3 py-2.5">
              <p className="text-xs font-medium text-foreground">{l.source}</p>
              {l.detail && <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{l.detail}</p>}
            </div>
          ))}
        </FriendlyTraceSection>
      )}

      {reasoning.length > 0 && (
        <FriendlyTraceSection icon={<Lightbulb className="h-3 w-3" />} title="How it decided what to say">
          {reasoning.map((s, i) => (
            <div key={i} className="px-3 py-2.5">
              <p className="text-[11px] leading-relaxed text-foreground">
                {s.thoughtProcess
                  ? firstSentence(s.thoughtProcess)
                  : "Weighed the information it gathered against the guidelines to compose an accurate, on-brand reply."}
              </p>
            </div>
          ))}
        </FriendlyTraceSection>
      )}

      {hasResponse && (
        <FriendlyTraceSection icon={<MessageSquare className="h-3 w-3" />} title="Reply sent">
          <div className="px-3 py-2.5">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Composed the reply and sent it to the resident.
            </p>
          </div>
        </FriendlyTraceSection>
      )}
    </div>
  );
}

function generateBaseConversationLogs(agentName: string, propertyName: string): ConversationLog[] {
  if (agentName === "Leasing AI") return [
    { id: "conv-l1", residentName: "Sarah Mitchell", channel: "Chat", topic: "Tour Scheduling", summary: "Prospect scheduled a Saturday tour for a 2BR unit.", outcome: "resolved", sentiment: "positive", startedAt: "Today, 2:14 PM", daysAgo: 0, duration: "4m 22s", turns: 6,
      messages: [
        { role: "resident", text: "Hi! I saw your listing for the 2-bedroom on Apartments.com. Do you have any tours available this weekend?", timestamp: "2:14 PM" },
        { role: "agent", text: `Welcome to ${propertyName}! We'd love to show you around. We have availability Saturday at 10am, 1pm, and 3pm. Which works best for you?`, timestamp: "2:14 PM",
          trace: [
            { type: "prompt_citation", label: "Tour slot grounding", durationMs: 6, promptSourceLabel: "System prompt · Leasing AI (guest card v2.1)", promptExcerpt: "Offer tour times only from entrata.tours.getAvailability. Never invent slots. Chat replies: max 3 short paragraphs, one question at the end." },
            { type: "mcp_tool", label: "Tool · entrata.tours.getAvailability", mcpToolName: "entrata.tours.getAvailability", durationMs: 128, status: "success", detail: "Weekend 2BR tour slots for this property.", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-ls-101\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.tours.getAvailability\",\n    \"arguments\": { \"propertyId\": \"prop-14th-north\", \"bedrooms\": 2, \"window\": \"THIS_WEEKEND\" }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-ls-101\",\n  \"result\": {\n    \"slots\": [\n      { \"start\": \"2025-05-03T10:00:00-06:00\", \"tourType\": \"GROUP\" },\n      { \"start\": \"2025-05-03T13:00:00-06:00\", \"tourType\": \"GROUP\" },\n      { \"start\": \"2025-05-03T15:00:00-06:00\", \"tourType\": \"GROUP\" }\n    ]\n  }\n}" },
            { type: "http_api", label: "Legacy REST (shadow) · GET /api/tours/summary", durationMs: 34, status: "success", httpMethod: "GET", httpPath: "/api/v2/properties/prop-14th-north/tours/summary?weekend=1", httpResponseStatus: 200, httpResponseBody: "{ \"cached\": true, \"slotCount\": 3 }" },
            { type: "reasoning", label: "Wording", durationMs: 52, thoughtProcess: "Tool response returned three Saturday slots in local TZ—surface as 10am / 1pm / 3pm. Prospect asked weekend only; no weekday upsell per prompt." },
            { type: "response", label: "Model · chat reply", durationMs: 86 },
          ],
        },
        { role: "resident", text: "1pm would be perfect! Will I get to see the actual unit?", timestamp: "2:15 PM" },
        { role: "agent", text: "Great — you're confirmed for Saturday at 1:00 PM! You'll tour a model unit that matches the 2BR/2BA layout. Our leasing agent will meet you at the main office. I'll send a confirmation email with directions.", timestamp: "2:15 PM",
          trace: [
            { type: "mcp_tool", label: "Tool · entrata.tours.bookTour", mcpToolName: "entrata.tours.bookTour", durationMs: 156, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-ls-102\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.tours.bookTour\",\n    \"arguments\": {\n      \"propertyId\": \"prop-14th-north\",\n      \"slot\": \"2025-05-03T13:00:00-06:00\",\n      \"prospectEmail\": \"sarah.mitchell@gmail.com\",\n      \"tourType\": \"GROUP\"\n    }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-ls-102\",\n  \"result\": { \"confirmationId\": \"tour-8aa21\", \"unitShown\": \"MODEL_MATCH_2BR2BA\" }\n}" },
            { type: "mcp_tool", label: "Tool · entrata.comms.sendTransactionalEmail", mcpToolName: "entrata.comms.sendTransactionalEmail", durationMs: 98, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-ls-103\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.comms.sendTransactionalEmail\",\n    \"arguments\": { \"templateId\": \"leasing-tour-confirm\", \"to\": \"sarah.mitchell@gmail.com\", \"mergeFields\": { \"TIME\": \"1:00 PM Saturday\", \"PROPERTY\": \"14th North Parkway\" } }\n  }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"id\": \"mcp-ls-103\", \"result\": { \"queued\": true } }" },
            { type: "prompt_citation", label: "Model vs actual unit", durationMs: 4, promptSourceLabel: "Leasing AI · tour disclosure", promptExcerpt: "If the booked tour is a model, say so explicitly and name the layout match (e.g. 2BR/2BA); never claim it is the exact listed unit unless inventory tool confirms it." },
            { type: "reasoning", label: "Copy", durationMs: 44, thoughtProcess: "bookTour returned MODEL_MATCH_2BR2BA—reply must disclose model tour, not actual unit, per disclosure pack." },
            { type: "response", label: "Model · confirmation", durationMs: 91 },
          ],
        },
        { role: "resident", text: "Awesome, thank you! One more thing — do you allow dogs?", timestamp: "2:16 PM" },
        { role: "agent", text: "Yes! We're pet-friendly. Dogs are welcome with a $300 refundable deposit and $25/month pet rent. There is a 50 lb weight limit and some breed restrictions. I can email you the full policy if you'd like!", timestamp: "2:16 PM",
          trace: [
            { type: "mcp_tool", label: "Tool · entrata.policy.getPetPolicy", mcpToolName: "entrata.policy.getPetPolicy", durationMs: 112, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-ls-104\",\n  \"method\": \"tools/call\",\n  \"params\": { \"name\": \"entrata.policy.getPetPolicy\", \"arguments\": { \"propertyId\": \"prop-14th-north\" } }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-ls-104\",\n  \"result\": {\n    \"dogsAllowed\": true,\n    \"deposit\": 300,\n    \"depositRefundable\": true,\n    \"monthlyPetRent\": 25,\n    \"weightLimitLb\": 50,\n    \"breedRestrictions\": [\"AGGRESSIVE_BREED_LIST_V3\"]\n  }\n}" },
            { type: "reasoning", label: "Numbers in reply", durationMs: 38, thoughtProcess: "All dollar amounts and limits come straight from the tool response; offer full policy PDF via email to avoid SMS-length breed list." },
            { type: "response", label: "Model · pet policy", durationMs: 74 },
          ],
        },
      ],
      trace: [],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Factually grounded", passed: true }, { label: "Positive sentiment", passed: true }, { label: "No repetition", passed: true }],
    },
    { id: "conv-l2", residentName: "David Park", channel: "SMS", topic: "Pricing Inquiry", summary: "Prospect asked about 1BR pricing. Sent floor plans. No tour scheduled yet.", outcome: "pending", sentiment: "neutral", startedAt: "Today, 11:43 AM", daysAgo: 0, duration: "2m 10s", turns: 4,
      messages: [
        { role: "resident", text: "Hey, what's the price for a 1 bedroom?", timestamp: "11:43 AM" },
        { role: "agent", text: `Thanks for reaching out about ${propertyName}! Our 1BR units start at $1,350/mo for the standard layout and $1,475/mo for the upgraded finish package. We're currently offering $500 off the first month. Want me to send you floor plans?`, timestamp: "11:43 AM",
          trace: [
            { type: "mcp_tool", label: "Tool · entrata.pricing.getUnitBands", mcpToolName: "entrata.pricing.getUnitBands", durationMs: 142, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-ls-201\",\n  \"method\": \"tools/call\",\n  \"params\": { \"name\": \"entrata.pricing.getUnitBands\", \"arguments\": { \"propertyId\": \"prop-rails-main\", \"bedrooms\": 1 } }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"standardFrom\": 1350, \"upgradedFrom\": 1475, \"currency\": \"USD\" } }" },
            { type: "mcp_tool", label: "Tool · entrata.specials.getActive", mcpToolName: "entrata.specials.getActive", durationMs: 101, status: "success", mcpRequestJson: "{}", mcpResponseJson: "{ \"result\": { \"concessions\": [ { \"type\": \"FIRST_MONTH\", \"amount\": 500 } ] } }" },
            { type: "reasoning", label: "SMS brevity", durationMs: 36, thoughtProcess: "Two price anchors + one special; end with single yes/no question for SMS length." },
            { type: "response", label: "Model · pricing SMS", durationMs: 88 },
          ],
        },
        { role: "resident", text: "Yeah send them over", timestamp: "11:44 AM" },
        { role: "agent", text: "Done! I just sent the 1BR floor plans and pricing to your email. Let me know when you'd like to schedule a tour — we have availability all week!", timestamp: "11:44 AM",
          trace: [
            { type: "mcp_tool", label: "Tool · entrata.comms.sendFloorPlans", mcpToolName: "entrata.comms.sendFloorPlans", durationMs: 128, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-ls-202\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.comms.sendFloorPlans\",\n    \"arguments\": { \"prospectPhone\": \"+15551234567\", \"layout\": \"1BR\", \"propertyId\": \"prop-rails-main\" }\n  }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"sent\": true, \"messageId\": \"msg-sms-901\" } }" },
            { type: "http_api", label: "Legacy · POST /api/marketing/attach-pdf", durationMs: 41, status: "success", httpMethod: "POST", httpPath: "/api/marketing/attach-pdf", httpResponseStatus: 200, httpResponseBody: "{ \"bytes\": 842102 }" },
            { type: "response", label: "Model · follow-up CTA", durationMs: 72 },
          ],
        },
      ],
      trace: [],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Factually grounded", passed: true }, { label: "Positive sentiment", passed: true }, { label: "No repetition", passed: true }],
    },
    { id: "conv-l3", residentName: "Maria Gonzalez", channel: "Chat", topic: "Application Questions", summary: "Prospect had questions about income requirements. Escalated to leasing manager due to Section 8 voucher.", outcome: "escalated", sentiment: "neutral", startedAt: "Yesterday, 4:30 PM", daysAgo: 1, duration: "6m 15s", turns: 8,
      messages: [
        { role: "resident", text: "I want to apply but I have a Section 8 voucher. Do you accept those?", timestamp: "4:30 PM" },
        { role: "agent", text: `Great question! ${propertyName} does accept Section 8 Housing Choice Vouchers. The process is slightly different from a standard application — let me connect you with our leasing manager who can walk you through the specific requirements and timeline.`, timestamp: "4:31 PM",
          trace: [
            { type: "mcp_tool", label: "Tool · entrata.compliance.getSubsidyPolicy", mcpToolName: "entrata.compliance.getSubsidyPolicy", durationMs: 118, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-ls-301\",\n  \"method\": \"tools/call\",\n  \"params\": { \"name\": \"entrata.compliance.getSubsidyPolicy\", \"arguments\": { \"propertyId\": \"prop-ivy-gate\", \"program\": \"HCV\" } }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"hcvAccepted\": true, \"requiresManagerBrief\": true } }" },
            { type: "prompt_citation", label: "Escalation when voucher", durationMs: 5, promptSourceLabel: "Leasing AI · affordable / voucher SOP", promptExcerpt: "When HCV or project-based voucher is mentioned and property accepts subsidies, do not quote income math in chat—offer manager handoff and log intent." },
            { type: "reasoning", label: "No DIY income rules", durationMs: 49, thoughtProcess: "Tool response shows HCV accepted but requiresManagerBrief—reply confirms acceptance and routes to human without improvising income thresholds." },
            { type: "response", label: "Model · handoff intro", durationMs: 81 },
          ],
        },
        { role: "resident", text: "Okay, how long does that usually take?", timestamp: "4:31 PM" },
        { role: "agent", text: "The Section 8 approval process typically takes 2-4 weeks after your housing authority completes their inspection. Our leasing manager, Jennifer, will be able to give you a more specific timeline. I'm transferring you now — she'll reach out within the hour.", timestamp: "4:32 PM",
          trace: [
            { type: "mcp_tool", label: "Tool · entrata.crm.createEscalation", mcpToolName: "entrata.crm.createEscalation", durationMs: 134, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-ls-302\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.crm.createEscalation\",\n    \"arguments\": {\n      \"propertyId\": \"prop-ivy-gate\",\n      \"assignee\": \"jennifer.torres@example.com\",\n      \"topic\": \"HCV_APPLICATION\",\n      \"slaMinutes\": 60\n    }\n  }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"ticketId\": \"esc-4412\", \"status\": \"OPEN\" } }" },
            { type: "knowledge", label: "KB · HCV timeline band", durationMs: 62, detail: "Default messaging: 2–4 weeks post HA inspection when property has no custom SLA text." },
            { type: "reasoning", label: "SLA promise", durationMs: 41, thoughtProcess: " Escalation SLA is 60 minutes in the system—surface as 'within the hour' to match without overpromising minutes." },
            { type: "response", label: "Model · timeline + transfer", durationMs: 77 },
          ],
        },
      ],
      trace: [],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Factually grounded", passed: true }, { label: "Positive sentiment", passed: true }, { label: "Appropriate escalation", passed: true }],
    },
  ];

  if (agentName === "Payments AI") return [
    { id: "conv-p1", residentName: "James Wilson", channel: "SMS", topic: "Late Rent Follow-Up", summary: "Resident paid after receiving reminder. Payment confirmed.", outcome: "resolved", sentiment: "neutral", startedAt: "Today, 10:08 AM", daysAgo: 0, duration: "3m 45s", turns: 6,
      messages: [
        { role: "agent", text: `Hi James, this is a friendly reminder from ${propertyName} that your rent payment of $1,650 was due on the 3rd. Your current balance is $1,650. Would you like a link to make a payment?`, timestamp: "10:08 AM",
          trace: [
            { type: "prompt_citation", label: "Payment reminder tone", durationMs: 5, promptSourceLabel: "System prompt · Payments AI", promptExcerpt: "Balances and due dates must come from ledger tools only. Keep reminders neutral—no shaming language. Offer one-tap pay link when channel is SMS." },
            { type: "mcp_tool", label: "Tool · entrata.ledger.getBalance", mcpToolName: "entrata.ledger.getBalance", durationMs: 154, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-pay-001\",\n  \"method\": \"tools/call\",\n  \"params\": { \"name\": \"entrata.ledger.getBalance\", \"arguments\": { \"residentId\": \"res-james-wilson\", \"asOf\": \"2025-05-04\" } }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"balance\": 1650, \"currency\": \"USD\", \"dueDate\": \"2025-05-03\" } }" },
            { type: "http_api", label: "Legacy · GET /api/residents/{id}/billing-summary", durationMs: 33, status: "success", httpMethod: "GET", httpPath: "/api/v3/residents/res-james-wilson/billing-summary", httpResponseStatus: 200, httpResponseBody: "{ \"postedRent\": 1650, \"graceUntil\": \"2025-05-05\" }" },
            { type: "reasoning", label: "Proactive cadence", durationMs: 36, thoughtProcess: "Campaign rules triggered day+1 after due with zero payment applied; balance matches both system sources." },
            { type: "response", label: "Model · SMS reminder", durationMs: 79 },
          ],
        },
        { role: "resident", text: "Oh shoot, I forgot. Yes please send the link", timestamp: "10:10 AM" },
        { role: "agent", text: "No worries! Here's your payment link: pay.entrata.com/aspen-heights/jwilson. You can pay by ACH, debit, or credit card. The grace period ends on the 5th, so paying today avoids any late fees.", timestamp: "10:10 AM",
          trace: [
            { type: "mcp_tool", label: "Tool · entrata.payments.createHostedPayLink", mcpToolName: "entrata.payments.createHostedPayLink", durationMs: 121, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-pay-002\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.payments.createHostedPayLink\",\n    \"arguments\": { \"residentId\": \"res-james-wilson\", \"amountDue\": 1650, \"channel\": \"SMS\" }\n  }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"url\": \"https://pay.entrata.com/aspen-heights/jwilson\", \"expiresAt\": \"2025-05-05T23:59:59Z\" } }" },
            { type: "mcp_tool", label: "Tool · entrata.policy.getLateFeeRules", mcpToolName: "entrata.policy.getLateFeeRules", durationMs: 88, status: "success", mcpRequestJson: "{}", mcpResponseJson: "{ \"result\": { \"graceEnd\": \"2025-05-05\", \"feeAfterGrace\": 75 } }" },
            { type: "reasoning", label: "Grace copy", durationMs: 34, thoughtProcess: "Quote grace end from policy tool; do not invent card network fees." },
            { type: "response", label: "Model · pay link SMS", durationMs: 71 },
          ],
        },
        { role: "resident", text: "Just paid. Can you confirm you got it?", timestamp: "10:12 AM" },
        { role: "agent", text: "Payment of $1,650 received and confirmed! Your balance is now $0.00. Thank you, James. Have a great day!", timestamp: "10:12 AM",
          trace: [
            { type: "mcp_tool", label: "Tool · entrata.payments.verifySettlement", mcpToolName: "entrata.payments.verifySettlement", durationMs: 198, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-pay-003\",\n  \"method\": \"tools/call\",\n  \"params\": { \"name\": \"entrata.payments.verifySettlement\", \"arguments\": { \"residentId\": \"res-james-wilson\", \"windowMinutes\": 15 } }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"matchedPayment\": { \"amount\": 1650, \"method\": \"ACH\" }, \"newBalance\": 0 } }" },
            { type: "reasoning", label: "Confirmation safety", durationMs: 28, thoughtProcess: "Only confirm after verifySettlement returns matchedPayment; echo amount and zero balance." },
            { type: "response", label: "Model · receipt tone", durationMs: 62 },
          ],
        },
      ],
      trace: [],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Accurate balance", passed: true }, { label: "Positive sentiment", passed: true }, { label: "No repetition", passed: true }],
    },
    { id: "conv-p2", residentName: "Amy Chen", channel: "Chat", topic: "Payment Plan Request", summary: "Resident approved for 2-installment plan. Agreement sent for signature.", outcome: "resolved", sentiment: "positive", startedAt: "Yesterday, 3:22 PM", daysAgo: 1, duration: "5m 30s", turns: 6,
      messages: [
        { role: "resident", text: "I can't pay my full rent this month. Are payment plans an option?", timestamp: "3:22 PM" },
        { role: "agent", text: "I'm sorry to hear that, Amy. Yes, we do offer payment plans. Based on your account, you're eligible for a 2-installment plan: $825 due by the 5th and $825 by the 20th. Would you like me to set that up?", timestamp: "3:22 PM",
          trace: [
            { type: "mcp_tool", label: "Tool · entrata.paymentPlans.checkEligibility", mcpToolName: "entrata.paymentPlans.checkEligibility", durationMs: 176, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-pay-101\",\n  \"method\": \"tools/call\",\n  \"params\": { \"name\": \"entrata.paymentPlans.checkEligibility\", \"arguments\": { \"residentId\": \"res-amy-chen\" } }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"eligible\": true, \"maxInstallments\": 2, \"historyBand\": \"GOOD\" } }" },
            { type: "mcp_tool", label: "Tool · entrata.ledger.getBalance", mcpToolName: "entrata.ledger.getBalance", durationMs: 91, status: "success", mcpRequestJson: "{}", mcpResponseJson: "{ \"result\": { \"balance\": 1650 } }" },
            { type: "reasoning", label: "Split math", durationMs: 40, thoughtProcess: "Eligible for 2 installments; split 1650/2 = 825; dates from property plan template (5th and 20th)." },
            { type: "response", label: "Model · offer", durationMs: 84 },
          ],
        },
        { role: "resident", text: "Yes please, that would be a huge help.", timestamp: "3:23 PM" },
        { role: "agent", text: "You're all set! I've sent the payment plan agreement to your email at amy.chen@email.com. Please sign it by the 4th and make the first payment of $825 by the 5th. No late fees will apply as long as both payments are on time.", timestamp: "3:24 PM",
          trace: [
            { type: "mcp_tool", label: "Tool · entrata.paymentPlans.createPlan", mcpToolName: "entrata.paymentPlans.createPlan", durationMs: 201, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-pay-102\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.paymentPlans.createPlan\",\n    \"arguments\": {\n      \"residentId\": \"res-amy-chen\",\n      \"installments\": [ { \"due\": \"2025-05-05\", \"amount\": 825 }, { \"due\": \"2025-05-20\", \"amount\": 825 } ],\n      \"waiveLateFeesIfCurrent\": true\n    }\n  }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"planId\": \"pp-8821\", \"agreementDocId\": \"doc-pp-8821\" } }" },
            { type: "mcp_tool", label: "Tool · entrata.comms.sendTransactionalEmail", mcpToolName: "entrata.comms.sendTransactionalEmail", durationMs: 96, status: "success", mcpRequestJson: "{}", mcpResponseJson: "{ \"result\": { \"queued\": true } }" },
            { type: "prompt_citation", label: "Fee waiver wording", durationMs: 3, promptSourceLabel: "Payments AI · plans", promptExcerpt: "State late-fee waiver only when createPlan returns waiveLateFeesIfCurrent true." },
            { type: "response", label: "Model · confirmation", durationMs: 73 },
          ],
        },
      ],
      trace: [],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Policy compliant", passed: true }, { label: "Positive sentiment", passed: true }, { label: "No repetition", passed: true }],
    },
  ];

  if (agentName === "Maintenance AI") return [
    { id: "conv-m1", residentName: "Tom Bradley", channel: "SMS", topic: "Emergency — Kitchen Flooding", summary: "Emergency work order created. On-call tech dispatched within 5 minutes.", outcome: "resolved", sentiment: "positive", startedAt: "Today, 7:45 AM", daysAgo: 0, duration: "8m 10s", turns: 8,
      messages: [
        { role: "resident", text: "HELP my kitchen is flooding!! Water everywhere!!", timestamp: "7:45 AM" },
        { role: "agent", text: "I'm so sorry — let me help right away! This is being flagged as an emergency. First, please locate the shutoff valve under your sink and turn it clockwise to stop the water. I'm dispatching our on-call technician now.", timestamp: "7:45 AM",
          trace: [
            { type: "prompt_citation", label: "Emergency triage", durationMs: 4, promptSourceLabel: "Maintenance AI · water intrusion", promptExcerpt: "For active flooding: (1) instruct safe shutoff, (2) create emergency WO, (3) page on-call—do not troubleshoot beyond shutoff in SMS." },
            { type: "mcp_tool", label: "Tool · entrata.workorders.classifyUrgency", mcpToolName: "entrata.workorders.classifyUrgency", durationMs: 56, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-mnt-001\",\n  \"method\": \"tools/call\",\n  \"params\": { \"name\": \"entrata.workorders.classifyUrgency\", \"arguments\": { \"text\": \"HELP my kitchen is flooding!! Water everywhere!!\" } }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"level\": \"EMERGENCY\", \"category\": \"WATER_ACTIVE\" } }" },
            { type: "mcp_tool", label: "Tool · entrata.workorders.createEmergency", mcpToolName: "entrata.workorders.createEmergency", durationMs: 118, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-mnt-002\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.workorders.createEmergency\",\n    \"arguments\": { \"unitId\": \"u-tom-12b\", \"title\": \"Kitchen flooding\", \"category\": \"WATER_ACTIVE\" }\n  }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"workOrderId\": \"MNT-4892\" } }" },
            { type: "mcp_tool", label: "Tool · entrata.dispatch.pageOnCall", mcpToolName: "entrata.dispatch.pageOnCall", durationMs: 92, status: "success", mcpRequestJson: "{}", mcpResponseJson: "{ \"result\": { \"tech\": \"Marcus Rivera\", \"etaMinutes\": 20 } }" },
            { type: "reasoning", label: "SMS safety order", durationMs: 38, thoughtProcess: "Shutoff first per playbook; then state dispatch without promising arrival second—use ETA from pageOnCall." },
            { type: "response", label: "Model · emergency SMS", durationMs: 81 },
          ],
        },
        { role: "resident", text: "Ok I found it, water is slowing down", timestamp: "7:47 AM" },
        { role: "agent", text: "Great work! Our technician Marcus is on his way — ETA 20 minutes. In the meantime, place towels around the area to contain the water. Work order #MNT-4892 has been created. Marcus will call you when he arrives.", timestamp: "7:47 AM",
          trace: [
            { type: "mcp_tool", label: "Tool · entrata.dispatch.getStatus", mcpToolName: "entrata.dispatch.getStatus", durationMs: 71, status: "success", mcpRequestJson: "{}", mcpResponseJson: "{ \"result\": { \"workOrderId\": \"MNT-4892\", \"assignee\": \"Marcus Rivera\", \"etaMinutes\": 20, \"status\": \"EN_ROUTE\" } }" },
            { type: "http_api", label: "Legacy · POST /api/maintenance/notify-resident", durationMs: 36, status: "success", httpMethod: "POST", httpPath: "/api/maintenance/notify-resident", httpResponseStatus: 204 },
            { type: "response", label: "Model · status update", durationMs: 68 },
          ],
        },
        { role: "resident", text: "He's here now, thank you so much for the fast response!", timestamp: "8:05 AM" },
        { role: "agent", text: "So glad Marcus got there quickly! He'll take it from here. If you need anything else, don't hesitate to reach out. We'll follow up tomorrow to make sure everything is resolved.", timestamp: "8:05 AM",
          trace: [
            { type: "mcp_tool", label: "Tool · entrata.workorders.logResidentUpdate", mcpToolName: "entrata.workorders.logResidentUpdate", durationMs: 64, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-mnt-003\",\n  \"method\": \"tools/call\",\n  \"params\": { \"name\": \"entrata.workorders.logResidentUpdate\", \"arguments\": { \"workOrderId\": \"MNT-4892\", \"note\": \"Tech on site — resident confirmed\" } }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"ok\": true } }" },
            { type: "mcp_tool", label: "Tool · entrata.scheduler.scheduleFollowUp", mcpToolName: "entrata.scheduler.scheduleFollowUp", durationMs: 81, status: "success", mcpRequestJson: "{}", mcpResponseJson: "{ \"result\": { \"when\": \"2025-05-05T09:00:00-06:00\" } }" },
            { type: "reasoning", label: "Closure tone", durationMs: 29, thoughtProcess: "Positive resident signal—acknowledge tech by name, schedule follow-up from tool output." },
            { type: "response", label: "Model · wrap-up", durationMs: 59 },
          ],
        },
      ],
      trace: [],
      monitors: [{ label: "Emergency detected", passed: true }, { label: "Fast response (<30s)", passed: true }, { label: "Tech dispatched", passed: true }, { label: "Follow-up scheduled", passed: true }],
    },
    { id: "conv-m2", residentName: "Lisa Park", channel: "Chat", topic: "AC Not Cooling", summary: "Guided troubleshooting, then created work order for HVAC technician.", outcome: "resolved", sentiment: "neutral", startedAt: "Yesterday, 2:15 PM", daysAgo: 1, duration: "5m 40s", turns: 6,
      messages: [
        { role: "resident", text: "My AC has been running all day but it's still 80 degrees in here. Something is wrong.", timestamp: "2:15 PM" },
        { role: "agent", text: "I'm sorry about that! Let's try a few things first. Can you check if the air filter is clean? It's behind the return vent, usually in the hallway. A dirty filter is the most common cause of cooling issues.", timestamp: "2:15 PM",
          trace: [
            { type: "mcp_tool", label: "Tool · entrata.workorders.classifyUrgency", mcpToolName: "entrata.workorders.classifyUrgency", durationMs: 48, status: "success", mcpRequestJson: "{}", mcpResponseJson: "{ \"result\": { \"level\": \"ROUTINE\", \"category\": \"HVAC_COOLING\" } }" },
            { type: "knowledge", label: "KB · HVAC triage L1", durationMs: 72, detail: "Step 1 filter, step 2 thermostat mode, step 3 schedule tech if unresolved." },
            { type: "reasoning", label: "Non-emergency path", durationMs: 41, thoughtProcess: "No heat-stress keywords for elderly/vulnerable in thread—start with filter check before dispatch." },
            { type: "response", label: "Model · triage chat", durationMs: 86 },
          ],
        },
        { role: "resident", text: "I checked, the filter looks pretty dirty actually", timestamp: "2:17 PM" },
        { role: "agent", text: "That's likely the culprit! We have replacement filters at the leasing office — you can grab one anytime during office hours. If the AC still isn't cooling properly after 2-3 hours with the new filter, let me know and I'll schedule an HVAC tech visit.", timestamp: "2:18 PM",
          trace: [
            { type: "mcp_tool", label: "Tool · entrata.maintenance.logSelfHelp", mcpToolName: "entrata.maintenance.logSelfHelp", durationMs: 69, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-mnt-201\",\n  \"method\": \"tools/call\",\n  \"params\": { \"name\": \"entrata.maintenance.logSelfHelp\", \"arguments\": { \"unitId\": \"u-lisa-4c\", \"step\": \"FILTER_DIRTY\", \"channel\": \"CHAT\" } }\n}", mcpResponseJson: "{ \"jsonrpc\": \"2.0\", \"result\": { \"logged\": true } }" },
            { type: "mcp_tool", label: "Tool · entrata.inventory.getConsumablesLocation", mcpToolName: "entrata.inventory.getConsumablesLocation", durationMs: 58, status: "success", mcpRequestJson: "{}", mcpResponseJson: "{ \"result\": { \"filtersPickup\": \"LEASING_OFFICE\", \"hours\": \"9-6 M-F\" } }" },
            { type: "prompt_citation", label: "When to promise tech", durationMs: 3, promptSourceLabel: "Maintenance AI · HVAC", promptExcerpt: "Offer vendor dispatch only after resident confirms self-help failed or declines—avoid duplicate WO spam." },
            { type: "reasoning", label: "Next step gate", durationMs: 35, thoughtProcess: "Dirty filter confirmed—direct to office stock; conditional tech visit after 2–3h with new filter." },
            { type: "response", label: "Model · guidance", durationMs: 74 },
          ],
        },
      ],
      trace: [],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Followed troubleshooting protocol", passed: true }, { label: "Appropriate triage", passed: true }, { label: "No repetition", passed: true }],
    },
  ];

  if (agentName === "Renewal AI") return [
    { id: "conv-r1", residentName: "Kevin Pham", channel: "Email", topic: "Renewal Offer Accepted", summary: "Resident accepted renewal at $1,695/mo for 14-month term with loyalty adjustment.", outcome: "resolved", sentiment: "positive", startedAt: "Today, 9:30 AM", daysAgo: 0, duration: "12m 5s", turns: 8,
      messages: [
        {
          role: "agent",
          text: "Hi Kevin! Your lease at Aspen Heights is coming up for renewal on September 14. We'd love to have you stay! Here are your options:\n\n• 12-month: $1,725/mo\n• 14-month: $1,695/mo\n• Month-to-month: $1,950/mo\n\nAs a valued 2-year resident, we're also including a complimentary carpet cleaning. Would you like to discuss these options?",
          timestamp: "9:30 AM",
          trace: [
            { type: "prompt_citation", label: "Grounding: renewal voice + disclosure rules", durationMs: 6, promptSourceLabel: "System prompt · Renewal AI (production pack v3.2)", promptExcerpt: "You are Renewal AI for multifamily operators. Always (1) cite current rent and lease end from system data—never invent numbers, (2) present at least two term options when available, (3) include a retention perk only when policy JSON marks the household as eligible, (4) invite dialogue before negotiating, (5) log every tool call id on the trace for audit." },
            { type: "mcp_tool", label: "Tool · entrata.renewals.getLeaseSnapshot", mcpToolName: "entrata.renewals.getLeaseSnapshot", durationMs: 118, status: "success", detail: "Resolved canonical lease + renewal window for Kevin Pham / unit 12-204.", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-a114\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.renewals.getLeaseSnapshot\",\n    \"arguments\": {\n      \"propertyId\": \"prop-aspen-heights\",\n      \"residentId\": \"res-kevin-pham\",\n      \"includeMarketBands\": true,\n      \"includePerks\": true\n    }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-a114\",\n  \"result\": {\n    \"content\": [\n      {\n        \"type\": \"text\",\n        \"text\": {\n          \"leaseId\": \"ls-991204\",\n          \"unit\": \"12-204\",\n          \"currentRent\": 1650,\n          \"currency\": \"USD\",\n          \"leaseEnd\": \"2025-09-14\",\n          \"renewalOfferState\": \"NOT_SENT\",\n          \"eligiblePerks\": [\"COMPLIMENTARY_CARPET_CLEAN\"],\n          \"tenureMonths\": 26,\n          \"ledgerStatus\": \"CURRENT\",\n          \"lastLateFeeDate\": null\n        }\n      }\n    ]\n  }\n}" },
            { type: "mcp_tool", label: "Tool · entrata.market.getComparables", mcpToolName: "entrata.market.getComparables", durationMs: 164, status: "success", detail: "Pulled ILS + internal comps for 2BR in submarket.", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-a115\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.market.getComparables\",\n    \"arguments\": {\n      \"propertyId\": \"prop-aspen-heights\",\n      \"bedrooms\": 2,\n      \"radiusMiles\": 3,\n      \"asOf\": \"2025-05-04\"\n    }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-a115\",\n  \"result\": {\n    \"content\": [\n      {\n        \"type\": \"text\",\n        \"text\": {\n          \"medianAsk\": 1825,\n          \"p25\": 1750,\n          \"p75\": 1900,\n          \"sampleSize\": 38,\n          \"sources\": [\"ILS_AGGREGATE\", \"INTERNAL_LAST_90_LEASES\"]\n        }\n      }\n    ]\n  }\n}" },
            { type: "http_api", label: "Legacy REST (shadow) · POST /api/internal/renewals/pricing-engine", durationMs: 41, status: "success", detail: "Same payload mirrored to REST for parity during the transition.", httpMethod: "POST", httpPath: "/api/internal/renewals/v2/pricing-engine", httpRequestHeaders: "Authorization: Bearer ***redacted***\nContent-Type: application/json\nX-Idempotency-Key: idem-ren-88421-20250504", httpRequestBody: "{\n  \"leaseId\": \"ls-991204\",\n  \"policyPackId\": \"renewals-default-2025Q2\",\n  \"objectives\": [\"RETENTION\", \"MINIMIZE_DISCOUNT_DEPTH\"],\n  \"constraints\": { \"maxMtmPremiumPct\": 18 }\n}", httpResponseStatus: 200, httpResponseHeaders: "content-type: application/json\ncache-control: no-store", httpResponseBody: "{\n  \"options\": [\n    { \"termMonths\": 12, \"rent\": 1725, \"rationale\": \"BASE_TABLE\" },\n    { \"termMonths\": 14, \"rent\": 1695, \"rationale\": \"TERM_DISCOUNT_BAND_B\" },\n    { \"termMonths\": 1, \"rent\": 1950, \"rationale\": \"MTM_PREMIUM_CAP\" }\n  ],\n  \"perks\": [\"COMPLIMENTARY_CARPET_CLEAN\"],\n  \"traceId\": \"rest-9aa0f1\"\n}" },
            { type: "reasoning", label: "Synthesis · offers + tone", durationMs: 72, thoughtProcess: "The lease snapshot locks current rent at $1,650 and end date 2025-09-14—so I must anchor any percentage language to those facts, not to rounded marketing numbers.\n\nComps from entrata.market.getComparables show median ask $1,825 for 2BR, which justifies the 12-mo table rate $1,725 as \"below market\" without sounding defensive.\n\nThe REST shadow response matches the tool-derived options (12 @ 1725, 14 @ 1695, MTM @ 1950). Per system prompt §4, I present at least two non-MTM options first and keep MTM as a last line because it is a churn vector.\n\nPerk COMPLIMENTARY_CARPET_CLEAN is present in both system responses and tenure is 26 months with CURRENT ledger—so I am allowed to mention the perk explicitly.\n\nI will structure the email with bullets (readability) and end with an open question to invite negotiation rather than pushing immediate acceptance—matching the prompt's \"invite dialogue before negotiating\" clause." },
            { type: "prompt_citation", label: "Applied constraint from prompt", durationMs: 3, promptSourceLabel: "Policy excerpt · Renewal AI pack", promptExcerpt: "When presenting renewal options, always pair each rent with its term length in the same sentence or bullet, and never imply that MTM is the default continuation path." },
            { type: "response", label: "Model · draft email body", durationMs: 112, detail: "Rendered structured offer block + soft CTA; injected perk only because eligibility flags were true in the tool result." },
          ],
        },
        { role: "resident", text: "The increase is more than I expected. Is there any flexibility on the 12-month rate?", timestamp: "9:45 AM" },
        {
          role: "agent",
          text: "I completely understand, Kevin. Since you've been with us for 2 years with a great payment history, I've checked with our renewal team and we can offer a loyalty adjustment of $1,695/mo on the 12-month term — that's only a 2.7% increase vs. the standard 4.5%. The 14-month option at $1,695 is also a great value. What do you think?",
          timestamp: "9:46 AM",
          trace: [
            { type: "prompt_citation", label: "Negotiation stance", durationMs: 4, promptSourceLabel: "System prompt · Renewal AI §6 (pushback)", promptExcerpt: "If the resident challenges rent, (1) acknowledge first, (2) cite tenure + payment history from system ledger facts, (3) only then introduce loyalty adjustments that appear in entrata.renewals.evaluateLoyaltyAdjustment, (4) never promise adjustments not returned by that tool." },
            { type: "mcp_tool", label: "Tool · entrata.ledger.getResidentLedgerSummary", mcpToolName: "entrata.ledger.getResidentLedgerSummary", durationMs: 88, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-b201\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.ledger.getResidentLedgerSummary\",\n    \"arguments\": { \"residentId\": \"res-kevin-pham\", \"windowDays\": 730 }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-b201\",\n  \"result\": {\n    \"content\": [{ \"type\": \"text\", \"text\": {\n      \"onTimePaymentsLast24m\": 24,\n      \"nsfCount\": 0,\n      \"avgDaysPastDue\": 0.0,\n      \"riskBand\": \"LOW\"\n    }}]\n  }\n}" },
            { type: "mcp_tool", label: "Tool · entrata.renewals.evaluateLoyaltyAdjustment", mcpToolName: "entrata.renewals.evaluateLoyaltyAdjustment", durationMs: 134, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-b202\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.renewals.evaluateLoyaltyAdjustment\",\n    \"arguments\": {\n      \"leaseId\": \"ls-991204\",\n      \"requestedTermMonths\": 12,\n      \"tableRent\": 1725,\n      \"residentRiskBand\": \"LOW\",\n      \"tenureMonths\": 26\n    }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-b202\",\n  \"result\": {\n    \"content\": [{ \"type\": \"text\", \"text\": {\n      \"approved\": true,\n      \"adjustedRent\": 1695,\n      \"maxApproverLevel\": \"REGIONAL\",\n      \"reasonCodes\": [\"TENURE_GE_24M\", \"LEDGER_CURRENT\", \"RETENTION_TIER_A\"],\n      \"disclosure\": {\n        \"standardYoYPercent\": 4.5,\n        \"effectiveYoYPercent\": 2.7\n      }\n    }}]\n  }\n}" },
            { type: "reasoning", label: "Why this reply wording", durationMs: 81, thoughtProcess: "Resident objected to the 12-mo increase emotionally (\"more than I expected\"). Prompt §6 requires acknowledgement before numbers—so the reply opens with empathy, not with the discount.\n\nTool response confirms LOW risk and perfect payment cadence; I reference \"2 years\" and \"great payment history\" because those phrases are directly supported by ledger facts (not flattery).\n\nevaluateLoyaltyAdjustment returned approved=true with adjustedRent 1695 on the 12-mo line. That is the only number I am allowed to quote as a loyalty price; I therefore anchor the 12-mo offer to 1695 and compute YoY vs prior rent 1650 using the disclosure block (4.5% standard vs 2.7% effective) exactly as returned—no hand-wavy percentages.\n\nI also restate the 14-mo option at 1695 because the pricing engine already showed parity; the prompt encourages transparent comparison when two options collapse to the same rent to avoid cherry-picking confusion." },
            { type: "response", label: "Model · generated reply", durationMs: 98, detail: "Mirrored concern, cited tenure+ledger, quoted only tool-approved rents and disclosed YoY from tool output." },
          ],
        },
        { role: "resident", text: "The 14 month at 1695 sounds good. Let's do that.", timestamp: "10:02 AM" },
        {
          role: "agent",
          text: "Excellent choice! I've prepared your renewal agreement for 14 months at $1,695/mo starting September 15. The agreement has been sent to your email — please review and sign by August 15. The complimentary carpet cleaning will be scheduled after signing. Thank you for staying with us, Kevin!",
          timestamp: "10:02 AM",
          trace: [
            { type: "mcp_tool", label: "Tool · entrata.renewals.lockSelectedOffer", mcpToolName: "entrata.renewals.lockSelectedOffer", durationMs: 61, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-c301\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.renewals.lockSelectedOffer\",\n    \"arguments\": {\n      \"leaseId\": \"ls-991204\",\n      \"selectedTermMonths\": 14,\n      \"selectedRent\": 1695,\n      \"residentConfirmationText\": \"The 14 month at 1695 sounds good. Let's do that.\"\n    }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-c301\",\n  \"result\": {\n    \"content\": [{ \"type\": \"text\", \"text\": {\n      \"lockId\": \"lock-ren-441b\",\n      \"renewalStart\": \"2025-09-15\",\n      \"signBy\": \"2025-08-15\",\n      \"documentTemplateId\": \"tmpl-ren-2025-standard\"\n    }}]\n  }\n}" },
            { type: "mcp_tool", label: "Tool · entrata.documents.generateRenewalAgreement", mcpToolName: "entrata.documents.generateRenewalAgreement", durationMs: 176, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-c302\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.documents.generateRenewalAgreement\",\n    \"arguments\": {\n      \"lockId\": \"lock-ren-441b\",\n      \"includePerks\": [\"COMPLIMENTARY_CARPET_CLEAN\"]\n    }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-c302\",\n  \"result\": {\n    \"content\": [{ \"type\": \"text\", \"text\": {\n      \"documentId\": \"doc-ren-77812\",\n      \"pdfUri\": \"s3://redacted-bucket/renewals/doc-ren-77812.pdf\",\n      \"sha256\": \"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\"\n    }}]\n  }\n}" },
            { type: "mcp_tool", label: "Tool · entrata.comms.sendTransactionalEmail", mcpToolName: "entrata.comms.sendTransactionalEmail", durationMs: 92, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-c303\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.comms.sendTransactionalEmail\",\n    \"arguments\": {\n      \"templateId\": \"txn-renewal-agreement-ready\",\n      \"to\": \"kevin.pham@email.com\",\n      \"mergeFields\": {\n        \"TERM_MONTHS\": \"14\",\n        \"RENT\": \"1695\",\n        \"START_DATE\": \"2025-09-15\",\n        \"SIGN_BY\": \"2025-08-15\"\n      },\n      \"attachments\": [\"doc-ren-77812\"]\n    }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-7c21-c303\",\n  \"result\": {\n    \"content\": [{ \"type\": \"text\", \"text\": { \"queued\": true, \"providerMessageId\": \"sg-aa9912\" }}]\n  }\n}" },
            { type: "prompt_citation", label: "Closing obligations", durationMs: 3, promptSourceLabel: "System prompt · Renewal AI §9 (documents)", promptExcerpt: "After a term selection is locked, always restate sign-by date, start date, and any conditional perks tied to signature—using only fields returned by lock + document tools." },
            { type: "reasoning", label: "Final copy decisions", durationMs: 48, thoughtProcess: "lockSelectedOffer returned renewalStart 2025-09-15 and signBy 2025-08-15; I must surface both dates verbatim.\n\nThe resident already verbally accepted 14 months @ 1695; I treat that as sufficient intent to lock, but I still avoid claiming \"signed\"—only \"prepared\" and \"sent\" per truthfulness rules.\n\nCarpet cleaning is conditional on signature per policy pack; the prompt says to mention scheduling after signing, not before.\n\nI end with gratitude to match voice guidelines without adding new financial commitments." },
            { type: "response", label: "Model · confirmation email", durationMs: 86 },
          ],
        },
      ],
      trace: [],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Accurate pricing", passed: true }, { label: "Positive sentiment", passed: true }, { label: "Retention outcome", passed: true }],
    },
    { id: "conv-r2", residentName: "Rachel Adams", channel: "SMS", topic: "Move-Out Notice", summary: "Resident decided to move out. Notice processed, move-out checklist sent.", outcome: "resolved", sentiment: "negative", startedAt: "Yesterday, 11:15 AM", daysAgo: 1, duration: "7m 20s", turns: 6,
      messages: [
        { role: "resident", text: "Hi, I've decided not to renew my lease. What do I need to do?", timestamp: "11:15 AM" },
        {
          role: "agent",
          text: "I'm sorry to hear you'll be leaving, Rachel. To process your move-out, you'll need to submit written 60-day notice (your deadline is July 15). I can start that process for you now. Would you like me to send you the official notice form and move-out checklist?",
          timestamp: "11:15 AM",
          trace: [
            { type: "prompt_citation", label: "Move-out / churn tone", durationMs: 5, promptSourceLabel: "System prompt · Renewal AI §11 (move-out)", promptExcerpt: "When a resident states non-renewal, open with empathy, cite notice rules from the system legal calendar only, never threaten, and always offer the official notice artifact through entrata.moveout.sendPacket rather than improvising PDF links." },
            { type: "mcp_tool", label: "Tool · entrata.lease.getNoticeRules", mcpToolName: "entrata.lease.getNoticeRules", durationMs: 102, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-8d02-a001\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.lease.getNoticeRules\",\n    \"arguments\": { \"leaseId\": \"ls-aa4412\", \"jurisdiction\": \"US-CO\" }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-8d02-a001\",\n  \"result\": {\n    \"content\": [{ \"type\": \"text\", \"text\": {\n      \"minWrittenNoticeDays\": 60,\n      \"noticeCalendar\": \"BUSINESS\",\n      \"latestValidNoticeDate\": \"2025-07-15\",\n      \"leaseEnd\": \"2025-09-14\"\n    }}]\n  }\n}" },
            { type: "http_api", label: "Legacy REST (read-only) · GET /api/leases/{id}/calendar", durationMs: 36, status: "success", httpMethod: "GET", httpPath: "/api/v3/leases/ls-aa4412/calendar", httpResponseStatus: 200, httpResponseBody: "{\n  \"leaseEnd\": \"2025-09-14\",\n  \"noticeDeadline\": \"2025-07-15\",\n  \"timezone\": \"America/Denver\"\n}" },
            { type: "reasoning", label: "SMS framing", durationMs: 58, thoughtProcess: "Tool response returned 60-day written notice with latestValidNoticeDate 2025-07-15. I must present that date as the deadline, not \"about two months\".\n\nChannel is SMS—prompt warns against long URLs; I therefore offer to send forms via email rather than pasting links.\n\nI keep empathy in the first sentence because the resident announced churn; the prompt forbids sounding transactional in the opening clause." },
            { type: "response", label: "Model · SMS reply", durationMs: 91 },
          ],
        },
        { role: "resident", text: "Yes please. And when is the move-out inspection?", timestamp: "11:17 AM" },
        {
          role: "agent",
          text: "I've sent the notice form and move-out checklist to your email. The pre-move-out inspection is typically scheduled 2 weeks before your lease end date. We'll contact you in early September to set that up. Is there anything that might change your mind? We may be able to offer adjusted terms.",
          timestamp: "11:18 AM",
          trace: [
            { type: "mcp_tool", label: "Tool · entrata.moveout.sendPacket", mcpToolName: "entrata.moveout.sendPacket", durationMs: 118, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-8d02-b010\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.moveout.sendPacket\",\n    \"arguments\": {\n      \"residentId\": \"res-rachel-adams\",\n      \"packet\": [\"NOTICE_PDF\", \"MOVEOUT_CHECKLIST\"],\n      \"channel\": \"EMAIL\"\n    }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-8d02-b010\",\n  \"result\": {\n    \"content\": [{ \"type\": \"text\", \"text\": { \"messageId\": \"msg-ff901\", \"delivered\": true }}]\n  }\n}" },
            { type: "mcp_tool", label: "Tool · entrata.ops.getInspectionPolicy", mcpToolName: "entrata.ops.getInspectionPolicy", durationMs: 84, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-8d02-b011\",\n  \"method\": \"tools/call\",\n  \"params\": { \"name\": \"entrata.ops.getInspectionPolicy\", \"arguments\": { \"propertyId\": \"prop-aspen-heights\" } }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-8d02-b011\",\n  \"result\": {\n    \"content\": [{ \"type\": \"text\", \"text\": {\n      \"preMoveInspectionLeadDays\": 14,\n      \"schedulingWindow\": \"BUSINESS_HOURS\",\n      \"contactTemplate\": \"MAINTENANCE_COORDINATOR\"\n    }}]\n  }\n}" },
            { type: "prompt_citation", label: "Retention boundary", durationMs: 3, promptSourceLabel: "System prompt · Renewal AI §11.3", promptExcerpt: "You may ask exactly one soft retention question per move-out thread after logistics are satisfied, and you must not repeat it if the resident declines." },
            { type: "reasoning", label: "Why retention hook is included", durationMs: 55, thoughtProcess: "sendPacket succeeded, so logistics are handled—this satisfies the prompt gate for a single retention probe.\n\nInspection answer is driven strictly by getInspectionPolicy (14 days before lease end) translated into resident-friendly language (\"early September\" relative to Sep 14 end) without inventing a calendar appointment id.\n\nI include the win-back question once, phrased as optional adjusted terms, matching §11.3." },
            { type: "response", label: "Model · SMS reply", durationMs: 94 },
          ],
        },
        { role: "resident", text: "No, I'm relocating for work. Thanks for the info.", timestamp: "11:20 AM" },
        {
          role: "agent",
          text: "Completely understandable! We wish you the best with your move. If anything changes, we're here. I've noted the reason as work relocation. Take care, Rachel!",
          timestamp: "11:20 AM",
          trace: [
            { type: "prompt_citation", label: "Hard stop after explicit reason", durationMs: 2, promptSourceLabel: "System prompt · Renewal AI §11.4", promptExcerpt: "If the resident gives a concrete relocation/employer-driven reason and declines retention, do not run additional save attempts or inventory new offers in the same session." },
            { type: "mcp_tool", label: "Tool · entrata.crm.logExitSurvey", mcpToolName: "entrata.crm.logExitSurvey", durationMs: 76, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-8d02-c020\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.crm.logExitSurvey\",\n    \"arguments\": {\n      \"residentId\": \"res-rachel-adams\",\n      \"primaryReasonCode\": \"RELOCATION_WORK\",\n      \"verbatim\": \"No, I'm relocating for work. Thanks for the info.\"\n    }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-8d02-c020\",\n  \"result\": {\n    \"content\": [{ \"type\": \"text\", \"text\": { \"crmNoteId\": \"note-aa901\", \"syncedToPMS\": true }}]\n  }\n}" },
            { type: "mcp_tool", label: "Tool · entrata.notify.propertyManager", mcpToolName: "entrata.notify.propertyManager", durationMs: 71, status: "success", mcpRequestJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-8d02-c021\",\n  \"method\": \"tools/call\",\n  \"params\": {\n    \"name\": \"entrata.notify.propertyManager\",\n    \"arguments\": {\n      \"propertyId\": \"prop-aspen-heights\",\n      \"subject\": \"Move-out intent logged\",\n      \"body\": \"Rachel Adams — reason RELOCATION_WORK — lease ends 2025-09-14\"\n    }\n  }\n}", mcpResponseJson: "{\n  \"jsonrpc\": \"2.0\",\n  \"id\": \"mcp-8d02-c021\",\n  \"result\": {\n    \"content\": [{ \"type\": \"text\", \"text\": { \"delivered\": true, \"channel\": \"SLACK_DM\" }}]\n  }\n}" },
            { type: "reasoning", label: "Why no second save attempt", durationMs: 41, thoughtProcess: "The resident cited relocation for work and thanked me—this triggers §11.4 hard stop. CRM log captures verbatim text; manager notification is informational only.\n\nI avoid any new financial offer language because that would violate the stop rule even if models sometimes suggest \"one more promo\"." },
            { type: "response", label: "Model · SMS closing", durationMs: 63 },
          ],
        },
      ],
      trace: [],
      monitors: [{ label: "Coherent response", passed: true }, { label: "Retention attempted", passed: true }, { label: "Empathetic tone", passed: true }, { label: "Process followed", passed: true }],
    },
  ];

  return [];
}

/* ─────────────────────────────────────────────────────────────────────
   Additional preloaded conversation logs for the Eli Plus agents.
   These are intentionally lighter than the hand-crafted baseline entries
   above (a short message exchange + a 3-step trace) — their purpose is to
   give the History & Logging list realistic volume so the filter UI can
   be demoed against ~20 rows per agent.
   ───────────────────────────────────────────────────────────────────── */

type QuickLogSpec = {
  id: string;
  residentName: string;
  channel: ConversationChannel;
  topic: string;
  summary: string;
  outcome: ConversationLog["outcome"];
  sentiment: ConversationLog["sentiment"];
  startedAt: string;
  daysAgo: number;
  duration: string;
  turns: number;
  residentText: string;
  agentText: string;
  toolName: string;
  toolHint?: string;
  monitors?: { label: string; passed: boolean }[];
};

function buildQuickLog(spec: QuickLogSpec): ConversationLog {
  const timestamp = spec.startedAt.includes(", ")
    ? spec.startedAt.slice(spec.startedAt.indexOf(", ") + 2)
    : spec.startedAt;
  const requestId = `mcp-${spec.id}-r1`;
  return {
    id: spec.id,
    residentName: spec.residentName,
    channel: spec.channel,
    topic: spec.topic,
    summary: spec.summary,
    outcome: spec.outcome,
    sentiment: spec.sentiment,
    startedAt: spec.startedAt,
    daysAgo: spec.daysAgo,
    duration: spec.duration,
    turns: spec.turns,
    messages: [
      { role: "resident", text: spec.residentText, timestamp },
      {
        role: "agent",
        text: spec.agentText,
        timestamp,
        trace: [
          {
            type: "mcp_tool",
            label: `Tool · ${spec.toolName}`,
            mcpToolName: spec.toolName,
            durationMs: 112,
            status: "success",
            detail: spec.toolHint,
            mcpRequestJson: `{\n  "jsonrpc": "2.0",\n  "id": "${requestId}",\n  "method": "tools/call",\n  "params": { "name": "${spec.toolName}" }\n}`,
            mcpResponseJson: `{\n  "jsonrpc": "2.0",\n  "id": "${requestId}",\n  "result": { "ok": true }\n}`,
          },
          { type: "reasoning", label: "Reply framing", durationMs: 38 },
          { type: "response", label: "Model · reply", durationMs: 72 },
        ],
      },
    ],
    trace: [],
    monitors: spec.monitors ?? [
      { label: "Coherent response", passed: true },
      { label: "Factually grounded", passed: true },
      { label: spec.outcome === "escalated" ? "Appropriate escalation" : "Appropriate tone", passed: true },
      { label: "No repetition", passed: true },
    ],
  };
}

function generateAdditionalConversationLogs(agentName: string, propertyName: string): ConversationLog[] {
  if (agentName === "Leasing AI") {
    return [
      buildQuickLog({ id: "conv-l4", residentName: "Jordan Reyes", channel: "Voice", topic: "Virtual Tour Request", summary: "Prospect requested a self-guided video tour. Sent personalized walkthrough link.", outcome: "resolved", sentiment: "positive", startedAt: "Today, 9:12 AM", daysAgo: 0, duration: "3m 04s", turns: 4, residentText: "Hi, I'm out of state — can I do a virtual tour of the 2-bedroom before I fly in?", agentText: `Absolutely! I just sent you a self-guided video tour for the 2BR at ${propertyName}, plus a Zoom slot for a live walkthrough Thursday at 11am MT if you'd prefer that.`, toolName: "entrata.tours.sendVirtualPacket" }),
      buildQuickLog({ id: "conv-l5", residentName: "Emily Carter", channel: "Email", topic: "Amenity Questions", summary: "Asked about gym hours and co-working space. Sent amenity sheet.", outcome: "resolved", sentiment: "positive", startedAt: "Today, 8:48 AM", daysAgo: 0, duration: "2m 41s", turns: 4, residentText: "What are the gym hours, and is the co-working space free for residents?", agentText: `Our 24/7 fitness center is open round the clock with a key fob, and the co-working space is free for residents weekdays 7am–10pm. I'm attaching the full amenity sheet for ${propertyName}.`, toolName: "entrata.property.getAmenities" }),
      buildQuickLog({ id: "conv-l6", residentName: "Brandon Lee", channel: "Chat", topic: "Parking Availability", summary: "Confirmed covered parking availability and reserved a spot for move-in.", outcome: "resolved", sentiment: "neutral", startedAt: "Today, 7:33 AM", daysAgo: 0, duration: "3m 18s", turns: 5, residentText: "Do you have covered parking? I drive a truck.", agentText: "Yes! Covered parking is $75/month and we have 4 oversized stalls that fit full-size trucks. I held one for your application on file.", toolName: "entrata.parking.getInventory" }),
      buildQuickLog({ id: "conv-l7", residentName: "Olivia Tran", channel: "SMS", topic: "Lease Term Options", summary: "Asked about 9-month lease. Quoted seasonal premium.", outcome: "pending", sentiment: "neutral", startedAt: "Yesterday, 6:55 PM", daysAgo: 1, duration: "1m 52s", turns: 3, residentText: "Do you offer a 9-month lease? Starting in August.", agentText: "Yes — 9-month leases are available at a $125/mo premium over our 12-month rate. The August 1 move-in 1BR comes to $1,475/mo on a 9-month term.", toolName: "entrata.pricing.getTermOptions" }),
      buildQuickLog({ id: "conv-l8", residentName: "Marcus Johnson", channel: "Chat", topic: "Pet Deposit Question", summary: "Clarified deposit for a second pet. Sent pet addendum.", outcome: "resolved", sentiment: "positive", startedAt: "Yesterday, 5:20 PM", daysAgo: 1, duration: "2m 08s", turns: 4, residentText: "I have two cats — is the deposit per pet or just one fee?", agentText: "It's per pet — $200 refundable + $15/mo per pet. Total for two cats is a $400 refundable deposit + $30/mo. I'll email you the pet addendum to review.", toolName: "entrata.policy.getPetPolicy" }),
      buildQuickLog({ id: "conv-l9", residentName: "Hannah Brooks", channel: "Email", topic: "Application Status", summary: "Resident application stalled on income verification — escalated to leasing.", outcome: "escalated", sentiment: "negative", startedAt: "Yesterday, 3:02 PM", daysAgo: 1, duration: "4m 12s", turns: 6, residentText: "It's been 5 days since I uploaded my paystubs and I haven't heard back. Is something wrong?", agentText: "I'm sorry for the delay, Hannah. I'm escalating this directly to our leasing manager Jennifer — she'll personally review your file within the hour and call you with an update.", toolName: "entrata.crm.createEscalation", monitors: [{ label: "Coherent response", passed: true }, { label: "Appropriate escalation", passed: true }, { label: "Empathetic tone", passed: true }, { label: "SLA on file", passed: true }] }),
      buildQuickLog({ id: "conv-l10", residentName: "Ahmed Khan", channel: "Voice", topic: "Move-In Date Flexibility", summary: "Confirmed unit hold for 10-day delayed move-in.", outcome: "resolved", sentiment: "positive", startedAt: "2 days ago, 1:45 PM", daysAgo: 2, duration: "5m 22s", turns: 6, residentText: "I signed yesterday but my movers can't come until the 17th. Is that OK?", agentText: "No problem — your move-in date is updated to August 17th. There's no proration penalty since you're still in the same month. You'll get your fob and key on the 17th.", toolName: "entrata.leasing.adjustMoveInDate" }),
      buildQuickLog({ id: "conv-l11", residentName: "Priya Patel", channel: "Chat", topic: "School District Inquiry", summary: "Looked up school assignments for the property zip. Linked district website.", outcome: "resolved", sentiment: "neutral", startedAt: "2 days ago, 11:11 AM", daysAgo: 2, duration: "2m 30s", turns: 4, residentText: "We have two kids. What elementary school would they go to?", agentText: `${propertyName} is in the Cherry Creek district — Belleview Elementary for K–5. Here's the district's school locator page so you can confirm the boundary.`, toolName: "entrata.knowledge.lookupSchoolDistrict" }),
      buildQuickLog({ id: "conv-l12", residentName: "Tyler Robinson", channel: "SMS", topic: "Income Requirement", summary: "Quoted 3x rent requirement. Prospect to provide co-signer info.", outcome: "pending", sentiment: "neutral", startedAt: "3 days ago, 4:08 PM", daysAgo: 3, duration: "1m 41s", turns: 3, residentText: "What's the income requirement to qualify?", agentText: "We look for 3x the monthly rent in gross household income, or a qualified co-signer if you're under. For a $1,475 unit that's $4,425/mo combined.", toolName: "entrata.screening.getQualifyingRules" }),
      buildQuickLog({ id: "conv-l13", residentName: "Sophia Nguyen", channel: "Chat", topic: "Furnished Options", summary: "Asked about short-term furnished. Out of inventory; offered waitlist.", outcome: "pending", sentiment: "neutral", startedAt: "3 days ago, 2:36 PM", daysAgo: 3, duration: "2m 19s", turns: 4, residentText: "Do you have any furnished short-term units available?", agentText: "We don't have furnished inventory available right now, but I added you to the waitlist and you'll get a notice as soon as one opens up — usually 2–3 per quarter.", toolName: "entrata.inventory.checkFurnished" }),
      buildQuickLog({ id: "conv-l14", residentName: "Devon Wright", channel: "Email", topic: "Holding Deposit Refund", summary: "Application withdrawn before screening. Refund processed.", outcome: "resolved", sentiment: "neutral", startedAt: "4 days ago, 10:24 AM", daysAgo: 4, duration: "3m 50s", turns: 5, residentText: "I changed my mind on the apartment — can I get my holding deposit back?", agentText: "Since we hadn't run screening yet, your $200 holding deposit is fully refundable. I just initiated the refund — you'll see it back on your card in 3–5 business days.", toolName: "entrata.payments.refundHold" }),
      buildQuickLog({ id: "conv-l15", residentName: "Grace Liu", channel: "Voice", topic: "ADA Unit Inquiry", summary: "Confirmed wheelchair-accessible 1BR availability. Booked priority tour.", outcome: "resolved", sentiment: "positive", startedAt: "5 days ago, 1:09 PM", daysAgo: 5, duration: "4m 33s", turns: 5, residentText: "I use a wheelchair — do you have any ground-floor accessible units coming up?", agentText: "Yes! We have an ADA-compliant 1BR opening August 1 with a roll-in shower and lowered counters. I booked you a priority tour for Saturday at 10am with our community manager.", toolName: "entrata.inventory.getAccessibleUnits" }),
      buildQuickLog({ id: "conv-l16", residentName: "Nathan Reed", channel: "Chat", topic: "Roommate Add to Lease", summary: "Walked prospect through roommate qualification flow.", outcome: "pending", sentiment: "neutral", startedAt: "5 days ago, 11:48 AM", daysAgo: 5, duration: "3m 02s", turns: 5, residentText: "My girlfriend wants to be on the lease too. How does that work?", agentText: "She'll fill out a co-applicant form and run the same screening — $50 app fee. Once approved, we add her to the lease via an amendment. I'll email both you the link.", toolName: "entrata.leasing.startCoApplicant" }),
      buildQuickLog({ id: "conv-l17", residentName: "Isabella Romano", channel: "Email", topic: "Application Denied — Appeal", summary: "Soft denial appealed; routed to compliance for review.", outcome: "escalated", sentiment: "negative", startedAt: "6 days ago, 9:30 AM", daysAgo: 6, duration: "6m 47s", turns: 7, residentText: "My application was denied but I think there's a mistake on the credit report it pulled.", agentText: "I hear you. Per our policy I'm escalating this to our compliance team — they'll review the credit dispute and respond within 2 business days with next steps and the adverse action notice.", toolName: "entrata.compliance.openAppeal", monitors: [{ label: "Coherent response", passed: true }, { label: "Appropriate escalation", passed: true }, { label: "Empathetic tone", passed: true }, { label: "Compliance routed", passed: true }] }),
      buildQuickLog({ id: "conv-l18", residentName: "Carlos Mendoza", channel: "SMS", topic: "Application Approved — Next Steps", summary: "Sent move-in checklist and renter's insurance link.", outcome: "resolved", sentiment: "positive", startedAt: "7 days ago, 3:14 PM", daysAgo: 7, duration: "2m 21s", turns: 3, residentText: "Just saw the approval email! What's next?", agentText: "Congrats Carlos! Next: (1) pay the security deposit, (2) e-sign the lease (link sent), (3) bind renter's insurance before move-in. Want me to walk you through any of these?", toolName: "entrata.leasing.getMoveInChecklist" }),
      buildQuickLog({ id: "conv-l19", residentName: "Megan O'Brien", channel: "Chat", topic: "Specials & Concessions", summary: "Quoted current LMC concession. Prospect to confirm tour.", outcome: "pending", sentiment: "positive", startedAt: "9 days ago, 4:51 PM", daysAgo: 9, duration: "2m 12s", turns: 4, residentText: "Any move-in specials right now?", agentText: "Yes! Sign by August 31 and get $750 off your first full month, plus we waive the $250 admin fee. That applies to the 2BR/2BA you looked at.", toolName: "entrata.specials.getActive" }),
      buildQuickLog({ id: "conv-l20", residentName: "Jamal Williams", channel: "Voice", topic: "Tour No-Show Reschedule", summary: "Rescheduled missed tour. Sent calendar invite.", outcome: "resolved", sentiment: "neutral", startedAt: "11 days ago, 12:02 PM", daysAgo: 11, duration: "3m 25s", turns: 4, residentText: "I'm sorry I missed our tour yesterday — can we reschedule?", agentText: "Of course! I have Saturday at 11am or Sunday at 1pm. I'll send the calendar invite as soon as you confirm.", toolName: "entrata.tours.rescheduleTour" }),
    ];
  }

  if (agentName === "Payments AI") {
    return [
      buildQuickLog({ id: "conv-p3", residentName: "Robert Singh", channel: "Chat", topic: "Autopay Setup", summary: "Resident enrolled in monthly ACH autopay on the 3rd.", outcome: "resolved", sentiment: "positive", startedAt: "Today, 11:32 AM", daysAgo: 0, duration: "3m 08s", turns: 5, residentText: "How do I set up autopay so I stop forgetting?", agentText: "Easy — I'll send you a one-tap setup link. You can pick the 1st, 3rd, or 5th of each month and we'll auto-debit from your bank. You can cancel anytime in resident portal.", toolName: "entrata.payments.startAutopayEnrollment" }),
      buildQuickLog({ id: "conv-p4", residentName: "Linda Thompson", channel: "SMS", topic: "Returned ACH", summary: "Resident's ACH bounced. Sent retry link with fee disclosed.", outcome: "pending", sentiment: "neutral", startedAt: "Today, 9:54 AM", daysAgo: 0, duration: "2m 27s", turns: 4, residentText: "I got a notice my payment bounced. What now?", agentText: "Your bank returned the ACH (likely insufficient funds). The total due with the $35 NSF fee is $1,725. Here's a retry link — you can pay by debit or a different bank.", toolName: "entrata.payments.handleNsf" }),
      buildQuickLog({ id: "conv-p5", residentName: "Marcus Davis", channel: "Voice", topic: "Balance Inquiry", summary: "Read out current balance and recent posting.", outcome: "resolved", sentiment: "neutral", startedAt: "Today, 8:19 AM", daysAgo: 0, duration: "1m 42s", turns: 3, residentText: "What's my current balance?", agentText: "Your balance as of today is $0.00 — your $1,650 payment posted yesterday morning. You're all set for August.", toolName: "entrata.ledger.getBalance" }),
      buildQuickLog({ id: "conv-p6", residentName: "Sofia Martinez", channel: "Email", topic: "Receipt Request", summary: "Sent itemized receipt for tax purposes.", outcome: "resolved", sentiment: "positive", startedAt: "Yesterday, 4:08 PM", daysAgo: 1, duration: "2m 03s", turns: 3, residentText: "Can you send me an itemized receipt for all my rent payments this year?", agentText: "Sent! Your 2025 YTD itemized receipt is in your inbox — $11,550 across 7 monthly payments with confirmation numbers and dates.", toolName: "entrata.ledger.exportItemizedReceipt" }),
      buildQuickLog({ id: "conv-p7", residentName: "William Hayes", channel: "SMS", topic: "Late Fee Dispute", summary: "Late fee waived as one-time courtesy; escalation logged.", outcome: "resolved", sentiment: "neutral", startedAt: "Yesterday, 2:35 PM", daysAgo: 1, duration: "3m 51s", turns: 5, residentText: "I paid on the 5th, why was I charged a late fee?", agentText: "I see — the grace period ended at midnight on the 5th and your payment posted at 12:42am on the 6th. As a one-time courtesy I've waived the $75 fee. Your balance is $0.", toolName: "entrata.policy.waiveLateFee" }),
      buildQuickLog({ id: "conv-p8", residentName: "Emma Garcia", channel: "Chat", topic: "Partial Payment", summary: "Logged $500 partial payment intent; reminder set for balance.", outcome: "pending", sentiment: "neutral", startedAt: "2 days ago, 5:14 PM", daysAgo: 2, duration: "2m 47s", turns: 4, residentText: "I can pay $500 now and the rest on Friday. Can I do that?", agentText: "Yes — I'll log a partial payment intent. Pay $500 today and I'll send a reminder Friday for the remaining $1,150 with a one-tap pay link.", toolName: "entrata.payments.logPartialIntent" }),
      buildQuickLog({ id: "conv-p9", residentName: "Anthony Russo", channel: "Voice", topic: "Credit Card Decline", summary: "Card decline; switched to ACH; payment cleared.", outcome: "resolved", sentiment: "neutral", startedAt: "2 days ago, 1:33 PM", daysAgo: 2, duration: "4m 11s", turns: 6, residentText: "My credit card got declined. Can I use a different way?", agentText: "Of course. You can pay by ACH for free, or use a debit card with a 2.95% fee. I'll send the secure payment link to your phone now.", toolName: "entrata.payments.createHostedPayLink" }),
      buildQuickLog({ id: "conv-p10", residentName: "Natalie Foster", channel: "Email", topic: "Move-Out Refund Status", summary: "Sent SODA timeline and current refund status.", outcome: "resolved", sentiment: "positive", startedAt: "3 days ago, 11:20 AM", daysAgo: 3, duration: "2m 56s", turns: 4, residentText: "I moved out 2 weeks ago — when do I get my security deposit back?", agentText: "Per Colorado law we have 60 days from move-out to send the SODA. Your file shows the unit inspected clean, refund of $1,425 is in the queue for processing on August 25.", toolName: "entrata.moveout.getSodaStatus" }),
      buildQuickLog({ id: "conv-p11", residentName: "Christopher Yang", channel: "SMS", topic: "Pet Rent Adjustment", summary: "Removed pet rent after pet rehoming proof received.", outcome: "resolved", sentiment: "neutral", startedAt: "3 days ago, 9:48 AM", daysAgo: 3, duration: "3m 18s", turns: 5, residentText: "I rehomed my cat last month — can you remove the pet rent?", agentText: "I've removed the $15/mo pet rent going forward. I also credited $30 back for the months since you sent confirmation. Your new monthly is $1,620.", toolName: "entrata.ledger.adjustRecurringCharge" }),
      buildQuickLog({ id: "conv-p12", residentName: "Ashley Cooper", channel: "Chat", topic: "Duplicate Payment", summary: "Identified duplicate ACH; refund initiated.", outcome: "resolved", sentiment: "positive", startedAt: "4 days ago, 3:42 PM", daysAgo: 4, duration: "4m 02s", turns: 5, residentText: "I think I paid twice this month by accident!", agentText: "You did — two ACH posts of $1,650. I just initiated a refund of one to your bank on file; it'll clear in 3–5 business days. Account balance is now $0.", toolName: "entrata.payments.refundDuplicate" }),
      buildQuickLog({ id: "conv-p13", residentName: "Daniel Brooks", channel: "Voice", topic: "Roommate Split Pay", summary: "Set up split-pay between three roommates.", outcome: "resolved", sentiment: "neutral", startedAt: "5 days ago, 1:55 PM", daysAgo: 5, duration: "5m 14s", turns: 6, residentText: "Can my two roommates and I split the rent into thirds?", agentText: "Yes — I just enabled Split Pay on the unit. Each of you will get a portal link to pay your $616.67 share. The full rent is collected when all three pay.", toolName: "entrata.payments.enableSplitPay" }),
      buildQuickLog({ id: "conv-p14", residentName: "Victoria Patel", channel: "Email", topic: "Section 8 Portion Question", summary: "Clarified HCV tenant portion vs. HAP portion.", outcome: "resolved", sentiment: "neutral", startedAt: "6 days ago, 10:32 AM", daysAgo: 6, duration: "3m 37s", turns: 4, residentText: "My voucher covers most of my rent but I'm confused what I actually owe.", agentText: "Your HCV covers $1,150 monthly (paid by the housing authority). Your tenant portion is $385/mo, due on the 1st. The autopay link below is set to that amount.", toolName: "entrata.affordable.getTenantPortion" }),
      buildQuickLog({ id: "conv-p15", residentName: "Brandon Schwartz", channel: "SMS", topic: "Eviction Warning Push-Back", summary: "Resident upset about pre-eviction notice — escalated to property manager.", outcome: "escalated", sentiment: "negative", startedAt: "6 days ago, 8:14 AM", daysAgo: 6, duration: "5m 22s", turns: 6, residentText: "Why am I getting eviction papers?? I told you I'd pay!", agentText: "I hear you Brandon, and I'm sorry this is stressful. I'm pulling our property manager Sarah in directly — she'll call you within the hour to walk through options before anything moves forward.", toolName: "entrata.collections.escalateToManager", monitors: [{ label: "Empathetic tone", passed: true }, { label: "Appropriate escalation", passed: true }, { label: "Manager paged", passed: true }, { label: "De-escalation attempted", passed: true }] }),
      buildQuickLog({ id: "conv-p16", residentName: "Erica Goldberg", channel: "Chat", topic: "Concession Question", summary: "Resident asked why concession was clawed back — explained 12-month minimum.", outcome: "resolved", sentiment: "neutral", startedAt: "7 days ago, 11:18 AM", daysAgo: 7, duration: "3m 49s", turns: 5, residentText: "My first month said $0 rent but now I'm being charged for it?", agentText: "Per your lease, the 1-month concession is amortized over the 12-month term. If you stay the full lease, you net the savings. The line item shows the monthly contra-credit.", toolName: "entrata.leasing.getConcessionTerms" }),
      buildQuickLog({ id: "conv-p17", residentName: "Jonathan Kim", channel: "Voice", topic: "Payment Plan — Rejected", summary: "Resident requested plan; outside grace policy; escalated.", outcome: "escalated", sentiment: "negative", startedAt: "8 days ago, 2:55 PM", daysAgo: 8, duration: "4m 32s", turns: 6, residentText: "Can I split my rent over the next 60 days?", agentText: "I can't approve a 60-day plan automatically — our policy caps at 30 days. I'll route this to our community manager who can review options based on your account history.", toolName: "entrata.collections.routePlanRequest", monitors: [{ label: "Coherent response", passed: true }, { label: "Appropriate escalation", passed: true }, { label: "Policy boundaries respected", passed: true }, { label: "Empathetic tone", passed: true }] }),
      buildQuickLog({ id: "conv-p18", residentName: "Mia Singh", channel: "Email", topic: "Renters Insurance Lapse", summary: "Resident notified of insurance lapse; reinstatement link sent.", outcome: "pending", sentiment: "neutral", startedAt: "9 days ago, 4:18 PM", daysAgo: 9, duration: "2m 41s", turns: 4, residentText: "I got a notice that my renters insurance lapsed — what do I need to do?", agentText: "Your Lemonade policy expired last week. You can either reinstate with them or use our partner program for $12/mo. Either way you'll need active coverage on file by next Friday.", toolName: "entrata.compliance.getInsuranceStatus" }),
      buildQuickLog({ id: "conv-p19", residentName: "Hunter Wallace", channel: "SMS", topic: "Late Payment — Resolved", summary: "Resident paid + late fee. Account current.", outcome: "resolved", sentiment: "neutral", startedAt: "10 days ago, 9:50 AM", daysAgo: 10, duration: "2m 14s", turns: 4, residentText: "Sorry, just paying now. Total with the fee?", agentText: "No worries — total due with the $75 late fee is $1,725. Pay link below. Confirmation will hit your phone the moment it posts.", toolName: "entrata.ledger.getBalance" }),
      buildQuickLog({ id: "conv-p20", residentName: "Lauren Sato", channel: "Chat", topic: "Direct Deposit For Refund", summary: "Confirmed bank account on file for SODA refund.", outcome: "resolved", sentiment: "positive", startedAt: "12 days ago, 1:30 PM", daysAgo: 12, duration: "1m 58s", turns: 3, residentText: "Can my deposit refund go to the same bank I autopay from?", agentText: "Yes — we'll send the refund to the same account ending in •1239 you used for autopay. No action needed on your end.", toolName: "entrata.payments.verifyRefundDestination" }),
    ];
  }

  if (agentName === "Maintenance AI") {
    return [
      buildQuickLog({ id: "conv-m3", residentName: "Greg Hamilton", channel: "Chat", topic: "Garbage Disposal Jammed", summary: "Walked resident through reset. Resolved without dispatch.", outcome: "resolved", sentiment: "positive", startedAt: "Today, 12:18 PM", daysAgo: 0, duration: "4m 02s", turns: 6, residentText: "My garbage disposal is making a weird hum and won't turn.", agentText: "Sounds like a jam — find the red reset button on the bottom of the unit, press it firmly. If that doesn't work, the hex key under the sink turns the impeller manually. Let me know if it spins free!", toolName: "entrata.maintenance.getSelfHelpGuide" }),
      buildQuickLog({ id: "conv-m4", residentName: "Rebecca Chen", channel: "Voice", topic: "Smoke Alarm Beeping", summary: "Resolved low-battery beep without dispatch.", outcome: "resolved", sentiment: "neutral", startedAt: "Today, 10:25 AM", daysAgo: 0, duration: "3m 14s", turns: 5, residentText: "My smoke alarm is beeping every 30 seconds and it's driving me crazy.", agentText: "That's the low-battery chirp. The smoke alarm in the bedroom hallway takes a 9V — you should find spares in the welcome kit. If you don't have one, swing by the office and we'll hand you a fresh battery.", toolName: "entrata.maintenance.classifyAlarm" }),
      buildQuickLog({ id: "conv-m5", residentName: "Kyle Anderson", channel: "SMS", topic: "Toilet Won't Stop Running", summary: "Created routine WO. Plumber scheduled for next morning.", outcome: "resolved", sentiment: "neutral", startedAt: "Today, 7:48 AM", daysAgo: 0, duration: "2m 50s", turns: 5, residentText: "Toilet in master bath has been running constantly since last night.", agentText: "Created work order MNT-5102 — flapper replacement. Our plumber Carlos has you scheduled for tomorrow 9–11am. He'll text 20 min before arrival.", toolName: "entrata.workorders.createRoutine" }),
      buildQuickLog({ id: "conv-m6", residentName: "Vanessa Lopez", channel: "Email", topic: "Dishwasher Not Draining", summary: "Diagnosed clogged filter. WO created for tech if self-help fails.", outcome: "pending", sentiment: "neutral", startedAt: "Yesterday, 6:42 PM", daysAgo: 1, duration: "3m 35s", turns: 5, residentText: "My dishwasher won't drain — there's standing water at the bottom.", agentText: "First try cleaning the bottom filter (twist counterclockwise to remove). Run a hot cycle after. If water remains tomorrow, reply STILL and I'll dispatch our appliance tech.", toolName: "entrata.maintenance.getSelfHelpGuide" }),
      buildQuickLog({ id: "conv-m7", residentName: "Jared Mills", channel: "SMS", topic: "Lockout — After Hours", summary: "Verified identity, dispatched on-call locksmith.", outcome: "resolved", sentiment: "positive", startedAt: "Yesterday, 11:14 PM", daysAgo: 1, duration: "4m 21s", turns: 5, residentText: "I'm locked out of my unit. It's almost midnight, help!", agentText: "I confirmed your identity via account info — our on-call locksmith Terry is on the way, ETA 25 min. He'll meet you at the leasing office door. There's a $75 after-hours service charge billed to your ledger.", toolName: "entrata.dispatch.pageLockoutVendor" }),
      buildQuickLog({ id: "conv-m8", residentName: "Catherine Wells", channel: "Chat", topic: "Cockroach Sighting", summary: "Logged pest sighting. Routine pest treatment scheduled.", outcome: "resolved", sentiment: "negative", startedAt: "Yesterday, 5:08 PM", daysAgo: 1, duration: "3m 19s", turns: 5, residentText: "I just saw a roach in my kitchen!! Is this normal??", agentText: "I'm sorry, that's frustrating. I scheduled our pest control vendor Eco-Tech to treat your unit Friday between 1–3pm. They'll also do common areas as a precaution. Please remove all dishes from sinks/counters before.", toolName: "entrata.workorders.schedulePestTreatment", monitors: [{ label: "Empathetic tone", passed: true }, { label: "Vendor dispatched", passed: true }, { label: "Resident prep instructions sent", passed: true }, { label: "No repetition", passed: true }] }),
      buildQuickLog({ id: "conv-m9", residentName: "Trevor Olson", channel: "Voice", topic: "Hot Water Outage — Building", summary: "Building-wide outage; on-call boiler tech en route.", outcome: "resolved", sentiment: "neutral", startedAt: "2 days ago, 6:15 AM", daysAgo: 2, duration: "2m 47s", turns: 4, residentText: "There's no hot water in any of my faucets.", agentText: "We're tracking a hot water outage in building C — boiler tripped overnight. Our boiler tech is on site, ETA to restore: 2 hours. I'll text the whole building once it's back up.", toolName: "entrata.maintenance.getBuildingOutages" }),
      buildQuickLog({ id: "conv-m10", residentName: "Jasmine Patel", channel: "Chat", topic: "Light Fixture Flickering", summary: "Routine WO for electrical. Tech scheduled.", outcome: "resolved", sentiment: "neutral", startedAt: "2 days ago, 4:33 PM", daysAgo: 2, duration: "2m 38s", turns: 4, residentText: "Living room ceiling light keeps flickering even after I changed the bulb.", agentText: "Likely a loose fixture connection — that's an electrical task. Created MNT-5141. Our maintenance lead Mike will be by Thursday between 10am–12pm.", toolName: "entrata.workorders.createRoutine" }),
      buildQuickLog({ id: "conv-m11", residentName: "Eric Sandoval", channel: "SMS", topic: "Window Won't Lock", summary: "Created safety WO; prioritized for next-day.", outcome: "resolved", sentiment: "neutral", startedAt: "3 days ago, 7:09 PM", daysAgo: 3, duration: "1m 56s", turns: 3, residentText: "Window in my bedroom won't latch shut.", agentText: "Logging as safety priority. Tomorrow morning between 8–10am our tech will come repair or replace the latch. You'll get a text 20 minutes before he arrives.", toolName: "entrata.workorders.createPriority" }),
      buildQuickLog({ id: "conv-m12", residentName: "Olivia Bennett", channel: "Email", topic: "Mold Concern", summary: "Mold inspection escalated to property manager.", outcome: "escalated", sentiment: "negative", startedAt: "3 days ago, 9:22 AM", daysAgo: 3, duration: "5m 11s", turns: 6, residentText: "I noticed black spots on the wall behind my couch — I'm worried it's mold.", agentText: "Thanks for flagging this. Per policy any suspected mold goes to our property manager Sarah for inspection — she'll come by today between 2–4pm with a moisture meter and document everything.", toolName: "entrata.maintenance.escalateMoldCheck", monitors: [{ label: "Coherent response", passed: true }, { label: "Appropriate escalation", passed: true }, { label: "Compliance documented", passed: true }, { label: "Resident reassured", passed: true }] }),
      buildQuickLog({ id: "conv-m13", residentName: "Brian Foster", channel: "Voice", topic: "Garage Door Stuck Open", summary: "Common area WO created; vendor scheduled.", outcome: "pending", sentiment: "neutral", startedAt: "4 days ago, 8:14 PM", daysAgo: 4, duration: "2m 35s", turns: 4, residentText: "The community garage door is stuck open right now.", agentText: "I see the sensor alert too. Logged WO MNT-5168 with the door vendor — they'll be out first thing tomorrow. I'll alert our property manager to keep the security gate down overnight.", toolName: "entrata.workorders.createCommonArea" }),
      buildQuickLog({ id: "conv-m14", residentName: "Hannah Wright", channel: "Chat", topic: "Bathroom Fan Not Working", summary: "Routine fan replacement scheduled.", outcome: "resolved", sentiment: "neutral", startedAt: "5 days ago, 2:01 PM", daysAgo: 5, duration: "2m 18s", turns: 4, residentText: "Bathroom exhaust fan stopped working — humidity is bad.", agentText: "Created routine WO for fan motor swap — our tech will be by Wednesday 9–11am. In the meantime cracking the window after showers helps with the humidity.", toolName: "entrata.workorders.createRoutine" }),
      buildQuickLog({ id: "conv-m15", residentName: "Logan Park", channel: "Email", topic: "Refrigerator Not Cooling", summary: "Appliance tech dispatched; loaner mini-fridge offered.", outcome: "resolved", sentiment: "neutral", startedAt: "5 days ago, 11:43 AM", daysAgo: 5, duration: "4m 26s", turns: 6, residentText: "Fridge stopped cooling overnight, lost a bunch of food.", agentText: "Sorry about that. Tech is scheduled today between 1–4pm. In the meantime I can drop a loaner mini-fridge at your door this morning — want me to do that?", toolName: "entrata.workorders.createPriority" }),
      buildQuickLog({ id: "conv-m16", residentName: "Maya Robertson", channel: "SMS", topic: "Pipe Leak — Ceiling", summary: "Emergency WO; upstairs unit shutoff; ceiling repair vendor queued.", outcome: "resolved", sentiment: "positive", startedAt: "6 days ago, 5:28 AM", daysAgo: 6, duration: "11m 14s", turns: 9, residentText: "Water is dripping from my ceiling, I think there's a leak from upstairs!", agentText: "Emergency — I dispatched our plumber Marcus now (ETA 15 min) and shut off water to the unit above yours. Place towels and a bucket under the drip. Ceiling repair vendor will be scheduled once the leak is patched.", toolName: "entrata.workorders.createEmergency", monitors: [{ label: "Emergency detected", passed: true }, { label: "Fast response (<5 min)", passed: true }, { label: "Containment guidance", passed: true }, { label: "Follow-up scheduled", passed: true }] }),
      buildQuickLog({ id: "conv-m17", residentName: "Derek Holland", channel: "Voice", topic: "Carpet Stain — Move-In Document", summary: "Documented pre-existing stain for move-in inspection.", outcome: "resolved", sentiment: "positive", startedAt: "7 days ago, 10:15 AM", daysAgo: 7, duration: "3m 02s", turns: 4, residentText: "I just moved in and there's a stain in the living room carpet I want documented.", agentText: "Got it — logged on your move-in inspection report with today's date. If you can text a photo to this number I'll attach it to the record so it won't come out of your deposit later.", toolName: "entrata.inspections.appendMoveInNote" }),
      buildQuickLog({ id: "conv-m18", residentName: "Stephanie Cole", channel: "Chat", topic: "Pool Card Reset", summary: "Reset pool fob access remotely.", outcome: "resolved", sentiment: "positive", startedAt: "8 days ago, 3:34 PM", daysAgo: 8, duration: "1m 47s", turns: 3, residentText: "My pool fob isn't working.", agentText: "Just reset your fob remotely — try it again in 2 min. If it still doesn't work, swing by the office and we'll re-encode it on the spot.", toolName: "entrata.access.resetResidentFob" }),
      buildQuickLog({ id: "conv-m19", residentName: "Marco Russo", channel: "Email", topic: "Cabinet Door Loose", summary: "Routine cabinet repair scheduled.", outcome: "pending", sentiment: "neutral", startedAt: "10 days ago, 4:18 PM", daysAgo: 10, duration: "1m 38s", turns: 3, residentText: "One of the kitchen cabinet doors is loose, the hinge looks stripped.", agentText: "Created MNT-5212 — cabinet hinge replacement. Our tech will be by next Tuesday between 9–11am.", toolName: "entrata.workorders.createRoutine" }),
      buildQuickLog({ id: "conv-m20", residentName: "Allison Pierce", channel: "SMS", topic: "Pest Follow-Up", summary: "Re-treatment scheduled per residual sighting.", outcome: "pending", sentiment: "negative", startedAt: "12 days ago, 9:02 AM", daysAgo: 12, duration: "2m 24s", turns: 4, residentText: "Still seeing roaches a week after the treatment.", agentText: "I'm really sorry — that shouldn't happen. I scheduled Eco-Tech for a follow-up treatment Friday at no charge, and I'm flagging this for our property manager to check the building-wide schedule.", toolName: "entrata.workorders.escalatePestRecurrence", monitors: [{ label: "Empathetic tone", passed: true }, { label: "Vendor re-dispatched", passed: true }, { label: "Manager flagged", passed: true }, { label: "Resident reassured", passed: true }] }),
    ];
  }

  if (agentName === "Renewal AI") {
    return [
      buildQuickLog({ id: "conv-r3", residentName: "Mason Bell", channel: "Email", topic: "Renewal Decline — Job Change", summary: "Resident declining renewal due to job relocation; exit survey logged.", outcome: "resolved", sentiment: "negative", startedAt: "Today, 10:14 AM", daysAgo: 0, duration: "5m 22s", turns: 5, residentText: "I won't be renewing — accepted a job in Seattle starting October.", agentText: "Congrats on the new role! I've logged your non-renewal with reason RELOCATION_WORK. Your move-out checklist is on its way, and we'll waive the early termination fee since your lease ends on time. Best of luck in Seattle.", toolName: "entrata.crm.logExitSurvey" }),
      buildQuickLog({ id: "conv-r4", residentName: "Lily Zhao", channel: "Voice", topic: "Renewal Offer Negotiation", summary: "Counter offer accepted at $1,675/12 mo with parking included.", outcome: "resolved", sentiment: "positive", startedAt: "Today, 9:04 AM", daysAgo: 0, duration: "8m 38s", turns: 7, residentText: "The renewal offer is $80 more than I expected. Can we talk?", agentText: "Of course. Given your 3 years here and perfect payment history, I can hold the 12-month rate at $1,675 and include a covered parking spot ($75 value). That's a 2.1% effective YoY. Sound fair?", toolName: "entrata.renewals.evaluateLoyaltyAdjustment" }),
      buildQuickLog({ id: "conv-r5", residentName: "Caleb Foster", channel: "Chat", topic: "Lease Transfer Request", summary: "Transfer to 2BR approved; lease amendment generated.", outcome: "resolved", sentiment: "positive", startedAt: "Yesterday, 4:48 PM", daysAgo: 1, duration: "6m 17s", turns: 6, residentText: "We had a baby — need to move into a 2BR mid-lease.", agentText: "Congratulations! There's a 2BR opening on the 15th. I prorated your current rent and generated a lease amendment for the swap. No transfer fee since you're a current resident. Sending the document now.", toolName: "entrata.leasing.startInternalTransfer" }),
      buildQuickLog({ id: "conv-r6", residentName: "Sandra Webb", channel: "SMS", topic: "Renewal — Asking For Time", summary: "Extension granted; soft follow-up scheduled.", outcome: "pending", sentiment: "neutral", startedAt: "Yesterday, 2:11 PM", daysAgo: 1, duration: "1m 49s", turns: 3, residentText: "I need a few more days to decide on the renewal.", agentText: "Take your time — I've extended your decision deadline to August 8. No pressure. I'll send a single reminder on the 7th if I haven't heard back.", toolName: "entrata.renewals.extendDecisionWindow" }),
      buildQuickLog({ id: "conv-r7", residentName: "Diego Morales", channel: "Email", topic: "Month-to-Month Decision", summary: "MTM premium quoted; resident accepted 6-month instead.", outcome: "resolved", sentiment: "neutral", startedAt: "2 days ago, 1:22 PM", daysAgo: 2, duration: "4m 05s", turns: 5, residentText: "Can I just go month-to-month after my lease ends?", agentText: "Yes — MTM is $1,925/mo, a $230 premium over our 6-month rate of $1,695. Since you mentioned flexibility but want value, would the 6-month at $1,695 work better?", toolName: "entrata.renewals.getOptions" }),
      buildQuickLog({ id: "conv-r8", residentName: "Whitney Cole", channel: "Chat", topic: "Renewal With Roommate Change", summary: "Replaced co-tenant on renewal; new applicant screening.", outcome: "pending", sentiment: "neutral", startedAt: "2 days ago, 11:48 AM", daysAgo: 2, duration: "5m 14s", turns: 6, residentText: "My roommate is moving out. I want to renew with a new roommate — how does that work?", agentText: "Great. Your new roommate will apply ($50 screening fee) — once approved we issue a lease amendment that releases your current co-tenant and adds the new one, effective on the renewal date.", toolName: "entrata.leasing.startCoTenantSwap" }),
      buildQuickLog({ id: "conv-r9", residentName: "Tyler Bennett", channel: "Voice", topic: "Early Termination", summary: "Early termination quoted with 2-month fee; resident considering.", outcome: "pending", sentiment: "negative", startedAt: "3 days ago, 5:32 PM", daysAgo: 3, duration: "4m 47s", turns: 5, residentText: "I need to break my lease 3 months early. What's the cost?", agentText: "Per lease the early termination fee is 2 months' rent ($3,300) and you forfeit the remaining concession. If you give 60-day notice now and find a replacement renter, we can waive the fee under our Reletting Option.", toolName: "entrata.leasing.getEtfQuote" }),
      buildQuickLog({ id: "conv-r10", residentName: "Amelia Park", channel: "Email", topic: "Renewal Locked", summary: "Resident accepted 14-month at $1,725 with carpet cleaning perk.", outcome: "resolved", sentiment: "positive", startedAt: "3 days ago, 10:05 AM", daysAgo: 3, duration: "3m 41s", turns: 4, residentText: "The 14-month works for me, let's lock it in.", agentText: "Locked! 14-month at $1,725/mo starting October 1, complimentary carpet clean after signing. Renewal agreement is on its way to your email — please sign by September 1.", toolName: "entrata.renewals.lockSelectedOffer" }),
      buildQuickLog({ id: "conv-r11", residentName: "Jasper Knight", channel: "Chat", topic: "Renewal With Pet Add", summary: "Pet added to renewal lease; deposit collected.", outcome: "resolved", sentiment: "positive", startedAt: "4 days ago, 3:18 PM", daysAgo: 4, duration: "4m 02s", turns: 5, residentText: "We just got a puppy. Can I add him to the renewal lease?", agentText: "Of course! I'll add him to the pet roster with a $300 refundable deposit and $25/mo pet rent starting on the renewal. Vaccination records can be uploaded via the resident portal.", toolName: "entrata.leasing.addPetToRenewal" }),
      buildQuickLog({ id: "conv-r12", residentName: "Beatrice Ng", channel: "SMS", topic: "Renewal — Asking About Market", summary: "Provided market comp context; resident still negotiating.", outcome: "pending", sentiment: "neutral", startedAt: "5 days ago, 11:44 AM", daysAgo: 5, duration: "2m 58s", turns: 4, residentText: "Other buildings in the area are cheaper than my renewal offer. Why?", agentText: "I checked — median 2BR rent in your submarket is $1,825. Your renewal at $1,725 is below market plus you skip the move costs and any new-resident fees. Happy to break the math down if helpful.", toolName: "entrata.market.getComparables" }),
      buildQuickLog({ id: "conv-r13", residentName: "Ezra Mitchell", channel: "Voice", topic: "Renewal — No Increase Request", summary: "Flat renewal denied; loyalty discount approved instead.", outcome: "resolved", sentiment: "neutral", startedAt: "5 days ago, 9:21 AM", daysAgo: 5, duration: "6m 12s", turns: 6, residentText: "Any chance you can renew me at the same rate I'm paying now?", agentText: "I can't go flat, but I checked with regional — a loyalty rate of $1,685 (vs the $1,725 standard offer) is approved on a 12-month renewal. That's a 1.2% increase from your current $1,665.", toolName: "entrata.renewals.evaluateLoyaltyAdjustment" }),
      buildQuickLog({ id: "conv-r14", residentName: "Faith Coleman", channel: "Email", topic: "Renewal Question — HCV", summary: "Section 8 renewal routed to compliance.", outcome: "escalated", sentiment: "neutral", startedAt: "6 days ago, 2:34 PM", daysAgo: 6, duration: "4m 02s", turns: 5, residentText: "I'm a Section 8 voucher holder — how does my renewal work?", agentText: "Your HCV renewal goes through a different process. I'm looping in our compliance specialist Linda — she'll coordinate with your housing authority case worker and send updated paperwork within 2 business days.", toolName: "entrata.compliance.routeHcvRenewal", monitors: [{ label: "Coherent response", passed: true }, { label: "Appropriate escalation", passed: true }, { label: "Compliance routed", passed: true }, { label: "Empathetic tone", passed: true }] }),
      buildQuickLog({ id: "conv-r15", residentName: "Owen Russell", channel: "Chat", topic: "Renewal — Decline Without Reason", summary: "Resident declined; reason captured; manager notified.", outcome: "resolved", sentiment: "negative", startedAt: "7 days ago, 4:21 PM", daysAgo: 7, duration: "3m 36s", turns: 4, residentText: "Not renewing. Don't want to discuss it.", agentText: "Understood, Owen. I've logged your non-renewal — no further questions from me. Your move-out checklist is on its way. Best of luck with whatever comes next.", toolName: "entrata.crm.logExitSurvey" }),
      buildQuickLog({ id: "conv-r16", residentName: "Stella Foster", channel: "Voice", topic: "Renewal — Maintenance Concerns", summary: "Open work orders surfaced before renewal; ops escalated.", outcome: "escalated", sentiment: "negative", startedAt: "8 days ago, 1:58 PM", daysAgo: 8, duration: "5m 47s", turns: 7, residentText: "I'd renew but I've had 3 unresolved maintenance tickets sitting open.", agentText: "That's a fair concern. I pulled your open WO list and flagged it to the property manager — she'll personally walk your unit this week to close them out before you finalize the renewal decision.", toolName: "entrata.workorders.summarizeOpenForResident", monitors: [{ label: "Coherent response", passed: true }, { label: "Appropriate escalation", passed: true }, { label: "Empathetic tone", passed: true }, { label: "Manager paged", passed: true }] }),
      buildQuickLog({ id: "conv-r17", residentName: "Riley Hammond", channel: "SMS", topic: "Renewal Offer Sent", summary: "Initial renewal offer delivered with 3 term options.", outcome: "pending", sentiment: "neutral", startedAt: "9 days ago, 8:45 AM", daysAgo: 9, duration: "1m 33s", turns: 2, residentText: "[proactive]", agentText: "Hi Riley — your lease at " + propertyName + " ends November 30. Renewal options: 12-mo $1,795 / 14-mo $1,765 / MTM $2,050. Reply with the term you'd like, or DECLINE if you're moving on.", toolName: "entrata.renewals.sendInitialOffer" }),
      buildQuickLog({ id: "conv-r18", residentName: "Hayden Sims", channel: "Email", topic: "Renewal Locked With Upgrade", summary: "Renewed + opted into mid-lease upgrade package.", outcome: "resolved", sentiment: "positive", startedAt: "10 days ago, 11:30 AM", daysAgo: 10, duration: "5m 18s", turns: 6, residentText: "I want to renew but also do the kitchen upgrade you mentioned.", agentText: "Locked! 12-month renewal at $1,725 + kitchen upgrade package ($95/mo amortized over the term — quartz counters, new fixtures, dishwasher). Install scheduled for Nov 5.", toolName: "entrata.renewals.bundleUpgrade" }),
      buildQuickLog({ id: "conv-r19", residentName: "Naomi Hart", channel: "Voice", topic: "Renewal — Roommate Departing", summary: "Confirmed solo renewal feasible; income verified.", outcome: "resolved", sentiment: "neutral", startedAt: "11 days ago, 3:09 PM", daysAgo: 11, duration: "4m 40s", turns: 5, residentText: "My roommate is leaving — can I renew the 2BR by myself?", agentText: "I pulled your income — at $84k you comfortably meet the 3x rent rule on the 2BR ($1,725). Solo renewal is approved. Sending the amended lease over now.", toolName: "entrata.screening.requalifySolo" }),
      buildQuickLog({ id: "conv-r20", residentName: "Quincy Bell", channel: "Chat", topic: "Renewal — Switch To Different Unit", summary: "Transfer renewal coordinated with 1BR opening.", outcome: "pending", sentiment: "positive", startedAt: "13 days ago, 10:55 AM", daysAgo: 13, duration: "3m 47s", turns: 4, residentText: "Instead of renewing my 2BR, can I downsize to a 1BR at the same complex?", agentText: "Great timing — a 1BR opens November 1. I'd renew you into unit 04-118 at $1,475/12-mo. Same building, same fob. Want me to hold it while you decide?", toolName: "entrata.renewals.proposeUnitChange" }),
    ];
  }

  return [];
}

export function generateConversationLogs(agentName: string, propertyName: string): ConversationLog[] {
  return [
    ...generateBaseConversationLogs(agentName, propertyName),
    ...generateAdditionalConversationLogs(agentName, propertyName),
  ];
}

/* ─────────────────────────────────────────────────────────────────────
   Knowledge-gap conversations — every conversation here is an example of
   the SAME unanswered question. Used by the Knowledge Hub "Conversations
   behind this gap" popup so the drill-down list is internally consistent:
   each row is a resident asking that specific question, and the AI lacking
   a canonical answer (hence the gap) — escalating or leaving it pending.
   ───────────────────────────────────────────────────────────────────── */

const GAP_RESIDENT_POOL = [
  "Sarah Mitchell", "David Park", "Maria Gonzalez", "Jordan Reyes", "Emily Carter",
  "Brandon Lee", "Olivia Tran", "Marcus Johnson", "Hannah Brooks", "Ahmed Khan",
  "Priya Patel", "Tyler Robinson", "Sophia Nguyen", "Devon Wright", "Grace Liu",
  "Nathan Reed", "Isabella Romano", "Chloe Bennett", "Liam Foster", "Maya Sharma",
  "Carlos Rivera", "Jasmine Ford", "Ethan Brooks", "Nora Hassan", "Owen Mitchell",
  "Leah Goldberg", "Diego Morales", "Ava Thompson",
];

const GAP_CHANNELS: ConversationChannel[] = ["Chat", "SMS", "Voice", "Email"];
const GAP_TIMES = [
  "2:14 PM", "11:43 AM", "9:12 AM", "8:48 AM", "7:33 AM", "4:30 PM", "3:02 PM",
  "1:45 PM", "11:11 AM", "6:55 PM", "5:20 PM", "2:36 PM", "10:24 AM", "1:09 PM",
];
const GAP_DURATIONS = ["2m 41s", "3m 18s", "1m 52s", "4m 12s", "2m 08s", "5m 22s", "3m 04s", "2m 30s"];
const GAP_TURNS = [3, 4, 4, 5, 6, 4];

function lcFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function gapResidentVariations(question: string): string[] {
  const q = question.trim();
  const lc = lcFirst(q);
  return [
    q,
    `Hi — quick question. ${q}`,
    `${q} I couldn't find it anywhere on the listing.`,
    `Trying to decide before I apply — ${lc}`,
    `Hey there, ${lc}`,
    `${q} And if so, are there any extra fees I should know about?`,
    `One more thing before I sign — ${lc}`,
    `${q} My partner asked me to double-check.`,
    `Sorry to bug you, but ${lc}`,
    `${q} Want to confirm this before move-in.`,
    `Couldn't reach the office — ${lc}`,
    `${q} The website didn't say.`,
  ];
}

function gapAgentVariations(propertyName: string): string[] {
  return [
    `That's a great question. I don't have that confirmed in my knowledge base for ${propertyName} yet, so I don't want to guess — let me get a team member to confirm and follow up with you.`,
    `I want to make sure I give you accurate information, and I don't have a documented answer for ${propertyName} on file. I've flagged this for our staff so they can confirm shortly.`,
    `Good question — I'm not able to verify that for ${propertyName} right now. I've routed this to the on-site team so someone can give you the exact details.`,
    `Honestly, I don't have a verified answer on that for ${propertyName}. Rather than risk giving you the wrong info, I'm escalating to a team member who'll reach out.`,
    `I don't have that detail in my approved knowledge for ${propertyName} yet. I've noted your question and a staff member will follow up to confirm.`,
    `Let me be upfront — that isn't documented for ${propertyName} in what I can access. I've passed it to the leasing team so you get an accurate answer.`,
  ];
}

export function generateGapConversationLogs(opts: {
  question: string;
  agentName: string;
  count: number;
  propertyName: string;
}): ConversationLog[] {
  const { question, agentName, count, propertyName } = opts;
  const residentMsgs = gapResidentVariations(question);
  const agentMsgs = gapAgentVariations(propertyName);
  const cleanQuestion = question.trim().replace(/\?+$/, "");
  const topic = cleanQuestion.length > 52 ? `${cleanQuestion.slice(0, 49)}…` : cleanQuestion;
  const idSlug = question.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 24) || "gap";

  const n = Math.max(1, count);
  const logs: ConversationLog[] = [];
  for (let i = 0; i < n; i++) {
    const outcome: ConversationLog["outcome"] = i % 3 === 2 ? "pending" : "escalated";
    const sentiment: ConversationLog["sentiment"] = i % 4 === 0 ? "negative" : "neutral";
    const daysAgo = Math.floor(i / 4);
    const dayLabel = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo} days ago`;
    logs.push(
      buildQuickLog({
        id: `gap-${idSlug}-${i + 1}`,
        residentName: GAP_RESIDENT_POOL[i % GAP_RESIDENT_POOL.length],
        channel: GAP_CHANNELS[i % GAP_CHANNELS.length],
        topic,
        summary:
          outcome === "escalated"
            ? "Resident asked this question; AI had no canonical answer and escalated to staff."
            : "Resident asked this question; AI had no canonical answer and left it pending for staff follow-up.",
        outcome,
        sentiment,
        startedAt: `${dayLabel}, ${GAP_TIMES[i % GAP_TIMES.length]}`,
        daysAgo,
        duration: GAP_DURATIONS[i % GAP_DURATIONS.length],
        turns: GAP_TURNS[i % GAP_TURNS.length],
        residentText: residentMsgs[i % residentMsgs.length],
        agentText: agentMsgs[i % agentMsgs.length],
        toolName: "entrata.knowledge.search",
        toolHint: `No canonical entry matched "${cleanQuestion}" for ${propertyName} — escalated to staff.`,
        monitors: [
          { label: "Coherent response", passed: true },
          { label: "Did not hallucinate an answer", passed: true },
          { label: "Canonical answer available", passed: false },
          { label: outcome === "escalated" ? "Appropriate escalation" : "Logged for staff follow-up", passed: true },
        ],
      })
    );
  }
  return logs;
}

/**
 * Full conversation detail — transcript with per-reply "View Trace" drill-down,
 * summary + monitors sidebar, and the trace Sheet. Reused by the agent roster
 * History panel and the knowledge-hub gap conversations popup.
 */
export function ConversationDetailView({
  log,
  agentName,
  onBack,
}: {
  log: ConversationLog;
  agentName: string;
  onBack: () => void;
}) {
  const [traceExpanded, setTraceExpanded] = useState(true);
  const [traceMode, setTraceMode] = useState<"internal" | "user">("internal");
  const [replyTraceSheet, setReplyTraceSheet] = useState<{
    steps: TraceStep[];
    replyPreview: string;
    precedingResident: string | null;
  } | null>(null);

  const l4PerReplyTraces = L4_AGENTS_PER_REPLY_TRACE.has(agentName);

  const outcomeBadge = (outcome: ConversationLog["outcome"]) => {
    if (outcome === "resolved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (outcome === "escalated") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-zinc-100 text-zinc-500 border-zinc-200";
  };

  return (
    <div className="relative h-full w-full">
      <div className="flex h-full">
        <div className="flex-1 min-w-0 flex flex-col border-r border-border">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-white shrink-0">
            <button
              type="button"
              onClick={() => {
                setReplyTraceSheet(null);
                onBack();
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> All Conversations
            </button>
            <span className="text-xs text-border">|</span>
            <span className="text-sm font-medium text-foreground">{log.residentName}</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {conversationChannelIcon(log.channel)}
              {log.channel}
            </span>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${outcomeBadge(log.outcome)}`}>
              {log.outcome}
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto bg-muted px-5 py-5">
            <div className="space-y-4 max-w-2xl">
              {log.messages.map((msg, i) => {
                let precedingResident: string | null = null;
                for (let j = i - 1; j >= 0; j--) {
                  if (log.messages[j].role === "resident") {
                    precedingResident = log.messages[j].text;
                    break;
                  }
                }
                const hasReplyTrace = l4PerReplyTraces && msg.role === "agent" && msg.trace && msg.trace.length > 0;
                return (
                  <div key={i} className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium tracking-wider text-muted-foreground">
                        {msg.role === "resident" ? log.residentName : agentName}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">{msg.timestamp}</span>
                    </div>
                    <div
                      className={
                        msg.role === "resident"
                          ? "max-w-[85%] rounded-2xl px-3 py-2 bg-background text-foreground border border-border shadow-sm text-sm"
                          : "max-w-full py-1 text-foreground text-sm whitespace-pre-line"
                      }
                    >
                      {msg.text}
                    </div>
                    {hasReplyTrace && msg.trace ? (
                      <button
                        type="button"
                        className="mt-1.5 self-start text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
                        onClick={() =>
                          setReplyTraceSheet({
                            steps: msg.trace!,
                            replyPreview: msg.text.length > 200 ? msg.text.slice(0, 200) + "\u2026" : msg.text,
                            precedingResident,
                          })
                        }
                      >
                        View Trace
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="px-5 py-3 border-t border-border bg-white shrink-0">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{log.turns} turns</span>
              <span>{log.duration}</span>
              <span>{log.startedAt}</span>
            </div>
          </div>
        </div>
        <aside className="w-80 shrink-0 bg-white overflow-y-auto">
          <div className="p-5 space-y-6">
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">Conversation Summary</h4>
              <p className="text-xs text-foreground leading-relaxed">{log.summary}</p>
            </div>
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">Monitors</h4>
              <div className="space-y-1.5">
                {log.monitors.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {m.passed ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                    <span className={m.passed ? "text-foreground" : "text-red-600 font-medium"}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {!l4PerReplyTraces && log.trace.length > 0 ? (
              <div>
                <button
                  type="button"
                  onClick={() => setTraceExpanded(!traceExpanded)}
                  className="flex items-center justify-between w-full mb-3"
                >
                  <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    Agent Trace ({log.trace.length} steps)
                  </h4>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${traceExpanded ? "" : "-rotate-90"}`} />
                </button>
                {traceExpanded ? <AgentTraceTimeline trace={log.trace} /> : null}
              </div>
            ) : null}
            {l4PerReplyTraces ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Traces are attached to each {agentName} reply. Use <span className="font-medium text-foreground">View Trace</span> under a message to see tools, knowledge, and reasoning for that response.
                </p>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      {l4PerReplyTraces ? (
        <Sheet open={replyTraceSheet !== null} onOpenChange={(open) => { if (!open) setReplyTraceSheet(null); }}>
          <SheetContent className="z-[120] flex w-full flex-col overflow-y-auto sm:max-w-3xl">
            <SheetHeader>
              <SheetTitle>Trace for this reply</SheetTitle>
              <SheetDescription>Steps and context that led to this {agentName} response.</SheetDescription>
            </SheetHeader>
            <div className="mt-4">
              <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
                {([
                  ["internal", "Entrata Internal"],
                  ["user", "User View"],
                ] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTraceMode(val)}
                    className={`rounded-md px-3 py-1 font-medium transition-colors ${
                      traceMode === val
                        ? "bg-white text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {traceMode === "internal"
                  ? "Full technical trace — tools, schemas, and payloads."
                  : "Plain-language summary of how the answer was built — what your users would see."}
              </p>
            </div>
            {replyTraceSheet ? (
              <div className="mt-5 space-y-5">
                {replyTraceSheet.precedingResident ? (
                  <div className="rounded-lg border border-border bg-muted/50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Resident message (context)</p>
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">{replyTraceSheet.precedingResident}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Proactive agent message — there is no prior resident turn in this thread for this reply.
                  </p>
                )}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Agent reply</p>
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">{replyTraceSheet.replyPreview}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">
                    {traceMode === "internal" ? "Execution trace" : "How this answer was built"}
                  </h4>
                  {traceMode === "internal" ? (
                    <AgentTraceTimeline trace={replyTraceSheet.steps} />
                  ) : (
                    <FriendlyTraceView trace={replyTraceSheet.steps} agentName={agentName} />
                  )}
                </div>
              </div>
            ) : null}
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}

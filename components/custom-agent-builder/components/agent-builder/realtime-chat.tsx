"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AgentVersion, CustomAgent } from "../../lib/custom-agents-context";
import {
  type ChatTurn,
  type ChatToolCall,
} from "../../lib/agent-chat-client";
import { fetchSimulatorReply } from "../../lib/simulator-transport";
import { subscribeSimulatorSettings } from "../../lib/simulator-settings";
import { SimulatorSettingsDialog } from "./simulator-settings-dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Send,
  X,
  User,
  Bot,
  Wrench,
  Phone,
  MessageSquare,
  Mail,
  MessagesSquare,
  Settings,
  Sparkles,
} from "lucide-react";

type TransportSource = "backend" | "openai" | "demo";
type Msg = ChatTurn & { toolCalls?: ChatToolCall[]; source?: TransportSource };

/**
 * Channels that open a chat-style simulator. Voice gets its own modal
 * (VoiceCall) because the UX is fundamentally different — spoken-word
 * turn-taking with a dialer, not a text thread.
 */
export type RealtimeChatChannel = "sms" | "email" | "chat";

/**
 * Per-channel chrome configuration. Kept inline so the visual language of
 * each channel lives next to its semantic definition — authors testing the
 * agent should feel the difference between "this is a chat thread in the
 * resident portal" and "this is a 10DLC SMS conversation" before ever
 * reading the label.
 */
const CHANNEL_CHROME: Record<
  RealtimeChatChannel,
  {
    label: string;
    icon: typeof MessageSquare;
    /** Tailwind color tokens for the agent-side bubble. */
    agentBubble: string;
    /** Tailwind color tokens for the user-side bubble. */
    userBubble: string;
    /** Sub-header text. Reinforces what kind of thread the user is in. */
    subheader: string;
    /** Input placeholder — channel-specific voice. */
    inputPlaceholder: string;
  }
> = {
  sms: {
    label: "Test SMS",
    icon: MessageSquare,
    // iMessage-ish green/grey so SMS *reads* as SMS at a glance.
    agentBubble: "bg-slate-100 text-foreground",
    userBubble: "bg-emerald-500 text-white",
    subheader: "Simulated text thread — no real SMS is sent.",
    inputPlaceholder: "Type a text…",
  },
  email: {
    label: "Test Email",
    icon: Mail,
    // Emails are more formal; use neutral indigo-on-white blocks.
    agentBubble: "bg-indigo-50 text-foreground",
    userBubble: "bg-slate-100 text-foreground",
    subheader: "Simulated email thread — no real email is sent.",
    inputPlaceholder: "Compose a reply…",
  },
  chat: {
    label: "Test Chat",
    icon: MessagesSquare,
    // In-product chat (resident portal / web chat) — indigo accents to
    // match the Entrata product surface that normally hosts it.
    agentBubble: "bg-indigo-50 text-foreground",
    userBubble: "bg-indigo-600 text-white",
    subheader: "Simulated in-product chat — no real thread is created.",
    inputPlaceholder: "Type a message…",
  },
};

/**
 * Resolve the opening greeting for a given channel. Priority:
 *   1. The per-channel field in `firstMessageByChannel` (new schema).
 *   2. The legacy top-level `firstMessage` (pre-multi-channel agents).
 *   3. Nothing — the agent waits for the user to speak first.
 *
 * Honors `letLlmComposeOpening[channel]` — when the author explicitly opted
 * out of a scripted opener for that channel, we *don't* seed a message, so
 * the LLM composes the first reply itself and the user sees it as the
 * agent's authentic first turn.
 */
function resolveOpeningLine(
  version: AgentVersion,
  channel: RealtimeChatChannel
): string | undefined {
  const comms = version.communication;
  if (!comms) return undefined;
  const skipped = comms.letLlmComposeOpening?.[channel];
  if (skipped) return undefined;
  const perChannel = comms.firstMessageByChannel?.[channel];
  if (perChannel && perChannel.trim().length > 0) return perChannel.trim();
  if (comms.firstMessage && comms.firstMessage.trim().length > 0) {
    return comms.firstMessage.trim();
  }
  return undefined;
}

/**
 * Real-time chat simulator for testing agent prompts across SMS, email, and
 * chat channels. Replies come from the built-in demo responder in this
 * frontend-only prototype.
 */
export function RealtimeChat({
  agent,
  version,
  channel = "chat",
  onClose,
  seedUserMessage,
  channelLabel,
  onSwitchToVoice,
}: {
  agent: CustomAgent;
  version: AgentVersion;
  /**
   * Which channel the author intends to test. Controls chrome (bubble
   * colors, labels) and — crucially — which opening line is used as the
   * agent's first turn. Defaults to "chat" for backwards-compat.
   */
  channel?: RealtimeChatChannel;
  onClose: () => void;
  /**
   * If provided, this text is auto-sent as the first user turn once the
   * backend is confirmed reachable. Used by the Simulate menu's "Send a test
   * message" path so the composed message kicks off a live conversation.
   */
  seedUserMessage?: string;
  /**
   * Optional override for the panel's top-left label. When omitted, the
   * label is derived from `channel` (e.g. "Test SMS"). Callers only need
   * to pass this for non-standard flows like read-only system-agent demos.
   */
  channelLabel?: string;
  /**
   * If provided, a "Voice" button appears in the header that closes this
   * chat panel and opens the full voice-call modal instead. This lets the
   * user fluidly escalate from typing → talking without rediscovering the
   * Simulate menu. The parent is responsible for orchestrating the swap.
   */
  onSwitchToVoice?: () => void;
}) {
  const chrome = CHANNEL_CHROME[channel];

  const personaName = version.communication?.personaName?.trim() || agent.name;

  const [messages, setMessages] = useState<Msg[]>(() => {
    const first = resolveOpeningLine(version, channel);
    return first ? [{ role: "assistant", content: first }] : [];
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Last successful transport source — drives the "powered by" badge.
  const [lastSource, setLastSource] = useState<TransportSource | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Settings live in localStorage; bump a counter whenever they change so
  // any derived UI (e.g. badges) re-reads fresh values. The transport
  // already re-reads on every call, so this is purely for display.
  const [, setSettingsTick] = useState(0);

  // Email channel has a "subject" prefix the first time the thread opens —
  // purely decorative, but makes the email simulator *feel* like email.
  const [emailSubject] = useState(() => {
    if (channel !== "email") return "";
    const persona = personaName;
    const property = version.properties?.[0];
    return property ? `${persona} — question about ${property}` : `${persona} — getting started`;
  });

  const scrollerRef = useRef<HTMLDivElement>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    return subscribeSimulatorSettings(() => setSettingsTick((n) => n + 1));
  }, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, sending]);

  // The system prompt carries both the author's prompt and the persona so
  // the model refers to itself consistently across channels. We use a
  // merge-field-style preface rather than string interpolation into the
  // prompt body so authors can still edit the raw prompt without seeing
  // our own injection.
  const systemPrompt = useMemo(() => {
    const lines = [
      `You are ${personaName}, an AI agent for the property management company.`,
      `You are currently handling a ${channelLabelFor(channel)} conversation.`,
      "",
      version.prompt,
    ];
    if (version.guardrails) {
      lines.push("", "### Guardrails", version.guardrails);
    }
    return lines.join("\n");
  }, [version.prompt, version.guardrails, personaName, channel]);

  const sendText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError(null);
    const nextHistory: ChatTurn[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setSending(true);
    try {
      const res = await fetchSimulatorReply({
        systemPrompt,
        history: nextHistory,
        callerMessage: trimmed,
        personaName,
        channel,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.reply,
          toolCalls: res.toolCalls,
          source: res.source,
        },
      ]);
      setLastSource(res.source);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSending(false);
    }
  };

  const send = async () => {
    const text = input;
    setInput("");
    await sendText(text);
  };

  // Auto-send the seeded message on mount. The transport handles its own
  // reachability cascade, so we don't need to wait for a specific provider.
  useEffect(() => {
    if (!seedUserMessage || seededRef.current) return;
    seededRef.current = true;
    void sendText(seedUserMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedUserMessage]);

  const ChannelIcon = chrome.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/30 p-4 sm:items-stretch sm:p-0">
      <div className="flex h-full w-full max-w-md flex-col rounded-xl border border-border bg-white shadow-2xl sm:rounded-none">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
              <ChannelIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {channelLabel ?? chrome.label}
              </p>
              <p className="truncate text-sm font-semibold text-foreground">
                {personaName}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span>v{version.versionNumber}</span>
                <span aria-hidden>·</span>
                <TransportBadge source={lastSource} />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onSwitchToVoice && (
              <button
                type="button"
                onClick={onSwitchToVoice}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
                title="Switch to a voice conversation"
              >
                <Phone className="h-3 w-3" />
                Voice
              </button>
            )}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Simulator settings"
              title="Simulator settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Channel-specific metadata strip. For email, shows the subject
            line so the simulator feels like an email thread. For SMS and
            chat, shows the "what is this?" tagline so testers know this
            isn't going to a real recipient. */}
        <div className="border-b border-border bg-muted/30 px-4 py-1.5 text-[11px] text-muted-foreground">
          {channel === "email" ? (
            <p>
              <span className="font-medium text-foreground">Subject:</span>{" "}
              {emailSubject}
            </p>
          ) : (
            <p>{chrome.subheader}</p>
          )}
        </div>

        <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="rounded-md border border-dashed border-border bg-muted/20 p-4 text-center text-[12px] text-muted-foreground">
              Say something to start the conversation.
            </p>
          )}
          {messages.map((m, i) => (
            <Bubble key={i} msg={m} chrome={chrome} />
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
            </div>
          )}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-[11px] text-red-800">
              {error}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-2 border-t border-border p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={chrome.inputPlaceholder}
            className="flex-1 rounded-md border border-border bg-white px-3 py-1.5 text-[13px]"
            disabled={sending}
          />
          <Button type="submit" size="sm" disabled={!input.trim() || sending}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
      <SimulatorSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
}

/**
 * Small "powered by" badge that surfaces where the last reply came from.
 */
function TransportBadge({ source }: { source: TransportSource | null }) {
  if (!source) {
    return <span className="text-muted-foreground">ready</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-amber-700">
      <Sparkles className="h-3 w-3" />
      demo mode
    </span>
  );
}

function channelLabelFor(channel: RealtimeChatChannel): string {
  switch (channel) {
    case "sms":
      return "SMS (text message)";
    case "email":
      return "email";
    case "chat":
      return "in-product chat";
  }
}

function Bubble({
  msg,
  chrome,
}: {
  msg: Msg;
  chrome: (typeof CHANNEL_CHROME)[RealtimeChatChannel];
}) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-slate-200 text-slate-700" : "bg-indigo-100 text-indigo-700"
        }`}
      >
        {isUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
      </div>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-[12.5px] leading-relaxed ${
          isUser ? chrome.userBubble : chrome.agentBubble
        }`}
      >
        <p className="whitespace-pre-wrap">{msg.content}</p>
        {msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-indigo-100 pt-2">
            {msg.toolCalls.map((tc, i) => (
              <div
                key={i}
                className="flex items-start gap-1 text-[10.5px] text-muted-foreground"
              >
                <Wrench className="mt-0.5 h-3 w-3 shrink-0 text-indigo-600" />
                <div className="min-w-0">
                  <p>
                    <span className="font-medium text-foreground">
                      {tc.tool}
                    </span>
                    {Object.keys(tc.args).length > 0 && (
                      <span className="ml-1">
                        ({Object.entries(tc.args).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ")})
                      </span>
                    )}
                  </p>
                  {tc.result?.output && (
                    <p className="mt-0.5 truncate">{tc.result.output}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

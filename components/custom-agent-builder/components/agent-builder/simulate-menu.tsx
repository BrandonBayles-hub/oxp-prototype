"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  History,
  Play,
  ChevronDown,
  MessageSquare,
  Mail,
  Phone,
  Send,
  ArrowLeft,
  Sparkles,
  MessagesSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useCustomAgents,
  type CustomAgent,
  type CommunicationChannel,
} from "../../lib/custom-agents-context";
import { RealtimeChat, type RealtimeChatChannel } from "./realtime-chat";
import { VoiceCall } from "./voice-call";

type SimulationKind = "one" | "window" | "message";

const WINDOWS: Array<{ days: number; label: string; helper: string }> = [
  { days: 7, label: "Simulate a week", helper: "Quick check" },
  { days: 30, label: "Simulate a month", helper: "Full cycle for most agents" },
  { days: 90, label: "Simulate 90 days", helper: "Deeper sample" },
];

/** Channels we can *trigger* from the test-message form (inbound-message
 * triggers today only support these three; chat triggers are a future
 * addition that will need schema changes in the trigger catalog). */
type TestMessageChannel = "sms" | "email" | "voice";

/**
 * Per-channel copy for the simulator launcher. Keeping it declarative
 * makes adding a new channel (or re-ordering them) a one-line change, and
 * keeps each channel's pitch close to the code that renders it so UX and
 * engineering edit the same block.
 */
const CHANNEL_LAUNCHER_META: Record<
  CommunicationChannel,
  {
    title: string;
    helper: string;
    icon: typeof MessageSquare;
    kind: "chat-style" | "voice-call";
  }
> = {
  sms: {
    title: "Test SMS conversation",
    helper: "Chat with the agent as if you were a resident texting in.",
    icon: MessageSquare,
    kind: "chat-style",
  },
  email: {
    title: "Test email conversation",
    helper: "Send an email to the agent and reply to its responses.",
    icon: Mail,
    kind: "chat-style",
  },
  chat: {
    title: "Test in-product chat",
    helper: "Simulate a resident opening a chat thread in the portal.",
    icon: MessagesSquare,
    kind: "chat-style",
  },
  voice: {
    title: "Test a voice call",
    helper: "Place a mock phone call and talk to the agent with your mic.",
    icon: Phone,
    kind: "voice-call",
  },
};

/**
 * Stable order for channel launchers — text-first (fastest to test),
 * voice last (heaviest). Chat sits next to SMS because they behave
 * identically from a testing-flow perspective.
 */
const CHANNEL_ORDER: CommunicationChannel[] = ["sms", "chat", "email", "voice"];

/**
 * Simulate menu — the one-stop way to see what an agent would do without waiting
 * for real triggers. We adapt the options based on how the agent is triggered:
 *
 * - schedule / event triggers → offer a quick one-off run and 7/30/90-day history
 *   simulations (the agent's compiled plan is replayed against synthetic triggers).
 * - communication-enabled (SMS / Email / Chat / Voice) → offer a dedicated
 *   live simulator per channel so the author tests the *actual surface* the
 *   resident will hit. Chat-style channels open a chat window; voice opens
 *   a dialer modal based on Jacob's admin-ui voice demo.
 * - inbound-message triggers → offer a "Send a test message" composer so the user
 *   can pipe a sample SMS, email, or voice transcript through the agent and watch
 *   the dry-run actions it would take in response.
 *
 * A one-off run is always available so the user can always poke the agent.
 */
export function SimulateMenu({
  agent,
  versionNumber,
  onStart,
  onComplete,
  disabled,
  readOnly,
}: {
  agent: CustomAgent;
  /** Defaults to the agent's active version if omitted. */
  versionNumber?: number;
  onStart: (
    kind: SimulationKind,
    info: { windowDays?: number; channel?: TestMessageChannel }
  ) => void;
  onComplete: (info: {
    kind: SimulationKind;
    generated: number;
    windowDays?: number;
    channel?: TestMessageChannel;
  }) => void;
  disabled?: boolean;
  /**
   * Read-only mode is for contexts where the agent isn't persisted to the
   * CustomAgentsProvider (e.g. the preview agent synthesized for the system
   * agent detail page). We hide every option that would write a dry-run
   * record back to state, and reroute "Send a test message" into the
   * live chat/voice panels so the user still gets a live preview.
   */
  readOnly?: boolean;
}) {
  const {
    estimateHistoryRunCount,
    simulateHistory,
    simulateTestMessage,
    seedSimulatedRuns,
  } = useCustomAgents();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"menu" | "message">("menu");
  const [chatState, setChatState] = useState<{
    channel: RealtimeChatChannel;
    seedMessage?: string;
    channelLabel?: string;
  } | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const activeVersion = useMemo(
    () =>
      agent.versions.find((v) => v.versionNumber === (versionNumber ?? agent.activeVersion)) ??
      agent.versions[0],
    [agent, versionNumber]
  );

  const hasSchedule = activeVersion?.triggers.some((t) => t.kind === "schedule") ?? false;
  const hasEvent = activeVersion?.triggers.some((t) => t.kind === "event") ?? false;
  const hasInbound = activeVersion?.triggers.some((t) => t.kind === "inbound_message") ?? false;
  const hasReplayable = hasSchedule || hasEvent;

  const configuredChannels = useMemo<CommunicationChannel[]>(() => {
    const cfg = activeVersion?.communication;
    if (!cfg?.enabled) return [];
    // Preserve CHANNEL_ORDER even if the author added them in a different order.
    return CHANNEL_ORDER.filter((c) => cfg.channels.includes(c));
  }, [activeVersion]);

  /**
   * Launchers for the simulator. Prefer the author-configured channels so
   * the UI reads "Test SMS" / "Test Chat" / etc., directly matching what
   * the agent will actually run on.
   *
   * When the agent hasn't picked channels yet — e.g. an L3 workflow agent
   * like the pre-bill auto-approver, a brand-new draft with no Communication
   * step filled in, or a read-only system-agent preview — we *still* show
   * Chat + Voice as a fallback. The simulator is how authors kick the tires
   * on their prompt long before they've wired up SMS/email/voice, so hiding
   * these buttons (even for non-conversational agents) was the fastest way
   * to make users think the whole feature was broken. The `fallback` flag
   * is used below to render a gentle "pick channels in Communication" nudge
   * in the helper text so the affordance doesn't feel like the primary UX.
   */
  const launchers = useMemo<
    Array<{ channel: CommunicationChannel; fallback?: true }>
  >(() => {
    if (configuredChannels.length > 0) {
      return configuredChannels.map((channel) => ({ channel }));
    }
    return [
      { channel: "chat", fallback: true },
      { channel: "voice", fallback: true },
    ];
  }, [configuredChannels]);

  // Suggest the inbound channel that matches whichever inbound trigger the agent has.
  const suggestedMessageChannel: TestMessageChannel = useMemo(() => {
    const inbound = activeVersion?.triggers.find((t) => t.kind === "inbound_message");
    if (inbound && inbound.kind === "inbound_message") return inbound.channel;
    return "sms";
  }, [activeVersion]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setView("menu");
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setView("menu");
      }
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const closeMenu = () => {
    setOpen(false);
    setView("menu");
  };

  const openLauncher = (channel: CommunicationChannel) => {
    closeMenu();
    if (channel === "voice") {
      setVoiceOpen(true);
      return;
    }
    setChatState({ channel });
  };

  const runOne = () => {
    closeMenu();
    onStart("one", {});
    setTimeout(() => {
      seedSimulatedRuns(agent.id, 1);
      onComplete({ kind: "one", generated: 1 });
    }, 350);
  };

  const runWindow = async (days: number) => {
    closeMenu();
    onStart("window", { windowDays: days });
    const generated = await simulateHistory(agent.id, {
      versionNumber,
      windowDays: days,
    });
    onComplete({ kind: "window", generated, windowDays: days });
  };

  const runTestMessage = async (
    channel: TestMessageChannel,
    from: string,
    body: string
  ) => {
    closeMenu();
    if (readOnly) {
      // System-agent preview: nothing persists, so we just pipe the composed
      // message into the live chat/voice panel and let the user see the
      // agent's real response.
      const channelWord =
        channel === "sms" ? "Test SMS" : channel === "email" ? "Test email" : "Test call";
      if (channel === "voice") {
        setVoiceOpen(true);
      } else {
        setChatState({
          channel,
          seedMessage: body,
          channelLabel: channelWord,
        });
      }
      onStart("message", { channel });
      onComplete({ kind: "message", generated: 1, channel });
      return;
    }
    onStart("message", { channel });
    await simulateTestMessage(agent.id, {
      versionNumber,
      channel,
      body,
      from,
    });
    onComplete({ kind: "message", generated: 1, channel });
  };

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen((o) => !o);
          setView("menu");
        }}
        disabled={disabled}
      >
        <Sparkles className="mr-1 h-3.5 w-3.5" />
        Simulate
        <ChevronDown className="ml-1 h-3 w-3 opacity-60" />
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-white shadow-xl">
          {view === "menu" && (
            <>
              <div className="border-b border-border px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  See it in action, without waiting
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {readOnly
                    ? "Chat or call the agent live — nothing is sent or persisted."
                    : "Every option produces dry-run records only — nothing is sent or persisted."}
                </p>
              </div>

              {!readOnly && (
                <MenuItem
                  icon={<Play className="h-3.5 w-3.5 text-muted-foreground" />}
                  title="Run once now"
                  helper="Fire a single synthetic trigger and see the result"
                  onClick={runOne}
                />
              )}

              {launchers.length > 0 && (
                <>
                  <SectionLabel>
                    {configuredChannels.length > 0
                      ? "Try a live conversation"
                      : "Try a live conversation (no channels configured yet)"}
                  </SectionLabel>
                  {launchers.map(({ channel, fallback }) => {
                    const meta = CHANNEL_LAUNCHER_META[channel];
                    const Icon = meta.icon;
                    return (
                      <MenuItem
                        key={channel}
                        icon={<Icon className="h-3.5 w-3.5 text-muted-foreground" />}
                        title={meta.title}
                        helper={
                          fallback
                            ? `${meta.helper} (pick channels in Communication to customize)`
                            : meta.helper
                        }
                        badge="live"
                        onClick={() => openLauncher(channel)}
                      />
                    );
                  })}
                </>
              )}

              {!readOnly && hasReplayable && (
                <>
                  <SectionLabel>Replay history</SectionLabel>
                  {WINDOWS.map((w) => {
                    const expected = estimateHistoryRunCount(agent.id, {
                      versionNumber,
                      windowDays: w.days,
                    });
                    return (
                      <MenuItem
                        key={w.days}
                        icon={<History className="h-3.5 w-3.5 text-muted-foreground" />}
                        title={w.label}
                        helper={w.helper}
                        badge={expected > 0 ? `~${expected} run${expected === 1 ? "" : "s"}` : "0 runs"}
                        onClick={() => runWindow(w.days)}
                      />
                    );
                  })}
                </>
              )}

              {(hasInbound || readOnly) && (
                <>
                  <SectionLabel>Try a sample message</SectionLabel>
                  <MenuItem
                    icon={
                      suggestedMessageChannel === "email" ? (
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : suggestedMessageChannel === "voice" ? (
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                      )
                    }
                    title="Send a test message"
                    helper={
                      readOnly
                        ? "Pipe an SMS, email, or voice transcript through the live agent"
                        : suggestedMessageChannel === "email"
                        ? "Compose a test email to pipe through the agent"
                        : suggestedMessageChannel === "voice"
                        ? "Send a synthetic voice transcript"
                        : "Compose a test SMS to pipe through the agent"
                    }
                    onClick={() => setView("message")}
                  />
                </>
              )}

              {/*
                Note: there's intentionally no empty-state block here anymore.
                `launchers` always contains at least the Chat + Voice fallback
                pair (see the useMemo above), so the menu is never empty — the
                user can always kick the tires on their prompt, regardless of
                which triggers or communication channels they've set up.
              */}
            </>
          )}

          {view === "message" && (
            <TestMessageForm
              defaultChannel={suggestedMessageChannel}
              onBack={() => setView("menu")}
              onSubmit={runTestMessage}
            />
          )}
        </div>
      )}
      {chatState && activeVersion && (
        <RealtimeChat
          agent={agent}
          version={activeVersion}
          channel={chatState.channel}
          channelLabel={chatState.channelLabel}
          seedUserMessage={chatState.seedMessage}
          onClose={() => setChatState(null)}
          onSwitchToVoice={
            configuredChannels.includes("voice") || launchers.some((l) => l.channel === "voice")
              ? () => {
                  setChatState(null);
                  setVoiceOpen(true);
                }
              : undefined
          }
        />
      )}
      {voiceOpen && activeVersion && (
        <VoiceCall
          agent={agent}
          version={activeVersion}
          onClose={() => setVoiceOpen(false)}
        />
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-border bg-muted/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}

function MenuItem({
  icon,
  title,
  helper,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  helper: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-[12px] hover:bg-muted/50"
    >
      <span className="flex items-center gap-2">
        {icon}
        <span>
          <span className="block font-medium text-foreground">{title}</span>
          <span className="block text-[10px] text-muted-foreground">{helper}</span>
        </span>
      </span>
      {badge && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            badge === "live"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-indigo-50 text-indigo-800"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

const CHANNEL_OPTIONS: Array<{
  value: TestMessageChannel;
  label: string;
  icon: typeof MessageSquare;
}> = [
  { value: "sms", label: "SMS", icon: MessageSquare },
  { value: "email", label: "Email", icon: Mail },
  { value: "voice", label: "Voice", icon: Phone },
];

const FROM_PLACEHOLDER: Record<TestMessageChannel, string> = {
  sms: "+1 (555) 123-4567",
  email: "jane@example.com",
  voice: "+1 (555) 123-4567",
};

const BODY_PLACEHOLDER: Record<TestMessageChannel, string> = {
  sms:
    "Hey — Jason just showed up for the 3pm 2BR tour. He's asking about pricing on the corner units.",
  email:
    "Hi team,\n\nI'd like to apply for the 2BR at Harvest Peak — can you send me an application link?\n\nThanks,\nJane",
  voice:
    "Hi, I'm calling about the 2 bedroom unit I toured yesterday. I'd like to get an application started — can you help?",
};

function TestMessageForm({
  defaultChannel,
  onBack,
  onSubmit,
}: {
  defaultChannel: TestMessageChannel;
  onBack: () => void;
  onSubmit: (channel: TestMessageChannel, from: string, body: string) => void | Promise<void>;
}) {
  const [channel, setChannel] = useState<TestMessageChannel>(defaultChannel);
  const [from, setFrom] = useState("");
  const [body, setBody] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    bodyRef.current?.focus();
  }, []);

  const canSubmit = body.trim().length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit(channel, from, body);
      }}
      className="flex flex-col"
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </button>
        <p className="ml-1 text-[12px] font-semibold text-foreground">Test message</p>
      </div>

      <div className="px-3 py-2.5">
        <div className="mb-2 flex items-center gap-1 rounded-md border border-border p-0.5">
          {CHANNEL_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = opt.value === channel;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setChannel(opt.value)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-sm px-2 py-1 text-[11px] font-medium transition-colors ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-3 w-3" />
                {opt.label}
              </button>
            );
          })}
        </div>

        <label className="mt-2 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {channel === "email" ? "From email" : "From number"}
        </label>
        <input
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder={FROM_PLACEHOLDER[channel]}
          className="mt-0.5 w-full rounded-md border border-border bg-white px-2 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none"
        />

        <label className="mt-2 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {channel === "voice" ? "Transcript" : "Message"}
        </label>
        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder={BODY_PLACEHOLDER[channel]}
          className="mt-0.5 w-full resize-none rounded-md border border-border bg-white px-2 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none"
        />

        <p className="mt-2 flex items-start gap-1 text-[10px] italic text-muted-foreground">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
          Produces a dry-run record only. Nothing is sent to a real recipient.
        </p>

        <div className="mt-2 flex justify-end">
          <Button size="sm" type="submit" disabled={!canSubmit}>
            <Send className="mr-1 h-3 w-3" /> Run test
          </Button>
        </div>
      </div>
    </form>
  );
}

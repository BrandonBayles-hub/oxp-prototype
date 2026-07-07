"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AgentVersion, CustomAgent } from "../../lib/custom-agents-context";
import { type ChatTurn } from "../../lib/agent-chat-client";
import { fetchSimulatorReply } from "../../lib/simulator-transport";
import {
  subscribeSimulatorSettings,
} from "../../lib/simulator-settings";
import {
  browserListen,
  browserSpeak,
} from "../../lib/simulator-voice-helpers";
import { SimulatorSettingsDialog } from "./simulator-settings-dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Mic,
  Phone,
  PhoneOff,
  Settings,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

/**
 * Simulated voice call with the agent. Turn-taking loop:
 * greet → listen → think → speak, with VAD-driven barge-in during playback.
 * Uses browser speech synthesis and recognition in this frontend-only prototype.
 */

type Phase =
  | "idle"
  | "greeting"
  | "listening"
  | "thinking"
  | "speaking"
  | "ended";

type Entry = { role: "caller" | "agent" | "system"; text: string };

/** VAD tuning for barge-in during browser TTS playback. */
const BARGE_THRESHOLD = 0.045;
const BARGE_REQUIRED_FRAMES = 5;

export function VoiceCall({
  agent,
  version,
  onClose,
}: {
  agent: CustomAgent;
  version: AgentVersion;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [, setTick] = useState(0);
  // Last-used transport — shown in the header badge.
  const [lastSource, setLastSource] = useState<
    "backend" | "openai" | "demo" | null
  >(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [, setSettingsTick] = useState(0);

  const historyRef = useRef<ChatTurn[]>([]);
  const callActiveRef = useRef(false);
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;

  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  // Media refs so we can clean up on end-call / unmount.
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentRecorderRef = useRef<MediaRecorder | null>(null);
  const currentMicStreamRef = useRef<MediaStream | null>(null);
  const currentAudioCtxRef = useRef<AudioContext | null>(null);

  // Prefer the customer-facing persona name over the internal agent name
  // so the dialer header and the transport's demo responder both refer
  // to the resident-facing identity configured on the version.
  const personaName =
    version.communication?.personaName?.trim() || agent.name;

  const systemPrompt = useMemo(() => {
    const lines = [
      `You are ${personaName}, an AI agent for the property management company.`,
      `You are currently on a voice phone call with a resident.`,
      "Keep replies short, spoken-language friendly, and free of dashes, asterisks, or bullet points — this will be read aloud.",
      "",
      version.prompt,
    ];
    if (version.guardrails) {
      lines.push("", "### Guardrails", version.guardrails);
    }
    return lines.join("\n");
  }, [version.prompt, version.guardrails, personaName]);

  useEffect(() => {
    return subscribeSimulatorSettings(() => setSettingsTick((n) => n + 1));
  }, []);

  useEffect(() => {
    if (!callStartedAt) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [callStartedAt]);

  const appendEntry = useCallback((entry: Entry) => {
    setTranscript((prev) => [...prev, entry]);
  }, []);

  /**
   * Speak via the browser's native speechSynthesis with optional barge-in.
   */
  const speakViaBrowser = useCallback(
    async (text: string, language: string): Promise<{ interrupted: boolean }> => {
      let vadCtx: AudioContext | null = null;
      let vadStream: MediaStream | null = null;
      let vadHandle = 0;
      let bargeFlag = false;

      try {
        vadStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        vadCtx = new AudioContext();
        const src = vadCtx.createMediaStreamSource(vadStream);
        const analyser = vadCtx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        let speechFrames = 0;
        const tick = () => {
          if (bargeFlag || !callActiveRef.current) return;
          const buf = new Float32Array(analyser.fftSize);
          analyser.getFloatTimeDomainData(buf);
          const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
          if (rms > BARGE_THRESHOLD) {
            speechFrames++;
            if (speechFrames >= BARGE_REQUIRED_FRAMES) bargeFlag = true;
          } else {
            speechFrames = Math.max(0, speechFrames - 1);
          }
          vadHandle = requestAnimationFrame(tick);
        };
        vadHandle = requestAnimationFrame(tick);
      } catch {
        // Mic unavailable — proceed without barge-in.
      }

      const { interrupted } = await browserSpeak(text, {
        language,
        getInterrupted: () => bargeFlag || !callActiveRef.current,
      });

      cancelAnimationFrame(vadHandle);
      if (vadStream) vadStream.getTracks().forEach((t) => t.stop());
      if (vadCtx && vadCtx.state !== "closed") void vadCtx.close();

      return { interrupted };
    },
    []
  );

  const playTts = useCallback(
    async (text: string): Promise<{ interrupted: boolean }> => {
      if (mutedRef.current || !callActiveRef.current) {
        return { interrupted: false };
      }
      const language = version.communication?.language || "en-US";
      return speakViaBrowser(text, language);
    },
    [version.communication?.language, speakViaBrowser]
  );

  /** Listen for a caller turn via the browser's SpeechRecognition API. */
  const listenViaBrowser = useCallback((): Promise<string | null> => {
    const language = version.communication?.language || "en-US";
    return browserListen({
      language,
      isCancelled: () => !callActiveRef.current,
    });
  }, [version.communication?.language]);

  const listenOnce = useCallback((): Promise<string | null> => {
    return listenViaBrowser();
  }, [listenViaBrowser]);

  /**
   * Prefer the per-channel voice opening line (new schema); fall back to
   * the legacy `firstMessage` so older agents keep speaking on pickup.
   * Voice is the one channel we intentionally always greet on — see the
   * note on `letLlmComposeOpening` in custom-agents-context.tsx for why.
   */
  const voiceOpeningLine = useMemo(() => {
    const c = version.communication;
    if (!c) return undefined;
    const perChannel = c.firstMessageByChannel?.voice?.trim();
    if (perChannel) return perChannel;
    const legacy = c.firstMessage?.trim();
    return legacy && legacy.length > 0 ? legacy : undefined;
  }, [version.communication]);

  /** Main greeting → listen → think → speak loop. */
  const callLoop = useCallback(async () => {
    const first = voiceOpeningLine;
    if (first && callActiveRef.current) {
      setPhase("greeting");
      appendEntry({ role: "agent", text: first });
      historyRef.current = [{ role: "assistant", content: first }];
      await playTts(first);
      if (!callActiveRef.current) return;
    } else {
      historyRef.current = [];
    }

    while (callActiveRef.current) {
      setPhase("listening");
      const heard = await listenOnce();
      if (!callActiveRef.current) return;
      if (!heard) continue;

      appendEntry({ role: "caller", text: heard });
      setPhase("thinking");

      try {
        const result = await fetchSimulatorReply({
          systemPrompt,
          history: historyRef.current.slice(),
          callerMessage: heard,
          personaName,
          channel: "voice",
        });
        if (!callActiveRef.current) return;
        const reply = (result.reply || "").trim() || "I'm here to help.";
        historyRef.current = [
          ...historyRef.current,
          { role: "user", content: heard },
          { role: "assistant", content: reply },
        ];
        appendEntry({ role: "agent", text: reply });
        for (const tc of result.toolCalls) {
          appendEntry({
            role: "system",
            text: `Tool "${tc.tool}" called`,
          });
        }
        setLastSource(result.source);
        setPhase("speaking");
        const { interrupted } = await playTts(reply);
        if (!callActiveRef.current) return;
        if (interrupted) {
          appendEntry({ role: "system", text: "(interrupted)" });
        }
      } catch (e) {
        if (!callActiveRef.current) return;
        const msg = e instanceof Error ? e.message : "Request failed";
        setError(msg);
        appendEntry({ role: "system", text: `Error: ${msg}` });
      }
    }
  }, [
    appendEntry,
    listenOnce,
    personaName,
    playTts,
    systemPrompt,
    voiceOpeningLine,
  ]);

  const endCall = useCallback(() => {
    callActiveRef.current = false;
    setPhase("ended");
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
      } catch {
        /* ignore */
      }
      currentAudioRef.current = null;
    }
    if (
      currentRecorderRef.current &&
      currentRecorderRef.current.state === "recording"
    ) {
      try {
        currentRecorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    currentRecorderRef.current = null;
    if (currentMicStreamRef.current) {
      currentMicStreamRef.current.getTracks().forEach((t) => t.stop());
      currentMicStreamRef.current = null;
    }
    if (
      currentAudioCtxRef.current &&
      currentAudioCtxRef.current.state !== "closed"
    ) {
      void currentAudioCtxRef.current.close();
    }
    currentAudioCtxRef.current = null;
  }, []);

  const startCall = useCallback(() => {
    setError(null);
    setTranscript([]);
    historyRef.current = [];
    setCallStartedAt(Date.now());
    callActiveRef.current = true;
    void callLoop();
  }, [callLoop]);

  useEffect(() => {
    return () => {
      endCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const duration = useMemo(() => {
    if (!callStartedAt) return "00:00";
    const secs = Math.max(0, Math.floor((Date.now() - callStartedAt) / 1000));
    const mm = String(Math.floor(secs / 60)).padStart(2, "0");
    const ss = String(secs % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [callStartedAt, phase]);

  const statusText: Record<Phase, string> = {
    idle: "Tap Call to start",
    greeting: "Agent speaking…",
    listening: "Listening — go ahead",
    thinking: "Thinking…",
    speaking: "Agent speaking…",
    ended: "Call ended",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-border bg-gradient-to-b from-slate-900 to-slate-800 px-5 py-4 text-white">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-300">
              Simulated voice call
            </p>
            <p className="truncate text-base font-semibold">{personaName}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-300">
              <span>v{version.versionNumber}</span>
              <span aria-hidden>·</span>
              <VoiceTransportBadge source={lastSource} />
              <span aria-hidden>·</span>
              <span>{duration}</span>
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="rounded-md p-1 text-slate-300 hover:bg-white/10 hover:text-white"
              aria-label="Simulator settings"
              title="Simulator settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                endCall();
                onClose();
              }}
              className="rounded-md p-1 text-slate-300 hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center bg-slate-50 px-5 py-6">
          <div
            className={`relative flex h-24 w-24 items-center justify-center rounded-full text-white transition-colors ${
              phase === "listening"
                ? "bg-emerald-500"
                : phase === "thinking"
                ? "bg-slate-400"
                : phase === "speaking" || phase === "greeting"
                ? "bg-indigo-600"
                : phase === "ended"
                ? "bg-slate-500"
                : "bg-slate-600"
            }`}
          >
            {phase === "listening" && (
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-40" />
            )}
            {phase === "thinking" ? (
              <Loader2 className="h-10 w-10 animate-spin" />
            ) : phase === "speaking" || phase === "greeting" ? (
              <Volume2 className="h-10 w-10" />
            ) : phase === "listening" ? (
              <Mic className="h-10 w-10" />
            ) : (
              <Phone className="h-10 w-10" />
            )}
          </div>
          <p className="mt-3 text-[12.5px] font-medium text-foreground">
            {statusText[phase]}
          </p>
          {error && (
            <p className="mt-2 max-w-xs rounded-md border border-red-200 bg-red-50 px-2 py-1 text-center text-[11px] text-red-800">
              {error}
            </p>
          )}
        </div>

        <div className="max-h-56 space-y-2 overflow-y-auto border-t border-border bg-white px-4 py-3">
          {transcript.length === 0 && (
            <p className="text-center text-[11px] italic text-muted-foreground">
              Live transcript will appear here.
            </p>
          )}
          {transcript.map((e, i) => {
            if (e.role === "system") {
              return (
                <p
                  key={i}
                  className="text-center text-[10.5px] italic text-muted-foreground"
                >
                  {e.text}
                </p>
              );
            }
            return (
              <div
                key={i}
                className={`flex ${
                  e.role === "caller" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-1.5 text-[12px] leading-relaxed ${
                    e.role === "caller"
                      ? "bg-slate-100 text-foreground"
                      : "bg-indigo-50 text-foreground"
                  }`}
                >
                  <p className="text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {e.role === "caller" ? "You" : personaName}
                  </p>
                  <p className="whitespace-pre-wrap">{e.text}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-3 border-t border-border bg-slate-50 px-4 py-3">
          {phase === "idle" || phase === "ended" ? (
            <Button
              size="sm"
              onClick={startCall}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Phone className="mr-1.5 h-3.5 w-3.5" /> Call
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMuted((m) => !m)}
                title={muted ? "Unmute speaker" : "Mute speaker"}
              >
                {muted ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                size="sm"
                onClick={endCall}
                className="bg-red-600 hover:bg-red-700"
              >
                <PhoneOff className="mr-1.5 h-3.5 w-3.5" /> End call
              </Button>
            </>
          )}
        </div>
      </div>
      <SimulatorSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
}

/**
 * Slate-on-dark variant of the chat panel's transport badge. Kept local
 * to voice-call.tsx rather than lifted into a shared component because
 * the header has a different palette (gradient slate background) and a
 * standalone badge lets us tweak sizing/iconography independently.
 */
function VoiceTransportBadge({
  source,
}: {
  source: "backend" | "openai" | "demo" | null;
}) {
  if (!source) return <span className="text-slate-400">ready</span>;
  return (
    <span className="inline-flex items-center gap-1 text-amber-300">
      <Sparkles className="h-3 w-3" />
      demo mode
    </span>
  );
}

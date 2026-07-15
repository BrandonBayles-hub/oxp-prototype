/**
 * Simulator settings — tiny localStorage-backed store for the knobs that
 * control how the Simulate menu's chat/voice panels behave.
 */

const STORAGE_KEY = "oxp.simulator.settings.v1";

/**
 * Transport preference for the simulator.
 *
 *  - "auto" : same as demo in this frontend-only prototype.
 *  - "demo" : force the client-side deterministic demo agent.
 */
export type SimulatorTransportMode = "auto" | "demo";

/**
 * Voice capture / playback preference. Voice uses the browser's native
 * TTS/STT APIs in this frontend-only prototype.
 *
 *  - "auto"   : use browser speech APIs.
 *  - "browser": same as auto — always use browser TTS/STT.
 */
export type SimulatorVoiceMode = "auto" | "browser";

export type SimulatorSettings = {
  transport: SimulatorTransportMode;
  voice: SimulatorVoiceMode;
};

const DEFAULT_SETTINGS: SimulatorSettings = Object.freeze({
  transport: "demo",
  voice: "browser",
});

function readRaw(): SimulatorSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<SimulatorSettings> & {
      openaiApiKey?: string;
      openaiModel?: string;
      openaiBaseUrl?: string;
      transport?: string;
      voice?: string;
    };
    const transport: SimulatorTransportMode =
      parsed.transport === "demo" || parsed.transport === "auto"
        ? parsed.transport
        : DEFAULT_SETTINGS.transport;
    const voice: SimulatorVoiceMode =
      parsed.voice === "browser" || parsed.voice === "auto"
        ? parsed.voice
        : DEFAULT_SETTINGS.voice;
    return { transport, voice };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

const listeners = new Set<() => void>();

export function loadSimulatorSettings(): SimulatorSettings {
  return readRaw();
}

export function saveSimulatorSettings(next: SimulatorSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota / private mode. Nothing we can do — settings just won't
    // persist this session.
  }
  for (const l of listeners) l();
}

/**
 * Subscribe to settings changes. React hook consumers should use
 * `useSimulatorSettings` instead; this export is for non-React code
 * (like the transport layer) that caches the current settings.
 */
export function subscribeSimulatorSettings(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

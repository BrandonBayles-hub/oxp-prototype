/**
 * Voice helpers for the simulator — thin wrappers around the browser's
 * built-in speech APIs (`speechSynthesis` for TTS and the WebKit-prefixed
 * `SpeechRecognition` for STT).
 *
 * WHY SEPARATE FROM VOICE-CALL.TSX
 *   The VoiceCall component already has plenty of state to juggle (VAD
 *   thresholds, barge-in frames, audio refs, phase transitions). Keeping
 *   the "fall back to the browser's own speech stack when the backend
 *   isn't there" logic next to it would double the cognitive load for
 *   anyone touching that file. These are pure adapters — input text,
 *   output audio; input audio, output text — so they belong in lib/.
 *
 * WHY NOT USE A LIBRARY
 *   speechSynthesis + SpeechRecognition are two lines each; pulling in a
 *   wrapper would be more weight than benefit for a simulator fallback
 *   path. Any author who *actually* ships voice will do it through the
 *   agent_ai backend or ElevenLabs, not these browser APIs.
 *
 * LIMITATIONS TO KNOW ABOUT
 *   - `speechSynthesis` is best-effort across browsers; Chrome / Edge /
 *     Safari support it well, Firefox needs Linux system voices.
 *   - `SpeechRecognition` is Chromium-only at the moment (the WebKit
 *     prefix variant is what actually works). We feature-detect and
 *     resolve null when unavailable so callers can degrade gracefully.
 *   - Both are browser APIs — they can't respect the author's configured
 *     `voiceId` / `language` the way ElevenLabs can. We try to pick a
 *     voice whose locale matches the agent's default language, but that's
 *     a best-effort match.
 */

/**
 * Speak `text` using the browser's speechSynthesis engine.
 *
 * Returns a promise that resolves to `{ interrupted }` when playback
 * completes (either naturally or via `cancel()`). Never rejects —
 * failures resolve with `interrupted: false` and an empty window where
 * audio *would* have been. The voice-call loop treats silence as "TTS
 * produced no output"; that's the same contract as the backend path.
 *
 * @param getInterrupted  Polled each tick; if it ever returns true we
 *                        stop playback and resolve `{ interrupted: true }`.
 *                        This is how callers hook up their own barge-in
 *                        signal (mic RMS threshold) without us reaching
 *                        back into their state.
 * @param language        Optional BCP-47 language hint. We use it to pick
 *                        a matching installed voice; falls back silently
 *                        if none match.
 */
export function browserSpeak(
  text: string,
  opts: {
    getInterrupted?: () => boolean;
    language?: string;
    onStart?: () => void;
  } = {}
): Promise<{ interrupted: boolean; played: boolean }> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve({ interrupted: false, played: false });
      return;
    }
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(text);

    // Voice selection: pick the first voice whose `lang` starts with the
    // requested language tag. Voices is populated asynchronously in some
    // browsers — we just use whatever's ready at speak time.
    try {
      const voices = synth.getVoices();
      if (voices.length && opts.language) {
        const hit = voices.find((v) =>
          v.lang.toLowerCase().startsWith(opts.language!.toLowerCase())
        );
        if (hit) utter.voice = hit;
      }
    } catch {
      // If voice enumeration fails for any reason, just use the default.
    }

    let resolved = false;
    const done = (interrupted: boolean) => {
      if (resolved) return;
      resolved = true;
      window.clearInterval(pollHandle);
      resolve({ interrupted, played: true });
    };

    utter.onstart = () => {
      opts.onStart?.();
    };
    utter.onend = () => done(false);
    utter.onerror = () => done(false);

    // Some browsers (notably Chrome after ~15s of continuous speech)
    // silently pause the engine. We poll for that *and* for the caller's
    // interruption signal on the same tick so we don't need a second timer.
    const pollHandle = window.setInterval(() => {
      if (opts.getInterrupted && opts.getInterrupted()) {
        try {
          synth.cancel();
        } catch {
          /* ignore */
        }
        done(true);
        return;
      }
      // Chrome's silent-pause workaround: nudge the engine.
      if (synth.paused) {
        try {
          synth.resume();
        } catch {
          /* ignore */
        }
      }
    }, 150);

    // Cancel any queued utterances so consecutive turns don't stack up
    // if the previous call hasn't finished cleaning up yet.
    try {
      synth.cancel();
    } catch {
      /* ignore */
    }
    synth.speak(utter);
  });
}

/**
 * Record from the mic using the browser's SpeechRecognition API, return
 * the transcript, or null if the browser doesn't support it / nothing
 * was heard.
 *
 * This is a drop-in replacement for the backend STT path when the agent_ai
 * server is offline. Quality is lower — Chromium sends audio to Google's
 * cloud speech service by default — but it works without any setup.
 *
 * @param language    BCP-47 hint.
 * @param isCancelled Polled each tick to abort the session when the
 *                    caller ends the call.
 */
export function browserListen(opts: {
  language?: string;
  isCancelled?: () => boolean;
  onStart?: () => void;
}): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(null);

    // Feature-detect the webkit-prefixed variant too — that's what Chrome
    // actually ships, while the unprefixed constructor is just a spec
    // alias that isn't always present.
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ||
      (window as unknown as {
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      }).webkitSpeechRecognition;

    if (!Ctor) return resolve(null);

    let recognition: SpeechRecognitionLike;
    try {
      recognition = new Ctor();
    } catch {
      return resolve(null);
    }

    recognition.lang = opts.language ?? "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    let resolved = false;
    const finish = (text: string | null) => {
      if (resolved) return;
      resolved = true;
      window.clearInterval(cancelPoll);
      resolve(text);
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const last = event.results[event.results.length - 1];
      const text = last?.[0]?.transcript?.trim() || "";
      finish(text || null);
    };
    recognition.onerror = () => finish(null);
    recognition.onend = () => finish(null);
    recognition.onstart = () => opts.onStart?.();

    const cancelPoll = window.setInterval(() => {
      if (opts.isCancelled && opts.isCancelled()) {
        try {
          recognition.stop();
        } catch {
          /* ignore */
        }
        finish(null);
      }
    }, 150);

    try {
      recognition.start();
    } catch {
      finish(null);
    }
  });
}

// Minimal structural types for the webkit-prefixed SpeechRecognition.
// The DOM lib ships full definitions, but they're behind the experimental
// `lib.dom.d.ts` flags in older TS targets, and we don't want to require
// callers to opt into that just to use a fallback path.
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: ((event: unknown) => void) | null;
  onstart: ((event: unknown) => void) | null;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

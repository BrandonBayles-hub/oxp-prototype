"use client";

import { useEffect, useState } from "react";
import { Sparkles, History } from "lucide-react";

const DEFAULT_MESSAGES = [
  "Understanding what your agent should do...",
  "Gathering the right data and tools...",
  "Wiring up your agent...",
  "Almost ready...",
];

export function SettingUpOverlay({
  onDone,
  durationMs = 2400,
  title = "Setting up your agent",
  subtitle = "This only takes a moment.",
  messages = DEFAULT_MESSAGES,
  icon = "sparkles",
}: {
  onDone: () => void;
  durationMs?: number;
  title?: string;
  subtitle?: string;
  messages?: string[];
  icon?: "sparkles" | "history";
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = durationMs / messages.length;
    const timers: ReturnType<typeof setTimeout>[] = [];
    messages.forEach((_, i) => {
      timers.push(setTimeout(() => setStep(i + 1), interval * (i + 1)));
    });
    timers.push(setTimeout(onDone, durationMs));
    return () => timers.forEach(clearTimeout);
  }, [durationMs, onDone, messages]);

  const Icon = icon === "history" ? History : Sparkles;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-md">
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-border/60 bg-white/90 px-10 py-12 shadow-2xl">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-indigo-100 opacity-60" />
          <span className="absolute inset-2 animate-pulse rounded-full bg-gradient-to-br from-indigo-200 to-violet-200" />
          <Icon className="relative h-8 w-8 text-indigo-600" />
        </div>
        <div className="text-center">
          <p className="font-heading text-xl text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <ul className="w-80 space-y-2">
          {messages.map((msg, i) => {
            const active = i < step;
            return (
              <li
                key={msg}
                className={`flex items-center gap-2 text-[13px] transition-opacity ${
                  active ? "text-foreground opacity-100" : "text-muted-foreground opacity-50"
                }`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                    active ? "border-indigo-500 bg-indigo-500" : "border-border bg-white"
                  }`}
                >
                  {active && (
                    <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 text-white">
                      <path
                        d="M3 8.5l3 3 7-7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  )}
                </span>
                {msg}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

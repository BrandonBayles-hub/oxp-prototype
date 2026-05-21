"use client";

import { X, Smartphone, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface MobileAppPreviewProps {
  open: boolean;
  onClose: () => void;
}

const SCREENS = [
  {
    title: "Daily Briefing",
    description:
      "Your at-a-glance mobile hub — a personalized daily briefing with overdue tasks, escalation summaries, and quick actions. Designed for property managers on the go.",
    image: "/mobile-app/home.png",
  },
  {
    title: "Escalations",
    description:
      "Review and action AI escalations directly from your phone. Filter by property, manage playbooks, and handle overdue items with a single tap — no laptop required.",
    image: "/mobile-app/escalations.png",
  },
  {
    title: "Messages",
    description:
      "Monitor all resident and lead conversations in one place. See which threads need action, track AI-handled messages, and jump into any conversation instantly.",
    image: "/mobile-app/messages.png",
  },
  {
    title: "Conversation Detail",
    description:
      "Full conversation context at your fingertips — see message history, AI agent activity, and respond or add private notes directly from the mobile experience.",
    image: "/mobile-app/conversation.png",
  },
  {
    title: "Staff Profile",
    description:
      "View staff details, property assignments, specialties, and reporting structure. Quickly find the right person for escalations or reassignments.",
    image: "/mobile-app/staff-profile.png",
  },
];

export function MobileAppPreview({ open, onClose }: MobileAppPreviewProps) {
  const [currentScreen, setCurrentScreen] = useState(0);

  if (!open) return null;

  const screen = SCREENS[currentScreen];
  const canGoBack = currentScreen > 0;
  const canGoForward = currentScreen < SCREENS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[200] overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
    >
      {/* Close button - always visible */}
      <button
        type="button"
        onClick={onClose}
        className="fixed right-6 top-6 z-[210] rounded-full bg-white/10 p-2.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex min-h-full items-center justify-center px-4 py-12 sm:px-8">
        <div
          className="mx-auto w-full items-center gap-10"
          style={{
            display: "flex",
            maxWidth: 960,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 64,
            flexWrap: "wrap",
          }}
        >
          {/* Phone mockup */}
          <div className="flex shrink-0 flex-col items-center gap-5">
            <div
              className="relative overflow-hidden rounded-[3rem] shadow-2xl"
              style={{
                width: 340,
                height: 700,
                background: "#000",
                border: "4px solid rgba(255,255,255,0.15)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 25px 50px rgba(0,0,0,0.5)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screen.image}
                alt={screen.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "top",
                }}
              />
            </div>

            {/* Navigation dots & arrows */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentScreen((prev) => Math.max(0, prev - 1))}
                disabled={!canGoBack}
                className="rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex gap-1.5">
                {SCREENS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentScreen(i)}
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: i === currentScreen ? 16 : 8,
                      background: i === currentScreen ? "#8b5cf6" : "rgba(255,255,255,0.25)",
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setCurrentScreen((prev) => Math.min(SCREENS.length - 1, prev + 1))}
                disabled={!canGoForward}
                className="rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Description panel */}
          <div className="flex flex-col gap-6 text-left" style={{ maxWidth: 380, flex: "1 1 300px" }}>
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-violet-400" />
                <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">
                  Mobile App Vision
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                OXP Mobile Experience
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/60">
                A native mobile companion for Entrata&apos;s OXP platform — giving property managers
                the power to monitor AI agents, handle escalations, and stay connected from anywhere.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-left">
              <h3 className="mb-1.5 text-sm font-semibold text-white">
                {screen.title}
              </h3>
              <p className="text-xs leading-relaxed text-white/50">
                {screen.description}
              </p>
            </div>

            <div className="flex flex-col gap-2 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                Key Capabilities
              </p>
              <ul className="flex flex-col gap-1.5">
                {[
                  "Real-time escalation management",
                  "Push notifications for critical events",
                  "AI conversation monitoring",
                  "One-tap approvals and actions",
                  "Offline-capable with sync",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs text-white/50">
                    <div className="h-1 w-1 shrink-0 rounded-full bg-violet-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-[10px] italic text-white/25">
              This is a conceptual preview — the mobile app is currently in development.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

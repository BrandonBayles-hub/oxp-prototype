"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Rocket,
  ArrowRight,
  Eye,
  Sparkles,
  BarChart3,
  Shield,
  Zap,
  X,
  ChevronDown,
} from "lucide-react";
import { useR1Demo } from "@/lib/r1-demo-context";

const R1_VALUE_PROPS = [
  { icon: Sparkles, title: "AI-Powered Agents", desc: "Autonomous agents handle leasing, maintenance, payments, and resident communications 24/7." },
  { icon: BarChart3, title: "Real-Time Performance", desc: "Live dashboards showing agent performance, resolution rates, and operational insights." },
  { icon: Shield, title: "Governance & Compliance", desc: "Built-in guardrails, approval gates, and audit trails for every AI action." },
  { icon: Zap, title: "Automated Workflows", desc: "Multi-step processes run automatically — from lead response to lease renewal." },
];

export function R1PreviewBanner() {
  const { isR1Preview } = useR1Demo();
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setPanelOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [panelOpen]);

  if (!isR1Preview) return null;

  return (
    <>
    <div className="relative" ref={panelRef}>
      {/* Banner */}
      <button
        type="button"
        onClick={() => setPanelOpen(!panelOpen)}
        className="relative flex w-full items-center justify-between gap-4 overflow-hidden px-4 py-3.5 text-left sm:px-5 lg:px-6"
        style={{
          background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 50%, #8b5cf6 100%)",
        }}
      >
        {/* Decorative dots */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }} />

        <div className="relative flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
            <Eye className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-[13px] font-semibold leading-tight text-white">
              You&apos;re viewing a fully configured demo of OXP Studio.
            </p>
            <p className="mt-0.5 text-[12px] leading-tight text-white/75">
              This is what your platform will look like when agents and the OXP platform are activated.
            </p>
          </div>
        </div>

        <div className="relative flex shrink-0 items-center gap-3">
          <Link
            href="/getting-started"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 rounded-md bg-white px-3.5 py-2 text-[12px] font-semibold text-[#6366f1] shadow-sm transition-all hover:bg-white/95 hover:shadow-md"
          >
            <Rocket className="h-3.5 w-3.5" />
            Activate Your Platform
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <ChevronDown
            className="h-4 w-4 text-white/60 transition-transform"
            style={{ transform: panelOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </div>
      </button>

      {/* Expandable detail panel */}
      {panelOpen && (
        <div
          className="absolute left-0 right-0 z-[90] border-b border-[hsl(var(--border))] bg-white shadow-xl"
        >
          <div className="mx-auto max-w-4xl px-6 py-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[15px] font-bold text-[hsl(var(--foreground))]">
                  What&apos;s included in OXP Studio
                </p>
                <p className="mt-1 text-[13px] text-[hsl(var(--muted-foreground))]">
                  Everything you see in this demo will be available once you complete activation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {R1_VALUE_PROPS.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex gap-3.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{
                    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  }}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[hsl(var(--foreground))]">{title}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-[hsl(var(--muted-foreground))]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/50 px-5 py-4">
              <div>
                <p className="text-[13px] font-semibold text-[hsl(var(--foreground))]">
                  Ready to make this your live platform?
                </p>
                <p className="mt-0.5 text-[12px] text-[hsl(var(--muted-foreground))]">
                  Complete the activation steps to configure agents, agent builders, and governance for your organization.
                </p>
              </div>
              <Link
                href="/getting-started"
                onClick={() => setPanelOpen(false)}
                className="flex shrink-0 items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:shadow-md"
                style={{
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                }}
              >
                <Rocket className="h-3.5 w-3.5" />
                Start Activating
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Floating bottom pill */}
    <Link
      href="/getting-started"
      className="fixed bottom-6 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--foreground))] px-5 py-2.5 shadow-lg transition-all hover:shadow-xl"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/eli-cube.svg" alt="" width={20} height={20} className="shrink-0" />
      <span className="text-[13px] font-semibold text-white">Activate OXP Studio</span>
    </Link>
    </>
  );
}

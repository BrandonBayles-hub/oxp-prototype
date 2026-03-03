"use client";

import Image from "next/image";
import { CheckCircle2, Lock, Rocket, Sparkles } from "lucide-react";
import { useContract } from "@/lib/contract-context";

/**
 * Full-page translucent overlay shown when the Entrata OXP Studio
 * contract is not enabled. Renders children underneath with a blurred
 * gray veil and a centered CTA card.
 */
export function ContractGate({
  children,
  featureName,
}: {
  children: React.ReactNode;
  featureName: string;
}) {
  const { contracted } = useContract();

  if (contracted) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none" aria-hidden>
        {children}
      </div>

      <div className="absolute inset-0 z-40 flex items-start justify-center rounded-lg bg-white/40 backdrop-blur-[2px] dark:bg-gray-950/40">
        <div className="mt-24 w-full max-w-lg rounded-xl border border-border bg-white shadow-xl dark:bg-gray-900">
          <div className="px-8 pt-8 pb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <Lock className="h-4.5 w-4.5 text-gray-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Unlock {featureName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Entrata OXP Studio
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              To access OXP Studio, contact Entrata to enable the
              Entrata OXP Studio for your portfolio.
            </p>
          </div>

          <div className="space-y-4 px-8 pb-6">
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">What OXP Studio provides</p>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  AI-powered command center with real-time metrics and revenue impact tracking
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  Deploy and manage autonomous AI agents across leasing, payments, renewals, and maintenance
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  Centralized training vault, workflows, and compliance governance
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  Live conversation monitoring and escalation management
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-950/30">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">Impact from similar properties</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">386 hrs</p>
                  <p className="text-[11px] text-green-600 dark:text-green-400">Staff hours saved</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">$42K</p>
                  <p className="text-[11px] text-green-600 dark:text-green-400">Revenue impact</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">12.2</p>
                  <p className="text-[11px] text-green-600 dark:text-green-400">Effective FTE</p>
                </div>
              </div>
            </div>

            <a
              href="https://www.entrata.com/products/oxp-studio/request-access"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 w-full items-center justify-center rounded-md bg-[#CC0000] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#a00]"
            >
              Request Access
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Overlay shown when the R1 demo control is active for features
 * that won't be ready in the R1 release. Shows a translucent preview
 * with an exciting "Coming Soon" card.
 */
export function R1ComingSoon({
  children,
  featureName,
  description,
}: {
  children: React.ReactNode;
  featureName: string;
  description?: string;
}) {
  const { r1Mode } = useContract();

  if (!r1Mode) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40" aria-hidden>
        {children}
      </div>

      <div className="absolute inset-0 z-40 flex items-start justify-center rounded-lg bg-white/30 dark:bg-gray-950/30">
        <div className="mt-24 w-full max-w-lg rounded-xl border border-blue-200 bg-white shadow-xl dark:border-blue-900/50 dark:bg-gray-900">
          <div className="px-8 pt-8 pb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/60">
                <Rocket className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {featureName}
                </h2>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Coming Soon in Q2 · Gain Early Access
                </p>
              </div>
            </div>

            {description && (
              <p className="mt-4 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          <div className="space-y-4 px-8 pb-8 pt-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
              <div className="flex items-start gap-2.5">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
                <div>
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">This feature is being built for you</p>
                  <p className="mt-1 text-sm text-blue-700/80 dark:text-blue-300/80">
                    Our engineering team is actively developing {featureName.toLowerCase()} as part of the R1 release. You&apos;ll be among the first to use it when it launches.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 shadow-sm">
              <Sparkles className="h-4 w-4 text-white/80" />
              <p className="text-sm font-semibold text-white">Stay tuned — great things are on the way!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Mail,
  Inbox,
  MessageSquare,
  GraduationCap,
  Rocket,
  ShieldCheck,
  Tag,
  Bell,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Info,
} from "lucide-react";

const STEPS = [
  {
    id: "email-setup",
    title: "Setup Domain and Email Address",
    description: "",
    icon: Mail,
    required: true,
    hasRedirect: true,
    numbered: true,
  },
  {
    id: "custom-inbox-labels",
    title: "Create Custom Inbox and Labels",
    description: "",
    icon: Inbox,
    required: false,
    hasRedirect: false,
    numbered: true,
  },
  {
    id: "email-sms-settings",
    title: "Email Signature Setup for Conversation Panel",
    description: "A default email signature is already configured for your property. Every email your staff sends to leads and residents will automatically include this signature.",
    icon: MessageSquare,
    required: false,
    hasRedirect: true,
    numbered: true,
  },
  {
    id: "browser-notifications",
    title: "Browser Notifications",
    description: "Pop-up notifications will automatically appear for users that have permission to an inbox or property. No additional setup is required — this is configured automatically when you go live.",
    icon: Bell,
    required: false,
    hasRedirect: false,
    numbered: true,
  },
  {
    id: "training",
    title: "Training Your On-Site Teams",
    description: "Before going live, ensure all site staff are trained and fully understand how conversations will be managed. After activation, all incoming and outgoing email and SMS communications will flow through the new system — your team must be prepared to handle them.",
    icon: GraduationCap,
    required: true,
    hasRedirect: false,
    numbered: true,
  },
  {
    id: "activate",
    title: "Activate — Go Live",
    description: "",
    icon: Rocket,
    required: true,
    hasRedirect: false,
    numbered: false,
  },
] as const;

type StepId = (typeof STEPS)[number]["id"];


function RedirectLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] bg-white px-3 py-2 text-sm font-medium text-[hsl(var(--foreground))] shadow-sm transition-colors hover:bg-[hsl(var(--muted))]/60"
    >
      {label}
      <ExternalLink className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
    </a>
  );
}

function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
      <p className="text-xs leading-relaxed text-blue-800">{children}</p>
    </div>
  );
}

export default function CommunicationsSetupPage() {
  const [expandedStep, setExpandedStep] = useState<number | null>(0);
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(new Set(["email-sms-settings", "browser-notifications", "custom-inbox-labels"]));
  const [goLiveActive, setGoLiveActive] = useState(false);

  const toggleStepComplete = (id: StepId) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const EXCLUDED_FROM_PROGRESS = new Set(["activate"]);
  const trackableSteps = STEPS.filter((s) => !EXCLUDED_FROM_PROGRESS.has(s.id));
  const completedCount = trackableSteps.filter((s) => completedSteps.has(s.id)).length;
  const totalSteps = trackableSteps.length;

  return (
    <div className="mx-auto max-w-[56rem] px-4 pb-12 pt-8 sm:px-6">
      {/* Back button */}
      <Link
        href="/getting-started"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to AI &amp; Agent Activation
      </Link>

      {/* Page Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]" style={{ fontFamily: "Nohemi, Plus Jakarta Sans, Inter, sans-serif" }}>
          OXP Communication Inbox Setup
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
          Completing this setup is required to enable all conversations on the Entrata platform to be managed from a single, centralized location. Once configured, your site staff can efficiently handle all incoming and outgoing SMS and email communications directly within the inbox — eliminating the need to switch between systems and making it easier for teams to stay organized, respond faster, and never miss a conversation.
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8 mt-6 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all duration-500"
            style={{ width: `${Math.round((completedCount / totalSteps) * 100)}%` }}
          />
        </div>
        <span className="text-sm font-semibold tabular-nums text-[hsl(var(--foreground))]">
          {Math.round((completedCount / totalSteps) * 100)}%
        </span>
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          ({completedCount}/{totalSteps} steps)
        </span>
      </div>

      {/* Steps */}
      <div className="space-y-0 rounded-lg border border-[hsl(var(--border))] bg-white">
        {(() => {
          let stepNumber = 0;
          return STEPS.map((step, idx) => {
          const done = completedSteps.has(step.id);
          const isExpanded = expandedStep === idx;
          const Icon = step.icon;
          if (step.numbered) stepNumber++;
          const currentNumber = stepNumber;

          return (
            <div
              key={step.id}
              className="border-b border-[hsl(var(--border))]/40 last:border-0"
            >
              {/* Step header */}
              <button
                type="button"
                onClick={() => setExpandedStep(isExpanded ? null : idx)}
                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                  step.id === "custom-inbox-labels" && !done
                    ? "bg-blue-50/40 hover:bg-blue-50/70"
                    : "hover:bg-[hsl(var(--muted))]/30"
                }`}
              >
                {step.numbered ? (
                  <span
                    role="checkbox"
                    aria-checked={done}
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStepComplete(step.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleStepComplete(step.id);
                      }
                    }}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors cursor-pointer ${
                      done
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-[hsl(var(--border))] bg-white hover:border-[hsl(var(--muted-foreground))]"
                    }`}
                    aria-label={done ? "Mark incomplete" : "Mark complete"}
                  >
                    {done ? (
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))]">{currentNumber}</span>
                    )}
                  </span>
                ) : (
                  <Icon className="h-5 w-5 shrink-0 text-[hsl(var(--muted-foreground))]" />
                )}

                {step.numbered && <Icon className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />}

                <div className="min-w-0 flex-1">
                  <span
                    className={`text-sm ${
                      done ? "text-[hsl(var(--muted-foreground))]" : "font-medium text-[hsl(var(--foreground))]"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>

                {step.required && !done && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 border border-red-200">
                    Required
                  </span>
                )}

                {done && !isExpanded && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    Complete
                  </span>
                )}

                {step.id === "custom-inbox-labels" && !done && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 border border-blue-200">
                    Optional
                  </span>
                )}

                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                )}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-[hsl(var(--border))]/30 bg-[hsl(var(--muted))]/20 px-4 pb-6 pl-[3.25rem] pr-6 pt-4">
                  <p className="mb-4 text-sm text-[hsl(var(--muted-foreground))]">
                    {step.description}
                  </p>

                  {step.id === "email-setup" && <StepEmailSetup />}
                  {step.id === "custom-inbox-labels" && <StepCustomInboxLabels />}
                  {step.id === "email-sms-settings" && <StepEmailSmsSettings />}
                  {step.id === "browser-notifications" && <StepBrowserNotifications />}
                  {step.id === "training" && <StepTraining onAllComplete={(complete) => {
                    setCompletedSteps((prev) => {
                      const next = new Set(prev);
                      if (complete) next.add("training"); else next.delete("training");
                      return next;
                    });
                  }} />}
                  {step.id === "activate" && (
                    <StepActivate
                      goLiveActive={goLiveActive}
                      onGoLive={() => setGoLiveActive(true)}
                      allStepsComplete={STEPS.filter((s) => s.id !== "activate" && s.id !== "browser-notifications" && s.id !== "custom-inbox-labels").every((s) => completedSteps.has(s.id))}
                    />
                  )}
                </div>
              )}
            </div>
          );
        });
        })()}
      </div>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 1: Email Setup
   ═══════════════════════════════════════════════════════════════════════ */

function StatusIndicator({ active }: { active: boolean }) {
  return active ? (
    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
  ) : (
    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100">
      <span className="text-[9px] font-bold text-gray-400">—</span>
    </div>
  );
}

function StepEmailSetup() {
  const domainAuthenticated = false;
  const subdomainCreated = false;

  return (
    <div className="space-y-3">
      <Link
        href="/communications-setup/custom-email"
        className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] bg-white px-3 py-2 text-sm font-medium text-[hsl(var(--foreground))] shadow-sm transition-colors hover:bg-[hsl(var(--muted))]/60"
      >
        Setup Domain and Email Address
      </Link>

      <div className="mt-4 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          Setup Status
        </p>

        <div className="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))]/50 bg-white px-4 py-3">
          <StatusIndicator active={domainAuthenticated} />
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">Domain Authentication</p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                  domainAuthenticated
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-gray-100 text-gray-600"
                }`}
              >
                {domainAuthenticated ? "Active" : "Disabled"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
              Automatically checking that your domain has been authenticated via DKIM, SPF, and DMARC.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))]/50 bg-white px-4 py-3">
          <StatusIndicator active={subdomainCreated} />
          <Globe className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">Setup Custom Email Address (IMAP and SMTP)</p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                  subdomainCreated
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-gray-100 text-gray-600"
                }`}
              >
                {subdomainCreated ? "Active" : "Disabled"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
              A custom email address will need to be set up for this property before activation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 2: Create Custom Inbox and Labels
   ═══════════════════════════════════════════════════════════════════════ */

function StepCustomInboxLabels() {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-100/60">
              <Inbox className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">Default Property Inbox</p>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                  Complete
                </span>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                A default inbox will be automatically created for this property when it is activated (Go Live). All incoming conversations that need to be managed will be routed here unless assigned to a custom inbox.
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Once Communication Inbox Setup is complete, you will be able to create custom labels and custom inboxes.
        </p>

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 3: Email & SMS Settings
   ═══════════════════════════════════════════════════════════════════════ */

function StepEmailSmsSettings() {
  return (
    <div className="space-y-3">
      <RedirectLink href="#" label="Edit the Default Email Signature in Settings" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 4: Browser Notifications
   ═══════════════════════════════════════════════════════════════════════ */

function StepBrowserNotifications() {
  return (
    <div className="space-y-3">
      <InfoNote>
        Pop-up notifications will automatically appear for users that have permission to an inbox or property.
        No additional setup is required — this is configured automatically when you go live.
      </InfoNote>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 5: Training Your On-Site Teams
   ═══════════════════════════════════════════════════════════════════════ */

function StepTraining({ onAllComplete }: { onAllComplete: (complete: boolean) => void }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const items = [
    "How to use the inbox area for managing conversations",
    "How to use the conversation panel on lead and resident profiles",
  ];

  const toggle = (item: string) => {
    const next = { ...checked, [item]: !checked[item] };
    setChecked(next);
    const allDone = items.every((i) => next[i]);
    onAllComplete(allDone);
  };

  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            checkedCount === items.length
              ? "bg-[#B3FFCC] text-black"
              : "bg-amber-400 text-amber-950"
          }`}
        >
          {checkedCount === items.length ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <Circle className="h-3 w-3" />
          )}
          {checkedCount}/{items.length} training items complete
        </span>
      </div>

      <div className="rounded-lg border border-[hsl(var(--border))]/50 p-4">
        <p className="mb-3 text-xs font-medium text-[hsl(var(--foreground))]">Training Checklist</p>
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id={`training-${item}`}
                checked={checked[item] ?? false}
                onChange={() => toggle(item)}
                className="h-4 w-4 rounded border-[hsl(var(--border))] text-[hsl(var(--ring))]"
              />
              <label htmlFor={`training-${item}`} className="text-sm text-[hsl(var(--foreground))]">
                {item}
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Step 6: Activate — Go Live
   ═══════════════════════════════════════════════════════════════════════ */

function StepActivate({
  goLiveActive,
  onGoLive,
  allStepsComplete,
}: {
  goLiveActive: boolean;
  onGoLive: () => void;
  allStepsComplete: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          Activation Actions
        </p>

        <div className="flex items-center gap-3 rounded-lg border border-[hsl(var(--border))]/50 bg-white px-4 py-3">
          <Rocket className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">Go Live</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Activate all vanity numbers for this property and turn on &quot;Yes&quot; for sending contact point emails and SMS via new communication inbox settings.
            </p>
          </div>
          {goLiveActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Active
            </span>
          ) : (
            <button
              type="button"
              onClick={onGoLive}
              disabled={!allStepsComplete}
              className="btn-primary disabled:pointer-events-none disabled:opacity-50"
            >
              Go Live
            </button>
          )}
        </div>

        {!goLiveActive && !allStepsComplete && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs leading-relaxed text-amber-800">
              Complete all previous steps to enable Go Live. All steps must be at 100% before activation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Mail,
  GraduationCap,
  Rocket,
  Power,
  CheckCircle2,
  Info,
  Send,
} from "lucide-react";

const ELI_STEPS = [
  {
    id: "eli-email-setup",
    title: "Setup Custom Email Address",
    description: "Configure a custom email address for escalation communications. This ensures escalated emails are sent from a branded address specific to your property.",
    icon: Mail,
    required: true,
    hasRedirect: true,
    numbered: true,
  },
  {
    id: "eli-training",
    title: "Training Your On-Site Teams",
    description: "Before going live, ensure all site staff understand how escalated conversations will appear in their inbox and how to resolve them efficiently.",
    icon: GraduationCap,
    required: true,
    hasRedirect: false,
    numbered: true,
  },
  {
    id: "eli-activate",
    title: "Activate — Go Live",
    description: "",
    icon: Rocket,
    required: true,
    hasRedirect: false,
    numbered: false,
  },
  {
    id: "eli-deactivate",
    title: "Request Deactivation — Turn Off",
    description: "",
    icon: Power,
    required: false,
    hasRedirect: false,
    numbered: false,
  },
] as const;

type EliStepId = (typeof ELI_STEPS)[number]["id"];

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
      <p className="text-sm text-blue-700">{children}</p>
    </div>
  );
}

function StatusIndicator({ active }: { active: boolean }) {
  return active ? (
    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
  ) : (
    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100">
      <span className="text-[9px] font-bold text-gray-400">—</span>
    </div>
  );
}

export default function EliEscalationPage() {
  const [expandedStep, setExpandedStep] = useState<number | null>(0);
  const [completedSteps, setCompletedSteps] = useState<Set<EliStepId>>(new Set());
  const [goLiveActive, setGoLiveActive] = useState(false);

  const toggleStepComplete = (id: EliStepId) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const EXCLUDED = new Set(["eli-activate", "eli-deactivate"]);
  const trackable = ELI_STEPS.filter((s) => !EXCLUDED.has(s.id));
  const completedCount = trackable.filter((s) => completedSteps.has(s.id)).length;
  const totalSteps = trackable.length;

  return (
    <div className="mx-auto max-w-[56rem] px-4 pb-12 pt-8 sm:px-6">
      <Link
        href="/getting-started"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to AI &amp; Agent Activation
      </Link>

      <header className="mb-2">
        <h1
          className="text-2xl font-medium tracking-tight text-[hsl(var(--foreground))]"
          style={{ fontFamily: "Nohemi, Plus Jakarta Sans, Inter, sans-serif" }}
        >
          ELI+ Escalation Setup
        </h1>
        <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">
          Property-level activation of ELI+ Escalation with Inbox integration. All AI-escalated SMS and email conversations will appear directly in the inbox for your team to resolve.
        </p>
      </header>

      <div className="mb-8 mt-6 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
          <div
            className="h-full rounded-full bg-violet-600 transition-all duration-500"
            style={{ width: `${totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0}%` }}
          />
        </div>
        <span className="text-sm font-semibold tabular-nums text-[hsl(var(--foreground))]">
          {totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0}%
        </span>
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          ({completedCount}/{totalSteps} steps)
        </span>
      </div>

      <div className="space-y-0 rounded-lg border border-[hsl(var(--border))] bg-white">
        {(() => {
          let stepNum = 0;
          return ELI_STEPS.map((step, idx) => {
            const done = completedSteps.has(step.id);
            const isExpanded = expandedStep === idx;
            const Icon = step.icon;
            if (step.numbered) stepNum++;
            const currentNumber = stepNum;

            return (
              <div key={step.id} className="border-b border-[hsl(var(--border))]/40 last:border-0">
                <button
                  type="button"
                  onClick={() => setExpandedStep(isExpanded ? null : idx)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[hsl(var(--muted))]/30"
                >
                  {step.numbered ? (
                    <span
                      role="checkbox"
                      aria-checked={done}
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); toggleStepComplete(step.id); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); toggleStepComplete(step.id); } }}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors cursor-pointer ${
                        done ? "border-violet-600 bg-violet-600 text-white" : "border-[hsl(var(--border))] bg-white hover:border-[hsl(var(--muted-foreground))]"
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
                    <span className={`text-sm ${done ? "text-[hsl(var(--muted-foreground))]" : "font-medium text-[hsl(var(--foreground))]"}`}>
                      {step.title}
                    </span>
                  </div>

                  {step.required && !done && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 border border-red-200">Required</span>
                  )}
                  {done && !isExpanded && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Complete</span>
                  )}

                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-[hsl(var(--border))]/30 bg-[hsl(var(--muted))]/20 px-4 pb-6 pl-[3.25rem] pr-6 pt-4">
                    {step.description && (
                      <p className="mb-4 text-sm text-[hsl(var(--muted-foreground))]">{step.description}</p>
                    )}

                    {step.id === "eli-email-setup" && <EliEmailSetup />}
                    {step.id === "eli-training" && (
                      <EliTraining onAllComplete={(complete) => {
                        setCompletedSteps((prev) => {
                          const next = new Set(prev);
                          if (complete) next.add("eli-training"); else next.delete("eli-training");
                          return next;
                        });
                      }} />
                    )}
                    {step.id === "eli-activate" && (
                      <EliActivate
                        allStepsComplete={ELI_STEPS.filter((s) => s.id !== "eli-activate" && s.id !== "eli-deactivate").every((s) => completedSteps.has(s.id))}
                        goLiveActive={goLiveActive}
                        onGoLive={() => setGoLiveActive(true)}
                      />
                    )}
                    {step.id === "eli-deactivate" && <EliDeactivate />}
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
   ELI+ Step: Setup Custom Email Address
   ═══════════════════════════════════════════════════════════════════════ */

function EliEmailSetup() {
  const emailConfigured = false;

  return (
    <div className="space-y-3">
      <RedirectLink href="/communications-setup/custom-email" label="Setup Custom Email Address" />

      <div className="mt-4 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          Email Status
        </p>

        <div className="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))]/50 bg-white px-4 py-3">
          <StatusIndicator active={emailConfigured} />
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">Custom Email Address (IMAP and SMTP)</p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                  emailConfigured ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-100 text-gray-600"
                }`}
              >
                {emailConfigured ? "Active" : "Disabled"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
              A custom email address must be configured for escalation communications before activation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ELI+ Step: Training Your On-Site Teams
   ═══════════════════════════════════════════════════════════════════════ */

function EliTraining({ onAllComplete }: { onAllComplete: (complete: boolean) => void }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const items = [
    "How to resolve escalations with inboxes",
  ];

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      onAllComplete(next.size === items.length);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">
        {checked.size}/{items.length} training items complete
      </p>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          Training Checklist
        </p>
        {items.map((item, i) => (
          <label
            key={i}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-[hsl(var(--border))]/50 bg-white px-4 py-3 transition-colors hover:bg-[hsl(var(--muted))]/20"
            onClick={() => toggle(i)}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                checked.has(i) ? "border-violet-600 bg-violet-600 text-white" : "border-[hsl(var(--border))]"
              }`}
            >
              {checked.has(i) && (
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span className={`text-sm ${checked.has(i) ? "text-[hsl(var(--muted-foreground))] line-through" : "text-[hsl(var(--foreground))]"}`}>
              {item}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ELI+ Step: Activate — Go Live
   ═══════════════════════════════════════════════════════════════════════ */

function EliActivate({
  allStepsComplete,
  goLiveActive,
  onGoLive,
}: {
  allStepsComplete: boolean;
  goLiveActive: boolean;
  onGoLive: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-[hsl(var(--border))]/50 bg-white px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">Go Live</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Activate ELI+ Escalation for this property. All SMS and email escalated conversations will appear in the inbox live conversation area for your team to manage and resolve in real time.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoLive}
          disabled={!allStepsComplete || goLiveActive}
          className="btn-primary whitespace-nowrap disabled:pointer-events-none disabled:opacity-50"
        >
          {goLiveActive ? "Active" : "Go Live"}
        </button>
      </div>

      {goLiveActive && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">
            ELI+ Escalation is live. Escalated conversations are now appearing in the inbox.
          </span>
        </div>
      )}

      {!goLiveActive && !allStepsComplete && (
        <InfoNote>
          Complete all required steps above before activating ELI+ Escalation. Both steps must be marked complete to enable the Go Live button.
        </InfoNote>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ELI+ Step: Request Deactivation — Turn Off
   ═══════════════════════════════════════════════════════════════════════ */

function EliDeactivate() {
  const [formData, setFormData] = useState({
    fullName: "",
    title: "",
    email: "",
    phone: "",
    reason: "",
    additionalNotes: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!formData.fullName.trim() || !formData.title.trim() || !formData.phone.trim() || !formData.reason.trim()) return;
    setSubmitted(true);
  };

  const isFormValid = formData.fullName.trim() && formData.title.trim() && formData.phone.trim() && formData.reason.trim();

  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <span className="text-sm font-medium text-emerald-700">
          Your deactivation request has been submitted. The Product &amp; Engineering team will review your request and follow up at the phone number provided.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        Deactivating ELI+ Escalation requires a request to the Product &amp; Engineering team. Please fill out the form below with your contact information and the reason for deactivation.
      </p>

      <div className="rounded-lg border border-[hsl(var(--border))] bg-white p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          Deactivation Request Form
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
              placeholder="John Smith"
              className="input-base w-full"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
              Title / Role <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Property Manager"
              className="input-base w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="john@company.com"
              className="input-base w-full"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="(555) 123-4567"
              className="input-base w-full"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
            Reason for Deactivation <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.reason}
            onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
            className="input-base w-full"
          >
            <option value="">Select a reason...</option>
            <option value="not-meeting-needs">Not meeting operational needs</option>
            <option value="staffing-changes">Staffing or workflow changes</option>
            <option value="switching-providers">Switching to a different solution</option>
            <option value="cost-concerns">Cost concerns</option>
            <option value="performance-issues">Performance or reliability issues</option>
            <option value="temporary-pause">Temporary pause — plan to re-enable later</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
            Additional Notes
          </label>
          <textarea
            value={formData.additionalNotes}
            onChange={(e) => setFormData((prev) => ({ ...prev, additionalNotes: e.target.value }))}
            placeholder="Provide any additional context about why you'd like to deactivate ELI+ Escalation..."
            rows={3}
            className="input-base w-full resize-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 disabled:pointer-events-none disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Submit Deactivation Request
          </button>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            Required fields are marked with <span className="text-red-500">*</span>
          </span>
        </div>
      </div>

      <InfoNote>
        Deactivation is not instant. Your request will be reviewed by the Product &amp; Engineering team, who may reach out for additional details. You will be contacted at the phone number provided.
      </InfoNote>
    </div>
  );
}

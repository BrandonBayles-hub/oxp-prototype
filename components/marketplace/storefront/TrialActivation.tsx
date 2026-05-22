"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Checkbox from "@radix-ui/react-checkbox";
import { cn } from "@/lib/marketplace/utils/utils";
import {
  Clock,
  Play,
  CircleCheck,
  ArrowRight,
  X,
  Check,
  FileText,
  Settings,
} from "lucide-react";
import { useProfile } from "./ProfileContext";
import Link from "next/link";

type TrialRecord = {
  id: string;
  listingId: string;
  trialDays: number;
  expiresAt: string;
};

const STEPS = ["Terms", "Confirmed", "Setup"];

interface TrialActivationProps {
  listingName: string;
  listingId: string;
  trialDays: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTrialStarted?: (trial: TrialRecord) => void;
  // When provided, the dialog opens at step 2 with an existing trial (re-open flow)
  existingTrial?: TrialRecord;
}

export function TrialActivation({
  listingName,
  listingId,
  trialDays,
  open,
  onOpenChange,
  onTrialStarted,
  existingTrial,
}: TrialActivationProps) {
  const { profile } = useProfile();
  const [step, setStep] = useState(existingTrial ? 2 : 1);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdTrial, setCreatedTrial] = useState<TrialRecord | null>(existingTrial ?? null);
  const [newlyCreated, setNewlyCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset to the right starting state every time the dialog opens
  useEffect(() => {
    if (open) {
      setStep(existingTrial ? 2 : 1);
      setCreatedTrial(existingTrial ?? null);
      setTermsAccepted(false);
      setNewlyCreated(false);
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleStartTrial = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/trials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          customerCompany: profile.company,
        }),
      });

      if (res.ok) {
        const trial = await res.json();
        setCreatedTrial(trial);
        setNewlyCreated(true);
        setStep(2);
        // onTrialStarted fires on close so the parent doesn't unmount
        // this dialog before the user finishes all 3 steps
      } else {
        const data = await res.json().catch(() => ({ error: "Failed to start trial" }));
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Only notify parent when a brand-new trial was created in this session
      if (newlyCreated && createdTrial) {
        onTrialStarted?.(createdTrial);
      }
      setStep(1);
      setTermsAccepted(false);
      setCreatedTrial(null);
      setNewlyCreated(false);
      setError(null);
    }
    onOpenChange(isOpen);
  };

  const trialEndDate = createdTrial
    ? new Date(createdTrial.expiresAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-white p-6 shadow-lg">
          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </Dialog.Close>

          <Dialog.Title className="text-lg font-semibold">
            {step === 1 && "Start Free Trial"}
            {step === 2 && "Trial Started!"}
            {step === 3 && "Set Up Your Agent"}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            {step === 1 && `Review terms for your ${trialDays}-day free trial`}
            {step === 2 && `${listingName} is now active for ${trialDays} days`}
            {step === 3 && "Complete agent configuration in OXP Studio"}
          </Dialog.Description>

          {/* Stepper */}
          <div className="mt-4 mb-6 flex items-center gap-1">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-1 flex-1">
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    i + 1 <= step
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {i + 1 < step ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span className="hidden sm:inline text-xs text-muted-foreground truncate">
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "mx-1 h-px flex-1",
                      i + 1 < step ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Step 1: Terms & Start */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <div className="text-sm font-medium">{listingName}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {trialDays}-day free trial · Full access to all features · No charge
                </div>
              </div>

              <div className="max-h-44 overflow-y-auto rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium mb-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Trial Terms & Conditions
                </div>
                <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                  <p>By activating this free trial, you agree to the following terms:</p>
                  <p>
                    <strong>1. Trial Period.</strong> Your free trial of {listingName} will
                    be active for {trialDays} days from the date of activation. After the
                    trial period expires, access will be suspended unless a paid
                    subscription is initiated.
                  </p>
                  <p>
                    <strong>2. Scope.</strong> The trial grants full access to all features
                    of {listingName}. Property configuration will be completed in OXP
                    Studio after activation.
                  </p>
                  <p>
                    <strong>3. Data & Privacy.</strong> All data processed during the trial
                    is subject to Entrata&apos;s standard Data Processing Agreement and
                    Privacy Policy. No charges will be incurred during the trial period.
                  </p>
                  <p>
                    <strong>4. Conversion.</strong> At the end of the trial, contact your
                    Entrata sales representative to continue with a paid subscription.
                    There is no obligation to purchase.
                  </p>
                  <p>
                    <strong>5. Limitations.</strong> Each organization may activate one free
                    trial per product. Trials cannot be restarted once expired.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Checkbox.Root
                  id="trial-terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                    termsAccepted
                      ? "border-primary bg-primary"
                      : "border-border"
                  )}
                >
                  <Checkbox.Indicator>
                    <Check className="h-3 w-3 text-white" />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <label htmlFor="trial-terms" className="cursor-pointer text-muted-foreground">
                  I have read and agree to the trial terms and conditions
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => handleClose(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartTrial}
                  disabled={!termsAccepted || submitting}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? (
                    "Activating..."
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Start Free Trial
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Trial Started — success confirmation */}
          {step === 2 && createdTrial && (
            <div className="space-y-5">
              <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/50 p-6 text-center">
                <CircleCheck className="h-14 w-14 text-primary" />
                <h4 className="mt-3 text-lg font-semibold">
                  {listingName} — Trial Started
                </h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your {trialDays}-day free trial is now active.
                  <br />
                  You have full access through{" "}
                  <span className="font-medium text-foreground">{trialEndDate}</span>.
                </p>
              </div>

              <button
                onClick={() => setStep(3)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
              >
                Continue to Setup
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => handleClose(false)}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
              >
                Return to marketplace
              </button>
            </div>
          )}

          {/* Step 3: Setup instructions — push to OXP Studio */}
          {step === 3 && createdTrial && (
            <div className="space-y-5">
              <div className="rounded-lg border border-border bg-muted/50 p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Configure your agent in OXP Studio</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Takes about 5 minutes</p>
                  </div>
                </div>
                <ol className="space-y-2.5 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">1</span>
                    <span>Select the properties you want to activate {listingName} on</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">2</span>
                    <span>Review and customize the agent settings for each property</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">3</span>
                    <span>Activate the agent — your trial starts working immediately</span>
                  </li>
                </ol>
              </div>

              <Link
                href={`/trial/${createdTrial.id}/setup`}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
              >
                Go to OXP Studio
                <ArrowRight className="h-4 w-4" />
              </Link>

              <button
                onClick={() => handleClose(false)}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
              >
                Return to marketplace
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/marketplace/utils/utils";
import { CheckCircle2, Play, SlidersHorizontal } from "lucide-react";
import { RequestConfirmationModal } from "./RequestConfirmationModal";
import { TrialActivation } from "./TrialActivation";
import { useProfile } from "./ProfileContext";

interface CtaButtonInteractiveProps {
  ctaType: string;
  provider: string;
  providerType: string;
  listingId?: string;
  listingName?: string;
  trialDays?: number | null;
  bundleId?: string;
  requestMethod?: string;
  requestTarget?: string;
  size?: "full" | "compact";
}

const CTA_CODES = {
  ENABLE_FREE: "enable_free",
  PURCHASE: "purchase",
  CONTACT_SALES: "contact_sales",
  START_FREE_TRIAL: "start_trial",
} as const;

function normalizeCta(raw: string): string {
  return raw.trim().toLowerCase();
}

function getMessage(
  ctaType: string,
  provider: string,
  providerType: string,
  requestMethod?: string,
  requestTarget?: string
): string {
  if (requestMethod === "EMAIL" && requestTarget) {
    return `Your request has been sent to ${requestTarget}.`;
  }
  if (requestMethod === "WEBHOOK") {
    return `Your request has been sent to the ${provider} team via their integration.`;
  }
  const key = normalizeCta(ctaType);
  if (key === CTA_CODES.ENABLE_FREE) {
    return "Your request has been sent to Entrata's Professional Services team.";
  }
  if (key === CTA_CODES.PURCHASE) {
    return "Your request has been sent to your Entrata Accounts team.";
  }
  if (providerType === "FIRST_PARTY" || normalizeCta(providerType) === "first_party") {
    return "Your request has been sent to the Entrata Sales team.";
  }
  return `Your request has been sent to the ${provider} team.`;
}

type OrderStatus = null | "PENDING" | "COMPLETED";

export function CtaButtonInteractive({
  ctaType,
  provider,
  providerType,
  listingId,
  listingName,
  trialDays,
  bundleId,
  requestMethod = "EMAIL",
  requestTarget,
  size = "full",
}: CtaButtonInteractiveProps) {
  const { profile } = useProfile();
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
  const [trialStatus, setTrialStatus] = useState<{
    active: boolean;
    daysRemaining: number;
    trialId: string;
    reminderPhase: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trialFetchError, setTrialFetchError] = useState(false);
  const ctaKey = normalizeCta(ctaType);
  const isTrial = ctaKey === CTA_CODES.START_FREE_TRIAL;
  const [trialLoading, setTrialLoading] = useState(isTrial);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTrialStatus = useCallback(() => {
    if (!isTrial || !listingId) return;
    setTrialLoading(true);
    setTrialFetchError(false);
    fetch(`/api/trials?customerCompany=${encodeURIComponent(profile.company)}&listingId=${listingId}`)
      .then((r) => r.json())
      .then((trials) => {
        const active = trials.find((t: { effectiveStatus: string }) => t.effectiveStatus === "ACTIVE");
        if (active) {
          setTrialStatus({ active: true, daysRemaining: active.daysRemaining, trialId: active.id, reminderPhase: active.reminderPhase, expiresAt: active.expiresAt });
          return;
        }
        const expired = trials.find((t: { effectiveStatus: string }) => t.effectiveStatus === "EXPIRED");
        if (expired) {
          setTrialStatus({ active: false, daysRemaining: 0, trialId: expired.id, reminderPhase: "EXPIRED", expiresAt: expired.expiresAt });
        }
      })
      .catch(() => {
        setTrialFetchError(true);
      })
      .finally(() => {
        setTrialLoading(false);
      });
  }, [isTrial, listingId, profile.company]);

  useEffect(() => {
    fetchTrialStatus();
  }, [fetchTrialStatus]);

  const message = getMessage(ctaType, provider, providerType, requestMethod, requestTarget);
  const isRedirect = requestMethod === "REDIRECT_ENTRATA" || requestMethod === "REDIRECT_PARTNER";

  const checkStatus = useCallback(async () => {
    if (!listingId && !bundleId) return;
    const params = new URLSearchParams({ customerCompany: profile.company });
    if (listingId) params.set("listingId", listingId);
    if (bundleId) params.set("bundleId", bundleId);

    try {
      const res = await fetch(`/api/orders/status?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "COMPLETED") {
          setOrderStatus("COMPLETED");
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        } else if (data.status === "PENDING") {
          setOrderStatus("PENDING");
        }
      }
    } catch {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setError("Unable to check request status. Please refresh the page.");
    }
  }, [listingId, bundleId, profile.company]);

  useEffect(() => {
    checkStatus();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [checkStatus]);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(checkStatus, 2500);
  }, [checkStatus]);

  const createOrder = async () => {
    if (!listingId && !bundleId) return;
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listingId || undefined,
          bundleId: bundleId || undefined,
          customerCompany: profile.company,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setError(null);
        setOrderStatus(data.status === "COMPLETED" ? "COMPLETED" : "PENDING");
        if (data.status !== "COMPLETED") {
          startPolling();
        }
      } else {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (orderStatus) return;

    if (isRedirect && requestTarget) {
      window.open(requestTarget, "_blank", "noopener,noreferrer");
      createOrder();
    } else {
      setModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    createOrder();
  };

  // --- start_trial: active trial state ---
  if (isTrial && trialStatus?.active) {
    const phase = trialStatus.reminderPhase;

    if (size === "compact") {
      return (
        <span className={cn(
          "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold",
          phase === "EXPIRING_SOON" ? "bg-red-50 text-red-700" :
          phase === "CONVERT_NOW" ? "bg-amber-50 text-amber-700" :
          "bg-primary/10 text-primary"
        )}>
          <CheckCircle2 className="h-3 w-3" />
          Trial started · {trialStatus.daysRemaining}d left
        </span>
      );
    }

    const existingTrialRecord = {
      id: trialStatus.trialId,
      listingId: listingId ?? "",
      trialDays: trialDays ?? 30,
      expiresAt: trialStatus.expiresAt,
    };

    return (
      <>
        <div className="w-full space-y-2">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTrialOpen(true); }}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
              phase === "EXPIRING_SOON"
                ? "bg-red-50 text-red-700 hover:bg-red-100"
                : phase === "CONVERT_NOW"
                  ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            Trial started · {trialStatus.daysRemaining} days left
          </button>

          {phase === "CONVERT_NOW" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Your trial ends in {trialStatus.daysRemaining} days. Contact Sales to keep {listingName} active.
            </div>
          )}
          {phase === "EXPIRING_SOON" && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 font-medium">
              Your trial expires in {trialStatus.daysRemaining} days! Contact Sales now to avoid losing access.
            </div>
          )}

          {(phase === "CONVERT_NOW" || phase === "EXPIRING_SOON") && (
            <button
              onClick={handleClick}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Contact Sales
            </button>
          )}
        </div>

        <TrialActivation
          listingName={listingName ?? ""}
          listingId={listingId ?? ""}
          trialDays={trialDays ?? 30}
          open={trialOpen}
          onOpenChange={setTrialOpen}
          existingTrial={existingTrialRecord}
        />
      </>
    );
  }

  // --- start_trial: expired trial state ---
  if (isTrial && trialStatus && !trialStatus.active) {
    if (size === "compact") {
      return (
        <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
          Trial Expired
        </span>
      );
    }
    return (
      <div className="w-full space-y-2">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
          Your free trial has ended. Contact Sales to continue using {listingName}.
        </div>
        <button
          onClick={handleClick}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          Contact Sales
        </button>
        <RequestConfirmationModal
          isOpen={modalOpen}
          onClose={handleModalClose}
          message={`Your request has been sent to the Entrata Sales team. They will follow up about continuing ${listingName ?? "this product"}.`}
        />
      </div>
    );
  }

  // --- start_trial: loading state ---
  if (isTrial && trialLoading) {
    if (size === "compact") {
      return (
        <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground animate-pulse">
          Loading…
        </span>
      );
    }
    return (
      <button
        disabled
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground animate-pulse"
      >
        Loading trial status…
      </button>
    );
  }

  // --- start_trial: fetch error state ---
  if (isTrial && trialFetchError) {
    if (size === "compact") {
      return (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); fetchTrialStatus(); }}
          className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700"
        >
          Retry
        </button>
      );
    }
    return (
      <div className="w-full space-y-2">
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Unable to load trial status. Please try again.
        </p>
        <button
          onClick={fetchTrialStatus}
          className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Retry
        </button>
      </div>
    );
  }

  // --- start_trial: default state (show button + dialog) ---
  if (isTrial && !trialStatus) {
    if (size === "compact") {
      return (
        <>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTrialOpen(true); }}
            className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Free Trial
          </button>
          <TrialActivation
            listingName={listingName ?? ""}
            listingId={listingId ?? ""}
            trialDays={trialDays ?? 30}
            open={trialOpen}
            onOpenChange={setTrialOpen}
            onTrialStarted={(trial) => {
              const remaining = Math.ceil((new Date(trial.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              setTrialStatus({ active: true, daysRemaining: remaining, trialId: trial.id, reminderPhase: "GETTING_STARTED", expiresAt: trial.expiresAt });
            }}
          />
        </>
      );
    }
    return (
      <>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTrialOpen(true); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          <Play className="h-4 w-4" />
          Start Free Trial
        </button>
        <TrialActivation
          listingName={listingName ?? ""}
          listingId={listingId ?? ""}
          trialDays={trialDays ?? 30}
          open={trialOpen}
          onOpenChange={setTrialOpen}
          onTrialStarted={(trial) => {
            const remaining = Math.ceil((new Date(trial.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            setTrialStatus({ active: true, daysRemaining: remaining, trialId: trial.id, reminderPhase: "GETTING_STARTED", expiresAt: trial.expiresAt });
          }}
        />
      </>
    );
  }

  // --- ERROR STATE ---
  if (error && !orderStatus) {
    return (
      <div className={size === "compact" ? "" : "w-full"}>
        <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
        <button
          onClick={() => { setError(null); }}
          className={cn(
            "rounded-xl border border-border bg-white text-sm font-semibold text-foreground transition-colors hover:bg-muted",
            size === "compact" ? "px-2.5 py-1 text-[11px]" : "w-full px-4 py-3"
          )}
        >
          Try Again
        </button>
      </div>
    );
  }

  // --- COMPLETED STATE ---
  if (orderStatus === "COMPLETED") {
    const isFirstParty =
      providerType === "FIRST_PARTY" ||
      normalizeCta(providerType) === "first_party";

    // First-party Entrata products: show a neutral status callout (no Manage action).
    // Configuration for these products happens inside Entrata, not the Marketplace.
    if (isFirstParty) {
      if (size === "compact") {
        return (
          <div className="rounded-lg border border-border bg-muted px-2.5 py-1.5">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-foreground" />
              <span className="text-[11px] font-semibold text-foreground">
                Active in your account
              </span>
            </div>
          </div>
        );
      }
      return (
        <div className="rounded-xl border border-border bg-muted px-4 py-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-foreground" />
            <div>
              <div className="text-sm font-semibold text-foreground">
                Active in your account
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Contracted via your Entrata Accounts team. Configuration and settings live inside Entrata.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Third-party (PARTNER / VENDOR): secondary Manage button.
    if (size === "compact") {
      return (
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted/70"
        >
          <SlidersHorizontal className="h-3 w-3" />
          Manage
        </button>
      );
    }
    return (
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Manage
      </button>
    );
  }

  // --- PENDING STATE ---
  if (orderStatus === "PENDING") {
    if (size === "compact") {
      return (
        <button
          disabled
          className="cursor-not-allowed rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-400"
        >
          Request Submitted
        </button>
      );
    }
    return (
      <button
        disabled
        className="w-full cursor-not-allowed rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-400"
      >
        Request Submitted
      </button>
    );
  }

  // --- DEFAULT STATE ---
  function getCtaLabel(): string {
    if (ctaKey === CTA_CODES.ENABLE_FREE) return "Enable";
    if (ctaKey === CTA_CODES.PURCHASE) return "Purchase";
    if (ctaKey === CTA_CODES.START_FREE_TRIAL) return "Start Free Trial";
    return "Contact Sales";
  }

  const btnStyle = "bg-primary text-primary-foreground hover:bg-primary/90";

  if (size === "compact") {
    return (
      <>
        <button
          onClick={handleClick}
          className={cn(
            "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors",
            btnStyle,
          )}
        >
          {ctaKey === CTA_CODES.ENABLE_FREE ? "Enable" : ctaKey === CTA_CODES.PURCHASE ? "Purchase" : "Contact"}
        </button>
        <RequestConfirmationModal
          isOpen={modalOpen}
          onClose={handleModalClose}
          message={message}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={cn(
          "w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
          btnStyle,
        )}
      >
        {getCtaLabel()}
      </button>
      <RequestConfirmationModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        message={message}
      />
    </>
  );
}

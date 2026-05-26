import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "week", seconds: 604800 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
  ];
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) return `${count} ${interval.label}${count > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const PRICING_LABELS: Record<string, string> = {
  INCLUDED: "Included",
  ADD_ON: "Add-On",
  PREMIUM: "Premium",
  CUSTOM: "Custom Pricing",
};

export const CTA_LABELS: Record<string, string> = {
  ENABLE_FREE: "Enable",
  PURCHASE: "Purchase",
  CONTACT_SALES: "Contact Sales",
};

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  IN_REVIEW: "In Review",
  SECURITY_REVIEW: "Security Review",
  CHANGES_REQUESTED: "Changes Requested",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
  EXPIRED: "Expired",
  ARCHIVED: "Archived",
};

export const AI_LEVEL_LABELS: Record<string, string> = {
  L1: "L1 — Generative Assistance",
  L2: "L2 — Workflow Automation",
  L3: "L3 — Scalable Processing",
  L4: "L4 — Interactive Agents",
  L5: "L5 — Adaptive Intelligence",
};

export const L_LEVEL_SHORT: Record<string, string> = {
  L1: "L1",
  L2: "L2",
  L3: "L3",
  L4: "L4",
  L5: "L5",
};

export const PARTNER_TIER_LABELS: Record<string, string> = {
  STRATEGIC: "Strategic Partner",
  PREMIER: "Premier Partner",
  SELECT: "Select Partner",
  STANDARD: "Partner",
};

export const BILLING_LABELS: Record<string, string> = {
  MONTHLY: "/mo",
  ANNUALLY: "/yr",
  ONE_TIME: " one-time",
  PER_UNIT: "/unit/mo",
};

export const REQUEST_METHOD_LABELS: Record<string, string> = {
  EMAIL: "Email Notification",
  WEBHOOK: "API Webhook",
  REDIRECT_ENTRATA: "Redirect (Entrata URL)",
  REDIRECT_PARTNER: "Redirect (Partner URL)",
};

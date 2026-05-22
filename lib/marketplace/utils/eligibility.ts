import type { DemoProfile } from "@/lib/marketplace/utils/profiles";

/**
 * Shape of a single rule in the eligibilityRules JSON array.
 * Stored on Listing.eligibilityRules as JSON string.
 */
export interface EligibilityRule {
  type: string;
  operator?: string;
  value: string | number;
}

/**
 * Profile shape used for evaluation. Extends DemoProfile with optional
 * verticals and platformTier (see profiles.ts).
 */
export interface ProfileForEligibility {
  id: string;
  name: string;
  segment: string;
  units: number;
  description: string;
  company: string;
  /** Vertical segments (e.g. Student, Affordable, Market-rate). Used for VERTICAL rules. */
  verticals?: readonly string[] | string[];
  /** Platform tier (e.g. Enterprise, Plus, Standard). Used for PLATFORM_TIER rules. */
  platformTier?: string;
  /** Active product/module IDs. Used for ACTIVE_PRODUCT rules. */
  activeProducts?: readonly string[] | string[];
}

/**
 * Parse eligibilityRules JSON and return whether the profile satisfies all rules.
 * All rules are ANDed: if any rule fails, the listing is not eligible.
 * If there are no rules, the listing is eligible for everyone.
 */
export function evaluateEligibility(
  eligibilityRulesJson: string | null | undefined,
  profile: ProfileForEligibility
): boolean {
  if (!eligibilityRulesJson || eligibilityRulesJson.trim() === "") return true;
  let rules: EligibilityRule[];
  try {
    const parsed = JSON.parse(eligibilityRulesJson);
    if (!Array.isArray(parsed) || parsed.length === 0) return true;
    rules = parsed;
  } catch {
    return true;
  }

  for (const rule of rules) {
    if (!rule || typeof rule.type !== "string") continue;
    const pass = evaluateRule(rule, profile);
    if (!pass) return false;
  }
  return true;
}

function evaluateRule(rule: EligibilityRule, profile: ProfileForEligibility): boolean {
  const { type, operator = "=", value } = rule;
  const valueStr = String(value).trim().toLowerCase();
  const valueNum = typeof value === "number" ? value : parseFloat(String(value));

  switch (type.toUpperCase()) {
    case "VERTICAL": {
      const verticals = profile.verticals ?? [];
      if (verticals.length === 0) return false;
      return verticals.some(
        (v) => String(v).trim().toLowerCase() === valueStr
      );
    }
    case "PORTFOLIO_SIZE": {
      const units = profile.units ?? 0;
      if (operator === ">=") return units >= valueNum;
      if (operator === ">") return units > valueNum;
      if (operator === "=") return units === valueNum;
      return units >= valueNum;
    }
    case "PLATFORM_TIER": {
      const tier = (profile.platformTier ?? profile.segment ?? "").trim().toLowerCase();
      if (!tier) return false;
      return tier === valueStr;
    }
    case "ACTIVE_PRODUCT": {
      const products = profile.activeProducts ?? [];
      return products.some(
        (p) => String(p).trim().toLowerCase() === valueStr
      );
    }
    default:
      return true;
  }
}

/**
 * Filter an array of listings to only those eligible for the profile.
 * Listings must have eligibilityRules in the shape { eligibilityRules: string }.
 */
export function filterListingsByEligibility<T extends { eligibilityRules?: string | null }>(
  listings: T[],
  profile: ProfileForEligibility
): T[] {
  return listings.filter((listing) =>
    evaluateEligibility(listing.eligibilityRules ?? null, profile)
  );
}

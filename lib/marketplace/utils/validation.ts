/**
 * Shared validation helpers for API route input.
 * Enforces field-length limits, enum values, and type constraints
 * per SECURITY.md specifications.
 */

/* ------------------------------------------------------------------ */
/*  Enum sets (mirrors Prisma schema + SECURITY.md)                    */
/* ------------------------------------------------------------------ */

export const VALID_STATUS = new Set([
  "DRAFT", "SUBMITTED", "IN_REVIEW", "SECURITY_REVIEW",
  "CHANGES_REQUESTED", "APPROVED", "SCHEDULED", "PUBLISHED",
  "EXPIRED", "ARCHIVED",
]);

export const VALID_PRICING = new Set(["INCLUDED", "ADD_ON", "PREMIUM", "CUSTOM"]);

export const VALID_CTA_TYPE = new Set(["ENABLE_FREE", "PURCHASE", "CONTACT_SALES"]);

export const VALID_PROVIDER_TYPE = new Set(["FIRST_PARTY", "PARTNER", "VENDOR", "CLIENT"]);

export const VALID_REQUEST_METHOD = new Set([
  "EMAIL", "WEBHOOK", "REDIRECT_ENTRATA", "REDIRECT_PARTNER",
]);

export const VALID_BILLING_CYCLE = new Set(["MONTHLY", "ANNUALLY", "ONE_TIME", "PER_UNIT"]);

export const VALID_SLA_LEVEL = new Set(["STANDARD", "PRIORITY", "PREMIUM"]);

export const VALID_DATA_ACCESS_LEVEL = new Set(["NONE", "NO_INTEGRATION", "READ_ONLY", "READ_WRITE", "FULL_ACCESS"]);

export const VALID_ORDER_TYPE = new Set(["ACTIVATION", "PURCHASE", "SALES_INQUIRY"]);

export const VALID_L_LEVEL = new Set(["L1", "L2", "L3", "L4", "L5"]);

export const VALID_HOMEBODY_ENGINE = new Set(["A", "C"]);

export const VALID_VISIBILITY = new Set(["PRIVATE", "EXCHANGE", "PUBLIC_LISTED"]);

export const VALID_PUBLISHER_TYPE = new Set(["INTERNAL", "PARTNER", "CLIENT"]);

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function validateEnum(value: string | undefined | null, allowed: Set<string>): boolean {
  if (value === undefined || value === null) return true;
  return allowed.has(value);
}

/**
 * Returns an error message if the string exceeds maxLen, or null if valid.
 */
export function validateLength(
  fieldName: string,
  value: string | undefined | null,
  maxLen: number
): string | null {
  if (!value) return null;
  if (value.length > maxLen) {
    return `${fieldName} exceeds maximum length of ${maxLen} characters`;
  }
  return null;
}

/**
 * Validate a numeric value falls within a range.
 */
export function validateRange(
  fieldName: string,
  value: number | undefined | null,
  min: number,
  max: number
): string | null {
  if (value === undefined || value === null) return null;
  if (value < min || value > max) {
    return `${fieldName} must be between ${min} and ${max}`;
  }
  return null;
}

/**
 * Collect all validation errors for a request body.
 * Returns null if no errors, or a joined error string.
 */
export function collectErrors(errors: (string | null)[]): string | null {
  const filtered = errors.filter(Boolean) as string[];
  return filtered.length > 0 ? filtered.join("; ") : null;
}

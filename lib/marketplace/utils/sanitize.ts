/**
 * Lightweight input sanitization for the prototype.
 *
 * In production, use a battle-tested library like DOMPurify (server-side
 * via jsdom) or sanitize-html. This utility strips obvious XSS vectors
 * while preserving normal text content.
 */

const HTML_TAG_PATTERN = /<\/?[^>]+(>|$)/g;
const SCRIPT_PATTERN = /javascript\s*:/gi;
const EVENT_HANDLER_PATTERN = /\bon\w+\s*=/gi;
const DATA_URI_PATTERN = /data\s*:[^,]*;base64/gi;

/**
 * Strip HTML tags and dangerous patterns from a string.
 * Returns the cleaned string.
 */
export function sanitizeText(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .replace(HTML_TAG_PATTERN, "")
    .replace(SCRIPT_PATTERN, "")
    .replace(EVENT_HANDLER_PATTERN, "")
    .replace(DATA_URI_PATTERN, "")
    .trim();
}

/**
 * Sanitize all string values in a flat object. Non-string values are
 * passed through unchanged. Useful for sanitizing API request bodies.
 */
export function sanitizeBody<T extends Record<string, unknown>>(body: T): T {
  const cleaned = { ...body };
  for (const key of Object.keys(cleaned)) {
    const value = cleaned[key];
    if (typeof value === "string") {
      (cleaned as Record<string, unknown>)[key] = sanitizeText(value);
    }
  }
  return cleaned;
}

/**
 * Validate that a string looks like a safe URL (http/https only).
 * Returns true if valid, false otherwise.
 */
export function isValidUrl(input: string): boolean {
  if (!input) return true; // empty is allowed (optional fields)
  try {
    const url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validate an email address with a basic pattern check.
 */
export function isValidEmail(input: string): boolean {
  if (!input) return true; // empty is allowed (optional fields)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

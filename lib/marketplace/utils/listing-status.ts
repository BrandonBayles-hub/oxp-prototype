/**
 * Allowed status transitions for admin review workflow.
 * Used by POST /api/listings/[id]/status and by tests.
 */
export const LISTING_STATUS_TRANSITIONS: Record<
  string,
  { from: string; to: string }
> = {
  start_review: { from: "SUBMITTED", to: "IN_REVIEW" },
  approve: { from: "IN_REVIEW", to: "APPROVED" },
  request_changes: { from: "IN_REVIEW", to: "CHANGES_REQUESTED" },
  reject: { from: "IN_REVIEW", to: "ARCHIVED" },
  security_approve: { from: "SECURITY_REVIEW", to: "APPROVED" },
  security_reject: { from: "SECURITY_REVIEW", to: "ARCHIVED" },
  resubmit: { from: "CHANGES_REQUESTED", to: "SUBMITTED" },
  approve_after_changes: { from: "CHANGES_REQUESTED", to: "APPROVED" },
  publish: { from: "APPROVED", to: "PUBLISHED" },
  schedule: { from: "APPROVED", to: "SCHEDULED" },
  archive: { from: "PUBLISHED", to: "ARCHIVED" },
  expire: { from: "PUBLISHED", to: "EXPIRED" },
};

export type ListingStatus =
  | "SUBMITTED"
  | "IN_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "PUBLISHED"
  | "SCHEDULED"
  | "ARCHIVED"
  | "EXPIRED";

/**
 * Returns the transition for an action, or undefined if action is unknown.
 */
export function getStatusTransition(action: string): {
  from: string;
  to: string;
} | null {
  return LISTING_STATUS_TRANSITIONS[action] ?? null;
}

/**
 * Returns true if the given action is valid for the current listing status.
 */
export function canTransition(action: string, currentStatus: string): boolean {
  const t = getStatusTransition(action);
  return t !== null && t.from === currentStatus;
}

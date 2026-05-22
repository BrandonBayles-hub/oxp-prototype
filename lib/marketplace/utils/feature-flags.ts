/**
 * Centralized feature flags for the Entrata Marketplace prototype.
 *
 * PUBLIC_MARKETPLACE_ENABLED — gates all Public Marketplace surfaces
 * (admin promote/demote actions, filter options, API acceptance of
 * PUBLIC_LISTED visibility, and seed data). The underlying schema,
 * filters, and validation remain intact so re-enablement is seamless.
 *
 * Flip to `true` when leadership greenlights the public marketplace.
 */
export const PUBLIC_MARKETPLACE_ENABLED = false;

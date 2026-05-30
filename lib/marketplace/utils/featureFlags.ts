import { PUBLIC_MARKETPLACE_ENABLED } from "./feature-flags";

const COOKIE_NAME = "exchange-feature-flags";

/**
 * Static-export shim of Leo's featureFlags module.
 *
 * In Leo's prototype, feature flags were stored in a cookie and read
 * server-side via `cookies()` from `next/headers`. That doesn't work
 * with `output: 'export'`, so for the oxp-prototype embedding we just
 * return the prototype defaults at build time. The cookieStore arg is
 * accepted but ignored to preserve call-site signatures.
 */

export type LegacyFeatureFlags = {
  showRatings: boolean;
  showDownloads: boolean;
  showMetrics: boolean;
};

export type RoadmapFeatureFlags = {
  privateAppListings: boolean;
  clientViewPublishingPrivate: boolean;
  contextualDeepLinkModal: boolean;
  versionHistoryUI: boolean;
  standalonePartnerPortal: boolean;
  starRatingsAndDownloadCounts: boolean;
  partnerAnalyticsDashboard: boolean;
  metricsSpendRoi: boolean;
  fullPurchasePayments: boolean;
  publicMarketplaceTier: boolean;
  bundleScheduling: boolean;
  mediaFileUpload: boolean;
  orgPublishSettings: boolean;
  trialDays: boolean;
};

export type FeatureFlags = LegacyFeatureFlags & RoadmapFeatureFlags;

const LEGACY_DEFAULTS: LegacyFeatureFlags = {
  showRatings: false,
  showDownloads: false,
  showMetrics: false,
};

const ROADMAP_DEFAULTS: RoadmapFeatureFlags = {
  privateAppListings: false,
  clientViewPublishingPrivate: false,
  contextualDeepLinkModal: false,
  versionHistoryUI: false,
  standalonePartnerPortal: false,
  starRatingsAndDownloadCounts: false,
  partnerAnalyticsDashboard: false,
  metricsSpendRoi: false,
  fullPurchasePayments: false,
  publicMarketplaceTier: false,
  bundleScheduling: false,
  mediaFileUpload: false,
  orgPublishSettings: false,
  trialDays: true,
};

const DEFAULTS: FeatureFlags = {
  ...LEGACY_DEFAULTS,
  ...ROADMAP_DEFAULTS,
};

/**
 * Returns the prototype defaults. Ignores any cookie store passed in.
 * Signature preserved for source compatibility with Leo's call sites.
 */
export function getFeatureFlags(
  _cookieStore?: { get: (name: string) => { value: string } | undefined }
): FeatureFlags {
  return { ...DEFAULTS };
}

export const LEGACY_FEATURE_FLAG_KEYS = [
  "showRatings",
  "showDownloads",
  "showMetrics",
] as const;
export const ROADMAP_FEATURE_FLAG_KEYS = [
  "privateAppListings",
  "clientViewPublishingPrivate",
  "contextualDeepLinkModal",
  "versionHistoryUI",
  "standalonePartnerPortal",
  "starRatingsAndDownloadCounts",
  "partnerAnalyticsDashboard",
  "metricsSpendRoi",
  "fullPurchasePayments",
  "publicMarketplaceTier",
  "bundleScheduling",
  "mediaFileUpload",
  "orgPublishSettings",
  "trialDays",
] as const;
export const FEATURE_FLAG_KEYS = [
  ...LEGACY_FEATURE_FLAG_KEYS,
  ...ROADMAP_FEATURE_FLAG_KEYS,
] as const;
export { COOKIE_NAME, PUBLIC_MARKETPLACE_ENABLED };

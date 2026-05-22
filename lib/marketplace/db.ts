/**
 * Static "db" for the Entrata Marketplace storefront.
 *
 * Reads from baked-in JSON dumps produced by `scripts/dump-storefront-data.ts`
 * in Leo's prototype clone, then committed to `lib/marketplace/data/`.
 * No real database, no Prisma at build time, no server calls — everything
 * is in-memory and synchronously available, which means the storefront
 * server components in `/apps/entrata-marketplace/` can render fully at
 * static-export time.
 *
 * This is intentionally NOT a generic Prisma shim. Each helper here is
 * purpose-built for a specific call site in the storefront. When you add
 * a new query to a storefront page, add the helper here.
 */

import activationMetricsRaw from "./data/activationMetrics.json";
import bundleItemsRaw from "./data/bundleItems.json";
import bundlesRaw from "./data/bundles.json";
import categoriesRaw from "./data/categories.json";
import listingClientAccessRaw from "./data/listingClientAccess.json";
import listingPrerequisitesRaw from "./data/listingPrerequisites.json";
import listingTagsRaw from "./data/listingTags.json";
import listingUseCasesRaw from "./data/listingUseCases.json";
import listingsRaw from "./data/listings.json";
import ordersRaw from "./data/orders.json";
import orgPublishSettingsRaw from "./data/orgPublishSettings.json";
import reviewsRaw from "./data/reviews.json";
import tagsRaw from "./data/tags.json";
import useCasesRaw from "./data/useCases.json";

import type {
  ActivationMetricRow,
  Bundle,
  BundleItem,
  Category,
  HydratedBundle,
  HydratedListing,
  Listing,
  ListingClientAccessRow,
  ListingPrerequisite,
  ListingTag,
  ListingUseCase,
  Order,
  OrgPublishSettingsRow,
  Review,
  Tag,
  UseCaseRow,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────
// Raw table accessors — the JSON imports are typed by TS as `any[]` from
// the .json modules, so we re-type them here once.
// ─────────────────────────────────────────────────────────────────────────

const allCategories = categoriesRaw as Category[];
const allListings = listingsRaw as Listing[];
const allTags = tagsRaw as Tag[];
const allListingTags = listingTagsRaw as ListingTag[];
const allUseCases = useCasesRaw as UseCaseRow[];
const allListingUseCases = listingUseCasesRaw as ListingUseCase[];
const allBundles = bundlesRaw as Bundle[];
const allBundleItems = bundleItemsRaw as BundleItem[];
const allReviews = reviewsRaw as Review[];
const allOrders = ordersRaw as Order[];
const allListingPrerequisites = listingPrerequisitesRaw as ListingPrerequisite[];
const allListingClientAccess = listingClientAccessRaw as ListingClientAccessRow[];
const allOrgPublishSettings = orgPublishSettingsRaw as OrgPublishSettingsRow[];
const allActivationMetrics = activationMetricsRaw as ActivationMetricRow[];

// Visibility filter that mirrors Leo's "PUBLISHED + visible to caller" guard.
// In the static prototype, callers are always treated as the internal Entrata
// org so `EXCHANGE` and `PUBLIC_LISTED` listings are visible.
const STORE_VISIBILITY = new Set<Listing["visibility"]>([
  "EXCHANGE",
  "PUBLIC_LISTED",
]);

function isStorefrontVisible(listing: Listing): boolean {
  return (
    listing.status === "PUBLISHED" && STORE_VISIBILITY.has(listing.visibility)
  );
}

// ─────────────────────────────────────────────────────────────────────────
// JSON column parsers — Leo packed several fields as JSON strings
// (features, useCases, screenshotUrls, etc.). Wrap them safely.
// ─────────────────────────────────────────────────────────────────────────

function parseJsonArray<T = string>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function parseJsonObject<T = Record<string, unknown>>(
  raw: string | null | undefined
): T {
  if (!raw) return {} as T;
  try {
    const parsed = JSON.parse(raw);
    return (typeof parsed === "object" && parsed !== null
      ? parsed
      : {}) as T;
  } catch {
    return {} as T;
  }
}

export const parseFeatures = (l: Listing) => parseJsonArray<string>(l.features);
export const parseListingUseCases = (l: Listing) =>
  parseJsonArray<string>(l.useCases);
export const parseRoiMetrics = (l: Listing) =>
  parseJsonObject<Record<string, string | number>>(l.roiMetrics);
export const parseDomains = (l: Listing) => parseJsonArray<string>(l.domains);
export const parsePlatforms = (l: Listing) =>
  parseJsonArray<string>(l.platforms);
export const parseCertifications = (l: Listing) =>
  parseJsonArray<string>(l.certifications);
export const parseScreenshotUrls = (l: Listing) =>
  parseJsonArray<string>(l.screenshotUrls);
export const parseSetupSteps = (l: Listing) =>
  parseJsonArray<string>(l.setupSteps);
export const parseApiScopes = (l: Listing) =>
  parseJsonArray<string>(l.apiScopes);
export const parseEligibilityRules = (l: Listing) =>
  parseJsonArray<Record<string, unknown>>(l.eligibilityRules);

// ─────────────────────────────────────────────────────────────────────────
// Hydration helpers — join across tables once, cached per-call site.
// ─────────────────────────────────────────────────────────────────────────

function hydrateListing(listing: Listing): HydratedListing {
  const category = allCategories.find((c) => c.id === listing.categoryId);
  if (!category) {
    throw new Error(
      `Listing ${listing.slug} references missing category ${listing.categoryId}`
    );
  }

  const tagIds = allListingTags
    .filter((lt) => lt.listingId === listing.id)
    .map((lt) => lt.tagId);
  const tags = allTags.filter((t) => tagIds.includes(t.id));

  const useCaseIds = allListingUseCases
    .filter((luc) => luc.listingId === listing.id)
    .map((luc) => luc.useCaseId);
  const useCases = allUseCases.filter((uc) => useCaseIds.includes(uc.id));

  const reviews = allReviews.filter((r) => r.listingId === listing.id);

  const prerequisites = allListingPrerequisites
    .filter((p) => p.listingId === listing.id)
    .map((p) => {
      const prereq = allListings.find(
        (l) => l.id === p.prerequisiteListingId
      );
      return prereq
        ? { prerequisite: prereq, type: p.type, note: p.note }
        : null;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return { ...listing, category, tags, useCases, reviews, prerequisites };
}

function hydrateBundle(bundle: Bundle): HydratedBundle {
  const items = allBundleItems
    .filter((bi) => bi.bundleId === bundle.id)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((bi) => {
      const listing = allListings.find((l) => l.id === bi.listingId);
      return listing ? { listing, sortOrder: bi.sortOrder } : null;
    })
    .filter((i): i is NonNullable<typeof i> => i !== null);

  return { ...bundle, items };
}

// ─────────────────────────────────────────────────────────────────────────
// Public query helpers — one per storefront call site.
// Add a new helper here when you add a new query in a storefront page.
// ─────────────────────────────────────────────────────────────────────────

/** Home page — featured listings. */
export function listFeaturedListings(limit = 12): Listing[] {
  return allListings
    .filter(isStorefrontVisible)
    .filter((l) => l.featured)
    .sort((a, b) => b.installCount - a.installCount)
    .slice(0, limit);
}

/** Home page — newest listings. */
export function listNewListings(limit = 8): Listing[] {
  return allListings
    .filter(isStorefrontVisible)
    .filter((l) => l.isNew)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, limit);
}

/** Home page / Browse — list top-level categories ordered for display. */
export function listCategories(): Category[] {
  return [...allCategories]
    .filter((c) => c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Browse home — listing counts per category, for the index card UI. */
export function getListingCountByCategory(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const l of allListings) {
    if (!isStorefrontVisible(l)) continue;
    counts[l.categoryId] = (counts[l.categoryId] ?? 0) + 1;
  }
  return counts;
}

/** Browse [category] — find category by slug. */
export function findCategoryBySlug(slug: string): Category | null {
  return allCategories.find((c) => c.slug === slug) ?? null;
}

/** Browse [category] — list listings in a given category. */
export function listListingsByCategory(categoryId: string): Listing[] {
  return allListings
    .filter(isStorefrontVisible)
    .filter((l) => l.categoryId === categoryId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Listing detail — find by slug, fully hydrated. */
export function findListingBySlug(slug: string): HydratedListing | null {
  const listing = allListings.find((l) => l.slug === slug);
  return listing ? hydrateListing(listing) : null;
}

/** Listing detail — related listings in the same category. */
export function listRelatedListings(
  listingId: string,
  categoryId: string,
  limit = 4
): Listing[] {
  return allListings
    .filter(isStorefrontVisible)
    .filter((l) => l.categoryId === categoryId && l.id !== listingId)
    .sort((a, b) => b.installCount - a.installCount)
    .slice(0, limit);
}

/** Bundles index. */
export function listBundles(): Bundle[] {
  return [...allBundles]
    .filter((b) => b.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Bundle detail. */
export function findBundleBySlug(slug: string): HydratedBundle | null {
  const bundle = allBundles.find((b) => b.slug === slug);
  return bundle ? hydrateBundle(bundle) : null;
}

/** Bundle detail — related bundles (everything else). */
export function listRelatedBundles(bundleId: string, limit = 3): Bundle[] {
  return listBundles()
    .filter((b) => b.id !== bundleId)
    .slice(0, limit);
}

/** Explore — list use cases. */
export function listUseCases(): UseCaseRow[] {
  return [...allUseCases]
    .filter((u) => u.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Search — title/description match across listings + bundles. */
export interface SearchResults {
  listings: Listing[];
  bundles: Bundle[];
}
export function search(query: string): SearchResults {
  const q = query.trim().toLowerCase();
  if (!q) return { listings: [], bundles: [] };

  const listings = allListings
    .filter(isStorefrontVisible)
    .filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.shortDescription.toLowerCase().includes(q) ||
        l.fullDescription.toLowerCase().includes(q) ||
        l.provider.toLowerCase().includes(q)
    )
    .sort((a, b) => b.installCount - a.installCount);

  const bundles = listBundles().filter(
    (b) =>
      b.name.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q) ||
      b.shortDescription.toLowerCase().includes(q)
  );

  return { listings, bundles };
}

/** My Stack — return a stub list of "installed" apps for demo purposes. */
export function listInstalledListings(): Listing[] {
  // Demo posture: pretend the user has activated everything in completed orders.
  const installedIds = new Set(
    allOrders
      .filter((o) => o.status === "COMPLETED" && o.listingId)
      .map((o) => o.listingId as string)
  );
  return allListings.filter(
    (l) => installedIds.has(l.id) && isStorefrontVisible(l)
  );
}

/** Listing detail — count of completed activations. */
export function getInstallCount(listingId: string): number {
  return allOrders.filter(
    (o) => o.listingId === listingId && o.status === "COMPLETED"
  ).length;
}

/** Listing detail — activation metrics aggregated per listing. */
export function getActivationMetrics(listingId: string): ActivationMetricRow[] {
  return allActivationMetrics.filter((m) => m.listingId === listingId);
}

/** Listing detail — list reviews for a listing. */
export function listReviews(listingId: string): Review[] {
  return allReviews
    .filter((r) => r.listingId === listingId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

// ─────────────────────────────────────────────────────────────────────────
// Static-params helpers — for `generateStaticParams` in dynamic routes.
// ─────────────────────────────────────────────────────────────────────────

export function allListingSlugs(): string[] {
  return allListings.filter(isStorefrontVisible).map((l) => l.slug);
}

export function allBundleSlugs(): string[] {
  return listBundles().map((b) => b.slug);
}

export function allCategorySlugs(): string[] {
  return listCategories().map((c) => c.slug);
}

// ─────────────────────────────────────────────────────────────────────────
// Re-exports for convenience — types only, no value re-exports.
// ─────────────────────────────────────────────────────────────────────────

export type {
  Category,
  Listing,
  Tag,
  UseCaseRow,
  Bundle,
  BundleItem,
  Review,
  Order,
  ListingPrerequisite,
  ListingClientAccessRow,
  OrgPublishSettingsRow,
  ActivationMetricRow,
  HydratedListing,
  HydratedBundle,
} from "./types";

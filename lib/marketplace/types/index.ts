/**
 * Plain TypeScript types for the Entrata Marketplace storefront.
 * Derived from Leo's Prisma schema (entrata-product/leovargas-bot-workspace,
 * branch marketplace-color-scheme, prisma/schema.prisma).
 *
 * Dates from Prisma are JSON-serialized to ISO strings in our data dump.
 * Keep these as `string` here; convert to Date at the use site if needed.
 *
 * Embedded JSON columns from Prisma (features, useCases, roiMetrics, etc.)
 * arrive as JSON-encoded *strings* in the dump. Parsing helpers live in
 * lib/marketplace/db.ts.
 */

export type ProviderType = "FIRST_PARTY" | "PARTNER" | "VENDOR";
export type PartnerTier = "STRATEGIC" | "PREMIER" | "SELECT" | "STANDARD";
export type Pricing = "INCLUDED" | "ADD_ON" | "PREMIUM" | "CUSTOM";
export type CtaType = "ENABLE_FREE" | "PURCHASE" | "CONTACT_SALES";
export type BillingCycle = "MONTHLY" | "ANNUALLY" | "ONE_TIME" | "PER_UNIT";
export type RequestMethod = "EMAIL" | "WEBHOOK" | "REDIRECT_ENTRATA" | "REDIRECT_PARTNER";
export type Visibility = "PRIVATE" | "EXCHANGE" | "PUBLIC_LISTED";
export type PublisherType = "INTERNAL" | "PARTNER" | "CLIENT";
export type ListingStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "SECURITY_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "SCHEDULED"
  | "PUBLISHED"
  | "EXPIRED"
  | "ARCHIVED";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Listing {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  provider: string;
  providerType: ProviderType;
  partnerTier: PartnerTier | null;
  status: ListingStatus;
  shortDescription: string;
  fullDescription: string;
  /** JSON-encoded string array of feature bullets. Use db.parseFeatures(). */
  features: string;
  /** JSON-encoded string array of use cases. Use db.parseUseCases(). */
  useCases: string;
  /** JSON-encoded object of ROI metrics. Use db.parseRoiMetrics(). */
  roiMetrics: string;

  pricing: Pricing;
  pricingDetails: string | null;
  ctaType: CtaType;
  priceAmount: number | null;
  priceCurrency: string;
  billingCycle: BillingCycle | null;
  trialDays: number | null;

  requestMethod: RequestMethod;
  requestTarget: string | null;

  lLevel: string | null;
  homebodyEngine: string | null;
  /** JSON-encoded string array. Use db.parseDomains(). */
  domains: string;
  /** JSON-encoded string array. Use db.parsePlatforms(). */
  platforms: string;
  /** JSON-encoded string array. Use db.parseCertifications(). */
  certifications: string;

  iconUrl: string | null;
  /** JSON-encoded string array. Use db.parseScreenshotUrls(). */
  screenshotUrls: string;

  rating: number;
  installCount: number;
  featured: boolean;
  isNew: boolean;

  publishAt: string | null;
  expireAt: string | null;

  documentationUrl: string | null;
  setupGuideUrl: string | null;
  apiDocsUrl: string | null;
  supportEmail: string | null;
  supportUrl: string | null;
  slaLevel: string | null;
  knowledgeBaseUrl: string | null;
  /** JSON-encoded. Use db.parseSetupSteps(). */
  setupSteps: string;

  securityReviewStatus: string | null;
  dataAccessLevel: string | null;
  /** JSON-encoded. Use db.parseApiScopes(). */
  apiScopes: string;
  dataRetentionPolicy: string | null;
  securityNotes: string | null;

  /** JSON-encoded. Use db.parseEligibilityRules(). */
  eligibilityRules: string;

  submittedBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;

  ownerClientId: string;
  visibility: Visibility;
  publisherType: PublisherType;
  crossClientRequested: boolean;
  publicApprovedBy: string | null;
  publicApprovedAt: string | null;

  supersedesId: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  type: string; // DOMAIN | PLATFORM | CERTIFICATION
}

export interface ListingTag {
  id: string;
  listingId: string;
  tagId: string;
}

export interface UseCaseRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListingUseCase {
  id: string;
  listingId: string;
  useCaseId: string;
}

export interface Bundle {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  iconUrl: string | null;
  savings: string | null;
  pricing: string;
  ctaType: string;
  priceAmount: number | null;
  billingCycle: string | null;
  featured: boolean;
  isActive: boolean;
  ownerClientId: string;
  visibility: Visibility;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BundleItem {
  id: string;
  bundleId: string;
  listingId: string;
  sortOrder: number;
}

export interface Review {
  id: string;
  listingId: string;
  authorName: string;
  authorRole: string | null;
  authorCompany: string | null;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
}

export interface Order {
  id: string;
  listingId: string | null;
  bundleId: string | null;
  customerName: string;
  customerEmail: string;
  customerCompany: string;
  type: "ACTIVATION" | "PURCHASE" | "SALES_INQUIRY";
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  amount: number | null;
  billingCycle: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ListingPrerequisite {
  id: string;
  listingId: string;
  prerequisiteListingId: string;
  type: "REQUIRED" | "RECOMMENDED";
  note: string | null;
}

export interface ListingClientAccessRow {
  id: string;
  listingId: string;
  clientId: string;
  clientName: string | null;
  addedBy: string;
  addedAt: string;
  notes: string | null;
}

export interface OrgPublishSettingsRow {
  id: string;
  orgId: string;
  orgName: string;
  requireApprovalForExchange: boolean;
  allowEmployeePublishing: boolean;
  approverRole: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivationMetricRow {
  id: string;
  orderId: string;
  listingId: string;
  metricName: string;
  metricValue: number;
  metricUnit: string;
  period: string;
  measuredAt: string;
}

/**
 * Hydrated listing returned by db helpers when callers need joined data.
 *
 * `useCases` is intentionally overridden from the parent `Listing` (where
 * it's a JSON-encoded string from Prisma) to `UseCaseRow[]` (the joined
 * rows from `listingUseCases` × `useCases`). Callers who need the raw
 * JSON column can re-read it from the underlying `Listing` snapshot via
 * `db.findListingRecord(slug)`.
 */
export interface HydratedListing extends Omit<Listing, "useCases"> {
  category: Category;
  tags: Tag[];
  useCases: UseCaseRow[];
  reviews: Review[];
  prerequisites: Array<{
    prerequisite: Listing;
    type: "REQUIRED" | "RECOMMENDED";
    note: string | null;
  }>;
}

export interface HydratedBundle extends Bundle {
  items: Array<{ listing: Listing; sortOrder: number }>;
}

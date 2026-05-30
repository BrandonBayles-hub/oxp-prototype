import { notFound } from "next/navigation";
import Link from "next/link";

import { ListingCardWithFlags } from "@/components/marketplace/storefront/ListingCardWithFlags";
import { FeatureFlagsProvider } from "@/components/marketplace/storefront/FeatureFlagsProvider";
import { ProfileProvider } from "@/components/marketplace/storefront/ProfileContext";
import { ListingTabs } from "./listing-tabs";
import { UseCasesList } from "./UseCasesList";

import {
  cn,
  formatCurrency,
  timeAgo,
  PRICING_LABELS,
  BILLING_LABELS,
} from "@/lib/marketplace/utils/utils";
import { CtaButtonInteractive } from "@/components/marketplace/storefront/CtaButtonInteractive";
import { ScreenshotCarousel } from "@/components/marketplace/storefront/ScreenshotCarousel";
import { Badge } from "@/components/marketplace/ui/Badge";
import {
  findListingBySlug,
  listRelatedListings,
  allListingSlugs,
} from "@/lib/marketplace/db";
import { getFeatureFlags } from "@/lib/marketplace/utils/featureFlags";
import { DEFAULT_PROFILE_ID } from "@/lib/marketplace/utils/profiles";
import {
  ChevronRight,
  Clock,
  ExternalLink,
  Mail,
  BookOpen,
  Code2,
  HelpCircle,
  CheckCircle2,
  Calendar,
  ShieldCheck,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Static export                                                      */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  return allListingSlugs().map((slug) => ({ slug }));
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

interface StructuredFeature {
  title: string;
  description?: string;
}

function parseFeatures(raw: unknown[]): StructuredFeature[] {
  return raw.map((item) => {
    if (typeof item === "string") return { title: item };
    if (typeof item === "object" && item !== null && "title" in item) {
      const obj = item as { title: string; description?: string };
      return { title: obj.title, description: obj.description };
    }
    return { title: String(item) };
  });
}

interface StructuredSetupStep {
  stepNumber: number;
  title: string;
  instruction?: string;
}

function parseSetupSteps(raw: unknown[]): StructuredSetupStep[] {
  return raw.map((item, i) => {
    if (typeof item === "string")
      return { stepNumber: i + 1, title: item };
    if (typeof item === "object" && item !== null) {
      const obj = item as { stepNumber?: number; title?: string; instruction?: string };
      return {
        stepNumber: obj.stepNumber ?? i + 1,
        title: obj.title ?? String(item),
        instruction: obj.instruction,
      };
    }
    return { stepNumber: i + 1, title: String(item) };
  });
}

function normalizeCtaType(ctaType: string): string {
  return ctaType.trim().toLowerCase();
}

const ICON_COLORS = [
  "bg-warm-light text-warm-dark",
  "bg-primary/10 text-primary",
  "bg-secondary text-secondary-foreground",
  "bg-muted text-muted-foreground",
];

function getIconColor(name: string) {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return ICON_COLORS[hash % ICON_COLORS.length];
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function ListingDetailPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const listing = findListingBySlug(slug);
  if (!listing) notFound();

  const flags = getFeatureFlags();
  const relatedListings = listRelatedListings(listing.id, listing.categoryId, 4);

  // Parse JSON-packed columns. `useCases` is hydrated from the link table
  // by findListingBySlug() (replaces the raw JSON string from Prisma).
  const rawFeatures = safeJsonParse<unknown[]>(listing.features, []);
  const features = parseFeatures(rawFeatures);
  const useCases = listing.useCases.map((uc) => ({ name: uc.name }));
  const roiMetrics = safeJsonParse<Record<string, string>>(listing.roiMetrics, {});
  const rawSetupSteps = safeJsonParse<unknown[]>(listing.setupSteps, []);
  const setupSteps = parseSetupSteps(rawSetupSteps);
  const apiScopes = safeJsonParse<string[]>(listing.apiScopes, []);
  const screenshotUrls = safeJsonParse<string[]>(listing.screenshotUrls ?? "[]", []);

  const iconColor = getIconColor(listing.name);
  // In my db.ts shape, `listing.tags` is Tag[] (flat). Filter by tag.type.
  const platformTags = listing.tags.filter((t) => t.type === "PLATFORM");
  const isPrivateListing = (listing.visibility ?? "").toLowerCase() === "private";
  const normalizedCtaType = normalizeCtaType(listing.ctaType);

  return (
    <ProfileProvider initialProfileId={DEFAULT_PROFILE_ID}>
      <FeatureFlagsProvider initialFlags={flags}>
        <div className="min-h-screen bg-background">
          {/* Breadcrumb */}
          <nav className="border-b border-border bg-muted/30">
            <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/apps/entrata-marketplace" className="transition-colors hover:text-foreground">
                  Marketplace
                </Link>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                <Link href="/apps/entrata-marketplace/browse" className="transition-colors hover:text-foreground">
                  Categories
                </Link>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                <Link
                  href={`/apps/entrata-marketplace/browse/${listing.category.slug}`}
                  className="transition-colors hover:text-foreground"
                >
                  {listing.category.name}
                </Link>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium text-foreground">{listing.name}</span>
              </div>
            </div>
          </nav>

          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* ── Main Column (2/3) ─────────────────────────────────── */}
              <div className="space-y-8 lg:col-span-2">
                {/* Header */}
                <div className="flex items-start gap-5">
                  <div className="relative shrink-0">
                    <div
                      className={cn(
                        "flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold",
                        listing.iconUrl ? "bg-white border border-border" : iconColor
                      )}
                    >
                      {listing.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={listing.iconUrl} alt={listing.name} className="h-full w-full rounded-2xl object-contain p-1.5" />
                      ) : listing.name[0]}
                    </div>
                    {isPrivateListing && (
                      <div
                        className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary"
                        aria-hidden
                      >
                        <ShieldCheck className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="text-2xl font-bold text-foreground">
                        {listing.name}
                      </h1>
                      {listing.featured && (
                        <Badge variant="featured" size="sm">
                          Featured
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {listing.provider}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Screenshots */}
                {screenshotUrls.length > 0 && (
                  <ScreenshotCarousel urls={screenshotUrls} name={listing.name} />
                )}

                {/* Tabs */}
                <ListingTabs
                  tabs={[
                    {
                      id: "overview",
                      label: "Overview",
                      content: (
                        <OverviewTab
                          fullDescription={listing.fullDescription}
                          useCases={useCases}
                          roiMetrics={roiMetrics}
                          showMetrics={flags.showMetrics}
                        />
                      ),
                    },
                    {
                      id: "features",
                      label: "Features",
                      content: (
                        <FeaturesTab
                          features={features}
                          dataAccessLevel={listing.dataAccessLevel}
                          apiScopes={apiScopes}
                        />
                      ),
                    },
                    {
                      id: "pricing",
                      label: "Pricing",
                      content: (
                        <PricingTab
                          pricing={listing.pricing}
                          pricingDetails={listing.pricingDetails}
                          priceAmount={listing.priceAmount}
                          billingCycle={listing.billingCycle}
                          trialDays={listing.trialDays}
                        />
                      ),
                    },
                    {
                      id: "setup",
                      label: "Setup & Docs",
                      content: (
                        <SetupTab
                          setupSteps={setupSteps}
                          documentationUrl={listing.documentationUrl}
                          apiDocsUrl={listing.apiDocsUrl}
                          knowledgeBaseUrl={listing.knowledgeBaseUrl}
                          setupGuideUrl={listing.setupGuideUrl}
                          supportEmail={listing.supportEmail}
                          supportUrl={listing.supportUrl}
                          slaLevel={listing.slaLevel}
                        />
                      ),
                    },
                  ]}
                />
              </div>

              {/* ── Sidebar (1/3) ─────────────────────────────────────── */}
              <div className="space-y-6">
                {/* Quick Facts */}
                <div className="space-y-4 rounded-xl border border-border bg-white p-5">
                  <h3 className="text-sm font-semibold text-foreground">
                    Quick Facts
                  </h3>
                  <div className="space-y-3">
                    <QuickFact
                      label="Last Updated"
                      value={timeAgo(new Date(listing.updatedAt))}
                    />
                    <QuickFact label="Provider" value={listing.provider} />
                    <QuickFact label="Category" value={listing.category.name} />
                    {platformTags.length > 0 && (
                      <QuickFact label="Platforms">
                        <div className="flex flex-wrap gap-1">
                          {platformTags.map((tag) => (
                            <span
                              key={tag.id}
                              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </QuickFact>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <CtaButtonInteractive
                  ctaType={normalizedCtaType}
                  provider={listing.provider}
                  providerType={listing.providerType}
                  listingId={listing.id}
                  listingName={listing.name}
                  trialDays={listing.trialDays}
                  requestMethod={listing.requestMethod}
                  requestTarget={listing.requestTarget ?? undefined}
                />

                {/* Prerequisites */}
                {listing.prerequisites.length > 0 && (
                  <div className="rounded-xl border border-border bg-white p-5">
                    <h3 className="mb-3 text-sm font-semibold text-foreground">
                      Prerequisites
                    </h3>
                    <div className="space-y-2.5">
                      {listing.prerequisites.map((prereq, i) => (
                        <div
                          key={`${prereq.prerequisite.id}-${i}`}
                          className="flex items-center justify-between gap-2"
                        >
                          <Link
                            href={`/apps/entrata-marketplace/listing/${prereq.prerequisite.slug}`}
                            className="truncate text-sm text-primary hover:underline"
                          >
                            {prereq.prerequisite.name}
                          </Link>
                          <Badge variant={prereq.type === "REQUIRED" ? "warning" : "neutral"}>
                            {prereq.type === "REQUIRED" ? "Required" : "Recommended"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related in Category */}
                {relatedListings.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-foreground">
                      More in {listing.category.name}
                    </h3>
                    <div className="space-y-3">
                      {relatedListings.slice(0, 3).map((rel) => (
                        <ListingCardWithFlags key={rel.id} listing={rel} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </FeatureFlagsProvider>
    </ProfileProvider>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab Content Components                                             */
/* ------------------------------------------------------------------ */

function OverviewTab({
  fullDescription,
  useCases,
  roiMetrics,
  showMetrics = false,
}: {
  fullDescription: string;
  useCases: Array<string | { title?: string; name?: string; description?: string }>;
  roiMetrics: Record<string, string>;
  showMetrics?: boolean;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        {fullDescription.split("\n\n").map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-muted-foreground">
            {p}
          </p>
        ))}
      </div>

      {useCases.length > 0 && (
        <UseCasesList useCases={useCases} defaultVisibleCount={5} />
      )}

      {showMetrics && Object.keys(roiMetrics).length > 0 && (
        <div>
          <h3 className="mb-3 text-base font-semibold text-foreground">
            ROI Metrics
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.entries(roiMetrics).map(([key, value]) => (
              <div
                key={key}
                className="rounded-lg border border-border bg-muted/30 p-4"
              >
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {key}
                </div>
                <div className="mt-1 text-lg font-semibold text-foreground">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FeaturesTab({
  features,
  dataAccessLevel,
  apiScopes,
}: {
  features: StructuredFeature[];
  dataAccessLevel: string | null;
  apiScopes: string[];
}) {
  return (
    <div className="space-y-6">
      {features.length > 0 && (
        <ul className="space-y-2">
          {features.map((feature, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {feature.description ? (
                <span>
                  <span className="font-medium text-foreground">{feature.title}</span>
                  <span className="block mt-0.5 text-muted-foreground">
                    {feature.description}
                  </span>
                </span>
              ) : (
                feature.title
              )}
            </li>
          ))}
        </ul>
      )}

      {dataAccessLevel && dataAccessLevel !== "NONE" && dataAccessLevel !== "NO_INTEGRATION" && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            Data Access Level
          </h3>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
              dataAccessLevel === "READ_ONLY"
                ? "border-border bg-muted text-muted-foreground"
                : dataAccessLevel === "READ_WRITE"
                  ? "border-primary/20 bg-primary/10 text-primary"
                  : dataAccessLevel === "FULL_ACCESS"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-gray-200 bg-gray-50 text-gray-600"
            )}
          >
            {dataAccessLevel.replace(/_/g, " ")}
          </span>
        </div>
      )}

      {apiScopes.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            API Scopes
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {apiScopes.map((scope) => (
              <code
                key={scope}
                className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground"
              >
                {scope}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PricingTab({
  pricing,
  pricingDetails,
  priceAmount,
  billingCycle,
  trialDays,
}: {
  pricing: string;
  pricingDetails: string | null;
  priceAmount: number | null;
  billingCycle: string | null;
  trialDays: number | null;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border p-6">
        <div className="text-lg font-semibold text-foreground">
          {pricing === "INCLUDED"
            ? "Included with your Entrata subscription"
            : priceAmount != null
              ? `${formatCurrency(priceAmount)}${billingCycle ? (BILLING_LABELS[billingCycle] ?? "") : ""}`
              : (PRICING_LABELS[pricing] ?? pricing)}
        </div>
        {pricingDetails && (
          <p className="mt-2 text-sm text-muted-foreground">
            {pricingDetails}
          </p>
        )}
        {billingCycle && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Billed {billingCycle.toLowerCase().replace(/_/g, " ")}
          </div>
        )}
        {trialDays != null && trialDays > 0 && (
          <div className="mt-2 flex items-center gap-2 text-sm text-primary">
            <Clock className="h-4 w-4" />
            {trialDays}-day free trial
          </div>
        )}
      </div>
    </div>
  );
}

function SetupTab({
  setupSteps,
  documentationUrl,
  apiDocsUrl,
  knowledgeBaseUrl,
  setupGuideUrl,
  supportEmail,
  supportUrl,
  slaLevel,
}: {
  setupSteps: StructuredSetupStep[];
  documentationUrl: string | null;
  apiDocsUrl: string | null;
  knowledgeBaseUrl: string | null;
  setupGuideUrl: string | null;
  supportEmail: string | null;
  supportUrl: string | null;
  slaLevel: string | null;
}) {
  const hasDocLinks = documentationUrl || apiDocsUrl || knowledgeBaseUrl || setupGuideUrl;
  const hasSupport = supportEmail || supportUrl || slaLevel;

  return (
    <div className="space-y-6">
      {setupSteps.length > 0 && (
        <div>
          <h3 className="mb-3 text-base font-semibold text-foreground">
            Setup Steps
          </h3>
          <ol className="space-y-3">
            {setupSteps.map((step) => (
              <li
                key={step.stepNumber}
                className="flex items-start gap-3 text-sm text-muted-foreground"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {step.stepNumber}
                </span>
                <span>
                  <span className="font-medium text-foreground">{step.title}</span>
                  {step.instruction && (
                    <span className="block mt-0.5 text-muted-foreground">
                      {step.instruction}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {hasDocLinks && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {documentationUrl && (
            <DocLink href={documentationUrl} icon={BookOpen} label="Documentation" />
          )}
          {apiDocsUrl && (
            <DocLink href={apiDocsUrl} icon={Code2} label="API Documentation" />
          )}
          {knowledgeBaseUrl && (
            <DocLink href={knowledgeBaseUrl} icon={HelpCircle} label="Knowledge Base" />
          )}
          {setupGuideUrl && (
            <DocLink href={setupGuideUrl} icon={BookOpen} label="Setup Guide" />
          )}
        </div>
      )}

      {hasSupport && (
        <div>
          <h3 className="mb-3 text-base font-semibold text-foreground">
            Support
          </h3>
          <div className="space-y-2 rounded-lg border border-border p-4">
            {slaLevel && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  slaLevel === "PREMIUM"
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : slaLevel === "PRIORITY"
                      ? "border-primary/20 bg-primary/10 text-primary"
                      : "border-border bg-muted text-muted-foreground"
                )}
              >
                {slaLevel} SLA
              </span>
            )}
            {supportEmail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <a
                  href={`mailto:${supportEmail}`}
                  className="transition-colors hover:text-primary"
                >
                  {supportEmail}
                </a>
              </div>
            )}
            {supportUrl && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ExternalLink className="h-4 w-4" />
                <a
                  href={supportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-primary"
                >
                  Support Portal
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared Small Components                                            */
/* ------------------------------------------------------------------ */

function QuickFact({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children ?? (
        <span className="text-right text-sm font-medium text-foreground">
          {value}
        </span>
      )}
    </div>
  );
}

function DocLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 rounded-lg border border-border p-3 text-sm font-medium text-foreground transition-colors hover:border-primary/20 hover:bg-muted"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
      <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
    </a>
  );
}

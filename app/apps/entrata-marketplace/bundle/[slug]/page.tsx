import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Package,
  Check,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

import { FeatureFlagsProvider } from "@/components/marketplace/storefront/FeatureFlagsProvider";
import { ProfileProvider } from "@/components/marketplace/storefront/ProfileContext";
import { CtaButtonInteractive } from "@/components/marketplace/storefront/CtaButtonInteractive";
import { Badge } from "@/components/marketplace/ui/Badge";
import { formatCurrency, BILLING_LABELS } from "@/lib/marketplace/utils/utils";
import {
  findBundleBySlug,
  listRelatedBundles,
  allBundleSlugs,
} from "@/lib/marketplace/db";
import { getFeatureFlags } from "@/lib/marketplace/utils/featureFlags";
import { DEFAULT_PROFILE_ID } from "@/lib/marketplace/utils/profiles";

export function generateStaticParams() {
  return allBundleSlugs().map((slug) => ({ slug }));
}

export default async function BundleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bundle = findBundleBySlug(slug);
  if (!bundle) notFound();

  const flags = getFeatureFlags();
  const relatedBundles = listRelatedBundles(bundle.id, 3);

  const individualTotal = bundle.items.reduce(
    (sum, item) => sum + (item.listing.priceAmount ?? 0),
    0
  );
  const description = bundle.description?.trim() || bundle.shortDescription;

  return (
    <ProfileProvider initialProfileId={DEFAULT_PROFILE_ID}>
      <FeatureFlagsProvider initialFlags={flags}>
        <div className="min-h-screen bg-white">
          {/* Breadcrumb */}
          <div className="border-b border-border bg-muted/30">
            <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
              <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Link href="/apps/entrata-marketplace" className="transition-colors hover:text-foreground">
                  Marketplace
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <Link href="/apps/entrata-marketplace/bundles" className="transition-colors hover:text-foreground">
                  Bundles
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{bundle.name}</span>
              </nav>
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Main */}
              <div className="space-y-8 lg:col-span-2">
                <div className="flex items-start gap-5">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Package className="h-8 w-8" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="text-2xl font-bold text-foreground">{bundle.name}</h1>
                      {bundle.featured && <Badge variant="featured" size="sm">Featured</Badge>}
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">{bundle.shortDescription}</p>
                  </div>
                </div>

                {description && (
                  <div className="space-y-3">
                    {description.split("\n\n").map((p, i) => (
                      <p key={i} className="text-sm leading-relaxed text-muted-foreground">{p}</p>
                    ))}
                  </div>
                )}

                <div>
                  <h2 className="mb-3 text-base font-semibold text-foreground">
                    What&apos;s in this bundle
                  </h2>
                  <ul className="space-y-3">
                    {bundle.items.map((item) => (
                      <li
                        key={item.listing.id}
                        className="flex items-start gap-3 rounded-lg border border-border bg-white p-4"
                      >
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/apps/entrata-marketplace/listing/${item.listing.slug}`}
                            className="block truncate text-sm font-semibold text-foreground hover:text-primary"
                          >
                            {item.listing.name}
                          </Link>
                          <p className="mt-0.5 text-xs text-muted-foreground">{item.listing.provider}</p>
                          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                            {item.listing.shortDescription}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <div className="rounded-xl border border-border bg-white p-5">
                  <h3 className="text-sm font-semibold text-foreground">Pricing</h3>
                  {bundle.priceAmount != null && (
                    <p className="mt-3 text-2xl font-bold text-foreground">
                      {formatCurrency(bundle.priceAmount)}
                      {bundle.billingCycle ? (BILLING_LABELS[bundle.billingCycle] ?? "") : ""}
                    </p>
                  )}
                  {individualTotal > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Individually: {formatCurrency(individualTotal)}
                    </p>
                  )}
                  {bundle.savings && (
                    <p className="mt-1 text-xs font-medium text-success-foreground">
                      Save {bundle.savings}
                    </p>
                  )}
                </div>

                <CtaButtonInteractive
                  ctaType={(bundle.ctaType ?? "purchase").toLowerCase()}
                  provider="Entrata"
                  providerType="FIRST_PARTY"
                  listingId={bundle.id}
                  listingName={bundle.name}
                  trialDays={null}
                  requestMethod="EMAIL"
                />

                {relatedBundles.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-foreground">More bundles</h3>
                    <div className="space-y-2">
                      {relatedBundles.map((rb) => (
                        <Link
                          key={rb.id}
                          href={`/apps/entrata-marketplace/bundle/${rb.slug}`}
                          className="flex items-center justify-between rounded-lg border border-border bg-white p-3 text-sm transition-colors hover:bg-muted/40"
                        >
                          <span className="truncate font-medium text-foreground">{rb.name}</span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {bundle.items.length === 0 && (
              <div className="mt-12 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-20">
                <AlertCircle className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-4 text-sm text-muted-foreground">
                  This bundle doesn&apos;t have any items yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </FeatureFlagsProvider>
    </ProfileProvider>
  );
}

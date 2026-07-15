"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import Link from "next/link";
import { Search as SearchIcon, ArrowRight } from "lucide-react";

import { ListingCard } from "@/components/marketplace/storefront/ListingCard";
import { BundleCard } from "@/components/marketplace/storefront/BundleCard";
import { FeatureFlagsProvider } from "@/components/marketplace/storefront/FeatureFlagsProvider";
import { ProfileProvider } from "@/components/marketplace/storefront/ProfileContext";
import { search } from "@/lib/marketplace/db";
import bundleItems from "@/lib/marketplace/data/bundleItems.json";
import { getFeatureFlags } from "@/lib/marketplace/utils/featureFlags";
import { DEFAULT_PROFILE_ID } from "@/lib/marketplace/utils/profiles";

/**
 * Search page — client-side because static export cannot read query
 * parameters at build time. `useSearchParams()` reads them at runtime
 * after hydration; the page renders empty results until the query loads.
 */

const bundleItemsTyped = bundleItems as Array<{ bundleId: string }>;
function getItemCount(bundleId: string): number {
  return bundleItemsTyped.filter((bi) => bi.bundleId === bundleId).length;
}

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const results = useMemo(() => search(q), [q]);

  if (!q) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-20">
        <SearchIcon className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-4 text-sm text-muted-foreground">
          Use the search box on the marketplace home to find listings.
        </p>
      </div>
    );
  }

  const hasResults = results.listings.length > 0 || results.bundles.length > 0;
  if (!hasResults) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-20">
        <SearchIcon className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-4 text-sm font-medium text-foreground">
          No results for &ldquo;{q}&rdquo;
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try a different keyword or browse all categories.
        </p>
        <Link
          href="/apps/entrata-marketplace/browse"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Browse Categories
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <p className="text-sm text-muted-foreground">
        {results.listings.length + results.bundles.length} result
        {results.listings.length + results.bundles.length !== 1 ? "s" : ""} for{" "}
        <span className="font-medium text-foreground">&ldquo;{q}&rdquo;</span>
      </p>

      {results.listings.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Listings</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {results.bundles.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Bundles</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.bundles.map((bundle) => (
              <BundleCard
                key={bundle.id}
                bundle={{
                  id: bundle.id,
                  name: bundle.name,
                  slug: bundle.slug,
                  shortDescription: bundle.shortDescription,
                  savings: bundle.savings,
                  priceAmount: bundle.priceAmount,
                  billingCycle: bundle.billingCycle,
                  _count: { items: getItemCount(bundle.id) },
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function SearchPage() {
  const flags = getFeatureFlags();

  return (
    <ProfileProvider initialProfileId={DEFAULT_PROFILE_ID}>
      <FeatureFlagsProvider initialFlags={flags}>
        <div className="min-h-screen bg-background">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="mb-8">
              <Link
                href="/apps/entrata-marketplace"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                Back to Marketplace
              </Link>
              <h1 className="mt-4 text-3xl font-bold text-foreground">Search</h1>
            </div>

            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-20">
                  <p className="text-sm text-muted-foreground">Loading…</p>
                </div>
              }
            >
              <SearchResults />
            </Suspense>
          </div>
        </div>
      </FeatureFlagsProvider>
    </ProfileProvider>
  );
}

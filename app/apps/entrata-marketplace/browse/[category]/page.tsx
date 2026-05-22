import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { ListingCardWithFlags } from "@/components/marketplace/storefront/ListingCardWithFlags";
import { FeatureFlagsProvider } from "@/components/marketplace/storefront/FeatureFlagsProvider";
import { ProfileProvider } from "@/components/marketplace/storefront/ProfileContext";
import {
  findCategoryBySlug,
  listListingsByCategory,
  listCategories,
  allCategorySlugs,
} from "@/lib/marketplace/db";
import { formatNumber } from "@/lib/marketplace/utils/utils";
import { filterListingsByEligibility } from "@/lib/marketplace/utils/eligibility";
import { getFeatureFlags } from "@/lib/marketplace/utils/featureFlags";
import { DEFAULT_PROFILE_ID, getProfileById } from "@/lib/marketplace/utils/profiles";

/**
 * Note: Leo's source had a rich filter/sort UI driven by `searchParams`.
 * That doesn't translate cleanly to a static export — the page is built
 * once with no params, so the filter UI would have no effect on the
 * pre-rendered HTML. For this static preview we render an unfiltered
 * listing grid plus subcategory chips. A future iteration could move the
 * filter UI into a "use client" component that reads `useSearchParams()`.
 */

export function generateStaticParams() {
  return allCategorySlugs().map((category) => ({ category }));
}

export default async function CategoryBrowsePage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: categorySlug } = await params;
  const category = findCategoryBySlug(categorySlug);
  if (!category) notFound();

  const flags = getFeatureFlags();
  const profile = getProfileById(DEFAULT_PROFILE_ID);

  const subCategories = listCategories().filter(
    (c) => c.parentId === category.id
  );
  const directListings = listListingsByCategory(category.id);
  const childListings = subCategories.flatMap((sub) =>
    listListingsByCategory(sub.id)
  );

  const allListings = [...directListings, ...childListings];
  // De-dupe by id in case of overlap.
  const dedupedListings = Array.from(
    new Map(allListings.map((l) => [l.id, l])).values()
  );
  const eligibleListings = filterListingsByEligibility(dedupedListings, profile);

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
                <span className="font-medium text-foreground">{category.name}</span>
              </div>
            </div>
          </nav>

          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-foreground">{category.name}</h1>
              {category.description && (
                <p className="mt-2 text-muted-foreground">{category.description}</p>
              )}
              <p className="mt-2 text-sm text-muted-foreground">
                {formatNumber(eligibleListings.length)} listing
                {eligibleListings.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Subcategory chips */}
            {subCategories.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {subCategories.map((sub) => {
                  const count = listListingsByCategory(sub.id).length;
                  return (
                    <span
                      key={sub.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground"
                    >
                      {sub.name}
                      <span className="text-[10px] text-muted-foreground/60">{count}</span>
                    </span>
                  );
                })}
              </div>
            )}

            {eligibleListings.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-20">
                <p className="text-sm text-muted-foreground">
                  No listings in this category yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {eligibleListings.map((listing) => (
                  <ListingCardWithFlags key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </div>
        </div>
      </FeatureFlagsProvider>
    </ProfileProvider>
  );
}

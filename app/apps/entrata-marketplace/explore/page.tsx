import Link from "next/link";
import { Compass, ArrowRight } from "lucide-react";

import { FeatureFlagsProvider } from "@/components/marketplace/storefront/FeatureFlagsProvider";
import { ProfileProvider } from "@/components/marketplace/storefront/ProfileContext";
import { ListingCardWithFlags } from "@/components/marketplace/storefront/ListingCardWithFlags";
import {
  listUseCases,
  listCategories,
  listListingsByCategory,
} from "@/lib/marketplace/db";
import { getFeatureFlags } from "@/lib/marketplace/utils/featureFlags";
import { DEFAULT_PROFILE_ID } from "@/lib/marketplace/utils/profiles";
import { filterListingsByEligibility } from "@/lib/marketplace/utils/eligibility";
import { getProfileById } from "@/lib/marketplace/utils/profiles";

/**
 * Explore — Leo's source has a complex filter/sort UI driven by cookies
 * and searchParams. For the static port we render the use-cases list and
 * a featured slice of every category's listings.
 */
export default function ExplorePage() {
  const flags = getFeatureFlags();
  const profile = getProfileById(DEFAULT_PROFILE_ID);
  const useCases = listUseCases();
  const categories = listCategories().filter((c) => c.parentId === null);

  const sections = categories.map((cat) => {
    const listings = filterListingsByEligibility(
      listListingsByCategory(cat.id),
      profile
    ).slice(0, 3);
    return { category: cat, listings };
  });

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
              <h1 className="mt-4 text-3xl font-bold text-foreground">Explore</h1>
              <p className="mt-2 text-muted-foreground">
                Discover capabilities organized by use case and category.
              </p>
            </div>

            {useCases.length > 0 && (
              <section className="mb-10">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Use cases</h2>
                <div className="flex flex-wrap gap-2">
                  {useCases.map((uc) => (
                    <span
                      key={uc.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground"
                    >
                      <Compass className="h-3.5 w-3.5" />
                      {uc.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <div className="space-y-12">
              {sections
                .filter((s) => s.listings.length > 0)
                .map(({ category, listings }) => (
                  <section key={category.id}>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-foreground">{category.name}</h2>
                      <Link
                        href={`/apps/entrata-marketplace/browse/${category.slug}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        View all
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {listings.map((listing) => (
                        <ListingCardWithFlags key={listing.id} listing={listing} />
                      ))}
                    </div>
                  </section>
                ))}
            </div>
          </div>
        </div>
      </FeatureFlagsProvider>
    </ProfileProvider>
  );
}

import Link from "next/link";
import { Box, ArrowRight } from "lucide-react";

import { FeatureFlagsProvider } from "@/components/marketplace/storefront/FeatureFlagsProvider";
import { ProfileProvider } from "@/components/marketplace/storefront/ProfileContext";
import { ListingCardWithFlags } from "@/components/marketplace/storefront/ListingCardWithFlags";
import { listInstalledListings } from "@/lib/marketplace/db";
import { getFeatureFlags } from "@/lib/marketplace/utils/featureFlags";
import { DEFAULT_PROFILE_ID, getProfileById } from "@/lib/marketplace/utils/profiles";

/**
 * My Stack — listings the active demo profile has "installed" (i.e. has a
 * completed order for in the seed data). For static export this is a
 * frozen snapshot.
 */
export default function MyStackPage() {
  const flags = getFeatureFlags();
  const profile = getProfileById(DEFAULT_PROFILE_ID);
  const installed = listInstalledListings();

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
              <h1 className="mt-4 text-3xl font-bold text-foreground">My Stack</h1>
              <p className="mt-2 text-muted-foreground">
                Apps and capabilities currently active in {profile.name}.
              </p>
            </div>

            {installed.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-20">
                <Box className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-4 text-sm font-medium text-foreground">
                  Nothing in your stack yet
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Browse the marketplace and activate something to see it here.
                </p>
                <Link
                  href="/apps/entrata-marketplace/browse"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Browse Marketplace
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {installed.map((listing) => (
                  <ListingCardWithFlags key={listing.id} listing={listing} isActive />
                ))}
              </div>
            )}
          </div>
        </div>
      </FeatureFlagsProvider>
    </ProfileProvider>
  );
}

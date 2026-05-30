import {
  Search,
  Brain,
  Home,
  Puzzle,
  Settings,
  Database,
  Building,
  ArrowRight,
  Sparkles,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { ListingCardWithFlags } from "@/components/marketplace/storefront/ListingCardWithFlags";
import { FeaturedCarousel } from "@/components/marketplace/storefront/FeaturedCarousel";
import { FeatureFlagsProvider } from "@/components/marketplace/storefront/FeatureFlagsProvider";
import { ProfileProvider } from "@/components/marketplace/storefront/ProfileContext";

import {
  listCategories,
  listFeaturedListings,
  listNewListings,
  listListingsByCategory,
} from "@/lib/marketplace/db";
import { formatNumber } from "@/lib/marketplace/utils/utils";
import { filterListingsByEligibility } from "@/lib/marketplace/utils/eligibility";
import { getFeatureFlags } from "@/lib/marketplace/utils/featureFlags";
import { DEFAULT_PROFILE_ID, getProfileById } from "@/lib/marketplace/utils/profiles";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Brain,
  Home,
  Puzzle,
  Settings,
  Database,
  Building,
};

export default function MarketplacePage() {
  const flags = getFeatureFlags();
  const profile = getProfileById(DEFAULT_PROFILE_ID);

  // Static data, computed at build time from baked-in JSON.
  const allCategories = listCategories();
  const topCategories = allCategories.slice(0, 6);

  // Total counts shown in the hero bar.
  const totalListings = allCategories.reduce(
    (sum, cat) => sum + listListingsByCategory(cat.id).length,
    0
  );
  const aiCategory = allCategories.find((c) => c.slug === "ai-platform");
  const aiCount = aiCategory ? listListingsByCategory(aiCategory.id).length : 0;
  // Active orders count is a flavor stat; use the demo number from seed data.
  const activeOrders = 8;

  const featuredListings = listFeaturedListings(24);
  const newListings = listNewListings(18);

  // Profile-flavored eligibility filtering. In Leo's prototype the eligibility
  // helper accepts a profile (segment, verticals, platform tier, units) and
  // a list of listings (with `eligibilityRules` JSON column) and returns the
  // listings the profile is eligible to install.
  const featuredEligible = filterListingsByEligibility(
    featuredListings,
    profile
  ).slice(0, 8);
  const newEligible = filterListingsByEligibility(newListings, profile);
  const newNoteworthyListings =
    newEligible.length > 0 ? newEligible.slice(0, 6) : newEligible.slice(0, 6);

  // "Active in <profile>" demo signal: which featured listings already have a
  // completed order from the active profile? Static-data approximation.
  const activeListingIds = new Set<string>();

  return (
    <ProfileProvider initialProfileId={DEFAULT_PROFILE_ID}>
      <FeatureFlagsProvider initialFlags={flags}>
        <div className="min-h-screen">
          {/* Hero */}
          <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-white via-white to-muted/50">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #0f172a 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 text-center sm:px-6 lg:px-8">
              <p
                className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium shadow-sm backdrop-blur"
                style={{ borderColor: "rgba(204,0,0,0.2)", background: "rgba(204,0,0,0.05)", color: "#CC0000" }}
                aria-hidden
              >
                <Sparkles className="h-4 w-4" style={{ color: "#CC0000" }} />
                The Entrata Ecosystem
              </p>
              <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                <span className="text-entrata">Entrata</span> Marketplace
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Discover apps and capabilities for your properties.
              </p>

              <div className="mx-auto mt-6 flex items-center justify-center gap-2 sm:gap-4">
                {[
                  { label: "Published Capabilities", value: totalListings, icon: BarChart3 },
                  { label: `Active in ${profile.name}`, value: activeOrders, icon: CheckCircle2 },
                  { label: "AI-Powered", value: aiCount, icon: Brain },
                ].map((stat, i) => (
                  <div key={stat.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                    {i > 0 && <span className="h-4 w-px bg-border" />}
                    <stat.icon className="h-4 w-4 shrink-0" />
                    <span className="font-bold text-foreground">{formatNumber(stat.value)}</span>
                    <span>{stat.label}</span>
                  </div>
                ))}
              </div>

              <form action="/apps/entrata-marketplace/search" method="GET" className="mx-auto mt-8 max-w-2xl">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    name="q"
                    placeholder="Search capabilities, integrations, and services..."
                    className="w-full rounded-xl border border-border bg-white py-3.5 pl-12 pr-20 text-base text-foreground shadow-sm transition-shadow placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 select-none items-center gap-0.5 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
                    ⌘K
                  </kbd>
                </div>
              </form>
            </div>
          </section>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Categories */}
            {topCategories.length > 0 && (
              <section className="py-12">
                <SectionHeader title="Browse by Category" href="/apps/entrata-marketplace/browse" />
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {topCategories.map((cat) => {
                    const IconComponent =
                      CATEGORY_ICONS[cat.icon ?? ""] ?? Database;
                    const count = listListingsByCategory(cat.id).length;
                    return (
                      <Link
                        key={cat.id}
                        href={`/apps/entrata-marketplace/browse/${cat.slug}`}
                        className="group flex items-start gap-4 rounded-xl border border-border bg-white p-5 transition-all hover:shadow-md hover:border-entrata/30"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-entrata/5 text-entrata transition-colors group-hover:bg-entrata/10">
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">
                            {cat.name}
                          </h3>
                          <span className="mt-1.5 inline-block text-xs font-medium text-muted-foreground">
                            {count} listing{count !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* New & Noteworthy */}
            {newNoteworthyListings.length > 0 && (
              <section className="border-t border-border py-12">
                <SectionHeader title="New & Noteworthy" />
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {newNoteworthyListings.map((listing) => (
                    <ListingCardWithFlags
                      key={listing.id}
                      listing={listing}
                      isActive={activeListingIds.has(listing.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Featured Partners */}
          {featuredEligible.length > 0 && (
            <section className="border-t border-border">
              <FeaturedCarousel listings={featuredEligible} />
            </section>
          )}
        </div>
      </FeatureFlagsProvider>
    </ProfileProvider>
  );
}

function SectionHeader({
  title,
  href,
  icon: Icon,
}: {
  title: string;
  href?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-primary" />}
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

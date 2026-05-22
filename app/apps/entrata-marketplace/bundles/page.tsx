import Link from "next/link";
import { Package, ArrowRight } from "lucide-react";

import { BundleCard } from "@/components/marketplace/storefront/BundleCard";
import { listBundles } from "@/lib/marketplace/db";
import bundleItems from "@/lib/marketplace/data/bundleItems.json";

const bundleItemsTyped = bundleItems as Array<{ bundleId: string }>;

function getItemCount(bundleId: string): number {
  return bundleItemsTyped.filter((bi) => bi.bundleId === bundleId).length;
}

export default function BundlesPage() {
  const bundles = [...listBundles()].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });

  const featuredBundles = bundles.filter((b) => b.featured);
  const otherBundles = bundles.filter((b) => !b.featured);

  return (
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
          <h1 className="mt-4 text-3xl font-bold text-foreground">Bundles</h1>
          <p className="mt-2 text-muted-foreground">
            Curated bundles of capabilities and integrations to get more value from the Marketplace.
          </p>
        </div>

        {bundles.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-20">
            <Package className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-4 text-sm font-medium text-foreground">No bundles yet</p>
          </div>
        ) : (
          <div className="space-y-10">
            {featuredBundles.length > 0 && (
              <section>
                <h2 className="mb-4 text-lg font-semibold text-foreground">Featured Bundles</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {featuredBundles.map((bundle) => (
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

            {otherBundles.length > 0 && (
              <section>
                <h2 className="mb-4 text-lg font-semibold text-foreground">
                  {featuredBundles.length > 0 ? "More Bundles" : "All Bundles"}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {otherBundles.map((bundle) => (
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
        )}
      </div>
    </div>
  );
}

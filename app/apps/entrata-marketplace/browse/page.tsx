import Link from "next/link";
import {
  Brain,
  Home,
  Puzzle,
  Settings,
  Database,
  Building,
  ChevronRight,
} from "lucide-react";

import { listCategories, listListingsByCategory } from "@/lib/marketplace/db";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain,
  Home,
  Puzzle,
  Settings,
  Database,
  Building,
};

export default function BrowsePage() {
  const allCategories = listCategories();
  const topLevel = allCategories.filter((c) => c.parentId === null);

  type CategoryWithChildren = (typeof topLevel)[number] & {
    children: Array<{
      id: string;
      slug: string;
      name: string;
      listingCount: number;
    }>;
    listingCount: number;
    totalListings: number;
  };

  const categories: CategoryWithChildren[] = topLevel.map((cat) => {
    const children = allCategories
      .filter((c) => c.parentId === cat.id)
      .map((sub) => ({
        id: sub.id,
        slug: sub.slug,
        name: sub.name,
        listingCount: listListingsByCategory(sub.id).length,
      }));
    const listingCount = listListingsByCategory(cat.id).length;
    const totalListings =
      listingCount + children.reduce((sum, c) => sum + c.listingCount, 0);
    return { ...cat, children, listingCount, totalListings };
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Browse the Ecosystem</h1>
          <p className="mt-2 text-muted-foreground">
            Browse every capability, integration, and service available on the Entrata platform by Marketplace category.
          </p>
        </div>

        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-20">
            <Database className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-4 text-sm font-medium text-foreground">
              No categories available
            </p>
            <Link
              href="/apps/entrata-marketplace"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Back to Marketplace
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.icon ?? ""] ?? Brain;
              return (
                <div
                  key={cat.id}
                  className="rounded-xl border border-border bg-white transition-shadow hover:shadow-md"
                >
                  <Link
                    href={`/apps/entrata-marketplace/browse/${cat.slug}`}
                    className="group flex items-start justify-between p-6 transition-colors hover:border-entrata/30"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-entrata/5 text-entrata transition-colors group-hover:bg-entrata/10">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {cat.name}
                        </h3>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors group-hover:bg-muted group-hover:border-entrata/30">
                      View all {cat.totalListings}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>

                  {cat.children.length > 0 && (
                    <div className="flex flex-wrap gap-2 border-t border-border px-6 pb-4 pt-3">
                      {cat.children.map((sub) => (
                        <Link
                          key={sub.id}
                          href={`/apps/entrata-marketplace/browse/${cat.slug}?subcategory=${sub.slug}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/20 hover:text-foreground"
                        >
                          {sub.name}
                          <span className="text-[10px] text-muted-foreground/60">
                            {sub.listingCount}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

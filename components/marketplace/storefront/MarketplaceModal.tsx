"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Search,
  X,
  ExternalLink,
  Package,
  ArrowRight,
  Star,
} from "lucide-react";
import { cn, formatCurrency, BILLING_LABELS } from "@/lib/marketplace/utils/utils";
import { CtaButtonInteractive } from "./CtaButtonInteractive";
import { Badge, pricingToVariant } from "@/components/marketplace/ui/Badge";

interface ModalListing {
  id: string;
  name: string;
  slug: string;
  provider: string;
  providerType: string;
  partnerTier: string | null;
  shortDescription: string;
  pricing: string;
  ctaType: string;
  priceAmount: number | null;
  billingCycle: string | null;
  rating: number;
  installCount: number;
  iconUrl: string | null;
  requestMethod: string;
  requestTarget: string | null;
}

interface ModalBundle {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  savings: string | null;
  featured: boolean;
}

interface MarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  listings: ModalListing[];
  bundles: ModalBundle[];
  title: string;
  context: string;
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

const PRICING_LABELS: Record<string, string> = {
  INCLUDED: "Included",
  ADD_ON: "Add-On",
  PREMIUM: "Premium",
  CUSTOM: "Custom",
};

function MiniPricingBadge({
  pricing,
  priceAmount,
  billingCycle,
}: {
  pricing: string;
  priceAmount: number | null;
  billingCycle: string | null;
}) {
  let label = PRICING_LABELS[pricing] ?? pricing;
  if (pricing === "ADD_ON" && priceAmount != null) {
    label = `${formatCurrency(priceAmount)}${billingCycle ? (BILLING_LABELS[billingCycle] ?? "") : "/mo"}`;
  }
  return <Badge variant={pricingToVariant(pricing)}>{label}</Badge>;
}

function MiniCtaButton({
  ctaType,
  provider,
  providerType,
  listingId,
  requestMethod,
  requestTarget,
}: {
  ctaType: string;
  provider: string;
  providerType: string;
  listingId: string;
  requestMethod: string;
  requestTarget: string | null;
}) {
  return (
    <CtaButtonInteractive
      ctaType={ctaType}
      provider={provider}
      providerType={providerType}
      listingId={listingId}
      requestMethod={requestMethod}
      requestTarget={requestTarget ?? undefined}
      size="compact"
    />
  );
}

const VISIBLE_COUNT = 6;

export function MarketplaceModal({
  isOpen,
  onClose,
  listings,
  bundles,
  title,
  context,
}: MarketplaceModalProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return listings;
    const q = search.toLowerCase();
    return listings.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.shortDescription.toLowerCase().includes(q) ||
        l.provider.toLowerCase().includes(q)
    );
  }, [listings, search]);

  const filteredBundles = useMemo(() => {
    if (!search.trim()) return bundles;
    const q = search.toLowerCase();
    return bundles.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.shortDescription.toLowerCase().includes(q)
    );
  }, [bundles, search]);

  const visible = filtered.slice(0, VISIBLE_COUNT);
  const totalFiltered = filtered.length + filteredBundles.length;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200">
          <div className="flex max-h-[80vh] flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-foreground">
                  {title}
                </Dialog.Title>
                <Link
                  href={context === "all" ? "/apps/entrata-marketplace/search" : `/apps/entrata-marketplace/browse/ai-capabilities?domain=${context}`}
                  className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Open in Marketplace
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <Dialog.Close asChild>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            {/* Search */}
            <div className="border-b border-border px-6 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter capabilities..."
                  className="w-full rounded-lg border border-border bg-muted/50 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Bundle row */}
              {filteredBundles.length > 0 && (
                <div className="mb-5">
                  <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Package className="h-3.5 w-3.5" />
                    Bundles
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {filteredBundles.map((bundle) => (
                      <Link
                        key={bundle.id}
                        href={`/apps/entrata-marketplace/bundle/${bundle.slug}`}
                        onClick={onClose}
                        className="group flex min-w-[220px] flex-col rounded-xl border border-border bg-white p-3.5 transition-all hover:shadow-md hover:border-primary/20"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <Package className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-xs font-semibold text-foreground group-hover:text-primary">
                              {bundle.name}
                            </h4>
                          </div>
                        </div>
                        {bundle.savings && (
                          <span className="mt-2 inline-flex w-fit items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            {bundle.savings}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Compact listing grid */}
              {visible.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visible.map((listing) => {
                    const iconColor = getIconColor(listing.name);
                    return (
                      <Link
                        key={listing.id}
                        href={`/apps/entrata-marketplace/listing/${listing.slug}`}
                        onClick={onClose}
                        className="group flex items-center gap-3 rounded-xl border border-border bg-white p-3 transition-all hover:shadow-md hover:border-primary/20"
                      >
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                            listing.iconUrl ? "bg-white border border-border" : iconColor
                          )}
                        >
                          {listing.iconUrl ? (
                            <img src={listing.iconUrl} alt={listing.name} className="h-full w-full rounded-lg object-contain p-0.5" />
                          ) : listing.name[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-xs font-semibold text-foreground group-hover:text-primary">
                            {listing.name}
                          </h4>
                          <div className="mt-1 flex items-center gap-1.5">
                            <MiniPricingBadge
                              pricing={listing.pricing}
                              priceAmount={listing.priceAmount}
                              billingCycle={listing.billingCycle}
                            />
                            {listing.rating > 0 && (
                              <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                <Star className="h-2.5 w-2.5 fill-primary text-primary" />
                                {listing.rating.toFixed(1)}
                              </div>
                            )}
                          </div>
                        </div>
                        <MiniCtaButton
                          ctaType={listing.ctaType}
                          provider={listing.provider}
                          providerType={listing.providerType}
                          listingId={listing.id}
                          requestMethod={listing.requestMethod}
                          requestTarget={listing.requestTarget}
                        />
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    No capabilities match your filter.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border px-6 py-3">
              <span className="text-xs text-muted-foreground">
                Showing {visible.length} of {totalFiltered} result
                {totalFiltered !== 1 ? "s" : ""}
              </span>
              <Link
                href={context === "all" ? "/apps/entrata-marketplace/search" : `/apps/entrata-marketplace/browse/ai-capabilities?domain=${context}`}
                onClick={onClose}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                Open full marketplace
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

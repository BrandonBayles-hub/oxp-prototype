import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  Star,
  Download,
  CheckCircle2,
} from "lucide-react";
import {
  cn,
  formatNumber,
  PRICING_LABELS,
} from "@/lib/marketplace/utils/utils";
import { ListingIcon } from "./ListingIcon";
import { Badge, pricingToVariant } from "@/components/marketplace/ui/Badge";

export interface ListingCardProps {
  showRating?: boolean;
  showDownloads?: boolean;
  isActive?: boolean;
  listing: {
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
    requestMethod?: string;
    requestTarget?: string | null;
    visibility?: string;
    isNew?: boolean;
    featured?: boolean;
  };
}

function PricingBadge({ pricing }: { pricing: string }) {
  const label = PRICING_LABELS[pricing] ?? pricing;
  return <Badge variant={pricingToVariant(pricing)}>{label}</Badge>;
}

export function ListingCard({
  listing,
  showRating = false,
  showDownloads = false,
  isActive = false,
}: ListingCardProps) {
  return (
    <Link
      href={`/apps/entrata-marketplace/listing/${listing.slug}`}
      className="group relative flex h-full flex-col rounded-xl border border-border bg-white p-4 transition-all hover:shadow-md hover:border-primary/20"
    >
      {listing.featured && (
        <Badge variant="featured" className="absolute right-3 top-3 shadow-sm">
          Featured
        </Badge>
      )}
      <div className="flex items-start gap-3">
        <div className="relative">
          <ListingIcon name={listing.name} iconUrl={listing.iconUrl} />
          {listing.visibility === "PRIVATE" && (
            <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-2.5 w-2.5" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={cn(
            "truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary",
            listing.featured && "pr-20"
          )}>
            {listing.name}
          </h3>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="truncate text-xs text-muted-foreground">
              {listing.provider}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {listing.shortDescription}
      </p>

      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        {isActive ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-foreground">
            <CheckCircle2 className="h-3 w-3" />
            Active
          </span>
        ) : (
          <PricingBadge pricing={listing.pricing} />
        )}
        <div className="flex items-center gap-2.5">
          {showRating && listing.rating > 0 && (
            <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-primary text-primary" />
              <span>{listing.rating.toFixed(1)}</span>
            </div>
          )}
          {showDownloads && listing.installCount > 0 && (
            <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Download className="h-3 w-3" />
              <span>{formatNumber(listing.installCount)}</span>
            </div>
          )}
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
        </div>
      </div>
    </Link>
  );
}

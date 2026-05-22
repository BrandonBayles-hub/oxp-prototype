import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import { formatCurrency, BILLING_LABELS } from "@/lib/marketplace/utils/utils";
import { Badge } from "@/components/marketplace/ui/Badge";

interface BundleCardProps {
  bundle: {
    id: string;
    name: string;
    slug: string;
    shortDescription: string;
    savings: string | null;
    priceAmount?: number | null;
    billingCycle?: string | null;
    _count: { items: number };
  };
}

export function BundleCard({ bundle }: BundleCardProps) {
  const priceLabel =
    bundle.priceAmount != null &&
    bundle.priceAmount > 0
      ? `${formatCurrency(bundle.priceAmount)}${bundle.billingCycle ? (BILLING_LABELS[bundle.billingCycle] ?? "/mo") : ""}`
      : null;

  return (
    <Link
      href={`/apps/entrata-marketplace/bundle/${bundle.slug}`}
      className="group flex min-w-[280px] flex-col rounded-xl border border-border bg-white p-5 transition-all hover:shadow-md hover:border-primary/20"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Package className="h-5 w-5 text-primary" />
        </div>
        {bundle.savings && (
          <Badge variant="included" size="sm">
            {bundle.savings}
          </Badge>
        )}
      </div>

      <h3 className="mt-3 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
        {bundle.name}
      </h3>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {bundle.shortDescription}
      </p>

      {priceLabel && (
        <p className="mt-2 text-sm font-semibold text-foreground">
          {priceLabel}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between pt-4">
        <span className="text-xs text-muted-foreground">
          {bundle._count.items} item{bundle._count.items !== 1 ? "s" : ""}{" "}
          included
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
          View Bundle <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

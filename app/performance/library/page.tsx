"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import {
  ELI_DASHBOARDS,
  ELI_DASHBOARD_ORDER,
  getSparklineValues,
  type EliAgentSlug,
} from "@/lib/eli-library";
import { Sparkline } from "@/components/eli-library/sparkline";

const CATEGORY_COLORS: Record<string, string> = {
  ai: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

function EliDashboardCard({ slug }: { slug: EliAgentSlug }) {
  const d = ELI_DASHBOARDS[slug];
  return (
    <Link href={`/performance/library/${slug}`} className="group">
      <div className="relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl transition-all shadow-sm overflow-hidden hover:border-[hsl(var(--foreground))]/20 hover:shadow-md">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[hsl(var(--foreground))] via-[hsl(var(--foreground))]/60 to-[hsl(var(--foreground))]/30" />
        <div className="p-5 pt-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--foreground))]/5 shrink-0">
              {d.iconSrc && (
                <Image src={d.iconSrc} alt="" width={16} height={16} className="opacity-80" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold truncate">{d.title}</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xxs font-semibold rounded-full bg-cyan-50 text-cyan-700 shrink-0">
                  <Sparkles className="h-2.5 w-2.5" />
                  ELI+
                </span>
              </div>
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 text-xxs font-medium rounded-full border capitalize",
                CATEGORY_COLORS["ai"] || "bg-muted text-muted-foreground",
              )}>
                AI
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">
            {d.description}
          </p>

          <div className="flex items-end justify-between gap-4 pt-3 border-t border-[hsl(var(--border))]/60">
            <div>
              <p className="text-xxs font-semibold text-muted-foreground">
                {d.headlineKpi.label}
              </p>
              <p className="text-lg font-semibold tracking-tight">{d.headlineKpi.value}</p>
              <p className="text-xxs text-muted-foreground">{d.headlineKpi.sub}</p>
            </div>
            <Sparkline values={getSparklineValues(slug.charCodeAt(7))} className="opacity-60" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function LibraryPage() {
  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            Report Library
            <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-xxs font-semibold uppercase tracking-wider text-muted-foreground">
              v0.5
            </span>
          </span>
        }
        description="Browse dashboards and reports — from ELI+ agent impact to portfolio-wide analytics."
      />

      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-cyan-600" />
          <h2 className="text-sm font-semibold tracking-tight">ELI+ Agent Impact Dashboards</h2>
          <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-xxs font-semibold uppercase tracking-wider text-cyan-700">
            Live
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ELI_DASHBOARD_ORDER.map((slug) => (
            <EliDashboardCard key={slug} slug={slug} />
          ))}
        </div>
      </section>
    </>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { PageTop } from "@/components/app-shell/page-top";
import {
  ELI_DASHBOARDS,
  ELI_DASHBOARD_ORDER,
  getSparklineValues,
  type EliAgentSlug,
} from "@/lib/eli-library";
import { Sparkline } from "@/components/eli-library/sparkline";

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
              </div>
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
      <PageTop
        title={
          <>
            ELI+ Legacy Library
            <span className="rounded-full bg-muted px-2 py-0.5 text-xxs font-semibold text-foreground/70">
              v0.5
            </span>
          </>
        }
        description="Browse dashboards and reports — from ELI+ agent impact to portfolio-wide analytics."
      />

      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold tracking-tight">ELI+ Agent Impact Dashboards</h2>
          <span className="rounded-full bg-status-success px-2 py-0.5 text-xxs font-semibold text-status-success-foreground">
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

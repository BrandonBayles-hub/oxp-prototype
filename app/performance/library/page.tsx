"use client";

import Link from "next/link";
import Image from "next/image";
import { DeltaPill } from "@/components/performance";
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
      <div className="rounded-xl border border-border bg-card shadow-sm transition-all hover:border-foreground/20 hover:shadow-md">
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
            <div className="min-w-0 flex-1">
              <p className="text-xxs font-semibold text-muted-foreground">
                {d.headlineKpi.label}
              </p>
              {/* The delta sits on the value's baseline as a semantic badge,
                  the same shape it takes on every other card in the family. It
                  used to be plain text buried in the sub-line, where it carried
                  no colour and read as part of the caption. */}
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="text-lg font-semibold tracking-tight">{d.headlineKpi.value}</p>
                {d.headlineKpi.delta ? (
                  <DeltaPill
                    value={d.headlineKpi.delta}
                    lowerIsBetter={d.headlineKpi.lowerIsBetter}
                  />
                ) : null}
              </div>
              <p className="text-xxs text-muted-foreground">{d.headlineKpi.sub}</p>
            </div>
            <Sparkline values={getSparklineValues(slug.charCodeAt(7))} width={56} className="shrink-0" />
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
        // With the tab strip gone (Tyler 08/05/2026) the library is a
        // sub-page, and the breadcrumb is the way back to Performance.
        crumb={{ root: { label: "Performance", href: "/performance" }, page: "ELI+ Legacy Library" }}
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

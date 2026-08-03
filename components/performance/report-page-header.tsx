"use client";

import * as React from "react";

import { PageTop } from "@/components/app-shell/page-top";

/**
 * The masthead for every ELI+ agent report.
 *
 * Built on the platform's PageTop "quiet strip" (ported from entrata-3.0), so
 * these reports use the same page-top grammar as the rest of the product:
 * breadcrumb → title → description → hairline.
 *
 * Two problems this solves beyond matching 3.0:
 *
 *  1. The filter bar was landing at a different vertical position on each
 *     report (280 / 309 / 340px), so it visibly jumped when navigating
 *     between agents. The cause was upstream of the bar — the "Back to
 *     Performance" link was a bordered 34px button on one page and a 16px
 *     text link on another. Owning the whole header block fixes the start
 *     position everywhere.
 *
 *  2. Titles were hand-typed per page, and maintenance was missing the
 *     "ELI+" prefix. Composing the title here makes that structural.
 *
 * The back link is gone: the breadcrumb is the way back, and unlike a back
 * link it also says where you are.
 */
export function ReportPageHeader({
  agent,
  description,
  titleSuffix = "Performance & Impact",
  eliMarkSrc = "/eli-cube.svg",
  showEliMark = true,
  actions,
  className,
}: {
  /** Agent name only, e.g. "Renewals AI" — the ELI+ prefix is added here. */
  agent: string;
  description: string;
  titleSuffix?: string;
  eliMarkSrc?: string;
  showEliMark?: boolean;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <PageTop
      crumb={{ root: { label: "Performance", href: "/performance" }, page: agent }}
      title={
        <>
          {showEliMark ? (
            <img src={eliMarkSrc} alt="" width={22} height={22} className="shrink-0" />
          ) : null}
          {`ELI+ ${agent} — ${titleSuffix}`}
        </>
      }
      description={description}
      actions={actions}
      // The sticky filter bar directly below carries its own bottom border,
      // so a second hairline here would double it.
      divider={false}
      className={className}
    />
  );
}

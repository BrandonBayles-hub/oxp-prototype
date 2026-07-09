import { notFound } from "next/navigation";
import {
  ELI_DASHBOARD_ORDER,
  getDashboard,
  type DashboardBlock,
  type EliDashboard,
} from "@/lib/eli-library";
import { LibraryDashboardView } from "./dashboard-view";

export function generateStaticParams() {
  return ELI_DASHBOARD_ORDER.map((slug) => ({ slug }));
}

export const dynamicParams = false;

function isNewMetricBlock(block: DashboardBlock): boolean {
  return Boolean(block.isNew || block.config?.isNew);
}

/** Payments AI library view: hide metrics tagged New until they graduate. */
function withoutNewMetrics(dashboard: EliDashboard): EliDashboard {
  return {
    ...dashboard,
    blocks: dashboard.blocks.filter((block) => !isNewMetricBlock(block)),
  };
}

export default async function LibraryDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const eliDashboard = getDashboard(slug);
  if (!eliDashboard) {
    notFound();
  }

  const dashboard =
    slug === "bi-eli-payments-ai"
      ? withoutNewMetrics(eliDashboard)
      : eliDashboard;

  return <LibraryDashboardView dashboard={dashboard} />;
}

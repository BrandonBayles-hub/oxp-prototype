import { notFound } from "next/navigation";
import { ELI_DASHBOARD_ORDER, getDashboard } from "@/lib/eli-library";
import { LibraryDashboardView } from "./dashboard-view";

export function generateStaticParams() {
  return ELI_DASHBOARD_ORDER.map((slug) => ({ slug }));
}

export const dynamicParams = false;

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

  return <LibraryDashboardView dashboard={eliDashboard} />;
}

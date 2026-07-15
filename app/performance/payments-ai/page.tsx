import { notFound } from "next/navigation";
import { getDashboard } from "@/lib/eli-library";
import { FilteredEliDashboard } from "../filtered-eli-dashboard";

export default function PaymentsAiDashboardPage() {
  const dashboard = getDashboard("bi-eli-payments-ai");
  if (!dashboard) {
    notFound();
  }

  return (
    <FilteredEliDashboard
      dashboard={dashboard}
      backHref="/performance"
      backLabel="Back to Performance"
    />
  );
}

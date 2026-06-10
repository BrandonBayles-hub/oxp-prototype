import { Suspense } from "react";
import { TrainingsSopContent } from "../trainings-sop/page";

// "Trainings" surface: forces the Trainings (Entrata Academy) tab.
// The SOPs surface lives at /sops-knowledge. The legacy combined route
// /trainings-sop is preserved for backward-compatible deep links.
export default function TrainingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <TrainingsSopContent forcedTab="trainings" />
    </Suspense>
  );
}

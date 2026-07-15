import { Suspense } from "react";
import { TrainingsSopContent } from "../trainings-sop/page";

// "SOPs & Knowledge" surface: forces the SOPs tab so the Document
// Library / Compliance / Activity tabs render directly. The Trainings
// surface lives at /trainings. The legacy combined route /trainings-sop
// is preserved for any in-flight deep links and for the document detail
// route /trainings-sop/detail.
export default function SopsKnowledgePage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <TrainingsSopContent forcedTab="sops" />
    </Suspense>
  );
}

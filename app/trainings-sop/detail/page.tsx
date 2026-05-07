import { Suspense } from "react";
import { TrainingsSopDetailClient } from "./TrainingsSopDetailClient";

export default function TrainingsSopDetailPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <TrainingsSopDetailClient />
    </Suspense>
  );
}

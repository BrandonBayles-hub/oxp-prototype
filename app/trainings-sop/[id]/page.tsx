import { TrainingsSopDetailClient } from "./TrainingsSopDetailClient";

// Document ids from vault seed data (lib/vault-context INITIAL_DOCS). Required for static export.
const STATIC_DOCUMENT_IDS = ["1", "2", "3", "4", "5"];

export function generateStaticParams() {
  return STATIC_DOCUMENT_IDS.map((id) => ({ id }));
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function TrainingsSopDetailPage(_props: PageProps) {
  return <TrainingsSopDetailClient />;
}

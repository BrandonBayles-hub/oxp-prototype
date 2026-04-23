import { PlaybookDetailClient } from "./PlaybookDetailClient";

// Ids for playbooks that exist in seed data (lib/playbooks-context). Required for static export.
const STATIC_PLAYBOOK_IDS = [
  "pb-1", "pb-2", "pb-3", "pb-4", "pb-5", "pb-6", "pb-7", "pb-8", "pb-9", "pb-10",
  "pb-11", "pb-12", "pb-13",
];

export function generateStaticParams() {
  return STATIC_PLAYBOOK_IDS.map((id) => ({ id }));
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function PlaybookDetailPage({ params }: PageProps) {
  return <PlaybookDetailClient />;
}

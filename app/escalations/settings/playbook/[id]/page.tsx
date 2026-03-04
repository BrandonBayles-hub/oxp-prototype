import { PlaybookTemplateDetailClient } from "./PlaybookTemplateDetailClient";

// Playbook template ids from lib/playbook-templates-data SEED_PLAYBOOK_TEMPLATES. Required for static export.
const STATIC_PLAYBOOK_TEMPLATE_IDS = ["pbt-1", "pbt-2", "pbt-3", "pbt-4", "pbt-5", "pbt-6"];

export function generateStaticParams() {
  return STATIC_PLAYBOOK_TEMPLATE_IDS.map((id) => ({ id }));
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function PlaybookTemplateDetailPage(_props: PageProps) {
  return <PlaybookTemplateDetailClient />;
}

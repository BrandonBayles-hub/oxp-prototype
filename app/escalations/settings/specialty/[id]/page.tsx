import { SpecialtyDetailClient } from "./SpecialtyDetailClient";

// Specialty ids from lib/specialties-data SPECIALTIES. Required for static export.
const STATIC_SPECIALTY_IDS = [
  "onsite-leasing",
  "centralized-leasing",
  "onsite-maintenance",
  "centralized-maintenance",
  "renewals",
  "compliance",
  "accounting",
];

export function generateStaticParams() {
  return STATIC_SPECIALTY_IDS.map((id) => ({ id }));
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function SpecialtyDetailPage(_props: PageProps) {
  return <SpecialtyDetailClient />;
}

// Force dynamic so this route is never statically pre-rendered (avoids pulling in Recharts during build/SSR).
export const dynamic = "force-dynamic";

export default function PerformanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

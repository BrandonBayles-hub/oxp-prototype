"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRole } from "@/lib/role-context";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { isRouteAllowed } = useRole();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === "/") return;
    if (!isRouteAllowed(pathname)) {
      router.replace("/command-center");
    }
  }, [pathname, isRouteAllowed, router]);

  if (pathname !== "/" && !isRouteAllowed(pathname)) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Access restricted</p>
        <p>Your role does not have access to this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}

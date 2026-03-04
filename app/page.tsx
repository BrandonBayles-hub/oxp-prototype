"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSetup } from "@/lib/setup-context";

export default function Home() {
  const router = useRouter();
  const { goLiveComplete } = useSetup();

  useEffect(() => {
    router.replace(goLiveComplete ? "/command-center" : "/getting-started");
  }, [router, goLiveComplete]);

  const target = goLiveComplete ? "/command-center" : "/getting-started";
  const label = goLiveComplete ? "Command Center" : "Getting Started";

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
      <p>Redirecting to {label}…</p>
      <Link href={target} className="text-primary underline hover:no-underline">
        Go to {label}
      </Link>
    </div>
  );
}

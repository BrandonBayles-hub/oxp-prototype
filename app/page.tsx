"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/command-center");
  }, [router]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
      <p>Redirecting to Command Center…</p>
      <Link href="/command-center" className="text-primary underline hover:no-underline">
        Go to Command Center
      </Link>
    </div>
  );
}

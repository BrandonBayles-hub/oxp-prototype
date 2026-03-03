"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "An error occurred. Check the browser Console (F12) for details."}
      </p>
      <Button onClick={reset} variant="default">
        Try again
      </Button>
      <Link href="/" className="text-sm text-primary underline hover:no-underline">
        Back to home
      </Link>
    </div>
  );
}

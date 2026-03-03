import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <p className="text-[length:var(--text-body)] font-medium text-[hsl(var(--foreground))]">
        This page could not be found.
      </p>
      <Link
        href="/"
        className="text-[length:var(--text-body)] font-medium text-[hsl(var(--foreground))] underline hover:no-underline"
      >
        Go to home
      </Link>
    </div>
  );
}

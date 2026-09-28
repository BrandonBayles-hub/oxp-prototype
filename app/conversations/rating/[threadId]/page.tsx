import { ThreadRatingClient } from "./ThreadRatingClient";

/**
 * Static-export pre-render list for the ELI+ score full-evaluation page.
 *
 * The build is `output: "export"`, so every dynamic route must
 * enumerate the concrete params it wants baked into the static bundle.
 * These IDs mirror the seed conversations in
 * `lib/conversations-context.tsx` (Communications inbox `lc-*`, SA 1.2
 * breakout demo threads, and the SA 1.2 marquee `sa-1` thread).
 *
 * The client component itself renders a graceful "not found" state for
 * any id that isn't in demo state at runtime, so an incomplete list
 * only affects deep-link pre-rendering, not the app's resilience.
 */
const STATIC_THREAD_IDS = [
  // Communications inbox (lib/conversations-context.tsx seed order)
  "lc-1",
  "lc-2",
  "lc-3",
  "lc-4",
  "lc-5",
  "lc-6",
  "lc-7",
  "lc-8",
  "lc-9",
  "lc-10",
  "lc-11",
  "lc-12",
  "lc-13",
  "lc-14",
  "lc-15",
  "lc-16",
  "lc-17",
  "lc-18",
  "lc-20",
  "lc-22",
  // SA 1.2 marquee thread
  "sa-1",
  // SA 1.2 "Breakout example" demo threads
  "breakouts-1",
  "breakouts-2",
  "breakouts-3",
  "breakouts-4",
  "breakouts-5",
  "breakouts-6",
  "breakouts-7",
  "breakouts-8",
  "breakouts-9",
  "breakouts-10",
];

export function generateStaticParams() {
  return STATIC_THREAD_IDS.map((threadId) => ({ threadId }));
}

type PageProps = {
  params: Promise<{ threadId: string }>;
};

export default function ThreadRatingPage({ params }: PageProps) {
  return <ThreadRatingClient params={params} />;
}

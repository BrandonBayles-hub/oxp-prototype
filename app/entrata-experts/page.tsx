"use client";

import { useRouter } from "next/navigation";
import { ChatFirstHub } from "@/components/entrata-experts-v2/chat-first-hub";

// Entrata Experts is now a chat-first surface, full-bleed under the OXP top
// nav. AppShell hides its sidebar for this route (see NO_SIDEBAR_ROUTES) and
// drops page-content padding (FULL_BLEED_ROUTES) so the page's own
// ExpertsRail can replace the OXP main sidebar without competing chrome.
//
// The "← OXP Studio" back button in the rail navigates to /command-center —
// the natural OXP landing page — bringing the OXP main sidebar back with it.
export default function EntrataExpertsPage() {
  const router = useRouter();
  return (
    <ChatFirstHub onExitFocus={() => router.push("/command-center")} />
  );
}

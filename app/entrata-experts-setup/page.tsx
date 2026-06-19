"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * Entrata Experts setup has moved onto the Entrata Experts page itself — the
 * chat-first hub now hosts a "Setup" tab (peer to Tokens & Usage and Admin
 * Insights) that renders the same ExpertsConfigPanel.
 *
 * This route is kept as a thin redirect so existing links and bookmarks
 * (e.g. AI & Agent Activation) land on the new Setup tab.
 */
export default function EntrataExpertsSetupRedirect() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace("/entrata-experts/?view=setup");
  }, [router]);

  return null;
}

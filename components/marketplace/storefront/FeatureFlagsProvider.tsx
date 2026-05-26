"use client";

import { createContext, useContext, useMemo } from "react";
import type { FeatureFlags } from "@/lib/marketplace/utils/featureFlags";

const FeatureFlagsContext = createContext<FeatureFlags | null>(null);

export function FeatureFlagsProvider({
  initialFlags,
  children,
}: {
  initialFlags: FeatureFlags;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => initialFlags,
    [
      // Legacy flags
      initialFlags.showRatings, 
      initialFlags.showDownloads, 
      initialFlags.showMetrics,
      // Roadmap flags - we'll update all dependencies to avoid missing flag changes
      JSON.stringify(initialFlags)
    ]
  );
  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags(): FeatureFlags {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) {
    // Return all defaults when context is not available
    return { 
      // Legacy flags
      showRatings: false, 
      showDownloads: false, 
      showMetrics: false,
      // Roadmap flags - Stretch Goals
      privateAppListings: false,
      clientViewPublishingPrivate: false,
      contextualDeepLinkModal: false,
      versionHistoryUI: false,
      // Roadmap flags - Post-V1
      standalonePartnerPortal: false,
      starRatingsAndDownloadCounts: false,
      partnerAnalyticsDashboard: false,
      metricsSpendRoi: false,
      fullPurchasePayments: false,
      publicMarketplaceTier: false,
      bundleScheduling: false,
      mediaFileUpload: false,
      orgPublishSettings: false,
      trialDays: false,
    };
  }
  
  // Map roadmap flags to legacy flags for backward compatibility
  const mappedFlags = { ...ctx };
  
  // starRatingsAndDownloadCounts controls both showRatings and showDownloads
  if (ctx.starRatingsAndDownloadCounts) {
    mappedFlags.showRatings = true;
    mappedFlags.showDownloads = true;
  }
  
  // metricsSpendRoi controls showMetrics
  if (ctx.metricsSpendRoi) {
    mappedFlags.showMetrics = true;
  }
  
  return mappedFlags;
}

"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "oxp-coming-soon";

export type ComingSoonRoute = {
  path: string;
  title: string;
  description: string;
};

const COMING_SOON_ROUTES: ComingSoonRoute[] = [
  {
    path: "/entrata-experts",
    title: "Entrata Experts",
    description: "A dedicated space where your team can connect with Entrata product specialists, get real-time guidance on platform capabilities, and access expert recommendations tailored to your portfolio.",
  },
  {
    path: "/conversations",
    title: "Live Conversations",
    description: "A centralized inbox for all AI-handled conversations across every channel — chat, SMS, voice, and portal. Monitor live interactions, review transcripts, and step in when needed.",
  },
  {
    path: "/performance",
    title: "Performance Analytics",
    description: "Comprehensive dashboards tracking agent performance, resolution rates, response times, and ROI across your entire portfolio. Identify trends, spot opportunities, and measure the impact of your AI workforce.",
  },
];

type ComingSoonContextValue = {
  isComingSoonEnabled: boolean;
  toggleComingSoon: () => void;
  isRouteComingSoon: (pathname: string) => boolean;
  getRouteInfo: (pathname: string) => ComingSoonRoute | undefined;
};

const ComingSoonContext = createContext<ComingSoonContextValue | null>(null);

export function ComingSoonProvider({ children }: { children: React.ReactNode }) {
  const [isComingSoonEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setIsEnabled(stored === "true");
    } catch { /* ignore */ }
  }, []);

  const toggleComingSoon = useCallback(() => {
    setIsEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const isRouteComingSoon = useCallback(
    (pathname: string) => {
      if (!isComingSoonEnabled) return false;
      return COMING_SOON_ROUTES.some((r) => pathname.startsWith(r.path));
    },
    [isComingSoonEnabled]
  );

  const getRouteInfo = useCallback(
    (pathname: string) => COMING_SOON_ROUTES.find((r) => pathname.startsWith(r.path)),
    []
  );

  return (
    <ComingSoonContext.Provider value={{ isComingSoonEnabled, toggleComingSoon, isRouteComingSoon, getRouteInfo }}>
      {children}
    </ComingSoonContext.Provider>
  );
}

export function useComingSoon() {
  const ctx = useContext(ComingSoonContext);
  if (!ctx) throw new Error("useComingSoon must be used within ComingSoonProvider");
  return ctx;
}

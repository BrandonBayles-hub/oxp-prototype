"use client";

import { createContext, useCallback, useContext, useState } from "react";

type RoadmapContextValue = {
  showRoadmap: boolean;
  setShowRoadmap: (value: boolean) => void;
  toggleRoadmap: () => void;
};

const RoadmapContext = createContext<RoadmapContextValue | null>(null);

export function RoadmapProvider({ children }: { children: React.ReactNode }) {
  const [showRoadmap, setShowRoadmap] = useState(false);

  const toggleRoadmap = useCallback(() => {
    setShowRoadmap((prev) => !prev);
  }, []);

  return (
    <RoadmapContext.Provider value={{ showRoadmap, setShowRoadmap, toggleRoadmap }}>
      {children}
    </RoadmapContext.Provider>
  );
}

export function useRoadmap() {
  const ctx = useContext(RoadmapContext);
  if (!ctx) throw new Error("useRoadmap must be used within RoadmapProvider");
  return ctx;
}

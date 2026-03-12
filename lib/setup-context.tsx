"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "janet-poc-go-live-v2";

type SetupContextValue = {
  goLiveComplete: boolean;
  setGoLiveComplete: (value: boolean) => void;
  completedSteps: number[];
  setStepComplete: (stepIndex: number, complete: boolean) => void;
  entrataConnected: boolean;
  setEntrataConnected: (value: boolean) => void;
  testRunDone: boolean;
  setTestRunDone: (value: boolean) => void;
};

const SetupContext = createContext<SetupContextValue | null>(null);

export function SetupProvider({ children }: { children: React.ReactNode }) {
  const [goLiveComplete, setGoLiveCompleteState] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [entrataConnected, setEntrataConnectedState] = useState(false);
  const [testRunDone, setTestRunDoneState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.goLive) setGoLiveCompleteState(true);
        if (Array.isArray(data.steps)) setCompletedSteps(data.steps);
        if (data.entrataConnected) setEntrataConnectedState(true);
        if (data.testRunDone) setTestRunDoneState(true);
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  const setGoLiveComplete = useCallback((value: boolean) => {
    setGoLiveCompleteState(value);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const prev = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...prev, goLive: value })
      );
    } catch {
      // ignore
    }
  }, []);

  const setStepComplete = useCallback((stepIndex: number, complete: boolean) => {
    setCompletedSteps((prev) => {
      const next = complete
        ? prev.includes(stepIndex) ? prev : [...prev, stepIndex].sort((a, b) => a - b)
        : prev.filter((i) => i !== stepIndex);
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const data = raw ? JSON.parse(raw) : {};
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...data, steps: next })
        );
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const setEntrataConnected = useCallback((value: boolean) => {
    setEntrataConnectedState(value);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, entrataConnected: value }));
    } catch {
      // ignore
    }
  }, []);

  const setTestRunDone = useCallback((value: boolean) => {
    setTestRunDoneState(value);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, testRunDone: value }));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...data, steps: completedSteps, entrataConnected, testRunDone })
    );
  }, [completedSteps, entrataConnected, testRunDone, mounted]);

  return (
    <SetupContext.Provider
      value={{
        goLiveComplete,
        setGoLiveComplete,
        completedSteps,
        setStepComplete,
        entrataConnected,
        setEntrataConnected,
        testRunDone,
        setTestRunDone,
      }}
    >
      {children}
    </SetupContext.Provider>
  );
}

export function useSetup() {
  const ctx = useContext(SetupContext);
  if (!ctx) throw new Error("useSetup must be used within SetupProvider");
  return ctx;
}

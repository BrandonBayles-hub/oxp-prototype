"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ConversationsDemoContextValue = {
  /** Increments each time the demo should open the Entrata profile without the threads panel. */
  profileCommsPopupRequest: number;
  requestProfileCommsPopup: () => void;
};

const ConversationsDemoContext = createContext<ConversationsDemoContextValue | null>(null);

export function ConversationsDemoProvider({ children }: { children: ReactNode }) {
  const [profileCommsPopupRequest, setProfileCommsPopupRequest] = useState(0);
  const requestProfileCommsPopup = useCallback(() => {
    setProfileCommsPopupRequest((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({ profileCommsPopupRequest, requestProfileCommsPopup }),
    [profileCommsPopupRequest, requestProfileCommsPopup]
  );

  return (
    <ConversationsDemoContext.Provider value={value}>{children}</ConversationsDemoContext.Provider>
  );
}

export function useConversationsDemo() {
  const ctx = useContext(ConversationsDemoContext);
  if (!ctx) {
    throw new Error("useConversationsDemo must be used within ConversationsDemoProvider");
  }
  return ctx;
}

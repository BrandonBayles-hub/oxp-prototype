"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  onEscalationNotification,
  type EscalationNotification,
} from "@/lib/escalations-context";

export type AppNotification = EscalationNotification & {
  read: boolean;
};

type NotificationsContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  /** The most recent notification (for toast display) */
  latest: AppNotification | null;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismissLatest: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [latest, setLatest] = useState<AppNotification | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = onEscalationNotification((n) => {
      const notification: AppNotification = { ...n, read: false };
      setNotifications((prev) => [notification, ...prev].slice(0, 50));
    });
    return unsub;
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const dismissLatest = useCallback(() => {
    setLatest(null);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, latest, markRead, markAllRead, dismissLatest }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}

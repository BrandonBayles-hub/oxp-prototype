"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type FeedbackRating = "positive" | "negative";
export type FeedbackStatus = "new" | "reviewed" | "prompt_updated" | "sop_updated" | "dismissed" | "escalated";

export type FeedbackItem = {
  id: string;
  agentId: string;
  agentName: string;
  rating: FeedbackRating;
  comment?: string;
  messageText: string;
  createdAt: string;
  status: FeedbackStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  /** Link to the escalation created from this feedback (if any) */
  escalationId?: string;
};

type FeedbackContextType = {
  items: FeedbackItem[];
  addFeedback: (item: Omit<FeedbackItem, "id" | "createdAt" | "status">) => string;
  updateStatus: (id: string, status: FeedbackStatus) => void;
  linkEscalation: (feedbackId: string, escalationId: string) => void;
  /** Get unlinked negative feedback items that could become training escalations */
  suggestedEscalations: FeedbackItem[];
};

const FeedbackContext = createContext<FeedbackContextType | null>(null);

const STORAGE_KEY = "janet-poc-feedback";

const SEED_ITEMS: FeedbackItem[] = [
  {
    id: "fb-1",
    agentId: "1",
    agentName: "Leasing AI",
    rating: "negative",
    comment: "Agent quoted wrong pet deposit amount — should be $300 not $250",
    messageText: "The pet deposit for a standard unit is $250, payable at move-in.",
    createdAt: "2026-02-22T14:30:00Z",
    status: "new",
  },
  {
    id: "fb-2",
    agentId: "2",
    agentName: "Renewal AI",
    rating: "positive",
    messageText: "I can see your lease for Unit 312 expires March 15. Based on current market rates and your tenure, I'd recommend a 2.5% increase with a 14-month term.",
    createdAt: "2026-02-22T10:15:00Z",
    status: "reviewed",
    reviewedBy: "Admin",
    reviewedAt: "2026-02-22T11:00:00Z",
  },
  {
    id: "fb-3",
    agentId: "3",
    agentName: "Maintenance AI",
    rating: "negative",
    comment: "Didn't recognize the emergency — pipe burst should auto-escalate",
    messageText: "I've created a standard work order for your plumbing issue. A technician will be assigned during business hours.",
    createdAt: "2026-02-21T23:45:00Z",
    status: "prompt_updated",
    reviewedBy: "Admin",
    reviewedAt: "2026-02-22T08:00:00Z",
  },
  {
    id: "fb-4",
    agentId: "1",
    agentName: "Leasing AI",
    rating: "negative",
    comment: "Response was too long — prospect just wanted the price",
    messageText: "Thank you for your interest! Let me tell you about our wonderful community. We offer a variety of floor plans ranging from studios to three-bedroom apartments...",
    createdAt: "2026-02-21T16:20:00Z",
    status: "sop_updated",
    reviewedBy: "Admin",
    reviewedAt: "2026-02-21T17:00:00Z",
  },
  {
    id: "fb-5",
    agentId: "4",
    agentName: "Payments AI",
    rating: "positive",
    messageText: "Your payment of $1,450.00 has been processed. You'll receive a confirmation email shortly. Your next payment is due March 1st.",
    createdAt: "2026-02-21T09:30:00Z",
    status: "dismissed",
  },
];

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<FeedbackItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setItems(stored ? JSON.parse(stored) : SEED_ITEMS);
    } catch {
      setItems(SEED_ITEMS);
    }
  }, []);

  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items]);

  const addFeedback = useCallback((item: Omit<FeedbackItem, "id" | "createdAt" | "status">) => {
    const id = `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setItems((prev) => [
      {
        ...item,
        id,
        createdAt: new Date().toISOString(),
        status: "new" as FeedbackStatus,
      },
      ...prev,
    ]);
    return id;
  }, []);

  const updateStatus = useCallback((id: string, status: FeedbackStatus) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status, reviewedBy: "Admin", reviewedAt: new Date().toISOString() }
          : item
      )
    );
  }, []);

  const linkEscalation = useCallback((feedbackId: string, escalationId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === feedbackId
          ? { ...item, escalationId, status: "escalated" as FeedbackStatus }
          : item
      )
    );
  }, []);

  const suggestedEscalations = items.filter(
    (item) => item.rating === "negative" && !item.escalationId && item.status === "new"
  );

  return (
    <FeedbackContext.Provider value={{ items, addFeedback, updateStatus, linkEscalation, suggestedEscalations }}>
      {children}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback must be used within FeedbackProvider");
  return ctx;
}

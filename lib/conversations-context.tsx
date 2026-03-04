"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { useRole, matchesRoleProperties } from "@/lib/role-context";

export type ConversationMessage = {
  role: "resident" | "agent" | "staff";
  text: string;
  timestamp?: string;
  type?: "message" | "private_note" | "handoff";
};

export type ConversationItem = {
  id: string;
  resident: string;
  unit: string | null;
  preview: string;
  agent: string;
  time: string;
  contactType: string;
  property: string;
  channel: string;
  assignee: string;
  labels: string[];
  status: "open" | "resolved";
  messages: ConversationMessage[];
  hasUnread: boolean;
};

const INITIAL: ConversationItem[] = [
  {
    id: "lc-1",
    resident: "Maria Santos",
    unit: null,
    preview: "That sounds great — can I schedule a tour for Satu...",
    agent: "Leasing AI",
    time: "just now",
    contactType: "Lead",
    property: "Property A",
    channel: "Web Chat",
    assignee: "ELI+ Leasing AI",
    labels: ["Leasing AI"],
    status: "open",
    hasUnread: true,
    messages: [
      { role: "agent", text: "Hi Maria! Thanks for reaching out. I'd love to help you find the perfect apartment. What are you looking for?", timestamp: "Sep 15 2025 · 7:00pm MST", type: "message" },
      { role: "resident", text: "Hi! I'm looking for a 1-bedroom, ideally with in-unit laundry. My budget is around $1,800/mo.", timestamp: "Sep 15 2025 · 7:02pm MST", type: "message" },
      { role: "agent", text: "Great news — we have three 1-bedroom units available that fit your criteria. Unit 205 and Unit 310 both have in-unit washer/dryer and are listed at $1,750/mo. Would you like to schedule a tour?", timestamp: "Sep 15 2025 · 7:03pm MST", type: "message" },
      { role: "resident", text: "That sounds great — can I schedule a tour for Saturday morning?", timestamp: "Sep 15 2025 · 7:05pm MST", type: "message" },
    ],
  },
  {
    id: "lc-2",
    resident: "Robert Hernandez",
    unit: "Unit 318",
    preview: "Can I split this into two payments this month?",
    agent: "Payments AI",
    time: "2m ago",
    contactType: "Resident",
    property: "Property A",
    channel: "Resident Portal",
    assignee: "Sarah Chen",
    labels: ["Payments AI"],
    status: "open",
    hasUnread: true,
    messages: [
      { role: "resident", text: "Hey, I wanted to ask about my rent this month. I'm having a bit of a cash flow issue.", timestamp: "Sep 15 2025 · 6:50pm MST", type: "message" },
      { role: "agent", text: "Hi Robert, I'm sorry to hear that. I can help you explore your options. Your balance for this month is $1,650, due on the 1st. Would you like to set up a payment plan?", timestamp: "Sep 15 2025 · 6:51pm MST", type: "message" },
      { role: "resident", text: "Can I split this into two payments this month?", timestamp: "Sep 15 2025 · 6:53pm MST", type: "message" },
      { role: "agent", text: "Absolutely. I can set up two installments: $825 due March 1st and $825 due March 15th. There's a one-time $25 arrangement fee. Shall I proceed?", timestamp: "Sep 15 2025 · 6:54pm MST", type: "message" },
    ],
  },
  {
    id: "lc-3",
    resident: "Alma Sanchez",
    unit: null,
    preview: "Amazing — thanks!",
    agent: "Leasing AI",
    time: "5m ago",
    contactType: "Lead",
    property: "Property A",
    channel: "Web Chat",
    assignee: "ELI+ Leasing AI",
    labels: ["Leasing AI", "AI Escalation"],
    status: "open",
    hasUnread: true,
    messages: [
      { role: "agent", text: "Thanks Marcus!\n\nTo ensure this request is properly handled, I am escalating it to a member of our team who can discuss the possibility of an exception with you. You can expect to hear from them within 24-48 business hours.", timestamp: "Sep 15 2025 · 7:05pm MST", type: "message" },
      { role: "staff", text: "", timestamp: "Sep 15 2025 · 7:05pm MST", type: "handoff" },
      { role: "staff", text: "Hi Marcus! That shouldn't be a problem, we should be good to continue on with the leasing process.", timestamp: "Sep 15 2025 · 7:06pm MST", type: "message" },
      { role: "resident", text: "Amazing — thanks!", timestamp: "Sep 15 2025 · 8:12pm MST", type: "message" },
      { role: "staff", text: "Marcus is in love with me.", timestamp: "Sep 15 2025 · 8:17pm MST", type: "private_note" },
    ],
  },
  {
    id: "lc-4",
    resident: "Davis Calzoni",
    unit: null,
    preview: "I was wondering if you could help me know what the light...",
    agent: "Renewals AI",
    time: "8m ago",
    contactType: "Lead",
    property: "Property A",
    channel: "Web Chat",
    assignee: "ELI+ Renewal AI",
    labels: ["Renewals AI"],
    status: "open",
    hasUnread: true,
    messages: [
      { role: "resident", text: "I was wondering if you could help me know what the lighting situation is like in the 2-bedroom units?", timestamp: "Sep 15 2025 · 6:45pm MST", type: "message" },
      { role: "agent", text: "Great question! Our 2-bedroom units feature large windows in both bedrooms and the living area, providing plenty of natural light. The kitchen also has under-cabinet LED lighting. Would you like to schedule a tour to see for yourself?", timestamp: "Sep 15 2025 · 6:46pm MST", type: "message" },
    ],
  },
  {
    id: "lc-5",
    resident: "Lindsey Carder",
    unit: "Unit 204",
    preview: "If I am not ready to move in when the lease is signed can I...",
    agent: "Leasing AI",
    time: "10m ago",
    contactType: "Resident",
    property: "Property A",
    channel: "Resident Portal",
    assignee: "ELI+ Leasing AI",
    labels: ["Leasing AI"],
    status: "open",
    hasUnread: true,
    messages: [
      { role: "resident", text: "If I am not ready to move in when the lease is signed can I delay my move-in date?", timestamp: "Sep 15 2025 · 6:40pm MST", type: "message" },
      { role: "agent", text: "I understand the concern! In most cases, we can work with you on adjusting the move-in date. Typically, we can hold a unit for up to 2 weeks after lease signing. Let me check with the property manager about your specific situation.", timestamp: "Sep 15 2025 · 6:41pm MST", type: "message" },
    ],
  },
  {
    id: "lc-6",
    resident: "Omar Culhane",
    unit: "Unit 517",
    preview: "I have a question about when the technician will be able to c...",
    agent: "Maintenance AI",
    time: "12m ago",
    contactType: "Resident",
    property: "Property A",
    channel: "SMS",
    assignee: "ELI+ Maintenance AI",
    labels: ["Maintenance AI", "Work Order"],
    status: "open",
    hasUnread: true,
    messages: [
      { role: "resident", text: "I have a question about when the technician will be able to come fix my dishwasher. The work order was submitted last week.", timestamp: "Sep 15 2025 · 6:35pm MST", type: "message" },
      { role: "agent", text: "I apologize for the delay, Omar. Let me check on work order WO #4485 for you. It looks like the part we needed has arrived. I'm scheduling a technician visit for tomorrow between 10am-12pm. Does that work for you?", timestamp: "Sep 15 2025 · 6:36pm MST", type: "message" },
    ],
  },
  {
    id: "lc-7",
    resident: "Ahmad Tupiz",
    unit: null,
    preview: "I was wondering if my roommate would be able to rent a sp...",
    agent: "Leasing AI",
    time: "15m ago",
    contactType: "Lead",
    property: "Property B",
    channel: "Web Chat",
    assignee: "ELI+ Leasing AI",
    labels: ["Leasing AI"],
    status: "open",
    hasUnread: true,
    messages: [
      { role: "resident", text: "I was wondering if my roommate would be able to rent a space as well? We'd like to be neighbors if possible.", timestamp: "Sep 15 2025 · 6:30pm MST", type: "message" },
      { role: "agent", text: "Absolutely! We'd love to have you both. We currently have adjacent units available on the 3rd floor. I can reserve both while you complete your applications. Shall I send the application links for both of you?", timestamp: "Sep 15 2025 · 6:31pm MST", type: "message" },
    ],
  },
  {
    id: "lc-8",
    resident: "Terry Lubin",
    unit: "Unit 102",
    preview: "How can I alter my lease so that I can have a shorter lease te...",
    agent: "Renewal AI",
    time: "18m ago",
    contactType: "Resident",
    property: "Property A",
    channel: "Email",
    assignee: "ELI+ Renewal AI",
    labels: ["Renewal AI", "Renewal Offer"],
    status: "open",
    hasUnread: true,
    messages: [
      { role: "resident", text: "How can I alter my lease so that I can have a shorter lease term? I may need to relocate for work.", timestamp: "Sep 15 2025 · 6:25pm MST", type: "message" },
      { role: "agent", text: "I understand, Terry. We do offer some flexibility. I can present you with a 6-month renewal option at a slightly adjusted rate of $1,520/mo (compared to your current $1,450/mo for the 12-month term). We also have an early termination clause option. Would you like details on either?", timestamp: "Sep 15 2025 · 6:26pm MST", type: "message" },
    ],
  },
  {
    id: "lc-9",
    resident: "Martin Torff",
    unit: null,
    preview: "If I wanted to add someone who is currently living overseas 3...",
    agent: "Leasing AI",
    time: "20m ago",
    contactType: "Lead",
    property: "Property B",
    channel: "Web Chat",
    assignee: "ELI+ Leasing AI",
    labels: ["Leasing AI"],
    status: "open",
    hasUnread: true,
    messages: [
      { role: "resident", text: "If I wanted to add someone who is currently living overseas to the lease, is that possible? They would be joining me in 3 months.", timestamp: "Sep 15 2025 · 6:20pm MST", type: "message" },
      { role: "agent", text: "Yes, that's possible! We can add them as a co-applicant. They would need to complete a background check and provide proof of income, which can all be done remotely. Once approved, we can amend the lease to include them. Want me to send the co-applicant form?", timestamp: "Sep 15 2025 · 6:21pm MST", type: "message" },
    ],
  },
  {
    id: "lc-10",
    resident: "Cristofer Schleifer",
    unit: null,
    preview: "I was wondering if my roommate would be able to rent a sp...",
    agent: "Leasing AI",
    time: "22m ago",
    contactType: "Lead",
    property: "Property A",
    channel: "Web Chat",
    assignee: "ELI+ Leasing AI",
    labels: ["Leasing AI", "AI Escalation"],
    status: "open",
    hasUnread: true,
    messages: [
      { role: "resident", text: "I was wondering if my roommate would be able to rent a space as well? We're looking for units near each other.", timestamp: "Sep 15 2025 · 6:15pm MST", type: "message" },
      { role: "agent", text: "Of course! We have several adjacent units available. Let me pull up the options for you. In the meantime, I'm flagging this for a leasing specialist who can help coordinate both applications.", timestamp: "Sep 15 2025 · 6:16pm MST", type: "message" },
    ],
  },
];

type ConversationsContextValue = {
  items: ConversationItem[];
  filteredItems: ConversationItem[];
  propertyCount: number;
  addMessage: (conversationId: string, message: ConversationMessage) => void;
  addConversation: (item: Omit<ConversationItem, "id">) => string;
  updateAssignee: (conversationId: string, assignee: string) => void;
  getConversation: (id: string) => ConversationItem | undefined;
  resolveConversation: (id: string) => void;
  reopenConversation: (id: string) => void;
  addLabel: (id: string, label: string) => void;
  removeLabel: (id: string, label: string) => void;
  markRead: (id: string) => void;
};

const ConversationsContext = createContext<ConversationsContextValue | null>(null);

export function ConversationsProvider({ children }: { children: React.ReactNode }) {
  const { roleProperties } = useRole();
  const [items, setItems] = useState<ConversationItem[]>(INITIAL);

  const filteredItems = items.filter((c) =>
    matchesRoleProperties(c.property, roleProperties)
  );

  const propertyCount = new Set(filteredItems.map((c) => c.property)).size;

  const addMessage = useCallback((conversationId: string, message: ConversationMessage) => {
    setItems((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;
        const truncated = message.text.length > 50 ? message.text.slice(0, 50) + "..." : message.text;
        return {
          ...c,
          messages: [...c.messages, message],
          preview: truncated,
          time: "just now",
          hasUnread: true,
        };
      })
    );
  }, []);

  const addConversation = useCallback((item: Omit<ConversationItem, "id">) => {
    const id = `lc-${Date.now()}`;
    setItems((prev) => [{ ...item, id }, ...prev]);
    return id;
  }, []);

  const updateAssignee = useCallback((conversationId: string, assignee: string) => {
    setItems((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, assignee } : c))
    );
  }, []);

  const getConversation = useCallback((id: string) => {
    return items.find((c) => c.id === id);
  }, [items]);

  const resolveConversation = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "resolved" as const } : c))
    );
  }, []);

  const reopenConversation = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "open" as const } : c))
    );
  }, []);

  const addLabel = useCallback((id: string, label: string) => {
    setItems((prev) =>
      prev.map((c) =>
        c.id === id && !c.labels.includes(label)
          ? { ...c, labels: [...c.labels, label] }
          : c
      )
    );
  }, []);

  const markRead = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, hasUnread: false } : c))
    );
  }, []);

  const removeLabel = useCallback((id: string, label: string) => {
    setItems((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, labels: c.labels.filter((l) => l !== label) } : c
      )
    );
  }, []);

  return (
    <ConversationsContext.Provider
      value={{
        items,
        filteredItems,
        propertyCount,
        addMessage,
        addConversation,
        updateAssignee,
        getConversation,
        resolveConversation,
        reopenConversation,
        addLabel,
        removeLabel,
        markRead,
      }}
    >
      {children}
    </ConversationsContext.Provider>
  );
}

export function useConversations() {
  const ctx = useContext(ConversationsContext);
  if (!ctx) throw new Error("useConversations must be used within ConversationsProvider");
  return ctx;
}

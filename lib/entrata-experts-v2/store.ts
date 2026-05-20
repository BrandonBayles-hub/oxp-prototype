"use client";
import * as React from "react";
import type {
  AssistantMessage,
  Conversation,
  Depth,
  LensId,
  ModelId,
  RoleId,
  Scope,
  UserMessage,
} from "./types";
import { compose } from "./data/answers";
import { ROLE_BY_ID } from "./lenses";
import { generateActivity } from "./data/activity";

const REMEMBERED_BY_ROLE: Record<RoleId, string[]> = {
  "vp-ops": [
    "Mara Holloway — VP of Operations",
    "You watch Tampa-area properties closely",
    "You prefer Monday-morning digests over emails",
    "Renewal acceptance is a top KPI for you this quarter",
  ],
  regional: [
    "Marcus Chen — Regional · Southeast",
    "You're working on closing the gap at Tampa Bay",
    "You like leasing-funnel views grouped by source",
  ],
  "onsite-pm": [
    "Jasmin Ortega — PM · Wynbrook Tampa Bay",
    "You start your day at 7:45 am",
    "You prefer drilldowns by unit type, not by floor",
  ],
  "asset-mgr": [
    "Thomas Becker — Asset Manager",
    "You compare every property to its 2026 underwriting",
    "You ignore properties under 200 units in summary views",
  ],
  accounting: [
    "Rina Patel — AP Lead",
    "You batch invoice reviews on Tuesdays + Thursdays",
    "You require a vendor history check on anything > $5k",
  ],
};

export interface ChatState {
  role: RoleId;
  setRole: (r: RoleId) => void;
  scope: Scope;
  setScope: (s: Scope) => void;
  lens: LensId;
  depth: Depth;
  model: ModelId;
  setLensDepth: (l: LensId, d: Depth, m?: ModelId) => void;
  setModel: (m: ModelId) => void;
  conversations: Conversation[];
  activeId: string | null;
  isThinking: boolean;
  remembered: string[];
  newConversation: () => void;
  selectConversation: (id: string) => void;
  send: (prompt: string) => void;
  activity: Conversation[];
}

export function useChatStore(): ChatState {
  const [role, setRole] = React.useState<RoleId>("vp-ops");
  const [scope, setScope] = React.useState<Scope>({ kind: "portfolio", id: "portfolio", label: "Whole portfolio" });
  const [lens, setLens] = React.useState<LensId>("auto");
  const [depth, setDepth] = React.useState<Depth>("auto");
  const [model, setModel] = React.useState<ModelId>("auto");
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [isThinking, setIsThinking] = React.useState(false);
  const [activity, setActivity] = React.useState<Conversation[]>([]);

  React.useEffect(() => {
    setActivity(generateActivity());
  }, []);

  const remembered = REMEMBERED_BY_ROLE[role];

  React.useEffect(() => {
    setLens(ROLE_BY_ID[role].defaultLens);
  }, [role]);

  function setLensDepth(l: LensId, d: Depth, m?: ModelId) {
    setLens(l);
    setDepth(d);
    if (m) setModel(m);
  }

  function newConversation() {
    setActiveId(null);
  }

  function selectConversation(id: string) {
    setActiveId(id);
  }

  function send(prompt: string) {
    const now = Date.now();
    const userMsg: UserMessage = {
      id: `u-${now}`,
      role: "user",
      body: prompt,
      createdAt: new Date(now).toISOString(),
    };

    const isNew = !activeId;
    const convId = isNew ? `c-${now}` : (activeId as string);

    if (isNew) {
      const newConv: Conversation = {
        id: convId,
        title: prompt.length > 60 ? prompt.slice(0, 57) + "..." : prompt,
        userId: `e-${role}`,
        messages: [userMsg],
        createdAt: userMsg.createdAt,
        updatedAt: userMsg.createdAt,
        intent: "pending",
        lens,
      };
      setConversations((prev) => {
        if (prev.some((c) => c.id === convId)) return prev;
        return [newConv, ...prev];
      });
      setActiveId(convId);
    } else {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.some((m) => m.id === userMsg.id)
                  ? c.messages
                  : [...c.messages, userMsg],
                updatedAt: userMsg.createdAt,
              }
            : c,
        ),
      );
    }

    setIsThinking(true);
    const thinkMs = depth === "fast" ? 900 : depth === "reasoning" ? 1900 : 1100;

    setTimeout(() => {
      const composed = compose({ prompt, lens, depth, scope });
      const aMsgId = `a-${Date.now()}`;
      const aMsg: AssistantMessage = {
        ...composed.message,
        id: aMsgId,
        model,
        createdAt: new Date().toISOString(),
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.some((m) => m.id === aMsgId)
                  ? c.messages
                  : [...c.messages, aMsg],
                updatedAt: aMsg.createdAt,
                intent: composed.intentId,
                lens: aMsg.lens,
              }
            : c,
        ),
      );
      setIsThinking(false);
    }, thinkMs);
  }

  return {
    role, setRole,
    scope, setScope,
    lens, depth, model,
    setLensDepth,
    setModel,
    conversations,
    activeId,
    isThinking,
    remembered,
    newConversation,
    selectConversation,
    send,
    activity,
  };
}

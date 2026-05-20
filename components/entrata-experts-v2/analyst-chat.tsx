"use client";
import * as React from "react";
import { BackBar } from "./back-bar";
import { ChatView } from "./chat/chat-view";
import { MemoryChip } from "./chat/memory-chip";
import { RoleSwitcher } from "./chat/role-switcher";
import { useChatStore } from "@/lib/entrata-experts-v2/store";

export function AnalystChat({ onBack }: { onBack: () => void }) {
  const store = useChatStore();

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[600px] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-sm">
      <BackBar
        title="Entrata Analyst"
        subtitle="Data-connected · Cited · Scoped to your portfolio"
        onBack={onBack}
        onNew={store.newConversation}
        newLabel="Start a new conversation"
        rightSlot={
          <div className="hidden items-center gap-2 md:flex">
            <MemoryChip remembered={store.remembered} />
            <RoleSwitcher role={store.role} onChangeRole={store.setRole} />
          </div>
        }
      />
      <ChatView store={store} />
    </div>
  );
}

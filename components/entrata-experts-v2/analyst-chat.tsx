"use client";
import * as React from "react";
import { BackBar } from "./back-bar";
import { ChatView } from "./chat/chat-view";
import { MemoryChip } from "./chat/memory-chip";
import { RoleSwitcher } from "./chat/role-switcher";
import { useChatStore } from "@/lib/entrata-experts-v2/store";
import { useEntrataExpertsRelease } from "@/lib/entrata-experts-release-context";

export function AnalystChat({
  onBack,
  hideBack = false,
  hideNew = false,
  alignWithSidebar = false,
}: {
  onBack: () => void;
  hideBack?: boolean;
  hideNew?: boolean;
  // When true, the BackBar's title/subtitle pins to a 260px-wide column on
  // the left, matching the ThreadsSidebar that sits beneath it. Used in the
  // chat-first hub layout for visual cohesion.
  alignWithSidebar?: boolean;
}) {
  const store = useChatStore();
  const { atLeast } = useEntrataExpertsRelease();
  const showMemory = atLeast("v1.1");

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[600px] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-sm">
      <BackBar
        title="Entrata Analyst"
        subtitle="Data-connected · Cited · Scoped to your portfolio"
        onBack={onBack}
        hideBack={hideBack}
        hideNew={hideNew}
        leadingColumnWidth={alignWithSidebar ? "260px" : undefined}
        onNew={store.newConversation}
        newLabel="Start a new conversation"
        // In chat-first / sidebar-aligned mode the header is just the title
        // column — the memory chip and role switcher live elsewhere (or are
        // hidden by the `hidden md:flex` wrapper on smaller screens).
        rightSlot={
          alignWithSidebar ? undefined : (
            <div className="hidden items-center gap-2 md:flex">
              {showMemory && <MemoryChip remembered={store.remembered} />}
              <RoleSwitcher role={store.role} onChangeRole={store.setRole} />
            </div>
          )
        }
      />
      <ChatView store={store} />
    </div>
  );
}

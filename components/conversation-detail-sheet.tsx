"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Chat, type ChatMessage } from "@/components/ui/chat";
import { cn } from "@/lib/utils";

export type LiveConversation = {
  id: string;
  resident: string;
  unit: string | null;
  type: "lead" | "resident" | "vendor";
  agent: string;
  assignee: string;
  property: string;
  channel: string;
  time: string;
  messages: ChatMessage[];
};

export function ConversationDetailSheet({
  conversation,
  open,
  onOpenChange,
}: {
  conversation: LiveConversation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  if (conversation && conversation.id !== activeConvId) {
    setActiveConvId(conversation.id);
    setLocalMessages(conversation.messages);
  }

  if (!conversation) return null;

  const initials = conversation.resident
    .split(" ")
    .map((n) => n[0])
    .join("");

  const handleSend = (text: string) => {
    setLocalMessages((prev) => [
      ...prev,
      { id: `staff-${Date.now()}`, role: "staff", text },
    ]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-hidden p-0 sm:max-w-3xl"
      >
        <SheetDescription className="sr-only">
          Live conversation with {conversation.resident}
        </SheetDescription>

        {/* Header */}
        <div className="border-b border-border px-6 pb-4 pt-6">
          <SheetHeader className="mb-3 flex-row items-center gap-3 space-y-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-base">
                  {conversation.resident}
                </SheetTitle>
              </div>
              <p className="text-xs text-muted-foreground">
                {conversation.type === "lead"
                  ? "Lead"
                  : conversation.type === "resident"
                    ? "Resident"
                    : "Vendor"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <span className="text-xs font-medium text-green-600">Live</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {conversation.time}
              </span>
            </div>
          </SheetHeader>

          {/* Metadata bar */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">Agent:</span>{" "}
              {conversation.agent} AI
            </span>
            <span>
              <span className="font-semibold text-foreground">Assignee:</span>{" "}
              {conversation.assignee}
            </span>
            <span>
              <span className="font-semibold text-foreground">Property:</span>{" "}
              {conversation.property}
            </span>
            <span>
              <span className="font-semibold text-foreground">Via:</span>{" "}
              {conversation.channel}
            </span>
          </div>
        </div>

        {/* Chat area — fills remaining space */}
        <div className="flex min-h-0 flex-1 flex-col">
          <Chat
            messages={localMessages}
            onSend={handleSend}
            placeholder="Type a message to join this conversation..."
            showAttach={false}
            messageListHeight="100%"
            className="flex-1 rounded-none border-0"
            roleLabels={{
              agent: `${conversation.agent} AI`,
              resident: conversation.resident,
              staff: "You",
            }}
            roleVariant={{
              agent: "outbound",
              resident: "inbound",
              staff: "inbound",
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

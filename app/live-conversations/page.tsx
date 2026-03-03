"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, User } from "lucide-react";
import { Chat, type ChatMessage } from "@/components/ui/chat";
import { LIVE_CONVERSATIONS } from "@/lib/live-conversations-data";
import type { LiveConversation } from "@/components/conversation-detail-sheet";
import { cn } from "@/lib/utils";
import { ContractGate } from "@/components/contract-overlay";

const ALL = "All";

function uniqueValues(items: LiveConversation[], key: keyof LiveConversation): string[] {
  const set = new Set<string>();
  for (const item of items) {
    const v = item[key];
    if (typeof v === "string" && v) set.add(v);
  }
  return Array.from(set).sort();
}

export default function LiveConversationsPage() {
  return (
    <ContractGate featureName="Live Conversations">
      <LiveConversationsContent />
    </ContractGate>
  );
}

function LiveConversationsContent() {
  const conversations = LIVE_CONVERSATIONS;

  const assignees = useMemo(() => uniqueValues(conversations, "assignee"), [conversations]);
  const properties = useMemo(() => uniqueValues(conversations, "property"), [conversations]);
  const channels = useMemo(() => uniqueValues(conversations, "channel"), [conversations]);
  const contactTypes: Array<LiveConversation["type"]> = ["lead", "resident", "vendor"];

  const [filterAssignee, setFilterAssignee] = useState(ALL);
  const [filterProperty, setFilterProperty] = useState(ALL);
  const [filterChannel, setFilterChannel] = useState(ALL);
  const [filterContact, setFilterContact] = useState(ALL);
  const [selectedId, setSelectedId] = useState<string>(conversations[0]?.id ?? "");

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (filterAssignee !== ALL && c.assignee !== filterAssignee) return false;
      if (filterProperty !== ALL && c.property !== filterProperty) return false;
      if (filterChannel !== ALL && c.channel !== filterChannel) return false;
      if (filterContact !== ALL && c.type !== filterContact) return false;
      return true;
    });
  }, [conversations, filterAssignee, filterProperty, filterChannel, filterContact]);

  const selected = filtered.find((c) => c.id === selectedId) ?? filtered[0] ?? null;

  const [localMessages, setLocalMessages] = useState<Record<string, ChatMessage[]>>({});

  const messagesForSelected = selected
    ? localMessages[selected.id] ?? selected.messages
    : [];

  const handleSend = (text: string) => {
    if (!selected) return;
    const current = localMessages[selected.id] ?? selected.messages;
    setLocalMessages((prev) => ({
      ...prev,
      [selected.id]: [...current, { id: `staff-${Date.now()}`, role: "staff", text }],
    }));
  };

  const selectClasses =
    "h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="page-header">
        <div className="flex items-center gap-3">
          <Link
            href="/command-center"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Back to Command Center"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-heading text-[hsl(var(--foreground))]">
              Live Conversations
            </h1>
            <p className="text-[hsl(var(--muted-foreground))]">
              Active conversations between residents and AI agents across your properties.
            </p>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className={cn(selectClasses, "min-w-[180px]")}
          aria-label="Filter by assignee"
        >
          <option value={ALL}>All assignees</option>
          {assignees.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select
          value={filterProperty}
          onChange={(e) => setFilterProperty(e.target.value)}
          className={selectClasses}
          aria-label="Filter by property"
        >
          <option value={ALL}>All properties</option>
          {properties.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value)}
          className={selectClasses}
          aria-label="Filter by channel"
        >
          <option value={ALL}>All channels</option>
          {channels.map((ch) => (
            <option key={ch} value={ch}>{ch}</option>
          ))}
        </select>

        <select
          value={filterContact}
          onChange={(e) => setFilterContact(e.target.value)}
          className={selectClasses}
          aria-label="Filter by contact type"
        >
          <option value={ALL}>All contacts</option>
          {contactTypes.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}s
            </option>
          ))}
        </select>
      </div>

      {/* Inbox: list + detail */}
      <div className="flex h-[calc(100vh-15rem)] min-h-[480px] overflow-hidden rounded-lg border border-border bg-background">
        {/* Conversation list */}
        <div className="w-[340px] shrink-0 overflow-y-auto border-r border-border">
          {filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No conversations match your filters.
            </p>
          ) : (
            <ul>
              {filtered.map((conv) => {
                const isActive = selected?.id === conv.id;
                const lastMsg = conv.messages[conv.messages.length - 1];
                const preview = lastMsg?.text ?? "";
                const previewTruncated =
                  preview.length > 45 ? preview.slice(0, 42) + "..." : preview;
                const isHuman = !conv.assignee.startsWith("ELI+");

                return (
                  <li key={conv.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(conv.id)}
                      className={cn(
                        "flex w-full flex-col gap-1 border-l-2 border-b border-b-border px-4 py-3 text-left transition-colors",
                        isActive
                          ? "border-l-primary bg-muted/60"
                          : "border-l-transparent hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {conv.resident}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {conv.time}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {previewTruncated}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            isHuman
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                              : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                          )}
                        >
                          {isHuman ? (
                            <User className="h-2.5 w-2.5" />
                          ) : (
                            <Bot className="h-2.5 w-2.5" />
                          )}
                          {isHuman ? conv.assignee : `ELI+ ${conv.agent} AI`}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {conv.channel}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Detail header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {selected.resident}
                </h2>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                    </span>
                    <span className="font-medium text-green-600">Live</span>
                    <span className="ml-0.5">&middot; {selected.time}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Bot className="h-3 w-3" />
                    {selected.assignee}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{selected.property}</span>
                <span>{selected.channel}</span>
              </div>
            </div>

            {/* Chat */}
            <div className="flex min-h-0 flex-1 flex-col">
              <Chat
                messages={messagesForSelected}
                onSend={handleSend}
                placeholder="Type a message to join this conversation..."
                showAttach={false}
                messageListHeight="100%"
                className="flex-1 rounded-none border-0"
                roleLabels={{
                  agent: `${selected.agent} AI`,
                  resident: selected.resident,
                  staff: "You",
                }}
                roleVariant={{
                  agent: "outbound",
                  resident: "inbound",
                  staff: "inbound",
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a conversation to view
          </div>
        )}
      </div>
    </div>
  );
}

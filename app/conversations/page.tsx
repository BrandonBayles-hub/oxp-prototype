"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  MessageCircle,
  User,
  Search,
  Plus,
  X,
  Check,
  ChevronDown,
  Paperclip,
  ArrowUp,
  MessageSquare,
  StickyNote,
  CornerDownRight,
  Inbox,
  AtSign,
  Clock,
  Tag,
  BarChart3,
  Settings,
  Phone,
  Mail,
  Building,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useConversations, type ConversationItem } from "@/lib/conversations-context";
import { useAgents } from "@/lib/agents-context";
import { useWorkforce } from "@/lib/workforce-context";
import { cn } from "@/lib/utils";

type SidebarFilter =
  | "all"
  | "mentions"
  | "unattended"
  | { type: "label"; value: string }
  | { type: "property"; value: string };

function ConversationsContent() {
  const {
    filteredItems: conversations,
    addMessage,
    updateAssignee,
    resolveConversation,
    reopenConversation,
    addLabel,
    removeLabel,
    markRead,
  } = useConversations();
  const { agents } = useAgents();
  const { humanMembers } = useWorkforce();

  const scrollRef = useRef<HTMLDivElement>(null);

  const agentsByName = useMemo(() => {
    const map = new Map<string, (typeof agents)[number]>();
    for (const a of agents) map.set(a.name, a);
    return map;
  }, [agents]);

  const resolveAgentLabel = (name: string) => {
    const a = agentsByName.get(name);
    return a ? `${a.type === "autonomous" ? "ELI+ " : ""}${a.name}` : name;
  };

  const humanNameSet = useMemo(
    () => new Set(humanMembers.map((m) => m.name)),
    [humanMembers]
  );
  const isHumanAssignee = (assignee: string) => humanNameSet.has(assignee);

  const autonomousAgents = useMemo(
    () => agents.filter((a) => a.type === "autonomous"),
    [agents]
  );

  const groupedAssignees = useMemo(() => {
    const ai = autonomousAgents
      .map((a) => ({ value: `ELI+ ${a.name}`, label: `ELI+ ${a.name}` }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const humans = humanMembers
      .map((m) => ({ value: m.name, label: `${m.name} · ${m.role}` }))
      .sort((a, b) => a.value.localeCompare(b.value));
    return { ai, humans };
  }, [autonomousAgents, humanMembers]);

  // --- Sidebar + filter state ---
  const [sidebarFilter, setSidebarFilter] = useState<SidebarFilter>("all");
  const [inboxTab, setInboxTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const escalationCount = useMemo(
    () => conversations.filter((c) => c.labels.includes("AI Escalation")).length,
    [conversations]
  );

  const properties = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of conversations) {
      map.set(c.property, (map.get(c.property) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [conversations]);

  const sidebarFiltered = useMemo(() => {
    return conversations.filter((c) => {
      if (sidebarFilter === "all") return true;
      if (sidebarFilter === "mentions") return false;
      if (sidebarFilter === "unattended") return c.assignee.startsWith("ELI+");
      if (typeof sidebarFilter === "object" && sidebarFilter.type === "label")
        return c.labels.includes(sidebarFilter.value);
      if (typeof sidebarFilter === "object" && sidebarFilter.type === "property")
        return c.property === sidebarFilter.value;
      return true;
    });
  }, [conversations, sidebarFilter]);

  const tabFiltered = useMemo(() => {
    return sidebarFiltered.filter((c) => {
      if (inboxTab === "all") return true;
      if (inboxTab === "mine") return isHumanAssignee(c.assignee);
      if (inboxTab === "unassigned") return c.assignee.startsWith("ELI+");
      return true;
    });
  }, [sidebarFiltered, inboxTab]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return tabFiltered;
    const q = searchQuery.toLowerCase();
    return tabFiltered.filter(
      (c) =>
        c.resident.toLowerCase().includes(q) ||
        c.preview.toLowerCase().includes(q) ||
        c.labels.some((l) => l.toLowerCase().includes(q))
    );
  }, [tabFiltered, searchQuery]);

  const myInboxCount = useMemo(
    () => sidebarFiltered.filter((c) => isHumanAssignee(c.assignee)).length,
    [sidebarFiltered]
  );

  const searchParams = useSearchParams();
  const initialConvoId = searchParams.get("id");

  const [selectedId, setSelectedId] = useState<string | null>(initialConvoId);
  const didInitFromParam = useRef(false);

  useEffect(() => {
    if (initialConvoId && !didInitFromParam.current) {
      const match = conversations.find((c) => c.id === initialConvoId);
      if (match) {
        setSelectedId(initialConvoId);
        didInitFromParam.current = true;
        return;
      }
    }
    if (filtered.length > 0 && (!selectedId || !filtered.find((c) => c.id === selectedId))) {
      setSelectedId(filtered[0].id);
    } else if (filtered.length === 0) {
      setSelectedId(null);
    }
  }, [filtered, selectedId, initialConvoId, conversations]);

  const selected: ConversationItem | null = selectedId
    ? filtered.find((c) => c.id === selectedId) ?? null
    : null;

  // scroll to bottom on message change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [selected?.messages.length]);

  // --- Chat input ---
  const [inputMode, setInputMode] = useState<"message" | "private_note">("message");
  const [draft, setDraft] = useState("");
  const [newLabelText, setNewLabelText] = useState("");
  const [addLabelOpen, setAddLabelOpen] = useState(false);

  const allLabels = useMemo(() => {
    const set = new Set<string>();
    conversations.forEach((c) => c.labels.forEach((l) => set.add(l)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [conversations]);

  const handleSend = () => {
    if (!draft.trim() || !selected) return;
    const now = new Date();
    const timestamp = now.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
    addMessage(selected.id, {
      role: "staff",
      text: draft.trim(),
      timestamp,
      type: inputMode,
    });
    setDraft("");
  };

  const isSidebarActive = (filter: SidebarFilter) => {
    if (typeof sidebarFilter === "string" && typeof filter === "string")
      return sidebarFilter === filter;
    if (typeof sidebarFilter === "object" && typeof filter === "object")
      return sidebarFilter.type === filter.type && sidebarFilter.value === filter.value;
    return false;
  };

  const initials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* ===== LEFT SIDEBAR ===== */}
      <aside className="flex w-[220px] shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2 px-4 py-3">
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <Link href="/command-center" aria-label="Back to Command Center">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="text-sm font-semibold">Inbox</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <ul className="space-y-0.5">
            {([
              { id: "all" as const, icon: Inbox, label: "All Threads" },
              { id: "mentions" as const, icon: AtSign, label: "Mentions" },
              { id: "unattended" as const, icon: Clock, label: "Unattended" },
            ] as const).map((item) => (
              <li key={item.id}>
                <Button
                  variant={isSidebarActive(item.id) ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2.5 font-normal",
                    isSidebarActive(item.id) && "font-medium"
                  )}
                  onClick={() => setSidebarFilter(item.id)}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Button>
              </li>
            ))}
          </ul>

          <div className="my-3 h-px bg-border" />

          <ul className="space-y-0.5">
            <li>
              <Button
                variant={isSidebarActive({ type: "label", value: "AI Escalation" }) ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2.5 font-normal",
                  isSidebarActive({ type: "label", value: "AI Escalation" }) && "font-medium"
                )}
                onClick={() => setSidebarFilter({ type: "label", value: "AI Escalation" })}
              >
                <span className="flex-1 text-left">AI Escalations</span>
                {escalationCount > 0 && (
                  <Badge variant="destructive" className="ml-auto h-5 min-w-5 justify-center px-1.5 text-[10px]">
                    {escalationCount}
                  </Badge>
                )}
              </Button>
            </li>
            {properties.map(([prop, count]) => (
              <li key={prop}>
                <Button
                  variant={isSidebarActive({ type: "property", value: prop }) ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2.5 font-normal",
                    isSidebarActive({ type: "property", value: prop }) && "font-medium"
                  )}
                  onClick={() => setSidebarFilter({ type: "property", value: prop })}
                >
                  <span className="flex-1 text-left">{prop}</span>
                  <Badge variant="secondary" className="ml-auto h-5 min-w-5 justify-center px-1.5 text-[10px]">
                    {count}
                  </Badge>
                </Button>
              </li>
            ))}
          </ul>

          <div className="my-3 h-px bg-border" />

          <ul className="space-y-0.5">
            {(["Reporting", "Manage Inboxes", "Manage Labels"]).map((label) => (
              <li key={label}>
                <Button variant="ghost" className="w-full justify-start font-normal">
                  {label}
                </Button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* ===== CONVERSATION LIST ===== */}
      <div className="flex w-[340px] shrink-0 flex-col border-r border-border bg-card">
        {/* Tabs bar */}
        <div className="px-3 py-2">
          <Tabs value={inboxTab} onValueChange={setInboxTab}>
            <TabsList className="w-full">
              <TabsTrigger value="mine" className="flex-1 gap-1.5">
                My Inbox
                {myInboxCount > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-5 justify-center px-1.5 text-[10px]">
                    {myInboxCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="unassigned" className="flex-1">Unassigned</TabsTrigger>
              <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Search + actions */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Threads"
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-hover">
          {filtered.length > 0 ? (
            <ul>
              {filtered.map((convo) => {
                const isActive = convo.id === selectedId;
                return (
                  <li key={convo.id}>
                    <button
                      type="button"
                      onClick={() => { setSelectedId(convo.id); markRead(convo.id); }}
                      className={cn(
                        "relative flex w-full flex-col gap-1 py-3 pl-4 pr-4 text-left transition-colors",
                        isActive
                          ? "border-l-2 border-l-primary bg-accent"
                          : "hover:bg-accent/50"
                      )}
                    >
                      {convo.hasUnread && !isActive && (
                        <span className="absolute left-1.5 top-4 h-2 w-2 rounded-full bg-destructive" />
                      )}
                      <span className="text-[10px] font-medium tracking-wide text-muted-foreground">
                        {convo.property}
                      </span>
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("truncate text-sm", convo.hasUnread ? "font-bold" : "font-semibold")}>{convo.resident}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{convo.time}</span>
                      </div>
                      <p className={cn("truncate text-xs", convo.hasUnread ? "text-foreground" : "text-muted-foreground")}>{convo.preview}</p>
                      {convo.labels.length > 0 && (
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {convo.labels.map((label) => (
                            <Badge
                              key={label}
                              variant={label === "AI Escalation" ? "destructive" : "secondary"}
                              className="h-auto px-1.5 py-0 text-[10px]"
                            >
                              {label}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <p className="text-sm text-muted-foreground">No conversations match the filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== CONVERSATION DETAIL ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {selected ? (
          <>
            {/* Header */}
            <div className="shrink-0 border-b border-border bg-card px-5 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold leading-tight">{selected.resident}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{selected.property}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="flex items-center gap-1.5 rounded-full border border-transparent px-1 py-0.5 transition-colors hover:border-border hover:bg-muted"
                        aria-label="Change assignee"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px]">
                            {isHumanAssignee(selected.assignee)
                              ? initials(selected.assignee)
                              : "AI"}
                          </AvatarFallback>
                        </Avatar>
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="end">
                      <AssigneePicker
                        groupedAssignees={groupedAssignees}
                        currentAssignee={selected.assignee}
                        onSelect={(value) => updateAssignee(selected.id, value)}
                      />
                    </PopoverContent>
                  </Popover>
                  {selected.status === "open" ? (
                    <div className="flex items-center">
                      <Button
                        size="sm"
                        className="gap-1.5 rounded-r-none"
                        onClick={() => resolveConversation(selected.id)}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Mark as Resolved
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            className="rounded-l-none border-l border-primary-foreground/20 px-2"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => resolveConversation(selected.id)}>
                            <Check className="mr-2 h-3.5 w-3.5" />
                            Mark as Resolved
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => reopenConversation(selected.id)}>
                            <Clock className="mr-2 h-3.5 w-3.5" />
                            Mark as Pending
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => reopenConversation(selected.id)}
                    >
                      Reopen
                    </Button>
                  )}
                </div>
              </div>

              {/* Labels */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {selected.labels.map((label) => (
                  <Badge
                    key={label}
                    variant={label === "AI Escalation" ? "destructive" : "secondary"}
                    className="gap-1"
                  >
                    {label}
                    <button
                      type="button"
                      onClick={() => removeLabel(selected.id, label)}
                      className="ml-0.5 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
                      aria-label={`Remove ${label} label`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Popover open={addLabelOpen} onOpenChange={(open) => { setAddLabelOpen(open); if (!open) setNewLabelText(""); }}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 rounded-full border-dashed"
                      aria-label="Add label"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-0" align="start">
                    <div className="p-2">
                      <Input
                        autoFocus
                        value={newLabelText}
                        onChange={(e) => setNewLabelText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newLabelText.trim()) {
                            addLabel(selected.id, newLabelText.trim());
                            setNewLabelText("");
                            setAddLabelOpen(false);
                          }
                        }}
                        placeholder="Search labels…"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto border-t border-border">
                      {allLabels
                        .filter((l) => !newLabelText.trim() || l.toLowerCase().includes(newLabelText.toLowerCase()))
                        .map((label) => {
                          const applied = selected.labels.includes(label);
                          return (
                            <button
                              key={label}
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                              onClick={() => {
                                if (applied) {
                                  removeLabel(selected.id, label);
                                } else {
                                  addLabel(selected.id, label);
                                }
                              }}
                            >
                              <Check className={cn("h-3.5 w-3.5 shrink-0", applied ? "opacity-100" : "opacity-0")} />
                              <span className="truncate">{label}</span>
                            </button>
                          );
                        })}
                      {newLabelText.trim() && !allLabels.some((l) => l.toLowerCase() === newLabelText.toLowerCase()) && (
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors text-muted-foreground"
                          onClick={() => {
                            addLabel(selected.id, newLabelText.trim());
                            setNewLabelText("");
                            setAddLabelOpen(false);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">Create &ldquo;{newLabelText.trim()}&rdquo;</span>
                        </button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hover bg-muted/30 px-5 py-4">
              <div className="space-y-4">
                {selected.messages.map((msg, idx) => {
                  if (msg.type === "handoff") {
                    return (
                      <div key={idx} className="flex items-center justify-center gap-2 py-1">
                        <CornerDownRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">
                          Handoff {isHumanAssignee(selected.assignee) ? selected.assignee : "Staff"} · {msg.timestamp}
                        </span>
                      </div>
                    );
                  }

                  if (msg.type === "private_note") {
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="bg-amber-100 text-[8px] text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                              <StickyNote className="h-2.5 w-2.5" />
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Private Note</span>
                          {msg.timestamp && <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>}
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                          {msg.text}
                        </div>
                      </div>
                    );
                  }

                  const isAgent = msg.role === "agent";
                  const isStaff = msg.role === "staff";

                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Avatar className={cn(isAgent || isStaff ? "h-8 w-8" : "h-5 w-5")}>
                          {isAgent ? (
                            <AvatarImage src="/eli-cube.svg" alt="ELI" className="p-1" />
                          ) : null}
                          <AvatarFallback
                            className={cn(
                              (isAgent || isStaff)
                                ? "bg-blue-100 text-[10px] text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                : "bg-muted text-[8px] text-muted-foreground"
                            )}
                          >
                            {isStaff
                              ? initials(isHumanAssignee(selected.assignee) ? selected.assignee : "Staff")
                              : <User className="h-2.5 w-2.5" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className={cn("text-xs font-semibold", (isAgent || isStaff) ? "text-foreground" : "text-foreground")}>
                            {isAgent
                              ? resolveAgentLabel(selected.agent)
                              : isStaff
                                ? (isHumanAssignee(selected.assignee) ? selected.assignee : "Staff")
                                : selected.resident}
                          </span>
                          {msg.timestamp && <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                          (isAgent || isStaff) && "bg-blue-500 text-white dark:bg-blue-600",
                          !isAgent && !isStaff && "border border-border bg-card text-card-foreground shadow-sm"
                        )}
                      >
                        {msg.text.split("\n").map((line, li) => (
                          <span key={li}>
                            {line}
                            {li < msg.text.split("\n").length - 1 && <br />}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chat input */}
            <div className="shrink-0 bg-muted/50">
              {/* Mode toggle */}
              <div className="flex items-center gap-1 px-5 pt-3 pb-2">
                <Button
                  variant={inputMode === "message" ? "default" : "ghost"}
                  size="sm"
                  className="gap-1.5 rounded-full text-xs"
                  onClick={() => setInputMode("message")}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Message
                </Button>
                <Button
                  variant={inputMode === "private_note" ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-1.5 rounded-full text-xs",
                    inputMode === "private_note" && "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
                  )}
                  onClick={() => setInputMode("private_note")}
                >
                  <StickyNote className="h-3.5 w-3.5" />
                  Private Note
                </Button>
              </div>

              {/* Input box */}
              <div className="px-5 pb-4">
                <div
                  className={cn(
                    "flex flex-col rounded-xl border transition-colors focus-within:ring-1 focus-within:ring-ring",
                    inputMode === "private_note"
                      ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
                      : "border-input bg-background"
                  )}
                >
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={inputMode === "private_note" ? "Write a private note…" : "Write a message…"}
                    rows={2}
                    className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none"
                    aria-label={inputMode === "private_note" ? "Private note" : "Message"}
                  />
                  <div className="flex items-center justify-between px-3 pb-2">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
                      <Paperclip className="h-3.5 w-3.5" />
                      Attach
                    </Button>
                    <Button
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-full",
                        inputMode === "private_note" && "bg-amber-600 hover:bg-amber-700"
                      )}
                      disabled={!draft.trim()}
                      onClick={handleSend}
                      aria-label="Send"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <MessageCircle className="h-10 w-10 opacity-30" />
            <p className="text-sm">Select a conversation to view</p>
          </div>
        )}
      </div>

      {/* Right sidebar removed to give the chat more room */}

    </div>
  );
}

function AssigneePicker({
  groupedAssignees,
  currentAssignee,
  onSelect,
}: {
  groupedAssignees: { ai: { value: string; label: string }[]; humans: { value: string; label: string }[] };
  currentAssignee: string;
  onSelect: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.toLowerCase().trim();

  const filteredAi = groupedAssignees.ai.filter((a) => !q || a.label.toLowerCase().includes(q));
  const filteredHumans = groupedAssignees.humans.filter((h) => !q || h.label.toLowerCase().includes(q));
  const hasResults = filteredAi.length > 0 || filteredHumans.length > 0;

  return (
    <div>
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search assignees..."
            className="h-8 w-full rounded-md border border-input bg-background pl-7 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
        </div>
      </div>
      <div className="max-h-56 overflow-y-auto p-1">
        {!hasResults ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">No matching assignees</p>
        ) : (
          <>
            {filteredAi.length > 0 && (
              <div>
                <p className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">AI Agents</p>
                {filteredAi.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => onSelect(a.value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted",
                      a.value === currentAssignee && "bg-muted font-medium"
                    )}
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src="/eli-cube.svg" alt="ELI" className="p-0.5" />
                      <AvatarFallback className="bg-blue-100 text-[8px] text-blue-700">AI</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{a.label}</span>
                    {a.value === currentAssignee && <Check className="ml-auto h-3 w-3 shrink-0 text-primary" />}
                  </button>
                ))}
              </div>
            )}
            {filteredHumans.length > 0 && (
              <div>
                <p className="px-2 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Staff</p>
                {filteredHumans.map((h) => (
                  <button
                    key={h.value}
                    onClick={() => onSelect(h.value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted",
                      h.value === currentAssignee && "bg-muted font-medium"
                    )}
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="bg-muted text-[8px] text-muted-foreground">
                        {h.value.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{h.label}</span>
                    {h.value === currentAssignee && <Check className="ml-auto h-3 w-3 shrink-0 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <ConversationsContent />
    </Suspense>
  );
}

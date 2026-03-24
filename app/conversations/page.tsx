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
  CalendarIcon,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ChevronLeft,
  ChevronRight,
  Bell,
  Smile,
  Mic,
  SendHorizontal,
  Sparkles,
  PlayCircle,
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useConversations, type ConversationItem } from "@/lib/conversations-context";
import { useAgents } from "@/lib/agents-context";
import { useWorkforce } from "@/lib/workforce-context";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "bg-emerald-100 text-emerald-700",
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
  "bg-teal-100 text-teal-700",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

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

  const isEscalationLabel = (label: string) => label.endsWith("Escalation");

  const escalationCount = useMemo(
    () => conversations.filter((c) => c.labels.some(isEscalationLabel)).length,
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
      if (typeof sidebarFilter === "object" && sidebarFilter.type === "label") {
        if (sidebarFilter.value === "__escalation__")
          return c.labels.some(isEscalationLabel);
        return c.labels.includes(sidebarFilter.value);
      }
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
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [threadsPanelOpen, setThreadsPanelOpen] = useState(false);
  const [threadsFilter, setThreadsFilter] = useState<"active" | "closed">("active");
  const [openThreadIdx, setOpenThreadIdx] = useState<number | null>(null);
  const [threadInputMode, setThreadInputMode] = useState<"message" | "private_note">("message");
  const [threadDraft, setThreadDraft] = useState("");
  const [threadAssignments, setThreadAssignments] = useState<Record<number, string | null>>({});
  const [messageIntroDismissed, setMessageIntroDismissed] = useState(false);
  const [showMessageIntro, setShowMessageIntro] = useState(false);

  const THREAD_AGENTS = [
    "Hillary Avates",
    "Omar Bates",
    "Tiffany Courtland",
    "Diego Diaz",
    "Travis Eggers",
  ];

  const getThreadAssignee = (globalIdx: number) =>
    globalIdx in threadAssignments ? threadAssignments[globalIdx] : THREAD_DATA[globalIdx]?.assignee ?? null;

  const assignThread = (globalIdx: number, name: string | null) =>
    setThreadAssignments((prev) => ({ ...prev, [globalIdx]: name }));
  const [aiActivated, setAiActivated] = useState(true);
  const [reactivationDate, setReactivationDate] = useState<Date | null>(null);
  const [noLimit, setNoLimit] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [phoneOpt, setPhoneOpt] = useState("opt-in");
  const [emailOpt, setEmailOpt] = useState("opt-in");

  const THREAD_DATA = [
    {
      property: "Sun Valley", type: "Facilities", channel: "SMS", status: "active" as const, assignee: "Court White",
      messages: [
        { role: "user" as const, text: "Hi, my kitchen sink has been leaking for two days now. Can someone come take a look?", timestamp: "Sep 15 2025 · 3:12pm" },
        { role: "agent" as const, text: "I'm sorry to hear that! I've submitted a work order for your kitchen sink leak. A maintenance technician will reach out to schedule a time.", timestamp: "Sep 15 2025 · 3:14pm" },
        { role: "user" as const, text: "Thank you. Is there anything I should do in the meantime?", timestamp: "Sep 15 2025 · 3:15pm" },
        { role: "agent" as const, text: "If it's a slow drip, placing a bucket underneath should be fine. If it worsens, please call our emergency maintenance line.", timestamp: "Sep 15 2025 · 3:16pm" },
      ],
    },
    {
      property: "Sun Valley", type: "Office", channel: "SMS", status: "active" as const, assignee: null as string | null,
      messages: [
        { role: "user" as const, text: "I noticed a late fee on my account but I paid rent on time. Can you look into this?", timestamp: "Sep 14 2025 · 10:05am" },
        { role: "staff" as const, text: "Let me pull up your payment history. One moment please.", timestamp: "Sep 14 2025 · 10:08am" },
        { role: "staff" as const, text: "It looks like your payment was processed on the 4th but didn't clear until the 6th due to a bank delay. I've removed the late fee from your ledger.", timestamp: "Sep 14 2025 · 10:12am" },
        { role: "user" as const, text: "Great, thank you for fixing that so quickly!", timestamp: "Sep 14 2025 · 10:13am" },
      ],
    },
    {
      property: "Sun Valley", type: "Facilities", channel: "SMS", status: "active" as const, assignee: "Jane Doe",
      messages: [
        { role: "user" as const, text: "The A/C in my unit isn't blowing cold air. It's been warm all day.", timestamp: "Sep 13 2025 · 1:30pm" },
        { role: "agent" as const, text: "I'm sorry about the discomfort. I've created a work order for your A/C unit. Our maintenance team will be in touch to schedule a visit.", timestamp: "Sep 13 2025 · 1:32pm" },
        { role: "user" as const, text: "Any idea when they can come? It's really hot in here.", timestamp: "Sep 13 2025 · 1:33pm" },
        { role: "staff" as const, text: "Hi, this is Jane from maintenance. I can come by tomorrow between 9-11am. Does that work for you?", timestamp: "Sep 13 2025 · 2:15pm" },
        { role: "user" as const, text: "Yes, that works. Thank you Jane!", timestamp: "Sep 13 2025 · 2:17pm" },
      ],
    },
    {
      property: "Sun Valley", type: "Leasing", channel: "Email", status: "closed" as const, assignee: "Court White",
      messages: [
        { role: "user" as const, text: "Hi, I'm interested in renewing my lease. What are the renewal options?", timestamp: "Aug 20 2025 · 9:00am" },
        { role: "agent" as const, text: "Great to hear you'd like to stay! We have 6-month and 12-month renewal options available. I'll have our leasing team send over the details.", timestamp: "Aug 20 2025 · 9:03am" },
        { role: "staff" as const, text: "Hi! I've attached the renewal offer to your resident portal. The 12-month option includes a rate lock. Let me know if you have questions.", timestamp: "Aug 20 2025 · 11:30am" },
        { role: "user" as const, text: "I'll go with the 12-month renewal. Thanks!", timestamp: "Aug 21 2025 · 8:45am" },
        { role: "staff" as const, text: "Wonderful! Your renewal has been processed. Welcome back for another year!", timestamp: "Aug 21 2025 · 9:10am" },
      ],
    },
    {
      property: "Sun Valley", type: "Office", channel: "SMS", status: "closed" as const, assignee: "Court White",
      messages: [
        { role: "user" as const, text: "I need a copy of my payment history for the last 6 months for my tax filing.", timestamp: "Aug 10 2025 · 2:00pm" },
        { role: "staff" as const, text: "Of course! I've generated a ledger statement for the past 6 months and uploaded it to your resident portal under Documents.", timestamp: "Aug 10 2025 · 2:15pm" },
        { role: "user" as const, text: "Perfect, I see it. Thank you!", timestamp: "Aug 10 2025 · 2:20pm" },
      ],
    },
  ];

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
                variant={isSidebarActive({ type: "label", value: "__escalation__" }) ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2.5 font-normal",
                  isSidebarActive({ type: "label", value: "__escalation__" }) && "font-medium"
                )}
                onClick={() => setSidebarFilter({ type: "label", value: "__escalation__" })}
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
            {(["Email Integration", "Manage Inboxes", "Manage Labels", "Reporting"]).map((label) => (
              <li key={label}>
                {label === "Email Integration" ? (
                  <Link href="/communications-setup/custom-email">
                    <Button variant="ghost" className="w-full justify-start font-normal">
                      {label}
                    </Button>
                  </Link>
                ) : (
                  <Button variant="ghost" className="w-full justify-start font-normal">
                    {label}
                  </Button>
                )}
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
                              variant={isEscalationLabel(label) ? "destructive" : "secondary"}
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
              {/* Row 1: Name + Assignee + Resolve */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setProfileModalOpen(true)}
                    className="text-base font-semibold leading-tight hover:underline hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    {selected.resident}
                  </button>
                  <span className="text-sm text-muted-foreground">{selected.property}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="flex items-center gap-1 rounded-full border border-transparent px-1 py-0.5 transition-colors hover:border-border hover:bg-muted"
                        aria-label="Change assignee"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className={cn("text-[10px]", avatarColor(selected.assignee))}>
                            {isHumanAssignee(selected.assignee)
                              ? initials(selected.assignee)
                              : "AI"}
                          </AvatarFallback>
                        </Avatar>
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
                    <div className="flex items-center shrink-0">
                      <Button
                        size="sm"
                        className="gap-1 rounded-r-none px-2.5 h-7 text-xs"
                        onClick={() => resolveConversation(selected.id)}
                      >
                        <Check className="h-3 w-3" />
                        Resolve
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            className="rounded-l-none border-l border-primary-foreground/20 px-1.5 h-7"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => resolveConversation(selected.id)}>
                            <Check className="mr-2 h-3.5 w-3.5" />
                            Mark as Resolved
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

              {/* Row 2: Labels */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {selected.labels.map((label) => (
                  <Badge
                    key={label}
                    variant={label.includes("Escalation") ? "destructive" : "outline"}
                    className={cn(
                      "gap-1 rounded-md text-xs font-normal",
                      label.includes("Escalation")
                        ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                        : "border-border"
                    )}
                  >
                    {label}
                    <button
                      type="button"
                      onClick={() => removeLabel(selected.id, label)}
                      className="ml-0.5 rounded-sm opacity-60 transition-opacity hover:opacity-100"
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

              {/* Row 3: AI Activated toggle */}
              <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Switch
                    checked={aiActivated}
                    onCheckedChange={(checked) => {
                      setAiActivated(checked);
                      if (checked) {
                        setReactivationDate(null);
                        setNoLimit(false);
                        setShowDatePicker(false);
                      } else {
                        setShowDatePicker(true);
                      }
                    }}
                  />
                  <span className="text-sm font-medium text-foreground whitespace-nowrap">
                    AI Activated
                  </span>
                  {!aiActivated && (reactivationDate || noLimit) && (
                    <span className="ml-auto text-xs text-muted-foreground truncate">
                      {noLimit
                        ? "Will not reactivate"
                        : `Reactivates ${reactivationDate!.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}`}
                    </span>
                  )}
                </div>
                {!aiActivated && (
                  <div className="mt-2 flex items-center gap-2 pl-[46px]">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">
                      Deactivation up to:
                    </label>
                    {noLimit ? (
                      <button
                        type="button"
                        onClick={() => {
                          setNoLimit(false);
                          setShowDatePicker(true);
                        }}
                        className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs transition-colors hover:bg-accent"
                      >
                        No Limit
                      </button>
                    ) : (
                      <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs transition-colors hover:bg-accent"
                          >
                            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            {reactivationDate
                              ? reactivationDate.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "Select date"}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <MiniCalendar
                            selected={reactivationDate}
                            onSelect={(date) => {
                              setReactivationDate(date);
                              setNoLimit(false);
                              setShowDatePicker(false);
                            }}
                            onNoLimit={() => {
                              setReactivationDate(null);
                              setNoLimit(true);
                              setShowDatePicker(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                )}
              </div>

              {/* Row 4: Phone / Email opt-in */}
              <div className="mt-3 flex gap-3">
                <div className="flex-1 min-w-0">
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Phone</label>
                  <Select value={phoneOpt} onValueChange={setPhoneOpt}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opt-in"><span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />Opt In</span></SelectItem>
                      <SelectItem value="opt-out"><span className="flex items-center gap-2"><XCircle className="h-3.5 w-3.5 text-red-500" />Opt Out</span></SelectItem>
                      <SelectItem value="no-indication"><span className="flex items-center gap-2"><MinusCircle className="h-3.5 w-3.5 text-muted-foreground" />No Indication</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-0">
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Email</label>
                  <Select value={emailOpt} onValueChange={setEmailOpt}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opt-in"><span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />Opt In</span></SelectItem>
                      <SelectItem value="opt-out"><span className="flex items-center gap-2"><XCircle className="h-3.5 w-3.5 text-red-500" />Opt Out</span></SelectItem>
                      <SelectItem value="no-indication"><span className="flex items-center gap-2"><MinusCircle className="h-3.5 w-3.5 text-muted-foreground" />No Indication</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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

      {/* Instructional video modal for Message panel */}
      <Dialog open={showMessageIntro} onOpenChange={setShowMessageIntro}>
        <DialogContent className="sm:max-w-[640px] p-0 gap-0 overflow-hidden z-[80]">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-lg font-semibold">How to Use the Conversation Panel</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Watch this short walkthrough to learn how to message residents, manage threads, and assign conversations.
            </DialogDescription>
          </DialogHeader>

          <div className="relative w-full bg-gray-900 aspect-video flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-gray-900/80" />
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm transition-transform hover:scale-110 cursor-pointer">
                <PlayCircle className="h-12 w-12 text-white" strokeWidth={1.2} />
              </div>
              <p className="text-white/70 text-sm font-medium">1:42 &mdash; Quick Start Guide</p>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <div className="h-full w-0 bg-blue-500 rounded-full" />
            </div>
          </div>

          <div className="px-6 py-5 flex flex-col gap-4 border-t border-gray-100">
            <div className="flex flex-col gap-1.5">
              <p className="text-[13px] font-semibold text-gray-900">What you&apos;ll learn:</p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  Open &amp; navigate conversation threads
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  Send messages &amp; private notes
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  Assign agents to threads
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  Filter active &amp; closed threads
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                className="text-[12px]"
                onClick={() => {
                  setShowMessageIntro(false);
                  setThreadsPanelOpen(true);
                }}
              >
                Skip for now
              </Button>
              <Button
                size="sm"
                className="gap-2 text-[12px] bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  setMessageIntroDismissed(true);
                  setShowMessageIntro(false);
                  setThreadsPanelOpen(true);
                }}
              >
                Don&apos;t show this again
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resident Profile Curtain Overlay */}
      {profileModalOpen && selected && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setProfileModalOpen(false)} />
          <div className="relative z-10 flex flex-1 flex-col animate-in slide-in-from-top duration-300 bg-white">
            {/* Entrata brand bar — full width */}
            <div className="flex items-center justify-between bg-[#b71c1c] px-4 py-2.5 shrink-0">
              <span className="text-[16px] font-semibold italic text-white/90 tracking-wide">entrata</span>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="flex items-center gap-1.5 text-[14px] font-medium text-white/90 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>
            </div>

            {/* Content row below brand bar */}
            <div className="flex flex-1 min-h-0">
            {/* LEFT: Entrata profile (header + tabs + ledger) */}
            <div className="flex flex-1 min-w-0 flex-col bg-white">
              {/* Profile header row */}
              <div className="flex items-center bg-white px-5 py-5 shrink-0 border-b border-gray-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2e7d32] text-sm font-bold text-white shrink-0">
                    {initials(selected.resident)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[15px] font-bold text-gray-900">{selected.resident}</span>
                    <p className="text-[12px] text-gray-500">{selected.property} | #32</p>
                  </div>
                </div>
                <span className="mx-4 text-gray-300">·</span>
                <div className="ml-auto flex items-center gap-1.5">
                  {[
                    { label: "Message", Icon: MessageCircle, action: () => {
                        if (!messageIntroDismissed) {
                          setShowMessageIntro(true);
                        } else {
                          setThreadsPanelOpen(v => !v);
                        }
                      }},
                    { label: "SMS", Icon: MessageSquare },
                    { label: "Email", Icon: Mail },
                    { label: "Appointment", Icon: CalendarIcon },
                    { label: "Schedule Manual Contact", Icon: Phone },
                  ].map((btn) => (
                    <div key={btn.label} className="relative">
                      {btn.label === "Message" && !threadsPanelOpen && !messageIntroDismissed && (
                        <>
                          <span className="absolute -top-2 -right-2 z-10 flex items-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[8px] font-bold text-white shadow-sm animate-bounce" style={{ animationDuration: "2s" }}>
                            NEW
                          </span>
                          <span className="absolute inset-0 rounded-md animate-pulse ring-2 ring-blue-400/50" style={{ animationDuration: "2s" }} />
                        </>
                      )}
                    <button
                      onClick={btn.action}
                      className={`relative flex items-center gap-1.5 rounded-md border bg-white px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-gray-50 ${
                        btn.label === "Message" && threadsPanelOpen
                          ? "border-blue-400 text-blue-600"
                          : btn.label === "Message"
                            ? "border-blue-300 text-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                            : "border-gray-200 text-gray-600"
                      }`}
                    >
                      <btn.Icon className={`h-3.5 w-3.5 shrink-0 ${btn.label === "Message" ? "text-blue-400" : "text-gray-400"}`} strokeWidth={1.5} />
                      {btn.label}
                    </button>
                    </div>
                  ))}
                </div>
              </div>
              {/* Profile tabs */}
              <div className="flex items-center gap-0 border-b border-gray-200 bg-[#f5f5f5] px-2 shrink-0">
                {["Financial", "Household", "Lease", "Utilities", "Documents", "Maintenance", "Activity Log"].map((tab, i) => (
                  <button
                    key={tab}
                    className={`px-3 py-2 text-[11px] font-medium transition-colors rounded-t ${
                      i === 0
                        ? "bg-white text-[#c0392b] border border-gray-200 border-b-white -mb-px relative z-10"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              {/* Sub-tabs */}
              <div className="flex items-center gap-0 border-b border-gray-200 bg-white px-3 shrink-0">
                {["Ledger", "Recurring Charges and Credits", "One Time Charges and Credits", "Recurring Payments", "MoneyGram", "Customer Invoices", "Payment Methods"].map((tab, i) => (
                  <button
                    key={tab}
                    className={`px-2.5 py-2 text-[10px] font-medium transition-colors border-b-2 ${
                      i === 0
                        ? "text-[#333] border-[#c0392b]"
                        : "text-gray-400 border-transparent hover:text-gray-600"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              {/* Main ledger area */}
              <div className="flex flex-1 min-h-0">
                {/* Ledger sidebar */}
                <div className="w-[130px] shrink-0 border-r border-gray-200 bg-white p-3 space-y-3 text-[10px]">
                  <div><span className="text-gray-700 font-semibold">Resident:</span> <span className="text-gray-700">$3,482.35</span></div>
                  <div className="text-gray-400">Group: $0</div>
                  <div className="text-gray-400">Harris/Ledger: $0</div>
                  <div className="text-gray-400">HP/Ledger: $0</div>
                  <div className="text-gray-400">Subsidy ledger custom: $0</div>
                  <div className="text-gray-400">Deposits Held: $390</div>
                </div>
                {/* Ledger table area */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-2 shrink-0">
                    <button className="rounded border border-gray-300 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1"><span className="text-gray-400">▾</span> Add</button>
                    <button className="rounded border border-gray-300 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1"><span className="text-gray-400">▾</span> Filter</button>
                    <div className="flex-1" />
                    <button className="rounded border border-gray-300 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50">Generate Statement</button>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-1.5 border-b border-gray-100 shrink-0">
                    <button className="rounded bg-gray-200 px-2.5 py-0.5 text-[10px] font-medium text-gray-700">Open Items</button>
                    <button className="rounded px-2.5 py-0.5 text-[10px] font-medium text-gray-400 hover:bg-gray-100">Full Ledger</button>
                    <label className="flex items-center gap-1 text-[10px] text-gray-400 ml-3">Resident Friendly Mode: <input type="checkbox" className="h-3 w-3 accent-gray-500" /></label>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-[10px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b border-gray-200 bg-gray-50 text-left text-[9px] text-gray-500 uppercase tracking-wide">
                          <th className="px-2 py-1.5 font-medium w-6"><input type="checkbox" className="h-3 w-3" /></th>
                          <th className="px-2 py-1.5 font-medium">Post Date</th>
                          <th className="px-2 py-1.5 font-medium">Due Date</th>
                          <th className="px-2 py-1.5 font-medium">Post Mon</th>
                          <th className="px-2 py-1.5 font-medium">Created On</th>
                          <th className="px-2 py-1.5 font-medium">Trans ID</th>
                          <th className="px-2 py-1.5 font-medium">Invoice</th>
                          <th className="px-2 py-1.5 font-medium">Charge Code</th>
                          <th className="px-2 py-1.5 font-medium">Memo</th>
                          <th className="px-2 py-1.5 font-medium text-right">Charges</th>
                          <th className="px-2 py-1.5 font-medium text-right">Unapplied</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { postDate: "Jun 08, 2024", dueDate: "Jun 08, 2024", postMon: "06/2024", createdOn: "Jun 08, 2024 06:1", transId: "504369305", charge: "$5", unapplied: "$5", memo: "live testing", code: "live testing" },
                          { postDate: "Jun 07, 2024", dueDate: "Jun 07, 2024", postMon: "06/2024", createdOn: "Jun 07, 2024 06:0", transId: "604381115", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                          { postDate: "Jun 06, 2024", dueDate: "Jun 05, 2024", postMon: "06/2024", createdOn: "Jun 06, 2024 06:0", transId: "604184319", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                          { postDate: "Jun 05, 2024", dueDate: "Jun 05, 2024", postMon: "06/2024", createdOn: "Jun 05, 2024 06:0", transId: "503983188", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                          { postDate: "Jun 04, 2024", dueDate: "Jun 04, 2024", postMon: "06/2024", createdOn: "Jun 04, 2024 06:1", transId: "503980039", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                          { postDate: "Jun 03, 2024", dueDate: "Jun 03, 2024", postMon: "06/2024", createdOn: "Jun 03, 2024 06:2", transId: "503905723", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                          { postDate: "Jun 02, 2024", dueDate: "Jun 02, 2024", postMon: "06/2024", createdOn: "Jun 02, 2024 06:1", transId: "502313004", charge: "$20", unapplied: "$20", memo: "live testing", code: "live testing", highlight: true },
                          { postDate: "Jun 01, 2024", dueDate: "Jun 01, 2024", postMon: "06/2024", createdOn: "May 31, 2024 11:2", transId: "502049706", charge: "$120", unapplied: "$120", memo: "Monthly Credit", code: "Credit Fees", bold: true },
                          { postDate: "Jun 01, 2024", dueDate: "Jun 01, 2024", postMon: "06/2024", createdOn: "May 31, 2024 11:2", transId: "502049722", charge: "$500", unapplied: "$500", memo: "Monthly Admin", code: "Admin Fee", bold: true },
                          { postDate: "May 08, 2024", dueDate: "May 08, 2024", postMon: "05/2024", createdOn: "May 08, 2024 06:1", transId: "498473699", charge: "$5", unapplied: "$5", memo: "live testing", code: "live testing" },
                          { postDate: "May 07, 2024", dueDate: "May 07, 2024", postMon: "05/2024", createdOn: "May 07, 2024 06:1", transId: "498293910", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                          { postDate: "May 06, 2024", dueDate: "May 06, 2024", postMon: "05/2024", createdOn: "May 06, 2024 06:1", transId: "498108783", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                          { postDate: "May 05, 2024", dueDate: "May 05, 2024", postMon: "05/2024", createdOn: "May 05, 2024 06:1", transId: "498010055", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                          { postDate: "May 04, 2024", dueDate: "May 04, 2024", postMon: "05/2024", createdOn: "May 04, 2024 06:1", transId: "497940941", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                          { postDate: "May 03, 2024", dueDate: "May 03, 2024", postMon: "05/2024", createdOn: "May 03, 2024 06:1", transId: "497697662", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                          { postDate: "May 02, 2024", dueDate: "May 02, 2024", postMon: "05/2024", createdOn: "May 02, 2024 06:1", transId: "497477395", charge: "$20", unapplied: "$20", memo: "live testing", code: "live testing" },
                          { postDate: "May 01, 2024", dueDate: "May 01, 2024", postMon: "05/2024", createdOn: "Apr 30, 2024 11:3", transId: "497101603", charge: "$120", unapplied: "$120", memo: "Monthly Credit", code: "Credit Fees", bold: true },
                          { postDate: "May 01, 2024", dueDate: "May 01, 2024", postMon: "05/2024", createdOn: "Apr 30, 2024 11:3", transId: "497101655", charge: "$500", unapplied: "$500", memo: "Monthly Admin", code: "Admin Fee", bold: true },
                          { postDate: "Apr 25, 2024", dueDate: "Apr 25, 2024", postMon: "04/2024", createdOn: "Apr 25, 2024 06:1", transId: "496188940", charge: "$5", unapplied: "$5", memo: "live testing", code: "live testing" },
                        ].map((row, i) => (
                          <tr key={i} className={`border-b border-gray-100 ${(row as { highlight?: boolean }).highlight ? "bg-yellow-50" : ""}`}>
                            <td className="px-2 py-1.5"><input type="checkbox" className="h-3 w-3" /></td>
                            <td className="px-2 py-1.5 text-gray-700 whitespace-nowrap">{row.postDate}</td>
                            <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{row.dueDate}</td>
                            <td className="px-2 py-1.5 text-gray-500">{row.postMon}</td>
                            <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{row.createdOn}</td>
                            <td className="px-2 py-1.5 text-gray-500">{row.transId}</td>
                            <td className="px-2 py-1.5 text-blue-600 cursor-pointer hover:underline">Generate</td>
                            <td className="px-2 py-1.5 text-gray-700">{row.code}</td>
                            <td className={`px-2 py-1.5 ${(row as { bold?: boolean }).bold ? "text-blue-600 font-semibold cursor-pointer hover:underline" : "text-blue-600 cursor-pointer hover:underline"}`}>{row.memo}</td>
                            <td className="px-2 py-1.5 text-right text-gray-700">{row.charge}</td>
                            <td className="px-2 py-1.5 text-right text-gray-700">{row.unapplied}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* MIDDLE: Quick View sidebar — full height from top to bottom */}
            <div className="w-[190px] shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
              <div className="border-b border-gray-200 px-3 py-2.5">
                <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2.5 text-center">
                  <p className="text-[9px] font-medium text-gray-500 leading-tight">Lease Status: Current -</p>
                  <p className="text-[9px] text-gray-500 leading-tight">Month To Month</p>
                  <p className="mt-1.5 text-[10px] font-medium text-gray-700">Balance: <span className="text-[#c0392b] font-semibold">$3,482.35</span></p>
                </div>
                <button className="mt-2 w-full text-center text-[10px] text-blue-600 hover:underline">More Actions</button>
              </div>
              <div className="border-b border-gray-200 px-3 py-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-gray-700">Quick View</span>
                  <button className="text-[10px] text-blue-600 hover:underline">Edit</button>
                </div>
                <div className="space-y-1.5 text-[9px] leading-tight">
                  <div><span className="text-gray-400 font-medium">Primary Ph:</span><br /><span className="text-gray-700">+1 554-444-1111 · Mobile</span></div>
                  <div><span className="text-gray-400 font-medium">Email:</span><br /><span className="text-gray-700">rgadkar345@entrat...</span></div>
                  <div className="pt-1.5 border-t border-gray-100">
                    <span className="text-gray-400 font-medium">Transferred</span><br />
                    <span className="text-gray-400 font-medium">From:</span> <span className="text-blue-600 cursor-pointer hover:underline">629</span>
                  </div>
                  <div><span className="text-gray-400 font-medium">Move-in Date:</span> <span className="text-gray-700">Aug 19, 2014</span> <span className="text-gray-300 ml-0.5">📅</span></div>
                  <div><span className="text-gray-400 font-medium">Lease Start:</span> <span className="text-gray-700">Dec 06, 2023</span></div>
                  <div><span className="text-gray-400 font-medium">Lease End:</span> <span className="text-gray-700">Mar 05, 2024</span></div>
                  <div className="pt-1.5 border-t border-gray-100">
                    <span className="text-gray-400 font-medium">Late Payments:</span> <span className="text-blue-600 cursor-pointer hover:underline">9</span>
                  </div>
                  <div><span className="text-gray-400 font-medium">Returned</span><br /><span className="text-gray-400 font-medium">Payments:</span> <span className="text-blue-600 cursor-pointer hover:underline">0</span></div>
                  <div><span className="text-gray-400 font-medium">MTM Start:</span> <span className="text-gray-700">Mar 06, 2024</span></div>
                </div>
                <button className="mt-2 text-[10px] text-blue-600 hover:underline">Resident Login</button>
              </div>
              <div className="border-b border-gray-200 px-3 py-2.5">
                <p className="text-[10px] font-semibold text-gray-700 mb-1.5">Add Activity</p>
                <div className="flex items-center gap-1">
                  <button className="rounded border border-gray-200 p-1 text-gray-400 hover:bg-gray-50">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                  </button>
                  <input className="flex-1 rounded border border-gray-200 px-2 py-1 text-[10px] text-gray-500 placeholder:text-gray-300" placeholder="Add Note" />
                </div>
              </div>
              <div className="px-3 py-2.5">
                <p className="text-[10px] font-semibold text-gray-700 mb-2">Open Work Orders</p>
                <button className="mb-2.5 flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50">
                  <span className="text-green-600">⊕</span> Create Work Order
                </button>
                <div className="space-y-0 text-[9px]">
                  <div className="flex items-center justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-400 font-medium">Location</span>
                    <span className="text-gray-400 font-medium">Submitted</span>
                  </div>
                  {[
                    { loc: "Unit Wide fvf", date: "Mar 28, 2018" },
                    { loc: "Unit Wide fvf", date: "Mar 28, 2018" },
                    { loc: "00fresh kooldid", date: "Mar 21, 2018" },
                    { loc: "Unit Wide fvf", date: "Mar 21, 2018" },
                    { loc: "Unit Wide fvf", date: "Mar 14, 2018" },
                  ].map((wo, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-gray-50">
                      <span className="text-gray-600">{wo.loc}</span>
                      <span className="text-gray-400">{wo.date}</span>
                    </div>
                  ))}
                </div>
                <button className="mt-2.5 w-full text-center text-[10px] font-medium text-blue-600 hover:underline tracking-wide">VIEW ALL WORK ORDERS</button>
              </div>
            </div>

            </div>
          </div>

          {/* RIGHT: Conversation Threads panel — slides in from right */}
          {threadsPanelOpen && <div className="relative z-10 w-[320px] shrink-0 border-l border-gray-200 flex flex-col bg-white animate-in slide-in-from-right duration-200">

            {openThreadIdx !== null ? (
              /* ===== CONVERSATION THREAD VIEW ===== */
              <>
                {/* Thread header */}
                <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setOpenThreadIdx(null)}
                    className="text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2e7d32] text-[11px] font-bold text-white shrink-0">
                    {initials(selected.resident)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900">{selected.resident}</p>
                    <p className="text-[11px] text-gray-500">{THREAD_DATA[openThreadIdx]?.property}: {THREAD_DATA[openThreadIdx]?.type}</p>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOpenThreadIdx(null); setThreadsPanelOpen(false); }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Messages area — same style as inbox conversation panel */}
                <div className="flex-1 overflow-y-auto bg-muted/30 px-4 py-4">
                  <div className="space-y-4">
                    {(openThreadIdx >= 0 ? THREAD_DATA[openThreadIdx]?.messages ?? [] : []).map((msg, idx) => {
                      const isAgent = msg.role === "agent";
                      const isStaff = msg.role === "staff";
                      const threadData = THREAD_DATA[openThreadIdx];
                      const assigneeName = threadData?.assignee ?? "Staff";

                      return (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Avatar className={cn(isAgent || isStaff ? "h-7 w-7" : "h-5 w-5")}>
                              {isAgent ? (
                                <AvatarImage src="/eli-cube.svg" alt="ELI" className="p-1" />
                              ) : null}
                              <AvatarFallback
                                className={cn(
                                  (isAgent || isStaff)
                                    ? "bg-blue-100 text-[9px] text-blue-700"
                                    : "bg-muted text-[8px] text-muted-foreground"
                                )}
                              >
                                {isStaff
                                  ? initials(assigneeName)
                                  : isAgent ? "AI" : initials(selected.resident)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-semibold text-foreground">
                                {isAgent
                                  ? `ELI+ ${threadData?.type ?? ""} AI`
                                  : isStaff
                                    ? assigneeName
                                    : selected.resident}
                              </span>
                              {msg.timestamp && <span className="text-[9px] text-muted-foreground">{msg.timestamp}</span>}
                            </div>
                          </div>
                          <div
                            className={cn(
                              "max-w-[85%] rounded-2xl px-3.5 py-2 text-[12px] leading-relaxed",
                              (isAgent || isStaff) && "bg-blue-500 text-white",
                              !isAgent && !isStaff && "border border-border bg-card text-card-foreground shadow-sm"
                            )}
                          >
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Chat input — same style as inbox */}
                <div className="shrink-0 bg-muted/50">
                  <div className="flex items-center gap-1 px-4 pt-2 pb-1">
                    <Button
                      variant={threadInputMode === "message" ? "default" : "ghost"}
                      size="sm"
                      className="gap-1.5 rounded-full text-[11px] h-7"
                      onClick={() => setThreadInputMode("message")}
                    >
                      <MessageSquare className="h-3 w-3" />
                      Message
                    </Button>
                    <Button
                      variant={threadInputMode === "private_note" ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "gap-1.5 rounded-full text-[11px] h-7",
                        threadInputMode === "private_note" && "bg-amber-100 text-amber-800 hover:bg-amber-200"
                      )}
                      onClick={() => setThreadInputMode("private_note")}
                    >
                      <StickyNote className="h-3 w-3" />
                      Private Note
                    </Button>
                  </div>
                  <div className="px-4 pb-3">
                    <div
                      className={cn(
                        "flex flex-col rounded-xl border transition-colors focus-within:ring-1 focus-within:ring-ring",
                        threadInputMode === "private_note"
                          ? "border-amber-200 bg-amber-50"
                          : "border-input bg-background"
                      )}
                    >
                      <textarea
                        value={threadDraft}
                        onChange={(e) => setThreadDraft(e.target.value)}
                        placeholder={threadInputMode === "private_note" ? "Write a private note…" : "Write a message…"}
                        rows={2}
                        className="w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-[12px] placeholder:text-muted-foreground focus-visible:outline-none"
                      />
                      <div className="flex items-center justify-between px-2 pb-1.5">
                        <Button variant="ghost" size="sm" className="gap-1 text-[10px] text-muted-foreground h-7">
                          <Paperclip className="h-3 w-3" />
                          Attach
                        </Button>
                        <Button
                          size="icon"
                          className={cn(
                            "h-7 w-7 rounded-full",
                            threadInputMode === "private_note" && "bg-amber-600 hover:bg-amber-700"
                          )}
                          disabled={!threadDraft.trim()}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* ===== THREADS LIST VIEW ===== */
              <>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-[11px] font-bold text-gray-600">
                      {initials(selected.resident)}
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{selected.resident}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setThreadsPanelOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Threads */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Threads</h3>
                  {/* Active / Closed toggle */}
                  <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                    {(["active", "closed"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setThreadsFilter(tab)}
                        className={`rounded-md px-4 py-1.5 text-[12px] font-medium transition-colors ${
                          threadsFilter === tab
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {tab === "active" ? "Active" : "Closed"}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-5">
                    {THREAD_DATA.filter((t) => t.status === threadsFilter).map((thread, i) => {
                      const globalIdx = THREAD_DATA.indexOf(thread);
                      return (
                      <div
                        key={i}
                        className="flex items-start gap-3 cursor-pointer rounded-lg p-1.5 -mx-1.5 transition-colors hover:bg-gray-50"
                        onClick={() => setOpenThreadIdx(globalIdx)}
                      >
                        <div className="mt-0.5 flex items-center">
                          <span className={`inline-block h-2 w-2 rounded-full ${thread.status === "active" ? "bg-blue-500" : "bg-transparent"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-gray-900">{thread.property}: {thread.type}</p>
                          {getThreadAssignee(globalIdx) && <p className="text-[11px] text-gray-500 mt-0.5">Active: {getThreadAssignee(globalIdx)}</p>}
                          <span className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">{thread.channel}</span>
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className={
                                getThreadAssignee(globalIdx)
                                  ? `flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors hover:ring-2 hover:ring-gray-300 ${avatarColor(getThreadAssignee(globalIdx)!)}`
                                  : "shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                              }
                              title={getThreadAssignee(globalIdx) ? `Assigned to ${getThreadAssignee(globalIdx)}. Click to reassign.` : "Assign someone to this thread"}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {getThreadAssignee(globalIdx) ? initials(getThreadAssignee(globalIdx)!) : <Plus className="h-4 w-4" />}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="z-[70] w-[280px] p-0" align="end" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                            <ThreadAssignPicker
                              agents={THREAD_AGENTS}
                              currentAssignee={getThreadAssignee(globalIdx)}
                              onAssign={(name) => assignThread(globalIdx, name)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      );
                    })}
                  </div>
                  {/* New Thread button */}
                  <button
                    className="mt-5 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-1.5 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
                    onClick={() => setOpenThreadIdx(-1)}
                  >
                    New Thread
                    <Plus className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.5} />
                  </button>
                </div>
              </>
            )}
          </div>}
        </div>
      )}

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

function ThreadAssignPicker({
  agents,
  currentAssignee,
  onAssign,
}: {
  agents: string[];
  currentAssignee: string | null;
  onAssign: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.toLowerCase().trim();
  const filtered = agents.filter((a) => !q || a.toLowerCase().includes(q));

  return (
    <div>
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for Agent or Queue"
            className="flex-1 text-[13px] bg-transparent outline-none placeholder:text-gray-400"
          />
        </div>
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {filtered.map((name) => {
          const isAssigned = currentAssignee === name;
          return (
            <div
              key={name}
              className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onAssign(name)}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${isAssigned ? "bg-[#2e7d32] text-white" : avatarColor(name)}`}>
                {initials(name)}
              </div>
              <span className="flex-1 text-[14px] font-medium text-gray-800">{name}</span>
              {isAssigned ? (
                <span className="text-[13px] font-bold text-gray-900">Assigned</span>
              ) : (
                <span className="text-[13px] font-medium text-blue-600">Assign</span>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-[12px] text-gray-400">No agents found</p>
        )}
      </div>
    </div>
  );
}

function MiniCalendar({
  selected,
  onSelect,
  onNoLimit,
}: {
  selected: Date | null;
  onSelect: (date: Date) => void;
  onNoLimit: () => void;
}) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(
    selected?.getMonth() ?? today.getMonth()
  );
  const [viewYear, setViewYear] = useState(
    selected?.getFullYear() ?? today.getFullYear()
  );

  const MONTH_NAMES = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];
  const MONTHS_SHORT = [
    "JAN","FEB","MAR","APR","MAY","JUN",
    "JUL","AUG","SEP","OCT","NOV","DEC",
  ];
  const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const isBeforeToday = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return d < t;
  };

  const [pendingDate, setPendingDate] = useState<Date | null>(selected);

  return (
    <div className="w-[280px]">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <button
          type="button"
          className="text-sm font-semibold text-foreground flex items-center gap-1"
        >
          {MONTH_NAMES[viewMonth].toUpperCase()} {viewYear}{" "}
          <ChevronDown className="h-3 w-3" />
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded p-1 hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded p-1 hover:bg-accent transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 px-3">
        {DAYS.map((d) => (
          <div
            key={d}
            className="flex h-8 items-center justify-center text-[11px] font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="px-4 pb-1">
        <span className="text-[11px] font-semibold text-muted-foreground">
          {MONTHS_SHORT[viewMonth]}
        </span>
      </div>

      <div className="grid grid-cols-7 px-3 pb-2">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(viewYear, viewMonth, day);
          const isToday = isSameDay(date, today);
          const isSelected = pendingDate && isSameDay(date, pendingDate);
          const disabled = isBeforeToday(day);
          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => setPendingDate(date)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors mx-auto",
                disabled && "text-muted-foreground/40 cursor-not-allowed",
                !disabled && !isSelected && !isToday && "hover:bg-accent text-foreground",
                isToday && !isSelected && "ring-1 ring-primary text-primary font-medium",
                isSelected && "bg-primary text-primary-foreground font-medium"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
        <button
          type="button"
          onClick={onNoLimit}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          No limit
        </button>
        <Button
          size="sm"
          onClick={() => { if (pendingDate) onSelect(pendingDate); }}
          disabled={!pendingDate}
        >
          Apply
        </Button>
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

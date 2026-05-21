"use client";

import * as React from "react";
import {
  useConversations,
  isConversationUnattended,
  isWaitingOnResidentPublicReply,
  type ConversationItem,
} from "@/lib/conversations-context";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Mail,
  Phone,
  Smartphone,
  Monitor,
  Users,
  Bot,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";

const CHANNEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  SMS: Smartphone,
  Email: Mail,
  Phone: Phone,
  "Resident Portal": Monitor,
  Chat: MessageSquare,
};

export function CommunicationsInsights() {
  const { items } = useConversations();

  const stats = React.useMemo(() => {
    const open = items.filter((i) => i.status === "open").length;
    const resolved = items.filter((i) => i.status === "resolved").length;
    const unattended = items.filter((i) => isConversationUnattended(i)).length;
    const waitingOnResident = items.filter((i) => isWaitingOnResidentPublicReply(i)).length;
    const withEscalation = items.filter((i) =>
      i.labels.some((l) => l.toLowerCase().includes("escalation"))
    ).length;
    const unread = items.filter((i) => i.hasUnread).length;

    const aiHandled = items.filter((i) =>
      i.messages.some((m) => m.role === "agent") && i.agent !== "Staff"
    ).length;
    const humanOnly = items.filter((i) =>
      !i.messages.some((m) => m.role === "agent") || i.agent === "Staff"
    ).length;

    return {
      total: items.length,
      open,
      resolved,
      unattended,
      waitingOnResident,
      withEscalation,
      unread,
      aiHandled,
      humanOnly,
    };
  }, [items]);

  const byChannel = React.useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((i) => {
      map[i.channel] = (map[i.channel] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const byProperty = React.useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((i) => {
      map[i.property] = (map[i.property] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const byContactType = React.useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((i) => {
      map[i.contactType] = (map[i.contactType] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const byAgent = React.useMemo(() => {
    const map: Record<string, { total: number; escalated: number }> = {};
    items.forEach((i) => {
      const agent = i.agent || "Unassigned";
      if (!map[agent]) map[agent] = { total: 0, escalated: 0 };
      map[agent].total++;
      if (i.labels.some((l) => l.toLowerCase().includes("escalation"))) {
        map[agent].escalated++;
      }
    });
    return Object.entries(map)
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => b.total - a.total);
  }, [items]);

  const byAssignee = React.useMemo(() => {
    const map: Record<string, { open: number; total: number }> = {};
    items.forEach((i) => {
      const assignee = i.assignee || "Unassigned";
      if (!map[assignee]) map[assignee] = { open: 0, total: 0 };
      map[assignee].total++;
      if (i.status === "open") map[assignee].open++;
    });
    return Object.entries(map)
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => b.open - a.open);
  }, [items]);

  const escalatedThreads = React.useMemo(
    () =>
      items.filter((i) =>
        i.labels.some((l) => l.toLowerCase().includes("escalation"))
      ),
    [items]
  );

  const unattendedThreads = React.useMemo(
    () => items.filter((i) => isConversationUnattended(i)),
    [items]
  );

  const [tab, setTab] = React.useState<"overview" | "channels" | "ai" | "attention">("overview");

  return (
    <div className="space-y-5">
      {/* Health strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<MessageSquare className="h-3.5 w-3.5" />}
          label="Total threads"
          value={stats.total.toString()}
          delta={`${stats.open} open · ${stats.resolved} resolved`}
        />
        <StatCard
          icon={<Bot className="h-3.5 w-3.5" />}
          label="AI handled"
          value={stats.aiHandled.toString()}
          delta={`${stats.humanOnly} human-only threads`}
        />
        <StatCard
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="Needs attention"
          value={stats.unattended.toString()}
          delta={`${stats.unread} unread · ${stats.withEscalation} escalated`}
          tone={stats.unattended > 0 ? "warn" : "good"}
        />
        <StatCard
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Waiting on resident"
          value={stats.waitingOnResident.toString()}
          delta="last message was outbound"
        />
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-0.5">
        {(
          [
            { id: "overview", label: "Thread overview" },
            { id: "channels", label: "Channel mix" },
            { id: "ai", label: "AI performance" },
            { id: "attention", label: "Needs attention" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Thread distribution by property, contact type, and assignee workload.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <BreakdownCard title="By property" data={byProperty} />
            <BreakdownCard title="By contact type" data={byContactType} />
          </div>

          {/* Assignee workload */}
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Workload by assignee
            </div>
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2">Assignee</th>
                  <th className="px-4 py-2 text-right">Open</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {byAssignee.map((a) => (
                  <tr key={a.name} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-foreground">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{a.open}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-foreground">{a.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "channels" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            How conversations are distributed across communication channels.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {byChannel.map(([channel, count]) => {
              const Icon = CHANNEL_ICONS[channel] ?? MessageSquare;
              const pct = items.length > 0 ? Math.round((count / items.length) * 100) : 0;
              return (
                <div
                  key={channel}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{channel}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {count} thread{count !== 1 ? "s" : ""} · {pct}%
                    </div>
                  </div>
                  <div
                    className="ml-auto text-2xl font-semibold tabular-nums text-foreground"
                    style={{
                      fontFamily:
                        "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif",
                    }}
                  >
                    {count}
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI vs Human by channel */}
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              AI vs human handling by channel
            </div>
            <div className="divide-y divide-border/60">
              {byChannel.map(([channel]) => {
                const channelItems = items.filter((i) => i.channel === channel);
                const ai = channelItems.filter(
                  (i) => i.messages.some((m) => m.role === "agent") && i.agent !== "Staff"
                ).length;
                const human = channelItems.length - ai;
                return (
                  <div key={channel} className="flex items-center gap-4 px-4 py-2.5">
                    <span className="w-32 text-sm text-foreground">{channel}</span>
                    <div className="flex flex-1 items-center gap-2">
                      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="absolute left-0 top-0 h-full rounded-full bg-foreground/70"
                          style={{
                            width: `${channelItems.length > 0 ? (ai / channelItems.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Bot className="h-3 w-3" />
                        {ai}
                      </span>
                      <span className="flex items-center gap-1">
                        <UserCheck className="h-3 w-3" />
                        {human}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === "ai" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            AI agent performance — which agents are handling threads and how often they escalate.
          </p>
          <div className="rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2">Agent</th>
                  <th className="px-4 py-2 text-right">Threads</th>
                  <th className="px-4 py-2 text-right">Escalated</th>
                  <th className="px-4 py-2 text-right">Escalation rate</th>
                </tr>
              </thead>
              <tbody>
                {byAgent.map((a) => {
                  const rate =
                    a.total > 0 ? Math.round((a.escalated / a.total) * 100) : 0;
                  return (
                    <tr key={a.name} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {a.name === "Staff" ? (
                            <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span className="text-foreground">{a.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                        {a.total}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                        {a.escalated > 0 ? a.escalated : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {a.escalated > 0 ? (
                          <Badge
                            variant={rate > 20 ? "yellow" : "green"}
                            className="text-[10px]"
                          >
                            {rate}%
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* AI summary card */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                AI deflection rate
              </div>
              <div
                className="mt-1 text-2xl font-semibold text-emerald-700"
                style={{
                  fontFamily:
                    "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif",
                }}
              >
                {items.length > 0
                  ? `${Math.round((stats.aiHandled / items.length) * 100)}%`
                  : "—"}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                of threads handled by AI
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Escalation rate
              </div>
              <div
                className="mt-1 text-2xl font-semibold text-foreground"
                style={{
                  fontFamily:
                    "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif",
                }}
              >
                {items.length > 0
                  ? `${Math.round((stats.withEscalation / items.length) * 100)}%`
                  : "—"}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                of threads escalated to human
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Human-only threads
              </div>
              <div
                className="mt-1 text-2xl font-semibold text-foreground"
                style={{
                  fontFamily:
                    "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif",
                }}
              >
                {stats.humanOnly}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                no AI involvement
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "attention" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Threads that need staff action — unattended conversations and active escalations.
          </p>

          {unattendedThreads.length > 0 && (
            <div className="rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Unattended threads
                </span>
                <Badge variant="yellow" className="text-[10px]">
                  {unattendedThreads.length}
                </Badge>
              </div>
              <div className="divide-y divide-border/60">
                {unattendedThreads.map((t) => (
                  <ThreadRow key={t.id} thread={t} />
                ))}
              </div>
            </div>
          )}

          {escalatedThreads.length > 0 && (
            <div className="rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Escalated threads
                </span>
                <Badge variant="destructive" className="text-[10px]">
                  {escalatedThreads.length}
                </Badge>
              </div>
              <div className="divide-y divide-border/60">
                {escalatedThreads.map((t) => (
                  <ThreadRow key={t.id} thread={t} />
                ))}
              </div>
            </div>
          )}

          {unattendedThreads.length === 0 && escalatedThreads.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
              <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500" />
              <div className="mt-2 text-sm">All clear — no threads need attention.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ThreadRow({ thread }: { thread: ConversationItem }) {
  const ChannelIcon = CHANNEL_ICONS[thread.channel] ?? MessageSquare;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <ChannelIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-foreground">{thread.resident}</span>
          {thread.unit && (
            <span className="text-[11px] text-muted-foreground">Unit {thread.unit}</span>
          )}
        </div>
        <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
          {thread.preview}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="secondary" className="text-[10px]">
          {thread.property}
        </Badge>
        <span className="text-[11px] text-muted-foreground">{thread.time}</span>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  delta,
  tone,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  delta?: string;
  tone?: "good" | "warn";
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold leading-tight",
          tone === "good"
            ? "text-emerald-700"
            : tone === "warn"
            ? "text-amber-700"
            : "text-foreground"
        )}
        style={{
          fontFamily: "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {value}
      </div>
      {delta && <div className="mt-0.5 text-xs text-muted-foreground">{delta}</div>}
    </div>
  );
}

function BreakdownCard({
  title,
  data,
}: {
  title: string;
  data: [string, number][];
}) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="divide-y divide-border/60">
        {data.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">No data</div>
        ) : (
          data.map(([label, count]) => (
            <div key={label} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-foreground">{label}</span>
              <span className="text-sm font-medium tabular-nums text-foreground">{count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

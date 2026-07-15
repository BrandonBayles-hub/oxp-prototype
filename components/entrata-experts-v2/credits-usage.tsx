"use client";
import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, Settings2 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";

// ──────────────────────────────────────────────────────────────────────────────
// Sample data (prototype only — real data wires in production)
// ──────────────────────────────────────────────────────────────────────────────

type RangeId = "1d" | "7d" | "30d";

const HEADING_FONT =
  "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif";

const EXPERT_COLORS: Record<string, string> = {
  "Entrata Analyst": "#10b981",
  "Everyday Assistant": "#0ea5e9",
  "Multifamily Research": "#a855f7",
  "Report Analyzer": "#f59e0b",
};

const EXPERTS = Object.keys(EXPERT_COLORS);

function buildDailyUsage(days: number) {
  const today = new Date("2026-05-20T00:00:00");
  const out: Array<{
    date: string;
    label: string;
    [expert: string]: number | string;
  }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const label = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const weekday = d.getDay();
    const weekend = weekday === 0 || weekday === 6;
    const base = weekend ? 0.35 : 1;
    const seed = (i * 9301 + 49297) % 233280;
    const rand = (n: number) => ((seed * (n + 1)) % 233280) / 233280;
    const row: { date: string; label: string; [k: string]: number | string } = {
      date: d.toISOString().slice(0, 10),
      label,
    };
    row["Entrata Analyst"] = Math.round((4000 + rand(1) * 6000) * base);
    row["Everyday Assistant"] = Math.round((1500 + rand(2) * 2500) * base);
    row["Multifamily Research"] = Math.round((800 + rand(3) * 1400) * base);
    row["Report Analyzer"] = Math.round((400 + rand(4) * 1200) * base);
    out.push(row);
  }
  return out;
}

const DAILY_30 = buildDailyUsage(30);

function rangeRows(range: RangeId) {
  if (range === "1d") return DAILY_30.slice(-1);
  if (range === "7d") return DAILY_30.slice(-7);
  return DAILY_30;
}

function sumByExpert(
  rows: ReturnType<typeof buildDailyUsage>,
): { name: string; value: number }[] {
  return EXPERTS.map((e) => ({
    name: e,
    value: rows.reduce((acc, r) => acc + (r[e] as number), 0),
  }));
}

function totalTokens(rows: ReturnType<typeof buildDailyUsage>) {
  return rows.reduce(
    (acc, r) => acc + EXPERTS.reduce((s, e) => s + (r[e] as number), 0),
    0,
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// LLM model usage. Names + hues mirror lib/entrata-experts-v2/lenses.ts so the
// dashboard stays consistent with the chat model picker. `avgPerConvo` shows how
// model choice drives token consumption (heavier-reasoning models burn more).
// ──────────────────────────────────────────────────────────────────────────────

const MODEL_SERIES: {
  name: string;
  provider: string;
  color: string;
  share: number;
  avgPerConvo: number;
}[] = [
  {
    name: "Claude Opus 4.7",
    provider: "Anthropic",
    color: "#c2410c",
    share: 0.5,
    avgPerConvo: 18_200,
  },
  {
    name: "GPT-5.5",
    provider: "OpenAI",
    color: "#3b7a9e",
    share: 0.34,
    avgPerConvo: 11_400,
  },
  {
    name: "Kimi K2.5",
    provider: "Moonshot",
    color: "#7c3aed",
    share: 0.16,
    avgPerConvo: 7_600,
  },
];

const MODELS = MODEL_SERIES.map((m) => m.name);

// Allocate each day's total tokens across models by share (with a small
// deterministic daily jitter), so the by-model series ties back to the same
// daily totals as the by-expert chart.
function buildModelRows(
  rows: ReturnType<typeof buildDailyUsage>,
): Array<{ label: string; [model: string]: number | string }> {
  return rows.map((r, i) => {
    const total = EXPERTS.reduce((s, e) => s + (r[e] as number), 0);
    const weights = MODEL_SERIES.map(
      (m, k) => m.share * (1 + (((i * 7 + k * 13) % 11) - 5) / 100),
    );
    const wSum = weights.reduce((a, b) => a + b, 0);
    const out: { label: string; [model: string]: number | string } = {
      label: r.label,
    };
    MODEL_SERIES.forEach((m, k) => {
      out[m.name] = Math.round((total * weights[k]) / wSum);
    });
    return out;
  });
}

const INTENT_DATA = [
  { name: "Ask a question", value: 38.2, color: "#10b981" },
  { name: "Generate analysis", value: 27.4, color: "#0ea5e9" },
  { name: "Draft content", value: 18.9, color: "#a855f7" },
  { name: "Summarize document", value: 10.1, color: "#f59e0b" },
  { name: "Run workflow", value: 5.4, color: "#ef4444" },
];

const CATEGORY_DATA = [
  { name: "Resident comms", value: 22.1, color: "#10b981" },
  { name: "Leasing", value: 17.8, color: "#0ea5e9" },
  { name: "Accounting", value: 15.5, color: "#a855f7" },
  { name: "Maintenance", value: 12.3, color: "#f59e0b" },
  { name: "Marketing", value: 11.6, color: "#ef4444" },
  { name: "Reporting", value: 10.4, color: "#8b5cf6" },
  { name: "Other", value: 10.3, color: "#64748b" },
];

const TASK_COMPLEXITY = [
  { name: "Trivial", value: 8.4, color: "#34d399" },
  { name: "Low", value: 22.1, color: "#10b981" },
  { name: "Medium", value: 41.7, color: "#f59e0b" },
  { name: "High", value: 27.8, color: "#f97316" },
];

const LEADERBOARD = [
  {
    user: "Maya Chen",
    email: "mchen@entrata.com",
    favoriteExpert: "Entrata Analyst",
    conversations: 184,
    tokens: 412_390,
  },
  {
    user: "Jordan Ruiz",
    email: "jruiz@entrata.com",
    favoriteExpert: "Everyday Assistant",
    conversations: 142,
    tokens: 318_770,
  },
  {
    user: "Devon Christensen",
    email: "dchristensen@entrata.com",
    favoriteExpert: "Multifamily Research",
    conversations: 96,
    tokens: 274_550,
  },
  {
    user: "Sasha Patel",
    email: "spatel@entrata.com",
    favoriteExpert: "Report Analyzer",
    conversations: 88,
    tokens: 211_430,
  },
  {
    user: "Logan Brooks",
    email: "lbrooks@entrata.com",
    favoriteExpert: "Entrata Analyst",
    conversations: 71,
    tokens: 165_220,
  },
];

const RECENT_ACTIVITY = [
  {
    when: "May 20, 4:18 PM",
    user: "Maya Chen",
    expert: "Entrata Analyst",
    type: "Conversation",
    tokens: 5_904_122,
  },
  {
    when: "May 20, 4:09 PM",
    user: "Jordan Ruiz",
    expert: "Everyday Assistant",
    type: "Conversation",
    tokens: 202_318,
  },
  {
    when: "May 20, 3:20 PM",
    user: "Sasha Patel",
    expert: "Report Analyzer",
    type: "Document upload",
    tokens: 4_612_004,
  },
  {
    when: "May 20, 2:19 PM",
    user: "Devon Christensen",
    expert: "Multifamily Research",
    type: "Conversation",
    tokens: 713_290,
  },
  {
    when: "May 19, 5:41 PM",
    user: "Logan Brooks",
    expert: "Entrata Analyst",
    type: "Conversation",
    tokens: 113_440,
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function pct(n: number, of: number) {
  return Math.round((n / of) * 100);
}

const TOKEN_CAP = 50_000_000; // tokens included in plan
const ON_DEMAND_CAP = 250; // dollars

// ──────────────────────────────────────────────────────────────────────────────
// Page shell — splits into Analytics / Usage / Conversation Insights sub-tabs
// ──────────────────────────────────────────────────────────────────────────────

type SubTab = "analytics" | "usage" | "insights";

export function CreditsUsage() {
  const [subTab, setSubTab] = React.useState<SubTab>("analytics");
  const [range, setRange] = React.useState<RangeId>("7d");

  return (
    <div className="space-y-5">
      <Tabs
        value={subTab}
        onValueChange={(v) => setSubTab(v as SubTab)}
        className="space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="h-auto p-0.5">
            <TabsTrigger value="analytics" className="text-xs">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="usage" className="text-xs">
              Usage
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-xs">
              Conversation Insights
            </TabsTrigger>
          </TabsList>

          {subTab !== "usage" && (
            <RangePicker range={range} onChange={setRange} />
          )}
        </div>

        <TabsContent value="analytics" className="mt-0">
          <AnalyticsPanel range={range} />
        </TabsContent>

        <TabsContent value="usage" className="mt-0">
          <UsagePanel />
        </TabsContent>

        <TabsContent value="insights" className="mt-0">
          <InsightsPanel range={range} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Analytics tab — headline stats + token usage over time + leaderboard
// ──────────────────────────────────────────────────────────────────────────────

function AnalyticsPanel({ range }: { range: RangeId }) {
  const rows = rangeRows(range);
  const tokens = totalTokens(rows);
  const byExpert = sumByExpert(rows);
  const conversations = Math.max(1, Math.round(tokens / 11_500));
  const activeUsers = range === "1d" ? 7 : range === "7d" ? 18 : 24;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Total tokens"
          value={compact(tokens)}
          hint={`${range} window`}
        />
        <StatCard
          label="Conversations"
          value={conversations.toLocaleString()}
          hint={`${(tokens / conversations / 1000).toFixed(1)}K tokens / convo`}
        />
        <StatCard
          label="Active users"
          value={`${activeUsers}`}
          hint="of 24 seats provisioned"
        />
        <StatCard
          label="Most-used expert"
          value={byExpert[0].name.split(" ")[0]}
          hint={`${compact(byExpert[0].value)} tokens this window`}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Token usage over time</CardTitle>
              <CardDescription>
                Tokens consumed per day, broken down by expert.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {EXPERTS.map((e) => (
                <span
                  key={e}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: EXPERT_COLORS[e] }}
                  />
                  {e}
                </span>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
              >
                <CartesianGrid stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => compact(v)}
                />
                <Tooltip
                  cursor={{ fill: "rgba(16, 185, 129, 0.08)" }}
                  contentStyle={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [compact(v), ""]}
                />
                {EXPERTS.map((e) => (
                  <Bar
                    key={e}
                    dataKey={e}
                    stackId="tokens"
                    fill={EXPERT_COLORS[e]}
                    radius={[2, 2, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <ModelUsageCard rows={rows} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Usage leaderboard</CardTitle>
          <CardDescription>
            Top teammates by tokens consumed in the {range} window.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Favorite expert</TableHead>
                <TableHead className="text-right">Conversations</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LEADERBOARD.map((row, i) => (
                <TableRow key={row.email}>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {i + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-semibold text-emerald-700">
                        {row.user
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{row.user}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {row.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-sm">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{
                          background: EXPERT_COLORS[row.favoriteExpert],
                        }}
                      />
                      {row.favoriteExpert}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.conversations.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {row.tokens.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Token usage by LLM model — shows how model choice drives consumption
// ──────────────────────────────────────────────────────────────────────────────

function ModelUsageCard({
  rows,
}: {
  rows: ReturnType<typeof buildDailyUsage>;
}) {
  const modelRows = buildModelRows(rows);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Token usage by model</CardTitle>
            <CardDescription>
              Tokens consumed per day by underlying LLM. Heavier-reasoning
              models burn more tokens per conversation.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {MODEL_SERIES.map((m) => (
              <span
                key={m.name}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: m.color }}
                />
                <span className="font-medium text-foreground">{m.name}</span>
                <span className="tabular-nums">
                  {compact(m.avgPerConvo)}/convo
                </span>
              </span>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={modelRows}
              margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
            >
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => compact(v)}
              />
              <Tooltip
                contentStyle={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(v: number, name) => [compact(v), name]}
              />
              {MODEL_SERIES.map((m) => (
                <Line
                  key={m.name}
                  type="monotone"
                  dataKey={m.name}
                  stroke={m.color}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: m.color, strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Usage tab — plan cards + cumulative spend + recent activity
// ──────────────────────────────────────────────────────────────────────────────

function UsagePanel() {
  const monthRows = DAILY_30;
  const tokensThisMonth = totalTokens(monthRows);
  const onDemandSpend = 52.82;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[11px] font-medium uppercase tracking-wider">
                Included tokens used
              </CardDescription>
              <Badge variant="secondary" className="text-[10px]">
                Resets Jun 1, 2026
              </Badge>
            </div>
            <CardTitle
              className="text-2xl font-semibold"
              style={{ fontFamily: HEADING_FONT }}
            >
              {compact(tokensThisMonth)}{" "}
              <span className="text-base font-normal text-muted-foreground">
                / {compact(TOKEN_CAP)} tokens
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={tokensThisMonth} max={TOKEN_CAP} />
            <p className="text-xs text-muted-foreground">
              {pct(tokensThisMonth, TOKEN_CAP)}% of monthly allotment used ·
              Plan: Entrata Experts (Beta)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[11px] font-medium uppercase tracking-wider">
                On-demand usage
              </CardDescription>
              <Badge variant="secondary" className="text-[10px]">
                $30.00 per seat
              </Badge>
            </div>
            <CardTitle
              className="text-2xl font-semibold"
              style={{ fontFamily: HEADING_FONT }}
            >
              ${onDemandSpend.toFixed(2)}{" "}
              <span className="text-base font-normal text-muted-foreground">
                / ${ON_DEMAND_CAP.toFixed(2)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={onDemandSpend} max={ON_DEMAND_CAP} />
            <p className="text-xs text-muted-foreground">
              Pay-as-you-go for tokens beyond your plan limits.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">
                Cumulative on-demand spend
              </CardTitle>
              <CardDescription>
                Dollar cost accrued as on-demand tokens are consumed this month.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Settings
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={buildCumulativeSpend(monthRows)}
                margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`$${v.toFixed(2)}`, "Spend"]}
                />
                <Area
                  type="monotone"
                  dataKey="spend"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#spendGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription>
            Live billing events appear here in the production product. Values
            shown below are sample data for the prototype.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Expert</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RECENT_ACTIVITY.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.when}
                  </TableCell>
                  <TableCell className="text-sm">{r.user}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-sm">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: EXPERT_COLORS[r.expert] }}
                      />
                      {r.expert}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {r.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {r.tokens.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Conversation Insights tab — donut charts
// ──────────────────────────────────────────────────────────────────────────────

function InsightsPanel({ range }: { range: RangeId }) {
  const rows = rangeRows(range);
  const byExpert = sumByExpert(rows);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DonutCard
          title="Tokens by expert"
          description={`Share of token spend across experts in the ${range} window.`}
          data={byExpert.map((d) => ({
            name: d.name,
            value: d.value,
            color: EXPERT_COLORS[d.name],
          }))}
          formatValue={(v) => compact(v)}
        />
        <DonutCard
          title="Intent distribution"
          description="What people are asking experts to do."
          data={INTENT_DATA}
          formatValue={(v) => `${v.toFixed(1)}%`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DonutCard
          title="Top categories"
          description="Subject areas conversations cover."
          data={CATEGORY_DATA}
          formatValue={(v) => `${v.toFixed(1)}%`}
        />
        <DonutCard
          title="Task complexity"
          description="Rough cost-to-serve mix."
          data={TASK_COMPLEXITY}
          formatValue={(v) => `${v.toFixed(1)}%`}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Shared subcomponents
// ──────────────────────────────────────────────────────────────────────────────

function RangePicker({
  range,
  onChange,
}: {
  range: RangeId;
  onChange: (r: RangeId) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-md border bg-card p-0.5 text-xs">
      {(["1d", "7d", "30d"] as RangeId[]).map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={
            "rounded px-3 py-1.5 font-medium transition-colors " +
            (range === r
              ? "bg-emerald-600 text-white"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          {r}
        </button>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-1.5">
        <CardDescription className="text-[11px] font-medium uppercase tracking-wider">
          {label}
        </CardDescription>
        <CardTitle
          className="text-2xl font-semibold"
          style={{ fontFamily: HEADING_FONT }}
        >
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>
    </Card>
  );
}

function DonutCard({
  title,
  description,
  data,
  formatValue,
}: {
  title: string;
  description: string;
  data: { name: string; value: number; color: string }[];
  formatValue: (v: number) => string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="relative h-[180px] w-[180px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={56}
                  outerRadius={82}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [formatValue(v), ""]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Total
              </div>
              <div
                className="text-sm font-semibold"
                style={{ fontFamily: HEADING_FONT }}
              >
                {formatValue(total)}
              </div>
            </div>
          </div>
          <ul className="flex-1 space-y-1.5 text-[12px]">
            {data.map((d) => {
              const share = total === 0 ? 0 : (d.value / total) * 100;
              return (
                <li key={d.name} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ background: d.color }}
                  />
                  <span className="flex-1 truncate text-foreground">
                    {d.name}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {share.toFixed(1)}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function buildCumulativeSpend(
  rows: ReturnType<typeof buildDailyUsage>,
): { label: string; spend: number }[] {
  const RATE_PER_M = 1.6;
  let running = 0;
  return rows.map((r) => {
    const dayTokens = EXPERTS.reduce((s, e) => s + (r[e] as number), 0);
    running += (dayTokens * 0.05 * RATE_PER_M) / 1_000_000;
    return { label: r.label, spend: Number(running.toFixed(2)) };
  });
}

import type { Role } from "@/lib/role-context";
import type { FeatureId } from "@/lib/feature-entitlements-context";

/* ─────────────────────────────── Types ──────────────────────────────── */

export type PlgBenefit = {
  icon: string;
  title: string;
  body: string;
};

export type PlgMessage = {
  featureId: FeatureId;
  role: Role;
  headline: string;
  description: string;
  benefits: [PlgBenefit, PlgBenefit, PlgBenefit];
  metric: { value: string; label: string };
};

/* ─────────────────────────────── Data ───────────────────────────────── */

const MESSAGES: PlgMessage[] = [
  // ── AI Agents ──────────────────────────────────────────────────────────
  {
    featureId: "ai-agents",
    role: "admin",
    headline: "Scale operations without scaling headcount",
    description:
      "Deploy AI agents that handle 70%+ of resident inquiries autonomously. Reduce staffing costs, improve response times, and scale operations across your portfolio without adding headcount.",
    benefits: [
      { icon: "Zap", title: "Instant response times", body: "AI agents respond to prospects and residents in seconds — 24/7, across every channel." },
      { icon: "DollarSign", title: "Reduce cost per interaction", body: "Cut cost per conversation by up to 80% compared to fully staffed operations." },
      { icon: "TrendingUp", title: "Portfolio-wide deployment", body: "Configure once, deploy everywhere. Consistent service quality at every property." },
    ],
    metric: { value: "73%", label: "of inquiries resolved without human intervention" },
  },
  {
    featureId: "ai-agents",
    role: "regional",
    headline: "Resolve routine inquiries in seconds, not hours",
    description:
      "Your properties could be handling leasing questions, maintenance requests, and renewals automatically. AI agents free your teams to focus on high-value interactions that drive occupancy and retention.",
    benefits: [
      { icon: "Clock", title: "Faster resolution", body: "Average response time drops from hours to seconds for routine inquiries." },
      { icon: "Users", title: "Staff focus on what matters", body: "Your team spends time on complex cases and resident relationships, not repetitive questions." },
      { icon: "BarChart3", title: "Cross-property visibility", body: "See how AI is performing across every property in your region — one dashboard." },
    ],
    metric: { value: "4.5x", label: "faster average response time vs staff-only operations" },
  },
  {
    featureId: "ai-agents",
    role: "property",
    headline: "Never miss a lead or resident inquiry again",
    description:
      "AI agents respond to prospects and residents 24/7, handling the repetitive questions so your team can focus on tours, move-ins, and the interactions that close leases.",
    benefits: [
      { icon: "Clock", title: "24/7 availability", body: "Prospects get instant answers after hours and on weekends — when 40% of inquiries come in." },
      { icon: "MessageSquare", title: "Handle the volume", body: "No more choosing which messages to answer first. AI handles routine inquiries instantly." },
      { icon: "Target", title: "Better lead conversion", body: "Faster response times mean more tours booked and fewer prospects lost to competitors." },
    ],
    metric: { value: "40%", label: "of prospect inquiries happen outside business hours" },
  },
  {
    featureId: "ai-agents",
    role: "ic",
    headline: "Less inbox overwhelm, more meaningful work",
    description:
      "AI agents handle the routine inquiries — balance questions, maintenance status checks, lease info — so you can focus on the residents and tasks that need a human touch.",
    benefits: [
      { icon: "Shield", title: "Focus on what matters", body: "Spend your time on complex resident needs, not answering the same questions repeatedly." },
      { icon: "Zap", title: "Instant backup", body: "AI handles overflow when you're busy with tours, move-ins, or maintenance emergencies." },
      { icon: "CheckCircle", title: "Nothing falls through", body: "Every inquiry gets a response, even when you're out of the office." },
    ],
    metric: { value: "3hrs", label: "saved per day on routine inquiries" },
  },

  // ── Workflows ──────────────────────────────────────────────────────────
  {
    featureId: "workflows",
    role: "admin",
    headline: "Automate the processes that drain your teams",
    description:
      "Connect AI agent actions to Entrata and your systems so routine processes — lead follow-ups, renewal reminders, work order routing — execute automatically without manual intervention.",
    benefits: [
      { icon: "GitBranch", title: "End-to-end automation", body: "From trigger to action, workflows execute without anyone clicking a button." },
      { icon: "Plug", title: "Deep Entrata integration", body: "Pre-built connectors for Entrata events, plus custom integrations for any external system." },
      { icon: "Shield", title: "Compliance built in", body: "Every automated action is logged, auditable, and governed by your guardrails." },
    ],
    metric: { value: "12hrs", label: "of manual work eliminated per property per week" },
  },
  {
    featureId: "workflows",
    role: "regional",
    headline: "Standardize operations across every property",
    description:
      "Automated workflows ensure every property follows the same processes — from lead follow-up timing to renewal outreach cadence. Consistent execution without relying on individual property staff.",
    benefits: [
      { icon: "Building2", title: "Consistent execution", body: "Every property runs the same proven playbook — no more variance in process quality." },
      { icon: "BarChart3", title: "Measurable impact", body: "Track which automations drive the most value across your portfolio." },
      { icon: "Clock", title: "Faster turnaround", body: "Automated reminders and follow-ups happen on time, every time." },
    ],
    metric: { value: "98%", label: "on-time follow-up rate with automated workflows" },
  },
  {
    featureId: "workflows",
    role: "property",
    headline: "Stop dropping the ball on follow-ups",
    description:
      "Automated workflows handle the repetitive processes — sending renewal reminders, following up on leads, notifying residents about work orders — so nothing slips through the cracks.",
    benefits: [
      { icon: "Bell", title: "Automatic follow-ups", body: "Every lead gets a timely follow-up. Every renewal gets a reminder. Automatically." },
      { icon: "Clock", title: "Time back for your team", body: "Hours of manual task coordination replaced by automated workflows." },
      { icon: "CheckCircle", title: "Nothing missed", body: "Automated triggers catch events your team might miss during busy periods." },
    ],
    metric: { value: "2x", label: "improvement in lead follow-up speed" },
  },
  {
    featureId: "workflows",
    role: "ic",
    headline: "Fewer manual tasks, fewer things to track",
    description:
      "Workflows automatically handle the routine steps — notifying residents, creating follow-up tasks, routing work orders — so you spend less time on administrative work.",
    benefits: [
      { icon: "Zap", title: "Automatic task creation", body: "Work orders, follow-ups, and reminders created automatically from triggers." },
      { icon: "Bell", title: "Stay informed", body: "Get notified when something needs your attention, not when a process needs clicking." },
      { icon: "CheckCircle", title: "Fewer manual steps", body: "Stop copying information between systems or sending the same emails over and over." },
    ],
    metric: { value: "45min", label: "saved per day on manual process steps" },
  },

  // ── Voice ──────────────────────────────────────────────────────────────
  {
    featureId: "voice",
    role: "admin",
    headline: "One brand voice across every AI interaction",
    description:
      "Define and enforce how your AI agents communicate — brand tone, channel settings, compliance guardrails, and per-property customization. Ensure every interaction reflects your brand and meets regulatory requirements.",
    benefits: [
      { icon: "Mic", title: "Brand consistency", body: "Every AI response follows your tone guidelines — professional, friendly, or however you define it." },
      { icon: "Shield", title: "Regulatory compliance", body: "Built-in phrasing rules for fair housing, screening, and other regulated areas." },
      { icon: "Building2", title: "Property-level control", body: "One voice for the portfolio, or customize per property for luxury, student, or senior communities." },
    ],
    metric: { value: "100%", label: "of AI interactions follow brand and compliance guidelines" },
  },
  {
    featureId: "voice",
    role: "regional",
    headline: "Ensure your properties sound like your brand",
    description:
      "Voice configuration ensures every AI interaction at every property maintains brand standards and complies with fair housing requirements — without relying on individual staff training.",
    benefits: [
      { icon: "Mic", title: "Consistent brand experience", body: "Prospects and residents get the same professional tone at every property." },
      { icon: "Shield", title: "Compliance peace of mind", body: "Fair housing phrasing rules enforced automatically in every conversation." },
      { icon: "SlidersHorizontal", title: "Tune by property", body: "Adjust tone for different property types — luxury, workforce, student, senior." },
    ],
    metric: { value: "0", label: "fair housing violations from AI-assisted communications" },
  },
  {
    featureId: "voice",
    role: "property",
    headline: "Your AI sounds like your team, not a robot",
    description:
      "Configure how AI agents talk to your residents and prospects. Set the tone, greeting, and communication style so interactions feel natural and on-brand for your community.",
    benefits: [
      { icon: "MessageSquare", title: "Natural conversations", body: "AI responses feel like they're coming from a member of your team, not a chatbot." },
      { icon: "Mic", title: "Custom greetings", body: "Set welcome messages and sign-offs that match your community's personality." },
      { icon: "Shield", title: "Safe communication", body: "Built-in compliance guardrails prevent problematic language automatically." },
    ],
    metric: { value: "4.5/5", label: "average resident satisfaction with AI interactions" },
  },
  {
    featureId: "voice",
    role: "ic",
    headline: "AI that communicates the way you would",
    description:
      "Voice settings ensure AI agents respond to residents with the same care and professionalism you would — using the right tone, following community guidelines, and knowing what not to say.",
    benefits: [
      { icon: "MessageSquare", title: "Consistent quality", body: "Residents get helpful, professional responses even when you're unavailable." },
      { icon: "Shield", title: "Protected communication", body: "AI avoids language that could create compliance issues — automatically." },
      { icon: "CheckCircle", title: "Builds trust", body: "Residents trust AI interactions because they sound like your community, not generic bots." },
    ],
    metric: { value: "92%", label: "of residents can't tell AI from staff in chat" },
  },

  // ── Governance ─────────────────────────────────────────────────────────
  {
    featureId: "governance",
    role: "admin",
    headline: "Guardrails, audit, and lifecycle controls for responsible AI",
    description:
      "Configure guardrails for regulated activities, enforce approval gates, audit every agent decision, and manage the full agent lifecycle — from draft to deployment to retirement.",
    benefits: [
      { icon: "Shield", title: "Activity-level guardrails", body: "Configure approval gates, policy checks, and required documents for each regulated activity." },
      { icon: "ScrollText", title: "Full audit trail", body: "Every agent action is logged with trace IDs — exportable for compliance reviews and legal." },
      { icon: "Cog", title: "Lifecycle management", body: "Shadow mode, activation approval, kill switch, and auto-suspend on error threshold." },
    ],
    metric: { value: "100%", label: "of agent decisions auditable and traceable" },
  },
  {
    featureId: "governance",
    role: "regional",
    headline: "Confidence that AI is operating within bounds",
    description:
      "Governance controls ensure every AI agent at every property is operating within your risk tolerance — with approval gates on sensitive actions, audit trails, and automatic safeguards.",
    benefits: [
      { icon: "Shield", title: "Risk management", body: "Set guardrails on screening, lease terms, concessions, and other high-risk activities." },
      { icon: "Eye", title: "Full transparency", body: "See exactly what every agent did, why, and which documents it referenced." },
      { icon: "AlertTriangle", title: "Automatic safeguards", body: "Agents auto-suspend if error thresholds are exceeded. Kill switch for emergencies." },
    ],
    metric: { value: "0", label: "unaudited agent decisions in production" },
  },
  {
    featureId: "governance",
    role: "property",
    headline: "Know your AI is doing the right thing",
    description:
      "Governance ensures the AI agents at your property follow all policies and regulations. Approval gates on sensitive actions, audit logs for every decision, and guardrails that prevent missteps.",
    benefits: [
      { icon: "Shield", title: "Guardrails on sensitive actions", body: "Concessions, screening, and lease terms require approval before AI acts." },
      { icon: "ScrollText", title: "Audit everything", body: "Review what AI did and why — useful for resident disputes and compliance checks." },
      { icon: "CheckCircle", title: "Peace of mind", body: "Know that AI is following your SOPs and fair housing requirements automatically." },
    ],
    metric: { value: "100%", label: "of high-risk actions require human approval" },
  },
  {
    featureId: "governance",
    role: "ic",
    headline: "AI that follows the rules, so you don't have to worry",
    description:
      "Governance controls ensure AI agents follow every policy and regulation your property requires. If something sensitive comes up, AI routes it to you — it never oversteps.",
    benefits: [
      { icon: "Shield", title: "Never oversteps", body: "AI knows when to hand off to you — screening, concessions, and other sensitive areas." },
      { icon: "Eye", title: "See what happened", body: "Full conversation and decision history if a resident asks why AI said something." },
      { icon: "CheckCircle", title: "You stay in control", body: "Approval gates mean you sign off on anything that matters." },
    ],
    metric: { value: "100%", label: "of sensitive actions routed to staff for approval" },
  },

  // ── Performance Analytics ──────────────────────────────────────────────
  {
    featureId: "performance-analytics",
    role: "admin",
    headline: "See how AI is driving asset value across your portfolio",
    description:
      "Performance analytics goes beyond basic metrics to show correlation between AI output and property outcomes — revenue impact, efficiency gains, and PM health trends.",
    benefits: [
      { icon: "TrendingUp", title: "Revenue attribution", body: "See the dollar impact of AI on renewals, leasing, and maintenance — per property and portfolio-wide." },
      { icon: "BarChart3", title: "Efficiency & capacity", body: "Effective FTE, labor displacement, and cost-per-interaction metrics that quantify ROI." },
      { icon: "Lightbulb", title: "Actionable insights", body: "Not just data — specific recommendations on where to improve and what to do next." },
    ],
    metric: { value: "$42K", label: "average annual AI value per property" },
  },
  {
    featureId: "performance-analytics",
    role: "regional",
    headline: "Understand what's working and where to improve",
    description:
      "Performance analytics shows how AI and staff are performing across your properties — not just numbers, but trends, correlations, and specific recommendations for improving outcomes.",
    benefits: [
      { icon: "Building2", title: "Property comparison", body: "See which properties are getting the most value from AI — and replicate their success." },
      { icon: "TrendingUp", title: "Trend analysis", body: "Escalation rates, conversation volume, and resolution trends over 7, 30, or 90 days." },
      { icon: "Target", title: "Targeted action", body: "Insights point to specific agents, properties, or processes that need attention." },
    ],
    metric: { value: "28%", label: "improvement in escalation rate within first 30 days" },
  },
  {
    featureId: "performance-analytics",
    role: "property",
    headline: "Know exactly how AI is helping your property",
    description:
      "See the direct impact of AI on your property's performance — conversations handled, escalation rates, resolution times, and how it's affecting renewal rates and occupancy.",
    benefits: [
      { icon: "BarChart3", title: "Clear metrics", body: "Conversations handled, escalation rate, resolution rate — at a glance." },
      { icon: "TrendingUp", title: "PM health dashboard", body: "Renewal rate, occupancy, satisfaction, and work order metrics in one view." },
      { icon: "Lightbulb", title: "What to do next", body: "Actionable insights tell you exactly where to focus for the biggest impact." },
    ],
    metric: { value: "94%", label: "work order resolution rate with AI triage" },
  },
  {
    featureId: "performance-analytics",
    role: "ic",
    headline: "See the impact of your work alongside AI",
    description:
      "Performance analytics shows how the human-AI team is performing together — which inquiries AI handles, which come to you, and how overall service quality is trending.",
    benefits: [
      { icon: "BarChart3", title: "Your contribution matters", body: "See how your work on complex cases complements AI's handling of routine inquiries." },
      { icon: "TrendingUp", title: "Track improvement", body: "Watch resolution rates and response times improve as the human-AI team optimizes." },
      { icon: "Target", title: "Where to focus", body: "See which types of escalations come to you most and how to resolve them faster." },
    ],
    metric: { value: "4.2/5", label: "resident satisfaction with blended human-AI service" },
  },

  // ── Command Center ─────────────────────────────────────────────────────
  {
    featureId: "command-center",
    role: "admin",
    headline: "Your AI-powered operations hub",
    description:
      "Command Center brings together escalations, live conversations, agent performance, and proactive insights in one view — so you can orchestrate your workforce and focus effort where it matters most.",
    benefits: [
      { icon: "BarChart3", title: "Real-time portfolio overview", body: "Revenue impact, active agents, effective capacity, and open escalations — all at a glance." },
      { icon: "Lightbulb", title: "AI-surfaced insights", body: "Intelligence agents surface recoverable revenue, repricing opportunities, and compliance deadlines automatically." },
      { icon: "Users", title: "Workforce orchestration", body: "See your full team — autonomous agents and staff — with live activity and workload in one place." },
    ],
    metric: { value: "1 view", label: "to see everything that needs attention across your portfolio" },
  },
  {
    featureId: "command-center",
    role: "regional",
    headline: "See what needs doing across your properties",
    description:
      "Command Center gives you a single view of escalations, live conversations, and agent performance across your region — with AI-powered recommendations on where to focus.",
    benefits: [
      { icon: "Building2", title: "Cross-property visibility", body: "Escalations, conversations, and team activity across every property in your region." },
      { icon: "Lightbulb", title: "Actionable insights", body: "AI agents surface revenue opportunities and compliance issues — prioritized by impact." },
      { icon: "Target", title: "Focus your effort", body: "Know exactly which escalations are urgent, overdue, or need your attention first." },
    ],
    metric: { value: "3x", label: "faster time-to-action on critical escalations" },
  },
  {
    featureId: "command-center",
    role: "property",
    headline: "Everything your property needs in one place",
    description:
      "Command Center shows your open escalations, live conversations, and AI agent activity — so you always know what needs attention and what's being handled automatically.",
    benefits: [
      { icon: "AlertTriangle", title: "Escalation overview", body: "See all open and urgent items at your property with priority and status at a glance." },
      { icon: "MessageSquare", title: "Live conversations", body: "Monitor active resident and prospect conversations handled by AI agents." },
      { icon: "Zap", title: "AI-powered recommendations", body: "Get specific suggestions on where to focus for the biggest impact." },
    ],
    metric: { value: "40%", label: "reduction in time spent context-switching between tools" },
  },
  {
    featureId: "command-center",
    role: "ic",
    headline: "Your personal queue, prioritized and clear",
    description:
      "Command Center gives you a focused view of your open items, response times, and resolution rate — so you know exactly what to work on and can see your impact.",
    benefits: [
      { icon: "Target", title: "Prioritized queue", body: "Your open items sorted by urgency and due date — overdue items flagged automatically." },
      { icon: "TrendingUp", title: "Track your performance", body: "See your response time, resolution rate, and how many items you've cleared this week." },
      { icon: "Lightbulb", title: "Tips & best practices", body: "Actionable guidance on working your queue effectively and improving outcomes." },
    ],
    metric: { value: "18min", label: "average response time with a prioritized queue" },
  },

  // ── Escalations ───────────────────────────────────────────────────────
  {
    featureId: "escalations",
    role: "admin",
    headline: "Intelligent escalation management at portfolio scale",
    description:
      "Escalations gives you full visibility into every item that needs human attention — with smart routing, SLA enforcement, bulk actions, and analytics to keep your operation running smoothly.",
    benefits: [
      { icon: "GitBranch", title: "Smart routing", body: "Escalations route automatically by labels, property, and rules — the best-matched person gets every item." },
      { icon: "Clock", title: "SLA enforcement", body: "Automatic reassignment and manager escalation when response times are at risk." },
      { icon: "BarChart3", title: "Escalation analytics", body: "Track volume, resolution time, SLA compliance, and category trends to optimize your operation." },
    ],
    metric: { value: "92%", label: "SLA compliance with automated routing and escalation" },
  },
  {
    featureId: "escalations",
    role: "regional",
    headline: "Never lose track of what needs attention",
    description:
      "Escalations gives you a filterable, prioritized view of every item that needs human intervention across your properties — with routing rules, SLA tracking, and analytics.",
    benefits: [
      { icon: "Building2", title: "Cross-property queue", body: "Filter by property, category, priority, and status to focus on what matters most." },
      { icon: "Clock", title: "SLA visibility", body: "See which items are approaching or past their SLA — before they become problems." },
      { icon: "Users", title: "Workload balancing", body: "See who's handling what and redistribute work when someone is overloaded." },
    ],
    metric: { value: "67%", label: "reduction in missed SLA deadlines with smart escalation" },
  },
  {
    featureId: "escalations",
    role: "property",
    headline: "Manage every escalation with clarity",
    description:
      "Escalations shows you every item that needs human attention at your property — categorized, prioritized, and tracked with SLA timers so nothing falls through the cracks.",
    benefits: [
      { icon: "AlertTriangle", title: "Priority & urgency", body: "Items flagged by urgency and overdue status so you always know what to tackle first." },
      { icon: "Search", title: "Filter & find", body: "Search by name, filter by category, status, or priority to find any escalation instantly." },
      { icon: "CheckCircle", title: "Resolution tracking", body: "Mark items as done, reassign, or escalate further — with full audit history." },
    ],
    metric: { value: "2x", label: "faster escalation resolution with prioritized queue" },
  },
  {
    featureId: "escalations",
    role: "ic",
    headline: "See exactly what's waiting for you",
    description:
      "Escalations shows you the items assigned to you that need a human touch — with context on why AI escalated them, priority levels, and due dates to help you resolve them quickly.",
    benefits: [
      { icon: "Target", title: "Clear ownership", body: "See which items are yours, with full context on why they were escalated." },
      { icon: "Clock", title: "Due dates & SLA", body: "Know when each item needs to be resolved and which ones are overdue." },
      { icon: "Shield", title: "AI-provided context", body: "Every escalation includes the AI's reasoning and conversation history so you can act fast." },
    ],
    metric: { value: "5min", label: "average time to resolve an escalation with AI context" },
  },

  // ── Trainings & SOP ────────────────────────────────────────────────────
  {
    featureId: "trainings-sop",
    role: "admin",
    headline: "The knowledge layer that makes AI effective",
    description:
      "A centralized document library for SOPs, policies, and training materials that AI agents reference for every decision. Upload, organize, approve, and keep your knowledge base current.",
    benefits: [
      { icon: "BookOpen", title: "Centralized knowledge", body: "All SOPs, policies, and training docs in one place — sourced from uploads and Entrata." },
      { icon: "FileCheck", title: "Approval workflows", body: "Document review and approval process ensures AI only uses verified, current information." },
      { icon: "Brain", title: "Agent training", body: "Approved documents automatically train your AI agents with up-to-date knowledge." },
    ],
    metric: { value: "95%", label: "of AI answers sourced from approved SOPs" },
  },
  {
    featureId: "trainings-sop",
    role: "regional",
    headline: "Ensure every property has current, approved SOPs",
    description:
      "Trainings & SOP gives you visibility into which properties have current documentation, which need review, and whether AI agents are trained on the latest versions.",
    benefits: [
      { icon: "Building2", title: "Cross-property visibility", body: "See which properties have approved SOPs and which have gaps." },
      { icon: "AlertTriangle", title: "Review alerts", body: "Get notified when documents are past their review date or need updating." },
      { icon: "FileCheck", title: "Compliance assurance", body: "Fair housing policies, screening criteria, and other required docs tracked and monitored." },
    ],
    metric: { value: "100%", label: "of required compliance documents tracked" },
  },
  {
    featureId: "trainings-sop",
    role: "property",
    headline: "Keep your team and AI on the same page",
    description:
      "Manage the SOPs and policies your property relies on. Upload documents, track approval status, and ensure AI agents are trained on the latest procedures.",
    benefits: [
      { icon: "BookOpen", title: "Document library", body: "All your property's SOPs, policies, and training materials organized in one place." },
      { icon: "Search", title: "AI-powered search", body: "Ask questions in natural language and get answers sourced from your document library." },
      { icon: "CheckCircle", title: "Always current", body: "Review-by dates and version tracking ensure nothing goes stale." },
    ],
    metric: { value: "70%", label: "reduction in time spent looking up policy information" },
  },
  {
    featureId: "trainings-sop",
    role: "ic",
    headline: "Find answers instantly, backed by your SOPs",
    description:
      "Trainings & SOP gives you a searchable knowledge base where you can find answers to policy questions instantly — the same knowledge base AI agents use to help residents.",
    benefits: [
      { icon: "Search", title: "Instant answers", body: "Type a question and get an answer sourced from your property's approved SOPs." },
      { icon: "BookOpen", title: "Always up to date", body: "Documents are versioned and reviewed — you always get the latest policy guidance." },
      { icon: "Shield", title: "Consistent answers", body: "You and the AI give residents the same answers because you're using the same source of truth." },
    ],
    metric: { value: "30sec", label: "average time to find the right policy answer" },
  },
];

/* ─────────────────────────────── Lookup ─────────────────────────────── */

export function getPlgMessage(featureId: FeatureId, role: Role): PlgMessage | undefined {
  return MESSAGES.find((m) => m.featureId === featureId && m.role === role);
}

export function getFeatureDisplayName(featureId: FeatureId): string {
  const names: Record<FeatureId, string> = {
    "ai-agents": "AI Agents",
    workflows: "Agent Builder",
    voice: "Voice",
    governance: "Governance",
    "performance-analytics": "Performance Analytics",
    "trainings-sop": "Trainings & SOP",
    "command-center": "Command Center",
    escalations: "Escalations",
  };
  return names[featureId];
}

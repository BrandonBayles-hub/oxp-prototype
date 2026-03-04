// Playbook template types and seed data used by the Playbook Library settings
// page and the playbook template detail/edit page.

export type PlaybookTemplateType = "operational" | "emergency";
export type PlaybookTemplateVariety = "custom" | "automated";
export type PlaybookTemplateRepeats =
  | "Never"
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Quarterly"
  | "Semi-Annually"
  | "Annually";
export type PlaybookTemplatePriority = "P0" | "P1" | "P2" | "P3";

export type PlaybookTemplateTask = {
  id: string;
  name: string;
  description: string;
  dueOffset: string;
  priority: PlaybookTemplatePriority;
  specialtyId: string;
};

export type PlaybookTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  type: PlaybookTemplateType;
  variety: PlaybookTemplateVariety;
  priority: PlaybookTemplatePriority;
  repeats: PlaybookTemplateRepeats;
  onDate?: string;
  createTime?: string;
  timezone?: string;
  assigneeId?: string;
  tasks: PlaybookTemplateTask[];
  sourceDoc?: { name: string; type: string; date: string };
  workatoRecipeUrl?: string;
  lastEdited: string;
  stats: {
    lastLaunch: string;
    nextLaunch: string;
    launches: number;
    activePlays: number;
    activeTasks: number;
  };
};

// ── Constants ────────────────────────────────────────────────────────────────

export const PLAYBOOK_CATEGORIES = [
  "Leasing",
  "Maintenance",
  "Compliance",
  "Operations",
  "Finance",
];

export const PLAYBOOK_REPEATS_OPTIONS: PlaybookTemplateRepeats[] = [
  "Never",
  "Daily",
  "Weekly",
  "Monthly",
  "Quarterly",
  "Semi-Annually",
  "Annually",
];

export const PLAYBOOK_TEMPLATE_DUE_OPTIONS = [
  "1 Hour",
  "3 Hours",
  "6 Hours",
  "12 Hours",
  "1 Day",
  "2 Days",
  "3 Days",
  "5 Days",
  "1 Week",
  "2 Weeks",
  "1 Month",
];

// ── Seed data ────────────────────────────────────────────────────────────────

export const SEED_PLAYBOOK_TEMPLATES: PlaybookTemplate[] = [
  {
    id: "pbt-1",
    name: "Apartment Fire",
    description: "Use when there has been an apartment fire",
    category: "Leasing",
    type: "emergency",
    variety: "automated",
    priority: "P0",
    repeats: "Never",
    workatoRecipeUrl: "/workflows",
    lastEdited: "2026-01-07",
    tasks: [],
    stats: {
      lastLaunch: "2025-12-17",
      nextLaunch: "",
      launches: 8,
      activePlays: 2,
      activeTasks: 14,
    },
  },
  {
    id: "pbt-2",
    name: "Community Injury Event",
    description: "When an injury has happened on campus",
    category: "Leasing",
    type: "emergency",
    variety: "custom",
    priority: "P1",
    repeats: "Never",
    lastEdited: "2026-01-07",
    sourceDoc: {
      name: "Injury Response Protocol",
      type: "PDF",
      date: "Feb 10, 2025 at 11:44am MST",
    },
    tasks: [
      { id: "pbt-2-t1", name: "Create Incident Report", description: "Create an incident report outlining all details", dueOffset: "1 Day", priority: "P1", specialtyId: "" },
      { id: "pbt-2-t2", name: "Submit Photos", description: "If applicable take photos and attach to report", dueOffset: "1 Day", priority: "P2", specialtyId: "" },
      { id: "pbt-2-t3", name: "Gather Resident Info", description: "Gather all required info about resident involved", dueOffset: "3 Days", priority: "P2", specialtyId: "" },
      { id: "pbt-2-t4", name: "Alert Direct Report", description: "Message direct report alerting them of incident", dueOffset: "1 Hour", priority: "P0", specialtyId: "" },
      { id: "pbt-2-t5", name: "Approve Coverage", description: "If any participants file a claim then approve", dueOffset: "1 Week", priority: "P2", specialtyId: "" },
      { id: "pbt-2-t6", name: "Direct Report Sign off", description: "Sign off on the completion of the event report", dueOffset: "1 Week", priority: "P3", specialtyId: "" },
    ],
    stats: {
      lastLaunch: "2025-12-17",
      nextLaunch: "2026-01-17",
      launches: 51,
      activePlays: 24,
      activeTasks: 71,
    },
  },
  {
    id: "pbt-3",
    name: "Approve for Screening",
    description: "When there has been a burst pipe causing major water damage to units and common areas",
    category: "Leasing",
    type: "operational",
    variety: "custom",
    priority: "P1",
    repeats: "Never",
    lastEdited: "2026-01-05",
    tasks: [
      { id: "pbt-3-t1", name: "Review Application", description: "Review the submitted rental application for completeness", dueOffset: "1 Day", priority: "P1", specialtyId: "" },
      { id: "pbt-3-t2", name: "Run Background Check", description: "Initiate background and credit check for applicant", dueOffset: "1 Day", priority: "P1", specialtyId: "" },
      { id: "pbt-3-t3", name: "Verify Income", description: "Confirm income documentation meets requirements", dueOffset: "2 Days", priority: "P2", specialtyId: "" },
      { id: "pbt-3-t4", name: "Approve or Deny", description: "Make final screening decision based on results", dueOffset: "3 Days", priority: "P1", specialtyId: "" },
    ],
    stats: {
      lastLaunch: "2025-12-20",
      nextLaunch: "",
      launches: 34,
      activePlays: 12,
      activeTasks: 28,
    },
  },
  {
    id: "pbt-4",
    name: "Approve Screening Results",
    description: "Run one week before rent week every month",
    category: "Leasing",
    type: "operational",
    variety: "custom",
    priority: "P1",
    repeats: "Monthly",
    onDate: "25",
    createTime: "08:00",
    timezone: "America/Denver",
    lastEdited: "2025-12-15",
    tasks: [
      { id: "pbt-4-t1", name: "Pull Screening Results", description: "Download all pending screening results for review", dueOffset: "1 Day", priority: "P2", specialtyId: "" },
      { id: "pbt-4-t2", name: "Review Flags", description: "Review any flagged items on screening reports", dueOffset: "2 Days", priority: "P1", specialtyId: "" },
      { id: "pbt-4-t3", name: "Manager Approval", description: "Get manager sign-off on conditional approvals", dueOffset: "3 Days", priority: "P1", specialtyId: "" },
      { id: "pbt-4-t4", name: "Notify Applicants", description: "Send approval or denial notifications to applicants", dueOffset: "3 Days", priority: "P2", specialtyId: "" },
    ],
    stats: {
      lastLaunch: "2025-12-25",
      nextLaunch: "2026-01-25",
      launches: 22,
      activePlays: 8,
      activeTasks: 19,
    },
  },
  {
    id: "pbt-5",
    name: "Countersign Lease",
    description: "Run semi annually a week before student turnover season",
    category: "Leasing",
    type: "operational",
    variety: "custom",
    priority: "P1",
    repeats: "Semi-Annually",
    onDate: "Jun 1",
    createTime: "09:00",
    timezone: "America/Denver",
    lastEdited: "2025-11-20",
    tasks: [
      { id: "pbt-5-t1", name: "Pull Unsigned Leases", description: "Generate list of all leases awaiting countersignature", dueOffset: "1 Day", priority: "P2", specialtyId: "" },
      { id: "pbt-5-t2", name: "Verify Lease Terms", description: "Confirm all terms match approved pricing and concessions", dueOffset: "2 Days", priority: "P1", specialtyId: "" },
      { id: "pbt-5-t3", name: "Execute Countersign", description: "Countersign all verified leases in bulk", dueOffset: "3 Days", priority: "P1", specialtyId: "" },
      { id: "pbt-5-t4", name: "Distribute Copies", description: "Send executed lease copies to residents", dueOffset: "5 Days", priority: "P3", specialtyId: "" },
    ],
    stats: {
      lastLaunch: "2025-06-01",
      nextLaunch: "2026-06-01",
      launches: 6,
      activePlays: 0,
      activeTasks: 0,
    },
  },
  {
    id: "pbt-6",
    name: "Generate Lease",
    description: "Run annually in December",
    category: "Leasing",
    type: "operational",
    variety: "custom",
    priority: "P1",
    repeats: "Annually",
    onDate: "Dec 1",
    createTime: "07:00",
    timezone: "America/Los_Angeles",
    lastEdited: "2025-12-01",
    tasks: [
      { id: "pbt-6-t1", name: "Configure Lease Terms", description: "Set up lease terms for the upcoming renewal cycle", dueOffset: "3 Days", priority: "P1", specialtyId: "" },
      { id: "pbt-6-t2", name: "Generate Documents", description: "Batch generate lease documents from templates", dueOffset: "5 Days", priority: "P2", specialtyId: "" },
      { id: "pbt-6-t3", name: "QA Review", description: "Review generated leases for accuracy", dueOffset: "1 Week", priority: "P2", specialtyId: "" },
      { id: "pbt-6-t4", name: "Send for Signature", description: "Distribute leases to residents for electronic signature", dueOffset: "2 Weeks", priority: "P1", specialtyId: "" },
    ],
    stats: {
      lastLaunch: "2025-12-01",
      nextLaunch: "2026-12-01",
      launches: 3,
      activePlays: 1,
      activeTasks: 4,
    },
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getPlaybookTemplate(id: string): PlaybookTemplate | undefined {
  return SEED_PLAYBOOK_TEMPLATES.find((t) => t.id === id);
}

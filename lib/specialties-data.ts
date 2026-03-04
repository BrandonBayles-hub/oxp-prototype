// Shared specialty types and seed data used by both the settings list and the
// specialty detail/edit page.

export type Specialty = {
  id: string;
  name: string;
};

export type TaskSections = {
  links: { enabled: boolean; required: boolean };
  attachments: { enabled: boolean; required: boolean };
  checklist: {
    enabled: boolean;
    requireAll: boolean;
    items: string[];
  };
};

export type TaskTemplate = {
  id: string;
  name: string;
  workflow: string;
  specialtyId: string;
  description: string;
  descriptionHtml?: string;
  system: boolean;
  repeats?: SpecialtyTaskRepeats;
  priority?: SpecialtyTaskPriority;
  dueIn?: string;
  assignee?: string;
  property?: string;
  weekDays?: Weekday[];
  monthDay?: number;
  createTime?: string;
  timezone?: string;
  sections?: TaskSections;
};

export type SpecialtyTaskRepeats = "Never" | "Daily" | "Weekly" | "Monthly";
export type SpecialtyTaskPriority = "P1" | "P2" | "P3";

export type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export type SpecialtyTask = {
  id: string;
  name: string;
  workflow: string;
  specialtyId: string;
  repeats: SpecialtyTaskRepeats;
  priority: SpecialtyTaskPriority;
  dueIn: string;
  /** Whether this is a system (Entrata) task or a custom user-created task */
  source: "system" | "custom";
  assignee?: string;
  property?: string;
  /** For Weekly cadence: which days of the week */
  weekDays?: Weekday[];
  /** For Monthly cadence: day of the month (1-31) */
  monthDay?: number;
  /** Time of day the task is created (HH:MM, 24h) */
  createTime?: string;
  /** IANA timezone for scheduling */
  timezone?: string;
  descriptionHtml?: string;
  sections?: TaskSections;
};

// ── System task catalog (Entrata) ───────────────────────────────────────────

export type SystemTaskEntry = {
  id: string;
  name: string;
  workflow: string;
  description: string;
};

export const SYSTEM_TASK_CATALOG: SystemTaskEntry[] = [
  // Document Approval
  { id: "sys-1", name: "Review SOP Document", workflow: "Document Approval", description: "Review and approve a submitted SOP document change" },
  { id: "sys-2", name: "Approve Policy Change", workflow: "Document Approval", description: "Approve updates to a property or portfolio-level policy" },
  { id: "sys-3", name: "Review Training Material", workflow: "Document Approval", description: "Review submitted training material before publishing" },

  // Leasing
  { id: "sys-4", name: "Approve Application", workflow: "Leasing", description: "Approve an application to move onto the leasing stage" },
  { id: "sys-5", name: "Approve for Screening", workflow: "Leasing", description: "Approve the application and attachments for screening" },
  { id: "sys-6", name: "Approve Screening Results", workflow: "Leasing", description: "Make a decision based on returned screening results" },
  { id: "sys-7", name: "Generate Lease", workflow: "Leasing", description: "Generate a lease packet for the applicant(s) to sign" },
  { id: "sys-8", name: "Countersign Lease", workflow: "Leasing", description: "Countersign the lease once all applicants have signed" },
  { id: "sys-9", name: "Applicant Follow Up", workflow: "Leasing", description: "Follow up with a lead on their application status" },
  { id: "sys-10", name: "Lead Follow Up", workflow: "Leasing", description: "Reach out to a prospect who has gone cold" },
  { id: "sys-11", name: "Manual Screen Applicant", workflow: "Leasing", description: "Manually screen an applicant who cannot be auto-screened" },
  { id: "sys-12", name: "Reject Applications", workflow: "Leasing", description: "Process and send rejection notices for denied applications" },

  // Maintenance
  { id: "sys-13", name: "Emergency Work Order", workflow: "Maintenance", description: "Respond to an emergency maintenance request" },
  { id: "sys-14", name: "Vendor Dispatch", workflow: "Maintenance", description: "Coordinate with an external vendor for specialized repair" },
  { id: "sys-15", name: "Unit Turn Inspection", workflow: "Maintenance", description: "Inspect a vacated unit and create the punch list" },
  { id: "sys-16", name: "Preventive Maintenance", workflow: "Maintenance", description: "Complete scheduled preventive maintenance task" },

  // Renewals
  { id: "sys-17", name: "Renewal Offer Review", workflow: "Renewals", description: "Review and approve renewal offer terms before sending" },
  { id: "sys-18", name: "Early Termination Request", workflow: "Renewals", description: "Process an early lease termination request" },
  { id: "sys-19", name: "Renewal Follow Up", workflow: "Renewals", description: "Follow up with resident on pending renewal offer" },

  // Compliance
  { id: "sys-20", name: "Fair Housing Review", workflow: "Compliance", description: "Review flagged communication for fair housing compliance" },
  { id: "sys-21", name: "Background Check Review", workflow: "Compliance", description: "Manually review a flagged background check result" },

  // Accounting
  { id: "sys-22", name: "Ledger Adjustment", workflow: "Accounting", description: "Approve a manual ledger adjustment or credit" },
  { id: "sys-23", name: "Refund Processing", workflow: "Accounting", description: "Process and approve a resident refund request" },

  // Trainings & SOP
  { id: "sys-24", name: "Complete Training Module", workflow: "Trainings & SOP", description: "Complete an assigned training module by the due date" },
  { id: "sys-25", name: "Acknowledge SOP Update", workflow: "Trainings & SOP", description: "Read and acknowledge an updated SOP document" },
];

export type SpecialtyTeammate = {
  id: string;
  name: string;
  permission: "Admin" | "User";
  properties: string[];
  avatar?: string;
};

export type AssignmentMode = "smart" | "round-robin" | "group" | "manual";

export type SmartDistributionConfig = {
  maxTasks: number;
  onlyActiveUsers: boolean;
  reassignToIdle: boolean;
  priorityPreemption: boolean;
  priorityThreshold: "P1 and Above" | "P2 and Above" | "P3 and Above";
  reassignAfterTimeout: boolean;
  reassignTimeoutValue: number;
  reassignTimeoutUnit: "Hour(s)" | "Day(s)" | "Week(s)";
};

export type SpecialtyAssignment = {
  mode: AssignmentMode;
  smartConfig: SmartDistributionConfig;
};

export type SpecialtyDetail = {
  specialty: Specialty;
  tasks: SpecialtyTask[];
  teammates: SpecialtyTeammate[];
  assignment: SpecialtyAssignment;
};

// ── Specialty list ──────────────────────────────────────────────────────────

export const SPECIALTIES: Specialty[] = [
  { id: "onsite-leasing", name: "Onsite Leasing" },
  { id: "centralized-leasing", name: "Centralized Leasing" },
  { id: "onsite-maintenance", name: "Onsite Maintenance" },
  { id: "centralized-maintenance", name: "Centralized Maintenance" },
  { id: "renewals", name: "Renewals" },
  { id: "compliance", name: "Compliance" },
  { id: "accounting", name: "Accounting" },
];

// ── Task templates (used by the settings-level task list) ───────────────────

export const SEED_TASKS: TaskTemplate[] = [
  { id: "t-1", name: "Manual Contact", workflow: "Leasing", specialtyId: "onsite-leasing", description: "Follow up with the lead to help them move further in the application process", system: true },
  { id: "t-2", name: "Tour: Onsite", workflow: "Leasing", specialtyId: "onsite-leasing", description: "Give a tour of a floor plan or unit that the lead is interested in", system: true },
  { id: "t-3", name: "Approve for Screening", workflow: "Leasing", specialtyId: "centralized-leasing", description: "Approve the application and attachments for the screening process", system: true },
  { id: "t-4", name: "Approve Screening Results", workflow: "Leasing", specialtyId: "centralized-leasing", description: "Make a decision based on the returned screening results", system: true },
  { id: "t-5", name: "Approve Application", workflow: "Leasing", specialtyId: "centralized-leasing", description: "Approve application to move onto the leasing stage", system: true },
  { id: "t-6", name: "Generate Lease", workflow: "Leasing", specialtyId: "centralized-leasing", description: "Generate a lease packet for the applicant(s) to sign", system: true },
  { id: "t-7", name: "Countersign Lease", workflow: "Leasing", specialtyId: "centralized-leasing", description: "Countersign the lease once all applicants have signed the lease", system: true },
  { id: "t-8", name: "Emergency Work Order", workflow: "Maintenance", specialtyId: "onsite-maintenance", description: "Respond to an emergency maintenance request that requires immediate attention", system: true },
  { id: "t-9", name: "Vendor Dispatch", workflow: "Maintenance", specialtyId: "centralized-maintenance", description: "Coordinate with an external vendor for specialized repair work", system: true },
  { id: "t-10", name: "Unit Turn Inspection", workflow: "Maintenance", specialtyId: "onsite-maintenance", description: "Inspect a recently vacated unit and create the punch list for turn", system: true },
  { id: "t-11", name: "Renewal Offer Review", workflow: "Renewals", specialtyId: "renewals", description: "Review and approve the renewal offer terms before sending to resident", system: true },
  { id: "t-12", name: "Early Termination Request", workflow: "Renewals", specialtyId: "renewals", description: "Process and evaluate an early lease termination request from a resident", system: true },
  { id: "t-13", name: "Fair Housing Review", workflow: "Compliance", specialtyId: "compliance", description: "Review flagged communication for fair housing compliance", system: true },
  { id: "t-14", name: "Ledger Adjustment", workflow: "Accounting", specialtyId: "accounting", description: "Approve a manual ledger adjustment or credit exceeding the auto-approval threshold", system: true },
  { id: "t-15", name: "Weekly Lead Cleanup", workflow: "Leasing", specialtyId: "onsite-leasing", description: "Review and archive stale leads that have been inactive for 30+ days", system: false },
  { id: "t-16", name: "Monthly Compliance Audit", workflow: "Compliance", specialtyId: "compliance", description: "Perform monthly audit of fair housing documentation and agent communications", system: false },
  { id: "t-17", name: "Vendor Invoice Review", workflow: "Accounting", specialtyId: "accounting", description: "Review and approve pending vendor invoices before payment processing", system: false },
];

export const WORKFLOWS = ["All Workflows", "Leasing", "Maintenance", "Renewals", "Compliance", "Accounting"];

export const PROPERTIES = [
  "Azure Heights",
  "Cambridge Suites",
  "Victoria Place",
  "Gateway Arch",
  "Sun Valley",
];

export const DUE_IN_OPTIONS = ["1 Hour", "3 Hours", "6 Hours", "12 Hours", "1 Day", "2 Days", "3 Days", "5 Days", "1 Week", "2 Weeks"];

export const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
];

export const TIMEZONE_LABELS: Record<string, string> = {
  "America/New_York": "Eastern (ET)",
  "America/Chicago": "Central (CT)",
  "America/Denver": "Mountain (MT)",
  "America/Los_Angeles": "Pacific (PT)",
  "America/Phoenix": "Arizona (MST)",
  "America/Anchorage": "Alaska (AKT)",
  "Pacific/Honolulu": "Hawaii (HST)",
  "UTC": "UTC",
};

export const ALL_WEEKDAYS: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Per-specialty detail seed data ──────────────────────────────────────────

const LEASING_ONSITE_TASKS: SpecialtyTask[] = [
  { id: "st-1", name: "Applicant Follow Up", workflow: "Leasing", specialtyId: "onsite-leasing", repeats: "Never", priority: "P2", dueIn: "3 Hours", source: "system" },
  { id: "st-2", name: "Approve Application", workflow: "Leasing", specialtyId: "onsite-leasing", repeats: "Never", priority: "P1", dueIn: "1 Day", source: "system" },
  { id: "st-3", name: "Approve for Screening", workflow: "Leasing", specialtyId: "onsite-leasing", repeats: "Never", priority: "P1", dueIn: "1 Day", source: "system" },
  { id: "st-4", name: "Approve Screening Results", workflow: "Leasing", specialtyId: "onsite-leasing", repeats: "Never", priority: "P1", dueIn: "1 Day", source: "system" },
  { id: "st-5", name: "Countersign Lease", workflow: "Leasing", specialtyId: "onsite-leasing", repeats: "Never", priority: "P1", dueIn: "1 Day", source: "system" },
  { id: "st-6", name: "Generate Lease", workflow: "Leasing", specialtyId: "onsite-leasing", repeats: "Never", priority: "P1", dueIn: "1 Day", source: "system" },
  { id: "st-7", name: "Lead Clean Up", workflow: "Custom", specialtyId: "onsite-leasing", repeats: "Weekly", priority: "P3", dueIn: "1 Week", source: "custom", weekDays: ["Mon", "Fri"], createTime: "08:00", timezone: "America/Denver" },
  { id: "st-11", name: "Daily Property Closing", workflow: "Custom", specialtyId: "onsite-leasing", repeats: "Weekly", priority: "P2", dueIn: "1 Day", source: "custom", property: "Sun Valley", assignee: "Madelyn Dias", descriptionHtml: "<p><strong><em>What\u2019s New</em></strong></p><ul><li>Clients can now edit the text to create better descriptions</li><li>This will allow them to have better communication with their teams</li><li><span style=\"color: red\">Lots and lots of control like color and alignment</span></li></ul>", sections: { links: { enabled: false, required: false }, attachments: { enabled: false, required: false }, checklist: { enabled: true, requireAll: true, items: ["Lock the doors", "Close the windows"] } } },
  { id: "st-8", name: "Lead Follow Up", workflow: "Leasing", specialtyId: "onsite-leasing", repeats: "Never", priority: "P3", dueIn: "3 Hours", source: "system" },
  { id: "st-9", name: "Manual Screen Applicant", workflow: "Leasing", specialtyId: "onsite-leasing", repeats: "Never", priority: "P1", dueIn: "1 Day", source: "system" },
  { id: "st-10", name: "Reject Applications", workflow: "Leasing", specialtyId: "onsite-leasing", repeats: "Weekly", priority: "P3", dueIn: "5 Days", source: "system", weekDays: ["Fri"], createTime: "09:00", timezone: "America/Denver" },
];

const LEASING_ONSITE_TEAMMATES: SpecialtyTeammate[] = [
  { id: "tm-1", name: "Madelyn Dias", permission: "Admin", properties: ["Azure Heights", "Cambridge Suites", "Victoria Place"] },
  { id: "tm-2", name: "Miracle Dias", permission: "User", properties: ["Azure Heights", "Cambridge Suites"] },
  { id: "tm-3", name: "Omar George", permission: "User", properties: ["Gateway Arch"] },
  { id: "tm-4", name: "Skylar Gouse", permission: "User", properties: ["Azure Heights", "Cambridge Suites"] },
  { id: "tm-5", name: "Carla Herwitz", permission: "User", properties: ["Cambridge Suites"] },
  { id: "tm-6", name: "Alfonso Korsgaard", permission: "User", properties: ["Cambridge Suites", "Victoria Place"] },
  { id: "tm-7", name: "Erin Saris", permission: "User", properties: ["Sun Valley"] },
  { id: "tm-8", name: "Jocelyn Septimus", permission: "User", properties: ["Gateway Arch"] },
  { id: "tm-9", name: "Alfonso Schleifer", permission: "User", properties: ["Victoria Place"] },
];

const DEFAULT_SMART_CONFIG: SmartDistributionConfig = {
  maxTasks: 20,
  onlyActiveUsers: true,
  reassignToIdle: true,
  priorityPreemption: true,
  priorityThreshold: "P1 and Above",
  reassignAfterTimeout: true,
  reassignTimeoutValue: 1,
  reassignTimeoutUnit: "Day(s)",
};

const LEASING_ONSITE_ASSIGNMENT: SpecialtyAssignment = {
  mode: "smart",
  smartConfig: { ...DEFAULT_SMART_CONFIG },
};

// Build detail records keyed by specialty id. Specialties without explicit
// seed data get empty tasks/teammates and default assignment config.

function buildDefaultDetail(s: Specialty): SpecialtyDetail {
  return {
    specialty: s,
    tasks: [],
    teammates: [],
    assignment: { mode: "smart", smartConfig: { ...DEFAULT_SMART_CONFIG } },
  };
}

const EXPLICIT_DETAILS: Record<string, Partial<Omit<SpecialtyDetail, "specialty">>> = {
  "onsite-leasing": {
    tasks: LEASING_ONSITE_TASKS,
    teammates: LEASING_ONSITE_TEAMMATES,
    assignment: LEASING_ONSITE_ASSIGNMENT,
  },
};

export function getSpecialtyDetail(id: string): SpecialtyDetail | undefined {
  const specialty = SPECIALTIES.find((s) => s.id === id);
  if (!specialty) return undefined;
  const explicit = EXPLICIT_DETAILS[id];
  if (explicit) {
    const base = buildDefaultDetail(specialty);
    return { ...base, ...explicit, specialty };
  }
  return buildDefaultDetail(specialty);
}

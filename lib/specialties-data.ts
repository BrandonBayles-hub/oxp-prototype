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
  { id: "onsite-staff", name: "Onsite Property Staff" },
  { id: "training-sop-approvals", name: "Training & SOP Approvals" },
];

// ── Task templates (used by the settings-level task list) ───────────────────

export const SEED_TASKS: TaskTemplate[] = [
  { id: "t-1", name: "Review SOP Document", workflow: "Document Approval", specialtyId: "training-sop-approvals", description: "Review and approve a submitted SOP document change", system: true },
  { id: "t-2", name: "Approve Policy Change", workflow: "Document Approval", specialtyId: "training-sop-approvals", description: "Approve updates to a property or portfolio-level policy", system: true },
  { id: "t-3", name: "Review Training Material", workflow: "Document Approval", specialtyId: "training-sop-approvals", description: "Review submitted training material before publishing", system: true },
  { id: "t-4", name: "Fair Housing Review", workflow: "Compliance", specialtyId: "", description: "Review flagged communication for fair housing compliance", system: true },
  { id: "t-5", name: "Background Check Review", workflow: "Compliance", specialtyId: "", description: "Manually review a flagged background check result", system: true },
];

export const WORKFLOWS = ["All Workflows", "Document Approval", "Compliance", "Operations", "Leasing", "Maintenance", "Renewals", "Accounting"];

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

const ONSITE_STAFF_TASKS: SpecialtyTask[] = [
  {
    id: "st-1", name: "Unlock Doors & Gates", workflow: "Operations", specialtyId: "onsite-staff",
    repeats: "Daily", priority: "P1", dueIn: "1 Hour", source: "custom",
    createTime: "08:00", timezone: "America/Denver",
    sections: { links: { enabled: false, required: false }, attachments: { enabled: false, required: false }, checklist: { enabled: true, requireAll: true, items: ["Main entry doors unlocked", "Amenity gates opened", "Office front door unlocked", "After-hours access switched to daytime mode"] } },
  },
  {
    id: "st-2", name: "Morning Property Walk", workflow: "Operations", specialtyId: "onsite-staff",
    repeats: "Daily", priority: "P1", dueIn: "1 Hour", source: "custom",
    createTime: "08:00", timezone: "America/Denver",
    descriptionHtml: "<p>Walk the full property perimeter and all buildings. Look for overnight damage, safety hazards, vandalism, or anything out of the ordinary. Log any issues found as work orders.</p>",
  },
  {
    id: "st-3", name: "Common Area Inspection", workflow: "Operations", specialtyId: "onsite-staff",
    repeats: "Daily", priority: "P2", dueIn: "3 Hours", source: "custom",
    createTime: "08:00", timezone: "America/Denver",
    sections: { links: { enabled: false, required: false }, attachments: { enabled: false, required: false }, checklist: { enabled: true, requireAll: true, items: ["Lobby clean and presentable", "Hallways clear of obstructions", "Stairwells clean and well-lit", "Elevator functioning properly", "Common restrooms stocked and clean"] } },
  },
  {
    id: "st-4", name: "Check Overnight Messages", workflow: "Operations", specialtyId: "onsite-staff",
    repeats: "Daily", priority: "P1", dueIn: "1 Hour", source: "custom",
    createTime: "08:00", timezone: "America/Denver",
    descriptionHtml: "<p>Review all voicemails, emails, and after-hours maintenance requests. Triage by urgency: safety issues (immediate), habitability (same day), convenience (48 hours), cosmetic (next available).</p>",
  },
  {
    id: "st-5", name: "Office Setup", workflow: "Operations", specialtyId: "onsite-staff",
    repeats: "Daily", priority: "P3", dueIn: "1 Hour", source: "custom",
    createTime: "08:00", timezone: "America/Denver",
    sections: { links: { enabled: false, required: false }, attachments: { enabled: false, required: false }, checklist: { enabled: true, requireAll: false, items: ["Computers powered on", "Printer stocked with paper and toner", "Leasing materials set out", "Office tidy and presentable for visitors", "Community coffee/water station stocked"] } },
  },
  {
    id: "st-6", name: "Amenity Area Check", workflow: "Operations", specialtyId: "onsite-staff",
    repeats: "Daily", priority: "P2", dueIn: "3 Hours", source: "custom",
    createTime: "08:00", timezone: "America/Denver",
    sections: { links: { enabled: false, required: false }, attachments: { enabled: false, required: false }, checklist: { enabled: true, requireAll: true, items: ["Pool area clean and safe (if applicable)", "Fitness equipment in working order", "Business center operational", "Clubroom / lounge tidy", "Dog park clean and gates secure"] } },
  },
  {
    id: "st-7", name: "Trash & Recycling Areas", workflow: "Operations", specialtyId: "onsite-staff",
    repeats: "Daily", priority: "P2", dueIn: "3 Hours", source: "custom",
    createTime: "08:00", timezone: "America/Denver",
    descriptionHtml: "<p>Inspect all dumpster and recycling enclosures. Check for overflow, illegal dumping, pest activity, and odor issues. Report any needed pickups or cleanups immediately.</p>",
  },
  {
    id: "st-8", name: "Package Room Check", workflow: "Operations", specialtyId: "onsite-staff",
    repeats: "Daily", priority: "P3", dueIn: "3 Hours", source: "custom",
    createTime: "09:00", timezone: "America/Denver",
    descriptionHtml: "<p>Check package lockers and delivery staging area. Organize loose packages, log any overflow, and post notifications for residents with packages older than 48 hours.</p>",
  },
  {
    id: "st-9", name: "Parking Lot Walkthrough", workflow: "Operations", specialtyId: "onsite-staff",
    repeats: "Daily", priority: "P2", dueIn: "3 Hours", source: "custom",
    createTime: "08:00", timezone: "America/Denver",
    sections: { links: { enabled: false, required: false }, attachments: { enabled: false, required: false }, checklist: { enabled: true, requireAll: false, items: ["No unauthorized or abandoned vehicles", "No visible vehicle damage or break-ins", "Handicap spaces clear and signs visible", "Speed bumps and signage intact", "No potholes or tripping hazards"] } },
  },
  {
    id: "st-10", name: "Evening Property Walk", workflow: "Operations", specialtyId: "onsite-staff",
    repeats: "Daily", priority: "P2", dueIn: "1 Hour", source: "custom",
    createTime: "17:00", timezone: "America/Denver",
    descriptionHtml: "<p>Final walkthrough of all grounds, common areas, and amenities. Verify everything is in order before closing. Note any issues found for next-day follow-up.</p>",
  },
  {
    id: "st-11", name: "Lock Doors & Arm Security", workflow: "Operations", specialtyId: "onsite-staff",
    repeats: "Daily", priority: "P1", dueIn: "1 Hour", source: "custom",
    createTime: "18:00", timezone: "America/Denver",
    sections: { links: { enabled: false, required: false }, attachments: { enabled: false, required: false }, checklist: { enabled: true, requireAll: true, items: ["Office locked and lights off", "All entry doors secured", "Amenity gates locked", "Security system armed", "After-hours access controls enabled", "Office valuables secured"] } },
  },
  {
    id: "st-12", name: "Community Board Update", workflow: "Operations", specialtyId: "onsite-staff",
    repeats: "Weekly", priority: "P3", dueIn: "1 Day", source: "custom",
    weekDays: ["Mon"], createTime: "09:00", timezone: "America/Denver",
    descriptionHtml: "<p>Review and refresh all community bulletin boards and digital signage. Remove expired notices, post upcoming events, and ensure emergency contact info is current.</p>",
  },
  {
    id: "st-13", name: "Landscaping & Curb Appeal", workflow: "Operations", specialtyId: "onsite-staff",
    repeats: "Weekly", priority: "P2", dueIn: "1 Day", source: "custom",
    weekDays: ["Mon"], createTime: "08:00", timezone: "America/Denver",
    sections: { links: { enabled: false, required: false }, attachments: { enabled: false, required: false }, checklist: { enabled: true, requireAll: false, items: ["Lawn and flower beds maintained", "Walkways clear of debris", "Entry signage clean and visible", "Exterior paint / siding in good condition", "Irrigation running properly (seasonal)"] } },
  },
  {
    id: "st-14", name: "Emergency Equipment Check", workflow: "Operations", specialtyId: "onsite-staff",
    repeats: "Weekly", priority: "P1", dueIn: "1 Day", source: "custom",
    weekDays: ["Wed"], createTime: "09:00", timezone: "America/Denver",
    sections: { links: { enabled: false, required: false }, attachments: { enabled: false, required: false }, checklist: { enabled: true, requireAll: true, items: ["Fire extinguishers accessible and charged", "Exit signs illuminated", "Emergency lighting functional", "AED device operational (if applicable)", "First aid kit stocked"] } },
  },
  {
    id: "st-15", name: "Exterior Lighting Check", workflow: "Operations", specialtyId: "onsite-staff",
    repeats: "Weekly", priority: "P2", dueIn: "1 Day", source: "custom",
    weekDays: ["Thu"], createTime: "17:00", timezone: "America/Denver",
    descriptionHtml: "<p>Inspect all exterior lighting at dusk when burnouts are most visible. Check parking lot lights, walkway fixtures, stairwell lights, building-mounted floods, and entry lighting. Submit work orders for any outages.</p>",
  },
  {
    id: "st-16", name: "Vacant Unit Check", workflow: "Operations", specialtyId: "onsite-staff",
    repeats: "Weekly", priority: "P2", dueIn: "1 Day", source: "custom",
    weekDays: ["Fri"], createTime: "10:00", timezone: "America/Denver",
    sections: { links: { enabled: false, required: false }, attachments: { enabled: false, required: false }, checklist: { enabled: true, requireAll: true, items: ["No signs of water leaks or moisture", "No pest activity", "HVAC running and set to appropriate temp", "No unauthorized entry or damage", "Unit is show-ready (if applicable)"] } },
  },
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

const TRAINING_SOP_TASKS: SpecialtyTask[] = [
  { id: "st-t-1", name: "Review SOP Document", workflow: "Document Approval", specialtyId: "training-sop-approvals", repeats: "Never", priority: "P1", dueIn: "1 Day", source: "system" },
  { id: "st-t-2", name: "Approve Policy Change", workflow: "Document Approval", specialtyId: "training-sop-approvals", repeats: "Never", priority: "P1", dueIn: "2 Days", source: "system" },
  { id: "st-t-3", name: "Review Training Material", workflow: "Document Approval", specialtyId: "training-sop-approvals", repeats: "Never", priority: "P2", dueIn: "3 Days", source: "system" },
  { id: "st-t-4", name: "Complete Training Module", workflow: "Trainings & SOP", specialtyId: "training-sop-approvals", repeats: "Never", priority: "P2", dueIn: "1 Week", source: "system" },
  { id: "st-t-5", name: "Acknowledge SOP Update", workflow: "Trainings & SOP", specialtyId: "training-sop-approvals", repeats: "Never", priority: "P2", dueIn: "3 Days", source: "system" },
];

const TRAINING_SOP_ASSIGNMENT: SpecialtyAssignment = {
  mode: "smart",
  smartConfig: { ...DEFAULT_SMART_CONFIG },
};

const ONSITE_STAFF_ASSIGNMENT: SpecialtyAssignment = {
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
  "onsite-staff": {
    tasks: ONSITE_STAFF_TASKS,
    teammates: [],
    assignment: ONSITE_STAFF_ASSIGNMENT,
  },
  "training-sop-approvals": {
    tasks: TRAINING_SOP_TASKS,
    teammates: [],
    assignment: TRAINING_SOP_ASSIGNMENT,
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

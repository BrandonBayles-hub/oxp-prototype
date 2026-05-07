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

export type SpecialtyTaskRepeats = "Never" | "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Semi-Annually" | "Annually";
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

/** Assignable = can be an assignee for this specialty; view-only = see tasks on the escalations list but never as assignee (e.g. managers overseeing direct reports). */
export type TeammateTaskParticipation = "assignable" | "view-only";

export type SpecialtyTeammate = {
  id: string;
  name: string;
  permission: "Admin" | "User" | "Group";
  properties: string[];
  /** Defaults to assignable when omitted (legacy / seed data). */
  taskParticipation?: TeammateTaskParticipation;
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
  // ── System Tasks: Document Approval ────────────────────────────────────────
  { id: "t-1", name: "Review SOP Document", workflow: "Document Approval", specialtyId: "training-sop-approvals", description: "Review and approve a submitted SOP document change", system: true },
  { id: "t-2", name: "Approve Policy Change", workflow: "Document Approval", specialtyId: "training-sop-approvals", description: "Approve updates to a property or portfolio-level policy", system: true },
  { id: "t-3", name: "Review Training Material", workflow: "Document Approval", specialtyId: "training-sop-approvals", description: "Review submitted training material before publishing", system: true },

  // ── System Tasks: Compliance ───────────────────────────────────────────────
  { id: "t-4", name: "Fair Housing Review", workflow: "Compliance", specialtyId: "", description: "Review flagged communication for fair housing compliance", system: true },
  { id: "t-5", name: "Background Check Review", workflow: "Compliance", specialtyId: "", description: "Manually review a flagged background check result", system: true },

  // ── System Tasks: Trainings & SOP ──────────────────────────────────────────
  { id: "t-6", name: "Complete Training Module", workflow: "Trainings & SOP", specialtyId: "training-sop-approvals", description: "Complete an assigned training module by the due date", system: true },
  { id: "t-7", name: "Acknowledge SOP Update", workflow: "Trainings & SOP", specialtyId: "training-sop-approvals", description: "Read and acknowledge an updated SOP document", system: true },

  // ── Custom Tasks: Onsite Property Staff (Operations) ───────────────────────
  { id: "t-10", name: "Unlock Doors & Gates", workflow: "Operations", specialtyId: "onsite-staff", description: "Unlock all community entry doors, gates, and amenity access points at the start of business hours", system: false, repeats: "Daily", priority: "P1", dueIn: "1 Hour" },
  { id: "t-11", name: "Morning Property Walk", workflow: "Operations", specialtyId: "onsite-staff", description: "Walk the full property checking for overnight issues, safety hazards, and anything out of place", system: false, repeats: "Daily", priority: "P1", dueIn: "1 Hour" },
  { id: "t-12", name: "Common Area Inspection", workflow: "Operations", specialtyId: "onsite-staff", description: "Inspect lobbies, hallways, stairwells, and shared spaces for cleanliness and obstructions", system: false, repeats: "Daily", priority: "P2", dueIn: "3 Hours" },
  { id: "t-13", name: "Check Overnight Messages", workflow: "Operations", specialtyId: "onsite-staff", description: "Review voicemails, emails, and after-hours maintenance requests received overnight", system: false, repeats: "Daily", priority: "P1", dueIn: "1 Hour" },
  { id: "t-14", name: "Office Setup", workflow: "Operations", specialtyId: "onsite-staff", description: "Power on computers, check printer paper and supplies, set out any resident-facing materials", system: false, repeats: "Daily", priority: "P3", dueIn: "1 Hour" },
  { id: "t-15", name: "Amenity Area Check", workflow: "Operations", specialtyId: "onsite-staff", description: "Inspect pool, fitness center, business center, and other amenity spaces for readiness and safety", system: false, repeats: "Daily", priority: "P2", dueIn: "3 Hours" },
  { id: "t-16", name: "Trash & Recycling Areas", workflow: "Operations", specialtyId: "onsite-staff", description: "Inspect dumpster and recycling areas for overflow, cleanliness, and pest activity", system: false, repeats: "Daily", priority: "P2", dueIn: "3 Hours" },
  { id: "t-17", name: "Package Room Check", workflow: "Operations", specialtyId: "onsite-staff", description: "Check package lockers and delivery area for overflow, organize and log any loose packages", system: false, repeats: "Daily", priority: "P3", dueIn: "3 Hours" },
  { id: "t-18", name: "Parking Lot Walkthrough", workflow: "Operations", specialtyId: "onsite-staff", description: "Walk the parking areas checking for unauthorized vehicles, damage, lighting issues, and safety hazards", system: false, repeats: "Daily", priority: "P2", dueIn: "3 Hours" },
  { id: "t-19", name: "Evening Property Walk", workflow: "Operations", specialtyId: "onsite-staff", description: "Final walkthrough of grounds, common areas, and amenities before closing for the day", system: false, repeats: "Daily", priority: "P2", dueIn: "1 Hour" },
  { id: "t-20", name: "Lock Doors & Arm Security", workflow: "Operations", specialtyId: "onsite-staff", description: "Secure all entry doors, gates, and office; arm security systems and enable after-hours access controls", system: false, repeats: "Daily", priority: "P1", dueIn: "1 Hour" },
  { id: "t-21", name: "Community Board Update", workflow: "Operations", specialtyId: "onsite-staff", description: "Review and update community bulletin boards with current notices, events, and announcements", system: false, repeats: "Weekly", priority: "P3", dueIn: "1 Day" },
  { id: "t-22", name: "Landscaping & Curb Appeal", workflow: "Operations", specialtyId: "onsite-staff", description: "Walk grounds checking landscaping condition, signage, exterior lighting, and overall curb appeal", system: false, repeats: "Weekly", priority: "P2", dueIn: "1 Day" },
  { id: "t-23", name: "Emergency Equipment Check", workflow: "Operations", specialtyId: "onsite-staff", description: "Verify fire extinguishers are accessible, exit signs are lit, and emergency lighting is functional", system: false, repeats: "Weekly", priority: "P1", dueIn: "1 Day" },
  { id: "t-24", name: "Exterior Lighting Check", workflow: "Operations", specialtyId: "onsite-staff", description: "Inspect all exterior lighting in parking lots, walkways, stairwells, and building perimeters for burnouts", system: false, repeats: "Weekly", priority: "P2", dueIn: "1 Day" },
  { id: "t-25", name: "Vacant Unit Check", workflow: "Operations", specialtyId: "onsite-staff", description: "Walk all vacant units to check for leaks, pests, HVAC issues, or unauthorized entry", system: false, repeats: "Weekly", priority: "P2", dueIn: "1 Day" },

  // ── Custom Tasks: Apartment Fire (Emergency) ───────────────────────────────
  { id: "t-30", name: "Verify 911 Called", workflow: "Apartment Fire", specialtyId: "", description: "Confirm fire department and emergency services have been dispatched to the property", system: false, priority: "P1" },
  { id: "t-31", name: "Evacuate Affected Units", workflow: "Apartment Fire", specialtyId: "", description: "Ensure all residents in the affected and adjacent units have been safely evacuated", system: false, priority: "P1" },
  { id: "t-32", name: "Account for All Residents", workflow: "Apartment Fire", specialtyId: "", description: "Conduct headcount at the designated meeting point and cross-reference with unit roster", system: false, priority: "P1" },
  { id: "t-33", name: "Restrict Building Access", workflow: "Apartment Fire", specialtyId: "", description: "Secure perimeter around affected area until fire department issues an all-clear", system: false, priority: "P1" },
  { id: "t-34", name: "Notify Regional Manager", workflow: "Apartment Fire", specialtyId: "", description: "Alert regional/property manager and ownership of incident scope and status", system: false, priority: "P1" },
  { id: "t-35", name: "Resident Communication", workflow: "Apartment Fire", specialtyId: "", description: "Send building-wide notification with safety status, area restrictions, and emergency contact info", system: false, priority: "P1" },
  { id: "t-36", name: "Obtain Fire Department Report", workflow: "Apartment Fire", specialtyId: "", description: "Request official fire incident report from responding fire department for records and insurance", system: false, priority: "P1" },
  { id: "t-37", name: "Structural Assessment", workflow: "Apartment Fire", specialtyId: "", description: "Schedule licensed structural engineer to inspect fire-affected and adjacent units for safety", system: false, priority: "P1" },
  { id: "t-38", name: "Document All Damage", workflow: "Apartment Fire", specialtyId: "", description: "Photograph and create written inventory of all damage to units, common areas, and building systems", system: false, priority: "P1" },
  { id: "t-39", name: "Coordinate Temporary Housing", workflow: "Apartment Fire", specialtyId: "", description: "Arrange hotel or temporary housing for all displaced residents and communicate details", system: false, priority: "P1" },
  { id: "t-40", name: "File Insurance Claim", workflow: "Apartment Fire", specialtyId: "", description: "Notify insurance carrier, submit initial claim with damage documentation and fire report", system: false, priority: "P1" },
  { id: "t-41", name: "Inspect Adjacent Units", workflow: "Apartment Fire", specialtyId: "", description: "Assess smoke damage, water damage from suppression, and soot contamination in surrounding units", system: false, priority: "P1" },
  { id: "t-42", name: "Media Response Preparation", workflow: "Apartment Fire", specialtyId: "", description: "Prepare official statement and designate single spokesperson in case of media inquiries", system: false, priority: "P2" },
  { id: "t-43", name: "Restoration Vendor RFP", workflow: "Apartment Fire", specialtyId: "", description: "Contact licensed fire restoration vendors, collect bids, and select contractor", system: false, priority: "P1" },
  { id: "t-44", name: "Code Compliance Review", workflow: "Apartment Fire", specialtyId: "", description: "Verify all rebuilding and restoration plans meet current fire codes and local building regulations", system: false, priority: "P1" },
  { id: "t-45", name: "Close-out Report", workflow: "Apartment Fire", specialtyId: "", description: "Compile final incident report including timeline, costs, insurance status, and lessons learned", system: false, priority: "P2" },

  // ── Custom Tasks: Blood / Biohazard (Emergency) ────────────────────────────
  { id: "t-50", name: "Secure the Scene", workflow: "Blood / Biohazard", specialtyId: "", description: "Immediately restrict access to the affected area — do not allow staff, residents, or maintenance to enter", system: false, priority: "P1" },
  { id: "t-51", name: "Contact Emergency Services", workflow: "Blood / Biohazard", specialtyId: "", description: "Call 911 if there is an active medical emergency; wait for authorities to officially release the scene", system: false, priority: "P1" },
  { id: "t-52", name: "Notify Regional Manager", workflow: "Blood / Biohazard", specialtyId: "", description: "Alert property manager and regional leadership of the biohazard incident with scope details", system: false, priority: "P1" },
  { id: "t-53", name: "Establish Access Perimeter", workflow: "Blood / Biohazard", specialtyId: "", description: "Set up physical barriers and entry log — isolate unit plus hallways, stairwells, and elevators used as travel paths", system: false, priority: "P1" },
  { id: "t-54", name: "Staff Safety Briefing", workflow: "Blood / Biohazard", specialtyId: "", description: "Brief all on-site staff that untrained personnel must not enter — OSHA Bloodborne Pathogens Standard (29 CFR 1910.1030) applies", system: false, priority: "P1" },
  { id: "t-55", name: "Isolate HVAC Zone", workflow: "Blood / Biohazard", specialtyId: "", description: "Shut down HVAC serving the affected area to prevent airborne contamination spread to other units", system: false, priority: "P1" },
  { id: "t-56", name: "Document Contamination Scope", workflow: "Blood / Biohazard", specialtyId: "", description: "Photograph affected surfaces and document impacted materials — carpet, subfloor, drywall, baseboards, furniture", system: false, priority: "P1" },
  { id: "t-57", name: "Contact Licensed Remediation Company", workflow: "Blood / Biohazard", specialtyId: "", description: "Engage a licensed biohazard/trauma scene remediation firm — verify licensing, insurance, and proper disposal certifications", system: false, priority: "P1" },
  { id: "t-58", name: "Notify Insurance Provider", workflow: "Blood / Biohazard", specialtyId: "", description: "File initial claim notification with biohazard coverage details and preliminary damage documentation", system: false, priority: "P1" },
  { id: "t-59", name: "Resident Communication", workflow: "Blood / Biohazard", specialtyId: "", description: "Notify affected residents using neutral language (e.g. 'professional remediation in progress') without sharing occupant details", system: false, priority: "P1" },
  { id: "t-60", name: "Coordinate Temporary Relocation", workflow: "Blood / Biohazard", specialtyId: "", description: "Arrange alternative housing for displaced residents and communicate realistic re-entry timelines", system: false, priority: "P1" },
  { id: "t-61", name: "Oversee Professional Cleanup", workflow: "Blood / Biohazard", specialtyId: "", description: "Monitor remediation progress — containment, removal of porous materials, EPA-registered disinfectants with verified dwell times", system: false, priority: "P2" },
  { id: "t-62", name: "Waste Disposal Verification", workflow: "Blood / Biohazard", specialtyId: "", description: "Confirm all regulated medical waste has been disposed with proper manifests and chain-of-custody documentation", system: false, priority: "P1" },
  { id: "t-63", name: "Post-Remediation Clearance Testing", workflow: "Blood / Biohazard", specialtyId: "", description: "Obtain professional clearance confirmation that the area is safe for re-occupancy", system: false, priority: "P1" },
  { id: "t-64", name: "File Insurance Claim", workflow: "Blood / Biohazard", specialtyId: "", description: "Submit complete claim with full documentation, remediation invoices, and disposal manifests", system: false, priority: "P2" },
  { id: "t-65", name: "Close-out Report", workflow: "Blood / Biohazard", specialtyId: "", description: "Compile final incident report including timeline, OSHA compliance verification, costs, and policy recommendations", system: false, priority: "P2" },

  // ── Custom Tasks: Flood / Water Damage (Emergency) ─────────────────────────
  { id: "t-70", name: "Shut Off Water Source", workflow: "Flood / Water Damage", specialtyId: "", description: "Locate and close the building main water valve or isolate the affected plumbing line to stop the flow", system: false, priority: "P1" },
  { id: "t-71", name: "Cut Power to Affected Areas", workflow: "Flood / Water Damage", specialtyId: "", description: "Shut off electricity to all flooded areas to eliminate electrocution risk — do not enter standing water near live power", system: false, priority: "P1" },
  { id: "t-72", name: "Contact Emergency Restoration", workflow: "Flood / Water Damage", specialtyId: "", description: "Engage a certified 24/7 water extraction and structural drying service with industrial-grade equipment", system: false, priority: "P1" },
  { id: "t-73", name: "Notify Regional Manager", workflow: "Flood / Water Damage", specialtyId: "", description: "Alert property manager and regional leadership with incident scope and estimated unit count", system: false, priority: "P1" },
  { id: "t-74", name: "Restrict Area Access", workflow: "Flood / Water Damage", specialtyId: "", description: "Block off all flooded areas and post signage — do not allow residents or non-essential staff to enter", system: false, priority: "P1" },
  { id: "t-75", name: "Document All Damage", workflow: "Flood / Water Damage", specialtyId: "", description: "Take thorough photos and video of affected units, common areas, and mechanical systems before cleanup begins", system: false, priority: "P1" },
  { id: "t-76", name: "Deploy Water Extraction Equipment", workflow: "Flood / Water Damage", specialtyId: "", description: "Begin water removal with industrial pumps, wet vacuums, and deploy dehumidifiers with thermal imaging monitoring", system: false, priority: "P1" },
  { id: "t-77", name: "Resident Communication", workflow: "Flood / Water Damage", specialtyId: "", description: "Notify all affected residents of the situation, safety precautions, area restrictions, and estimated timelines", system: false, priority: "P1" },
  { id: "t-78", name: "Inspect Building Systems", workflow: "Flood / Water Damage", specialtyId: "", description: "Check electrical panels, wiring, HVAC systems, and plumbing for water exposure — repair or isolate corroded components", system: false, priority: "P1" },
  { id: "t-79", name: "Apply Antimicrobial Treatment", workflow: "Flood / Water Damage", specialtyId: "", description: "Treat all affected areas with antimicrobial solution during drying to prevent mold colonization (begins within 24-48 hours)", system: false, priority: "P1" },
  { id: "t-80", name: "Coordinate Temporary Housing", workflow: "Flood / Water Damage", specialtyId: "", description: "Arrange hotel or alternative housing for displaced residents and communicate move-in details", system: false, priority: "P1" },
  { id: "t-81", name: "File Insurance Claim", workflow: "Flood / Water Damage", specialtyId: "", description: "Notify insurance carrier with initial documentation, damage photos, and estimated scope of loss", system: false, priority: "P1" },
  { id: "t-82", name: "Monitor Drying Progress", workflow: "Flood / Water Damage", specialtyId: "", description: "Use thermal imaging and moisture meters daily to verify structural drying targets are being met", system: false, priority: "P2" },
  { id: "t-83", name: "48-Hour Mold Assessment", workflow: "Flood / Water Damage", specialtyId: "", description: "Conduct professional mold assessment on all affected areas — mold colonization can begin within 24-48 hours of water exposure", system: false, priority: "P1" },
  { id: "t-84", name: "Restoration Vendor RFP", workflow: "Flood / Water Damage", specialtyId: "", description: "Collect bids from licensed restoration vendors for permanent repairs to drywall, flooring, and finishes", system: false, priority: "P2" },
  { id: "t-85", name: "Close-out Report", workflow: "Flood / Water Damage", specialtyId: "", description: "Compile final incident report with timeline, total costs, insurance claim status, and process improvement recommendations", system: false, priority: "P2" },
];

export const WORKFLOWS = ["All Workflows", "Operations", "Apartment Fire", "Blood / Biohazard", "Flood / Water Damage", "Document Approval", "Compliance", "Trainings & SOP", "Leasing", "Maintenance", "Renewals", "Accounting"];

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

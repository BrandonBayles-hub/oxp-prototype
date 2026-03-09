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
  "Emergency",
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
    description: "Emergency response for fire incidents including evacuation, resident safety, structural assessment, insurance, and restoration coordination",
    category: "Emergency",
    type: "emergency",
    variety: "custom",
    priority: "P0",
    repeats: "Never",
    lastEdited: "2026-01-07",
    tasks: [
      { id: "pbt-1-t1", name: "Verify 911 Called", description: "Confirm fire department and emergency services have been dispatched to the property", dueOffset: "1 Hour", priority: "P0", specialtyId: "" },
      { id: "pbt-1-t2", name: "Evacuate Affected Units", description: "Ensure all residents in the affected and adjacent units have been safely evacuated", dueOffset: "1 Hour", priority: "P0", specialtyId: "" },
      { id: "pbt-1-t3", name: "Account for All Residents", description: "Conduct headcount at the designated meeting point and cross-reference with unit roster", dueOffset: "1 Hour", priority: "P0", specialtyId: "" },
      { id: "pbt-1-t4", name: "Restrict Building Access", description: "Secure perimeter around affected area until fire department issues an all-clear", dueOffset: "1 Hour", priority: "P0", specialtyId: "" },
      { id: "pbt-1-t5", name: "Notify Regional Manager", description: "Alert regional/property manager and ownership of incident scope and status", dueOffset: "1 Hour", priority: "P0", specialtyId: "" },
      { id: "pbt-1-t6", name: "Resident Communication", description: "Send building-wide notification with safety status, area restrictions, and emergency contact info", dueOffset: "3 Hours", priority: "P1", specialtyId: "" },
      { id: "pbt-1-t7", name: "Obtain Fire Department Report", description: "Request official fire incident report from responding fire department for records and insurance", dueOffset: "1 Day", priority: "P1", specialtyId: "" },
      { id: "pbt-1-t8", name: "Structural Assessment", description: "Schedule licensed structural engineer to inspect fire-affected and adjacent units for safety", dueOffset: "1 Day", priority: "P0", specialtyId: "" },
      { id: "pbt-1-t9", name: "Document All Damage", description: "Photograph and create written inventory of all damage to units, common areas, and building systems", dueOffset: "1 Day", priority: "P1", specialtyId: "" },
      { id: "pbt-1-t10", name: "Coordinate Temporary Housing", description: "Arrange hotel or temporary housing for all displaced residents and communicate details", dueOffset: "1 Day", priority: "P1", specialtyId: "" },
      { id: "pbt-1-t11", name: "File Insurance Claim", description: "Notify insurance carrier, submit initial claim with damage documentation and fire report", dueOffset: "1 Day", priority: "P1", specialtyId: "" },
      { id: "pbt-1-t12", name: "Inspect Adjacent Units", description: "Assess smoke damage, water damage from suppression, and soot contamination in surrounding units", dueOffset: "2 Days", priority: "P1", specialtyId: "" },
      { id: "pbt-1-t13", name: "Media Response Preparation", description: "Prepare official statement and designate single spokesperson in case of media inquiries", dueOffset: "1 Day", priority: "P2", specialtyId: "" },
      { id: "pbt-1-t14", name: "Restoration Vendor RFP", description: "Contact licensed fire restoration vendors, collect bids, and select contractor", dueOffset: "3 Days", priority: "P1", specialtyId: "" },
      { id: "pbt-1-t15", name: "Code Compliance Review", description: "Verify all rebuilding and restoration plans meet current fire codes and local building regulations", dueOffset: "1 Week", priority: "P1", specialtyId: "" },
      { id: "pbt-1-t16", name: "Close-out Report", description: "Compile final incident report including timeline, costs, insurance status, and lessons learned", dueOffset: "2 Weeks", priority: "P2", specialtyId: "" },
    ],
    stats: {
      lastLaunch: "2025-12-17",
      nextLaunch: "",
      launches: 8,
      activePlays: 2,
      activeTasks: 14,
    },
  },
  {
    id: "pbt-7",
    name: "Blood / Biohazard",
    description: "Emergency response for biohazard incidents including scene security, professional remediation, OSHA compliance, and resident communication",
    category: "Emergency",
    type: "emergency",
    variety: "custom",
    priority: "P0",
    repeats: "Never",
    lastEdited: "2026-03-01",
    sourceDoc: {
      name: "Biohazard Response Protocol",
      type: "PDF",
      date: "Jan 15, 2026 at 9:30am MST",
    },
    tasks: [
      { id: "pbt-7-t1", name: "Secure the Scene", description: "Immediately restrict access to the affected area — do not allow staff, residents, or maintenance to enter", dueOffset: "1 Hour", priority: "P0", specialtyId: "" },
      { id: "pbt-7-t2", name: "Contact Emergency Services", description: "Call 911 if there is an active medical emergency; wait for authorities to officially release the scene", dueOffset: "1 Hour", priority: "P0", specialtyId: "" },
      { id: "pbt-7-t3", name: "Notify Regional Manager", description: "Alert property manager and regional leadership of the biohazard incident with scope details", dueOffset: "1 Hour", priority: "P0", specialtyId: "" },
      { id: "pbt-7-t4", name: "Establish Access Perimeter", description: "Set up physical barriers and entry log — isolate unit plus hallways, stairwells, and elevators used as travel paths", dueOffset: "1 Hour", priority: "P0", specialtyId: "" },
      { id: "pbt-7-t5", name: "Staff Safety Briefing", description: "Brief all on-site staff that untrained personnel must not enter — OSHA Bloodborne Pathogens Standard (29 CFR 1910.1030) applies", dueOffset: "3 Hours", priority: "P1", specialtyId: "" },
      { id: "pbt-7-t6", name: "Isolate HVAC Zone", description: "Shut down HVAC serving the affected area to prevent airborne contamination spread to other units", dueOffset: "3 Hours", priority: "P1", specialtyId: "" },
      { id: "pbt-7-t7", name: "Document Contamination Scope", description: "Photograph affected surfaces and document impacted materials — carpet, subfloor, drywall, baseboards, furniture", dueOffset: "3 Hours", priority: "P1", specialtyId: "" },
      { id: "pbt-7-t8", name: "Contact Licensed Remediation Company", description: "Engage a licensed biohazard/trauma scene remediation firm — verify licensing, insurance, and proper disposal certifications", dueOffset: "6 Hours", priority: "P1", specialtyId: "" },
      { id: "pbt-7-t9", name: "Notify Insurance Provider", description: "File initial claim notification with biohazard coverage details and preliminary damage documentation", dueOffset: "1 Day", priority: "P1", specialtyId: "" },
      { id: "pbt-7-t10", name: "Resident Communication", description: "Notify affected residents using neutral language (e.g. 'professional remediation in progress') without sharing occupant details", dueOffset: "1 Day", priority: "P1", specialtyId: "" },
      { id: "pbt-7-t11", name: "Coordinate Temporary Relocation", description: "Arrange alternative housing for displaced residents and communicate realistic re-entry timelines", dueOffset: "1 Day", priority: "P1", specialtyId: "" },
      { id: "pbt-7-t12", name: "Oversee Professional Cleanup", description: "Monitor remediation progress — containment, removal of porous materials, EPA-registered disinfectants with verified dwell times", dueOffset: "3 Days", priority: "P2", specialtyId: "" },
      { id: "pbt-7-t13", name: "Waste Disposal Verification", description: "Confirm all regulated medical waste has been disposed with proper manifests and chain-of-custody documentation", dueOffset: "3 Days", priority: "P1", specialtyId: "" },
      { id: "pbt-7-t14", name: "Post-Remediation Clearance Testing", description: "Obtain professional clearance confirmation that the area is safe for re-occupancy", dueOffset: "5 Days", priority: "P1", specialtyId: "" },
      { id: "pbt-7-t15", name: "File Insurance Claim", description: "Submit complete claim with full documentation, remediation invoices, and disposal manifests", dueOffset: "1 Week", priority: "P2", specialtyId: "" },
      { id: "pbt-7-t16", name: "Close-out Report", description: "Compile final incident report including timeline, OSHA compliance verification, costs, and policy recommendations", dueOffset: "2 Weeks", priority: "P2", specialtyId: "" },
    ],
    stats: {
      lastLaunch: "2026-02-10",
      nextLaunch: "",
      launches: 3,
      activePlays: 1,
      activeTasks: 16,
    },
  },
  {
    id: "pbt-8",
    name: "Flood / Water Damage",
    description: "Emergency response for flooding and water damage including source shutoff, water extraction, mold prevention, and restoration",
    category: "Emergency",
    type: "emergency",
    variety: "custom",
    priority: "P0",
    repeats: "Never",
    lastEdited: "2026-03-01",
    sourceDoc: {
      name: "Water Damage Response Plan",
      type: "PDF",
      date: "Jan 20, 2026 at 2:15pm MST",
    },
    tasks: [
      { id: "pbt-8-t1", name: "Shut Off Water Source", description: "Locate and close the building main water valve or isolate the affected plumbing line to stop the flow", dueOffset: "1 Hour", priority: "P0", specialtyId: "" },
      { id: "pbt-8-t2", name: "Cut Power to Affected Areas", description: "Shut off electricity to all flooded areas to eliminate electrocution risk — do not enter standing water near live power", dueOffset: "1 Hour", priority: "P0", specialtyId: "" },
      { id: "pbt-8-t3", name: "Contact Emergency Restoration", description: "Engage a certified 24/7 water extraction and structural drying service with industrial-grade equipment", dueOffset: "1 Hour", priority: "P0", specialtyId: "" },
      { id: "pbt-8-t4", name: "Notify Regional Manager", description: "Alert property manager and regional leadership with incident scope and estimated unit count", dueOffset: "1 Hour", priority: "P0", specialtyId: "" },
      { id: "pbt-8-t5", name: "Restrict Area Access", description: "Block off all flooded areas and post signage — do not allow residents or non-essential staff to enter", dueOffset: "1 Hour", priority: "P1", specialtyId: "" },
      { id: "pbt-8-t6", name: "Document All Damage", description: "Take thorough photos and video of affected units, common areas, and mechanical systems before cleanup begins", dueOffset: "3 Hours", priority: "P1", specialtyId: "" },
      { id: "pbt-8-t7", name: "Deploy Water Extraction Equipment", description: "Begin water removal with industrial pumps, wet vacuums, and deploy dehumidifiers with thermal imaging monitoring", dueOffset: "3 Hours", priority: "P0", specialtyId: "" },
      { id: "pbt-8-t8", name: "Resident Communication", description: "Notify all affected residents of the situation, safety precautions, area restrictions, and estimated timelines", dueOffset: "3 Hours", priority: "P1", specialtyId: "" },
      { id: "pbt-8-t9", name: "Inspect Building Systems", description: "Check electrical panels, wiring, HVAC systems, and plumbing for water exposure — repair or isolate corroded components", dueOffset: "1 Day", priority: "P1", specialtyId: "" },
      { id: "pbt-8-t10", name: "Apply Antimicrobial Treatment", description: "Treat all affected areas with antimicrobial solution during drying to prevent mold colonization (begins within 24-48 hours)", dueOffset: "1 Day", priority: "P1", specialtyId: "" },
      { id: "pbt-8-t11", name: "Coordinate Temporary Housing", description: "Arrange hotel or alternative housing for displaced residents and communicate move-in details", dueOffset: "1 Day", priority: "P1", specialtyId: "" },
      { id: "pbt-8-t12", name: "File Insurance Claim", description: "Notify insurance carrier with initial documentation, damage photos, and estimated scope of loss", dueOffset: "1 Day", priority: "P1", specialtyId: "" },
      { id: "pbt-8-t13", name: "Monitor Drying Progress", description: "Use thermal imaging and moisture meters daily to verify structural drying targets are being met", dueOffset: "3 Days", priority: "P2", specialtyId: "" },
      { id: "pbt-8-t14", name: "48-Hour Mold Assessment", description: "Conduct professional mold assessment on all affected areas — mold colonization can begin within 24-48 hours of water exposure", dueOffset: "2 Days", priority: "P1", specialtyId: "" },
      { id: "pbt-8-t15", name: "Restoration Vendor RFP", description: "Collect bids from licensed restoration vendors for permanent repairs to drywall, flooring, and finishes", dueOffset: "5 Days", priority: "P2", specialtyId: "" },
      { id: "pbt-8-t16", name: "Close-out Report", description: "Compile final incident report with timeline, total costs, insurance claim status, and process improvement recommendations", dueOffset: "2 Weeks", priority: "P2", specialtyId: "" },
    ],
    stats: {
      lastLaunch: "2026-01-25",
      nextLaunch: "",
      launches: 5,
      activePlays: 2,
      activeTasks: 22,
    },
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getPlaybookTemplate(id: string): PlaybookTemplate | undefined {
  return SEED_PLAYBOOK_TEMPLATES.find((t) => t.id === id);
}

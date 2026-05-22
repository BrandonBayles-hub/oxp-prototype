const DEMO_ADMIN = {
  id: "u1", name: "Alex Chen", email: "admin@sunsetpm.com", role: "Admin",
  companyId: "c1", companyName: "Sunset Property Group", locale: "en"
};
const DEMO_MANAGER = {
  id: "u2", name: "Morgan West", email: "morgan.west@sunsetpm.com", role: "Regional VP",
  companyId: "c1", companyName: "Sunset Property Group", locale: "en"
};
const DEMO_PM = {
  id: "u3", name: "Parker Williams", email: "parker.sf@sunsetpm.com", role: "Property Manager",
  companyId: "c1", companyName: "Sunset Property Group", locale: "en"
};
const DEMO_LEARNER = {
  id: "u4", name: "Taylor Brooks", email: "taylor.sf@sunsetpm.com", role: "Leasing Agent",
  companyId: "c1", companyName: "Sunset Property Group", locale: "en"
};

const DEMO_USERS_MAP = {
  "admin@sunsetpm.com": DEMO_ADMIN,
  "morgan.west@sunsetpm.com": DEMO_MANAGER,
  "parker.sf@sunsetpm.com": DEMO_PM,
  "taylor.sf@sunsetpm.com": DEMO_LEARNER,
  "riley.sf@sunsetpm.com": { id: "u5", name: "Riley Maintenance", email: "riley.sf@sunsetpm.com", role: "Maintenance Tech", companyId: "c1", companyName: "Sunset Property Group", locale: "en" },
  "rafael.sf@sunsetpm.com": { id: "u6", name: "Rafael Oliveira", email: "rafael.sf@sunsetpm.com", role: "Maintenance Tech", companyId: "c1", companyName: "Sunset Property Group", locale: "pt-BR" },
};

let currentUser = DEMO_ADMIN;

const courses = [
  { id: "c1", title: "Fair Housing Essentials", description: "Comprehensive fair housing training covering protected classes, advertising compliance, reasonable accommodations, and documentation.", category: "Compliance", type: "scorm", source: "catalog", duration_minutes: 45, tier_required: "basic", published: true, average_rating: 4.5, rating_count: 23, verticals: ["Conventional", "Affordable"], recommended_roles: ["Leasing Agent", "Property Manager"] },
  { id: "c2", title: "Lead Manager Fundamentals", description: "Master guest cards, lead source tracking, follow-up workflows, pipeline management, and conversion metrics.", category: "Lead to Lease", type: "video", source: "catalog", duration_minutes: 30, tier_required: "basic", published: true, average_rating: 4.2, rating_count: 18, verticals: ["Conventional"], recommended_roles: ["Leasing Agent"] },
  { id: "c3", title: "Lead Follow-Up Best Practices", description: "The 5-minute rule, multi-channel follow-up, objection handling, and closing techniques.", category: "Lead to Lease", type: "video", source: "catalog", duration_minutes: 25, tier_required: "basic", published: true, average_rating: 4.7, rating_count: 31, verticals: ["Conventional"] },
  { id: "c4", title: "Maintenance Safety Basics", description: "PPE requirements, ladder safety, lockout/tagout, chemical handling, and incident reporting.", category: "Maintenance", type: "scorm", source: "catalog", duration_minutes: 35, tier_required: "basic", published: true, average_rating: 4.3, rating_count: 14, verticals: ["Conventional", "Affordable", "Commercial"] },
  { id: "c5", title: "Work Order Management", description: "Work order lifecycle, priority triage, resident communication, and completion procedures.", category: "Maintenance", type: "video", source: "catalog", duration_minutes: 25, tier_required: "basic", published: true, average_rating: 4.1, rating_count: 9, verticals: ["Conventional"] },
  { id: "c6", title: "Entrata Platform Onboarding", description: "Welcome to Entrata: navigation, role-specific modules, dashboard customization, and getting help.", category: "Onboarding", type: "video", source: "catalog", duration_minutes: 20, tier_required: "basic", published: true, average_rating: 4.0, rating_count: 45, verticals: ["Conventional", "Affordable", "Student", "Senior"] },
  { id: "c7", title: "Rentable Items, Assignable Items, and Services", description: "Configure and manage rentable items, assignable items, and services in the Entrata platform.", category: "Accounting", type: "scorm", source: "catalog", duration_minutes: 25, tier_required: "basic", published: true, average_rating: 3.9, rating_count: 7, verticals: ["Conventional", "Affordable", "Commercial"] },
  { id: "c8", title: "Call Tracking", description: "Call tracking setup, lead source attribution, call recording, and analytics dashboard.", category: "Lead to Lease", type: "scorm", source: "catalog", duration_minutes: 20, tier_required: "basic", published: true, average_rating: 4.4, rating_count: 12, verticals: ["Conventional"] },
  { id: "c9", title: "Late Fees and Delinquency", description: "Late fee configuration, delinquency workflows, and collections processes.", category: "Accounting", type: "scorm", source: "catalog", duration_minutes: 30, tier_required: "basic", published: true, average_rating: 4.0, rating_count: 6, verticals: ["Conventional", "Affordable"] },
  { id: "c10", title: "Sunset Leasing Playbook", description: "Internal leasing standards specific to Sunset properties.", category: "Lead to Lease", type: "video", source: "custom", duration_minutes: 25, tier_required: "elite", published: true, company_id: "c1" },
];

const enrollments = [
  { id: "e1", course_id: "c1", title: "Fair Housing Essentials", status: "in_progress", progress: 60, due_date: "2026-04-20", enrolled_at: "2026-03-01", category: "Compliance", type: "scorm", source: "catalog", duration_minutes: 45 },
  { id: "e2", course_id: "c2", title: "Lead Manager Fundamentals", status: "completed", progress: 100, due_date: "2026-03-15", enrolled_at: "2026-02-15", completed_at: "2026-03-10", category: "Lead to Lease", type: "video", source: "catalog", duration_minutes: 30 },
  { id: "e3", course_id: "c4", title: "Maintenance Safety Basics", status: "not_started", progress: 0, due_date: "2026-04-30", enrolled_at: "2026-03-20", category: "Maintenance", type: "scorm", source: "catalog", duration_minutes: 35 },
  { id: "e4", course_id: "c6", title: "Entrata Platform Onboarding", status: "completed", progress: 100, enrolled_at: "2026-01-15", completed_at: "2026-01-20", category: "Onboarding", type: "video", source: "catalog", duration_minutes: 20 },
  { id: "e5", course_id: "c3", title: "Lead Follow-Up Best Practices", status: "in_progress", progress: 30, due_date: "2026-04-10", enrolled_at: "2026-03-25", category: "Lead to Lease", type: "video", source: "catalog", duration_minutes: 25 },
];

const certificates = [
  { id: "cert1", course_title: "Lead Manager Fundamentals", certificate_number: "EA-2026-001", issued_at: "2026-03-10", expires_at: "2027-03-10" },
  { id: "cert2", course_title: "Entrata Platform Onboarding", certificate_number: "EA-2026-002", issued_at: "2026-01-20" },
];

const policies = [
  { id: "p1", title: "Fair Housing Policy 2026", category: "Compliance", version: 1, status: "acknowledged", acknowledged_at: "2026-02-01", due_date: "2026-01-31", next_due_date: "2027-01-31" },
  { id: "p2", title: "Employee Handbook v4.2", category: "HR", version: 4, status: "pending", due_date: "2026-04-15" },
  { id: "p3", title: "OSHA Workplace Safety Standards", category: "Safety", version: 2, status: "overdue", due_date: "2026-03-01" },
  { id: "p4", title: "Sexual Harassment Prevention", category: "Compliance", version: 3, status: "acknowledged", acknowledged_at: "2026-01-10", due_date: "2026-01-15", next_due_date: "2027-01-15" },
  { id: "p5", title: "Emergency Evacuation Procedures", category: "Safety", version: 1, status: "acknowledged", acknowledged_at: "2026-02-20", due_date: "2026-02-28", next_due_date: "2027-02-28" },
  { id: "p6", title: "Data Privacy & Security Policy", category: "IT", version: 2, status: "acknowledged", acknowledged_at: "2025-12-05", due_date: "2025-12-01", next_due_date: "2026-12-01" },
  { id: "p7", title: "Anti-Discrimination Policy", category: "Compliance", version: 1, status: "acknowledged", acknowledged_at: "2026-01-22", due_date: "2026-01-31", next_due_date: "2027-01-31" },
  { id: "p8", title: "Acceptable Use Policy", category: "IT", version: 3, status: "acknowledged", acknowledged_at: "2025-11-15", due_date: "2025-11-30", next_due_date: "2026-11-30" },
  { id: "p9", title: "Workplace Violence Prevention", category: "Safety", version: 1, status: "acknowledged", acknowledged_at: "2026-03-01", due_date: "2026-03-15", next_due_date: "2027-03-15" },
];

const team = [
  { id: "u4", name: "Taylor Brooks", role: "Leasing Agent", property: "Sunset Towers", property_name: "Sunset Towers", completed_courses: 3, open_courses: 2, overdue_courses: 1, last_activity: "2026-04-01" },
  { id: "u5", name: "Riley Maintenance", role: "Maintenance Tech", property: "Sunset Towers", property_name: "Sunset Towers", completed_courses: 5, open_courses: 1, overdue_courses: 0, last_activity: "2026-04-02" },
  { id: "u6", name: "Rafael Oliveira", role: "Maintenance Tech", property: "Harbor View", property_name: "Harbor View", completed_courses: 2, open_courses: 3, overdue_courses: 2, last_activity: "2026-03-28" },
  { id: "u7", name: "Jordan Lee", role: "Leasing Agent", property: "Oak Ridge", property_name: "Oak Ridge", completed_courses: 6, open_courses: 0, overdue_courses: 0, last_activity: "2026-04-03" },
  { id: "u8", name: "Casey Rivera", role: "Assistant Manager", property: "Sunset Towers", property_name: "Sunset Towers", completed_courses: 4, open_courses: 1, overdue_courses: 0, last_activity: "2026-04-02" },
];

const teamOverdue = [
  { user_id: "u4", name: "Taylor Brooks", title: "Fair Housing Essentials", due_date: "2026-03-15", days_overdue: 19 },
  { user_id: "u6", name: "Rafael Oliveira", title: "Maintenance Safety Basics", due_date: "2026-03-20", days_overdue: 14 },
  { user_id: "u6", name: "Rafael Oliveira", title: "Work Order Management", due_date: "2026-03-25", days_overdue: 9 },
];

const adminSummary = { users: 47, courses: 10, completions: 156, overdue: 12, completion_rate: 78 };
const complianceGaps = [
  { requirement: "Fair Housing", total: 47, compliant: 41, gap: 6 },
  { requirement: "OSHA Safety", total: 12, compliant: 10, gap: 2 },
];
// MVP training feedback (Apr 2026): enrollment rules are now scoped to groups.
// The shape below mirrors the enriched response from GET /api/assignment-rules
// (after the Apr 2026 update) and keeps enough state to demo retroactive run +
// auto-apply when a member is added to a group.
// Shape mirrors Entrata `company_groups` (Setup → Users and Groups → Groups).
// Fields: description, is_system, is_active_directory_group, is_scim_group,
// system_code, external_system, synced_at. Used to drive the admin assign
// Target → Groups picker badges.
let demoGroupsSyncedAt = new Date(Date.now() - 1000 * 60 * 90).toISOString();
let demoGroups = [
  // Regions (native Entrata company_groups)
  { id: "g-reg-west", name: "West Region", type: "region", description: "Properties and staff in CA, OR, WA.", external_system: "Entrata", synced_at: demoGroupsSyncedAt },
  { id: "g-reg-central", name: "Central Region", type: "region", description: "Properties and staff in TX, CO, AZ.", external_system: "Entrata", synced_at: demoGroupsSyncedAt },
  { id: "g-reg-east", name: "East Region", type: "region", description: "Properties and staff in GA, FL, NC.", external_system: "Entrata", synced_at: demoGroupsSyncedAt },
  // Properties
  { id: "g-prop-sunset", name: "Sunset Towers Staff", type: "property", description: "All staff assigned to Sunset Towers.", external_system: "Entrata", synced_at: demoGroupsSyncedAt },
  { id: "g-prop-harbor", name: "Harbor View Staff", type: "property", description: "All staff assigned to Harbor View.", external_system: "Entrata", synced_at: demoGroupsSyncedAt },
  { id: "g-prop-oak", name: "Oak Ridge Staff", type: "property", description: "All staff assigned to Oak Ridge.", external_system: "Entrata", synced_at: demoGroupsSyncedAt },
  { id: "g-prop-lake", name: "Lakewood Staff", type: "property", description: "All staff assigned to Lakewood.", external_system: "Entrata", synced_at: demoGroupsSyncedAt },
  { id: "g-prop-bay", name: "Bayview Apartments Staff", type: "property", description: "All staff assigned to Bayview Apartments.", external_system: "Entrata", synced_at: demoGroupsSyncedAt },
  // Roles
  { id: "g-mgr", name: "Managers", type: "role", description: "Every active property manager across regions.", external_system: "Entrata", synced_at: demoGroupsSyncedAt },
  { id: "g-leasing", name: "Leasing Agents", type: "role", description: "Every active leasing agent across regions.", external_system: "Entrata", synced_at: demoGroupsSyncedAt },
  { id: "g-maint", name: "Maintenance Techs", type: "role", description: "Every active maintenance tech across regions.", external_system: "Entrata", synced_at: demoGroupsSyncedAt },
  { id: "g-accounting", name: "Accountants", type: "role", description: "Accounting team across all properties.", external_system: "Entrata", synced_at: demoGroupsSyncedAt },
  { id: "g-rvp", name: "Regional VPs", type: "role", description: "Regional vice presidents across all regions.", external_system: "Entrata", synced_at: demoGroupsSyncedAt },
  // Departments
  { id: "g-dept-ops", name: "Operations", type: "department", description: "Corporate operations team.", external_system: "Entrata", synced_at: demoGroupsSyncedAt },
  { id: "g-dept-hr", name: "Human Resources", type: "department", description: "HR staff company-wide.", external_system: "Entrata", synced_at: demoGroupsSyncedAt },
  { id: "g-dept-it", name: "IT & Security", type: "department", description: "IT and security administrators.", external_system: "Entrata", synced_at: demoGroupsSyncedAt },
  { id: "g-dept-mktg", name: "Marketing", type: "department", description: "Marketing and communications team.", external_system: "Entrata", synced_at: demoGroupsSyncedAt },
  // Custom
  { id: "g-custom-newhires", name: "New Hires - Last 30 Days", type: "custom", description: "Employees hired within the last 30 days. Used for onboarding rules.", external_system: "Entrata", synced_at: demoGroupsSyncedAt },
  { id: "g-custom-leaders", name: "Leadership Cohort 2026", type: "custom", description: "Internal leadership development program cohort.", external_system: "Entrata", synced_at: demoGroupsSyncedAt },
  { id: "g-custom-scorm", name: "SCORM Beta Testers", type: "custom", description: "Pilot group validating new SCORM content.", external_system: "Entrata", synced_at: demoGroupsSyncedAt },
  // System groups (shipped in every Entrata tenant; drive Learning Center roles)
  { id: "g-sys-lcadmin", name: "Learning Center Administrators", type: "custom",
    description: "System group. Members manage Academy content, assignments, and reports.",
    is_system: true, system_code: "LCADMIN", external_system: "Entrata", synced_at: demoGroupsSyncedAt },
  { id: "g-sys-lctrnr", name: "Learning Center Trainers", type: "custom",
    description: "System group. Members can author courses and assign training to their teams.",
    is_system: true, system_code: "LCTRNR", external_system: "Entrata", synced_at: demoGroupsSyncedAt },
  // Active Directory synced groups
  { id: "g-ad-corporate", name: "Corporate Staff (AD)", type: "custom",
    description: "Synced nightly from Active Directory. Membership managed in AD.",
    is_active_directory_group: true, external_system: "Active Directory", synced_at: demoGroupsSyncedAt },
  { id: "g-ad-regional-mgrs", name: "Regional Managers (AD)", type: "role",
    description: "Synced nightly from Active Directory. Regional VP security group.",
    is_active_directory_group: true, external_system: "Active Directory", synced_at: demoGroupsSyncedAt },
  // SCIM synced group (Okta/Entra ID tenants)
  { id: "g-scim-all", name: "All Employees (Okta SCIM)", type: "custom",
    description: "Synced via SCIM from Okta. Includes every provisioned employee.",
    is_scim_group: true, external_system: "Okta SCIM", synced_at: demoGroupsSyncedAt },
];

// Members per group, as user IDs. Sized to look realistic when cards render member counts.
let demoGroupMembers = {
  "g-reg-west": ["u4", "u5", "u7", "u8"],
  "g-reg-central": ["u6"],
  "g-reg-east": [],
  "g-prop-sunset": ["u4", "u5", "u8"],
  "g-prop-harbor": ["u6"],
  "g-prop-oak": ["u7"],
  "g-prop-lake": [],
  "g-prop-bay": [],
  "g-mgr": ["u2", "u3", "u8"],
  "g-leasing": ["u4", "u7"],
  "g-maint": ["u5", "u6"],
  "g-accounting": [],
  "g-rvp": ["u2", "u3"],
  "g-dept-ops": ["u2", "u3", "u8"],
  "g-dept-hr": [],
  "g-dept-it": [],
  "g-dept-mktg": [],
  "g-custom-newhires": ["u4"],
  "g-custom-leaders": ["u2", "u3"],
  "g-sys-lcadmin": ["u1"],
  "g-sys-lctrnr": ["u2", "u3"],
  "g-ad-corporate": ["u1", "u2", "u3"],
  "g-ad-regional": ["u2", "u3"],
  "g-scim-all": ["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8"],
  "g-custom-scorm": ["u4", "u5"],
};

// MVP training feedback (Apr 2026): enrollment rules are scoped to groups and
// show live stats (enrolled/completed/overdue/pending) so admins can manage
// them post-creation instead of delete-and-recreate.
let demoRules = [
  {
    id: "r1",
    name: "New Hire Onboarding - All Properties",
    criteria: {},
    enrollment_target: "all",
    active: true,
    created_at: "2026-01-15T09:00:00Z",
    courses: [],
    learning_paths: [{ id: "lp1", title: "New Hire Essentials", due_days: 30 }],
    groupIds: ["g-custom-newhires", "g-prop-sunset"],
    stats: { total: 18, completed: 12, overdue: 1, pending: 6 },
  },
  {
    id: "r2",
    name: "Leasing Team - Fair Housing Annual",
    criteria: {},
    enrollment_target: "all",
    active: true,
    created_at: "2026-02-03T09:00:00Z",
    courses: [{ id: "c1", title: "Fair Housing Essentials", due_days: 45 }],
    learning_paths: [],
    groupIds: ["g-leasing", "g-reg-west"],
    stats: { total: 24, completed: 19, overdue: 2, pending: 5 },
  },
  {
    id: "r3",
    name: "Maintenance Safety - West Region",
    criteria: {},
    enrollment_target: "new_hires_only",
    active: true,
    created_at: "2026-03-12T09:00:00Z",
    courses: [],
    learning_paths: [{ id: "lp3", title: "Maintenance Professional", due_days: 60 }],
    groupIds: ["g-maint", "g-reg-west"],
    stats: { total: 9, completed: 3, overdue: 0, pending: 6 },
  },
];

// Learning Plans - company-authored. The admin "My Plans" view uses these.
let demoLearningPaths = [
  { id: "lp1", title: "New Hire Essentials", description: "The starting point for every new hire, regardless of role. Company orientation, workplace safety basics, harassment prevention, and a light intro to the Entrata systems you will use day to day. Expect to finish in your first week.", target_role: null, enrollment_mode: "auto_assign", course_count: 3, status: "published", created_at: "2026-01-05T09:00:00Z" },
  { id: "lp2", title: "Leasing Certification Track", description: "For leasing agents ready to level up. Sharpen prospect intake, fair housing, tour scripting, and objection handling - culminating in the internal Leasing Pro certification recognized across the portfolio.", target_role: "g-leasing", enrollment_mode: "catalog_only", course_count: 3, status: "published", created_at: "2026-01-10T09:00:00Z" },
  { id: "lp3", title: "Maintenance Professional", description: "Advanced training for experienced maintenance techs. Deepens work-order management in Entrata Facilities, covers vendor coordination, and pairs on-site safety refreshers with resident communication best practices.", target_role: "g-maint", enrollment_mode: "catalog_only", course_count: 2, status: "published", created_at: "2026-02-01T09:00:00Z" },
  { id: "lp4", title: "Accounting Fundamentals", description: "Built for new or cross-training accounting staff. Walks through rentable items, late fees, delinquency workflows, and month-end close inside Entrata Accounting.", target_role: null, enrollment_mode: "catalog_only", course_count: 2, status: "draft", created_at: "2026-03-22T09:00:00Z" },
];

// Curated by Entrata - authored by the publisher, appear in every company's catalog by default.
// Admins can hide any that aren't relevant; their learners won't see hidden plans.
let demoCuratedPlans = [
  { id: "cp1", title: "Leasing Pro 2026", description: "Entrata's recommended track for leasing agents in their first 30 days. Full lead-to-lease workflow - prospect intake, fair housing, tours, applications, and closing - with hands-on Entrata Leasing practice built in.", target_role: "Leasing Agent", course_count: 5, tier_required: "basic", hidden: false, published_at: "2026-01-15" },
  { id: "cp2", title: "Compliance Foundation", description: "Required baseline compliance for every on-site role. Covers Fair Housing, ADA, Sexual Harassment Prevention, and Data Privacy. Refreshers recommended annually.", target_role: null, course_count: 4, tier_required: "basic", hidden: false, published_at: "2025-11-20" },
  { id: "cp3", title: "Maintenance Tech Bootcamp", description: "Core onboarding for maintenance technicians. Tools and PPE safety, work-order lifecycle in Entrata Facilities, troubleshooting HVAC / plumbing / electrical, and professional resident communication.", target_role: "Maintenance Tech", course_count: 6, tier_required: "basic", hidden: false, published_at: "2026-02-08" },
  { id: "cp4", title: "Property Manager Launch", description: "Everything a new PM needs in their first 90 days on Entrata. Compliance obligations, day-to-day property operations (rent roll, delinquency, renewals), and coaching on-site teams to hit occupancy and NOI targets.", target_role: "Property Manager", course_count: 8, tier_required: "basic", hidden: false, published_at: "2026-03-01" },
  { id: "cp5", title: "Accounting Essentials", description: "For accountants ramping on Entrata Accounting. Rentable items, late fees, delinquency, and month-end close - with real ledger examples.", target_role: "Accountant", course_count: 4, tier_required: "basic", hidden: true, published_at: "2025-12-10" },
  { id: "cp6", title: "Advanced Compliance (Elite)", description: "Elite-only deep dive for multi-state operators. Multi-state compliance overrides, bonus/commission audit trails, and enforcement scenarios you will see during audits.", target_role: null, course_count: 3, tier_required: "elite", hidden: false, published_at: "2026-03-18" },
];

// Notifications (bell dropdown)
let demoNotifications = [
  { id: "n1", type: "course_assigned", title: "New course assigned", body: "Fair Housing Essentials was assigned to you", read: false, created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), link: "/my-learning" },
  { id: "n2", type: "completion", title: "Rafael completed a course", body: "Rafael Oliveira completed Maintenance Safety Basics", read: false, created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), link: "/team" },
  { id: "n3", type: "overdue", title: "1 team member is overdue", body: "Taylor Brooks has overdue training on Fair Housing Essentials", read: true, created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(), link: "/team" },
  { id: "n4", type: "release", title: "What's New: Rapid 2026.04b", body: "3 updates this sprint including Smart Maintenance Scheduling", read: true, created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), link: "/whats-new" },
];

// Contextual triggers + fires
let demoContextualTriggers = [
  { id: "ct1", event_type: "resident.move_in", name: "New Move-In -- Welcome Training", course_id: "c6", active: true, trigger_count: 12, last_fired_at: "2026-04-10T14:22:00Z" },
  { id: "ct2", event_type: "lease.renewal_sent", name: "Renewal Follow-Up Refresher", course_id: "c3", active: true, trigger_count: 8, last_fired_at: "2026-04-09T11:14:00Z" },
  { id: "ct3", event_type: "work_order.emergency", name: "Emergency Response Protocol", course_id: "c4", active: false, trigger_count: 3, last_fired_at: "2026-03-28T09:05:00Z" },
];

let demoTriggerFires = [
  { id: "tf1", trigger_id: "ct1", trigger_name: "New Move-In -- Welcome Training", event_type: "resident.move_in", user_name: "Casey Nguyen", course_title: "Entrata Platform Onboarding", fired_at: "2026-04-10T14:22:00Z", status: "enrolled" },
  { id: "tf2", trigger_id: "ct1", trigger_name: "New Move-In -- Welcome Training", event_type: "resident.move_in", user_name: "Avery Jackson", course_title: "Entrata Platform Onboarding", fired_at: "2026-04-09T16:08:00Z", status: "enrolled" },
  { id: "tf3", trigger_id: "ct2", trigger_name: "Renewal Follow-Up Refresher", event_type: "lease.renewal_sent", user_name: "Taylor Brooks", course_title: "Lead Follow-Up Best Practices", fired_at: "2026-04-09T11:14:00Z", status: "enrolled" },
  { id: "tf4", trigger_id: "ct2", trigger_name: "Renewal Follow-Up Refresher", event_type: "lease.renewal_sent", user_name: "Jordan Rivera", course_title: "Lead Follow-Up Best Practices", fired_at: "2026-04-08T10:33:00Z", status: "skipped", skip_reason: "Already completed in last 90 days" },
];

// Cert programs
let demoCertPrograms = [
  { id: "cert-prog-1", name: "Leasing Pro Certification", description: "Earn by completing all 3 courses in the Leasing Certification Track", course_count: 3, enrolled_count: 12, completed_count: 7, expiry_months: 12, status: "active" },
  { id: "cert-prog-2", name: "Maintenance Safety Certification", description: "OSHA-aligned safety fundamentals for property maintenance", course_count: 2, enrolled_count: 6, completed_count: 4, expiry_months: 24, status: "active" },
  { id: "cert-prog-3", name: "Fair Housing Certified", description: "Annual Fair Housing compliance certification", course_count: 1, enrolled_count: 47, completed_count: 41, expiry_months: 12, status: "active" },
];

// Audit log (for admin > audit log tab)
let demoAuditLog = [
  { id: "al1", created_at: "2026-04-10T15:22:00Z", actor_name: "Alex Chen", action: "assignment_rule_create", entity_type: "assignment_rule", entity_id: "r3", ip_address: "10.0.1.45" },
  { id: "al2", created_at: "2026-04-09T10:14:00Z", actor_name: "Alex Chen", action: "course_publish", entity_type: "course", entity_id: "c10", ip_address: "10.0.1.45" },
  { id: "al3", created_at: "2026-04-08T14:33:00Z", actor_name: "Morgan West", action: "learning_path_create", entity_type: "learning_path", entity_id: "lp4", ip_address: "10.0.2.18" },
  { id: "al4", created_at: "2026-04-07T09:05:00Z", actor_name: "Alex Chen", action: "group_create", entity_type: "group", entity_id: "g-custom-leaders", ip_address: "10.0.1.45" },
  { id: "al5", created_at: "2026-04-06T16:50:00Z", actor_name: "Alex Chen", action: "policy_acknowledge", entity_type: "policy", entity_id: "p1", ip_address: "10.0.1.45" },
];

const kbArticles = [
  { id: "kb1", slug: "reverse-charges-credits", title: "Reverse Charges and Credits", content_html: "<h2>Reversing a Charge or Credit</h2><p>Navigate to <strong>Residents &gt; Charges</strong> and locate the transaction you need to reverse.</p><h3>Single Transaction Reversal</h3><ol><li>Click the transaction row to expand details</li><li>Click <strong>Reverse</strong> in the action menu</li><li>Select a reason code (Required: Posting Error, Duplicate, Rate Change, etc.)</li><li>Add a note explaining the reversal</li><li>Click <strong>Confirm Reversal</strong></li></ol><h3>Bulk Reversal Tool</h3><p>For multiple transactions, use <strong>Residents &gt; Charges &gt; Bulk Reversal</strong>. Filter by date range, charge code, or property, then select the transactions to reverse.</p><h3>Important Notes</h3><ul><li>Reversals create an offsetting entry -- they do not delete the original transaction</li><li>Reversed transactions are marked with a strikethrough in the ledger</li><li>Reversals post to the same GL account as the original charge</li><li>Only users with the <em>Reverse Charges</em> permission can perform reversals</li></ul>", category: "Accounting", path: "Residents >> Charges", entrata_product: "Accounting", read_time_minutes: 3, version: 2, published: true },
  { id: "kb2", slug: "processing-move-in", title: "Processing a Move-In", content_html: "<h2>Move-In Checklist</h2><p>Before processing a move-in, ensure all prerequisites are complete:</p><ul><li>Lease signed and countersigned</li><li>Security deposit collected</li><li>Unit inspection completed</li><li>Keys prepared</li><li>Utility transfers confirmed</li></ul><h2>Steps</h2><ol><li>Navigate to <strong>Residents &gt; Move-Ins</strong></li><li>Select the applicant from the pending list</li><li>Verify all charges are correct on the ledger</li><li>Confirm move-in date matches the lease</li><li>Process the move-in</li><li>Generate and deliver the welcome packet</li></ol><h2>Post Move-In</h2><p>Within 48 hours, follow up with the new resident to ensure everything is satisfactory. Document any issues reported during the initial walkthrough.</p>", category: "Leasing", path: "Residents >> Applications", entrata_product: "Leasing", read_time_minutes: 8, version: 3, published: true },
  { id: "kb3", slug: "creating-work-orders", title: "Creating and Managing Work Orders", content_html: "<h2>Creating a Work Order</h2><p>Navigate to <strong>Maintenance &gt; Work Orders</strong> and click <strong>New Work Order</strong>.</p><ol><li>Select the property and unit</li><li>Choose a category (Plumbing, Electrical, HVAC, Appliance, General, etc.)</li><li>Set priority level</li><li>Describe the issue in detail</li><li>Attach photos if available</li></ol><h2>Managing Work Orders</h2><p>Use the work order dashboard to track status, assign technicians, and update residents on progress.</p><h3>Priority Guidelines</h3><ul><li><strong>Emergency:</strong> Water leak, no heat/AC, fire damage, lock-out</li><li><strong>Urgent:</strong> Appliance failure, plumbing backup, pest issue</li><li><strong>Normal:</strong> Cosmetic repairs, non-critical maintenance</li><li><strong>Low:</strong> Suggestions, future improvements</li></ul><h3>Assigning Technicians</h3><p>Click <strong>Assign</strong> on the work order detail page. You can assign to an in-house tech or a preferred vendor. The assignee receives an email and push notification.</p><h3>Completion Process</h3><p>When work is complete, update the status to <em>Completed</em>, add completion notes, and attach any before/after photos. The resident will be notified automatically.</p>", category: "Maintenance", path: "Maintenance >> Work Orders", entrata_product: "Maintenance", read_time_minutes: 6, version: 4, published: true },
  { id: "kb4", slug: "lease-renewals", title: "Setting Up Lease Renewals", content_html: "<h2>Renewal Configuration</h2><p>Configure renewal settings at <strong>Setup &gt; Properties &gt; Leasing &gt; Renewals</strong>.</p><h3>Steps</h3><ol><li>Set the renewal window (how many days before lease end to send offers)</li><li>Configure offer letter templates</li><li>Define term options (6-month, 12-month, month-to-month)</li><li>Set rent increase rules (flat amount, percentage, or market-based)</li></ol><h3>Bulk Renewals</h3><p>Use <strong>Residents &gt; Renewals &gt; Bulk Generate</strong> to create renewal offers for all expiring leases within your renewal window.</p><h3>Tracking</h3><p>The Renewal Dashboard shows pending, sent, accepted, and declined renewals. Use this to follow up with residents who haven't responded.</p>", category: "Leasing", path: "Residents >> Renewals", entrata_product: "Leasing", read_time_minutes: 7, version: 1, published: true },
  { id: "kb5", slug: "fair-housing-guide", title: "Fair Housing Compliance Guide", content_html: "<h2>Fair Housing Act Overview</h2><p>The Fair Housing Act prohibits discrimination based on race, color, national origin, religion, sex, familial status, and disability.</p><h3>Advertising Compliance</h3><ul><li>Never reference preferred or excluded demographics in marketing materials</li><li>Use inclusive imagery representing diverse populations</li><li>Avoid terms like 'perfect for young professionals' or 'ideal for families'</li></ul><h3>Reasonable Accommodations</h3><p>Residents with disabilities may request reasonable accommodations or modifications. These requests must be evaluated individually and cannot be denied without an interactive process.</p><h3>Documentation Best Practices</h3><ul><li>Document all applicant interactions consistently</li><li>Use standardized screening criteria applied equally to all applicants</li><li>Retain records for a minimum of 3 years</li></ul>", category: "Compliance", path: "Reference Guide", entrata_product: "General", read_time_minutes: 10, version: 2, published: true },
  { id: "kb6", slug: "configuring-late-fees", title: "Configuring Late Fees", content_html: "<h2>Late Fee Setup</h2><p>Configure automatic late fee assessment at <strong>Setup &gt; Properties &gt; Financial &gt; Charges</strong>.</p><h3>Configuration Options</h3><ul><li><strong>Grace period:</strong> Number of days after rent due date before late fee posts</li><li><strong>Fee type:</strong> Flat amount ($50) or percentage of balance (5%)</li><li><strong>Maximum fee:</strong> Cap on total late fee amount</li><li><strong>Daily late fees:</strong> Optional recurring daily charge until balance is paid</li></ul><h3>Property-Level Overrides</h3><p>Each property can have its own late fee schedule. Navigate to the property's Financial settings to override company-wide defaults.</p>", category: "Accounting", path: "Setup >> Properties >> Financial >> Charges", entrata_product: "Accounting", read_time_minutes: 5, version: 1, published: true },
  { id: "kb7", slug: "resident-portal-setup", title: "Resident Portal Setup", content_html: "<h2>Portal Configuration</h2><p>Configure the Resident Portal at <strong>Setup &gt; Properties &gt; Resident Portal</strong>.</p><h3>Features to Enable</h3><ul><li>Online payments (ACH, credit card, debit card)</li><li>Maintenance request submission</li><li>Lease renewal acceptance</li><li>Document sharing (lease, move-in checklist, community rules)</li><li>Community announcements</li><li>Package notifications</li></ul><h3>Branding</h3><p>Upload your property logo and choose accent colors to match your brand. The portal URL can be customized to your property domain.</p>", category: "Resident Experience", path: "Setup >> Properties >> Resident Portal", entrata_product: "Resident Portal", read_time_minutes: 6, version: 1, published: true },
  { id: "kb8", slug: "running-standard-reports", title: "Running Standard Reports", content_html: "<h2>Accessing Reports</h2><p>Navigate to <strong>Data &amp; Reports &gt; Standard Reports</strong> to access Entrata's library of pre-built reports.</p><h3>Common Reports</h3><ul><li><strong>Rent Roll:</strong> Current occupancy, lease terms, and rent amounts</li><li><strong>Delinquency:</strong> Past-due balances by resident, unit, and property</li><li><strong>Vacancy:</strong> Available units with days vacant and market rent</li><li><strong>Financial Summary:</strong> Income, expenses, and NOI by property</li></ul><h3>Customizing Reports</h3><p>Most reports support date range filters, property filters, and column selection. Click <strong>Customize</strong> to adjust the report layout.</p><h3>Scheduling</h3><p>Use <strong>Schedule Report</strong> to receive reports via email on a recurring basis (daily, weekly, monthly).</p>", category: "Reporting", path: "Data & Reports >> Standard Reports", entrata_product: "Reporting", read_time_minutes: 4, version: 1, published: true },
  { id: "kb9", slug: "reversing-payments", title: "Reversing Payments", content_html: "<h2>Payment Reversal Process</h2><p>To reverse a payment after it has been processed through Entrata's merchant services:</p><ol><li>Navigate to <strong>Residents &gt; AR Payments</strong></li><li>Find the payment in the transaction list</li><li>Click <strong>Reverse Payment</strong></li><li>Select the reversal reason</li><li>Confirm the reversal</li></ol><h3>Processing Times</h3><ul><li><strong>Credit/Debit Card reversals:</strong> 3-5 business days</li><li><strong>ACH reversals:</strong> 6-7 business days</li></ul><h3>Important</h3><p>Reversed payments may incur processing fees depending on your merchant agreement. Consult your payment processor's terms.</p>", category: "Accounting", path: "Residents >> AR Payments", entrata_product: "Accounting", read_time_minutes: 4, version: 1, published: true },
  { id: "kb10", slug: "adding-charges-credits", title: "Adding Charges and Credits", content_html: "<h2>Adding a Charge</h2><p>Navigate to <strong>Residents &gt; Charges</strong> and click <strong>Add Charge</strong>.</p><ol><li>Select the charge code (Rent, Pet Fee, Parking, etc.)</li><li>Enter the amount</li><li>Set the effective date</li><li>For recurring charges, configure the frequency and end date</li></ol><h2>Adding a Credit</h2><p>Credits offset existing charges. Follow the same process but select a credit charge code. Credits appear as negative amounts on the ledger.</p>", category: "Accounting", path: "Residents >> Charges", entrata_product: "Accounting", read_time_minutes: 5, version: 1, published: true },
  { id: "kb11", slug: "bulk-updating-lease-dates", title: "Bulk Updating Lease Dates", content_html: "<h2>Bulk Edit Tool</h2><p>Navigate to <strong>Residents &gt; Bulk Edit</strong> to update lease dates across multiple residents simultaneously.</p><h3>Steps</h3><ol><li>Filter residents by property, unit type, or lease status</li><li>Select the residents to update</li><li>Choose the field to modify (lease start, lease end, MTM start)</li><li>Enter the new date value</li><li>Review changes and confirm</li></ol><h3>Cautions</h3><ul><li>Bulk edits cannot be undone -- verify selections carefully</li><li>Changes to lease dates may trigger charge recalculations</li><li>Audit log records all bulk edit operations</li></ul>", category: "Leasing", path: "Residents >> Bulk Edit", entrata_product: "Leasing", read_time_minutes: 5, version: 1, published: true },
  { id: "kb12", slug: "vendor-management", title: "Vendor Management and PO Processing", content_html: "<h2>Adding a Vendor</h2><p>Navigate to <strong>Accounting &gt; Vendors</strong> and click <strong>Add Vendor</strong>.</p><ol><li>Enter vendor details (name, address, contact, tax ID)</li><li>Set up payment terms (Net 30, Net 60, etc.)</li><li>Upload insurance certificates</li><li>Assign vendor categories (Plumbing, Electrical, Landscaping, etc.)</li></ol><h2>Purchase Orders</h2><p>Create POs from the vendor profile or from a work order. POs require approval based on your company's approval chain settings.</p><h2>Invoice Processing</h2><p>Match invoices to POs, verify amounts, and submit for payment. The system flags discrepancies between PO and invoice amounts.</p>", category: "Maintenance", path: "Accounting >> Vendors", entrata_product: "Accounting", read_time_minutes: 7, version: 1, published: true },
];

const kbInstances = [
  { id: "inst1", article_id: "kb3", slug: "creating-work-orders", title: "Creating and Managing Work Orders", status: "published", base_version: 4, content_html: "<h2>Creating a Work Order at Sunset Properties</h2><p>Our process: Navigate to <strong>Maintenance &gt; Work Orders</strong> and click <strong>New Work Order</strong>.</p><ol><li>Select the property and unit</li><li>Choose a category</li><li>Set priority -- <strong>always mark plumbing as Urgent per Sunset policy</strong></li><li>Describe the issue in detail</li><li>Attach photos (required for all HVAC issues per insurance)</li></ol><h2>Sunset-Specific Rules</h2><ul><li>All after-hours emergencies: also report to on-call manager at ext. 5555</li><li>Pool/spa issues: always mark as Emergency and notify regional maintenance lead</li><li>Pest issues: use vendor Terminix (contract #SP-2026-445) -- do not use in-house staff</li></ul><h3>Priority Guidelines (Sunset Override)</h3><ul><li><strong>Emergency:</strong> Water leak, no heat/AC, fire damage, lock-out, <em>pool/spa mechanical failure</em></li><li><strong>Urgent:</strong> Appliance failure, plumbing backup, pest issue, <em>any plumbing regardless of severity</em></li><li><strong>Normal:</strong> Cosmetic repairs, non-critical maintenance</li><li><strong>Low:</strong> Suggestions, future improvements</li></ul>", created_at: "2026-03-01", updated_at: "2026-03-15" },
  { id: "inst2", article_id: "kb2", slug: "processing-move-in", title: "Processing a Move-In", status: "published", base_version: 2, content_html: "<h2>Sunset Move-In Process</h2><p>Our customized move-in checklist includes additional Sunset-specific steps beyond the standard Entrata process.</p><h3>Pre Move-In (72 hours before)</h3><ul><li>Confirm unit turnover is complete with maintenance lead</li><li>Schedule welcome orientation with property manager</li><li>Prepare gift basket (Sunset branded items from supply closet B)</li><li>Print parking permit and mailbox key assignment</li></ul><h3>Day-of Move-In Steps</h3><ol><li>Navigate to <strong>Residents &gt; Move-Ins</strong></li><li>Select the applicant from the pending list</li><li>Walk the unit with the resident using the Sunset Inspection Checklist (form WO-2026-A)</li><li>Verify all charges match the lease</li><li>Process the move-in in Entrata</li><li>Deliver welcome packet + parking permit + gift basket</li><li>Introduce to on-site team members</li></ol><h3>Post Move-In Follow-Up</h3><p>Within 24 hours (not 48 -- Sunset standard), call or email the new resident. Use the Sunset Welcome Follow-Up template in Entrata's message center.</p>", created_at: "2026-02-15", updated_at: "2026-02-20" },
  { id: "inst3", article_id: "kb6", slug: "configuring-late-fees", title: "Configuring Late Fees", status: "draft", base_version: 1, content_html: "<h2>Draft: Sunset Late Fee Policy</h2><p>This is a work in progress for our company-specific late fee configuration guide.</p><h3>Sunset Late Fee Schedule</h3><ul><li><strong>Grace period:</strong> 5 days (company standard)</li><li><strong>Initial late fee:</strong> $75 flat</li><li><strong>Daily late fee:</strong> $10/day after grace period, capped at $150/month</li><li><strong>First-time waiver:</strong> Waive initial late fee for residents with no prior late payments (requires manager approval)</li></ul><p><em>TODO: Add instructions for the Sunset-specific late fee waiver approval workflow and documentation requirements.</em></p>", created_at: "2026-03-20", updated_at: "2026-03-20" },
];

let kbInstanceIdCounter = 4;
let kbFavoriteSlugs = [];
let kbViewedSlugs = [];
let dapCompletedGates = {};

const ROUTE_MAP = {
  "/api/auth/login": (body) => {
    const parsed = JSON.parse(body);
    const u = DEMO_USERS_MAP[parsed.email];
    if (u) { currentUser = u; return { token: "demo-token-" + u.id, user: u }; }
    throw new Error("Invalid credentials");
  },
  "/api/me": () => currentUser,
  "/api/courses": () => courses,
  "/api/enrollments": () => enrollments,
  "/api/certifications": () => certificates,
  "/api/policies/me": () => policies,
  "/api/manager/team": () => team,
  "/api/manager/team-overdue": () => teamOverdue,
  "/api/admin/summary": () => adminSummary,
  "/api/compliance/gaps": () => complianceGaps,
  "/api/assignment-rules": () => demoRules.map(r => ({
    ...r,
    groups: (r.groupIds || []).map(gid => {
      const g = demoGroups.find(x => x.id === gid);
      return g ? { id: g.id, name: g.name, type: g.type, member_count: (demoGroupMembers[g.id] || []).length } : null;
    }).filter(Boolean),
  })),
  "/api/gamification/profile": () => ({ total_xp: 1250, level: 5, xp_in_level: 50, xp_to_next_level: 100, badges: [{ id: "b1", name: "First Course", icon: "GraduationCap" }, { id: "b2", name: "Streak Master", icon: "Flame" }], streak: { current_streak: 7, longest_streak: 14 }, rank: 3 }),
  "/api/gamification/leaderboard": () => team.map((m, i) => ({ ...m, total_xp: 1500 - i * 200, badge_count: 3 - i, streak: 7 - i, rank: i + 1 })),
  "/api/gamification/badges": () => [{ id: "b1", name: "First Course", description: "Complete your first course", icon: "GraduationCap", earned: true }, { id: "b2", name: "Streak Master", description: "7-day streak", icon: "Flame", earned: true }, { id: "b3", name: "Compliance Pro", description: "Complete all compliance courses", icon: "ShieldCheck", earned: false }],
  "/api/my-journey": () => ({ journey: null }),
  "/api/verticals": () => ["Conventional", "Affordable", "Student", "Senior", "Military", "Commercial"],
  "/api/certifications/me": () => [],
  "/api/admin/content": () => courses,
  "/api/admin/sparks": () => [],
  "/api/admin/sparks/rules": () => [],
  "/api/sparks/feed": () => [],
  "/api/admin/learning-paths": () => demoLearningPaths,
  "/api/admin/contextual-triggers": () => demoContextualTriggers,
  "/api/admin/trigger-fires": () => demoTriggerFires,
  "/api/admin/curated-plans": () => demoCuratedPlans,
  "/api/categories": () => [
    { id: "cat-ep",      parent_id: null,    name: "Entrata Product",        slug: "entrata-product",        depth: 0, sort_order: 0 },
    { id: "cat-ep-l2l",  parent_id: "cat-ep", name: "Lead-to-Lease",          slug: "lead-to-lease",          depth: 1, sort_order: 0 },
    { id: "cat-ep-res",  parent_id: "cat-ep", name: "Resident Management",    slug: "resident-management",    depth: 1, sort_order: 1 },
    { id: "cat-ep-acct", parent_id: "cat-ep", name: "Accounting",             slug: "accounting",             depth: 1, sort_order: 2 },
    { id: "cat-ep-mnt",  parent_id: "cat-ep", name: "Maintenance",            slug: "maintenance",            depth: 1, sort_order: 3 },
    { id: "cat-ep-rpt",  parent_id: "cat-ep", name: "Reporting",              slug: "reporting",              depth: 1, sort_order: 4 },
    { id: "cat-ep-msg",  parent_id: "cat-ep", name: "Message Center",         slug: "message-center",         depth: 1, sort_order: 5 },
    { id: "cat-ep-mkt",  parent_id: "cat-ep", name: "Marketing",              slug: "marketing",              depth: 1, sort_order: 6 },
    { id: "cat-ep-ops",  parent_id: "cat-ep", name: "Operations",             slug: "operations",             depth: 1, sort_order: 7 },
    { id: "cat-comp",    parent_id: null,    name: "Compliance",              slug: "compliance",             depth: 0, sort_order: 1 },
    { id: "cat-pd",      parent_id: null,    name: "Professional Development", slug: "professional-development", depth: 0, sort_order: 2 },
  ],
  "/api/notifications/me": () => demoNotifications,
  "/api/admin/brand-kit": () => ({ logo_url: "", primary_color: "#2563eb", secondary_color: "#1e40af", accent_color: "#f59e0b", greeting_text: "Welcome to Sunset Academy" }),
  "/api/admin/audit-log": () => ({ rows: demoAuditLog, total: demoAuditLog.length }),
  "/api/admin/scheduled-reports": () => [],
  "/api/admin/certification-programs": () => demoCertPrograms,
  "/api/analytics/my-dashboard": () => ({
    summary: { total_assigned: 5, total_completed: 2, total_in_progress: 2, total_overdue: 1, total_time_spent_seconds: 7200, average_score: 87 },
    recent_completions: [
      { course_title: "Lead Manager Fundamentals", completed_at: "2026-03-10", score: 92 },
      { course_title: "Entrata Platform Onboarding", completed_at: "2026-01-20", score: 88 },
    ],
    upcoming_due: [
      { course_title: "Fair Housing Essentials", due_date: "2026-04-20", progress: 60 },
      { course_title: "Lead Follow-Up Best Practices", due_date: "2026-04-10", progress: 30 },
    ],
    skill_profile: [
      { skill_name: "Leasing", current_level: 75 }, { skill_name: "Compliance", current_level: 60 },
      { skill_name: "Maintenance", current_level: 40 }, { skill_name: "Communication", current_level: 85 },
      { skill_name: "Technology", current_level: 70 },
    ],
    compliance: [
      { course_title: "Fair Housing Essentials", status: "in_progress", due_date: "2026-04-20" },
    ],
    policy_status: [
      { title: "Code of Conduct", status: "acknowledged", acknowledged_at: "2026-01-15" },
    ],
    monthly_activity: [
      { month: "Jan", completions: 1, time_minutes: 20 }, { month: "Feb", completions: 0, time_minutes: 45 },
      { month: "Mar", completions: 1, time_minutes: 90 }, { month: "Apr", completions: 0, time_minutes: 30 },
    ],
  }),
  "/api/admin/analytics/overview": () => ({
    kpis: { total_users: 47, total_courses: 10, total_enrollments: 156, total_completed: 122, total_overdue: 12, avg_completion_days: 8.5 },
    enrollment_trend: [
      { date: "2026-01-01", enrollments: 20, completions: 15 }, { date: "2026-02-01", enrollments: 35, completions: 28 },
      { date: "2026-03-01", enrollments: 50, completions: 42 }, { date: "2026-04-01", enrollments: 51, completions: 37 },
    ],
    engagement_trend: [
      { week: "2026-01-06", active_learners: 28, completions: 5 }, { week: "2026-01-13", active_learners: 31, completions: 7 },
      { week: "2026-01-20", active_learners: 25, completions: 4 }, { week: "2026-01-27", active_learners: 33, completions: 8 },
      { week: "2026-02-03", active_learners: 29, completions: 6 }, { week: "2026-02-10", active_learners: 34, completions: 9 },
      { week: "2026-02-17", active_learners: 30, completions: 5 }, { week: "2026-02-24", active_learners: 36, completions: 10 },
      { week: "2026-03-03", active_learners: 32, completions: 7 }, { week: "2026-03-10", active_learners: 38, completions: 11 },
      { week: "2026-03-17", active_learners: 35, completions: 8 }, { week: "2026-03-24", active_learners: 40, completions: 12 },
    ],
    status_distribution: [
      { status: "Completed", count: 122 }, { status: "In Progress", count: 22 },
      { status: "Overdue", count: 12 }, { status: "Not Started", count: 0 },
    ],
    category_breakdown: [
      { category: "Compliance", count: 45 }, { category: "Lead to Lease", count: 38 },
      { category: "Maintenance", count: 32 }, { category: "Onboarding", count: 25 }, { category: "Accounting", count: 16 },
    ],
    property_rankings: [
      { property_name: "Sunset Towers", total: 48, completed: 40, completion_rate: 83 },
      { property_name: "Harbor View", total: 36, completed: 28, completion_rate: 78 },
      { property_name: "Oak Ridge", total: 42, completed: 35, completion_rate: 83 },
      { property_name: "Lakewood", total: 30, completed: 19, completion_rate: 63 },
    ],
  }),
  "/api/analytics/completion-rate": () => [
    { dimension: "Sunset Towers", completion_rate: 83, total: 48, completed: 40 },
    { dimension: "Harbor View", completion_rate: 78, total: 36, completed: 28 },
    { dimension: "Oak Ridge", completion_rate: 83, total: 42, completed: 35 },
    { dimension: "Lakewood", completion_rate: 63, total: 30, completed: 19 },
  ],
  "/api/admin/analytics/content-effectiveness": () => ({
    courses: [
      { id: "c1", title: "Fair Housing Essentials", category: "Compliance", enrollments: 47, completions: 41, avg_score: 88, avg_days_to_complete: 5, drop_off_rate: 8, satisfaction: 4.5 },
      { id: "c2", title: "Lead Manager Fundamentals", category: "Lead to Lease", enrollments: 35, completions: 30, avg_score: 82, avg_days_to_complete: 4, drop_off_rate: 12, satisfaction: 4.2 },
      { id: "c4", title: "Maintenance Safety Basics", category: "Maintenance", enrollments: 12, completions: 10, avg_score: 91, avg_days_to_complete: 3, drop_off_rate: 5, satisfaction: 4.3 },
    ],
    sparks: [
      { id: "sp1", title: "Lead Manager Quick Tour", views: 34, completions: 28, avg_completion_seconds: 45, published: true },
      { id: "sp2", title: "Work Order Creation Walkthrough", views: 22, completions: 18, avg_completion_seconds: 62, published: true },
    ],
  }),
  "/api/admin/analytics/compliance-overview": () => ({
    overall: { compliance_rate: 82, fully_compliant: 39, non_compliant: 8, total_users_with_reqs: 47 },
    requirements: [
      { requirement: "Fair Housing", total: 47, compliant: 41, gap: 6, due_date: "2026-06-30" },
      { requirement: "OSHA Safety", total: 12, compliant: 10, gap: 2, due_date: "2026-05-15" },
      { requirement: "Sexual Harassment Prevention", total: 47, compliant: 38, gap: 9, due_date: "2026-07-31" },
    ],
    expiring_certs: [
      { id: "ec1", name: "Taylor Brooks", course_title: "Fair Housing Certification", property_name: "Sunset Towers", expires_at: "2026-05-15", urgency: "60_days" },
      { id: "ec2", name: "Morgan West", course_title: "OSHA Safety Cert", property_name: "Harbor View", expires_at: "2026-06-01", urgency: "90_days" },
    ],
    policy_compliance: [
      { id: "pc1", title: "Code of Conduct", total: 47, acknowledged: 45, pending: 2, overdue: 0, ack_rate: 96 },
      { id: "pc2", title: "Fair Housing Policy", total: 47, acknowledged: 41, pending: 4, overdue: 2, ack_rate: 87 },
      { id: "pc3", title: "Data Privacy Policy", total: 47, acknowledged: 43, pending: 3, overdue: 1, ack_rate: 91 },
    ],
    gaps_by_property: [
      { property_name: "Sunset Towers", total_requirements: 24, met: 21, gaps: 3, compliance_rate: 88 },
      { property_name: "Harbor View", total_requirements: 20, met: 15, gaps: 5, compliance_rate: 78 },
      { property_name: "Oak Ridge", total_requirements: 22, met: 20, gaps: 2, compliance_rate: 90 },
      { property_name: "Lakewood", total_requirements: 21, met: 13, gaps: 8, compliance_rate: 63 },
    ],
    trend: [
      { month: "Jan", rate: 72 }, { month: "Feb", rate: 78 }, { month: "Mar", rate: 82 }, { month: "Apr", rate: 85 },
    ],
  }),
  "/api/manager/team/compliance-summary": () => ({
    overall_rate: 82,
    requirements: [
      { name: "Fair Housing", compliant: 4, total: 5 },
      { name: "OSHA Safety", compliant: 2, total: 2 },
    ],
    cert_status: [
      { program: "Leasing Certification", enrolled: 3, completed: 1, expired: 0, expiring_soon: 1 },
      { program: "Maintenance Safety", enrolled: 2, completed: 2, expired: 0, expiring_soon: 0 },
    ],
    policy_status: [
      { policy: "Code of Conduct", acknowledged: 5, pending: 0, overdue: 0, total: 5 },
      { policy: "Fair Housing Policy", acknowledged: 4, pending: 1, overdue: 0, total: 5 },
    ],
  }),
  "/api/admin/analytics/outcomes": () => ({ property_scatter: [], time_series: [], insights: [] }),
  "/api/discovery/catalog": () => [],
  "/api/admin/enablement-calendar": () => ({ recurring: [], policy_deadlines: [], publisher_events: [] }),
  "/api/my-learning-plans": () => [
    { id: "lp1", name: "New Hire Essentials", description: "Core training for all new employees", course_count: 3, completed_count: 1, courses: [
      { id: "c6", title: "Entrata Platform Onboarding", status: "completed", duration_minutes: 20 },
      { id: "c1", title: "Fair Housing Essentials", status: "in_progress", duration_minutes: 45 },
      { id: "c4", title: "Maintenance Safety Basics", status: "not_started", duration_minutes: 35 },
    ]},
    { id: "lp2", name: "Leasing Certification Track", description: "Complete all courses to earn Leasing Pro certification", course_count: 3, completed_count: 0, courses: [
      { id: "c2", title: "Lead Manager Fundamentals", status: "not_started", duration_minutes: 30 },
      { id: "c3", title: "Lead Follow-Up Best Practices", status: "not_started", duration_minutes: 25 },
      { id: "c8", title: "Call Tracking", status: "not_started", duration_minutes: 20 },
    ]},
  ],
  "/api/catalog/learning-plans": () => [
    { id: "lp1", name: "New Hire Essentials", description: "Core training for all new employees", target_role: "All", course_count: 3, completed_count: 1, total_duration_minutes: 100, courses: [
      { id: "c6", title: "Entrata Platform Onboarding", category: "Onboarding", type: "video", duration_minutes: 20, status: "completed" },
      { id: "c1", title: "Fair Housing Essentials", category: "Compliance", type: "scorm", duration_minutes: 45, status: "in_progress" },
      { id: "c4", title: "Maintenance Safety Basics", category: "Maintenance", type: "scorm", duration_minutes: 35, status: "not_started" },
    ]},
    { id: "lp2", name: "Leasing Certification Track", description: "Complete all courses to earn Leasing Pro certification", target_role: "Leasing Agent", course_count: 3, completed_count: 0, total_duration_minutes: 75, courses: [
      { id: "c2", title: "Lead Manager Fundamentals", category: "Lead to Lease", type: "video", duration_minutes: 30, status: "not_started" },
      { id: "c3", title: "Lead Follow-Up Best Practices", category: "Lead to Lease", type: "video", duration_minutes: 25, status: "not_started" },
      { id: "c8", title: "Call Tracking", category: "Lead to Lease", type: "scorm", duration_minutes: 20, status: "not_started" },
    ]},
    { id: "lp3", name: "Maintenance Professional", description: "Safety, work order management, and advanced maintenance skills", target_role: "Maintenance Tech", course_count: 2, completed_count: 0, total_duration_minutes: 60, courses: [
      { id: "c4", title: "Maintenance Safety Basics", category: "Maintenance", type: "scorm", duration_minutes: 35, status: "not_started" },
      { id: "c5", title: "Work Order Management", category: "Maintenance", type: "video", duration_minutes: 25, status: "not_started" },
    ]},
    { id: "lp4", name: "Accounting Fundamentals", description: "Rentable items, late fees, and core accounting workflows", target_role: "All", course_count: 2, completed_count: 0, total_duration_minutes: 55, courses: [
      { id: "c7", title: "Rentable Items, Assignable Items, and Services", category: "Accounting", type: "scorm", duration_minutes: 25, status: "not_started" },
      { id: "c9", title: "Late Fees and Delinquency", category: "Accounting", type: "scorm", duration_minutes: 30, status: "not_started" },
    ]},
  ],
  "/api/gamification/xp-history": () => [
    { date: "2026-03-01", xp: 50, source: "Course completion" },
    { date: "2026-03-05", xp: 25, source: "Quiz score" },
    { date: "2026-03-10", xp: 100, source: "Course completion" },
    { date: "2026-03-15", xp: 50, source: "Spotlight completed" },
    { date: "2026-03-20", xp: 75, source: "Course completion" },
  ],
  "/api/courses/popular": () => courses.slice(0, 5).map((c, i) => ({ ...c, enrollment_count: 45 - i * 5 })),
  "/api/certificates/mine": () => certificates,
  "/api/admin/policies": () => [
    { id: "p1", title: "Fair Housing Policy 2026", version: 1, status: "active", created_at: "2026-01-01", acknowledged_count: 41, total_users: 47 },
    { id: "p2", title: "Employee Handbook v4.2", version: 4, status: "active", created_at: "2026-03-01", acknowledged_count: 22, total_users: 47 },
    { id: "p3", title: "OSHA Workplace Safety Standards", version: 2, status: "active", created_at: "2025-06-15", acknowledged_count: 10, total_users: 12 },
  ],
  "/api/admin/enrollment-progress": () => courses.map((c, i) => ({ course_id: c.id, title: c.title, category: c.category, enrolled: 12 - i, completed: 8 - i, in_progress: 3, overdue: i % 3 })),
  "/api/admin/policy-compliance": () => [
    { policy_id: "p1", title: "Fair Housing Policy 2026", total: 47, acknowledged: 41, pending: 4, overdue: 2 },
    { policy_id: "p2", title: "Employee Handbook v4.2", total: 47, acknowledged: 22, pending: 20, overdue: 5 },
  ],
  "/api/admin/spark-rules": () => [],
  "/api/groups": () => demoGroups.map(g => ({
    ...g,
    member_count: (demoGroupMembers[g.id] || []).length,
  })),
  "/api/manager/team/analytics": () => ({
    summary: { total_enrollments: 20, total_completed: 16, total_in_progress: 3, total_overdue: 3, avg_score: 85, avg_completion_days: 6 },
    member_progress: team.map(m => ({
      user_id: m.id, name: m.name, role: m.role, property: m.property,
      completed: m.completed_courses, in_progress: m.open_courses, overdue: m.overdue_courses,
      last_activity: m.last_activity, avg_score: 80 + Math.floor(Math.random() * 15),
    })),
    completion_trend: [
      { week: "2026-01-06", completions: 3 }, { week: "2026-01-13", completions: 5 }, { week: "2026-01-20", completions: 4 },
      { week: "2026-01-27", completions: 6 }, { week: "2026-02-03", completions: 4 }, { week: "2026-02-10", completions: 3 },
      { week: "2026-02-17", completions: 5 }, { week: "2026-02-24", completions: 7 }, { week: "2026-03-03", completions: 4 },
      { week: "2026-03-10", completions: 6 }, { week: "2026-03-17", completions: 5 }, { week: "2026-03-24", completions: 4 },
    ],
    category_matrix: [
      { category: "Compliance", total: 5, completed: 4, overdue: 1 },
      { category: "Lead to Lease", total: 6, completed: 5, overdue: 0 },
      { category: "Maintenance", total: 4, completed: 3, overdue: 1 },
      { category: "Onboarding", total: 3, completed: 3, overdue: 0 },
      { category: "Accounting", total: 2, completed: 1, overdue: 1 },
    ],
    at_risk_learners: [
      { user_id: "u4", name: "Taylor Brooks", role: "Leasing Agent", property: "Sunset Towers", overdue_count: 1, days_inactive: 12, last_activity: "2026-03-28" },
      { user_id: "u5", name: "Riley Maintenance", role: "Maintenance Tech", property: "Bayview Apartments", overdue_count: 2, days_inactive: 8, last_activity: "2026-04-01" },
    ],
    property_comparison: [
      { property: "Sunset Towers", completion_rate: 88, avg_score: 87, total_enrollments: 12 },
      { property: "Bayview Apartments", completion_rate: 75, avg_score: 82, total_enrollments: 8 },
    ],
    trend: [
      { week: "W1", completions: 3 }, { week: "W2", completions: 5 }, { week: "W3", completions: 4 }, { week: "W4", completions: 4 },
    ],
    overdue_detail: teamOverdue,
  }),
  "/api/export/compliance": () => "User,Course,Status,Due Date\nTaylor Brooks,Fair Housing,In Progress,2026-04-20\nRiley Maintenance,Safety Basics,Completed,2026-03-15",
  "/api/admin/nudge-bulk": () => ({ sent: 3 }),
  "/api/admin/assign-bulk": () => ({ created: 1, skippedDuplicates: 0 }),
  "/api/kb/articles": () => kbArticles.map(a => {
    const inst = kbInstances.find(i => i.article_id === a.id);
    return { ...a, instance_id: inst?.id || null, instance_status: inst?.status || null, base_version: inst?.base_version || null, instance_updated_at: inst?.updated_at || null };
  }),
  "/api/admin/kb/instances": () => kbInstances.map(i => {
    const a = kbArticles.find(art => art.id === i.article_id);
    return { ...i, instance_status: i.status, current_version: a?.version || i.base_version, title: a?.title || i.title };
  }),
  "/api/kb/categories": () => [
    { id: "cat1", parent_id: null, name: "Accounting", slug: "accounting", depth: 0, sort_order: 1 },
    { id: "cat1a", parent_id: "cat1", name: "Charges & Credits", slug: "charges-credits", depth: 1, sort_order: 1 },
    { id: "cat1b", parent_id: "cat1", name: "Payments", slug: "payments", depth: 1, sort_order: 2 },
    { id: "cat1c", parent_id: "cat1", name: "Late Fees", slug: "late-fees", depth: 1, sort_order: 3 },
    { id: "cat2", parent_id: null, name: "Leasing", slug: "leasing", depth: 0, sort_order: 2 },
    { id: "cat2a", parent_id: "cat2", name: "Move-In", slug: "move-in", depth: 1, sort_order: 1 },
    { id: "cat2b", parent_id: "cat2", name: "Renewals", slug: "renewals", depth: 1, sort_order: 2 },
    { id: "cat3", parent_id: null, name: "Maintenance", slug: "maintenance", depth: 0, sort_order: 3 },
    { id: "cat4", parent_id: null, name: "Compliance", slug: "compliance", depth: 0, sort_order: 4 },
    { id: "cat5", parent_id: null, name: "Reporting", slug: "reporting", depth: 0, sort_order: 5 },
    { id: "cat6", parent_id: null, name: "Resident Experience", slug: "resident-experience", depth: 0, sort_order: 6 },
  ],
  "/api/kb/search": (body) => kbArticles.slice(0, 5).map(a => ({
    ...a, rank: 0.5, title_highlight: a.title, content_snippet: a.content_html?.substring(0, 200) || a.title,
  })),
  "/api/admin/kb/staleness-notifications": () => [],
  "/api/admin/kb/broken-links": () => ({ broken: [] }),
  "/api/whats-new": (body, path) => {
    const params = new URLSearchParams((path || "").split("?")[1] || "");
    const trackParam = params.get("track") || "all";
    const allReleases = [
      { id: "rel-rapid-2026-04b", name: "Rapid 2026.04b", label: "Apr 9 Sprint", release_track: "rapid", release_date: "2026-04-09", published: true, total_count: 3, updates: [
        { id: "rwu1", title: "Smart Maintenance Scheduling", summary: "AI-powered scheduling prioritizes urgent work orders and auto-assigns techs based on skill and proximity.", body_html: "<p>Analyzes priority, tech availability, skill match, and proximity.</p>", update_type: "new_feature", product_area: "Maintenance", target_roles: ["Maintenance Tech", "Property Manager"], published_at: "2026-04-09T09:00:00Z" },
        { id: "rwu2", title: "Lease Renewal Wizard Step Indicator", summary: "Visual step-by-step indicator added to the lease renewal workflow.", body_html: "<p>Clear progress tracking through the 4-step renewal process.</p>", update_type: "improvement", product_area: "Leasing", target_roles: ["Leasing Agent", "Property Manager"], published_at: "2026-04-09T09:00:00Z" },
        { id: "rwu3", title: "Fix: Calendar Sync Timezone Offset", summary: "Fixed 1-hour offset for Mountain time zone properties.", body_html: "<p>Incorrect DST handling rule corrected.</p>", update_type: "fix", product_area: "Leasing", target_roles: [], published_at: "2026-04-09T09:00:00Z" },
      ]},
      { id: "rel-rapid-2026-04a", name: "Rapid 2026.04a", label: "Mar 26 Sprint", release_track: "rapid", release_date: "2026-03-26", published: true, total_count: 3, updates: [
        { id: "rwu4", title: "Resident Portal: Mobile Payment Enhancements", summary: "Residents can set up autopay with Apple Pay and Google Pay.", body_html: "<ul><li>Apple Pay and Google Pay autopay</li><li>Push notifications</li></ul>", update_type: "improvement", product_area: "Resident Portal", target_roles: [], published_at: "2026-03-26T09:00:00Z" },
        { id: "rwu5", title: "Batch Invoice Export to CSV", summary: "Export up to 10,000 invoices with customizable column selection.", body_html: "<ul><li>10,000 per export</li><li>Saved export templates</li></ul>", update_type: "new_feature", product_area: "Accounting", target_roles: ["Accountant", "Property Manager"], published_at: "2026-03-26T09:00:00Z" },
        { id: "rwu6", title: "Fix: Duplicate Notifications on Work Order Reassignment", summary: "Resolved race condition causing duplicate push notifications.", body_html: "<p>Fixed a race condition in the notification pipeline.</p>", update_type: "fix", product_area: "Maintenance", target_roles: ["Maintenance Tech"], published_at: "2026-03-26T09:00:00Z" },
      ]},
      { id: "rel-rapid-2026-03b", name: "Rapid 2026.03b", label: "Mar 12 Sprint", release_track: "rapid", release_date: "2026-03-12", published: true, total_count: 4, updates: [
        { id: "rwu7", title: "Prospect Portal: Virtual Tour Scheduling", summary: "Prospects book virtual tours directly with real-time leasing calendar integration.", body_html: "<ul><li>Real-time availability</li><li>Zoom/Teams link generation</li></ul>", update_type: "new_feature", product_area: "Leasing", target_roles: ["Leasing Agent", "Property Manager"], published_at: "2026-03-12T09:00:00Z" },
        { id: "rwu8", title: "Dashboard Performance Improvements", summary: "Analytics dashboard loads 60% faster with progressive chart rendering.", body_html: "<ul><li>60% faster initial load</li><li>Progressive rendering</li></ul>", update_type: "improvement", product_area: "Analytics", target_roles: [], published_at: "2026-03-12T09:00:00Z" },
        { id: "rwu9", title: "Fair Housing Attestation Auto-Generation", summary: "Compliance module auto-generates Fair Housing attestation forms.", body_html: "<ul><li>Pre-filled forms</li><li>E-signature integration</li></ul>", update_type: "new_feature", product_area: "Leasing", target_roles: ["Leasing Agent", "Property Manager"], published_at: "2026-03-12T09:00:00Z" },
        { id: "rwu10", title: "Vendor Insurance Tracking Overhaul", summary: "Redesigned vendor compliance dashboard with auto-expiration alerts.", body_html: "<ul><li>Auto-expiration alerts</li><li>COI parsing with AI</li></ul>", update_type: "improvement", product_area: "Maintenance", target_roles: ["Property Manager"], published_at: "2026-03-12T09:00:00Z" },
      ]},
      { id: "rel-rapid-2026-03a", name: "Rapid 2026.03a", label: "Feb 26 Sprint", release_track: "rapid", release_date: "2026-02-26", published: true, total_count: 3, updates: [
        { id: "rwu11", title: "Bulk Charge Posting Validation", summary: "New validation step catches mismatched unit counts and duplicate charges.", body_html: "<ul><li>Unit count mismatch detection</li><li>Duplicate flagging</li></ul>", update_type: "improvement", product_area: "Accounting", target_roles: ["Accountant"], published_at: "2026-02-26T09:00:00Z" },
        { id: "rwu12", title: "Resident Communication Preferences", summary: "Residents choose preferred channels per notification type.", body_html: "<ul><li>Per-type channel selection</li><li>Quiet hours</li></ul>", update_type: "new_feature", product_area: "Resident Portal", target_roles: [], published_at: "2026-02-26T09:00:00Z" },
        { id: "rwu13", title: "Fix: Lease PDF Generation Timeout", summary: "Resolved timeout on lease PDF generation for portfolios with 500+ units.", body_html: "<p>Moved to async worker.</p>", update_type: "fix", product_area: "Leasing", target_roles: ["Property Manager"], published_at: "2026-02-26T09:00:00Z" },
      ]},
      { id: "rel-r1-2026", name: "R1 2026", label: "Q1 Standard Release", release_track: "standard", release_date: "2026-04-01", published: true, total_count: 14, bundled_rapid_releases: ["Rapid 2026.04b", "Rapid 2026.04a", "Rapid 2026.03b", "Rapid 2026.03a"], updates: [
        { id: "wu1", title: "Smart Maintenance Scheduling", summary: "AI-powered scheduling prioritizes urgent work orders and auto-assigns techs based on skill and proximity.", body_html: "<p>Our AI scheduling engine analyzes work order priority, tech availability, skill match, and proximity.</p><ul><li>Priority-based queue ordering</li><li>Skill-matched auto-assignment</li><li>Route-optimized scheduling</li></ul>", update_type: "new_feature", product_area: "Maintenance", target_roles: ["Maintenance Tech", "Property Manager"], published_at: "2026-04-01T09:00:00Z" },
        { id: "wu2", title: "Lease Renewal Workflow Redesign", summary: "Completely rebuilt lease renewal flow with a step-by-step wizard, inline approval routing, and batch support.", body_html: "<ul><li>New 4-step wizard</li><li>Inline rent adjustment calculator</li><li>Real-time approval status bar</li><li>Batch renewal for up to 50 units</li></ul>", update_type: "improvement", product_area: "Leasing", target_roles: ["Leasing Agent", "Property Manager"], published_at: "2026-04-01T09:00:00Z" },
        { id: "wu3", title: "Resident Portal: Mobile Payment Enhancements", summary: "Residents can set up autopay with Apple Pay and Google Pay.", body_html: "<ul><li>Apple Pay and Google Pay autopay</li><li>Estimated processing times</li><li>Push notifications</li></ul>", update_type: "improvement", product_area: "Resident Portal", target_roles: [], published_at: "2026-04-01T09:00:00Z" },
        { id: "wu4", title: "Batch Invoice Export to CSV", summary: "Export up to 10,000 invoices with customizable column selection.", body_html: "<ul><li>10,000 per export</li><li>Drag-and-drop column selection</li><li>Saved export templates</li></ul>", update_type: "new_feature", product_area: "Accounting", target_roles: ["Accountant", "Property Manager"], published_at: "2026-04-01T09:00:00Z" },
        { id: "wu5", title: "Fix: Duplicate Notifications on Work Order Reassignment", summary: "Resolved race condition causing duplicate push notifications.", body_html: "<p>Fixed a race condition in the notification pipeline.</p>", update_type: "fix", product_area: "Maintenance", target_roles: ["Maintenance Tech"], published_at: "2026-04-01T09:00:00Z" },
        { id: "wu6", title: "Prospect Portal: Virtual Tour Scheduling", summary: "Prospects book virtual tours directly with real-time leasing calendar integration.", body_html: "<ul><li>Real-time availability sync</li><li>Auto confirmation emails</li><li>Zoom/Teams link generation</li></ul>", update_type: "new_feature", product_area: "Leasing", target_roles: ["Leasing Agent", "Property Manager"], published_at: "2026-04-01T09:00:00Z" },
        { id: "wu7", title: "Dashboard Performance Improvements", summary: "Analytics dashboard loads 60% faster with progressive chart rendering.", body_html: "<ul><li>60% faster initial load</li><li>Progressive chart rendering</li><li>Cached aggregations</li></ul>", update_type: "improvement", product_area: "Analytics", target_roles: [], published_at: "2026-04-01T09:00:00Z" },
        { id: "wu8", title: "Deprecation: Legacy Report Builder", summary: "Legacy report builder removed June 30, 2026. Migrate to Report Studio.", body_html: "<h4>Action required</h4><ul><li>Review migrated reports</li><li>Update bookmarks</li><li>Legacy access ends June 30</li></ul>", update_type: "deprecation", product_area: "Analytics", target_roles: ["Property Manager"], published_at: "2026-04-01T09:00:00Z" },
        { id: "wu9", title: "Fair Housing Attestation Auto-Generation", summary: "Compliance module auto-generates Fair Housing attestation forms during leasing.", body_html: "<ul><li>Pre-filled attestation forms</li><li>E-signature integration</li><li>Automatic audit trail</li></ul>", update_type: "new_feature", product_area: "Leasing", target_roles: ["Leasing Agent", "Property Manager"], published_at: "2026-04-01T09:00:00Z" },
        { id: "wu10", title: "Fix: Calendar Sync Timezone Offset", summary: "Fixed 1-hour offset for Mountain time zone properties.", body_html: "<p>Incorrect DST handling rule corrected.</p>", update_type: "fix", product_area: "Leasing", target_roles: [], published_at: "2026-04-01T09:00:00Z" },
        { id: "wu11", title: "Vendor Insurance Tracking Overhaul", summary: "Redesigned vendor compliance dashboard with auto-expiration alerts and COI parsing.", body_html: "<ul><li>Auto-expiration email alerts</li><li>COI parsing with AI extraction</li></ul>", update_type: "improvement", product_area: "Maintenance", target_roles: ["Property Manager"], published_at: "2026-04-01T09:00:00Z" },
        { id: "wu12", title: "Bulk Charge Posting Validation", summary: "New validation step catches mismatched unit counts and duplicate charges.", body_html: "<ul><li>Unit count mismatch detection</li><li>Duplicate charge flagging</li><li>Pre-post summary report</li></ul>", update_type: "improvement", product_area: "Accounting", target_roles: ["Accountant"], published_at: "2026-04-01T09:00:00Z" },
        { id: "wu13", title: "Resident Communication Preferences", summary: "Residents choose preferred channels per notification type.", body_html: "<ul><li>Per-notification-type channel selection</li><li>Quiet hours configuration</li></ul>", update_type: "new_feature", product_area: "Resident Portal", target_roles: [], published_at: "2026-04-01T09:00:00Z" },
        { id: "wu14", title: "Fix: Lease PDF Generation Timeout", summary: "Resolved timeout on lease PDF generation for portfolios with 500+ units.", body_html: "<p>Moved PDF generation to async worker.</p>", update_type: "fix", product_area: "Leasing", target_roles: ["Property Manager"], published_at: "2026-04-01T09:00:00Z" },
      ]},
      { id: "rel-r4-2025", name: "R4 2025", label: "Q4 Standard Release", release_track: "standard", release_date: "2025-12-10", published: true, total_count: 8, bundled_rapid_releases: ["Rapid 2025.12b", "Rapid 2025.12a", "Rapid 2025.11b", "Rapid 2025.11a", "Rapid 2025.10b", "Rapid 2025.10a"], updates: [
        { id: "wu15", title: "Automated Move-Out Inspections", summary: "Digital inspection checklists with photo capture and deposit reconciliation.", body_html: "<ul><li>Digital checklists</li><li>Photo/video capture</li><li>Auto deposit calculation</li></ul>", update_type: "new_feature", product_area: "Maintenance", target_roles: ["Maintenance Tech", "Property Manager"], published_at: "2025-12-08T09:00:00Z" },
        { id: "wu16", title: "Prospect Scoring Model", summary: "ML-based prospect scoring reduces time-to-lease by 20%.", body_html: "<p>Data-driven prospect prioritization.</p>", update_type: "new_feature", product_area: "Leasing", target_roles: ["Leasing Agent"], published_at: "2025-12-07T09:00:00Z" },
        { id: "wu17", title: "Year-End Close Automation", summary: "One-click year-end close with automated journal entries and audit packages.", body_html: "<ul><li>Automated journal entries</li><li>Reconciliation validation</li><li>Downloadable audit package</li></ul>", update_type: "new_feature", product_area: "Accounting", target_roles: ["Accountant"], published_at: "2025-12-06T09:00:00Z" },
        { id: "wu18", title: "Resident Portal Dark Mode", summary: "Dark mode support respecting system preferences with manual override.", body_html: "<p>Requested by residents in satisfaction surveys.</p>", update_type: "improvement", product_area: "Resident Portal", target_roles: [], published_at: "2025-12-05T09:00:00Z" },
        { id: "wu19", title: "Portfolio Analytics Benchmarking", summary: "Compare properties against regional and national benchmarks.", body_html: "<ul><li>Regional benchmarks</li><li>National averages</li><li>Peer group comparison</li></ul>", update_type: "new_feature", product_area: "Analytics", target_roles: ["Property Manager", "Regional VP"], published_at: "2025-12-04T09:00:00Z" },
        { id: "wu20", title: "Fix: ACH Payment Processing Delay", summary: "Resolved 24-hour delay in ACH payment posting for Pacific time zone.", body_html: "<p>Timezone offset corrected.</p>", update_type: "fix", product_area: "Accounting", target_roles: [], published_at: "2025-12-07T09:00:00Z" },
        { id: "wu21", title: "Maintenance Parts Inventory Tracking", summary: "Track parts inventory per property with auto-reorder thresholds.", body_html: "<ul><li>Per-property inventory</li><li>Auto-reorder alerts</li><li>PO generation</li></ul>", update_type: "new_feature", product_area: "Maintenance", target_roles: ["Maintenance Tech"], published_at: "2025-12-03T09:00:00Z" },
        { id: "wu22", title: "Fix: Lease Template Merge Field Errors", summary: "Fixed blank merge fields for co-signers in lease templates.", body_html: "<p>Co-signer merge field resolution corrected.</p>", update_type: "fix", product_area: "Leasing", target_roles: [], published_at: "2025-12-08T09:00:00Z" },
      ]},
    ];
    const filtered = trackParam === "all" ? allReleases : allReleases.filter(r => r.release_track === trackParam);
    return { company_track: "standard", releases: filtered };
  },
  "/api/whats-new/unread-count": () => ({ count: 17, company_track: "standard" }),
  "/api/whats-new/read-ids": () => ["wu15", "wu16", "wu17", "wu18", "wu19", "wu20", "wu21", "wu22"],
  "/api/admin/content-visibility": () => [
    { surface: "learning_catalog", enabled: true, min_role: null },
    { surface: "knowledge_base", enabled: true, min_role: null },
    { surface: "whats_new", enabled: true, min_role: null },
  ],
  "/api/dap/check": (body, path) => {
    const params = new URLSearchParams((path || "").split("?")[1] || "");
    const workflow = params.get("workflow") || "";
    const gateId = "gate-cmd-center";
    if (workflow === "oxp.command-center" && !dapCompletedGates[gateId]) {
      return {
        allowed: false,
        gates: [{
          id: gateId,
          workflow_key: "oxp.command-center",
          target_type: "course",
          target_id: "c1",
          target_title: "Command Center Certification",
          block_message: "You must complete the Command Center training before accessing this workflow.",
          pass_threshold: 80,
        }],
        walkthroughs: [],
        tips: [],
        grace_banners: [],
      };
    }
    return { allowed: true, gates: [], walkthroughs: [], tips: [], grace_banners: [] };
  },
  "/api/dap/my-status": () => ({ workflows: [] }),
  "/api/dap/reset-by-workflow": (body) => {
    try {
      const parsed = JSON.parse(body || "{}");
      if (parsed.workflow_key === "oxp.command-center") {
        delete dapCompletedGates["gate-cmd-center"];
      }
    } catch {}
    return { success: true };
  },
  "/api/admin/dap/dashboard": () => ({ total_gates_fired: 342, total_completions: 298, completion_rate: 87.1, total_exceptions: 12 }),
  "/api/admin/dap/compliance": () => [],
  "/api/admin/dap/exceptions": () => [],
  "/api/admin/dap/adoption-by-workflow": () => [],
  "/api/admin/dap/walkthroughs": () => [],
};

export function demoApiRequest(path, options = {}) {
  const basePath = path.split("?")[0];
  const method = (options.method || "GET").toUpperCase();
  const handler = ROUTE_MAP[basePath];
  if (handler) {
    try { return Promise.resolve(handler(options.body, path)); }
    catch (e) { return Promise.reject(e); }
  }

  // Enrollment rule updates (Apr 2026 -- training feedback loop)
  if (basePath.match(/^\/api\/assignment-rules\/[^/]+$/) && method === "PATCH") {
    const ruleId = basePath.split("/").pop();
    const rule = demoRules.find(r => r.id === ruleId);
    if (!rule) return Promise.reject(new Error("Rule not found"));
    try {
      const body = JSON.parse(options.body || "{}");
      if (typeof body.name === "string") rule.name = body.name;
      if (typeof body.enrollment_target === "string") rule.enrollment_target = body.enrollment_target;
      if (Array.isArray(body.groupIds)) rule.groupIds = body.groupIds;
      if (body.dueDays !== undefined) {
        const d = Number(body.dueDays) || 30;
        rule.courses = (rule.courses || []).map(c => ({ ...c, due_days: d }));
        rule.learning_paths = (rule.learning_paths || []).map(p => ({ ...p, due_days: d }));
      }
    } catch {}
    return Promise.resolve({ id: ruleId });
  }
  if (basePath.match(/^\/api\/assignment-rules\/[^/]+\/execute$/) && method === "POST") {
    return Promise.resolve({ enrolled: 3, skippedDuplicates: 0 });
  }
  if (basePath.match(/^\/api\/assignment-rules\/[^/]+$/) && method === "DELETE") {
    const ruleId = basePath.split("/").pop();
    demoRules = demoRules.filter(r => r.id !== ruleId);
    return Promise.resolve({ success: true });
  }
  if (basePath === "/api/assignment-rules" && method === "POST") {
    try {
      const body = JSON.parse(options.body || "{}");
      const newId = "r" + (demoRules.length + Math.floor(Math.random() * 1000));
      const dueDays = Number(body.dueDays) || 30;
      const newRule = {
        id: newId,
        name: body.name || "New rule",
        criteria: {},
        enrollment_target: body.enrollment_target || "all",
        active: true,
        created_at: new Date().toISOString(),
        courses: body.courseId ? [{ id: body.courseId, title: "Course", due_days: dueDays }] : [],
        learning_paths: body.learningPathId ? [{ id: body.learningPathId, title: "Plan", due_days: dueDays }] : [],
        groupIds: Array.isArray(body.groupIds) ? body.groupIds : [],
        stats: { total: 0, completed: 0, overdue: 0, pending: 0 },
      };
      demoRules.push(newRule);
      return Promise.resolve({ id: newId });
    } catch { return Promise.resolve({ id: "r-new" }); }
  }

  // Curated plan overrides (publisher-authored, hidden per company)
  if (basePath.match(/^\/api\/admin\/curated-plans\/[^/]+\/hide$/) && method === "POST") {
    const id = basePath.split("/")[4];
    const cp = demoCuratedPlans.find(p => p.id === id);
    if (cp) cp.hidden = true;
    return Promise.resolve({ success: true });
  }
  if (basePath.match(/^\/api\/admin\/curated-plans\/[^/]+\/unhide$/) && method === "POST") {
    const id = basePath.split("/")[4];
    const cp = demoCuratedPlans.find(p => p.id === id);
    if (cp) cp.hidden = false;
    return Promise.resolve({ success: true });
  }

  // Notifications
  if (basePath.match(/^\/api\/notifications\/[^/]+\/read$/) && method === "POST") {
    const id = basePath.split("/")[3];
    const n = demoNotifications.find(x => x.id === id);
    if (n) n.read = true;
    return Promise.resolve({ success: true });
  }
  if (basePath === "/api/notifications/read-all" && method === "POST") {
    demoNotifications.forEach(n => { n.read = true; });
    return Promise.resolve({ success: true });
  }

  // Learning path detail + mutations (admin)
  if (basePath.match(/^\/api\/admin\/learning-paths\/[^/]+$/) && method === "GET") {
    const id = basePath.split("/").pop();
    const lp = demoLearningPaths.find(p => p.id === id);
    if (!lp) return Promise.resolve(null);
    const sampleCoursesById = {
      lp1: [
        { id: "c6", title: "Entrata Platform Onboarding", category: "Onboarding", duration_minutes: 20, sort_order: 1 },
        { id: "c1", title: "Fair Housing Essentials", category: "Compliance", duration_minutes: 45, sort_order: 2 },
        { id: "c4", title: "Maintenance Safety Basics", category: "Maintenance", duration_minutes: 35, sort_order: 3 },
      ],
      lp2: [
        { id: "c2", title: "Lead Manager Fundamentals", category: "Lead to Lease", duration_minutes: 30, sort_order: 1 },
        { id: "c3", title: "Lead Follow-Up Best Practices", category: "Lead to Lease", duration_minutes: 25, sort_order: 2 },
        { id: "c8", title: "Call Tracking", category: "Lead to Lease", duration_minutes: 20, sort_order: 3 },
      ],
      lp3: [
        { id: "c4", title: "Maintenance Safety Basics", category: "Maintenance", duration_minutes: 35, sort_order: 1 },
        { id: "c5", title: "Work Order Management", category: "Maintenance", duration_minutes: 25, sort_order: 2 },
      ],
      lp4: [
        { id: "c7", title: "Rentable Items, Assignable Items, and Services", category: "Accounting", duration_minutes: 25, sort_order: 1 },
        { id: "c9", title: "Late Fees and Delinquency", category: "Accounting", duration_minutes: 30, sort_order: 2 },
      ],
    };
    return Promise.resolve({ ...lp, courses: sampleCoursesById[id] || [] });
  }
  if (basePath.match(/^\/api\/admin\/learning-paths\/[^/]+$/) && (method === "PUT" || method === "PATCH")) {
    const id = basePath.split("/").pop();
    const lp = demoLearningPaths.find(p => p.id === id);
    if (lp) {
      try { const b = JSON.parse(options.body || "{}");
        if (b.title) lp.title = b.title;
        if (b.description !== undefined) lp.description = b.description;
        if (b.enrollment_mode) lp.enrollment_mode = b.enrollment_mode;
        if (b.status) lp.status = b.status;
      } catch {}
    }
    return Promise.resolve({ success: true });
  }
  if (basePath.match(/^\/api\/admin\/learning-paths\/[^/]+$/) && method === "DELETE") {
    const id = basePath.split("/").pop();
    demoLearningPaths = demoLearningPaths.filter(p => p.id !== id);
    return Promise.resolve({ success: true });
  }

  if (basePath.match(/^\/api\/whats-new\/[^/]+\/read$/) && method === "POST") {
    return Promise.resolve({ ok: true });
  }
  if (basePath === "/api/whats-new/mark-all-read" && method === "POST") {
    return Promise.resolve({ ok: true });
  }
  if (basePath.match(/^\/api\/admin\/content-visibility$/) && method === "PUT") {
    return Promise.resolve({ ok: true });
  }
  if (basePath.match(/^\/api\/kb\/articles\/[^/]+\/instance\/sync$/) && method === "POST") {
    const slug = basePath.split("/")[4];
    const article = kbArticles.find(a => a.slug === slug);
    const inst = kbInstances.find(i => i.slug === slug);
    if (article && inst) {
      inst.base_version = article.version;
      inst.updated_at = new Date().toISOString();
    }
    return Promise.resolve({ success: true });
  }
  if (basePath.match(/^\/api\/kb\/articles\/[^/]+\/instance$/) && method === "POST") {
    const slug = basePath.split("/")[4];
    const article = kbArticles.find(a => a.slug === slug);
    if (article) {
      const existing = kbInstances.find(i => i.article_id === article.id);
      if (!existing) {
        const newInst = { id: "inst" + kbInstanceIdCounter++, article_id: article.id, slug: article.slug, title: article.title, status: "draft", base_version: article.version, content_html: article.content_html, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        kbInstances.push(newInst);
      }
    }
    return Promise.resolve({ success: true });
  }
  if (basePath.match(/^\/api\/kb\/articles\/[^/]+\/instance$/) && method === "PUT") {
    const slug = basePath.split("/")[4];
    const inst = kbInstances.find(i => i.slug === slug);
    if (inst) {
      try { const body = JSON.parse(options.body || "{}"); if (body.content_html) inst.content_html = body.content_html; if (body.status) inst.status = body.status; inst.updated_at = new Date().toISOString(); } catch {}
    }
    return Promise.resolve({ success: true });
  }
  if (basePath.match(/^\/api\/kb\/articles\/[^/]+\/instance$/) && method === "DELETE") {
    const slug = basePath.split("/")[4];
    const idx = kbInstances.findIndex(i => i.slug === slug);
    if (idx !== -1) kbInstances.splice(idx, 1);
    return Promise.resolve({ success: true });
  }
  if (basePath.match(/^\/api\/kb\/articles\/[^/]+$/) && !basePath.includes("/instance")) {
    const slug = basePath.split("/").pop();
    const article = kbArticles.find(a => a.slug === slug);
    if (!article) return Promise.resolve(null);
    const inst = kbInstances.find(i => i.article_id === article.id);
    return Promise.resolve({
      ...article,
      instance_id: inst?.id || null,
      instance_title: inst?.title || null,
      instance_content: inst?.content_html || null,
      base_version: inst?.base_version || null,
      instance_status: inst?.status || null,
      instance_updated_at: inst?.updated_at || null,
      instance_updated_by_name: inst ? "Admin User" : null,
      last_synced_at: inst?.updated_at || null,
    });
  }
  if (basePath.match(/^\/api\/kb\/articles\/[^/]+\/preview-token$/) && method === "POST") {
    return Promise.resolve({ token: "demo-preview-" + Date.now(), expires_at: new Date(Date.now() + 86400000).toISOString(), url: window.location.origin + "/preview/demo-preview-" + Date.now() });
  }
  if (basePath.match(/^\/api\/kb\/search/) && method === "GET") {
    const q = new URLSearchParams(path.split("?")[1] || "").get("q") || "";
    const matches = kbArticles.filter(a => a.title.toLowerCase().includes(q.toLowerCase()) || (a.content_html || "").toLowerCase().includes(q.toLowerCase()));
    return Promise.resolve(matches.map(a => ({ ...a, rank: 0.5, title_highlight: a.title, content_snippet: (a.content_html || "").substring(0, 200) })));
  }
  if (basePath.match(/^\/api\/dap\/gates\/[^/]+\/complete$/) && method === "POST") {
    const gateId = basePath.split("/")[4];
    dapCompletedGates[gateId] = true;
    return Promise.resolve({ success: true, gate_id: gateId });
  }
  if (basePath.match(/^\/api\/dap\/gates\/[^/]+\/reset$/) && method === "POST") {
    const gateId = basePath.split("/")[4];
    delete dapCompletedGates[gateId];
    return Promise.resolve({ success: true });
  }
  if (basePath === "/api/dap/events" && method === "POST") {
    return Promise.resolve({ success: true });
  }
  if (basePath === "/api/dap/exceptions/request" && method === "POST") {
    return Promise.resolve({ success: true });
  }
  if (basePath.match(/^\/api\/dap\/walkthroughs\/[^/]+\/steps$/)) {
    return Promise.resolve([]);
  }
  if (basePath.match(/^\/api\/dap\/walkthroughs\/[^/]+\/(complete|dismiss)$/) && method === "POST") {
    return Promise.resolve({ success: true });
  }
  if (basePath.match(/^\/api\/kb\/views\/recent$/)) {
    const viewed = kbViewedSlugs.map(slug => {
      const a = kbArticles.find(art => art.slug === slug);
      return a ? { article_slug: a.slug, title: a.title, category: a.category, viewed_at: new Date().toISOString() } : null;
    }).filter(Boolean);
    return Promise.resolve(viewed.length > 0 ? viewed : kbArticles.slice(0, 3).map(a => ({ article_slug: a.slug, title: a.title, category: a.category, viewed_at: new Date().toISOString() })));
  }
  if (basePath.match(/^\/api\/kb\/views\/[^/]+$/) && method === "POST") {
    const slug = basePath.split("/").pop();
    kbViewedSlugs = [slug, ...kbViewedSlugs.filter(s => s !== slug)].slice(0, 10);
    return Promise.resolve({ success: true });
  }
  if (basePath === "/api/kb/favorites" && method === "GET") {
    return Promise.resolve(kbFavoriteSlugs.map(slug => {
      const a = kbArticles.find(art => art.slug === slug);
      return a ? { article_slug: a.slug, title: a.title, category: a.category } : null;
    }).filter(Boolean));
  }
  if (basePath.match(/^\/api\/kb\/favorites\/[^/]+$/) && method === "POST") {
    const slug = basePath.split("/").pop();
    if (!kbFavoriteSlugs.includes(slug)) kbFavoriteSlugs.push(slug);
    return Promise.resolve({ success: true });
  }
  if (basePath.match(/^\/api\/kb\/favorites\/[^/]+$/) && method === "DELETE") {
    const slug = basePath.split("/").pop();
    kbFavoriteSlugs = kbFavoriteSlugs.filter(s => s !== slug);
    return Promise.resolve({ success: true });
  }
  if (basePath.match(/^\/api\/admin\/enrollment-progress\/[^/]+\/users$/)) {
    return Promise.resolve([
      { user_id: "u1", name: "Sarah Johnson", email: "sarah@demo.com", status: "completed", score: 92, completed_at: "2026-03-05" },
      { user_id: "u2", name: "Marcus Chen", email: "marcus@demo.com", status: "in_progress", progress: 60, completed_at: null },
      { user_id: "u3", name: "Emily Parker", email: "emily@demo.com", status: "overdue", progress: 20, completed_at: null },
    ]);
  }

  // ===== ENROLLMENT RULES (MVP, training feedback Apr 2026) =====
  if (basePath === "/api/assignment-rules" && method === "POST") {
    try {
      const body = JSON.parse(options.body || "{}");
      const newRule = {
        id: "r" + (Date.now() % 100000),
        name: body.name || "Untitled rule",
        criteria: body.criteria || {},
        enrollment_target: body.enrollment_target || "all",
        active: true,
        created_at: new Date().toISOString(),
        courses: (body.courseIds || []).map(cid => ({ id: cid, due_days: body.dueDays || 30 })),
        learning_paths: (body.learningPathIds || []).map(lpid => ({ id: lpid, due_days: body.dueDays || 30 })),
        groupIds: body.groupIds || [],
      };
      demoRules.unshift(newRule);
      return Promise.resolve({ id: newRule.id });
    } catch { return Promise.resolve({ id: "r-err" }); }
  }
  if (basePath.match(/^\/api\/assignment-rules\/[^/]+\/execute$/) && method === "POST") {
    const ruleId = basePath.split("/")[3];
    const rule = demoRules.find(r => r.id === ruleId);
    if (!rule) return Promise.resolve({ created: 0 });
    // Simulate: count users in referenced groups * number of course targets.
    const userCount = (rule.groupIds || []).reduce((sum, gid) => sum + ((demoGroupMembers[gid] || []).length), 0);
    const targetCount = Math.max(1, (rule.courses || []).length + (rule.learning_paths || []).length);
    const created = userCount * targetCount;
    return Promise.resolve({ created, matchedUsers: userCount });
  }
  if (basePath.match(/^\/api\/assignment-rules\/[^/]+$/) && method === "DELETE") {
    const ruleId = basePath.split("/")[3];
    demoRules = demoRules.filter(r => r.id !== ruleId);
    return Promise.resolve({ deleted: true });
  }

  // ===== GROUPS (MVP) =====
  if (basePath === "/api/groups" && method === "POST") {
    try {
      const body = JSON.parse(options.body || "{}");
      const newGroup = {
        id: "g" + (Date.now() % 100000),
        name: body.name || "Untitled group",
        type: body.type || "custom",
        description: body.description || null,
        external_system: "Entrata",
        synced_at: new Date().toISOString(),
      };
      demoGroups.push(newGroup);
      demoGroupMembers[newGroup.id] = [];
      return Promise.resolve({ id: newGroup.id });
    } catch { return Promise.resolve({ id: "g-err" }); }
  }
  // Simulates the Entrata `company_groups` pull. Stamps every group with a fresh
  // synced_at so the UI's "last sync" chip updates. Mirrors the real backend
  // POST /api/groups/sync-from-entrata endpoint.
  if (basePath === "/api/groups/sync-from-entrata" && method === "POST") {
    const now = new Date().toISOString();
    for (const g of demoGroups) g.synced_at = now;
    return Promise.resolve({
      source: "entrata.company_groups",
      synced_at: now,
      total: demoGroups.length,
      added: 0,
      updated: demoGroups.length,
      removed: 0,
    });
  }
  if (basePath.match(/^\/api\/groups\/[^/]+\/members$/) && method === "GET") {
    const gid = basePath.split("/")[3];
    const memberIds = demoGroupMembers[gid] || [];
    // Project onto the team/user roster where possible.
    const peopleRoster = [
      { id: "u1", name: "Alex Chen", role: "Admin", property_name: "HQ" },
      { id: "u2", name: "Morgan West", role: "Regional VP", property_name: "Pacific Region" },
      { id: "u3", name: "Parker Williams", role: "Property Manager", property_name: "Sunset Towers" },
      { id: "u4", name: "Taylor Brooks", role: "Leasing Agent", property_name: "Sunset Towers" },
      { id: "u5", name: "Riley Maintenance", role: "Maintenance Tech", property_name: "Sunset Towers" },
      { id: "u6", name: "Rafael Oliveira", role: "Maintenance Tech", property_name: "Harbor View" },
    ];
    const members = memberIds.map(id => peopleRoster.find(p => p.id === id)).filter(Boolean);
    return Promise.resolve(members);
  }
  if (basePath.match(/^\/api\/groups\/[^/]+\/members$/) && method === "POST") {
    const gid = basePath.split("/")[3];
    try {
      const body = JSON.parse(options.body || "{}");
      const userIds = Array.isArray(body.userIds) ? body.userIds : [];
      if (!demoGroupMembers[gid]) demoGroupMembers[gid] = [];
      const newlyAdded = [];
      for (const uid of userIds) {
        if (!demoGroupMembers[gid].includes(uid)) {
          demoGroupMembers[gid].push(uid);
          newlyAdded.push(uid);
        }
      }
      // Auto-apply any rule tied to this group for the newly added users.
      const peopleNames = { u1: "Alex Chen", u2: "Morgan West", u3: "Parker Williams", u4: "Taylor Brooks", u5: "Riley Maintenance", u6: "Rafael Oliveira" };
      const rulesForGroup = demoRules.filter(r => r.active && (r.groupIds || []).includes(gid));
      const triggered = [];
      let autoEnrolledCount = 0;
      for (const r of rulesForGroup) {
        const targetCount = Math.max(1, (r.courses || []).length + (r.learning_paths || []).length);
        const created = newlyAdded.length * targetCount;
        if (created > 0) {
          triggered.push({ id: r.id, name: r.name, created });
          autoEnrolledCount += created;
        }
      }
      // Friendly log for debugging in the demo.
      if (newlyAdded.length && triggered.length) {
        const names = newlyAdded.map(u => peopleNames[u] || u).join(", ");
        console.log(`[demo] Added ${names} to group ${gid}; auto-enrolled ${autoEnrolledCount} via: ${triggered.map(t => t.name).join(", ")}`);
      }
      return Promise.resolve({ added: newlyAdded.length, auto_enrolled_count: autoEnrolledCount, triggered_rules: triggered });
    } catch { return Promise.resolve({ added: 0, auto_enrolled_count: 0, triggered_rules: [] }); }
  }
  if (basePath.match(/^\/api\/groups\/[^/]+\/members\/[^/]+$/) && method === "DELETE") {
    const parts = basePath.split("/");
    const gid = parts[3]; const uid = parts[5];
    if (demoGroupMembers[gid]) demoGroupMembers[gid] = demoGroupMembers[gid].filter(u => u !== uid);
    return Promise.resolve({ removed: true });
  }
  if (basePath.match(/^\/api\/groups\/[^/]+$/) && method === "DELETE") {
    const gid = basePath.split("/")[3];
    demoGroups = demoGroups.filter(g => g.id !== gid);
    delete demoGroupMembers[gid];
    return Promise.resolve({ deleted: true });
  }

  return Promise.resolve(options.method === "POST" || options.method === "PUT" ? { success: true } : []);
}

export function isDemoMode() {
  // In the OXP Studio Next.js prototype, no PHP backend is reachable from the
  // static export, so demo mode is forced ON unless an explicit API URL is set
  // at build time via NEXT_PUBLIC_ACADEMY_API_URL.
  if (typeof process === "undefined" || !process.env) return true;
  return (
    process.env.NEXT_PUBLIC_ACADEMY_STATIC_DEMO === "true" ||
    !process.env.NEXT_PUBLIC_ACADEMY_API_URL
  );
}

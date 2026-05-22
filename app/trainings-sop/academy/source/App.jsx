/* eslint-disable react/no-unescaped-entities */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE, apiRequest, fetchAdminContent, createCustomCourse, toggleCoursePublished, uploadScormPackage, deleteCustomCourse, fetchGroups, fetchGroupMembers, createGroup, addGroupMembers, removeGroupMember, bulkAssign, fetchEnrollmentProgress, fetchCourseEnrollmentUsers, nudgeBulk, fetchAdminPolicies, createAdminPolicy, executePolicySchedule, fetchPolicyCompliance, fetchPolicyComplianceUsers, acknowledgePolicy as acknowledgeApi, fetchAdminSparks, createSpark, toggleSparkPublished, aiGenerateSpark, fetchSparkRules, createSparkRule, executeSparkRule, fetchSparksFeed, markSparkViewed, markSparkComplete, fetchLearningPaths, fetchLearningPath, createLearningPath, updateLearningPath, deleteLearningPath, addLearningPathCourse, removeLearningPathCourse, reorderLearningPathCourses, fetchDiscoveryCatalog, fetchGamificationProfile, fetchLeaderboard, fetchAllBadges, fetchXpHistory, fetchCourseReviews, submitCourseReview, fetchPopularCourses, fetchCourseQuiz, fetchQuizForAttempt, submitQuizAttempt, fetchAuditLog, exportAuditLog, fetchScheduledReports, createScheduledReport, updateScheduledReport, deleteScheduledReport, fetchMyCertificates, getCertificateDownloadUrl, fetchJourneyDetails, updateJourneyDays, fetchTeamJourneyProgress, fetchMyJourney, fetchContextualTriggers, createContextualTrigger, updateContextualTrigger, toggleContextualTrigger, deleteContextualTrigger, dapCheck, dapCompleteGate, dapResetGate, dapResetByWorkflow, dapWalkthroughSteps, dapCompleteWalkthrough, dapDismissWalkthrough, dapLogEvent, dapRequestException, dapMyStatus, dapAdminDashboard, dapAdminCompliance, dapAdminExceptions, dapAdminUpdateException, dapAdminAdoptionByWorkflow, dapAdminWalkthroughs, dapAdminToggleWalkthrough, fetchBrandKit, updateBrandKit, fetchEnablementCalendar, createRecurringSchedule, validateMigrationHistory, executeMigration, fetchVerticals, uploadPolicyFile, createPolicyVersion, fetchCertPrograms, createCertProgram, updateCertProgram, deleteCertProgram, addCertProgramCourse, removeCertProgramCourse, assignCertProgram, fetchCertProgramProgress, fetchMyCertifications, fetchMyLearningPlans, fetchCatalogLearningPlans, fetchAdminKbInstances, trackKbView, fetchKbRecentViews, fetchKbFavorites, addKbFavorite, removeKbFavorite, fetchWhatsNew, fetchWhatsNewUnread, markUpdateRead, markAllUpdatesRead, fetchWhatsNewReadIds, fetchContentVisibility, updateContentVisibility, fetchMyNotifications, markNotificationRead, markAllNotificationsRead, fetchTriggerFires, simulateTriggerEvent, fetchCategories, fetchCuratedPlans, hideCuratedPlan, unhideCuratedPlan, syncGroupsFromEntrata } from "./api";
import {
  BookOpen, Users, ShieldCheck, Award, Clock, AlertTriangle, CheckCircle2,
  GraduationCap, BarChart3, Upload, Play, Settings, LogOut, FileText,
  Monitor, Video, Star, Search, Download, Send, Plus, Wrench, Building2,
  ClipboardCheck, TrendingUp, X, Loader2, FolderOpen, LayoutDashboard,
  Zap, Target, UserCheck, BarChart, Sparkles, ArrowRight, Folder, Activity,
  Bot, Lightbulb, ChevronRight, Globe, Home, Volume2, HelpCircle, Maximize2, Minimize2, Eye,
  Palette, Calendar, Package, Tag, Menu, Crosshair, ArrowLeft, MapPin, ChevronDown, ChevronUp, Info, RefreshCw, ExternalLink, Circle, MessageSquare, List, Check, Pencil,
  Lock, Unlock, Navigation, AlertCircle, Shield, BarChart2, Gauge, HandMetal, Bell, ToggleLeft, ToggleRight, RotateCcw
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from "recharts";
import "./styles.css";
import "./styles/studio.css";
// TRAINING AI - COMMENTED OUT FOR PROTOTYPE // import { TrainingAI } from "./training-ai/TrainingAI.jsx";
import { translations } from "./translations.js";
import { SparkStudio } from "./studio/SparkStudio.jsx";
import { WorkflowRecorder } from "./studio/WorkflowRecorder.jsx";
import { WorkflowPlayer } from "./studio/WorkflowPlayer.jsx";
import { AnalyticsTab } from "./analytics/AnalyticsTab.jsx";
import { KnowledgeHub } from "./KnowledgeHub.jsx";
import { SupportAssistantHero, SupportAssistantBubble } from "./kb-assistant/SupportAssistant.jsx";
import { ArticleViewer } from "./ArticleViewer.jsx";
import { GroupMultiSelect } from "./GroupMultiSelect.jsx";
const RELEASE_ORDER = ["MVP", "1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7"];

const RELEASE_MAP = {
  "my-learning": "MVP", "catalog": "MVP",
  "overview": "MVP", "admin/assign": "MVP",
  "team": "1.1", "admin/progress": "1.1",
  "certifications": "1.2",
  "leaderboard": "1.1", "analytics": "1.1",
  "knowledge-base": "1.1", "whats-new": "1.1", "kb-instances": "1.1",
  "admin/content": "1.1", "admin/audit-log": "1.1", "admin/scheduled-reports": "1.1",
  "compliance": "1.2", "admin/policies": "1.2", "admin/cert-programs": "1.2",
  "admin/nudges": "1.2", "admin/rules": "1.1", "admin/learning-paths": "1.1",
  /* "training-ai": "1.3", */ "sparks": "1.2",
  "admin/sparks-admin": "1.2", "admin/workflow-recorder": "1.3",
  "admin/contextual-triggers": "1.4", "admin/brand-kit": "1.4",
  "admin/enablement-calendar": "1.4", "admin/migration": "1.4",
  "admin/digital-adoption": "1.5", "dap-gates": "1.5", "dap-walkthroughs": "1.5", "dap-tips": "1.5",
  "admin/content-visibility": "1.5",
  "kb-favorites": "1.7", "kb-view-history": "1.7", "kb-popout": "1.7",
};

function isInRelease(featureKey, selectedRelease) {
  if (selectedRelease === "all") return true;
  const featureRelease = RELEASE_MAP[featureKey];
  if (!featureRelease) return true;
  return RELEASE_ORDER.indexOf(featureRelease) <= RELEASE_ORDER.indexOf(selectedRelease);
}

function releaseBadge(featureKey, selectedRelease) {
  if (selectedRelease === "all") return null;
  const featureRelease = RELEASE_MAP[featureKey];
  if (!featureRelease) return null;
  if (isInRelease(featureKey, selectedRelease)) return null;
  return <span className="release-badge">{featureRelease}</span>;
}

const ENG_NOTES = {
  "my-learning": {
    release: "MVP",
    why: "Core learner experience. Gong call analysis showed learners need a single place to see all assigned training with clear progress indicators and due dates. Every competing LMS (Grace Hill, Yardi eLearning) has this as the default landing page.",
    facilitates: "Learner self-service: see assignments, track progress, launch courses. Reduces manager burden of chasing completions by 40-60%.",
    decisions: "Bidirectional completion: a course completed from this page, from the catalog, or from inside any Learning Plan is completed everywhere it appears. This is enforced by the enrollments table (single row per user+course), not by a sync job. Training team flagged this as a must-have for MVP because Docebo does NOT do this for its course packages. XP widget appears contextually when gamification is active (Elite tier). Journey widget shows within 30 days of hire date. Policies appear inline alongside courses for a unified task view. SCORM Architecture: Real SCORM 1.2 packages are stored on disk (backend/data/scorm-packages/), metadata in course_versions table (scorm_package_path, extracted_path, launch_file, manifest_data). Course player detects scorm_package_id on enrollment, loads /api/scorm/:enrollmentId/player which serves an HTML page with a full SCORM 1.2 RTE API shim (window.API). The shim intercepts LMSGetValue/LMSSetValue/LMSCommit calls and persists CMI data to scorm_tracking table via /api/scorm/:enrollmentId/cmi. Completion events are auto-detected via postMessage. Three real Articulate Rise SCORM packages are seeded: Rentable Items, Late Fees, Call Tracking.",
    internal: {
      context: "This is the default landing page for all learners. Use the role switcher (top right) to see the experience as different user types -- Leasing Agent, Property Manager, Maintenance Tech, Admin, or Regional VP. Each role sees different assignments.",
      whatToTest: "Enroll in a course from the catalog and verify it appears here. Click into a SCORM course (Rentable Items, Late Fees, or Call Tracking) and complete it -- verify the progress updates. Try acknowledging a policy. Expand a Learning Plan to see courses and try enrolling.",
      knownLimitations: "SCORM courses must be completed in a single session (progress is tracked but resume may not restore exact slide position). The onboarding journey widget only appears for users within 30 days of their hire date.",
    }
  },
  "catalog": {
    release: "MVP",
    why: "Customer feedback flagged discoverability as a top pain point. 'I know there are courses but I can never find the right one.' Vertical filters (E7) address Affordable housing content gap specifically called out by 3 of our top 20 customers.",
    facilitates: "Self-directed learning: browse, search, filter by category/type/vertical/source/format. The Format filter uses training-team language (eLearning, Video, Recorded Webinar, Live Webinar, Quiz, Document). Learners can see which content is curated by Entrata vs custom to their company. Completion of any course in the catalog is reflected everywhere it appears (plans, assigned views, My Learning).",
    decisions: "Format names use training-team terminology per R2 feedback: 'SCORM' is shown as 'eLearning' in the UI (underlying enum stays `scorm` for backend compat). Custom content gets an explicit CUSTOM badge so learners can tell it apart from Entrata-published content. The left sidebar filter = content type (course/plan/spotlight/article/release note); the top dropdown = format (how it's delivered). KB articles and release notes were moved to dedicated tabs starting 1.1 for per-type permissions. Starting 1.2 (Elite only), Spotlights are a first-class catalog content type -- they appear in the sidebar, are searchable, and mix into the 'All Content' view alongside courses and learning plans. MVP users see no Spotlights anywhere. Learning plan descriptions are now rendered as their own line on cards (not appended to meta), and admins can edit title/description/target group/enrollment mode on custom plans post-creation. Unified Library (KB + Catalog merge) remains a 1.2 initiative.",
    engMeetingNotes: "Training R2 (Apr 2026, decisions confirmed): (a) 'SCORM' -> 'eLearning' + add Recorded Webinar / Live Webinar / Document -- done; (b) clearer distinction between top filter (Format) and sidebar (Content type) -- done via rename + tooltip; (c) learning plan detail modal with per-course completion dots (bidirectional) -- 1.1; (d) CUSTOM badge for client-authored content -- done; (e) **Decision #1: merge Video into Spotlight** -- dropdown relabels 'Video' as 'Spotlight'; backend enum migration to deprecate `video` is 1.1; (f) **Decision #2 (updated):** Spotlights are now a first-class Catalog content type at 1.2 (Elite) -- added to the sidebar, included in 'All Content', MVP users still see none. The 'Looking for Spotlights?' callout was removed because Spotlights now live in the catalog directly. (g) Learning plan descriptions surfaced as their own line on learner cards; admin-side inline edit added for custom plans (title, description, target group, enrollment mode); curated Entrata plans seeded with richer 1-2 sentence learner-facing copy.",
    internal: {
      context: "The Learning Catalog is the browse surface for all training content. Format filter distinguishes delivery mechanism; content type sidebar distinguishes resource type. A course completed from the catalog is automatically marked complete wherever that course also appears.",
      whatToTest: "Filter by Format = Recorded Webinar -- should be an empty state if no data yet, which is expected. Verify 'eLearning' pill appears for SCORM courses. Check for the CUSTOM badge on a custom course. In the list view, both the format and CUSTOM badge should be visible on each row.",
      knownLimitations: "Recorded Webinar / Live Webinar / Document are UI-only today -- course records still use the `scorm`/`video`/`quiz` type enum. Expanding the enum + seeding content is a 1.1 task.",
    }
  },
  /* "training-ai": {
    release: "1.3",
    why: "Unique differentiator -- no competitor offers role-based AI simulation for property management. Summit 2025 #1 requested feature. Customer interviews showed 78% of leasing agents feel underprepared for objection handling.",
    facilitates: "Role-based conversational practice: leasing agents practice prospect objections, maintenance techs practice resident communication, managers practice difficult conversations. AI grades performance against brand voice guidelines.",
    decisions: "Role detection on login drives persona-specific scenarios. Brand voice guidelines (admin-configurable) are injected into the LLM system prompt so the AI coaches and grades against company-specific language rules."
  }, */
  "sparks": {
    release: "1.2",
    why: "TikTok-style micro-learning. Renamed from 'Sparks' to 'Spotlights' to differentiate from Grace Hill's similar feature. Customer feedback: 'Our staff won't sit through a 30-minute course but they'll watch a 90-second video.'",
    facilitates: "Bite-sized training delivery: short video clips with comprehension checks. Performance-based auto-assignment rules (spotlight rules) push targeted content to struggling learners.",
    decisions: "Feed-based UX for consumption, studio for creation. Rules engine enables automatic delivery based on performance thresholds -- unique to Entrata. Per Training R2 Decision #1, 'Video' as a separate content type is retired -- Spotlight is the single short-form video type in EA. Per Training R2 Decision #2 (updated), Spotlights moved from 1.3 to 1.2 and are now integrated into the Learning Catalog as a first-class content type (Elite only); the standalone Spotlights tab remains for focused feed consumption.",
    engMeetingNotes: "Training R2 (Apr 2026, all decisions confirmed): (a) 'What's the difference between Videos and Spotlights?' -- **Decision #1: merged into Spotlight**. Catalog `video` type relabeled 'Spotlight' in UI (done); backend enum migration 1.1. Explainer card at the top of the Spotlights tab. (b) Assigned Spotlights not visible on My Learning dashboard -- done, new strip on dashboard. (c) Spotlights not in Catalog -- **resolved at 1.2**: Spotlights are now a content type in the Catalog sidebar, mixed into 'All Content', searchable, and clicking opens the item in the Spotlights tab. MVP users still see nothing Spotlight-related because this is Elite + 1.2+ gated.",
    internal: {
      context: "Spotlights are our TikTok-style micro-learning feature. This is a 1.2 release feature (Elite only) -- switch the release filter to 1.2+ to see it. Previously called 'Sparks,' renamed to 'Spotlights' to differentiate from Grace Hill.",
      whatToTest: "On release filter = 1.2+ and Elite user: Spotlights should appear as a content type in the Catalog sidebar; selecting it shows the searchable feed, and the 'All Content' view includes a Spotlights section. Clicking a catalog spotlight card navigates to the Spotlights tab and opens that item. On MVP, no Spotlights UI should be visible anywhere.",
      knownLimitations: "Video playback uses a sample CC0 clip as placeholder -- actual spotlight videos would be admin-uploaded content. AI generation of spotlights from course content is commented out for now. Backend still uses `video` as the enum value; relabeling happens in the UI only until the 1.1 migration.",
    }
  },
  "team": {
    release: "1.1",
    why: "Manager oversight was the #1 manager request: 'I just need to see who's behind.' Journey subtab (E1) addresses Summit feedback on structured onboarding visibility for new hires.",
    facilitates: "Managers can view team completion status, assign courses, send nudges, and track onboarding journeys. Direct line of sight into team training health.",
    decisions: "Traffic-light status indicators (complete/in-progress/overdue) for quick scanning. Nudge button sends targeted reminders. Journey subtab only appears when onboarding journeys exist.",
    internal: {
      context: "This tab is visible to Property Managers, Regional VPs, and Admins -- not to individual learners (Leasing Agents, Maintenance Techs). Switch roles via the top-right selector to see who has access.",
      whatToTest: "As a Property Manager, view your team's training status. Try sending a nudge to an overdue team member. Check the Journeys subtab for onboarding progress. As a Regional VP, you should see a broader team view.",
      feedback: "Does the traffic-light status system (green/yellow/red) give you enough info at a glance? Would you want additional drill-down capabilities?",
    }
  },
  "certifications": {
    release: "1.2",
    why: "Table stakes for compliance-driven customers. Fair housing certification is a legal requirement. Customers said: 'We need downloadable proof of completion for audits.' Training R2 flagged the learner nomenclature as confusing -- this tab is being restructured as 'Credentials' (Certificates + Certifications sub-tabs) in 1.1.",
    facilitates: "Learners view earned certificates (per-course documents) and certification programs (multi-course credentials with expiry). Download PDFs for audits, track expirations. Supports compliance evidence for regulatory inspections. External (user-uploaded) certifications from outside EA are planned for 1.2.",
    decisions: "Certificate = per-course completion document, auto-generated at course completion. Certification = multi-course credential program with optional expiry and renewal. An info card at the top of the tab calls out this distinction per training R2 feedback. PDF generation uses server-side rendering. 'Certified' stat card on My Learning has a tooltip clarifying it does not double-count with 'Completed'.",
    engMeetingNotes: "Training R2 (Apr 2026, decisions confirmed): (a) 'Certificates' vs 'Certifications' confusion -- resolved with info card + stat-card tooltips; (b) **Decision #5: tab renamed to 'Credentials' with Certifications / Certificates sub-tab switcher -- done**; (c) external certifications earned outside EA -- confirmed 1.2 (new table `external_certifications`); (d) grouping + favoriting earned certificates -- 1.1; (e) 'By Entrata' vs custom program badge -- 1.1.",
    internal: {
      context: "Certificates and Certifications are distinct: certificates are automatic per-course completion documents, certifications are admin-created multi-course credential programs. Training R2 asked us to make this visible in the learner UI.",
      whatToTest: "Complete a course that has a certificate associated with it and verify the certificate appears with a download link. Enroll in a certification program, complete the required courses, and verify the certification auto-issues. Hover the 'Certified' stat card on My Learning to confirm the tooltip explains the distinction from 'Completed'.",
      knownLimitations: "PDF download generates a basic certificate. In production, certificates would use the customer's brand kit (logo, colors) if configured. External cert upload is 1.2.",
    }
  },
  "compliance": {
    release: "1.2",
    why: "Property management has significant regulatory requirements (Fair Housing, OSHA, state-specific mandates). Customers said: 'We need a single view of who's compliant and who isn't, grouped by requirement.'",
    facilitates: "Compliance officers and regional managers can see requirement-level completion rates, identify non-compliant staff, and take action. Reduces audit prep time.",
    decisions: "Grouped by compliance requirement rather than by person -- feedback from compliance officers who think in terms of 'which requirement has gaps' not 'which person is behind.'",
    internal: {
      context: "Compliance is a 1.2 feature -- switch to release 1.2+ to see it. This is a major differentiator for customers in regulated property management (Fair Housing, OSHA).",
      whatToTest: "View compliance requirements grouped by regulation type. Drill into a requirement to see which staff are compliant vs. non-compliant. This is a read-only dashboard in the prototype.",
      feedback: "Is grouping by requirement (rather than by person) the right default view? Would you also want a person-centric view?",
    }
  },
  "analytics": {
    release: "1.1",
    why: "Every customer asked for better reporting. Grace Hill and Kallidus both have robust analytics. Our gap analysis showed we need: individual progress, team rollups, org overview, content effectiveness, and outcome correlation.",
    facilitates: "Multi-level analytics: My Progress (learner), Team (manager), Org Overview (admin/VP), Content Effectiveness (admin), Compliance Overview (admin), Outcomes (admin/VP). Drives data-informed training decisions.",
    decisions: "Tabbed analytics layout with role-based subtab visibility. Outcomes dashboard (E2) uniquely correlates LMS data with PMS operational metrics -- no competitor can do this.",
    internal: {
      context: "Analytics is a 1.1 feature. Different analytics subtabs are visible based on your role -- switch roles to see what each persona gets. The Outcomes dashboard (correlating training with operational metrics) is our competitive moat.",
      whatToTest: "As a learner, check 'My Progress.' As a manager, check the 'Team' rollup. As an admin or VP, explore 'Org Overview,' 'Content Effectiveness,' and 'Outcomes.' Note how the Outcomes tab connects LMS completions to PMS metrics like lease conversion.",
      feedback: "Is the Outcomes correlation convincing? Does it clearly show the connection between training and operational performance?",
    }
  },
  "leaderboard": {
    release: "1.1",
    why: "Social motivation drives completion rates. Industry benchmarks show 40-60% higher completion with visibility into peer progress. Grace Hill doesn't have this. Customer feedback: 'Our staff are competitive -- give them something to compete on.'",
    facilitates: "Leaderboard ranked by trainings completed and certificates earned. Simple, transparent ranking that motivates without requiring daily logins.",
    decisions: "Deliberately simple: ranked by completions, not XP or streaks. LMS usage is periodic (not daily like social apps), so streaks and XP levels would feel punitive. Certificates shown as secondary metric. Property-scoped to keep competition relevant among peers.",
    internal: {
      context: "Leaderboard is a 1.1 feature. It's intentionally simple -- ranked by completions, not gamified metrics like XP or daily streaks. Property management staff don't use an LMS daily, so gamification mechanics that reward daily engagement would feel punitive.",
      whatToTest: "View the leaderboard rankings. Note how it's scoped to the learner's property. Complete a course and see if your ranking updates.",
      feedback: "Does ranking by completions feel motivating? Should we also show certificates earned as a secondary ranking factor?",
    }
  },
  "admin/audit-log": {
    release: "1.1",
    why: "Compliance and security requirement. Admins need a tamper-evident record of who changed what, when. Required for SOX and Fair Housing audits.",
    facilitates: "Searchable, exportable log of all admin actions: assignments, course changes, policy updates, user modifications. Supports compliance evidence gathering.",
    decisions: "Append-only log backed by database triggers. Export to CSV for offline auditing. Filters by action type, date range, and actor.",
    internal: {
      context: "Audit Log is a 1.1 feature. It records all admin actions for compliance evidence. This is a requirement for regulated customers.",
      whatToTest: "Perform some admin actions (assign a course, create a policy) and then check the Audit Log to see if they're captured. Try filtering by action type and exporting to CSV.",
    }
  },
  "admin/scheduled-reports": {
    release: "1.1",
    why: "Admins and regional VPs need recurring reports delivered without manual effort. 'I spend 2 hours every Monday pulling the same completion report.'",
    facilitates: "Configure report type, frequency (daily/weekly/monthly), and email recipients. Reports auto-generate and deliver on schedule.",
    decisions: "Reports use the same data as the Analytics tab. Schedules stored in DB with cron-style execution. CSV attachment format for compatibility.",
    internal: {
      context: "Scheduled Reports is a 1.1 feature. Replaces the manual weekly report-pulling workflow admins described in customer interviews.",
      whatToTest: "Create a scheduled report with a frequency and recipients. Edit an existing schedule. Delete a schedule. Note that report delivery is simulated in the prototype.",
    }
  },
  "overview": {
    release: "MVP",
    why: "Admin hub for managing the LMS. Summary stats (users, courses, completions, overdue) provide at-a-glance health. Subtabs organize admin functions by workflow.",
    facilitates: "Central admin panel: content management, assignments, progress tracking, groups, policies, AI configuration, compliance, and platform settings.",
    decisions: "Subtabs are tiered: Basic gets Assign + Progress, Elite unlocks Content, Groups, Nudges, Rules, Policies, Spotlights, Workflow Recorder, Learning Plans. E3-E6 features added as additional subtabs.",
    internal: {
      context: "You must be logged in as an Admin to see this. Use the role switcher (top right) and select Admin. The admin panel uses subtabs across the top -- available subtabs depend on the release version selected.",
      whatToTest: "Review the summary stats at the top. Navigate through each subtab. Try creating a course, assigning it, and tracking progress. Switch release versions to see how subtabs expand.",
      knownLimitations: "Some admin subtabs (Workflow Recorder, Contextual Triggers, Brand Kit) are later-release features with limited interactivity in the prototype.",
    }
  },
  "admin/content": {
    release: "1.1",
    why: "Elite customers need to create and manage their own training content alongside Entrata-published courses. 'We have company-specific onboarding that doesn't exist in your library.'",
    facilitates: "Admin can create custom courses, upload SCORM packages, toggle publish status, and manage the content library. Enables customer-authored training.",
    decisions: "SCORM upload support added because 40% of target customers have existing SCORM content from previous LMS providers.",
    internal: {
      context: "My Content is where admins create and manage their custom courses. Entrata-published content comes from the Publisher app (separate admin interface). This tab is for customer-authored content only.",
      whatToTest: "Create a new course (with or without a SCORM package). Toggle a course's published status. Verify the course appears in the Learning Catalog for learners.",
      knownLimitations: "SCORM upload accepts .zip files. Course creation currently supports SCORM 1.2 packages only.",
    }
  },
  "admin/assign": {
    release: "MVP",
    why: "One-time assignment of training to a known set of people. Example: 'HR needs these 40 people to complete the new harassment policy course by Friday.' This is different from ongoing auto-enrollment (see Enrollment Rules, 1.1).",
    facilitates: "Select courses, choose users AND/OR Entrata groups, choose a due date (relative calendar days OR a specific date), assign. Review step shows group member counts + estimated total recipients. For ongoing auto-enrollment on group membership changes, admins use Enrollment Rules (1.1) instead.",
    decisions: "Assign is a push; Enrollment Rules is a subscription. We surface this difference with an inline info box at the top of the wizard. Assign does not persist a rule -- it's a one-shot operation that creates enrollment rows and logs an audit event. Group pickers read from inherited Entrata groups (no in-EA group management). Per training R2: due date supports BOTH 'X calendar days from assignment' AND an explicit calendar date so admins don't have to do month-end math; label makes 'calendar days' explicit (not business days).",
    engMeetingNotes: "Training feedback R1 (Apr 2026): 'Today's Assign is a one-time push; we need an ongoing enrollment rule for groups.' Answer: keep Assign, add Enrollment Rules in 1.1. Training R2 (Apr 2026): (a) allow assigning Learning Plans, not just courses -- 1.1 (requires bulkAssign API + UI); (b) unified users+groups selector with count badges -- already done (tabbed step with badges); (c) recurrence (annual / biennial / quarterly / custom) -- 1.1; (d) calendar filter by category (Entrata Product / Professional Development / Compliance) -- 1.1; (e) state-based targeting when Entrata exposes user state -- 1.1; (f) Due date modes (relative vs absolute) + calendar days clarifier -- done; (g) Review step shows group member counts + estimated total recipients -- done.",
    internal: {
      context: "One-time assignment. For continuous auto-enrollment, see Enrollment Rules (1.1). Due date supports relative (X calendar days) OR absolute (specific date).",
      whatToTest: "Assign a course to a user, switch roles, verify it appears. Try bulk assigning to an Entrata group and confirm the Review step shows the group member count. Pick an absolute date and confirm the enrollment due_date matches. Pick relative and confirm 'calendar days from assignment' is honored.",
    }
  },
  "admin/progress": {
    release: "1.1",
    why: "Admins need visibility into who has completed what, who's overdue, and overall training health. Basic requirement for any LMS.",
    facilitates: "View enrollment progress by course or learning plan, with status + enrollment-source filters (admin-assigned / auto-enrolled by a rule / self-enrolled). Filter by completion state. Drill into per-user details. Scoped to enrollments; certification programs live in Admin > Certifications and compliance roll-ups live in Admin > Compliance.",
    decisions: "Progress table now includes Not Started as a first-class status column + filter (training feedback R2). Source filter distinguishes admin/auto/self enrollments per training R2 request. Overdue items are highlighted red. Learning plan coverage is planned for 1.1 via `enrollments.learning_path_id` join; drill-down link to analytics is planned for 1.1.",
    engMeetingNotes: "Training R2 feedback (Apr 2026): (a) add Not Started as a filter -- done; (b) add Source filter (admin/auto/self) so we can separate implementation-team auto-enrollments from admin pushes -- done; (c) learning plan rows in Progress -- 1.1; (d) drill-down link from Progress row to analytics -- 1.1.",
    internal: {
      context: "Progress tracking is the admin's view into enrollment status across all users. Not Started, In Progress, Completed, Overdue filters supported. Source filter (admin/auto/self) requires backend to expose enrollment_source per row (column exists, needs rollup).",
      whatToTest: "Filter by Not Started -- only courses with unclicked enrollments should show. Filter by Source = Auto-enrolled -- only rule-created enrollments should appear. Verify course completions from learner side are reflected here.",
    }
  },
  "admin/groups": {
    release: "(inherited)",
    why: "EA does not manage groups. Groups are inherited from Entrata (Users & Groups) via sync. This avoids duplicate group management and keeps a single source of truth. The Groups tab has been removed from EA; groups appear in Assign pickers and Enrollment Rules as read-only selections.",
    facilitates: "Nothing in EA. Admins manage groups in Entrata; EA reads them.",
    decisions: "No EA-side groups tab. In production, groups sync from Entrata via SCIM (or equivalent) on a near-real-time cadence. Membership changes in Entrata fire an EA hook that re-evaluates enrollment rules for the affected user.",
    engMeetingNotes: "Product decision (Apr 2026): EA will not own groups. Entrata already has a full Users & Groups surface -- EA consumes it. Removed the EA Groups admin tab.",
    internal: {
      context: "Stub entry only. No tab renders for admin/groups. Sync details are an open eng question for 1.1 (SCIM vs webhook vs polling).",
      whatToTest: "N/A -- groups are managed in Entrata.",
    }
  },
  "admin/nudges": {
    release: "1.2",
    why: "Managers and admins need to send targeted reminders to incomplete learners. 'Email notifications aren't enough -- I need to nudge specific people.'",
    facilitates: "Select overdue or incomplete learners and send nudge notifications. Reduces manual follow-up time.",
    decisions: "Nudge sends in-app and email notification. Bulk nudge available from progress view.",
    internal: {
      context: "Nudges let admins and managers send targeted reminders to learners who are behind. Available in 1.2.",
      whatToTest: "Select one or more overdue learners and send a nudge. Nudge delivery is simulated in the prototype (no actual email/notification sent).",
    }
  },
  "admin/rules": {
    release: "1.1",
    why: "Training feedback (Apr 2026): 'The current Assign is one-time. We need ongoing auto-enrollment -- assign the Manager Onboarding learning plan to the Managers group and have it auto-apply whenever a new manager is added.' Today's implementation team sets this up for every Basic customer; in 1.1 the customer does it themselves.",
    facilitates: "Create an enrollment rule that targets a course or learning plan to one or more Entrata groups. On save the rule runs retroactively against current members. When a user is added to a referenced group in Entrata later, the rule re-runs for just that user (auto-enroll). This is the subscription pattern, in contrast with Assign which is a one-time push.",
    decisions: "Rule = (target: course|learning_plan) + (who: group(s) OR attribute criteria) + (when: dueDays, enrollment_target). Group mode is the default and the primary story. Groups are inherited from Entrata (EA does not manage them). The attribute mode (role/state) is preserved for more advanced scenarios. Retroactive run is automatic on save. Auto-apply is triggered by an Entrata -> EA membership-change hook, which runs executeAssignmentRule restricted to the newly-added user IDs.",
    engMeetingNotes: "Open for 1.1 planning: the sync mechanism between Entrata groups and EA (SCIM vs webhook vs polling). Later releases will add performance-threshold-based triggers tied to PMS metrics (lease conversion, work order time). For 1.1 we intentionally limit scope to group + attribute matchers because that's what's needed to replace today's implementation-team workflow.",
    internal: {
      context: "Enrollment Rules are 1.1. Create a rule tied to an Entrata group; membership changes in Entrata drive auto-enrollment in EA.",
      whatToTest: "Create a rule 'Manager Onboarding -> Managers group'. Simulate a new member joining Managers in Entrata and confirm they're auto-enrolled. Switch to that user's role and verify the plan is on their My Learning.",
      feedback: "Is the split between Assign (one-time) and Enrollment Rules (ongoing) clear? Do the info boxes at the top of each wizard help?",
    }
  },
  "admin/policies": {
    release: "1.2",
    why: "Policy acknowledgment is legally required for Fair Housing, employee handbooks, and safety procedures. 'We need proof that every employee read and acknowledged the policy.'",
    facilitates: "Create policies with acknowledgment requirements, schedule annual renewals, track compliance rates, and export evidence for audits.",
    decisions: "Policies appear in the learner's My Learning tab alongside courses for a unified task view. Production enforcement is fully automated via three triggers: (1) Nightly cron job evaluates all active policy schedules -- catches new hires, recurring renewals, and scope changes. (2) Event-driven hooks on user lifecycle events (user created, role changed, property transferred, group membership changed) immediately evaluate applicable policies. (3) On-publish trigger seeds initial assignments when a policy is first published or a new version is released. The execute logic is idempotent (ON CONFLICT DO NOTHING) so overlapping triggers are safe. The 'Run' button in the prototype is a manual stand-in for these automated triggers.",
    internal: {
      context: "Policies support PDF and DOCX uploads in addition to HTML content. When a learner views a PDF policy, it renders inline. DOCX policies offer a download link.",
      whatToTest: "Create a policy with a PDF upload. Switch to a learner role and acknowledge the policy -- verify the PDF renders inline. Try creating an HTML policy and acknowledging it. Check the compliance rate after acknowledgments.",
      knownLimitations: "DOCX files are download-only (not rendered inline). The 'Run' button on each policy is a prototype-only affordance. In production, policy assignment is fully automated -- a nightly scheduler and real-time event hooks (user creation, role change, group membership change) replace the manual trigger. No admin action is required to distribute policies to the right users.",
    }
  },
  "admin/cert-programs": {
    release: "1.2",
    why: "Multi-course certification programs allow admins to define structured credentials (Fair Housing Certified, Leasing Pro) that require completing a set of courses with expiry + renewal. Distinct from per-course certificates (automatic single-course documents).",
    facilitates: "Create certification programs with required courses, expiry periods, and minimum passing scores. Assign programs to users/roles. Track per-user progress toward earning certifications. Auto-issuance when all requirements are met.",
    decisions: "Programs can come from the Entrata catalog (published by Entrata) or be custom-built by admins (Elite only for custom authoring). Auto-issuance happens asynchronously on each course completion. Per training R2, the IA is deliberately split: Assign = one-time push; Enrollment Rules = ongoing auto-enrollment by group membership; Certifications = multi-course credential programs with expiry. An info card in the admin UI clarifies the distinction. External certifications (user-uploaded credentials earned outside EA) are a 1.2 addition.",
    engMeetingNotes: "Training R2 (Apr 2026): (a) a lot of overlap confusion with Assign, Enrollment Rules, and Compliance -- resolved with an info card at the top of each tab; (b) 'By Entrata' vs custom program badge -- 1.1; (c) 'Credentials' umbrella tab on learner side with Certificates + Certifications sub-tabs -- 1.1 (requires learner-side restructure); (d) grouping/favoriting for earned certificates -- 1.1; (e) external (user-uploaded) certifications -- 1.2.",
    internal: {
      context: "Certification Programs are multi-course credentials. Unlike single-course certificates, these require completing a set of courses with optional expiry. Per training R2, explicitly call this out in UI to reduce confusion with per-course certificates.",
      whatToTest: "Create a certification program with 2-3 required courses. Assign it to a user. As that user, complete the required courses and verify the certification is auto-issued. Check the Certifications tab for the earned certificate. Read the info card -- does the distinction from Assign and Enrollment Rules feel clear?",
    }
  },
  "admin/sparks-admin": {
    release: "1.3",
    why: "Admin-side management for Spotlights (micro-learning). Create, publish, and manage the spotlight library. AI-powered generation from course content.",
    facilitates: "Create spotlights manually or generate them with AI from existing courses. Manage publish status and view engagement metrics.",
    decisions: "AI generation takes a course and produces a 60-90 second spotlight script + quiz. Reduces content creation time from hours to minutes.",
    internal: {
      context: "Spotlights Admin is the content creation side of the micro-learning feature. This is a 1.3 feature.",
      whatToTest: "Create a new spotlight manually. Toggle publish status. View engagement metrics on existing spotlights. AI generation is commented out for now.",
    }
  },
  "admin/workflow-recorder": {
    release: "1.3",
    why: "Unique feature: record actual Entrata product workflows to create step-by-step training content. 'Show me exactly how to process a move-in.' No competitor has this.",
    facilitates: "Record screen interactions to create interactive walkthroughs. Captures steps, screenshots, and annotations. Published as playable workflow guides.",
    decisions: "Recorder captures DOM events and screenshots. Playback uses a step-by-step overlay. Addresses the #1 training request: 'How do I do X in Entrata?'",
    internal: {
      context: "Workflow Recorder is a 1.3 feature and highly unique -- no competing LMS has this. Think of it as 'record yourself doing a task in Entrata, and it becomes a training walkthrough.'",
      whatToTest: "This is a concept UI showing the recorder interface. The actual recording functionality would require deep integration with Entrata's core product.",
      feedback: "Does the concept of recording product workflows as training content resonate? What workflows would be most valuable to record?",
    }
  },
  "admin/learning-paths": {
    release: "1.1",
    why: "Structured multi-course plans for role onboarding and career development. 'New leasing agents need to complete these 5 courses in order during their first 2 weeks.' Training team flagged this as Basic-tier critical -- Docebo's 'course packages' do not share completion with standalone courses, which is a pain point EA must solve. Sequenced into 1.1 alongside Enrollment Rules.",
    facilitates: "Create ordered course plans with day-based scheduling. Assign plans to new hires for structured onboarding journeys. Available to Basic tier from 1.1.",
    decisions: "Bidirectional completion: completion is tracked on a single enrollments row per (user, course). The Learning Plan view joins that table, so completing a course in the catalog, in a plan, or via an enrollment rule marks it complete everywhere it appears. No sync job required -- the architecture guarantees it. Day-based scheduling aligns with onboarding journey UI. Paths support reordering and course add/remove after creation. Admins can inline-edit title, description, target group, and enrollment mode on custom plans after creation (curated-by-Entrata plans remain read-only). Descriptions are surfaced prominently to learners in the Catalog rather than buried in the meta line.",
    engMeetingNotes: "Training feedback (Apr 2026): 'In Docebo, course packages don't mark the standalone course complete (and vice versa). This is why EA must have real Learning Plans.' Confirmed: EA's enrollments table enforces at most one manual enrollment per (user, course), so catalog and plan share a single completion record. Surfaced this to learners with an info banner on the expanded plan view and an 'Also in Catalog' tag on each course row. Also (R2, Apr 2026): admins asked for editable plan descriptions - done via inline Edit mode on custom plans, and curated Entrata plans now seed with richer 1-2 sentence learner-facing copy.",
    internal: {
      context: "Learning Plans (admin side) are fully functional and backed by the database. Changes here are reflected on the learner side in real time. In 1.1 for Basic tier because current Docebo-based offering includes this today (built by implementation team).",
      whatToTest: "Create a new Learning Plan. Add courses to it. Switch to a learner role and verify it appears in their 'My Learning Plans' section. Complete a course standalone (from the catalog), then reopen the plan -- it should show as complete there too. Do the reverse: complete a course from within the plan, then open the catalog listing for that course -- it should show as complete there.",
      feedback: "Is the Learning Plan creation workflow intuitive? Would admins want to duplicate/clone existing plans?",
    }
  },
  "admin/contextual-triggers": {
    release: "1.4",
    why: "Moat feature: training surfaces inside the Entrata product at the moment of need. Competitive analysis showed this is a whitespace opportunity -- no LMS integrates contextually with its parent platform.",
    facilitates: "Configure triggers that surface training content when users encounter specific workflows in Entrata (e.g., first time processing a move-in, lease renewal season).",
    decisions: "Trigger types: first_encounter, seasonal, performance_drop, role_change. Target content can be courses or spotlights. Enabled/disabled toggle per trigger.",
    internal: {
      context: "This is a 1.4 feature and one of our biggest competitive differentiators. No other LMS integrates training contextually into its parent platform. Think of it as 'training at the moment of need.'",
      whatToTest: "View existing triggers. Create a new trigger and set a trigger type. Toggle a trigger's enabled/disabled state. This is a configuration UI -- the actual in-product surfacing would happen in Entrata's core product.",
      feedback: "Does the trigger configuration feel intuitive? Would admins understand what 'first_encounter' vs. 'seasonal' vs. 'performance_drop' means without explanation?",
    }
  },
  "admin/brand-kit": {
    release: "1.4",
    why: "Customer feedback: 'We need our logo on certificates and our colors in the LMS.' Table stakes for enterprise LMS. Grace Hill offers basic branding.",
    facilitates: "Upload company logo, set primary/secondary/accent colors, customize greeting text, and configure email header HTML. Brand is applied to certificates, emails, and portal chrome.",
    decisions: "Live preview shows brand application in real-time. Color picker with hex input for brand-precise colors.",
    internal: {
      context: "Brand Kit lets customers white-label the LMS with their logo, colors, and messaging. This is table stakes for enterprise LMS sales.",
      whatToTest: "Change the primary color and greeting text. The live preview should update in real time. Note that logo upload is simulated in the prototype.",
    }
  },
  "admin/enablement-calendar": {
    release: "1.4",
    why: "Customers need visibility into recurring training cadence. 'We do Fair Housing every January but I always forget to set it up.' Wires up the recurring_schedules table.",
    facilitates: "Visual calendar showing scheduled and recurring training events. Create recurring campaigns (quarterly compliance, monthly safety, etc.) with auto-assignment.",
    decisions: "Calendar view (month grid) with color-coded event types. Recurring schedule creation modal with frequency, target roles, and course selection.",
    internal: {
      context: "The Enablement Calendar is a 1.4 feature. It gives admins a visual timeline of upcoming and recurring training campaigns.",
      whatToTest: "Browse the calendar to see scheduled events. Try creating a recurring schedule with a frequency and target role.",
    }
  },
  "admin/migration": {
    release: "1.4",
    why: "Sales blocker: prospects switching from Grace Hill or Yardi need a clear data migration path. 'We have 3 years of completion history -- we can't lose that.'",
    facilitates: "3-step wizard: upload SCORM packages, map/validate completion history CSV, execute migration with progress tracking.",
    decisions: "Validation step catches errors before execution (missing users, invalid dates, unknown courses). Dry-run mode available.",
    internal: {
      context: "Migration wizard is a 1.4 feature and a critical sales enabler. Prospects switching from Grace Hill or Yardi need assurance their historical data won't be lost.",
      whatToTest: "Walk through the 3-step wizard. The validation step should catch sample errors. Note this is a simulated migration -- no actual data import occurs in the prototype.",
    }
  },
  "admin/digital-adoption": {
    release: "1.5",
    why: "Moat feature evolved: DAP (Digital Adoption Platform) takes 1.4's contextual triggers and adds enforcement, walkthroughs, smart tips, and analytics. Benchmarked against WalkMe ($300M+ ARR), Whatfix, Pendo, and Apty. Our advantage: training IS access control -- no SSO middleware, no third-party add-on. 'Every DAP on the market can show you a tooltip. Only Entrata Academy can lock the door until you are trained.'",
    facilitates: "Workflow-level access gating (block features until trained), guided walkthroughs (step-by-step overlay), smart tips (field-level beacons), adoption analytics (funnel, compliance, friction), exception management (temporary bypasses with audit trail), recertification (gate clearance expires).",
    decisions: "Elite-only feature. Evolves contextual triggers -- same table, extended schema. Enforcement modes: suggest (surface training) or require (block access). Grace periods prevent harsh lockouts for new users. Recertification addresses annual compliance requirements (e.g., Fair Housing). Publisher workflow manages the registry of gatable workflows, gate templates, walkthroughs, and smart tips.",
    internal: {
      context: "Switch to release 1.5 to see Digital Adoption. The 'Contextual Triggers' tab evolves into 'Digital Adoption' with 4 sub-tabs: Workflow Gates, Adoption Analytics, Compliance, and Exceptions. The 'Entrata Workflows' nav item shows simulated Entrata pages with gate overlays, walkthroughs, and smart tips in action.",
      whatToTest: "1) Admin: Create a workflow gate in require mode. View the compliance matrix. Grant/deny an exception. 2) Learner: Navigate to a simulated workflow (e.g., Work Orders) and observe the gate overlay. Complete training to clear the gate. Watch the guided walkthrough after clearing. Hover over smart tip beacons. 3) Note the analytics dashboard populates with seeded events.",
      feedback: "Is the gate overlay experience clear enough that a blocked user understands what to do? Is the compliance matrix useful for admins managing many users?",
    }
  },
  /* "admin/training-ai-guidelines": {
    release: "1.3",
    why: "Brand voice enforcement for AI training. 'Our company says my pleasure instead of thank you, and resident instead of tenant.' Admin needs to configure these rules.",
    facilitates: "Define brand voice rules that the Training AI uses for coaching and grading. Ensures AI-generated feedback aligns with company communication standards.",
    decisions: "Rules are stored as structured entries (term pairs + context) and injected into LLM system prompts. Grading penalizes brand voice violations."
  }, */
  "knowledge-base": {
    release: "1.1",
    why: "Director of Training feedback: 'Our KB is in Zendesk and nobody finds it.' Previously KB content was mixed into the Learning Catalog alongside courses, which created an all-or-nothing permission problem and cluttered the training view. Promoting KB to its own tab gives it dedicated UX with category tree navigation, full-text search, and independent admin toggle. Customers can enable/disable KB access separately from courses.",
    facilitates: "Dedicated help article browsing with hierarchical category tree, full-text search, and in-app article reading. Company overlay/fork model (KB Instances) lets admins customize articles without losing the canonical source. Staleness tracking alerts when Entrata updates the original.",
    decisions: "KB tab is separate from Learning Catalog -- courses and articles are different content types with different consumption patterns. Admin can disable KB for end users while keeping courses enabled. Category tree from the API provides hierarchical browsing. The fork/overlay model tracks version divergence and surfaces staleness badges for admins only.",
    internal: {
      context: "The Knowledge Base was previously embedded in the Learning Catalog. It now has its own tab with a full category tree, search, and article viewer. This separation enables per-content-type permissions -- admins can disable KB while keeping courses enabled.",
      whatToTest: "Switch to release 1.1+. Click the 'Knowledge Base' tab. Browse categories in the sidebar. Search for articles. Click an article to open the ArticleViewer. As an admin, check the Entrata Original / Your Company toggle. As a non-admin, you should see only the final version.",
      knownLimitations: "KB articles shown are mock data. In production, these would be sourced from Zendesk/Guru via API.",
    }
  },
  "whats-new": {
    release: "1.1",
    why: "Release notes were previously a flat chronological feed that didn't scale beyond a handful of updates. Entrata ships hundreds of features per release across two tracks (Rapid and Standard). Research across Salesforce, Linear, Notion, and changelog tools showed that release-grouped changelogs with product area sub-sections and track-based filtering are how enterprise companies handle high-volume release notes.",
    facilitates: "Release-grouped accordion where each named release expands to show updates organized by product area. Filters for product area, update type, release track, and text search apply across all releases. All customers can see all release tracks -- Rapid releases ship every 2 weeks and are bundled into quarterly Standard releases. Track filter dropdown lets users focus on one track. Unread tracking at both release and individual update level.",
    decisions: "Release accordion pattern (not flat feed) supports hundreds of features per release. Product area sub-grouping within each release mirrors Salesforce's cloud-based organization. Track visibility is open to all customers (not auto-filtered) because Rapid content will eventually reach Standard customers. Track filter is user-controlled, not company-locked. Standard releases show which Rapid releases they bundle. Type filter (New Feature / Improvement / Fix / Deprecation) plus text search added for further drill-down.",
    internal: {
      context: "What's New groups updates by named release, with product area sub-sections inside each. All releases (Rapid and Standard) are visible to all customers. Rapid releases happen bi-weekly; Standard releases happen quarterly and bundle all preceding Rapid content. Each release shows a track chip (Rapid/Standard). Standard releases display which Rapid releases they include.",
      whatToTest: "Switch to release 1.1+. Click 'What's New' tab -- you'll see both Rapid and Standard release groups as collapsible accordions. Use the track filter dropdown to narrow to Rapid Only or Standard Only. Standard releases show a 'bundled from' note listing the Rapid releases they include. The track badge shows your company's track. Mark updates as read individually or in bulk.",
      knownLimitations: "AI summary feature is placeholder text. In production, this would call an LLM endpoint to summarize recent updates.",
    }
  },
  "admin/content-visibility": {
    release: "1.5",
    why: "Customers have different needs: some want courses + KB + release notes, others want courses only, others want to hide release notes from end users. The Learning Catalog, Knowledge Base, and What's New are three independent content surfaces that need independent admin toggles.",
    facilitates: "Admin panel section with three toggles for Knowledge Base, What's New, and role-based visibility (All users / Managers+ / Admins only). Learning Catalog is always on as a core feature.",
    decisions: "Three surfaces, three toggles. Learning Catalog cannot be disabled (core feature). KB and What's New can be disabled or restricted to specific role levels. Settings are per-company and stored in the content_visibility_settings table.",
    internal: {
      context: "Content Visibility is a 1.5 admin feature. It gives admins control over which content surfaces their users can see. This solves the 'we want courses but not release notes' requirement.",
      whatToTest: "Switch to release 1.5. Go to Admin > Content Visibility. Toggle Knowledge Base off -- verify the KB tab disappears. Toggle What's New off -- verify the tab disappears. Set min_role to 'manager' and switch to a Leasing Agent -- verify the tab is hidden.",
    }
  },
  "kb-favorites": {
    release: "1.7",
    why: "Hadley Training team feedback: users repeatedly search for the same articles they reference frequently. Favoriting lets them build a personal quick-access list. Kyle Whittle: 'It would be nice to have favoriting articles.'",
    facilitates: "Star toggle on article cards and in the article viewer. Favorites filter chip in the Knowledge Base hub. Favorites persist per-user in the database.",
    decisions: "Star icon toggle (filled = favorited). Favorites filter chip shows count. Favorites stored per-user in kb_article_favorites table with slug-based reference.",
  },
  "kb-view-history": {
    release: "1.7",
    why: "Hadley Training team feedback: 'Nothing is more frustrating than losing your train of thought and starting over.' Users lose track of which articles they were reading. View history gives them a quick way back.",
    facilitates: "Recently Viewed horizontal scroll section at the top of the Knowledge Base hub. Shows last 10 unique articles viewed with title, category, and read time. View tracking fires on article open.",
    decisions: "Server-side tracking in kb_article_views table (not localStorage) so history persists across devices. Deduplicated to show each article once. Horizontal card scroll saves vertical space.",
  },
  "kb-popout": {
    release: "1.7",
    why: "Hadley Training team feedback: users need to follow along with help articles while working in Entrata on a different screen. Pop-out opens the article in a standalone window that can be moved to a second monitor.",
    facilitates: "Pop Out button in the article viewer opens the article in a new browser window with clean formatting (dark header, article content, no app chrome). Window stays open independently.",
    decisions: "Writes article HTML directly to the new window via document.write() to avoid auth complications. Minimal styling with sticky header. Parent tracks whether the article is popped out.",
  },
};

function EngNotes({ tabKey }) {
  const note = ENG_NOTES[tabKey];
  const storageKey = `eng-notes-${tabKey}`;
  const viewKey = `eng-notes-view-${tabKey}`;
  const hasInternal = !!note?.internal;
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem(storageKey) === "true"; } catch { return false; }
  });
  const [view, setView] = useState(() => {
    if (typeof window === "undefined") return "engineering";
    try { return localStorage.getItem(viewKey) || "engineering"; } catch { return "engineering"; }
  });
  if (!note) return null;
  const toggle = () => { const next = !open; setOpen(next); try { localStorage.setItem(storageKey, String(next)); } catch {} };
  const switchView = (v) => { setView(v); try { localStorage.setItem(viewKey, v); } catch {} };
  return (
    <div className={`eng-notes ${open ? (view === "internal" ? "int-notes-open" : "eng-notes-open") : ""}`}>
      <button className="eng-notes-toggle" onClick={toggle} type="button">
        {view === "internal" ? <MessageSquare size={13} /> : <Info size={13} />}
        <span>Notes</span>
        <span className="release-badge" style={{ marginLeft: 6 }}>{note.release}</span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <div className="eng-notes-body">
          {hasInternal && (
            <div className="notes-view-switcher">
              <button type="button" className={`notes-view-pill ${view === "engineering" ? "active" : ""}`} onClick={() => switchView("engineering")}>Engineering</button>
              <button type="button" className={`notes-view-pill ${view === "internal" ? "active" : ""}`} onClick={() => switchView("internal")}>Internal</button>
            </div>
          )}
          {view === "engineering" && (
            <>
              <div className="eng-notes-row"><strong>Why:</strong> {note.why}</div>
              <div className="eng-notes-row"><strong>Facilitates:</strong> {note.facilitates}</div>
              <div className="eng-notes-row"><strong>Decisions:</strong> {note.decisions}</div>
            </>
          )}
          {view === "internal" && note.internal && (
            <>
              {note.internal.context && <div className="eng-notes-row"><strong>Context:</strong> {note.internal.context}</div>}
              {note.internal.whatToTest && <div className="eng-notes-row"><strong>What to test:</strong> {note.internal.whatToTest}</div>}
              {note.internal.knownLimitations && <div className="eng-notes-row"><strong>Known limitations:</strong> {note.internal.knownLimitations}</div>}
              {note.internal.feedback && <div className="eng-notes-row"><strong>Feedback needed:</strong> {note.internal.feedback}</div>}
              {note.internal.note && <div className="eng-notes-row">{note.internal.note}</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const DEMO_USERS = [
  { email: "admin@sunsetpm.com", role: "Admin", label: "Alex Chen" },
  { email: "morgan.west@sunsetpm.com", role: "Regional VP", label: "Morgan West" },
  { email: "parker.sf@sunsetpm.com", role: "Property Manager", label: "Parker Williams" },
  { email: "taylor.sf@sunsetpm.com", role: "Leasing Agent", label: "Taylor Brooks" },
  { email: "riley.sf@sunsetpm.com", role: "Maintenance Tech", label: "Riley Maintenance" },
  { email: "rafael.sf@sunsetpm.com", role: "Maintenance Tech", label: "Rafael Oliveira", locale: "pt-BR" }
];

const AVATAR_COLORS = ["blue", "green", "amber", "purple", "red"];
const PIE_COLORS = ["#16a34a", "#3b82f6", "#d97706", "#dc2626"];

/** CC0 sample clip (Mozilla MDN) when a Spark has no hosted file in the prototype. */
const SPARK_DEMO_VIDEO_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

function sparkVideoSrc(spark) {
  if (spark?.video_url) return spark.video_url;
  return SPARK_DEMO_VIDEO_URL;
}
const TREND_DATA = [
  { month: "Oct", completions: 12 }, { month: "Nov", completions: 18 },
  { month: "Dec", completions: 24 }, { month: "Jan", completions: 22 },
  { month: "Feb", completions: 31 }, { month: "Mar", completions: 28 }
];

function buildEliRecs(courses) {
  const titles = courses.map((c) => c.title);
  return [
    { title: "Lead Follow-Up Best Practices", courseTitle: "Lead Follow-Up Best Practices", reason: "Taylor Leasing's lead-to-lease rate dropped 12% this month (68% vs 80% target). This course covers follow-up timing and objection handling.", metric: "68% close rate", icon: <Target /> },
    { title: "Tour Conversion Techniques", courseTitle: titles[0] || "Fair Housing Essentials", reason: "Sunset Towers tour-to-application rate is 23% below portfolio average. Recommended for all leasing agents at this property.", metric: "23% below avg", icon: <TrendingUp /> },
    { title: "Fair Housing Refresher", courseTitle: "Fair Housing Essentials", reason: "Jordan Leasing's Fair Housing certification expires in 18 days. Auto-assigned for compliance.", metric: "Expires Apr 14", icon: <ShieldCheck /> }
  ];
}

const COURSE_CONTENT = {
  "Fair Housing Essentials": [
    { title: "Introduction to Fair Housing", body: "The Fair Housing Act prohibits discrimination in housing based on race, color, national origin, religion, sex, familial status, and disability. Many states add additional protected classes.", type: "lesson" },
    { title: "Protected Classes", body: "Federal protected classes: Race, Color, National Origin, Religion, Sex (including gender identity and sexual orientation), Familial Status, Disability. Your state may include additional classes such as source of income, age, or marital status.", type: "lesson" },
    { title: "Advertising Compliance", body: "All marketing materials, listings, and communications must avoid discriminatory language. Avoid phrases that indicate preference or limitation based on protected classes. Use inclusive imagery in all property marketing.", type: "lesson" },
    { title: "Reasonable Accommodations", body: "A reasonable accommodation is a change in rules, policies, or services that allows a person with a disability equal opportunity to use and enjoy their home. Requests do not need to be in writing and the word 'accommodation' does not need to be used.", type: "lesson" },
    { title: "Knowledge Check", body: "A prospect asks if there are many families with children in the building. How should you respond?\n\nCorrect: 'I can share information about our community amenities that families enjoy, but I'm not able to discuss the demographics of our residents.'\n\nThis avoids steering and maintains compliance.", type: "quiz" },
    { title: "Documentation & Reporting", body: "Document all prospect interactions consistently. If you suspect a fair housing complaint may arise, notify your Property Manager immediately. Never discuss pending complaints with other residents or staff.", type: "lesson" },
  ],
  "Lead Manager Fundamentals": [
    { title: "Guest Card Basics", body: "Every prospect interaction starts with a guest card. Capture: name, contact info, desired move-in date, unit preferences, and lead source. Complete data drives accurate reporting and follow-up.", type: "lesson" },
    { title: "Lead Source Tracking", body: "Accurate lead source attribution helps your marketing team optimize spend. Always ask 'How did you hear about us?' and record the specific source, not just 'internet' or 'walk-in.'", type: "lesson" },
    { title: "Follow-Up Workflows", body: "Entrata's automated follow-up workflows trigger based on lead status changes. Configure: initial response (within 5 minutes), 24-hour check-in, 3-day follow-up, and 7-day re-engagement.", type: "lesson" },
    { title: "Pipeline Management", body: "Your lead pipeline should be reviewed daily. Move prospects through stages: New > Contacted > Tour Scheduled > Tour Completed > Application > Approved > Lease Signed. Stale leads need action or archival.", type: "lesson" },
    { title: "Conversion Metrics", body: "Key metrics: Lead-to-Tour rate (target: 40-50%), Tour-to-Application rate (target: 30-40%), Application-to-Lease rate (target: 70-80%). Review these weekly with your manager.", type: "quiz" },
  ],
  "Lead Follow-Up Best Practices": [
    { title: "The 5-Minute Rule", body: "Responding to a new lead within 5 minutes increases conversion by 400% compared to a 30-minute response. Set up notifications and have response templates ready.", type: "lesson" },
    { title: "Multi-Channel Follow-Up", body: "Use the prospect's preferred channel. Sequence: 1st touch via their inquiry channel, 2nd touch via phone, 3rd touch via email with virtual tour link. Vary your approach.", type: "lesson" },
    { title: "Objection Handling", body: "Common objections and responses:\n- 'Too expensive' -> Focus on value, amenities, location. Offer to show different floor plans.\n- 'Still looking' -> Offer a tour to help them compare. Share what makes your property unique.\n- 'Need to think about it' -> Set a specific follow-up time. Create gentle urgency with availability.", type: "lesson" },
    { title: "Closing Techniques", body: "Assumptive close: 'Which move-in date works best for you?' Choice close: 'Would you prefer the 2nd floor or 3rd floor unit?' Urgency close: 'This floor plan has strong demand; I can hold it for 48 hours with an application.'", type: "quiz" },
  ],
  "Maintenance Safety Basics": [
    { title: "Personal Protective Equipment", body: "Required PPE by task: Painting (respirator, goggles), Plumbing (gloves, eye protection), Electrical (insulated gloves, arc-flash rated clothing), General (steel-toe boots, high-vis vest for exterior work).", type: "lesson" },
    { title: "Ladder Safety", body: "Three points of contact at all times. Inspect before use. 4:1 ratio for straight ladders. Never stand on the top two rungs. Set up on firm, level ground. Have a spotter for heights over 10 feet.", type: "lesson" },
    { title: "Lockout/Tagout (LOTO)", body: "Before servicing any equipment: 1) Notify affected personnel, 2) Shut down equipment, 3) Isolate energy sources, 4) Apply lock and tag, 5) Verify zero energy state. Never remove another person's lock.", type: "lesson" },
    { title: "Chemical Handling & SDS", body: "Safety Data Sheets must be accessible for all chemicals on-site. Key sections: Hazard identification (Section 2), First aid (Section 4), Handling and storage (Section 7), Exposure controls (Section 8).", type: "lesson" },
    { title: "Incident Reporting", body: "Report ALL incidents within 24 hours, including near-misses. Use Entrata's work order system to document: what happened, where, when, who was involved, and what corrective action was taken.", type: "quiz" },
  ],
  "Work Order Management": [
    { title: "Work Order Lifecycle", body: "New > Assigned > In Progress > Pending Parts/Vendor > Completed > Closed. Each status change should include a note. Residents receive automatic updates at key transitions.", type: "lesson" },
    { title: "Priority Triage", body: "Emergency (immediate): Fire, flood, no heat in winter, gas leak, lock-out. Urgent (24 hrs): No hot water, AC failure in summer, appliance failure. Routine (3-5 days): Cosmetic repairs, non-critical fixtures. Scheduled: Preventive maintenance, upgrades.", type: "lesson" },
    { title: "Resident Communication", body: "Set expectations at intake: estimated timeline, whether unit entry is needed, and any preparation required. Update residents proactively if timelines change. Always close the loop when work is complete.", type: "lesson" },
    { title: "Completion & Close-Out", body: "Before closing: verify the fix with a follow-up inspection, attach photos, record materials used, and log time spent. Resident satisfaction follow-up within 48 hours of completion.", type: "quiz" },
  ],
  "Entrata Platform Onboarding": [
    { title: "Welcome to Entrata", body: "Entrata is the leading property management platform serving multifamily communities. You'll use it daily for leasing, resident management, maintenance, accounting, and communication.", type: "lesson" },
    { title: "Navigating the Dashboard", body: "Your dashboard is customized by role. Key areas: left navigation for modules, top bar for property/portfolio switching, notification center for alerts and tasks, and the search bar for quick access to any record.", type: "lesson" },
    { title: "Your Role-Specific Modules", body: "Based on your role and permissions, you'll see different modules. Leasing agents: Lead Manager, Applications, Leasing Center. Maintenance: Work Orders, Inspections, Vendors. Managers: All modules plus reports and settings.", type: "lesson" },
    { title: "Getting Help", body: "In-app help: click the '?' icon on any page. Entrata Academy: access from the Training menu for courses and certifications. Support: submit tickets through the Help menu for technical issues.", type: "lesson" },
  ],
};

const DEFAULT_CONTENT = [
  { title: "Course Overview", body: "Welcome to this course. You'll learn key concepts and best practices through interactive lessons and knowledge checks. Complete all sections to earn your certificate.", type: "lesson" },
  { title: "Key Concepts", body: "This section covers the fundamental principles and terminology you'll need. Take notes and refer back to this material as you progress through the remaining sections.", type: "lesson" },
  { title: "Best Practices", body: "Apply what you've learned with these proven strategies and workflows. Each practice has been validated across thousands of properties on the Entrata platform.", type: "lesson" },
  { title: "Knowledge Check", body: "Test your understanding of the material covered. You'll need to demonstrate competency to complete this course and earn your certificate.", type: "quiz" },
];

const LEARNING_PLANS_SAMPLE = [
  { name: "Leasing Essentials", courses: 4, est: "2 hours", desc: "OXP navigation, lead management, tour scheduling, and lease application basics.", roles: ["Leasing Agent", "All"], courseList: [
    { title: "Platform Orientation", day: 1, duration: "25 min", required: true, completed: true, completedDate: "Mar 12, 2026" },
    { title: "Lead to Lease Fundamentals", day: 3, duration: "35 min", required: true },
    { title: "Tour Best Practices", day: 7, duration: "30 min", required: true },
    { title: "Lease Application Processing", day: 14, duration: "30 min", required: true },
  ]},
  { name: "Maintenance Fundamentals", courses: 6, est: "3 hours", desc: "Work order management, safety protocols, vendor coordination, and make-ready process.", roles: ["Maintenance Tech", "All"], courseList: [
    { title: "Work Order Management", day: 1, duration: "30 min", required: true, completed: true, completedDate: "Feb 28, 2026" },
    { title: "Safety Protocols", day: 3, duration: "25 min", required: true, completed: true, completedDate: "Mar 3, 2026" },
    { title: "Make-Ready Process", day: 7, duration: "35 min", required: true },
    { title: "Vendor Coordination", day: 10, duration: "30 min", required: false },
    { title: "Preventive Maintenance", day: 14, duration: "25 min", required: false },
    { title: "Emergency Response", day: 21, duration: "35 min", required: true },
  ]},
  { name: "Property Manager Track", courses: 8, est: "5 hours", desc: "Financial reporting, resident management, compliance, and team oversight.", roles: ["Property Manager", "Community Manager", "Regional VP", "All"], courseList: [
    { title: "Platform Orientation", day: 1, duration: "25 min", required: true, completed: true, completedDate: "Mar 12, 2026" },
    { title: "Financial Reporting Basics", day: 3, duration: "40 min", required: true, completed: true, completedDate: "Mar 15, 2026" },
    { title: "Resident Management", day: 7, duration: "35 min", required: true, completed: true, completedDate: "Mar 20, 2026" },
    { title: "Fair Housing Compliance", day: 10, duration: "30 min", required: true },
    { title: "Team Oversight", day: 14, duration: "45 min", required: true },
    { title: "Budget Management", day: 21, duration: "40 min", required: true },
    { title: "Renewal Strategy", day: 28, duration: "30 min", required: false },
    { title: "Vendor Relations", day: 30, duration: "35 min", required: false },
  ]},
  { name: "New Hire Orientation", courses: 3, est: "1.5 hours", desc: "Company policies, platform basics, and compliance essentials for all new employees.", roles: ["All"], courseList: [
    { title: "Company Policies & Culture", day: 1, duration: "30 min", required: true },
    { title: "Platform Basics", day: 1, duration: "25 min", required: true },
    { title: "Compliance Essentials", day: 2, duration: "35 min", required: true },
  ]},
];

const CERT_PROGRAMS_SAMPLE = [
  { id: "cp1", title: "Fair Housing Certified Professional", type: "compliance", coursesRequired: 4, coursesCompleted: 3, expiryMonths: 12, status: "in_progress", courses: [
    { title: "Fair Housing Fundamentals", completed: true },
    { title: "Reasonable Accommodations", completed: true },
    { title: "Advertising Compliance", completed: true },
    { title: "Fair Housing Case Studies", completed: false },
  ]},
  { id: "cp2", title: "Leasing Professional Certification", type: "standard", coursesRequired: 5, coursesCompleted: 5, expiryMonths: 24, status: "earned", earnedDate: "2026-02-15", courses: [
    { title: "Lead to Lease Fundamentals", completed: true },
    { title: "Tour Best Practices", completed: true },
    { title: "Application Processing", completed: true },
    { title: "Objection Handling", completed: true },
    { title: "Closing Techniques", completed: true },
  ]},
  { id: "cp3", title: "Maintenance Technician Level 1", type: "standard", coursesRequired: 3, coursesCompleted: 0, expiryMonths: null, status: "not_started", courses: [
    { title: "Work Order Management", completed: false },
    { title: "Safety Protocols", completed: false },
    { title: "Resident Communication", completed: false },
  ]},
];

const TOUR_LEGACY_PREFIX = "academy_tour_v1_done";

function tourCompletedKey(role) {
  return `academy_tour_completed_${role}`;
}

function isTourCompleted(role, userId) {
  if (!role) return false;
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(tourCompletedKey(role)) === "1") return true;
  if (userId && localStorage.getItem(`${TOUR_LEGACY_PREFIX}:${userId}`) === "1") return true;
  return false;
}

function getTourProfile(role) {
  if (role === "Admin") return "admin";
  if (role === "Regional VP") return "rvp";
  if (role === "Property Manager" || role === "Community Manager") return "manager";
  return "learner";
}

const TOUR_PROFILE_LABELS = { learner: "Learner", manager: "Manager", rvp: "Regional VP", admin: "Admin" };

/**
 * Plan: tab = trainingTab, adminTab = adminSubTab, position = tooltip placement.
 * @type {Record<string, { title: string; description: string; hint: string; position: "center" | "below-tabs" | "below-stats"; trainingTab: string; adminSubTab?: string; scrollTo?: "policies" }[]>}
 */
const WALKTHROUGH_STEPS = {
  learner: [
    { title: "Welcome to Entrata Academy", description: "Welcome to Entrata Academy! This guide walks you through your learning tools: a curated course catalog, Learning Plans that bundle a role's required training, a searchable Knowledge Base, and the Spotlights micro-learning feed.", hint: "Use Next to continue, or Skip to dismiss. Reopen this tour anytime from the Help button.", position: "center", trainingTab: "my-learning" },
    { title: "My Learning", description: "Your personal dashboard shows assigned courses, due dates, and progress. ELI recommendations at the top suggest training based on your performance metrics.", hint: "Try clicking a course to launch it.", position: "below-tabs", trainingTab: "my-learning" },
    { title: "Learning Catalog", description: "Browse all available courses by category, type, or search. Click any course card to self-enroll and start learning immediately.", hint: "Use filters when you have many courses.", position: "below-tabs", trainingTab: "catalog" },
    // TRAINING AI - COMMENTED OUT FOR PROTOTYPE //
    /* { title: "Training AI", description: "Practice real conversations with an AI that adapts to your role. Leasing agents handle prospect tours, maintenance techs diagnose resident issues, and managers navigate conflicts. The AI coaches you in real time and tracks your skill growth.", hint: "Start a session by choosing a property, then respond naturally.", position: "below-tabs", trainingTab: "training-ai" }, */
    { title: "Spotlights", description: "Short-form vertical video clips assigned to you, similar to TikTok. Watch inline or full screen. Screen-capture tutorials keep optional steps below the video.", hint: "Complete assigned Spotlights to clear your queue.", position: "below-tabs", trainingTab: "sparks" },
    { title: "Policies", description: "Review and acknowledge required policies. Overdue policies show a red badge. Click Read & Acknowledge to open the full policy and sign.", hint: "Scroll the page to see the Policies card on My Learning.", position: "below-stats", trainingTab: "my-learning", scrollTo: "policies" },
    { title: "Certifications", description: "Earned certificates appear here after completing courses. Track expiration dates and renewal requirements.", hint: "Check back after you finish courses in My Learning.", position: "below-tabs", trainingTab: "certifications" },
    { title: "Analytics", description: "Track your learning progress and skill growth over time. See how your performance trends across courses.", hint: "My Progress is your personal performance snapshot.", position: "below-tabs", trainingTab: "analytics" },
    { title: "You are all set", description: "You are all set! Access this guide anytime from the Help button in the top bar.", hint: "Trainings & SOP stays available under OXP whenever you need it.", position: "center", trainingTab: "my-learning" }
  ],
  manager: [
    { title: "Welcome to Entrata Academy", description: "Welcome to Entrata Academy! As a manager, you have everything learners see plus team oversight tools: progress tracking, bulk assignment, nudging, and compliance analytics across your properties.", hint: "Use Next to continue, or Skip to dismiss. Reopen this tour anytime from the Help button.", position: "center", trainingTab: "my-learning" },
    { title: "My Learning", description: "Your personal dashboard shows assigned courses, due dates, and progress. ELI recommendations at the top suggest training based on your performance metrics.", hint: "Try clicking a course to launch it.", position: "below-tabs", trainingTab: "my-learning" },
    { title: "Learning Catalog", description: "Browse all available courses by category, type, or search. Click any course card to self-enroll and start learning immediately.", hint: "Preview courses before assigning them to your team.", position: "below-tabs", trainingTab: "catalog" },
    // TRAINING AI - COMMENTED OUT FOR PROTOTYPE //
    /* { title: "Training AI", description: "Practice real conversations with an AI that adapts to your role. The AI simulates realistic scenarios, coaches you in real time, and tracks skill growth. As a manager, you can also view the Team Dashboard to monitor your team's simulation readiness.", hint: "Use the Team Dashboard button to see how your reports are performing.", position: "below-tabs", trainingTab: "training-ai" }, */
    { title: "Spotlights", description: "Short-form vertical video clips assigned to you, similar to TikTok. Watch inline or full screen. Screen-capture tutorials keep optional steps below the video.", hint: "Share relevant Spotlights in team meetings.", position: "below-tabs", trainingTab: "sparks" },
    { title: "Policies", description: "Review and acknowledge required policies. Overdue policies show a red badge. Click Read & Acknowledge to open the full policy and sign.", hint: "Scroll the page to see the Policies card on My Learning.", position: "below-stats", trainingTab: "my-learning", scrollTo: "policies" },
    { title: "Certifications", description: "Earned certificates appear here after completing courses. Track expiration dates and renewal requirements.", hint: "Use this view in one-on-ones.", position: "below-tabs", trainingTab: "certifications" },
    { title: "Team", description: "Monitor your team's training progress. See completion rates, overdue courses, and send nudge reminders to individuals.", hint: "Watch the tab badge for overdue counts.", position: "below-tabs", trainingTab: "team" },
    { title: "Assign course", description: "Assign specific courses to team members with a due date. Select the person, choose a course, and set the deadline.", hint: "Find the assign form on the Team tab.", position: "below-tabs", trainingTab: "team" },
    { title: "Overdue alerts", description: "The Needs Attention panel shows overdue team members. Use the send icon to nudge them with a reminder.", hint: "Pair nudges with clear expectations.", position: "below-tabs", trainingTab: "team" },
    { title: "Analytics", description: "View your personal learning metrics plus your team's progress. See completion rates, skill gaps, and identify who needs attention. The Team tab breaks down performance by individual.", hint: "Switch between My Progress and Team to compare your own growth with your team's.", position: "below-tabs", trainingTab: "analytics" },
    { title: "You are all set", description: "You are all set! Access this guide anytime from the Help button in the top bar.", hint: "Admins configure bulk assign and org-wide rules.", position: "center", trainingTab: "team" }
  ],
  rvp: [
    { title: "Welcome to Entrata Academy", description: "Welcome to Entrata Academy! As a regional leader, you see everything managers see plus portfolio-wide compliance, org analytics, custom reports, and assignment rules.", hint: "Use Next to continue, or Skip to dismiss. Reopen this tour anytime from the Help button.", position: "center", trainingTab: "my-learning" },
    { title: "My Learning", description: "Your personal dashboard shows assigned courses, due dates, and progress. ELI recommendations at the top suggest training based on your performance metrics.", hint: "Try clicking a course to launch it.", position: "below-tabs", trainingTab: "my-learning" },
    { title: "Learning Catalog", description: "Browse all available courses by category, type, or search. Click any course card to self-enroll and start learning immediately.", hint: "Align catalog paths before regional rollouts.", position: "below-tabs", trainingTab: "catalog" },
    // TRAINING AI - COMMENTED OUT FOR PROTOTYPE //
    /* { title: "Training AI", description: "Practice real conversations with an AI that adapts to your role. You can choose from all simulation types: leasing, maintenance, or property management. The Team Dashboard shows readiness across your reports.", hint: "Use the simulation type picker to practice different scenarios.", position: "below-tabs", trainingTab: "training-ai" }, */
    { title: "Spotlights", description: "Short-form vertical video clips assigned to you, similar to TikTok. Watch inline or full screen. Screen-capture tutorials keep optional steps below the video.", hint: "Group Spotlights by region when coaching.", position: "below-tabs", trainingTab: "sparks" },
    { title: "Policies", description: "Review and acknowledge required policies. Overdue policies show a red badge. Click Read & Acknowledge to open the full policy and sign.", hint: "Scroll the page to see the Policies card on My Learning.", position: "below-stats", trainingTab: "my-learning", scrollTo: "policies" },
    { title: "Certifications", description: "Earned certificates appear here after completing courses. Track expiration dates and renewal requirements.", hint: "Audit coverage across your region.", position: "below-tabs", trainingTab: "certifications" },
    { title: "Team", description: "Monitor your team's training progress. See completion rates, overdue courses, and send nudge reminders to individuals.", hint: "Prioritize sites with clustered overdue items.", position: "below-tabs", trainingTab: "team" },
    { title: "Assign course", description: "Assign specific courses to team members with a due date. Select the person, choose a course, and set the deadline.", hint: "Use for targeted remediation.", position: "below-tabs", trainingTab: "team" },
    { title: "Overdue alerts", description: "The Needs Attention panel shows overdue team members. Use the send icon to nudge them with a reminder.", hint: "Combine with Compliance for portfolio risk reviews.", position: "below-tabs", trainingTab: "team" },
    { title: "Compliance", description: "View compliance gaps across your region. See which employees are missing required certifications. Export to CSV for reporting.", hint: "Use exports for QBRs and leadership updates.", position: "below-tabs", trainingTab: "compliance" },
    { title: "Assignment rules", description: "Assignment rules auto-assign courses based on role and state. Your admin creates these; you can view rules loaded for your org and execute when your workflow allows.", hint: "Admins own rule configuration in the Admin tab.", position: "below-tabs", trainingTab: "compliance" },
    { title: "Analytics", description: "Your analytics suite includes Org Overview for cross-property performance, Content Effectiveness to see which courses drive results, Compliance dashboards, and a Report Builder for custom exports.", hint: "Use the Report Builder to create CSV exports for QBRs.", position: "below-tabs", trainingTab: "analytics" },
    { title: "You are all set", description: "You are all set! Access this guide anytime from the Help button in the top bar.", hint: "Partner with your LMS admin for new curricula.", position: "center", trainingTab: "compliance" }
  ],
  admin: [
    { title: "Welcome to Entrata Academy", description: "Welcome to Entrata Academy! As admin, you have the full platform: learner tools, team management, compliance, the Admin console, analytics, Spark Studio, and more.", hint: "Use Next to continue, or Skip to dismiss. Reopen this tour anytime from the Help button.", position: "center", trainingTab: "my-learning" },
    { title: "My Learning", description: "Your personal dashboard shows assigned courses, due dates, and progress. ELI recommendations at the top suggest training based on your performance metrics.", hint: "Sanity-check the learner experience you administer.", position: "below-tabs", trainingTab: "my-learning" },
    { title: "Learning Catalog", description: "Browse all available courses by category, type, or search. Click any course card to self-enroll and start learning immediately.", hint: "Keep categories consistent for discoverability.", position: "below-tabs", trainingTab: "catalog" },
    // TRAINING AI - COMMENTED OUT FOR PROTOTYPE //
    /* { title: "Training AI", description: "AI-powered practice simulations adapted to each role. You can choose any simulation type: leasing, maintenance, or property management. The Team Dashboard shows readiness scores across your org.", hint: "Next up: Training Guidelines, where you control what the AI trains on.", position: "below-tabs", trainingTab: "training-ai" },
    { title: "Training Guidelines", description: "Define your company's brand voice, required terminology, and behavioral expectations. The AI will grade trainees against these rules and naturally test compliance during simulations. For example, require 'resident' instead of 'tenant' or 'my pleasure' instead of 'no problem'.", hint: "Click Training Guidelines in the Training AI toolbar to manage rules.", position: "below-tabs", trainingTab: "training-ai" }, */
    { title: "Spotlights", description: "Short-form vertical video clips assigned to you, similar to TikTok. Watch inline or full screen. Screen-capture tutorials keep optional steps below the video.", hint: "Preview what learners see before publishing admin content.", position: "below-tabs", trainingTab: "sparks" },
    { title: "Policies", description: "Review and acknowledge required policies. Overdue policies show a red badge. Click Read & Acknowledge to open the full policy and sign.", hint: "Scroll the page to see the Policies card on My Learning.", position: "below-stats", trainingTab: "my-learning", scrollTo: "policies" },
    { title: "Certifications", description: "Earned certificates appear here after completing courses. Track expiration dates and renewal requirements.", hint: "Relate learner certs to your compliance reporting.", position: "below-tabs", trainingTab: "certifications" },
    { title: "Team", description: "Monitor your team's training progress. See completion rates, overdue courses, and send nudge reminders to individuals.", hint: "Use before drilling into Admin analytics.", position: "below-tabs", trainingTab: "team" },
    { title: "Assign course", description: "Assign specific courses to team members with a due date. Select the person, choose a course, and set the deadline.", hint: "Bulk assign lives in the Admin tab next.", position: "below-tabs", trainingTab: "team" },
    { title: "Overdue alerts", description: "The Needs Attention panel shows overdue team members. Use the send icon to nudge them with a reminder.", hint: "Pair with Nudge Center for scale.", position: "below-tabs", trainingTab: "team" },
    { title: "Compliance", description: "View compliance gaps across your organization. See which employees are missing required certifications. Export to CSV for reporting.", hint: "Share exports with regional leadership.", position: "below-tabs", trainingTab: "compliance" },
    { title: "Analytics", description: "Full analytics suite: My Progress, Team performance, Org Overview, Content Effectiveness, Compliance dashboards, and a Report Builder for custom exports. Each view is tailored to your admin perspective.", hint: "Use the Report Builder to generate scheduled or ad-hoc CSV exports.", position: "below-tabs", trainingTab: "analytics" },
    { title: "Admin dashboard", description: "High-level stats: total users, courses, completions, and overdue. This is your command center for the entire LMS.", hint: "Switch sub-tabs below to drill into each workflow.", position: "below-tabs", trainingTab: "overview", adminSubTab: "content" },
    { title: "My Content", description: "Upload custom training content specific to your company. Create courses, upload SCORM packages, and toggle publish status.", hint: "Custom courses are clearly labeled for your organization.", position: "below-tabs", trainingTab: "overview", adminSubTab: "content" },
    { title: "Assign courses", description: "Bulk-assign courses to users and groups in four steps: select courses, pick targets, set due date, confirm.", hint: "Use groups for recurring cohorts.", position: "below-tabs", trainingTab: "overview", adminSubTab: "assign" },
    { title: "Progress tracking", description: "Monitor enrollment progress across all courses. Click a row to drill into individual user statuses.", hint: "Expand a course to see learner-level detail.", position: "below-tabs", trainingTab: "overview", adminSubTab: "progress" },
    // GROUPS TAB COMMENTED OUT - managed in Entrata Users & Groups
    // { title: "Groups", description: "Organize users into groups by department, role, region, or property. Groups make bulk assignments fast.", hint: "Add members from your manager team list.", position: "below-tabs", trainingTab: "overview", adminSubTab: "groups" },
    { title: "Nudge Center", description: "Bulk-send reminders to overdue users. Select multiple people, add an optional message, and send.", hint: "Pairs with Progress for who to target.", position: "below-tabs", trainingTab: "overview", adminSubTab: "nudges" },
    { title: "Assignment rules", description: "Create rules by role and state to auto-assign catalog courses. Execute a rule to generate enrollments in bulk.", hint: "Rules run on-demand or can be paired with onboarding workflows.", position: "below-tabs", trainingTab: "overview", adminSubTab: "rules" },
    { title: "Policies (admin)", description: "Create and manage policies with recurring acknowledgment schedules. Track compliance rates across the company.", hint: "Run schedule jobs when policies renew.", position: "below-tabs", trainingTab: "overview", adminSubTab: "policies" },
    { title: "Spotlights Admin", description: "Manage your micro-learning library. Upload videos, set up performance-based auto-assign rules, and publish content for learners.", hint: "Next: Spotlight Studio for creating new content.", position: "below-tabs", trainingTab: "overview", adminSubTab: "sparks-admin" },
    { title: "Spotlight Studio", description: "Create micro-learning Spotlights with the built-in video editor and AI-assisted content generation. Record screen captures, trim clips, and add overlays without leaving the platform.", hint: "Look for the Spotlight Studio button inside Spotlights Admin.", position: "below-tabs", trainingTab: "overview", adminSubTab: "sparks-admin" },
    { title: "Workflow Recorder", description: "Record step-by-step screen-capture tutorials that automatically become training content. Walk through a process once and the system creates a reusable Spark from your recording.", hint: "Great for documenting SOPs and system workflows.", position: "below-tabs", trainingTab: "overview", adminSubTab: "workflow-recorder" },
    { title: "Learning Plans", description: "Create unlimited learning plans. Add courses in the right order, mark required vs optional. Publish to the catalog for self-enrollment, or auto-assign to groups. Replaces the old 6-grouping limit from implementation.", hint: "Create plans for each group or make them available in the catalog for self-enrollment.", position: "below-tabs", trainingTab: "overview", adminSubTab: "learning-paths" },
    { title: "Product-Scoped Catalog", description: "The catalog automatically shows only courses for products your company has contracted. Admins also see a Discovery section at the bottom with courses for products you don't have yet, with a 'Request Demo' option.", hint: "Look for the 'Discover more products' section at the bottom of the Learning Catalog tab.", position: "below-tabs", trainingTab: "catalog" },
    { title: "You are all set", description: "You are all set! You have the full admin toolkit: content management, learning plans, team oversight, compliance, analytics, and content creation. Access this guide anytime from the Help button.", hint: "Your team completes training under Trainings & SOP.", position: "center", trainingTab: "overview", adminSubTab: "content" }
  ]
};

function ini(n) { return (n || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(); }
function aC(n) { let h = 0; for (const c of n || "") h = c.charCodeAt(0) + ((h << 5) - h); return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]; }
function fD(d, locale = "en") { if (!d) return "\u2014"; const loc = locale === "pt-BR" ? "pt-BR" : "en-US"; return new Date(d).toLocaleDateString(loc, { month: "short", day: "numeric", year: "numeric" }); }
function sL(s) { return String(s || "unknown").replace(/_/g, " "); }
function thumbCls(c) { const x = String(c || "").toLowerCase(); if (x.includes("compliance")) return "compliance"; if (x.includes("maint") || x.includes("safety")) return "maintenance"; if (x.includes("onboard")) return "onboarding"; return "default"; }
function makeT(locale) { const dict = translations[locale] || translations.en; return (key) => dict[key] || translations.en[key] || key; }
function fmtMinutes(mins, locale = "en") { if (!mins) return "\u2014"; const h = Math.floor(mins / 60); const m = mins % 60; if (locale === "pt-BR") return h > 0 ? `${h}h ${m}min` : `${m}min`; return h > 0 ? `${h}h ${m}m` : `${m}m`; }
function fmtSeconds(secs) { if (!secs) return "\u2014"; const h = Math.floor(secs / 3600); const m = Math.floor((secs % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; }

function StatusBadge({ status }) {
  const icon = status === "completed" ? <CheckCircle2 /> : status === "overdue" || status === "missing" ? <AlertTriangle /> : status === "in_progress" ? <Clock /> : null;
  return <span className={`status ${status}`}>{icon}{sL(status)}</span>;
}

// Small helper that shows where the groups list comes from (Entrata Setup →
// Users and Groups → Groups) and offers an on-demand sync. Non-blocking:
// if the sync endpoint fails or isn't reachable, the existing groups list
// stays usable.
function EntrataGroupsSyncBar({ groups = [], token, onRefresh }) {
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const mostRecent = useMemo(() => {
    const ts = groups.map((g) => g.synced_at).filter(Boolean).map((s) => new Date(s).getTime());
    if (!ts.length) return null;
    return new Date(Math.max(...ts));
  }, [groups]);
  const shown = lastSynced || mostRecent;
  const syncedLabel = shown
    ? shown.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "never";
  async function doSync() {
    try {
      setSyncing(true);
      const r = await syncGroupsFromEntrata(token);
      setLastSynced(r?.synced_at ? new Date(r.synced_at) : new Date());
      if (onRefresh) await onRefresh();
    } catch (e) {
      console.warn("Entrata groups sync failed", e);
    } finally {
      setSyncing(false);
    }
  }
  return (
    <div className="entrata-sync-bar">
      <div className="entrata-sync-info">
        <Building2 size={12} />
        <span>
          Synced from Entrata · <strong>Setup → Users and Groups → Groups</strong>
          <span className="text-muted"> · {groups.length} active group{groups.length === 1 ? "" : "s"} · last sync {syncedLabel}</span>
        </span>
      </div>
      <button type="button" className="btn-ghost btn-sm" onClick={doSync} disabled={syncing} title="Pull the latest groups from Entrata">
        {syncing ? "Syncing…" : "Sync now"}
      </button>
    </div>
  );
}

function Stars({ rating = 0 }) {
  return <span className="stars">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={i < Math.round(rating) ? "" : "empty"} fill={i < Math.round(rating) ? "currentColor" : "none"} />)}</span>;
}

function CourseIcon({ type }) { if (type === "scorm") return <Monitor />; if (type === "video") return <Video />; return <FileText />; }

function Toast({ toasts }) {
  return <div className="toast-container">{toasts.map((t) => <div key={t.id} className={`toast ${t.type || ""}`}>{t.type === "success" ? <CheckCircle2 /> : t.type === "error" ? <AlertTriangle /> : <Info />}{t.message}</div>)}</div>;
}

function PolicyHtmlEditor({ initialHtml, onChange }) {
  const ref = useRef(null);
  const initialized = useRef(false);
  useEffect(() => {
    if (ref.current && !initialized.current) {
      ref.current.innerHTML = initialHtml;
      initialized.current = true;
    }
  }, [initialHtml]);
  return (
    <div ref={ref} contentEditable suppressContentEditableWarning
      style={{ minHeight: 120, padding: "12px 14px", fontSize: 14, lineHeight: 1.6, outline: "none" }}
      onInput={() => { if (ref.current) onChange(ref.current.innerHTML); }}
    />
  );
}

export function App() {
  const [token, setToken] = useState(() => (typeof window !== "undefined" ? (localStorage.getItem("academy_token") || "") : ""));
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("trainings-sop");
  const [mode, setMode] = useState("training");
  const [trainingTab, setTrainingTab] = useState("my-learning");
  const [expandedPlan, setExpandedPlan] = useState(null);
  const [viewState, setViewState] = useState("normal");
  const [tier, setTier] = useState("elite");
  const [teamSubTab, setTeamSubTab] = useState("status");
  const [teamDetailUser, setTeamDetailUser] = useState(null);
  const [teamDetailData, setTeamDetailData] = useState(null);
  const [teamAnalytics, setTeamAnalytics] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("All");
  const [catalogCategoryId, setCatalogCategoryId] = useState(null);
  const [categoryTree, setCategoryTree] = useState([]);
  const [categoryTreeExpanded, setCategoryTreeExpanded] = useState({});
  const [curatedPlans, setCuratedPlans] = useState([]);
  const [curatedPlanSaving, setCuratedPlanSaving] = useState(null);
  const [catalogContentType, setCatalogContentType] = useState("all");
  const [catalogType, setCatalogType] = useState("All");
  const [catalogSource, setCatalogSource] = useState("All");
  const [catalogView, setCatalogView] = useState("grid");
  const [catalogPreview, setCatalogPreview] = useState(null);
  const [showCompletedCourses, setShowCompletedCourses] = useState(false);
  const [myLearningFilter, setMyLearningFilter] = useState("all");
  const [myLearningType, setMyLearningType] = useState("all");
  const [viewingArticle, setViewingArticle] = useState(null);
  const [kbInstances, setKbInstances] = useState([]);
  const [kbFilter, setKbFilter] = useState("all");
  const [kbRecentViews, setKbRecentViews] = useState([]);
  const [kbFavorites, setKbFavorites] = useState([]);
  const [courseSortBy, setCourseSortBy] = useState("status");
  const [completionCert, setCompletionCert] = useState(null);
  const [completionReview, setCompletionReview] = useState({ rating: 0, comment: "", submitted: false, submitting: false });
  const [catalogReviews, setCatalogReviews] = useState({ loading: false, items: [] });
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState({ items: [], unread: 0 });
  const [installEvent, setInstallEvent] = useState(null);
  const [installBannerDismissed, setInstallBannerDismissed] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("academy_install_dismissed") === "1" : false));
  const [managerCourseSearch, setManagerCourseSearch] = useState("");
  const [catalogLearningPlans, setCatalogLearningPlans] = useState([]);
  const [data, setData] = useState({ courses: [], enrollments: [], certificates: [], policies: [], team: [], teamOverdue: [], adminSummary: null, complianceGaps: [], rules: [] });
  const [launch, setLaunch] = useState({ enrollmentId: null, title: "", url: "", courseId: null });
  const [playerSlide, setPlayerSlide] = useState(0);
  const [courseQuiz, setCourseQuiz] = useState(null);
  const [quizState, setQuizState] = useState({ open: false, loading: false, quiz: null, questions: [], answers: {}, result: null, error: "" });
  const [loginForm, setLoginForm] = useState({ email: "admin@sunsetpm.com", password: "academy123" });
  const [courseForm, setCourseForm] = useState({ title: "", category: "Compliance", type: "scorm", durationMinutes: 30 });
  const [ruleForm, setRuleForm] = useState({ name: "", role: "Leasing Agent", state: "CA", courseId: "", learningPathId: "", targetKind: "plan", enrollment_target: "all", groupIds: [], dueDays: 30, matchMode: "group" });
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [ruleEditForm, setRuleEditForm] = useState({ name: "", groupIds: [], dueDays: 30, enrollment_target: "all" });
  const [ruleEditSaving, setRuleEditSaving] = useState(false);
  const [scormUpload, setScormUpload] = useState({ courseId: "", file: null });
  const [managerAssign, setManagerAssign] = useState({ userId: "", courseId: "", dueDays: 14 });

  // Admin sub-tab and new feature state
  const [adminSubTab, setAdminSubTab] = useState("content");
  const [contentTab, setContentTab] = useState("custom");
  const [learningPlansTab, setLearningPlansTab] = useState("my");
  const [adminContent, setAdminContent] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [addMemberUserId, setAddMemberUserId] = useState("");
  const [progress, setProgress] = useState([]);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [progressStatusFilter, setProgressStatusFilter] = useState("all");
  const [progressSourceFilter, setProgressSourceFilter] = useState("all");
  const [courseUsers, setCourseUsers] = useState([]);
  const [customCourseForm, setCustomCourseForm] = useState({ title: "", description: "", category: "General", type: "scorm", durationMinutes: 30 });
  const [customUpload, setCustomUpload] = useState({ courseId: "", file: null, uploading: false });

  // Assign wizard state
  const [assignStep, setAssignStep] = useState(1);
  const [assignKind, setAssignKind] = useState("courses"); // "courses" | "plans"
  const [assignCourseIds, setAssignCourseIds] = useState([]);
  const [assignLearningPathIds, setAssignLearningPathIds] = useState([]);
  const [assignUserIds, setAssignUserIds] = useState([]);
  const [assignGroupIds, setAssignGroupIds] = useState([]);
  const [assignDueDays, setAssignDueDays] = useState(14);
  const [assignDueMode, setAssignDueMode] = useState("relative");
  const [assignDueDate, setAssignDueDate] = useState("");
  const [assignTargetTab, setAssignTargetTab] = useState("users");
  const [assignCourseSearch, setAssignCourseSearch] = useState("");
  const [assignCourseCategory, setAssignCourseCategory] = useState("All");

  // Nudge state
  const [nudgeSelected, setNudgeSelected] = useState([]);
  const [nudgeMessage, setNudgeMessage] = useState("");

  // Policy Management state
  const [adminPolicies, setAdminPolicies] = useState([]);
  const [policyCompliance, setPolicyCompliance] = useState([]);
  const [policyComplianceUsers, setPolicyComplianceUsers] = useState([]);
  const [expandedPolicy, setExpandedPolicy] = useState(null);
  const [policyView, setPolicyView] = useState("list");
  const [policyForm, setPolicyForm] = useState({ title: "", category: "Compliance", contentHtml: "", effectiveDate: "", scheduleType: "fixed", recurrenceMonths: 12, anchor: "effective_date", gracePeriodDays: 30, onboardingDeadlineDays: 30, scopeType: "company", scopeValue: [] });
  const [policyContentMode, setPolicyContentMode] = useState("file");
  const [policyFile, setPolicyFile] = useState(null);
  const [policyUploading, setPolicyUploading] = useState(false);
  const [ackModal, setAckModal] = useState(null);
  const [ackChecked, setAckChecked] = useState(false);
  const [showCompletedPolicies, setShowCompletedPolicies] = useState(false);

  // Sparks state
  const [sparksFeed, setSparksFeed] = useState([]);
  // Credentials tab sub-view (Training R2 decision #5): learner Certifications tab
  // renamed to "Credentials" with two sub-views - Certifications (multi-course programs)
  // and Certificates (per-course auto-issued documents).
  const [credentialsSubTab, setCredentialsSubTab] = useState("certifications");
  const [currentSpark, setCurrentSpark] = useState(0);
  const [sparkStep, setSparkStep] = useState(0);
  const [sparkFilter, setSparkFilter] = useState("to-watch");
  const [adminSparks, setAdminSparks] = useState([]);
  const [sparkRules, setSparkRules] = useState([]);
  const [sparkCreateMode, setSparkCreateMode] = useState(null);
  const [learningPaths, setLearningPaths] = useState([]);
  const [myLearningPlansLive, setMyLearningPlansLive] = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);
  const [lpForm, setLpForm] = useState({ title: "", description: "", target_role: "", enrollment_mode: "catalog_only" });
  const [lpEditing, setLpEditing] = useState(false);
  const [lpEditForm, setLpEditForm] = useState({ title: "", description: "", target_role: "", enrollment_mode: "catalog_only" });
  const [lpCourseList, setLpCourseList] = useState([]);
  const [lpCourseSearch, setLpCourseSearch] = useState("");
  const [lpCourseCategory, setLpCourseCategory] = useState("");
  const [lpCourseSelected, setLpCourseSelected] = useState([]);
  const [discoveryCourses, setDiscoveryCourses] = useState([]);
  const [catalogVertical, setCatalogVertical] = useState("All");
  const [enablementCal, setEnablementCal] = useState({ recurring: [], policy_deadlines: [], publisher_events: [] });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [releaseFilter, setReleaseFilter] = useState("all");
  const [verticalFilter, setVerticalFilter] = useState("");
  const [gamProfile, setGamProfile] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const [gamDrawerOpen, setGamDrawerOpen] = useState(false);
  const [auditLog, setAuditLog] = useState({ rows: [], total: 0 });
  const [auditFilters, setAuditFilters] = useState({});
  const [scheduledReports, setScheduledReports] = useState([]);
  const [reportForm, setReportForm] = useState({ report_type: "completion_summary", frequency: "weekly", recipients: "", config: {} });
  const [contextualTriggers, setContextualTriggers] = useState([]);
  const [triggerFires, setTriggerFires] = useState([]);
  const [simulateForm, setSimulateForm] = useState({ open: false, eventType: "new_feature", userId: "", busy: false, error: "" });
  const [triggerForm, setTriggerForm] = useState({ trigger_type: "first_encounter", trigger_label: "", description: "", target_content_type: "course", target_content_id: "", target_roles: [], target_group_ids: [], enabled: true, enforcement_mode: "suggest", workflow_key: "", pass_threshold: null, grace_period_days: 0, block_message: "", bypass_roles: [], recertification_interval_days: null, priority: 0, tooltip_text: "" });
  const [dapSubTab, setDapSubTab] = useState("gates");
  const [dapDashboardData, setDapDashboardData] = useState(null);
  const [dapComplianceData, setDapComplianceData] = useState(null);
  const [dapExceptionsData, setDapExceptionsData] = useState([]);
  const [dapWalkthroughsList, setDapWalkthroughsList] = useState([]);
  const [dapEditingTrigger, setDapEditingTrigger] = useState(null);
  const [activeWorkflow, setActiveWorkflow] = useState(null);
  const [dapGateResult, setDapGateResult] = useState(null);
  const [dapActiveWalkthrough, setDapActiveWalkthrough] = useState(null);
  const [dapWalkthroughStepsList, setDapWalkthroughStepsList] = useState([]);
  const [dapWalkthroughStep, setDapWalkthroughStep] = useState(0);
  const [dapShowGateOverlay, setDapShowGateOverlay] = useState(false);
  const [dapExceptionReason, setDapExceptionReason] = useState("");
  const [dapSimulatedTrainingComplete, setDapSimulatedTrainingComplete] = useState(false);
  const [whatsNewReleases, setWhatsNewReleases] = useState([]);
  const [whatsNewReadIds, setWhatsNewReadIds] = useState(new Set());
  const [whatsNewUnread, setWhatsNewUnread] = useState(0);
  const [whatsNewAreaFilter, setWhatsNewAreaFilter] = useState("all");
  const [whatsNewTypeFilter, setWhatsNewTypeFilter] = useState("all");
  const [whatsNewSearch, setWhatsNewSearch] = useState("");
  const [whatsNewLoading, setWhatsNewLoading] = useState(false);
  const [whatsNewCompanyTrack, setWhatsNewCompanyTrack] = useState("standard");
  const [whatsNewTrackFilter, setWhatsNewTrackFilter] = useState("all");
  const [whatsNewExpanded, setWhatsNewExpanded] = useState({});
  const [contentVisibility, setContentVisibility] = useState([]);
  const [brandKit, setBrandKit] = useState(null);
  const [brandKitForm, setBrandKitForm] = useState({ logo_url: "", primary_color: "#2563eb", secondary_color: "#1e40af", accent_color: "#f59e0b", greeting_text: "" });
  const [migrationStep, setMigrationStep] = useState(0);
  const [migrationValidation, setMigrationValidation] = useState(null);
  const [migrationResult, setMigrationResult] = useState(null);
  const [verticals, setVerticals] = useState([]);
  const [certPrograms, setCertPrograms] = useState([]);
  const [certProgramForm, setCertProgramForm] = useState({ title: "", description: "", type: "custom", expiry_months: 12, min_passing_score: 80 });
  const [selectedCertProgram, setSelectedCertProgram] = useState(null);
  const [certProgramProgress, setCertProgramProgress] = useState(null);
  const [myCertifications, setMyCertifications] = useState([]);
  const [myJourney, setMyJourney] = useState(null);

  const [sparkForm, setSparkForm] = useState({ title: "", description: "", category: "Leasing", source: "uploaded", contentType: "video", durationSeconds: 120, tags: [] });
  const [captureSteps, setCaptureSteps] = useState([]);
  const [captureStep, setCaptureStep] = useState({ title: "", description: "", action: "click" });
  const [isRecording, setIsRecording] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [sparkRuleForm, setSparkRuleForm] = useState({ name: "", metric: "close_rate", operator: "less_than", threshold: 70, targetRoles: [], sparkIds: [] });
  const [previewSpark, setPreviewSpark] = useState(null);
  const [workflowCourse, setWorkflowCourse] = useState(null);

  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const initialTabAppliedRef = useRef(false);
  const tourAutoScheduleRef = useRef(false);
  const skipAutoTourRef = useRef(false);
  const sparkVideoShellRef = useRef(null);
  const [sparkVideoFullscreen, setSparkVideoFullscreen] = useState(false);

  const isAdmin = user?.role === "Admin";
  const isManager = ["Admin", "Regional VP", "Property Manager", "Community Manager"].includes(user?.role);
  const isElite = tier === "elite";
  const canViewCompliance = isElite && (isAdmin || user?.role === "Regional VP");

  function isSurfaceVisible(surface) {
    const setting = contentVisibility.find(s => s.surface === surface);
    if (!setting) return true;
    if (!setting.enabled) return false;
    if (!setting.min_role) return true;
    if (setting.min_role === "admin") return isAdmin;
    if (setting.min_role === "manager") return isManager;
    return true;
  }
  const userLocale = user?.locale || "en";
  const t = useMemo(() => makeT(userLocale), [userLocale]);

  const BASIC_TABS = new Set(["my-learning", "catalog", "team", "overview", "analytics", "certifications"]);
  const BASIC_ADMIN_TABS = new Set(["assign", "progress"]);
  useEffect(() => {
    if (tier === "basic") {
      if (!BASIC_TABS.has(trainingTab)) setTrainingTab("my-learning");
      if (!BASIC_ADMIN_TABS.has(adminSubTab)) setAdminSubTab("assign");
      if (catalogSource === "custom") setCatalogSource("All");
    }
  }, [tier]);

  const showToast = useCallback((message, type = "") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);

  useEffect(() => { if (token) boot(); }, [token]);
  useEffect(() => {
    if (!user) return;
    if (tourActive) return;
    if (initialTabAppliedRef.current) return;
    initialTabAppliedRef.current = true;
    if (user.role === "Admin") setTrainingTab("overview");
    else if (["Regional VP", "Property Manager", "Community Manager"].includes(user.role)) setTrainingTab("team");
    else setTrainingTab("my-learning");
  }, [user, tourActive]);

  const tourSteps = useMemo(() => {
    if (!user?.role) return WALKTHROUGH_STEPS.learner;
    return WALKTHROUGH_STEPS[getTourProfile(user.role)] || WALKTHROUGH_STEPS.learner;
  }, [user?.role]);

  useEffect(() => {
    if (!tourActive || !user) return;
    const s = tourSteps[tourStep];
    if (!s) return;
    setMode("training");
    if (s.trainingTab) setTrainingTab(s.trainingTab);
    if (s.adminSubTab && s.trainingTab === "overview") setAdminSubTab(s.adminSubTab);
  }, [tourActive, tourStep, user, tourSteps]);

  useEffect(() => {
    if (!tourActive || !user) return;
    const s = tourSteps[tourStep];
    if (!s?.scrollTo) return;
    const t = window.setTimeout(() => {
      if (s.scrollTo === "policies") {
        document.getElementById("tour-policies-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 120);
    return () => window.clearTimeout(t);
  }, [tourActive, tourStep, user, tourSteps]);

  useEffect(() => {
    if (!user?.id || !token || !user?.role) return;
    if (isTourCompleted(user.role, user.id)) return;
    if (tourAutoScheduleRef.current) return;
    tourAutoScheduleRef.current = true;
    const t = window.setTimeout(() => {
      if (isTourCompleted(user.role, user.id)) return;
      if (skipAutoTourRef.current) return;
      setTourActive(true);
      setTourStep(0);
    }, 500);
    return () => {
      window.clearTimeout(t);
      tourAutoScheduleRef.current = false;
    };
  }, [user?.id, user?.role, token]);

  async function boot() {
    setLoading(true); setError("");
    try {
      const me = await apiRequest("/api/me", {}, token);
      setUser(me);
      const [courses, enrollments, certificates, policies] = await Promise.all([
        apiRequest("/api/courses", {}, token), apiRequest("/api/enrollments", {}, token),
        apiRequest("/api/certifications", {}, token), apiRequest("/api/policies/me", {}, token)
      ]);
      const nd = { courses, enrollments, certificates, policies, team: [], teamOverdue: [], adminSummary: null, complianceGaps: [], rules: [] };
      if (["Admin", "Regional VP", "Property Manager", "Community Manager"].includes(me.role)) {
        const [team, teamOverdue] = await Promise.all([apiRequest("/api/manager/team", {}, token).catch(() => []), apiRequest("/api/manager/team-overdue", {}, token).catch(() => [])]);
        nd.team = team; nd.teamOverdue = teamOverdue;
      }
      if (["Admin", "Regional VP"].includes(me.role)) {
        const [adminSummary, complianceGaps, rules] = await Promise.all([apiRequest("/api/admin/summary", {}, token), apiRequest("/api/compliance/gaps", {}, token), apiRequest("/api/assignment-rules", {}, token).catch(() => [])]);
        nd.adminSummary = adminSummary; nd.complianceGaps = complianceGaps; nd.rules = rules;
      }
      setData(nd);
      if (!ruleForm.courseId && courses[0]) { setRuleForm((o) => ({ ...o, courseId: courses[0].id })); setScormUpload((o) => ({ ...o, courseId: courses[0].id })); setManagerAssign((o) => ({ ...o, courseId: courses[0].id })); }
      loadGamProfile();
      loadAllBadges();
      loadMyJourney();
      loadVerticals();
      loadMyCertPrograms();
      fetchWhatsNewUnread(t).then(r => setWhatsNewUnread(r.count)).catch(() => {});
      fetchContentVisibility(t).then(setContentVisibility).catch(() => {});
    } catch (e) { if (String(e.message || "").toLowerCase().includes("invalid token")) logout(); setError(e.message); } finally { setLoading(false); }
  }

  async function login(ev) { ev.preventDefault(); setLoading(true); setError(""); try { const r = await apiRequest("/api/auth/login", { method: "POST", body: JSON.stringify(loginForm) }); localStorage.setItem("academy_token", r.token); setToken(r.token); } catch (e) { setError(e.message); } finally { setLoading(false); } }
  function logout() {
    initialTabAppliedRef.current = false;
    tourAutoScheduleRef.current = false;
    skipAutoTourRef.current = false;
    setTourActive(false);
    setTourStep(0);
    localStorage.removeItem("academy_token");
    setToken("");
    setUser(null);
    setLaunch({ enrollmentId: null, title: "", url: "", courseId: null, type: null });
    setPlayerSlide(0);
    setData({ courses: [], enrollments: [], certificates: [], policies: [], team: [], teamOverdue: [], adminSummary: null, complianceGaps: [], rules: [] });
  }

  const dismissTour = useCallback((markAutoDone) => {
    if (markAutoDone && user?.role) {
      localStorage.setItem(tourCompletedKey(user.role), "1");
      if (user.id) localStorage.removeItem(`${TOUR_LEGACY_PREFIX}:${user.id}`);
    }
    setTourActive(false);
    setTourStep(0);
  }, [user?.id, user?.role]);

  const openTour = useCallback(() => {
    skipAutoTourRef.current = true;
    setTourStep(0);
    setTourActive(true);
  }, []);

  async function loadLeaderboard() { try { setLeaderboardData(await fetchLeaderboard(token)); } catch {} }
  async function loadCategoryTree() { try { setCategoryTree(await fetchCategories(token)); } catch {} }
  async function loadCuratedPlans() { try { setCuratedPlans(await fetchCuratedPlans(token)); } catch {} }
  async function loadAllBadges() { try { setAllBadges(await fetchAllBadges(token)); } catch {} }
  async function loadGamProfile() { try { setGamProfile(await fetchGamificationProfile(token)); } catch {} }
  async function loadAuditLog(params = {}) { try { setAuditLog(await fetchAuditLog(token, params)); } catch {} }
  async function loadScheduledReports() { try { setScheduledReports(await fetchScheduledReports(token)); } catch {} }
  async function loadContextualTriggers() { try { setContextualTriggers(await fetchContextualTriggers(token)); } catch {} }
  async function loadTriggerFires() { try { setTriggerFires(await fetchTriggerFires(token)); } catch {} }
  async function runSimulateEvent() {
    if (simulateForm.busy) return;
    setSimulateForm((s) => ({ ...s, busy: true, error: "" }));
    try {
      const payload = {};
      if (simulateForm.userId) payload.user_id = simulateForm.userId;
      payload.simulated = true;
      const r = await simulateTriggerEvent(token, simulateForm.eventType, payload);
      showToast(`Fired: ${r.matched} trigger${r.matched === 1 ? "" : "s"} matched`, "success");
      await loadTriggerFires();
      setSimulateForm((s) => ({ ...s, busy: false }));
    } catch (e) {
      setSimulateForm((s) => ({ ...s, busy: false, error: e.message }));
    }
  }
  async function loadDapDashboard() { try { setDapDashboardData(await dapAdminDashboard(token)); } catch {} }
  async function loadDapCompliance() { try { setDapComplianceData(await dapAdminCompliance(token)); } catch {} }
  async function loadDapExceptions() { try { setDapExceptionsData(await dapAdminExceptions(token)); } catch {} }
  async function loadDapWalkthroughs() { try { setDapWalkthroughsList(await dapAdminWalkthroughs(token)); } catch {} }

  async function loadWhatsNew({ area, type, search, track } = {}) {
    setWhatsNewLoading(true);
    try {
      const [data, readIds, unread] = await Promise.all([
        fetchWhatsNew(token, { productArea: area || whatsNewAreaFilter, updateType: type || whatsNewTypeFilter, search: search !== undefined ? search : whatsNewSearch, track: track !== undefined ? track : whatsNewTrackFilter }),
        fetchWhatsNewReadIds(token),
        fetchWhatsNewUnread(token),
      ]);
      setWhatsNewReleases(data.releases || []);
      setWhatsNewCompanyTrack(data.company_track || "standard");
      setWhatsNewReadIds(new Set(readIds));
      setWhatsNewUnread(unread.count);
      if (data.releases?.length > 0 && Object.keys(whatsNewExpanded).length === 0) {
        setWhatsNewExpanded({ [data.releases[0].id]: true });
      }
    } catch {} finally { setWhatsNewLoading(false); }
  }

  async function handleMarkUpdateRead(id) {
    try {
      await markUpdateRead(token, id);
      setWhatsNewReadIds(prev => new Set([...prev, id]));
      setWhatsNewUnread(prev => Math.max(0, prev - 1));
    } catch {}
  }

  async function handleMarkAllRead() {
    try {
      await markAllUpdatesRead(token);
      const allIds = whatsNewReleases.flatMap(r => (r.updates || []).map(u => u.id));
      setWhatsNewReadIds(new Set(allIds));
      setWhatsNewUnread(0);
    } catch {}
  }

  async function loadContentVisibility() { try { setContentVisibility(await fetchContentVisibility(token)); } catch {} }

  async function handleVisibilityToggle(surface, enabled, minRole) {
    try {
      await updateContentVisibility(token, surface, enabled, minRole);
      await loadContentVisibility();
      showToast("Visibility updated", "success");
    } catch { showToast("Failed to update visibility", "error"); }
  }
  async function enterWorkflow(workflowKey) {
    setActiveWorkflow(workflowKey);
    setDapSimulatedTrainingComplete(false);
    try {
      const result = await dapCheck(token, workflowKey);
      setDapGateResult(result);
      if (!result.allowed && result.gates.length) {
        setDapShowGateOverlay(true);
      } else if (result.walkthroughs.length) {
        const wt = result.walkthroughs[0];
        const steps = await dapWalkthroughSteps(token, wt.id);
        setDapActiveWalkthrough(wt);
        setDapWalkthroughStepsList(steps);
        setDapWalkthroughStep(0);
        await dapLogEvent(token, { event_type: "walkthrough_started", workflow_key: workflowKey, metadata: { walkthrough_id: wt.id } });
      }
    } catch (e) { console.error("DAP check failed:", e); setDapGateResult({ allowed: true, gates: [], walkthroughs: [], tips: [], grace_banners: [] }); }
  }
  async function loadBrandKit() { try { const bk = await fetchBrandKit(token); setBrandKit(bk); setBrandKitForm({ logo_url: bk.logo_url || "", primary_color: bk.primary_color || "#2563eb", secondary_color: bk.secondary_color || "#1e40af", accent_color: bk.accent_color || "#f59e0b", greeting_text: bk.greeting_text || "" }); } catch {} }
  async function loadCertPrograms() { try { setCertPrograms(await fetchCertPrograms(token)); } catch {} }
  async function loadMyCertPrograms() { try { setMyCertifications(await fetchMyCertifications(token)); } catch {} }
  async function loadMyJourney() { try { const r = await fetchMyJourney(token); setMyJourney(r.journey || null); } catch {} }
  async function loadVerticals() { try { setVerticals(await fetchVerticals(token)); } catch {} }

  async function createCourse(ev) { ev.preventDefault(); try { await apiRequest("/api/courses", { method: "POST", body: JSON.stringify(courseForm) }, token); await boot(); setCourseForm({ title: "", category: "Compliance", type: "scorm", durationMinutes: 30 }); showToast("Course created", "success"); } catch (e) { setError(e.message); } }
  async function uploadScorm(ev) { ev.preventDefault(); if (!scormUpload.courseId || !scormUpload.file) return; const fd = new FormData(); fd.append("scorm", scormUpload.file); try { const r = await fetch(`${API_BASE}/api/courses/${scormUpload.courseId}/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd }); if (!r.ok) { const p = await r.json(); throw new Error(p.error); } await boot(); showToast("SCORM uploaded", "success"); } catch (e) { setError(e.message); } }
  async function launchEnrollment(enrollment) {
    try {
      await apiRequest(`/api/enrollments/${enrollment.id}/start`, { method: "POST" }, token);
    } catch { /* already in progress is fine */ }
    if (enrollment.source === "recorded" && enrollment.video_url) {
      try {
        const wf = await apiRequest(`/api/courses/${enrollment.course_id}/workflow`, {}, token);
        setWorkflowCourse({ ...wf, _enrollmentId: enrollment.id });
        return;
      } catch { /* fall through to default player */ }
    }
    setPlayerSlide(0);
    const hasRealScorm = Boolean(enrollment.scorm_package_id);
    const rawType = enrollment.type || "slides";
    const launchType = rawType === "scorm" && !hasRealScorm ? "slides" : rawType;
    setLaunch({ enrollmentId: enrollment.id, title: enrollment.title, url: "", courseId: enrollment.course_id, type: launchType });
    await boot();
  }
  function openCatalogPreview(course) {
    setCatalogPreview(course);
  }
  async function launchFromCatalog(course) {
    setCatalogPreview(null);
    try {
      const result = await selfEnroll(course.id);
      await boot();
    } catch { /* already enrolled is fine */ }
    const enrollments = await apiRequest("/api/enrollments", {}, token);
    const enrollment = enrollments.find(e => e.course_id === course.id && e.status !== "completed");
    if (enrollment) {
      try { await apiRequest(`/api/enrollments/${enrollment.id}/start`, { method: "POST" }, token); } catch {}
      if (course.source === "recorded" && course.video_url) {
        try {
          const wf = await apiRequest(`/api/courses/${course.id}/workflow`, {}, token);
          setWorkflowCourse({ ...wf, _enrollmentId: enrollment.id });
          return;
        } catch { /* fall through */ }
      }
      setPlayerSlide(0);
      const hasRealScorm = Boolean(enrollment.scorm_package_id || course.scorm_package_id);
      const rawType = course.type || "slides";
      const launchType = rawType === "scorm" && !hasRealScorm ? "slides" : rawType;
      setLaunch({ enrollmentId: enrollment.id, title: course.title, url: "", courseId: course.id, type: launchType });
      await boot();
    } else {
      showToast("Enrolled! Check My Learning to launch.", "success");
    }
  }
  function closePlayer() { setLaunch({ enrollmentId: null, title: "", url: "", courseId: null, type: null }); setPlayerSlide(0); setCourseQuiz(null); setQuizState({ open: false, loading: false, quiz: null, questions: [], answers: {}, result: null, error: "" }); }

  async function openQuiz() {
    if (!courseQuiz?.id) return;
    setQuizState({ open: true, loading: true, quiz: null, questions: [], answers: {}, result: null, error: "" });
    try {
      const q = await fetchQuizForAttempt(token, courseQuiz.id);
      setQuizState({ open: true, loading: false, quiz: q.quiz, questions: q.questions, answers: {}, result: null, error: "" });
    } catch (e) {
      setQuizState({ open: true, loading: false, quiz: null, questions: [], answers: {}, result: null, error: e.message || "Could not start quiz" });
    }
  }

  async function submitQuiz() {
    if (!quizState.quiz) return;
    setQuizState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const result = await submitQuizAttempt(token, quizState.quiz.id, quizState.answers, launch.enrollmentId);
      setQuizState((s) => ({ ...s, loading: false, result }));
      if (result.passed) {
        const refresh = await fetchCourseQuiz(token, launch.courseId);
        setCourseQuiz(refresh.quiz);
        loadGamProfile();
      }
    } catch (e) {
      setQuizState((s) => ({ ...s, loading: false, error: e.message || "Submit failed" }));
    }
  }

  function closeQuiz() {
    setQuizState({ open: false, loading: false, quiz: null, questions: [], answers: {}, result: null, error: "" });
  }

  async function markComplete() {
    if (!launch.enrollmentId) return;
    const completedTitle = launch.title;
    try {
      await apiRequest(`/api/scorm/${launch.enrollmentId}/finish`, { method: "POST", body: JSON.stringify({ score: 95, completionStatus: "completed", timeSpentSeconds: 1800 }) }, token);
      closePlayer();
      await boot();
      loadMyLearningPlans();
      const certs = await apiRequest("/api/certificates/mine", {}, token);
      const newCert = certs.find(c => c.course_title === completedTitle);
      if (newCert) {
        setCompletionCert(newCert);
      } else {
        showToast("Course completed! Certificate issued.", "success");
      }
    } catch (e) {
      if (String(e.message || "").toLowerCase().includes("quiz")) {
        showToast("Pass the course quiz to finish this course.", "warning");
        openQuiz();
      } else {
        setError(e.message);
      }
    }
  }
  const playerContent = useMemo(() => COURSE_CONTENT[launch.title] || DEFAULT_CONTENT, [launch.title]);

  useEffect(() => {
    if (!launch.courseId || !token) { setCourseQuiz(null); return; }
    let cancelled = false;
    fetchCourseQuiz(token, launch.courseId)
      .then((r) => { if (!cancelled) setCourseQuiz(r.quiz || null); })
      .catch(() => { if (!cancelled) setCourseQuiz(null); });
    return () => { cancelled = true; };
  }, [launch.courseId, token]);

  useEffect(() => {
    if (!catalogPreview?.id || !token) { setCatalogReviews({ loading: false, items: [] }); return; }
    let cancelled = false;
    setCatalogReviews({ loading: true, items: [] });
    fetchCourseReviews(token, catalogPreview.id)
      .then((rows) => { if (!cancelled) setCatalogReviews({ loading: false, items: Array.isArray(rows) ? rows : [] }); })
      .catch(() => { if (!cancelled) setCatalogReviews({ loading: false, items: [] }); });
    return () => { cancelled = true; };
  }, [catalogPreview?.id, token]);

  useEffect(() => {
    if (completionCert) setCompletionReview({ rating: 0, comment: "", submitted: false, submitting: false });
  }, [completionCert?.id]);

  useEffect(() => {
    function onBip(e) { e.preventDefault(); setInstallEvent(e); }
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  function dismissInstallBanner() {
    localStorage.setItem("academy_install_dismissed", "1");
    setInstallBannerDismissed(true);
  }

  async function triggerInstall() {
    if (!installEvent) return;
    try {
      installEvent.prompt();
      await installEvent.userChoice;
    } catch {}
    setInstallEvent(null);
    dismissInstallBanner();
  }

  async function loadNotifications() {
    if (!token) return;
    try {
      const data = await fetchMyNotifications(token);
      setNotifications({ items: Array.isArray(data?.items) ? data.items : [], unread: Number(data?.unread) || 0 });
    } catch {}
  }

  useEffect(() => {
    if (!token) return;
    loadNotifications();
    const h = setInterval(loadNotifications, 60000);
    return () => clearInterval(h);
  }, [token]);

  async function openNotifDrawer() {
    setNotifDrawerOpen(true);
    if (!token) return;
    try {
      await markAllNotificationsRead(token);
      setNotifications((o) => ({ ...o, items: o.items.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })), unread: 0 }));
    } catch {}
  }

  async function submitCompletionReview() {
    if (!completionCert?.course_id || !completionReview.rating) return;
    setCompletionReview((o) => ({ ...o, submitting: true }));
    try {
      await submitCourseReview(token, completionCert.course_id, completionReview.rating, completionReview.comment || null);
      setCompletionReview((o) => ({ ...o, submitting: false, submitted: true }));
      showToast("Thanks for the feedback!", "success");
    } catch (e) {
      setCompletionReview((o) => ({ ...o, submitting: false }));
      setError(e.message);
    }
  }
  const isLastSlide = playerSlide >= playerContent.length - 1;
  async function createRule(ev) {
    ev.preventDefault();
    try {
      const body = {
        name: ruleForm.name,
        enrollment_target: ruleForm.enrollment_target,
        dueDays: Number(ruleForm.dueDays) || 30,
      };
      if (ruleForm.matchMode === "group") {
        if (!ruleForm.groupIds?.length) { setError("Pick at least one group"); return; }
        body.groupIds = ruleForm.groupIds;
        body.criteria = {};
      } else {
        body.criteria = { roles: [ruleForm.role], states: [ruleForm.state] };
      }
      if (ruleForm.targetKind === "plan") {
        if (!ruleForm.learningPathId) { setError("Pick a learning plan"); return; }
        body.learningPathIds = [ruleForm.learningPathId];
      } else {
        if (!ruleForm.courseId) { setError("Pick a course"); return; }
        body.courseIds = [ruleForm.courseId];
      }
      const res = await apiRequest("/api/assignment-rules", { method: "POST", body: JSON.stringify(body) }, token);
      setRuleForm((o) => ({ ...o, name: "", groupIds: [], courseId: "", learningPathId: "" }));
      // Auto-run the rule so admins see retroactive enrollment right away (matches training feedback).
      if (res?.id) {
        try {
          const runResult = await apiRequest(`/api/assignment-rules/${res.id}/execute`, { method: "POST" }, token);
          showToast(`Rule created. ${runResult.created || 0} enrollments created for existing members.`, "success");
        } catch {
          showToast("Rule created", "success");
        }
      } else {
        showToast("Rule created", "success");
      }
      await boot();
    } catch (e) { setError(e.message); }
  }
  async function executeRule(id) { try { const r = await apiRequest(`/api/assignment-rules/${id}/execute`, { method: "POST" }, token); await boot(); showToast(`${r.created} enrollments created`, "success"); } catch (e) { setError(e.message); } }
  function openRuleEdit(rule) {
    const dueDays = (rule.learning_paths?.[0]?.due_days) ?? (rule.courses?.[0]?.due_days) ?? 30;
    setRuleEditForm({
      name: rule.name || "",
      groupIds: (rule.groups || []).map(g => g.id),
      dueDays: Number(dueDays) || 30,
      enrollment_target: rule.enrollment_target || "all",
    });
    setEditingRuleId(rule.id);
  }
  function cancelRuleEdit() { setEditingRuleId(null); setRuleEditSaving(false); }
  async function saveRuleEdit(id) {
    if (!ruleEditForm.name.trim()) { setError("Rule name is required"); return; }
    setRuleEditSaving(true);
    try {
      await apiRequest(`/api/assignment-rules/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: ruleEditForm.name.trim(),
          groupIds: ruleEditForm.groupIds,
          dueDays: Number(ruleEditForm.dueDays) || 30,
          enrollment_target: ruleEditForm.enrollment_target,
        }),
      }, token);
      setEditingRuleId(null);
      await boot();
      showToast("Rule updated", "success");
    } catch (e) { setError(e.message); }
    finally { setRuleEditSaving(false); }
  }
  async function deleteRule(id) {
    if (!confirm("Delete this enrollment rule? Existing enrollments created by it will remain.")) return;
    try {
      await apiRequest(`/api/assignment-rules/${id}`, { method: "DELETE" }, token);
      await boot();
      showToast("Rule deleted", "success");
    } catch (e) { setError(e.message); }
  }
  async function acknowledgePolicy(id) { await handleAcknowledge(id); }
  async function downloadCsv() { try { const csv = await apiRequest("/api/export/compliance", {}, token); const b = new Blob([csv], { type: "text/csv" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = "compliance-report.csv"; a.click(); URL.revokeObjectURL(u); showToast("Downloaded", "success"); } catch (e) { setError(e.message); } }
  async function nudge(uid) { try { await apiRequest("/api/manager/nudge", { method: "POST", body: JSON.stringify({ userId: uid }) }, token); showToast("Reminder sent", "success"); } catch (e) { setError(e.message); } }
  async function assignCourse(ev) { ev.preventDefault(); try { await apiRequest("/api/manager/assign", { method: "POST", body: JSON.stringify({ userId: managerAssign.userId, courseId: managerAssign.courseId, dueDays: Number(managerAssign.dueDays || 14) }) }, token); await boot(); setManagerAssign((o) => ({ ...o, userId: "" })); showToast("Course assigned", "success"); } catch (e) { setError(e.message); } }
  async function loadTeamDetail(userId) { try { const d = await apiRequest(`/api/manager/team/${userId}/detail`, {}, token); setTeamDetailData(d); setTeamDetailUser(userId); } catch (e) { setError(e.message); } }
  async function loadTeamAnalytics() { try { const d = await apiRequest("/api/manager/team/analytics", {}, token); setTeamAnalytics(d); } catch (e) { setError(e.message); } }

  // Admin data loaders
  async function loadAdminContent() {
    try { const c = await fetchAdminContent(token); setAdminContent(c); } catch (e) { setError(e.message); }
  }
  async function loadGroups() {
    try { const g = await fetchGroups(token); setGroups(g); } catch (e) { setError(e.message); }
  }
  async function loadGroupMembers(gid) {
    try { const m = await fetchGroupMembers(token, gid); setGroupMembers(m); } catch (e) { setError(e.message); }
  }
  async function loadProgress() {
    try { const p = await fetchEnrollmentProgress(token); setProgress(p); } catch (e) { setError(e.message); }
  }
  async function loadCourseUsers(cid) {
    try { const u = await fetchCourseEnrollmentUsers(token, cid); setCourseUsers(u); } catch (e) { setError(e.message); }
  }

  useEffect(() => {
    if (!isAdmin || !token) return;
    loadAdminContent();
    loadGroups();
    loadProgress();
  }, [isAdmin, token]);

  useEffect(() => {
    if (selectedGroup) loadGroupMembers(selectedGroup);
  }, [selectedGroup]);

  async function handleCreateCustomCourse(ev) {
    ev.preventDefault();
    try {
      await createCustomCourse(token, customCourseForm);
      setCustomCourseForm({ title: "", description: "", category: "General", type: "scorm", durationMinutes: 30 });
      await loadAdminContent();
      await boot();
      showToast("Custom course created", "success");
    } catch (e) { setError(e.message); }
  }

  async function handleTogglePublish(id) {
    try { await toggleCoursePublished(token, id); await loadAdminContent(); await boot(); showToast("Publish status updated", "success"); } catch (e) { setError(e.message); }
  }

  async function handleDeleteCustomCourse(id) {
    try { await deleteCustomCourse(token, id); await loadAdminContent(); await boot(); showToast("Course deleted", "success"); } catch (e) { setError(e.message); }
  }

  async function handleScormUpload(ev) {
    ev.preventDefault();
    if (!customUpload.courseId || !customUpload.file) return;
    setCustomUpload((o) => ({ ...o, uploading: true }));
    try {
      await uploadScormPackage(token, customUpload.courseId, customUpload.file);
      setCustomUpload({ courseId: "", file: null, uploading: false });
      showToast("SCORM package uploaded", "success");
    } catch (e) { setCustomUpload((o) => ({ ...o, uploading: false })); setError(e.message); }
  }

  async function handleCreateGroup(ev) {
    ev.preventDefault();
    try { await createGroup(token, newGroupName); setNewGroupName(""); await loadGroups(); showToast("Group created", "success"); } catch (e) { setError(e.message); }
  }

  async function handleRemoveGroupMember(uid) {
    try { await removeGroupMember(token, selectedGroup, uid); await loadGroupMembers(selectedGroup); await loadGroups(); showToast("Member removed", "success"); } catch (e) { setError(e.message); }
  }

  async function handleAddGroupMembers(userIdsOverride) {
    const available = Array.isArray(userIdsOverride) && userIdsOverride.length
      ? userIdsOverride.map(id => ({ id }))
      : data.team.filter((m) => !groupMembers.find((gm) => gm.id === m.id));
    if (!available.length) { showToast("All team members are already in this group", ""); return; }
    try {
      const res = await addGroupMembers(token, selectedGroup, available.map((m) => m.id));
      await loadGroupMembers(selectedGroup); await loadGroups();
      const addedCount = res?.added ?? available.length;
      const autoCount = res?.auto_enrolled_count || 0;
      const ruleNames = (res?.triggered_rules || []).map(r => r.name);
      if (autoCount > 0 && ruleNames.length) {
        showToast(`Added ${addedCount} member${addedCount === 1 ? "" : "s"}. Auto-enrolled ${autoCount} course${autoCount === 1 ? "" : "s"} via rule${ruleNames.length > 1 ? "s" : ""}: ${ruleNames.join(", ")}.`, "success");
      } else {
        showToast(`${addedCount} member${addedCount === 1 ? "" : "s"} added`, "success");
      }
    } catch (e) { setError(e.message); }
  }

  async function handleBulkAssign() {
    try {
      const payload = {
        courseIds: assignKind === "courses" ? assignCourseIds : [],
        learningPathIds: assignKind === "plans" ? assignLearningPathIds : [],
        userIds: assignUserIds,
        groupIds: assignGroupIds,
      };
      if (assignDueMode === "absolute" && assignDueDate) {
        const ms = new Date(assignDueDate).getTime() - Date.now();
        payload.dueDays = Math.max(1, Math.ceil(ms / 86400000));
        payload.dueDate = assignDueDate;
      } else {
        payload.dueDays = assignDueDays;
      }
      const r = await bulkAssign(token, payload);
      showToast(`${r.created} enrollment${r.created !== 1 ? "s" : ""} created (${r.skippedDuplicates} duplicates skipped)`, "success");
      setAssignStep(1); setAssignKind("courses"); setAssignCourseIds([]); setAssignLearningPathIds([]); setAssignUserIds([]); setAssignGroupIds([]); setAssignDueDays(14); setAssignDueMode("relative"); setAssignDueDate(""); setAssignCourseSearch(""); setAssignCourseCategory("All");
      await boot(); await loadProgress();
    } catch (e) { setError(e.message); }
  }

  async function handleBulkNudge() {
    if (!nudgeSelected.length) return;
    try {
      await nudgeBulk(token, nudgeSelected, nudgeMessage || undefined);
      showToast(`Reminders sent to ${nudgeSelected.length} user${nudgeSelected.length !== 1 ? "s" : ""}`, "success");
      setNudgeSelected([]); setNudgeMessage("");
    } catch (e) { setError(e.message); }
  }

  // Policy data loaders
  async function loadAdminPolicies() {
    try { const p = await fetchAdminPolicies(token); setAdminPolicies(p); } catch (e) { setError(e.message); }
  }
  async function loadPolicyCompliance() {
    try { const p = await fetchPolicyCompliance(token); setPolicyCompliance(p); } catch (e) { setError(e.message); }
  }
  async function loadPolicyUsers(pid) {
    try { const u = await fetchPolicyComplianceUsers(token, pid); setPolicyComplianceUsers(u); } catch (e) { setError(e.message); }
  }

  useEffect(() => {
    if (!isAdmin || !token) return;
    loadAdminPolicies();
    loadPolicyCompliance();
  }, [isAdmin, token]);

  async function handleCreatePolicy(ev) {
    ev.preventDefault();
    try {
      setPolicyUploading(true);
      let fileData = {};
      if (policyContentMode === "file" && policyFile) {
        const uploaded = await uploadPolicyFile(token, policyFile);
        fileData = { filePath: uploaded.filePath, fileType: uploaded.fileType, fileOriginalName: uploaded.fileOriginalName, contentHtml: "" };
      }
      await createAdminPolicy(token, { ...policyForm, ...fileData });
      setPolicyForm({ title: "", category: "Compliance", contentHtml: "", effectiveDate: "", scheduleType: "fixed", recurrenceMonths: 12, anchor: "effective_date", gracePeriodDays: 30, onboardingDeadlineDays: 30, scopeType: "company", scopeValue: [] });
      setPolicyFile(null);
      setPolicyContentMode("file");
      setPolicyView("list");
      await loadAdminPolicies();
      await loadPolicyCompliance();
      showToast("Policy created" + (fileData.fileType ? ` (${fileData.fileOriginalName})` : ""), "success");
    } catch (e) { setError(e.message); } finally { setPolicyUploading(false); }
  }

  async function handleExecutePolicySchedule(pid) {
    try {
      const r = await executePolicySchedule(token, pid);
      showToast(`${r.created} assignment${r.created !== 1 ? "s" : ""} created (${r.usersInScope} users in scope)`, "success");
      await loadAdminPolicies();
      await loadPolicyCompliance();
    } catch (e) { setError(e.message); }
  }

  async function handleAcknowledge(policyId) {
    try {
      const r = await acknowledgeApi(token, policyId);
      setAckModal(null);
      setAckChecked(false);
      await boot();
      showToast(r.nextDueDate ? `Policy acknowledged. Next due: ${fD(r.nextDueDate)}` : "Policy acknowledged.", "success");
    } catch (e) { setError(e.message); }
  }

  // Sparks data loaders
  async function loadSparksFeed() {
    try { const f = await fetchSparksFeed(token); setSparksFeed(f); } catch (e) { console.error("Sparks feed:", e.message); showToast("Failed to load Spotlights feed", "error"); }
  }
  async function loadAdminSparks() {
    try { const s = await fetchAdminSparks(token); setAdminSparks(s); } catch (e) { console.error("Admin sparks:", e.message); showToast("Failed to load Spotlights", "error"); }
  }
  async function loadSparkRules() {
    try { const r = await fetchSparkRules(token); setSparkRules(r); } catch (e) { console.error("Spark rules:", e.message); showToast("Failed to load Spotlight rules", "error"); }
  }

  async function loadKbInstances() {
    try { const inst = await fetchAdminKbInstances(token); setKbInstances(inst); } catch (e) { console.error("KB instances:", e.message); showToast("Failed to load KB instances", "error"); }
  }
  async function loadKbRecentViews() {
    try { const views = await fetchKbRecentViews(token); setKbRecentViews(views); } catch (e) { console.error("KB recent views:", e.message); }
  }
  async function loadKbFavorites() {
    try { const favs = await fetchKbFavorites(token); setKbFavorites(favs); } catch (e) { console.error("KB favorites:", e.message); }
  }
  async function handleToggleKbFavorite(slug) {
    const isFav = kbFavorites.some(f => f.article_slug === slug);
    try {
      if (isFav) { await removeKbFavorite(token, slug); } else { await addKbFavorite(token, slug); }
      await loadKbFavorites();
    } catch (e) { showToast("Failed to update favorite", "error"); }
  }
  // Tracks how many article history entries we've stacked. Lets the in-app
  // "Back to articles" button collapse the full chain in one pop, while the
  // browser back button still walks through them one at a time.
  const articleHistoryDepth = useRef(0);

  async function handleOpenArticle(slugOrArticle) {
    // Accept either a slug string or a full article row (from infinite-scroll
    // results, popular rail, etc.) so every KB surface can call this. Every
    // caller ultimately resolves to ArticleViewer hitting /api/kb/articles/:slug
    // so the full 3,500-article corpus is accessible without any client-side
    // article table.
    const slug = typeof slugOrArticle === "string"
      ? slugOrArticle
      : (slugOrArticle?.slug || slugOrArticle?.article_slug || null);
    if (!slug) return;
    // Push a browser history entry so the back button closes the article
    // viewer and returns the user to the KB list, instead of escaping the
    // prototype entirely. URL stays the same -- we just stack a state entry.
    try {
      window.history.pushState({ kbArticle: slug }, "", window.location.href);
      articleHistoryDepth.current += 1;
    } catch {}
    setViewingArticle(slug);
    try { await trackKbView(token, slug); } catch (e) { /* silent */ }
  }

  function handleCloseArticle() {
    // Called by the in-app "Back to articles" button. Unlike the browser
    // back button (which walks through the chain one article at a time),
    // this should always jump straight back to the KB list even if the
    // user has chained through several linked articles. We collapse the
    // entire pushed stack in one history.go() call.
    const depth = articleHistoryDepth.current;
    if (depth > 0) {
      articleHistoryDepth.current = 0;
      window.history.go(-depth);
    } else {
      setViewingArticle(null);
      loadKbInstances();
      loadKbRecentViews();
    }
  }

  // Tie browser back/forward navigation to the article viewer state.
  useEffect(() => {
    function onPopState(e) {
      const s = e.state;
      if (!s || !s.kbArticle) {
        articleHistoryDepth.current = 0;
        setViewingArticle(null);
        loadKbInstances();
        loadKbRecentViews();
      } else {
        // Walking through the stack one step at a time (browser back/
        // forward). Decrement conservatively so the counter stays in sync.
        articleHistoryDepth.current = Math.max(0, articleHistoryDepth.current - 1);
        setViewingArticle(s.kbArticle);
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => { if (token && user) { loadSparksFeed(); loadMyLearningPlans(); loadCatalogLearningPlans(); loadKbInstances(); loadKbRecentViews(); loadKbFavorites(); loadCategoryTree(); } }, [token, user]);
  useEffect(() => { if (isAdmin && token) { loadAdminSparks(); loadSparkRules(); } }, [isAdmin, token]);

  async function loadLearningPaths() {
    try { const lp = await fetchLearningPaths(token); setLearningPaths(lp); } catch (e) { console.error("Learning plans:", e.message); showToast("Failed to load Learning Plans", "error"); }
  }
  async function loadMyLearningPlans() {
    try { const plans = await fetchMyLearningPlans(token); setMyLearningPlansLive(plans); } catch (e) { console.error("My learning plans:", e.message); showToast("Failed to load your learning plans", "error"); }
  }
  async function loadCatalogLearningPlans() {
    try { const plans = await fetchCatalogLearningPlans(token); setCatalogLearningPlans(plans); } catch (e) { console.error("Catalog learning plans:", e.message); showToast("Failed to load catalog plans", "error"); }
  }
  async function loadLearningPathDetail(id) {
    try {
      const lp = await fetchLearningPath(token, id);
      setSelectedPath(lp);
      setLpCourseList(lp.courses || []);
    } catch (e) { setError(e.message); }
  }
  async function loadEnablementCalendar() {
    try { const cal = await fetchEnablementCalendar(token); setEnablementCal(cal); } catch (e) { console.error("Enablement calendar:", e.message); showToast("Failed to load calendar", "error"); }
  }
  async function handleCreatePath(e) {
    e.preventDefault();
    try {
      const lp = await createLearningPath(token, lpForm);
      setLpForm({ title: "", description: "", target_role: "", enrollment_mode: "catalog_only" });
      await loadLearningPaths();
      loadLearningPathDetail(lp.id);
      loadMyLearningPlans();
      showToast("Learning plan created", "success");
    } catch (e) { setError(e.message); }
  }
  async function handleDeletePath(id) {
    if (!confirm("Delete this learning plan?")) return;
    try {
      await deleteLearningPath(token, id);
      setSelectedPath(null);
      await loadLearningPaths();
      loadMyLearningPlans();
      showToast("Learning plan deleted", "success");
    } catch (e) { setError(e.message); }
  }
  async function handleAddCourseToPath(courseId) {
    if (!selectedPath) return;
    try {
      await addLearningPathCourse(token, selectedPath.id, courseId);
      await loadLearningPathDetail(selectedPath.id);
      loadMyLearningPlans();
    } catch (e) { setError(e.message); }
  }
  async function handleRemoveCourseFromPath(courseId) {
    if (!selectedPath) return;
    try {
      await removeLearningPathCourse(token, selectedPath.id, courseId);
      await loadLearningPathDetail(selectedPath.id);
      loadMyLearningPlans();
    } catch (e) { setError(e.message); }
  }
  function handleMoveCourse(idx, dir) {
    const list = [...lpCourseList];
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    [list[idx], list[target]] = [list[target], list[idx]];
    setLpCourseList(list);
    reorderLearningPathCourses(token, selectedPath.id, list.map(c => c.id)).catch(() => {});
  }
  async function loadDiscoveryCatalog() {
    try { const d = await fetchDiscoveryCatalog(token); setDiscoveryCourses(d); } catch (e) { console.error("Discovery:", e.message); showToast("Failed to load discovery catalog", "error"); }
  }
  useEffect(() => { if (isAdmin && token) { loadLearningPaths(); loadDiscoveryCatalog(); } }, [isAdmin, token]);

  async function handleSparkView(sparkId) {
    try { await markSparkViewed(token, sparkId); } catch {}
  }
  async function handleSparkComplete(sparkId) {
    try { await markSparkComplete(token, sparkId); await loadSparksFeed(); showToast("Spark completed!", "success"); } catch (e) { setError(e.message); }
  }

  function toggleSparkFullscreen() {
    const el = sparkVideoShellRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      el.requestFullscreen?.().catch(() => {});
    }
  }

  useEffect(() => {
    const onFs = () => {
      const el = sparkVideoShellRef.current;
      setSparkVideoFullscreen(!!el && document.fullscreenElement === el);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  async function handleCreateSpark(ev) {
    ev.preventDefault();
    try {
      const s = await createSpark(token, { ...sparkForm, steps: captureSteps.length ? captureSteps : undefined });
      showToast("Spark created", "success");
      setSparkForm({ title: "", description: "", category: "Leasing", source: "uploaded", contentType: "video", durationSeconds: 120, tags: [] });
      setCaptureSteps([]); setSparkCreateMode(null);
      await loadAdminSparks();
    } catch (e) { setError(e.message); }
  }
  async function handleCaptureAddStep() {
    if (!captureStep.title) return;
    setCaptureSteps((p) => [...p, { ...captureStep }]);
    setCaptureStep({ title: "", description: "", action: "click" });
  }
  async function handleAiGenerate(sparkId) {
    setAiProcessing(true);
    try {
      await aiGenerateSpark(token, sparkId);
      await loadAdminSparks();
      showToast("AI-enhanced tutorial generated", "success");
    } catch (e) { setError(e.message); }
    setAiProcessing(false);
  }
  async function handleCreateSparkRule(ev) {
    ev.preventDefault();
    try {
      await createSparkRule(token, sparkRuleForm);
      setSparkRuleForm({ name: "", metric: "close_rate", operator: "less_than", threshold: 70, targetRoles: [], sparkIds: [] });
      await loadSparkRules();
      showToast("Rule created", "success");
    } catch (e) { setError(e.message); }
  }
  async function handleExecuteSparkRule(ruleId) {
    try {
      const r = await executeSparkRule(token, ruleId);
      showToast(`${r.created} spark${r.created !== 1 ? "s" : ""} assigned to ${r.matched} user${r.matched !== 1 ? "s" : ""}`, "success");
      await loadSparksFeed();
    } catch (e) { setError(e.message); }
  }

  const sparksAssigned = useMemo(() => sparksFeed.filter((s) => s.status === "assigned").length, [sparksFeed]);
  const sparksCompleted = useMemo(() => sparksFeed.filter((s) => s.status === "completed").length, [sparksFeed]);
  const sparksInProgress = useMemo(() => sparksFeed.filter((s) => s.status === "viewed").length, [sparksFeed]);

  const sparksFiltered = useMemo(() => {
    return sparksFeed.filter((s) => {
      if (sparkFilter === "to-watch") return s.status === "assigned";
      if (sparkFilter === "in-progress") return s.status === "viewed";
      if (sparkFilter === "completed") return s.status === "completed";
      return true;
    });
  }, [sparksFeed, sparkFilter]);

  useEffect(() => {
    setCurrentSpark(0);
    setSparkStep(0);
  }, [sparkFilter]);

  // Clamp selection when feed updates (e.g. after complete); tab changes reset via sparkFilter effect above.
  useEffect(() => {
    setCurrentSpark((idx) => {
      if (sparksFiltered.length === 0) return 0;
      return Math.min(idx, sparksFiltered.length - 1);
    });
  }, [sparksFeed]);

  const activeSpark = sparksFiltered[currentSpark] || null;

  useEffect(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    setSparkVideoFullscreen(false);
  }, [activeSpark?.id]);

  useEffect(() => {
    if (trainingTab !== "sparks" || sparksFiltered.length === 0) return;
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
      if (e.key === "ArrowLeft" && currentSpark > 0) {
        e.preventDefault();
        setCurrentSpark((p) => Math.max(0, p - 1));
        setSparkStep(0);
      } else if (e.key === "ArrowRight" && currentSpark < sparksFiltered.length - 1) {
        e.preventDefault();
        const next = currentSpark + 1;
        setCurrentSpark(next);
        setSparkStep(0);
        const nextSpark = sparksFiltered[next];
        if (nextSpark?.status !== "completed") handleSparkView(nextSpark.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [trainingTab, currentSpark, sparksFiltered]);

  const customCourses = useMemo(() => adminContent.filter((c) => c.source === "custom"), [adminContent]);
  const catalogCourses = useMemo(() => adminContent.filter((c) => c.source === "catalog" || c.source === "imported"), [adminContent]);
  const allAssignableCourses = useMemo(() => data.courses.filter((c) => c.published), [data.courses]);
  const assignCourseCategories = useMemo(() => ["All", ...new Set(allAssignableCourses.map((c) => c.category).filter(Boolean))], [allAssignableCourses]);
  const filteredAssignCourses = useMemo(() => {
    let list = allAssignableCourses;
    if (assignCourseCategory !== "All") list = list.filter((c) => c.category === assignCourseCategory);
    if (assignCourseSearch.trim()) {
      const q = assignCourseSearch.trim().toLowerCase();
      list = list.filter((c) => c.title.toLowerCase().includes(q) || (c.category || "").toLowerCase().includes(q));
    }
    return list;
  }, [allAssignableCourses, assignCourseSearch, assignCourseCategory]);
  const filteredAssignPlans = useMemo(() => {
    let list = catalogLearningPlans;
    if (assignCourseSearch.trim()) {
      const q = assignCourseSearch.trim().toLowerCase();
      list = list.filter((p) => (p.title || "").toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q));
    }
    return list;
  }, [catalogLearningPlans, assignCourseSearch]);

  const dueSoon = useMemo(() => data.enrollments.filter((e) => { if (!e.due_date || e.status === "completed") return false; const t = new Date(e.due_date).getTime(); const now = Date.now(); return t >= now && t <= now + 14 * 86400000; }), [data.enrollments]);
  const overdueEnrollments = useMemo(() => data.enrollments.filter((e) => { if (!e.due_date || e.status === "completed") return false; return new Date(e.due_date).getTime() < Date.now(); }), [data.enrollments]);
  const completedCount = useMemo(() => data.enrollments.filter((e) => e.status === "completed").length, [data.enrollments]);
  const catalogCategories = useMemo(() => {
    const counts = {};
    for (const c of data.courses) { counts[c.category] = (counts[c.category] || 0) + 1; }
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => ({ name, count }));
  }, [data.courses]);

  // Hierarchical view of the category tree with per-node course counts.
  // Count includes descendants so clicking "Entrata Product" surfaces everything under it.
  const catalogCategoryTreeView = useMemo(() => {
    if (!Array.isArray(categoryTree) || categoryTree.length === 0) return [];
    // Defensive dedupe: Postgres UNIQUE(parent_id, slug) does not prevent duplicates when
    // parent_id IS NULL (NULLs are treated as distinct). If the seed has been re-run, the
    // root level can accumulate duplicate "Entrata Product" / "Compliance" / "Professional
    // Development" rows. Collapse by (parent_id||null, slug||name) keeping the oldest id.
    const seen = new Map();
    const deduped = [];
    for (const n of categoryTree) {
      const key = `${n.parent_id || "root"}::${n.slug || n.name}`;
      if (seen.has(key)) continue;
      seen.set(key, true);
      deduped.push(n);
    }
    const byParent = new Map();
    for (const n of deduped) {
      const key = n.parent_id || "root";
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(n);
    }
    function descendantIds(id) {
      const out = new Set([id]);
      const stack = [id];
      while (stack.length) {
        const cur = stack.pop();
        const kids = byParent.get(cur) || [];
        for (const k of kids) { out.add(k.id); stack.push(k.id); }
      }
      return out;
    }
    const coursesByCat = new Map();
    for (const c of data.courses) {
      if (!c.category_id) continue;
      coursesByCat.set(c.category_id, (coursesByCat.get(c.category_id) || 0) + 1);
    }
    function countFor(id) {
      const ids = descendantIds(id);
      let total = 0;
      for (const [cid, n] of coursesByCat) if (ids.has(cid)) total += n;
      return total;
    }
    function build(parentKey) {
      const list = (byParent.get(parentKey) || []).slice().sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
      return list.map((n) => ({ ...n, count: countFor(n.id), children: build(n.id) }));
    }
    return build("root");
  }, [categoryTree, data.courses]);

  // Flat descendant-id set for the currently-selected node (used by filter).
  const selectedCategoryDescendants = useMemo(() => {
    if (!catalogCategoryId) return null;
    const byParent = new Map();
    for (const n of categoryTree) {
      const key = n.parent_id || "root";
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(n);
    }
    const out = new Set([catalogCategoryId]);
    const stack = [catalogCategoryId];
    while (stack.length) {
      const cur = stack.pop();
      const kids = byParent.get(cur) || [];
      for (const k of kids) { out.add(k.id); stack.push(k.id); }
    }
    return out;
  }, [catalogCategoryId, categoryTree]);

  const catalogVerticals = useMemo(() => {
    const counts = {};
    for (const c of data.courses) {
      const verts = Array.isArray(c.verticals) ? c.verticals : [];
      for (const v of verts) { counts[v] = (counts[v] || 0) + 1; }
    }
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => ({ name, count }));
  }, [data.courses]);

  const filteredCourses = useMemo(() => data.courses.filter((c) => {
    if (tier === "basic" && c.tier_required === "elite") return false;
    if (tier === "basic" && c.source === "custom") return false;
    if (catalogSearch && !c.title.toLowerCase().includes(catalogSearch.toLowerCase()) && !c.description?.toLowerCase().includes(catalogSearch.toLowerCase())) return false;
    if (selectedCategoryDescendants) {
      if (!c.category_id || !selectedCategoryDescendants.has(c.category_id)) return false;
    } else if (catalogCategory !== "All" && c.category !== catalogCategory) {
      return false;
    }
    if (catalogVertical !== "All") {
      const verts = Array.isArray(c.verticals) ? c.verticals : [];
      if (!verts.includes(catalogVertical)) return false;
    }
    if (catalogType !== "All" && c.type !== catalogType) return false;
    if (catalogSource !== "All" && c.source !== catalogSource) return false;
    return true;
  }), [data.courses, catalogSearch, catalogCategory, selectedCategoryDescendants, catalogVertical, catalogType, catalogSource, tier]);

  const groupedCourses = useMemo(() => {
    const groups = {};
    for (const c of filteredCourses) {
      if (!groups[c.category]) groups[c.category] = [];
      groups[c.category].push(c);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredCourses]);
  const eliRecs = useMemo(() => buildEliRecs(data.courses), [data.courses]);

  async function selfEnroll(courseId) {
    return apiRequest("/api/enrollments/self-enroll", { method: "POST", body: JSON.stringify({ courseId, dueDays: 14 }) }, token);
  }

  async function selfEnrollLearningPlan(planId) {
    return apiRequest(`/api/learning-plans/${planId}/self-enroll`, { method: "POST", body: JSON.stringify({ dueDays: 30 }) }, token);
  }

  async function enrollInLearningPlan(plan) {
    try {
      const result = await selfEnrollLearningPlan(plan.id);
      await boot();
      const created = result.created || 0;
      const total = result.totalCourses || plan.course_count;
      if (created === 0) {
        showToast(`Already enrolled in ${plan.title}`, "success");
      } else if (created < total) {
        showToast(`Enrolled in ${created} new course${created !== 1 ? "s" : ""} from ${plan.title} (${total - created} already in progress)`, "success");
      } else {
        showToast(`Enrolled in ${plan.title} -- ${created} course${created !== 1 ? "s" : ""}`, "success");
      }
    } catch (e) {
      setError(e.message || "Could not enroll in learning plan");
    }
  }

  async function startEliRec(rec) {
    const course = data.courses.find((c) => c.title === rec.courseTitle) || data.courses[0];
    if (!course) { showToast("No matching course found", "error"); return; }
    try {
      const result = await selfEnroll(course.id);
      await boot();
      if (result.created > 0) {
        showToast(`Enrolled in "${course.title}" based on ELI recommendation`, "success");
      } else {
        showToast(`Already enrolled in "${course.title}"`, "success");
      }
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!tourActive) return;
    const onKey = (e) => {
      if (e.key === "Escape") dismissTour(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tourActive, dismissTour]);

  const myLearningPlans = myLearningPlansLive;
  const pieData = useMemo(() => { if (!data.adminSummary) return []; const c = Number(data.adminSummary.completions || 0); const o = Number(data.adminSummary.overdue || 0); const t = data.enrollments.length; return [{ name: "Completed", value: c }, { name: "In Progress", value: Math.max(t - c - o, 0) }, { name: "Overdue", value: o }].filter((d) => d.value > 0); }, [data.adminSummary, data.enrollments]);

  if (!token) {
    return (
      <div className="login-page">
        <div className="login-brand">
          <div className="logo-big"><div className="mark">e</div><span>Entrata Academy</span></div>
          <h2>Training and compliance built into OXP.</h2>
          <p>Assign courses by role, state, and region. Track compliance gaps in real time. Auto-recommend training based on performance metrics.</p>
          <div className="login-features">
            <div className="login-feature"><Monitor /> SCORM playback inside OXP</div>
            <div className="login-feature"><Sparkles /> ELI-powered training recommendations from live metrics</div>
            <div className="login-feature"><Zap /> Temp leasing agent quick-start onboarding packages</div>
            <div className="login-feature"><ShieldCheck /> Multi-level compliance: learner, manager, admin</div>
          </div>
        </div>
        <div className="login-form-side">
          <div className="login-card">
            <h1>Sign in</h1>
            <p className="subtitle">Pick a demo user to explore different role views.</p>
            <form onSubmit={login} className="form-stack">
              <div className="form-group"><label>Email</label><input type="email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} /></div>
              <div className="form-group"><label>Password</label><input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} /></div>
              <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%" }}>{loading ? <><Loader2 /> Signing in...</> : "Sign In"}</button>
            </form>
            {error ? <div className="error-banner mt-2"><AlertTriangle />{error}</div> : null}
            <div className="demo-section"><h3>Quick demo access</h3><div className="demo-grid">{DEMO_USERS.map((d) => <button key={d.email} className="demo-btn" onClick={() => setLoginForm({ email: d.email, password: "academy123" })}><span>{d.label}{d.locale === "pt-BR" ? <span className="locale-flag" title="Portuguese (Brazil)"> PT-BR</span> : ""}</span><span className="demo-role">{d.role}</span></button>)}</div></div>
            
          </div>
        </div>
      </div>
    );
  }

  const showLoading = loading || viewState === "loading";
  const showEmpty = viewState === "empty";
  const showError = viewState === "error";

  return (
    <div className="app-shell">
      <Toast toasts={toasts} />

      {/* ENTRATA TOP NAV */}
      <div className="entrata-topbar">
        <span className="entrata-logo">entrata</span>
        <button className="entrata-nav-item active"><Home size={12} /> OXP</button>
        <button className="entrata-nav-item" disabled title="Dashboard (Entrata main app)"><LayoutDashboard size={12} /> Dashboard</button>
        <button className="entrata-nav-item" disabled title="Leads (Entrata main app)"><Target size={12} /> Leads</button>
        <button className="entrata-nav-item" disabled title="Residents (Entrata main app)"><Users size={12} /> Residents</button>
        <button className="entrata-nav-item" disabled title="Commercial (Entrata main app)"><Building2 size={12} /> Commercial</button>
        <button className="entrata-nav-item" disabled title="Accounting (Entrata main app)"><BarChart size={12} /> Accounting</button>
        <button className="entrata-nav-item" disabled title="Tools (Entrata main app)"><Wrench size={12} /> Tools</button>
        <button className="entrata-nav-item" disabled title="Data & Reports (Entrata main app)"><BarChart3 size={12} /> Data & Reports</button>
        <button className="entrata-nav-item" disabled title="Setup (Entrata main app)"><Settings size={12} /> Setup</button>
        <div className="release-selector-bar">
          <label>Release:</label>
          <select value={releaseFilter} onChange={(e) => setReleaseFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="MVP">MVP</option>
            <option value="1.1">1.1 Visibility + Engagement</option>
            <option value="1.2">1.2 Compliance + Automation</option>
            <option value="1.3">1.3 AI Differentiators</option>
            <option value="1.4">1.4 Enterprise Platform</option>
            <option value="1.5">1.5 Digital Adoption</option>
            <option value="1.6">1.6 Release-Grouped Changelog</option>
            <option value="1.7">1.7 KB Favorites, History & Pop-Out</option>
          </select>
        </div>
        <div className="entrata-topbar-right">
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu"><Menu size={18} /></button>
          <button type="button" className="tour-guide-trigger" onClick={openTour} title="Open onboarding guide">
            <HelpCircle size={14} aria-hidden="true" /> Help
          </button>
          <a href={`${API_BASE}/audit/`} target="_blank" rel="noopener" className="tour-guide-trigger" title="Strategic audit and SKU roadmap" style={{ textDecoration: "none" }}>
            <FileText size={14} aria-hidden="true" /> Audit
          </a>
          {((typeof process !== "undefined" && process.env && (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ACADEMY_DEMO_MODE === "true" || process.env.NEXT_PUBLIC_ACADEMY_STATIC_DEMO === "true"))) ? (
          <div className="sim-bar"><label>State:</label><select value={viewState} onChange={(e) => setViewState(e.target.value)}><option value="normal">Normal</option><option value="loading">Loading</option><option value="error">Error</option><option value="empty">Empty</option></select><label>Tier:</label><select value={tier} onChange={(e) => setTier(e.target.value)}><option value="elite">Academy Elite</option><option value="basic">Academy Basic</option></select></div>
          ) : null}
          <span className="prototype-version">v1.8</span>
          <button type="button" onClick={openNotifDrawer} aria-label="Open notifications" title="Notifications"
            style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 6px" }}>
            <Bell size={14} />
            {notifications.unread > 0 ? (
              <span style={{ position: "absolute", top: -2, right: -2, background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, minWidth: 16, height: 16, padding: "0 4px", display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                {notifications.unread > 9 ? "9+" : notifications.unread}
              </span>
            ) : null}
          </button>
          <span>{user?.name}</span>
          <button type="button" onClick={logout} aria-label="Sign out"><LogOut size={11} /></button>
        </div>
      </div>

      {/* OXP SIDEBAR */}
      <aside className="oxp-sidebar">
        <div className="oxp-sidebar-header">
          <div className="oxp-logo">O</div>
          <span>OXP <span className="studio-label">Studio</span></span>
        </div>
        <div className="oxp-section-label">To Do</div>
        <button className={`oxp-nav-item ${trainingTab === "command-center" ? "active" : ""}`} onClick={() => { setTrainingTab("command-center"); enterWorkflow("oxp.command-center"); }}><LayoutDashboard size={16} /> Command Center</button>
        <button className="oxp-nav-item disabled" disabled title="Escalations (separate OXP module)"><AlertTriangle size={16} /> Escalations</button>
        <button className="oxp-nav-item disabled" disabled title="Entrata Experts (separate OXP module)"><Globe size={16} /> Entrata Experts</button>
        <div className="oxp-section-label">My Workforce</div>
        <button className="oxp-nav-item disabled" disabled title="Agent Roster (separate OXP module)"><Users size={16} /> Agent Roster</button>
        <button className="oxp-nav-item disabled" disabled title="Workforce (separate OXP module)"><Activity size={16} /> Workforce</button>
        <div className="oxp-section-label">Configure</div>
        <button className="oxp-nav-item disabled" disabled title="AI & Agent Activation (separate OXP module)"><Zap size={16} /> AI & Agent Activation</button>
        <button className="oxp-nav-item disabled" disabled title="Agent Builder (separate OXP module)"><Bot size={16} /> Agent Builder</button>
        <button className={`oxp-nav-item ${trainingTab !== "command-center" ? "active" : ""}`} onClick={() => { if (trainingTab === "command-center") { setTrainingTab("my-learning"); } }}>
          <GraduationCap size={16} /> Trainings & SOP
          {data.complianceGaps.length > 0 ? <span className="badge">{data.complianceGaps.length}</span> : null}
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="oxp-main">
        <div className="oxp-content">
          <div className="page-header">
            <h1>Trainings & SOP</h1>
            <p>Manage training programs, compliance certifications, and operational SOPs. Training recommendations are powered by live performance data.</p>
          </div>

          {/* MODE SWITCHER */}
          <div className="mode-switcher">
            <button className={mode === "training" ? "active" : ""} onClick={() => setMode("training")}><GraduationCap size={14} /> Training</button>
            <button className={mode === "sop" ? "active" : ""} onClick={() => setMode("sop")}><Folder size={14} /> SOPs</button>
          </div>

          {error ? <div className="error-banner"><AlertTriangle />{error}<button className="btn-sm" style={{ marginLeft: "auto" }} onClick={() => setError("")}><X size={11} /></button></div> : null}
          {showError ? <div className="error-banner"><AlertTriangle />Simulated error state.</div> : null}

          {/* ===== SOP MODE ===== */}
          {mode === "sop" ? (
            <>
              <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
                <FolderOpen size={48} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
                <h3>Standard Operating Procedures</h3>
                <p style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 400, margin: "8px auto 16px" }}>Centralized document management for property operations, compliance procedures, and team playbooks. Upload, organize, and distribute SOPs across your portfolio.</p>
                <div style={{ display: "inline-flex", gap: 8, padding: "8px 16px", background: "var(--bg-muted, #f8f9fa)", borderRadius: 8, fontSize: 13, color: "var(--text-muted)" }}><Settings size={13} /> Coming in a future release</div>
              </div>
            </>
          ) : null}

          {/* ===== TRAINING MODE ===== */}
          {mode === "training" ? (
            <>
              {mobileMenuOpen && (
                <div className="mobile-nav-overlay" onClick={() => setMobileMenuOpen(false)}>
                  <div className="mobile-nav-drawer" onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>Navigation</span>
                      <button aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }} onClick={() => setMobileMenuOpen(false)}><X size={16} /></button>
                    </div>
                    <div className="mobile-nav-items">
                      <button className={trainingTab === "my-learning" ? "active" : ""} onClick={() => { setTrainingTab("my-learning"); setMobileMenuOpen(false); }}>My Learning</button>
                      <button className={trainingTab === "catalog" ? "active" : ""} onClick={() => { setTrainingTab("catalog"); setMobileMenuOpen(false); }}>Learning Catalog</button>
                      {isElite ? <button className={trainingTab === "sparks" ? "active" : ""} onClick={() => { setTrainingTab("sparks"); setMobileMenuOpen(false); }}>Spotlights</button> : null}
                      {isManager ? <button className={trainingTab === "team" ? "active" : ""} onClick={() => { setTrainingTab("team"); setMobileMenuOpen(false); }}>Team</button> : null}
                      {isInRelease("certifications", releaseFilter) ? <button className={trainingTab === "certifications" ? "active" : ""} onClick={() => { setTrainingTab("certifications"); setMobileMenuOpen(false); }}>Certifications</button> : null}
                      {canViewCompliance ? <button className={trainingTab === "compliance" ? "active" : ""} onClick={() => { setTrainingTab("compliance"); setMobileMenuOpen(false); }}>Compliance</button> : null}
                      <button className={trainingTab === "analytics" ? "active" : ""} onClick={() => { setTrainingTab("analytics"); setMobileMenuOpen(false); }}>Analytics</button>
                      {isInRelease("knowledge-base", releaseFilter) && isSurfaceVisible("knowledge_base") ? <button className={trainingTab === "knowledge-base" ? "active" : ""} onClick={() => { setTrainingTab("knowledge-base"); setMobileMenuOpen(false); }}>Knowledge Base</button> : null}
                      {isInRelease("whats-new", releaseFilter) && isSurfaceVisible("whats_new") ? <button className={trainingTab === "whats-new" ? "active" : ""} onClick={() => { setTrainingTab("whats-new"); loadWhatsNew(); setMobileMenuOpen(false); }}>What's New {whatsNewUnread > 0 ? `(${whatsNewUnread})` : ""}</button> : null}
                      {isInRelease("leaderboard", releaseFilter) ? <button className={trainingTab === "leaderboard" ? "active" : ""} onClick={() => { setTrainingTab("leaderboard"); loadLeaderboard(); setMobileMenuOpen(false); }}>Leaderboard</button> : null}
                      {isAdmin ? <button className={trainingTab === "overview" ? "active" : ""} onClick={() => { setTrainingTab("overview"); setMobileMenuOpen(false); }}>Admin</button> : null}
                    </div>
                  </div>
                </div>
              )}
              {trainingTab !== "command-center" ? <div className="content-tabs" id="tour-content-tabs">
                <button className={`content-tab ${trainingTab === "my-learning" ? "active" : ""} ${!isInRelease("my-learning", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => setTrainingTab("my-learning")}>My Learning {overdueEnrollments.length > 0 ? <span className="tab-badge" style={{ background: "var(--danger)", color: "#fff" }} title={`${overdueEnrollments.length} overdue`}>{overdueEnrollments.length}</span> : null} {releaseBadge("my-learning", releaseFilter)}</button>
                <button className={`content-tab ${trainingTab === "catalog" ? "active" : ""} ${!isInRelease("catalog", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => setTrainingTab("catalog")}>Learning Catalog {releaseBadge("catalog", releaseFilter)}</button>
                {/* TRAINING AI - COMMENTED OUT FOR PROTOTYPE
                {isElite ? <button className={`content-tab ${trainingTab === "training-ai" ? "active" : ""} ${!isInRelease("training-ai", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => setTrainingTab("training-ai")}>Training AI {releaseBadge("training-ai", releaseFilter)}</button> : null}
                */}
                {isElite ? <button className={`content-tab ${trainingTab === "sparks" ? "active" : ""} ${!isInRelease("sparks", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => setTrainingTab("sparks")}>Spotlights {sparksAssigned > 0 ? <span className="tab-badge">{sparksAssigned}</span> : null} {releaseBadge("sparks", releaseFilter)}</button> : null}
                {isManager ? <button className={`content-tab ${trainingTab === "team" ? "active" : ""} ${!isInRelease("team", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => setTrainingTab("team")}>Team {data.teamOverdue.length > 0 ? <span className="tab-badge">{data.teamOverdue.length}</span> : null} {releaseBadge("team", releaseFilter)}</button> : null}
                <button className={`content-tab ${trainingTab === "certifications" ? "active" : ""} ${!isInRelease("certifications", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => setTrainingTab("certifications")}>{t("tab.certifications")} {releaseBadge("certifications", releaseFilter)}</button>
                {canViewCompliance ? <button className={`content-tab ${trainingTab === "compliance" ? "active" : ""} ${!isInRelease("compliance", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => setTrainingTab("compliance")}>Compliance {releaseBadge("compliance", releaseFilter)}</button> : null}
                {isInRelease("knowledge-base", releaseFilter) && isSurfaceVisible("knowledge_base") ? <button className={`content-tab ${trainingTab === "knowledge-base" ? "active" : ""} ${!isInRelease("knowledge-base", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => setTrainingTab("knowledge-base")}><FileText size={13} style={{ verticalAlign: -2 }} /> Knowledge Base {releaseBadge("knowledge-base", releaseFilter)}</button> : null}
                {isInRelease("whats-new", releaseFilter) && isSurfaceVisible("whats_new") ? <button className={`content-tab ${trainingTab === "whats-new" ? "active" : ""} ${!isInRelease("whats-new", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => { setTrainingTab("whats-new"); loadWhatsNew(); }}><Bell size={13} style={{ verticalAlign: -2 }} /> What's New {whatsNewUnread > 0 ? <span className="tab-badge">{whatsNewUnread}</span> : null} {releaseBadge("whats-new", releaseFilter)}</button> : null}
                <button className={`content-tab ${trainingTab === "analytics" ? "active" : ""} ${!isInRelease("analytics", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => setTrainingTab("analytics")}><BarChart3 size={13} style={{ verticalAlign: -2 }} /> Analytics {releaseBadge("analytics", releaseFilter)}</button>
                <button className={`content-tab ${trainingTab === "leaderboard" ? "active" : ""} ${!isInRelease("leaderboard", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => { setTrainingTab("leaderboard"); loadLeaderboard(); }}>Leaderboard {releaseBadge("leaderboard", releaseFilter)}</button>
                {isAdmin ? <button className={`content-tab ${trainingTab === "overview" ? "active" : ""} ${!isInRelease("overview", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => setTrainingTab("overview")}>Admin {releaseBadge("overview", releaseFilter)}</button> : null}
                {isElite && isInRelease("dap-gates", releaseFilter) ? <button className={`content-tab ${trainingTab === "workflows" ? "active" : ""} ${!isInRelease("dap-gates", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => { setTrainingTab("workflows"); setActiveWorkflow(null); }}><Navigation size={13} style={{ verticalAlign: -2 }} /> Entrata Workflows {releaseBadge("dap-gates", releaseFilter)}</button> : null}
              </div> : null}

              {trainingTab !== "command-center" && showLoading ? <div className="grid two">{[1,2,3,4].map((i) => <div key={i} className="card"><div className="skeleton h-6 w-24 mb-4" /><div className="skeleton h-40 w-full" /></div>)}</div> : null}
              {trainingTab !== "command-center" && showEmpty ? <div className="card"><div className="empty-state"><FolderOpen /><div className="empty-title">No data</div></div></div> : null}

              {/* MY LEARNING */}
              {!showLoading && !showEmpty && !showError && trainingTab === "my-learning" ? (
                <>
                  <EngNotes tabKey="my-learning" />
                  {/* ONBOARDING JOURNEY */}
                  {myJourney ? (
                    <div className="card mb-4" style={{ border: "2px solid var(--blue-600)", borderRadius: 10 }}>
                      <div className="card-header" style={{ background: "linear-gradient(135deg, #eff6ff, #f0f9ff)" }}>
                        <div className="flex-between">
                          <h2 style={{ margin: 0 }}><GraduationCap size={16} style={{ verticalAlign: -2 }} /> My Onboarding Journey</h2>
                          <span className="text-muted text-sm">Day {myJourney.days_since_hire} of {myJourney.total_days} &middot; {myJourney.completed_courses}/{myJourney.total_courses} courses done</span>
                        </div>
                        <div className="progress-bar" style={{ marginTop: 8 }}><div className={`fill ${myJourney.completed_courses === myJourney.total_courses ? "green" : "blue"}`} style={{ width: `${myJourney.total_courses > 0 ? Math.round((myJourney.completed_courses / myJourney.total_courses) * 100) : 0}%` }} /></div>
                      </div>
                      <div style={{ padding: "12px 16px" }}>
                        {myJourney.days?.map((day, di) => {
                          const isCurrent = di + 1 === myJourney.current_day;
                          const isPast = di + 1 < myJourney.current_day;
                          const allDone = day.courses?.every(c => c.completed);
                          return (
                            <div key={di} style={{ marginBottom: 12, opacity: !isPast && !isCurrent ? 0.6 : 1 }}>
                              <div style={{ display: "flex", gap: 8, marginBottom: 4, alignItems: "center" }}>
                                <span style={{ width: 24, height: 24, borderRadius: "50%", background: allDone ? "var(--green-600)" : isCurrent ? "var(--blue-600)" : "#e2e8f0", color: allDone || isCurrent ? "#fff" : "#737373", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{allDone ? "\u2713" : di + 1}</span>
                                <strong style={{ fontSize: 14 }}>{day.title || `Day ${di + 1}`}{isCurrent ? <span style={{ color: "var(--blue-600)", marginLeft: 6, fontSize: 12 }}>TODAY</span> : null}</strong>
                              </div>
                              <div style={{ marginLeft: 32 }}>
                                {day.courses?.map((c, ci) => (
                                  <div key={ci} style={{ fontSize: 13, padding: "2px 0", color: c.completed ? "var(--green-600)" : "inherit" }}>
                                    {c.completed ? <CheckCircle2 size={11} style={{ verticalAlign: -1, marginRight: 4 }} /> : <BookOpen size={11} style={{ verticalAlign: -1, marginRight: 4 }} />}
                                    {c.title} <span className="text-muted">({c.duration_minutes}min)</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  {/* PROGRESS SUMMARY -- clickable drill-downs + real gamification */}
                  {data.enrollments.length > 0 ? (
                    <div className="xp-widget mb-4" style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 16px", background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0f9ff 100%)", borderRadius: 10, border: "1px solid #d1fae5", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => { setMyLearningFilter("completed"); setMyLearningType("all"); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") { setMyLearningFilter("completed"); setMyLearningType("all"); } }} title="Show completed trainings">
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <CheckCircle2 size={16} style={{ color: "var(--green-600)" }} />
                          <span style={{ fontSize: 15, fontWeight: 700, borderBottom: "1px dashed currentColor" }}>{completedCount}/{data.enrollments.length}</span>
                          <span style={{ fontSize: 13, color: "#737373", borderBottom: "1px dashed #737373" }}>Trainings Completed</span>
                        </div>
                        <div style={{ width: 120, background: "#e2e8f0", borderRadius: 4, height: 8 }}>
                          <div style={{ background: "linear-gradient(90deg, #22c55e, #3b82f6)", borderRadius: 4, height: 8, width: `${data.enrollments.length > 0 ? Math.round((completedCount / data.enrollments.length) * 100) : 0}%`, transition: "width 0.3s" }} />
                        </div>
                      </div>
                      {gamProfile ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setGamDrawerOpen(true)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setGamDrawerOpen(true); }} title="View XP, level, badges, and streak">
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Sparkles size={14} style={{ color: "#f59e0b" }} />
                            <span style={{ fontSize: 14, fontWeight: 700, borderBottom: "1px dashed #f59e0b" }}>Lv {gamProfile.level}</span>
                            <span style={{ fontSize: 12, color: "#737373" }}>({gamProfile.total_xp} XP)</span>
                          </div>
                          <div style={{ width: 90, background: "#e2e8f0", borderRadius: 4, height: 6 }} title={`${gamProfile.xp_to_next_level} XP to next level`}>
                            <div style={{ background: "linear-gradient(90deg, #f59e0b, #8b5cf6)", borderRadius: 4, height: 6, width: `${gamProfile.xp_in_level}%`, transition: "width 0.3s" }} />
                          </div>
                        </div>
                      ) : null}
                      {gamProfile?.streak?.current_streak > 0 ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }} title={`Current streak: ${gamProfile.streak.current_streak} day${gamProfile.streak.current_streak === 1 ? "" : "s"}. Longest: ${gamProfile.streak.longest_streak || gamProfile.streak.current_streak}`}>
                          <Zap size={14} style={{ color: "#f97316" }} />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{gamProfile.streak.current_streak}</span>
                          <span style={{ fontSize: 12, color: "#737373" }}>day streak</span>
                        </div>
                      ) : null}
                      {gamProfile?.badges?.length > 0 ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => setGamDrawerOpen(true)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setGamDrawerOpen(true); }} title="View badges">
                          <Star size={14} style={{ color: "#eab308" }} />
                          <span style={{ fontSize: 13, fontWeight: 600, borderBottom: "1px dashed #eab308" }}>{gamProfile.badges.length}</span>
                          <span style={{ fontSize: 12, color: "#737373" }}>{gamProfile.badges.length === 1 ? "badge" : "badges"}</span>
                        </div>
                      ) : null}
                      {isInRelease("certifications", releaseFilter) && data.certificates.length > 0 ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => setTrainingTab("certifications")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setTrainingTab("certifications"); }} title="View certificates">
                          <Award size={14} style={{ color: "#8b5cf6" }} />
                          <span style={{ fontSize: 14, fontWeight: 600, borderBottom: "1px dashed #8b5cf6" }}>{data.certificates.length}</span>
                          <span style={{ fontSize: 13, color: "#737373", borderBottom: "1px dashed #737373" }}>{data.certificates.length === 1 ? "Certificate" : "Certificates"}</span>
                        </div>
                      ) : null}
                      {isInRelease("leaderboard", releaseFilter) ? (
                        <button className="btn-sm" style={{ fontSize: 12, marginLeft: "auto" }} onClick={() => { setTrainingTab("leaderboard"); loadLeaderboard(); }}>View Leaderboard</button>
                      ) : null}
                    </div>
                  ) : null}
                  {/* ELI RECOMMENDATIONS - COMMENTED OUT FOR PROTOTYPE
                  {isElite ? (
                    <>
                    <div className="eli-card mb-4">
                      <h3><Sparkles size={16} /> ELI Recommendations <span className="eli-badge">AI-Powered</span></h3>
                      {eliRecs.map((rec, i) => (
                        <div key={i} className="eli-rec-item">
                          <div className="rec-icon">{rec.icon}</div>
                          <div className="rec-body"><div className="rec-title">{rec.title}</div><div className="rec-reason">{rec.reason}</div></div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600, marginBottom: 4 }}>{rec.metric}</div>
                            <button onClick={() => startEliRec(rec)}><Play size={11} /> Start</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    </>
                  ) : null}
                  */}

                  {/* STAT CARDS -- clickable to filter */}
                  <div className="stats-row" id="tour-stats-row">
                    {[
                      { key: "all", icon: <BookOpen />, value: data.enrollments.length, label: "Enrolled", color: "blue", tip: "Every course or learning plan you are currently enrolled in." },
                      { key: "completed", icon: <CheckCircle2 />, value: completedCount, label: "Completed", color: "green", tip: "Individual courses you have finished. Each completed course produces a downloadable certificate." },
                      { key: "due_soon", icon: <Clock />, value: dueSoon.length, label: "Due Soon", color: "amber", tip: "Assigned courses due in the next 14 days." },
                      { key: "overdue", icon: <AlertTriangle />, value: overdueEnrollments.length, label: "Overdue", color: "red", tip: "Assigned courses whose due date has passed." },
                      ...(isInRelease("certifications", releaseFilter) ? [{ key: "certified", icon: <Award />, value: data.certificates.length, label: "Certified", color: "purple", tip: "Certification programs you have earned (these usually require multiple courses and may expire). Different from individual course certificates — they do not double-count with Completed." }] : []),
                    ].map(s => (
                      <div key={s.key} className="stat-card" style={{ cursor: "pointer", outline: myLearningFilter === s.key ? "2px solid var(--primary)" : "none", borderRadius: 8 }} title={s.tip} onClick={() => { if (s.key === "certified") { setTrainingTab("certifications"); } else { setMyLearningFilter(s.key); setMyLearningType("all"); } }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") { if (s.key === "certified") { setTrainingTab("certifications"); } else { setMyLearningFilter(s.key); setMyLearningType("all"); } } }}>
                        <div className={`stat-icon ${s.color}`}>{s.icon}</div>
                        <div><div className="stat-value">{s.value}</div><div className="stat-label">{s.label}</div></div>
                      </div>
                    ))}
                  </div>

                  {/* ASSIGNED SPOTLIGHTS STRIP -- Training R2 S3: surface assigned spotlights on My Learning dashboard */}
                  {isElite && isInRelease("sparks", releaseFilter) && sparksAssigned > 0 ? (
                    <div className="card mb-4" style={{ border: "1px solid #fde68a", background: "linear-gradient(135deg, #fffbeb 0%, #fefce8 100%)" }}>
                      <div className="card-header" style={{ background: "transparent", borderBottom: "1px solid #fde68a", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                          <Zap size={16} style={{ color: "#b45309" }} />
                          Assigned Spotlights
                          <span className="tab-badge" style={{ background: "#b45309", color: "#fff" }}>{sparksAssigned}</span>
                        </h2>
                        <button type="button" className="btn-sm btn-ghost" onClick={() => setTrainingTab("sparks")} style={{ fontSize: 12, color: "#b45309" }}>View all &rarr;</button>
                      </div>
                      <div style={{ display: "flex", gap: 12, padding: 12, overflowX: "auto" }}>
                        {sparksFeed.filter((s) => s.status === "assigned").slice(0, 6).map((s) => (
                          <button
                            type="button"
                            key={s.id}
                            onClick={() => setTrainingTab("sparks")}
                            title={s.description || s.title}
                            style={{ flex: "0 0 200px", padding: 10, background: "#fff", border: "1px solid #fde68a", borderRadius: 8, cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 6 }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Zap size={12} style={{ color: "#b45309", flexShrink: 0 }} />
                              <span style={{ fontSize: 10, fontWeight: 600, color: "#b45309", textTransform: "uppercase", letterSpacing: 0.4 }}>Spotlight</span>
                              {s.duration_seconds ? <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)" }}>{Math.round(s.duration_seconds / 60) || 1}m</span> : null}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.title}</div>
                            {s.category ? <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.category}</div> : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="grid two">
                    {/* UNIFIED MY COURSES & LEARNING PLANS */}
                    <div className="card">
                      <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <h2><BookOpen size={14} /> My Courses & Learning Plans</h2>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          {myLearningFilter !== "all" ? (
                            <button className="btn-sm btn-ghost" onClick={() => setMyLearningFilter("all")} style={{ fontSize: 11, color: "var(--primary)" }}><X size={10} /> Clear filter</button>
                          ) : null}
                          {data.enrollments.length > 0 || myLearningPlans.length > 0 ? <>
                            <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Sort:</label>
                            <select value={courseSortBy} onChange={(e) => setCourseSortBy(e.target.value)} style={{ fontSize: 11, padding: "2px 6px", width: "auto" }}>
                              <option value="status">Status</option>
                              <option value="due_date">Due Date</option>
                              <option value="progress">Progress</option>
                            </select>
                          </> : null}
                        </div>
                      </div>
                      {/* Type filter pills */}
                      {(data.enrollments.length > 0 || myLearningPlans.length > 0) ? (
                        <div style={{ display: "flex", gap: 6, padding: "0 16px 12px" }}>
                          {[
                            { key: "all", label: "All" },
                            { key: "courses", label: "Courses" },
                            { key: "plans", label: "Learning Plans" },
                          ].map(f => (
                            <button key={f.key} className={`btn-sm ${myLearningType === f.key ? "" : "btn-ghost"}`} onClick={() => setMyLearningType(f.key)} style={{ background: myLearningType === f.key ? "var(--primary)" : undefined, color: myLearningType === f.key ? "#fff" : undefined, borderRadius: 16, padding: "4px 14px", fontSize: 12, fontWeight: 600 }}>
                              {f.label}
                            </button>
                          ))}
                          {myLearningFilter !== "all" ? (
                            <span style={{ fontSize: 11, color: "var(--text-muted)", alignSelf: "center", marginLeft: 8 }}>
                              Showing: {myLearningFilter === "completed" ? "Completed" : myLearningFilter === "due_soon" ? "Due Soon" : myLearningFilter === "overdue" ? "Overdue" : "All"}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      {data.enrollments.length === 0 && myLearningPlans.length === 0 ? <div className="empty-state"><BookOpen /><div className="empty-title">No courses or learning plans assigned</div><div className="empty-desc">Content will appear here when assigned by your manager or administrator.</div></div> : (() => {
                        const sortFn = (a, b) => {
                          if (courseSortBy === "due_date") return (new Date(a.due_date || "2099-01-01")) - (new Date(b.due_date || "2099-01-01"));
                          if (courseSortBy === "progress") { const pA = a.status === "completed" ? 100 : a.status === "in_progress" ? 45 : 0; const pB = b.status === "completed" ? 100 : b.status === "in_progress" ? 45 : 0; return pB - pA; }
                          const order = { in_progress: 0, not_started: 1, completed: 2 }; return (order[a.status] ?? 1) - (order[b.status] ?? 1);
                        };
                        const filterEnrollment = (e) => {
                          if (myLearningFilter === "completed") return e.status === "completed";
                          if (myLearningFilter === "due_soon") { const days = e.due_date ? Math.ceil((new Date(e.due_date) - new Date()) / 86400000) : null; return days !== null && days >= 0 && days <= 7 && e.status !== "completed"; }
                          if (myLearningFilter === "overdue") return e.due_date && new Date(e.due_date).getTime() < Date.now() && e.status !== "completed";
                          return true;
                        };
                        const filteredEnrollments = data.enrollments.filter(filterEnrollment);
                        const activeCourses = filteredEnrollments.filter(e => e.status !== "completed");
                        const completedCourses = filteredEnrollments.filter(e => e.status === "completed");
                        const filteredPlans = myLearningPlans.filter(plan => {
                          if (myLearningFilter === "completed") { const dc = plan.completed_count || 0; const tc = plan.course_count || 0; return dc === tc && tc > 0; }
                          if (myLearningFilter === "due_soon" || myLearningFilter === "overdue") return false;
                          return true;
                        });
                        const renderEnrollment = (e) => (
                          <div key={e.id} className="item">
                            <div className={`item-icon ${e.status === "completed" ? "green" : "blue"}`}><CourseIcon type={e.type} /></div>
                            <div className="item-body">
                              <div className="item-title">{e.title}</div>
                              <div className="item-meta">{e.category} &middot; {e.duration_minutes} min &middot; Due {fD(e.due_date)}</div>
                              <div className="progress-bar"><div className={`fill ${e.status === "completed" ? "green" : e.status === "in_progress" ? "amber" : "blue"}`} style={{ width: `${e.status === "completed" ? 100 : e.status === "in_progress" ? 45 : 0}%` }} /></div>
                            </div>
                            <div className="item-actions">
                              <StatusBadge status={e.status} />
                              {e.status !== "completed" ? <button className="btn-primary btn-sm" onClick={() => launchEnrollment(e)}><Play size={11} /></button> : <button className="btn-sm" onClick={() => launchEnrollment(e)} title="Restart course"><RefreshCw size={11} /></button>}
                            </div>
                          </div>
                        );
                        const renderPlan = (plan, i) => {
                          const doneCount = plan.completed_count || 0;
                          const totalCount = plan.course_count || 0;
                          const pctDone = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
                          const planComplete = doneCount === totalCount && totalCount > 0;
                          return (
                          <div key={plan.id || `plan-${i}`}>
                            <div className="item">
                              <div className={`item-icon ${planComplete ? "green" : ["blue", "amber", "purple"][i % 3]}`}><GraduationCap size={16} /></div>
                              <div className="item-body">
                                <div className="item-title" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>{plan.title} <span className="badge" style={{ fontSize: 10, padding: "1px 6px", background: "var(--muted-bg, #f3f4f6)", color: "var(--text-secondary)" }}>Plan</span>{plan.source === "catalog" || plan.company_id === null ? <span className="badge" style={{ fontSize: 10, padding: "1px 6px", background: "#dbeafe", color: "#1e40af" }} title="Curated by Entrata and available to every tenant">Curated by Entrata</span> : <span className="badge" style={{ fontSize: 10, padding: "1px 6px", background: "#f3f4f6", color: "#374151" }} title="Built by your organization">Custom</span>}</div>
                                {plan.description ? <div className="item-desc" style={{ fontSize: 13, color: "var(--text-secondary)", margin: "2px 0 4px", lineHeight: 1.4 }}>{plan.description}</div> : null}
                                <div className="item-meta">{totalCount} courses &middot; {plan.est || "\u2014"}{plan.target_role ? ` \u00B7 ${plan.target_role}` : ""}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                                  <div style={{ flex: "0 0 80px", height: 4, borderRadius: 2, background: "var(--border-light, #e5e5e5)", overflow: "hidden" }}>
                                    <div style={{ width: `${pctDone}%`, height: "100%", borderRadius: 2, background: planComplete ? "var(--green, #22c55e)" : "var(--primary, #2563eb)", transition: "width 0.3s" }} />
                                  </div>
                                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{doneCount} of {totalCount} complete</span>
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <button className="btn-sm" onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}><ChevronDown size={11} style={{ transform: expandedPlan === plan.id ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} /> {expandedPlan === plan.id ? "Hide" : "View"}</button>
                                {isAdmin ? (
                                  <button className="btn-sm" onClick={() => { setTrainingTab("overview"); setAdminSubTab("learning-paths"); loadLearningPaths(); }}><Settings size={11} /> Manage</button>
                                ) : planComplete ? (
                                  <span className="status green" style={{ fontSize: 11, padding: "2px 8px" }}><CheckCircle2 size={11} /> Completed</span>
                                ) : (
                                  <button className="btn-sm" onClick={() => setExpandedPlan(plan.id)}>{doneCount > 0 ? <><Play size={11} /> Continue</> : <><Play size={11} /> Start</>}</button>
                                )}
                              </div>
                            </div>
                            {expandedPlan === plan.id && plan.courses && plan.courses.length > 0 ? (
                              <div style={{ padding: "0 16px 12px 52px" }}>
                                <div style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "6px 10px", marginBottom: 8, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: 11, color: "#1e40af", lineHeight: 1.4 }}>
                                  <Info size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                                  <span>Completing a course here marks it complete everywhere it appears in Entrata Academy -- including the Learning Catalog and any other Learning Plan.</span>
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Courses in this plan{doneCount > 0 ? ` (${doneCount} already completed)` : ""}:</div>
                                {plan.courses.map((c, ci) => {
                                  const enrollment = data.enrollments.find(en => en.course_id === c.course_id || en.title === c.title);
                                  const progress = c.completed ? 100 : enrollment?.status === "in_progress" ? 45 : 0;
                                  const courseStatus = c.completed ? "completed" : enrollment?.status === "in_progress" ? "in_progress" : "not_started";
                                  const inCatalog = data.courses?.some(cat => cat.id === c.course_id);
                                  return (
                                  <div key={c.course_id || ci} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: ci < plan.courses.length - 1 ? "1px solid var(--border-light)" : "none" }}>
                                    <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 22 }}>{ci + 1}.</span>
                                    {c.completed
                                      ? <span style={{ fontSize: 13, flex: 1, display: "flex", alignItems: "center", gap: 6 }}><CheckCircle2 size={13} style={{ color: "var(--green, #22c55e)" }} />{c.title}{inCatalog ? <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "#f0f9ff", color: "#0369a1", fontWeight: 500 }} title="This course also appears in the Learning Catalog; completion is shared.">Also in Catalog</span> : null}</span>
                                      : <span style={{ fontSize: 13, flex: 1, display: "flex", alignItems: "center", gap: 6 }}>{c.title}{inCatalog ? <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "#f0f9ff", color: "#0369a1", fontWeight: 500 }} title="This course also appears in the Learning Catalog; completion is shared.">Also in Catalog</span> : null}</span>
                                    }
                                    <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 50 }}>{c.duration || (enrollment?.duration_minutes ? `${enrollment.duration_minutes} min` : "\u2014")}</span>
                                    {progress > 0 && progress < 100 ? (
                                      <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 80 }}>
                                        <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border-light, #e5e5e5)", overflow: "hidden" }}>
                                          <div style={{ width: `${progress}%`, height: "100%", borderRadius: 2, background: "var(--amber, #f59e0b)" }} />
                                        </div>
                                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{progress}%</span>
                                      </div>
                                    ) : null}
                                    {enrollment?.due_date && courseStatus !== "completed" ? <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Due {fD(enrollment.due_date)}</span> : null}
                                    {c.completed
                                      ? <span className="status green" style={{ fontSize: 10, padding: "1px 6px" }}>Completed</span>
                                      : courseStatus === "in_progress" ? <span className="status amber" style={{ fontSize: 10, padding: "1px 6px" }}>In Progress</span>
                                      : c.required ? <span className="status blue" style={{ fontSize: 10, padding: "1px 6px" }}>Required</span> : <span className="status" style={{ fontSize: 10, padding: "1px 6px", background: "var(--muted-bg, #f5f5f5)" }}>Optional</span>
                                    }
                                  </div>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                          );
                        };
                        const showPlans = myLearningType === "all" || myLearningType === "plans";
                        const showCourses = myLearningType === "all" || myLearningType === "courses";
                        const hasVisibleContent = (showPlans && filteredPlans.length > 0) || (showCourses && filteredEnrollments.length > 0);
                        return hasVisibleContent ? (
                          <div className="item-list">
                            {showPlans && filteredPlans.length > 0 ? filteredPlans.map(renderPlan) : null}
                            {showPlans && filteredPlans.length > 0 && showCourses && filteredEnrollments.length > 0 ? (
                              <div style={{ borderTop: "1px solid var(--border-light)", margin: "4px 0", padding: "4px 16px 0" }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>Individual Courses</span>
                              </div>
                            ) : null}
                            {showCourses ? (
                              myLearningFilter === "completed" ? (
                                [...completedCourses].sort(sortFn).map(renderEnrollment)
                              ) : (
                                <>
                                  {[...activeCourses].sort(sortFn).map(renderEnrollment)}
                                  {completedCourses.length > 0 ? (
                                    <div className="completed-policies-section">
                                      <button type="button" className="completed-policies-toggle" onClick={() => setShowCompletedCourses(v => !v)}>
                                        <CheckCircle2 size={13} />
                                        <span>{completedCourses.length} course{completedCourses.length !== 1 ? "s" : ""} completed</span>
                                        <ChevronDown size={13} style={{ transform: showCompletedCourses ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                                      </button>
                                      {showCompletedCourses && [...completedCourses].sort(sortFn).map(renderEnrollment)}
                                    </div>
                                  ) : null}
                                </>
                              )
                            ) : null}
                          </div>
                        ) : (
                          <div style={{ textAlign: "center", padding: "32px 16px" }}>
                            <Check size={24} style={{ color: "var(--green-600)", marginBottom: 6 }} />
                            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{myLearningFilter === "due_soon" ? "Nothing due in the next 7 days." : myLearningFilter === "overdue" ? "Nothing overdue \u2014 you're all caught up." : myLearningFilter === "completed" ? "No completed items yet." : "No items match this filter."}</p>
                            <button className="btn-sm btn-ghost" onClick={() => { setMyLearningFilter("all"); setMyLearningType("all"); }} style={{ marginTop: 6 }}>Show all</button>
                          </div>
                        );
                      })()}
                      {isAdmin ? <div style={{ padding: "8px 16px 12px", borderTop: "1px solid var(--border-light)" }}><button className="btn-sm" style={{ fontSize: 12 }} onClick={() => { setTrainingTab("overview"); setAdminSubTab("learning-paths"); loadLearningPaths(); }}><Settings size={11} /> Manage All Learning Plans</button></div> : null}
                    </div>
                    {/* POLICIES (Elite only) */}
                    {isElite ? (
                    <div>
                      <div className="card mb-4" id="tour-policies-card">
                        <div className="card-header"><h2><ClipboardCheck /> Policies</h2></div>
                        {data.policies.length === 0 ? <div className="empty-state"><FileText /><div className="empty-title">No policies assigned</div><div className="empty-desc">Policies will appear here when assigned by your administrator.</div></div> : (() => {
                          const actionable = data.policies.filter(p => p.status === "pending" || p.status === "overdue");
                          const completed = data.policies.filter(p => p.status === "acknowledged");
                          const renderPolicy = (p) => {
                            const isPending = p.status === "pending" || p.status === "overdue";
                            const daysLeft = p.due_date ? Math.ceil((new Date(p.due_date) - new Date()) / 86400000) : null;
                            return (
                              <div key={p.assignment_id || p.id} className="item">
                                <div className={`avatar-sm ${p.status === "overdue" ? "red" : isPending ? "amber" : "green"}`}><FileText size={12} /></div>
                                <div className="item-body">
                                  <div className="item-title">{p.title}</div>
                                  <div className="item-meta">
                                    {p.category} &middot; v{p.version}
                                    {isPending && daysLeft !== null ? (daysLeft > 0 ? ` \u00B7 Due in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}` : ` \u00B7 Overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? "s" : ""}`) : null}
                                    {p.status === "acknowledged" && p.next_due_date ? ` \u00B7 Next due ${fD(p.next_due_date)}` : null}
                                    {p.status === "acknowledged" && p.acknowledged_at ? ` \u00B7 Acknowledged ${fD(p.acknowledged_at)}` : null}
                                  </div>
                                </div>
                                {isPending ? <button className="btn-primary btn-sm" onClick={() => { setAckModal(p); setAckChecked(false); }}>Read & Acknowledge</button> : <StatusBadge status="completed" />}
                              </div>
                            );
                          };
                          return (
                            <div className="item-list">
                              {actionable.length > 0 ? actionable.map(renderPolicy) : (
                                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", color: "var(--green-600)", fontSize: 13 }}>
                                  <CheckCircle2 size={14} /> All policies acknowledged
                                </div>
                              )}
                              {completed.length > 0 ? (
                                <div className="completed-policies-section" style={{ borderTop: actionable.length > 0 ? "1px solid var(--border-light)" : "none" }}>
                                  <button type="button" className="completed-policies-toggle" onClick={() => setShowCompletedPolicies(v => !v)}>
                                    <CheckCircle2 size={13} />
                                    <span>Acknowledged ({completed.length})</span>
                                    <ChevronDown size={13} style={{ transform: showCompletedPolicies ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                                  </button>
                                  {showCompletedPolicies && completed.map(renderPolicy)}
                                </div>
                              ) : null}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    ) : null}
                  </div>
                </>
              ) : null}

              {/* CATALOG */}
              {!showLoading && !showEmpty && !showError && trainingTab === "catalog" && viewingArticle ? (
                <ArticleViewer slug={viewingArticle} token={token} isAdmin={isAdmin} onBack={handleCloseArticle} onOpenArticle={handleOpenArticle} isFavorite={kbFavorites.some(f => f.article_slug === viewingArticle)} onToggleFavorite={handleToggleKbFavorite} />
              ) : null}

              {!showLoading && !showEmpty && !showError && trainingTab === "catalog" && !viewingArticle ? (
                <><EngNotes tabKey="catalog" /><div className="catalog-layout">
                  {/* Category sidebar */}
                  <div className="catalog-sidebar">
                    <div className="catalog-sidebar-title">Content Type</div>
                    <button className={`catalog-cat-btn ${catalogContentType === "all" ? "active" : ""}`} onClick={() => setCatalogContentType("all")}>
                      <span>All Content</span><span className="catalog-cat-count">{data.courses.length + catalogLearningPlans.length + (isElite && isInRelease("sparks", releaseFilter) ? sparksFeed.length : 0)}</span>
                    </button>
                    <button className={`catalog-cat-btn ${catalogContentType === "course" ? "active" : ""}`} onClick={() => setCatalogContentType("course")}>
                      <span>Courses</span><span className="catalog-cat-count">{data.courses.length}</span>
                    </button>
                    <button className={`catalog-cat-btn ${catalogContentType === "plan" ? "active" : ""}`} onClick={() => setCatalogContentType("plan")}>
                      <span>Learning Plans</span><span className="catalog-cat-count">{catalogLearningPlans.length}</span>
                    </button>
                    {isElite && isInRelease("sparks", releaseFilter) ? (
                      <button className={`catalog-cat-btn ${catalogContentType === "spark" ? "active" : ""}`} onClick={() => setCatalogContentType("spark")}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Zap size={12} /> Spotlights</span><span className="catalog-cat-count">{sparksFeed.length}</span>
                      </button>
                    ) : null}
                    {catalogContentType !== "plan" && catalogContentType !== "spark" ? (
                      <>
                        <div className="catalog-sidebar-title" style={{ marginTop: 16 }} title="Filter by how a course is delivered.">Formats</div>
                        {[
                          { value: "All", label: "All Formats" },
                          { value: "scorm", label: "eLearning" },
                          { value: "video", label: "Spotlight" },
                          { value: "recorded_webinar", label: "Recorded Webinar" },
                          { value: "live_webinar", label: "Live Webinar" },
                          { value: "quiz", label: "Quiz" },
                          { value: "document", label: "Document" },
                        ].map((f) => {
                          const count = f.value === "All"
                            ? data.courses.length
                            : data.courses.filter((c) => c.type === f.value).length;
                          return (
                            <button key={f.value} className={`catalog-cat-btn ${catalogType === f.value ? "active" : ""}`} onClick={() => setCatalogType(f.value)}>
                              <span>{f.label}</span><span className="catalog-cat-count">{count}</span>
                            </button>
                          );
                        })}
                      </>
                    ) : null}
                    <div className="catalog-sidebar-title" style={{ marginTop: 16 }}>Categories</div>
                    <button className={`catalog-cat-btn ${catalogCategory === "All" && !catalogCategoryId && catalogVertical === "All" ? "active" : ""}`} onClick={() => { setCatalogCategory("All"); setCatalogCategoryId(null); setCatalogVertical("All"); }}>
                      <span>All Categories</span><span className="catalog-cat-count">{data.courses.length}</span>
                    </button>
                    {catalogCategoryTreeView.length > 0 ? (
                      catalogCategoryTreeView.map((top) => (
                        <div key={top.id}>
                          <button className={`catalog-cat-btn ${catalogCategoryId === top.id ? "active" : ""}`} style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={() => {
                            setCatalogCategoryId((prev) => prev === top.id ? null : top.id);
                            setCatalogCategory("All");
                            setCatalogVertical("All");
                            if (top.children.length) setCategoryTreeExpanded((e) => ({ ...e, [top.id]: !e[top.id] }));
                          }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flex: 1, minWidth: 0 }}>
                              {top.children.length > 0 ? (categoryTreeExpanded[top.id] ? <ChevronDown size={11} /> : <ChevronRight size={11} />) : <span style={{ width: 11 }} />}
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{top.name}</span>
                            </span>
                            <span className="catalog-cat-count">{top.count}</span>
                          </button>
                          {categoryTreeExpanded[top.id] && top.children.map((child) => (
                            <button key={child.id} className={`catalog-cat-btn ${catalogCategoryId === child.id ? "active" : ""}`} style={{ paddingLeft: 24 }} onClick={() => { setCatalogCategoryId(child.id); setCatalogCategory("All"); setCatalogVertical("All"); }}>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{child.name}</span>
                              <span className="catalog-cat-count">{child.count}</span>
                            </button>
                          ))}
                        </div>
                      ))
                    ) : (
                      catalogCategories.map((cat) => (
                        <button key={cat.name} className={`catalog-cat-btn ${catalogCategory === cat.name ? "active" : ""}`} onClick={() => { setCatalogCategory(cat.name); setCatalogCategoryId(null); setCatalogVertical("All"); }}>
                          <span>{cat.name}</span><span className="catalog-cat-count">{cat.count}</span>
                        </button>
                      ))
                    )}
                    {catalogVerticals.length > 0 && (
                      <>
                        <div className="catalog-sidebar-title" style={{ marginTop: 16 }}>Verticals</div>
                        {catalogVerticals.map((v) => (
                          <button key={v.name} className={`catalog-cat-btn ${catalogVertical === v.name ? "active" : ""}`} onClick={() => { setCatalogVertical(v.name); setCatalogCategory("All"); }}>
                            <span>{v.name}</span><span className="catalog-cat-count">{v.count}</span>
                          </button>
                        ))}
                      </>
                    )}
                    <div className="catalog-sidebar-title" style={{ marginTop: 16 }}>Source</div>
                    {(isElite ? ["All", "catalog", "custom"] : ["All", "catalog"]).map((s) => (
                      <button key={s} className={`catalog-cat-btn ${catalogSource === s ? "active" : ""}`} onClick={() => setCatalogSource(s)}>
                        {s === "All" ? "All Sources" : s === "catalog" ? "Entrata Catalog" : "My Content"}
                      </button>
                    ))}
                  </div>

                  {/* Main catalog area */}
                  <div className="catalog-main">
                    <div className="flex-between mb-4">
                      <div className="flex-row">
                        <div style={{ position: "relative" }}><Search size={13} style={{ position: "absolute", left: 10, top: 9, color: "var(--text-muted)" }} /><input placeholder={catalogContentType === "plan" ? "Search learning plans..." : catalogContentType === "spark" ? "Search spotlights..." : "Search courses, learning plans, and spotlights..."} value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} style={{ paddingLeft: 30, width: 320 }} /></div>
                      </div>
                      <div className="flex-row">
                        {catalogContentType !== "plan" && catalogContentType !== "spark" ? <>
                        <span className="text-muted text-sm">{catalogContentType === "all" || catalogContentType === "course" ? `${filteredCourses.length} course${filteredCourses.length !== 1 ? "s" : ""}` : ""}{catalogContentType === "all" ? ` + ${catalogLearningPlans.filter(p => !catalogSearch || p.title.toLowerCase().includes(catalogSearch.toLowerCase())).length} plan${catalogLearningPlans.filter(p => !catalogSearch || p.title.toLowerCase().includes(catalogSearch.toLowerCase())).length !== 1 ? "s" : ""}` : ""}{catalogContentType === "all" && isElite && isInRelease("sparks", releaseFilter) ? ` + ${sparksFeed.filter(s => !catalogSearch || s.title.toLowerCase().includes(catalogSearch.toLowerCase())).length} spotlight${sparksFeed.filter(s => !catalogSearch || s.title.toLowerCase().includes(catalogSearch.toLowerCase())).length !== 1 ? "s" : ""}` : ""}</span>
                        <div className="catalog-view-toggle">
                          <button className={catalogView === "grid" ? "active" : ""} onClick={() => setCatalogView("grid")} aria-label="Grid view"><LayoutDashboard size={13} /></button>
                          <button className={catalogView === "grouped" ? "active" : ""} onClick={() => setCatalogView("grouped")} aria-label="Grouped view"><BarChart3 size={13} /></button>
                          <button className={catalogView === "list" ? "active" : ""} onClick={() => setCatalogView("list")} aria-label="List view"><List size={13} /></button>
                        </div>
                        </> : catalogContentType === "plan" ? <span className="text-muted text-sm">{catalogLearningPlans.filter(p => !catalogSearch || p.title.toLowerCase().includes(catalogSearch.toLowerCase()) || p.description?.toLowerCase().includes(catalogSearch.toLowerCase())).length} learning plan{catalogLearningPlans.filter(p => !catalogSearch || p.title.toLowerCase().includes(catalogSearch.toLowerCase()) || p.description?.toLowerCase().includes(catalogSearch.toLowerCase())).length !== 1 ? "s" : ""}</span> : <span className="text-muted text-sm">{sparksFeed.filter(s => !catalogSearch || s.title.toLowerCase().includes(catalogSearch.toLowerCase()) || (s.description || "").toLowerCase().includes(catalogSearch.toLowerCase())).length} spotlight{sparksFeed.filter(s => !catalogSearch || s.title.toLowerCase().includes(catalogSearch.toLowerCase()) || (s.description || "").toLowerCase().includes(catalogSearch.toLowerCase())).length !== 1 ? "s" : ""}</span>}
                        {(catalogCategory !== "All" || catalogVertical !== "All" || catalogType !== "All" || catalogSource !== "All" || catalogSearch) ? (
                          <button className="btn-sm" onClick={() => { setCatalogCategory("All"); setCatalogVertical("All"); setCatalogType("All"); setCatalogSource("All"); setCatalogSearch(""); }}><X size={11} /> Clear</button>
                        ) : null}
                      </div>
                    </div>

                    {/* Learning Plans section (shown for "all" or "plan" content type) */}
                    {(catalogContentType === "all" || catalogContentType === "plan") ? (() => {
                      const plansSearched = catalogLearningPlans.filter(p => !catalogSearch || p.title.toLowerCase().includes(catalogSearch.toLowerCase()) || p.description?.toLowerCase().includes(catalogSearch.toLowerCase()));
                      return plansSearched.length === 0 && catalogContentType === "plan" ? (
                        <div className="card"><div className="empty-state"><FolderOpen /><div className="empty-title">No learning plans available</div><div className="empty-desc">{catalogSearch ? "Try a different search term." : "Learning plans will appear here when created by an administrator."}</div>{catalogSearch ? <button className="btn-sm" onClick={() => setCatalogSearch("")}><X size={11} /> Clear Search</button> : null}</div></div>
                      ) : plansSearched.length > 0 ? (
                        <>
                          {catalogContentType === "all" ? <div className="catalog-section-header" style={{ padding: "12px 0 8px", fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}><GraduationCap size={15} /> Learning Plans <span className="text-muted text-sm" style={{ fontWeight: 400 }}>({plansSearched.length})</span></div> : null}
                          <div className="catalog-plans-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16, marginBottom: catalogContentType === "all" ? 24 : 0 }}>
                            {plansSearched.map((plan) => {
                              const pct = plan.course_count > 0 ? Math.round((plan.completed_count / plan.course_count) * 100) : 0;
                              return (
                                <div key={plan.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                                  <div style={{ padding: "16px 20px 12px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 }}>
                                      <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{plan.title}</h3>
                                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                        {plan.source === "catalog" || plan.company_id === null ? (
                                          <span className="source-badge" style={{ fontSize: 10, flexShrink: 0, background: "#dbeafe", color: "#1e40af" }} title="Curated by Entrata and available to every tenant">Curated by Entrata</span>
                                        ) : (
                                          <span className="source-badge" style={{ fontSize: 10, flexShrink: 0, background: "#f3f4f6", color: "#374151" }} title="Built by your organization">Custom</span>
                                        )}
                                        {plan.target_role ? <span className="source-badge" style={{ fontSize: 10, flexShrink: 0 }}>{plan.target_role}</span> : null}
                                      </div>
                                    </div>
                                    <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 12px", lineHeight: 1.5 }}>{plan.description}</p>
                                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                                      <span><BookOpen size={11} /> {plan.course_count} course{plan.course_count !== 1 ? "s" : ""}</span>
                                      <span><Clock size={11} /> {plan.est}</span>
                                      {plan.completed_count > 0 ? <span><CheckCircle2 size={11} style={{ color: "var(--green-600, #16a34a)" }} /> {plan.completed_count} done</span> : null}
                                    </div>
                                    {plan.completed_count > 0 ? (
                                      <div className="progress-bar" style={{ marginBottom: 12 }}><div className={`fill ${pct === 100 ? "green" : "blue"}`} style={{ width: `${pct}%` }} /></div>
                                    ) : null}
                                    <div style={{ borderTop: "1px solid var(--border-light, #e5e7eb)", paddingTop: 10, marginTop: 4 }}>
                                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Included Courses</div>
                                      {(plan.courses || []).slice(0, 5).map((c, i) => (
                                        <div key={c.course_id || i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12 }}>
                                          {c.completed ? <CheckCircle2 size={12} style={{ color: "var(--green-600, #16a34a)", flexShrink: 0 }} /> : <Circle size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
                                          <span style={{ flex: 1 }}>{c.title}</span>
                                          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{c.duration}</span>
                                        </div>
                                      ))}
                                      {(plan.courses || []).length > 5 ? <div style={{ fontSize: 11, color: "var(--text-muted)", paddingTop: 4 }}>+ {plan.courses.length - 5} more course{plan.courses.length - 5 !== 1 ? "s" : ""}</div> : null}
                                    </div>
                                  </div>
                                  <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border-light, #e5e7eb)", background: "var(--bg-muted, #f8f9fa)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                                    {pct === 100 ? <span style={{ fontSize: 12, fontWeight: 600, color: "var(--green-600, #16a34a)", display: "flex", alignItems: "center", gap: 4, marginRight: "auto" }}><Award size={13} /> Completed</span> : null}
                                    <button className="btn-primary btn-sm" onClick={() => enrollInLearningPlan(plan)}>{pct > 0 && pct < 100 ? "Continue" : pct === 100 ? "Review" : "Enroll"}</button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : null;
                    })() : null}

                    {/* Spotlights section (Elite + 1.2+, shown for "all" or "spark") */}
                    {isElite && isInRelease("sparks", releaseFilter) && (catalogContentType === "all" || catalogContentType === "spark") ? (() => {
                      const sparksSearched = sparksFeed.filter(s => !catalogSearch || s.title.toLowerCase().includes(catalogSearch.toLowerCase()) || (s.description || "").toLowerCase().includes(catalogSearch.toLowerCase()));
                      return sparksSearched.length === 0 && catalogContentType === "spark" ? (
                        <div className="card"><div className="empty-state"><Zap /><div className="empty-title">No Spotlights available</div><div className="empty-desc">{catalogSearch ? "Try a different search term." : "Short-form microlearning clips will appear here when assigned or published."}</div>{catalogSearch ? <button className="btn-sm" onClick={() => setCatalogSearch("")}><X size={11} /> Clear Search</button> : null}</div></div>
                      ) : sparksSearched.length > 0 ? (
                        <>
                          {catalogContentType === "all" ? <div className="catalog-section-header" style={{ padding: "12px 0 8px", fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6, borderTop: catalogLearningPlans.length > 0 ? "1px solid var(--border-light)" : "none" }}><Zap size={15} /> Spotlights <span className="text-muted text-sm" style={{ fontWeight: 400 }}>({sparksSearched.length})</span></div> : null}
                          <div className="catalog-plans-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: catalogContentType === "all" ? 24 : 0 }}>
                            {sparksSearched.map((s) => {
                              const statusLabel = s.status === "completed" ? "Completed" : s.status === "viewed" ? "In progress" : "To watch";
                              const statusClass = s.status === "completed" ? "done" : s.status === "viewed" ? "progress" : "watch";
                              const catClass = (s.category || "").toLowerCase().replace(/[^a-z]/g, "");
                              return (
                                <div key={s.id} className="card" role="button" tabIndex={0} style={{ padding: 0, overflow: "hidden", cursor: "pointer" }} onClick={() => { const idx = sparksFeed.findIndex(x => x.id === s.id); setSparkFilter("all"); setCurrentSpark(idx >= 0 ? idx : 0); setTrainingTab("sparks"); }} onKeyDown={(e) => { if (e.key === "Enter") { const idx = sparksFeed.findIndex(x => x.id === s.id); setSparkFilter("all"); setCurrentSpark(idx >= 0 ? idx : 0); setTrainingTab("sparks"); } }}>
                                  <div style={{ padding: "14px 16px 10px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                                      <span className={`spotlight-category-pill ${catClass}`}>{s.category}</span>
                                      <span className={`spark-status-pill spark-status-${statusClass}`} style={{ fontSize: 10 }}>{statusLabel}</span>
                                    </div>
                                    <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 6px", lineHeight: 1.35 }}>{s.title}</h3>
                                    <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 10px", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.description}</p>
                                    <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--text-muted)" }}>
                                      <span><Clock size={10} /> {Math.floor((s.duration_seconds || 0) / 60)}:{String((s.duration_seconds || 0) % 60).padStart(2, "0")}</span>
                                      {s.source ? <span className={`source-badge ${s.source}`} style={{ fontSize: 9 }}>{s.source === "ai_generated" ? "AI" : s.source === "recorded" ? "Recorded" : "Uploaded"}</span> : null}
                                    </div>
                                  </div>
                                  <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border-light, #e5e7eb)", background: "var(--bg-muted, #f8f9fa)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}><Zap size={10} /> Spotlight</span>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)" }}>Open {"\u2192"}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : null;
                    })() : null}

                    {/* Courses section (shown for "all" or "course" content type) */}
                    {catalogContentType !== "plan" && catalogContentType !== "spark" && catalogContentType !== "article" && catalogContentType !== "release-note" ? (filteredCourses.length === 0 && catalogContentType === "course" ? (
                      <div className="card"><div className="empty-state"><Search /><div className="empty-title">No courses match your filters</div><div className="empty-desc">Try adjusting your category, type, or search.</div><button className="btn-sm" onClick={() => { setCatalogCategory("All"); setCatalogVertical("All"); setCatalogType("All"); setCatalogSource("All"); setCatalogSearch(""); }}>Clear All Filters</button></div></div>
                    ) : catalogView === "list" ? (
                      <div className="catalog-list-view">
                        <table><thead><tr><th>Title</th><th>Category</th><th>Type</th><th>Duration</th><th>Rating</th><th></th></tr></thead><tbody>
                          {filteredCourses.map((c) => (
                            <tr key={c.id} className="catalog-list-row" style={{ cursor: "pointer" }} onClick={() => openCatalogPreview(c)}>
                              <td>
                                <div style={{ fontWeight: 500, fontSize: 13 }}>{c.title}{c.recommended_roles && c.recommended_roles.includes(user?.role) ? <span className="rec-badge" style={{ marginLeft: 6 }}>Recommended</span> : null}</div>
                                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.description || ""}</div>
                              </td>
                              <td><span style={{ fontSize: 12 }}>{c.category}</span></td>
                              <td><span className={`source-badge ${c.type}`} style={{ textTransform: "uppercase", fontSize: 10 }}>{c.type === "scorm" ? "eLearning" : c.type === "video" ? "Spotlight" : c.type === "recorded_webinar" ? "Recorded Webinar" : c.type === "live_webinar" ? "Live Webinar" : c.type}</span>{c.source === "custom" ? <span className="source-badge custom" style={{ fontSize: 10, marginLeft: 6 }} title="Created by your organization">CUSTOM</span> : null}</td>
                              <td><span style={{ fontSize: 12 }}><Clock size={10} /> {c.duration_minutes} min</span></td>
                              <td><Stars rating={Number(c.average_rating || 0)} /></td>
                              <td><button className="btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); openCatalogPreview(c); }}>View</button></td>
                            </tr>
                          ))}
                        </tbody></table>
                      </div>
                    ) : catalogView === "grouped" ? (
                      <div className="catalog-grouped">
                        {groupedCourses.map(([category, courses]) => (
                          <div key={category} className="catalog-group">
                            <div className="catalog-group-header">
                              <h3>{category}</h3>
                              <span className="text-muted text-sm">{courses.length} course{courses.length !== 1 ? "s" : ""}</span>
                            </div>
                            <div className="catalog-grid">{courses.map((c) => (
                              <div key={c.id} className="course-card" role="button" tabIndex={0} style={{ cursor: "pointer" }} onClick={() => openCatalogPreview(c)} onKeyDown={(e) => e.key === "Enter" && openCatalogPreview(c)}>
                                <div className={`course-card-thumb ${thumbCls(c.category)}`}><CourseIcon type={c.type} /></div>
                                <div className="course-card-body"><div className="course-card-title">{c.title}{c.recommended_roles && c.recommended_roles.includes(user?.role) ? <span className="rec-badge">Recommended</span> : null}</div><div className="course-card-meta"><Clock size={11} /> {c.duration_minutes} min {c.source === "custom" ? <span className="source-badge custom" style={{ marginLeft: 4 }}>Custom</span> : null}{c.entrata_product ? <span className="product-tag">{c.entrata_product}</span> : null}{c.release_version ? <span className="release-pill" style={{ marginLeft: 4, fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 10, background: "#ecfeff", color: "#0e7490", border: "1px solid #a5f3fc" }}>Release {c.release_version}</span> : null}</div><div className="flex-row mt-2"><Stars rating={Number(c.average_rating || 0)} /><span className="text-muted text-sm">({c.rating_count})</span></div></div>
                              </div>
                            ))}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                      {catalogContentType === "all" && filteredCourses.length > 0 ? <div className="catalog-section-header" style={{ padding: "12px 0 8px", fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6, borderTop: (catalogContentType === "all" && catalogLearningPlans.length > 0) ? "1px solid var(--border-light)" : "none", marginTop: (catalogContentType === "all" && catalogLearningPlans.length > 0) ? 0 : 0 }}><BookOpen size={15} /> Courses <span className="text-muted text-sm" style={{ fontWeight: 400 }}>({filteredCourses.length})</span></div> : null}
                      {catalogContentType === "all" || catalogContentType === "course" ? (
                        <div className="catalog-grid">{filteredCourses.map((c) => (
                          <div key={c.id} className="course-card" role="button" tabIndex={0} style={{ cursor: "pointer" }} onClick={() => openCatalogPreview(c)} onKeyDown={(e) => e.key === "Enter" && openCatalogPreview(c)}>
                            <div className={`course-card-thumb ${thumbCls(c.category)}`}><CourseIcon type={c.type} /></div>
                            <div className="course-card-body"><div className="course-card-title">{c.title}{c.recommended_roles && c.recommended_roles.includes(user?.role) ? <span className="rec-badge">Recommended</span> : null}</div><div className="course-card-meta"><Clock size={11} /> {c.duration_minutes} min &middot; {c.category} {c.source === "custom" ? <span className="source-badge custom" style={{ marginLeft: 4 }}>Custom</span> : null}{c.tier_required === "elite" ? <span className="source-badge elite" style={{ marginLeft: 4 }}>Elite</span> : null}{c.entrata_product ? <span className="product-tag">{c.entrata_product}</span> : null}{c.release_version ? <span className="release-pill" style={{ marginLeft: 4, fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 10, background: "#ecfeff", color: "#0e7490", border: "1px solid #a5f3fc" }}>Release {c.release_version}</span> : null}</div><div className="flex-row mt-2"><Stars rating={Number(c.average_rating || 0)} /><span className="text-muted text-sm">({c.rating_count})</span></div></div>
                          </div>
                        ))}</div>
                      ) : null}
                      </>
                    )) : null}
                  </div>
                  {isAdmin && discoveryCourses.length > 0 ? (
                    <div className="card mt-4" style={{ marginLeft: 0 }}>
                      <div className="card-header"><h2><Target size={14} /> Discover more products</h2></div>
                      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 16px 8px" }}>These courses are for Entrata products your company hasn't contracted yet. Explore to learn what's available.</p>
                      <div className="catalog-grid" style={{ padding: "0 16px 16px" }}>
                        {discoveryCourses.map((c) => (
                          <div key={c.id} className="course-card discovery-card">
                            <div className={`course-card-thumb ${thumbCls(c.category)}`}><CourseIcon type={c.type} /></div>
                            <div className="course-card-body">
                              <div className="course-card-title">{c.title}</div>
                              <div className="course-card-meta"><Clock size={11} /> {c.duration_minutes} min &middot; <span className="product-tag discovery">{c.entrata_product}</span></div>
                              <button className="btn-sm discovery-cta" style={{ marginTop: 6 }} onClick={(e) => { e.stopPropagation(); showToast("Demo request submitted. Your account team will follow up.", "success"); }}>Request demo</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div></>
              ) : null}

              {/* Knowledge Hub content is now integrated into Learning Catalog above */}

              {/* TRAINING AI - COMMENTED OUT FOR PROTOTYPE
              {!showLoading && !showEmpty && !showError && trainingTab === "training-ai" ? (
                <><EngNotes tabKey="training-ai" /><TrainingAI token={token} isManager={isManager} isAdmin={isAdmin} /></>
              ) : null}
              */}

              {/* SPOTLIGHTS FEED */}
              {!showLoading && !showEmpty && !showError && trainingTab === "sparks" ? (
                <>
                  <EngNotes tabKey="sparks" />

                  {/* Training R2: explainer for "what is a Spotlight?" (Decision #1 - we merged the legacy "Video" type into Spotlight) */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", marginBottom: 12, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, fontSize: 13, color: "#78350f", lineHeight: 1.5 }}>
                    <Zap size={16} style={{ flexShrink: 0, marginTop: 2, color: "#b45309" }} />
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>What is a Spotlight?</div>
                      <div><strong>Spotlights</strong> are short-form, TikTok-style microlearning clips (typically 60-90 seconds) assigned to you by your manager. Unlike full <strong>Courses</strong> — which are multi-asset training units that produce a certificate — Spotlights are single, focused clips designed for quick consumption in the moment.</div>
                      <div style={{ marginTop: 4 }}>We unified "Videos" and "Spotlights" into one content type. Longer-form video content lives inside Courses as lesson scenes, or in the Catalog as Recorded / Live Webinars.</div>
                    </div>
                  </div>

                  {sparksFeed.length === 0 ? (
                    <div className="card"><div className="empty-state"><Zap /><div className="empty-title">No Spotlights assigned</div><div className="empty-desc">Short-form training clips will appear here when assigned by your manager.</div></div></div>
                  ) : (
                    <>
                      <div className="spark-filter-tabs" role="tablist" aria-label="Filter Spotlights by status">
                        {[
                          { key: "to-watch", label: "To watch", count: sparksAssigned },
                          { key: "in-progress", label: "In progress", count: sparksInProgress },
                          { key: "completed", label: "Completed", count: sparksCompleted },
                          { key: "all", label: "All", count: sparksFeed.length },
                        ].map(({ key, label, count }) => (
                          <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={sparkFilter === key}
                            className={`spark-filter-tab ${sparkFilter === key ? "active" : ""}`}
                            onClick={() => setSparkFilter(key)}
                          >
                            {label}
                            <span className="spark-filter-count">{count}</span>
                          </button>
                        ))}
                      </div>

                      {sparksFiltered.length === 0 ? (
                        <div className="card">
                          <div className="empty-state">
                            <Zap />
                            <div className="empty-title">Nothing in this queue</div>
                            <div className="empty-desc">Try another filter or check back when new Spotlights are assigned.</div>
                          </div>
                        </div>
                      ) : (
                        <div className="spotlight-feed">
                          {activeSpark ? (
                            <div className="spark-card spotlight-card">
                              <div className={`spark-card-accent ${activeSpark.category.toLowerCase().replace(/[^a-z]/g, "")}`} />

                              <div className="spotlight-card-header">
                                <div className="spotlight-card-meta">
                                  <span className={`spotlight-category-pill ${activeSpark.category.toLowerCase().replace(/[^a-z]/g, "")}`}>{activeSpark.category}</span>
                                  <span className="spotlight-duration"><Clock size={12} /> {Math.floor(activeSpark.duration_seconds / 60)}:{String(activeSpark.duration_seconds % 60).padStart(2, "0")}</span>
                                  <span className={`spark-status-pill spark-status-${activeSpark.status === "completed" ? "done" : activeSpark.status === "viewed" ? "progress" : "watch"}`}>
                                    {activeSpark.status === "completed" ? "Completed" : activeSpark.status === "viewed" ? "In progress" : "To watch"}
                                  </span>
                                </div>
                                <div className="spotlight-card-badges">
                                  <span className={`source-badge ${activeSpark.source}`}>{activeSpark.source === "ai_generated" ? "AI" : activeSpark.source === "recorded" ? "Recorded" : "Uploaded"}</span>
                                  <span className="source-badge catalog">{activeSpark.content_type === "tutorial" ? "Screen tutorial" : "Short clip"}</span>
                                  {activeSpark.assigned_by === "rule" ? <span className="source-badge custom" title="Assigned by performance rule"><Sparkles size={9} /> ELI</span> : null}
                                </div>
                              </div>

                              <div className="spark-video-shell" ref={sparkVideoShellRef}>
                                <div className="spark-video-chrome">
                                  <button type="button" className="spark-fs-btn" onClick={toggleSparkFullscreen} aria-label={sparkVideoFullscreen ? "Exit full screen" : "Full screen"}>
                                    {sparkVideoFullscreen ? <Minimize2 size={18} aria-hidden /> : <Maximize2 size={18} aria-hidden />}
                                  </button>
                                </div>
                                <video
                                  key={activeSpark.id}
                                  className="spark-video-element"
                                  src={sparkVideoSrc(activeSpark)}
                                  controls
                                  playsInline
                                  preload="metadata"
                                  poster={activeSpark.thumbnail_url || undefined}
                                />
                              </div>
                              {!activeSpark.video_url ? (
                                <p className="spark-demo-caption">Demo clip: CC0 sample from Mozilla MDN (shown when no hosted video URL is set).</p>
                              ) : null}

                              <h2 className="spark-card-title">{activeSpark.title}</h2>
                              <p className="spark-card-desc">{activeSpark.description}</p>

                              {activeSpark.content_type === "tutorial" && activeSpark.steps?.length ? (
                                <details className="spark-walkthrough">
                                  <summary>Step-by-step walkthrough</summary>
                                  <div className="spark-tutorial">
                                    <div className="spark-steps-indicator">
                                      {activeSpark.steps.map((_, i) => (
                                        <button key={i} type="button" className={`spark-step-dot ${i === sparkStep ? "active" : i < sparkStep ? "done" : ""}`} onClick={() => setSparkStep(i)} aria-label={`Step ${i + 1}`} />
                                      ))}
                                    </div>
                                    {activeSpark.steps[sparkStep] ? (
                                      <div className="spark-step-content">
                                        <div className="spark-step-num">Step {sparkStep + 1} of {activeSpark.steps.length}</div>
                                        <div className="spark-step-action"><span className={`spark-action-badge ${activeSpark.steps[sparkStep].action}`}>{activeSpark.steps[sparkStep].action}</span></div>
                                        <h3>{activeSpark.steps[sparkStep].title}</h3>
                                        <p>{activeSpark.steps[sparkStep].description}</p>
                                        {activeSpark.steps[sparkStep].voiceover ? <div className="spark-voiceover"><Volume2 size={12} /> {activeSpark.steps[sparkStep].voiceover}</div> : null}
                                        {activeSpark.steps[sparkStep].quiz ? <div className="spark-quiz"><Lightbulb size={12} /> {activeSpark.steps[sparkStep].quiz}</div> : null}
                                        <div className="spark-step-nav">
                                          {sparkStep > 0 ? <button type="button" onClick={() => setSparkStep(sparkStep - 1)}>Previous</button> : <span />}
                                          {sparkStep < activeSpark.steps.length - 1 ? <button type="button" className="btn-primary btn-sm" onClick={() => setSparkStep(sparkStep + 1)}>Next</button> : null}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                </details>
                              ) : null}

                              <div className="spotlight-card-footer">
                                <div className="spotlight-footer-action">
                                  {activeSpark.status === "completed" ? (
                                    <span className="spotlight-completed-label"><CheckCircle2 size={14} /> Completed</span>
                                  ) : (
                                    <button type="button" className="btn-primary btn-sm" onClick={() => handleSparkComplete(activeSpark.id)}><CheckCircle2 size={11} /> Mark Complete</button>
                                  )}
                                </div>
                                <div className="spotlight-footer-nav">
                                  <button type="button" aria-label="Previous Spotlight" disabled={currentSpark <= 0} onClick={() => { setCurrentSpark((p) => Math.max(0, p - 1)); setSparkStep(0); }}>
                                    <ArrowLeft size={14} />
                                  </button>
                                  <span className="spotlight-counter">{currentSpark + 1} of {sparksFiltered.length}</span>
                                  <button
                                    type="button"
                                    aria-label="Next Spotlight"
                                    disabled={currentSpark >= sparksFiltered.length - 1}
                                    onClick={() => {
                                      const next = Math.min(sparksFiltered.length - 1, currentSpark + 1);
                                      setCurrentSpark(next);
                                      setSparkStep(0);
                                      const nextSpark = sparksFiltered[next];
                                      if (nextSpark?.status !== "completed") handleSparkView(nextSpark.id);
                                    }}
                                  >
                                    <ArrowRight size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : null}

              {/* KNOWLEDGE BASE */}
              {!showLoading && !showEmpty && !showError && trainingTab === "knowledge-base" && viewingArticle ? (
                <ArticleViewer slug={viewingArticle} token={token} isAdmin={isAdmin} onBack={handleCloseArticle} onOpenArticle={handleOpenArticle} isFavorite={kbFavorites.some(f => f.article_slug === viewingArticle)} onToggleFavorite={handleToggleKbFavorite} />
              ) : null}
              {!showLoading && !showEmpty && !showError && trainingTab === "knowledge-base" && !viewingArticle ? (
                <>
                  <EngNotes tabKey="knowledge-base" />
                  <SupportAssistantHero token={token} onOpenArticle={handleOpenArticle} />
                  <KnowledgeHub kbInstances={kbInstances} onOpenArticle={handleOpenArticle} token={token} recentViews={kbRecentViews} favorites={kbFavorites} onToggleFavorite={handleToggleKbFavorite} />
                </>
              ) : null}

              {/* WHAT'S NEW -- Release-Grouped Accordion */}
              {!showLoading && !showEmpty && !showError && trainingTab === "whats-new" ? (
                <>
                  <EngNotes tabKey="whats-new" />
                  <div className="whats-new-container">
                    <div className="whats-new-header">
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}><Bell size={16} style={{ verticalAlign: -2 }} /> What's New</h2>
                        {whatsNewUnread > 0 ? <span className="whats-new-unread-badge">{whatsNewUnread} unread</span> : null}
                        <span className="whats-new-track-badge">Your track: {whatsNewCompanyTrack === "rapid" ? "Rapid" : "Standard"}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <select value={whatsNewTrackFilter} onChange={(e) => { setWhatsNewTrackFilter(e.target.value); loadWhatsNew({ track: e.target.value }); }} style={{ fontSize: 13, padding: "6px 10px" }}>
                          <option value="all">All Tracks</option>
                          <option value="rapid">Rapid Only</option>
                          <option value="standard">Standard Only</option>
                        </select>
                        <select value={whatsNewAreaFilter} onChange={(e) => { setWhatsNewAreaFilter(e.target.value); loadWhatsNew({ area: e.target.value }); }} style={{ fontSize: 13, padding: "6px 10px" }}>
                          <option value="all">All Product Areas</option>
                          <option value="Leasing">Leasing</option>
                          <option value="Accounting">Accounting</option>
                          <option value="Maintenance">Maintenance</option>
                          <option value="Resident Portal">Resident Portal</option>
                          <option value="Analytics">Analytics</option>
                          <option value="Platform">Platform</option>
                        </select>
                        <select value={whatsNewTypeFilter} onChange={(e) => { setWhatsNewTypeFilter(e.target.value); loadWhatsNew({ type: e.target.value }); }} style={{ fontSize: 13, padding: "6px 10px" }}>
                          <option value="all">All Types</option>
                          <option value="new_feature">New Feature</option>
                          <option value="improvement">Improvement</option>
                          <option value="fix">Bug Fix</option>
                          <option value="deprecation">Deprecation</option>
                        </select>
                        <div className="whats-new-search-wrapper">
                          <Search size={13} />
                          <input type="text" placeholder="Search updates..." value={whatsNewSearch} onChange={(e) => { setWhatsNewSearch(e.target.value); }} onKeyDown={(e) => { if (e.key === "Enter") loadWhatsNew({ search: whatsNewSearch }); }} style={{ fontSize: 13, padding: "6px 10px", border: "1px solid var(--border-light, #e5e7eb)", borderRadius: 6, width: 160 }} />
                        </div>
                        {whatsNewUnread > 0 ? <button className="btn-sm" onClick={handleMarkAllRead}><CheckCircle2 size={12} /> Mark all read</button> : null}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 12, padding: "10px 16px", background: "var(--bg-secondary, #f8f9fb)", borderRadius: 8, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 4, alignItems: "flex-start" }}>
                      <Info size={14} style={{ flexShrink: 0, marginTop: 2, color: "var(--text-muted)" }} />
                      <div>
                        <strong>Rapid</strong> releases ship every 2 weeks with the latest features. Once per quarter, all Rapid updates are bundled into a <strong>Standard</strong> release for broader rollout. You can view both tracks regardless of which track your company is on.
                      </div>
                    </div>

                    {whatsNewUnread > 3 ? (
                      <div className="whats-new-ai-summary card">
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <Bot size={16} style={{ color: "var(--accent)" }} />
                          <span style={{ fontWeight: 600, fontSize: 14 }}>AI Summary</span>
                        </div>
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                          Since your last visit, {whatsNewUnread} updates were released across {whatsNewReleases.filter(r => (r.updates || []).some(u => !whatsNewReadIds.has(u.id))).length} release(s). Key highlights include new features and improvements across your workflows.
                        </p>
                      </div>
                    ) : null}

                    {whatsNewLoading ? (
                      <div className="card" style={{ textAlign: "center", padding: 32 }}><Loader2 size={20} className="spinner" /> Loading updates...</div>
                    ) : whatsNewReleases.length === 0 ? (
                      <div className="card" style={{ textAlign: "center", padding: 48 }}>
                        <Bell size={32} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
                        <h3>No updates yet</h3>
                        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Product updates will appear here as they're released.</p>
                      </div>
                    ) : (
                      <div className="whats-new-releases">
                        {whatsNewReleases.map((release) => {
                          const isExpanded = !!whatsNewExpanded[release.id];
                          const updates = release.updates || [];
                          const unreadInRelease = updates.filter(u => !whatsNewReadIds.has(u.id)).length;
                          const areaGroups = {};
                          for (const u of updates) {
                            if (!areaGroups[u.product_area]) areaGroups[u.product_area] = [];
                            areaGroups[u.product_area].push(u);
                          }
                          const sortedAreas = Object.keys(areaGroups).sort();
                          const typeColors = { new_feature: "#2563eb", improvement: "#059669", fix: "#d97706", deprecation: "#dc2626" };
                          const typeLabels = { new_feature: "New Feature", improvement: "Improvement", fix: "Bug Fix", deprecation: "Deprecation" };
                          const relDate = new Date(release.release_date).toLocaleDateString("en-US", { month: "long", year: "numeric" });
                          return (
                            <div key={release.id} className={`whats-new-release-group ${isExpanded ? "expanded" : "collapsed"}`}>
                              <button className="whats-new-release-header" onClick={() => setWhatsNewExpanded(prev => ({ ...prev, [release.id]: !prev[release.id] }))}>
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                <span className="whats-new-release-name">{release.name} -- {release.label}</span>
                                <span className={`whats-new-track-chip whats-new-track-chip--${release.release_track || "standard"}`}>{release.release_track === "rapid" ? "Rapid" : "Standard"}</span>
                                <span className="whats-new-release-date">{relDate}</span>
                                <span className="whats-new-release-count">{updates.length} update{updates.length !== 1 ? "s" : ""}</span>
                                {unreadInRelease > 0 ? <span className="whats-new-release-unread">{unreadInRelease} new</span> : null}
                              </button>
                              {isExpanded && release.bundled_rapid_releases?.length > 0 ? (
                                <div style={{ padding: "0 16px 8px 36px", fontSize: 12, color: "var(--text-muted)" }}>
                                  Includes updates from Rapid releases: {release.bundled_rapid_releases.join(", ")}
                                </div>
                              ) : null}
                              {isExpanded ? (
                                <div className="whats-new-release-body">
                                  {sortedAreas.map(area => (
                                    <div key={area} className="whats-new-area-section">
                                      <div className="whats-new-area-header">
                                        <span className="whats-new-area-name">{area.toUpperCase()}</span>
                                        <span className="whats-new-area-count">{areaGroups[area].length} update{areaGroups[area].length !== 1 ? "s" : ""}</span>
                                      </div>
                                      {areaGroups[area].map(update => {
                                        const isRead = whatsNewReadIds.has(update.id);
                                        return (
                                          <div key={update.id} className={`whats-new-card ${isRead ? "whats-new-card--read" : ""}`} onClick={() => !isRead && handleMarkUpdateRead(update.id)}>
                                            <div className="whats-new-card-content">
                                              <div className="whats-new-card-badges">
                                                <span className="whats-new-type-badge" style={{ background: typeColors[update.update_type] || "#6b7280", color: "#fff" }}>{typeLabels[update.update_type] || update.update_type}</span>
                                                {!isRead ? <span className="whats-new-unread-dot" /> : null}
                                              </div>
                                              <h3 className="whats-new-card-title">{update.title}</h3>
                                              <p className="whats-new-card-summary">{update.summary}</p>
                                              {update.body_html ? (
                                                <details className="whats-new-details">
                                                  <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--accent)", fontWeight: 500 }}>Read more</summary>
                                                  <div className="whats-new-body" dangerouslySetInnerHTML={{ __html: update.body_html }} />
                                                </details>
                                              ) : null}
                                              {update.target_roles?.length > 0 ? (
                                                <div className="whats-new-card-roles">
                                                  {update.target_roles.map(r => <span key={r} className="whats-new-role-chip">{r}</span>)}
                                                </div>
                                              ) : null}
                                              {update.linked_course_id && isAdmin ? (
                                                <div style={{ display: "flex", gap: 8, marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border-light)" }}>
                                                  <button
                                                    className="btn-sm"
                                                    style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
                                                    onClick={(e) => { e.stopPropagation(); setTrainingTab("overview"); setAdminSubTab("assign"); }}
                                                  >
                                                    <Users size={11} /> Assign to Team
                                                  </button>
                                                  <button
                                                    className="btn-sm"
                                                    style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
                                                    onClick={(e) => { e.stopPropagation(); setTrainingTab("catalog"); }}
                                                  >
                                                    <Play size={11} /> View Course
                                                  </button>
                                                </div>
                                              ) : null}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : null}

              {/* CREDENTIALS (Certifications + Certificates) -- Training R2 decision #5 */}
              {!showLoading && !showEmpty && !showError && trainingTab === "certifications" ? (
                <>
                  <EngNotes tabKey="certifications" />
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", marginBottom: 12, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: 13, color: "#1e40af", lineHeight: 1.5 }}>
                    <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>Credentials: Certifications vs Certificates</div>
                      <div><strong>Certifications</strong> are multi-course credential programs — they may include required courses, expiry/renewal, and continuing-education requirements. Assigned by your administrator.</div>
                      <div style={{ marginTop: 4 }}><strong>Certificates</strong> are per-course completion documents, generated automatically when you finish any course.</div>
                    </div>
                  </div>
                  {/* Sub-tab switcher */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 16, borderBottom: "1px solid var(--border)" }} role="tablist" aria-label="Credentials views">
                    {[
                      { key: "certifications", label: "Certifications", count: myCertifications.length, desc: "Multi-course programs" },
                      { key: "certificates", label: "Certificates", count: data.certificates.length, desc: "Per-course documents" },
                    ].map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        role="tab"
                        aria-selected={credentialsSubTab === s.key}
                        onClick={() => setCredentialsSubTab(s.key)}
                        title={s.desc}
                        style={{
                          padding: "8px 14px",
                          fontSize: 13,
                          fontWeight: 600,
                          border: "none",
                          borderBottom: credentialsSubTab === s.key ? "2px solid var(--primary)" : "2px solid transparent",
                          background: "transparent",
                          color: credentialsSubTab === s.key ? "var(--primary)" : "var(--text-secondary)",
                          cursor: "pointer",
                          marginBottom: -1,
                        }}
                      >
                        {s.label} <span style={{ marginLeft: 4, fontSize: 11, fontWeight: 500, opacity: 0.75 }}>({s.count})</span>
                      </button>
                    ))}
                  </div>
                  {credentialsSubTab === "certifications" ? (
                  <div className="card mb-4">
                    <div className="card-header"><h2><Award /> Certification Programs</h2></div>
                    {myCertifications.length === 0 ? <div className="empty-state"><Award /><div className="empty-title">No certification programs assigned</div><div className="empty-desc">Programs assigned by your administrator will appear here.</div></div> : (
                    <div className="item-list">
                      {myCertifications.map((cp) => {
                        const coursesRequired = cp.total_required ?? (cp.courses || []).filter(c => c.required).length;
                        const coursesCompleted = cp.completed_courses ?? (cp.courses || []).filter(c => c.enrollment_status === "completed").length;
                        const pct = coursesRequired > 0 ? Math.round((coursesCompleted / coursesRequired) * 100) : 0;
                        return (
                          <details key={cp.id} className="spark-walkthrough" style={{ margin: 0 }}>
                            <summary>
                              <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
                                <div className="avatar-sm green"><Award size={12} /></div>
                                <div className="item-body" style={{ flex: 1, minWidth: 0 }}>
                                  <div className="item-title">{cp.title}</div>
                                  <div className="item-meta" style={{ marginTop: 6, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                                    <span className={`source-badge ${cp.type === "compliance" ? "custom" : "catalog"}`}>{cp.type === "compliance" ? "Compliance" : "Standard"}</span>
                                    <span className="text-muted text-sm">{coursesCompleted}/{coursesRequired} courses{cp.expiry_months != null ? ` · Renews every ${cp.expiry_months} mo` : ""}</span>
                                  </div>
                                  <div className="progress-bar" style={{ marginTop: 8 }}><div className={`fill ${pct === 100 ? "green" : pct > 0 ? "amber" : "blue"}`} style={{ width: `${pct}%` }} /></div>
                                </div>
                                <div className="item-actions" style={{ flexShrink: 0 }}>
                                  {cp.status === "earned" ? <span className="status completed">Earned</span> : cp.status === "in_progress" ? <span className="status in_progress">In progress</span> : <span className="status" style={{ background: "var(--muted-bg)", color: "var(--text-secondary)" }}>Not started</span>}
                                </div>
                              </div>
                            </summary>
                            <div style={{ padding: "0 12px 12px 16px" }}>
                              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                                {(cp.courses || []).map((course, idx) => (
                                  <li key={idx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "4px 0" }}>
                                    {course.enrollment_status === "completed" ? <CheckCircle2 size={14} style={{ color: "var(--green-600)", flexShrink: 0 }} aria-hidden="true" /> : <Circle size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} aria-hidden="true" />}
                                    {course.course_title}
                                  </li>
                                ))}
                              </ul>
                              {cp.status === "earned" ? (
                                <div className="flex-row" style={{ marginTop: 12, alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                  {cp.issued_at ? <span className="text-muted text-sm">Earned {fD(cp.issued_at, userLocale)}</span> : null}
                                  <button type="button" className="btn-primary btn-sm" onClick={() => window.open(`${API_BASE}/api/certifications/${cp.id}/download?token=${encodeURIComponent(token)}`, "_blank")}><Download size={11} aria-hidden="true" /> Download Certificate</button>
                                </div>
                              ) : null}
                            </div>
                          </details>
                        );
                      })}
                    </div>
                    )}
                  </div>
                  ) : (
                  <div className="card">
                    <div className="card-header"><h2><Award /> My Certificates</h2></div>
                    {data.certificates.length === 0 ? <div className="empty-state"><Award /><div className="empty-title">No certificates yet</div><div className="empty-desc">Complete training courses to earn certificates.</div></div> : (
                      <div className="item-list">{data.certificates.map((c) => (
                        <div key={c.id} className="item">
                          <div className="avatar-sm green"><Award size={12} /></div>
                          <div className="item-body"><div className="item-title">{c.course_title}</div><div className="item-meta">{c.certificate_number} &middot; Issued {fD(c.issued_at)} &middot; Expires {fD(c.expires_at)}</div></div>
                          <div className="item-actions" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <StatusBadge status={c.revoked ? "expired" : "active"} />
                            {!c.revoked ? <button type="button" className="btn-sm" onClick={() => window.open(`${API_BASE}/api/certificates/${c.id}/download?token=${encodeURIComponent(token)}`, "_blank")}><Download size={11} aria-hidden="true" /> Download</button> : null}
                          </div>
                        </div>
                      ))}</div>
                    )}
                  </div>
                  )}
                </>
              ) : null}

              {/* TEAM */}
              {!showLoading && !showEmpty && !showError && trainingTab === "team" ? (
                <>
                  <EngNotes tabKey="team" />
                  {teamDetailUser && teamDetailData ? (
                    <div>
                      <button className="btn-sm mb-4" onClick={() => { setTeamDetailUser(null); setTeamDetailData(null); }}>&larr; {t("common.back")}</button>
                      <div className="card mb-4">
                        <div className="card-header">
                          <div className="flex-row">
                            <div className={`avatar-sm ${aC(teamDetailData.user.name)}`}>{ini(teamDetailData.user.name)}</div>
                            <div><h2 style={{ margin: 0 }}>{teamDetailData.user.name}</h2><div className="text-muted text-sm">{teamDetailData.user.role} &middot; {teamDetailData.user.property_name}{teamDetailData.user.locale && teamDetailData.user.locale !== "en" ? ` &middot; ${teamDetailData.user.locale}` : ""}</div></div>
                          </div>
                        </div>
                        <div className="stats-row" style={{ padding: "12px 16px" }}>
                          <div className="stat-card-mini"><div className="stat-value">{teamDetailData.summary.completed}/{teamDetailData.summary.total_enrolled}</div><div className="stat-label">Completed</div></div>
                          <div className="stat-card-mini"><div className="stat-value">{teamDetailData.summary.in_progress}</div><div className="stat-label">In Progress</div></div>
                          <div className="stat-card-mini"><div className="stat-value" style={{ color: teamDetailData.summary.overdue > 0 ? "var(--danger)" : "inherit" }}>{teamDetailData.summary.overdue}</div><div className="stat-label">Overdue</div></div>
                          <div className="stat-card-mini"><div className="stat-value">{teamDetailData.summary.avg_score || "\u2014"}%</div><div className="stat-label">Avg Score</div></div>
                          <div className="stat-card-mini"><div className="stat-value">{fmtSeconds(teamDetailData.summary.total_time_seconds)}</div><div className="stat-label">Time Invested</div></div>
                        </div>
                      </div>
                      <div className="grid two">
                        <div className="card">
                          <div className="card-header"><h2><BookOpen /> Enrollments</h2></div>
                          <div className="table-wrap"><table><thead><tr><th>Course</th><th>Category</th><th>Status</th><th>Score</th><th>Due</th><th>Time</th></tr></thead><tbody>
                            {teamDetailData.enrollments.map((e) => (
                              <tr key={e.id}><td>{e.title}</td><td>{e.category}</td><td><StatusBadge status={['assigned','in_progress'].includes(e.status) && e.due_date && new Date(e.due_date) < new Date() ? "overdue" : e.status} /></td><td style={{ textAlign: "right" }}>{e.score != null ? `${e.score}%` : "\u2014"}</td><td>{fD(e.due_date, userLocale)}</td><td>{fmtSeconds(e.time_spent_seconds)}</td></tr>
                            ))}
                          </tbody></table></div>
                        </div>
                        <div>
                          <div className="card mb-4">
                            <div className="card-header"><h2><Award /> Certificates</h2></div>
                            {teamDetailData.certificates.length === 0 ? <div className="empty-state"><Award /><div className="empty-title">No certificates yet</div></div> : (
                              <div className="item-list">{teamDetailData.certificates.map((ct, idx) => (
                                <div key={idx} className="item"><div className="item-body"><div className="item-title">{ct.course_title}</div><div className="item-meta">{ct.certificate_number} &middot; Issued {fD(ct.issued_at, userLocale)} &middot; Expires {fD(ct.expires_at, userLocale)}</div></div></div>
                              ))}</div>
                            )}
                          </div>
                          <div className="card">
                            <div className="card-header"><h2><BarChart3 /> Category Completion</h2></div>
                            <div className="table-wrap"><table><thead><tr><th>Category</th><th>Completed</th><th>Total</th><th>Rate</th></tr></thead><tbody>
                              {teamDetailData.category_stats.map((cs) => {
                                const rate = cs.total > 0 ? Math.round((cs.completed / cs.total) * 100) : 0;
                                return <tr key={cs.category}><td>{cs.category}</td><td>{cs.completed}</td><td>{cs.total}</td><td><div className="progress-bar" style={{ width: 80, display: "inline-block" }}><div className={`fill ${rate === 100 ? "green" : "blue"}`} style={{ width: `${rate}%` }} /></div> {rate}%</td></tr>;
                              })}
                            </tbody></table></div>
                          </div>
                          {/* TRAINING AI - COMMENTED OUT FOR PROTOTYPE
                          {teamDetailData.tai_readiness.length > 0 ? (
                            <div className="card mt-4">
                              <div className="card-header"><h2><Bot /> Training AI Readiness</h2></div>
                              <div className="item-list">{teamDetailData.tai_readiness.map((tr, idx) => (
                                <div key={idx} className="item"><div className="item-body"><div className="item-title">{tr.category}</div><div className="item-meta">Level: {tr.skill_level} &middot; {tr.sessions_completed} sessions{tr.last_session_date ? ` &middot; Last: ${fD(tr.last_session_date, userLocale)}` : ""}</div></div></div>
                              ))}</div>
                            </div>
                          ) : null}
                          */}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="stats-row">
                        <div className="stat-card"><div className="stat-icon blue"><Users /></div><div><div className="stat-value">{data.team.length}</div><div className="stat-label">{t("team.members")}</div></div></div>
                        <div className="stat-card"><div className="stat-icon green"><CheckCircle2 /></div><div><div className="stat-value">{(() => { const total = data.team.reduce((s, m) => s + Number(m.completed_courses || 0) + Number(m.open_courses || 0), 0); const done = data.team.reduce((s, m) => s + Number(m.completed_courses || 0), 0); return total > 0 ? `${Math.round((done / total) * 100)}%` : "0%"; })()}</div><div className="stat-label">{t("team.completionRate")}</div></div></div>
                        <div className="stat-card"><div className="stat-icon red"><AlertTriangle /></div><div><div className="stat-value">{data.teamOverdue.length}</div><div className="stat-label">{t("team.overdueItems")}</div></div></div>
                        <div className="stat-card"><div className="stat-icon purple"><BarChart3 /></div><div><div className="stat-value">{data.team.reduce((s, m) => s + Number(m.completed_courses || 0), 0)}</div><div className="stat-label">Completions</div></div></div>
                      </div>
                      <div className="admin-subtabs" style={{ marginBottom: 12 }}>
                        <button className={teamSubTab === "status" ? "active" : ""} onClick={() => setTeamSubTab("status")}><Users size={13} /> {t("team.status")}</button>
                        <button className={teamSubTab === "analytics" ? "active" : ""} onClick={() => { setTeamSubTab("analytics"); if (!teamAnalytics) loadTeamAnalytics(); }}><BarChart3 size={13} /> {t("team.analytics")}</button>
                      </div>

                      {teamSubTab === "status" ? (
                        <>
                          <div className="card mb-4">
                            <div className="card-header"><h2><Plus /> Assign Course</h2></div>
                            <form onSubmit={assignCourse} className="form-stack" style={{ padding: "0 16px 16px" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px auto", gap: 12, alignItems: "end" }}>
                                <div className="form-group" style={{ margin: 0 }}><label>Team member</label><select value={managerAssign.userId} onChange={(e) => setManagerAssign((o) => ({ ...o, userId: e.target.value }))}><option value="">Select...</option>{data.team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                                <div className="form-group" style={{ margin: 0, position: "relative" }}>
                                  <label>Course</label>
                                  <div style={{ position: "relative" }}>
                                    <Search size={12} style={{ position: "absolute", left: 8, top: 9, color: "var(--text-muted)" }} />
                                    <input placeholder="Search courses..." value={managerCourseSearch} onChange={(e) => { setManagerCourseSearch(e.target.value); setManagerAssign(o => ({ ...o, courseId: "" })); }} style={{ paddingLeft: 28, width: "100%" }} />
                                  </div>
                                  {managerAssign.courseId ? <div style={{ fontSize: 11, color: "var(--primary)", marginTop: 2 }}>{data.courses.find(c => c.id === managerAssign.courseId)?.title}</div> : null}
                                  {managerCourseSearch && !managerAssign.courseId ? (
                                    <div style={{ position: "absolute", zIndex: 50, top: "100%", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, maxHeight: 200, overflow: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                                      {data.courses.filter(c => c.title.toLowerCase().includes(managerCourseSearch.toLowerCase()) || c.category.toLowerCase().includes(managerCourseSearch.toLowerCase())).slice(0, 10).map(c => (
                                        <div key={c.id} role="button" tabIndex={0} style={{ padding: "8px 12px", fontSize: 12, cursor: "pointer", borderBottom: "1px solid var(--border-light, #eee)" }} onClick={() => { setManagerAssign(o => ({ ...o, courseId: c.id })); setManagerCourseSearch(""); }} onKeyDown={(e) => e.key === "Enter" && (() => { setManagerAssign(o => ({ ...o, courseId: c.id })); setManagerCourseSearch(""); })()}>
                                          <div style={{ fontWeight: 500 }}>{c.title}</div>
                                          <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{c.category} &middot; {c.duration_minutes} min</div>
                                        </div>
                                      ))}
                                      {data.courses.filter(c => c.title.toLowerCase().includes(managerCourseSearch.toLowerCase()) || c.category.toLowerCase().includes(managerCourseSearch.toLowerCase())).length === 0 ? <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--text-muted)" }}>No courses found</div> : null}
                                    </div>
                                  ) : null}
                                </div>
                                <div className="form-group" style={{ margin: 0 }}><label>Due in (days)</label><input type="number" min={1} value={managerAssign.dueDays} onChange={(e) => setManagerAssign((o) => ({ ...o, dueDays: e.target.value }))} /></div>
                                <button type="submit" className="btn-primary"><Plus size={13} /> Assign</button>
                              </div>
                            </form>
                          </div>
                          <div className="grid two">
                            <div className="card">
                              <div className="card-header"><h2><Users /> {t("team.status")}</h2></div>
                              <div className="item-list">{data.team.map((m) => { const total = Number(m.completed_courses || 0) + Number(m.open_courses || 0); const pct = total > 0 ? Math.round((Number(m.completed_courses || 0) / total) * 100) : 0; return (
                                <div key={m.id} className="item" style={{ cursor: "pointer" }} role="button" tabIndex={0} onClick={() => loadTeamDetail(m.id)} onKeyDown={(e) => e.key === "Enter" && loadTeamDetail(m.id)}>
                                  <div className={`avatar-sm ${aC(m.name)}`}>{ini(m.name)}</div>
                                  <div className="item-body">
                                    <div className="item-title">{m.name}</div>
                                    <div className="item-meta">{m.role} &middot; {m.property_name}</div>
                                    <div className="item-meta text-sm">{Number(m.completed_courses || 0)} completed &middot; {Number(m.open_courses || 0)} remaining</div>
                                    <div className="progress-bar"><div className={`fill ${pct === 100 ? "green" : pct < 50 ? "red" : "blue"}`} style={{ width: `${pct}%` }} /></div>
                                  </div>
                                  <div style={{ textAlign: "right", minWidth: 60 }}><div style={{ fontSize: 16, fontWeight: 700 }}>{pct}%</div>{Number(m.overdue_courses) > 0 ? <StatusBadge status="overdue" /> : <span className="text-muted text-sm">{t("team.onTrack")}</span>}</div>
                                </div>); })}</div>
                            </div>
                            <div>
                              <div className="card">
                                <div className="card-header"><h2><AlertTriangle /> Needs Attention</h2></div>
                                {data.teamOverdue.length === 0 ? <div className="empty-state"><CheckCircle2 /><div className="empty-title">All clear</div></div> : (
                                  <div className="item-list">{data.teamOverdue.map((r, i) => (
                                    <div key={`${r.user_id}-${i}`} className="item">
                                      <div className={`avatar-sm ${aC(r.learner_name)}`}>{ini(r.learner_name)}</div>
                                      <div className="item-body"><div className="item-title">{r.learner_name}</div><div className="item-meta">{r.course_title} &middot; Due {fD(r.due_date, userLocale)}</div></div>
                                      <div className="item-actions"><StatusBadge status="overdue" /><button className="btn-sm" onClick={() => nudge(r.user_id)}><Send size={11} /></button></div>
                                    </div>))}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : null}

                      {teamSubTab === "analytics" && teamAnalytics ? (
                        <div>
                          <div className="stats-row mb-4">
                            <div className="stat-card"><div className="stat-icon blue"><Users /></div><div><div className="stat-value">{teamAnalytics.summary.team_size}</div><div className="stat-label">Team Size</div></div></div>
                            <div className="stat-card"><div className="stat-icon green"><CheckCircle2 /></div><div><div className="stat-value">{teamAnalytics.summary.total_enrollments > 0 ? `${Math.round((teamAnalytics.summary.total_completed / teamAnalytics.summary.total_enrollments) * 100)}%` : "0%"}</div><div className="stat-label">{t("team.completionRate")}</div></div></div>
                            <div className="stat-card"><div className="stat-icon purple"><Star /></div><div><div className="stat-value">{teamAnalytics.summary.avg_score || "\u2014"}%</div><div className="stat-label">{t("team.avgScore")}</div></div></div>
                            <div className="stat-card"><div className="stat-icon amber"><Clock /></div><div><div className="stat-value">{fmtSeconds(teamAnalytics.summary.avg_time_seconds)}</div><div className="stat-label">Avg Time/Course</div></div></div>
                            <div className="stat-card"><div className="stat-icon red"><AlertTriangle /></div><div><div className="stat-value">{teamAnalytics.summary.due_this_week}</div><div className="stat-label">{t("team.dueThisWeek")}</div></div></div>
                          </div>

                          <div className="grid two">
                            <div className="card">
                              <div className="card-header"><h2><BarChart3 /> Category Completion Matrix</h2></div>
                              <div className="table-wrap"><table><thead><tr><th>Category</th><th>Total</th><th>Completed</th><th>Overdue</th><th>Avg Score</th><th>Rate</th></tr></thead><tbody>
                                {teamAnalytics.category_matrix.map((cm) => {
                                  const rate = cm.total > 0 ? Math.round((cm.completed / cm.total) * 100) : 0;
                                  return <tr key={cm.category}><td><strong>{cm.category}</strong></td><td>{cm.total}</td><td>{cm.completed}</td><td style={{ color: cm.overdue > 0 ? "var(--danger)" : "inherit" }}>{cm.overdue}</td><td>{cm.avg_score || "\u2014"}%</td><td><div className="progress-bar" style={{ width: 60, display: "inline-block" }}><div className={`fill ${rate >= 80 ? "green" : rate >= 50 ? "blue" : "red"}`} style={{ width: `${rate}%` }} /></div> {rate}%</td></tr>;
                                })}
                              </tbody></table></div>
                            </div>
                            <div className="card">
                              <div className="card-header"><h2><AlertTriangle /> At-Risk Learners</h2></div>
                              {teamAnalytics.at_risk_learners.length === 0 ? <div className="empty-state"><CheckCircle2 /><div className="empty-title">No at-risk learners</div></div> : (
                                <div className="item-list">{teamAnalytics.at_risk_learners.map((lr) => (
                                  <div key={lr.id} className="item" style={{ cursor: "pointer" }} role="button" tabIndex={0} onClick={() => loadTeamDetail(lr.id)} onKeyDown={(e) => e.key === "Enter" && loadTeamDetail(lr.id)}>
                                    <div className={`avatar-sm ${aC(lr.name)}`}>{ini(lr.name)}</div>
                                    <div className="item-body"><div className="item-title">{lr.name}</div><div className="item-meta">{lr.role} &middot; {lr.property_name}</div></div>
                                    <div style={{ textAlign: "right" }}><div style={{ color: "var(--danger)", fontWeight: 700 }}>{lr.overdue_count} overdue</div>{lr.due_this_week > 0 ? <div className="text-muted text-sm">{lr.due_this_week} due this week</div> : null}</div>
                                  </div>))}</div>
                              )}
                            </div>
                          </div>

                          <div className="card mt-4">
                            <div className="card-header"><h2><BookOpen /> Course Performance</h2></div>
                            <div className="table-wrap"><table><thead><tr><th>Course</th><th>Category</th><th>Enrolled</th><th>Completed</th><th>Rate</th><th>Avg Score</th><th>Avg Time</th></tr></thead><tbody>
                              {teamAnalytics.course_performance.map((cp) => {
                                const rate = cp.enrolled > 0 ? Math.round((cp.completed / cp.enrolled) * 100) : 0;
                                return <tr key={cp.id}><td><strong>{cp.title}</strong></td><td>{cp.category}</td><td>{cp.enrolled}</td><td>{cp.completed}</td><td>{rate}%</td><td>{cp.avg_score || "\u2014"}%</td><td>{fmtSeconds(cp.avg_time_seconds)}</td></tr>;
                              })}
                            </tbody></table></div>
                          </div>

                          {teamAnalytics.property_comparison.length > 1 ? (
                            <div className="card mt-4">
                              <div className="card-header"><h2><Building2 /> {t("team.propertyView")}</h2></div>
                              <div className="table-wrap"><table><thead><tr><th>Property</th><th>State</th><th>Team</th><th>Enrollments</th><th>Completed</th><th>Rate</th><th>Overdue</th><th>Avg Score</th></tr></thead><tbody>
                                {teamAnalytics.property_comparison.map((pc) => {
                                  const rate = pc.total_enrollments > 0 ? Math.round((pc.completed / pc.total_enrollments) * 100) : 0;
                                  return <tr key={pc.id}><td><strong>{pc.property_name}</strong></td><td>{pc.state}</td><td>{pc.team_size}</td><td>{pc.total_enrollments}</td><td>{pc.completed}</td><td>{rate}%</td><td style={{ color: pc.overdue > 0 ? "var(--danger)" : "inherit" }}>{pc.overdue}</td><td>{pc.avg_score || "\u2014"}%</td></tr>;
                                })}
                              </tbody></table></div>
                            </div>
                          ) : null}

                          {teamAnalytics.completion_trend.length > 0 ? (
                            <div className="card mt-4">
                              <div className="card-header"><h2><TrendingUp /> Completion Trend (12 weeks)</h2></div>
                              <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={teamAnalytics.completion_trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="week" tickFormatter={(w) => fD(w, userLocale)} /><YAxis /><RTooltip /><Area type="monotone" dataKey="completions" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} /></AreaChart>
                              </ResponsiveContainer>
                            </div>
                          ) : null}
                        </div>
                      ) : teamSubTab === "analytics" ? (
                        <div className="card"><div className="empty-state"><Loader2 className="animate-spin" /><div className="empty-title">{t("common.loading")}</div></div></div>
                      ) : null}
                    </>
                  )}
                </>
              ) : null}

              {/* COMPLIANCE */}
              {!showLoading && !showEmpty && !showError && trainingTab === "compliance" ? (
                <><EngNotes tabKey="compliance" />
                <div className="card">
                  <div className="card-header"><h2><ShieldCheck /> Compliance Gaps ({data.complianceGaps.length})</h2><button className="btn-sm" onClick={downloadCsv}><Download size={11} /> Export</button></div>
                  {data.complianceGaps.length === 0 ? <div className="empty-state"><CheckCircle2 /><div className="empty-title">All compliant</div></div> : (
                    <div className="table-wrap"><table><thead><tr><th>Employee</th><th>Role</th><th>Property</th><th>State</th><th>Required Course</th><th>Status</th></tr></thead><tbody>{data.complianceGaps.map((g) => (
                      <tr key={`${g.user_id}-${g.course_title}`}><td><div className="flex-row"><div className={`avatar-sm ${aC(g.name)}`}>{ini(g.name)}</div>{g.name}</div></td><td>{g.role}</td><td>{g.property_name}</td><td>{g.state}</td><td>{g.course_title}</td><td>{g.expires_at ? <StatusBadge status="overdue" /> : <StatusBadge status="missing" />}</td></tr>
                    ))}</tbody></table></div>
                  )}
                </div>
              </>) : null}

              {/* ANALYTICS BI */}
              {!showLoading && trainingTab === "analytics" ? (
                <><EngNotes tabKey="analytics" />
                <AnalyticsTab token={token} user={user} tier={tier} />
                </>
              ) : null}

              {/* LEADERBOARD */}
              {!showLoading && !showEmpty && !showError && trainingTab === "leaderboard" ? (
                <>
                  <EngNotes tabKey="leaderboard" />
                  <div className="card">
                    <div className="card-header">
                      <h2><Award size={14} /> Training Leaderboard</h2>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 16px 12px" }}>
                      Rankings based on trainings completed across your organization.
                    </p>
                    {leaderboardData.length === 0 ? (
                      <div className="empty-state"><Award /><div className="empty-title">No completions yet</div><div className="empty-desc">Complete trainings to appear on the leaderboard.</div></div>
                    ) : (
                      <div className="table-wrap">
                        <table>
                          <thead><tr><th style={{ width: 50 }}>#</th><th>Name</th><th>Role</th><th>Property</th><th className="text-right">Completed</th><th className="text-right">Certificates</th></tr></thead>
                          <tbody>
                            {leaderboardData.map((entry, idx) => {
                              const isMe = entry.id === user?.id;
                              return (
                                <tr key={entry.id} style={isMe ? { background: "var(--blue-50, #eff6ff)", fontWeight: 500 } : undefined}>
                                  <td>
                                    {idx === 0 ? <span title="1st place" style={{ fontSize: 16 }}>&#x1F947;</span> : idx === 1 ? <span title="2nd place" style={{ fontSize: 16 }}>&#x1F948;</span> : idx === 2 ? <span title="3rd place" style={{ fontSize: 16 }}>&#x1F949;</span> : <span style={{ color: "var(--text-muted)" }}>{idx + 1}</span>}
                                  </td>
                                  <td>
                                    <div className="flex-row">
                                      <div className={`avatar-sm ${aC(entry.name)}`}>{ini(entry.name)}</div>
                                      {entry.name}{isMe ? <span style={{ fontSize: 11, color: "var(--blue-600)", marginLeft: 4 }}>(you)</span> : null}
                                    </div>
                                  </td>
                                  <td>{entry.role}</td>
                                  <td>{entry.property_name || "\u2014"}</td>
                                  <td className="text-right" style={{ fontWeight: 600, fontSize: 14 }}>{entry.completions || 0}</td>
                                  <td className="text-right">{entry.certificates || 0}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : null}

              {/* ADMIN */}
              {!showLoading && !showEmpty && !showError && trainingTab === "overview" ? (
                <>
                  <div className="stats-row">
                    <div className="stat-card"><div className="stat-icon blue"><Users /></div><div><div className="stat-value">{data.adminSummary?.users || 0}</div><div className="stat-label">Users</div></div></div>
                    <div className="stat-card"><div className="stat-icon purple"><BookOpen /></div><div><div className="stat-value">{data.adminSummary?.published_courses || 0}</div><div className="stat-label">Courses</div></div></div>
                    <div className="stat-card"><div className="stat-icon green"><CheckCircle2 /></div><div><div className="stat-value">{data.adminSummary?.completions || 0}</div><div className="stat-label">Completions</div></div></div>
                    <div className="stat-card"><div className="stat-icon red"><AlertTriangle /></div><div><div className="stat-value">{data.adminSummary?.overdue || 0}</div><div className="stat-label">Overdue</div></div></div>
                  </div>

                  
                  {/* ADMIN SUB-TABS */}
                  {(() => {
                    // Compute per-section visibility so separators don't dangle when all tabs in a section are filtered out.
                    const visible = (key, extraCond = true) => extraCond && isInRelease(key, releaseFilter);
                    const sec1 = visible("admin/content", isElite) || visible("admin/assign") || visible("admin/progress") || visible("admin/cert-programs") || visible("admin/learning-paths");
                    const sec2 = visible("admin/nudges", isElite) || visible("admin/rules") || visible("admin/sparks-admin", isElite) || visible("admin/workflow-recorder", isElite) || (isElite && !isInRelease("admin/digital-adoption", releaseFilter) && isInRelease("admin/contextual-triggers", releaseFilter)) || visible("admin/digital-adoption", isElite);
                    const sec3 = visible("admin/policies", isElite) || visible("kb-instances", isElite);
                    const sec4 = visible("admin/brand-kit", isElite) || visible("admin/content-visibility", isElite) || visible("admin/enablement-calendar") || visible("admin/audit-log", isElite) || visible("admin/scheduled-reports", isElite) || visible("admin/migration", isElite);
                    const showSep1 = sec1 && (sec2 || sec3 || sec4);
                    const showSep2 = (sec1 || sec2) && (sec3 || sec4);
                    const showSep3 = (sec1 || sec2 || sec3) && sec4;
                    return (
                  <div className="admin-subtabs" style={{ flexWrap: "wrap", gap: "4px 2px" }}>
                    {/* -- Content & Assignments -- */}
                    {isElite ? <button className={`${adminSubTab === "content" ? "active" : ""} ${!isInRelease("admin/content", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => setAdminSubTab("content")}><Upload size={13} /> My Content {releaseBadge("admin/content", releaseFilter)}</button> : null}
                    <button className={`${adminSubTab === "assign" ? "active" : ""} ${!isInRelease("admin/assign", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => setAdminSubTab("assign")}><Plus size={13} /> Assign {releaseBadge("admin/assign", releaseFilter)}</button>
                    <button className={`${adminSubTab === "progress" ? "active" : ""} ${!isInRelease("admin/progress", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => setAdminSubTab("progress")}><BarChart3 size={13} /> Progress {releaseBadge("admin/progress", releaseFilter)}</button>
                    <button className={`${adminSubTab === "cert-programs" ? "active" : ""} ${!isInRelease("admin/cert-programs", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => { setAdminSubTab("cert-programs"); loadCertPrograms(); }}><Award size={13} /> Certifications {releaseBadge("admin/cert-programs", releaseFilter)}</button>
                    <button className={`${adminSubTab === "learning-paths" ? "active" : ""} ${!isInRelease("admin/learning-paths", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => { setAdminSubTab("learning-paths"); loadLearningPaths(); loadCuratedPlans(); }}><FolderOpen size={13} /> Learning Plans {releaseBadge("admin/learning-paths", releaseFilter)}</button>
                    {/* -- separator -- */}
                    {showSep1 ? <span className="admin-subtab-sep" /> : null}
                    {/* -- Engagement & Automation -- */}
                    {isElite ? <button className={`${adminSubTab === "nudges" ? "active" : ""} ${!isInRelease("admin/nudges", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => setAdminSubTab("nudges")}><Send size={13} /> Nudges {releaseBadge("admin/nudges", releaseFilter)}</button> : null}
                    <button className={`${adminSubTab === "rules" ? "active" : ""} ${!isInRelease("admin/rules", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => { setAdminSubTab("rules"); loadLearningPaths(); loadGroups(); }}><Settings size={13} /> Enrollment Rules {releaseBadge("admin/rules", releaseFilter)}</button>
                    {isElite ? <button className={`${adminSubTab === "sparks-admin" ? "active" : ""} ${!isInRelease("admin/sparks-admin", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => setAdminSubTab("sparks-admin")}><Zap size={13} /> Spotlights {releaseBadge("admin/sparks-admin", releaseFilter)}</button> : null}
                    {isElite ? <button className={`${adminSubTab === "workflow-recorder" ? "active" : ""} ${!isInRelease("admin/workflow-recorder", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => setAdminSubTab("workflow-recorder")}><Monitor size={13} /> Workflow Recorder {releaseBadge("admin/workflow-recorder", releaseFilter)}</button> : null}
                    {isElite && !isInRelease("admin/digital-adoption", releaseFilter) ? <button className={`${adminSubTab === "contextual-triggers" ? "active" : ""} ${!isInRelease("admin/contextual-triggers", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => { setAdminSubTab("contextual-triggers"); loadContextualTriggers(); loadTriggerFires(); }}><Crosshair size={13} /> Contextual Triggers {releaseBadge("admin/contextual-triggers", releaseFilter)}</button> : null}
                    {isElite && isInRelease("admin/digital-adoption", releaseFilter) ? <button className={`${adminSubTab === "digital-adoption" ? "active" : ""}`} onClick={() => { setAdminSubTab("digital-adoption"); loadContextualTriggers(); loadDapDashboard(); loadDapCompliance(); loadDapExceptions(); loadDapWalkthroughs(); }}><Shield size={13} /> Digital Adoption {releaseBadge("admin/digital-adoption", releaseFilter)}</button> : null}
                    {/* -- separator -- */}
                    {showSep2 ? <span className="admin-subtab-sep" /> : null}
                    {/* -- Compliance & Policies -- */}
                    {isElite ? <button className={`${adminSubTab === "policies" ? "active" : ""} ${!isInRelease("admin/policies", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => setAdminSubTab("policies")}><FileText size={13} /> Policies {releaseBadge("admin/policies", releaseFilter)}</button> : null}
                    {isElite && isInRelease("kb-instances", releaseFilter) ? <button className={`${adminSubTab === "kb-instances" ? "active" : ""}`} onClick={() => { setAdminSubTab("kb-instances"); loadKbInstances(); }}><Building2 size={13} /> KB Instances {kbInstances.length > 0 ? <span className="tab-badge">{kbInstances.length}</span> : null}</button> : null}
                    {/* -- separator -- */}
                    {showSep3 ? <span className="admin-subtab-sep" /> : null}
                    {/* -- Platform & Operations -- */}
                    {isElite ? <button className={`${adminSubTab === "brand-kit" ? "active" : ""} ${!isInRelease("admin/brand-kit", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => { setAdminSubTab("brand-kit"); loadBrandKit(); }}><Palette size={13} /> Brand Kit {releaseBadge("admin/brand-kit", releaseFilter)}</button> : null}
                    {isElite ? <button className={`${adminSubTab === "content-visibility" ? "active" : ""} ${!isInRelease("admin/content-visibility", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => { setAdminSubTab("content-visibility"); loadContentVisibility(); }}><Eye size={13} /> Content Visibility {releaseBadge("admin/content-visibility", releaseFilter)}</button> : null}
                    <button className={`${adminSubTab === "calendar" ? "active" : ""} ${!isInRelease("admin/enablement-calendar", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => { setAdminSubTab("calendar"); loadEnablementCalendar(); }}><Calendar size={13} /> Calendar {releaseBadge("admin/enablement-calendar", releaseFilter)}</button>
                    {isElite ? <button className={`${adminSubTab === "audit-log" ? "active" : ""} ${!isInRelease("admin/audit-log", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => { setAdminSubTab("audit-log"); loadAuditLog(); }}><ClipboardCheck size={13} /> Audit Log {releaseBadge("admin/audit-log", releaseFilter)}</button> : null}
                    {isElite ? <button className={`${adminSubTab === "scheduled-reports" ? "active" : ""} ${!isInRelease("admin/scheduled-reports", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => { setAdminSubTab("scheduled-reports"); loadScheduledReports(); }}><FileText size={13} /> Scheduled Reports {releaseBadge("admin/scheduled-reports", releaseFilter)}</button> : null}
                    {isElite ? <button className={`${adminSubTab === "migration" ? "active" : ""} ${!isInRelease("admin/migration", releaseFilter) ? "release-dimmed" : ""}`} onClick={() => setAdminSubTab("migration")}><Package size={13} /> Migration {releaseBadge("admin/migration", releaseFilter)}</button> : null}
                  </div>
                    );
                  })()}

                  {/* ===== MY CONTENT (Elite only) ===== */}
                  {adminSubTab === "content" && isElite ? (
                    <>
                      <EngNotes tabKey="admin/content" />
                      <div className="admin-subtabs" style={{ marginBottom: 12 }}>
                        <button className={contentTab === "custom" ? "active" : ""} onClick={() => setContentTab("custom")}>My Content ({customCourses.length})</button>
                        <button className={contentTab === "catalog" ? "active" : ""} onClick={() => setContentTab("catalog")}>Entrata Catalog ({catalogCourses.length})</button>
                      </div>

                      {contentTab === "custom" ? (
                        <div className="grid two">
                          <div className="card">
                            <div className="card-header"><h2><Upload /> Custom Courses</h2></div>
                            {customCourses.length === 0 ? (
                              <div className="empty-state"><Upload /><div className="empty-title">No custom content yet</div><div className="empty-desc">Create your first course using the form.</div></div>
                            ) : (
                              <div className="table-wrap"><table><thead><tr><th>Title</th><th>Type</th><th>Category</th><th>Status</th><th>Actions</th></tr></thead><tbody>{customCourses.map((c) => (
                                <tr key={c.id}>
                                  <td><strong>{c.title}</strong></td>
                                  <td><CourseIcon type={c.type} /> {c.type}</td>
                                  <td>{c.category}</td>
                                  <td><span className={`status ${c.published ? "active" : "assigned"}`}>{c.published ? "Published" : "Draft"}</span></td>
                                  <td>
                                    <div className="flex-row" style={{ gap: 4 }}>
                                      <button className="btn-sm" onClick={() => handleTogglePublish(c.id)}>{c.published ? "Unpublish" : "Publish"}</button>
                                      <button className="btn-sm" style={{ color: "var(--danger)" }} onClick={() => handleDeleteCustomCourse(c.id)}><X size={11} /></button>
                                    </div>
                                  </td>
                                </tr>
                              ))}</tbody></table></div>
                            )}
                          </div>
                          <div>
                            <div className="card">
                              <div className="card-header"><h2><Plus /> Create Course</h2></div>
                              <form onSubmit={handleCreateCustomCourse} className="form-stack">
                                <div className="form-group"><label>Title</label><input placeholder="e.g. Sunset Leasing Playbook" value={customCourseForm.title} onChange={(e) => setCustomCourseForm({ ...customCourseForm, title: e.target.value })} required /></div>
                                <div className="form-group"><label>Description</label><textarea rows={2} placeholder="What this course covers..." value={customCourseForm.description} onChange={(e) => setCustomCourseForm({ ...customCourseForm, description: e.target.value })} /></div>
                                <div className="form-group"><label>Category</label><input value={customCourseForm.category} onChange={(e) => setCustomCourseForm({ ...customCourseForm, category: e.target.value })} /></div>
                                <div className="flex-row gap-2">
                                  <div className="form-group" style={{ flex: 1 }}><label>Type</label><select value={customCourseForm.type} onChange={(e) => setCustomCourseForm({ ...customCourseForm, type: e.target.value })}><option value="scorm">SCORM</option><option value="video">Video</option><option value="quiz">Quiz</option></select></div>
                                  <div className="form-group" style={{ flex: 1 }}><label>Minutes</label><input type="number" min={1} value={customCourseForm.durationMinutes} onChange={(e) => setCustomCourseForm({ ...customCourseForm, durationMinutes: Number(e.target.value) })} /></div>
                                </div>
                                <button type="submit" className="btn-primary"><Plus size={13} /> Create</button>
                              </form>
                              {customCourses.length > 0 ? (
                                <>
                                  <div style={{ borderTop: "1px solid var(--border-light)", margin: "16px 0 0" }} />
                                  <div style={{ padding: "12px 16px 16px" }}>
                                    <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}><Upload size={14} /> Attach SCORM Package</h3>
                                    <form onSubmit={handleScormUpload} className="form-stack">
                                      <div className="form-group"><label>Course</label><select value={customUpload.courseId} onChange={(e) => setCustomUpload((o) => ({ ...o, courseId: e.target.value }))}><option value="">Select a custom course...</option>{customCourses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
                                      <div className="form-group"><label>SCORM .zip</label><input type="file" accept=".zip" onChange={(e) => setCustomUpload((o) => ({ ...o, file: e.target.files?.[0] || null }))} /></div>
                                      <button type="submit" className="btn-primary" disabled={!customUpload.courseId || !customUpload.file || customUpload.uploading}>{customUpload.uploading ? <><Loader2 size={13} /> Uploading...</> : <><Upload size={13} /> Upload</>}</button>
                                    </form>
                                  </div>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="card">
                          <div className="card-header"><h2><BookOpen /> Entrata Catalog</h2><span className="text-muted" style={{ fontSize: 13 }}>Read-only. Assign these courses to your team.</span></div>
                          {catalogCourses.length === 0 ? <div className="empty-state"><BookOpen /><div className="empty-title">No catalog courses</div></div> : (
                            <div className="table-wrap"><table><thead><tr><th>Title</th><th>Type</th><th>Category</th><th>Duration</th><th>Rating</th></tr></thead><tbody>{catalogCourses.map((c) => (
                              <tr key={c.id}>
                                <td><strong>{c.title}</strong></td>
                                <td><CourseIcon type={c.type} /> {c.type}</td>
                                <td>{c.category}</td>
                                <td>{c.duration_minutes} min</td>
                                <td><Stars rating={Number(c.average_rating || 0)} /></td>
                              </tr>
                            ))}</tbody></table></div>
                          )}
                        </div>
                      )}
                    </>
                  ) : null}

                  {/* ===== ASSIGN WIZARD ===== */}
                  {adminSubTab === "assign" ? (
                    <div className="card">
                      <EngNotes tabKey="admin/assign" />
                      <div className="card-header"><h2><Plus /> Assign {assignKind === "plans" ? "Learning Plans" : "Courses"}</h2><span className="text-muted" style={{ fontSize: 13 }}>Step {assignStep} of 4</span></div>
                      {isInRelease("admin/rules", releaseFilter) ? (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 12px", margin: "0 16px 12px", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 6, fontSize: 12, color: "#92400e", lineHeight: 1.4 }}>
                          <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                          <span>Assign is a <strong>one-time push</strong> to the people you pick right now. For ongoing auto-enrollment when someone joins a group, use <a href="#" onClick={(e) => { e.preventDefault(); setAdminSubTab("rules"); loadGroups(); loadLearningPaths(); }} style={{ color: "#92400e", textDecoration: "underline", fontWeight: 600 }}>Enrollment Rules</a> instead.</span>
                        </div>
                      ) : null}
                      <div className="assign-steps">
                        {[(assignKind === "plans" ? "Learning Plans" : "Courses"), "Targets", "Options", "Review"].map((label, i) => (
                          <div key={i} className={`assign-step ${assignStep === i + 1 ? "active" : assignStep > i + 1 ? "done" : ""}`}>{i + 1}. {label}</div>
                        ))}
                      </div>

                      {assignStep === 1 ? (
                        <>
                          <div className="admin-subtabs" style={{ margin: "12px 0" }}>
                            <button
                              className={assignKind === "courses" ? "active" : ""}
                              onClick={() => { setAssignKind("courses"); setAssignLearningPathIds([]); setAssignCourseSearch(""); }}
                            >Courses</button>
                            <button
                              className={assignKind === "plans" ? "active" : ""}
                              onClick={() => { setAssignKind("plans"); setAssignCourseIds([]); setAssignCourseSearch(""); setAssignCourseCategory("All"); }}
                            >Learning Plans</button>
                          </div>
                          {assignKind === "courses" ? (
                            <>
                              <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "12px 0" }}>Select courses to assign. You can choose from both your custom content and the Entrata catalog.</p>
                              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                                <div style={{ flex: 1, position: "relative" }}>
                                  <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                                  <input type="text" placeholder="Search courses..." value={assignCourseSearch} onChange={(e) => setAssignCourseSearch(e.target.value)} style={{ paddingLeft: 30, width: "100%" }} />
                                  {assignCourseSearch && <button style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 2, cursor: "pointer", color: "var(--text-muted)" }} onClick={() => setAssignCourseSearch("")}><X size={13} /></button>}
                                </div>
                                <select value={assignCourseCategory} onChange={(e) => setAssignCourseCategory(e.target.value)} style={{ width: 160, flexShrink: 0 }}>
                                  {assignCourseCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                              </div>
                              {assignCourseIds.length > 0 && <div style={{ fontSize: 12, color: "var(--blue-600)", fontWeight: 600, marginBottom: 8 }}>{assignCourseIds.length} course{assignCourseIds.length !== 1 ? "s" : ""} selected</div>}
                              <div className="item-list" style={{ maxHeight: 380, overflowY: "auto" }}>{filteredAssignCourses.length === 0 ? (
                                <div className="empty-state"><Search size={28} /><div className="empty-title">No courses match your search</div><div className="empty-desc">Try a different keyword or category</div></div>
                              ) : filteredAssignCourses.map((c) => (
                                <div key={c.id} className="item" style={{ cursor: "pointer", background: assignCourseIds.includes(c.id) ? "var(--blue-50, #eff6ff)" : undefined }} onClick={() => setAssignCourseIds((p) => p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id])}>
                                  <input type="checkbox" checked={assignCourseIds.includes(c.id)} readOnly style={{ marginRight: 8 }} />
                                  <div className="item-body">
                                    <div className="item-title">{c.title} <span className={`source-badge ${c.source || "catalog"}`}>{c.source === "custom" ? "Custom" : "Entrata"}</span></div>
                                    <div className="item-meta">{c.category} &middot; {c.duration_minutes} min</div>
                                  </div>
                                </div>
                              ))}</div>
                              <div className="flex-row mt-2" style={{ justifyContent: "space-between" }}>
                                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Showing {filteredAssignCourses.length} of {allAssignableCourses.length} courses</span>
                                <button className="btn-primary" disabled={!assignCourseIds.length} onClick={() => setAssignStep(2)}>Next: Select Targets <ChevronRight size={13} /></button>
                              </div>
                            </>
                          ) : (
                            <>
                              <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "12px 0" }}>Select learning plans to assign. Learners are enrolled in every required, published course inside each plan at assign time.</p>
                              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                                <div style={{ flex: 1, position: "relative" }}>
                                  <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                                  <input type="text" placeholder="Search learning plans..." value={assignCourseSearch} onChange={(e) => setAssignCourseSearch(e.target.value)} style={{ paddingLeft: 30, width: "100%" }} />
                                  {assignCourseSearch && <button style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 2, cursor: "pointer", color: "var(--text-muted)" }} onClick={() => setAssignCourseSearch("")}><X size={13} /></button>}
                                </div>
                              </div>
                              {assignLearningPathIds.length > 0 && <div style={{ fontSize: 12, color: "var(--blue-600)", fontWeight: 600, marginBottom: 8 }}>{assignLearningPathIds.length} learning plan{assignLearningPathIds.length !== 1 ? "s" : ""} selected</div>}
                              <div className="item-list" style={{ maxHeight: 380, overflowY: "auto" }}>{filteredAssignPlans.length === 0 ? (
                                <div className="empty-state"><Search size={28} /><div className="empty-title">No learning plans match your search</div><div className="empty-desc">Try a different keyword</div></div>
                              ) : filteredAssignPlans.map((p) => {
                                const isCurated = p.company_id === null || p.company_id === undefined;
                                return (
                                  <div key={p.id} className="item" style={{ cursor: "pointer", background: assignLearningPathIds.includes(p.id) ? "var(--blue-50, #eff6ff)" : undefined }} onClick={() => setAssignLearningPathIds((prev) => prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id])}>
                                    <input type="checkbox" checked={assignLearningPathIds.includes(p.id)} readOnly style={{ marginRight: 8 }} />
                                    <div className="item-body">
                                      <div className="item-title">{p.title} <span className={`source-badge ${isCurated ? "catalog" : "custom"}`}>{isCurated ? "Curated" : "Custom"}</span></div>
                                      <div className="item-meta">{p.course_count || 0} course{p.course_count !== 1 ? "s" : ""}{p.est ? ` · ${p.est}` : ""}{p.description ? ` · ${p.description}` : ""}</div>
                                    </div>
                                  </div>
                                );
                              })}</div>
                              <div className="flex-row mt-2" style={{ justifyContent: "space-between" }}>
                                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Showing {filteredAssignPlans.length} of {catalogLearningPlans.length} learning plans</span>
                                <button className="btn-primary" disabled={!assignLearningPathIds.length} onClick={() => setAssignStep(2)}>Next: Select Targets <ChevronRight size={13} /></button>
                              </div>
                            </>
                          )}
                        </>
                      ) : null}

                      {assignStep === 2 ? (
                        <>
                          <div className="admin-subtabs" style={{ marginBottom: 12 }}>
                            <button className={assignTargetTab === "users" ? "active" : ""} onClick={() => setAssignTargetTab("users")}>Individual Users</button>
                            <button className={assignTargetTab === "groups" ? "active" : ""} onClick={() => setAssignTargetTab("groups")}>Groups</button>
                          </div>
                          {assignTargetTab === "users" ? (
                            <div className="item-list">{data.team.map((m) => (
                              <div key={m.id} className="item" style={{ cursor: "pointer", background: assignUserIds.includes(m.id) ? "var(--blue-50, #eff6ff)" : undefined }} onClick={() => setAssignUserIds((p) => p.includes(m.id) ? p.filter((x) => x !== m.id) : [...p, m.id])}>
                                <input type="checkbox" checked={assignUserIds.includes(m.id)} readOnly style={{ marginRight: 8 }} />
                                <div className={`avatar-sm ${aC(m.name)}`}>{ini(m.name)}</div>
                                <div className="item-body"><div className="item-title">{m.name}</div><div className="item-meta">{m.role} &middot; {m.property_name}</div></div>
                              </div>
                            ))}</div>
                          ) : (
                            <>
                              <EntrataGroupsSyncBar groups={groups} token={token} onRefresh={async () => { try { const g = await fetchGroups(token); setGroups(g); } catch (e) { setError(e.message); } }} />
                              <GroupMultiSelect
                                groups={groups}
                                value={assignGroupIds}
                                onChange={setAssignGroupIds}
                              />
                            </>
                          )}
                          <div className="flex-row mt-2" style={{ justifyContent: "space-between" }}>
                            <button className="btn-ghost" onClick={() => setAssignStep(1)}><ArrowLeft size={13} /> Back</button>
                            <button className="btn-primary" disabled={!assignUserIds.length && !assignGroupIds.length} onClick={() => setAssignStep(3)}>Next: Options <ChevronRight size={13} /></button>
                          </div>
                        </>
                      ) : null}

                      {assignStep === 3 ? (() => {
                        const selectedCourses = (data.courses || []).filter(c => assignCourseIds.includes(c.id));
                        const selectedPlans = (catalogLearningPlans || []).filter(p => assignLearningPathIds.includes(p.id));
                        const planCourseCount = selectedPlans.reduce((s, p) => s + (p.course_count || (p.courses ? p.courses.length : 0)), 0);
                        const planMin = selectedPlans.reduce((s, p) => s + (Array.isArray(p.courses) ? p.courses.reduce((ss, c) => ss + (c.duration_minutes || 30), 0) : 0), 0);
                        const totalMin = assignKind === "plans"
                          ? planMin
                          : selectedCourses.reduce((s, c) => s + (c.duration_minutes || 30), 0);
                        const totalHrs = (totalMin / 60).toFixed(1);
                        const suggestedDays = Math.max(3, Math.min(30, Math.ceil((totalMin / 60) * 2)));
                        const tooAggressive = assignDueDays < suggestedDays * 0.6;
                        const summaryLabel = assignKind === "plans"
                          ? `${selectedPlans.length} learning plan${selectedPlans.length !== 1 ? "s" : ""} selected · ${planCourseCount} course${planCourseCount !== 1 ? "s" : ""} inside`
                          : `${selectedCourses.length} courses selected`;
                        return (
                          <>
                            <div style={{ marginBottom: 12, padding: 10, borderRadius: 6, background: "var(--bg-card, #f0f9ff)", border: "1px solid #bfdbfe", fontSize: 13 }}>
                              <strong>{summaryLabel}</strong> &middot; {totalHrs} hours of content total
                              <div style={{ marginTop: 4, color: "var(--text-muted)" }}>Suggested due date: <strong>{suggestedDays} days</strong> (2x content hours in business days)</div>
                            </div>
                            <div className="form-stack" style={{ maxWidth: 420, margin: "12px 0" }}>
                              <div className="form-group">
                                <label>Due date</label>
                                <div style={{ display: "flex", gap: 12, marginTop: 4, marginBottom: 8 }}>
                                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, cursor: "pointer" }}>
                                    <input type="radio" name="dueMode" value="relative" checked={assignDueMode === "relative"} onChange={() => setAssignDueMode("relative")} />
                                    Calendar days from assignment
                                  </label>
                                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, cursor: "pointer" }}>
                                    <input type="radio" name="dueMode" value="absolute" checked={assignDueMode === "absolute"} onChange={() => setAssignDueMode("absolute")} />
                                    Specific date
                                  </label>
                                </div>
                                {assignDueMode === "relative" ? (
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <input type="number" min={1} value={assignDueDays} onChange={(e) => setAssignDueDays(Number(e.target.value))} style={{ width: 100 }} />
                                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>calendar days from the assignment date</span>
                                  </div>
                                ) : (
                                  <input type="date" value={assignDueDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setAssignDueDate(e.target.value)} style={{ maxWidth: 200 }} />
                                )}
                              </div>
                            </div>
                            {assignDueMode === "relative" && tooAggressive ? (
                              <div style={{ padding: 8, borderRadius: 6, background: "#fef3c7", border: "1px solid #fde68a", fontSize: 13, color: "#92400e", marginBottom: 8 }}>
                                <AlertTriangle size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
                                This assigns {totalHrs} hours of content with only {assignDueDays} day{assignDueDays !== 1 ? "s" : ""}. Learners may struggle to complete on time. Consider at least {suggestedDays} days.
                              </div>
                            ) : null}
                            <div className="flex-row mt-2" style={{ justifyContent: "space-between" }}>
                              <button className="btn-ghost" onClick={() => setAssignStep(2)}><ArrowLeft size={13} /> Back</button>
                              <button className="btn-primary" onClick={() => setAssignStep(4)}>Next: Review <ChevronRight size={13} /></button>
                            </div>
                          </>
                        );
                      })() : null}

                      {assignStep === 4 ? (() => {
                        const pickedGroups = assignGroupIds.map((id) => groups.find((g) => g.id === id)).filter(Boolean);
                        const groupMemberTotal = pickedGroups.reduce((s, g) => s + (g.member_count || 0), 0);
                        const dedupTotal = assignUserIds.length + groupMemberTotal;
                        const dueLabel = assignDueMode === "absolute" ? (assignDueDate ? `Due on ${assignDueDate}` : "Due date required") : `Due ${assignDueDays} calendar day${assignDueDays !== 1 ? "s" : ""} after assignment`;
                        const pickedPlans = assignLearningPathIds.map((id) => catalogLearningPlans.find((p) => p.id === id)).filter(Boolean);
                        return (
                        <>
                          <div style={{ fontSize: 14, margin: "12px 0" }}>
                            {assignKind === "plans" ? (
                              <p><strong>Learning Plans ({assignLearningPathIds.length}):</strong> {pickedPlans.map((p) => `${p.title} (${p.course_count || 0} course${p.course_count !== 1 ? "s" : ""})`).join(", ") || "None"}</p>
                            ) : (
                              <p><strong>Courses ({assignCourseIds.length}):</strong> {assignCourseIds.map((id) => data.courses.find((c) => c.id === id)?.title).filter(Boolean).join(", ")}</p>
                            )}
                            <p><strong>Users ({assignUserIds.length}):</strong> {assignUserIds.map((id) => data.team.find((m) => m.id === id)?.name).filter(Boolean).join(", ") || "None"}</p>
                            <p><strong>Groups ({assignGroupIds.length}):</strong> {pickedGroups.map((g) => `${g.name} (${g.member_count || 0})`).join(", ") || "None"}</p>
                            <p><strong>Estimated total recipients:</strong> ~{dedupTotal} people <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(before de-duplication — a user in both a picked group and the direct user list is only assigned once)</span></p>
                            <p><strong>Due:</strong> {dueLabel}</p>
                            {assignKind === "plans" ? <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}><Info size={11} style={{ verticalAlign: -1, marginRight: 4 }} />Learners are enrolled in every required, published course inside the selected plans. Duplicates are skipped.</p> : null}
                          </div>
                          <div className="flex-row mt-2" style={{ justifyContent: "space-between" }}>
                            <button className="btn-ghost" onClick={() => setAssignStep(3)}><ArrowLeft size={13} /> Back</button>
                            <button className="btn-primary" disabled={assignDueMode === "absolute" && !assignDueDate} onClick={handleBulkAssign}><CheckCircle2 size={13} /> Confirm Assignment</button>
                          </div>
                        </>
                        );
                      })() : null}
                    </div>
                  ) : null}

                  {/* ===== PROGRESS ===== */}
                  {adminSubTab === "progress" ? (
                    <div className="card">
                      <EngNotes tabKey="admin/progress" />
                      <div className="card-header"><h2><BarChart3 /> Assignment Progress</h2><button className="btn-sm" onClick={loadProgress}><Loader2 size={11} /> Refresh</button></div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", margin: "0 16px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: 12, color: "#1e40af", lineHeight: 1.4 }}>
                        <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span><strong>Progress</strong> is the real-time status of every course and learning plan assigned to your people (admin-assigned, auto-enrolled by a rule, or self-enrolled). For certification <em>programs</em> (multi-course credentials with expiry), use <a href="#" onClick={(e) => { e.preventDefault(); setAdminSubTab("certifications"); }} style={{ color: "#1e40af", textDecoration: "underline" }}>Certifications</a>. For compliance roll-ups, use the Compliance tab.</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px 12px", flexWrap: "wrap" }}>
                        <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>Status:
                          <select value={progressStatusFilter} onChange={(e) => setProgressStatusFilter(e.target.value)} style={{ fontSize: 12, padding: "3px 6px" }}>
                            <option value="all">All statuses</option>
                            <option value="not_started">Not started</option>
                            <option value="in_progress">In progress</option>
                            <option value="completed">Completed</option>
                            <option value="overdue">Overdue</option>
                          </select>
                        </label>
                        <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>Enrollment source:
                          <select value={progressSourceFilter} onChange={(e) => setProgressSourceFilter(e.target.value)} style={{ fontSize: 12, padding: "3px 6px" }}>
                            <option value="all">All sources</option>
                            <option value="admin">Admin-assigned</option>
                            <option value="auto">Auto-enrolled (rule)</option>
                            <option value="self">Self-enrolled</option>
                          </select>
                        </label>
                      </div>
                      {progress.length === 0 ? <div className="empty-state"><BarChart3 /><div className="empty-title">No enrollments yet</div></div> : (
                        <div className="table-wrap"><table><thead><tr><th>Course</th><th>Source</th><th>Total</th><th>Not started</th><th>Completed</th><th>In Progress</th><th>Overdue</th><th>Rate</th></tr></thead><tbody>{progress.filter((p) => {
                          if (progressStatusFilter === "not_started") return (Number(p.not_started) || Math.max(0, Number(p.total) - Number(p.completed) - Number(p.in_progress))) > 0;
                          if (progressStatusFilter === "in_progress") return Number(p.in_progress) > 0;
                          if (progressStatusFilter === "completed") return Number(p.completed) > 0;
                          if (progressStatusFilter === "overdue") return Number(p.overdue) > 0;
                          return true;
                        }).filter((p) => {
                          if (progressSourceFilter === "all") return true;
                          return (p.enrollment_sources || []).includes(progressSourceFilter) || p.primary_source === progressSourceFilter || !p.enrollment_sources;
                        }).map((p) => {
                          const rate = Number(p.total) > 0 ? Math.round((Number(p.completed) / Number(p.total)) * 100) : 0;
                          return (
                            <tr key={p.course_id} style={{ cursor: "pointer" }} onClick={async () => { if (expandedCourse === p.course_id) { setExpandedCourse(null); } else { setExpandedCourse(p.course_id); await loadCourseUsers(p.course_id); } }}>
                              <td><strong>{p.title}</strong>{expandedCourse === p.course_id ? " ▾" : ""}</td>
                              <td><span className={`source-badge ${p.source}`}>{p.source === "custom" ? "Custom" : "Entrata"}</span></td>
                              <td>{p.total}</td>
                              <td style={{ color: "var(--text-muted)" }}>{Number(p.not_started) || Math.max(0, Number(p.total) - Number(p.completed) - Number(p.in_progress))}</td>
                              <td style={{ color: "var(--success)" }}>{p.completed}</td>
                              <td>{p.in_progress}</td>
                              <td style={{ color: Number(p.overdue) > 0 ? "var(--danger)" : undefined }}>{p.overdue}</td>
                              <td><div className="progress-bar" style={{ width: 80, display: "inline-flex" }}><div className={`fill ${rate === 100 ? "green" : "blue"}`} style={{ width: `${rate}%` }} /></div> {rate}%</td>
                            </tr>
                          );
                        })}</tbody></table></div>
                      )}
                      {expandedCourse && courseUsers.length > 0 ? (
                        <div style={{ marginTop: 12, padding: 12, background: "var(--bg-muted, #f8f9fa)", borderRadius: 8 }}>
                          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Enrolled Users</h3>
                          <div className="table-wrap"><table><thead><tr><th>Name</th><th>Role</th><th>Property</th><th>Status</th><th>Due</th></tr></thead><tbody>{courseUsers.map((u) => (
                            <tr key={u.id}><td>{u.name}</td><td>{u.role}</td><td>{u.property_name || "\u2014"}</td><td><StatusBadge status={new Date(u.due_date) < new Date() && u.status !== "completed" ? "overdue" : u.status} /></td><td>{fD(u.due_date)}</td></tr>
                          ))}</tbody></table></div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Groups are inherited from Entrata -- no in-EA management UI. See admin/rules for how groups are consumed. */}

                  {/* ===== NUDGES ===== */}
                  {adminSubTab === "nudges" ? (
                    <div className="card">
                      <EngNotes tabKey="admin/nudges" />
                      <div className="card-header"><h2><Send /> Nudge Center</h2>{nudgeSelected.length > 0 ? <button className="btn-primary btn-sm" onClick={handleBulkNudge}><Send size={11} /> Send to {nudgeSelected.length}</button> : null}</div>
                      {nudgeSelected.length > 0 ? (
                        <div className="form-group mb-4"><label>Message (optional)</label><input placeholder="Please complete your required training..." value={nudgeMessage} onChange={(e) => setNudgeMessage(e.target.value)} /></div>
                      ) : null}
                      {data.teamOverdue.length === 0 ? <div className="empty-state"><CheckCircle2 /><div className="empty-title">No overdue enrollments</div></div> : (
                        <div className="table-wrap"><table><thead><tr><th><input type="checkbox" checked={nudgeSelected.length === data.teamOverdue.length && data.teamOverdue.length > 0} onChange={(e) => setNudgeSelected(e.target.checked ? data.teamOverdue.map((r) => r.user_id) : [])} /></th><th>Employee</th><th>Course</th><th>Property</th><th>Due</th></tr></thead><tbody>{data.teamOverdue.map((r, i) => (
                          <tr key={`${r.user_id}-${i}`}>
                            <td><input type="checkbox" checked={nudgeSelected.includes(r.user_id)} onChange={(e) => setNudgeSelected((p) => e.target.checked ? [...new Set([...p, r.user_id])] : p.filter((x) => x !== r.user_id))} /></td>
                            <td><div className="flex-row"><div className={`avatar-sm ${aC(r.learner_name)}`}>{ini(r.learner_name)}</div>{r.learner_name}</div></td>
                            <td>{r.course_title}</td>
                            <td>{r.property_name || "\u2014"}</td>
                            <td><StatusBadge status="overdue" /> {fD(r.due_date)}</td>
                          </tr>
                        ))}</tbody></table></div>
                      )}
                    </div>
                  ) : null}

                  {/* ===== ENROLLMENT RULES ===== */}
                  {adminSubTab === "rules" ? (
                    <div className="grid two">
                      <EngNotes tabKey="admin/rules" />
                      <div className="card"><div className="card-header"><h2><Settings /> Enrollment Rules</h2></div>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 12px", margin: "0 16px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: 12, color: "#1e40af", lineHeight: 1.4 }}>
                          <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                          <span>Enrollment Rules run automatically and target <strong>Entrata groups</strong> (inherited from your Entrata tenant). When someone is added to a matching group in Entrata, the rule re-runs just for them. For a one-time push to a set of people, use <a href="#" onClick={(e) => { e.preventDefault(); setAdminSubTab("assign"); }} style={{ color: "#1e40af", textDecoration: "underline" }}>Assign</a> instead.</span>
                        </div>
                        {data.rules.length === 0 ? <div className="empty-state"><Settings /><div className="empty-title">No enrollment rules</div><div className="empty-desc">Create your first rule to auto-enroll group members into courses or learning plans.</div></div> : (
                          <div className="rule-card-list">{data.rules.map((r) => {
                            const targetKind = r.learning_paths?.length ? "plan" : "course";
                            const targetTitle = r.learning_paths?.[0]?.title || r.courses?.[0]?.title || "(no target)";
                            const planId = r.learning_paths?.[0]?.id || null;
                            const dueDays = (r.learning_paths?.[0]?.due_days) ?? (r.courses?.[0]?.due_days) ?? 30;
                            const totalMembers = (r.groups || []).reduce((sum, g) => sum + (g.member_count || 0), 0);
                            const stats = r.stats || { total: 0, completed: 0, overdue: 0, pending: 0 };
                            const completionPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                            const isEditing = editingRuleId === r.id;
                            return (
                            <div key={r.id} className="rule-card">
                              <div className="rule-card-head">
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div className="rule-card-title">
                                    <Settings size={13} style={{ color: "var(--text-muted)" }} />
                                    <span>{r.name}</span>
                                    <span className={`rule-target-badge ${targetKind}`}>{targetKind === "plan" ? "Plan" : "Course"}: {targetTitle}</span>
                                  </div>
                                </div>
                                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                  {!isEditing ? (
                                    <>
                                      <button className="btn-sm" onClick={() => openRuleEdit(r)}><Pencil size={11} /> Edit</button>
                                      <button className="btn-sm" onClick={() => executeRule(r.id)} title="Re-run retroactively"><Play size={11} /> Run Now</button>
                                      <button className="btn-sm" onClick={() => deleteRule(r.id)} style={{ color: "#dc2626" }}><X size={11} /> Delete</button>
                                    </>
                                  ) : null}
                                </div>
                              </div>

                              {!isEditing ? (
                                <>
                                  <div className="rule-meta-grid">
                                    <div>
                                      <div className="rule-meta-label">Groups</div>
                                      <div className="rule-meta-value">
                                        {(r.groups || []).length > 0 ? (
                                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                            {r.groups.map(g => <span key={g.id} className="badge" style={{ fontSize: 10, padding: "1px 6px", background: "#e0f2fe", color: "#075985" }}>{g.name} ({g.member_count})</span>)}
                                          </div>
                                        ) : (
                                          <span className="text-muted text-xs">Criteria: {r.criteria?.roles?.join(", ") || "any role"}{r.criteria?.states?.length ? ` in ${r.criteria.states.join(", ")}` : ""}</span>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="rule-meta-label">Deadline</div>
                                      <div className="rule-meta-value"><Clock size={11} style={{ verticalAlign: -1 }} /> Due within <strong>{dueDays}</strong> day{dueDays === 1 ? "" : "s"} of enrollment</div>
                                    </div>
                                    <div>
                                      <div className="rule-meta-label">Scope</div>
                                      <div className="rule-meta-value">
                                        {r.enrollment_target === "new_hires_only" ? "New hires only" : r.enrollment_target === "existing_only" ? "Existing employees only" : "All members"}
                                        {" · "}
                                        <span className="text-muted">{totalMembers} {totalMembers === 1 ? "person" : "people"} targeted</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="rule-stats-row">
                                    <div className="rule-stat-pill enrolled"><strong>{stats.total}</strong> enrolled</div>
                                    <div className="rule-stat-pill completed"><strong>{stats.completed}</strong> completed</div>
                                    <div className="rule-stat-pill pending"><strong>{Math.max(0, stats.pending - stats.overdue)}</strong> in progress</div>
                                    <div className={`rule-stat-pill ${stats.overdue > 0 ? "overdue" : "none"}`}><strong>{stats.overdue}</strong> overdue</div>
                                    {stats.total > 0 ? (
                                      <div className="rule-progress-wrap">
                                        <div className="rule-progress-bar"><div className="rule-progress-fill" style={{ width: `${completionPct}%` }} /></div>
                                        <span className="text-muted text-xs">{completionPct}%</span>
                                      </div>
                                    ) : <span className="text-muted text-xs">No enrollments yet. Click Run Now to enroll current members.</span>}
                                  </div>
                                </>
                              ) : (
                                <div className="rule-edit-form">
                                  <div className="form-group">
                                    <label>Rule name</label>
                                    <input type="text" value={ruleEditForm.name} onChange={(e) => setRuleEditForm({ ...ruleEditForm, name: e.target.value })} />
                                  </div>

                                  <div className="form-group">
                                    <label>What this rule assigns</label>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 10px", background: "#f9fafb", border: "1px solid var(--border-light)", borderRadius: 6 }}>
                                      <div style={{ fontSize: 13 }}>
                                        <span className={`rule-target-badge ${targetKind}`} style={{ marginRight: 6 }}>{targetKind === "plan" ? "Plan" : "Course"}</span>
                                        <strong>{targetTitle}</strong>
                                      </div>
                                      {targetKind === "plan" && planId ? (
                                        <button type="button" className="btn-sm" onClick={() => { setAdminSubTab("learning-paths"); setLearningPlansTab("my"); loadLearningPaths(); loadLearningPathDetail(planId); }}>
                                          <FolderOpen size={11} /> Manage courses in this plan
                                        </button>
                                      ) : null}
                                    </div>
                                    <p className="text-muted text-xs" style={{ marginTop: 4 }}>To change the target plan or course, delete this rule and create a new one.</p>
                                  </div>

                                  <div className="form-group">
                                    <label>Groups</label>
                                    {(groups || []).length === 0 ? (
                                      <p className="text-muted text-xs">No groups available.</p>
                                    ) : (
                                      <GroupMultiSelect groups={groups} value={ruleEditForm.groupIds} onChange={(next) => setRuleEditForm({ ...ruleEditForm, groupIds: next })} />
                                    )}
                                  </div>

                                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                                    <div className="form-group" style={{ minWidth: 140 }}>
                                      <label>Deadline (days)</label>
                                      <input type="number" min="1" max="365" value={ruleEditForm.dueDays} onChange={(e) => setRuleEditForm({ ...ruleEditForm, dueDays: e.target.value })} style={{ width: 100 }} />
                                    </div>
                                    <div className="form-group" style={{ flex: 1, minWidth: 220 }}>
                                      <label>Who to enroll</label>
                                      <div className="enrollment-target-group">
                                        <label className={`et-option${ruleEditForm.enrollment_target === "all" ? " active" : ""}`}><input type="radio" name={`et-edit-${r.id}`} value="all" checked={ruleEditForm.enrollment_target === "all"} onChange={() => setRuleEditForm({ ...ruleEditForm, enrollment_target: "all" })} /> All</label>
                                        <label className={`et-option${ruleEditForm.enrollment_target === "new_hires_only" ? " active" : ""}`}><input type="radio" name={`et-edit-${r.id}`} value="new_hires_only" checked={ruleEditForm.enrollment_target === "new_hires_only"} onChange={() => setRuleEditForm({ ...ruleEditForm, enrollment_target: "new_hires_only" })} /> New hires only</label>
                                        <label className={`et-option${ruleEditForm.enrollment_target === "existing_only" ? " active" : ""}`}><input type="radio" name={`et-edit-${r.id}`} value="existing_only" checked={ruleEditForm.enrollment_target === "existing_only"} onChange={() => setRuleEditForm({ ...ruleEditForm, enrollment_target: "existing_only" })} /> Existing</label>
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 8 }}>
                                    <button type="button" className="btn-ghost btn-sm" onClick={cancelRuleEdit} disabled={ruleEditSaving}>Cancel</button>
                                    <button type="button" className="btn-primary btn-sm" onClick={() => saveRuleEdit(r.id)} disabled={ruleEditSaving}>
                                      {ruleEditSaving ? <><Loader2 size={11} /> Saving...</> : <><Check size={11} /> Save changes</>}
                                    </button>
                                  </div>
                                  <p className="text-muted text-xs" style={{ marginTop: 4 }}>Changes take effect immediately. New members matching these groups will be auto-enrolled; existing enrollments keep their current due dates unless you click <strong>Run Now</strong>.</p>
                                </div>
                              )}
                            </div>
                          );})}</div>
                        )}
                      </div>
                      <div className="card">
                        <div className="card-header"><h2><Plus /> New Enrollment Rule</h2></div>
                        <form onSubmit={createRule} className="form-stack">
                          <div className="form-group"><label>Rule name</label><input placeholder="e.g. Manager Onboarding for Managers group" value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} /></div>

                          <div className="form-group">
                            <label>Step 1 &middot; What to assign</label>
                            <div className="enrollment-target-group">
                              <label className={`et-option${ruleForm.targetKind === "plan" ? " active" : ""}`}><input type="radio" name="tk" value="plan" checked={ruleForm.targetKind === "plan"} onChange={() => setRuleForm({ ...ruleForm, targetKind: "plan" })} /> Learning Plan</label>
                              <label className={`et-option${ruleForm.targetKind === "course" ? " active" : ""}`}><input type="radio" name="tk" value="course" checked={ruleForm.targetKind === "course"} onChange={() => setRuleForm({ ...ruleForm, targetKind: "course" })} /> Individual Course</label>
                            </div>
                            {ruleForm.targetKind === "course" ? (
                              <select value={ruleForm.courseId} onChange={(e) => setRuleForm({ ...ruleForm, courseId: e.target.value })} style={{ marginTop: 8 }}><option value="">Choose a course…</option>{data.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
                            ) : (
                              <>
                                <select value={ruleForm.learningPathId} onChange={(e) => setRuleForm({ ...ruleForm, learningPathId: e.target.value })} style={{ marginTop: 8 }}><option value="">Choose a plan…</option>{catalogLearningPlans.map((p) => <option key={p.id} value={p.id}>{p.title}{p.source === "catalog" || p.company_id === null ? " (Curated)" : " (Custom)"}</option>)}</select>
                                <p className="text-muted text-xs" style={{ marginTop: 4 }}>Every required course in the plan is enrolled for matching users.</p>
                              </>
                            )}
                          </div>

                          <div className="form-group">
                            <label>Step 2 &middot; Who (match by)</label>
                            <div className="enrollment-target-group">
                              <label className={`et-option${ruleForm.matchMode === "group" ? " active" : ""}`}><input type="radio" name="mm" value="group" checked={ruleForm.matchMode === "group"} onChange={() => setRuleForm({ ...ruleForm, matchMode: "group" })} /> Group membership</label>
                              <label className={`et-option${ruleForm.matchMode === "attribute" ? " active" : ""}`}><input type="radio" name="mm" value="attribute" checked={ruleForm.matchMode === "attribute"} onChange={() => setRuleForm({ ...ruleForm, matchMode: "attribute" })} /> Role &amp; state</label>
                            </div>
                            {ruleForm.matchMode === "group" ? (
                              <div style={{ marginTop: 8 }}>
                                <p className="text-muted text-xs" style={{ marginBottom: 6 }}>Groups sync from Entrata. Manage membership in Entrata &rsaquo; Users &amp; Groups; changes flow into EA automatically.</p>
                                {(groups || []).length === 0 ? (
                                  <p className="text-muted text-xs">No groups available. Set up groups in Entrata first and they'll appear here.</p>
                                ) : (
                                  <GroupMultiSelect
                                    groups={groups}
                                    value={ruleForm.groupIds}
                                    onChange={(next) => setRuleForm({ ...ruleForm, groupIds: next })}
                                  />
                                )}
                                <p className="text-muted text-xs" style={{ marginTop: 6 }}>Existing members are enrolled immediately. When someone is added to a matching group in Entrata later, they're auto-enrolled at that moment.</p>
                              </div>
                            ) : (
                              <div className="flex-row gap-2" style={{ marginTop: 8 }}>
                                <div className="form-group" style={{ flex: 1, margin: 0 }}><label>Role</label><select value={ruleForm.role} onChange={(e) => setRuleForm({ ...ruleForm, role: e.target.value })}><option>Leasing Agent</option><option>Maintenance Tech</option><option>Property Manager</option></select></div>
                                <div className="form-group" style={{ flex: 1, margin: 0 }}><label>State</label><select value={ruleForm.state} onChange={(e) => setRuleForm({ ...ruleForm, state: e.target.value })}><option>CA</option><option>OR</option><option>TX</option><option>WA</option></select></div>
                              </div>
                            )}
                          </div>

                          <div className="form-group">
                            <label>Step 3 &middot; Options</label>
                            <div className="enrollment-target-group">
                              <label className={`et-option${ruleForm.enrollment_target === "all" ? " active" : ""}`}><input type="radio" name="et" value="all" checked={ruleForm.enrollment_target === "all"} onChange={() => setRuleForm({ ...ruleForm, enrollment_target: "all" })} /> All members</label>
                              <label className={`et-option${ruleForm.enrollment_target === "new_hires_only" ? " active" : ""}`}><input type="radio" name="et" value="new_hires_only" checked={ruleForm.enrollment_target === "new_hires_only"} onChange={() => setRuleForm({ ...ruleForm, enrollment_target: "new_hires_only" })} /> New hires only</label>
                              <label className={`et-option${ruleForm.enrollment_target === "existing_only" ? " active" : ""}`}><input type="radio" name="et" value="existing_only" checked={ruleForm.enrollment_target === "existing_only"} onChange={() => setRuleForm({ ...ruleForm, enrollment_target: "existing_only" })} /> Existing employees</label>
                            </div>
                            <div style={{ marginTop: 8 }}>
                              <label style={{ fontSize: 11 }}>Due within (days)</label>
                              <input type="number" min="1" max="365" value={ruleForm.dueDays} onChange={(e) => setRuleForm({ ...ruleForm, dueDays: e.target.value })} style={{ width: 80 }} />
                            </div>
                          </div>

                          <div className="form-group" style={{ background: "#f9fafb", padding: 10, borderRadius: 6, border: "1px solid var(--border-light)" }}>
                            <label style={{ fontWeight: 600 }}>Step 4 &middot; Review</label>
                            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                              Assign <strong>{ruleForm.targetKind === "plan" ? (catalogLearningPlans.find(p => p.id === ruleForm.learningPathId)?.title || "(plan not selected)") : (data.courses.find(c => c.id === ruleForm.courseId)?.title || "(course not selected)")}</strong>
                              {" "}to {ruleForm.matchMode === "group" ? (
                                ruleForm.groupIds.length ? (() => {
                                  const selected = ruleForm.groupIds.map(id => groups.find(g => g.id === id)).filter(Boolean);
                                  const names = selected.map(g => g.name);
                                  const totalMembers = selected.reduce((s, g) => s + (Number(g.member_count) || 0), 0);
                                  const preview = names.slice(0, 2).join(", ");
                                  const more = names.length > 2 ? ` and ${names.length - 2} more` : "";
                                  return <>members of <strong>{preview}{more}</strong> <span className="text-muted">({selected.length} group{selected.length === 1 ? "" : "s"}, up to {totalMembers} {totalMembers === 1 ? "person" : "people"})</span></>;
                                })() : <em>no group selected</em>
                              ) : <><strong>{ruleForm.role}</strong> in <strong>{ruleForm.state}</strong></>}
                              {", "}due in <strong>{ruleForm.dueDays}</strong> days ({ruleForm.enrollment_target.replace(/_/g, " ")}).
                            </div>
                          </div>

                          <button type="submit" className="btn-primary"><Plus size={13} /> Create Rule</button>
                        </form>
                      </div>
                    </div>
                  ) : null}

                  {/* ===== POLICIES ===== */}
                  {adminSubTab === "policies" ? (
                    <>
                      <EngNotes tabKey="admin/policies" />
                      {policyView === "list" ? (
                        <>
                          <div className="flex-between mb-4">
                            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}><FileText size={15} /> Policies</h2>
                            <button className="btn-primary btn-sm" onClick={() => setPolicyView("create")}><Plus size={11} /> New Policy</button>
                          </div>
                          {policyCompliance.length === 0 ? <div className="card"><div className="empty-state"><FileText /><div className="empty-title">No policies</div><div className="empty-desc">Create your first policy to start tracking acknowledgments.</div></div></div> : (
                            <div className="card">
                              <div className="table-wrap"><table><thead><tr><th>Policy</th><th>Category</th><th>Schedule</th><th>Scope</th><th>Acknowledged</th><th>Pending</th><th>Overdue</th><th>Rate</th><th>Actions</th></tr></thead><tbody>{policyCompliance.map((p) => {
                                const total = Number(p.total_assigned) || 0;
                                const acked = Number(p.acknowledged) || 0;
                                const rate = total > 0 ? Math.round((acked / total) * 100) : 0;
                                return (
                                  <tr key={p.id} style={{ cursor: "pointer" }} onClick={async () => { if (expandedPolicy === p.id) { setExpandedPolicy(null); } else { setExpandedPolicy(p.id); await loadPolicyUsers(p.id); } }}>
                                    <td><strong>{p.title}</strong>{p.file_type ? <span style={{ marginLeft: 6, fontSize: 10, color: p.file_type === "pdf" ? "var(--danger)" : "var(--primary)", fontWeight: 600, textTransform: "uppercase" }}>{p.file_type}</span> : null}{expandedPolicy === p.id ? " \u25BE" : ""}</td>
                                    <td>{p.category}</td>
                                    <td>{p.schedule_type === "rolling" ? "Rolling" : "Fixed"} / {p.recurrence_months || 12}mo</td>
                                    <td><span className={`source-badge ${p.scope_type === "company" ? "catalog" : "custom"}`}>{p.scope_type === "company" ? "All" : p.scope_type}</span></td>
                                    <td style={{ color: "var(--success)" }}>{acked}</td>
                                    <td>{p.pending}</td>
                                    <td style={{ color: Number(p.overdue) > 0 ? "var(--danger)" : undefined }}>{p.overdue}</td>
                                    <td><div className="progress-bar" style={{ width: 70, display: "inline-flex" }}><div className={`fill ${rate === 100 ? "green" : rate > 60 ? "blue" : "amber"}`} style={{ width: `${rate}%` }} /></div> {rate}%</td>
                                    <td><button className="btn-sm" onClick={(e) => { e.stopPropagation(); handleExecutePolicySchedule(p.id); }}><Play size={11} /> Run</button></td>
                                  </tr>
                                );
                              })}</tbody></table></div>

                              {expandedPolicy && policyComplianceUsers.length > 0 ? (
                                <div style={{ marginTop: 12, padding: 12, background: "var(--bg-muted, #f8f9fa)", borderRadius: 8 }}>
                                  <h3 style={{ fontSize: 14, marginBottom: 8 }}>User Acknowledgment Status</h3>
                                  <div className="table-wrap"><table><thead><tr><th>Name</th><th>Role</th><th>Property</th><th>Status</th><th>Due</th><th>Acknowledged</th><th>Next Due</th></tr></thead><tbody>{policyComplianceUsers.map((u) => (
                                    <tr key={u.id}>
                                      <td>{u.name}</td>
                                      <td>{u.role}</td>
                                      <td>{u.property_name || "\u2014"}</td>
                                      <td><StatusBadge status={u.status === "acknowledged" ? "completed" : u.status} /></td>
                                      <td>{fD(u.due_date)}</td>
                                      <td>{fD(u.acknowledged_at)}</td>
                                      <td>{fD(u.next_due_date)}</td>
                                    </tr>
                                  ))}</tbody></table></div>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </>
                      ) : null}

                      {policyView === "create" ? (
                        <div className="card">
                          <div className="card-header"><h2><Plus /> Create Policy</h2><button className="btn-sm" onClick={() => setPolicyView("list")}><X size={11} /> Cancel</button></div>
                          <form onSubmit={handleCreatePolicy} className="form-stack">
                            <div className="form-group"><label>Title</label><input required placeholder="e.g. Fair Housing Non-Discrimination Policy" value={policyForm.title} onChange={(e) => setPolicyForm({ ...policyForm, title: e.target.value })} /></div>
                            <div className="flex-row gap-2">
                              <div className="form-group" style={{ flex: 1 }}><label>Category</label><select value={policyForm.category} onChange={(e) => setPolicyForm({ ...policyForm, category: e.target.value })}>
                                <option>Compliance</option><option>Employee Handbook</option><option>Safety</option><option>Management & Operations</option><option>Marketing</option><option>Operations</option>
                              </select></div>
                              <div className="form-group" style={{ flex: 1 }}><label>Effective Date</label><input type="date" value={policyForm.effectiveDate} onChange={(e) => setPolicyForm({ ...policyForm, effectiveDate: e.target.value })} /></div>
                            </div>
                            <div className="form-group">
                              <label>Policy Content</label>
                              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                                <button type="button" className={`btn-sm ${policyContentMode === "file" ? "active" : ""}`} style={policyContentMode === "file" ? { background: "var(--primary)", color: "#fff" } : {}} onClick={() => setPolicyContentMode("file")}><Upload size={11} /> Upload PDF / DOCX</button>
                                <button type="button" className={`btn-sm ${policyContentMode === "html" ? "active" : ""}`} style={policyContentMode === "html" ? { background: "var(--primary)", color: "#fff" } : {}} onClick={() => setPolicyContentMode("html")}><FileText size={11} /> Write Content</button>
                              </div>
                              {policyContentMode === "file" ? (
                                <div style={{ border: "2px dashed var(--border)", borderRadius: 8, padding: 20, textAlign: "center", background: "var(--bg-muted, #f8f9fa)" }}>
                                  {policyFile ? (
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                      <FileText size={16} style={{ color: policyFile.name.endsWith(".pdf") ? "var(--danger)" : "var(--primary)" }} />
                                      <span style={{ fontSize: 13, fontWeight: 500 }}>{policyFile.name}</span>
                                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>({(policyFile.size / 1024).toFixed(0)} KB)</span>
                                      <button type="button" className="btn-sm" onClick={() => setPolicyFile(null)}><X size={11} /> Remove</button>
                                    </div>
                                  ) : (
                                    <>
                                      <Upload size={24} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
                                      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Drop a PDF or Word document here, or click to browse</div>
                                      <label className="btn-sm" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                        <Upload size={11} /> Choose File
                                        <input type="file" accept=".pdf,.docx" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) setPolicyFile(e.target.files[0]); }} />
                                      </label>
                                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>Accepted formats: PDF, DOCX</div>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div style={{ border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
                                  <div style={{ display: "flex", gap: 2, padding: "6px 8px", borderBottom: "1px solid var(--border-light, #e5e7eb)", background: "var(--bg-muted, #f8f9fa)", flexWrap: "wrap" }}>
                                    {[
                                      { cmd: "bold", label: "B", style: { fontWeight: 700 } },
                                      { cmd: "italic", label: "I", style: { fontStyle: "italic" } },
                                      { cmd: "underline", label: "U", style: { textDecoration: "underline" } },
                                      { cmd: "insertUnorderedList", label: "List" },
                                      { cmd: "insertOrderedList", label: "1. List" },
                                    ].map(btn => (
                                      <button key={btn.cmd} type="button" style={{ padding: "3px 8px", fontSize: 12, border: "1px solid var(--border-light, #ddd)", borderRadius: 4, background: "var(--surface)", cursor: "pointer", ...btn.style }}
                                        onClick={() => { document.execCommand(btn.cmd, false, null); }}>{btn.label}</button>
                                    ))}
                                    <select style={{ fontSize: 11, padding: "2px 4px", border: "1px solid var(--border-light, #ddd)", borderRadius: 4 }} onChange={(e) => { if (e.target.value) { document.execCommand("formatBlock", false, e.target.value); e.target.value = ""; } }}>
                                      <option value="">Heading...</option>
                                      <option value="h2">Heading</option>
                                      <option value="h3">Subheading</option>
                                      <option value="p">Paragraph</option>
                                    </select>
                                  </div>
                                  <PolicyHtmlEditor initialHtml={policyForm.contentHtml || ""} onChange={(html) => setPolicyForm({ ...policyForm, contentHtml: html })} />
                                </div>
                              )}
                            </div>

                            <div style={{ padding: 16, background: "var(--bg-muted, #f8f9fa)", borderRadius: 8, marginTop: 8 }}>
                              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Acknowledgment Schedule</h3>
                              <div className="flex-row gap-2" style={{ marginBottom: 8 }}>
                                <div className="form-group" style={{ flex: 1 }}><label>Schedule Type</label><select value={policyForm.scheduleType} onChange={(e) => setPolicyForm({ ...policyForm, scheduleType: e.target.value, anchor: e.target.value === "fixed" ? "effective_date" : "hire_date" })}>
                                  <option value="fixed">Fixed Calendar (everyone same date)</option>
                                  <option value="rolling">Rolling Anniversary (per individual)</option>
                                </select></div>
                                <div className="form-group" style={{ flex: 1 }}><label>Recurrence</label><select value={policyForm.recurrenceMonths} onChange={(e) => setPolicyForm({ ...policyForm, recurrenceMonths: Number(e.target.value) })}>
                                  <option value={6}>Every 6 months</option><option value={12}>Every 12 months</option><option value={18}>Every 18 months</option><option value={24}>Every 24 months</option>
                                </select></div>
                              </div>
                              <div className="flex-row gap-2" style={{ marginBottom: 8 }}>
                                <div className="form-group" style={{ flex: 1 }}><label>Anchor</label><select value={policyForm.anchor} onChange={(e) => setPolicyForm({ ...policyForm, anchor: e.target.value })}>
                                  {policyForm.scheduleType === "fixed" ? <><option value="effective_date">Policy Effective Date</option><option value="calendar_year">Calendar Year (Jan 1)</option></> : <><option value="hire_date">Employee Hire Date</option><option value="first_acknowledgment">First Acknowledgment Date</option></>}
                                </select></div>
                                <div className="form-group" style={{ flex: 1 }}><label>Grace Period (days)</label><input type="number" min={1} value={policyForm.gracePeriodDays} onChange={(e) => setPolicyForm({ ...policyForm, gracePeriodDays: Number(e.target.value) })} /></div>
                              </div>
                              <div className="flex-row gap-2">
                                <div className="form-group" style={{ flex: 1 }}><label>New Hire Deadline (days)</label><input type="number" min={1} value={policyForm.onboardingDeadlineDays} onChange={(e) => setPolicyForm({ ...policyForm, onboardingDeadlineDays: Number(e.target.value) })} /></div>
                                <div className="form-group" style={{ flex: 1 }}><label>Scope</label><select value={policyForm.scopeType} onChange={(e) => setPolicyForm({ ...policyForm, scopeType: e.target.value, scopeValue: [] })}>
                                  <option value="company">Entire Company</option><option value="role">Specific Roles</option><option value="group">Specific Groups</option>
                                </select></div>
                              </div>
                              {policyForm.scopeType === "role" ? (
                                <div className="form-group" style={{ marginTop: 8 }}><label>Select Roles</label>
                                  {["Leasing Agent", "Property Manager", "Community Manager", "Assistant Property Manager", "Maintenance Tech", "Operations Director", "Regional VP"].map((r) => (
                                    <label key={r} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginTop: 4, cursor: "pointer" }}>
                                      <input type="checkbox" checked={policyForm.scopeValue.includes(r)} onChange={(e) => setPolicyForm((o) => ({ ...o, scopeValue: e.target.checked ? [...o.scopeValue, r] : o.scopeValue.filter((x) => x !== r) }))} /> {r}
                                    </label>
                                  ))}
                                </div>
                              ) : null}
                              {policyForm.scopeType === "group" ? (
                                <div className="form-group" style={{ marginTop: 8 }}><label>Select Groups</label>
                                  {groups.map((g) => (
                                    <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginTop: 4, cursor: "pointer" }}>
                                      <input type="checkbox" checked={policyForm.scopeValue.includes(g.id)} onChange={(e) => setPolicyForm((o) => ({ ...o, scopeValue: e.target.checked ? [...o.scopeValue, g.id] : o.scopeValue.filter((x) => x !== g.id) }))} /> {g.name} ({g.member_count})
                                    </label>
                                  ))}
                                </div>
                              ) : null}
                            </div>

                            <button type="submit" className="btn-primary" disabled={policyUploading || (policyContentMode === "file" && !policyFile && !policyForm.contentHtml)} style={{ marginTop: 12 }}>{policyUploading ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Uploading...</> : <><Plus size={13} /> Create Policy & Schedule</>}</button>
                          </form>
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  {/* ===== SPARKS ADMIN ===== */}
                  {adminSubTab === "sparks-admin" ? (
                    <>
                      <EngNotes tabKey="admin/sparks-admin" />
                      {!sparkCreateMode ? (
                        <>
                          <div className="flex-between mb-4">
                            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}><Zap size={15} /> Spotlights Library</h2>
                            <div className="flex-row">
                              <button className="btn-sm" onClick={() => setSparkCreateMode("studio")}><Video size={11} /> Spotlight Studio</button>
                              <button className="btn-sm" onClick={() => setSparkCreateMode("ai")}><Sparkles size={11} /> AI Generate</button>
                            </div>
                          </div>
                          {adminSparks.length === 0 ? <div className="card"><div className="empty-state"><Zap /><div className="empty-title">No spotlights yet</div></div></div> : (
                            <div className="card">
                              <div className="table-wrap"><table><thead><tr><th>Title</th><th>Category</th><th>Source</th><th>Duration</th><th>Views</th><th>Completions</th><th>Status</th><th>Actions</th></tr></thead><tbody>{adminSparks.map((s) => (
                                <tr key={s.id}>
                                  <td><button style={{ all: "unset", cursor: "pointer" }} onClick={() => setPreviewSpark(s)}><strong style={{ color: "var(--blue-600, #2563eb)" }}>{s.title}</strong></button><div style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.description?.slice(0, 60)}{s.description?.length > 60 ? "..." : ""}</div></td>
                                  <td>{s.category}</td>
                                  <td><span className={`source-badge ${s.source}`}>{s.source === "ai_generated" ? "AI" : s.source === "recorded" ? "Recorded" : "Video"}</span></td>
                                  <td>{Math.floor(s.duration_seconds / 60)}:{String(s.duration_seconds % 60).padStart(2, "0")}</td>
                                  <td>{s.view_count}</td>
                                  <td>{s.total_completed || 0}</td>
                                  <td><span className={`status ${s.published ? "active" : "assigned"}`}>{s.published ? "Published" : "Draft"}</span></td>
                                  <td>
                                    <div className="flex-row" style={{ gap: 4 }}>
                                      <button className="btn-sm" onClick={() => setPreviewSpark(s)} title="Preview"><Eye size={11} /></button>
                                      <button className="btn-sm" onClick={() => toggleSparkPublished(token, s.id).then(() => loadAdminSparks())}>{s.published ? "Unpublish" : "Publish"}</button>
                                      {s.source === "recorded" ? <button className="btn-sm" onClick={() => handleAiGenerate(s.id)}><Sparkles size={10} /></button> : null}
                                    </div>
                                  </td>
                                </tr>
                              ))}</tbody></table></div>
                            </div>
                          )}

                          {/* Spark Preview Modal */}
                          {previewSpark && (
                            <div className="player-overlay" onClick={() => setPreviewSpark(null)}>
                              <div className="player-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
                                <div className="player-header">
                                  <h2><Zap size={15} /> {previewSpark.title}</h2>
                                  <button className="btn-sm" onClick={() => setPreviewSpark(null)}><X size={14} /></button>
                                </div>
                                <div style={{ padding: 16 }}>
                                  <video
                                    src={sparkVideoSrc(previewSpark)}
                                    controls
                                    autoPlay
                                    style={{ width: "100%", borderRadius: 8, background: "#000", maxHeight: 360 }}
                                  />
                                  <div style={{ marginTop: 12 }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                                      <span className={`source-badge ${previewSpark.source}`}>{previewSpark.source === "ai_generated" ? "AI Generated" : previewSpark.source === "recorded" ? "Recorded" : "Uploaded"}</span>
                                      <span className={`status ${previewSpark.published ? "active" : "assigned"}`}>{previewSpark.published ? "Published" : "Draft"}</span>
                                      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{previewSpark.category} &middot; {Math.floor(previewSpark.duration_seconds / 60)}:{String(previewSpark.duration_seconds % 60).padStart(2, "0")}</span>
                                    </div>
                                    {previewSpark.description && <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>{previewSpark.description}</p>}
                                    {previewSpark.tags?.length > 0 && (
                                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                                        {previewSpark.tags.map((tag) => <span key={tag} style={{ fontSize: 12, background: "var(--bg-hover)", padding: "2px 8px", borderRadius: 10 }}>{tag}</span>)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Spark Rules */}
                          <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 24, marginBottom: 8 }}><Settings size={14} /> Performance Rules</h3>
                          <div className="grid two">
                            <div className="card">
                              {sparkRules.length === 0 ? <div className="empty-state"><Settings /><div className="empty-title">No rules</div></div> : (
                                <div className="item-list">{sparkRules.map((r) => (
                                  <div key={r.id} className="item">
                                    <div className="avatar-sm amber"><Zap size={12} /></div>
                                    <div className="item-body"><div className="item-title">{r.name}</div><div className="item-meta">{r.metric} {r.operator === "less_than" ? "<" : ">"} {r.threshold}% &middot; {r.target_roles?.join(", ")} &middot; {r.spark_ids?.length} spark{r.spark_ids?.length !== 1 ? "s" : ""}</div></div>
                                    <button className="btn-primary btn-sm" onClick={() => handleExecuteSparkRule(r.id)}><Play size={11} /> Run</button>
                                  </div>
                                ))}</div>
                              )}
                            </div>
                            <div className="card">
                              <div className="card-header"><h2><Plus /> New Rule</h2></div>
                              <form onSubmit={handleCreateSparkRule} className="form-stack">
                                <div className="form-group"><label>Rule Name</label><input placeholder="e.g. Low close rate coaching" value={sparkRuleForm.name} onChange={(e) => setSparkRuleForm({ ...sparkRuleForm, name: e.target.value })} required /></div>
                                <div className="flex-row gap-2">
                                  <div className="form-group" style={{ flex: 1 }}><label>Metric</label><select value={sparkRuleForm.metric} onChange={(e) => setSparkRuleForm({ ...sparkRuleForm, metric: e.target.value })}>
                                    <option value="close_rate">Close Rate</option><option value="tour_conversion">Tour Conversion</option><option value="response_time">Response Time (min)</option><option value="work_order_completion">Work Order Completion</option><option value="renewal_rate">Renewal Rate</option>
                                  </select></div>
                                  <div className="form-group" style={{ flex: 1 }}><label>Trigger</label><select value={sparkRuleForm.operator} onChange={(e) => setSparkRuleForm({ ...sparkRuleForm, operator: e.target.value })}>
                                    <option value="less_than">Below threshold</option><option value="greater_than">Above threshold</option>
                                  </select></div>
                                  <div className="form-group" style={{ flex: 1 }}><label>Threshold</label><input type="number" value={sparkRuleForm.threshold} onChange={(e) => setSparkRuleForm({ ...sparkRuleForm, threshold: Number(e.target.value) })} /></div>
                                </div>
                                <div className="form-group"><label>Target Roles</label>
                                  {["Leasing Agent", "Maintenance Tech", "Property Manager"].map((r) => (
                                    <label key={r} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginTop: 4, cursor: "pointer" }}>
                                      <input type="checkbox" checked={sparkRuleForm.targetRoles.includes(r)} onChange={(e) => setSparkRuleForm((o) => ({ ...o, targetRoles: e.target.checked ? [...o.targetRoles, r] : o.targetRoles.filter((x) => x !== r) }))} /> {r}
                                    </label>
                                  ))}
                                </div>
                                <div className="form-group"><label>Spotlights to Assign</label>
                                  {adminSparks.filter((s) => s.published).map((s) => (
                                    <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginTop: 4, cursor: "pointer" }}>
                                      <input type="checkbox" checked={sparkRuleForm.sparkIds.includes(s.id)} onChange={(e) => setSparkRuleForm((o) => ({ ...o, sparkIds: e.target.checked ? [...o.sparkIds, s.id] : o.sparkIds.filter((x) => x !== s.id) }))} /> {s.title}
                                    </label>
                                  ))}
                                </div>
                                <button type="submit" className="btn-primary"><Plus size={13} /> Create Rule</button>
                              </form>
                            </div>
                          </div>
                        </>
                      ) : sparkCreateMode === "studio" ? (
                        <SparkStudio
                          token={token}
                          apiBase={API_BASE}
                          onCreated={() => { setSparkCreateMode(null); loadAdminSparks(); showToast("Spark created", "success"); }}
                          onCancel={() => setSparkCreateMode(null)}
                        />
                      ) : (
                        <div className="card">
                          <div className="card-header">
                            <h2><Sparkles size={15} /> AI Auto-Generate</h2>
                            <button className="btn-sm" onClick={() => { setSparkCreateMode(null); setCaptureSteps([]); setIsRecording(false); }}><X size={11} /> Cancel</button>
                          </div>
                          <form onSubmit={handleCreateSpark} className="form-stack">
                            <div className="form-group"><label>Title</label><input required placeholder="e.g. 5-Minute Lead Response" value={sparkForm.title} onChange={(e) => setSparkForm({ ...sparkForm, title: e.target.value })} /></div>
                            <div className="form-group"><label>Description</label><textarea rows={2} placeholder="What this spark teaches..." value={sparkForm.description} onChange={(e) => setSparkForm({ ...sparkForm, description: e.target.value })} /></div>
                            <div className="flex-row gap-2">
                              <div className="form-group" style={{ flex: 1 }}><label>Category</label><select value={sparkForm.category} onChange={(e) => setSparkForm({ ...sparkForm, category: e.target.value })}>
                                <option>Leasing</option><option>Maintenance</option><option>Resident Experience</option><option>Operations</option><option>Compliance</option>
                              </select></div>
                              <div className="form-group" style={{ flex: 1 }}><label>Duration (sec)</label><input type="number" min={10} value={sparkForm.durationSeconds} onChange={(e) => setSparkForm({ ...sparkForm, durationSeconds: Number(e.target.value) })} /></div>
                            </div>
                            <div style={{ padding: 16, background: "var(--bg-muted, #f8f9fa)", borderRadius: 8 }}>
                              <div className="flex-between" style={{ marginBottom: 12 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Record Steps for AI Enhancement</h3>
                              </div>
                              <div className="flex-row gap-2" style={{ marginBottom: 8 }}>
                                <div className="form-group" style={{ flex: 2 }}><label>Step Title</label><input placeholder="e.g. Click Submit Button" value={captureStep.title} onChange={(e) => setCaptureStep({ ...captureStep, title: e.target.value })} /></div>
                                <div className="form-group" style={{ flex: 1 }}><label>Action</label><select value={captureStep.action} onChange={(e) => setCaptureStep({ ...captureStep, action: e.target.value })}>
                                  <option value="click">Click</option><option value="type">Type</option><option value="navigate">Navigate</option><option value="scroll">Scroll</option>
                                </select></div>
                              </div>
                              <div className="form-group" style={{ marginBottom: 8 }}><label>Description</label><input placeholder="What happens in this step" value={captureStep.description} onChange={(e) => setCaptureStep({ ...captureStep, description: e.target.value })} /></div>
                              <button type="button" className="btn-sm" onClick={handleCaptureAddStep} disabled={!captureStep.title}><Plus size={11} /> Add Step</button>
                              {captureSteps.length > 0 ? (
                                <div className="item-list mt-2">{captureSteps.map((s, i) => (
                                  <div key={i} className="item">
                                    <div className="avatar-sm blue" style={{ fontSize: 11, fontWeight: 700 }}>{i + 1}</div>
                                    <div className="item-body"><div className="item-title">{s.title}</div><div className="item-meta"><span className={`spark-action-badge ${s.action}`}>{s.action}</span> {s.description}</div></div>
                                  </div>
                                ))}</div>
                              ) : null}
                              {captureSteps.length > 0 ? (
                                <div style={{ marginTop: 12, padding: 12, background: "#fef3c7", borderRadius: 8, fontSize: 13 }}>
                                  <Sparkles size={12} /> <strong>AI will enhance these steps</strong> with polished descriptions, suggested voiceover scripts, and quiz questions.
                                </div>
                              ) : null}
                            </div>
                            <button type="submit" className="btn-primary" style={{ marginTop: 8 }}>
                              <Sparkles size={13} /> Create & AI Enhance
                            </button>
                          </form>
                        </div>
                      )}
                    </>
                  ) : null}

                  {/* ===== WORKFLOW RECORDER (Elite only) ===== */}
                  {adminSubTab === "workflow-recorder" && isElite ? (
                    <><EngNotes tabKey="admin/workflow-recorder" />
                    <WorkflowRecorder
                      token={token}
                      apiBase={API_BASE}
                      onCreated={() => { setAdminSubTab("content"); loadAdminContent(); showToast("Workflow course created! It's now in your content library.", "success"); }}
                      onCancel={() => setAdminSubTab("content")}
                    /></>
                  ) : null}

                  {/* ===== CURATED BY ENTRATA ===== */}
                  {/* ===== LEARNING PLANS ===== */}
                  {adminSubTab === "learning-paths" ? (
                    <div>
                      <EngNotes tabKey="admin/learning-paths" />
                      {!selectedPath ? (
                        <div className="admin-subtabs" style={{ marginBottom: 12 }}>
                          <button className={learningPlansTab === "my" ? "active" : ""} onClick={() => setLearningPlansTab("my")}><FolderOpen size={13} /> My Plans ({learningPaths.length})</button>
                          <button className={learningPlansTab === "curated" ? "active" : ""} onClick={() => { setLearningPlansTab("curated"); loadCuratedPlans(); }}><Star size={13} /> Curated by Entrata ({curatedPlans.length})</button>
                        </div>
                      ) : null}
                      {selectedPath ? (
                        <div className="card">
                          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <h2 style={{ margin: 0 }}><FolderOpen size={14} /> {selectedPath.title}</h2>
                              <span className={`badge-status ${selectedPath.status === "published" ? "active" : "draft"}`} style={{ fontSize: 10 }}>{selectedPath.status === "published" ? "Published" : "Draft"}</span>
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="btn-sm" onClick={() => { setSelectedPath(null); setLpCourseList([]); setLpCourseSearch(""); setLpCourseCategory(""); setLpCourseSelected([]); setLpEditing(false); }}>Back</button>
                              {selectedPath.source !== "catalog" && selectedPath.company_id !== null && !lpEditing ? (
                                <button className="btn-sm" onClick={() => { setLpEditForm({ title: selectedPath.title || "", description: selectedPath.description || "", target_role: selectedPath.target_role || "", enrollment_mode: selectedPath.enrollment_mode || "catalog_only" }); setLpEditing(true); }}><Pencil size={11} /> Edit</button>
                              ) : null}
                              {selectedPath.status !== "published" ? (
                                <button className="btn-primary btn-sm" onClick={async () => { try { await updateLearningPath(token, selectedPath.id, { status: "published" }); setSelectedPath(p => ({ ...p, status: "published" })); await loadLearningPaths(); showToast("Learning plan published", "success"); } catch (e) { setError(e.message); } }}>Publish</button>
                              ) : (
                                <button className="btn-sm" onClick={async () => { try { await updateLearningPath(token, selectedPath.id, { status: "draft" }); setSelectedPath(p => ({ ...p, status: "draft" })); await loadLearningPaths(); showToast("Reverted to draft", "info"); } catch (e) { setError(e.message); } }}>Unpublish</button>
                              )}
                              <button className="btn-sm btn-danger" onClick={() => handleDeletePath(selectedPath.id)}>Delete</button>
                            </div>
                          </div>
                          <div style={{ padding: 16 }}>
                            {lpEditing ? (
                              <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 14, marginBottom: 12, background: "var(--bg-muted, #f8f9fa)" }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><Pencil size={12} /> Edit Learning Plan</div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                                  <div>
                                    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Title <span style={{ color: "var(--danger)" }}>*</span></label>
                                    <input type="text" value={lpEditForm.title} onChange={e => setLpEditForm(p => ({ ...p, title: e.target.value }))} required style={{ width: "100%", padding: "7px 10px", fontSize: 14, border: "1px solid var(--border)", borderRadius: 6 }} />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Target Group</label>
                                    <select value={lpEditForm.target_role} onChange={e => setLpEditForm(p => ({ ...p, target_role: e.target.value }))} style={{ width: "100%", padding: "7px 10px", fontSize: 14, border: "1px solid var(--border)", borderRadius: 6 }}>
                                      <option value="">All groups</option>
                                      {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </select>
                                  </div>
                                </div>
                                <div style={{ marginBottom: 10 }}>
                                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Description <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(shown to learners in the catalog)</span></label>
                                  <textarea value={lpEditForm.description} onChange={e => setLpEditForm(p => ({ ...p, description: e.target.value }))} placeholder="Briefly describe what this plan covers and who it's for (1-2 sentences)." rows={2} style={{ width: "100%", padding: "7px 10px", fontSize: 14, border: "1px solid var(--border)", borderRadius: 6, resize: "vertical", fontFamily: "inherit" }} />
                                </div>
                                <div style={{ marginBottom: 12 }}>
                                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Enrollment Mode</label>
                                  <select value={lpEditForm.enrollment_mode} onChange={e => setLpEditForm(p => ({ ...p, enrollment_mode: e.target.value }))} style={{ width: "100%", padding: "7px 10px", fontSize: 14, border: "1px solid var(--border)", borderRadius: 6 }}>
                                    <option value="catalog_only">Catalog Only (learners self-enroll)</option>
                                    <option value="auto_assign">Auto-Assign (enroll target group automatically)</option>
                                  </select>
                                </div>
                                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                  <button className="btn-sm" onClick={() => setLpEditing(false)}>Cancel</button>
                                  <button className="btn-primary btn-sm" disabled={!lpEditForm.title.trim()} onClick={async () => {
                                    try {
                                      const updated = await updateLearningPath(token, selectedPath.id, { title: lpEditForm.title.trim(), description: lpEditForm.description.trim(), target_role: lpEditForm.target_role || null, enrollment_mode: lpEditForm.enrollment_mode });
                                      setSelectedPath(p => ({ ...p, ...updated }));
                                      await loadLearningPaths();
                                      setLpEditing(false);
                                      showToast("Learning plan updated", "success");
                                    } catch (e) { setError(e.message); }
                                  }}>Save changes</button>
                                </div>
                              </div>
                            ) : null}
                            {selectedPath.description && !lpEditing ? (
                              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10, lineHeight: 1.5, padding: "8px 10px", background: "var(--bg-muted, #f8f9fa)", borderLeft: "3px solid var(--primary)", borderRadius: 4 }}>{selectedPath.description}</div>
                            ) : null}
                            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
                              {selectedPath.target_role ? <span className="badge-role">{groups.find(g => g.id === selectedPath.target_role)?.name || selectedPath.target_role}</span> : <span>All groups</span>}
                              <span> &middot; </span>
                              <span className={`source-badge ${selectedPath.enrollment_mode === "auto_assign" ? "auto" : "self"}`} style={{ fontSize: 10 }}>{selectedPath.enrollment_mode === "auto_assign" ? "Auto-Assign" : "Catalog Only"}</span>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Courses ({lpCourseList.length})</div>
                            {lpCourseList.length === 0 ? (
                              <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 16, textAlign: "center" }}>No courses yet. Add courses from the catalog below.</div>
                            ) : (
                              <div className="lp-course-list">
                                {lpCourseList.map((c, idx) => (
                                  <div key={c.id} className="lp-course-item">
                                    <div className="lp-course-order">{idx + 1}</div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontWeight: 500, fontSize: 14 }}>{c.title}</div>
                                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.category} &middot; {c.duration_minutes}m {c.required ? "" : " (optional)"}</div>
                                    </div>
                                    <div className="lp-course-actions">
                                      <button className="btn-sm" disabled={idx === 0} onClick={() => handleMoveCourse(idx, -1)} title="Move up">&#9650;</button>
                                      <button className="btn-sm" disabled={idx === lpCourseList.length - 1} onClick={() => handleMoveCourse(idx, 1)} title="Move down">&#9660;</button>
                                      <button className="btn-sm btn-danger" onClick={() => handleRemoveCourseFromPath(c.id)} title="Remove">&times;</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div style={{ marginTop: 16 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Add courses</div>
                              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                                <input type="text" placeholder="Search courses..." value={lpCourseSearch} onChange={e => setLpCourseSearch(e.target.value)} style={{ flex: 1, padding: "7px 10px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 6 }} />
                                <select value={lpCourseCategory} onChange={e => setLpCourseCategory(e.target.value)} style={{ padding: "7px 10px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 6 }}>
                                  <option value="">All categories</option>
                                  {[...new Set((data.courses || []).map(c => c.category))].sort().map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                              </div>
                              <div style={{ border: "1px solid var(--border)", borderRadius: 6, maxHeight: 220, overflowY: "auto" }}>
                                {(() => {
                                  const available = (data.courses || []).filter(c => !lpCourseList.some(lc => lc.id === c.id))
                                    .filter(c => !lpCourseSearch || c.title.toLowerCase().includes(lpCourseSearch.toLowerCase()))
                                    .filter(c => !lpCourseCategory || c.category === lpCourseCategory);
                                  if (available.length === 0) return <div style={{ padding: 16, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No matching courses</div>;
                                  return available.map(c => (
                                    <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--border-light, #e5e7eb)", fontSize: 13 }} className="catalog-list-row">
                                      <input type="checkbox" checked={lpCourseSelected.includes(c.id)} onChange={e => setLpCourseSelected(prev => e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id))} />
                                      <span style={{ flex: 1, fontWeight: 500 }}>{c.title}</span>
                                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{c.category}</span>
                                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{c.duration_minutes}m</span>
                                    </label>
                                  ));
                                })()}
                              </div>
                              {lpCourseSelected.length > 0 && (
                                <button className="btn-primary btn-sm" style={{ marginTop: 8 }} onClick={async () => { for (const cid of lpCourseSelected) await handleAddCourseToPath(cid); setLpCourseSelected([]); }}>
                                  <Plus size={13} /> Add {lpCourseSelected.length} course{lpCourseSelected.length > 1 ? "s" : ""}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : learningPlansTab === "my" ? (
                        <>
                          <div className="card">
                            <div className="card-header"><h2><FolderOpen size={14} /> My Plans</h2></div>
                            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 16px 12px" }}>
                              Learning Plans you create for your organization. Add courses in the right order, mark required vs optional, and assign to groups or make available in the catalog. For Entrata-authored plans that ship with the catalog, see the <strong>Curated by Entrata</strong> tab.
                            </p>
                            {learningPaths.length === 0 ? (
                              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 24, fontSize: 14 }}>No learning plans yet. Create your first one below.</div>
                            ) : (
                              <div className="table-wrap"><table><thead><tr><th>Plan</th><th>Group</th><th>Enrollment</th><th>Courses</th><th>Status</th><th></th></tr></thead><tbody>
                                {learningPaths.map(lp => (
                                  <tr key={lp.id} style={lp.status === "draft" ? { opacity: 0.7 } : undefined}>
                                    <td style={{ fontWeight: 500 }}>{lp.title}</td>
                                    <td>{lp.target_role ? (groups.find(g => g.id === lp.target_role)?.name || lp.target_role) : "All groups"}</td>
                                    <td><span className={`source-badge ${lp.enrollment_mode === "auto_assign" ? "auto" : "self"}`} style={{ fontSize: 10, textTransform: "capitalize" }}>{lp.enrollment_mode === "auto_assign" ? "Auto-Assign" : "Catalog Only"}</span></td>
                                    <td>{lp.course_count}</td>
                                    <td><span className={`badge-status ${lp.status === "published" ? "active" : "draft"}`} style={{ fontSize: 10 }}>{lp.status === "published" ? "Published" : "Draft"}</span></td>
                                    <td><button className="btn-sm" onClick={() => loadLearningPathDetail(lp.id)}>Edit</button></td>
                                  </tr>
                                ))}
                              </tbody></table></div>
                            )}
                          </div>
                          <div className="card mt-4">
                            <div className="card-header"><h2>Create learning plan</h2></div>
                            <form onSubmit={handleCreatePath} style={{ padding: "0 16px 16px" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                                <div><label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Title</label>
                                  <input type="text" value={lpForm.title} onChange={e => setLpForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Leasing Onboarding" required style={{ width: "100%", padding: "7px 10px", fontSize: 14, border: "1px solid var(--border)", borderRadius: 6 }} /></div>
                                <div><label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Target Group</label>
                                  <select value={lpForm.target_role} onChange={e => setLpForm(p => ({ ...p, target_role: e.target.value }))} style={{ width: "100%", padding: "7px 10px", fontSize: 14, border: "1px solid var(--border)", borderRadius: 6 }}>
                                    <option value="">All groups</option>
                                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                  </select></div>
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
                                <div><label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Description</label>
                                  <input type="text" value={lpForm.description} onChange={e => setLpForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description" style={{ width: "100%", padding: "7px 10px", fontSize: 14, border: "1px solid var(--border)", borderRadius: 6 }} /></div>
                                <div><label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Enrollment</label>
                                  <select value={lpForm.enrollment_mode} onChange={e => setLpForm(p => ({ ...p, enrollment_mode: e.target.value }))} style={{ width: "100%", padding: "7px 10px", fontSize: 14, border: "1px solid var(--border)", borderRadius: 6 }}>
                                    <option value="catalog_only">Catalog Only</option>
                                    <option value="auto_assign">Auto-Assign to Group</option>
                                  </select></div>
                                <button type="submit" className="btn-primary btn-sm">Create</button>
                              </div>
                            </form>
                          </div>
                        </>
                      ) : (
                        <div className="card mb-4">
                          <div className="card-header">
                            <h2><Star size={14} /> Curated by Entrata</h2>
                            <p className="text-muted text-sm" style={{ margin: "4px 0 0" }}>
                              Entrata-authored Learning Plans that appear in your organization's catalog by default. Hide any that aren't relevant to your team -- your learners won't see hidden plans, and nothing changes for other customers.
                            </p>
                          </div>
                          <div style={{ padding: 12 }}>
                            {curatedPlans.length === 0 ? (
                              <div className="empty-state" style={{ padding: 20 }}>
                                <Star style={{ opacity: 0.4 }} />
                                <div className="empty-title">No curated Learning Plans yet</div>
                                <div className="empty-desc">Entrata publishes Curated Learning Plans from the Publisher app. Check back after the next release.</div>
                              </div>
                            ) : (
                              <table className="data-table" style={{ width: "100%" }}>
                                <thead>
                                  <tr>
                                    <th style={{ textAlign: "left" }}>Plan</th>
                                    <th style={{ textAlign: "left" }}>Target Role</th>
                                    <th style={{ textAlign: "center" }}>Courses</th>
                                    <th style={{ textAlign: "center" }}>Tier</th>
                                    <th style={{ textAlign: "right" }}>Visibility</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {curatedPlans.map((p) => (
                                    <tr key={p.id} style={{ opacity: p.hidden ? 0.55 : 1 }}>
                                      <td>
                                        <div style={{ fontWeight: 600 }}>{p.title}</div>
                                        <div className="text-muted text-xs" style={{ marginTop: 2 }}>{p.description || ""}</div>
                                      </td>
                                      <td>{p.target_role || "All Roles"}</td>
                                      <td style={{ textAlign: "center" }}>{p.course_count}</td>
                                      <td style={{ textAlign: "center" }}><span className="badge">{p.tier_required === "elite" ? "Elite" : "Basic+"}</span></td>
                                      <td style={{ textAlign: "right" }}>
                                        {p.hidden ? (
                                          <button className="btn-sm" disabled={curatedPlanSaving === p.id} onClick={async () => {
                                            setCuratedPlanSaving(p.id);
                                            try { await unhideCuratedPlan(token, p.id); await loadCuratedPlans(); showToast(`"${p.title}" is now visible`, "success"); loadMyLearningPlans(); loadCatalogLearningPlans(); }
                                            catch (e) { showToast(e.message, "error"); }
                                            finally { setCuratedPlanSaving(null); }
                                          }}>Show</button>
                                        ) : (
                                          <button className="btn-sm btn-ghost" disabled={curatedPlanSaving === p.id} onClick={async () => {
                                            setCuratedPlanSaving(p.id);
                                            try { await hideCuratedPlan(token, p.id); await loadCuratedPlans(); showToast(`"${p.title}" hidden from learners`, "success"); loadMyLearningPlans(); loadCatalogLearningPlans(); }
                                            catch (e) { showToast(e.message, "error"); }
                                            finally { setCuratedPlanSaving(null); }
                                          }}>Hide</button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* ===== ENABLEMENT CALENDAR ===== */}
                  {adminSubTab === "calendar" ? (
                    <div>
                      <EngNotes tabKey="admin/enablement-calendar" />
                      <div className="card mb-4">
                        <div className="card-header"><h2><Calendar size={14} /> Enablement Calendar</h2></div>
                        <div style={{ padding: 16 }}>
                          {(() => {
                            const recurring = enablementCal.recurring || [];
                            const policyDeadlines = enablementCal.policy_deadlines || [];
                            const pubEvents = enablementCal.publisher_events || [];
                            const today = new Date();
                            const month = today.getMonth();
                            const year = today.getFullYear();
                            const firstDay = new Date(year, month, 1).getDay();
                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                            const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

                            const getEvents = (day) => {
                              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                              const events = [];
                              for (const r of recurring) {
                                if (r.next_run_date && r.next_run_date.slice(0, 10) === dateStr) events.push({ type: "recurring", label: r.name, color: "#3b82f6" });
                              }
                              for (const p of policyDeadlines) {
                                if (p.next_deadline && p.next_deadline.slice(0, 10) === dateStr) events.push({ type: "policy", label: p.title, color: "#ef4444" });
                              }
                              for (const pe of pubEvents) {
                                if (pe.event_date && pe.event_date.slice(0, 10) === dateStr) events.push({ type: "publisher", label: pe.title, color: pe.color || "#8b5cf6" });
                              }
                              return events;
                            };

                            const cells = [];
                            for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} className="cal-cell empty" />);
                            for (let d = 1; d <= daysInMonth; d++) {
                              const evts = getEvents(d);
                              const isToday = d === today.getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                              cells.push(
                                <div key={d} className={`cal-cell ${isToday ? "today" : ""}`}>
                                  <div className="cal-day">{d}</div>
                                  {evts.map((ev, idx) => (
                                    <div key={idx} className="cal-event" style={{ backgroundColor: ev.color + "22", borderLeft: `3px solid ${ev.color}`, color: ev.color, padding: "1px 4px", fontSize: 11, borderRadius: 3, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={ev.label}>
                                      {ev.label}
                                    </div>
                                  ))}
                                </div>
                              );
                            }

                            return (
                              <>
                                <div style={{ textAlign: "center", fontWeight: 600, fontSize: 14, marginBottom: 12 }}>{monthNames[month]} {year}</div>
                                <div className="cal-grid">
                                  {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="cal-header">{d}</div>)}
                                  {cells}
                                </div>
                                <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12 }}>
                                  <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, backgroundColor: "#3b82f6", marginRight: 4 }} />Recurring Assignment</span>
                                  <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, backgroundColor: "#ef4444", marginRight: 4 }} />Policy Deadline</span>
                                  <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, backgroundColor: "#8b5cf6", marginRight: 4 }} />Publisher Event</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="grid two">
                        <div className="card">
                          <div className="card-header"><h2>Recurring Assignments</h2></div>
                          {(enablementCal.recurring || []).length === 0 ? (
                            <div className="empty-state"><Calendar /><div className="empty-title">No recurring schedules</div></div>
                          ) : (
                            <div className="table-wrap"><table><thead><tr><th>Name</th><th>Frequency</th><th>Next Run</th></tr></thead><tbody>
                              {(enablementCal.recurring || []).map((r, i) => (
                                <tr key={i}><td>{r.name}</td><td>Every {r.frequency_months} mo</td><td>{r.next_run_date ? new Date(r.next_run_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "\u2014"}</td></tr>
                              ))}
                            </tbody></table></div>
                          )}
                        </div>
                        <div className="card">
                          <div className="card-header"><h2>Policy Deadlines</h2></div>
                          {(enablementCal.policy_deadlines || []).length === 0 ? (
                            <div className="empty-state"><ShieldCheck /><div className="empty-title">No upcoming deadlines</div></div>
                          ) : (
                            <div className="table-wrap"><table><thead><tr><th>Policy</th><th>Deadline</th></tr></thead><tbody>
                              {(enablementCal.policy_deadlines || []).map((p, i) => (
                                <tr key={i}><td>{p.title}</td><td>{p.next_deadline ? new Date(p.next_deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "\u2014"}</td></tr>
                              ))}
                            </tbody></table></div>
                          )}
                        </div>
                      </div>

                      {(enablementCal.publisher_events || []).length > 0 && (
                        <div className="card mt-4">
                          <div className="card-header"><h2 style={{ color: "#8b5cf6" }}>Publisher Scheduled Events</h2></div>
                          <div className="table-wrap"><table><thead><tr><th>Title</th><th>Type</th><th>Date</th><th>Description</th></tr></thead><tbody>
                            {(enablementCal.publisher_events || []).map((pe, i) => (
                              <tr key={i}><td>{pe.title}</td><td style={{ textTransform: "capitalize" }}>{pe.event_type || "event"}</td><td>{pe.event_date ? new Date(pe.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "\u2014"}</td><td className="text-muted">{pe.description || "\u2014"}</td></tr>
                            ))}
                          </tbody></table></div>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* ===== CERTIFICATION PROGRAMS ===== */}
                  {adminSubTab === "cert-programs" ? (
                    <div className="card">
                      <EngNotes tabKey="admin/cert-programs" />
                      <div className="card-header"><h2><Award /> Certification Programs</h2></div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", margin: "0 16px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: 12, color: "#1e40af", lineHeight: 1.4 }}>
                        <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span><strong>Certification Programs</strong> manage multi-course credentials with optional expiry and renewal — think "Fair Housing Certified" or "Lead Based Paint Certified." For one-off course assignments use <a href="#" onClick={(e) => { e.preventDefault(); setAdminSubTab("assign"); }} style={{ color: "#1e40af", textDecoration: "underline" }}>Assign</a>, and for ongoing auto-enrollment by group membership use <a href="#" onClick={(e) => { e.preventDefault(); setAdminSubTab("rules"); }} style={{ color: "#1e40af", textDecoration: "underline" }}>Enrollment Rules</a>.</span>
                      </div>
                      <div className="form-stack" style={{ padding: "0 16px 16px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
                          <div className="form-group" style={{ margin: 0 }}><label>Program Title</label><input placeholder="e.g. Fair Housing Certified" value={certProgramForm.title} onChange={(e) => setCertProgramForm({ ...certProgramForm, title: e.target.value })} /></div>
                          <div className="form-group" style={{ margin: 0 }}><label>Expiry (months)</label><input type="number" min={1} value={certProgramForm.expiry_months} onChange={(e) => setCertProgramForm({ ...certProgramForm, expiry_months: e.target.value })} /></div>
                          <button className="btn-primary" onClick={async () => { try { await createCertProgram(token, certProgramForm); await loadCertPrograms(); showToast("Certification program created", "success"); setCertProgramForm({ title: "", description: "", type: "custom", expiry_months: 12, min_passing_score: 80 }); } catch (e) { setError(e.message); } }}><Plus size={13} /> Create</button>
                        </div>
                      </div>
                      {certPrograms.length === 0 ? <div className="empty-state" style={{ padding: 32 }}><Award size={32} /><div className="empty-title">No certification programs</div><p className="text-muted">Create structured multi-course credentials.</p></div> : (
                        <div className="table-wrap"><table><thead><tr><th>Program</th><th>Courses</th><th>Assigned</th><th>Earned</th><th>Actions</th></tr></thead><tbody>
                          {certPrograms.map((cp) => (
                            <tr key={cp.id}><td>{cp.title}</td><td>{cp.course_count || 0}</td><td>{cp.total_assigned || 0}</td><td>{cp.total_earned || 0}</td>
                              <td><button className="btn-sm" onClick={() => { setSelectedCertProgram(cp); loadCertPrograms(); }}>Manage</button> <button className="btn-sm" style={{ color: "var(--red-600)" }} onClick={async () => { try { await deleteCertProgram(token, cp.id); await loadCertPrograms(); showToast("Deleted", "success"); } catch (e) { setError(e.message); } }}>Delete</button></td>
                            </tr>
                          ))}
                        </tbody></table></div>
                      )}
                    </div>
                  ) : null}

                  {/* ===== CONTEXTUAL TRIGGERS (E3) ===== */}
                  {adminSubTab === "contextual-triggers" ? (
                    <div className="card">
                      <EngNotes tabKey="admin/contextual-triggers" />
                      <div className="card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <h2><Crosshair /> Contextual Training Triggers</h2>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn-sm" onClick={loadTriggerFires}>Refresh fires</button>
                          <button className="btn-primary btn-sm" onClick={() => setSimulateForm((s) => ({ ...s, open: !s.open, error: "" }))}>Simulate event</button>
                        </div>
                      </div>
                      {simulateForm.open ? (
                        <div style={{ margin: "8px 16px 16px", padding: 12, background: "#f8fafc", border: "1px solid var(--border)", borderRadius: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Simulate an Entrata event</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end" }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label>Event type</label>
                              <select value={simulateForm.eventType} onChange={(e) => setSimulateForm((s) => ({ ...s, eventType: e.target.value }))}>
                                {["first_use","new_feature","compliance_deadline","low_performance","resident_complaint","seasonal","role_change","onboarding","new_hire"].map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label>Target user (optional)</label>
                              <input placeholder="user UUID to enroll" value={simulateForm.userId} onChange={(e) => setSimulateForm((s) => ({ ...s, userId: e.target.value }))} />
                            </div>
                            <button className="btn-primary" disabled={simulateForm.busy} onClick={runSimulateEvent}>
                              {simulateForm.busy ? "Firing..." : "Fire event"}
                            </button>
                          </div>
                          {simulateForm.error ? <div style={{ fontSize: 12, color: "var(--red-600, #b91c1c)", marginTop: 8 }}>{simulateForm.error}</div> : null}
                        </div>
                      ) : null}
                      {triggerFires.length > 0 ? (
                        <div style={{ margin: "0 16px 16px", padding: 12, background: "#fff", border: "1px solid var(--border)", borderRadius: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Recent fires (last {triggerFires.length})</div>
                          <div className="table-wrap">
                            <table>
                              <thead><tr><th>When</th><th>Event</th><th>Trigger</th><th>Matched</th><th>Actions</th><th>By</th></tr></thead>
                              <tbody>
                                {triggerFires.map((f) => (
                                  <tr key={f.id}>
                                    <td style={{ fontSize: 11, whiteSpace: "nowrap" }}>{new Date(f.fired_at).toLocaleString()}</td>
                                    <td><code style={{ fontSize: 11 }}>{f.event_type}</code></td>
                                    <td>{f.trigger_name || "—"}</td>
                                    <td style={{ textAlign: "center" }}>{f.matched}</td>
                                    <td style={{ fontSize: 11 }}>{(f.actions || []).map((a) => a.action).join(", ") || "—"}</td>
                                    <td style={{ fontSize: 11 }}>{f.fired_by_name || "api"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}
                      <div style={{ padding: "0 16px 12px" }}>
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 8px" }}>Contextual triggers surface training content inside Entrata at the exact moment a user needs it -- for example, showing a walkthrough the first time someone accesses a new feature, or surfacing safety training when a maintenance tech's KPI drops.</p>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--muted-bg, #f5f5f5)", padding: "8px 12px", borderRadius: 6, lineHeight: 1.5 }}>
                          <strong>How is this different from Learning Plan auto-enrollment?</strong> Learning Plans assign a full sequence of courses to a group. Triggers surface a single piece of training at the moment of need, based on what the user is doing in Entrata right now.
                        </div>
                      </div>
                      <div className="form-stack" style={{ padding: "8px 16px 16px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 }}>
                          <div className="form-group" style={{ margin: 0 }}><label>Trigger Type</label><select value={triggerForm.trigger_type} onChange={(e) => setTriggerForm({ ...triggerForm, trigger_type: e.target.value })}><option value="first_encounter">First Encounter</option><option value="seasonal">Seasonal</option><option value="performance_drop">Performance Drop</option><option value="role_change">Role Change</option><option value="new_feature">New Feature</option><option value="onboarding">Onboarding</option></select></div>
                          <div className="form-group" style={{ margin: 0 }}><label>Label</label><input placeholder="e.g. First Move-In" value={triggerForm.trigger_label} onChange={(e) => setTriggerForm({ ...triggerForm, trigger_label: e.target.value })} /></div>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "4px 0 8px", fontStyle: "italic" }}>
                          {{ first_encounter: "Fires the first time a user visits a specific Entrata page or feature they haven't accessed before.", seasonal: "Fires at a recurring time of year (e.g., budget season, lease renewal period, annual compliance deadlines).", performance_drop: "Fires when a user's KPI drops below a threshold (e.g., low lease conversion rate, high maintenance backlog).", role_change: "Fires when a user is assigned a new role in Entrata (e.g., promoted from Leasing Agent to Property Manager).", new_feature: "Fires when Entrata releases a new feature the user hasn't seen before.", onboarding: "Fires during the user's first 30 days after their hire date." }[triggerForm.trigger_type]}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, marginBottom: 12 }}>
                          <div className="form-group" style={{ margin: 0 }}><label>Content Type</label><select value={triggerForm.target_content_type} onChange={(e) => setTriggerForm({ ...triggerForm, target_content_type: e.target.value, target_content_id: "" })}><option value="course">Course</option><option value="learning_path">Learning Plan</option></select></div>
                          <div className="form-group" style={{ margin: 0 }}><label>Target {triggerForm.target_content_type === "learning_path" ? "Learning Plan" : "Course"}</label><select value={triggerForm.target_content_id} onChange={(e) => setTriggerForm({ ...triggerForm, target_content_id: e.target.value })}><option value="">Select...</option>{triggerForm.target_content_type === "learning_path" ? (learningPaths || []).map((lp) => <option key={lp.id} value={lp.id}>{lp.title}</option>) : data.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
                          <div className="form-group" style={{ margin: 0 }}><label>Target Groups</label><select multiple value={triggerForm.target_group_ids} onChange={(e) => setTriggerForm({ ...triggerForm, target_group_ids: Array.from(e.target.selectedOptions, o => o.value) })} style={{ minHeight: 60 }}>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select><div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Hold Ctrl/Cmd to select multiple</div></div>
                          <div className="form-group" style={{ margin: 0 }}><label>Target Roles</label><select multiple value={triggerForm.target_roles} onChange={(e) => setTriggerForm({ ...triggerForm, target_roles: Array.from(e.target.selectedOptions, o => o.value) })} style={{ minHeight: 60 }}>{["Leasing Agent", "Property Manager", "Maintenance Tech", "Regional VP", "Admin"].map(r => <option key={r} value={r}>{r}</option>)}</select><div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Hold Ctrl/Cmd to select multiple</div></div>
                          <button className="btn-primary" onClick={async () => { try { await createContextualTrigger(token, triggerForm); await loadContextualTriggers(); showToast("Trigger created", "success"); setTriggerForm({ ...triggerForm, trigger_label: "", target_content_id: "", target_group_ids: [], target_roles: [] }); } catch (e) { setError(e.message); } }}><Plus size={13} /> Add</button>
                        </div>
                      </div>
                      {contextualTriggers.length === 0 ? <div className="empty-state" style={{ padding: 32 }}><Crosshair size={32} /><div className="empty-title">No triggers configured</div></div> : (
                        <div className="table-wrap"><table><thead><tr><th>Type</th><th>Label</th><th>Content Type</th><th>Target</th><th>Groups / Roles</th><th>Enabled</th></tr></thead><tbody>
                          {contextualTriggers.map((ct) => (
                            <tr key={ct.id}>
                              <td style={{ textTransform: "capitalize" }}>{ct.trigger_type?.replace(/_/g, " ")}</td>
                              <td>{ct.trigger_label}</td>
                              <td><span className={`source-badge ${ct.target_content_type}`} style={{ textTransform: "capitalize", fontSize: 10 }}>{ct.target_content_type?.replace(/_/g, " ")}</span></td>
                              <td>{ct.target_title || ct.target_content_id || "—"}</td>
                              <td style={{ fontSize: 12 }}>
                                {ct.target_group_ids?.length > 0 ? <div style={{ color: "var(--primary)" }}>{ct.target_group_ids.length} group{ct.target_group_ids.length !== 1 ? "s" : ""}</div> : null}
                                {ct.target_roles?.length > 0 ? <div style={{ color: "var(--text-muted)" }}>{ct.target_roles.join(", ")}</div> : null}
                                {(!ct.target_group_ids?.length && !ct.target_roles?.length) ? <span style={{ color: "var(--text-muted)" }}>All users</span> : null}
                              </td>
                              <td><button className={`btn-sm ${ct.enabled ? "" : "text-muted"}`} onClick={async () => { await toggleContextualTrigger(token, ct.id, !ct.enabled); await loadContextualTriggers(); }}>{ct.enabled ? "Active" : "Disabled"}</button></td>
                            </tr>
                          ))}
                        </tbody></table></div>
                      )}
                    </div>
                  ) : null}

                  {/* ===== DIGITAL ADOPTION (1.5) ===== */}
                  {adminSubTab === "digital-adoption" ? (
                    <div className="card">
                      <EngNotes tabKey="admin/digital-adoption" />
                      <div className="card-header"><h2><Shield /> Digital Adoption Platform</h2></div>
                      <div className="dap-subtabs" style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", padding: "0 16px" }}>
                        {["gates","analytics","compliance","exceptions"].map(t => (
                          <button key={t} className={`content-tab ${dapSubTab === t ? "active" : ""}`} style={{ fontSize: 12, padding: "8px 16px" }} onClick={() => { setDapSubTab(t); if (t === "analytics") loadDapDashboard(); if (t === "compliance") loadDapCompliance(); if (t === "exceptions") loadDapExceptions(); }}>{t === "gates" ? "Workflow Gates" : t === "analytics" ? "Adoption Analytics" : t === "compliance" ? "Compliance" : "Exceptions"}</button>
                        ))}
                      </div>

                      {dapSubTab === "gates" ? (
                        <div style={{ padding: 16 }}>
                          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 12px" }}>Configure workflow gates that require or suggest training before users access Entrata features. Gates in <strong>Require</strong> mode block access until training is completed.</p>
                          <div className="form-stack" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 16, marginBottom: 16, background: "var(--bg-muted, #f8f9fa)" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                              <div className="form-group" style={{ margin: 0 }}><label>Trigger Label</label><input placeholder="e.g. Safety Training Gate" value={triggerForm.trigger_label} onChange={e => setTriggerForm({ ...triggerForm, trigger_label: e.target.value })} /></div>
                              <div className="form-group" style={{ margin: 0 }}><label>Workflow</label><select value={triggerForm.workflow_key} onChange={e => setTriggerForm({ ...triggerForm, workflow_key: e.target.value })}><option value="">Select workflow...</option><option value="maintenance.work-order.create">Create Work Order</option><option value="leasing.move-in">Process Move-In</option><option value="accounting.late-fees">Configure Late Fees</option><option value="leasing.lease-renewal">Process Lease Renewal</option><option value="compliance.fair-housing">Fair Housing Workflows</option><option value="portal.resident-config">Configure Resident Portal</option></select></div>
                              <div className="form-group" style={{ margin: 0 }}><label>Enforcement</label><select value={triggerForm.enforcement_mode} onChange={e => setTriggerForm({ ...triggerForm, enforcement_mode: e.target.value })}><option value="suggest">Suggest</option><option value="require">Require</option></select></div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                              <div className="form-group" style={{ margin: 0 }}><label>Target Course</label><select value={triggerForm.target_content_id} onChange={e => setTriggerForm({ ...triggerForm, target_content_id: e.target.value })}><option value="">Select...</option>{data.courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
                              <div className="form-group" style={{ margin: 0 }}><label>Pass Threshold</label><input type="number" min="0" max="100" placeholder="None" value={triggerForm.pass_threshold || ""} onChange={e => setTriggerForm({ ...triggerForm, pass_threshold: e.target.value ? parseInt(e.target.value) : null })} /></div>
                              <div className="form-group" style={{ margin: 0 }}><label>Grace Period (days)</label><input type="number" min="0" value={triggerForm.grace_period_days} onChange={e => setTriggerForm({ ...triggerForm, grace_period_days: parseInt(e.target.value) || 0 })} /></div>
                              <div className="form-group" style={{ margin: 0 }}><label>Recertification (days)</label><input type="number" min="0" placeholder="Never" value={triggerForm.recertification_interval_days || ""} onChange={e => setTriggerForm({ ...triggerForm, recertification_interval_days: e.target.value ? parseInt(e.target.value) : null })} /></div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 12, alignItems: "end" }}>
                              <div className="form-group" style={{ margin: 0 }}><label>Block Message</label><input placeholder="Custom message shown when blocked" value={triggerForm.block_message} onChange={e => setTriggerForm({ ...triggerForm, block_message: e.target.value })} /></div>
                              <div className="form-group" style={{ margin: 0 }}><label>Target Roles</label><select multiple value={triggerForm.target_roles} onChange={e => setTriggerForm({ ...triggerForm, target_roles: Array.from(e.target.selectedOptions, o => o.value) })} style={{ minHeight: 50 }}>{["Leasing Agent","Property Manager","Maintenance Tech","Regional VP","Admin"].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                              <button className="btn-primary" onClick={async () => { try { await createContextualTrigger(token, { ...triggerForm, trigger_type: "workflow_gate" }); await loadContextualTriggers(); showToast("Gate created", "success"); setTriggerForm(f => ({ ...f, trigger_label: "", workflow_key: "", block_message: "", target_content_id: "", target_roles: [], pass_threshold: null, grace_period_days: 0, recertification_interval_days: null })); } catch (e) { setError(e.message); } }}><Plus size={13} /> Add Gate</button>
                            </div>
                          </div>
                          {contextualTriggers.length === 0 ? <div className="empty-state" style={{ padding: 32 }}><Shield size={32} /><div className="empty-title">No workflow gates configured</div></div> : (
                            <div className="table-wrap"><table><thead><tr><th>Workflow</th><th>Label</th><th>Mode</th><th>Threshold</th><th>Grace</th><th>Recert</th><th>Roles</th><th>Completions</th><th>Actions</th></tr></thead><tbody>
                              {contextualTriggers.map(ct => (
                                <tr key={ct.id}>
                                  <td style={{ fontSize: 12 }}>{ct.workflow_key || "N/A"}</td>
                                  <td>{ct.trigger_label}</td>
                                  <td><span className={`source-badge ${ct.enforcement_mode === "require" ? "scorm" : "custom"}`} style={{ fontSize: 10 }}>{ct.enforcement_mode === "require" ? "Require" : "Suggest"}</span></td>
                                  <td>{ct.pass_threshold ? `${ct.pass_threshold}%` : "--"}</td>
                                  <td>{ct.grace_period_days || "--"}{ct.grace_period_days ? "d" : ""}</td>
                                  <td>{ct.recertification_interval_days ? `${ct.recertification_interval_days}d` : "Never"}</td>
                                  <td style={{ fontSize: 11 }}>{ct.target_roles?.length ? ct.target_roles.join(", ") : "All"}</td>
                                  <td style={{ textAlign: "center" }}>{ct.completion_count || 0}</td>
                                  <td style={{ display: "flex", gap: 4 }}>
                                    <button className={`btn-sm ${ct.enabled ? "" : "text-muted"}`} onClick={async () => { await toggleContextualTrigger(token, ct.id, !ct.enabled); await loadContextualTriggers(); }}>{ct.enabled ? "Active" : "Off"}</button>
                                    <button className="btn-sm text-muted" onClick={async () => { if (confirm("Delete this gate?")) { await deleteContextualTrigger(token, ct.id); await loadContextualTriggers(); showToast("Gate deleted", "success"); } }}><X size={11} /></button>
                                  </td>
                                </tr>
                              ))}
                            </tbody></table></div>
                          )}
                        </div>
                      ) : null}

                      {dapSubTab === "analytics" ? (
                        <div style={{ padding: 16 }}>
                          {!dapDashboardData ? <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}><Loader2 size={24} className="spin" /></div> : (
                            <>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
                                {(dapDashboardData.eventCounts || []).filter(e => ["gate_blocked","gate_cleared","walkthrough_completed","smart_tip_viewed"].includes(e.event_type)).map(e => (
                                  <div key={e.event_type} className="stat-card" style={{ padding: 12, borderRadius: 8, border: "1px solid var(--border)" }}>
                                    <div style={{ fontSize: 24, fontWeight: 700 }}>{e.count}</div>
                                    <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "capitalize" }}>{e.event_type.replace(/_/g, " ")}</div>
                                  </div>
                                ))}
                              </div>
                              <h3 style={{ fontSize: 14, marginBottom: 8 }}>Gate Funnels</h3>
                              <div className="table-wrap" style={{ marginBottom: 16 }}><table><thead><tr><th>Gate</th><th>Workflow</th><th>Blocked</th><th>Cleared</th><th>Clearance Rate</th></tr></thead><tbody>
                                {(dapDashboardData.gateFunnels || []).map(g => {
                                  const total = parseInt(g.blocked_count) + parseInt(g.cleared_count);
                                  const rate = total > 0 ? Math.round((parseInt(g.cleared_count) / total) * 100) : 0;
                                  return (
                                    <tr key={g.id}>
                                      <td>{g.trigger_label}</td><td style={{ fontSize: 12 }}>{g.workflow_key}</td>
                                      <td style={{ color: "var(--red-600)" }}>{g.blocked_count}</td>
                                      <td style={{ color: "var(--green-600)" }}>{g.cleared_count}</td>
                                      <td><div className="progress-bar" style={{ width: 80, display: "inline-block", verticalAlign: "middle", marginRight: 6 }}><div className={`fill ${rate > 70 ? "green" : rate > 40 ? "blue" : "red"}`} style={{ width: `${rate}%` }} /></div>{rate}%</td>
                                    </tr>
                                  );
                                })}
                              </tbody></table></div>
                              <h3 style={{ fontSize: 14, marginBottom: 8 }}>Walkthrough Performance</h3>
                              <div className="table-wrap" style={{ marginBottom: 16 }}><table><thead><tr><th>Walkthrough</th><th>Started</th><th>Completed</th><th>Dismissed</th><th>Completion Rate</th></tr></thead><tbody>
                                {(dapDashboardData.walkthroughStats || []).map(w => {
                                  const started = parseInt(w.started) || 1;
                                  const rate = Math.round((parseInt(w.completed) / started) * 100);
                                  return <tr key={w.id}><td>{w.title}</td><td>{w.started}</td><td>{w.completed}</td><td>{w.dismissed}</td><td>{rate}%</td></tr>;
                                })}
                              </tbody></table></div>
                              <h3 style={{ fontSize: 14, marginBottom: 8 }}>Recent Activity</h3>
                              <div style={{ maxHeight: 200, overflow: "auto", fontSize: 12 }}>
                                {(dapDashboardData.recentEvents || []).slice(0, 20).map((evt, i) => (
                                  <div key={i} style={{ padding: "4px 0", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                                    <span><strong>{evt.user_name}</strong> -- <span style={{ color: "var(--text-muted)" }}>{evt.event_type.replace(/_/g, " ")}</span></span>
                                    <span style={{ color: "var(--text-muted)" }}>{new Date(evt.created_at).toLocaleDateString()}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      ) : null}

                      {dapSubTab === "compliance" ? (
                        <div style={{ padding: 16 }}>
                          {!dapComplianceData ? <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}><Loader2 size={24} className="spin" /></div> : (
                            <>
                              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 12px" }}>Per-user compliance status for all required workflow gates.</p>
                              <div className="table-wrap"><table><thead><tr><th>User</th><th>Role</th>{(dapComplianceData.gates || []).map(g => <th key={g.id} style={{ fontSize: 10, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis" }}>{g.trigger_label}</th>)}</tr></thead><tbody>
                                {(dapComplianceData.users || []).map(u => (
                                  <tr key={u.id}>
                                    <td style={{ fontSize: 12 }}>{u.name}</td>
                                    <td style={{ fontSize: 11 }}>{u.role}</td>
                                    {(dapComplianceData.gates || []).map(g => {
                                      if (g.target_roles.length && !g.target_roles.includes(u.role)) return <td key={g.id} style={{ textAlign: "center", color: "var(--text-muted)" }}>--</td>;
                                      if (g.bypass_roles?.includes(u.role)) return <td key={g.id} style={{ textAlign: "center" }}><span style={{ fontSize: 10, background: "#e5e7eb", borderRadius: 4, padding: "2px 6px" }}>Bypass</span></td>;
                                      const comp = (dapComplianceData.completions || []).find(c => c.user_id === u.id && c.trigger_id === g.id);
                                      const exc = (dapComplianceData.exceptions || []).find(e => e.user_id === u.id && e.trigger_id === g.id);
                                      if (comp && (!comp.expires_at || new Date(comp.expires_at) > new Date())) return <td key={g.id} style={{ textAlign: "center" }}><span style={{ fontSize: 10, background: "#dcfce7", color: "#166534", borderRadius: 4, padding: "2px 6px" }}>Cleared</span></td>;
                                      if (exc) return <td key={g.id} style={{ textAlign: "center" }}><span style={{ fontSize: 10, background: "#dbeafe", color: "#1e40af", borderRadius: 4, padding: "2px 6px" }}>Exception</span></td>;
                                      return <td key={g.id} style={{ textAlign: "center" }}><span style={{ fontSize: 10, background: "#fee2e2", color: "#991b1b", borderRadius: 4, padding: "2px 6px" }}>Blocked</span></td>;
                                    })}
                                  </tr>
                                ))}
                              </tbody></table></div>
                            </>
                          )}
                        </div>
                      ) : null}

                      {dapSubTab === "exceptions" ? (
                        <div style={{ padding: 16 }}>
                          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 12px" }}>Manage bypass exception requests from learners who need temporary access to gated workflows.</p>
                          {dapExceptionsData.length === 0 ? <div className="empty-state" style={{ padding: 32 }}><AlertCircle size={32} /><div className="empty-title">No exception requests</div></div> : (
                            <div className="table-wrap"><table><thead><tr><th>User</th><th>Gate</th><th>Reason</th><th>Status</th><th>Expires</th><th>Actions</th></tr></thead><tbody>
                              {dapExceptionsData.map(ex => (
                                <tr key={ex.id}>
                                  <td style={{ fontSize: 12 }}>{ex.user_name}</td>
                                  <td>{ex.trigger_label}</td>
                                  <td style={{ fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{ex.reason}</td>
                                  <td><span className={`source-badge ${ex.status === "granted" ? "catalog" : ex.status === "pending" ? "custom" : "scorm"}`} style={{ fontSize: 10 }}>{ex.status}</span></td>
                                  <td style={{ fontSize: 12 }}>{ex.expires_at ? new Date(ex.expires_at).toLocaleDateString() : "--"}</td>
                                  <td>
                                    {ex.status === "pending" ? (
                                      <div style={{ display: "flex", gap: 4 }}>
                                        <button className="btn-sm" style={{ background: "var(--green-600)", color: "#fff", border: "none" }} onClick={async () => { const days = prompt("Grant for how many days?", "3"); if (days) { await dapAdminUpdateException(token, ex.id, { status: "granted", expires_at: new Date(Date.now() + parseInt(days) * 86400000).toISOString() }); await loadDapExceptions(); showToast("Exception granted", "success"); } }}>Grant</button>
                                        <button className="btn-sm" style={{ background: "var(--red-600)", color: "#fff", border: "none" }} onClick={async () => { await dapAdminUpdateException(token, ex.id, { status: "denied" }); await loadDapExceptions(); showToast("Exception denied", "success"); }}>Deny</button>
                                      </div>
                                    ) : <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{ex.status}</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody></table></div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {/* ===== BRAND KIT (E4) ===== */}
                  {adminSubTab === "brand-kit" ? (
                    <div className="card">
                      <EngNotes tabKey="admin/brand-kit" />
                      <div className="card-header"><h2><Palette /> Brand Kit</h2></div>
                      <div className="form-stack" style={{ padding: "0 16px 16px" }}>
                        <div className="form-group"><label>Logo URL</label><input placeholder="https://..." value={brandKitForm.logo_url} onChange={(e) => setBrandKitForm({ ...brandKitForm, logo_url: e.target.value })} /></div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                          <div className="form-group" style={{ margin: 0 }}><label>Primary Color</label><div style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="color" value={brandKitForm.primary_color} onChange={(e) => setBrandKitForm({ ...brandKitForm, primary_color: e.target.value })} style={{ width: 36, height: 28, padding: 0, border: "1px solid var(--border)" }} /><input value={brandKitForm.primary_color} onChange={(e) => setBrandKitForm({ ...brandKitForm, primary_color: e.target.value })} style={{ flex: 1 }} /></div></div>
                          <div className="form-group" style={{ margin: 0 }}><label>Secondary Color</label><div style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="color" value={brandKitForm.secondary_color} onChange={(e) => setBrandKitForm({ ...brandKitForm, secondary_color: e.target.value })} style={{ width: 36, height: 28, padding: 0, border: "1px solid var(--border)" }} /><input value={brandKitForm.secondary_color} onChange={(e) => setBrandKitForm({ ...brandKitForm, secondary_color: e.target.value })} style={{ flex: 1 }} /></div></div>
                          <div className="form-group" style={{ margin: 0 }}><label>Accent Color</label><div style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="color" value={brandKitForm.accent_color} onChange={(e) => setBrandKitForm({ ...brandKitForm, accent_color: e.target.value })} style={{ width: 36, height: 28, padding: 0, border: "1px solid var(--border)" }} /><input value={brandKitForm.accent_color} onChange={(e) => setBrandKitForm({ ...brandKitForm, accent_color: e.target.value })} style={{ flex: 1 }} /></div></div>
                        </div>
                        <div className="form-group"><label>Greeting Text</label><input placeholder="Welcome to Sunset Property Group Academy" value={brandKitForm.greeting_text} onChange={(e) => setBrandKitForm({ ...brandKitForm, greeting_text: e.target.value })} /></div>
                        <button className="btn-primary" onClick={async () => { try { await updateBrandKit(token, brandKitForm); await loadBrandKit(); showToast("Brand kit updated", "success"); } catch (e) { setError(e.message); } }}>Save Brand Kit</button>
                      </div>
                      {brandKit ? <div style={{ padding: "12px 16px", background: "var(--border-light)", borderRadius: 8, margin: "0 16px 16px", fontSize: 13 }}><strong>Preview:</strong> <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 3, background: brandKitForm.primary_color, verticalAlign: -2, marginRight: 4 }} /> Primary <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 3, background: brandKitForm.secondary_color, verticalAlign: -2, marginLeft: 8, marginRight: 4 }} /> Secondary <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 3, background: brandKitForm.accent_color, verticalAlign: -2, marginLeft: 8, marginRight: 4 }} /> Accent</div> : null}
                      <div style={{ padding: "0 16px 16px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Certificate Branding</div>
                        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 8px" }}>Choose which certificates use your custom branding vs. the standard Entrata certificate. Compliance courses approved by Entrata should typically use the Entrata Standard certificate.</p>
                        <div className="table-wrap"><table><thead><tr><th>Course</th><th>Category</th><th>Certificate Style</th></tr></thead><tbody>
                          {[
                            { title: "Fair Housing Essentials", category: "Compliance", defaultBrand: "entrata" },
                            { title: "Sexual Harassment Prevention", category: "Compliance", defaultBrand: "entrata" },
                            { title: "OSHA Workplace Safety", category: "Compliance", defaultBrand: "entrata" },
                            { title: "Lead Manager Fundamentals", category: "Lead to Lease", defaultBrand: "custom" },
                            { title: "Entrata Platform Onboarding", category: "Onboarding", defaultBrand: "custom" },
                            { title: "Maintenance Safety Basics", category: "Maintenance", defaultBrand: "custom" },
                          ].map((c, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 500 }}>{c.title}</td>
                              <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.category}</td>
                              <td>
                                <select defaultValue={c.defaultBrand} style={{ padding: "4px 8px", fontSize: 12, border: "1px solid var(--border)", borderRadius: 4 }}>
                                  <option value="custom">Custom Branding</option>
                                  <option value="entrata">Entrata Standard</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody></table></div>
                      </div>
                    </div>
                  ) : null}

                  {/* ===== CONTENT VISIBILITY ===== */}
                  {adminSubTab === "content-visibility" ? (
                    <div className="card">
                      <EngNotes tabKey="admin/content-visibility" />
                      <div className="card-header"><h2><Eye size={16} /> Content Visibility</h2></div>
                      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 16px 16px" }}>Control which content surfaces are visible to your users. Learning Catalog is always enabled as a core feature.</p>
                      <div className="table-wrap">
                        <table>
                          <thead><tr><th>Surface</th><th>Status</th><th>Minimum Role</th><th>Actions</th></tr></thead>
                          <tbody>
                            <tr>
                              <td style={{ fontWeight: 500 }}>Learning Catalog</td>
                              <td><span style={{ color: "#059669", fontWeight: 500 }}>Always On</span></td>
                              <td style={{ color: "var(--text-muted)", fontSize: 12 }}>All users</td>
                              <td style={{ color: "var(--text-muted)", fontSize: 12 }}>Core feature -- cannot be disabled</td>
                            </tr>
                            {[
                              { surface: "knowledge_base", label: "Knowledge Base", icon: <FileText size={13} /> },
                              { surface: "whats_new", label: "What's New", icon: <Bell size={13} /> },
                            ].map(({ surface, label, icon }) => {
                              const setting = contentVisibility.find(s => s.surface === surface) || { enabled: true, min_role: null };
                              return (
                                <tr key={surface}>
                                  <td style={{ fontWeight: 500 }}>{icon} {label}</td>
                                  <td>
                                    <button
                                      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: setting.enabled ? "#059669" : "#dc2626", fontWeight: 500, fontSize: 13 }}
                                      onClick={() => handleVisibilityToggle(surface, !setting.enabled, setting.min_role)}
                                    >
                                      {setting.enabled ? <><ToggleRight size={18} /> Enabled</> : <><ToggleLeft size={18} /> Disabled</>}
                                    </button>
                                  </td>
                                  <td>
                                    <select
                                      value={setting.min_role || "all"}
                                      onChange={(e) => handleVisibilityToggle(surface, setting.enabled, e.target.value === "all" ? null : e.target.value)}
                                      style={{ padding: "4px 8px", fontSize: 12, border: "1px solid var(--border)", borderRadius: 4 }}
                                      disabled={!setting.enabled}
                                    >
                                      <option value="all">All Users</option>
                                      <option value="manager">Managers & Above</option>
                                      <option value="admin">Admins Only</option>
                                    </select>
                                  </td>
                                  <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                    {!setting.enabled ? "Hidden from all users" : setting.min_role === "admin" ? "Only admins can see this" : setting.min_role === "manager" ? "Managers, RVPs, and admins" : "Visible to everyone"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}

                  {/* ===== KB INSTANCES ===== */}
                  {adminSubTab === "kb-instances" ? (() => {
                    const kbPublished = kbInstances.filter(i => i.status === "published" && i.base_version >= i.current_version).length;
                    const kbStale = kbInstances.filter(i => i.base_version < i.current_version).length;
                    const kbDrafts = kbInstances.filter(i => i.status === "draft").length;
                    const filteredInstances = kbInstances.filter(inst => {
                      if (kbFilter === "all") return true;
                      if (kbFilter === "published") return inst.status === "published" && inst.base_version >= inst.current_version;
                      if (kbFilter === "stale") return inst.base_version < inst.current_version;
                      if (kbFilter === "draft") return inst.status === "draft";
                      return true;
                    });
                    return (
                    <><EngNotes tabKey="kb-instances" />

                    {kbInstances.length > 0 ? (
                      <div className="stats-row" style={{ marginBottom: 12 }}>
                        <div className="stat-card" style={{ cursor: "pointer", outline: kbFilter === "all" ? "2px solid var(--primary)" : "none", borderRadius: 8 }} onClick={() => setKbFilter("all")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setKbFilter("all"); }}>
                          <div className="stat-icon blue"><Building2 /></div>
                          <div><div className="stat-value">{kbInstances.length}</div><div className="stat-label">Total Customized</div></div>
                        </div>
                        <div className="stat-card" style={{ cursor: "pointer", outline: kbFilter === "published" ? "2px solid var(--primary)" : "none", borderRadius: 8 }} onClick={() => setKbFilter("published")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setKbFilter("published"); }}>
                          <div className="stat-icon green"><CheckCircle2 /></div>
                          <div><div className="stat-value">{kbPublished}</div><div className="stat-label">Published</div></div>
                        </div>
                        <div className="stat-card" style={{ cursor: "pointer", outline: kbFilter === "stale" ? "2px solid var(--primary)" : "none", borderRadius: 8 }} onClick={() => setKbFilter("stale")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setKbFilter("stale"); }}>
                          <div className="stat-icon red"><AlertTriangle /></div>
                          <div><div className="stat-value">{kbStale}</div><div className="stat-label">Needs Update</div></div>
                        </div>
                        <div className="stat-card" style={{ cursor: "pointer", outline: kbFilter === "draft" ? "2px solid var(--primary)" : "none", borderRadius: 8 }} onClick={() => setKbFilter("draft")} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setKbFilter("draft"); }}>
                          <div className="stat-icon amber"><Pencil /></div>
                          <div><div className="stat-value">{kbDrafts}</div><div className="stat-label">Drafts</div></div>
                        </div>
                      </div>
                    ) : null}

                    <div className="card">
                      <div className="card-header flex-between">
                        <h2><Building2 size={16} /> Knowledge Base Instances</h2>
                        <span className="text-muted text-sm">{kbInstances.length} customized article{kbInstances.length !== 1 ? "s" : ""}</span>
                      </div>
                      <p style={{ padding: "0 16px 12px", fontSize: 13, color: "var(--text-secondary)" }}>
                        Company-customized versions of Entrata documentation. Your team's processes, contacts, and procedures layered on top of the originals.
                      </p>

                      {kbInstances.length > 0 ? (
                        <div style={{ display: "flex", gap: 6, padding: "0 16px 12px" }}>
                          {[
                            { key: "all", label: "All" },
                            { key: "published", label: "Published" },
                            { key: "stale", label: "Needs Update" },
                            { key: "draft", label: "Drafts" },
                          ].map(f => (
                            <button key={f.key} className={`btn-sm ${kbFilter === f.key ? "" : "btn-ghost"}`} onClick={() => setKbFilter(f.key)} style={{ background: kbFilter === f.key ? "var(--primary)" : undefined, color: kbFilter === f.key ? "#fff" : undefined, borderRadius: 16, padding: "4px 14px", fontSize: 12, fontWeight: 600 }}>
                              {f.label}
                              {f.key !== "all" ? ` (${f.key === "published" ? kbPublished : f.key === "stale" ? kbStale : kbDrafts})` : ""}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {kbInstances.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "48px 24px" }}>
                          <Building2 size={32} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
                          <h3 style={{ fontSize: 16 }}>No customized articles yet</h3>
                          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Browse the Learning Catalog to customize Entrata articles with your company's processes.</p>
                        </div>
                      ) : filteredInstances.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "48px 24px" }}>
                          <Check size={32} style={{ color: "var(--green-600)", marginBottom: 8 }} />
                          <h3 style={{ fontSize: 16 }}>{kbFilter === "stale" ? "All articles are up to date" : kbFilter === "draft" ? "No drafts" : kbFilter === "published" ? "No published instances" : "No results"}</h3>
                          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{kbFilter === "stale" ? "None of your customized articles need updating right now." : kbFilter === "draft" ? "All your customized articles have been published." : "Try a different filter."}</p>
                          <button className="btn-sm btn-secondary" onClick={() => setKbFilter("all")} style={{ marginTop: 8 }}>Show all</button>
                        </div>
                      ) : (
                        <table className="data-table">
                          <thead><tr>
                            <th>Article</th><th>Category</th><th>Status</th><th>Sync</th><th>Last Updated</th><th>Actions</th>
                          </tr></thead>
                          <tbody>
                            {filteredInstances.map((inst) => {
                              const isStale = inst.base_version < inst.current_version;
                              return (
                                <tr key={inst.id}>
                                  <td>
                                    <button className="article-inline-link" onClick={() => { setTrainingTab("catalog"); setViewingArticle(inst.slug); }} style={{ fontWeight: 600 }}>
                                      {inst.original_title}
                                    </button>
                                  </td>
                                  <td><span className="text-muted text-sm">{inst.category}</span></td>
                                  <td>
                                    {inst.status === "published" ? <span className="badge badge-green">Published</span> : <span className="badge badge-amber">Draft</span>}
                                  </td>
                                  <td>
                                    {isStale ? <span className="badge badge-red" title={`Forked from v${inst.base_version}, current is v${inst.current_version}`}><AlertTriangle size={10} /> Update available</span> : <span className="badge badge-blue"><Check size={10} /> Up to date</span>}
                                  </td>
                                  <td><span className="text-muted text-sm">{inst.updated_by_name ? `${inst.updated_by_name} -- ` : ""}{new Date(inst.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></td>
                                  <td>
                                    <button className="btn-sm" onClick={() => { setTrainingTab("catalog"); setViewingArticle(inst.slug); }}><Eye size={11} /> View</button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div></>
                    );
                  })() : null}

                  {/* ===== AUDIT LOG ===== */}
                  {adminSubTab === "audit-log" ? (
                    <div className="card">
                      <EngNotes tabKey="admin/audit-log" />
                      <div className="card-header flex-between"><h2><ClipboardCheck /> Audit Log</h2><button className="btn-sm" onClick={async () => { try { const blob = await exportAuditLog(token, auditFilters); const url = URL.createObjectURL(new Blob([blob], { type: "text/csv" })); const a = document.createElement("a"); a.href = url; a.download = "audit-log.csv"; a.click(); } catch (e) { setError(e.message); } }}><Download size={11} /> Export CSV</button></div>
                      {auditLog.rows?.length === 0 ? <div className="empty-state" style={{ padding: 32 }}><ClipboardCheck size={32} /><div className="empty-title">No audit entries</div></div> : (
                        <div className="table-wrap"><table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>
                          {(auditLog.rows || []).slice(0, 50).map((row) => (
                            <tr key={row.id}><td style={{ whiteSpace: "nowrap" }}>{fD(row.created_at)}</td><td>{row.user_name || row.user_id}</td><td style={{ textTransform: "capitalize" }}>{row.action?.replace(/_/g, " ")}</td><td>{row.entity_type}</td><td className="text-muted" style={{ fontSize: 12 }}>{row.details ? JSON.stringify(row.details).slice(0, 80) : "\u2014"}</td></tr>
                          ))}
                        </tbody></table></div>
                      )}
                      <div style={{ padding: "8px 16px", fontSize: 12, color: "var(--text-muted)" }}>Showing {Math.min(50, auditLog.rows?.length || 0)} of {auditLog.total || 0} entries</div>
                    </div>
                  ) : null}

                  {/* ===== SCHEDULED REPORTS ===== */}
                  {adminSubTab === "scheduled-reports" ? (
                    <div className="card">
                      <EngNotes tabKey="admin/scheduled-reports" />
                      <div className="card-header"><h2><FileText /> Scheduled Reports</h2></div>
                      <div className="form-stack" style={{ padding: "0 16px 16px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
                          <div className="form-group" style={{ margin: 0 }}><label>Report Type</label><select value={reportForm.report_type} onChange={(e) => setReportForm({ ...reportForm, report_type: e.target.value })}><option value="completion_summary">Completion Summary</option><option value="compliance_gaps">Compliance Gaps</option><option value="overdue_enrollments">Overdue Enrollments</option><option value="team_progress">Team Progress</option></select></div>
                          <div className="form-group" style={{ margin: 0 }}><label>Frequency</label><select value={reportForm.frequency} onChange={(e) => setReportForm({ ...reportForm, frequency: e.target.value })}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div>
                          <div className="form-group" style={{ margin: 0 }}><label>Recipients</label><input placeholder="email@company.com" value={reportForm.recipients} onChange={(e) => setReportForm({ ...reportForm, recipients: e.target.value })} /></div>
                          <button className="btn-primary" onClick={async () => { try { await createScheduledReport(token, reportForm); await loadScheduledReports(); showToast("Report scheduled", "success"); } catch (e) { setError(e.message); } }}><Plus size={13} /> Schedule</button>
                        </div>
                      </div>
                      {scheduledReports.length === 0 ? <div className="empty-state" style={{ padding: 32 }}><FileText size={32} /><div className="empty-title">No scheduled reports</div></div> : (
                        <div className="table-wrap"><table><thead><tr><th>Type</th><th>Frequency</th><th>Recipients</th><th>Active</th><th>Actions</th></tr></thead><tbody>
                          {scheduledReports.map((sr) => (
                            <tr key={sr.id}><td style={{ textTransform: "capitalize" }}>{sr.report_type?.replace(/_/g, " ")}</td><td>{sr.frequency}</td><td>{sr.recipients}</td><td>{sr.active ? <span className="status completed">Active</span> : <span className="status">Paused</span>}</td>
                              <td><button className="btn-sm" style={{ color: "var(--red-600)" }} onClick={async () => { await deleteScheduledReport(token, sr.id); await loadScheduledReports(); showToast("Deleted", "success"); }}>Delete</button></td>
                            </tr>
                          ))}
                        </tbody></table></div>
                      )}
                    </div>
                  ) : null}

                  {/* ===== MIGRATION WIZARD (E6) ===== */}
                  {adminSubTab === "migration" ? (
                    <div className="card">
                      <EngNotes tabKey="admin/migration" />
                      <div className="card-header"><h2><Package /> LMS Migration Wizard</h2></div>
                      <div style={{ padding: "0 16px 16px" }}>
                        <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                          {["Upload SCORM", "Validate History", "Execute Migration"].map((label, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ width: 28, height: 28, borderRadius: "50%", background: migrationStep >= i ? "var(--blue-600)" : "var(--border)", color: migrationStep >= i ? "#fff" : "var(--text-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>{i + 1}</span>
                              <span style={{ fontSize: 14, fontWeight: migrationStep === i ? 600 : 400, color: migrationStep === i ? "var(--text-primary)" : "var(--text-muted)" }}>{label}</span>
                              {i < 2 ? <ChevronRight size={14} style={{ color: "var(--text-muted)" }} /> : null}
                            </div>
                          ))}
                        </div>
                        {migrationStep === 0 ? (
                          <div style={{ textAlign: "center", padding: "32px 0" }}>
                            <Upload size={32} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
                            <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 400, margin: "0 auto 16px" }}>Upload SCORM packages from your previous LMS. These will be added to your course library.</p>
                            <button className="btn-primary" onClick={() => setMigrationStep(1)}>Next: Validate History</button>
                          </div>
                        ) : migrationStep === 1 ? (
                          <div style={{ textAlign: "center", padding: "32px 0" }}>
                            <FileText size={32} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
                            <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 400, margin: "0 auto 16px" }}>Upload a CSV of completion history from your previous LMS. We'll validate the data before importing.</p>
                            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                              <button className="btn-sm" onClick={() => setMigrationStep(0)}>Back</button>
                              <button className="btn-primary" onClick={async () => { try { const result = await validateMigrationHistory(token, [{ email: "demo@test.com", course_name: "Sample", completed_at: "2024-01-15" }]); setMigrationValidation(result); setMigrationStep(2); } catch (e) { setError(e.message); } }}>Validate Sample Data</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ textAlign: "center", padding: "32px 0" }}>
                            {migrationResult ? (
                              <><CheckCircle2 size={32} style={{ color: "var(--green-600)", marginBottom: 8 }} /><h3>Migration Complete</h3><p className="text-muted" style={{ fontSize: 13 }}>Status: {migrationResult.status}</p></>
                            ) : (
                              <>
                                <Package size={32} style={{ color: "var(--blue-600)", marginBottom: 8 }} />
                                <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Ready to execute migration. {migrationValidation?.valid_count || 0} valid records.</p>
                                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
                                  <button className="btn-sm" onClick={() => setMigrationStep(1)}>Back</button>
                                  <button className="btn-primary" onClick={async () => { try { const result = await executeMigration(token, { source_lms: "Grace Hill", courses_count: 0, history_count: migrationValidation?.valid_count || 0 }); setMigrationResult(result); showToast("Migration executed", "success"); } catch (e) { setError(e.message); } }}>Execute Migration</button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                </>
              ) : null}

              {/* ===== ENTRATA WORKFLOWS (DAP 1.5 - Simulated Entrata Pages) ===== */}
              {!showLoading && !showEmpty && !showError && trainingTab === "workflows" ? (
                <>
                  <EngNotes tabKey="admin/digital-adoption" />
                  {!activeWorkflow ? (
                    <div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                        {[
                          { key: "maintenance.work-order.create", label: "Work Orders", icon: <Wrench size={24} />, desc: "Create and manage maintenance work orders", color: "#f59e0b" },
                          { key: "leasing.move-in", label: "Move-In Processing", icon: <Home size={24} />, desc: "Process resident move-ins and unit turnover", color: "#10b981" },
                          { key: "accounting.late-fees", label: "Late Fee Config", icon: <AlertTriangle size={24} />, desc: "Configure late fee schedules and rules", color: "#ef4444" },
                          { key: "leasing.lease-renewal", label: "Lease Renewals", icon: <RefreshCw size={24} />, desc: "Process lease renewal offers and negotiations", color: "#8b5cf6" },
                          { key: "compliance.fair-housing", label: "Fair Housing", icon: <Shield size={24} />, desc: "Fair Housing regulated workflows", color: "#3b82f6" },
                          { key: "portal.resident-config", label: "Resident Portal", icon: <Globe size={24} />, desc: "Configure resident portal features", color: "#06b6d4" },
                        ].map(wf => (
                          <div key={wf.key} className="card" style={{ cursor: "pointer", transition: "transform 0.15s", padding: 24, textAlign: "center" }}
                            onClick={() => enterWorkflow(wf.key)}
                            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                            onMouseLeave={e => e.currentTarget.style.transform = "none"}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: wf.color + "20", color: wf.color, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>{wf.icon}</div>
                            <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>{wf.label}</h3>
                            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{wf.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <button className="btn-sm" style={{ marginBottom: 12 }} onClick={() => { setActiveWorkflow(null); setDapGateResult(null); setDapActiveWalkthrough(null); setDapShowGateOverlay(false); }}><ArrowLeft size={12} /> Back to Workflows</button>
                      <div className="card" style={{ position: "relative", minHeight: 500 }}>
                        <div className="card-header"><h2>{activeWorkflow === "maintenance.work-order.create" ? "Create Work Order" : activeWorkflow === "leasing.move-in" ? "Process Move-In" : activeWorkflow === "accounting.late-fees" ? "Configure Late Fees" : activeWorkflow === "leasing.lease-renewal" ? "Lease Renewal" : activeWorkflow === "compliance.fair-housing" ? "Fair Housing" : "Resident Portal"}</h2></div>

                        {/* Simulated form fields */}
                        <div style={{ padding: 16, opacity: dapShowGateOverlay ? 0.15 : 1, filter: dapShowGateOverlay ? "blur(2px)" : "none", transition: "all 0.3s", pointerEvents: dapShowGateOverlay ? "none" : "auto" }}>
                          {activeWorkflow === "maintenance.work-order.create" ? (
                            <div className="form-stack">
                              <div className="form-group"><label>Category</label><select id="wo-category-select"><option>Plumbing</option><option>HVAC</option><option>Electrical</option><option>Appliance</option><option>General</option></select></div>
                              <div className="form-group" style={{ position: "relative" }}><label>Priority</label><select id="wo-priority-field"><option>Routine</option><option>Urgent</option><option>Emergency</option></select>{dapGateResult?.tips?.find(t => t.target_selector === "#wo-priority-field") ? <span className="dap-beacon" title={dapGateResult.tips.find(t => t.target_selector === "#wo-priority-field").title} onClick={() => { const tip = dapGateResult.tips.find(t => t.target_selector === "#wo-priority-field"); alert(`${tip.title}\n\n${tip.body}`); dapLogEvent(token, { event_type: "smart_tip_clicked", workflow_key: activeWorkflow, metadata: { tip_id: tip.id } }); }} /> : null}</div>
                              <div className="form-group"><label>Description</label><textarea id="wo-description-field" rows={3} placeholder="Describe the maintenance issue..." /></div>
                              <div className="form-group"><label>Assign Technician</label><select id="wo-assign-tech"><option>Riley Maintenance</option><option>Drew Campbell</option><option>Alex Torres</option></select></div>
                              <button id="wo-submit-btn" className="btn-primary">Submit Work Order</button>
                            </div>
                          ) : activeWorkflow === "leasing.move-in" ? (
                            <div className="form-stack">
                              <div className="form-group"><label>Resident</label><input id="mi-resident-select" placeholder="Search by name or unit..." /></div>
                              <div className="form-group" style={{ position: "relative" }}><label>Move-In Charges</label><div id="mi-charges-panel" style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span>Security Deposit</span><span>$1,500</span></div><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span>First Month Rent</span><span>$2,200</span></div><div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderTop: "1px solid var(--border)", paddingTop: 4 }}><span>Total Due</span><span>$3,700</span></div></div>{dapGateResult?.tips?.find(t => t.target_selector === "#mi-charges-panel") ? <span className="dap-beacon" title={dapGateResult.tips.find(t => t.target_selector === "#mi-charges-panel").title} onClick={() => { const tip = dapGateResult.tips.find(t => t.target_selector === "#mi-charges-panel"); alert(`${tip.title}\n\n${tip.body}`); dapLogEvent(token, { event_type: "smart_tip_clicked", workflow_key: activeWorkflow, metadata: { tip_id: tip.id } }); }} /> : null}</div>
                              <div className="form-group"><label>Unit Inspection</label><button id="mi-inspection-btn" className="btn-sm">Complete Inspection</button></div>
                              <div className="form-group"><label>Keys Issued</label><input id="mi-key-tracking" placeholder="Key serial numbers..." /></div>
                              <button id="mi-complete-btn" className="btn-primary">Complete Move-In</button>
                            </div>
                          ) : activeWorkflow === "accounting.late-fees" ? (
                            <div className="form-stack">
                              <div className="form-group" style={{ position: "relative" }}><label>Grace Period (days)</label><input id="lf-grace-period" type="number" defaultValue={5} />{dapGateResult?.tips?.find(t => t.target_selector === "#lf-grace-period") ? <span className="dap-beacon" title={dapGateResult.tips.find(t => t.target_selector === "#lf-grace-period").title} onClick={() => { const tip = dapGateResult.tips.find(t => t.target_selector === "#lf-grace-period"); alert(`${tip.title}\n\n${tip.body}`); dapLogEvent(token, { event_type: "smart_tip_clicked", workflow_key: activeWorkflow, metadata: { tip_id: tip.id } }); }} /> : null}</div>
                              <div className="form-group"><label>Initial Late Fee ($)</label><input type="number" defaultValue={75} /></div>
                              <div className="form-group"><label>Daily Additional ($)</label><input type="number" defaultValue={10} /></div>
                              <div className="form-group"><label>Maximum Total ($)</label><input type="number" defaultValue={200} /></div>
                              <button className="btn-primary">Save Configuration</button>
                            </div>
                          ) : activeWorkflow === "leasing.lease-renewal" ? (
                            <div className="form-stack">
                              <div className="form-group"><label>Resident</label><input placeholder="Search resident..." /></div>
                              <div className="form-group"><label>Current Lease End</label><input type="date" /></div>
                              <div className="form-group"><label>Renewal Term (months)</label><select><option>12</option><option>6</option><option>Month-to-Month</option></select></div>
                              <div className="form-group" style={{ position: "relative" }}><label>Offer Letter</label><textarea id="lr-offer-letter" rows={3} placeholder="Draft renewal offer..." />{dapGateResult?.tips?.find(t => t.target_selector === "#lr-offer-letter") ? <span className="dap-beacon" title={dapGateResult.tips.find(t => t.target_selector === "#lr-offer-letter").title} onClick={() => { const tip = dapGateResult.tips.find(t => t.target_selector === "#lr-offer-letter"); alert(`${tip.title}\n\n${tip.body}`); dapLogEvent(token, { event_type: "smart_tip_clicked", workflow_key: activeWorkflow, metadata: { tip_id: tip.id } }); }} /> : null}</div>
                              <button className="btn-primary">Send Renewal Offer</button>
                            </div>
                          ) : (
                            <div className="form-stack">
                              <div className="form-group"><label>Configuration</label><select><option>Payment Settings</option><option>Communication Preferences</option><option>Amenity Access</option></select></div>
                              <div className="form-group"><label>Status</label><select><option>Active</option><option>Maintenance Mode</option></select></div>
                              <button className="btn-primary">Save Changes</button>
                            </div>
                          )}

                          {/* Grace period banners */}
                          {dapGateResult?.grace_banners?.map((gb, i) => (
                            <div key={i} className="dap-grace-banner" style={{ margin: "12px 0", padding: "10px 16px", background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                              <AlertTriangle size={16} style={{ color: "#d97706", flexShrink: 0 }} />
                              <span>You have <strong>{gb.days_left} days</strong> to complete <strong>{gb.target_title || gb.label}</strong> before this feature is locked.</span>
                              <button className="btn-sm" style={{ marginLeft: "auto" }} onClick={() => showToast("Training launched (simulated)", "info")}>Start Training</button>
                            </div>
                          ))}
                        </div>

                        {/* Gate Overlay */}
                        {dapShowGateOverlay && dapGateResult?.gates?.length > 0 ? (
                          <div className="dap-gate-overlay" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, background: "rgba(0,0,0,0.05)", borderRadius: 8 }}>
                            <div style={{ position: "relative", background: "#fff", borderRadius: 12, padding: 32, maxWidth: 480, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", textAlign: "center" }}>
                              <button onClick={() => { setDapShowGateOverlay(false); setDapSimulatedTrainingComplete(false); }} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 4, lineHeight: 1 }} title="Close"><X size={18} /></button>
                              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Lock size={28} /></div>
                              <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Training Required</h2>
                              <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 16px" }}>{dapGateResult.gates[0].block_message || "You must complete required training before accessing this workflow."}</p>
                              <div style={{ background: "var(--bg-muted, #f8f9fa)", borderRadius: 8, padding: 12, marginBottom: 16, textAlign: "left" }}>
                                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Required Training</div>
                                <div style={{ fontWeight: 600 }}>{dapGateResult.gates[0].target_title || "Training Course"}</div>
                                {dapGateResult.gates[0].pass_threshold ? <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Minimum score: {dapGateResult.gates[0].pass_threshold}%</div> : null}
                              </div>
                              {!dapSimulatedTrainingComplete ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                  <button className="btn-primary" style={{ width: "100%" }} onClick={() => { setDapSimulatedTrainingComplete(true); showToast("Training completed (simulated) -- score: 92%", "success"); }}>
                                    <Play size={14} /> Start Training
                                  </button>
                                  <button className="btn-sm" style={{ width: "100%", background: "transparent", border: "1px solid var(--border)" }} onClick={() => {
                                    const reason = prompt("Reason for exception request:");
                                    if (reason) { dapRequestException(token, dapGateResult.gates[0].id, reason).then(() => showToast("Exception request submitted", "info")).catch(e => setError(e.message)); }
                                  }}>Request Exception</button>
                                </div>
                              ) : (
                                <button className="btn-primary" style={{ width: "100%", background: "#16a34a" }} onClick={async () => {
                                  try {
                                    await dapCompleteGate(token, dapGateResult.gates[0].id, { score: 92 });
                                    setDapShowGateOverlay(false);
                                    setDapSimulatedTrainingComplete(false);
                                    showToast("Gate cleared! Workflow unlocked.", "success");
                                    await dapLogEvent(token, { event_type: "gate_cleared", workflow_key: activeWorkflow, trigger_id: dapGateResult.gates[0].id });
                                    const refreshed = await dapCheck(token, activeWorkflow);
                                    setDapGateResult(refreshed);
                                    if (refreshed.walkthroughs?.length) {
                                      const wt = refreshed.walkthroughs[0];
                                      const steps = await dapWalkthroughSteps(token, wt.id);
                                      setDapActiveWalkthrough(wt);
                                      setDapWalkthroughStepsList(steps);
                                      setDapWalkthroughStep(0);
                                      await dapLogEvent(token, { event_type: "walkthrough_started", workflow_key: activeWorkflow, metadata: { walkthrough_id: wt.id } });
                                    }
                                  } catch (e) { setError(e.message); }
                                }}>
                                  <Unlock size={14} /> Unlock Workflow
                                </button>
                              )}
                            </div>
                          </div>
                        ) : null}

                        {/* Walkthrough Player */}
                        {dapActiveWalkthrough && dapWalkthroughStepsList.length > 0 && !dapShowGateOverlay ? (
                          <div className="dap-walkthrough" style={{ position: "absolute", bottom: 16, left: 16, right: 16, zIndex: 90 }}>
                            <div style={{ background: "#1e40af", color: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                <span style={{ fontSize: 11, opacity: 0.8 }}>{dapActiveWalkthrough.title} -- Step {dapWalkthroughStep + 1} of {dapWalkthroughStepsList.length}</span>
                                <button style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", opacity: 0.7 }} onClick={async () => { await dapDismissWalkthrough(token, dapActiveWalkthrough.id); setDapActiveWalkthrough(null); setDapWalkthroughStepsList([]); showToast("Walkthrough dismissed", "info"); }}><X size={16} /></button>
                              </div>
                              <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>{dapWalkthroughStepsList[dapWalkthroughStep]?.title}</h3>
                              <p style={{ margin: "0 0 16px", fontSize: 13, opacity: 0.9, lineHeight: 1.5 }}>{dapWalkthroughStepsList[dapWalkthroughStep]?.body}</p>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", gap: 4 }}>
                                  {dapWalkthroughStepsList.map((_, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i === dapWalkthroughStep ? "#fff" : "rgba(255,255,255,0.3)" }} />)}
                                </div>
                                <div style={{ display: "flex", gap: 8 }}>
                                  {dapWalkthroughStep > 0 ? <button style={{ padding: "6px 16px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "#fff", cursor: "pointer", fontSize: 13 }} onClick={() => setDapWalkthroughStep(s => s - 1)}>Back</button> : null}
                                  {dapWalkthroughStep < dapWalkthroughStepsList.length - 1 ? (
                                    <button style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: "#fff", color: "#1e40af", cursor: "pointer", fontWeight: 600, fontSize: 13 }} onClick={() => setDapWalkthroughStep(s => s + 1)}>Next</button>
                                  ) : (
                                    <button style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: "#10b981", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13 }} onClick={async () => { await dapCompleteWalkthrough(token, dapActiveWalkthrough.id); setDapActiveWalkthrough(null); setDapWalkthroughStepsList([]); showToast("Walkthrough completed!", "success"); }}>Complete</button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </>
              ) : null}

              {/* ===== COMMAND CENTER (DAP-gated OXP page) ===== */}
              {trainingTab === "command-center" ? (
                <div style={{ position: "relative", minHeight: 600, margin: "-24px -24px 0", padding: 0 }}>
                  <div style={{ opacity: dapShowGateOverlay ? 0.12 : 1, filter: dapShowGateOverlay ? "blur(3px)" : "none", transition: "all 0.3s", pointerEvents: dapShowGateOverlay ? "none" : "auto" }}>
                    {/* Dark header -- distinct OXP Command Center look */}
                    <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", padding: "28px 32px 20px", color: "#fff" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}><LayoutDashboard size={16} /></div>
                        <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>OXP Studio</span>
                      </div>
                      <h2 style={{ margin: "8px 0 4px", fontSize: 22, fontWeight: 700, color: "#fff" }}>Command Center</h2>
                      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, maxWidth: 600 }}>Orchestrate AI agents and your workforce. See what needs doing and how the operation is performing.</p>
                    </div>

                    {/* Content area with subtle gray background */}
                    <div style={{ background: "#f8fafc", padding: "24px 32px 32px" }}>
                      {/* Value banner */}
                      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "16px 20px", marginBottom: 24 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: "#92400e" }}>You're missing value -- here's where to focus</div>
                        <p style={{ fontSize: 13, color: "#78350f", margin: "0 0 10px" }}>Similar properties see significantly better outcomes with AI agents. Entrata has 100+ agents ready to deploy across your portfolio.</p>
                        <ul style={{ fontSize: 13, color: "#78350f", margin: "0 0 12px", paddingLeft: 18 }}>
                          <li><b>ELI+ Agents</b> -- Over 60+ workflows end-to-end: leasing, renewals, maintenance & payments.</li>
                          <li><b>Operational & Efficiency Agents</b> -- Automate hundreds of day-to-day workflows and reduce manual effort.</li>
                          <li><b>ELI Essentials</b> -- On-demand AI assistance: analyze, resolve, draft, summarize & collaborate.</li>
                        </ul>
                        <button className="btn-primary" style={{ background: "#1a1d23", fontSize: 13 }}>Review & Configure All Agents</button>
                      </div>

                      {/* Recommended Agents */}
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Recommended Agents</div>
                        <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 12px" }}>These agents are recommended for your portfolio. Activate them to start capturing value.</p>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>ELI+ (Automation Agents)</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
                          {[
                            { title: "Leasing AI", desc: "Engages leads 24/7, books tours, answers questions and guides prospects through the application process.", icon: <FileText size={20} />, active: true, category: "Tours Scheduled & Leases Signed" },
                            { title: "Renewals AI", desc: "Proactively reaches out to expiring leases with personalized renewal offers.", icon: <RefreshCw size={20} />, active: true, category: "Renewals Committed" },
                            { title: "Maintenance AI", desc: "Handles common requests, inspections, dispatches vendors, and triages to maintenance techs.", icon: <Wrench size={20} />, active: true, category: "Work Orders Closed" },
                            { title: "Payments AI", desc: "Sends payment reminders, processes payment plans, and handles collections.", icon: <BarChart3 size={20} />, active: true, category: "Rent Collected" },
                          ].map(agent => (
                            <div key={agent.title} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                                <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{agent.category}</div>
                                {agent.active ? <span style={{ fontSize: 10, fontWeight: 600, background: "#dcfce7", color: "#16a34a", padding: "2px 8px", borderRadius: 10 }}>Active</span> : null}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                <div style={{ color: "#475569" }}>{agent.icon}</div>
                                <h4 style={{ margin: 0, fontSize: 14, color: "#1e293b" }}>{agent.title}</h4>
                              </div>
                              <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 8px", lineHeight: 1.4 }}>{agent.desc}</p>
                              <button style={{ fontSize: 12, color: "#2563eb", background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 500 }}>See agent &rarr;</button>
                            </div>
                          ))}
                        </div>

                        <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Operational Agents</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                          {[
                            { title: "Approve Applications", desc: "AI reviews and scores applications -- verifying eligibility, screening for red flags, and recommending decisions.", icon: <CheckCircle2 size={20} />, active: true, category: "Application Approvals" },
                            { title: "Renewal Offer Creation", desc: "Generates renewal offers based on market rent, lease trends, and portfolio strategy.", icon: <FileText size={20} />, active: false, category: "Renewal Offers" },
                            { title: "MTM Rent Increases", desc: "Evaluates month-to-month leases and sets rent based on config, comps, and vacancy.", icon: <TrendingUp size={20} />, active: false, category: "Rent Increases" },
                            { title: "Move-in Readiness", desc: "Automates move-in readiness checks -- verifying eligibility, lease completion, and inspections.", icon: <Home size={20} />, active: false, category: "Move-In Readiness" },
                          ].map(agent => (
                            <div key={agent.title} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                                <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{agent.category}</div>
                                {agent.active ? <span style={{ fontSize: 10, fontWeight: 600, background: "#dcfce7", color: "#16a34a", padding: "2px 8px", borderRadius: 10 }}>Active</span> : null}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                <div style={{ color: "#475569" }}>{agent.icon}</div>
                                <h4 style={{ margin: 0, fontSize: 14, color: "#1e293b" }}>{agent.title}</h4>
                              </div>
                              <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 10px", lineHeight: 1.4 }}>{agent.desc}</p>
                              <button style={{ width: "100%", fontSize: 12, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 500, background: agent.active ? "transparent" : "#16a34a", color: agent.active ? "#475569" : "#fff", border: agent.active ? "1px solid #e2e8f0" : "none" }}>{agent.active ? "See Agent" : "Activate Agent"} &rarr;</button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ textAlign: "center", marginBottom: 24 }}>
                        <button className="btn-primary" style={{ background: "#16a34a", fontSize: 13, padding: "10px 24px" }}>Explore 100+ Agents</button>
                      </div>

                      {/* Needs Attention */}
                      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          <h3 style={{ margin: 0, fontSize: 15, color: "#1e293b" }}>Needs Attention</h3>
                          <span style={{ fontSize: 11, background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: 10 }}>1 open</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid #f1f5f9" }}>
                          <AlertCircle size={16} style={{ color: "#d97706", flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>SOP Document Approval</div>
                            <div style={{ fontSize: 12, color: "#94a3b8" }}>Compliance workflow that needs review and sign-off from your staff.</div>
                          </div>
                          <button style={{ marginLeft: "auto", fontSize: 12, color: "#2563eb", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>View All &rarr;</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gate Overlay for Command Center */}
                  {dapShowGateOverlay && dapGateResult?.gates?.length > 0 ? (
                    <div className="dap-gate-overlay" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, background: "rgba(15,23,42,0.5)" }}>
                      <div style={{ position: "relative", background: "#fff", borderRadius: 12, padding: 32, maxWidth: 480, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", textAlign: "center" }}>
                        <button onClick={() => { setDapShowGateOverlay(false); setDapSimulatedTrainingComplete(false); }} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 4, lineHeight: 1 }} title="Close"><X size={18} /></button>
                        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Lock size={28} /></div>
                        <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Training Required</h2>
                        <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 16px" }}>{dapGateResult.gates[0].block_message || "You must complete required training before accessing the Command Center."}</p>
                        <div style={{ background: "var(--bg-muted, #f8f9fa)", borderRadius: 8, padding: 12, marginBottom: 16, textAlign: "left" }}>
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Required Training</div>
                          <div style={{ fontWeight: 600 }}>{dapGateResult.gates[0].target_title || "OXP Fundamentals"}</div>
                          {dapGateResult.gates[0].pass_threshold ? <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Minimum score: {dapGateResult.gates[0].pass_threshold}%</div> : null}
                        </div>
                        {!dapSimulatedTrainingComplete ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <button className="btn-primary" style={{ width: "100%" }} onClick={() => { setDapSimulatedTrainingComplete(true); showToast("Training completed (simulated) -- score: 92%", "success"); }}>
                              <Play size={14} /> Start Training
                            </button>
                            <button className="btn-sm" style={{ width: "100%", background: "transparent", border: "1px solid var(--border)" }} onClick={() => {
                              const reason = prompt("Reason for exception request:");
                              if (reason) { dapRequestException(token, dapGateResult.gates[0].id, reason).then(() => showToast("Exception request submitted", "info")).catch(e => setError(e.message)); }
                            }}>Request Exception</button>
                          </div>
                        ) : (
                          <button className="btn-primary" style={{ width: "100%", background: "#16a34a" }} onClick={async () => {
                            try {
                              await dapCompleteGate(token, dapGateResult.gates[0].id, { score: 92 });
                              setDapShowGateOverlay(false);
                              setDapSimulatedTrainingComplete(false);
                              showToast("Gate cleared! Command Center unlocked.", "success");
                              await dapLogEvent(token, { event_type: "gate_cleared", workflow_key: activeWorkflow, trigger_id: dapGateResult.gates[0].id });
                              const refreshed = await dapCheck(token, activeWorkflow);
                              setDapGateResult(refreshed);
                            } catch (e) { setError(e.message); }
                          }}>
                            <Unlock size={14} /> Unlock Command Center
                          </button>
                        )}
                      </div>
                    </div>
                  ) : null}
                  {/* Demo-only: Reset Gate button */}
                  {!dapShowGateOverlay && activeWorkflow === "oxp.command-center" ? (
                    <button onClick={async () => {
                      try {
                        await dapResetByWorkflow(token, "oxp.command-center");
                        setDapSimulatedTrainingComplete(false);
                        const refreshed = await dapCheck(token, "oxp.command-center");
                        setDapGateResult(refreshed);
                        if (refreshed.gates?.length > 0) setDapShowGateOverlay(true);
                        showToast("Gate reset -- re-locked for demo", "info");
                      } catch (e) { showToast("Reset failed: " + e.message, "error"); }
                    }} style={{ position: "absolute", bottom: 16, right: 16, zIndex: 50, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                      <RotateCcw size={13} /> Reset Gate (Demo)
                    </button>
                  ) : null}
                </div>
              ) : null}

            </>
          ) : null}
        </div>
      </main>

      {/* WORKFLOW PLAYER MODAL */}
      {workflowCourse ? (
        <WorkflowPlayer
          course={workflowCourse}
          apiBase={API_BASE}
          onClose={() => setWorkflowCourse(null)}
          onComplete={async () => {
            if (workflowCourse._enrollmentId) {
              try {
                await apiRequest(`/api/scorm/${workflowCourse._enrollmentId}/finish`, { method: "POST", body: JSON.stringify({ score: 95, completionStatus: "completed", timeSpentSeconds: workflowCourse.duration_minutes * 60 }) }, token);
                showToast("Course completed!", "success");
                await boot();
              } catch (e) { setError(e.message); }
            }
            setWorkflowCourse(null);
          }}
        />
      ) : null}

      {tourActive && user ? (
        <div
          className={`tour-overlay tour-backdrop tour-overlay--${tourSteps[tourStep]?.position || "center"}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-step-title"
        >
          <div className={`tour-panel tour-tooltip tour-tooltip--${tourSteps[tourStep]?.position || "center"}`}>
            <div className="tour-panel-top">
              <span className="tour-badge">Onboarding</span>
              <span className="tour-meta">{TOUR_PROFILE_LABELS[getTourProfile(user.role)]} &middot; Step {tourStep + 1} of {tourSteps.length}</span>
              <button type="button" className="tour-close" aria-label="Close guide" onClick={() => dismissTour(true)}><X size={16} /></button>
            </div>
            <h3 id="tour-step-title" className="tour-title">{tourSteps[tourStep]?.title}</h3>
            <p className="tour-body">{tourSteps[tourStep]?.description}</p>
            {tourSteps[tourStep]?.hint ? <p className="tour-hint">{tourSteps[tourStep].hint}</p> : null}
            <div className="tour-dots" role="tablist" aria-label="Guide steps">
              {tourSteps.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === tourStep}
                  className={`tour-dot ${i === tourStep ? "active" : ""}`}
                  aria-label={`Step ${i + 1}`}
                  onClick={() => setTourStep(i)}
                />
              ))}
            </div>
            <div className="tour-actions">
              <button type="button" className="btn-sm tour-skip" onClick={() => dismissTour(true)}>Skip</button>
              <div className="tour-nav-btns">
                <button type="button" className="btn-sm" disabled={tourStep <= 0} onClick={() => setTourStep((s) => Math.max(0, s - 1))}>Back</button>
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={() => {
                    if (tourStep >= tourSteps.length - 1) dismissTour(true);
                    else setTourStep((s) => s + 1);
                  }}
                >
                  {tourStep >= tourSteps.length - 1 ? "Done" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* POLICY ACKNOWLEDGMENT MODAL */}
      {ackModal ? (
        <div className="player-overlay" onClick={() => { setAckModal(null); setAckChecked(false); }}>
          <div className="player-modal" style={{ maxWidth: ackModal.file_type === "pdf" ? 900 : 700, maxHeight: "90vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
            <div className="player-header">
              <div>
                <h2 style={{ margin: 0 }}>{ackModal.title}</h2>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {ackModal.category} &middot; Version {ackModal.version} &middot; Effective {fD(ackModal.effective_date)}
                  {ackModal.file_original_name ? <> &middot; <FileText size={11} style={{ verticalAlign: "-2px" }} /> {ackModal.file_original_name}</> : null}
                </div>
              </div>
              <button aria-label="Close" onClick={() => { setAckModal(null); setAckChecked(false); }}><X size={13} /></button>
            </div>
            <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
              {ackModal.file_path && ackModal.file_type === "pdf" ? (
                <iframe
                  src={`${API_BASE}/policy-files/${ackModal.file_path}`}
                  style={{ width: "100%", height: "100%", minHeight: 500, border: "none" }}
                  title={`Policy: ${ackModal.title}`}
                />
              ) : ackModal.file_path && ackModal.file_type === "docx" ? (
                <div style={{ padding: "40px 28px", textAlign: "center" }}>
                  <FileText size={48} style={{ color: "var(--primary)", marginBottom: 12 }} />
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{ackModal.file_original_name || "Policy Document"}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>This policy is a Word document. Download it to read the full content before acknowledging.</div>
                  <a href={`${API_BASE}/policy-files/${ackModal.file_path}`} download={ackModal.file_original_name} className="btn-primary btn-sm" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Download size={13} /> Download {ackModal.file_original_name || "Document"}
                  </a>
                </div>
              ) : (
                <div style={{ padding: "24px 28px", fontSize: 14, lineHeight: 1.7 }}>
                  <div dangerouslySetInnerHTML={{ __html: ackModal.content_html || "<p>Policy content not available.</p>" }} />
                </div>
              )}
            </div>
            <div style={{ padding: "16px 28px", borderTop: "1px solid var(--border)", background: "var(--bg-muted, #f8f9fa)", flexShrink: 0 }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14, cursor: "pointer", marginBottom: 12 }}>
                <input type="checkbox" checked={ackChecked} onChange={(e) => setAckChecked(e.target.checked)} style={{ marginTop: 2 }} />
                <span>I have read and understand this policy. I agree to comply with all requirements outlined above.</span>
              </label>
              <div className="flex-row" style={{ justifyContent: "space-between" }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Signed electronically as: {user?.name} &middot; {new Date().toLocaleDateString()}</div>
                <button className="btn-primary" disabled={!ackChecked} onClick={() => handleAcknowledge(ackModal.id)}><CheckCircle2 size={13} /> Acknowledge Policy</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* CATALOG PREVIEW MODAL */}
      {catalogPreview ? (
        <div className="player-overlay" onClick={() => setCatalogPreview(null)}>
          <div className="catalog-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px 0" }}>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <span className={`source-badge ${catalogPreview.type}`} style={{ textTransform: "uppercase", fontSize: 10 }}>{catalogPreview.type === "scorm" ? "eLearning" : catalogPreview.type === "video" ? "Spotlight" : catalogPreview.type === "recorded_webinar" ? "Recorded Webinar" : catalogPreview.type === "live_webinar" ? "Live Webinar" : catalogPreview.type}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{catalogPreview.category}</span>
                  {catalogPreview.tier_required === "elite" ? <span className="source-badge elite" style={{ fontSize: 10 }}>Elite</span> : null}
                  {catalogPreview.entrata_product ? <span className="product-tag">{catalogPreview.entrata_product}</span> : null}
                  {catalogPreview.release_version ? <span className="release-pill" style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 10, background: "#ecfeff", color: "#0e7490", border: "1px solid #a5f3fc" }}>Training for Release {catalogPreview.release_version}</span> : null}
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{catalogPreview.title}</h2>
              </div>
              <button aria-label="Close" onClick={() => setCatalogPreview(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><X size={16} /></button>
            </div>
            <div style={{ padding: "16px 24px" }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                <div className="flex-row" style={{ gap: 4 }}><Clock size={13} /> <span style={{ fontSize: 13 }}>{catalogPreview.duration_minutes} min</span></div>
                <div className="flex-row" style={{ gap: 4 }}><Stars rating={Number(catalogPreview.average_rating || 0)} /><span className="text-muted text-sm">({catalogPreview.rating_count || 0} ratings)</span></div>
                {catalogPreview.source === "custom" ? <span className="source-badge custom">Custom</span> : null}
              </div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 20 }}>{catalogPreview.description || "No description available for this course."}</div>
              {catalogPreview.recommended_roles?.length > 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
                  <strong>Recommended for:</strong> {catalogPreview.recommended_roles.join(", ")}
                </div>
              ) : null}
              <div className="course-reviews-section" style={{ marginTop: 12, paddingTop: 16, borderTop: "1px solid var(--border-light, #e5e7eb)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Learner Reviews</div>
                  <div className="text-muted text-sm">
                    {catalogReviews.items.length > 0
                      ? `${catalogReviews.items.length} review${catalogReviews.items.length === 1 ? "" : "s"}`
                      : catalogReviews.loading ? "Loading..." : "No reviews yet"}
                  </div>
                </div>
                {catalogReviews.items.slice(0, 5).map((r) => (
                  <div key={r.id} style={{ padding: "10px 0", borderTop: "1px dashed var(--border-light, #e5e7eb)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Stars rating={Number(r.rating || 0)} />
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{r.user_name}</div>
                      <div className="text-muted text-sm">{r.user_role}</div>
                      <div className="text-muted text-sm" style={{ marginLeft: "auto" }}>{new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                    {r.review_text ? <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{r.review_text}</div> : null}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: "0 24px 20px", display: "flex", gap: 12, justifyContent: "flex-end", borderTop: "1px solid var(--border-light, #e5e7eb)", paddingTop: 16 }}>
              <button className="btn-sm" onClick={() => setCatalogPreview(null)}>Cancel</button>
              <button className="btn-primary" onClick={() => launchFromCatalog(catalogPreview)}><Play size={13} /> Enroll & Start</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* PWA INSTALL BANNER */}
      {installEvent && !installBannerDismissed ? (
        <div style={{ position: "fixed", bottom: 16, left: 16, right: 16, maxWidth: 440, marginInline: "auto", zIndex: 60, background: "#0f172a", color: "#fff", borderRadius: 12, padding: "12px 14px", boxShadow: "0 12px 32px rgba(15,23,42,0.35)", display: "flex", alignItems: "center", gap: 12 }}>
          <GraduationCap size={18} />
          <div style={{ fontSize: 13, lineHeight: 1.4, flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Install Academy</div>
            <div style={{ opacity: 0.8 }}>Launch training from your home screen, even offline.</div>
          </div>
          <button onClick={triggerInstall} className="btn-primary btn-sm">Install</button>
          <button onClick={dismissInstallBanner} aria-label="Dismiss" style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: 4 }}><X size={14} /></button>
        </div>
      ) : null}

      {/* NOTIFICATION DRAWER */}
      {notifDrawerOpen ? (
        <div className="player-overlay" onClick={() => setNotifDrawerOpen(false)} style={{ background: "rgba(15, 23, 42, 0.32)" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ position: "absolute", top: 0, right: 0, width: 380, maxWidth: "94vw", height: "100vh", background: "#fff", boxShadow: "-8px 0 24px rgba(15,23,42,0.12)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <Bell size={15} /> Notifications
              </div>
              <button aria-label="Close" onClick={() => setNotifDrawerOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={16} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
              {notifications.items.length === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  You're all caught up.
                </div>
              ) : notifications.items.map((n) => (
                <div key={n.id} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-light, #e5e7eb)", background: n.read_at ? "#fff" : "#f0f9ff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{n.title}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(n.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                  </div>
                  {n.body ? <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{n.body}</div> : null}
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{n.kind}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* CERTIFICATE COMPLETION MODAL */}
      {completionCert ? (
        <div className="player-overlay" onClick={() => setCompletionCert(null)}>
          <div className="catalog-detail-modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center", maxWidth: 480 }}>
            <div style={{ padding: "32px 24px 0" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--green-50, #f0fdf4)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Award size={32} style={{ color: "var(--green-600, #16a34a)" }} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Congratulations!</h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 4px" }}>You completed</p>
              <p style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px" }}>{completionCert.course_title}</p>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                Certificate #{completionCert.certificate_number} &middot; Issued {new Date(completionCert.issued_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
            <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border-light, #e5e7eb)", marginTop: 12 }}>
              {completionReview.submitted ? (
                <div style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center" }}>Thanks, your review was saved.</div>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, textAlign: "center" }}>Rate this course</div>
                  <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 10 }}>
                    {[1,2,3,4,5].map((n) => (
                      <button key={n} type="button" onClick={() => setCompletionReview((o) => ({ ...o, rating: n }))}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
                        aria-label={`Rate ${n} star${n === 1 ? "" : "s"}`}>
                        <Star size={22} fill={n <= completionReview.rating ? "#f59e0b" : "none"} style={{ color: n <= completionReview.rating ? "#f59e0b" : "#cbd5e1" }} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={completionReview.comment}
                    onChange={(e) => setCompletionReview((o) => ({ ...o, comment: e.target.value }))}
                    placeholder="What was most valuable? (optional)"
                    rows={2}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, fontFamily: "inherit", resize: "vertical" }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                    <button className="btn-sm" disabled={!completionReview.rating || completionReview.submitting} onClick={submitCompletionReview}>
                      {completionReview.submitting ? "Saving..." : "Submit review"}
                    </button>
                  </div>
                </>
              )}
            </div>
            <div style={{ padding: "16px 24px 24px", display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn-sm" onClick={() => setCompletionCert(null)}>Close</button>
              <button className="btn-primary" onClick={() => { window.open(`${API_BASE}/api/certificates/${completionCert.id}/download`, "_blank"); }}><Download size={13} /> View Certificate</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* COURSE PLAYER MODAL */}
      {launch.enrollmentId ? (
        <div className="player-overlay" onClick={closePlayer}>
          <div className="player-modal" onClick={(e) => e.stopPropagation()}>
            <div className="player-header">
              <div style={{ minWidth: 0 }}>
                <h2 style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{launch.title}</h2>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Section {playerSlide + 1} of {playerContent.length}</div>
              </div>
              <div className="flex-row">
                <button aria-label="Close" onClick={closePlayer}><X size={13} /></button>
              </div>
            </div>

            <div className="player-progress">
              <div className="player-progress-fill" style={{ width: `${((playerSlide + 1) / playerContent.length) * 100}%` }} />
            </div>

            {launch.type === "scorm" ? (
              <div className="player-scorm-shell" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                <iframe
                  title={launch.title}
                  src={`${API_BASE}/api/scorm/${launch.enrollmentId}/player?token=${encodeURIComponent(token)}`}
                  className="player-frame"
                  style={{ flex: 1, width: "100%", border: 0, minHeight: 480 }}
                />
                <div className="player-slide-actions" style={{ padding: "12px 16px", borderTop: "1px solid var(--border, #e5e7eb)", display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn-primary" onClick={markComplete}><Award size={13} /> Mark complete &amp; get certificate</button>
                </div>
              </div>
            ) : (
            <div className="player-sidebar-layout">
              <div className="player-nav">
                {playerContent.map((s, i) => (
                  <button key={i} className={`player-nav-item ${i === playerSlide ? "active" : ""} ${i < playerSlide ? "done" : ""}`} onClick={() => setPlayerSlide(i)}>
                    <span className="player-nav-num">{i < playerSlide ? <CheckCircle2 size={12} /> : i + 1}</span>
                    <span className="player-nav-label">{s.title}</span>
                    {s.type === "quiz" ? <span className="player-nav-badge">Quiz</span> : null}
                  </button>
                ))}
              </div>
              <div className="player-content">
                <div className="player-slide-type">{playerContent[playerSlide]?.type === "quiz" ? <><ClipboardCheck size={14} /> Knowledge Check</> : <><BookOpen size={14} /> Lesson</>}</div>
                <h3 className="player-slide-title">{playerContent[playerSlide]?.title}</h3>
                <div className="player-slide-body">{playerContent[playerSlide]?.body.split("\n").map((line, i) => <p key={i}>{line}</p>)}</div>
                {playerContent[playerSlide]?.type === "quiz" && courseQuiz ? (
                  <div style={{ marginTop: 16, padding: 12, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}><ClipboardCheck size={13} style={{ verticalAlign: -2, marginRight: 6 }} />{courseQuiz.title}</div>
                    <div style={{ fontSize: 12, color: "#475569" }}>
                      {courseQuiz.question_count} question{courseQuiz.question_count === 1 ? "" : "s"} · passing score {Number(courseQuiz.passing_score)}% · {courseQuiz.attempts_remaining} of {courseQuiz.max_attempts} attempts remaining
                      {courseQuiz.has_passed ? <span style={{ color: "var(--green-600)", fontWeight: 600, marginLeft: 8 }}>Passed</span> : null}
                    </div>
                    <button className="btn-primary btn-sm" style={{ marginTop: 10 }} onClick={openQuiz} disabled={courseQuiz.attempts_remaining === 0 && !courseQuiz.has_passed}>
                      <Play size={12} /> {courseQuiz.has_passed ? "Retake quiz" : "Start quiz"}
                    </button>
                  </div>
                ) : null}
                <div className="player-slide-actions">
                  {playerSlide > 0 ? <button onClick={() => setPlayerSlide(playerSlide - 1)}><ChevronRight size={13} style={{ transform: "rotate(180deg)" }} /> Previous</button> : <span />}
                  {!isLastSlide ? <button className="btn-primary" onClick={() => setPlayerSlide(playerSlide + 1)}>Next <ChevronRight size={13} /></button> : (
                    courseQuiz && !courseQuiz.has_passed ? (
                      <button className="btn-primary" onClick={openQuiz}><ClipboardCheck size={13} /> Take quiz to complete</button>
                    ) : (
                      <button className="btn-primary" onClick={markComplete}><Award size={13} /> Complete & Get Certificate</button>
                    )
                  )}
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      ) : null}

      {/* QUIZ MODAL -- interactive assessment */}
      {quizState.open ? (
        <div className="player-overlay" onClick={closeQuiz} role="dialog" aria-modal="true" aria-label="Quiz">
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, width: "100%", maxHeight: "90vh", overflow: "auto", margin: 16 }}>
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2><ClipboardCheck size={16} /> {quizState.quiz?.title || "Knowledge Check"}</h2>
              <button aria-label="Close" onClick={closeQuiz}><X size={13} /></button>
            </div>
            <div style={{ padding: 16 }}>
              {quizState.loading ? (
                <div style={{ textAlign: "center", padding: 20 }}><Loader2 size={20} className="spin" /> Loading...</div>
              ) : quizState.error ? (
                <div className="alert alert-error" style={{ padding: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, color: "#991b1b" }}>{quizState.error}</div>
              ) : quizState.result ? (
                <div>
                  <div style={{ textAlign: "center", padding: 16, background: quizState.result.passed ? "#f0fdf4" : "#fef2f2", border: `1px solid ${quizState.result.passed ? "#bbf7d0" : "#fecaca"}`, borderRadius: 8, marginBottom: 16 }}>
                    {quizState.result.passed ? <CheckCircle2 size={36} style={{ color: "var(--green-600)" }} /> : <AlertTriangle size={36} style={{ color: "#dc2626" }} />}
                    <div style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>{quizState.result.passed ? "You passed!" : "Not quite there"}</div>
                    <div style={{ fontSize: 14, color: "#475569" }}>Score: <strong>{quizState.result.percentage}%</strong> (needed {quizState.result.passing_score}% to pass)</div>
                    <div style={{ fontSize: 12, color: "#737373", marginTop: 4 }}>{quizState.result.score} of {quizState.result.max_score} points · {quizState.result.attempts_remaining} attempt{quizState.result.attempts_remaining === 1 ? "" : "s"} remaining</div>
                  </div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: "#737373", letterSpacing: 0.4, margin: "12px 0 8px" }}>Review</h3>
                  {quizState.questions.map((q, i) => {
                    const pq = quizState.result.per_question.find((p) => p.id === q.id);
                    return (
                      <div key={q.id} style={{ borderLeft: `3px solid ${pq?.is_correct ? "var(--green-600)" : "#dc2626"}`, padding: "8px 12px", background: "#fff", marginBottom: 8, borderRadius: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                          {pq?.is_correct ? <CheckCircle2 size={13} style={{ color: "var(--green-600)", verticalAlign: -2, marginRight: 6 }} /> : <X size={13} style={{ color: "#dc2626", verticalAlign: -2, marginRight: 6 }} />}
                          Q{i + 1}: {q.prompt}
                        </div>
                        <div style={{ fontSize: 12, color: "#475569" }}>Your answer: {JSON.stringify(quizState.answers[q.id] ?? "(no answer)")}</div>
                      </div>
                    );
                  })}
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                    {!quizState.result.passed && quizState.result.attempts_remaining > 0 ? (
                      <button className="btn-primary" onClick={openQuiz}><RotateCcw size={13} /> Retake</button>
                    ) : null}
                    <button className="btn-primary" onClick={() => { closeQuiz(); if (quizState.result.passed) markComplete(); }}>
                      {quizState.result.passed ? <><Award size={13} /> Complete course</> : "Close"}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>
                    {quizState.questions.length} questions · passing score {quizState.quiz?.passing_score}% · attempt {(quizState.quiz?.attempts_used || 0) + 1} of {quizState.quiz?.max_attempts}
                  </div>
                  {quizState.questions.map((q, qi) => (
                    <div key={q.id} style={{ marginBottom: 16, padding: 12, background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 6 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Q{qi + 1}. {q.prompt}</div>
                      {(q.type === "mcq" || q.type === "true_false") && Array.isArray(q.options) ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {q.options.map((opt) => (
                            <label key={opt} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: 8, background: quizState.answers[q.id] === opt ? "#e0f2fe" : "#fff", border: `1px solid ${quizState.answers[q.id] === opt ? "#38bdf8" : "#e5e7eb"}`, borderRadius: 4, cursor: "pointer" }}>
                              <input
                                type="radio"
                                name={`q-${q.id}`}
                                checked={quizState.answers[q.id] === opt}
                                onChange={() => setQuizState((s) => ({ ...s, answers: { ...s.answers, [q.id]: opt } }))}
                                style={{ marginTop: 3 }}
                              />
                              <span style={{ fontSize: 13 }}>{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <textarea
                          value={quizState.answers[q.id] || ""}
                          onChange={(e) => setQuizState((s) => ({ ...s, answers: { ...s.answers, [q.id]: e.target.value } }))}
                          style={{ width: "100%", minHeight: 60, padding: 8, border: "1px solid #e5e7eb", borderRadius: 4 }}
                          placeholder="Your answer"
                        />
                      )}
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                    <button onClick={closeQuiz}>Cancel</button>
                    <button
                      className="btn-primary"
                      onClick={submitQuiz}
                      disabled={quizState.loading || quizState.questions.some((q) => quizState.answers[q.id] === undefined || quizState.answers[q.id] === "")}
                    >
                      <Send size={13} /> Submit quiz
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* GAMIFICATION DRAWER -- XP / level / streak / badges showcase */}
      {gamDrawerOpen ? (
        <div className="player-overlay" onClick={() => setGamDrawerOpen(false)} role="dialog" aria-modal="true" aria-label="Your achievements">
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(440px, 100vw)",
              maxWidth: "100vw",
              margin: 0,
              borderRadius: 0,
              overflowY: "auto",
              boxShadow: "-8px 0 32px rgba(0,0,0,0.16)"
            }}
          >
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
              <h2><Sparkles size={16} /> Your Achievements</h2>
              <button aria-label="Close" onClick={() => setGamDrawerOpen(false)}><X size={13} /></button>
            </div>
            <div style={{ padding: 16 }}>
              {gamProfile ? (
                <>
                  <div style={{ background: "linear-gradient(135deg, #fff7ed 0%, #fef3c7 50%, #f0f9ff 100%)", borderRadius: 12, padding: 16, border: "1px solid #fde68a", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 32, fontWeight: 800, color: "#f59e0b" }}>Level {gamProfile.level}</span>
                      <span style={{ fontSize: 13, color: "#737373" }}>{gamProfile.total_xp} XP total</span>
                    </div>
                    <div style={{ background: "#e2e8f0", borderRadius: 6, height: 10, overflow: "hidden", marginBottom: 6 }}>
                      <div style={{ background: "linear-gradient(90deg, #f59e0b, #8b5cf6)", height: 10, width: `${gamProfile.xp_in_level}%`, transition: "width 0.3s" }} />
                    </div>
                    <div style={{ fontSize: 12, color: "#737373" }}>{gamProfile.xp_to_next_level} XP to level {gamProfile.level + 1}</div>
                    {gamProfile.rank ? (
                      <div style={{ fontSize: 12, marginTop: 8 }}>Ranked <strong>#{gamProfile.rank}</strong> on the company leaderboard.</div>
                    ) : null}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                    <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: 12, textAlign: "center" }}>
                      <Zap size={18} style={{ color: "#f97316" }} />
                      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{gamProfile.streak?.current_streak || 0}</div>
                      <div style={{ fontSize: 11, color: "#737373" }}>day streak</div>
                      <div style={{ fontSize: 10, color: "#a3a3a3", marginTop: 2 }}>Longest: {gamProfile.streak?.longest_streak || 0}</div>
                    </div>
                    <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: 8, padding: 12, textAlign: "center" }}>
                      <Star size={18} style={{ color: "#eab308" }} />
                      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{gamProfile.badges?.length || 0}{allBadges.length ? <span style={{ fontSize: 13, color: "#737373", fontWeight: 400 }}> / {allBadges.length}</span> : null}</div>
                      <div style={{ fontSize: 11, color: "#737373" }}>badges earned</div>
                    </div>
                  </div>

                  <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: "#737373", letterSpacing: 0.4, margin: "8px 0" }}>Earned Badges</h3>
                  {gamProfile.badges?.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginBottom: 16 }}>
                      {gamProfile.badges.map((b) => (
                        <div key={b.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, textAlign: "center" }}>
                          <div style={{ fontSize: 28, lineHeight: 1 }}>{b.icon || "\uD83C\uDFC5"}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>{b.name}</div>
                          {b.description ? <div style={{ fontSize: 11, color: "#737373", marginTop: 4 }}>{b.description}</div> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "#737373", marginBottom: 16 }}>No badges yet. Complete courses, quizzes, and policies to earn them.</div>
                  )}

                  {allBadges.length > gamProfile.badges?.length ? (
                    <>
                      <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: "#737373", letterSpacing: 0.4, margin: "8px 0" }}>Locked Badges</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
                        {allBadges
                          .filter((b) => !(gamProfile.badges || []).some((eb) => eb.id === b.id))
                          .map((b) => (
                            <div key={b.id} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, textAlign: "center", opacity: 0.55 }}>
                              <div style={{ fontSize: 28, lineHeight: 1, filter: "grayscale(1)" }}>{b.icon || "\uD83C\uDFC5"}</div>
                              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>{b.name}</div>
                              {b.description ? <div style={{ fontSize: 11, color: "#737373", marginTop: 4 }}>{b.description}</div> : null}
                            </div>
                          ))}
                      </div>
                    </>
                  ) : null}
                </>
              ) : (
                <div style={{ fontSize: 13, color: "#737373" }}>Loading your achievements...</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Floating Support Assistant launcher -- visible when KB is enabled and
          the user is authenticated. Lets staff pose a question from anywhere
          in the app without tab-switching. */}
      {token && user && isInRelease("knowledge-base", releaseFilter) && isSurfaceVisible("knowledge_base") && trainingTab !== "knowledge-base" ? (
        <SupportAssistantBubble token={token} onOpenArticle={(slug) => { setTrainingTab("knowledge-base"); handleOpenArticle(slug); }} />
      ) : null}
    </div>
  );
}

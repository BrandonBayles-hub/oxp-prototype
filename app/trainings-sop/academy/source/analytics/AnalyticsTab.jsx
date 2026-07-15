import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Users, ShieldCheck, BookOpen, FileText, ChevronDown, ChevronUp, Info, AlertTriangle, Sparkles } from "lucide-react";
import { LearnerDashboard } from "./LearnerDashboard";
import { ManagerDashboard } from "./ManagerDashboard";
import { AdminOverview } from "./AdminOverview";
import { ContentEffectiveness } from "./ContentEffectiveness";
import { ComplianceOverview } from "./ComplianceOverview";
import { ReportBuilder } from "./ReportBuilder";
import { OutcomesDashboard } from "./OutcomesDashboard";
import { TrainingRisk } from "./TrainingRisk";
import { DeflectionAnalytics } from "./DeflectionAnalytics";

const ANALYTICS_ENG_NOTES = {
  "my-progress": {
    release: "1.1",
    why: "Every learner needs a personal analytics view showing their completion rates, skill growth, streaks, and how they compare to peers. Drives self-motivation and accountability.",
    facilitates: "Personal metrics dashboard: completions over time, active streak tracking, skill profile radar chart, recent activity timeline, and peer comparison (anonymized).",
    decisions: "Learner dashboard is always accessible regardless of role. Elite tier adds skill profile radar and advanced peer benchmarking. Data fetched from /api/analytics/learner-dashboard.",
    internal: {
      context: "Calls /api/analytics/learner-dashboard. Response shape includes completions_over_time, skill_profile (Elite only), streak data, and recent_activity. Harden with (data.skill_profile || []).length for null safety.",
      whatToTest: "Verify charts render with zero data, with partial data, and with full data. Test tier gating (Elite vs Standard). Confirm streak logic counts consecutive days correctly.",
      knownLimitations: "Recharts library used for all charts -- no SSR support. Skill profile data is mock. Peer comparison is anonymized but not truly aggregated from other users.",
      feedback: "Slack #entrata-academy-eng or tag @product in PR reviews"
    }
  },
  "team": {
    release: "1.1",
    why: "Managers need visibility into their team's learning progress to identify who needs support, who is excelling, and whether compliance deadlines are being met.",
    facilitates: "Team-level metrics: completion rates by person, overdue assignments, compliance status, team leaderboard, and at-risk learner identification.",
    decisions: "Visible to Property Managers, Community Managers, Regional VPs, and Admins. Scoped to direct reports. Data from /api/analytics/manager-dashboard.",
    internal: {
      context: "Calls /api/analytics/manager-dashboard. Response includes team_members array with per-person completion stats, team_compliance_rate, and at_risk_learners. Manager sees only their direct reports.",
      whatToTest: "Verify team member list renders correctly, at-risk highlighting works, compliance percentage calculates properly. Test with empty team (0 direct reports).",
      knownLimitations: "Direct report scoping is hardcoded in prototype. Production needs integration with Entrata org hierarchy. No drill-down from team to individual learner view.",
      feedback: "Slack #entrata-academy-eng or tag @product in PR reviews"
    }
  },
  "org-overview": {
    release: "1.1",
    why: "Admins and RVPs need a bird's-eye view of learning adoption and effectiveness across the entire organization, not just their direct reports.",
    facilitates: "Organization-wide KPIs: total active learners, average completion rate, top courses, department breakdowns, trend lines over 30/60/90 days.",
    decisions: "Restricted to Admin and Regional VP roles. Aggregates data across all properties/teams. Uses Recharts for interactive charts.",
    internal: {
      context: "Calls /api/analytics/admin-overview. Heavy aggregation query on the backend -- needs caching strategy for production. Charts render client-side with Recharts.",
      whatToTest: "Verify all chart types render (bar, line, pie). Test date range selector. Confirm department breakdown sums to total. Test with single-property vs multi-property org.",
      knownLimitations: "No data export from this view (use Report Builder instead). Charts are not responsive on very narrow screens. Aggregation is per-request with no server-side cache.",
      feedback: "Slack #entrata-academy-eng or tag @product in PR reviews"
    }
  },
  "content": {
    release: "1.1",
    why: "Content effectiveness analytics help admins understand which courses are working and which need improvement, based on completion rates, assessment scores, and learner feedback.",
    facilitates: "Per-course metrics: enrollment vs completion funnel, average assessment scores, time-to-complete distribution, learner satisfaction ratings, and content ROI indicators.",
    decisions: "Restricted to Admin and Regional VP roles. Data from /api/analytics/content-effectiveness. Sortable table with sparkline charts for trends.",
    internal: {
      context: "Calls /api/analytics/content-effectiveness. Returns per-course metrics array. Sparkline charts use Recharts <LineChart> with minimal config. ROI calculation is (completions * estimated_value) / content_creation_cost.",
      whatToTest: "Verify sorting works on all columns. Test with courses that have zero enrollments. Confirm sparklines render for trend data.",
      knownLimitations: "ROI calculation is simplistic and uses hardcoded estimated_value. No A/B testing support between content versions. Satisfaction ratings are not collected in the prototype.",
      feedback: "Slack #entrata-academy-eng or tag @product in PR reviews"
    }
  },
  "compliance": {
    release: "1.2",
    why: "Compliance tracking is critical for property management -- Fair Housing, safety, and other regulatory training has legal consequences if not completed on time.",
    facilitates: "Compliance-specific dashboard: requirement completion by property, expiring certifications, overdue assignments with escalation status, audit-ready export.",
    decisions: "Elite tier only. Restricted to Admin and Regional VP. Data from /api/analytics/compliance-overview. Color-coded severity for overdue items.",
    internal: {
      context: "Calls /api/analytics/compliance-overview. Returns requirements array with per-property completion rates, upcoming_expirations, and overdue_items with days_overdue. Severity thresholds: yellow > 7 days, red > 30 days.",
      whatToTest: "Verify severity color coding matches thresholds. Test export generates valid CSV with all required compliance fields. Confirm property-level drill-down works.",
      knownLimitations: "No integration with external compliance databases. Expiration notifications are not automated. Audit export is client-side CSV -- production should be server-generated PDF.",
      feedback: "Slack #entrata-academy-eng or tag @product in PR reviews"
    }
  },
  "outcomes": {
    release: "1.1",
    why: "Leadership needs to see the business impact of learning investments -- how training correlates with operational metrics like resident satisfaction, lease-up speed, and employee retention.",
    facilitates: "Outcome correlation dashboard: training completion vs operational KPIs, before/after comparisons, property-level impact scores, ROI summary.",
    decisions: "Restricted to Admin and Regional VP. Data from /api/analytics/outcomes. Correlation is displayed but explicitly noted as not-causal.",
    internal: {
      context: "Calls /api/analytics/outcomes-dashboard. Returns correlation_data pairing training metrics with operational metrics. All correlations are explicitly labeled as observational, not causal.",
      whatToTest: "Verify correlation charts render correctly. Test with missing operational data (some properties may not have all KPIs). Confirm disclaimer text is visible.",
      knownLimitations: "Operational KPIs are entirely mock data. Production requires integration with Entrata's reporting/analytics pipeline for real resident satisfaction, lease velocity, etc. Statistical rigor is minimal.",
      feedback: "Slack #entrata-academy-eng or tag @product in PR reviews"
    }
  },
  "reports": {
    release: "1.1",
    why: "Admins need the ability to build custom reports for stakeholders, board presentations, and ad-hoc analysis beyond what pre-built dashboards provide.",
    facilitates: "Drag-and-drop report builder: select metrics, dimensions, filters, and visualization type. Save, schedule, and export reports as CSV/PDF.",
    decisions: "Restricted to Admin and Regional VP. Report definitions are saved server-side. Scheduled reports use the admin scheduled-reports system.",
    internal: {
      context: "Report builder is a configuration UI that constructs a query spec sent to /api/analytics/report-builder. The backend assembles the query and returns tabular data. Visualization is applied client-side.",
      whatToTest: "Build a report with multiple metrics and dimensions. Test all export formats (CSV, PDF). Verify saved reports persist across sessions. Test scheduled report creation.",
      knownLimitations: "Report builder UI is functional but not drag-and-drop in prototype (uses dropdowns). PDF export is not implemented. Max 10 saved reports in prototype.",
      feedback: "Slack #entrata-academy-eng or tag @product in PR reviews"
    }
  },
  "deflection": {
    release: "1.2",
    why: "The Support Assistant's whole job is to deflect ticket creation. We need visibility into how many questions it answers versus how many it hands off to Zendesk, broken down by category, so we can tune retrieval and invest in content gaps.",
    facilitates: "Deflection analytics card: % of questions answered in-app vs handed off, volume by category, average response latency, and trends across rolling windows (7/30/90 days).",
    decisions: "Admin / Regional VP only. Data from /api/kb/ask/analytics aggregated from kb_assistant_turns. Deflection rate = (total - handed_off) / total. Goal is >=70% deflection.",
    internal: {
      context: "Driven by kb_assistant_turns table. Each row is one user turn with needs_human + handed_off + category_hint + retrieved_slugs. Deflection rate treats answered as !handed_off.",
      whatToTest: "Ask the assistant a question that is well-covered by KB articles (should count as answered). Ask one that isn't covered and click 'Open a ticket' (should count as handed_off). Verify counts move.",
      knownLimitations: "Category attribution uses the root category of the top retrieved article as a hint. Does not yet distinguish user frustration vs low-confidence retrieval.",
      feedback: "Slack #entrata-academy-eng or tag @product in PR reviews"
    }
  }
};

function AnalyticsEngNotes({ tabKey }) {
  const note = ANALYTICS_ENG_NOTES[tabKey];
  const storageKey = `analytics-eng-notes-${tabKey}`;
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem(storageKey) === "true"; } catch { return false; }
  });
  if (!note) return null;
  const toggle = () => {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem(storageKey, String(next)); } catch {}
  };
  return (
    <div className={`eng-notes ${open ? "eng-notes-open" : ""}`}>
      <button className="eng-notes-toggle" onClick={toggle} type="button">
        <Info size={13} />
        <span>Engineering Notes</span>
        <span className="release-badge" style={{ marginLeft: 6 }}>{note.release}</span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <div className="eng-notes-body">
          <div className="eng-notes-row"><strong>Why:</strong> {note.why}</div>
          <div className="eng-notes-row"><strong>Facilitates:</strong> {note.facilitates}</div>
          <div className="eng-notes-row"><strong>Decisions:</strong> {note.decisions}</div>
          {note.internal && (
            <>
              <div style={{ borderTop: "1px solid rgba(59,130,246,0.15)", margin: "8px 0", paddingTop: 8 }}>
                <strong style={{ color: "#7c3aed" }}>Internal Notes</strong>
              </div>
              {note.internal.context && <div className="eng-notes-row"><strong>Context:</strong> {note.internal.context}</div>}
              {note.internal.whatToTest && <div className="eng-notes-row"><strong>What to test:</strong> {note.internal.whatToTest}</div>}
              {note.internal.knownLimitations && <div className="eng-notes-row"><strong>Known limitations:</strong> {note.internal.knownLimitations}</div>}
              {note.internal.feedback && <div className="eng-notes-row"><strong>Feedback:</strong> {note.internal.feedback}</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function AnalyticsTab({ token, user, tier }) {
  const isAdmin = user?.role === "Admin";
  const isRVP = user?.role === "Regional VP";
  const isManager = ["Admin", "Regional VP", "Property Manager", "Community Manager"].includes(user?.role);
  const isElite = tier === "elite";

  const getDefaultSubTab = () => {
    if (isAdmin || isRVP) return "org-overview";
    if (isManager) return "team";
    return "my-progress";
  };

  const [subTab, setSubTab] = useState(getDefaultSubTab);

  useEffect(() => {
    setSubTab(getDefaultSubTab());
  }, [user?.role]);

  return (
    <div>
      <div className="admin-subtabs" style={{ marginBottom: 20 }}>
        <button className={subTab === "my-progress" ? "active" : ""} onClick={() => setSubTab("my-progress")}>
          <TrendingUp size={13} /> My Progress
        </button>
        {isManager && (
          <button className={subTab === "team" ? "active" : ""} onClick={() => setSubTab("team")}>
            <Users size={13} /> Team
          </button>
        )}
        {(isAdmin || isRVP) && (
          <button className={subTab === "org-overview" ? "active" : ""} onClick={() => setSubTab("org-overview")}>
            <BarChart3 size={13} /> Org Overview
          </button>
        )}
        {(isAdmin || isRVP) && (
          <button className={subTab === "content" ? "active" : ""} onClick={() => setSubTab("content")}>
            <BookOpen size={13} /> Content Effectiveness
          </button>
        )}
        {(isAdmin || isRVP) && isElite && (
          <button className={subTab === "compliance" ? "active" : ""} onClick={() => setSubTab("compliance")}>
            <ShieldCheck size={13} /> Compliance
          </button>
        )}
        {(isAdmin || isRVP) && (
          <button className={subTab === "risk" ? "active" : ""} onClick={() => setSubTab("risk")}>
            <AlertTriangle size={13} /> Risk
          </button>
        )}
        {(isAdmin || isRVP) && (
          <button className={subTab === "outcomes" ? "active" : ""} onClick={() => setSubTab("outcomes")}>
            <TrendingUp size={13} /> Outcomes
          </button>
        )}
        {(isAdmin || isRVP) && (
          <button className={subTab === "deflection" ? "active" : ""} onClick={() => setSubTab("deflection")}>
            <Sparkles size={13} /> Deflection
          </button>
        )}
        {(isAdmin || isRVP) && (
          <button className={subTab === "reports" ? "active" : ""} onClick={() => setSubTab("reports")}>
            <FileText size={13} /> Report Library
          </button>
        )}
      </div>

      {subTab === "my-progress" && <><AnalyticsEngNotes tabKey="my-progress" /><LearnerDashboard token={token} isElite={isElite} /></>}
      {subTab === "team" && isManager && <><AnalyticsEngNotes tabKey="team" /><ManagerDashboard token={token} isElite={isElite} /></>}
      {subTab === "org-overview" && (isAdmin || isRVP) && <><AnalyticsEngNotes tabKey="org-overview" /><AdminOverview token={token} /></>}
      {subTab === "content" && (isAdmin || isRVP) && <><AnalyticsEngNotes tabKey="content" /><ContentEffectiveness token={token} /></>}
      {subTab === "compliance" && (isAdmin || isRVP) && isElite && <><AnalyticsEngNotes tabKey="compliance" /><ComplianceOverview token={token} /></>}
      {subTab === "risk" && (isAdmin || isRVP) && <TrainingRisk token={token} />}
      {subTab === "outcomes" && (isAdmin || isRVP) && <><AnalyticsEngNotes tabKey="outcomes" /><OutcomesDashboard token={token} /></>}
      {subTab === "deflection" && (isAdmin || isRVP) && <><AnalyticsEngNotes tabKey="deflection" /><DeflectionAnalytics token={token} /></>}
      {subTab === "reports" && (isAdmin || isRVP) && <><AnalyticsEngNotes tabKey="reports" /><ReportBuilder token={token} /></>}
    </div>
  );
}

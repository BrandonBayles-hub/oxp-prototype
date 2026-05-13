"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Search, Users, FileText, Shield, PenTool, ArrowLeft, Power } from "lucide-react";

const PROPERTY_TYPES = [
  { id: "affordable", name: "Affordable", units: 1187138 },
  { id: "child-property", name: "Child Property", units: 1440841 },
  { id: "co-living", name: "Co-Living", units: 1105912 },
  { id: "conventional", name: "Conventional", units: 1187150 },
  { id: "conventional-2", name: "Conventional 2", units: 1194930 },
  { id: "military", name: "Military", units: 1187199 },
  { id: "mixed-use", name: "Mixed Use", units: 1287138 },
  { id: "parent-property", name: "Parent Property", units: 1440842 },
  { id: "sro-application", name: "SRO Application", units: 1135911 },
  { id: "student", name: "Student", units: 1187157 },
  { id: "student-unit", name: "Student Unit Selection", units: 1105989 },
];

type TopCategory = "guest-cards" | "applications" | "screening" | "lease-creation";

const TOP_CATEGORIES: { id: TopCategory; name: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "guest-cards", name: "Guest Cards", description: "Manage prospect intake, lead capture, and guest card creation settings", icon: Users },
  { id: "applications", name: "Applications", description: "Application processing, lifecycle management, fees, and rules, and prospect-to-lease settings", icon: FileText },
  { id: "screening", name: "Screening", description: "AI screening criteria, background checks, credit checks, and decision logic", icon: Shield },
  { id: "lease-creation", name: "Lease Creation Agent", description: "Automate lease preparation, document assembly, countersigning, and move-in tasks", icon: PenTool },
];

type SettingSection = {
  id: string;
  name: string;
  description: string;
  settingsCount: number;
};

const CATEGORY_SETTINGS: Record<TopCategory, SettingSection[]> = {
  "guest-cards": [
    { id: "lead-capture", name: "Lead Capture & Source Tracking", settingsCount: 6, description: "Configure how leads are captured from different sources — website, ILS, walk-in, and referral channels." },
    { id: "guest-card-fields", name: "Guest Card Field Requirements", settingsCount: 8, description: "Define which fields are required, optional, or hidden on guest card intake forms across property types." },
    { id: "auto-assignment", name: "Lead Auto-Assignment Rules", settingsCount: 5, description: "Set rules for automatic lead routing and assignment to leasing agents based on property, source, or unit type." },
    { id: "follow-up", name: "Follow-Up Automation", settingsCount: 7, description: "Configure automated follow-up sequences, timing, and channel preferences for new leads." },
    { id: "dedup-rules", name: "Duplicate Detection & Merge", settingsCount: 4, description: "Control how duplicate guest cards are identified and merged to maintain clean prospect data." },
  ],
  "applications": [
    { id: "availability-unit", name: "Check Availability & Unit Selection", settingsCount: 9, description: "Control whether prospects see a floorplan, a wait queue, or both during the application — and whether offers convert to leases or stay." },
    { id: "app-lifecycle", name: "Application Lifecycle Management", settingsCount: 4, description: "Handle cancellations, refunds, and expirations — enforce property-level policies to ensure clean status transitions." },
    { id: "pricing-fees", name: "Pricing & Fees", settingsCount: 7, description: "Application fees, payment methods, pet charges, deposit alternatives, fee disclosures, and durable pricing configuration." },
    { id: "unit-holds", name: "Unit Holds & Reservations", settingsCount: 3, description: "Reserve units during the application process — hold duration, release rules, and unit status transitions." },
    { id: "portal-display", name: "Portal Display & Configuration", settingsCount: 4, description: "Online application portal settings — branded header, affordable housing unit rules, and multi-factor authentication." },
    { id: "student-unit-selection", name: "Student Unit Selection", settingsCount: 5, description: "Configure bed-level assignment, roommate matching preferences, and semester-based lease term options." },
  ],
  "screening": [
    { id: "criteria-rules", name: "Screening Criteria & Decision Rules", settingsCount: 8, description: "Define income requirements, credit score thresholds, criminal history policies, and conditional approval logic." },
    { id: "vendor-integration", name: "Screening Vendor Integration", settingsCount: 5, description: "Configure connections to third-party screening providers, API settings, and fallback handling." },
    { id: "adverse-action", name: "Adverse Action & Compliance", settingsCount: 6, description: "Manage adverse action notice templates, delivery timing, appeal workflows, and fair housing compliance." },
    { id: "auto-decisions", name: "Automated Decision Logic", settingsCount: 4, description: "Set up auto-approve, auto-deny, and conditional thresholds for AI-assisted screening decisions." },
  ],
  "lease-creation": [
    { id: "doc-assembly", name: "Document Assembly & Templates", settingsCount: 7, description: "Configure lease document templates, addenda selection, and dynamic clause insertion based on property and unit type." },
    { id: "countersign", name: "Countersigning & Execution", settingsCount: 5, description: "Set up auto-countersign rules, approval chains, and digital signature workflows for lease execution." },
    { id: "movein-tasks", name: "Move-In Task Automation", settingsCount: 6, description: "Automate move-in checklist generation, welcome communications, key handoff, and utility setup reminders." },
    { id: "renewal-prep", name: "Renewal Preparation", settingsCount: 4, description: "Configure early renewal offer timing, rent increase calculations, and automated outreach sequences." },
  ],
};

export function LeadToLeaseSettings({ isActive, onToggleActive }: { isActive: boolean; onToggleActive: () => void }) {
  const [activeCategory, setActiveCategory] = useState<TopCategory>("applications");
  const [activeTab, setActiveTab] = useState<"setup" | "compare">("setup");
  const [selectedProperty, setSelectedProperty] = useState("affordable");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [propertySearch, setPropertySearch] = useState("");
  const [activeSectionDetail, setActiveSectionDetail] = useState<string | null>(null);

  const filteredProperties = PROPERTY_TYPES.filter((p) =>
    p.name.toLowerCase().includes(propertySearch.toLowerCase())
  );

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sections = CATEGORY_SETTINGS[activeCategory];
  const selectedProp = PROPERTY_TYPES.find((p) => p.id === selectedProperty);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-8 pt-6 pb-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7c3aed]/10">
            <img src="/eli-cube.svg" alt="" width={22} height={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground">Autonomous Leasing+</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isActive ? "bg-[#B3FFCC] text-black" : "bg-zinc-200 text-zinc-500"}`}>
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
              Unified leasing intelligence — orchestrates application processing, screening decisions, lease execution, and resident communications through coordinated autonomous agents.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleActive}
            title={isActive ? "Deactivate agent" : "Activate agent"}
            className={`shrink-0 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            {isActive ? "Turn Off" : "Turn On"}
          </button>
        </div>

        {/* Category cards */}
        <div className="flex gap-6 mt-5">
          {TOP_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => { setActiveCategory(cat.id); setActiveSectionDetail(null); }}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all min-w-[180px] max-w-[220px] ${
                  isActive
                    ? "border-[#7c3aed]/40 bg-[#7c3aed]/5 shadow-sm"
                    : "border-border bg-white hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-[#7c3aed]/15 text-[#7c3aed]" : "bg-zinc-100 text-zinc-500"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className={`text-[13px] font-semibold leading-tight ${isActive ? "text-[#7c3aed]" : "text-foreground"}`}>{cat.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">{cat.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs row */}
      <div className="shrink-0 flex items-center gap-4 border-b border-border px-8">
        <div className="flex items-center mr-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-2">Properties</span>
          <span className="rounded-full bg-[#7c3aed] px-2 py-0.5 text-[10px] font-bold text-white">{PROPERTY_TYPES.length} total</span>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab("setup")}
          className={`relative py-3 text-sm font-medium transition-colors ${
            activeTab === "setup" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Setup
          {activeTab === "setup" && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground rounded-full" />}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("compare")}
          className={`relative py-3 text-sm font-medium transition-colors ${
            activeTab === "compare" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Compare
          {activeTab === "compare" && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground rounded-full" />}
        </button>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Property sidebar */}
        <div className="w-56 shrink-0 border-r border-border flex flex-col bg-zinc-50/50">
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search properties…"
                value={propertySearch}
                onChange={(e) => setPropertySearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-md border border-border text-xs focus:outline-none focus:ring-2 focus:ring-zinc-300 bg-white"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredProperties.map((prop) => (
              <button
                key={prop.id}
                type="button"
                onClick={() => setSelectedProperty(prop.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                  selectedProperty === prop.id
                    ? "bg-white border-l-2 border-l-[#7c3aed] text-foreground font-medium"
                    : "text-muted-foreground hover:bg-white hover:text-foreground border-l-2 border-l-transparent"
                }`}
              >
                <span className="text-xs truncate">{prop.name}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums ml-2 shrink-0">{prop.units.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {activeTab === "setup" ? (
            activeSectionDetail ? (
              <SectionDetail
                section={sections.find((s) => s.id === activeSectionDetail)!}
                propertyName={selectedProp?.name ?? ""}
                onBack={() => setActiveSectionDetail(null)}
              />
            ) : (
              <div className="px-8 py-6">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <span>← Back to categories</span>
                  <span className="font-medium text-foreground">{TOP_CATEGORIES.find((c) => c.id === activeCategory)?.name}</span>
                </div>

                {/* Category title + property header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {TOP_CATEGORIES.find((c) => c.id === activeCategory)?.name}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1 max-w-lg">
                      {TOP_CATEGORIES.find((c) => c.id === activeCategory)?.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-6">
                    <p className="text-sm font-semibold text-foreground">{selectedProp?.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{sections.length} area{sections.length !== 1 ? "s" : ""}</span>
                      <span className="text-emerald-600 font-medium">{Math.floor(Math.random() * 3) + 3} published</span>
                    </div>
                  </div>
                </div>

                {/* Setting sections */}
                <div className="space-y-1">
                  {sections.map((section) => {
                    const isExpanded = expandedSections.has(section.id);
                    return (
                      <div key={section.id} className="border border-border rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleSection(section.id)}
                          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm font-semibold text-foreground">{section.name}</span>
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                {section.settingsCount} settings
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">{section.description}</p>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-4" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="border-t border-border bg-zinc-50/50 px-5 py-4">
                            <SectionSettingsPreview section={section} onViewDetail={() => setActiveSectionDetail(section.id)} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-zinc-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Compare View</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                Side-by-side comparison of settings across property types is coming soon. This will let you diff configurations between verticals and quickly spot inconsistencies.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionSettingsPreview({ section, onViewDetail }: { section: SettingSection; onViewDetail: () => void }) {
  const mockSettings = Array.from({ length: Math.min(section.settingsCount, 4) }, (_, i) => ({
    name: `Setting ${i + 1}`,
    value: i % 2 === 0 ? "Enabled" : "Custom",
    status: i % 3 === 0 ? "default" : "configured",
  }));

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {mockSettings.map((s, i) => (
          <div key={i} className="flex items-center justify-between rounded-md border border-border bg-white px-3 py-2">
            <span className="text-xs text-muted-foreground">{s.name}</span>
            <span className={`text-xs font-medium ${s.status === "configured" ? "text-[#7c3aed]" : "text-foreground"}`}>{s.value}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onViewDetail}
        className="text-xs font-medium text-[#7c3aed] hover:text-[#6d28d9] transition-colors"
      >
        View all {section.settingsCount} settings →
      </button>
    </div>
  );
}

function SectionDetail({ section, propertyName, onBack }: { section: SettingSection; propertyName: string; onBack: () => void }) {
  const [savedToast, setSavedToast] = useState(false);

  const mockDetailSettings = Array.from({ length: section.settingsCount }, (_, i) => ({
    id: `${section.id}-setting-${i}`,
    name: getSettingName(section.id, i),
    description: getSettingDescription(section.id, i),
    type: i % 3 === 0 ? "toggle" : i % 3 === 1 ? "select" : "input",
    value: i % 2 === 0 ? true : false,
  }));

  const handleSave = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  return (
    <div className="px-8 py-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {section.name}
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{section.name}</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-lg">{section.description}</p>
        </div>
        <span className="text-xs text-muted-foreground">{propertyName}</span>
      </div>

      <div className="space-y-4">
        {mockDetailSettings.map((setting) => (
          <div key={setting.id} className="flex items-start justify-between rounded-lg border border-border bg-white p-4">
            <div className="min-w-0 flex-1 mr-4">
              <p className="text-sm font-medium text-foreground">{setting.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
            </div>
            <div className="shrink-0">
              {setting.type === "toggle" ? (
                <ToggleSwitch defaultOn={setting.value as boolean} />
              ) : setting.type === "select" ? (
                <select className="h-8 rounded-md border border-border bg-white px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-300">
                  <option>Default</option>
                  <option>Custom</option>
                  <option>Disabled</option>
                </select>
              ) : (
                <input
                  type="text"
                  defaultValue="Default"
                  className="h-8 w-32 rounded-md border border-border bg-white px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-300"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          Save Changes
        </button>
        {savedToast && (
          <span className="text-xs font-medium text-emerald-600 animate-in fade-in duration-300">Changes saved successfully</span>
        )}
      </div>
    </div>
  );
}

function ToggleSwitch({ defaultOn }: { defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      onClick={() => setOn(!on)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${on ? "bg-[#7c3aed]" : "bg-zinc-300"}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[18px]" : "translate-x-[3px]"}`}
      />
    </button>
  );
}

function getSettingName(sectionId: string, index: number): string {
  const names: Record<string, string[]> = {
    "availability-unit": ["Show floor plan availability", "Enable waitlist queue", "Auto-convert offers to leases", "Unit type filtering", "Availability refresh interval", "Show unit photos", "Price display format", "Availability calendar view", "Unit comparison tool"],
    "app-lifecycle": ["Auto-cancel after inactivity", "Refund policy enforcement", "Application expiration window", "Status transition rules"],
    "pricing-fees": ["Application fee amount", "Payment method options", "Pet deposit configuration", "Deposit alternative programs", "Fee disclosure requirements", "Promotional pricing rules", "Late fee calculation"],
    "unit-holds": ["Hold duration (hours)", "Auto-release rules", "Hold status notifications"],
    "portal-display": ["Branded application header", "Affordable housing unit rules", "Multi-factor authentication", "Mobile-responsive layout"],
    "student-unit-selection": ["Bed-level assignment mode", "Roommate matching preferences", "Semester-based lease terms", "Room swap requests", "Occupancy visibility"],
    "lead-capture": ["Website lead form", "ILS integration", "Walk-in capture", "Referral tracking", "UTM parameter tracking", "Lead source attribution"],
    "guest-card-fields": ["Required contact fields", "Optional preferences", "Custom field mapping", "Move-in date requirement", "Budget range field", "Pet information", "Vehicle information", "Employer details"],
    "auto-assignment": ["Round-robin assignment", "Property-based routing", "Source-based routing", "Load balancing", "Priority overrides"],
    "follow-up": ["Initial response timing", "Follow-up sequence", "Channel preference", "Escalation rules", "Quiet hours", "Max attempts", "Opt-out handling"],
    "dedup-rules": ["Match criteria", "Auto-merge threshold", "Manual review queue", "Merge conflict handling"],
    "criteria-rules": ["Income requirement multiplier", "Minimum credit score", "Criminal history policy", "Eviction history policy", "Rental history verification", "Employment verification", "Conditional approval logic", "Co-signer requirements"],
    "vendor-integration": ["Primary screening vendor", "Backup vendor config", "API timeout settings", "Retry logic", "Result caching"],
    "adverse-action": ["Notice template", "Delivery method", "Appeal window", "Fair housing compliance", "State-specific requirements", "Record retention"],
    "auto-decisions": ["Auto-approve threshold", "Auto-deny threshold", "Conditional review band", "Override permissions"],
    "doc-assembly": ["Lease template selection", "Addenda auto-attach", "Dynamic clause rules", "Property-specific riders", "Watermark settings", "Digital signature fields", "Document versioning"],
    "countersign": ["Auto-countersign rules", "Approval chain config", "Signature workflow", "Delegation rules", "Audit trail"],
    "movein-tasks": ["Checklist generation", "Welcome communication", "Key handoff process", "Utility setup reminders", "Parking assignment", "Move-in inspection"],
    "renewal-prep": ["Early renewal window", "Rent increase calculation", "Outreach sequence", "Renewal incentives"],
  };
  return names[sectionId]?.[index] ?? `Setting ${index + 1}`;
}

function getSettingDescription(sectionId: string, index: number): string {
  const descriptions: Record<string, string[]> = {
    "availability-unit": [
      "Display floor plan availability alongside unit listings during the application process.",
      "Allow prospects to join a waitlist when preferred units are unavailable.",
      "Automatically convert accepted rental offers into active lease agreements.",
      "Filter available units by type, floor plan, or specific attributes.",
      "Set how frequently unit availability data refreshes from the property management system.",
      "Include unit photos in the availability display for prospect review.",
      "Choose how pricing appears — monthly, weekly, or per-square-foot.",
      "Show a calendar view of upcoming available dates for each unit.",
      "Enable side-by-side comparison of available units for prospects.",
    ],
    "app-lifecycle": [
      "Automatically cancel applications that remain inactive beyond the configured period.",
      "Enforce property-level refund policies when applications are cancelled or denied.",
      "Set the time window before submitted applications expire and require re-submission.",
      "Define valid application status transitions and enforce workflow rules.",
    ],
    "pricing-fees": [
      "Set the base application fee charged to each applicant.",
      "Configure which payment methods are accepted for application fees and deposits.",
      "Set pet deposit amounts, pet rent, and breed/weight restrictions.",
      "Enable alternative deposit programs like surety bonds or deposit insurance.",
      "Ensure all required fee disclosures are included per state and local regulations.",
      "Define rules for promotional pricing, concessions, and time-limited offers.",
      "Configure how late fees are calculated — flat rate, percentage, or tiered.",
    ],
    "unit-holds": [
      "Maximum hours a unit can be held during the application process.",
      "Rules for automatically releasing held units back to available inventory.",
      "Notify applicants and staff when hold status changes.",
    ],
    "portal-display": [
      "Customize the application portal header with property branding and logo.",
      "Configure how affordable housing units are displayed and filtered in the portal.",
      "Require multi-factor authentication for application submission and document access.",
      "Ensure the application portal renders correctly across mobile devices.",
    ],
    "student-unit-selection": [
      "Allow assignment at the individual bed level within shared units.",
      "Enable roommate matching based on lifestyle preferences and compatibility.",
      "Offer semester-aligned lease terms in addition to standard annual leases.",
      "Allow residents to request room or bed swaps during the lease term.",
      "Control what occupancy information is visible to prospective student residents.",
    ],
    "lead-capture": [
      "Capture leads from your property website contact and inquiry forms.",
      "Automatically import leads from Internet Listing Services.",
      "Record walk-in visitors as leads with quick guest card creation.",
      "Track referral sources and attribute leads to referring residents or partners.",
      "Capture UTM parameters from marketing campaigns for attribution.",
      "Set rules for how leads are attributed to their original marketing source.",
    ],
    "guest-card-fields": [
      "Define which contact fields (name, email, phone) are required on guest cards.",
      "Configure optional preference fields like desired floor plan, move-in date.",
      "Map custom fields to your property management system's data structure.",
      "Require a target move-in date on all guest card submissions.",
      "Include a budget range field to pre-qualify prospects.",
      "Collect pet type, breed, and weight information during intake.",
      "Capture vehicle make, model, and license plate for parking assignment.",
      "Collect current employer and income range during guest card creation.",
    ],
    "auto-assignment": [
      "Distribute new leads evenly across available leasing agents.",
      "Route leads to agents assigned to specific properties.",
      "Assign leads based on their originating source channel.",
      "Balance lead assignment based on current agent workload.",
      "Override standard routing for VIP or high-priority leads.",
    ],
    "follow-up": [
      "Set the maximum time before a new lead receives first contact.",
      "Define the sequence and timing of follow-up communications.",
      "Configure preferred communication channels for follow-up outreach.",
      "Set rules for escalating leads that haven't been contacted.",
      "Define hours when automated follow-ups should not be sent.",
      "Set the maximum number of follow-up attempts before marking cold.",
      "Handle opt-out requests and communication preference changes.",
    ],
    "dedup-rules": [
      "Define which fields are used to identify potential duplicate records.",
      "Set the confidence threshold for automatic duplicate merging.",
      "Route uncertain duplicates to a manual review queue.",
      "Define how conflicting data is resolved when merging records.",
    ],
    "criteria-rules": [
      "Set the income-to-rent ratio required for approval.",
      "Define the minimum credit score threshold for each property type.",
      "Configure how criminal background results affect screening decisions.",
      "Set policies for applicants with prior eviction records.",
      "Define rental history verification requirements and acceptable gaps.",
      "Configure employment verification requirements and documentation.",
      "Set up conditional approval paths for borderline applicants.",
      "Define co-signer requirements and when they may be requested.",
    ],
    "vendor-integration": [
      "Select and configure the primary screening service provider.",
      "Set up a backup vendor for failover scenarios.",
      "Configure API connection timeout and retry settings.",
      "Define retry logic for failed screening requests.",
      "Set caching rules for screening results to optimize performance.",
    ],
    "adverse-action": [
      "Configure the template used for adverse action notification letters.",
      "Set the delivery method — email, mail, or both.",
      "Define the appeal window duration for denied applicants.",
      "Ensure all notices comply with Fair Housing Act requirements.",
      "Apply state-specific adverse action notice requirements.",
      "Set how long adverse action records are retained for compliance.",
    ],
    "auto-decisions": [
      "Set the score threshold above which applications are auto-approved.",
      "Set the score threshold below which applications are auto-denied.",
      "Define the score range that requires manual review.",
      "Configure who can override automated screening decisions.",
    ],
    "doc-assembly": [
      "Select the default lease template for each property type.",
      "Automatically attach required addenda based on unit and lease type.",
      "Define rules for inserting dynamic clauses based on property context.",
      "Configure property-specific lease riders and supplemental documents.",
      "Set watermark display rules for draft vs. executed documents.",
      "Place and configure digital signature fields within lease documents.",
      "Enable document versioning to track changes across lease revisions.",
    ],
    "countersign": [
      "Define conditions for automatic countersigning of executed leases.",
      "Configure the approval chain for leases requiring manual review.",
      "Set up the digital signature workflow for all parties.",
      "Enable delegation of signing authority during absences.",
      "Track all signing events and maintain a complete audit trail.",
    ],
    "movein-tasks": [
      "Automatically generate a move-in checklist for new residents.",
      "Configure welcome email and SMS communications on lease execution.",
      "Set up the key handoff process and scheduling.",
      "Send automated utility setup reminders before the move-in date.",
      "Auto-assign parking based on lease terms and availability.",
      "Schedule and track move-in inspections for each new resident.",
    ],
    "renewal-prep": [
      "Set how far in advance renewal offers are generated before lease expiration.",
      "Configure the method for calculating rent increases on renewals.",
      "Define the automated outreach sequence for renewal communications.",
      "Set up renewal incentives like reduced rent or waived fees.",
    ],
  };
  return descriptions[sectionId]?.[index] ?? "Configure this setting for the selected property type.";
}

"use client";

import { useState, useMemo } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Power, CirclePlay, ExternalLink, ChevronDown, ChevronUp, Search,
  CheckCircle, XCircle, Clock, Settings, ArrowLeft, Save, Users,
} from "lucide-react";
import type { Agent } from "@/lib/agents-context";

// ---------------------------------------------------------------------------
// Types for L3 agent settings definitions
// ---------------------------------------------------------------------------

type SettingOption = { label: string; value: string };

type SettingField =
  | { type: "toggle"; id: string; label: string; description?: string; defaultValue: boolean }
  | { type: "select"; id: string; label: string; description?: string; options: SettingOption[]; defaultValue: string }
  | { type: "number"; id: string; label: string; description?: string; defaultValue: number; min?: number; max?: number; suffix?: string }
  | { type: "radio"; id: string; label: string; description?: string; options: SettingOption[]; defaultValue: string }
  | { type: "text"; id: string; label: string; description?: string; defaultValue: string; placeholder?: string }
  | { type: "textarea"; id: string; label: string; description?: string; defaultValue: string; placeholder?: string; rows?: number }
  | { type: "date"; id: string; label: string; description?: string; defaultValue: string }
  | { type: "checkbox"; id: string; label: string; description?: string; defaultValue: boolean }
  | { type: "multi-select"; id: string; label: string; description?: string; options: SettingOption[]; defaultValue: string[] };

type L3SettingsGroup = {
  id: string;
  title: string;
  description: string;
  fields: SettingField[];
};

export type L3AgentConfig = {
  module: string;
  headline: string;
  description: string;
  settingsGroups: L3SettingsGroup[];
};

// ---------------------------------------------------------------------------
// Registry — add new L3 agents here
// ---------------------------------------------------------------------------

const L3_AGENT_CONFIGS: Record<string, L3AgentConfig> = {
  "Auto Post Recurring Charges": {
    module: "Accounting · Charges",
    headline: "Automate Recurring Charge Posting",
    description:
      "This agent automatically posts recurring charges on your configured schedule each month — eliminating the need for manual charge posting across your entire portfolio.",
    settingsGroups: [
      {
        id: "recurring-charges",
        title: "Recurring Charge Posting",
        description: "Configure how and when recurring charges are automatically posted each month.",
        fields: [
          {
            type: "toggle",
            id: "auto-post-enabled",
            label: "Automatically Post Recurring Charges",
            description: "When enabled, the agent will post all recurring charges on the configured day each month.",
            defaultValue: true,
          },
          {
            type: "select",
            id: "auto-post-day",
            label: "Auto Post Day",
            description: "The day of the month recurring charges will be automatically posted.",
            options: Array.from({ length: 31 }, (_, i) => ({ label: `${i + 1}`, value: `${i + 1}` })),
            defaultValue: "1",
          },
        ],
      },
    ],
  },
  "Automatically Assign a Leasing Agent": {
    module: "Leasing · Lead Management",
    headline: "Automate Lead Assignment to Leasing Agents",
    description:
      "This agent controls how new leads are automatically assigned to leasing agents. The available options determine the logic used to distribute incoming leads across your team — from manual assignment to intelligent load-balanced auto-distribution.",
    settingsGroups: [
      {
        id: "assignment-method",
        title: "Auto-Assignment Method",
        description: "Choose the logic used to automatically assign new leads to leasing agents at this property.",
        fields: [
          {
            type: "radio",
            id: "assignment-option",
            label: "Auto-Assignment Options",
            description: "This setting controls how new leads are automatically assigned to leasing agents. The available options determine the logic used to distribute incoming leads across your team.",
            options: [
              { label: "Manually Assign — Leads are not automatically distributed. A user must manually select and assign an agent.", value: "manual" },
              { label: "Assign the first agent to successfully contact the lead — The lead is assigned to whichever agent first makes successful contact with the prospect.", value: "first_contact" },
              { label: "Assign first agent to give a tour/onsite visit — The lead is assigned to the first agent who conducts a property tour or onsite visit with the prospect.", value: "first_tour" },
              { label: "Assign the agent with the fewest leads — Leads are automatically distributed to the agent who currently has the lowest number of assigned leads, helping balance workload evenly across the team.", value: "fewest_leads" },
            ],
            defaultValue: "fewest_leads",
          },
        ],
      },
    ],
  },
  "Advance Accounting Periods": {
    module: "Accounting · Period Management",
    headline: "Automate Accounting Period Advancement",
    description:
      "This agent automatically advances your AR, AP, and GL accounting periods on the day you configure each month. It also handles GPR journal entry posting — removing the need for staff to manually advance periods and keeping your books moving on schedule.",
    settingsGroups: [
      {
        id: "ar-advance",
        title: "Accounts Receivable (AR)",
        description: "Configure when the AR accounting period is automatically advanced.",
        fields: [
          {
            type: "select",
            id: "ar-advance-day",
            label: "What day of the month do you want to advance AR?",
            description: "The AR period will be automatically advanced on this day each month.",
            options: Array.from({ length: 31 }, (_, i) => ({ label: `${i + 1}`, value: `${i + 1}` })),
            defaultValue: "1",
          },
        ],
      },
      {
        id: "ap-advance",
        title: "Accounts Payable (AP)",
        description: "Configure when the AP accounting period is automatically advanced.",
        fields: [
          {
            type: "select",
            id: "ap-advance-day",
            label: "What day of the month do you want to advance AP?",
            description: "The AP period will be automatically advanced on this day each month.",
            options: Array.from({ length: 31 }, (_, i) => ({ label: `${i + 1}`, value: `${i + 1}` })),
            defaultValue: "1",
          },
        ],
      },
      {
        id: "gl-advance",
        title: "General Ledger (GL)",
        description: "Configure when the GL accounting period is automatically advanced.",
        fields: [
          {
            type: "select",
            id: "gl-advance-day",
            label: "What day of the month do you want to advance GL?",
            description: "The GL period will be automatically advanced on this day each month.",
            options: Array.from({ length: 31 }, (_, i) => ({ label: `${i + 1}`, value: `${i + 1}` })),
            defaultValue: "1",
          },
        ],
      },
      {
        id: "gpr-posting",
        title: "GPR Journal Entries",
        description: "Control whether GPR journal entries are automatically posted when periods advance.",
        fields: [
          {
            type: "toggle",
            id: "auto-post-gpr",
            label: "Automatically Post GPR Journal Entries",
            description: "When enabled, GPR journal entries will be automatically posted as part of the period advancement process.",
            defaultValue: true,
          },
        ],
      },
    ],
  },
  "Lock Accounting Periods": {
    module: "Accounting · Period Management",
    headline: "Automate Accounting Period Locking",
    description:
      "This agent automatically locks your AR, AP, and GL accounting periods on the day you configure each month — preventing retroactive changes to closed periods and ensuring the integrity of your month-end financial reports across your entire portfolio.",
    settingsGroups: [
      {
        id: "ar-lock",
        title: "Accounts Receivable (AR)",
        description: "Configure when the AR accounting period is automatically locked.",
        fields: [
          {
            type: "select",
            id: "ar-lock-day",
            label: "What day of the month do you want to lock AR?",
            description: "The AR period will be automatically locked on this day each month, preventing any further changes.",
            options: Array.from({ length: 31 }, (_, i) => ({ label: `${i + 1}`, value: `${i + 1}` })),
            defaultValue: "5",
          },
        ],
      },
      {
        id: "ap-lock",
        title: "Accounts Payable (AP)",
        description: "Configure when the AP accounting period is automatically locked.",
        fields: [
          {
            type: "select",
            id: "ap-lock-day",
            label: "What day of the month do you want to lock AP?",
            description: "The AP period will be automatically locked on this day each month, preventing any further changes.",
            options: Array.from({ length: 31 }, (_, i) => ({ label: `${i + 1}`, value: `${i + 1}` })),
            defaultValue: "5",
          },
        ],
      },
      {
        id: "gl-lock",
        title: "General Ledger (GL)",
        description: "Configure when the GL accounting period is automatically locked.",
        fields: [
          {
            type: "select",
            id: "gl-lock-day",
            label: "What day of the month do you want to lock GL?",
            description: "The GL period will be automatically locked on this day each month, preventing any further changes.",
            options: Array.from({ length: 31 }, (_, i) => ({ label: `${i + 1}`, value: `${i + 1}` })),
            defaultValue: "5",
          },
        ],
      },
      {
        id: "payments-in-transit",
        title: "Payments in Transit",
        description: "Control how payments in transit are handled when periods are locked.",
        fields: [
          {
            type: "toggle",
            id: "deposit-payments-in-transit",
            label: "Deposit Payments in Transit When Periods are Locked",
            description: "Eliminates payments in transit in month-end reports by automatically depositing them when the period is locked.",
            defaultValue: false,
          },
        ],
      },
    ],
  },
  "Rebuild Renewal Offers When Pricing Changes": {
    module: "Renewals · Pricing Management",
    headline: "Auto-Rebuild Renewal Offers on Pricing Changes",
    description:
      "This agent automates the rebuilding of renewal offers whenever your rent pricing or any other pricing (e.g. fees, pet rent, parking charges, etc.) changes. Ensures residents always see current pricing until they lock in their renewal.",
    settingsGroups: [
      {
        id: "rebuild-scope",
        title: "Renewal Offer Rebuild Scope",
        description: "Choose which pending renewal offers should be rebuilt when pricing changes occur.",
        fields: [
          {
            type: "radio",
            id: "rebuild-option",
            label: "Which pending renewals should be rebuilt from pricing changes?",
            description: "Select which renewal offers are automatically updated when rent or other pricing changes at this property.",
            options: [
              { label: "Renewal offers that have not yet been accepted", value: "not_accepted" },
              { label: "Renewal offers that have not yet been accepted and approved", value: "not_accepted_approved" },
              { label: "Renewal offers that have not yet signed their renewal lease", value: "not_signed" },
            ],
            defaultValue: "not_accepted",
          },
        ],
      },
    ],
  },
  "L2 Bundled Settings Agent Template Example": {
    module: "Template · Reusable Components",
    headline: "L2 Bundled Settings Agent — Component Reference",
    description:
      "This is a reference template for teams building new L2 bundled-settings agents. Each settings group below demonstrates a different field component type. Use these patterns when defining your agent's per-property configuration.",
    settingsGroups: [
      {
        id: "toggle-example",
        title: "Toggle (On / Off Switch)",
        description: "A boolean switch for enabling or disabling a feature. Use when the setting is a simple on/off decision.",
        fields: [
          {
            type: "toggle",
            id: "example-toggle",
            label: "Enable This Feature",
            description: "Toggles a feature on or off for this property. Renders as a switch component.",
            defaultValue: true,
          },
          {
            type: "toggle",
            id: "example-toggle-off",
            label: "Secondary Toggle (Default Off)",
            description: "Another toggle example — this one defaults to off.",
            defaultValue: false,
          },
        ],
      },
      {
        id: "select-example",
        title: "Select (Dropdown)",
        description: "A dropdown menu for choosing one value from a predefined list. Use when there are many options and only one can be selected.",
        fields: [
          {
            type: "select",
            id: "example-select",
            label: "Choose a Day of the Month",
            description: "Dropdown with numeric options. Common for scheduling settings (e.g. 'post on day X').",
            options: Array.from({ length: 31 }, (_, i) => ({ label: `${i + 1}`, value: `${i + 1}` })),
            defaultValue: "1",
          },
          {
            type: "select",
            id: "example-select-text",
            label: "Choose a Category",
            description: "Dropdown with text options. Common for classification or grouping settings.",
            options: [
              { label: "Conventional", value: "conventional" },
              { label: "Affordable", value: "affordable" },
              { label: "Student", value: "student" },
              { label: "Senior Living", value: "senior" },
              { label: "Mixed Use", value: "mixed_use" },
            ],
            defaultValue: "conventional",
          },
        ],
      },
      {
        id: "number-example",
        title: "Number Input",
        description: "A numeric input field with optional min/max constraints and a unit suffix. Use for quantities, thresholds, or day counts.",
        fields: [
          {
            type: "number",
            id: "example-number-days",
            label: "Number of Days",
            description: "Numeric input with a 'days' suffix and min/max constraints.",
            defaultValue: 30,
            min: 1,
            max: 365,
            suffix: "days",
          },
          {
            type: "number",
            id: "example-number-percentage",
            label: "Percentage Threshold",
            description: "Numeric input with a '%' suffix — useful for rate or threshold settings.",
            defaultValue: 85,
            min: 0,
            max: 100,
            suffix: "%",
          },
          {
            type: "number",
            id: "example-number-plain",
            label: "Maximum Retry Count",
            description: "Plain numeric input with no suffix.",
            defaultValue: 3,
            min: 1,
            max: 10,
          },
        ],
      },
      {
        id: "radio-example",
        title: "Radio Buttons (Single Select)",
        description: "A set of radio buttons for choosing one option from a short list. Use when there are 2–5 mutually exclusive choices that benefit from being visible at once.",
        fields: [
          {
            type: "radio",
            id: "example-radio",
            label: "Assignment Method",
            description: "Radio group with descriptive option labels. Each option is always visible.",
            options: [
              { label: "Manual — Staff manually handles this task", value: "manual" },
              { label: "Semi-Automated — Agent prepares, staff approves", value: "semi" },
              { label: "Fully Automated — Agent handles end-to-end", value: "auto" },
            ],
            defaultValue: "semi",
          },
          {
            type: "radio",
            id: "example-radio-simple",
            label: "Notification Frequency",
            description: "Radio group with short, simple labels.",
            options: [
              { label: "Immediately", value: "immediate" },
              { label: "Daily digest", value: "daily" },
              { label: "Weekly summary", value: "weekly" },
              { label: "Never", value: "never" },
            ],
            defaultValue: "daily",
          },
        ],
      },
      {
        id: "text-example",
        title: "Text Input",
        description: "A single-line text field for freeform short text. Use for names, labels, email addresses, or other short string values.",
        fields: [
          {
            type: "text",
            id: "example-text",
            label: "Custom Label",
            description: "A freeform text input — useful for names, labels, or short identifiers.",
            defaultValue: "",
            placeholder: "Enter a custom label…",
          },
          {
            type: "text",
            id: "example-text-prefilled",
            label: "Notification Email Address",
            description: "Text input with a prefilled default value.",
            defaultValue: "admin@property.com",
            placeholder: "email@example.com",
          },
        ],
      },
      {
        id: "textarea-example",
        title: "Text Area (Multi-line)",
        description: "A multi-line text area for longer freeform content. Use for notes, instructions, custom messages, or override text.",
        fields: [
          {
            type: "textarea",
            id: "example-textarea",
            label: "Custom Instructions",
            description: "Multi-line text area for longer content like agent instructions or override messages.",
            defaultValue: "",
            placeholder: "Enter custom instructions for this agent…",
            rows: 4,
          },
        ],
      },
      {
        id: "date-example",
        title: "Date Picker",
        description: "A native date input for selecting a specific date. Use for deadlines, start dates, or cutoff dates.",
        fields: [
          {
            type: "date",
            id: "example-date",
            label: "Effective Start Date",
            description: "Date picker for selecting when a setting or feature takes effect.",
            defaultValue: "2026-06-01",
          },
          {
            type: "date",
            id: "example-date-end",
            label: "Expiration Date",
            description: "Date picker for selecting an end or cutoff date.",
            defaultValue: "",
          },
        ],
      },
      {
        id: "checkbox-example",
        title: "Checkbox (Confirmation / Acknowledgment)",
        description: "A single checkbox for opt-in confirmations or acknowledgments. Different from a toggle — use when the user is confirming or agreeing to something.",
        fields: [
          {
            type: "checkbox",
            id: "example-checkbox",
            label: "I confirm this agent should run unattended",
            description: "Checkbox for explicit user confirmation or acknowledgment.",
            defaultValue: false,
          },
          {
            type: "checkbox",
            id: "example-checkbox-checked",
            label: "Send email notifications when agent completes a run",
            description: "Checkbox that defaults to checked.",
            defaultValue: true,
          },
        ],
      },
      {
        id: "multi-select-example",
        title: "Multi-Select (Checkboxes)",
        description: "A group of checkboxes allowing multiple selections. Use when users need to pick one or more items from a list.",
        fields: [
          {
            type: "multi-select",
            id: "example-multi-select",
            label: "Applicable Charge Types",
            description: "Multi-select checkbox group — users can select any combination of options.",
            options: [
              { label: "Base Rent", value: "base_rent" },
              { label: "Pet Rent", value: "pet_rent" },
              { label: "Parking", value: "parking" },
              { label: "Storage", value: "storage" },
              { label: "Utilities", value: "utilities" },
              { label: "Late Fees", value: "late_fees" },
            ],
            defaultValue: ["base_rent", "pet_rent"],
          },
        ],
      },
    ],
  },
  "Auto Generate Renewal Offers": {
    module: "Renewals · Offer Management",
    headline: "Automate Renewal Offer Generation & Management",
    description:
      "This agent automatically generates renewal offers ahead of lease expirations, manages renewal pricing and charge updates, controls approval workflows, and handles month-to-month options — eliminating manual renewal offer creation and management across your entire portfolio.",
    settingsGroups: [
      {
        id: "renewal-generation",
        title: "Renewal Offer Generation",
        description: "Control when and how renewal offers are automatically created for expiring leases.",
        fields: [
          {
            type: "toggle",
            id: "auto-generate-renewals",
            label: "Automatically Generate Renewal Offers",
            description: "When enabled, the agent will create renewal offers for leases approaching expiration.",
            defaultValue: true,
          },
          {
            type: "number",
            id: "renewal-lead-days",
            label: "Days Before Lease End Date",
            description: "How many days before the lease end date do you want renewal offers to be generated?",
            defaultValue: 90,
            min: 1,
            max: 365,
            suffix: "days",
          },
        ],
      },
      {
        id: "renewal-pricing",
        title: "Renewal Pricing",
        description: "Define how charges are updated on renewal offers.",
        fields: [
          {
            type: "radio",
            id: "renewal-charge-scope",
            label: "Renewal Charge Updates",
            description: "Do you want all renewal charges (e.g. pet rent, parking, fees, etc.) to be updated to current pricing, or only base rent?",
            options: [
              { label: "Only Base Rent", value: "base_rent_only" },
              { label: "All Charges", value: "all_charges" },
            ],
            defaultValue: "base_rent_only",
          },
        ],
      },
      {
        id: "renewal-approval",
        title: "Renewal Approval & Delivery",
        description: "Control whether renewal offers require approval before being sent to residents.",
        fields: [
          {
            type: "toggle",
            id: "require-approval",
            label: "Require Approval Before Sending",
            description: "Do you want to approve auto-generated renewal offers before they are sent to residents?",
            defaultValue: false,
          },
          {
            type: "radio",
            id: "renewal-expiration",
            label: "Renewal Offer Expiration",
            description: "When should auto-generated renewal offers expire?",
            options: [
              { label: "Lease End Date", value: "lease_end" },
              { label: "The earlier of the lease end date or a set number of days", value: "earlier_of" },
            ],
            defaultValue: "lease_end",
          },
          {
            type: "number",
            id: "renewal-expiration-days",
            label: "Expiration Days (if using earlier-of rule)",
            description: "Number of days after which the renewal offer expires, if earlier than the lease end date.",
            defaultValue: 30,
            min: 1,
            max: 365,
            suffix: "days",
          },
        ],
      },
      {
        id: "pricing-updates",
        title: "Pending Offer Price Updates",
        description: "Define whether pending renewal offers should be updated when pricing changes.",
        fields: [
          {
            type: "radio",
            id: "update-pending-offers",
            label: "Update Pending Offers on Price Change",
            description: "If your pricing changes, should pending renewal offers be updated?",
            options: [
              { label: "No", value: "no" },
              { label: "Yes, but only offers not yet accepted", value: "not_accepted" },
              { label: "Yes, but only offers not yet accepted and approved", value: "not_accepted_approved" },
              { label: "Yes, but only offers where the renewal lease has not yet been signed", value: "not_signed" },
            ],
            defaultValue: "no",
          },
        ],
      },
      {
        id: "month-to-month",
        title: "Month-to-Month Options",
        description: "Configure whether month-to-month is offered as a renewal option.",
        fields: [
          {
            type: "toggle",
            id: "show-mtm",
            label: "Show Month-to-Month as a Renewal Option",
            description: "Do you want to show month-to-month as an option in your renewal offers?",
            defaultValue: false,
          },
        ],
      },
    ],
  },
};

export function getL3AgentConfig(agentName: string): L3AgentConfig | undefined {
  return L3_AGENT_CONFIGS[agentName];
}

// ---------------------------------------------------------------------------
// Property data for the L3 flyout
// ---------------------------------------------------------------------------

const L3_PROPERTIES = [
  { id: "p1", name: "Harvest Peak Capital", vertical: "Conventional", units: 312 },
  { id: "p2", name: "Skyline Apartments", vertical: "Conventional", units: 248 },
  { id: "p3", name: "The Meridian", vertical: "Affordable", units: 196 },
  { id: "p4", name: "Oakwood Village", vertical: "Conventional", units: 284 },
  { id: "p5", name: "Pine Ridge Estates", vertical: "Senior Living", units: 164 },
  { id: "p6", name: "Campus View", vertical: "Student", units: 420 },
  { id: "p7", name: "Metro Heights", vertical: "Mixed Use", units: 198 },
  { id: "p8", name: "Lakeside Commons", vertical: "Conventional", units: 356 },
  { id: "p9", name: "Heritage Place", vertical: "Affordable", units: 224 },
  { id: "p10", name: "Summit Towers", vertical: "Conventional", units: 440 },
];

// ---------------------------------------------------------------------------
// Main L3 Agent Sheet component
// ---------------------------------------------------------------------------

const TEMPLATE_AGENT_NAME = "L2 Bundled Settings Agent Template Example";

export function L3AgentSheet({
  agent,
  open,
  onOpenChange,
  onToggle,
  onVideoClick,
}: {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (status: string) => void;
  onVideoClick?: (agentName: string) => void;
}) {
  const config = L3_AGENT_CONFIGS[agent.name];
  const isTemplate = agent.name === TEMPLATE_AGENT_NAME;
  const [introOpen, setIntroOpen] = useState(isTemplate);

  if (!config) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!introOpen) onOpenChange(v); }}>
      <SheetContent className="w-full flex flex-col overflow-hidden p-0 sm:max-w-[75vw]">
        <SheetHeader className="sr-only">
          <SheetTitle>{agent.name}</SheetTitle>
          <SheetDescription>{agent.bucket}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 min-h-0 overflow-hidden">
          <L3AgentFlyoutContent
            agent={agent}
            config={config}
            onToggle={onToggle}
            onVideoClick={onVideoClick}
          />
        </div>
      </SheetContent>

      {isTemplate && (
        <Dialog open={introOpen} onOpenChange={setIntroOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col" onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="text-lg">L2 Bundled Settings Agent — Template Reference</DialogTitle>
              <DialogDescription className="sr-only">How to use this template</DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 text-sm text-foreground leading-relaxed pr-1">
              <p>
                This is <strong>not a real agent</strong> — it is a reusable reference template that demonstrates the standard pattern for building <strong>L2 Bundled Settings Agents</strong> in the Agent Roster.
              </p>

              <div>
                <h3 className="font-semibold mb-1">What is an L2 Bundled Settings Agent?</h3>
                <p className="text-muted-foreground">
                  Within Entrata, there are fully autonomous workflows and automations that already exist across different modules. An L2 Bundled Settings Agent groups or bundles the related settings for these autonomous flows into a single, consistent experience in the Agent Roster. The purpose of this bundling is to make it easy for users to discover, enable, and configure these autonomous workflows per property — without needing to navigate to multiple places across Entrata. When a user turns on an L2 agent for a property, they are enabling an autonomous flow that runs without manual intervention.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-1">Architecture of the flyout</h3>
                <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                  <li>
                    <strong className="text-foreground">Portfolio view</strong> — a property table showing every property with its current status: <em>Agent</em> (automated) or <em>Manual</em> (human-managed). Includes a bulk "Turn on/off all" action.
                  </li>
                  <li>
                    <strong className="text-foreground">Per-property Configure screen</strong> — clicking "Configure" on any property row opens that property's settings. An Agent / Manual toggle at the top controls whether automation is active. Below it, collapsible settings groups contain the individual fields.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-1">Available setting components</h3>
                <p className="text-muted-foreground mb-2">
                  This template showcases every field type available for per-property configuration. Each settings group in the Configure screen demonstrates a different component:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li><strong className="text-foreground">Toggle</strong> — on/off switch for boolean settings</li>
                  <li><strong className="text-foreground">Select (Dropdown)</strong> — pick one value from a list</li>
                  <li><strong className="text-foreground">Number Input</strong> — numeric value with optional min/max and suffix</li>
                  <li><strong className="text-foreground">Radio Buttons</strong> — choose one from a few visible options</li>
                  <li><strong className="text-foreground">Text Input</strong> — freeform short text</li>
                  <li><strong className="text-foreground">Text Area</strong> — multi-line freeform content</li>
                  <li><strong className="text-foreground">Date Picker</strong> — select a specific date</li>
                  <li><strong className="text-foreground">Checkbox</strong> — confirmation or opt-in acknowledgment</li>
                  <li><strong className="text-foreground">Multi-Select (Checkboxes)</strong> — pick multiple items from a list</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-1">How teams should use this</h3>
                <p className="text-muted-foreground">
                  Each product team that builds a new L2 agent owns the settings displayed on the Configure screen. Those settings should be <strong>pulled from and synced with</strong> wherever they already exist in Entrata — the Agent Roster is a surface for configuration, not the source of truth. Teams define their settings groups and fields in the agent config registry, and the shared flyout framework handles rendering, per-property state, and the Agent/Manual toggle automatically.
                </p>
              </div>
            </div>
            <DialogFooter className="shrink-0 pt-4 border-t border-border mt-2">
              <Button onClick={() => setIntroOpen(false)}>
                Explore the template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Flyout content
// ---------------------------------------------------------------------------

function L3AgentFlyoutContent({
  agent,
  config,
  onToggle,
  onVideoClick,
}: {
  agent: Agent;
  config: L3AgentConfig;
  onToggle: (status: string) => void;
  onVideoClick?: (agentName: string) => void;
}) {
  const isActive = agent.status === "Active";
  const [propertyStatuses, setPropertyStatuses] = useState<Record<string, "Active" | "Off">>(() => {
    const init: Record<string, "Active" | "Off"> = {};
    L3_PROPERTIES.forEach((p) => { init[p.id] = p.name === "The Meridian" ? "Off" : "Active"; });
    return init;
  });
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [showTurnOnAllConfirm, setShowTurnOnAllConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedProperty, setSavedProperty] = useState<string | null>(null);

  const allActive = Object.values(propertyStatuses).every((s) => s === "Active");

  const filteredProperties = useMemo(() =>
    L3_PROPERTIES.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery]
  );

  const handlePropertyToggle = (propId: string) => {
    const newStatus = propertyStatuses[propId] === "Active" ? "Off" : "Active";
    setPropertyStatuses((prev) => ({ ...prev, [propId]: newStatus }));
    setSavedProperty(propId);
    setTimeout(() => setSavedProperty((cur) => cur === propId ? null : cur), 1500);
  };

  if (selectedPropertyId) {
    const prop = L3_PROPERTIES.find((p) => p.id === selectedPropertyId);
    if (!prop) return null;
    return (
      <PropertySettingsView
        agentName={agent.name}
        property={prop}
        config={config}
        onBack={() => setSelectedPropertyId(null)}
        onStatusChange={(status) => setPropertyStatuses((prev) => ({ ...prev, [selectedPropertyId]: status }))}
        initialActive={propertyStatuses[selectedPropertyId] === "Active"}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-8 pt-6 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 mt-0.5">
              <img src="/eli-cube.svg" alt="" width={22} height={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg font-bold text-foreground">{agent.name}</h1>
                <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  L2 · Operational Efficiency
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isActive ? "bg-[#B3FFCC] text-black" : "bg-zinc-200 text-zinc-500"}`}>
                  {isActive ? "Active" : "Off"}
                </span>
              </div>
              {/* Module */}
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Module</span>
                <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground">{config.module}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onToggle(isActive ? "Off" : "Active")}
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
      </div>

      {/* Scrollable body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6 space-y-6">
        {/* Description */}
        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <h2 className="text-sm font-semibold text-foreground mb-1">{config.headline}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{config.description}</p>
        </div>

        {/* Video walkthrough */}
        {onVideoClick && (
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg border border-border bg-white px-4 py-3 text-left transition-colors hover:bg-muted/30"
            onClick={() => onVideoClick(agent.name)}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <CirclePlay className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Watch Agent Walkthrough</p>
              <p className="text-xs text-muted-foreground">See how this agent automates work step by step</p>
            </div>
          </button>
        )}

        {/* Navigate to Entrata */}
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg border border-border bg-white px-4 py-3 text-left transition-colors hover:bg-muted/30"
        >
          <span className="text-sm font-medium text-foreground">Navigate to {config.module.split("·")[0].trim()} in Entrata</span>
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </button>


        {/* Property Configuration */}
        <div className="rounded-xl border border-border bg-white">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground">Property Configuration</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Activate this agent per property and configure settings for each. Click a property row to open its settings.
            </p>
          </div>
          <div className="px-5 pt-3 pb-1">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search properties…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300 bg-white"
              />
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Property</th>
                  <th className="pb-2 font-medium text-muted-foreground">Vertical</th>
                  <th className="pb-2 font-medium text-muted-foreground text-center">Units</th>
                  <th className="pb-2 font-medium text-muted-foreground text-center">Status</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Settings</th>
                </tr>
              </thead>
              <tbody>
                {filteredProperties.map((prop) => {
                  const propStatus = propertyStatuses[prop.id];
                  const propIsActive = propStatus === "Active";
                  const justSaved = savedProperty === prop.id;
                  return (
                    <tr key={prop.id} className="border-b border-border/50 hover:bg-zinc-50 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${propIsActive ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                          <span className="font-medium text-foreground">{prop.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">{prop.vertical}</td>
                      <td className="py-3 text-center text-muted-foreground">{prop.units}</td>
                      <td className="py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {propIsActive ? (
                            <div className="flex items-center gap-1.5">
                              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#7c3aed]/10">
                                <img src="/eli-cube.svg" alt="" width={14} height={14} />
                              </div>
                              <span className="text-xs font-semibold text-[#7c3aed]">Agent</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-100">
                                <Users className="h-3.5 w-3.5 text-zinc-500" />
                              </div>
                              <span className="text-xs font-medium text-zinc-500">Manual</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedPropertyId(prop.id)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-zinc-100 cursor-pointer"
                        >
                          <Settings className="h-3.5 w-3.5" />
                          Configure
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredProperties.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-muted-foreground">No properties match your search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bulk Action — hidden for template agent */}
        {agent.name !== TEMPLATE_AGENT_NAME && (
          <div className="rounded-xl border border-border bg-muted/30 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">All Properties</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {allActive
                    ? "This agent is currently active on all properties. Turn off to disable across your entire portfolio."
                    : "Enable this agent across all properties at once."}
                </p>
              </div>
              <Button
                variant={allActive ? "destructive" : "default"}
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => setShowTurnOnAllConfirm(true)}
              >
                <Power className="h-3.5 w-3.5" />
                {allActive ? "Turn off all" : "Turn on all"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk confirm dialog */}
      <Dialog open={showTurnOnAllConfirm} onOpenChange={setShowTurnOnAllConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{allActive ? "Turn off" : "Turn on"} {agent.name}?</DialogTitle>
            <DialogDescription>
              You are {allActive ? "turning off" : "turning on"} {agent.name} for all properties. This will {allActive ? "stop" : "start"} the agent across every property in your portfolio.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowTurnOnAllConfirm(false)}>No, cancel</Button>
            <Button
              onClick={() => {
                const newStatus: "Active" | "Off" = allActive ? "Off" : "Active";
                setPropertyStatuses((prev) => {
                  const updated: Record<string, "Active" | "Off"> = {};
                  for (const key of Object.keys(prev)) updated[key] = newStatus;
                  return updated;
                });
                onToggle(newStatus);
                setShowTurnOnAllConfirm(false);
              }}
            >
              Yes, {allActive ? "turn off" : "turn on"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-property settings view
// ---------------------------------------------------------------------------

function PropertySettingsView({
  agentName,
  property,
  config,
  onBack,
  onStatusChange,
  initialActive = true,
}: {
  agentName: string;
  property: typeof L3_PROPERTIES[number];
  config: L3AgentConfig;
  onBack: () => void;
  onStatusChange: (status: "Active" | "Off") => void;
  initialActive?: boolean;
}) {
  const [agentEnabled, setAgentEnabled] = useState(initialActive);
  const [values, setValues] = useState<Record<string, string | number | boolean | string[]>>(() => {
    const init: Record<string, string | number | boolean | string[]> = {};
    config.settingsGroups.forEach((group) => {
      group.fields.forEach((field) => {
        init[field.id] = field.defaultValue;
      });
    });
    return init;
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(config.settingsGroups.map((g) => g.id))
  );
  const [saveToast, setSaveToast] = useState(false);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateValue = (id: string, value: string | number | boolean | string[]) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleToggleAgent = () => {
    const next = !agentEnabled;
    setAgentEnabled(next);
    onStatusChange(next ? "Active" : "Off");
  };

  const handleSave = () => {
    onStatusChange(agentEnabled ? "Active" : "Off");
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-8 pt-5 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to all properties
        </button>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-foreground">{property.name}</h2>
              <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{property.vertical}</span>
              <span className="text-[11px] text-muted-foreground">{property.units} units</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {agentName} settings for this property
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saveToast && (
              <span className="text-xs font-medium text-emerald-600 animate-in fade-in duration-300">Saved</span>
            )}
            <Button size="sm" className="gap-1.5" onClick={handleSave}>
              <Save className="h-3.5 w-3.5" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Agent / Manual toggle */}
      <div className="shrink-0 border-b border-border px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {agentEnabled ? (
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7c3aed]/10">
                  <img src="/eli-cube.svg" alt="" width={16} height={16} />
                </div>
                <span className="text-sm font-semibold text-[#7c3aed]">Agent</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100">
                  <Users className="h-4 w-4 text-zinc-500" />
                </div>
                <span className="text-sm font-semibold text-zinc-500">Manual</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleToggleAgent}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
              agentEnabled ? "bg-[#7c3aed]" : "bg-zinc-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                agentEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        {!agentEnabled && (
          <p className="mt-2 text-xs text-muted-foreground">
            This property is managed manually. Toggle to Agent to automate this workflow.
          </p>
        )}
      </div>

      {/* Settings groups */}
      <div className={`flex-1 min-h-0 overflow-y-auto px-8 py-6 space-y-4 ${!agentEnabled ? "opacity-50 pointer-events-none" : ""}`}>
        {config.settingsGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.id);
          return (
            <div key={group.id} className="rounded-xl border border-border bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
              >
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 ml-4" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-4" />
                )}
              </button>
              {isExpanded && (
                <div className="border-t border-border px-5 py-4 space-y-5">
                  {group.fields.map((field) => (
                    <SettingFieldRenderer
                      key={field.id}
                      field={field}
                      value={values[field.id]}
                      onChange={(val) => updateValue(field.id, val)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Setting field renderer
// ---------------------------------------------------------------------------

function SettingFieldRenderer({
  field,
  value,
  onChange,
}: {
  field: SettingField;
  value: string | number | boolean | string[];
  onChange: (value: string | number | boolean | string[]) => void;
}) {
  switch (field.type) {
    case "toggle":
      return (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{field.label}</p>
            {field.description && <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>}
          </div>
          <button
            type="button"
            onClick={() => onChange(!value)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${value ? "bg-emerald-500" : "bg-zinc-300"}`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-[22px]" : "translate-x-[3px]"}`} />
          </button>
        </div>
      );

    case "select":
      return (
        <div>
          <p className="text-sm font-medium text-foreground">{field.label}</p>
          {field.description && <p className="text-xs text-muted-foreground mt-0.5 mb-2">{field.description}</p>}
          <select
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-full max-w-[12rem] rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-300"
          >
            {field.options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );

    case "number":
      return (
        <div>
          <p className="text-sm font-medium text-foreground">{field.label}</p>
          {field.description && <p className="text-xs text-muted-foreground mt-0.5 mb-2">{field.description}</p>}
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={value as number}
              min={field.min}
              max={field.max}
              onChange={(e) => onChange(parseInt(e.target.value) || field.defaultValue)}
              className="h-9 w-24 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-300"
            />
            {field.suffix && <span className="text-sm text-muted-foreground">{field.suffix}</span>}
          </div>
        </div>
      );

    case "radio":
      return (
        <div>
          <p className="text-sm font-medium text-foreground">{field.label}</p>
          {field.description && <p className="text-xs text-muted-foreground mt-0.5 mb-2.5">{field.description}</p>}
          <div className="space-y-2">
            {field.options.map((opt) => (
              <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name={field.id}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={() => onChange(opt.value)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-zinc-900"
                />
                <span className="text-sm text-foreground group-hover:text-foreground/80 leading-snug">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      );

    case "text":
      return (
        <div>
          <p className="text-sm font-medium text-foreground">{field.label}</p>
          {field.description && <p className="text-xs text-muted-foreground mt-0.5 mb-2">{field.description}</p>}
          <input
            type="text"
            value={value as string}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-full max-w-md rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </div>
      );

    case "textarea":
      return (
        <div>
          <p className="text-sm font-medium text-foreground">{field.label}</p>
          {field.description && <p className="text-xs text-muted-foreground mt-0.5 mb-2">{field.description}</p>}
          <textarea
            value={value as string}
            placeholder={field.placeholder}
            rows={field.rows ?? 3}
            onChange={(e) => onChange(e.target.value)}
            className="w-full max-w-md rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </div>
      );

    case "date":
      return (
        <div>
          <p className="text-sm font-medium text-foreground">{field.label}</p>
          {field.description && <p className="text-xs text-muted-foreground mt-0.5 mb-2">{field.description}</p>}
          <input
            type="date"
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-full max-w-[12rem] rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </div>
      );

    case "checkbox":
      return (
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={value as boolean}
            onChange={(e) => onChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-zinc-900"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground group-hover:text-foreground/80">{field.label}</p>
            {field.description && <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>}
          </div>
        </label>
      );

    case "multi-select": {
      const selected = Array.isArray(value) ? value as string[] : [];
      return (
        <div>
          <p className="text-sm font-medium text-foreground">{field.label}</p>
          {field.description && <p className="text-xs text-muted-foreground mt-0.5 mb-2.5">{field.description}</p>}
          <div className="space-y-2">
            {field.options.map((opt) => {
              const isChecked = selected.includes(opt.value);
              return (
                <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      const next = isChecked
                        ? selected.filter((v) => v !== opt.value)
                        : [...selected, opt.value];
                      onChange(next);
                    }}
                    className="h-4 w-4 shrink-0 rounded border-border accent-zinc-900"
                  />
                  <span className="text-sm text-foreground group-hover:text-foreground/80">{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

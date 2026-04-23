"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Task } from "@/lib/escalations-context";

/* ─────────────────────────────── Types ──────────────────────────────── */

export type PlaybookPriority = "P0" | "P1" | "P2" | "P3";

export type PlaybookStatus = "In Progress" | "On Hold" | "Completed" | "Due Today" | "Overdue";

export type Playbook = {
  id: string;
  templateName: string;
  property: string;
  properties: string[];
  unit?: string;
  createdAt: string;
  dueAt: string;
  launchedAt: string;
  status: PlaybookStatus;
  priority: PlaybookPriority;
  assignee: string;
  description: string;
  tasks: Task[];
  sourceDocId?: string;
  recurring?: { frequency: "daily" | "weekly" | "monthly" | "quarterly" };
};

/* ─────────────────────────────── Seed Data ───────────────────────────── */

const PRIORITY_MAP: Record<string, "urgent" | "high" | "medium" | "low"> = {
  P0: "urgent", P1: "high", P2: "medium", P3: "low",
};

const STATUS_MAP: Record<string, string> = {
  "Not Started": "Open",
  "In Progress": "In progress",
  "Completed": "Done",
  "Blocked": "Blocked",
};

const _now = new Date().toISOString();
const _today = new Date(new Date().setHours(23, 59, 59, 0)).toISOString();
const _tomorrow = new Date(Date.now() + 86_400_000).toISOString();

function t(
  id: string, name: string, priority: string, due: "Today" | "Tomorrow",
  status: string, assignee: string, property: string, unit: string, category: string,
): Task {
  return {
    id, name, type: "workflow", summary: name, category, property,
    status: STATUS_MAP[status] ?? status,
    assignee,
    priority: PRIORITY_MAP[priority] ?? "medium",
    dueAt: due === "Today" ? _today : _tomorrow,
    unit: unit || undefined,
    createdAt: _now,
  };
}

const INITIAL_PLAYBOOKS: Playbook[] = [
  {
    id: "pb-1",
    templateName: "Burst Pipe",
    property: "Summit Park",
    properties: ["Summit Park"],
    createdAt: "2025-09-01",
    dueAt: "2024-10-31",
    launchedAt: "2025-09-01",
    status: "Due Today",
    priority: "P0",
    assignee: "Jayion Korsgaard",
    description: "This playbook outlines the steps for successful action when there has been a burst pipe on the property.",
    tasks: [
      t("t-1-1", "Work Order", "P2", "Today", "In Progress", "Hillary Gonzalez", "Summit Park", "34-A", "Vendor"),
      t("t-1-2", "Work Order", "P1", "Today", "In Progress", "Marcus Herwitz", "Summit Park", "34-B", "Resident"),
      t("t-1-3", "Resident Communication", "P1", "Today", "Completed", "Hillary Gonzalez", "Summit Park", "34-B", "Resident"),
      t("t-1-4", "Resident Communication", "P1", "Today", "Completed", "Marcus Herwitz", "Summit Park", "34-B", "Resident"),
      t("t-1-5", "PO Approval", "P1", "Today", "Completed", "", "Summit Park", "34-A, +2", "Teammate"),
      t("t-1-6", "Asset Manager Sign Off", "P1", "Today", "Completed", "", "Summit Park", "34-A, +2", "Vendor"),
      t("t-1-7", "Collect Bids", "P3", "Today", "Completed", "", "Summit Park", "34-A, +2", "Vendor"),
      t("t-1-8", "File Insurance Claim", "P3", "Tomorrow", "Completed", "", "Summit Park", "34-A, +2", "Vendor"),
      t("t-1-9", "Contact Region Manager", "P1", "Tomorrow", "Completed", "", "Summit Park", "34-A, +2", "Teammate"),
      t("t-1-10", "Schedule Plumber", "P0", "Today", "Completed", "Hillary Gonzalez", "Summit Park", "34-A", "Vendor"),
      t("t-1-11", "Emergency Shutoff", "P0", "Today", "Completed", "Marcus Herwitz", "Summit Park", "34-A", "Teammate"),
      t("t-1-12", "Notify Insurance", "P1", "Today", "Completed", "", "Summit Park", "34-A", "Teammate"),
      t("t-1-13", "Document Damage", "P1", "Today", "Completed", "Hillary Gonzalez", "Summit Park", "34-A, +2", "Teammate"),
      t("t-1-14", "Temporary Relocation", "P2", "Today", "Completed", "Marcus Herwitz", "Summit Park", "34-B", "Resident"),
      t("t-1-15", "Follow-up Inspection", "P2", "Tomorrow", "Not Started", "", "Summit Park", "34-A", "Vendor"),
      t("t-1-16", "Close Out Report", "P3", "Tomorrow", "Not Started", "", "Summit Park", "34-A, +2", "Teammate"),
    ],
  },
  {
    id: "pb-2",
    templateName: "Monthly Region Coordination",
    property: "Summit Park +6",
    properties: ["Summit Park", "Cambridge Suites", "Gateway Arch", "Victoria Place", "Sun Valley", "Azure Heights", "Maple Ridge"],
    createdAt: "2025-12-07",
    dueAt: "2025-12-31",
    launchedAt: "2025-12-07",
    status: "Due Today",
    priority: "P1",
    assignee: "",
    description: "Monthly coordination playbook ensuring all regional properties complete financial reporting, maintenance audits, and compliance checks on schedule.",
    tasks: [
      t("t-2-1", "Financial Report Review", "P1", "Today", "Completed", "Angela Park", "Summit Park", "", "Teammate"),
      t("t-2-2", "Maintenance Audit", "P1", "Today", "In Progress", "Carlos Reyes", "Cambridge Suites", "", "Teammate"),
      t("t-2-3", "Compliance Checklist", "P2", "Today", "Not Started", "", "Gateway Arch", "", "Teammate"),
      t("t-2-4", "Budget Variance Review", "P1", "Tomorrow", "Not Started", "Angela Park", "Victoria Place", "", "Teammate"),
      t("t-2-5", "Staff Meeting Notes", "P3", "Tomorrow", "Completed", "Carlos Reyes", "Sun Valley", "", "Teammate"),
      t("t-2-6", "Vendor Contract Review", "P1", "Today", "In Progress", "", "Azure Heights", "", "Vendor"),
      t("t-2-7", "Occupancy Report", "P1", "Today", "Completed", "Angela Park", "Maple Ridge", "", "Teammate"),
      t("t-2-8", "Capital Projects Update", "P2", "Tomorrow", "Not Started", "", "Summit Park", "", "Teammate"),
      t("t-2-9", "Resident Satisfaction Review", "P2", "Today", "Completed", "Carlos Reyes", "Cambridge Suites", "", "Resident"),
      t("t-2-10", "Insurance Renewal Check", "P1", "Today", "In Progress", "", "Gateway Arch", "", "Teammate"),
      t("t-2-11", "Safety Inspection Log", "P1", "Today", "Completed", "Angela Park", "Victoria Place", "", "Teammate"),
      t("t-2-12", "Marketing Spend Review", "P3", "Tomorrow", "Not Started", "", "Sun Valley", "", "Teammate"),
      t("t-2-13", "Utility Cost Analysis", "P2", "Today", "Completed", "Carlos Reyes", "Azure Heights", "", "Teammate"),
      t("t-2-14", "Lease Renewal Summary", "P1", "Today", "In Progress", "Angela Park", "Maple Ridge", "", "Resident"),
      t("t-2-15", "Regional Summary Report", "P0", "Tomorrow", "Not Started", "", "Summit Park", "", "Teammate"),
      t("t-2-16", "Action Items Follow-up", "P1", "Tomorrow", "Not Started", "", "Summit Park", "", "Teammate"),
    ],
  },
  {
    id: "pb-3",
    templateName: "End of Year",
    property: "Cambridge Suites",
    properties: ["Cambridge Suites"],
    createdAt: "2025-12-31",
    dueAt: "2025-12-31",
    launchedAt: "2025-12-31",
    status: "Due Today",
    priority: "P1",
    assignee: "",
    description: "Year-end closeout procedures including financial reconciliation, lease renewals, and annual reporting requirements.",
    tasks: [
      t("t-3-1", "Year-End Financial Close", "P0", "Today", "In Progress", "Angela Park", "Cambridge Suites", "", "Teammate"),
      t("t-3-2", "Outstanding Balance Review", "P1", "Today", "Completed", "Carlos Reyes", "Cambridge Suites", "", "Teammate"),
      t("t-3-3", "Vendor Payment Reconciliation", "P1", "Today", "Completed", "", "Cambridge Suites", "", "Vendor"),
      t("t-3-4", "Lease Expiration Report", "P2", "Today", "In Progress", "Angela Park", "Cambridge Suites", "", "Teammate"),
      t("t-3-5", "Annual Compliance Filing", "P0", "Today", "Completed", "", "Cambridge Suites", "", "Teammate"),
      t("t-3-6", "Tax Document Preparation", "P1", "Today", "Completed", "Carlos Reyes", "Cambridge Suites", "", "Teammate"),
      t("t-3-7", "Insurance Policy Renewal", "P1", "Tomorrow", "Not Started", "", "Cambridge Suites", "", "Vendor"),
      t("t-3-8", "Capital Budget Planning", "P2", "Tomorrow", "Not Started", "", "Cambridge Suites", "", "Teammate"),
      t("t-3-9", "Resident Communication - Year End", "P3", "Today", "Completed", "Angela Park", "Cambridge Suites", "", "Resident"),
      t("t-3-10", "Maintenance Backlog Review", "P2", "Today", "Completed", "Carlos Reyes", "Cambridge Suites", "", "Teammate"),
      t("t-3-11", "Utility Account Audit", "P2", "Today", "In Progress", "", "Cambridge Suites", "", "Teammate"),
      t("t-3-12", "Annual Performance Reviews", "P1", "Tomorrow", "Not Started", "", "Cambridge Suites", "", "Teammate"),
      t("t-3-13", "Marketing Year-End Summary", "P3", "Tomorrow", "Completed", "Angela Park", "Cambridge Suites", "", "Teammate"),
      t("t-3-14", "Budget vs Actual Report", "P1", "Today", "Completed", "Carlos Reyes", "Cambridge Suites", "", "Teammate"),
      t("t-3-15", "New Year Prep Checklist", "P3", "Tomorrow", "Not Started", "", "Cambridge Suites", "", "Teammate"),
      t("t-3-16", "Final Walkthrough", "P2", "Tomorrow", "Not Started", "", "Cambridge Suites", "", "Teammate"),
    ],
  },
  {
    id: "pb-4",
    templateName: "Rent Week",
    property: "Gateway Arch",
    properties: ["Gateway Arch"],
    createdAt: "2025-09-18",
    dueAt: "2025-09-25",
    launchedAt: "2025-09-18",
    status: "On Hold",
    priority: "P1",
    assignee: "",
    description: "Weekly rent collection procedures including delinquency follow-ups, payment processing verification, and late fee assessments.",
    tasks: [
      t("t-4-1", "Payment Processing Check", "P0", "Today", "Completed", "Angela Park", "Gateway Arch", "", "Teammate"),
      t("t-4-2", "Delinquency Report", "P1", "Today", "Completed", "Carlos Reyes", "Gateway Arch", "", "Teammate"),
      t("t-4-3", "Late Fee Assessment", "P1", "Today", "In Progress", "Angela Park", "Gateway Arch", "", "Teammate"),
      t("t-4-4", "Resident Payment Reminder", "P2", "Today", "Completed", "", "Gateway Arch", "12-A", "Resident"),
      t("t-4-5", "Resident Payment Reminder", "P2", "Today", "Completed", "", "Gateway Arch", "18-C", "Resident"),
      t("t-4-6", "NSF Processing", "P1", "Today", "Completed", "Carlos Reyes", "Gateway Arch", "22-B", "Teammate"),
      t("t-4-7", "Payment Plan Review", "P2", "Tomorrow", "Not Started", "", "Gateway Arch", "8-D", "Resident"),
      t("t-4-8", "Ledger Reconciliation", "P1", "Tomorrow", "Not Started", "Angela Park", "Gateway Arch", "", "Teammate"),
      t("t-4-9", "Collection Notice - 3 Day", "P0", "Today", "Completed", "", "Gateway Arch", "5-A", "Resident"),
      t("t-4-10", "Eviction Filing Review", "P0", "Tomorrow", "Not Started", "", "Gateway Arch", "5-A", "Teammate"),
      t("t-4-11", "Concession Tracking", "P3", "Today", "Completed", "Carlos Reyes", "Gateway Arch", "", "Teammate"),
      t("t-4-12", "Weekly Collection Summary", "P1", "Tomorrow", "Not Started", "", "Gateway Arch", "", "Teammate"),
      t("t-4-13", "Autopay Enrollment Outreach", "P3", "Tomorrow", "Not Started", "", "Gateway Arch", "", "Resident"),
      t("t-4-14", "Move-out Balance Due", "P1", "Today", "In Progress", "Angela Park", "Gateway Arch", "3-C", "Resident"),
      t("t-4-15", "Credit Reporting Update", "P2", "Tomorrow", "Not Started", "", "Gateway Arch", "", "Teammate"),
      t("t-4-16", "Manager Sign-off", "P1", "Tomorrow", "Not Started", "", "Gateway Arch", "", "Teammate"),
    ],
  },
  {
    id: "pb-5",
    templateName: "Apartment Fire",
    property: "Cambridge Suites",
    properties: ["Cambridge Suites"],
    createdAt: "2025-09-15",
    dueAt: "2025-10-15",
    launchedAt: "2025-09-15",
    status: "In Progress",
    priority: "P0",
    assignee: "Hillary Gonzalez",
    description: "Emergency response for fire incidents including evacuation, resident safety, structural assessment, insurance, and restoration coordination.",
    tasks: [
      t("t-5-1", "Verify 911 Called", "P0", "Today", "Completed", "Hillary Gonzalez", "Cambridge Suites", "7-B", "Teammate"),
      t("t-5-2", "Evacuate Affected Units", "P0", "Today", "Completed", "Marcus Herwitz", "Cambridge Suites", "7-B, 7-A, 7-C", "Teammate"),
      t("t-5-3", "Account for All Residents", "P0", "Today", "Completed", "Hillary Gonzalez", "Cambridge Suites", "All", "Teammate"),
      t("t-5-4", "Restrict Building Access", "P0", "Today", "Completed", "Marcus Herwitz", "Cambridge Suites", "7-B", "Teammate"),
      t("t-5-5", "Notify Regional Manager", "P0", "Today", "Completed", "Hillary Gonzalez", "Cambridge Suites", "", "Teammate"),
      t("t-5-6", "Resident Communication", "P1", "Today", "Completed", "Marcus Herwitz", "Cambridge Suites", "All", "Resident"),
      t("t-5-7", "Obtain Fire Department Report", "P1", "Today", "In Progress", "Angela Park", "Cambridge Suites", "7-B", "Teammate"),
      t("t-5-8", "Structural Assessment", "P0", "Today", "In Progress", "", "Cambridge Suites", "7-B, +1", "Vendor"),
      t("t-5-9", "Document All Damage", "P1", "Today", "In Progress", "Hillary Gonzalez", "Cambridge Suites", "7-B, 7-A, 7-C", "Teammate"),
      t("t-5-10", "Coordinate Temporary Housing", "P1", "Today", "Completed", "Angela Park", "Cambridge Suites", "7-B", "Resident"),
      t("t-5-11", "File Insurance Claim", "P1", "Today", "In Progress", "Angela Park", "Cambridge Suites", "7-B", "Teammate"),
      t("t-5-12", "Inspect Adjacent Units", "P1", "Tomorrow", "Not Started", "", "Cambridge Suites", "7-A, 7-C, 6-B", "Vendor"),
      t("t-5-13", "Media Response Preparation", "P2", "Today", "Completed", "", "Cambridge Suites", "", "Teammate"),
      t("t-5-14", "Restoration Vendor RFP", "P1", "Tomorrow", "Not Started", "", "Cambridge Suites", "7-B", "Vendor"),
      t("t-5-15", "Code Compliance Review", "P1", "Tomorrow", "Not Started", "", "Cambridge Suites", "7-B", "Teammate"),
      t("t-5-16", "Close-out Report", "P2", "Tomorrow", "Not Started", "", "Cambridge Suites", "", "Teammate"),
    ],
  },
  {
    id: "pb-6",
    templateName: "Community Event Injury",
    property: "Cambridge Suites",
    properties: ["Cambridge Suites"],
    createdAt: "2025-12-07",
    dueAt: "2025-12-21",
    launchedAt: "2025-12-07",
    status: "On Hold",
    priority: "P1",
    assignee: "",
    description: "Incident response playbook for injuries occurring during community events, covering medical response, documentation, insurance, and liability management.",
    tasks: [
      t("t-6-1", "Incident Documentation", "P0", "Today", "Completed", "Hillary Gonzalez", "Cambridge Suites", "", "Teammate"),
      t("t-6-2", "Medical Response Verification", "P0", "Today", "Completed", "", "Cambridge Suites", "", "Teammate"),
      t("t-6-3", "Witness Statements", "P1", "Today", "Completed", "Marcus Herwitz", "Cambridge Suites", "", "Teammate"),
      t("t-6-4", "Insurance Notification", "P1", "Today", "Completed", "Angela Park", "Cambridge Suites", "", "Teammate"),
      t("t-6-5", "Photo Documentation", "P1", "Today", "Completed", "Hillary Gonzalez", "Cambridge Suites", "", "Teammate"),
      t("t-6-6", "Injured Party Follow-up", "P0", "Today", "In Progress", "Marcus Herwitz", "Cambridge Suites", "", "Resident"),
      t("t-6-7", "Legal Counsel Notification", "P1", "Today", "In Progress", "", "Cambridge Suites", "", "Teammate"),
      t("t-6-8", "Safety Review", "P1", "Tomorrow", "Not Started", "", "Cambridge Suites", "", "Teammate"),
      t("t-6-9", "Event Vendor Liability Review", "P2", "Tomorrow", "Not Started", "", "Cambridge Suites", "", "Vendor"),
      t("t-6-10", "Corrective Action Plan", "P1", "Tomorrow", "Not Started", "", "Cambridge Suites", "", "Teammate"),
      t("t-6-11", "Staff Incident Training", "P2", "Tomorrow", "Not Started", "", "Cambridge Suites", "", "Teammate"),
      t("t-6-12", "Insurance Claim Filing", "P1", "Tomorrow", "Not Started", "", "Cambridge Suites", "", "Teammate"),
      t("t-6-13", "Community Communication", "P2", "Tomorrow", "Not Started", "", "Cambridge Suites", "", "Resident"),
      t("t-6-14", "Policy Update Review", "P3", "Tomorrow", "Not Started", "", "Cambridge Suites", "", "Teammate"),
      t("t-6-15", "Risk Assessment Update", "P1", "Tomorrow", "Not Started", "", "Cambridge Suites", "", "Teammate"),
      t("t-6-16", "Incident Close-out Report", "P1", "Tomorrow", "Not Started", "", "Cambridge Suites", "", "Teammate"),
    ],
  },
  {
    id: "pb-7",
    templateName: "Rent Week",
    property: "Victoria Place",
    properties: ["Victoria Place"],
    createdAt: "2025-09-18",
    dueAt: "2025-09-25",
    launchedAt: "2025-09-18",
    status: "Due Today",
    priority: "P3",
    assignee: "",
    description: "Weekly rent collection procedures including delinquency follow-ups, payment processing verification, and late fee assessments.",
    tasks: [
      t("t-7-1", "Payment Processing Check", "P0", "Today", "Completed", "Angela Park", "Victoria Place", "", "Teammate"),
      t("t-7-2", "Delinquency Report", "P1", "Today", "Completed", "", "Victoria Place", "", "Teammate"),
      t("t-7-3", "Late Fee Assessment", "P1", "Today", "Completed", "Carlos Reyes", "Victoria Place", "", "Teammate"),
      t("t-7-4", "Resident Payment Reminder", "P2", "Today", "Completed", "", "Victoria Place", "5-A", "Resident"),
      t("t-7-5", "NSF Processing", "P1", "Today", "In Progress", "Angela Park", "Victoria Place", "9-B", "Teammate"),
      t("t-7-6", "Ledger Reconciliation", "P1", "Tomorrow", "Not Started", "", "Victoria Place", "", "Teammate"),
      t("t-7-7", "Collection Notice", "P0", "Today", "Completed", "", "Victoria Place", "2-C", "Resident"),
      t("t-7-8", "Payment Plan Follow-up", "P2", "Today", "Completed", "Carlos Reyes", "Victoria Place", "11-A", "Resident"),
      t("t-7-9", "Weekly Collection Summary", "P1", "Tomorrow", "Not Started", "", "Victoria Place", "", "Teammate"),
      t("t-7-10", "Concession Tracking", "P3", "Today", "Completed", "", "Victoria Place", "", "Teammate"),
      t("t-7-11", "Autopay Enrollment", "P3", "Tomorrow", "Not Started", "", "Victoria Place", "", "Resident"),
      t("t-7-12", "Move-out Balance", "P1", "Today", "In Progress", "Angela Park", "Victoria Place", "14-D", "Resident"),
      t("t-7-13", "Credit Reporting", "P2", "Tomorrow", "Not Started", "", "Victoria Place", "", "Teammate"),
      t("t-7-14", "Manager Sign-off", "P1", "Tomorrow", "Not Started", "", "Victoria Place", "", "Teammate"),
      t("t-7-15", "Deposit Accounting", "P2", "Today", "Completed", "Carlos Reyes", "Victoria Place", "", "Teammate"),
      t("t-7-16", "Revenue Forecast Update", "P3", "Tomorrow", "Not Started", "", "Victoria Place", "", "Teammate"),
    ],
  },
  {
    id: "pb-8",
    templateName: "Community Event Injury",
    property: "Sun Valley",
    properties: ["Sun Valley"],
    createdAt: "2025-12-07",
    dueAt: "2025-12-21",
    launchedAt: "2025-12-07",
    status: "On Hold",
    priority: "P3",
    assignee: "",
    description: "Incident response playbook for injuries occurring during community events, covering medical response, documentation, insurance, and liability management.",
    tasks: [
      t("t-8-1", "Incident Documentation", "P0", "Today", "Completed", "Hillary Gonzalez", "Sun Valley", "", "Teammate"),
      t("t-8-2", "Medical Response Verification", "P0", "Today", "Completed", "", "Sun Valley", "", "Teammate"),
      t("t-8-3", "Witness Statements", "P1", "Today", "Completed", "Marcus Herwitz", "Sun Valley", "", "Teammate"),
      t("t-8-4", "Insurance Notification", "P1", "Today", "In Progress", "Angela Park", "Sun Valley", "", "Teammate"),
      t("t-8-5", "Photo Documentation", "P1", "Today", "Completed", "", "Sun Valley", "", "Teammate"),
      t("t-8-6", "Injured Party Follow-up", "P0", "Today", "In Progress", "Marcus Herwitz", "Sun Valley", "", "Resident"),
      t("t-8-7", "Legal Counsel Notification", "P1", "Today", "In Progress", "", "Sun Valley", "", "Teammate"),
      t("t-8-8", "Safety Review", "P1", "Tomorrow", "Not Started", "", "Sun Valley", "", "Teammate"),
      t("t-8-9", "Event Vendor Liability Review", "P2", "Tomorrow", "Not Started", "", "Sun Valley", "", "Vendor"),
      t("t-8-10", "Corrective Action Plan", "P1", "Tomorrow", "Not Started", "", "Sun Valley", "", "Teammate"),
      t("t-8-11", "Staff Incident Training", "P2", "Tomorrow", "Not Started", "", "Sun Valley", "", "Teammate"),
      t("t-8-12", "Insurance Claim Filing", "P1", "Tomorrow", "Not Started", "", "Sun Valley", "", "Teammate"),
      t("t-8-13", "Community Communication", "P2", "Tomorrow", "Not Started", "", "Sun Valley", "", "Resident"),
      t("t-8-14", "Policy Update Review", "P3", "Tomorrow", "Not Started", "", "Sun Valley", "", "Teammate"),
      t("t-8-15", "Risk Assessment Update", "P1", "Tomorrow", "Not Started", "", "Sun Valley", "", "Teammate"),
      t("t-8-16", "Incident Close-out Report", "P1", "Tomorrow", "Not Started", "", "Sun Valley", "", "Teammate"),
    ],
  },
  {
    id: "pb-9",
    templateName: "Monthly Property Check",
    property: "Gateway Arch",
    properties: ["Gateway Arch"],
    createdAt: "2025-12-07",
    dueAt: "2025-12-14",
    launchedAt: "2025-12-07",
    status: "Due Today",
    priority: "P1",
    assignee: "",
    description: "Monthly property inspection playbook covering common areas, unit condition checks, landscaping, amenity maintenance, and safety compliance.",
    recurring: { frequency: "monthly" },
    tasks: [
      t("t-9-1", "Common Area Inspection", "P1", "Today", "Completed", "Hillary Gonzalez", "Gateway Arch", "", "Teammate"),
      t("t-9-2", "Pool & Amenity Check", "P1", "Today", "Completed", "", "Gateway Arch", "", "Teammate"),
      t("t-9-3", "Landscaping Review", "P2", "Today", "Completed", "Carlos Reyes", "Gateway Arch", "", "Vendor"),
      t("t-9-4", "Parking Lot Inspection", "P2", "Today", "Completed", "", "Gateway Arch", "", "Teammate"),
      t("t-9-5", "Fire Safety Equipment", "P0", "Today", "Completed", "Hillary Gonzalez", "Gateway Arch", "", "Teammate"),
      t("t-9-6", "HVAC System Check", "P1", "Today", "In Progress", "", "Gateway Arch", "", "Vendor"),
      t("t-9-7", "Elevator Inspection", "P1", "Today", "In Progress", "", "Gateway Arch", "", "Vendor"),
      t("t-9-8", "Pest Control Review", "P2", "Today", "Completed", "Carlos Reyes", "Gateway Arch", "", "Vendor"),
      t("t-9-9", "Lighting Audit", "P2", "Today", "Completed", "", "Gateway Arch", "", "Teammate"),
      t("t-9-10", "Signage Check", "P3", "Today", "Completed", "", "Gateway Arch", "", "Teammate"),
      t("t-9-11", "Vacant Unit Walkthrough", "P1", "Tomorrow", "Not Started", "", "Gateway Arch", "4-A, 12-C", "Teammate"),
      t("t-9-12", "Curb Appeal Assessment", "P3", "Tomorrow", "Not Started", "", "Gateway Arch", "", "Teammate"),
      t("t-9-13", "Work Order Follow-up", "P1", "Today", "In Progress", "Hillary Gonzalez", "Gateway Arch", "", "Teammate"),
      t("t-9-14", "Vendor Performance Review", "P2", "Tomorrow", "Not Started", "", "Gateway Arch", "", "Vendor"),
      t("t-9-15", "Safety Compliance Log", "P1", "Tomorrow", "Not Started", "", "Gateway Arch", "", "Teammate"),
      t("t-9-16", "Monthly Report Submission", "P1", "Tomorrow", "Not Started", "", "Gateway Arch", "", "Teammate"),
    ],
  },
  {
    id: "pb-10",
    templateName: "Monthly Property Check",
    property: "Azure Heights",
    properties: ["Azure Heights"],
    createdAt: "2025-12-07",
    dueAt: "2025-12-14",
    launchedAt: "2025-12-07",
    status: "Due Today",
    priority: "P3",
    assignee: "",
    description: "Monthly property inspection playbook covering common areas, unit condition checks, landscaping, amenity maintenance, and safety compliance.",
    recurring: { frequency: "monthly" },
    tasks: [
      t("t-10-1", "Common Area Inspection", "P1", "Today", "Completed", "Angela Park", "Azure Heights", "", "Teammate"),
      t("t-10-2", "Pool & Amenity Check", "P1", "Today", "In Progress", "", "Azure Heights", "", "Teammate"),
      t("t-10-3", "Landscaping Review", "P2", "Today", "Not Started", "", "Azure Heights", "", "Vendor"),
      t("t-10-4", "Parking Lot Inspection", "P2", "Today", "Not Started", "", "Azure Heights", "", "Teammate"),
      t("t-10-5", "Fire Safety Equipment", "P0", "Today", "Completed", "Angela Park", "Azure Heights", "", "Teammate"),
      t("t-10-6", "HVAC System Check", "P1", "Tomorrow", "Not Started", "", "Azure Heights", "", "Vendor"),
      t("t-10-7", "Elevator Inspection", "P1", "Tomorrow", "Not Started", "", "Azure Heights", "", "Vendor"),
      t("t-10-8", "Pest Control Review", "P2", "Tomorrow", "Not Started", "", "Azure Heights", "", "Vendor"),
      t("t-10-9", "Lighting Audit", "P2", "Today", "Not Started", "", "Azure Heights", "", "Teammate"),
      t("t-10-10", "Signage Check", "P3", "Today", "Not Started", "", "Azure Heights", "", "Teammate"),
      t("t-10-11", "Vacant Unit Walkthrough", "P1", "Tomorrow", "Not Started", "", "Azure Heights", "2-B, 8-A", "Teammate"),
      t("t-10-12", "Curb Appeal Assessment", "P3", "Tomorrow", "Not Started", "", "Azure Heights", "", "Teammate"),
      t("t-10-13", "Work Order Follow-up", "P1", "Today", "Not Started", "", "Azure Heights", "", "Teammate"),
      t("t-10-14", "Vendor Performance Review", "P2", "Tomorrow", "Not Started", "", "Azure Heights", "", "Vendor"),
      t("t-10-15", "Safety Compliance Log", "P1", "Tomorrow", "Not Started", "", "Azure Heights", "", "Teammate"),
      t("t-10-16", "Monthly Report Submission", "P1", "Tomorrow", "Not Started", "", "Azure Heights", "", "Teammate"),
    ],
  },
  {
    id: "pb-11",
    templateName: "Blood / Biohazard",
    property: "Victoria Place",
    properties: ["Victoria Place"],
    createdAt: "2026-03-04",
    dueAt: "2026-03-18",
    launchedAt: "2026-03-04",
    status: "In Progress",
    priority: "P0",
    assignee: "Hillary Gonzalez",
    description: "Emergency response for biohazard incidents including scene security, OSHA-compliant professional remediation, waste disposal, and resident communication.",
    tasks: [
      t("t-11-1", "Secure the Scene", "P0", "Today", "Completed", "Hillary Gonzalez", "Victoria Place", "14-C", "Teammate"),
      t("t-11-2", "Contact Emergency Services", "P0", "Today", "Completed", "Marcus Herwitz", "Victoria Place", "14-C", "Teammate"),
      t("t-11-3", "Notify Regional Manager", "P0", "Today", "Completed", "Hillary Gonzalez", "Victoria Place", "", "Teammate"),
      t("t-11-4", "Establish Access Perimeter", "P0", "Today", "Completed", "Marcus Herwitz", "Victoria Place", "14-C", "Teammate"),
      t("t-11-5", "Staff Safety Briefing", "P1", "Today", "Completed", "Hillary Gonzalez", "Victoria Place", "", "Teammate"),
      t("t-11-6", "Isolate HVAC Zone", "P1", "Today", "Completed", "Carlos Reyes", "Victoria Place", "14-C", "Vendor"),
      t("t-11-7", "Document Contamination Scope", "P1", "Today", "In Progress", "Hillary Gonzalez", "Victoria Place", "14-C", "Teammate"),
      t("t-11-8", "Contact Licensed Remediation Company", "P1", "Today", "In Progress", "", "Victoria Place", "14-C", "Vendor"),
      t("t-11-9", "Notify Insurance Provider", "P1", "Tomorrow", "Not Started", "Angela Park", "Victoria Place", "", "Teammate"),
      t("t-11-10", "Resident Communication", "P1", "Tomorrow", "Not Started", "", "Victoria Place", "All", "Resident"),
      t("t-11-11", "Coordinate Temporary Relocation", "P1", "Tomorrow", "Not Started", "", "Victoria Place", "14-C", "Resident"),
      t("t-11-12", "Oversee Professional Cleanup", "P2", "Tomorrow", "Not Started", "", "Victoria Place", "14-C", "Vendor"),
      t("t-11-13", "Waste Disposal Verification", "P1", "Tomorrow", "Not Started", "", "Victoria Place", "14-C", "Vendor"),
      t("t-11-14", "Post-Remediation Clearance Testing", "P1", "Tomorrow", "Not Started", "", "Victoria Place", "14-C", "Vendor"),
      t("t-11-15", "File Insurance Claim", "P2", "Tomorrow", "Not Started", "Angela Park", "Victoria Place", "", "Teammate"),
      t("t-11-16", "Close-out Report", "P2", "Tomorrow", "Not Started", "", "Victoria Place", "", "Teammate"),
    ],
  },
  {
    id: "pb-12",
    templateName: "Flood / Water Damage",
    property: "Summit Park",
    properties: ["Summit Park"],
    createdAt: "2026-03-05",
    dueAt: "2026-03-19",
    launchedAt: "2026-03-05",
    status: "In Progress",
    priority: "P0",
    assignee: "Marcus Herwitz",
    description: "Emergency response for flooding and water damage including source shutoff, water extraction, mold prevention, building system inspection, and restoration.",
    tasks: [
      t("t-12-1", "Shut Off Water Source", "P0", "Today", "Completed", "Marcus Herwitz", "Summit Park", "22-A, 22-B", "Teammate"),
      t("t-12-2", "Cut Power to Affected Areas", "P0", "Today", "Completed", "Carlos Reyes", "Summit Park", "22-A, 22-B, 21-A, 21-B", "Teammate"),
      t("t-12-3", "Contact Emergency Restoration", "P0", "Today", "Completed", "Marcus Herwitz", "Summit Park", "", "Vendor"),
      t("t-12-4", "Notify Regional Manager", "P0", "Today", "Completed", "Hillary Gonzalez", "Summit Park", "", "Teammate"),
      t("t-12-5", "Restrict Area Access", "P1", "Today", "Completed", "Marcus Herwitz", "Summit Park", "22-A, 22-B, 21-A, 21-B", "Teammate"),
      t("t-12-6", "Document All Damage", "P1", "Today", "In Progress", "Hillary Gonzalez", "Summit Park", "22-A, 22-B, 21-A, 21-B", "Teammate"),
      t("t-12-7", "Deploy Water Extraction Equipment", "P0", "Today", "In Progress", "", "Summit Park", "22-A, 22-B, 21-A, 21-B", "Vendor"),
      t("t-12-8", "Resident Communication", "P1", "Today", "Completed", "Angela Park", "Summit Park", "All", "Resident"),
      t("t-12-9", "Inspect Building Systems", "P1", "Tomorrow", "Not Started", "", "Summit Park", "22-A, 22-B", "Vendor"),
      t("t-12-10", "Apply Antimicrobial Treatment", "P1", "Tomorrow", "Not Started", "", "Summit Park", "22-A, 22-B, 21-A, 21-B", "Vendor"),
      t("t-12-11", "Coordinate Temporary Housing", "P1", "Today", "In Progress", "Angela Park", "Summit Park", "22-A, 22-B", "Resident"),
      t("t-12-12", "File Insurance Claim", "P1", "Tomorrow", "Not Started", "Angela Park", "Summit Park", "", "Teammate"),
      t("t-12-13", "Monitor Drying Progress", "P2", "Tomorrow", "Not Started", "", "Summit Park", "22-A, 22-B, 21-A, 21-B", "Vendor"),
      t("t-12-14", "48-Hour Mold Assessment", "P1", "Tomorrow", "Not Started", "", "Summit Park", "22-A, 22-B, 21-A, 21-B", "Vendor"),
      t("t-12-15", "Restoration Vendor RFP", "P2", "Tomorrow", "Not Started", "", "Summit Park", "22-A, 22-B", "Vendor"),
      t("t-12-16", "Close-out Report", "P2", "Tomorrow", "Not Started", "", "Summit Park", "", "Teammate"),
    ],
  },
  {
    id: "pb-13",
    templateName: "Unit make-ready (turnover)",
    property: "Summit Park",
    properties: ["Summit Park"],
    unit: "8-B",
    createdAt: "2026-04-20",
    dueAt: "2026-04-30",
    launchedAt: "2026-04-20",
    status: "In Progress",
    priority: "P1",
    assignee: "Angela Park",
    description:
      "End-to-end make-ready for a single unit at Summit Park. Scope is limited to home 8-B: inspection, work orders, punch list, and pre-lease sign-off.",
    tasks: [
      t("t-13-1", "Pre-turn inspection", "P1", "Today", "Completed", "Hillary Gonzalez", "Summit Park", "8-B", "Teammate"),
      t("t-13-2", "Punch list & work orders", "P1", "Today", "In Progress", "Carlos Reyes", "Summit Park", "8-B", "Teammate"),
      t("t-13-3", "Paint & flooring touch-up", "P2", "Today", "In Progress", "", "Summit Park", "8-B", "Vendor"),
      t("t-13-4", "Appliance & fixture check", "P2", "Today", "Not Started", "", "Summit Park", "8-B", "Vendor"),
      t("t-13-5", "Utilities & re-key", "P1", "Tomorrow", "Not Started", "Angela Park", "Summit Park", "8-B", "Teammate"),
      t("t-13-6", "Pre-lease walkthrough (ready)", "P0", "Tomorrow", "Not Started", "Angela Park", "Summit Park", "8-B", "Teammate"),
    ],
  },
];

/* ─────────────────────────────── Persistence ─────────────────────────── */

const STORAGE_KEY = "janet-poc-playbooks-v3";

function loadState(): Playbook[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(playbooks: Playbook[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playbooks));
  } catch { /* quota exceeded — silently ignore */ }
}

/** Append new seed playbooks (by id) so localStorage from older builds still gets fresh demo rows. */
function mergeNewSeedPlaybooks(saved: Playbook[]): Playbook[] {
  const seen = new Set(saved.map((p) => p.id));
  const toAdd = INITIAL_PLAYBOOKS.filter((p) => !seen.has(p.id));
  return toAdd.length > 0 ? [...saved, ...toAdd] : saved;
}

/* ─────────────────────────────── Context ─────────────────────────────── */

type PlaybooksContextValue = {
  playbooks: Playbook[];
  getPlaybook: (id: string) => Playbook | undefined;
  updatePlaybook: (id: string, updates: Partial<Omit<Playbook, "id">>) => void;
  updatePlaybookTask: (playbookId: string, taskId: string, updates: Partial<Omit<Task, "id">>) => void;
  addPlaybookTask: (playbookId: string, task: Omit<Task, "id">) => void;
  removePlaybookTask: (playbookId: string, taskId: string) => void;
  addPlaybook: (playbook: Omit<Playbook, "id">) => void;
  removePlaybook: (id: string) => void;
};

const PlaybooksContext = createContext<PlaybooksContextValue | null>(null);

export function PlaybooksProvider({ children }: { children: React.ReactNode }) {
  const [playbooks, setPlaybooks] = useState<Playbook[]>(INITIAL_PLAYBOOKS);

  useEffect(() => {
    const saved = loadState();
    if (saved && saved.length > 0) {
      const merged = mergeNewSeedPlaybooks(saved);
      setPlaybooks(merged);
      if (merged.length !== saved.length) {
        saveState(merged);
      }
    }
  }, []);

  const persist = useCallback((next: Playbook[]) => {
    setPlaybooks(next);
    saveState(next);
  }, []);

  const getPlaybook = useCallback(
    (id: string) => playbooks.find((p) => p.id === id),
    [playbooks]
  );

  const updatePlaybook = useCallback(
    (id: string, updates: Partial<Omit<Playbook, "id">>) => {
      setPlaybooks((prev) => {
        const next = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
        saveState(next);
        return next;
      });
    },
    []
  );

  const updatePlaybookTask = useCallback(
    (playbookId: string, taskId: string, updates: Partial<Omit<Task, "id">>) => {
      setPlaybooks((prev) => {
        const next = prev.map((p) =>
          p.id === playbookId
            ? { ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)) }
            : p
        );
        saveState(next);
        return next;
      });
    },
    []
  );

  const addPlaybookTask = useCallback(
    (playbookId: string, task: Omit<Task, "id">) => {
      setPlaybooks((prev) => {
        const next = prev.map((p) =>
          p.id === playbookId
            ? { ...p, tasks: [...p.tasks, { ...task, id: `t-${Date.now()}` }] }
            : p
        );
        saveState(next);
        return next;
      });
    },
    []
  );

  const removePlaybookTask = useCallback(
    (playbookId: string, taskId: string) => {
      setPlaybooks((prev) => {
        const next = prev.map((p) =>
          p.id === playbookId
            ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) }
            : p
        );
        saveState(next);
        return next;
      });
    },
    []
  );

  const addPlaybook = useCallback(
    (playbook: Omit<Playbook, "id">) => {
      setPlaybooks((prev) => {
        const next = [...prev, { ...playbook, id: `pb-${Date.now()}` }];
        saveState(next);
        return next;
      });
    },
    []
  );

  const removePlaybook = useCallback((id: string) => {
    setPlaybooks((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveState(next);
      return next;
    });
  }, []);

  const value = useMemo<PlaybooksContextValue>(
    () => ({
      playbooks,
      getPlaybook,
      updatePlaybook,
      updatePlaybookTask,
      addPlaybookTask,
      removePlaybookTask,
      addPlaybook,
      removePlaybook,
    }),
    [playbooks, getPlaybook, updatePlaybook, updatePlaybookTask, addPlaybookTask, removePlaybookTask, addPlaybook, removePlaybook]
  );

  return <PlaybooksContext.Provider value={value}>{children}</PlaybooksContext.Provider>;
}

export function usePlaybooks() {
  const ctx = useContext(PlaybooksContext);
  if (!ctx) throw new Error("usePlaybooks must be used within a PlaybooksProvider");
  return ctx;
}

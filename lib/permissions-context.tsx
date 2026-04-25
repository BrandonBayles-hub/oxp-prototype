"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { useRole, type Role } from "./role-context";

export type Permission = {
  id: string;
  capability: string;
  description: string;
  section: string;
};

export const ALL_PERMISSIONS: Permission[] = [
  // ── Communications (Command Center + inbox) ──
  { id: "p-cc-view", capability: "View Command Center", description: "Access the Command Center dashboard", section: "Communications" },
  {
    id: "p-comms-oxp-communication",
    capability: "OXP Communication",
    description:
      "Ability to access OXP Communication tab in oxp main navigation and in the command center area.",
    section: "Communications",
  },
  {
    id: "p-comms-omnichannel-panel",
    capability: "Omni-Channel Conversation Panel",
    description:
      "Ability to see the conversation panel in lead and resident profiles with access to the OXP communication inboxes.",
    section: "Communications",
  },
  {
    id: "p-comms-send-email",
    capability: "Send Emails",
    description: "Ability to send email messages from OXP Communication inboxes and conversation panel.",
    section: "Communications",
  },
  {
    id: "p-comms-send-sms",
    capability: "Send SMS",
    description: "Ability to send SMS messages from OXP Communication inboxes and conversation panel.",
    section: "Communications",
  },
  {
    id: "p-comms-apply-labels",
    capability: "Apply Conversation Labels",
    description:
      "Tag conversation threads from the panel using existing labels. Separate from creating or editing global custom labels.",
    section: "Communications",
  },
  {
    id: "p-comms-assign-conversation",
    capability: "Assign or Reassign Conversation",
    description:
      "Hand off a conversation thread to another user, including claiming conversations from a shared queue.",
    section: "Communications",
  },
  {
    id: "p-comms-resolve-threads",
    capability: "Resolve Threads",
    description:
      "Mark conversation threads as resolved from the panel without full inbox administration access.",
    section: "Communications",
  },
  {
    id: "p-comms-reopen-threads",
    capability: "Reopen Threads",
    description:
      "Reopen closed or resolved conversation threads from the panel without full inbox administration access.",
    section: "Communications",
  },
  { id: "p-comms-create-inbox", capability: "Create Custom Inboxes", description: "Create Custom Inboxes", section: "Communications" },
  { id: "p-comms-delete-inbox", capability: "Delete Custom Inboxes", description: "Ability to delete custom inboxes", section: "Communications" },
  { id: "p-comms-edit-inbox-props", capability: "Edit Properties In Inbox", description: "Modify properties that are routed to custom inboxes", section: "Communications" },
  { id: "p-comms-edit-inbox-labels", capability: "Edit Labels In Inbox", description: "Modify label routing for custom inboxes", section: "Communications" },
  { id: "p-comms-edit-inbox-users", capability: "Edit Users in Inbox", description: "Modify users with access to custom inboxes", section: "Communications" },
  { id: "p-comms-add-labels", capability: "Add Custom Labels", description: "Ability to create labels", section: "Communications" },
  { id: "p-comms-edit-labels", capability: "Edit Custom Labels", description: "Modify an existing label", section: "Communications" },
  { id: "p-comms-delete-labels", capability: "Delete Custom Labels", description: "Ability to delete labels", section: "Communications" },
  { id: "p-comms-reporting", capability: "See Comms Reporting", description: "Ability to view reporting for communications", section: "Communications" },

  // ── Escalations ──
  { id: "p-tasks-view", capability: "View Escalations", description: "Access the Escalations page and view assigned escalations", section: "Escalations" },
  { id: "p-tasks-edit-specialty", capability: "Edit Specialty", description: "Modify the escalations and users associated with a Specialty", section: "Escalations" },
  { id: "p-tasks-view-all", capability: "View All Escalations", description: "View and edit all Escalations", section: "Escalations" },
  { id: "p-tasks-delete", capability: "Delete Escalations", description: "Permanently remove an escalation or task from the queue", section: "Escalations" },
  { id: "p-tasks-create-custom", capability: "Create Custom Escalations", description: "Create new custom escalation types", section: "Escalations" },
  { id: "p-tasks-manage-routing", capability: "Manage Routing Rules", description: "Create, edit, and delete escalation routing rules", section: "Escalations" },
  { id: "p-tasks-bulk-actions", capability: "Bulk Escalation Actions", description: "Perform bulk assign, status update, and label operations", section: "Escalations" },
  { id: "p-playbooks-view", capability: "View Playbooks", description: "View all playbooks and their task progress", section: "Escalations" },
  { id: "p-playbooks-launch", capability: "Launch Playbooks", description: "Manually launch new playbooks from SOP templates", section: "Escalations" },
  { id: "p-playbooks-manage", capability: "Manage Playbooks", description: "Edit, cancel, and configure recurring playbooks", section: "Escalations" },
  { id: "p-playbooks-delete", capability: "Delete Playbooks", description: "Permanently remove a playbook and its tasks from the system", section: "Escalations" },
  { id: "p-playbooks-assign", capability: "Assign Playbook Tasks", description: "Reassign tasks within a playbook to other team members", section: "Escalations" },

  // ── Calling Communications ──
  {
    id: "p-calling-view",
    capability: "Access Calling Communications",
    description: "Master access to Click-to-Call features in the OXP conversation panel.",
    section: "Calling Communications",
  },
  {
    id: "p-calling-click-to-call",
    capability: "Click To Call Functionality",
    description:
      "Ability to place outbound calls to leads and residents directly from the OXP conversation panel using their computer or a default vanity number assigned to them.",
    section: "Calling Communications",
  },
  {
    id: "p-calling-custom-vanity",
    capability: "Click To Call Custom Vanity Number",
    description:
      "Ability to place outbound calls using a custom vanity number selected by the user in their profile, instead of the default assigned number selected by the property.",
    section: "Calling Communications",
  },

  // ── Performance ──
  { id: "p-report-performance", capability: "View Performance", description: "Access the performance analytics dashboard", section: "Performance" },

  // ── Agent Roster ──
  { id: "p-agents-view", capability: "View Agent Roster", description: "Access the Agent Roster page and view AI Agents", section: "Agent Roster" },
  { id: "p-agents-operational", capability: "Operational Agents", description: "Enable and disable operational AI Agents", section: "Agent Roster" },
  { id: "p-agents-create", capability: "Create Agents", description: "Create and edit AI Agents they can deploy for different tasks", section: "Agent Roster" },
  { id: "p-agents-edit-eli", capability: "Edit ELI+ Agents", description: "Edit and modify the functions of ELI+ Agents", section: "Agent Roster" },
  { id: "p-agents-view-logs", capability: "View Agent Logs", description: "Access conversation and decision logs for AI Agents", section: "Agent Roster" },
  { id: "p-agents-manage-tools", capability: "Manage Agent Tools", description: "Configure and assign tools available to AI Agents", section: "Agent Roster" },

  // ── Workforce ──
  { id: "p-wf-members-view", capability: "View Workforce Members", description: "View all team members and their assignments", section: "Workforce" },
  { id: "p-wf-members-edit", capability: "Edit Team Members", description: "Add, remove, and modify team member profiles", section: "Workforce" },
  { id: "p-wf-roles", capability: "Manage Roles & Access", description: "Create, edit, and assign permission roles", section: "Workforce" },
  { id: "p-wf-groups", capability: "Manage Property Groups", description: "Create and edit property group assignments", section: "Workforce" },

  // ── Activation ──
  { id: "p-activation-view", capability: "View Setup Checklist", description: "Access the activation and onboarding checklist", section: "Activation" },
  { id: "p-activation-complete", capability: "Complete Setup Steps", description: "Mark activation checklist items as complete", section: "Activation" },
  { id: "p-activation-integrations", capability: "Manage Integrations", description: "Connect and configure third-party integrations", section: "Activation" },

  // ── Workflows ──
  { id: "p-workflows-view", capability: "View Workflows", description: "Access the Workflows page and view configured workflows", section: "Workflows" },
  { id: "p-wf-create", capability: "Create Workflows", description: "Create and configure automated workflows", section: "Workflows" },
  { id: "p-wf-edit", capability: "Edit Workflows", description: "Modify existing workflow recipes and triggers", section: "Workflows" },
  { id: "p-wf-toggle", capability: "Enable/Disable Workflows", description: "Turn workflows on or off", section: "Workflows" },

  // ── Trainings & SOP ──
  { id: "p-training-view", capability: "View Trainings & SOPs", description: "Access training documents and SOPs", section: "Trainings & SOP" },
  { id: "p-training-create", capability: "Create & Edit SOPs", description: "Author and modify standard operating procedures", section: "Trainings & SOP" },
  { id: "p-training-publish", capability: "Publish SOPs", description: "Publish SOPs and make them available for playbook use", section: "Trainings & SOP" },
  { id: "p-training-assign", capability: "Manage Training Assignments", description: "Assign trainings and SOPs to team members", section: "Trainings & SOP" },

  // ── Voice ──
  { id: "p-voice-view", capability: "View Voice Settings", description: "Access voice configuration and settings", section: "Voice" },
  { id: "p-voice-configure", capability: "Configure Voice Agents", description: "Set up and modify AI voice agent behavior", section: "Voice" },
  { id: "p-voice-numbers", capability: "Manage Phone Numbers", description: "Add, remove, and route phone numbers", section: "Voice" },
  { id: "p-voice-logs", capability: "View Call Logs", description: "Access call recordings and transcripts", section: "Voice" },

  // ── Governance ──
  { id: "p-gov-view", capability: "View Governance Policies", description: "Access compliance and governance settings", section: "Governance" },
  { id: "p-gov-edit", capability: "Edit Compliance Rules", description: "Create and modify compliance and safety rules", section: "Governance" },
  { id: "p-gov-audit", capability: "Manage Audit Logs", description: "View and export audit trail records", section: "Governance" },
  { id: "p-gov-retention", capability: "Configure Data Retention", description: "Set data retention and archival policies", section: "Governance" },

  // ── Entrata Experts ──
  { id: "p-experts-view", capability: "View Credits & Usage", description: "Access the Entrata Experts page and view credit balance and usage history", section: "Entrata Experts" },
];

export const PERMISSION_SECTIONS = [
  "Communications", "Calling Communications", "Escalations", "Entrata Experts", "Performance", "Agent Roster", "Workforce",
  "Activation", "Workflows", "Trainings & SOP", "Voice", "Governance",
];

export const SECTION_VIEW_PERMISSION: Record<string, string> = {
  "Communications": "p-cc-view",
  "Calling Communications": "p-calling-view",
  "Escalations": "p-tasks-view",
  "Performance": "p-report-performance",
  "Agent Roster": "p-agents-view",
  "Workforce": "p-wf-members-view",
  "Activation": "p-activation-view",
  "Workflows": "p-workflows-view",
  "Trainings & SOP": "p-training-view",
  "Voice": "p-voice-view",
  "Governance": "p-gov-view",
  "Entrata Experts": "p-experts-view",
};

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Set<string>> = {
  admin: new Set(ALL_PERMISSIONS.map((p) => p.id)),
  regional: new Set([
    "p-cc-view",
    "p-comms-oxp-communication",
    "p-comms-omnichannel-panel",
    "p-comms-send-email",
    "p-comms-send-sms",
    "p-comms-apply-labels",
    "p-comms-assign-conversation",
    "p-comms-resolve-threads",
    "p-comms-reopen-threads",
    "p-comms-create-inbox", "p-comms-edit-inbox-props", "p-comms-edit-inbox-labels",
    "p-comms-edit-inbox-users", "p-comms-add-labels", "p-comms-edit-labels", "p-comms-reporting",
    "p-calling-view", "p-calling-click-to-call", "p-calling-custom-vanity",
    "p-tasks-view", "p-tasks-edit-specialty", "p-tasks-view-all", "p-tasks-delete", "p-tasks-bulk-actions",
    "p-playbooks-view", "p-playbooks-launch", "p-playbooks-manage", "p-playbooks-delete", "p-playbooks-assign",
    "p-report-performance",
    "p-agents-view", "p-agents-operational", "p-agents-view-logs",
    "p-wf-members-view", "p-wf-members-edit", "p-wf-groups",
    "p-activation-view", "p-activation-complete",
    "p-workflows-view", "p-wf-edit", "p-wf-toggle",
    "p-training-view", "p-training-create", "p-training-assign",
    "p-voice-view", "p-voice-logs",
    "p-gov-view", "p-gov-audit",
    "p-experts-view",
  ]),
  property: new Set([
    "p-cc-view",
    "p-comms-oxp-communication",
    "p-comms-omnichannel-panel",
    "p-comms-send-email",
    "p-comms-send-sms",
    "p-comms-apply-labels",
    "p-comms-assign-conversation",
    "p-comms-resolve-threads",
    "p-comms-reopen-threads",
    "p-comms-edit-inbox-props", "p-comms-edit-inbox-users", "p-comms-add-labels", "p-comms-reporting",
    "p-calling-view", "p-calling-click-to-call", "p-calling-custom-vanity",
    "p-tasks-view", "p-tasks-view-all", "p-tasks-delete", "p-tasks-bulk-actions",
    "p-playbooks-view", "p-playbooks-launch", "p-playbooks-delete", "p-playbooks-assign",
    "p-report-performance",
    "p-agents-view", "p-agents-operational",
    "p-wf-members-view",
    "p-activation-view",
    "p-workflows-view", "p-wf-toggle",
    "p-training-view",
    "p-voice-view", "p-voice-logs",
    "p-gov-view",
    "p-experts-view",
  ]),
  ic: new Set([
    "p-cc-view",
    "p-comms-oxp-communication",
    "p-comms-omnichannel-panel",
    "p-comms-send-email",
    "p-comms-send-sms",
    "p-comms-apply-labels",
    "p-comms-assign-conversation",
    "p-comms-resolve-threads",
    "p-comms-reopen-threads",
    "p-calling-view", "p-calling-click-to-call",
    "p-tasks-view", "p-tasks-view-all",
    "p-playbooks-view",
    "p-comms-reporting",
    "p-report-performance",
    "p-agents-view",
    "p-workflows-view",
    "p-training-view",
    "p-voice-view",
    "p-gov-view",
  ]),
};

type PermissionsContextValue = {
  permissions: Record<string, Set<string>>;
  setPermissions: React.Dispatch<React.SetStateAction<Record<string, Set<string>>>>;
  hasPermission: (permissionId: string) => boolean;
  hasAnyPermission: (...permissionIds: string[]) => boolean;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { role } = useRole();
  const [permissions, setPermissions] = useState<Record<string, Set<string>>>(() => {
    const copy: Record<string, Set<string>> = {};
    for (const [k, v] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      copy[k] = new Set(v);
    }
    return copy;
  });

  const hasPermission = useCallback(
    (permissionId: string) => {
      const rolePerms = permissions[role];
      return rolePerms?.has(permissionId) ?? false;
    },
    [permissions, role],
  );

  const hasAnyPermission = useCallback(
    (...permissionIds: string[]) => permissionIds.some((id) => hasPermission(id)),
    [hasPermission],
  );

  return (
    <PermissionsContext.Provider value={{ permissions, setPermissions, hasPermission, hasAnyPermission }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions must be used within PermissionsProvider");
  return ctx;
}

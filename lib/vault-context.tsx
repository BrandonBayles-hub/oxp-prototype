"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type VaultDocumentType = "sop" | "lease" | "policy" | "other";
export type ApprovalStatus = "review" | "approved" | "needs_review";

/** User-facing label: `review` and `needs_review` both display as "Needs review". */
export function approvalStatusDisplayLabel(status: ApprovalStatus): string {
  if (status === "review" || status === "needs_review") return "Needs review";
  if (status === "approved") return "Approved";
  return status;
}

export type VaultSource = "upload" | "entrata" | "workflow";

export type ScopeLevel = "company" | "owner" | "property";

/** One entry in a document's history: edits, submissions, approvals, denials */
export type DocumentHistoryEntry = {
  at: string;
  action: "edited" | "submitted" | "approved" | "denied";
  by?: string;
  version?: string;
  note?: string;
  summary?: string;
};

/** A stored snapshot of a previous version's body, created on each approval */
export type DocumentVersion = {
  version: string;
  body: string;
  approvedAt: string;
  approvedBy?: string;
  changeSummary?: string;
};

/** Training status per agent-document pair */
export type AgentTrainingStatus = "pending" | "trained" | "out_of_date";

/** Tracks per-agent training state for a document */
export type AgentTrainingRecord = {
  agentId: string;
  status: AgentTrainingStatus;
  trainedAt?: string;
  trainedOnVersion?: string;
};

/** Activity log entry for the centralized feed */
export type VaultActivityEntry = {
  id: string;
  at: string;
  action: string;
  by?: string;
  documentId?: string;
  documentName?: string;
  detail?: string;
};

/** Who may view a vault document — roles (`role:*`) and/or people (`user:*` workforce ids). */
export type ViewerAccess = {
  entries: string[];
};

export const DEFAULT_VIEWER_ACCESS: ViewerAccess = { entries: ["role:admin"] };

export type VaultItem = {
  id: string;
  fileName: string;
  documentType: VaultDocumentType;
  property: string;
  approvalStatus: ApprovalStatus;
  trainedOn: string;
  modified: string;
  owner: string;
  type: "file" | "folder";
  version?: string;
  source?: VaultSource;
  effectiveDate?: string;
  tags?: string[];
  body?: string;
  linkedAgentIds?: string[];
  /** Other vault documents this SOP references or should be reviewed when this one changes (directed links). */
  relatedDocumentIds?: string[];
  history?: DocumentHistoryEntry[];
  properties?: string[];
  // --- NEW HIERARCHY FIELDS ---
  scopeLevel?: ScopeLevel;
  ownerId?: string;     // Set if scopeLevel === 'owner'
  propertyId?: string;  // Set if scopeLevel === 'property'
  
  // --- NEW VISIBILITY FLAGS ---
  isInternalOnly?: boolean;  // True = only PMC staff can see it
  isOwnerVisible?: boolean;  // True = Owners can view it in their portal
  isTenantVisible?: boolean; // True = Residents can view it (e.g. HOA rules)
  /** Stored previous versions (snapshots on approval) */
  versions?: DocumentVersion[];
  /** Per-agent training status records */
  trainingRecords?: AgentTrainingRecord[];
  /** Next review date — document flagged 'needs_review' when past due */
  nextReviewDate?: string;
  /** Parent folder ID for folder hierarchy; null/undefined = root */
  folderId?: string;
  /** If true, this is a template — not an active operational document */
  isTemplate?: boolean;
  /** Saved draft body — editor content saved locally before submitting for approval */
  draftBody?: string;
  /** File format hint — determines whether inline editing (text) or preview (binary) is used */
  fileFormat?: "text" | "pdf" | "docx" | "image";
  /**
   * Who can view this document — people and/or org roles (not the same as document Property association).
   * Each entry is `role:<Role>` (see ROLES in role-context) or `user:<workforceMemberId>` for a person.
   */
  viewerAccess?: ViewerAccess;
};

export const COMPLIANCE_ITEMS = [
  "Fair housing & anti-discrimination",
  "Reasonable accommodation & assistive animals",
  "Tenant screening & background checks",
  "Data privacy & PII handling",
  "Security deposit handling",
  "Rent collection & late fees",
  "Eviction & lease termination",
  "Maintenance & habitability standards",
];

export const SUGGESTED_PROPERTY_TAGS = ["Portfolio", "Hillside Living", "Jamison Apartments", "Property C"];
export const SUGGESTED_SUBJECT_TAGS = ["Leasing", "Maintenance", "Compliance", "Payments", "Policy", "Resident relations", "Operations"];

const STORAGE_KEY = "janet-poc-vault-v5";

const LEASING_SOP_BODY = `ENTRATA | GO DARK STEPS
The steps below must be completed prior to migration/transition to the new
management system.
● Setup > Properties > select property > Financial > Charges > General
○ Ensure "Automatically Post Scheduled Charges" is set to NO
● Setup > Properties > select property > Financial > Payments > Merchant Accounts > Charge
Code Specific Merchant Accounts
○ Change all "Charge Code Specific Merchant Accounts" to DEFAULT
○ This needs to be accomplished before the merchant account is changed to null
otherwise an error is received.
● Setup > Properties > select property > Financial > Payments > Merchant Accounts > Default
Merchant Account
○ Change "Default Merchant Account" to NULL by having the BLANK field selected at the
top of the list
● Setup > Properties > select property > Financial > Closings > Period Advance
○ Change the following 3 settings to NO
■ - AR Auto Update Post Month
■ - AP Auto Update Post Month
■ - GL Auto Update Post Month
● Setup > Properties > select property > Financial > Delinquency > Delinquency
○ Ensure "Automatically Post Late Fees" is set to NO
● Setup > Users & Groups
○ Disable user access for any on-site team members
● Setup > Properties > select property > ResidentPortal > Payments > General
○ Change "Enable Resident Pay" to NO
○ Change "Payments Tab" to DISABLED
● Setup > Properties > select property > ResidentPortal > Payments > Payment Block Days
○ Remove all dates from "Accept Online Payments On:"
● Setup > Properties > select property > ResidentPortal > Payments > Auto Payments
○ Remove all dates from "Allow Scheduled Payments on:"
● Setup > Properties > select property > ResidentPortal > Maintenance > Standard:
○ Change "Maintenance Tab" to DISABLED
● Setup > Properties > select property > ResidentPortal > Enrollment/Login > Login:
○ Change "Resident Portal App Login" to DISABLED
○ Change "Allow Applicant Login" to NO
● Setup > Properties > select property > Data Management > Leasing > Lease
○ Click Edit Lease Forms Integration Settings
○ Delete all information or choose the blank/null option from any drop down lists > Click
Save
● Setup > Properties > select property > Data Management > Leasing > Revenue Management
○ Click Edit Revenue Management Vendor
○ Delete all information or choose the blank/null option from any drop down lists. Turn all
Yes/No settings to No > Click Save

The steps below are recommended to be completed prior to
migration/transition to the new management system.
● Reports > Recurring Payments
○ Select property & generate report
○ Delete all individual recurring payments
● Apps > API Access
○ Remove all associated vendors
■ From the Property list dropdown, select the property > Click Filter
■ Click Manage > search for property > Click Remove
● Setup > Company > Data Management > Integration Settings > Transmission Vendors
○ Search for property > click Edit > click Delete to remove the integration from Bluemoon
● Setup > Company > Document
○ Select property from list on the left
○ Delete application by clicking red X Delete
● Setup > Properties > select property > Property > Floor Plans & Units > Unit Availability /
Search:
○ Set "Allow/Require Floor Plan Selection" to No/No
○ Set "Allow / Require Unit Selection" to No/No
● Setup > Properties > select property > Financial > Payments > General > Payment Types
○ Turn all to NO. They will show as red stop signs once saved
● Setup > Properties > select property > Communication > Contact Points
○ Go through all tabs (Leads, Applicants, Residents, Payments, Renewals & Lease
Modifications, and Maintenance) and remove all contact points. Click the Edit Pencil >
uncheck any check boxes & change anything set to Yes to No > Save
● Setup > Properties > select property > Communication > From Addresses
○ Remove all email addresses
○ Change "Email Relay "From" address:" to include historical within the email address (i.e.
1515flatshistorical@emailrelay.com)
● Setup > Properties > select property > Communication > Notification Recipients
○ Delete all System Messages set up under Notification Recipients
○ Click Edit Pencil next to each email > click Delete
● Tools > Message Center > Scheduled
○ Remove any scheduled emails for the property. Click Advanced > select the community >
click Apply > edit the message to remove the property from the email if multiple
properties are associated with it OR select "No" under Is Active if it's the only property
associated with it
● Setup > Company > Communication > Documents > Packets
○ Filter for property & disassociate property from all associated packets
○ DO NOT delete packets - if all properties associated to a packet are terminated, mark the
packet as Inactive
○ Search for Blue Moon Packet and mark as Inactive
● Setup > Company > Communication > Documents > Templates
○ Filter for property & remove property from all associated templates
○ DO NOT delete any templates - if all properties associated to a template are terminated,
disable the template`;

const REFUND_POLICY_BODY = `REFUND POLICY — Standard Operating Procedure

1. SCOPE
This policy applies to all refund requests received from current and former residents across all managed properties.

2. ELIGIBILITY
Refunds may be issued for:
  • Security deposit returns (per state-specific timelines)
  • Overpayment of rent or fees
  • Duplicate payment corrections
  • Cancelled amenity or service fees (if within 48-hour window)
  • Move-in fee adjustments when unit condition differs from showing

3. APPROVAL THRESHOLDS
  • Up to $250 — Site-level manager may approve
  • $250–$500 — Regional manager approval required
  • Over $500 — VP of Operations approval required; AI agent must escalate

4. PROCESSING TIMELINE
  • Standard refunds: processed within 5 business days of approval
  • Security deposits: per applicable state law (default 30 days if not specified)
  • Emergency / hardship refunds: processed within 2 business days

5. DOCUMENTATION REQUIREMENTS
All refunds must include:
  • Original payment reference or receipt
  • Written refund request from resident (email acceptable)
  • Manager approval notation in system
  • Reason code selected in Entrata

6. AI AGENT GUIDELINES
  • Agents may acknowledge refund requests and set expectations on timeline
  • Agents must NOT commit to specific refund amounts without manager approval
  • Refund requests over $500 must be escalated immediately
  • Agent should reference this policy when explaining the process to residents`;

function normalizeViewerAccessOnDocument(doc: VaultItem): VaultItem {
  const va = doc.viewerAccess as ViewerAccess | { roles?: string[]; propertyGroups?: string[] } | undefined;
  if (!va) return doc;
  if ("entries" in va && Array.isArray(va.entries) && va.entries.length > 0) {
    const entries = va.entries.filter((e): e is string => typeof e === "string");
    return entries.length ? { ...doc, viewerAccess: { entries: [...new Set(entries)] } } : { ...doc, viewerAccess: DEFAULT_VIEWER_ACCESS };
  }
  if ("roles" in va && Array.isArray(va.roles) && va.roles.length > 0) {
    return {
      ...doc,
      viewerAccess: { entries: [...new Set(va.roles.map((r) => `role:${r}`))] },
    };
  }
  return { ...doc, viewerAccess: DEFAULT_VIEWER_ACCESS };
}

const INITIAL_DOCS: VaultItem[] = [
  {
    id: "1",
    fileName: "Leasing SOP",
    documentType: "sop",
    property: "Portfolio",
    scopeLevel: "company",
    approvalStatus: "approved",
    trainedOn: "Yes",
    modified: "Feb 18, 2025",
    owner: "Admin",
    type: "file",
    version: "2.1",
    source: "upload",
    effectiveDate: "2025-02-01",
    body: LEASING_SOP_BODY,
    fileFormat: "text",
    viewerAccess: {
      entries: ["role:admin", "role:regional", "role:property", "user:h-comp-dir"],
    },
    relatedDocumentIds: ["3", "5"],
  },
  {
    id: "2",
    fileName: "Maintenance escalation",
    documentType: "sop",
    property: "Portfolio",
    scopeLevel: "owner",
    ownerId: "Smith Investments",
    approvalStatus: "approved",
    trainedOn: "Yes",
    modified: "Feb 15, 2025",
    owner: "Admin",
    type: "file",
    version: "1.0",
    source: "upload",
    fileFormat: "text",
    viewerAccess: { entries: ["role:admin", "role:regional"] },
    relatedDocumentIds: ["1"],
  },
  {
    id: "3",
    fileName: "Fair housing & anti-discrimination",
    documentType: "policy",
    property: "Portfolio",
    scopeLevel: "company",
    approvalStatus: "approved",
    trainedOn: "Yes",
    modified: "Feb 10, 2025",
    owner: "Admin",
    type: "file",
    source: "upload",
    tags: ["compliance"],
    fileFormat: "pdf",
    viewerAccess: {
      entries: ["role:admin", "role:regional", "role:property", "role:ic", "user:h-exec", "user:h-comp-dir"],
    },
    relatedDocumentIds: ["1", "4", "5"],
  },
  {
    id: "4",
    fileName: "Lease template",
    documentType: "lease",
    property: "Hillside Living",
    scopeLevel: "property",
    propertyId: "Hillside Living",
    approvalStatus: "review",
    trainedOn: "No",
    modified: "Feb 5, 2025",
    owner: "Admin",
    type: "file",
    source: "upload",
    fileFormat: "pdf",
    viewerAccess: { entries: ["role:admin", "role:property", "user:h-pm-a", "user:h-leasing-mgr-a"] },
    relatedDocumentIds: ["3"],
  },
  {
    id: "5",
    fileName: "Refund policy",
    documentType: "sop",
    property: "Portfolio",
    scopeLevel: "company",
    approvalStatus: "review",
    trainedOn: "No",
    modified: "Feb 20, 2025",
    owner: "Admin",
    type: "file",
    version: "1.0",
    source: "upload",
    body: REFUND_POLICY_BODY,
    fileFormat: "text",
    viewerAccess: { entries: ["role:admin"] },
    relatedDocumentIds: ["1", "3"],
  },
];

/** Maps compliance subject (e.g. "Fair housing policy") to the document ID used to train on that subject */
export type ComplianceSubjectDocumentIds = Record<string, string[]>;

/** Workforce member acknowledgment for a compliance subject */
export type WorkforceAck = {
  memberId: string;
  memberName: string;
  subject: string;
  acknowledgedAt: string;
};

type VaultContextValue = {
  documents: VaultItem[];
  setDocuments: React.Dispatch<React.SetStateAction<VaultItem[]>>;
  addDocument: (item: Omit<VaultItem, "id" | "modified">) => string;
  updateDocument: (id: string, updates: Partial<Pick<VaultItem, "fileName" | "documentType" | "property" | "approvalStatus" | "version" | "effectiveDate" | "modified" | "body" | "draftBody" | "tags" | "linkedAgentIds" | "relatedDocumentIds" | "history" | "properties" | "nextReviewDate" | "folderId" | "isTemplate" | "versions" | "trainingRecords" | "fileFormat" | "viewerAccess" | "owner" | "scopeLevel" | "ownerId" | "propertyId" | "isInternalOnly" | "isOwnerVisible" | "isTenantVisible">>) => void;
  addFolder: (fileName: string) => void;
  moveToFolder: (docId: string, folderId: string | null) => void;
  complianceChecked: Record<string, boolean>;
  setComplianceChecked: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  complianceSubjectDocumentIds: ComplianceSubjectDocumentIds;
  addComplianceSubjectDocument: (subject: string, documentId: string) => void;
  removeComplianceSubjectDocument: (subject: string, documentId: string) => void;
  docCount: number;
  /** Activity log (centralized feed) */
  activityLog: VaultActivityEntry[];
  addActivity: (entry: Omit<VaultActivityEntry, "id" | "at">) => void;
  /** Workforce acknowledgments for compliance subjects */
  workforceAcks: WorkforceAck[];
  addWorkforceAck: (ack: Omit<WorkforceAck, "acknowledgedAt">) => void;
  removeWorkforceAck: (memberId: string, subject: string) => void;
  /** Approve a document: increment version, snapshot body, add history, mark trained agents as out_of_date */
  approveDocument: (id: string, approvedBy: string, note?: string) => void;
  /** Mark an agent as trained on a document at current version */
  markAgentTrained: (docId: string, agentId: string) => void;
  /** Delete a document or folder by id */
  deleteDocument: (id: string) => void;
};

const VaultContext = createContext<VaultContextValue | null>(null);

function nowDateStr() {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function incrementVersion(ver: string | undefined): string {
  if (!ver) return "1.0";
  const parts = ver.split(".");
  const major = parseInt(parts[0] ?? "1", 10);
  const minor = parseInt(parts[1] ?? "0", 10);
  return `${major}.${minor + 1}`;
}

const ACTIVITY_STORAGE_KEY = "janet-poc-vault-activity";
const WORKFORCE_ACK_STORAGE_KEY = "janet-poc-vault-workforce-acks";

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [documents, setDocuments] = useState<VaultItem[]>(INITIAL_DOCS);
  const [complianceChecked, setComplianceCheckedState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(COMPLIANCE_ITEMS.map((k) => [k, false]))
  );
  const [complianceSubjectDocumentIds, setComplianceSubjectDocumentIdsState] = useState<ComplianceSubjectDocumentIds>({});
  const [activityLog, setActivityLog] = useState<VaultActivityEntry[]>([]);
  const [workforceAcks, setWorkforceAcks] = useState<WorkforceAck[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const docs = Array.isArray(parsed.documents) ? parsed.documents : parsed.docs;
        const compliance = parsed.compliance;
        const subjectDocIds = parsed.complianceSubjectDocumentIds;
        if (Array.isArray(docs)) {
          const allIds = new Set((docs as VaultItem[]).map((d) => d.id));
          const migrated = (docs as VaultItem[]).map((d) => {
            let doc = d;
            if (doc.id === "1" && !doc.body) doc = { ...doc, body: LEASING_SOP_BODY };
            if (doc.id === "5" && !doc.body) doc = { ...doc, body: REFUND_POLICY_BODY };
            if ((doc.approvalStatus as string) === "draft" && doc.type === "file") doc = { ...doc, approvalStatus: "review" };
            doc = normalizeViewerAccessOnDocument(doc);
            if (doc.relatedDocumentIds?.length) {
              const nextRel = [...new Set(doc.relatedDocumentIds)].filter(
                (rid) => allIds.has(rid) && rid !== doc.id
              );
              doc = { ...doc, relatedDocumentIds: nextRel.length ? nextRel : undefined };
            }
            return doc;
          });
          setDocuments(migrated);
        }
        if (compliance && typeof compliance === "object") setComplianceCheckedState((p) => ({ ...p, ...compliance }));
        if (subjectDocIds && typeof subjectDocIds === "object") {
          // Migrate old format (string values) to new format (string[] values)
          const migrated: ComplianceSubjectDocumentIds = {};
          for (const [k, v] of Object.entries(subjectDocIds)) {
            if (Array.isArray(v)) migrated[k] = v as string[];
            else if (typeof v === "string" && v) migrated[k] = [v];
          }
          setComplianceSubjectDocumentIdsState(migrated);
        }
      }
      const actRaw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
      if (actRaw) {
        const parsed = JSON.parse(actRaw);
        if (Array.isArray(parsed)) setActivityLog(parsed);
      }
      const ackRaw = localStorage.getItem(WORKFORCE_ACK_STORAGE_KEY);
      if (ackRaw) {
        const parsed = JSON.parse(ackRaw);
        if (Array.isArray(parsed)) setWorkforceAcks(parsed);
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        documents,
        compliance: complianceChecked,
        complianceSubjectDocumentIds,
      }));
    } catch {
      // ignore
    }
  }, [documents, complianceChecked, complianceSubjectDocumentIds, mounted]);

  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(activityLog)); } catch { /* ignore */ }
  }, [activityLog, mounted]);

  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(WORKFORCE_ACK_STORAGE_KEY, JSON.stringify(workforceAcks)); } catch { /* ignore */ }
  }, [workforceAcks, mounted]);

  // Check for documents past their nextReviewDate — auto-flag as needs_review
  useEffect(() => {
    if (!mounted) return;
    const now = new Date();
    setDocuments((prev) =>
      prev.map((doc) => {
        if (
          doc.type === "file" &&
          doc.nextReviewDate &&
          doc.approvalStatus === "approved" &&
          new Date(doc.nextReviewDate) <= now
        ) {
          return { ...doc, approvalStatus: "needs_review" as ApprovalStatus };
        }
        return doc;
      })
    );
  }, [mounted]);

  const addActivity = useCallback((entry: Omit<VaultActivityEntry, "id" | "at">) => {
    const full: VaultActivityEntry = { ...entry, id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString() };
    setActivityLog((prev) => [full, ...prev].slice(0, 200));
  }, []);

  const addComplianceSubjectDocument = useCallback((subject: string, documentId: string) => {
    setComplianceSubjectDocumentIdsState((prev) => {
      const existing = prev[subject] ?? [];
      if (existing.includes(documentId)) return prev;
      return { ...prev, [subject]: [...existing, documentId] };
    });
  }, []);

  const removeComplianceSubjectDocument = useCallback((subject: string, documentId: string) => {
    setComplianceSubjectDocumentIdsState((prev) => {
      const next = (prev[subject] ?? []).filter((id) => id !== documentId);
      if (next.length === 0) {
        const { [subject]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [subject]: next };
    });
  }, []);

  const setComplianceChecked = useCallback((updater: (prev: Record<string, boolean>) => Record<string, boolean>) => {
    setComplianceCheckedState((prev) => updater(prev));
  }, []);

  const addDocument = useCallback((item: Omit<VaultItem, "id" | "modified">): string => {
    const date = nowDateStr();
    const newId = String(Date.now());
    setDocuments((prev) => [
      ...prev,
      {
        ...item,
        id: newId,
        modified: date,
        source: item.source ?? "upload",
        version: item.documentType === "sop" ? item.version ?? "1.0" : undefined,
      },
    ]);
    addActivity({ action: "Document added", by: item.owner || "Admin", documentId: newId, documentName: item.fileName });
    return newId;
  }, [addActivity]);

  const updateDocument = useCallback((id: string, updates: Partial<Pick<VaultItem, "fileName" | "documentType" | "property" | "approvalStatus" | "version" | "effectiveDate" | "modified" | "body" | "draftBody" | "tags" | "linkedAgentIds" | "relatedDocumentIds" | "history" | "properties" | "nextReviewDate" | "folderId" | "isTemplate" | "versions" | "trainingRecords" | "fileFormat" | "viewerAccess" | "owner">>) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== id) return doc;
        const updated = {
          ...doc,
          ...updates,
          modified: updates.modified ?? nowDateStr(),
        };
        // If body changed and there are trained agents, mark them out_of_date
        if (updates.body && updates.body !== doc.body && doc.trainingRecords?.length) {
          updated.trainingRecords = doc.trainingRecords.map((r) =>
            r.status === "trained" ? { ...r, status: "out_of_date" as AgentTrainingStatus } : r
          );
        }
        return updated;
      })
    );
  }, []);

  const approveDocument = useCallback((id: string, approvedBy: string, note?: string) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== id) return doc;
        const newVersion = incrementVersion(doc.version);
        const versionSnapshot: DocumentVersion = {
          version: doc.version ?? "1.0",
          body: doc.body ?? "",
          approvedAt: new Date().toISOString(),
          approvedBy,
        };
        const historyEntry: DocumentHistoryEntry = {
          at: new Date().toISOString(),
          action: "approved",
          by: approvedBy,
          version: newVersion,
          note,
        };
        // Mark existing trained agents as out_of_date since a new version was approved
        const updatedRecords = (doc.trainingRecords ?? []).map((r) =>
          r.status === "trained" ? { ...r, status: "out_of_date" as AgentTrainingStatus } : r
        );
        return {
          ...doc,
          approvalStatus: "approved" as ApprovalStatus,
          version: newVersion,
          modified: nowDateStr(),
          versions: [...(doc.versions ?? []), versionSnapshot],
          history: [...(doc.history ?? []), historyEntry],
          trainingRecords: updatedRecords,
        };
      })
    );
    addActivity({ action: "Document approved", by: approvedBy, documentId: id, detail: note });
  }, [addActivity]);

  const markAgentTrained = useCallback((docId: string, agentId: string) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== docId) return doc;
        const existing = doc.trainingRecords ?? [];
        const idx = existing.findIndex((r) => r.agentId === agentId);
        const record: AgentTrainingRecord = {
          agentId,
          status: "trained",
          trainedAt: new Date().toISOString(),
          trainedOnVersion: doc.version ?? "1.0",
        };
        const next = idx >= 0 ? existing.map((r, i) => (i === idx ? record : r)) : [...existing, record];
        return { ...doc, trainingRecords: next };
      })
    );
  }, []);

  const addFolder = useCallback((fileName: string) => {
    const date = nowDateStr();
    setDocuments((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        fileName,
        documentType: "other",
        property: "—",
        approvalStatus: "approved",
        trainedOn: "—",
        modified: date,
        owner: "Admin",
        type: "folder",
      },
    ]);
  }, []);

  const moveToFolder = useCallback((docId: string, folderId: string | null) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, folderId: folderId ?? undefined } : d))
    );
  }, []);

  const deleteDocument = useCallback((id: string) => {
    setDocuments((prev) => {
      const target = prev.find((d) => d.id === id);
      if (!target) return prev;
      if (target.type === "folder") {
        return prev.filter((d) => d.id !== id).map((d) =>
          d.folderId === id ? { ...d, folderId: undefined } : d
        );
      }
      const remaining = prev.filter((d) => d.id !== id);
      return remaining.map((d) => {
        const rel = d.relatedDocumentIds?.filter((rid) => rid !== id);
        if (!d.relatedDocumentIds?.includes(id)) return d;
        return { ...d, relatedDocumentIds: rel?.length ? rel : undefined };
      });
    });
  }, []);

  const addWorkforceAck = useCallback((ack: Omit<WorkforceAck, "acknowledgedAt">) => {
    setWorkforceAcks((prev) => {
      const filtered = prev.filter((a) => !(a.memberId === ack.memberId && a.subject === ack.subject));
      return [...filtered, { ...ack, acknowledgedAt: new Date().toISOString() }];
    });
    addActivity({ action: "Workforce acknowledgment", by: ack.memberName, detail: `Acknowledged "${ack.subject}"` });
  }, [addActivity]);

  const removeWorkforceAck = useCallback((memberId: string, subject: string) => {
    setWorkforceAcks((prev) => prev.filter((a) => !(a.memberId === memberId && a.subject === subject)));
  }, []);

  const docCount = documents.filter((d) => d.type === "file" && !d.isTemplate).length;

  return (
    <VaultContext.Provider
      value={{
        documents,
        setDocuments,
        addDocument,
        updateDocument,
        addFolder,
        moveToFolder,
        complianceChecked,
        setComplianceChecked,
        complianceSubjectDocumentIds,
        addComplianceSubjectDocument,
        removeComplianceSubjectDocument,
        docCount,
        activityLog,
        addActivity,
        workforceAcks,
        addWorkforceAck,
        removeWorkforceAck,
        approveDocument,
        markAgentTrained,
        deleteDocument,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}

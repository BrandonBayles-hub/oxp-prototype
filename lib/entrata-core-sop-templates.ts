import type { VaultItem } from "@/lib/vault-context";

/**
 * SOP templates in Explore SOP — preview and “Add to library” load authoritative copy from
 * `public/sop-templates/*.md` (the files you provided), so the UI matches your source files exactly.
 */
export type SopTemplateItem = {
  id: string;
  name: string;
  category: string;
  documentType: VaultItem["documentType"];
  description: string;
  tags?: string[];
  /** Public URL to the exact markdown (Next copies `public/` to the app root on build). */
  sourcePath: string;
};

export const ENTRATA_CORE_SOP_TEMPLATES: SopTemplateItem[] = [
  {
    id: "core-secdep",
    name: "Security Deposit Handling",
    category: "Payments / Deposits",
    documentType: "sop",
    description: "Collecting, holding, accounting for, deducting from, and returning security deposits per state and local law; AI guardrails and disputes.",
    tags: ["deposits", "compliance", "move-out"],
    sourcePath: "/sop-templates/core-secdep.md",
  },
  {
    id: "core-move",
    name: "Move-In / Move-Out Procedures",
    category: "Leasing",
    documentType: "sop",
    description: "Make-ready, inspections, documentation, unit turnover, and coordination with security deposit handling.",
    tags: ["move-in", "move-out", "turns"],
    sourcePath: "/sop-templates/core-move.md",
  },
  {
    id: "core-maint",
    name: "Maintenance Request Triage & Dispatch",
    category: "Maintenance",
    documentType: "sop",
    description: "Intake, triage, work orders, dispatch, completion, vendors, and entry — Maintenance AI SOP.",
    tags: ["work-orders", "triage", "vendors"],
    sourcePath: "/sop-templates/core-maint.md",
  },
  {
    id: "core-renewal",
    name: "Lease Renewal Management",
    category: "Leasing",
    documentType: "sop",
    description: "Renewal timeline, pricing, outreach, retention, non-renewal, and Renewal AI rules.",
    tags: ["renewal", "retention", "rent"],
    sourcePath: "/sop-templates/core-renewal.md",
  },
  {
    id: "core-lease",
    name: "Lease Execution & Administration",
    category: "Leasing",
    documentType: "sop",
    description: "Templates, execution, e-sign, amendments, early termination, and AI boundaries.",
    tags: ["lease", "e-sign", "amendments"],
    sourcePath: "/sop-templates/core-lease.md",
  },
  {
    id: "core-rent",
    name: "Rent Collection & Delinquency Management",
    category: "Payments",
    documentType: "sop",
    description: "Due dates, grace, late fees, delinquency cadence, pay-or-quit, plans, and Payments AI.",
    tags: ["rent", "collections", "delinquency"],
    sourcePath: "/sop-templates/core-rent.md",
  },
];

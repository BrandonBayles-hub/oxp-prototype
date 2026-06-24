/* eslint-disable */
// @generated — do not edit manually.
// Companion to entrata-api-catalog.generated.ts. Regenerated alongside it.
// Keep mapping in sync with scripts/build-api-catalog.mjs::mapCategory.
// Generated at: 2026-04-23T23:05:21.058Z

export type ApiCategoryBucket =
  | "Customers & CRM"
  | "Applications"
  | "Leases & Renewals"
  | "Residents"
  | "Properties"
  | "Units & Availability"
  | "Pricing & Specials"
  | "Maintenance"
  | "Financial - AR"
  | "Financial - AP"
  | "Financial - GL"
  | "Payments"
  | "Vendors"
  | "Reports & Analytics"
  | "Communication"
  | "Marketing"
  | "Documents"
  | "Users & Permissions"
  | "Tasks & Workflow"
  | "Reputation"
  | "System"
  | "Other";

const BUCKETS: ReadonlyArray<{ cat: ApiCategoryBucket; needles: ReadonlyArray<string> }> = Object.freeze([
  { cat: "Customers & CRM", needles: ["customer", "crm", "contact"] },
  { cat: "Applications", needles: ["application", "applicant", "online-application"] },
  { cat: "Leases & Renewals", needles: ["lease", "renewal", "lease-mod", "leaseexecution", "docex"] },
  { cat: "Residents", needles: ["resident"] },
  { cat: "Properties", needles: ["property", "properties"] },
  { cat: "Units & Availability", needles: ["unit", "availability", "floorplan", "floor-plan"] },
  { cat: "Pricing & Specials", needles: ["pricing", "price", "special", "quote", "rate"] },
  { cat: "Maintenance", needles: ["maintenance", "work-order", "workorder", "inspection"] },
  { cat: "Financial - AR", needles: ["artransaction", "arpayment", "arcode", "ar-"] },
  { cat: "Financial - AP", needles: ["apayable", "ap-", "bill"] },
  { cat: "Financial - GL", needles: ["glaccount", "gl-", "journal"] },
  { cat: "Payments", needles: ["payment", "residentpay", "pay-"] },
  { cat: "Vendors", needles: ["vendor"] },
  { cat: "Reports & Analytics", needles: ["report", "analytic", "dashboard", "insight"] },
  { cat: "Communication", needles: ["message", "email", "sms", "voice", "communication", "inbox"] },
  { cat: "Marketing", needles: ["marketing", "campaign", "prospect", "leadmanager", "lead"] },
  { cat: "Documents", needles: ["document", "docex", "attachment", "file"] },
  { cat: "Users & Permissions", needles: ["user", "permission", "role", "employee"] },
  { cat: "Tasks & Workflow", needles: ["task", "workflow", "ticket"] },
  { cat: "Reputation", needles: ["reputation", "review"] },
  { cat: "System", needles: ["status", "health", "system", "internal"] },
]);

export function mapApiCategory(raw: string): ApiCategoryBucket {
  const key = raw.toLowerCase();
  for (const { cat, needles } of BUCKETS) {
    if (needles.some((n) => key.includes(n))) return cat;
  }
  return "Other";
}

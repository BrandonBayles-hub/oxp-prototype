"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Info,
  Pencil,
  Circle,
} from "lucide-react";
import { useEliEmails, type EliEmailAddress, type ImapSmtpConfig } from "@/lib/eli-emails-context";

const PROPERTIES = [
  "Harvest Peak Capital",
  "Skyline Apartments",
  "The Meridian",
  "Azure Heights",
  "Cambridge Suites",
  "Willow Creek Residences",
  "Summit View Towers",
  "Lakeside Commons",
  "Parkway Terrace",
  "Cedar Ridge Estates",
  "Riverstone Landing",
  "Magnolia Gardens",
  "Ironwood Flats",
  "Brookhaven Place",
  "Silver Oaks Village",
  "Aspen Grove Lofts",
  "Brandon's Buildings",
  "Aluminia Apartments",
  "Sunset Ridge",
  "Oakwood Terrace",
  "Pine Valley Estates",
];

const SERVICE_TYPES = [
  "All Resident ELI+ AI Services",
  "ELI+ Leasing AI",
  "ELI+ Maintenance AI",
  "ELI+ Payments AI",
  "ELI+ Renewals AI",
  "Entrata Email",
];

/** Set to `true` to show "Entrata Email" again in Google/Microsoft and assignment service-type pickers. */
const SHOW_ENTRATA_EMAIL_IN_SERVICE_SELECTOR = false;

/** Full ELI picker list (OAuth + edit assignment); IMAP "Other providers" still uses `OTHER_PROVIDER_SERVICE_TYPES` only. */
const ELI_CONNECT_SERVICE_TYPES: readonly string[] = SHOW_ENTRATA_EMAIL_IN_SERVICE_SELECTOR
  ? SERVICE_TYPES
  : SERVICE_TYPES.filter((s) => s !== "Entrata Email");

/** IMAP/SMTP ("Other Service Providers") — no ELI+ AI lanes; Entrata Email only. */
const OTHER_PROVIDER_SERVICE_TYPES = ["Entrata Email"] as const;

/** Shows the "Other Service Providers" (IMAP/SMTP) connect button next to Google/Microsoft. */
const SHOW_OTHER_SERVICE_PROVIDERS_BUTTON = true;

/** Toggle to `true` to show the "Entrata Email / Optional" column in the property status table again. */
const SHOW_ENTRATA_EMAIL_OPTIONAL_COLUMN = false;

const RESIDENT_ELI_SERVICES = ["ELI+ Maintenance AI", "ELI+ Payments AI", "ELI+ Renewals AI"];
const ALL_ELI_SERVICES = ["ELI+ Leasing AI", ...RESIDENT_ELI_SERVICES];

/** Unique Entrata inbound address users add as a forward destination in their provider (prototype). */
function generateInboundForwardAddress(): string {
  let token: string;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    token = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  } else {
    token = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`.replace(/\./g, "").slice(0, 12);
  }
  return `inbound+${token}@mail.entrata.com`;
}

function filterToOtherProviderServiceTypes(types: string[]): string[] {
  const allowed = new Set<string>(OTHER_PROVIDER_SERVICE_TYPES);
  return types.filter((s) => allowed.has(s));
}

function applyServiceRules(current: string[], toggled: string): string[] {
  if (toggled === "Entrata Email") {
    if (current.includes("Entrata Email")) return current.filter((s) => s !== "Entrata Email");
    return ["Entrata Email"];
  }
  const base = current.filter((s) => s !== "Entrata Email");
  if (toggled === "All Resident ELI+ AI Services") {
    const allSelected = RESIDENT_ELI_SERVICES.every((s) => base.includes(s));
    if (allSelected) return base.filter((s) => !RESIDENT_ELI_SERVICES.includes(s));
    return [...base.filter((s) => s !== "ELI+ Leasing AI" && s !== "All Resident ELI+ AI Services"), ...RESIDENT_ELI_SERVICES];
  }
  if (toggled === "ELI+ Leasing AI") {
    if (base.includes("ELI+ Leasing AI")) return base.filter((s) => s !== "ELI+ Leasing AI");
    return [...base.filter((s) => !RESIDENT_ELI_SERVICES.includes(s) && s !== "All Resident ELI+ AI Services"), "ELI+ Leasing AI"];
  }
  if (RESIDENT_ELI_SERVICES.includes(toggled)) {
    let next = base.filter((s) => s !== "ELI+ Leasing AI" && s !== "All Resident ELI+ AI Services");
    next = next.includes(toggled) ? next.filter((s) => s !== toggled) : [...next, toggled];
    return next;
  }
  return current;
}

function ServiceTypeSelector({
  selected,
  onToggle,
  open,
  onOpenChange,
  dropUp,
  accentColor = "blue",
  serviceOptions,
}: {
  selected: string[];
  onToggle: (svc: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dropUp?: boolean;
  accentColor?: "blue" | "violet";
  /** When set (e.g. IMAP/SMTP only), list is restricted — omit ELI+ AI service rows. */
  serviceOptions?: readonly string[];
}) {
  const accent = accentColor === "violet"
    ? { border: "border-violet-600", bg: "bg-violet-600", badge: "bg-violet-50 border-violet-200 text-violet-700" }
    : { border: "border-blue-600", bg: "bg-blue-600", badge: "bg-blue-50 border-blue-200 text-blue-700" };

  const optionList = serviceOptions ?? SERVICE_TYPES;
  const showEliGroupLabel =
    optionList.includes("All Resident ELI+ AI Services") && RESIDENT_ELI_SERVICES.every((s) => selected.includes(s));

  const displayText = selected.length > 0
    ? (showEliGroupLabel
        ? ["All Resident ELI+ AI Services", ...(selected.includes("Entrata Email") ? ["Entrata Email"] : []), ...(selected.includes("ELI+ Leasing AI") ? ["ELI+ Leasing AI"] : [])].join(", ")
        : selected.join(", "))
    : "Select service types...";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="input-base flex w-full items-center justify-between text-left"
      >
        <span className={`truncate ${selected.length > 0 ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]"}`}>
          {displayText}
        </span>
        <ChevronDown className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
      </button>
      {open && (
        <div className={`absolute z-20 w-full rounded-md border border-[hsl(var(--border))] bg-white py-1 shadow-lg ${dropUp ? "bottom-full mb-1" : "mt-1"}`}>
          {optionList.map((svc) => {
            const isGroup = svc === "All Resident ELI+ AI Services";
            const isChecked = isGroup
              ? RESIDENT_ELI_SERVICES.every((s) => selected.includes(s))
              : selected.includes(svc);
            const hasEntrata = selected.includes("Entrata Email");
            const hasAnyEli = selected.some((s) => ALL_ELI_SERVICES.includes(s));
            const isDisabled = isGroup
              ? hasEntrata
              : svc === "Entrata Email"
                ? hasAnyEli
                : hasEntrata || (
                    (svc === "ELI+ Leasing AI" && selected.some((s) => RESIDENT_ELI_SERVICES.includes(s)))
                    || (RESIDENT_ELI_SERVICES.includes(svc) && selected.includes("ELI+ Leasing AI"))
                  );
            return (
              <button
                key={svc}
                type="button"
                onClick={() => !isDisabled && onToggle(svc)}
                disabled={isDisabled}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${isDisabled ? "opacity-40 cursor-not-allowed" : "hover:bg-[hsl(var(--muted))]/40"} ${isGroup ? "border-b border-[hsl(var(--border))]/30 font-medium" : ""}`}
              >
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isChecked ? `${accent.border} ${accent.bg} text-white` : "border-[hsl(var(--border))]"}`}>
                  {isChecked && (
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  )}
                </span>
                <span className="text-[hsl(var(--foreground))]">{svc}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type EmailAddress = EliEmailAddress;

const ELI_AI_COLS = ["leasing", "maintenance", "payments", "renewals"] as const;
type EliAiCol = typeof ELI_AI_COLS[number];

const ELI_PLUS_PROPERTIES: { id: string; name: string; contracted: EliAiCol[] }[] = [
  { id: "harvest-peak", name: "Harvest Peak Capital", contracted: ["leasing", "maintenance", "payments", "renewals"] },
  { id: "skyline", name: "Skyline Apartments", contracted: ["leasing", "maintenance", "payments", "renewals"] },
  { id: "meridian", name: "The Meridian", contracted: ["leasing", "maintenance", "payments"] },
  { id: "azure", name: "Azure Heights", contracted: ["leasing", "maintenance"] },
  { id: "cambridge", name: "Cambridge Suites", contracted: ["leasing", "payments", "renewals"] },
  { id: "willow-creek", name: "Willow Creek Residences", contracted: ["leasing"] },
  { id: "summit-view", name: "Summit View Towers", contracted: ["leasing", "maintenance", "renewals"] },
  { id: "lakeside", name: "Lakeside Commons", contracted: ["leasing", "payments"] },
  { id: "parkway", name: "Parkway Terrace", contracted: ["leasing", "maintenance", "payments", "renewals"] },
  { id: "cedar-ridge", name: "Cedar Ridge Estates", contracted: ["leasing"] },
  { id: "riverstone", name: "Riverstone Landing", contracted: ["leasing", "maintenance"] },
  { id: "magnolia", name: "Magnolia Gardens", contracted: ["leasing", "renewals"] },
  { id: "ironwood", name: "Ironwood Flats", contracted: ["leasing", "maintenance", "payments"] },
  { id: "brookhaven", name: "Brookhaven Place", contracted: ["leasing"] },
  { id: "silver-oaks", name: "Silver Oaks Village", contracted: ["leasing", "maintenance", "payments", "renewals"] },
  { id: "aspen-grove", name: "Aspen Grove Lofts", contracted: ["leasing", "payments"] },
];

const ELI_AI_COL_LABELS: Record<EliAiCol, string> = {
  leasing: "Leasing AI",
  maintenance: "Maintenance AI",
  payments: "Payments AI",
  renewals: "Renewals AI",
};
const SVC_TO_ELI_COL: Record<string, EliAiCol> = {
  "ELI+ Leasing AI": "leasing",
  "ELI+ Maintenance AI": "maintenance",
  "ELI+ Payments AI": "payments",
  "ELI+ Renewals AI": "renewals",
};

function EliPropertyStatusTable() {
  const { getEmailForProperty } = useEliEmails();
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const colDone = (propName: string, col: EliAiCol): boolean => {
    const email = getEmailForProperty(propName);
    if (!email) return false;
    return email.serviceTypes.some((svc) => SVC_TO_ELI_COL[svc] === col);
  };
  const entrataDone = (propName: string): boolean => {
    const email = getEmailForProperty(propName);
    if (!email) return false;
    return email.serviceTypes.includes("Entrata Email");
  };
  const propEliComplete = (prop: typeof ELI_PLUS_PROPERTIES[number]) =>
    prop.contracted.every((c) => colDone(prop.name, c));
  const completedCount = ELI_PLUS_PROPERTIES.filter((p) => propEliComplete(p)).length;
  const total = ELI_PLUS_PROPERTIES.length;
  const totalPages = Math.ceil(total / pageSize);
  const paged = ELI_PLUS_PROPERTIES.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="mb-6 rounded-lg border border-[hsl(var(--border))] bg-white">
      <div className="px-6 py-4 border-b border-[hsl(var(--border))]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">Status of Custom Email Integration</h3>
            <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
              All contracted ELI+ AI service email integrations must be completed for each property before they can operate within the new Communications Inbox.
              {SHOW_ENTRATA_EMAIL_OPTIONAL_COLUMN && (
                <> Entrata Email is optional and not required for ELI+ activation.</>
              )}{" "}
              Services marked N/A are not contracted for that property.
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
              completedCount === total
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            {completedCount}/{total} ELI+ Complete
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] text-left bg-[hsl(var(--muted))]/30">
              <th className="px-6 py-2.5 font-medium text-[hsl(var(--muted-foreground))] whitespace-nowrap">Property</th>
              <th className="px-4 py-2.5 text-center font-medium text-[hsl(var(--muted-foreground))] whitespace-nowrap text-xs">Connected Email</th>
              {ELI_AI_COLS.map((col) => (
                <th key={col} className="px-3 py-2.5 text-center font-medium text-[hsl(var(--muted-foreground))] whitespace-nowrap text-xs">
                  <span>{ELI_AI_COL_LABELS[col]}</span>
                  <span className="block text-[9px] font-normal text-[hsl(var(--muted-foreground))]/60">Required</span>
                </th>
              ))}
              {SHOW_ENTRATA_EMAIL_OPTIONAL_COLUMN && (
                <th className="px-3 py-2.5 text-center font-medium text-[hsl(var(--muted-foreground))] whitespace-nowrap text-xs">
                  <span>Entrata Email</span>
                  <span className="block text-[9px] font-normal text-[hsl(var(--muted-foreground))]/60">Optional</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paged.map((prop) => {
              const eliDone = propEliComplete(prop);
              const email = getEmailForProperty(prop.name);
              return (
                <tr key={prop.id} className={`border-b border-[hsl(var(--border))]/50 ${eliDone ? "bg-emerald-50/30" : ""}`}>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[hsl(var(--foreground))]">{prop.name}</span>
                      {eliDone && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          ELI+ Ready
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {email ? (
                      <span className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-[140px] inline-block">{email.emailAddress}</span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  {ELI_AI_COLS.map((col) => {
                    const isContracted = prop.contracted.includes(col);
                    if (!isContracted) {
                      return (
                        <td key={col} className="px-3 py-3 text-center">
                          <span className="text-[10px] font-medium text-gray-300">N/A</span>
                        </td>
                      );
                    }
                    const done = colDone(prop.name, col);
                    return (
                      <td key={col} className="px-3 py-3 text-center">
                        {done ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            <span className="text-[9px] font-semibold text-emerald-600">Done</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            <Circle className="h-5 w-5 text-amber-400" />
                            <span className="text-[9px] font-medium text-amber-500">Pending</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                  {SHOW_ENTRATA_EMAIL_OPTIONAL_COLUMN && (
                    <td className="px-3 py-3 text-center">
                      {entrataDone(prop.name) ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          <span className="text-[9px] font-semibold text-emerald-600">Done</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-0.5">
                          <Circle className="h-5 w-5 text-gray-300" />
                          <span className="text-[9px] font-medium text-gray-400">—</span>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {total > pageSize && (
        <div className="flex items-center justify-between border-t border-[hsl(var(--border))] px-6 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded p-1 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))]/40 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </button>
            <span className="text-xs font-medium text-[hsl(var(--foreground))] tabular-nums">
              {page}/{totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded p-1 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))]/40 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomEmailPage() {
  const router = useRouter();
  const { emails, setEmails } = useEliEmails();

  const handleDeleteEmail = (emailId: number) => {
    setEmails((prev) => prev.filter((e) => e.id !== emailId));
  };

  const stripClaimedProperties = (allEmails: EmailAddress[], claimedBy: number, claimedProps: string[]): EmailAddress[] => {
    const claimed = new Set(claimedProps);
    return allEmails.map((e) =>
      e.id === claimedBy ? e : { ...e, properties: e.properties.filter((p) => !claimed.has(p)) }
    );
  };

  const takenPropertiesExcluding = (excludeEmailId?: number) => {
    const taken = new Set<string>();
    emails.forEach((e) => {
      if (e.id !== excludeEmailId) {
        e.properties.forEach((p) => taken.add(p));
      }
    });
    return taken;
  };

  const defaultImapSmtp: ImapSmtpConfig = { enabled: false, address: "", port: "", email: "", password: "", enableSsl: false };
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailModalEditId, setEmailModalEditId] = useState<number | null>(null);
  const [emailForm, setEmailForm] = useState({
    emailAddress: "",
    properties: [] as string[],
    serviceTypes: [] as string[],
    forwardTo: "",
    imapConfig: { ...defaultImapSmtp },
    smtpConfig: { ...defaultImapSmtp },
  });
  const [emailFormPropDropdown, setEmailFormPropDropdown] = useState(false);
  const [emailFormSvcDropdown, setEmailFormSvcDropdown] = useState(false);
  const [forwardToCopied, setForwardToCopied] = useState(false);

  const [assignmentEdit, setAssignmentEdit] = useState<{ emailId: number; properties: string[]; serviceTypes: string[] } | null>(null);
  const [assignPropDropdown, setAssignPropDropdown] = useState(false);
  const [assignSvcDropdown, setAssignSvcDropdown] = useState(false);

  const MOCK_ACCOUNTS = [
    { name: "John Smith", email: "john.smith@gmail.com", initials: "JS", color: "bg-blue-500" },
    { name: "John Smith", email: "john.smith@entrata.com", initials: "JS", color: "bg-emerald-500" },
    { name: "Sarah Johnson", email: "sarah.j@gmail.com", initials: "SJ", color: "bg-purple-500" },
  ];

  type OauthStep = "select-config" | "choose-account" | "confirm" | "permissions" | "connecting" | "done";

  const [oauthModal, setOauthModal] = useState<{
    provider: "google" | "microsoft";
    step: OauthStep;
    selectedEmail: string;
    selectedName: string;
    ongoingAccess: boolean;
    selectedProperties: string[];
    selectedServiceTypes: string[];
    propDropdownOpen: boolean;
    svcDropdownOpen: boolean;
  } | null>(null);

  const openOauthModal = (provider: "google" | "microsoft") => {
    setOauthModal({
      provider, step: "select-config",
      selectedEmail: "", selectedName: "", ongoingAccess: false,
      selectedProperties: [], selectedServiceTypes: [],
      propDropdownOpen: false, svcDropdownOpen: false,
    });
  };

  const toggleOauthProp = (prop: string) => {
    setOauthModal((prev) => {
      if (!prev) return prev;
      const next = prev.selectedProperties.includes(prop)
        ? prev.selectedProperties.filter((p) => p !== prop)
        : [...prev.selectedProperties, prop];
      return { ...prev, selectedProperties: next };
    });
  };

  const toggleOauthSvc = (svc: string) => {
    setOauthModal((prev) => {
      if (!prev) return prev;
      const next = applyServiceRules(prev.selectedServiceTypes, svc);
      return { ...prev, selectedServiceTypes: next };
    });
  };

  const handleOauthConfigContinue = () => {
    setOauthModal((prev) => prev && { ...prev, step: "choose-account", propDropdownOpen: false, svcDropdownOpen: false });
  };

  const handleOauthSelectAccount = (name: string, email: string) => {
    setOauthModal((prev) => prev && { ...prev, step: "confirm", selectedEmail: email, selectedName: name });
  };

  const handleOauthUseAnother = () => {
    setOauthModal((prev) => prev && { ...prev, step: "confirm", selectedEmail: "", selectedName: "" });
  };

  const handleOauthConfirmContinue = () => {
    setOauthModal((prev) => prev && { ...prev, step: "permissions" });
  };

  const handleOauthGrantAccess = () => {
    if (!oauthModal) return;
    const email = oauthModal.selectedEmail.trim();
    if (!email) return;
    setOauthModal((prev) => prev && { ...prev, step: "connecting" });
    setTimeout(() => {
      const newId = Date.now();
      const claimedProps = oauthModal.selectedProperties;
      setEmails((prev) => stripClaimedProperties([
        ...prev,
        {
          id: newId,
          emailAddress: email,
          forwardTo: email,
          properties: claimedProps,
          serviceTypes: oauthModal.selectedServiceTypes.filter((s) => s !== "All Resident ELI+ AI Services"),
          imapConfig: { ...defaultImapSmtp },
          smtpConfig: { ...defaultImapSmtp },
          status: "active" as const,
          created: new Date().toISOString().split("T")[0],
          integration: oauthModal.provider,
        },
      ], newId, claimedProps));
      setOauthModal((prev) => prev && { ...prev, step: "done" });
      setTimeout(() => setOauthModal(null), 1500);
    }, 1800);
  };

  const openAddEmailModal = () => {
    setEmailModalEditId(null);
    setEmailForm({
      emailAddress: "",
      properties: [],
      serviceTypes: [],
      forwardTo: generateInboundForwardAddress(),
      imapConfig: { ...defaultImapSmtp },
      smtpConfig: { ...defaultImapSmtp },
    });
    setEmailModalOpen(true);
  };

  const openEditEmailModal = (email: EmailAddress) => {
    setEmailModalEditId(email.id);
    const ft = email.forwardTo?.trim();
    setEmailForm({
      emailAddress: email.emailAddress,
      properties: [...email.properties],
      serviceTypes: filterToOtherProviderServiceTypes(email.serviceTypes),
      forwardTo: ft || generateInboundForwardAddress(),
      imapConfig: { ...email.imapConfig },
      smtpConfig: { ...email.smtpConfig },
    });
    setEmailModalOpen(true);
  };

  const closeEmailModal = () => {
    setEmailModalOpen(false);
    setEmailModalEditId(null);
    setEmailFormPropDropdown(false);
    setEmailFormSvcDropdown(false);
    setForwardToCopied(false);
  };

  const handleEmailModalComplete = () => {
    if (!emailForm.emailAddress.trim() || emailForm.properties.length === 0) return;
    const isSmtpActive = emailForm.smtpConfig.enabled && emailForm.smtpConfig.address.trim() !== "";
    const isImapActive = emailForm.imapConfig.enabled && emailForm.imapConfig.address.trim() !== "";

    if (emailModalEditId) {
      setEmails((prev) =>
        stripClaimedProperties(
          prev.map((e) =>
            e.id === emailModalEditId
              ? {
                  ...e,
                  emailAddress: emailForm.emailAddress.trim(),
                  forwardTo: emailForm.forwardTo,
                  properties: emailForm.properties,
                  serviceTypes: filterToOtherProviderServiceTypes(
                    emailForm.serviceTypes.filter((s) => s !== "All Resident ELI+ AI Services")
                  ),
                  imapConfig: emailForm.imapConfig,
                  smtpConfig: emailForm.smtpConfig,
                  status: (isSmtpActive || isImapActive ? "active" : e.status) as "active" | "disabled",
                }
              : e
          ),
          emailModalEditId,
          emailForm.properties,
        )
      );
    } else {
      const newId = Date.now();
      setEmails((prev) =>
        stripClaimedProperties([
          ...prev,
          {
            id: newId,
            emailAddress: emailForm.emailAddress.trim(),
            forwardTo: emailForm.forwardTo,
            properties: emailForm.properties,
            serviceTypes: filterToOtherProviderServiceTypes(
              emailForm.serviceTypes.filter((s) => s !== "All Resident ELI+ AI Services")
            ),
            imapConfig: emailForm.imapConfig,
            smtpConfig: emailForm.smtpConfig,
            status: (isSmtpActive || isImapActive ? "active" : "disabled") as "active" | "disabled",
            created: new Date().toISOString().split("T")[0],
          },
        ], newId, emailForm.properties)
      );
    }
    closeEmailModal();
  };

  const toggleEmailFormProp = (prop: string) => {
    setEmailForm((prev) => ({
      ...prev,
      properties: prev.properties.includes(prop) ? prev.properties.filter((p) => p !== prop) : [...prev.properties, prop],
    }));
  };

  const toggleEmailFormSvc = (svc: string) => {
    setEmailForm((prev) => ({
      ...prev,
      serviceTypes: applyServiceRules(prev.serviceTypes, svc),
    }));
  };

  return (
    <div className="mx-auto max-w-[56rem] px-4 pb-12 pt-8 sm:px-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mb-8">
        <h1
          className="text-2xl font-medium tracking-tight text-[hsl(var(--foreground))]"
          style={{ fontFamily: "Nohemi, Plus Jakarta Sans, Inter, sans-serif" }}
        >
          Setup Email Integration for Communications
        </h1>
        <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">
          Configure email address integrations for ELI+ AI services and the centralized Communication Inbox. Connect custom email addresses so automated and staff-managed conversations are sent from your own domain, ensuring residents receive messages from a familiar, branded address.
        </p>
      </div>

      <EliPropertyStatusTable />

      <div className="rounded-lg border border-[hsl(var(--border))] bg-white">
        <div className="px-6 py-6 space-y-4">
          <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">
            Email Integration Setup
          </h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Set up ELI+ for the new Communication Inbox and Conversation Panel. If you previously configured email integration with Colleen AI Agents, you will need to re-integrate that email address here. If you are setting up ELI+ for the first time, this is where to begin. Each property&apos;s AI service may only have one connected email address.
          </p>

          <div className="flex items-center justify-center gap-4 py-2">
            <button
              type="button"
              onClick={() => openOauthModal("google")}
              className="inline-flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] bg-white px-6 py-3 text-sm font-medium text-[hsl(var(--foreground))] shadow-sm transition-all hover:bg-gray-50 hover:shadow-md"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
            <button
              type="button"
              onClick={() => openOauthModal("microsoft")}
              className="inline-flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] bg-white px-6 py-3 text-sm font-medium text-[hsl(var(--foreground))] shadow-sm transition-all hover:bg-gray-50 hover:shadow-md"
            >
              <svg className="h-5 w-5" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
              </svg>
              Sign in with Microsoft
            </button>
            {SHOW_OTHER_SERVICE_PROVIDERS_BUTTON && (
              <button
                type="button"
                onClick={openAddEmailModal}
                className="inline-flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] bg-white px-6 py-3 text-sm font-medium text-[hsl(var(--foreground))] shadow-sm transition-all hover:bg-gray-50 hover:shadow-md"
              >
                <Globe className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                Other Service Providers
              </button>
            )}
          </div>

          {(() => {
            const connected = emails.filter((e) => {
              if (e.integration) return true;
              return e.imapConfig.enabled && e.smtpConfig.enabled;
            });
            const pending = emails.filter((e) => {
              if (e.integration) return false;
              return !e.imapConfig.enabled || !e.smtpConfig.enabled;
            });

            const renderEmailCard = (email: EmailAddress) => {
              const imapOk = email.imapConfig.enabled && !!email.imapConfig.address && !!email.imapConfig.port;
              const smtpOk = email.smtpConfig.enabled && !!email.smtpConfig.address && !!email.smtpConfig.port;
              const isImapSmtp = !email.integration;

              return (
                <div key={email.id} className="rounded-lg border border-[hsl(var(--border))] bg-white">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-sm font-medium text-[hsl(var(--foreground))]">{email.emailAddress}</span>
                      {email.integration === "google" && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                          <svg className="h-4 w-4" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          Google
                        </span>
                      )}
                      {email.integration === "microsoft" && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                          <svg className="h-4 w-4" viewBox="0 0 21 21">
                            <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                            <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                            <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                            <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                          </svg>
                          Microsoft
                        </span>
                      )}
                      {isImapSmtp && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                          <Globe className="h-3.5 w-3.5" />
                          IMAP/SMTP
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!email.integration) {
                            openEditEmailModal(email);
                          } else {
                            setAssignmentEdit({ emailId: email.id, properties: [...email.properties], serviceTypes: [...email.serviceTypes] });
                          }
                        }}
                        className="rounded p-1.5 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))]/40 hover:text-[hsl(var(--foreground))]"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEmail(email.id)}
                        className="rounded-full p-1 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Remove email"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M15 9l-6 6M9 9l6 6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {isImapSmtp && (
                    <div className="border-t border-[hsl(var(--border))]/40 px-4 py-2 flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        {imapOk ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <svg className="h-3.5 w-3.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                        )}
                        <span className={`text-[11px] font-medium ${imapOk ? "text-emerald-700" : "text-amber-700"}`}>
                          IMAP {imapOk ? "Configured" : "Not Configured"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {smtpOk ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <svg className="h-3.5 w-3.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                        )}
                        <span className={`text-[11px] font-medium ${smtpOk ? "text-emerald-700" : "text-amber-700"}`}>
                          SMTP {smtpOk ? "Configured" : "Not Configured"}
                        </span>
                      </div>
                      {imapOk && smtpOk && (
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Verified
                        </span>
                      )}
                      {(!imapOk || !smtpOk) && (
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          Setup Incomplete
                        </span>
                      )}
                    </div>
                  )}
                  {(email.properties.length > 0 || email.serviceTypes.length > 0) && (
                    <div className="border-t border-[hsl(var(--border))]/40 px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      {email.properties.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Properties:</span>
                          <div className="flex flex-wrap gap-1">
                            {email.properties.map((p) => (
                              <span key={p} className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--foreground))]">{p}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {email.serviceTypes.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Service Types:</span>
                          <div className="flex flex-wrap gap-1">
                            {email.serviceTypes.map((s) => (
                              <span key={s} className="rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-[11px] font-medium text-violet-700">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            };

            return (
              <>
                {/* Connected Email Addresses */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">
                      Connected Email Addresses
                    </h4>
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      {connected.length} connected
                    </span>
                  </div>
                  {connected.length > 0 ? (
                    <div className="space-y-2">{connected.map(renderEmailCard)}</div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/10 py-6 text-center">
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">No connected email addresses yet.</p>
                    </div>
                  )}
                </div>

                {/* Pending Configuration */}
                {pending.length > 0 && (
                  <div className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">
                        Pending Configuration
                      </h4>
                      <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        {pending.length} pending
                      </span>
                    </div>
                    <p className="mb-2 text-xs text-[hsl(var(--muted-foreground))]">
                      These email addresses need their IMAP and SMTP settings configured before they can be used.
                    </p>
                    <div className="space-y-2">{pending.map(renderEmailCard)}</div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={closeEmailModal} />
          <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-[hsl(var(--border))] bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[hsl(var(--border))] bg-white px-6 py-4 rounded-t-xl">
              <div>
                <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                  {emailModalEditId ? "Edit Email Address" : "Other Service Providers"}
                </h2>
                <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                  {emailModalEditId
                    ? "Update this email address configuration"
                    : "Set up a custom email address with IMAP/SMTP for providers other than Google or Microsoft"}
                </p>
              </div>
              <button type="button" onClick={closeEmailModal} className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/40 hover:text-[hsl(var(--foreground))] transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[hsl(var(--foreground))]">Email Address</label>
                <input
                  type="email"
                  value={emailForm.emailAddress}
                  onChange={(e) => setEmailForm((prev) => ({ ...prev, emailAddress: e.target.value }))}
                  placeholder="e.g. test-prod@entrata-nexus.com"
                  className="input-base w-full"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[hsl(var(--foreground))]">Service Types</label>
                <ServiceTypeSelector
                  serviceOptions={OTHER_PROVIDER_SERVICE_TYPES}
                  selected={emailForm.serviceTypes}
                  onToggle={(svc) => { toggleEmailFormSvc(svc); }}
                  open={emailFormSvcDropdown}
                  onOpenChange={(v) => { setEmailFormSvcDropdown(v); if (v) setEmailFormPropDropdown(false); }}
                />
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  For IMAP/SMTP, only Entrata Email applies. Connect with Google or Microsoft above to assign ELI+ AI services.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[hsl(var(--foreground))]">Properties</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setEmailFormPropDropdown(!emailFormPropDropdown); setEmailFormSvcDropdown(false); }}
                    className="input-base flex w-full items-center justify-between text-left"
                  >
                    <span className={emailForm.properties.length > 0 ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]"}>
                      {emailForm.properties.length > 0
                        ? `${emailForm.properties.length} Propert${emailForm.properties.length === 1 ? "y" : "ies"} selected`
                        : "Select properties..."}
                    </span>
                    <ChevronDown className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  </button>
                  {emailFormPropDropdown && (() => {
                    const taken = takenPropertiesExcluding(emailModalEditId ?? undefined);
                    return (
                      <div className="absolute z-20 mt-1 w-full rounded-md border border-[hsl(var(--border))] bg-white py-1 shadow-lg max-h-48 overflow-y-auto">
                        {PROPERTIES.map((prop) => {
                          const isTaken = taken.has(prop) && !emailForm.properties.includes(prop);
                          return (
                            <button
                              key={prop}
                              type="button"
                              disabled={isTaken}
                              onClick={() => !isTaken && toggleEmailFormProp(prop)}
                              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${isTaken ? "opacity-40 cursor-not-allowed" : "hover:bg-[hsl(var(--muted))]/40"}`}
                            >
                              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${emailForm.properties.includes(prop) ? "border-blue-600 bg-blue-600 text-white" : "border-[hsl(var(--border))]"}`}>
                                {emailForm.properties.includes(prop) && (
                                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                )}
                              </span>
                              <span className="text-[hsl(var(--foreground))]">{prop}</span>
                              {isTaken && <span className="ml-auto text-[10px] text-[hsl(var(--muted-foreground))]">Already assigned</span>}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Select one or more properties to associate with this email address</p>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-blue-600">
                  Forward to Email
                  <Info className="h-3.5 w-3.5" />
                </label>
                <p className="mb-2 text-xs text-[hsl(var(--muted-foreground))]">Start forwarding your emails to the following email address.</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={emailForm.forwardTo}
                    readOnly
                    className="input-base flex-1 bg-[hsl(var(--muted))]/30"
                  />
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(emailForm.forwardTo); setForwardToCopied(true); setTimeout(() => setForwardToCopied(false), 2000); }}
                    className="btn-secondary h-9 px-4 text-xs shrink-0"
                  >
                    {forwardToCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <hr className="border-[hsl(var(--border))]" />

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-blue-600">
                  IMAP
                  <Info className="h-3.5 w-3.5" />
                </label>
                <p className="mb-3 text-xs text-[hsl(var(--muted-foreground))]">Set your IMAP details</p>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${emailForm.imapConfig.enabled ? "border-blue-600 bg-blue-600 text-white" : "border-[hsl(var(--border))]"}`}>
                    {emailForm.imapConfig.enabled && (
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    checked={emailForm.imapConfig.enabled}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, imapConfig: { ...prev.imapConfig, enabled: e.target.checked } }))}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-[hsl(var(--foreground))]">Enable IMAP configuration for this inbox</span>
                </label>
                <p className="mt-1 ml-[30px] text-xs text-[hsl(var(--muted-foreground))]">Enabling IMAP will help the user to receive email</p>

                {emailForm.imapConfig.enabled && (
                  <div className="mt-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/10 p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[hsl(var(--foreground))]">Address</label>
                        <input type="text" value={emailForm.imapConfig.address} onChange={(e) => setEmailForm((prev) => ({ ...prev, imapConfig: { ...prev.imapConfig, address: e.target.value } }))} placeholder="imap.gmail.com" className="input-base w-full text-xs" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[hsl(var(--foreground))]">Port</label>
                        <input type="text" value={emailForm.imapConfig.port} onChange={(e) => setEmailForm((prev) => ({ ...prev, imapConfig: { ...prev.imapConfig, port: e.target.value } }))} placeholder="993" className="input-base w-full text-xs" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[hsl(var(--foreground))]">Email</label>
                        <input type="email" value={emailForm.imapConfig.email} onChange={(e) => setEmailForm((prev) => ({ ...prev, imapConfig: { ...prev.imapConfig, email: e.target.value } }))} placeholder="user@domain.com" className="input-base w-full text-xs" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[hsl(var(--foreground))]">Password</label>
                        <input type="password" value={emailForm.imapConfig.password} onChange={(e) => setEmailForm((prev) => ({ ...prev, imapConfig: { ...prev.imapConfig, password: e.target.value } }))} placeholder="••••••••" className="input-base w-full text-xs" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-blue-600">
                  SMTP
                  <Info className="h-3.5 w-3.5" />
                </label>
                <p className="mb-3 text-xs text-[hsl(var(--muted-foreground))]">Set your SMTP details</p>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${emailForm.smtpConfig.enabled ? "border-blue-600 bg-blue-600 text-white" : "border-[hsl(var(--border))]"}`}>
                    {emailForm.smtpConfig.enabled && (
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    checked={emailForm.smtpConfig.enabled}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, smtpConfig: { ...prev.smtpConfig, enabled: e.target.checked } }))}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-[hsl(var(--foreground))]">Enable SMTP configuration for this inbox</span>
                </label>
                <p className="mt-1 ml-[30px] text-xs text-[hsl(var(--muted-foreground))]">Enabling SMTP will help the user to send email</p>

                {emailForm.smtpConfig.enabled && (
                  <div className="mt-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/10 p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[hsl(var(--foreground))]">Address</label>
                        <input type="text" value={emailForm.smtpConfig.address} onChange={(e) => setEmailForm((prev) => ({ ...prev, smtpConfig: { ...prev.smtpConfig, address: e.target.value } }))} placeholder="smtp.gmail.com" className="input-base w-full text-xs" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[hsl(var(--foreground))]">Port</label>
                        <input type="text" value={emailForm.smtpConfig.port} onChange={(e) => setEmailForm((prev) => ({ ...prev, smtpConfig: { ...prev.smtpConfig, port: e.target.value } }))} placeholder="465" className="input-base w-full text-xs" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[hsl(var(--foreground))]">Email</label>
                        <input type="email" value={emailForm.smtpConfig.email} onChange={(e) => setEmailForm((prev) => ({ ...prev, smtpConfig: { ...prev.smtpConfig, email: e.target.value } }))} placeholder="user@domain.com" className="input-base w-full text-xs" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[hsl(var(--foreground))]">Password</label>
                        <input type="password" value={emailForm.smtpConfig.password} onChange={(e) => setEmailForm((prev) => ({ ...prev, smtpConfig: { ...prev.smtpConfig, password: e.target.value } }))} placeholder="••••••••" className="input-base w-full text-xs" />
                      </div>
                    </div>
                    <label className="flex items-center gap-2.5 cursor-pointer mt-2">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${emailForm.smtpConfig.enableSsl ? "border-blue-600 bg-blue-600 text-white" : "border-[hsl(var(--border))]"}`}>
                        {emailForm.smtpConfig.enableSsl && (
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        )}
                      </span>
                      <input
                        type="checkbox"
                        checked={emailForm.smtpConfig.enableSsl}
                        onChange={(e) => setEmailForm((prev) => ({ ...prev, smtpConfig: { ...prev.smtpConfig, enableSsl: e.target.checked } }))}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium text-[hsl(var(--foreground))]">Enable SSL</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-[hsl(var(--border))] bg-white px-6 py-4 rounded-b-xl">
              <button type="button" onClick={closeEmailModal} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEmailModalComplete}
                disabled={!emailForm.emailAddress.trim() || emailForm.properties.length === 0}
                className="btn-primary disabled:pointer-events-none disabled:opacity-50"
              >
                Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {oauthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOauthModal(null)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center gap-2.5 border-b border-gray-200 bg-gray-50/80 px-5 py-3 rounded-t-2xl">
              {oauthModal.provider === "google" ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                </svg>
              )}
              <span className="text-sm font-medium text-gray-700">
                Sign in with {oauthModal.provider === "google" ? "Google" : "Microsoft"}
              </span>
            </div>

            {oauthModal.step === "select-config" && (
              <div className="px-8 py-8">
                <h2 className="text-lg font-semibold text-gray-900">Configure Email Assignment</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Select the service types and properties this email address will be associated with before connecting your account.
                </p>
                <div className="mt-6 space-y-5">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-900">Service Type</label>
                    <ServiceTypeSelector
                      serviceOptions={ELI_CONNECT_SERVICE_TYPES}
                      selected={oauthModal.selectedServiceTypes}
                      onToggle={toggleOauthSvc}
                      open={oauthModal.svcDropdownOpen}
                      onOpenChange={(v) => setOauthModal((prev) => prev && { ...prev, svcDropdownOpen: v, propDropdownOpen: false })}
                      dropUp
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-900">Properties</label>
                    <div className="relative">
                      <button type="button" onClick={() => setOauthModal((prev) => prev && { ...prev, propDropdownOpen: !prev.propDropdownOpen, svcDropdownOpen: false })} className="input-base flex w-full items-center justify-between text-left">
                        <span className={oauthModal.selectedProperties.length > 0 ? "text-gray-900" : "text-gray-400"}>
                          {oauthModal.selectedProperties.length > 0 ? `${oauthModal.selectedProperties.length} Propert${oauthModal.selectedProperties.length === 1 ? "y" : "ies"} selected` : "Select properties..."}
                        </span>
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </button>
                      {oauthModal.propDropdownOpen && (() => {
                        const taken = takenPropertiesExcluding();
                        return (
                          <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white py-1 shadow-lg max-h-48 overflow-y-auto">
                            {PROPERTIES.map((prop) => {
                              const isTaken = taken.has(prop);
                              return (
                                <button key={prop} type="button" onClick={() => !isTaken && toggleOauthProp(prop)} disabled={isTaken} className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${isTaken ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"}`}>
                                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${oauthModal.selectedProperties.includes(prop) ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300"}`}>
                                    {oauthModal.selectedProperties.includes(prop) && (<svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>)}
                                  </span>
                                  <span className="text-gray-900">{prop}</span>
                                  {isTaken && <span className="ml-auto text-[10px] text-gray-400">Already assigned</span>}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                    {oauthModal.selectedProperties.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {oauthModal.selectedProperties.map((prop) => (
                          <span key={prop} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-700">
                            {prop}
                            <button type="button" onClick={() => toggleOauthProp(prop)} className="ml-0.5 text-gray-400 hover:text-gray-600"><svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-8 flex items-center justify-end gap-3">
                  <button type="button" onClick={() => setOauthModal(null)} className="rounded-full border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">Cancel</button>
                  <button type="button" onClick={handleOauthConfigContinue} disabled={oauthModal.selectedProperties.length === 0 || oauthModal.selectedServiceTypes.length === 0} className="rounded-full border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:pointer-events-none disabled:opacity-40">Continue</button>
                </div>
              </div>
            )}

            {oauthModal.step === "choose-account" && (
              <div className="px-8 py-8">
                <div className="flex gap-10">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-blue-600 tracking-wide">Entrata</p>
                    <h2 className="mt-4 text-2xl font-normal text-gray-900 leading-tight">Choose an account</h2>
                    <p className="mt-1 text-sm text-gray-500">to continue to <span className="text-blue-600 hover:underline cursor-pointer">Entrata</span></p>
                  </div>
                  <div className="w-64 space-y-1">
                    {MOCK_ACCOUNTS.map((acct) => (
                      <button key={acct.email} type="button" onClick={() => handleOauthSelectAccount(acct.name, acct.email)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-100">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-xs font-semibold ${acct.color}`}>{acct.initials}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{acct.name}</p>
                          <p className="text-xs text-gray-500 truncate">{acct.email}</p>
                        </div>
                      </button>
                    ))}
                    <button type="button" onClick={handleOauthUseAnother} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-100">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 text-gray-400">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                      <p className="text-sm font-medium text-gray-900">Use another account</p>
                    </button>
                  </div>
                </div>
                <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-4">
                  <p className="text-xs text-gray-400">Before using this app, you can review Entrata&apos;s <span className="text-blue-600 cursor-pointer hover:underline">privacy policy</span> and <span className="text-blue-600 cursor-pointer hover:underline">terms of service</span>.</p>
                </div>
              </div>
            )}

            {oauthModal.step === "confirm" && (
              <div className="px-8 py-8">
                {oauthModal.selectedEmail ? (
                  <div className="flex gap-8">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-blue-600 tracking-wide">Entrata</p>
                      <h2 className="mt-4 text-xl font-normal text-gray-900 leading-tight">You&apos;re signing back in to Entrata</h2>
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-[10px] font-semibold text-white">{oauthModal.selectedName.split(" ").map((w) => w[0]).join("").slice(0, 2)}</div>
                        <span className="text-sm text-gray-700">{oauthModal.selectedEmail}</span>
                        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                      </div>
                    </div>
                    <div className="w-56 space-y-3">
                      <p className="text-sm text-gray-600 leading-relaxed">Review Entrata&apos;s <span className="text-blue-600 cursor-pointer hover:underline">Privacy Policy</span> and <span className="text-blue-600 cursor-pointer hover:underline">Terms of Service</span> to understand how Entrata will process and protect your data.</p>
                      <p className="text-sm text-gray-600 leading-relaxed">To make changes at any time, go to your <span className="text-blue-600 cursor-pointer hover:underline">{oauthModal.provider === "google" ? "Google Account" : "Microsoft Account"}</span>.</p>
                      <p className="text-sm text-gray-600 leading-relaxed">Learn more about <span className="text-blue-600 cursor-pointer hover:underline">Sign in with {oauthModal.provider === "google" ? "Google" : "Microsoft"}</span>.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs font-medium text-blue-600 tracking-wide">Entrata</p>
                    <h2 className="text-xl font-normal text-gray-900">Sign in with another account</h2>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Email Address</label>
                      <input type="email" value={oauthModal.selectedEmail} onChange={(e) => setOauthModal((prev) => prev && { ...prev, selectedEmail: e.target.value })} placeholder={oauthModal.provider === "google" ? "you@gmail.com" : "you@outlook.com"} className="input-base w-full" autoFocus />
                    </div>
                  </div>
                )}
                <div className="mt-6 flex items-center justify-end gap-3">
                  <button type="button" onClick={() => setOauthModal(null)} className="rounded-full border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">Cancel</button>
                  <button type="button" onClick={handleOauthConfirmContinue} disabled={!oauthModal.selectedEmail.trim()} className="rounded-full border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:pointer-events-none disabled:opacity-40">Continue</button>
                </div>
              </div>
            )}

            {oauthModal.step === "permissions" && (
              <div className="max-h-[80vh] overflow-y-auto">
                <div className="px-8 py-8">
                  <div className="flex gap-8">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-blue-600 tracking-wide">Entrata</p>
                      <h2 className="mt-4 text-xl font-normal text-gray-900 leading-tight">Entrata wants additional access to your {oauthModal.provider === "google" ? "Google" : "Microsoft"} Account</h2>
                      <div className="mt-4 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-[10px] font-semibold text-white">{oauthModal.selectedName ? oauthModal.selectedName.split(" ").map((w) => w[0]).join("").slice(0, 2) : "U"}</div>
                        <span className="text-sm text-gray-700">{oauthModal.selectedEmail}</span>
                      </div>
                    </div>
                    <div className="w-60 space-y-4">
                      <div className="rounded-lg bg-blue-50 p-4">
                        <div className="flex gap-2">
                          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                          <p className="text-xs leading-relaxed text-blue-800">If you allow Entrata access to your {oauthModal.provider === "google" ? "Gmail" : "Outlook"} data, {oauthModal.provider === "google" ? "Google" : "Microsoft"} will ask you to review their access to your account data every 6 months, and this access will expire on <span className="font-semibold">September 6, 2026</span>.</p>
                        </div>
                        <div className="mt-3 border-t border-blue-200 pt-3">
                          <p className="text-xs leading-relaxed text-blue-700">You can also choose to allow Entrata ongoing access to the account data you&apos;re sharing today. This means you won&apos;t need to review their access every 6 months.</p>
                          <label className="mt-2.5 flex items-start gap-2 cursor-pointer">
                            <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${oauthModal.ongoingAccess ? "border-blue-600 bg-blue-600 text-white" : "border-gray-400 bg-white"}`}>
                              {oauthModal.ongoingAccess && (<svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>)}
                            </span>
                            <input type="checkbox" checked={oauthModal.ongoingAccess} onChange={(e) => setOauthModal((prev) => prev && { ...prev, ongoingAccess: e.target.checked })} className="sr-only" />
                            <span className="text-xs text-blue-800 leading-relaxed">I want to allow Entrata ongoing access to the account data I&apos;m sharing today</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 space-y-4">
                    <h3 className="text-base font-normal text-gray-900">When you allow this access, <span className="text-blue-600">Entrata</span> will be able to</h3>
                    <div className="flex items-start gap-3">
                      <svg className="mt-0.5 h-6 w-6 shrink-0" viewBox="0 0 24 24">
                        <path d="M20 18h-2V9.25L12 13 6 9.25V18H4V6h1.2l6.8 4.25L18.8 6H20m0-2H4c-1.11 0-2 .89-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z" fill={oauthModal.provider === "google" ? "#EA4335" : "#0078D4"}/>
                      </svg>
                      <p className="text-sm text-gray-900">Read, compose, and send emails from your {oauthModal.provider === "google" ? "Gmail" : "Outlook"} account. <span className="text-blue-600 cursor-pointer hover:underline text-xs">Learn more</span></p>
                    </div>
                    <div className="rounded-lg bg-blue-50 px-4 py-3">
                      <div className="flex items-start gap-2">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">Entrata already has some access</p>
                          <p className="mt-0.5 text-xs text-blue-700">See the <span className="text-blue-600 underline cursor-pointer">3 services</span> that Entrata has some access to.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 space-y-3 border-t border-gray-200 pt-6">
                    <h3 className="text-base font-normal text-gray-900">Make sure you trust Entrata</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">Review Entrata&apos;s <span className="text-blue-600 cursor-pointer hover:underline">Privacy Policy</span> and <span className="text-blue-600 cursor-pointer hover:underline">Terms of Service</span> to understand how Entrata will process and protect your data.</p>
                    <p className="text-sm text-gray-600 leading-relaxed">To make changes at any time, go to your <span className="text-blue-600 cursor-pointer hover:underline">{oauthModal.provider === "google" ? "Google Account" : "Microsoft Account"}</span>.</p>
                    <p className="text-sm text-gray-600 leading-relaxed">Learn how {oauthModal.provider === "google" ? "Google" : "Microsoft"} helps you <span className="text-blue-600 cursor-pointer hover:underline">share data safely</span>.</p>
                  </div>
                  <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-5">
                    <button type="button" onClick={() => setOauthModal(null)} className="rounded-full border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">Cancel</button>
                    <button type="button" onClick={handleOauthGrantAccess} className="rounded-full border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50">Continue</button>
                  </div>
                </div>
              </div>
            )}

            {oauthModal.step === "connecting" && (
              <div className="flex flex-col items-center gap-4 px-8 py-16">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
                <p className="text-sm font-medium text-gray-900">Connecting to {oauthModal.provider === "google" ? "Google" : "Microsoft"}...</p>
                <p className="text-xs text-gray-500">Authorizing access for {oauthModal.selectedEmail}</p>
              </div>
            )}

            {oauthModal.step === "done" && (
              <div className="flex flex-col items-center gap-4 px-8 py-16">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <p className="text-base font-medium text-gray-900">Successfully connected!</p>
                <p className="text-sm text-gray-500">{oauthModal.selectedEmail} has been integrated using {oauthModal.provider === "google" ? "Google" : "Microsoft"}.</p>
              </div>
            )}
          </div>
        </div>
      )}
      {assignmentEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setAssignmentEdit(null); setAssignPropDropdown(false); setAssignSvcDropdown(false); }} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-[hsl(var(--border))] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Edit Assignment</h2>
                <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                  {emails.find((e) => e.id === assignmentEdit.emailId)?.emailAddress}
                </p>
              </div>
              <button type="button" onClick={() => { setAssignmentEdit(null); setAssignPropDropdown(false); setAssignSvcDropdown(false); }} className="rounded p-1.5 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))]/40">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">Properties</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setAssignPropDropdown(!assignPropDropdown); setAssignSvcDropdown(false); }}
                    className="flex w-full items-center justify-between rounded-md border border-[hsl(var(--border))] bg-white px-3 py-2 text-sm transition-colors hover:bg-[hsl(var(--muted))]/20"
                  >
                    <div className="flex flex-wrap gap-1 min-h-[20px]">
                      {assignmentEdit.properties.length === 0 ? (
                        <span className="text-[hsl(var(--muted-foreground))]">Select properties...</span>
                      ) : (
                        assignmentEdit.properties.map((p) => (
                          <span key={p} className="rounded bg-[hsl(var(--muted))] px-1.5 py-0.5 text-xs font-medium text-[hsl(var(--foreground))]">{p}</span>
                        ))
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                  </button>
                  {assignPropDropdown && (() => {
                    const taken = takenPropertiesExcluding(assignmentEdit.emailId);
                    return (
                      <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-md border border-[hsl(var(--border))] bg-white py-1 shadow-lg max-h-48 overflow-y-auto">
                        {PROPERTIES.map((p) => {
                          const isTaken = taken.has(p) && !assignmentEdit.properties.includes(p);
                          return (
                            <button
                              key={p}
                              type="button"
                              disabled={isTaken}
                              onClick={() => {
                                if (isTaken) return;
                                setAssignmentEdit((prev) => {
                                  if (!prev) return prev;
                                  const next = prev.properties.includes(p) ? prev.properties.filter((x) => x !== p) : [...prev.properties, p];
                                  return { ...prev, properties: next };
                                });
                              }}
                              className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors ${isTaken ? "opacity-40 cursor-not-allowed" : "hover:bg-[hsl(var(--muted))]/30"}`}
                            >
                              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${assignmentEdit.properties.includes(p) ? "border-violet-600 bg-violet-600 text-white" : "border-[hsl(var(--border))]"}`}>
                                {assignmentEdit.properties.includes(p) && (
                                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                )}
                              </span>
                              {p}
                              {isTaken && <span className="ml-auto text-[10px] text-[hsl(var(--muted-foreground))]">Already assigned</span>}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">Service Types</label>
                <ServiceTypeSelector
                  serviceOptions={ELI_CONNECT_SERVICE_TYPES}
                  selected={assignmentEdit.serviceTypes}
                  onToggle={(svc) => {
                    setAssignmentEdit((prev) => {
                      if (!prev) return prev;
                      return { ...prev, serviceTypes: applyServiceRules(prev.serviceTypes, svc) };
                    });
                  }}
                  open={assignSvcDropdown}
                  onOpenChange={(v) => { setAssignSvcDropdown(v); if (v) setAssignPropDropdown(false); }}
                  accentColor="violet"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-[hsl(var(--border))] px-6 py-4">
              <button
                type="button"
                onClick={() => { setAssignmentEdit(null); setAssignPropDropdown(false); setAssignSvcDropdown(false); }}
                className="rounded-md border border-[hsl(var(--border))] bg-white px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] shadow-sm transition-colors hover:bg-[hsl(var(--muted))]/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmails((prev) => stripClaimedProperties(
                    prev.map((e) =>
                      e.id === assignmentEdit.emailId
                        ? { ...e, properties: assignmentEdit.properties, serviceTypes: assignmentEdit.serviceTypes.filter((s) => s !== "All Resident ELI+ AI Services") }
                        : e
                    ),
                    assignmentEdit.emailId,
                    assignmentEdit.properties,
                  ));
                  setAssignmentEdit(null);
                  setAssignPropDropdown(false);
                  setAssignSvcDropdown(false);
                }}
                className="rounded-md bg-[hsl(var(--foreground))] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[hsl(var(--foreground))]/90"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

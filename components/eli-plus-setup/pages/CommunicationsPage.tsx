"use client";

import { useState, useEffect, useRef, Fragment, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Users, CreditCard, Wrench, RefreshCw,
  CheckCircle2, Phone, Pencil,
  Loader2, Zap, X, HelpCircle, ChevronRight, AlertCircle, AlertTriangle, Layers, ArrowRight, Search, Filter, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PageId, BrandStatus, CampaignStatus } from "../index";

// Props kept compatible with the ELI+ Setup tab router call site in index.tsx.
// The Vanity Number Settings workflow is self-contained, so these are accepted
// but not all are consumed.
interface Props {
  navigate: (to: PageId) => void;
  privacyPublished?: boolean;
  brandStatus?: BrandStatus;
  campaignStatus?: CampaignStatus;
  onCampaignReady?: () => void;
  privacyActionCount?: number;
  totalPropertyCount?: number;
}

const PROPERTIES = [
  { id: "p1",  name: "Harvest Peak Capital",   city: "Austin",       state: "TX" },
  { id: "p2",  name: "Skyline Apartments",      city: "Dallas",       state: "TX" },
  { id: "p3",  name: "The Meridian",            city: "Houston",      state: "TX" },
  { id: "p4",  name: "Azure Heights",           city: "Denver",       state: "CO" },
  { id: "p5",  name: "Cambridge Suites",        city: "Phoenix",      state: "AZ" },
  { id: "p6",  name: "Willow Creek Residences", city: "Chicago",      state: "IL" },
  { id: "p7",  name: "Summit View Towers",      city: "Minneapolis",  state: "MN" },
  { id: "p8",  name: "Lakeside Commons",        city: "Columbus",     state: "OH" },
  { id: "p9",  name: "Parkway Terrace",         city: "Detroit",      state: "MI" },
  { id: "p10", name: "Cedar Ridge Estates",     city: "Seattle",      state: "WA" },
  { id: "p11", name: "Riverstone Landing",      city: "Portland",     state: "OR" },
  { id: "p12", name: "Magnolia Gardens",        city: "Salt Lake City", state: "UT" },
  { id: "p13", name: "Ironwood Flats",          city: "Austin",       state: "TX" },
  { id: "p14", name: "Brandon's Buildings",     city: "Dallas",       state: "TX" },
  { id: "p15", name: "Sunset Ridge",            city: "Houston",      state: "TX" },
  { id: "p16", name: "Pine Valley Estates",     city: "Denver",       state: "CO" },
  { id: "p17", name: "Birchwood Commons",       city: "Phoenix",      state: "AZ" },
  { id: "p18", name: "Harbor Point Lofts",      city: "Seattle",      state: "WA" },
  { id: "p19", name: "Maplewood Park",          city: "Columbus",     state: "OH" },
  { id: "p20", name: "Stonegate Manor",         city: "Chicago",      state: "IL" },
  { id: "p21", name: "Aspen Grove",             city: "Denver",       state: "CO" },
  { id: "p22", name: "Crestview Apartments",    city: "Austin",       state: "TX" },
  { id: "p23", name: "Lincoln Square",          city: "Minneapolis",  state: "MN" },
  { id: "p24", name: "Beacon Hill Flats",       city: "Portland",     state: "OR" },
  { id: "p25", name: "Whispering Pines",        city: "Salt Lake City", state: "UT" },
  { id: "p26", name: "Rosewood Terrace",        city: "Dallas",       state: "TX" },
  { id: "p27", name: "Fairmont Heights",        city: "Detroit",      state: "MI" },
  { id: "p28", name: "Oakhaven Residences",     city: "Houston",      state: "TX" },
  { id: "p29", name: "Silver Creek Commons",    city: "Phoenix",      state: "AZ" },
  { id: "p30", name: "Tidewater Landing",       city: "Seattle",      state: "WA" },
];

const AREA_CODES: Record<string, string> = {
  "Austin": "512", "Dallas": "214", "Houston": "713",
  "Denver": "720", "Phoenix": "602", "Chicago": "312",
  "Minneapolis": "612", "Columbus": "614", "Detroit": "313",
  "Seattle": "206", "Portland": "503", "Salt Lake City": "801",
};

const EXCHANGES = ["423", "315", "891", "763", "542", "677", "483", "721", "856", "934", "612", "347"];

function buildPool(areaCode: string, propIndex: number): string[] {
  const exchange = EXCHANGES[propIndex % EXCHANGES.length];
  const base = 1100 + propIndex * 100;
  return Array.from({ length: 5 }, (_, i) =>
    `(${areaCode}) ${exchange}-${String(base + i * 4).padStart(4, "0")}`
  );
}

type ProductId = "leasing" | "payments" | "maintenance" | "renewals";

function buildDefaults(): Record<string, Record<ProductId, string>> {
  const result: Record<string, Record<ProductId, string>> = {};
  PROPERTIES.forEach((prop, idx) => {
    const ac = AREA_CODES[prop.city] ?? "000";
    const pool = buildPool(ac, idx);
    result[prop.id] = { leasing: pool[0], payments: pool[1], maintenance: pool[2], renewals: pool[3] };
  });
  return result;
}

const DEFAULT_NUMBERS = buildDefaults();

function buildLeasingExtraPool(areaCode: string, propIndex: number): string[] {
  const exchange = EXCHANGES[(propIndex + 6) % EXCHANGES.length];
  const base = 2200 + propIndex * 100;
  return Array.from({ length: 5 }, (_, i) =>
    `(${areaCode}) ${exchange}-${String(base + i * 4).padStart(4, "0")}`
  );
}

function buildLeasingExtrasDefaults(): Record<string, Record<"voice" | "other", string>> {
  const result: Record<string, Record<"voice" | "other", string>> = {};
  PROPERTIES.forEach((prop, idx) => {
    const ac = AREA_CODES[prop.city] ?? "000";
    const pool = buildLeasingExtraPool(ac, idx);
    result[prop.id] = { voice: pool[0], other: pool[1] };
  });
  return result;
}

const DEFAULT_LEASING_EXTRAS = buildLeasingExtrasDefaults();

function buildMaintenanceVoicePool(areaCode: string, propIndex: number): string[] {
  const exchange = EXCHANGES[(propIndex + 9) % EXCHANGES.length];
  const base = 3300 + propIndex * 100;
  return Array.from({ length: 5 }, (_, i) =>
    `(${areaCode}) ${exchange}-${String(base + i * 4).padStart(4, "0")}`
  );
}

function buildMaintenanceVoiceDefaults(): Record<string, string> {
  const result: Record<string, string> = {};
  PROPERTIES.forEach((prop, idx) => {
    const ac = AREA_CODES[prop.city] ?? "000";
    result[prop.id] = buildMaintenanceVoicePool(ac, idx)[0];
  });
  return result;
}

const DEFAULT_MAINTENANCE_VOICE = buildMaintenanceVoiceDefaults();

function buildSuperAgentDefaults(): Record<string, string> {
  const result: Record<string, string> = {};
  PROPERTIES.forEach((prop, idx) => {
    const ac = AREA_CODES[prop.city] ?? "000";
    const exchange = EXCHANGES[(idx + 5) % EXCHANGES.length];
    const base = 5500 + idx * 4;
    result[prop.id] = `(${ac}) ${exchange}-${String(base).padStart(4, "0")}`;
  });
  return result;
}

const DEFAULT_SUPER_AGENT = buildSuperAgentDefaults();
DEFAULT_SUPER_AGENT["p1"] = "(877) 428-0948";

function buildClickToCallDefaults(): Record<string, string> {
  const result: Record<string, string> = {};
  PROPERTIES.forEach((prop, idx) => {
    const ac = AREA_CODES[prop.city] ?? "000";
    const exchange = EXCHANGES[(idx + 3) % EXCHANGES.length];
    const base = 4400 + idx * 4;
    result[prop.id] = `(${ac}) ${exchange}-${String(base).padStart(4, "0")}`;
  });
  return result;
}

const DEFAULT_CLICK_TO_CALL = buildClickToCallDefaults();
DEFAULT_CLICK_TO_CALL["p1"] = "(877) 428-0948";

function buildOutboundDefaultNumbers(): Record<string, string> {
  const result: Record<string, string> = {};
  PROPERTIES.forEach((prop, idx) => {
    const ac = AREA_CODES[prop.city] ?? "000";
    const exchange = EXCHANGES[(idx + 7) % EXCHANGES.length];
    const base = 6600 + idx * 4;
    result[prop.id] = `(${ac}) ${exchange}-${String(base).padStart(4, "0")}`;
  });
  return result;
}

const DEFAULT_OUTBOUND = buildOutboundDefaultNumbers();
DEFAULT_OUTBOUND["p1"] = "(877) 428-0948";

const CLICK_TO_CALL_NOT_CONTRACTED = new Set(["p2", "p6", "p9", "p11", "p14"]);

const VANITY_NUMBERS = [
  { id: "v1",  propertyId: "p1", phoneNumber: "(877) 428-0948", type: "Lead", leadSource: "Signage-Banners/Directional", forwardPreference: "Specific Number", routeCalls: "3604924546", smsRegistrationStatus: "", smsEnabled: false, outboundDefault: false, expirationDate: "" },
  { id: "v2",  propertyId: "p1", phoneNumber: "(855) 716-5354", type: "Lead", leadSource: "", forwardPreference: "Specific Number", routeCalls: "8885140927", smsRegistrationStatus: "", smsEnabled: false, outboundDefault: false, expirationDate: "" },
  { id: "v3",  propertyId: "p1", phoneNumber: "(206) 785-3512", type: "SMS Only", leadSource: "", forwardPreference: "—", routeCalls: "—", smsRegistrationStatus: "VERIFIED on 08/04/2023", smsEnabled: true, outboundDefault: true, expirationDate: "" },
  { id: "v4",  propertyId: "p1", phoneNumber: "(888) 817-7299", type: "Maintenance", leadSource: "", forwardPreference: "Specific Number", routeCalls: "8885140927", smsRegistrationStatus: "", smsEnabled: false, outboundDefault: false, expirationDate: "" },
  { id: "v5",  propertyId: "p2", phoneNumber: "(877) 253-5829", type: "Lead", leadSource: "Social Media-YouTube", forwardPreference: "Specific Number", routeCalls: "3606144651", smsRegistrationStatus: "", smsEnabled: false, outboundDefault: false, expirationDate: "" },
  { id: "v6",  propertyId: "p2", phoneNumber: "(871) 253-1280", type: "Lead", leadSource: "Internet-Mobile/Banner Ad", forwardPreference: "Specific Number", routeCalls: "3008735387", smsRegistrationStatus: "Verified", smsEnabled: true, outboundDefault: false, expirationDate: "" },
  { id: "v7",  propertyId: "p3", phoneNumber: "(888) 207-0298", type: "Lead", leadSource: "Social Media-Instagram", forwardPreference: "Specific Number", routeCalls: "3603238381", smsRegistrationStatus: "Verified", smsEnabled: true, outboundDefault: false, expirationDate: "" },
  { id: "v8",  propertyId: "p3", phoneNumber: "(855) 405-9214", type: "Lead", leadSource: "Internet-AML.com", forwardPreference: "Specific Number", routeCalls: "8445031085", smsRegistrationStatus: "Verified", smsEnabled: true, outboundDefault: false, expirationDate: "" },
  { id: "v9",  propertyId: "p4", phoneNumber: "(844) 643-7240", type: "Lead", leadSource: "Internet Search-Paid Ads", forwardPreference: "Specific Number", routeCalls: "3605022463", smsRegistrationStatus: "Verified", smsEnabled: true, outboundDefault: false, expirationDate: "" },
  { id: "v10", propertyId: "p4", phoneNumber: "(855) 386-8531", type: "Lead", leadSource: "Internet Search-Google/Bing/Yahoo", forwardPreference: "Specific Number", routeCalls: "3005488824", smsRegistrationStatus: "Verified", smsEnabled: false, outboundDefault: false, expirationDate: "" },
  { id: "v11", propertyId: "p5", phoneNumber: "(844) 815-0570", type: "Lead", leadSource: "", forwardPreference: "Specific Number", routeCalls: "8885140927", smsRegistrationStatus: "", smsEnabled: false, outboundDefault: false, expirationDate: "" },
  { id: "v12", propertyId: "p5", phoneNumber: "(844) 623-5218", type: "Lead", leadSource: "Internet-ApartmentList", forwardPreference: "Specific Number", routeCalls: "3005893214", smsRegistrationStatus: "Verified", smsEnabled: true, outboundDefault: false, expirationDate: "" },
  { id: "v13", propertyId: "p6", phoneNumber: "(844) 449-7350", type: "Lead", leadSource: "Internet-Apartments.com", forwardPreference: "Specific Number", routeCalls: "3607965991", smsRegistrationStatus: "Verified", smsEnabled: true, outboundDefault: false, expirationDate: "" },
  { id: "v14", propertyId: "p7", phoneNumber: "(844) 449-7308", type: "Lead", leadSource: "Internet-Velo.com", forwardPreference: "Specific Number", routeCalls: "3006417313", smsRegistrationStatus: "Verified", smsEnabled: true, outboundDefault: false, expirationDate: "" },
  { id: "v15", propertyId: "p8", phoneNumber: "(844) 449-7345", type: "Lead", leadSource: "Internet-Zillow.com", forwardPreference: "Specific Number", routeCalls: "3608001134", smsRegistrationStatus: "", smsEnabled: false, outboundDefault: false, expirationDate: "" },
  { id: "v16", propertyId: "p9", phoneNumber: "(844) 449-7343", type: "Lead", leadSource: "Social Media-Facebook", forwardPreference: "Specific Number", routeCalls: "3607623383", smsRegistrationStatus: "Verified", smsEnabled: false, outboundDefault: false, expirationDate: "" },
  { id: "v17", propertyId: "p10", phoneNumber: "(844) 449-7340", type: "Lead", leadSource: "Internet-Zumper", forwardPreference: "Specific Number", routeCalls: "3607437837", smsRegistrationStatus: "Verified", smsEnabled: true, outboundDefault: false, expirationDate: "" },
  { id: "v18", propertyId: "p11", phoneNumber: "(844) 878-3230", type: "Lead", leadSource: "Email Campaign", forwardPreference: "Specific Number", routeCalls: "3003643810", smsRegistrationStatus: "Verified", smsEnabled: true, outboundDefault: false, expirationDate: "05/31/2026" },
];

const INITIALLY_ACTIVE = new Set(["p1", "p2", "p3", "p4", "p5", "p7", "p10", "p12", "p13", "p15", "p17", "p19", "p21"]);
const INITIALLY_IN_REVIEW = new Set(["p18", "p20", "p22", "p23", "p24", "p25", "p26", "p27", "p29"]);

const REVIEW_META: Record<string, string> = {
  p5: "Submitted 2 days ago",
  p7: "Submitted yesterday",
  p10: "Submitted 3 hours ago",
  p12: "Submitted 5 hours ago",
};

// ── Product launch status ───────────────────────────────────────────────────
// This screen is built to support every AI product. For the initial release it
// is enabled for Leasing AI only; the rest are gated behind "Coming soon".
// To launch another product, flip its value to "live" — the header badges,
// disabled-cell treatment, and scope banner all derive from this single map.
const PRODUCT_STATUS: Record<ProductId, "live" | "coming-soon"> = {
  leasing: "live",
  payments: "coming-soon",
  maintenance: "coming-soon",
  renewals: "coming-soon",
};
const isLive = (p: ProductId) => PRODUCT_STATUS[p] === "live";

const PRODUCT_LABELS: Record<ProductId, string> = {
  leasing: "Leasing AI",
  payments: "Payments AI",
  maintenance: "Maintenance AI",
  renewals: "Renewals AI",
};
const COMING_SOON_LABELS = (Object.keys(PRODUCT_STATUS) as ProductId[])
  .filter((p) => !isLive(p))
  .map((p) => PRODUCT_LABELS[p]);

const ALL_PRODUCTS: ProductId[] = ["leasing", "payments", "maintenance", "renewals"];
const PRODUCT_ICONS: Record<ProductId, typeof Users> = {
  leasing: Users,
  payments: CreditCard,
  maintenance: Wrench,
  renewals: RefreshCw,
};
// Single Super Agent number shown for the company-level strategy.
const COMPANY_SUPER_AGENT_NUMBER = "(877) 428-0948";

// Per-property number setup approach — the "choose your own adventure". Default is Super Agent.
type SetupApproach = "super-agent" | "hybrid" | "per-service";
const APPROACH_META: Record<SetupApproach, { label: string; className: string }> = {
  "super-agent": { label: "Super Agent", className: "border-indigo-200 bg-indigo-50 text-indigo-700" },
  hybrid:        { label: "Hybrid",      className: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700" },
  "per-service": { label: "Per-service", className: "border-zinc-200 bg-zinc-100 text-zinc-600" },
};

// Leasing AI channels/services a number can cover.
const LEASING_SERVICES: { key: "sms" | "voice" | "ivr"; label: string }[] = [
  { key: "sms", label: "SMS" },
  { key: "voice", label: "Voice" },
  { key: "ivr", label: "IVR Text" },
];

// Badge shown on gated product column headers. Explains why the product can't be
// configured yet so users don't ask why Super Agent isn't available for it.
function ComingSoonBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-500 cursor-default">
          Soon
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-xs">
        Vanity number setup launches for Leasing AI first. Super Agent support for this product is coming soon — its numbers aren&apos;t configurable here yet.
      </TooltipContent>
    </Tooltip>
  );
}

export function CommunicationsPage({ navigate }: Props) {
  const [activeIds, setActiveIds] = useState<Set<string>>(() => new Set(INITIALLY_ACTIVE));
  const [inReviewIds, setInReviewIds] = useState<Set<string>>(() => new Set(INITIALLY_IN_REVIEW));
  const [vanityNumbers, setVanityNumbers] = useState(VANITY_NUMBERS);
  const [vanityPropertyFilter, setVanityPropertyFilter] = useState<string>("all");
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [editModalId, setEditModalId] = useState<string | null>(null);
  const [editSmsEnabled, setEditSmsEnabled] = useState(false);
  const [editOutboundDefault, setEditOutboundDefault] = useState(false);
  const [editAiBailout, setEditAiBailout] = useState(false);
  const [editExpiration, setEditExpiration] = useState("");
  const [retestBanner, setRetestBanner] = useState<string | null>(null);
  const [addVanityOpen, setAddVanityOpen] = useState(false);
  const [addVanityTab, setAddVanityTab] = useState<"preferences" | "request">("preferences");
  const [addTollFree, setAddTollFree] = useState(false);
  const [addUseSms] = useState(true);
  const [addOutboundDefault, setAddOutboundDefault] = useState(false);
  const [addExpiration, setAddExpiration] = useState("");

  // One adaptive workflow. `hasExistingNumbers` is auto-detected in production (does this
  // company already have numbers?). In the prototype it's a "Preview as" toggle so both
  // journeys are visible. Existing clients land on their current setup; new logos land on
  // Super Agent. Same components either way — only the starting state differs.
  const [hasExistingNumbers, setHasExistingNumbers] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  // Collapse the open row when the user clicks anywhere outside the table.
  const tableRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!expandedRowId) return;
    const onDown = (e: MouseEvent) => {
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) setExpandedRowId(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [expandedRowId]);

  // Save confirmation — toast + brief row highlight (the row also re-sorts to the bottom).
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  const [decisionDismissed, setDecisionDismissed] = useState(false);
  const [propertySearch, setPropertySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "needs" | "confirmed">("all");
  const [filterOpen, setFilterOpen] = useState(false);
  useEffect(() => {
    if (!savedToast) return;
    const t = setTimeout(() => { setSavedToast(null); setJustSavedId(null); }, 6000);
    return () => clearTimeout(t);
  }, [savedToast]);
  const [setupApproach, setSetupApproach] = useState<Record<string, SetupApproach>>({});
  // Confirmed setup per property. Most properties are on the legacy "per-service" default and
  // need the user to make a decision now that Super Agent + Hybrid have launched. Only a couple
  // have already been confirmed onto the new options.
  const [savedApproach, setSavedApproach] = useState<Record<string, SetupApproach>>(() => ({
    p1: "super-agent",
    p2: "hybrid",
  }));
  const approachOf = (id: string): SetupApproach => setupApproach[id] ?? savedApproach[id] ?? "per-service";

  // Resolve the number a given Leasing AI service uses under a chosen approach.
  function approachNumber(id: string, approach: SetupApproach, key: "sms" | "voice" | "ivr"): string {
    if (approach === "super-agent") return DEFAULT_SUPER_AGENT[id];
    if (approach === "hybrid") return key === "ivr" ? DEFAULT_LEASING_EXTRAS[id].other : DEFAULT_SUPER_AGENT[id];
    if (key === "sms") return DEFAULT_NUMBERS[id].leasing;
    if (key === "voice") return DEFAULT_LEASING_EXTRAS[id].voice;
    return DEFAULT_LEASING_EXTRAS[id].other;
  }

  // Editable number picker reused in the expanded per-property config.
  function renderNumberSelect(propId: string, current: string) {
    const { propNums, companyNums } = vanityOptionsForProperty(propId, current);
    return (
      <select
        defaultValue={current}
        onChange={(e) => { if (e.target.value === "__new__") { e.target.value = current; openAddVanityModal(); } }}
        className="rounded-md border border-border bg-white px-2 py-1 font-mono text-xs text-foreground"
      >
        <option value={current}>{current}</option>
        {propNums.length > 0 && <optgroup label="— this property —">{propNums.map((v) => <option key={v.id} value={v.phoneNumber}>{v.phoneNumber}</option>)}</optgroup>}
        {companyNums.length > 0 && <optgroup label="— company —">{companyNums.map((v) => <option key={v.id} value={v.phoneNumber}>{v.phoneNumber}</option>)}</optgroup>}
        <option value="__new__" className="font-sans text-blue-600">+ New number</option>
      </select>
    );
  }

  function previewAsExisting() {
    setHasExistingNumbers(true);
    setActiveIds(new Set(INITIALLY_ACTIVE));
    setInReviewIds(new Set(INITIALLY_IN_REVIEW));
    setSavedApproach({ p1: "super-agent", p2: "hybrid" });
    setSetupApproach({});
    setExpandedRowId(null);
    setAdvancedOpen(false);
  }
  function previewAsNewLogo() {
    setHasExistingNumbers(false);
    setActiveIds(new Set());
    setInReviewIds(new Set());
    setSavedApproach({});
    setSetupApproach({});
    setExpandedRowId(null);
    setAdvancedOpen(false);
  }

  const PROPERTY_MAP = Object.fromEntries(PROPERTIES.map((p) => [p.id, p.name]));
  const filteredVanityNumbers = vanityPropertyFilter === "all"
    ? vanityNumbers
    : vanityNumbers.filter((v) => v.propertyId === vanityPropertyFilter);
  const vanityPropertyIds = [...new Set(vanityNumbers.map((v) => v.propertyId))];

  function vanityOptionsForProperty(propId: string, currentValue: string) {
    const unique = [...new Map(vanityNumbers.map((v) => [v.phoneNumber, v])).values()];
    const propNums = unique.filter((v) => v.propertyId === propId && v.phoneNumber !== currentValue).sort((a, b) => a.phoneNumber.localeCompare(b.phoneNumber));
    const companyNums = unique.filter((v) => v.propertyId !== propId && v.phoneNumber !== currentValue).sort((a, b) => a.phoneNumber.localeCompare(b.phoneNumber));
    return { propNums, companyNums };
  }

  function openAddVanityModal() {
    setAddVanityTab("preferences");
    setAddTollFree(false);
    setAddOutboundDefault(false);
    setAddExpiration("");
    setAddVanityOpen(true);
  }

  function simulateApproval() {
    setActiveIds((prev) => {
      const next = new Set(prev);
      inReviewIds.forEach((id) => next.add(id));
      return next;
    });
    setInReviewIds(new Set());
  }

  const awaitingIds = new Set(
    PROPERTIES.filter((p) => !activeIds.has(p.id) && !inReviewIds.has(p.id)).map((p) => p.id)
  );
  const numbersReady = activeIds.size === PROPERTIES.length;

  type RowStatus = "active" | "review" | "awaiting";
  function statusOf(propId: string): RowStatus {
    if (activeIds.has(propId)) return "active";
    if (inReviewIds.has(propId)) return "review";
    return "awaiting";
  }

  // Properties shown in the table: exclude awaiting (need a privacy policy), apply search + status
  // filter, then sort properties needing a decision to the top.
  const tableProperties = PROPERTIES
    .filter((p) => !awaitingIds.has(p.id))
    .filter((p) => {
      const q = propertySearch.trim().toLowerCase();
      if (q && !`${p.name} ${p.city} ${p.state}`.toLowerCase().includes(q)) return false;
      if (statusFilter === "needs") return savedApproach[p.id] === undefined;
      if (statusFilter === "confirmed") return savedApproach[p.id] !== undefined;
      return true;
    })
    .sort((a, b) => (savedApproach[a.id] === undefined ? 0 : 1) - (savedApproach[b.id] === undefined ? 0 : 1));

  const visibleProperties = PROPERTIES;

  // The detailed per-product matrix + inventory only show when the user opens "View all my numbers".
  const showFullTable = advancedOpen;

  return (
    <div className="bg-zinc-100 min-h-full">
      {savedToast && typeof document !== "undefined" && createPortal(
        <div className="animate-in fade-in slide-in-from-top-4 duration-300 fixed left-1/2 top-[124px] z-[2147483647] flex w-[min(92vw,30rem)] -translate-x-1/2 items-start gap-3 rounded-xl border border-green-300 bg-white px-5 py-4 shadow-2xl">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden />
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Setup confirmed</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{savedToast}</p>
          </div>
          <button type="button" onClick={() => { setSavedToast(null); setJustSavedId(null); }} className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-foreground" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>,
        document.body
      )}
      <div className="max-w-5xl space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Communications</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            Your AI products text and call residents from dedicated phone numbers, set up automatically from your area code — review and organize them here.{" "}
            <span className="font-medium text-foreground">Missing a property?</span> Carrier approval requires a privacy policy.
          </p>
          {awaitingIds.size > 0 && (
            <button
              type="button"
              onClick={() => navigate("privacy")}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
            >
              Open Privacy Policies
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
        {/* Prototype preview — in production this is auto-detected from the account's existing numbers */}
        <div className="shrink-0 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-1.5">
          <p className="px-1 pb-1 text-[9px] font-semibold uppercase tracking-wider text-zinc-400">Preview as</p>
          <div className="inline-flex items-center rounded-md border border-border bg-white p-0.5">
            <button
              type="button"
              onClick={previewAsExisting}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                hasExistingNumbers ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Existing client
            </button>
            <button
              type="button"
              onClick={previewAsNewLogo}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                !hasExistingNumbers ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              )}
            >
              New logo
            </button>
          </div>
        </div>
      </div>

      {/* Action needed — setup decision callout, directly under the description */}
      {(() => {
        const n = PROPERTIES.filter((p) => savedApproach[p.id] === undefined && !awaitingIds.has(p.id)).length;
        if (n === 0 || decisionDismissed) return null;
        return (
          <div className="relative rounded-xl border-2 border-amber-300/60 bg-amber-50 px-5 py-4">
            <button
              type="button"
              onClick={() => setDecisionDismissed(true)}
              aria-label="Dismiss"
              className="absolute right-3 top-3 rounded-md p-1 text-amber-500 transition-colors hover:bg-amber-100 hover:text-amber-700"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-3 pr-6">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-2.5 flex-1">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
                    Action needed — {n} {n === 1 ? "property needs" : "properties need"} a setup decision
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    Choose how each property&apos;s Leasing AI numbers are organized
                  </p>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    We&apos;ve added two new options. Confirm a setup for each property below — until you do, they stay on a number per service (what you have today).
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {[
                    { icon: Zap,    cls: "text-amber-500", title: "Super Agent — one number",   body: "A single number handles SMS, voice, and IVR for every Leasing AI conversation." },
                    { icon: Layers, cls: "text-amber-500", title: "Hybrid — mix & match",       body: "Share one number across some services and use separate numbers for the rest." },
                    { icon: Phone,  cls: "text-amber-500", title: "Current — Number per service", body: "What you have today — a dedicated number for each Leasing AI service." },
                  ].map(({ icon: Icon, cls, title, body }) => (
                    <div key={title} className="flex items-start gap-2 rounded-lg border border-amber-200/70 bg-white px-3 py-2.5">
                      <Icon className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", cls)} />
                      <div>
                        <p className="text-xs font-semibold text-foreground leading-tight">{title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Property Numbers table */}
      <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        {/* Per-agent availability — cards. Leasing AI Super Agent is live; the rest are coming soon. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ALL_PRODUCTS.map((product) => {
            const Icon = PRODUCT_ICONS[product];
            const live = isLive(product);
            return (
              <div
                key={product}
                className={cn(
                  "rounded-xl border p-4 shadow-sm",
                  live ? "border-indigo-300 bg-white" : "border-dashed border-zinc-200 bg-zinc-50 opacity-65"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold", live ? "text-foreground" : "text-zinc-400")}>
                    <Icon className={cn("h-4 w-4", live ? "text-indigo-600" : "text-zinc-400")} />
                    {PRODUCT_LABELS[product]}
                  </span>
                  {live ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                      <Zap className="h-3 w-3" />Super Agent
                    </span>
                  ) : (
                    <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Soon</span>
                  )}
                </div>
                <p className={cn("mt-1.5 text-xs", live ? "text-muted-foreground" : "text-zinc-400")}>
                  {live
                    ? "Available now — each property gets its own number that handles all of this agent's conversations."
                    : "Super Agent support for this agent is coming soon."}
                </p>
              </div>
            );
          })}
        </div>

        {/* Leasing AI numbers — per property, shown by default */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-1.5 text-base font-semibold text-foreground">
              <Users className="h-4 w-4 text-indigo-500" />Number Routing &amp; Setup
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input
                  type="text"
                  value={propertySearch}
                  onChange={(e) => setPropertySearch(e.target.value)}
                  placeholder="Search properties"
                  aria-label="Search properties"
                  className="h-8 w-48 rounded-md border border-border bg-white pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setFilterOpen((o) => !o)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors",
                    statusFilter !== "all" ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-border bg-white text-foreground hover:bg-zinc-50"
                  )}
                >
                  <Filter className="h-3.5 w-3.5" aria-hidden />
                  Filter{statusFilter !== "all" ? " (1)" : ""}
                </button>
                {filterOpen && (
                  <div className="absolute right-0 z-30 mt-1 w-44 rounded-lg border border-border bg-white p-1 shadow-lg">
                    {([
                      { v: "all", l: "All properties" },
                      { v: "needs", l: "Needs decision" },
                      { v: "confirmed", l: "Confirmed" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => { setStatusFilter(opt.v); setFilterOpen(false); }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-zinc-50",
                          statusFilter === opt.v ? "font-medium text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {opt.l}
                        {statusFilter === opt.v && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div ref={tableRef} className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <div className="max-h-[30rem] overflow-y-auto overflow-x-auto">
              <table className="w-full text-xs border-separate border-spacing-0">
                <thead>
                  <tr className="bg-zinc-50">
                    <th className="sticky top-0 z-10 bg-zinc-50 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Property</th>
                    <th className="sticky top-0 z-10 bg-zinc-50 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Setup</th>
                    <th className="sticky top-0 z-10 bg-zinc-50 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Status</th>
                    <th className="sticky top-0 z-10 bg-zinc-50 px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tableProperties.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-xs text-muted-foreground">
                        No properties match your search or filter.
                      </td>
                    </tr>
                  ) : tableProperties.map((prop) => {
                    const st = statusOf(prop.id);
                    const expanded = expandedRowId === prop.id;
                    return (
                      <Fragment key={prop.id}>
                        <tr
                          onClick={() => setExpandedRowId(prop.id)}
                          className={cn("cursor-pointer transition-colors", expanded ? "bg-indigo-50" : justSavedId === prop.id ? "bg-green-50" : "bg-white hover:bg-zinc-50")}
                        >
                          <td className={cn("px-4 py-2.5 border-b border-border", expanded ? "border-l-4 border-l-indigo-400" : justSavedId === prop.id && "border-l-4 border-l-green-400")}>
                            <p className="font-medium leading-tight text-foreground">{prop.name}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{prop.city}, {prop.state}</p>
                          </td>
                          <td className="px-4 py-2.5 border-b border-border">
                            {(() => {
                              const a = approachOf(prop.id);
                              const meta = APPROACH_META[a];
                              return (
                                <span className={cn("inline-flex h-7 w-28 items-center justify-center gap-1.5 rounded-full border text-[11px] font-medium", meta.className)}>
                                  {a === "super-agent" && <Zap className="h-3 w-3" aria-hidden />}
                                  {meta.label}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-2.5 border-b border-border">
                            {(() => {
                              const sv = savedApproach[prop.id];
                              if (sv === undefined)
                                return <span className="inline-flex h-7 w-36 items-center justify-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 text-[11px] font-semibold text-amber-800"><AlertCircle className="h-3.5 w-3.5" />Action needed</span>;
                              if (sv === approachOf(prop.id))
                                return <span className="inline-flex h-7 w-36 items-center justify-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 text-[11px] font-medium text-teal-700"><CheckCircle2 className="h-3.5 w-3.5" />Confirmed</span>;
                              return <span className="inline-flex h-7 w-36 items-center justify-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 text-[11px] font-medium text-amber-700"><span className="h-2 w-2 rounded-full bg-amber-500" />Unsaved changes</span>;
                            })()}
                          </td>
                          <td className="px-4 py-2.5 border-b border-border text-right">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setExpandedRowId(expanded ? null : prop.id); }}
                              aria-expanded={expanded}
                              className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800"
                            >
                              Configure
                              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")} />
                            </button>
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="bg-indigo-50">
                            <td colSpan={4} className="border-b border-border border-l-4 border-l-indigo-400 px-4 pb-4 pt-1">
                              <div className="space-y-3 rounded-lg border border-indigo-200 bg-white p-4 shadow-sm">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Number setup for {prop.name}</p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                  {([
                                    { id: "super-agent", label: "Single Super Agent number", desc: "One number for every Leasing AI service.", rec: true },
                                    { id: "hybrid", label: "Hybrid", desc: "Share a number across some services, separate others.", rec: false },
                                    { id: "per-service", label: "A number per service", desc: "What we do today — one number per service.", rec: false },
                                  ] as const).map((opt) => {
                                    const selected = approachOf(prop.id) === opt.id;
                                    return (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setSetupApproach((p) => ({ ...p, [prop.id]: opt.id }))}
                                        className={cn(
                                          "rounded-lg border p-3 text-left transition-colors",
                                          selected ? "border-indigo-300 bg-indigo-50/40" : "border-border bg-white hover:border-zinc-400"
                                        )}
                                      >
                                        <span className="flex items-center justify-between gap-2">
                                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                            {opt.id === "super-agent" && <Zap className="h-3.5 w-3.5 text-indigo-600" />}
                                            {opt.label}
                                          </span>
                                          {selected && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-indigo-600" />}
                                        </span>
                                        <p className="mt-0.5 text-[11px] text-muted-foreground">{opt.desc}{opt.rec ? " (recommended)" : ""}</p>
                                      </button>
                                    );
                                  })}
                                </div>

                                {st !== "active" ? (
                                  <p className="text-xs text-muted-foreground">
                                    {st === "review"
                                      ? "Numbers are pending carrier approval — your setup choice above applies automatically once they're approved."
                                      : <>This property needs a privacy policy before numbers are assigned. <button type="button" onClick={() => navigate("privacy")} className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800">Go to Privacy Policies →</button></>}
                                  </p>
                                ) : approachOf(prop.id) === "super-agent" ? (
                                  <div className="rounded-lg border border-indigo-200 bg-white p-3">
                                    <p className="text-xs font-medium text-foreground">One number handles every Leasing AI service</p>
                                    <div className="mt-2 flex items-center gap-2">
                                      <span className="w-16 text-xs text-muted-foreground">Number</span>
                                      {renderNumberSelect(prop.id, DEFAULT_SUPER_AGENT[prop.id])}
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                      {LEASING_SERVICES.map((s) => (
                                        <span key={s.key} className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">{s.label}</span>
                                      ))}
                                      <span className="text-[10px] text-muted-foreground">all route to this one number</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className={cn("space-y-2 rounded-lg border bg-white p-3", approachOf(prop.id) === "hybrid" ? "border-fuchsia-200" : "border-border")}>
                                    <p className="text-xs font-medium text-foreground">
                                      {approachOf(prop.id) === "hybrid" ? "Share a number across some services, separate the rest" : "A dedicated number for each service — what we do today"}
                                    </p>
                                    {LEASING_SERVICES.map((s) => (
                                      <div key={`${s.key}-${approachOf(prop.id)}`} className="flex items-center gap-2">
                                        <span className="w-16 text-xs text-muted-foreground">{s.label}</span>
                                        {renderNumberSelect(prop.id, approachNumber(prop.id, approachOf(prop.id), s.key))}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center justify-end gap-3 border-t border-border pt-3">
                                  <button type="button" onClick={() => setExpandedRowId(null)} className="text-xs font-medium text-muted-foreground hover:text-foreground">Cancel</button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const label = APPROACH_META[approachOf(prop.id)].label;
                                      setSavedApproach((p) => ({ ...p, [prop.id]: approachOf(prop.id) }));
                                      setExpandedRowId(null);
                                      setJustSavedId(prop.id);
                                      setSavedToast(`${prop.name} is now set to ${label}.`);
                                    }}
                                    className="rounded-md bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-800"
                                  >
                                    Confirm setup
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {showFullTable && (
        <>
        {/* Table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1540px] border-separate border-spacing-0">
              <colgroup>
                <col style={{ width: "240px" }} />
                <col style={{ width: "120px" }} />
                <col style={{ width: "120px" }} />
                <col style={{ width: "120px" }} />
                <col style={{ width: "120px" }} /><col style={{ width: "120px" }} /><col style={{ width: "120px" }} />
                <col style={{ width: "120px" }} />
                <col style={{ width: "120px" }} /><col style={{ width: "120px" }} />
                <col style={{ width: "120px" }} />
              </colgroup>
              <thead>
                <tr className="bg-zinc-50">
                  <th className="sticky left-0 z-20 bg-zinc-50 px-4 py-2 border-b border-border"> </th>
                  <th className="bg-zinc-50 px-3 py-2 text-left border-b border-l border-border">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                      <Zap className="h-3.5 w-3.5 text-indigo-500" />Super Agent AI
                    </span>
                  </th>
                  <th className="bg-zinc-50 px-3 py-2 text-left border-b border-l border-border">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                      <Phone className="h-3.5 w-3.5 text-slate-500" />Click To Call Default
                    </span>
                  </th>
                  <th className="bg-zinc-50 px-3 py-2 text-left border-b border-l border-border">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                      <Phone className="h-3.5 w-3.5 text-teal-500" />Outbound Default
                    </span>
                  </th>
                  <th colSpan={3} className="bg-zinc-50 px-3 py-2 text-left border-b border-l border-border">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                      <Users className="h-3.5 w-3.5 text-violet-500" />Leasing AI
                    </span>
                  </th>
                  <th className="bg-zinc-50 px-3 py-2 text-left border-b border-l border-border">
                    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold", isLive("payments") ? "text-foreground" : "text-muted-foreground/60")}>
                      <CreditCard className="h-3.5 w-3.5 text-blue-500" />Payments AI
                      {!isLive("payments") && <ComingSoonBadge />}
                    </span>
                  </th>
                  <th colSpan={2} className="bg-zinc-50 px-3 py-2 text-left border-b border-l border-border">
                    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold", isLive("maintenance") ? "text-foreground" : "text-muted-foreground/60")}>
                      <Wrench className="h-3.5 w-3.5 text-amber-500" />Maintenance AI
                      {!isLive("maintenance") && <ComingSoonBadge />}
                    </span>
                  </th>
                  <th className="bg-zinc-50 px-3 py-2 text-left border-b border-l border-border">
                    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold", isLive("renewals") ? "text-foreground" : "text-muted-foreground/60")}>
                      <RefreshCw className="h-3.5 w-3.5 text-emerald-500" />Renewals AI
                      {!isLive("renewals") && <ComingSoonBadge />}
                    </span>
                  </th>
                </tr>
                <tr className="bg-zinc-50">
                  <th className="sticky left-0 z-20 bg-zinc-50 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Property</th>
                  <th className="bg-zinc-50 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-l border-border">SMS/Voice</th>
                  <th className="bg-zinc-50 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-l border-border">SMS/Voice</th>
                  <th className="bg-zinc-50 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-l border-border">SMS</th>
                  <th className="bg-zinc-50 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-l border-border">SMS</th>
                  <th className="bg-zinc-50 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Voice</th>
                  <th className="bg-zinc-50 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">IVR text</th>
                  <th className="bg-zinc-50 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-l border-border">SMS</th>
                  <th className="bg-zinc-50 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-l border-border">SMS</th>
                  <th className="bg-zinc-50 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Voice</th>
                  <th className="bg-zinc-50 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-l border-border">SMS</th>
                </tr>
              </thead>
              <tbody>
                {visibleProperties.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-5 py-10 text-center text-sm text-muted-foreground">No properties in this state.</td>
                  </tr>
                ) : (
                  visibleProperties.map((prop) => {
                    const status = statusOf(prop.id);
                    const rowBg =
                      status === "active" ? "bg-white"
                      : status === "review" ? "bg-amber-50/40"
                      : "bg-zinc-50";
                    const stickyBg =
                      status === "active" ? "bg-white"
                      : status === "review" ? "bg-[#fffbeb]"
                      : "bg-zinc-50";
                    const nums = DEFAULT_NUMBERS[prop.id];
                    const extras = DEFAULT_LEASING_EXTRAS[prop.id];
                    const maint = DEFAULT_MAINTENANCE_VOICE[prop.id];
                    const sa = DEFAULT_SUPER_AGENT[prop.id];
                    const ctc = DEFAULT_CLICK_TO_CALL[prop.id];
                    const outbound = DEFAULT_OUTBOUND[prop.id];

                    if (status === "awaiting") {
                      return (
                        <tr key={prop.id} className={rowBg}>
                          <td className={cn("sticky left-0 z-10 px-4 py-2.5 align-middle border-b border-border", stickyBg)}>
                            <p className="font-medium leading-tight text-foreground truncate max-w-[220px]">{prop.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{prop.city}, {prop.state}</p>
                          </td>
                          <td colSpan={10} className="px-4 py-2.5 align-middle border-b border-l border-border">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-600 shrink-0">
                                <span className="inline-block h-2.5 w-2.5 rounded-full bg-zinc-300" aria-hidden />
                                Not started
                              </span>
                              <span className="text-[11px] text-muted-foreground truncate">
                                Submit this property&apos;s privacy policy to start registering numbers.
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    const renderCell = (content: ReactNode) => {
                      if (status === "active") return content;
                      return (
                        <div className="h-8 rounded-md border border-amber-200 bg-white px-2.5 flex items-center">
                          <span className="text-xs font-mono text-amber-600">Pending</span>
                        </div>
                      );
                    };

                    // Product-aware cell: gated products render a disabled "Coming
                    // soon" placeholder instead of a number; live products fall
                    // through to the normal active/pending treatment.
                    const productCell = (content: ReactNode, product: ProductId) => {
                      if (!isLive(product)) {
                        return (
                          <div className="h-8 rounded-md bg-zinc-50 px-2.5 flex items-center justify-center opacity-70">
                            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Coming soon</span>
                          </div>
                        );
                      }
                      return renderCell(content);
                    };

                    return (
                      <tr key={prop.id} className={rowBg}>
                        <td className={cn("sticky left-0 z-10 px-4 py-2.5 align-top border-b border-border", stickyBg)}>
                          <p className="font-medium leading-tight text-foreground truncate max-w-[220px]">{prop.name}</p>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span>{prop.city}, {prop.state}</span>
                            <span className="rounded px-1 py-px text-[10px] font-medium bg-zinc-100 text-zinc-500">
                              {AREA_CODES[prop.city] ?? "—"}
                            </span>
                          </div>
                          {status === "review" && (
                            <div className="flex items-center gap-1 mt-1 text-[11px] text-amber-700">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Pending &middot; {REVIEW_META[prop.id] ?? "submitted recently"}</span>
                            </div>
                          )}
                        </td>

                        {(() => {
                          const saOpts = vanityOptionsForProperty(prop.id, sa);
                          const ctcOpts = vanityOptionsForProperty(prop.id, ctc);
                          const outOpts = vanityOptionsForProperty(prop.id, outbound);
                          return (
                            <>
                              <td className="px-3 py-2.5 align-middle text-center border-b border-l border-border">
                                {renderCell(
                                  <select defaultValue={sa} onChange={(e) => { if (e.target.value === "__new__") { e.target.value = sa; openAddVanityModal(); } }} className="font-mono text-xs text-foreground bg-transparent border-none outline-none cursor-pointer p-0 text-center">
                                    <option value="__new__" className="font-sans text-blue-600">+ New Vanity Number</option>
                                    <option value={sa}>{sa}</option>
                                    {saOpts.propNums.length > 0 && (
                                      <optgroup label={`— ${prop.name} —`}>
                                        {saOpts.propNums.map((v) => <option key={v.id} value={v.phoneNumber}>{v.phoneNumber}</option>)}
                                      </optgroup>
                                    )}
                                    {saOpts.companyNums.length > 0 && (
                                      <optgroup label="— Company —">
                                        {saOpts.companyNums.map((v) => <option key={v.id} value={v.phoneNumber}>{v.phoneNumber}</option>)}
                                      </optgroup>
                                    )}
                                  </select>
                                )}
                              </td>

                              <td className="px-3 py-2.5 align-middle text-center border-b border-l border-border">
                                {CLICK_TO_CALL_NOT_CONTRACTED.has(prop.id) ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-400 cursor-default">N/A</span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">Not Contracted</TooltipContent>
                                  </Tooltip>
                                ) : (
                                  renderCell(
                                    <select defaultValue={ctc} onChange={(e) => { if (e.target.value === "__new__") { e.target.value = ctc; openAddVanityModal(); } }} className="font-mono text-xs text-foreground bg-transparent border-none outline-none cursor-pointer p-0 text-center">
                                      <option value="__new__" className="font-sans text-blue-600">+ New Vanity Number</option>
                                      <option value={ctc}>{ctc}</option>
                                      {ctcOpts.propNums.length > 0 && (
                                        <optgroup label={`— ${prop.name} —`}>
                                          {ctcOpts.propNums.map((v) => <option key={v.id} value={v.phoneNumber}>{v.phoneNumber}</option>)}
                                        </optgroup>
                                      )}
                                      {ctcOpts.companyNums.length > 0 && (
                                        <optgroup label="— Company —">
                                          {ctcOpts.companyNums.map((v) => <option key={v.id} value={v.phoneNumber}>{v.phoneNumber}</option>)}
                                        </optgroup>
                                      )}
                                    </select>
                                  )
                                )}
                              </td>

                              <td className="px-3 py-2.5 align-middle text-center border-b border-l border-border">
                                {renderCell(
                                  <select defaultValue={outbound} onChange={(e) => { if (e.target.value === "__new__") { e.target.value = outbound; openAddVanityModal(); } }} className="font-mono text-xs text-foreground bg-transparent border-none outline-none cursor-pointer p-0 text-center">
                                    <option value="__new__" className="font-sans text-blue-600">+ New Vanity Number</option>
                                    <option value={outbound}>{outbound}</option>
                                    {outOpts.propNums.length > 0 && (
                                      <optgroup label={`— ${prop.name} —`}>
                                        {outOpts.propNums.map((v) => <option key={v.id} value={v.phoneNumber}>{v.phoneNumber}</option>)}
                                      </optgroup>
                                    )}
                                    {outOpts.companyNums.length > 0 && (
                                      <optgroup label="— Company —">
                                        {outOpts.companyNums.map((v) => <option key={v.id} value={v.phoneNumber}>{v.phoneNumber}</option>)}
                                      </optgroup>
                                    )}
                                  </select>
                                )}
                              </td>
                            </>
                          );
                        })()}

                        <td className="px-3 py-2.5 align-middle text-center border-b border-l border-border">
                          {productCell(<span className="font-mono text-xs text-foreground">{nums.leasing}</span>, "leasing")}
                        </td>
                        <td className="px-3 py-2.5 align-middle text-center border-b border-border">
                          {productCell(<span className="font-mono text-xs text-foreground">{extras.voice}</span>, "leasing")}
                        </td>
                        <td className="px-3 py-2.5 align-middle text-center border-b border-border">
                          {productCell(<span className="font-mono text-xs text-foreground">{extras.other}</span>, "leasing")}
                        </td>

                        <td className="px-3 py-2.5 align-middle text-center border-b border-l border-border">
                          {productCell(<span className="font-mono text-xs text-foreground">{nums.payments}</span>, "payments")}
                        </td>

                        <td className="px-3 py-2.5 align-middle text-center border-b border-l border-border">
                          {productCell(<span className="font-mono text-xs text-foreground">{nums.maintenance}</span>, "maintenance")}
                        </td>
                        <td className="px-3 py-2.5 align-middle text-center border-b border-border">
                          {productCell(<span className="font-mono text-xs text-foreground">{maint}</span>, "maintenance")}
                        </td>

                        <td className="px-3 py-2.5 align-middle text-center border-b border-l border-border">
                          {productCell(<span className="font-mono text-xs text-foreground">{nums.renewals}</span>, "renewals")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vanity Phone Numbers — number inventory (advanced) */}
        <div className="mt-8 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-foreground">Vanity Phone Numbers</h2>
            <select
              value={vanityPropertyFilter}
              onChange={(e) => setVanityPropertyFilter(e.target.value)}
              className="rounded-md border border-border bg-white px-2.5 py-1 text-xs text-foreground"
            >
              <option value="all">Company Vanity Numbers</option>
              {vanityPropertyIds
                .map((pid) => ({ pid, name: PROPERTY_MAP[pid] ?? pid }))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(({ pid, name }) => (
                  <option key={pid} value={pid}>{name}</option>
                ))}
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead>
                <tr className="bg-zinc-50">
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border w-[140px]">Phone Number</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Type</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Lead Source</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Forward Preference</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border w-[140px]">Route Calls</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">SMS Registration Status</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">SMS</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Outbound Default</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Expiration Date</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredVanityNumbers.map((row) => (
                  <tr key={row.id} className="bg-white hover:bg-zinc-50/60 transition-colors">
                    <td className="px-4 py-2.5 border-b border-border font-mono text-xs text-foreground">{row.phoneNumber}</td>
                    <td className="px-4 py-2.5 border-b border-border text-xs text-foreground">Company Vanity Number</td>
                    <td className="px-4 py-2.5 border-b border-border text-xs text-foreground">{row.leadSource}</td>
                    <td className="px-4 py-2.5 border-b border-border text-xs text-foreground">{row.forwardPreference || "—"}</td>
                    <td className="px-4 py-2.5 border-b border-border text-xs font-mono text-foreground">{row.routeCalls && row.routeCalls !== "—" && row.routeCalls.length === 10 ? `(${row.routeCalls.slice(0,3)}) ${row.routeCalls.slice(3,6)}-${row.routeCalls.slice(6)}` : (row.routeCalls || "—")}</td>
                    <td className="px-4 py-2.5 border-b border-border text-xs text-foreground">VERIFIED</td>
                    <td className="px-4 py-2.5 border-b border-border text-center">
                      <span className="inline-flex items-center gap-1 text-xs">
                        <button
                          type="button"
                          onClick={() => setDeleteModalId(row.id)}
                          className="inline-block rounded border border-red-300 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </span>
                    </td>
                    <td className="px-4 py-2.5 border-b border-border text-center">
                      {row.outboundDefault && <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />}
                    </td>
                    <td className="px-4 py-2.5 border-b border-border text-xs text-foreground">{row.expirationDate || ""}</td>
                    <td className="px-4 py-2.5 border-b border-border text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button type="button" onClick={() => { setEditSmsEnabled(row.smsEnabled); setEditOutboundDefault(row.outboundDefault); setEditAiBailout(false); setEditExpiration(row.expirationDate || ""); setRetestBanner(null); setEditModalId(row.id); }} className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-zinc-100 transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
        </>
        )}
      </div>

      {/* Delete Registration Modal */}
      {deleteModalId && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDeleteModalId(null)} />
          <div className="relative z-10 w-full max-w-lg rounded-lg bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between bg-zinc-800 px-4 py-2.5 rounded-t-lg">
              <h3 className="text-sm font-semibold text-white">Delete Register Vanity Phone Number</h3>
            </div>
            <div className="px-6 py-8">
              <p className="text-sm text-foreground leading-relaxed">
                Please confirm that you want to delete registration of this number. After the registration is deleted any messages sent from this number will be at a higher risk of being blocked by carrier filtering.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setVanityNumbers((prev) => prev.filter((v) => v.id !== deleteModalId));
                  setDeleteModalId(null);
                }}
                className="rounded-md border border-emerald-600 bg-emerald-700 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-800"
              >
                Yes Delete Registration
              </button>
              <button
                type="button"
                onClick={() => setDeleteModalId(null)}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Vanity Number Modal */}
      {editModalId && (() => {
        const editRow = vanityNumbers.find((v) => v.id === editModalId);
        if (!editRow) return null;
        const fmtRoute = editRow.routeCalls && editRow.routeCalls !== "—" && editRow.routeCalls.length === 10
          ? `(${editRow.routeCalls.slice(0,3)})-${editRow.routeCalls.slice(3,6)}-${editRow.routeCalls.slice(6)}`
          : editRow.routeCalls || "";
        return (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh]">
            <div className="fixed inset-0 bg-black/40" onClick={() => setEditModalId(null)} />
            <div className="relative z-10 w-full max-w-[44rem] rounded-lg bg-white shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <h3 className="text-sm font-semibold text-foreground">Edit Vanity Number</h3>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditModalId(null)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" /> Close
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-6 space-y-5">
                {/* Retest banner */}
                {retestBanner && (
                  <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <p className="text-xs text-emerald-800">{retestBanner}</p>
                  </div>
                )}

                {/* Retest button */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setRetestBanner(`We are now testing ${editRow.phoneNumber} which can take up to ten minutes.`);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-zinc-50 transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Retest Vanity Number
                  </button>
                </div>

                {/* Warning */}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This vanity number is associated with at least one lead source, please disassociate before changing the number type.
                </p>

                {/* Forward Preference */}
                <div className="flex items-center gap-4">
                  <label className="w-40 text-right text-xs font-medium text-foreground shrink-0">Forward Preference:</label>
                  <select defaultValue={editRow.forwardPreference || "Specific Number"} className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-xs text-foreground">
                    <option>Office Contact</option>
                    <option>IVR</option>
                    <option>Specific Number</option>
                  </select>
                </div>

                {/* Route Calls */}
                <div className="flex items-center gap-4">
                  <label className="w-40 text-right text-xs font-medium text-foreground shrink-0">Route Calls:</label>
                  <input
                    type="text"
                    defaultValue={fmtRoute}
                    className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-xs text-foreground"
                  />
                </div>

                {/* Lead Source */}
                <div className="flex items-center gap-4">
                  <label className="w-40 text-right text-xs font-medium text-foreground shrink-0">Lead Source:</label>
                  <div className="flex-1 flex items-center gap-2">
                    <select defaultValue={editRow.leadSource || ""} className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-xs text-foreground">
                      <option value="">— Select —</option>
                      <option>Email Campaign</option>
                      <option>Internet Search-Google/Bing/Yahoo</option>
                      <option>Internet Search-Paid Ads</option>
                      <option>Internet-AMLI.com</option>
                      <option>Internet-ApartmentList</option>
                      <option>Internet-Apartments.com</option>
                      <option>Internet-Mobile/Banner Ad</option>
                      <option>Internet-Yelp.com</option>
                      <option>Internet-Zillow.com</option>
                      <option>Internet-Zumper</option>
                      <option>Signage-Banners/Directional</option>
                      <option>Social Media-Facebook</option>
                      <option>Social Media-Instagram</option>
                      <option>Social Media-YouTube</option>
                    </select>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-zinc-100 transition-colors border border-border">
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[320px] text-xs space-y-2">
                        <p>This field indicates the lead source is associated with the vanity number. To change or adjust this lead source, go to Marketing &gt;&gt; Lead Sources.</p>
                        <p className="font-semibold">Internal Only:</p>
                        <p>This field indicates the lead source is associated with the vanity number. To change or adjust this lead source, go to Marketing &gt;&gt; Lead Sources.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Use for SMS */}
                <div className="flex items-center gap-4">
                  <label className="w-40 text-right text-xs font-medium text-foreground shrink-0">Use for SMS:</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setEditSmsEnabled((v) => !v); if (editSmsEnabled) setEditOutboundDefault(false); }}
                      className={cn(
                        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                        editSmsEnabled ? "bg-emerald-500" : "bg-zinc-300"
                      )}
                    >
                      <span className={cn(
                        "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
                        editSmsEnabled ? "translate-x-[18px]" : "translate-x-[3px]"
                      )} />
                    </button>
                    <span className={cn(
                      "text-[10px] font-semibold rounded px-1.5 py-0.5",
                      editSmsEnabled ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                    )}>
                      {editSmsEnabled ? "Yes" : "No"}
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-zinc-100 transition-colors border border-border">
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[220px] text-xs">
                        This feature allows any vanity number to be configured for two-way SMS.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Outbound Default — only visible when SMS is enabled */}
                {editSmsEnabled && (
                  <>
                    <div className="flex items-center gap-4">
                      <label className="w-40 text-right text-xs font-medium text-foreground shrink-0">Outbound Default:</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditOutboundDefault((v) => !v)}
                          className={cn(
                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                            editOutboundDefault ? "bg-emerald-500" : "bg-zinc-300"
                          )}
                        >
                          <span className={cn(
                            "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
                            editOutboundDefault ? "translate-x-[18px]" : "translate-x-[3px]"
                          )} />
                        </button>
                        <span className={cn(
                          "text-[10px] font-semibold rounded px-1.5 py-0.5",
                          editOutboundDefault ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                        )}>
                          {editOutboundDefault ? "Yes" : "No"}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-zinc-100 transition-colors border border-border">
                              <HelpCircle className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[340px] text-xs">
                            When a prospect or resident first receives communication from Entrata, the number they receive it from is the outbound default. If the prospect or resident initiated a text conversation with the property, the number they text (most likely the vanity number listed on your website) is the one from which they will receive communication going forward. For marketing and tracking purposes, it is important to set your own outbound default number to something like your property website vanity number. This way, recipients do not receive it from the shortcode (51378).
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    {editOutboundDefault && (
                      <div className="ml-44 rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5">
                        <p className="text-xs text-amber-800 leading-relaxed">
                          By adding this number, Outbound Default will no longer be associated with {editRow.phoneNumber}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Expiration Date */}
                <div className="flex items-center gap-4">
                  <label className="w-40 text-right text-xs font-medium text-foreground shrink-0">Expiration Date:</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center">
                      <input
                        type="date"
                        value={editExpiration}
                        onChange={(e) => setEditExpiration(e.target.value)}
                        className="rounded-md border border-border bg-white px-3 py-2 text-xs text-foreground"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => { if (editExpiration) setEditExpiration(""); }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                        editExpiration
                          ? "border-border text-foreground hover:bg-zinc-50 cursor-pointer"
                          : "border-border/50 text-muted-foreground/50 cursor-not-allowed"
                      )}
                    >
                      <X className="h-3 w-3" /> Remove Expiration
                    </button>
                  </div>
                </div>

                {/* AI Bailout Number */}
                <div className="flex items-center gap-4">
                  <label className="w-40 text-right text-xs font-medium text-foreground shrink-0">AI Bailout Number:</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditAiBailout((v) => !v)}
                      className={cn(
                        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                        editAiBailout ? "bg-emerald-500" : "bg-zinc-300"
                      )}
                    >
                      <span className={cn(
                        "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
                        editAiBailout ? "translate-x-[18px]" : "translate-x-[3px]"
                      )} />
                    </button>
                    <span className={cn(
                      "text-[10px] font-semibold rounded px-1.5 py-0.5",
                      editAiBailout ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                    )}>
                      {editAiBailout ? "Yes" : "No"}
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-zinc-100 transition-colors border border-border">
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[300px] text-xs">
                        This number is associated with ELI+ AI. It doesn&apos;t impact routing but is an implementation signal for which number AI is transferring to when the caller asks for a representative.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-border px-6 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalId(null);
                    setDeleteModalId(editRow.id);
                  }}
                  className="rounded-md border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-zinc-50 transition-colors"
                >
                  Delete
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditModalId(null)}
                    className="rounded-md bg-emerald-600 px-5 py-2 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
                  >
                    Save
                  </button>
                  <span className="text-xs text-muted-foreground">or</span>
                  <button
                    type="button"
                    onClick={() => setEditModalId(null)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add Vanity Number Modal */}
      {addVanityOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh]">
          <div className="fixed inset-0 bg-black/40" onClick={() => setAddVanityOpen(false)} />
          <div className="relative z-10 w-full max-w-[40rem] rounded-lg bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h3 className="text-sm font-semibold text-foreground">Add Vanity Number</h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAddVanityOpen(false)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" /> Close
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-5">
              <div className="flex gap-1">
                <button
                  type="button"
                  className="rounded-md px-3.5 py-1.5 text-xs font-medium bg-red-600 text-white"
                >
                  Select Preferences
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-6 space-y-5">
              {addVanityTab === "preferences" ? (
                <>
                  {/* Phone Number Type */}
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-right text-xs font-medium text-foreground shrink-0">Phone Number Type:</label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">Company Vanity Number</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-zinc-100 transition-colors border border-border">
                            <HelpCircle className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[300px] text-xs">
                          A company vanity number is a shared number that can be assigned across multiple properties and configured for various purposes, including Super Agent AI, Click To Call Default, and Outbound Default.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Toll-Free */}
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-right text-xs font-medium text-foreground shrink-0">Toll-Free:</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAddTollFree((v) => !v)}
                        className={cn(
                          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                          addTollFree ? "bg-emerald-500" : "bg-zinc-300"
                        )}
                      >
                        <span className={cn(
                          "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
                          addTollFree ? "translate-x-[18px]" : "translate-x-[3px]"
                        )} />
                      </button>
                      <span className={cn(
                        "text-[10px] font-semibold rounded px-1.5 py-0.5",
                        addTollFree ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                      )}>
                        {addTollFree ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>

                  {/* Area Code — hidden when Toll-Free is Yes */}
                  {!addTollFree && (
                    <div className="flex items-center gap-4">
                      <label className="w-40 text-right text-xs font-medium text-foreground shrink-0">Area Code:</label>
                      <input
                        type="text"
                        maxLength={3}
                        placeholder=""
                        className="w-16 rounded-md border border-border bg-white px-3 py-2 text-xs text-foreground"
                      />
                    </div>
                  )}

                  {/* Forward Preference */}
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-right text-xs font-medium text-foreground shrink-0">Forward Preference:</label>
                    <select className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-xs text-foreground">
                      <option>Office Contacts</option>
                      <option>IVR</option>
                      <option>Specific Number</option>
                    </select>
                  </div>

                  {/* Use for SMS */}
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-right text-xs font-medium text-foreground shrink-0">Use for SMS:</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled
                        className="relative inline-flex h-5 w-9 items-center rounded-full bg-emerald-500 cursor-not-allowed opacity-75"
                      >
                        <span className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow translate-x-[18px]" />
                      </button>
                      <span className={cn(
                        "text-[10px] font-semibold rounded px-1.5 py-0.5",
                        addUseSms ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                      )}>
                        {addUseSms ? "Yes" : "No"}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-zinc-100 transition-colors border border-border">
                            <HelpCircle className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[220px] text-xs">
                          This feature allows any vanity number to be configured for two-way SMS.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Outbound Default — only visible when Use for SMS is Yes */}
                  {addUseSms && (
                    <div className="flex items-center gap-4">
                      <label className="w-40 text-right text-xs font-medium text-foreground shrink-0">Outbound Default:</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAddOutboundDefault((v) => !v)}
                          className={cn(
                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                            addOutboundDefault ? "bg-emerald-500" : "bg-zinc-300"
                          )}
                        >
                          <span className={cn(
                            "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
                            addOutboundDefault ? "translate-x-[18px]" : "translate-x-[3px]"
                          )} />
                        </button>
                        <span className={cn(
                          "text-[10px] font-semibold rounded px-1.5 py-0.5",
                          addOutboundDefault ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                        )}>
                          {addOutboundDefault ? "Yes" : "No"}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-zinc-100 transition-colors border border-border">
                              <HelpCircle className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[340px] text-xs">
                            When a prospect or resident first receives communication from Entrata, the number they receive it from is the outbound default. If the prospect or resident initiated a text conversation with the property, the number they text (most likely the vanity number listed on your website) is the one from which they will receive communication going forward. For marketing and tracking purposes, it is important to set your own outbound default number to something like your property website vanity number. This way, recipients do not receive it from the shortcode (51378).
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  )}

                  {/* Expiration Date */}
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-right text-xs font-medium text-foreground shrink-0">Expiration Date:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={addExpiration}
                        onChange={(e) => setAddExpiration(e.target.value)}
                        className="rounded-md border border-border bg-white px-3 py-2 text-xs text-foreground"
                      />
                      <button
                        type="button"
                        onClick={() => { if (addExpiration) setAddExpiration(""); }}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                          addExpiration
                            ? "border-border text-foreground hover:bg-zinc-50 cursor-pointer"
                            : "border-border/50 text-muted-foreground/50 cursor-not-allowed"
                        )}
                      >
                        <X className="h-3 w-3" /> Remove Expiration
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Request Number form coming soon.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end border-t border-border px-6 py-4 gap-3">
              <button
                type="button"
                onClick={() => setAddVanityOpen(false)}
                className="rounded-md bg-emerald-600 px-5 py-2 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                Submit Request
              </button>
              <span className="text-xs text-muted-foreground">or</span>
              <button
                type="button"
                onClick={() => setAddVanityOpen(false)}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </TooltipProvider>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Users, CreditCard, Wrench, RefreshCw,
  CheckCircle2, Phone, Plus, Pencil, Trash2, CirclePlus,
  Loader2, AlertTriangle, Zap, ChevronRight, ChevronDown, Search, X, Calendar, HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  { id: "v1",  propertyId: "p1", phoneNumber: "(877) 428-0948", type: "Lead", leadSource: "Signage-Banners/Directional", forwardPreference: "Specific Number", routeCalls: "3604924546", smsRegistrationStatus: "", smsEnabled: false, outboundDefault: false, expirationDate: "", callerIdRegistered: true },
  { id: "v2",  propertyId: "p1", phoneNumber: "(855) 716-5354", type: "Lead", leadSource: "", forwardPreference: "Specific Number", routeCalls: "8885140927", smsRegistrationStatus: "", smsEnabled: false, outboundDefault: false, expirationDate: "", callerIdRegistered: true },
  { id: "v3",  propertyId: "p1", phoneNumber: "(206) 785-3512", type: "SMS Only", leadSource: "", forwardPreference: "—", routeCalls: "—", smsRegistrationStatus: "VERIFIED on 08/04/2023", smsEnabled: true, outboundDefault: true, expirationDate: "", callerIdRegistered: false },
  { id: "v4",  propertyId: "p1", phoneNumber: "(888) 817-7299", type: "Maintenance", leadSource: "", forwardPreference: "Specific Number", routeCalls: "8885140927", smsRegistrationStatus: "", smsEnabled: false, outboundDefault: false, expirationDate: "", callerIdRegistered: true },
  { id: "v5",  propertyId: "p2", phoneNumber: "(877) 253-5829", type: "Lead", leadSource: "Social Media-YouTube", forwardPreference: "Specific Number", routeCalls: "3606144651", smsRegistrationStatus: "", smsEnabled: false, outboundDefault: false, expirationDate: "", callerIdRegistered: false },
  { id: "v6",  propertyId: "p2", phoneNumber: "(871) 253-1280", type: "Lead", leadSource: "Internet-Mobile/Banner Ad", forwardPreference: "Specific Number", routeCalls: "3008735387", smsRegistrationStatus: "Verified", smsEnabled: true, outboundDefault: false, expirationDate: "", callerIdRegistered: true },
  { id: "v7",  propertyId: "p3", phoneNumber: "(888) 207-0298", type: "Lead", leadSource: "Social Media-Instagram", forwardPreference: "Specific Number", routeCalls: "3603238381", smsRegistrationStatus: "Verified", smsEnabled: true, outboundDefault: false, expirationDate: "", callerIdRegistered: true },
  { id: "v8",  propertyId: "p3", phoneNumber: "(855) 405-9214", type: "Lead", leadSource: "Internet-AML.com", forwardPreference: "Specific Number", routeCalls: "8445031085", smsRegistrationStatus: "Verified", smsEnabled: true, outboundDefault: false, expirationDate: "", callerIdRegistered: false },
  { id: "v9",  propertyId: "p4", phoneNumber: "(844) 643-7240", type: "Lead", leadSource: "Internet Search-Paid Ads", forwardPreference: "Specific Number", routeCalls: "3605022463", smsRegistrationStatus: "Verified", smsEnabled: true, outboundDefault: false, expirationDate: "", callerIdRegistered: true },
  { id: "v10", propertyId: "p4", phoneNumber: "(855) 386-8531", type: "Lead", leadSource: "Internet Search-Google/Bing/Yahoo", forwardPreference: "Specific Number", routeCalls: "3005488824", smsRegistrationStatus: "Verified", smsEnabled: false, outboundDefault: false, expirationDate: "", callerIdRegistered: false },
  { id: "v11", propertyId: "p5", phoneNumber: "(844) 815-0570", type: "Lead", leadSource: "", forwardPreference: "Specific Number", routeCalls: "8885140927", smsRegistrationStatus: "", smsEnabled: false, outboundDefault: false, expirationDate: "", callerIdRegistered: false },
  { id: "v12", propertyId: "p5", phoneNumber: "(844) 623-5218", type: "Lead", leadSource: "Internet-ApartmentList", forwardPreference: "Specific Number", routeCalls: "3005893214", smsRegistrationStatus: "Verified", smsEnabled: true, outboundDefault: false, expirationDate: "", callerIdRegistered: true },
  { id: "v13", propertyId: "p6", phoneNumber: "(844) 449-7350", type: "Lead", leadSource: "Internet-Apartments.com", forwardPreference: "Specific Number", routeCalls: "3607965991", smsRegistrationStatus: "Verified", smsEnabled: true, outboundDefault: false, expirationDate: "", callerIdRegistered: true },
  { id: "v14", propertyId: "p7", phoneNumber: "(844) 449-7308", type: "Lead", leadSource: "Internet-Velo.com", forwardPreference: "Specific Number", routeCalls: "3006417313", smsRegistrationStatus: "Verified", smsEnabled: true, outboundDefault: false, expirationDate: "", callerIdRegistered: false },
  { id: "v15", propertyId: "p8", phoneNumber: "(844) 449-7345", type: "Lead", leadSource: "Internet-Zillow.com", forwardPreference: "Specific Number", routeCalls: "3608001134", smsRegistrationStatus: "", smsEnabled: false, outboundDefault: false, expirationDate: "", callerIdRegistered: true },
  { id: "v16", propertyId: "p9", phoneNumber: "(844) 449-7343", type: "Lead", leadSource: "Social Media-Facebook", forwardPreference: "Specific Number", routeCalls: "3607623383", smsRegistrationStatus: "Verified", smsEnabled: false, outboundDefault: false, expirationDate: "", callerIdRegistered: false },
  { id: "v17", propertyId: "p10", phoneNumber: "(844) 449-7340", type: "Lead", leadSource: "Internet-Zumper", forwardPreference: "Specific Number", routeCalls: "3607437837", smsRegistrationStatus: "Verified", smsEnabled: true, outboundDefault: false, expirationDate: "", callerIdRegistered: true },
  { id: "v18", propertyId: "p11", phoneNumber: "(844) 878-3230", type: "Lead", leadSource: "Email Campaign", forwardPreference: "Specific Number", routeCalls: "3003643810", smsRegistrationStatus: "Verified", smsEnabled: true, outboundDefault: false, expirationDate: "05/31/2026", callerIdRegistered: true },
];

const INITIALLY_ACTIVE = new Set(["p1", "p2", "p3", "p4"]);
const INITIALLY_IN_REVIEW = new Set(["p5", "p7", "p10", "p12"]);

const REVIEW_META: Record<string, string> = {
  p5: "Submitted 2 days ago",
  p7: "Submitted yesterday",
  p10: "Submitted 3 hours ago",
  p12: "Submitted 5 hours ago",
};

export default function PhoneNumbersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get("embed") === "1";

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
  const [addAreaCode, setAddAreaCode] = useState("");
  const [addForwardPref, setAddForwardPref] = useState<string>("Specific Number");
  const [callerIdRegistering, setCallerIdRegistering] = useState<string | null>(null);
  const [propertySearch, setPropertySearch] = useState("");
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(() => new Set(PROPERTIES.map((p) => p.id)));
  const [propertyPickerOpen, setPropertyPickerOpen] = useState(false);
  const propertyPickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!propertyPickerOpen) return;
    function handler(e: MouseEvent) {
      if (propertyPickerRef.current && !propertyPickerRef.current.contains(e.target as Node)) {
        setPropertyPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [propertyPickerOpen]);

  const filteredConfigProperties = PROPERTIES.filter((p) => {
    if (!selectedPropertyIds.has(p.id)) return false;
    const q = propertySearch.trim().toLowerCase();
    if (!q) return true;
    const hay = `${p.name} ${p.city} ${p.state} ${AREA_CODES[p.city] ?? ""}`.toLowerCase();
    return hay.includes(q);
  });

  const PROPERTY_MAP = Object.fromEntries(PROPERTIES.map((p) => [p.id, p.name]));
  const filteredVanityNumbers = vanityPropertyFilter === "all"
    ? vanityNumbers
    : vanityNumbers.filter((v) => v.propertyId === vanityPropertyFilter);
  const vanityPropertyIds = [...new Set(vanityNumbers.map((v) => v.propertyId).filter(Boolean))];

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
    setAddAreaCode("");
    setAddForwardPref("Specific Number");
    setAddVanityOpen(true);
  }

  function buildNewVanityPhoneNumber(): string {
    if (addTollFree) {
      const tollFreePrefixes = ["800", "833", "844", "855", "866", "877", "888"];
      const prefix = tollFreePrefixes[Math.floor(Math.random() * tollFreePrefixes.length)];
      const mid = String(Math.floor(200 + Math.random() * 800));
      const tail = String(Math.floor(1000 + Math.random() * 9000));
      return `(${prefix}) ${mid}-${tail}`;
    }
    const area = addAreaCode && /^[2-9][0-8][0-9]$/.test(addAreaCode) ? addAreaCode : "555";
    const exchange = String(Math.floor(200 + Math.random() * 800));
    const tail = String(Math.floor(1000 + Math.random() * 9000));
    return `(${area}) ${exchange}-${tail}`;
  }

  function submitAddVanityNumber() {
    const newRow = {
      id: `v_new_${Date.now()}`,
      propertyId: "",
      phoneNumber: buildNewVanityPhoneNumber(),
      type: "Lead",
      leadSource: "",
      forwardPreference: addForwardPref,
      routeCalls: "—",
      smsRegistrationStatus: "In Review",
      smsEnabled: addUseSms,
      outboundDefault: addOutboundDefault,
      expirationDate: addExpiration ? addExpiration.split("-").reverse().join("/").replace(/\//g, "/") : "",
      callerIdRegistered: false,
    };
    setVanityNumbers((prev) => [newRow, ...prev]);
    setVanityPropertyFilter("all");
    setAddVanityOpen(false);
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

  type RowStatus = "active" | "review" | "awaiting";
  function statusOf(propId: string): RowStatus {
    if (activeIds.has(propId)) return "active";
    if (inReviewIds.has(propId)) return "review";
    return "awaiting";
  }

  function collectAssignedNumbersForProperty(propId: string): string[] {
    const out: string[] = [];
    const sa = DEFAULT_SUPER_AGENT[propId];
    const ctc = DEFAULT_CLICK_TO_CALL[propId];
    const outbound = DEFAULT_OUTBOUND[propId];
    const nums = DEFAULT_NUMBERS[propId];
    const extras = DEFAULT_LEASING_EXTRAS[propId];
    const maint = DEFAULT_MAINTENANCE_VOICE[propId];
    if (sa) out.push(sa);
    if (ctc && !CLICK_TO_CALL_NOT_CONTRACTED.has(propId)) out.push(ctc);
    if (outbound) out.push(outbound);
    if (nums) out.push(nums.leasing, nums.payments, nums.maintenance, nums.renewals);
    if (extras) out.push(extras.voice, extras.other);
    if (maint) out.push(maint);
    return out;
  }

  const uniquePendingVanityNumberCount = (() => {
    const set = new Set<string>();
    inReviewIds.forEach((propId) => {
      collectAssignedNumbersForProperty(propId).forEach((n) => set.add(n));
    });
    return set.size;
  })();

  const companyVanityNumberOptions = [...new Set(vanityNumbers.map((v) => v.phoneNumber))].sort();

  return (
    <div className="mx-auto max-w-[72rem] px-4 pb-12 pt-8 sm:px-6">
      {!isEmbed && (
        <button
          type="button"
          onClick={() => router.push("/conversations/")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      )}

      <div className="mb-6">
        <h1
          className="text-2xl font-medium tracking-tight text-foreground"
          style={{ fontFamily: "Nohemi, Plus Jakarta Sans, Inter, sans-serif" }}
        >
          Vanity Number Settings
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          One dedicated phone number is set up per AI product using your company&apos;s area code. Each property gets its own number — pre-assigned automatically.
        </p>
      </div>

      {/* Summary row */}
      <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-white px-4 py-3">
        <div
          className="flex items-center gap-2"
          title={`Unique vanity numbers awaiting carrier registration across ${inReviewIds.size} ${inReviewIds.size === 1 ? "property" : "properties"} currently in review.`}
        >
          {uniquePendingVanityNumberCount > 0
            ? <Loader2 className="h-4 w-4 text-amber-500 animate-spin" aria-hidden />
            : <span className="inline-block h-4 w-4 rounded-full border-2 border-amber-400" aria-hidden />}
          <span className="text-sm text-foreground">
            <span className="font-semibold">{uniquePendingVanityNumberCount}</span>
            <span className="text-muted-foreground"> Pending Vanity Numbers</span>
          </span>
        </div>
        <span className="text-zinc-300">&middot;</span>
        <div className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded-full bg-zinc-200" aria-hidden />
          <span className="text-sm text-foreground">
            <span className="font-semibold">{awaitingIds.size}</span>
            <span className="text-muted-foreground"> Properties Not Started</span>
          </span>
        </div>
      </div>

      {/* Property Numbers table */}
      <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Vanity Number Configuration</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            This is a read-only view of vanity number assignments per property and AI product. <strong className="text-foreground font-medium">Done</strong> means the number is registered and active. <strong className="text-foreground font-medium">Pending</strong> means the carrier campaign has been submitted and is awaiting approval (typically 1–2 business days). <strong className="text-foreground font-medium">Not started</strong> means the property has not yet submitted a privacy policy to begin number registration.
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative max-w-sm flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="text"
              value={propertySearch}
              onChange={(e) => setPropertySearch(e.target.value)}
              placeholder="Search properties by name, city, or area code…"
              className="w-full rounded-md border border-border bg-white py-1.5 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="Search properties"
            />
            {propertySearch && (
              <button
                type="button"
                onClick={() => setPropertySearch("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div ref={propertyPickerRef} className="relative">
            <button
              type="button"
              onClick={() => setPropertyPickerOpen((o) => !o)}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-zinc-50"
              aria-haspopup="listbox"
              aria-expanded={propertyPickerOpen}
            >
              <span>
                {selectedPropertyIds.size === PROPERTIES.length
                  ? `All properties (${PROPERTIES.length})`
                  : `${selectedPropertyIds.size} of ${PROPERTIES.length} selected`}
              </span>
              <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", propertyPickerOpen && "rotate-180")} />
            </button>
            {propertyPickerOpen && (
              <div
                role="listbox"
                aria-multiselectable="true"
                className="absolute right-0 top-full z-30 mt-1 w-72 overflow-hidden rounded-md border border-border bg-white shadow-lg"
              >
                <div className="flex items-center justify-between border-b border-border bg-zinc-50 px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Show properties</span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSelectedPropertyIds(new Set(PROPERTIES.map((p) => p.id)))}
                      className="font-medium text-blue-600 transition-colors hover:text-blue-700"
                    >
                      All
                    </button>
                    <span className="text-zinc-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedPropertyIds(new Set())}
                      className="font-medium text-blue-600 transition-colors hover:text-blue-700"
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto py-1">
                  {PROPERTIES.map((p) => {
                    const checked = selectedPropertyIds.has(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-zinc-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setSelectedPropertyIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(p.id)) next.delete(p.id);
                              else next.add(p.id);
                              return next;
                            });
                          }}
                          className="h-3.5 w-3.5 rounded border-border accent-blue-600"
                        />
                        <span className="flex-1 truncate">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground">{p.city}, {p.state}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {(propertySearch || selectedPropertyIds.size !== PROPERTIES.length) && (
            <span className="text-[11px] text-muted-foreground">
              Showing {filteredConfigProperties.length} of {PROPERTIES.length}
            </span>
          )}
        </div>

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
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                      <CreditCard className="h-3.5 w-3.5 text-blue-500" />Payments AI
                    </span>
                  </th>
                  <th colSpan={2} className="bg-zinc-50 px-3 py-2 text-left border-b border-l border-border">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                      <Wrench className="h-3.5 w-3.5 text-amber-500" />Maintenance AI
                    </span>
                  </th>
                  <th className="bg-zinc-50 px-3 py-2 text-left border-b border-l border-border">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                      <RefreshCw className="h-3.5 w-3.5 text-emerald-500" />Renewals AI
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
                {filteredConfigProperties.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center text-xs text-muted-foreground">
                      No properties match your filters.
                      {(propertySearch || selectedPropertyIds.size !== PROPERTIES.length) && (
                        <button
                          type="button"
                          onClick={() => {
                            setPropertySearch("");
                            setSelectedPropertyIds(new Set(PROPERTIES.map((p) => p.id)));
                          }}
                          className="ml-2 font-medium text-blue-600 transition-colors hover:text-blue-700"
                        >
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                )}
                {filteredConfigProperties.map((prop) => {
                  const status = statusOf(prop.id);
                  const rowBg =
                    status === "active" ? "bg-white"
                    : status === "review" ? "bg-amber-50/40"
                    : "bg-zinc-50/60";
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

                  const renderCell = (content: ReactNode) => {
                    if (status === "awaiting") {
                      return (
                        <select
                          value=""
                          onChange={(e) => {
                            const v = e.target.value;
                            if (!v) return;
                            if (v === "__new__") {
                              openAddVanityModal();
                            } else {
                              setInReviewIds((prev) => {
                                const out = new Set(prev);
                                out.add(prop.id);
                                return out;
                              });
                            }
                            e.target.value = "";
                          }}
                          className="font-mono text-xs text-muted-foreground/70 bg-transparent border-none outline-none cursor-pointer p-0 text-center"
                          aria-label={`Assign vanity number for ${prop.name}`}
                        >
                          <option value="" disabled hidden>—</option>
                          <option value="__new__" className="font-sans text-blue-600">+ New Vanity Number</option>
                          {companyVanityNumberOptions.length > 0 && (
                            <optgroup label="— Company Vanity Numbers —">
                              {companyVanityNumberOptions.map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      );
                    }
                    if (status === "review") {
                      return (
                        <div className="inline-flex flex-col items-center gap-1">
                          {content}
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                            <Loader2 className="h-2 w-2 animate-spin" />
                            Pending
                          </span>
                        </div>
                      );
                    }
                    return content;
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
                          {renderCell(<span className="font-mono text-xs text-foreground">{nums.leasing}</span>)}
                        </td>
                        <td className="px-3 py-2.5 align-middle text-center border-b border-border">
                          {renderCell(<span className="font-mono text-xs text-foreground">{extras.voice}</span>)}
                        </td>
                        <td className="px-3 py-2.5 align-middle text-center border-b border-border">
                          {renderCell(<span className="font-mono text-xs text-foreground">{extras.other}</span>)}
                        </td>

                        <td className="px-3 py-2.5 align-middle text-center border-b border-l border-border">
                          {renderCell(<span className="font-mono text-xs text-foreground">{nums.payments}</span>)}
                        </td>

                        <td className="px-3 py-2.5 align-middle text-center border-b border-l border-border">
                          {renderCell(<span className="font-mono text-xs text-foreground">{nums.maintenance}</span>)}
                        </td>
                        <td className="px-3 py-2.5 align-middle text-center border-b border-border">
                          {renderCell(<span className="font-mono text-xs text-foreground">{maint}</span>)}
                        </td>

                        <td className="px-3 py-2.5 align-middle text-center border-b border-l border-border">
                          {renderCell(<span className="font-mono text-xs text-foreground">{nums.renewals}</span>)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Vanity Phone Numbers */}
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
                  <th className="px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1 cursor-help">
                            Property Caller ID Registered
                            <HelpCircle className="h-3 w-3 text-muted-foreground/70" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[240px] text-xs font-normal normal-case tracking-normal">
                          Display property name instead of number for outbound calls by registering caller name with carrier databases
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
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
                    <td className="px-4 py-2.5 border-b border-border text-center">
                      {row.callerIdRegistered ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                      ) : callerIdRegistering === row.id ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Registering…
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setCallerIdRegistering(row.id);
                            setTimeout(() => {
                              setVanityNumbers((prev) => prev.map((v) => v.id === row.id ? { ...v, callerIdRegistered: true } : v));
                              setCallerIdRegistering(null);
                            }, 2000);
                          }}
                          className="rounded border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
                        >
                          Register
                        </button>
                      )}
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
                        placeholder="e.g. 512"
                        value={addAreaCode}
                        onChange={(e) => setAddAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
                        className="w-20 rounded-md border border-border bg-white px-3 py-2 text-xs text-foreground"
                      />
                    </div>
                  )}

                  {/* Forward Preference */}
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-right text-xs font-medium text-foreground shrink-0">Forward Preference:</label>
                    <select
                      value={addForwardPref}
                      onChange={(e) => setAddForwardPref(e.target.value)}
                      className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-xs text-foreground"
                    >
                      <option value="Office Contacts">Office Contacts</option>
                      <option value="IVR">IVR</option>
                      <option value="Specific Number">Specific Number</option>
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
                onClick={submitAddVanityNumber}
                disabled={!addTollFree && !/^[2-9][0-8][0-9]$/.test(addAreaCode)}
                className="rounded-md bg-emerald-600 px-5 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-600/50"
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
  );
}

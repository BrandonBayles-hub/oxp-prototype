"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Building,
  CalendarIcon,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  UserPlus,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCallSystemDemo, type IncomingCallerType } from "@/lib/call-system-demo-context";
import {
  InboundCallFloatingPanel,
  type InboundCallSessionInput,
} from "@/components/inbound-call-floating-panel";

const SCENARIO_BY_TYPE: Record<IncomingCallerType, Omit<InboundCallSessionInput, "id">> = {
  resident: {
    callerName: "Sarah Mitchell",
    callerPhone: "+1 (801) 555-0147",
    propertyName: "Hillside Living",
    propertyLine: "(801) 423-1100",
    callerType: "resident",
    unit: "Unit 204B",
    leaseEnd: "Aug 31, 2026",
    balance: "$1,247.00",
    autoPay: false,
    openWorkOrders: 2,
    lastPayment: "Apr 1, 2026",
    ivrSelection: "Press 2 — Current Residents",
    aiContextNote: "Recurring maintenance: HVAC reported 3 times in 60 days. Lease renewal in 3 months.",
  },
  lead: {
    callerName: "James Rodriguez",
    callerPhone: "+1 (720) 555-0293",
    propertyName: "Jamison Apartments",
    propertyLine: "(720) 315-1100",
    callerType: "lead",
    leadSource: "Apartments.com",
    preferredFloorPlan: "2BR / 2BA — The Aspen",
    moveInDate: "Jul 15, 2026",
    tourScheduled: "Tomorrow 2:00 PM",
    applicationStatus: "Not started",
    ivrSelection: "Press 1 — Leasing",
    aiContextNote: "Lead visited website 4 times this week. Interested in 2BR units. Previously toured on May 10.",
  },
  prospect: {
    callerName: "Unknown Caller",
    callerPhone: "+1 (385) 555-0822",
    propertyName: "Hillside Living",
    propertyLine: "(801) 423-1100",
    callerType: "prospect",
    ivrSelection: "Press 1 — Leasing",
    aiContextNote: "No matching record in system. Routed through leasing IVR.",
  },
};

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function GlobalInboundCallHandler() {
  const { callSystemEnabled, inboundCallRequest, inboundCallerType } = useCallSystemDemo();
  const [session, setSession] = useState<InboundCallSessionInput | null>(null);
  const [profileOverlay, setProfileOverlay] = useState<InboundCallSessionInput | null>(null);
  const lastRequestRef = useRef(0);

  useEffect(() => {
    if (inboundCallRequest === 0) return;
    if (inboundCallRequest === lastRequestRef.current) return;
    lastRequestRef.current = inboundCallRequest;

    const type = inboundCallerType || "resident";
    const base = SCENARIO_BY_TYPE[type];
    setSession({ ...base, id: `inbound-${Date.now()}-${type}` });
  }, [inboundCallRequest, inboundCallerType]);

  const handleAnswered = useCallback((s: InboundCallSessionInput) => {
    if (s.callerType === "resident" || s.callerType === "lead") {
      setProfileOverlay(s);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setSession(null);
  }, []);

  const closeProfile = useCallback(() => {
    setProfileOverlay(null);
  }, []);

  if (!callSystemEnabled) return null;

  return (
    <>
      <InboundCallFloatingPanel
        session={session}
        onDismiss={handleDismiss}
        onAnswered={handleAnswered}
      />

      {profileOverlay && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-black/30" onClick={closeProfile} />
          <div className="relative z-10 flex flex-1 flex-col animate-in slide-in-from-top duration-300 bg-white">
            {/* Entrata brand bar */}
            <div className="flex items-center justify-between bg-[#b71c1c] px-4 py-2.5 shrink-0">
              <span className="text-[16px] font-semibold italic text-white/90 tracking-wide">entrata</span>
              <button
                type="button"
                onClick={closeProfile}
                className="flex items-center gap-1.5 text-[14px] font-medium text-white/90 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>

            {/* Content row below brand bar */}
            <div className="flex flex-1 min-h-0">
            {/* LEFT: Profile (header + tabs + body) */}
            <div className="flex flex-1 min-w-0 flex-col bg-white">
              {/* Profile header row */}
              <div className="flex items-center bg-white px-5 py-5 shrink-0 border-b border-gray-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2e7d32] text-sm font-bold text-white shrink-0">
                    {initials(profileOverlay.callerName)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[15px] font-bold text-gray-900">{profileOverlay.callerName}</span>
                    <p className="text-[12px] text-gray-500">
                      {profileOverlay.propertyName}
                      {profileOverlay.unit && <> | {profileOverlay.unit}</>}
                    </p>
                  </div>
                </div>
                <span className="mx-4 text-gray-300">·</span>
                <div className="ml-auto flex items-center gap-1.5">
                  {[
                    { label: "SMS", Icon: MessageSquare },
                    { label: "Email", Icon: Mail },
                    { label: "Appointment", Icon: CalendarIcon },
                    { label: "Schedule Manual Contact", Icon: Phone },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      className="relative flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
                    >
                      <btn.Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" strokeWidth={1.5} />
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {profileOverlay.callerType === "resident" && <ResidentProfileContent session={profileOverlay} />}
              {profileOverlay.callerType === "lead" && <LeadProfileContent session={profileOverlay} />}
            </div>

            {/* MIDDLE: Quick View sidebar */}
            <div className="w-[190px] shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
              <div className="border-b border-gray-200 px-3 py-2.5">
                <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2.5 text-center">
                  {profileOverlay.callerType === "resident" ? (
                    <>
                      <p className="text-[9px] font-medium text-gray-500 leading-tight">Lease Status: Current -</p>
                      <p className="text-[9px] text-gray-500 leading-tight">Month To Month</p>
                      <p className="mt-1.5 text-[10px] font-medium text-gray-700">Balance: <span className="text-[#c0392b] font-semibold">{profileOverlay.balance || "$0.00"}</span></p>
                    </>
                  ) : (
                    <>
                      <p className="text-[9px] font-medium text-gray-500 leading-tight">Lead Status:</p>
                      <p className="text-[9px] text-emerald-600 font-semibold leading-tight">Active</p>
                      <p className="mt-1.5 text-[10px] font-medium text-gray-700">Source: <span className="font-semibold">{profileOverlay.leadSource || "—"}</span></p>
                    </>
                  )}
                </div>
                <button className="mt-2 w-full text-center text-[10px] text-blue-600 hover:underline">More Actions</button>
              </div>
              <div className="border-b border-gray-200 px-3 py-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-gray-700">Quick View</span>
                  <button className="text-[10px] text-blue-600 hover:underline">Edit</button>
                </div>
                <div className="space-y-1.5 text-[9px] leading-tight">
                  <div><span className="text-gray-400 font-medium">Primary Ph:</span><br /><span className="text-gray-700">{profileOverlay.callerPhone} · Mobile</span></div>
                  <div><span className="text-gray-400 font-medium">Email:</span><br /><span className="text-gray-700">{profileOverlay.callerName.toLowerCase().replace(" ", ".")}@email.com</span></div>
                  {profileOverlay.callerType === "resident" && (
                    <>
                      <div className="pt-1.5 border-t border-gray-100">
                        <span className="text-gray-400 font-medium">Move-in Date:</span> <span className="text-gray-700">Aug 19, 2014</span>
                      </div>
                      <div><span className="text-gray-400 font-medium">Lease Start:</span> <span className="text-gray-700">Dec 06, 2023</span></div>
                      <div><span className="text-gray-400 font-medium">Lease End:</span> <span className="text-gray-700">{profileOverlay.leaseEnd || "Mar 05, 2024"}</span></div>
                      <div className="pt-1.5 border-t border-gray-100">
                        <span className="text-gray-400 font-medium">Late Payments:</span> <span className="text-blue-600 cursor-pointer hover:underline">9</span>
                      </div>
                      <div><span className="text-gray-400 font-medium">Returned Payments:</span> <span className="text-blue-600 cursor-pointer hover:underline">0</span></div>
                    </>
                  )}
                  {profileOverlay.callerType === "lead" && (
                    <>
                      <div className="pt-1.5 border-t border-gray-100">
                        <span className="text-gray-400 font-medium">Preferred Plan:</span><br /><span className="text-gray-700">{profileOverlay.preferredFloorPlan || "—"}</span>
                      </div>
                      <div><span className="text-gray-400 font-medium">Move-in Date:</span> <span className="text-gray-700">{profileOverlay.moveInDate || "—"}</span></div>
                      <div><span className="text-gray-400 font-medium">Tour:</span> <span className="text-emerald-600">{profileOverlay.tourScheduled || "—"}</span></div>
                      <div><span className="text-gray-400 font-medium">Application:</span> <span className="text-gray-700">{profileOverlay.applicationStatus || "—"}</span></div>
                    </>
                  )}
                </div>
              </div>
              <div className="border-b border-gray-200 px-3 py-2.5">
                <p className="text-[10px] font-semibold text-gray-700 mb-1.5">Add Activity</p>
                <div className="flex items-center gap-1">
                  <input className="flex-1 rounded border border-gray-200 px-2 py-1 text-[10px] text-gray-500 placeholder:text-gray-300" placeholder="Add Note" />
                </div>
              </div>
              {profileOverlay.callerType === "resident" && (
                <div className="px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-gray-700 mb-2">Open Work Orders</p>
                  <button className="mb-2.5 flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-50">
                    <span className="text-green-600">⊕</span> Create Work Order
                  </button>
                  <div className="space-y-0 text-[9px]">
                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-400 font-medium">Location</span>
                      <span className="text-gray-400 font-medium">Submitted</span>
                    </div>
                    {[
                      { loc: "Unit Wide", date: "Mar 28, 2024" },
                      { loc: "Kitchen", date: "Mar 21, 2024" },
                    ].map((wo, i) => (
                      <div key={i} className="flex items-center justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-600">{wo.loc}</span>
                        <span className="text-gray-400">{wo.date}</span>
                      </div>
                    ))}
                  </div>
                  <button className="mt-2.5 w-full text-center text-[10px] font-medium text-blue-600 hover:underline tracking-wide">VIEW ALL WORK ORDERS</button>
                </div>
              )}
            </div>

            {/* RIGHT: Conversation Threads panel */}
            <ProfileThreadsPanel session={profileOverlay} />

            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ResidentProfileContent({ session }: { session: InboundCallSessionInput }) {
  return (
    <>
      {/* Profile tabs */}
      <div className="flex items-center gap-0 border-b border-gray-200 bg-[#f5f5f5] px-2 shrink-0">
        {["Financial", "Household", "Lease", "Utilities", "Documents", "Maintenance", "Activity Log"].map((tab, i) => (
          <button
            key={tab}
            className={`px-3 py-2 text-[11px] font-medium transition-colors rounded-t ${
              i === 0
                ? "bg-white text-[#c0392b] border border-gray-200 border-b-white -mb-px relative z-10"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      {/* Sub-tabs */}
      <div className="flex items-center gap-0 border-b border-gray-200 bg-white px-3 shrink-0">
        {["Ledger", "Recurring Charges and Credits", "One Time Charges and Credits", "Recurring Payments", "MoneyGram", "Customer Invoices", "Payment Methods"].map((tab, i) => (
          <button
            key={tab}
            className={`px-2.5 py-2 text-[10px] font-medium transition-colors border-b-2 ${
              i === 0
                ? "text-[#333] border-[#c0392b]"
                : "text-gray-400 border-transparent hover:text-gray-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      {/* Main ledger area */}
      <div className="flex flex-1 min-h-0">
        {/* Ledger sidebar */}
        <div className="w-[130px] shrink-0 border-r border-gray-200 bg-white p-3 space-y-3 text-[10px]">
          <div><span className="text-gray-700 font-semibold">Resident:</span> <span className="text-gray-700">{session.balance || "$0.00"}</span></div>
          <div className="text-gray-400">Group: $0</div>
          <div className="text-gray-400">Harris/Ledger: $0</div>
          <div className="text-gray-400">HP/Ledger: $0</div>
          <div className="text-gray-400">Subsidy ledger custom: $0</div>
          <div className="text-gray-400">Deposits Held: $390</div>
        </div>
        {/* Ledger table area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-2 shrink-0">
            <button className="rounded border border-gray-300 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1"><span className="text-gray-400">▾</span> Add</button>
            <button className="rounded border border-gray-300 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1"><span className="text-gray-400">▾</span> Filter</button>
            <div className="flex-1" />
            <button className="rounded border border-gray-300 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50">Generate Statement</button>
          </div>
          <div className="flex items-center gap-2 px-4 py-1.5 border-b border-gray-100 shrink-0">
            <button className="rounded bg-gray-200 px-2.5 py-0.5 text-[10px] font-medium text-gray-700">Open Items</button>
            <button className="rounded px-2.5 py-0.5 text-[10px] font-medium text-gray-400 hover:bg-gray-100">Full Ledger</button>
            <label className="flex items-center gap-1 text-[10px] text-gray-400 ml-3">Resident Friendly Mode: <input type="checkbox" className="h-3 w-3 accent-gray-500" /></label>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-[9px] text-gray-500 uppercase tracking-wide">
                  <th className="px-2 py-1.5 font-medium w-6"><input type="checkbox" className="h-3 w-3" /></th>
                  <th className="px-2 py-1.5 font-medium">Post Date</th>
                  <th className="px-2 py-1.5 font-medium">Due Date</th>
                  <th className="px-2 py-1.5 font-medium">Post Mon</th>
                  <th className="px-2 py-1.5 font-medium">Created On</th>
                  <th className="px-2 py-1.5 font-medium">Trans ID</th>
                  <th className="px-2 py-1.5 font-medium">Invoice</th>
                  <th className="px-2 py-1.5 font-medium">Charge Code</th>
                  <th className="px-2 py-1.5 font-medium">Memo</th>
                  <th className="px-2 py-1.5 font-medium text-right">Charges</th>
                  <th className="px-2 py-1.5 font-medium text-right">Unapplied</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { postDate: "Jun 08, 2024", dueDate: "Jun 08, 2024", postMon: "06/2024", createdOn: "Jun 08, 2024 06:1", transId: "504369305", charge: "$5", unapplied: "$5", memo: "live testing", code: "live testing" },
                  { postDate: "Jun 07, 2024", dueDate: "Jun 07, 2024", postMon: "06/2024", createdOn: "Jun 07, 2024 06:0", transId: "604381115", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                  { postDate: "Jun 06, 2024", dueDate: "Jun 05, 2024", postMon: "06/2024", createdOn: "Jun 06, 2024 06:0", transId: "604184319", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                  { postDate: "Jun 05, 2024", dueDate: "Jun 05, 2024", postMon: "06/2024", createdOn: "Jun 05, 2024 06:0", transId: "503983188", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                  { postDate: "Jun 04, 2024", dueDate: "Jun 04, 2024", postMon: "06/2024", createdOn: "Jun 04, 2024 06:1", transId: "503980039", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                  { postDate: "Jun 03, 2024", dueDate: "Jun 03, 2024", postMon: "06/2024", createdOn: "Jun 03, 2024 06:2", transId: "503905723", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                  { postDate: "Jun 02, 2024", dueDate: "Jun 02, 2024", postMon: "06/2024", createdOn: "Jun 02, 2024 06:1", transId: "502313004", charge: "$20", unapplied: "$20", memo: "live testing", code: "live testing", highlight: true },
                  { postDate: "Jun 01, 2024", dueDate: "Jun 01, 2024", postMon: "06/2024", createdOn: "May 31, 2024 11:2", transId: "502049706", charge: "$120", unapplied: "$120", memo: "Monthly Credit", code: "Credit Fees", bold: true },
                  { postDate: "Jun 01, 2024", dueDate: "Jun 01, 2024", postMon: "06/2024", createdOn: "May 31, 2024 11:2", transId: "502049722", charge: "$500", unapplied: "$500", memo: "Monthly Admin", code: "Admin Fee", bold: true },
                  { postDate: "May 08, 2024", dueDate: "May 08, 2024", postMon: "05/2024", createdOn: "May 08, 2024 06:1", transId: "498473699", charge: "$5", unapplied: "$5", memo: "live testing", code: "live testing" },
                  { postDate: "May 07, 2024", dueDate: "May 07, 2024", postMon: "05/2024", createdOn: "May 07, 2024 06:1", transId: "498293910", charge: "$15", unapplied: "$15", memo: "live testing", code: "live testing" },
                  { postDate: "May 01, 2024", dueDate: "May 01, 2024", postMon: "05/2024", createdOn: "Apr 30, 2024 11:3", transId: "497101603", charge: "$120", unapplied: "$120", memo: "Monthly Credit", code: "Credit Fees", bold: true },
                  { postDate: "May 01, 2024", dueDate: "May 01, 2024", postMon: "05/2024", createdOn: "Apr 30, 2024 11:3", transId: "497101655", charge: "$500", unapplied: "$500", memo: "Monthly Admin", code: "Admin Fee", bold: true },
                ].map((row, i) => (
                  <tr key={i} className={`border-b border-gray-100 ${(row as { highlight?: boolean }).highlight ? "bg-yellow-50" : ""}`}>
                    <td className="px-2 py-1.5"><input type="checkbox" className="h-3 w-3" /></td>
                    <td className="px-2 py-1.5 text-gray-700 whitespace-nowrap">{row.postDate}</td>
                    <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{row.dueDate}</td>
                    <td className="px-2 py-1.5 text-gray-500">{row.postMon}</td>
                    <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{row.createdOn}</td>
                    <td className="px-2 py-1.5 text-gray-500">{row.transId}</td>
                    <td className="px-2 py-1.5 text-blue-600 cursor-pointer hover:underline">Generate</td>
                    <td className="px-2 py-1.5 text-gray-700">{row.code}</td>
                    <td className={`px-2 py-1.5 ${(row as { bold?: boolean }).bold ? "text-blue-600 font-semibold cursor-pointer hover:underline" : "text-blue-600 cursor-pointer hover:underline"}`}>{row.memo}</td>
                    <td className="px-2 py-1.5 text-right text-gray-700">{row.charge}</td>
                    <td className="px-2 py-1.5 text-right text-gray-700">{row.unapplied}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function LeadProfileContent({ session }: { session: InboundCallSessionInput }) {
  return (
    <>
      {/* Lead tabs */}
      <div className="flex items-center gap-0 border-b border-gray-200 bg-[#f5f5f5] px-2 shrink-0">
        {["Lead Details", "Activity", "Communications", "Tour History", "Application"].map((tab, i) => (
          <button
            key={tab}
            className={`px-3 py-2 text-[11px] font-medium transition-colors rounded-t ${
              i === 0
                ? "bg-white text-[#c0392b] border border-gray-200 border-b-white -mb-px relative z-10"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Lead details body */}
      <div className="flex flex-1 min-h-0 overflow-auto">
        <div className="flex-1 p-6 space-y-6">
          {/* Contact info card */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Phone</p>
                <p className="text-sm text-gray-800 font-medium">{session.callerPhone}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Email</p>
                <p className="text-sm text-blue-600 font-medium">
                  {session.callerName.toLowerCase().replace(" ", ".")}@email.com
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Lead Source</p>
                <p className="text-sm text-gray-800 font-medium">{session.leadSource || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Created</p>
                <p className="text-sm text-gray-800 font-medium">May 5, 2026</p>
              </div>
            </div>
          </div>

          {/* Preferences card */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Preferences</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Preferred Floor Plan</p>
                <p className="text-sm text-gray-800 font-medium">{session.preferredFloorPlan || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Desired Move-in</p>
                <p className="text-sm text-gray-800 font-medium">{session.moveInDate || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Budget</p>
                <p className="text-sm text-gray-800 font-medium">$1,800 – $2,200/mo</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Occupants</p>
                <p className="text-sm text-gray-800 font-medium">2 Adults, 1 Pet</p>
              </div>
            </div>
          </div>

          {/* Tour / Application card */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Tour &amp; Application</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Tour Scheduled</p>
                <p className="text-sm text-emerald-600 font-medium">{session.tourScheduled || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Application Status</p>
                <p className="text-sm text-gray-800 font-medium">{session.applicationStatus || "—"}</p>
              </div>
            </div>
          </div>

          {/* Activity timeline */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Recent Activity</h3>
            <div className="space-y-3">
              {[
                { date: "May 19, 2026", action: "Inbound call received", detail: "IVR: Leasing" },
                { date: "May 15, 2026", action: "Website visit", detail: "Viewed 2BR floor plans (3 pages)" },
                { date: "May 12, 2026", action: "Email sent", detail: "Tour confirmation for May 10" },
                { date: "May 10, 2026", action: "In-person tour", detail: "Toured The Aspen 2BR model unit" },
                { date: "May 5, 2026", action: "Lead created", detail: `Source: ${session.leadSource || "Website"}` },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-gray-300 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-800">{item.action}</p>
                    <p className="text-[10px] text-gray-400">{item.date} · {item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar with AI context */}
        <div className="w-[280px] shrink-0 border-l border-gray-200 bg-gray-50 p-4 space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 mb-1">AI Context</p>
            <p className="text-xs text-blue-800 leading-relaxed">{session.aiContextNote}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">Quick Actions</p>
            <div className="space-y-1.5">
              <button className="flex w-full items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-[11px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <Building className="h-3.5 w-3.5 text-gray-400" />
                Schedule Tour
              </button>
              <button className="flex w-full items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-[11px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <UserPlus className="h-3.5 w-3.5 text-gray-400" />
                Start Application
              </button>
              <button className="flex w-full items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-[11px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <MessageCircle className="h-3.5 w-3.5 text-gray-400" />
                Send Follow-up
              </button>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">Property</p>
            <p className="text-xs font-medium text-gray-800">{session.propertyName}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{session.propertyLine}</p>
          </div>
        </div>
      </div>
    </>
  );
}

function ProfileThreadsPanel({ session }: { session: InboundCallSessionInput }) {
  const [filter, setFilter] = useState<"active" | "closed">("active");
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const threads = session.callerType === "resident"
    ? [
        { property: session.propertyName, type: "Maintenance", channel: "SMS" as const, status: "active" as const, assignee: "Court White", lastDate: "May 19, 2026", messages: [
          { role: "user" as const, text: "Hi, the HVAC in unit 204B is making a loud noise again. This is the third time.", ts: "May 19, 2026 · 2:15pm" },
          { role: "agent" as const, text: "I'm sorry to hear that. I've escalated this to our maintenance team and they'll be reaching out today.", ts: "May 19, 2026 · 2:22pm" },
        ]},
        { property: session.propertyName, type: "Lease Renewal", channel: "Email" as const, status: "active" as const, assignee: "Abe Kashiwagi", lastDate: "May 15, 2026", messages: [
          { role: "agent" as const, text: "Hi Sarah, your lease is coming up for renewal on Aug 31. Would you like to discuss renewal options?", ts: "May 15, 2026 · 10:00am" },
          { role: "user" as const, text: "Yes, I'd like to know what the new rate would be.", ts: "May 15, 2026 · 11:30am" },
        ]},
        { property: session.propertyName, type: "Payment Inquiry", channel: "SMS" as const, status: "closed" as const, assignee: "Court White", lastDate: "Apr 28, 2026", messages: [
          { role: "user" as const, text: "Can you confirm my last payment was received?", ts: "Apr 28, 2026 · 9:00am" },
          { role: "agent" as const, text: "Yes, your payment of $1,247.00 was received on Apr 1. Your current balance is $1,247.00.", ts: "Apr 28, 2026 · 9:15am" },
        ]},
      ]
    : [
        { property: session.propertyName, type: "Tour Follow-up", channel: "Email" as const, status: "active" as const, assignee: "Abe Kashiwagi", lastDate: "May 15, 2026", messages: [
          { role: "agent" as const, text: "Hi James, thanks for touring The Aspen 2BR unit! Let me know if you have any questions.", ts: "May 10, 2026 · 3:00pm" },
          { role: "user" as const, text: "Thanks! I'm very interested. What's the move-in cost breakdown?", ts: "May 12, 2026 · 10:00am" },
          { role: "agent" as const, text: "Great question! I've attached a breakdown. Application fee is $50, deposit is first month's rent.", ts: "May 12, 2026 · 11:30am" },
        ]},
        { property: session.propertyName, type: "Pricing Inquiry", channel: "SMS" as const, status: "active" as const, assignee: null, lastDate: "May 18, 2026", messages: [
          { role: "user" as const, text: "What are the current rates for 2BR units?", ts: "May 18, 2026 · 4:00pm" },
          { role: "agent" as const, text: "Our 2BR units start at $1,850/mo. The Aspen plan you toured is $1,975/mo. Shall I send availability?", ts: "May 18, 2026 · 4:12pm" },
        ]},
      ];

  const filtered = threads.filter((t) => t.status === filter);

  if (openIdx !== null) {
    const thread = threads[openIdx];
    return (
      <div className="w-[320px] shrink-0 border-l border-gray-200 flex flex-col bg-white animate-in slide-in-from-right duration-200">
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 shrink-0">
          <button type="button" onClick={() => setOpenIdx(null)} className="text-gray-500 hover:text-gray-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2e7d32] text-[11px] font-bold text-white">
            {initials(session.callerName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-gray-900">{session.callerName}</p>
            <p className="text-[11px] text-gray-500">{thread.property}: {thread.type}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-muted/30 px-4 py-4">
          <div className="space-y-4">
            {thread.messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "agent" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 ${
                  msg.role === "agent"
                    ? "bg-primary text-primary-foreground"
                    : "bg-white border border-gray-200 text-gray-900"
                }`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-semibold">
                      {msg.role === "agent" ? (thread.assignee || "Agent") : session.callerName}
                    </span>
                  </div>
                  <p className="text-[12px] leading-relaxed">{msg.text}</p>
                  <p className={`text-[9px] mt-1 ${msg.role === "agent" ? "text-primary-foreground/60" : "text-gray-400"}`}>{msg.ts}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-gray-200 px-3 py-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <input className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-[12px] placeholder:text-gray-400" placeholder="Type a message..." />
            <button className="rounded-md bg-primary px-3 py-2 text-[11px] font-medium text-primary-foreground hover:bg-primary/90">Send</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[320px] shrink-0 border-l border-gray-200 flex flex-col bg-white animate-in slide-in-from-right duration-200">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 shrink-0">
        <h3 className="text-[14px] font-bold text-gray-900">Threads</h3>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          {(["active", "closed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`rounded-md px-4 py-1.5 text-[12px] font-medium transition-colors ${
                filter === tab
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "active" ? "Active" : "Closed"}
            </button>
          ))}
        </div>
        <div className="space-y-5">
          {filtered.map((thread, i) => {
            const globalIdx = threads.indexOf(thread);
            return (
              <div
                key={i}
                className="flex items-start gap-3 cursor-pointer rounded-lg p-1.5 -mx-1.5 transition-colors hover:bg-gray-50"
                onClick={() => setOpenIdx(globalIdx)}
              >
                <div className="mt-0.5 flex items-center">
                  <span className={`inline-block h-2 w-2 rounded-full ${thread.status === "active" ? "bg-blue-500" : "bg-transparent"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900">{thread.property}: {thread.type}</p>
                  {thread.assignee && (
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {thread.status === "closed" ? `Closed by ${thread.assignee}` : thread.assignee}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {thread.status === "closed" ? `Closed on ${thread.lastDate}` : `Last message ${thread.lastDate}`}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <Badge variant="secondary" className="h-auto px-1.5 py-0 text-[10px]">
                      {thread.channel}
                    </Badge>
                  </div>
                </div>
                <div
                  className={
                    thread.assignee
                      ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2e7d32] text-[9px] font-bold text-white"
                      : "shrink-0 flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-400"
                  }
                >
                  {thread.assignee ? initials(thread.assignee) : "+"}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-[12px] text-gray-400 text-center py-8">No {filter} threads</p>
          )}
        </div>
      </div>
    </div>
  );
}

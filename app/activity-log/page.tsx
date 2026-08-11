"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, Eye, Info, RotateCcw } from "lucide-react";

type ViewState = "Success (populated)" | "Loading" | "Empty" | "Error";
type Filter = "All" | "Accepts" | "Escalations" | "Signals" | "Opt-outs" | "Follow-ups";

type Activity = {
  type: string;
  date: string;
  user: string;
  actor?: "eli";
  description: string;
  tag?: string;
  kind?: Filter;
  action: "view" | "info";
};

const activities: Activity[] = [
  { type: "Note", date: "Jul 28, 2026, 9:15 AM", user: "Morgan Ellis", description: "Called prospect to confirm tour preferences. Left voicemail.", action: "view" },
  { type: "Leasing AI — Follow-up", date: "Jul 29, 2026, 2:22 PM", user: "Entrata ELI", actor: "eli", description: "ELI sent a proactive SMS follow-up after 48 hours with no response to the tour invitation.", tag: "ELI", kind: "Follow-ups", action: "info" },
  { type: "Tour booked", date: "Jul 30, 2026, 11:05 AM", user: "ELI", actor: "eli", description: "Leasing AI recorded a tour booking for Saturday, Aug 1 at 10:00 AM.", tag: "ELI", kind: "Accepts", action: "info" },
  { type: "Outgoing Email", date: "Jul 31, 2026, 8:40 AM", user: "Morgan Ellis", description: "Sent tour confirmation and property overview PDF to jordan.hale@example.com.", action: "view" },
  { type: "Application Started", date: "Aug 1, 2026, 12:18 PM", user: "ELI", actor: "eli", description: "Leasing AI detected that the prospect started an application after the property tour.", tag: "ELI", kind: "Signals", action: "info" },
  { type: "Leasing AI — Escalation", date: "Aug 2, 2026, 4:18 PM", user: "Entrata ELI", actor: "eli", description: "Escalation created: prospect asked about income qualification requirements; routed to leasing team.", tag: "ELI", kind: "Escalations", action: "info" },
  { type: "Application Completed", date: "Aug 3, 2026, 10:02 AM", user: "ELI", actor: "eli", description: "Application submitted successfully and is ready for staff review.", tag: "ELI", kind: "Accepts", action: "info" },
  { type: "Application Approved", date: "Aug 4, 2026, 3:27 PM", user: "ELI", actor: "eli", description: "Application approval recorded. Leasing AI notified the prospect of next steps.", tag: "ELI", kind: "Accepts", action: "info" },
  { type: "Lease Started", date: "Aug 5, 2026, 9:42 AM", user: "ELI", actor: "eli", description: "Lease workflow started for the approved applicant.", tag: "ELI", kind: "Signals", action: "info" },
  { type: "Lease Signed", date: "Aug 6, 2026, 1:14 PM", user: "ELI", actor: "eli", description: "Signed lease received and resident onboarding is ready to begin.", tag: "ELI", kind: "Accepts", action: "info" },
  { type: "Lead Archived/Canceled", date: "Aug 7, 2026, 5:06 PM", user: "ELI", actor: "eli", description: "Lead archived after the prospect canceled the leasing conversation.", tag: "ELI", kind: "Opt-outs", action: "info" },
  { type: "Note", date: "Aug 8, 2026, 1:30 PM", user: "Morgan Ellis", description: "Reviewed Leasing AI escalation and confirmed follow-up ownership with the team.", action: "view" },
];

const viewStates: ViewState[] = ["Success (populated)", "Loading", "Empty", "Error"];
const filters: Filter[] = ["All", "Accepts", "Escalations", "Signals", "Opt-outs", "Follow-ups"];

function EliMark() {
  return <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#17172b] text-[10px] font-bold text-white shadow-sm"><span className="h-2 w-2 rounded-full bg-[#c13cff]" /></span>;
}

function ActionIcon({ action }: { action: Activity["action"] }) {
  return action === "view" ? <Eye className="h-4 w-4" /> : <Info className="h-4 w-4" />;
}

export default function ActivityLogPage() {
  const [viewState, setViewState] = useState<ViewState>("Success (populated)");
  const [filter, setFilter] = useState<Filter>("All");

  const visibleActivities = useMemo(() => {
    if (filter === "All") return activities;
    return activities.filter((activity) => activity.kind === filter);
  }, [filter]);

  const shownActivities = viewState === "Success (populated)" ? visibleActivities : [];

  return (
    <div className="min-h-full bg-[#f7f7f7] text-[#171717]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="flex h-12 items-center border-b border-[#e5e5e5] bg-white px-4 text-[13px] text-[#3c3c3c]">
        <button className="flex items-center gap-2 font-medium transition-colors hover:text-black" type="button"><span className="text-xl leading-none">←</span> Back to workspace</button>
      </div>

      <main className="mx-auto max-w-[1240px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-3 text-[14px] text-[#707070]"><span>Customers</span><ChevronRight className="h-4 w-4" /><span>Jordan Hale</span><ChevronRight className="h-4 w-4" /><span>Lease</span><ChevronRight className="h-4 w-4" /><span className="font-medium text-[#111]">Activity Log</span></div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Activity Log</h1>
        <p className="mt-1 text-[15px] text-[#777]">Jordan Hale · Unit 214 · Leasing timeline and Leasing AI milestones</p>

        <section className="mt-9 rounded-lg border border-[#dedede] bg-[#f3f3f3] px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-[15px] font-semibold">Demo controls</h2><p className="text-[13px] text-[#777]">Toggle view states, filter Leasing AI milestones, or reset mutable demo data.</p></div><button type="button" onClick={() => { setViewState("Success (populated)"); setFilter("All"); }} className="flex h-8 items-center gap-2 rounded-md border border-[#e1e1e1] bg-white px-3 text-[12px] font-semibold transition-colors hover:bg-[#fafafa]"><RotateCcw className="h-4 w-4" />Reset demo</button></div>
          <div className="mt-4"><p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#747474]">View state</p><div className="flex flex-wrap gap-2">{viewStates.map((state) => <button key={state} type="button" onClick={() => setViewState(state)} className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors ${viewState === state ? "border-[#1479bd] bg-[#1479bd] text-white" : "border-[#dfdfdf] bg-white hover:bg-[#e8e8e8]"}`}>{state}</button>)}</div></div>
          <div className="mt-4"><p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#747474]">Milestone filter</p><div className="flex flex-wrap gap-2">{filters.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors ${filter === item ? "border-[#151515] bg-[#151515] text-white" : "border-[#dfdfdf] bg-white hover:bg-[#e8e8e8]"}`}>{item}</button>)}</div></div>
        </section>

        <section className="mt-6 overflow-hidden rounded-lg border border-[#e0e0e0] bg-white shadow-[0_1px_1px_rgba(0,0,0,0.02)]">
          <div className="grid grid-cols-[1.15fr_.9fr_.65fr_3fr_52px] bg-[#e4e4e4] px-2 py-3 text-[14px] font-bold"><span>Activity Type</span><span>Date &amp; Time</span><span>User</span><span>Activities</span><span className="text-center">Actions</span></div>
          {viewState === "Loading" && <div className="flex h-32 items-center justify-center text-sm text-[#777]">Loading activity…</div>}
          {viewState === "Empty" && <div className="flex h-32 items-center justify-center text-sm text-[#777]">No activity found for this filter.</div>}
          {viewState === "Error" && <div className="flex h-32 items-center justify-center text-sm text-red-600">Unable to load activity. Try resetting the demo.</div>}
          {viewState === "Success (populated)" && shownActivities.length === 0 && <div className="flex h-32 items-center justify-center text-sm text-[#777]">No activity found for this filter.</div>}
          {viewState === "Success (populated)" && shownActivities.map((activity, index) => <div key={`${activity.type}-${index}`} className="grid min-h-[62px] grid-cols-[1.15fr_.9fr_.65fr_3fr_52px] items-center border-t border-[#e4e4e4] px-2 py-2 text-[14px] hover:bg-[#fafafa]"><div className="min-w-0 font-semibold">{activity.type}{activity.tag && <span className="ml-2 rounded bg-[#d8ecfa] px-1.5 py-0.5 text-[11px] font-medium text-[#267ab7]">{activity.tag}</span>}{activity.type === "Outgoing Email" && <span className="ml-2 rounded border border-[#dedede] px-1.5 py-0.5 text-[10px] font-medium text-[#666]">Viewed</span>}<div className="mt-1 text-[12px] font-normal text-[#777]">{activity.kind ? `Event type · ${activity.kind}` : ""}</div></div><span className="text-[#777]">{activity.date}</span><span className="flex items-center gap-2 font-medium">{activity.actor === "eli" ? <EliMark /> : null}{activity.user}</span><span className="truncate pr-4">{activity.description}</span><button type="button" aria-label={`${activity.action} ${activity.type}`} className="mx-auto rounded p-1 text-[#777] transition-colors hover:bg-[#eee] hover:text-[#111]"><ActionIcon action={activity.action} /></button></div>)}
        </section>
        <div className="mt-3 flex items-center gap-2 text-[12px] text-[#777]"><Check className="h-3.5 w-3.5 text-emerald-600" />Showing Leasing AI lifecycle events and staff activity for this demo lease.</div>
      </main>
    </div>
  );
}

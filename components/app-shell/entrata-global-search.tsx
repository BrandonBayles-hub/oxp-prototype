"use client";

/**
 * Entrata Global Search overlay.
 *
 * Rendered by `EntrataTopNav` when the "Search" button in the primary
 * top bar is clicked. Matches the classic Entrata global-search
 * dropdown per the reference design the PM shared — search input
 * pinned to the top-right (where the button lives when closed), an
 * Active/Inactive filter row, a "'query' is:" typeahead scope
 * dropdown on the far right, a category-tab strip with per-tab
 * counts, a 6-column result table with a two-line Name cell, and a
 * bottom bar with the "Continue searching in inactive…" hint on the
 * left and a "Need Help?" link on the right.
 *
 * Interaction:
 *   • Clicking the top-nav Search button opens the overlay with a
 *     blank, focused input and an empty-state prompt ("Start typing
 *     to search leads, residents, applicants, …"). The tab strip
 *     shows zero counts on every category until a query is entered.
 *   • As the user types, `DEMO_RESULTS` is filtered client-side by
 *     a case-insensitive substring match against every text field
 *     on each row (name, role, type, bldg-unit, property, status,
 *     and every Other Results value). Per-tab counts update live to
 *     reflect the filtered set.
 *   • Clicking outside the panel or pressing Escape closes it, and
 *     the next open always starts fresh (query reset, tab reset to
 *     "All").
 *   • The X inside the input clears the query back to the empty
 *     state.
 *
 * Data is a static demo array (`DEMO_RESULTS`). The first ten rows
 * mirror the original reference screenshot exactly so typing `abe`
 * still reproduces it 1:1; the remainder are varied names (Smith,
 * Johnson, Chen, Rodriguez, Anderson, Miller, Davis, …) so the
 * typeahead feels responsive to whichever profile the user is
 * looking for. Nothing here talks to real property data — this is
 * a design-fidelity + interaction build.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, ChevronDown, Mail, MessageSquare } from "lucide-react";

// Entrata's classic mid-blue used for links, active-tab underlines,
// and the checked-checkbox fill. Not one of the OXP tokens — this
// overlay intentionally mirrors the legacy Entrata UI so it reads
// like the same product the customer opens every morning.
const ENTRATA_BLUE = "#2A6EBB";

type ResultType =
  | "Lead"
  | "Applicant"
  | "Resident"
  | "Tenant"
  | "Work Order"
  | "AR Payment"
  | "Report"
  | "Vendor";

export type Result = {
  id: string;
  name: string;
  /** Subtitle under the name — e.g. "Primary", "Roommate (Responsible)". */
  role: string;
  type: ResultType;
  bldgUnit: string;
  property: string;
  status: string;
  /** Contact email for the Email compose flow. Falls back to the first
   *  Email-labeled entry in `otherResults` if omitted. */
  email?: string;
  /** Contact phone number, rendered in the SMS compose popup. Purely
   *  demo data — synthesized 555-prefixed numbers per row. */
  phone?: string;
  /** ID of an existing OXP conversation thread if this person already
   *  has an active SMS conversation. When set, the row's SMS button
   *  navigates to `/conversations/?id=<activeSmsThreadId>` instead of
   *  opening the "compose new SMS" popup — matching the requirement
   *  that a pre-existing thread jumps straight into the app rather
   *  than starting a duplicate. */
  activeSmsThreadId?: string;
  /**
   * Right-most "Other Results" cell. Rendered as one or more short
   * lines; the substring that matches the query is bolded via a
   * naive case-insensitive split (see `highlightMatch`). Each line
   * is a { label, value } pair so we can render "Email: …" style
   * prefixes with the value in the same line.
   */
  otherResults: Array<{ label?: string; value: string }>;
};

// Seed rows for the live-typeahead demo. The first ten mirror the
// original PM reference exactly (all match "abe") so that the demo
// looks identical to the reference the moment a user types `abe`.
// The remaining rows cover other common first-letter searches
// (Smith, Johnson, Chen, Rodriguez, Anderson, …) so the search feels
// responsive to *whatever* the user types — leads and resident
// profiles surface immediately regardless of which name they try.
//
// Filtering is a case-insensitive substring match against every text
// field on the row (see `matchesQuery`). Per-tab counts are computed
// live from the filtered set, not hardcoded, so the parenthesized
// numbers on each tab always reflect the actual match count for
// whatever the user has typed.
const DEMO_RESULTS: Result[] = [
  {
    id: "r1",
    name: "Abel, Ann",
    role: "Primary",
    type: "Resident",
    bldgUnit: "C4 - C4613",
    property: "Courthouse Square Apartments",
    status: "Current",
    otherResults: [{ label: "Email", value: "rwabel3@yahoo.com" }],
  },
  {
    id: "r3",
    name: "Lukose, Abraham",
    role: "Primary",
    type: "Resident",
    bldgUnit: "10 - 107",
    property: "Enclave at 127th",
    status: "Current",
    phone: "(303) 555-1077",
    activeSmsThreadId: "lc-abraham-lukose-1",
    otherResults: [{ label: "Email", value: "abelukose@gmail.com" }],
  },
  {
    id: "r4",
    name: "Guadarrama, Mario",
    role: "Roommate (Responsible)",
    type: "Resident",
    bldgUnit: "13 - 1314",
    property: "The Reserve at Kenosha",
    status: "Current",
    otherResults: [{ label: "Middle Name", value: "Abel" }],
  },
  {
    id: "r5",
    name: "Betaneli, Alexander",
    role: "Roommate (Responsible)",
    type: "Resident",
    bldgUnit: "3 - 16",
    property: "Wrenfield at Pleasant View",
    status: "Current",
    otherResults: [{ label: "Email", value: "abetaneli@hotmail.com" }],
  },
  {
    id: "r6",
    name: "Beasley, Ayden",
    role: "Primary",
    type: "Resident",
    bldgUnit: "1 - 1301",
    property: "Circa Apartments",
    status: "Current",
    otherResults: [{ label: "Email", value: "abeasley0304@gmail.com" }],
  },
  {
    id: "r7",
    name: "becker, amber",
    role: "Primary",
    type: "Lead",
    bldgUnit: "-",
    property: "Enclave at 127th",
    status: "Guest Card Completed",
    otherResults: [{ label: "Email", value: "abecker.3.813@gmail.com" }],
  },
  {
    id: "r8",
    name: "Abel, Ann",
    role: "Primary",
    type: "AR Payment",
    bldgUnit: "C4 - C4613",
    property: "Courthouse Square Apartments",
    status: "Captured",
    otherResults: [
      { label: "Amount", value: "$2,606.71" },
      { label: "Email", value: "rwabel3@yahoo.com" },
      { label: "Payment ID", value: "1715851397" },
    ],
  },
  {
    id: "r9",
    name: "Lukose, Abraham",
    role: "Primary",
    type: "AR Payment",
    bldgUnit: "10 - 107",
    property: "Enclave at 127th",
    status: "Captured",
    otherResults: [
      { label: "Amount", value: "$1,781.09" },
      { label: "Email", value: "abelukose@gmail.com" },
      { label: "Payment ID", value: "1714781071" },
    ],
  },
  {
    id: "r10",
    name: "Guadarrama, Mario",
    role: "Primary",
    type: "AR Payment",
    bldgUnit: "13 - 1314",
    property: "The Reserve at Kenosha",
    status: "Captured",
    otherResults: [{ label: "Amount", value: "$1,651.82" }],
  },

  // Extra rows for typeahead variety — non-"abe" names so typing
  // common letters (s, j, c, r, m, k, d, …) also surfaces leads and
  // resident profiles. Types skew Lead/Resident/Applicant since the
  // typeahead is primarily used to jump into a person's profile.
  {
    id: "r11",
    name: "Smith, Sarah",
    role: "Primary",
    type: "Lead",
    bldgUnit: "-",
    property: "Enclave at 127th",
    status: "Guest Card Completed",
    otherResults: [{ label: "Email", value: "sarah.smith@gmail.com" }],
  },
  {
    id: "r12",
    name: "Smith, Jonathan",
    role: "Primary",
    type: "Resident",
    bldgUnit: "5 - 512",
    property: "Circa Apartments",
    status: "Current",
    otherResults: [{ label: "Email", value: "jsmith88@outlook.com" }],
  },
  {
    id: "r13",
    name: "Johnson, David",
    role: "Primary",
    type: "Resident",
    bldgUnit: "8 - 803",
    property: "Courthouse Square Apartments",
    status: "Current",
    otherResults: [{ label: "Email", value: "d.johnson@yahoo.com" }],
  },
  {
    id: "r14",
    name: "Johnson, Ashley",
    role: "Primary",
    type: "Lead",
    bldgUnit: "-",
    property: "The Reserve at Kenosha",
    status: "Tour Scheduled",
    otherResults: [{ label: "Email", value: "ashley.j@gmail.com" }],
  },
  {
    id: "r15",
    name: "Chen, Michael",
    role: "Primary",
    type: "Applicant",
    bldgUnit: "2 - 204",
    property: "Wrenfield at Pleasant View",
    status: "Screening in Progress",
    otherResults: [{ label: "Email", value: "michael.chen@gmail.com" }],
  },
  {
    id: "r16",
    name: "Rodriguez, Ana",
    role: "Primary",
    type: "Resident",
    bldgUnit: "C4 - C4801",
    property: "Courthouse Square Apartments",
    status: "Current",
    otherResults: [{ label: "Email", value: "ana.rodriguez@gmail.com" }],
  },
  {
    id: "r17",
    name: "Rodriguez, Carlos",
    role: "Primary",
    type: "Lead",
    bldgUnit: "-",
    property: "Circa Apartments",
    status: "Guest Card Completed",
    otherResults: [{ label: "Email", value: "carlos.rod@yahoo.com" }],
  },
  {
    id: "r18",
    name: "Anderson, Kevin",
    role: "Primary",
    type: "Lead",
    bldgUnit: "-",
    property: "Enclave at 127th",
    status: "Tour Scheduled",
    otherResults: [{ label: "Email", value: "kevin.anderson@gmail.com" }],
  },
  {
    id: "r19",
    name: "Miller, Emily",
    role: "Primary",
    type: "Resident",
    bldgUnit: "7 - 715",
    property: "The Reserve at Kenosha",
    status: "Current",
    otherResults: [{ label: "Email", value: "emily.miller@outlook.com" }],
  },
  {
    id: "r20",
    name: "Davis, Robert",
    role: "Primary",
    type: "Applicant",
    bldgUnit: "3 - 302",
    property: "Wrenfield at Pleasant View",
    status: "Approved",
    otherResults: [{ label: "Email", value: "rob.davis@gmail.com" }],
  },

  // Rows linked to seed OXP conversation threads. Searching these
  // surfaces residents who already have an active SMS thread in the
  // Conversations page, so clicking the row's SMS button routes to
  // `/conversations/?id=<threadId>` instead of opening the "compose
  // a new SMS" popup. The thread IDs match ids in
  // `lib/conversations-context.tsx`.
  {
    id: "r21",
    name: "Santos, Maria",
    role: "Primary",
    type: "Resident",
    bldgUnit: "H2 - 214",
    property: "Hillside Living",
    status: "Current",
    phone: "(720) 555-0142",
    activeSmsThreadId: "lc-1",
    otherResults: [{ label: "Email", value: "maria.santos@gmail.com" }],
  },
  {
    id: "r22",
    name: "Sanchez, Alma",
    role: "Primary",
    type: "Resident",
    bldgUnit: "H3 - 318",
    property: "Hillside Living",
    status: "Current",
    phone: "(720) 555-0163",
    activeSmsThreadId: "lc-3",
    otherResults: [{ label: "Email", value: "alma.sanchez@yahoo.com" }],
  },
  {
    id: "r23",
    name: "Calzoni, Davis",
    role: "Primary",
    type: "Lead",
    bldgUnit: "-",
    property: "Hillside Living",
    status: "Tour Scheduled",
    phone: "(720) 555-0189",
    activeSmsThreadId: "lc-4",
    otherResults: [{ label: "Email", value: "d.calzoni@outlook.com" }],
  },
];

// Tab ids + render order. Counts are computed live from the current
// query-filtered set in `tabCounts` below (via useMemo) so switching
// what you type immediately updates every tab number in place.
type TabId = "All" | ResultType;
const TAB_ORDER: TabId[] = [
  "All",
  "Lead",
  "Applicant",
  "Resident",
  "Tenant",
  "Work Order",
  "AR Payment",
  "Report",
  "Vendor",
];

// Tab labels use the plural form ("Leads", "Residents", …) while
// the underlying `Result.type` is singular; keep the mapping local
// so the singular type still drives filtering.
const TAB_LABEL_BY_ID: Record<TabId, string> = {
  All: "All",
  Lead: "Leads",
  Applicant: "Applicants",
  Resident: "Residents",
  Tenant: "Tenants",
  "Work Order": "Work Orders",
  "AR Payment": "AR Payments",
  Report: "Reports",
  Vendor: "Vendors",
};

/**
 * Case-insensitive substring highlighter. Splits `text` around every
 * occurrence of `query` and wraps the matches in a bolded `<strong>`.
 * If the query is empty the text renders as-is. The bold weight is
 * `700` and the color stays black — matching the reference where the
 * emphasized substring is darker/heavier, not blue.
 */
function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const q = query.trim();
  if (!q) return text;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  const lowerText = text.toLowerCase();
  const lowerQuery = q.toLowerCase();
  let idx = lowerText.indexOf(lowerQuery, cursor);
  let n = 0;
  while (idx !== -1) {
    if (idx > cursor) parts.push(text.slice(cursor, idx));
    parts.push(
      <strong
        key={`m-${n++}`}
        style={{ fontWeight: 700, color: "#1a1a1a" }}
      >
        {text.slice(idx, idx + q.length)}
      </strong>,
    );
    cursor = idx + q.length;
    idx = lowerText.indexOf(lowerQuery, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

export function EntrataGlobalSearch({
  open,
  onClose,
  anchorTop,
  searchInputTop,
  searchInputRight,
  searchInputWidth,
  onComposeEmail,
  onComposeSms,
  onOpenSmsThread,
}: {
  open: boolean;
  onClose: () => void;
  /** Distance from the viewport top where the results panel should
   *  start. Passed in so the panel sits flush under the top nav
   *  regardless of the nav's exact height. */
  anchorTop: number;
  /** Fixed-position `top` for the search-input pill that visually
   *  replaces the Search button in the top nav. */
  searchInputTop: number;
  /** Fixed-position `right` for the search-input pill. */
  searchInputRight: number;
  /** Width of the search-input pill (the button expands into this
   *  wider input when open). */
  searchInputWidth: number;
  /** Row's "Email" button clicked — parent should open the Compose
   *  Email modal. Search overlay closes itself first. */
  onComposeEmail?: (r: Result) => void;
  /** Row's "SMS" button clicked AND the row has no `activeSmsThreadId`
   *  — parent should open the compose-new-SMS popup. Search overlay
   *  closes itself first. */
  onComposeSms?: (r: Result) => void;
  /** Row's "SMS" button clicked AND the row has an `activeSmsThreadId`
   *  — parent should navigate to `/conversations/?id=<threadId>` so
   *  the user drops straight into their existing thread. Search
   *  overlay closes itself first. */
  onOpenSmsThread?: (threadId: string, r: Result) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);

  // Starts empty on every open so the panel presents a clean typeahead
  // affordance rather than pre-committing the user to a query. Users
  // start typing and results (lead + resident profiles, work orders,
  // AR payments, …) filter in live.
  const [query, setQuery] = useState("");
  const [showActive, setShowActive] = useState(true);
  const [showInactive, setShowInactive] = useState(true);
  const [tab, setTab] = useState<TabId>("All");
  const [scopeOpen, setScopeOpen] = useState(false);

  // Reset the query + tab selection every time the overlay opens
  // and focus the input, so opening the panel always presents a
  // clean typeahead — no stale query, no stale tab from a previous
  // session.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setTab("All");
    // A single frame delay lets the panel mount before we grab focus.
    const raf = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Escape to close. Bound at the window level so it works even when
  // focus is inside the input.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Click outside the panel closes. Uses `mousedown` so clicks that
  // start inside and drag out don't accidentally close the panel.
  // We consider both the panel *and* the top-nav search input as
  // "inside" — the input is fixed-positioned separately from the
  // results panel, so a naive `panelRef.contains` check would
  // otherwise close the overlay every time the user clicks the
  // input to keep typing.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      const inPanel = panelRef.current && panelRef.current.contains(target);
      const inInput =
        inputWrapperRef.current && inputWrapperRef.current.contains(target);
      if (!inPanel && !inInput) {
        onClose();
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onClose]);

  // Trimmed, lower-cased query used for both filtering and match
  // highlighting. Empty string => no filtering / empty state.
  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;

  // A row "matches" if the query appears anywhere in any of its
  // text fields — name, role, type, bldg-unit, property, status,
  // or any Other Results label/value. Case-insensitive substring.
  const matchesQuery = (r: Result, q: string): boolean => {
    const needle = q.toLowerCase();
    if (!needle) return false;
    const haystacks: string[] = [
      r.name,
      r.role,
      r.type,
      r.bldgUnit,
      r.property,
      r.status,
      ...r.otherResults.map((o) => `${o.label ?? ""} ${o.value}`),
    ];
    return haystacks.some((h) => h.toLowerCase().includes(needle));
  };

  // Query-filtered rows, computed once per query change and reused
  // by both the tab-count summary and the visible-rows selector so
  // the counts on each tab always match what would actually render
  // if that tab were selected.
  const queryFilteredRows = useMemo(() => {
    if (!hasQuery) return [] as Result[];
    return DEMO_RESULTS.filter((r) => matchesQuery(r, trimmedQuery));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmedQuery, hasQuery]);

  // Dynamic per-tab counts derived from `queryFilteredRows`. Every
  // tab id gets a count even when there's no matching row so the
  // tab strip keeps its layout and the user can visually confirm a
  // category has zero matches without the tab disappearing.
  const tabCounts = useMemo(() => {
    const counts: Record<TabId, number> = {
      All: queryFilteredRows.length,
      Lead: 0,
      Applicant: 0,
      Resident: 0,
      Tenant: 0,
      "Work Order": 0,
      "AR Payment": 0,
      Report: 0,
      Vendor: 0,
    };
    for (const r of queryFilteredRows) {
      counts[r.type] += 1;
    }
    return counts;
  }, [queryFilteredRows]);

  const visibleRows = useMemo(() => {
    if (tab === "All") return queryFilteredRows;
    return queryFilteredRows.filter((r) => r.type === tab);
  }, [tab, queryFilteredRows]);

  if (!open) return null;

  return (
    <>
      {/* Scoped CSS for the row-level Email/SMS quick-action buttons.
          A tiny `<style>` block is used here (rather than the inline
          `onMouseEnter`/`onMouseLeave` pattern used elsewhere in this
          module) because the polished chip needs both `:hover` and
          `:focus-visible` — inline styles can't express those
          pseudo-classes cleanly. Class names are prefixed `egs-` so
          they can't collide with OXP styles from other surfaces. */}
      <style>{`
        .egs-row-action {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          height: 22px;
          padding: 0 8px;
          border-radius: 5px;
          border: 1px solid #DDE1E6;
          background: #FFFFFF;
          color: #1F2A37;
          font-size: 12px;
          font-weight: 500;
          line-height: 1;
          font-family: inherit;
          white-space: nowrap;
          cursor: pointer;
          transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
        }
        .egs-row-action:hover {
          background: #F7F9FC;
          border-color: #B4BAC2;
        }
        .egs-row-action:focus-visible {
          outline: 1px solid ${ENTRATA_BLUE};
          outline-offset: 1px;
        }
      `}</style>

      {/* Subtle scrim so the page behind the overlay recedes without
          fully dimming — Entrata's own global search doesn't do a
          heavy modal blackout, so we match. */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.04)",
          zIndex: 199,
        }}
      />

      {/* Top-nav search input — fixed-positioned to visually replace
          the "Search" button. Rendered as part of the overlay so it
          shares state (query, focus) with the results panel below
          and gets torn down together when the overlay closes. */}
      <div
        ref={inputWrapperRef}
        style={{
          position: "fixed",
          top: searchInputTop,
          right: searchInputRight,
          width: searchInputWidth,
          zIndex: 201,
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 28,
            padding: "0 10px",
            border: "1px solid #C4C4C4",
            borderRadius: 4,
            background: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <Search
            style={{ width: 14, height: 14, color: "rgba(0,0,0,0.55)", flexShrink: 0 }}
            strokeWidth={2}
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search"
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 13,
              color: "#1a1a1a",
              fontFamily: "inherit",
            }}
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 18,
                height: 18,
                border: "none",
                background: "transparent",
                color: "rgba(0,0,0,0.4)",
                cursor: "pointer",
                padding: 0,
                flexShrink: 0,
              }}
            >
              <X style={{ width: 14, height: 14 }} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      <div
        ref={panelRef}
        role="dialog"
        aria-label="Global search"
        style={{
          // Right-anchored panel, ~720px wide, capped at the viewport
          // so it stays visible on narrower emulator sizes. Matches
          // the reference where the panel occupies the right ~65-70%
          // of the viewport and leaves the "entrata | Client Name"
          // wordmark visible on the left of the top nav.
          position: "fixed",
          top: anchorTop,
          right: 4,
          width: "min(720px, calc(100vw - 12px))",
          maxHeight: `calc(100vh - ${anchorTop + 8}px)`,
          background: "#fff",
          borderRadius: 6,
          border: "1px solid #E0E0E0",
          boxShadow: "0 12px 32px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.10)",
          zIndex: 200,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        {/* Row 1 — Active/Inactive filters on the left, scope
            dropdown on the right. The search input lives up in the
            top nav (see `inputWrapperRef` block above). */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            padding: "12px 16px 8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <FilterCheckbox
              id="gs-active"
              label="Active"
              checked={showActive}
              onChange={setShowActive}
            />
            <FilterCheckbox
              id="gs-inactive"
              label="Inactive"
              checked={showInactive}
              onChange={setShowInactive}
            />
          </div>

          {/* Scope selector ("`abe` is: Select ▼"). Purely decorative
              in the prototype — clicking it just toggles a placeholder
              popover for demo effect. Only shown once the user has
              actually typed something, since there's nothing to scope
              until a query exists. */}
          <div
            style={{
              position: "relative",
              visibility: hasQuery ? "visible" : "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => setScopeOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={scopeOpen}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                height: 26,
                padding: "0 8px 0 10px",
                fontSize: 12,
                fontWeight: 400,
                color: "#1a1a1a",
                background: "#E7F1FA",
                border: "1px solid #B7D6EE",
                borderRadius: 3,
                cursor: "pointer",
              }}
            >
              <span>
                <span style={{ fontWeight: 700 }}>&ldquo;{trimmedQuery}&rdquo;</span>{" "}
                <span style={{ color: "rgba(0,0,0,0.5)" }}>is</span>
                <span style={{ color: "rgba(0,0,0,0.5)" }}>:</span>{" "}
                <span style={{ color: "rgba(0,0,0,0.55)" }}>Select</span>
              </span>
              <ChevronDown style={{ width: 12, height: 12, color: "rgba(0,0,0,0.4)" }} strokeWidth={2} />
            </button>
            {scopeOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  right: 0,
                  minWidth: 200,
                  background: "#fff",
                  border: "1px solid #E0E0E0",
                  borderRadius: 4,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
                  padding: "4px 0",
                  zIndex: 210,
                }}
              >
                {[
                  "Name",
                  "Email",
                  "Phone Number",
                  "Confirmation ID",
                  "Payment ID",
                ].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setScopeOpen(false)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 12px",
                      fontSize: 12,
                      color: "#1a1a1a",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(0,0,0,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 2 — category tabs. Underline shifts to the active tab
            and its label goes bold. Counts stay muted gray for both
            active and inactive tabs. Horizontally scrollable if the
            emulator viewport is very narrow so every tab stays on
            one line (nowrap) rather than word-wrapping into a
            two-row grid. Hidden in the empty state — the tabs
            represent filters over search results, so they only
            appear once there are search results to filter. */}
        <div
          style={{
            display: hasQuery ? "flex" : "none",
            alignItems: "flex-end",
            gap: 14,
            padding: "0 14px",
            borderBottom: "1px solid #E5E5E5",
            overflowX: "auto",
            whiteSpace: "nowrap",
          }}
        >
          {TAB_ORDER.map((id) => {
            const isActive = tab === id;
            const count = tabCounts[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                style={{
                  position: "relative",
                  padding: "10px 0 8px",
                  fontSize: 12.5,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? ENTRATA_BLUE : "#1a1a1a",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {TAB_LABEL_BY_ID[id]}{" "}
                <span
                  style={{
                    color: "rgba(0,0,0,0.4)",
                    fontWeight: 400,
                  }}
                >
                  ({count})
                </span>
                {isActive && (
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: -1,
                      height: 2,
                      background: ENTRATA_BLUE,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Rows 3+ — results table. Scrolls internally so the
            footer stays anchored at the bottom of the overlay
            even on tall queries. Three states:
              • no query yet → typeahead prompt ("Start typing…")
              • query set, zero matches → "No matches" message
              • query set, matches → results table */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {!hasQuery ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "56px 24px",
                textAlign: "center",
                color: "rgba(0,0,0,0.55)",
              }}
            >
              <div
                aria-hidden
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "#F3F6FA",
                  border: "1px solid #E5EBF3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: ENTRATA_BLUE,
                }}
              >
                <Search style={{ width: 20, height: 20 }} strokeWidth={2} />
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#1a1a1a",
                  lineHeight: 1.35,
                }}
              >
                Start typing to search
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "rgba(0,0,0,0.55)",
                  lineHeight: 1.5,
                  maxWidth: 380,
                }}
              >
                Leads, applicants, residents, tenants, work orders, AR
                payments, reports, and vendors — all in one search.
              </div>
            </div>
          ) : visibleRows.length === 0 ? (
            <div
              style={{
                padding: "48px 16px",
                textAlign: "center",
                fontSize: 13,
                color: "rgba(0,0,0,0.5)",
              }}
            >
              No {TAB_LABEL_BY_ID[tab].toLowerCase()} match &ldquo;{trimmedQuery}&rdquo;.
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <colgroup>
                <col style={{ width: "18%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "30%" }} />
              </colgroup>
              <thead>
                <tr>
                  {["Name", "Type", "Bldg-Unit", "Property", "Status", "Other Results"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "7px 14px",
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: "#1a1a1a",
                          borderBottom: "1px solid #E5E5E5",
                          background: "#fff",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => (
                  <tr
                    key={r.id}
                    style={{ borderBottom: "1px solid #F0F0F0", cursor: "pointer" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background =
                        "rgba(0,0,0,0.02)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background =
                        "transparent";
                    }}
                  >
                    <td style={{ padding: "7px 14px", verticalAlign: "top" }}>
                      {/* Two-column layout INSIDE the Name cell:
                          left = stacked name + role (matches the
                          original tight Entrata row); right = Email +
                          SMS action buttons, right-aligned so they
                          hang off the name/role without adding
                          vertical height to the row. */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              color: ENTRATA_BLUE,
                              fontSize: 13,
                              fontWeight: 500,
                              lineHeight: 1.3,
                            }}
                          >
                            {r.name}
                          </div>
                          <div
                            style={{
                              color: "rgba(0,0,0,0.45)",
                              fontSize: 12,
                              fontStyle: "italic",
                              marginTop: 1,
                              lineHeight: 1.25,
                            }}
                          >
                            {r.role}
                          </div>
                        </div>

                        {/* Row-level quick actions. Email always opens
                            the compose modal; SMS either navigates to
                            the person's existing conversation thread
                            (if `activeSmsThreadId` is set) or opens the
                            compose-new-SMS popup (if not). Stacked
                            vertically (Email above SMS) so the pair
                            occupies less horizontal room in the Name
                            cell — the row's width is already tight at
                            the 720px overlay size. */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 3,
                            flexShrink: 0,
                          }}
                        >
                          <RowActionButton
                            icon={<Mail style={{ width: 13, height: 13 }} strokeWidth={1.75} />}
                            label="Email"
                            ariaLabel={`Email ${r.name}`}
                            onClick={(e) => {
                              // Stop the row's row-level hover / click
                              // handler from also firing; the row is a
                              // pseudo-link that navigates to the
                              // profile in real Entrata.
                              e.stopPropagation();
                              onClose();
                              onComposeEmail?.(r);
                            }}
                          />
                          <RowActionButton
                            icon={<MessageSquare style={{ width: 13, height: 13 }} strokeWidth={1.75} />}
                            label="SMS"
                            ariaLabel={
                              r.activeSmsThreadId
                                ? `Open active SMS with ${r.name}`
                                : `Send SMS to ${r.name}`
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              onClose();
                              if (r.activeSmsThreadId) {
                                onOpenSmsThread?.(r.activeSmsThreadId, r);
                              } else {
                                onComposeSms?.(r);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "7px 14px",
                        verticalAlign: "top",
                        color: "#1a1a1a",
                        fontSize: 13,
                      }}
                    >
                      {r.type}
                    </td>
                    <td
                      style={{
                        padding: "7px 14px",
                        verticalAlign: "top",
                        color: "#1a1a1a",
                        fontSize: 13,
                      }}
                    >
                      {r.bldgUnit}
                    </td>
                    <td
                      style={{
                        padding: "7px 14px",
                        verticalAlign: "top",
                        color: "#1a1a1a",
                        fontSize: 13,
                        lineHeight: 1.35,
                      }}
                    >
                      {r.property}
                    </td>
                    <td
                      style={{
                        padding: "7px 14px",
                        verticalAlign: "top",
                        color: "#1a1a1a",
                        fontSize: 13,
                        lineHeight: 1.35,
                      }}
                    >
                      {r.status}
                    </td>
                    <td
                      style={{
                        padding: "7px 14px",
                        verticalAlign: "top",
                        color: "#1a1a1a",
                        fontSize: 13,
                        lineHeight: 1.4,
                      }}
                    >
                      {r.otherResults.map((row, i) => (
                        <div key={i}>
                          {row.label && <>{row.label}: </>}
                          {highlightMatch(row.value, query)}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer — inactive-account hint + Need Help link. Border
            top separates it from the last row. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            borderTop: "1px solid #E5E5E5",
            fontSize: 12.5,
            color: "#1a1a1a",
            background: "#fff",
          }}
        >
          <div style={{ fontWeight: 600 }}>
            Looking for an INACTIVE account older than 24 months? Continue
            searching in{" "}
            <FooterLink onClick={onClose}>Leads</FooterLink>,{" "}
            <FooterLink onClick={onClose}>Applicants</FooterLink>,{" "}
            <FooterLink onClick={onClose}>Residents</FooterLink> or{" "}
            <FooterLink onClick={onClose}>Tenants</FooterLink>
          </div>
          <FooterLink onClick={onClose}>Need Help?</FooterLink>
        </div>
      </div>
    </>
  );
}

/**
 * Compact checkbox row matching the reference's blue-filled square +
 * label pattern. Not styled with Tailwind because the parent overlay
 * uses inline styles throughout to stay isolated from OXP tokens.
 */
function FilterCheckbox({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        color: "#1a1a1a",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <span
        style={{
          width: 15,
          height: 15,
          borderRadius: 2,
          border: checked ? "none" : "1.5px solid #B0B0B0",
          background: checked ? ENTRATA_BLUE : "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 100ms",
          flexShrink: 0,
        }}
        aria-hidden
      >
        {checked && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 8.5l3.2 3.2L13 5"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
      />
      {label}
    </label>
  );
}

/**
 * Small chip-style quick-action used inside each result row for the
 * Email and SMS actions. White surface + hairline border, hover /
 * focus states handled by the `.egs-row-action` rules defined in
 * the scoped `<style>` block above so the button gets real
 * `:hover` and `:focus-visible` treatment (impossible with pure
 * inline styles). Icon inherits color from `currentColor` on the
 * button, so a Lucide icon rendered with no explicit `color` picks
 * up the button text color automatically. Rows with an existing SMS
 * thread render identically to rows without one — the click handler
 * still routes to the existing thread when `activeSmsThreadId` is
 * set, but the button itself is a plain neutral chip.
 */
function RowActionButton({
  icon,
  label,
  ariaLabel,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  ariaLabel?: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      className="egs-row-action"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      title={ariaLabel ?? label}
    >
      {icon}
      {label}
    </button>
  );
}

/** Small styled inline anchor — blue, underlined on hover only. */
function FooterLink({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        color: ENTRATA_BLUE,
        background: "transparent",
        border: "none",
        padding: 0,
        fontSize: "inherit",
        fontWeight: 600,
        cursor: "pointer",
        textDecoration: "none",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.textDecoration = "underline";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.textDecoration = "none";
      }}
    >
      {children}
    </button>
  );
}

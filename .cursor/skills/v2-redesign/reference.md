# V2 redesign — canonical snippets

Copy-paste building blocks for a Version Two redesign. **CLAUDE.md is the base
design contract**; everything here is the OXP Studio implementation layer on top
of it. Prefer the importable primitives in `@/components/v2` over hand-rolling —
re-declaring these strings per page is what makes surfaces drift.

If a primitive exists, import it. Only the *structural* patterns (page shell,
table grid, responsive toolbar) are copy-paste, because they wrap page-specific
state.

---

## 1. Importable primitives (use these first)

```tsx
import {
  // data-grid consts + hook
  FROZEN_COL_BG, FROZEN_COL_BG_HOVER, V2_SEGMENTED_ON, useStickyScroll,
  // controls
  V2SearchInput,        // My Tasks search field (leading icon + clear button)
  V2FilterPill,         // rounded-full filter-pill trigger (put in PopoverTrigger asChild)
  SingleSelectPill,     // single-select filter pill (Approval / Action / Date)
  V2SegmentedToggle,    // light-blue dual-view toggle (tree/table)
  V2SortHeader,         // sortable <th> for the grid
} from "@/components/v2";
```

Multi-select filters: `import { MultiCheckList } from "@/components/multi-check-list";`
Detail drawers: reuse an existing `components/*-v2.tsx` sheet (e.g.
`member-detail-sheet-v2`, `escalation-detail-sheet-v2`).

---

## 2. Page shell (secondary-nav rail + scroll region)

Register the route in `SECONDARY_RAIL_ROUTES` (`components/app-shell/app-shell.tsx`)
to go edge-to-edge. Because edge-to-edge drops `.page-content`-scoped CSS, re-add
header spacing explicitly (e.g. `mb-8`).

The rail `title` **is** the page heading — `pageBody` must NOT open with a visible
`<header className="page-header">` title block or a page-title icon bubble. Provide
the accessible name with an `sr-only` h1 instead (as Workforce/Escalations/SOPs do):

```tsx
<div className="px-4 py-5 sm:px-6 lg:px-8">
  <h1 className="sr-only">{activeTabLabel}</h1>
  {pageBody}
</div>
```

```tsx
<div className="flex min-h-0 flex-1">
  <SecondaryNav
    title="My Page"
    items={navItems}
    activeId={activeTab}
    onSelect={(id) => {
      setActiveTab(id as TabId);
      setOpenRecordId(null); // reset drill-in sub-state so it isn't hidden
    }}
  />
  <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hover scrollbar-gutter-stable">
    <div className="px-4 py-5 sm:px-6 lg:px-8">{pageBody}</div>
  </div>
</div>
```

---

## 3. Data-grid shell (frozen first column + sticky-scroll shadow)

The grid is structural (wraps page state), so copy this skeleton. `left-N` MUST
equal the rendered width of the column(s) to its left (checkbox `w-9` → name
`left-9`).

```tsx
const { scrollRef, stickyScrollProps } = useStickyScroll();

<div {...stickyScrollProps} className="overflow-x-auto scrollbar-hover">
  <table className="escalations-table table-borderless w-full min-w-[860px] table-fixed [&_tbody_td]:pr-6 [&_thead_th]:pr-6">
    <thead>
      <tr className="group/head">
        <th className={cn("sticky left-0 z-20 w-9 px-2 py-3", FROZEN_COL_BG)}>
          <input type="checkbox" /* select-all */ />
        </th>
        <V2SortHeader
          field="name" label="Name"
          sortField={sortField} sortDir={sortDir} onSort={toggleSort}
          className={cn("w-[26%]", "sticky-col sticky left-9 z-20", FROZEN_COL_BG)}
        />
        <V2SortHeader field="status" label="Status" sortField={sortField} sortDir={sortDir} onSort={toggleSort} className="w-[12%]" />
        {/* …more columns with percentage widths… */}
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <tr key={row.id} className="group table-row-hover" onClick={() => setOpenRecordId(row.id)}>
          <td className={cn("sticky left-0 z-10 w-9 px-2 py-3.5", FROZEN_COL_BG, FROZEN_COL_BG_HOVER)} onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" />
          </td>
          <td className={cn("sticky-col sticky left-9 z-10 px-4 py-3.5", FROZEN_COL_BG, FROZEN_COL_BG_HOVER)}>
            <div className="flex min-w-0 items-center gap-2">
              <span className="max-w-[18rem] truncate">{row.name}</span>
            </div>
          </td>
          {/* whitespace-nowrap data cells… */}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

Supporting CSS already exists in `app/globals.css`: `.sticky-col`,
`.table-borderless`, `.escalations-table`, `[data-sticky-scrolled]`,
`.scrollbar-hover`, `.table-row-hover`. Do not redefine them.

---

## 4. Responsive toolbar (filters collapse to a dialog)

```tsx
const FILTERS_INLINE_MIN_PX = 780;
const toolbarRef = useRef<HTMLDivElement>(null);
const [filtersInline, setFiltersInline] = useState(true);
useEffect(() => {
  const el = toolbarRef.current;
  if (!el || typeof ResizeObserver === "undefined") return;
  const ro = new ResizeObserver(([entry]) => {
    setFiltersInline(entry.contentRect.width >= FILTERS_INLINE_MIN_PX);
  });
  ro.observe(el);
  return () => ro.disconnect();
}, []);

<div ref={toolbarRef} className="mb-5 flex flex-wrap items-center gap-2">
  <V2SearchInput value={query} onChange={setQuery} placeholder="Search…" className="sm:w-56" />
  {filtersInline ? (
    <div className="flex flex-wrap items-center gap-2">
      <Popover modal>
        <PopoverTrigger asChild>
          <V2FilterPill icon={Building} label="Property" active={selected.size > 0} count={selected.size} />
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0 z-[200]" align="start" sideOffset={4}>
          <PropertySelector selected={selected} onSelectionChange={setSelected} className="h-[360px] border-0 shadow-none rounded-md" />
        </PopoverContent>
      </Popover>
      <SingleSelectPill label="Status" value={status} onChange={setStatus} options={statusOptions} />
    </div>
  ) : (
    <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setFiltersDialogOpen(true)}>
      <SlidersHorizontal className="h-4 w-4" /> Filters
      {activeFilterCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xxs font-semibold leading-none text-primary-foreground">
          {activeFilterCount}
        </span>
      )}
    </Button>
  )}
</div>
```

---

## 5. Status/approval chips → CLAUDE.md hue ladder (helper, not inline palettes)

```tsx
// approved = success (done) · pending = warning (waiting) · else neutral
function approvalChipClass(status?: ApprovalStatus): string {
  if (status === "approved") return "bg-status-success text-status-success-foreground";
  if (status === "review" || status === "needs_review") return "bg-status-warning text-status-warning-foreground";
  return "bg-muted text-muted-foreground";
}
// Display chips: tonal fill, NO border (border = interactive control). See CLAUDE.md.
```

---

## 6. Gating (route-scoped inline flag)

```tsx
const { isVersionTwo } = useVersionTwo();
const { isCodyAgentRoster } = useCodyAgentRoster();
const isV2 = (isVersionTwo || isCodyAgentRoster) && /* optional surface scope */ true;
// Branch styling on isV2; keep the legacy classes inline so Full/R1/R2 are byte-for-byte identical.
```

Full-page swap alternative (Command Center / Workforce): `page.tsx` returns
`isVersionTwo || isCodyAgentRoster ? <PageV2 /> : <PageLegacy />`.

---

## 7. Rich-text body (V2 authoring + prose rendering)

V2 authors long-form content in a Tiptap `RichTextEditor` and renders it as prose;
legacy keeps the plain `<textarea>`. A stored body may be HTML (authored) or plain
text (legacy/seed), so normalize both directions. The `isHtmlBody` / `bodyToHtml` /
`bodyToPlainText` helpers are page-local in `app/agent-knowledge-hub/page.tsx` —
copy them, or lift to a shared util once a second surface needs them.

```tsx
import { RichTextEditor } from "@/components/ui/rich-text-editor";

// — author: rich text (V2) / textarea (legacy), kept inline so legacy is byte-for-byte —
{v2 ? (
  <RichTextEditor
    content={bodyToHtml(body)}
    onChange={(html) => setBody(html === "<p></p>" ? "" : html)}
    placeholder="Plain language is fine — a sentence, bullets, or a full write-up."
    className="[&_.ProseMirror]:min-h-[260px] [&_.ProseMirror]:overflow-y-auto"
  />
) : (
  <textarea value={body} onChange={(e) => setBody(e.target.value)} /* … */ />
)}

// — render (V2): prose, with legacy whitespace-pre-wrap fallback —
{v2 ? (
  <div
    className="prose prose-sm max-w-none text-sm leading-relaxed text-foreground dark:prose-invert"
    dangerouslySetInnerHTML={{ __html: bodyToHtml(entry.body) }}
  />
) : (
  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{entry.body}</p>
)}

// — normalize: HTML ⇆ plain text (previews + the keyword classifier need flat text) —
isHtmlBody(s)          // true when s already carries authored markup (<p>, <ul>, …)
bodyToHtml(body)       // plain text → <p>…</p> (escaped); HTML passes through
bodyToPlainText(body)  // strip tags + decode entities → flat text
```

---

## Canonical files to read

| Pattern | File |
| --- | --- |
| Dashboard | `app/command-center/command-center-v2.tsx` |
| Queue / data table | `app/escalations/escalations-v2.tsx` |
| Tabs-of-lists + multiple tables | `app/trainings-sop/page.tsx` (SOPs & Knowledge) |
| Grouped card-list → grid + rich-text authoring | `app/agent-knowledge-hub/page.tsx` |
| Data-dense + tree + admin | `app/workforce/workforce-v2.tsx` |
| Detail / task flow | `app/playbooks/[id]/PlaybookDetailClient.tsx` |
| Shared primitives | `components/v2/` |

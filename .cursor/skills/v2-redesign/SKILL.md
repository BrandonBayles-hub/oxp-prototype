---
name: v2-redesign
description: >-
  Redesign an OXP page to match the Version Two demo aesthetic established in the
  Command Center, Playbooks, Workforce, and SOPs & Knowledge pages. Use when the
  user asks to redesign, restyle, or "v2"/"version two" a page, apply the new
  design language to another page, or rinse-and-repeat the redesign onto a new
  surface.
---

# Version Two redesign

Apply the established Version Two design language to a target page, gated so
Full/R1/R2 stay visually untouched.

> **CLAUDE.md is the base. This skill builds on top of it.**
> `CLAUDE.md` (repo root) is the design *contract* — Eli/ELI branding, type
> scale, icon scale, status hue ladder, chip-border rule, filter/selector
> patterns, color semantics. It governs every OXP surface. This skill is the
> **V2-specific layer** on top: it says how to *assemble* those rules into the
> Version Two look using the shared primitives in `@/components/v2`. If anything
> here ever seems to conflict with CLAUDE.md, **CLAUDE.md wins** — fix the skill.

## TL;DR (the 6 moves)
1. **Read `CLAUDE.md` first**, then this file and `reference.md` (copy-paste snippets).
2. **Match your page to an archetype** (table below) → that's your primary reference + gating pattern.
3. **Import primitives from `@/components/v2`** — never re-hand-roll the search input, filter pills, segmented toggle, table consts, or sort header.
4. **Promote in-page tabs → the `<SecondaryNav>` rail**; register the route in `SECONDARY_RAIL_ROUTES`.
5. **Rebuild every primary table** on the canonical grid (frozen column + sticky-scroll shadow + `table-fixed` + padded/nowrap cells).
6. **Verify**: `tsc` clean, the V2 flag off renders byte-for-byte legacy, the V2 flag on matches the reference page.

## Non-negotiables
1. **Follow `CLAUDE.md` to the letter.** Do not improvise styling; it is the base contract.
2. **Gate the redesign** (`useVersionTwo()` in `lib/version-two-context.tsx`, plus `useCodyAgentRoster()` where the codebase treats it as a V2 surface). The page MUST render unchanged when the flag is off.
3. **Visual/UX only** — do not change data fetching or business logic, and do not break Full/R1/R2.
4. **Reuse before you build** — import the `@/components/v2` primitives and existing `*-v2` components before creating anything new.

## Match your page to an archetype
Pick the row that fits your page; use that file as the primary reference and that
gating pattern. (Details on each in "Reference implementations".)

| Your page is… | Primary reference | Gating |
| --- | --- | --- |
| A dashboard / KPI + cards surface | `app/command-center/command-center-v2.tsx` | Full-page swap |
| A queue / single data table | `app/escalations/escalations-v2.tsx` | Full-page swap |
| **Tabs of lists** (several sub-surfaces, multiple tables) | `app/trainings-sop/page.tsx` (SOPs & Knowledge) | Inline route-scoped flag |
| **A grouped card-list / cascade surface** (no `<table>` yet — rows are rich multi-line cards grouped by a scope/level/cascade) | `app/agent-knowledge-hub/page.tsx` | Inline branch |
| Data-dense with a tree + admin sub-surface + detail drawer | `app/workforce/workforce-v2.tsx` | Full-page swap |
| A detail / record / task flow | `app/playbooks/[id]/PlaybookDetailClient.tsx` | Inline branch |

> **The grid is the V2 default even when the legacy page had no `<table>`.** A
> "grouped card-list" (rows rendered as cards, grouped by a cascade/scope band
> like Portfolio→Property) still becomes the canonical frozen-column grid — the
> grouping **collapses into a Scope column + a Scope lens** rather than
> staying a visual band. Knowledge Hub did exactly this: the Portfolio→Property
> `CascadeStrip` became a top-level **quick-filter chip row** ("All levels /
> Portfolio / Property", each with a count) plus a Scope column. Promote the
> scope/level/cascade lens to the **Playbooks "My Tasks" quick-filter chip row,
> pinned at the very top** — standalone `h-10 rounded-xl border px-3.5` chips
> (`<span font-medium>label</span> <span font-semibold tabular-nums>count</span>`),
> the selected one taking `border-border bg-background text-foreground shadow-sm`
> and the rest `border-transparent text-muted-foreground hover:bg-muted` (NOT a
> connected segmented control with an outer border + `V2_SEGMENTED_ON` segments —
> that read as a view-mode toggle; the canonical scope row is the My Tasks stat
> chips). Then let the rest of the toolbar (CTA, search, property + filter pills)
> sit just above the table. A primary lens that reframes the whole list (the
> cascade scope) is the quick-filter chip row, not an inline filter pill;
> ordinary attribute filters (Type/Agent/Status) stay pills. Keep a genuinely
> *triage/inbox* sub-surface
> (e.g. Knowledge Gaps) as cards — restyle it to V2 (hue-ladder chips, neutral
> display chips) but don't force a frozen-column grid onto a card-based triage
> flow. Rule of thumb: **a sortable list of records → grid; an actionable
> triage queue of distinct cards → cards.**

## Before you start (intake)
Gather these before writing code — discovering them mid-redesign causes rework:
- [ ] Which archetype + primary reference (table above)?
- [ ] What in-page tabs exist → which become rail items, which get pruned?
- [ ] How many **data tables** are on the page? (Every primary one must be rebuilt.)
- [ ] Any **permission gates** (admin-only surfaces)? Which `p-*` permission?
- [ ] Which `@/components/v2` primitives + existing `*-v2` components can you reuse?
- [ ] Does one component serve **multiple routes** (→ use a route-scoped inline flag, like SOPs)?

## Use the shared primitives (this is the consistency mechanism)
The single biggest cause of drift is re-deriving class strings per page. Import
the canonical implementation instead. See `reference.md` for copy-paste shells.

```tsx
import {
  FROZEN_COL_BG, FROZEN_COL_BG_HOVER, V2_SEGMENTED_ON, useStickyScroll,
  V2SearchInput, V2FilterPill, SingleSelectPill, V2SegmentedToggle, V2SortHeader,
} from "@/components/v2";
import { MultiCheckList } from "@/components/multi-check-list"; // multi-select filters
```

- **`V2SearchInput`** — the My Tasks search field (leading icon + clear button). Never the shadcn `<Input>`.
- **`V2FilterPill`** — the rounded-full filter-pill trigger; put it inside `<PopoverTrigger asChild>`.
- **`SingleSelectPill`** — single-select filter pill (Approval / Action / Date).
- **`MultiCheckList`** — multi-select filters.
- **`V2SegmentedToggle`** — light-blue dual-view toggle (tree/table).
- **`V2SortHeader`** — sortable `<th>` for the grid.
- **`FROZEN_COL_BG` / `FROZEN_COL_BG_HOVER` / `useStickyScroll`** — the frozen-column grid plumbing.

> When you establish a genuinely new canonical pattern, **extract a primitive into
> `@/components/v2` and update this skill** — don't leave the next author to copy
> your page by hand. That's how this skill stays a source of truth instead of rotting.

## Reference implementations (study before coding)
Match them, don't approximate.

- **Command Center**: `app/command-center/command-center-v2.tsx` — page-level swap; `page.tsx` branches the flag → `*-v2` vs `*-legacy`.
- **My Tasks / Playbooks queue**: `app/escalations/escalations-v2.tsx` — the canonical toolbar + data grid + collapsing Filters dialog. Consumes `V2SearchInput` / `V2SortHeader` / `FROZEN_COL_BG`.
- **Playbooks** (My Tasks / Playbook / Settings): `app/playbooks/[id]/PlaybookDetailClient.tsx` — inline flag branch.
- **Workforce**: `app/workforce/workforce-v2.tsx` — the most complete data-dense reference.
  · Tabs → `<SecondaryNav title="Workforce">` rail. · Tree view + flat table toggled by a `V2SegmentedToggle`. · Shared Staff Profile drawer `components/member-detail-sheet-v2.tsx`. · Roles & Access admin sub-surface gated behind `p-wf-roles`. · Legacy kept identical via opt-in props (`avatarV2`, `chipStyle`).
- **Agent Knowledge Hub**: `app/agent-knowledge-hub/page.tsx` — the **grouped card-list / cascade → grid** reference.
  · **Single-route inline gating**: `const isV2 = isVersionTwo || isCodyAgentRoster` (no surface scope — there's only one route). The whole render forks: `isV2 ? <KnowledgeHubV2 …/> : <legacy …/>`, with the shared `AddKnowledgeDialog` + `EntryDetailSheet` rendered once in a fragment so both branches reuse them (and `EntryDetailSheet` takes a `v2` prop). · Tabs (Knowledge / Knowledge Gaps) → `<SecondaryNav title="Agent Knowledge Hub">`; `/agent-knowledge-hub` registered in `SECONDARY_RAIL_ROUTES`; rail count badge is the neutral `bg-foreground` one (not the legacy red). · **Scope is a top-level quick-filter chip row**, not a toolbar pill: the Portfolio→Property `CascadeStrip` **collapsed into the Playbooks "My Tasks" stat-chip row pinned at the very top** ("All levels / Portfolio / Property", each `h-10 rounded-xl border px-3.5` chip with a `font-medium` label + `font-semibold tabular-nums` count, selected = `border-border bg-background shadow-sm`, rest = `border-transparent hover:bg-muted`) + a Scope column on the grid. It's the primary lens that reframes the whole list, copied verbatim from escalations-v2's My Tasks chips — **not** a connected segmented control with `V2_SEGMENTED_ON` segments (that reads as a view-mode toggle). · **Toolbar** (the *rest* of it) is one left-aligned group that **hugs the table** (`mb-3` above the grid, scope segment sitting a `space-y-5` above it): `Add knowledge` primary CTA (leftmost) → `V2SearchInput` → property pill → Type/Agent/Status `SingleSelectPill`s → `Clear` (no `ml-auto` CTA/property cluster on the right; Scope is *not* here — it's the segment up top). · The grid's Title column is frozen at `left-0` (no checkbox column, so the name column is the frozen one). · Pending review → an **"Awaiting Review" queue card** mirroring SOPs & Knowledge (`Card` + count badge + scrollable list of clickable rows that open the entry's detail/Approve flow) — **not** a status-warning banner that toggles a filter. Same review loop, same anatomy as the SOPs library's `Awaiting Review` card. · Knowledge Gaps stays a **triage card list** (not a grid), but the V2 `GapCard` is **fully forked** behind the `v2` prop (legacy byte-for-byte) into a clear hierarchy instead of a stack of equally-loud colored panels — this is the canonical **triage-card** pattern: **(1)** the `GapsTab` intro is a real **`section-title` (h2) + precise one-sentence description** lead-in (no icon bubble), **not** a dashed `AlertTriangle` callout box — this is the SHOULD section-header pattern, **not** the forbidden duplicate `page-header` title block, so a short framing header is fine on a rail surface; tighten the copy until it's precise, action-oriented, and short ("Questions the AI escalated, ranked by impact. Approve a staff answer as canonical knowledge and the AI handles it next time." — lead with what the list is, then the payoff of acting); **(2)** the gap **question is the hero/subject line** (`text-base font-semibold`, on the plain card surface, no nested box), led by a `SectionIconBubble` (`HelpCircle`); **(3)** the triage meta is its **own full-width row beneath the question**, not a top-right cluster: the icon bubble + question sit on one `flex items-center gap-3` row (so the hero keeps full width and is vertically centered against the bubble), then the meta wraps onto a second `flex flex-wrap items-center` row that starts flush under the bubble and wraps its *own* chips — ordered **impact pill → `AgentChip` → scope chip → `last seen`** (impact leads because severity is the primary triage signal). The impact pill is the **single hue-ladder pill that merges severity + escalation volume** (`v2ImpactChipClass`, the count is the evidence behind the severity so don't split it into two chips) and in V2 carries a leading severity glyph (`SignalHigh`/`SignalMedium`/`SignalLow`, via an `icon` field on `IMPACT_META`, `v2`-gated) so it isn't color-only; the `AgentChip` takes a `rounded-full` `className` override here to match the pill family while the shared chip stays `rounded-md` (Workforce parity). The **scope chip** (`GapScopeChip`) names the gap's scope as a **single chip** — `Building2` + "Portfolio-wide" when `portfolioWide`, else `MapPin` + a single property name or "N properties" with the full list in a tooltip — driven by `KnowledgeGap.portfolioWide` + `sourceProperties` (this same scope prefills the draft, below). **Scope is exclusive, not additive:** a gap resolves to *one* level because the draft/upload form offers exactly two options (property OR portfolio), so don't render both a portfolio and a property chip (we tried it and it read as chip soup in the already-dense meta row — match the form's mutually-exclusive model). **Early mistake to avoid:** pinning the meta as a `shrink-0` top-right cluster made it steal width and force the question to wrap prematurely — give the meta its own row instead; **(4)** the staff answer is **neutral evidence** (`bg-muted/40`, leading `Users` icon + `text-[11px] uppercase` label), **NOT** a green `status-success` fill — decorative use of a status hue is wrong (success = completed outcomes only, CLAUDE.md), and an *open* gap rendered in "resolved green" out-shouted the question; **(5)** a contradiction is **folded into that same evidence section**, divided by a `border-t pt-3` (not a separate panel), with a black `text-foreground` label and an amber `AlertTriangle` whose icon alone carries the warning — no full `status-warning` fill competing with the question; **(6)** drafting-time detail (suggested type/category) is **dropped from the triage card** (it belongs in the draft flow, not the scan view); the footer is right-aligned actions with one black primary CTA (`Draft Canonical Answer`, title case) whose **leading icon is the bare ELI cube** (`/eli-cube.svg`), because the action hands the draft to ELI — not a generic `Wand2`/`Sparkles`; **(7)** the card list uses **`space-y-5`** in V2 (legacy stays `space-y-3`) so one card's top-right meta pills don't crowd the previous card's action buttons — the extra gap reads as deliberate per-card grouping. **Lesson — a triage card needs one focal point:** hero the subject, demote supporting evidence to neutral surfaces, and reserve a single restrained warning treatment for genuine exceptions (folded into the relevant section) instead of stacking saturated `status-*` panels that flatten the hierarchy. · **Knowledge Gaps gets a header-level impact filter** (`GapImpactSegmented`, All/High/Medium/Low + per-bucket counts) — and it is the **My Tasks stat-chip row, NOT a segmented control**: standalone `h-10 rounded-xl border px-3.5` chips (`font-medium` label + `font-semibold tabular-nums` count), selected = `border-border bg-background text-foreground shadow-sm`, rest = `border-transparent text-muted-foreground hover:bg-muted`. (We first shipped it as a connected `V2_SEGMENTED_ON` segmented control; that reads as a *view-mode* toggle, so it was refactored to the stat-chip family to match the Scope row and the Knowledge tab's filter — same lesson as the Scope lens.) · **A dismissable explainer banner uses the canonical Workforce info-banner**, not an ad-hoc tinted box: the `Info` icon in a rounded tile + a bold title line + a `text-muted-foreground` subtitle + an `XIcon` dismiss, matching `workforce-v2`'s banner exactly (we kept re-inventing this style — match the Workforce banner). It's session-only (`useState(true)`, resurfaces on reload, not persisted) and sits **below** the `section-title` header/description and **above** the impact filter. · **Drafting from a gap carries the gap's provenance into the modal** (`v2`-gated in `draftFromGap`): a `portfolioWide` gap prefills `scope: "portfolio"`; a single-`sourceProperties` gap prefills `scope: "property"` + that property; a multi-property gap stays property-scoped but leaves the property choice to the user (the form targets one property at a time). Legacy prefill is byte-for-byte unchanged (the scope/property keys are only spread when `isV2`). · Detail drawer: `EntryDetailSheet` swaps its centered `max-w-6xl` `Dialog` for a right-side `Sheet sm:max-w-xl` when `v2`, and adopts the **canonical Task-drawer three-region shell** (escalation-detail-sheet-v2 / SOPs): `SheetContent` is `flex flex-col overflow-hidden p-0` and the body forks on `v2` into a `shrink-0` sticky header (`px-6 pt-6 pb-5`) + a `flex-1 overflow-y-auto px-6 py-5 scrollbar-hover` body + a `shrink-0 border-t px-6 py-4` footer — so the title/meta header stays pinned and only the middle scrolls (legacy stays the whole-surface-scroll `p-5` shell, byte-for-byte). The in-review "Pending your review" callout drops its own Approve button in `v2` (the sticky footer holds the single primary CTA, matching My Tasks). `DialogTitle`/`DialogDescription` work inside `SheetContent` because both are the same `@radix-ui/react-dialog` primitive. · Colored "approve" buttons (`bg-emerald-600`) revert to the **default black primary** in V2 (CLAUDE.md: OXP primaries stay black/white). · Chip helpers `v2StatusChipClass` / `v2ImpactChipClass` live in the page; legacy ring palettes (`STATUS_META.cls`, etc.) stay inline behind the flag so Full/R1/R2 are byte-for-byte identical. · **Long-form content is rich text in V2**: the body `<textarea>` becomes a `RichTextEditor` (Tiptap) and the stored body can be HTML (newly authored) or plain text (legacy/seed), so the page-local helpers `isHtmlBody` / `bodyToHtml` / `bodyToPlainText` normalize both — render any body as `prose prose-sm max-w-none … dark:prose-invert` via `dangerouslySetInnerHTML`, and flatten with `bodyToPlainText` before previews + the keyword classifier; legacy keeps the plain `<textarea>` inline behind `!v2` (see `reference.md` §7). · **The Add/Edit entry modal is a centered `Dialog` with the canonical three-region shell** (`flex max-h-[88vh] … flex-col gap-0 overflow-hidden p-0` → `shrink-0 border-b` header / `flex-1 overflow-y-auto … scrollbar-hover` body / `shrink-0 border-t` footer) — deliberately a modal, NOT a side `Sheet`, so authoring reads as a distinct mode from the Sheet-based viewing flow; legacy keeps its scroll-the-whole-surface Dialog byte-for-byte. In V2 the modal body groups its fields into **gray section cards** (`rounded-lg border border-border bg-muted/40 p-3` with a `text-sm` label; inputs stay `bg-background` so they read as white wells inside the gray) — and **Title + Knowledge + Category share a *single* card** because they're one content unit (the early version gave each its own box, which over-fragmented the form), with the type-specific (`suppression`/`procedure`) boxes sitting *after* that combined section. Every gray-box style + the `text-sm` label sizing is `v2`-gated so legacy's `space-y-1` ungrouped fields stay byte-for-byte. · **The drawer leads with the short meta sections**: V2 hoists Level + inheritance, Used by agents, and Applies to *above* the (often long) Knowledge body, while `!v2` keeps the original order — scannable meta first, long-form content pushed down. · `Section` gains a `v2` variant — the legacy `text-[11px] uppercase` header becomes a `SectionIconBubble` + `text-sm font-semibold` heading; on this drawer's white section surface the bubble is `bg-muted` (not the `bg-background` `member-detail-sheet-v2` uses), and a `cube` prop swaps the Lucide glyph for the ELI cube on the AI-agent section. · **AI-generation affordances carry the ELI cube + warm treatment** — "Generate from document" uses `/eli-cube.svg` (brand mark, CLAUDE.md #1) on a `border-eli-purple/30 bg-eli-warm-bg` card, not a generic `Sparkles`; likewise **any CTA that invokes ELI** (e.g. Knowledge Gaps' `Draft Canonical Answer`) leads with the bare ELI cube rather than a `Wand2`/`Sparkles`. · **The "Conversations behind this gap" modal stays a centered `Dialog`, not a Sheet** — even though it's a viewing flow — because its drill-in reuses the wide shared `ConversationDetailView` (transcript + trace) that needs the `max-w-6xl` width; the *list-vs-detail two-level modal with a wide drill-in* is the carve-out from the "viewing → Sheet" default (same reasoning that keeps the wide authoring modal a Dialog). In V2 (`v2`-gated, legacy byte-for-byte) it adopts the canonical modal header (no leading title icon, `text-lg` title + muted description + explicit `XIcon` close), drops the gap question below as **neutral evidence** (`bg-muted/40`), and rebuilds the conversation rows on tokens (`border-border bg-background hover:border-foreground/30 hover:shadow-sm`, no `bg-white`/`hover:border-zinc-400`) with `Pill` chips on the hue ladder — `v2OutcomeChipClass` (resolved → success, escalated → warning, pending → muted) + `v2SentimentChipClass` (**only** `negative` → `status-error`; positive/neutral stay muted so we don't decoratively burn the success hue on "positive") + a neutral `bg-muted` channel chip — and `text-xxs` meta (not `text-[10px]`). The shared `ConversationDetailView` drill-in renders identically in both branches.
- **SOPs & Knowledge**: `app/trainings-sop/page.tsx` (renders at `/sops-knowledge` via `forcedTab="sops"`) — the **tabs-of-lists** reference.
  · **Route-scoped inline gating**: `const isV2Sops = (isVersionTwo || isCodyAgentRoster) && forcedTab === "sops"`, branched at every call site with legacy styling inline. · Document library / Compliance / Activity tabs → `<SecondaryNav title="SOPs & Knowledge">`; `/sops-knowledge` registered in `SECONDARY_RAIL_ROUTES`; the rail's `onSelect` **resets drill-in sub-state** (`setCurrentFolderId(null)`). · **Two** primary tables (Document library + Activity) both on the canonical grid, each with independent filters. · **Compliance** is a lighter surface of per-area `Card`s with simple embedded tables. · Filter pills via `SingleSelectPill` (Approval/Action/Date). · Folder/detail headers use a **breadcrumb-as-title** (trailing crumb doubles as inline rename). · **Drag-and-drop upload** over the list area.

## V2 UI conventions
Tagged `[MUST]` (load-bearing — skipping reads as not-V2), `[SHOULD]` (strong
default), `[OPTIONAL]` (enhancement). All of these sit on top of CLAUDE.md.

- **[MUST] Tabs become the secondary-nav rail.** In-page tabs are the #1 thing to fix: cramped tabs hide the page's surfaces. Promote them to `<SecondaryNav>` (`components/app-shell/secondary-nav.tsx`); add the route to `SECONDARY_RAIL_ROUTES` (`components/app-shell/app-shell.tsx`) for the edge-to-edge layout. Use the page shell in `reference.md` §2.
  · **Prune and gate while promoting** — cut dead tabs; hide privileged ones via permissions (Workforce drops Compliance and gates Roles & Access behind `p-wf-roles`). Guard the active-tab state so a now-hidden surface can't stay selected.
  · **Reset drill-in sub-state on select** — clear an open folder/record in `onSelect` (SOPs: `setCurrentFolderId(null)`).
  · **The rail is for sibling surfaces, not view modes** — same-data-different-view stays a toolbar toggle.
- **[MUST] Secondary-nav items are text-only.** No leading icons; trailing `count` badge only when meaningful.
- **[MUST] Data tables match the canonical grid.** A legacy `<table>` (wrapping cells, no frozen column, auto widths) reads as pre-V2 even after everything else is restyled — this is the gap most redesigns miss. Use `useStickyScroll` + `FROZEN_COL_BG` + `V2SortHeader` and the shell in `reference.md` §3:
  · Horizontal-scroll wrapper with the sticky-scroll shadow; freeze the checkbox + first data column (`left-N` MUST equal the left column widths).
  · `table-borderless w-full min-w-[NNNpx] table-fixed` with **percentage** column widths; add `escalations-table` for header padding.
  · Padded cells (`[&_tbody_td]:pr-6 [&_thead_th]:pr-6` or per-cell `px-`), **no wrapping** (`whitespace-nowrap`; cap the frozen name column with `max-w-[…]` + `truncate`).
  · Rows are `group table-row-hover` and open the record in a `<Sheet>` (inner controls `stopPropagation`); status cells use the hue-ladder + chip-border rule; member cells use the shared `Avatar`/`AvatarFallback` (never an ad-hoc gray div).
  · **Rebuild EVERY primary table on the surface, not just one** (SOPs did both Document library + Activity). A light embedded `table-borderless` in a `Card` is fine for short, read-only secondary lists (e.g. Compliance) — those don't need the frozen column.
- **[MUST] Filters/search use the V2 primitives.** `V2SearchInput`, `V2FilterPill` (or `MultiCheckList` / `SingleSelectPill`). Never the shadcn `<Input>`, square `Button variant="outline"` dropdowns, the legacy `FilterDropdown`, or a native `<select>` on a V2 surface. Selected pill state: the filter **name stays visible**, a `bg-primary` count badge appears once >1 is selected, the border tints `border-primary/40` — never "N selected", never a filled selected state (that's the toggle family).
- **[MUST] Primary CTA matches the canonical V2 button exactly: `<Button size="sm" className="h-9 shrink-0 gap-1.5">` with a bare leading icon (`<Plus className="h-4 w-4" />`).** Override the base `gap-2` to `gap-1.5` and **do not** add a `mr-*` margin on the icon — the icon margin stacks on top of the flex `gap` and throws the icon/label spacing off (the bug Knowledge Hub originally shipped). `size="sm"` (→ `text-xs`) is correct for toolbar CTAs; don't bump it to the default `text-sm`. Canonical reference: escalations-v2's `Add` button.
- **[MUST] Toolbar order is a single left-aligned group: primary CTA → search → property pill → filter pills.** Don't pin the CTA (or the property selector) to the right with `ml-auto` — the primary action goes **leftmost**, then `V2SearchInput`, then the property filter, then the remaining filter pills, then a trailing `Clear` link (escalations-v2 / SOPs library / Knowledge Hub all do this). `ml-auto` on the toolbar is reserved for a *view-scope* control (e.g. the "Only my tasks" switch), not the CTA. **The property is a filter pill, not a wide dropdown:** render it in the `V2FilterPill` family (rounded-full, `h-7`, `Building` icon, `border-input`) — either the standard `@/components/property-selector` panel inside a `Popover`/`V2FilterPill` (escalations/SOPs), or, if the page is bound to the `@/components/property-filter` data set, the folder `PropertySelector` with its trigger restyled into the pill family via `triggerWidthClassName` (Knowledge Hub — done this way because its property names only exist in `voice-properties`, not `property-selector-data`). Never leave the property as a wide `w-[220px]` `Button variant="outline"` box bolted to the CTA. **Default the property filter to "all properties" (nothing pre-selected), not a single hard-coded property** — a filter that boots already narrowed to one property reads as broken. If the page's `property` state is a single concrete value shared with the legacy branch, introduce an `ALL_PROPERTIES` sentinel, default to it **only in V2** (`useState(isV2 ? ALL_PROPERTIES : DEFAULT_PROPERTY)` so legacy stays byte-for-byte), have the shared filter/count logic treat the sentinel as "match every property", pass `selectedPropertyIds={property === ALL_PROPERTIES ? [] : [property]}` to the selector (empty → its "Select Properties" resting state), and coerce the sentinel back to a concrete property anywhere it's written or displayed (new-entry `property`, "within {property}" copy, gap logs). Knowledge Hub does exactly this.
- **[MUST] Member avatars use the shared `Avatar`/`AvatarFallback`** with initials fallback; ELI agents use the black-circle ELI avatar (CLAUDE.md rule #1). `member-detail-sheet-v2.tsx` has the canonical `MemberAvatar` helper.
- **[MUST] State/scope chips follow CLAUDE.md.** Map state chips to the status hue ladder via a small helper (see `reference.md` §5), not inline palettes; demote decorative category/scope chips to neutral `bg-muted` display chips (tonal fill, no border). Keep the legacy palette inline behind the flag.
- **[MUST] Use icons sparingly — never repeat an icon already shown elsewhere in the same row.** The row's leading **icon bubble** (in the frozen name column) is the row's one decorative icon; the per-attribute chips it feeds (Type, Category, …) are then **text-only** pills/labels, not icon+text. Knowledge Hub carried the type icon in both the bubble *and* the Type pill, plus a Category icon — redundant and noisy; the fix was to strip the icons from the Type/Category cells (and drop the now-unused `Icon` consts). Reserve inline icons for things the text can't convey (sort arrows, status semantics, brand/AI marks). Bonus: those repeated chip icons were the banned 12px tier (`h-3 w-3`) anyway — see the icon-scale rule. **The "no repeat" rule is per-row, not global:** a *selection menu* for that same attribute (e.g. the Type `SingleSelectPill` dropdown) SHOULD carry the matching icon next to each option, because the menu is a recognition context with no bubble of its own and the icon ties the choice back to the row bubble. `SingleSelectPill` options take an optional `icon?: LucideIcon` — when any option supplies one, it reserves an aligned icon column (an "All …" option gets a spacer); pass the same `TYPE_META[...].icon` the row bubble uses.
- **[MUST] Admin-only surfaces gate on permissions**, not hardcoded roles (`usePermissions().hasPermission("p-…")`). Guard against a now-hidden tab staying active.
- **[MUST] Keep legacy byte-for-byte identical** via opt-in props (default off) or inline-flag branches. Never edit the legacy branch. For shared presentational components, add a prop like `avatarV2 = false` / `chipStyle = false` and only pass it from the V2 path.
- **[SHOULD] Dual views (tree/table) use `V2SegmentedToggle`** in the toolbar (light-blue on-state `V2_SEGMENTED_ON`), NOT rail items.
- **[SHOULD] A primary "scope/lens" that reframes the whole list is the My Tasks quick-filter chip row, not a toolbar pill (and not a segmented toggle).** When a collapsed cascade or level selector (e.g. Portfolio→Property, "All/Mine") is the dominant way users re-cut the list, pin it as the escalations-v2 / Playbooks "My Tasks" stat-chip row **above** the toolbar, then let the rest of the toolbar hug the table (`mb-3` over the grid). Copy the chips verbatim: `inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-sm`, selected = `border-border bg-background text-foreground shadow-sm`, rest = `border-transparent text-muted-foreground hover:bg-muted hover:text-foreground`, with a `font-medium` label + `font-semibold tabular-nums text-foreground` count. Don't use a connected segmented control / `V2_SEGMENTED_ON` here — that's the dual-**view** family (tree/table). Ordinary attribute filters (Type/Agent/Status) stay `SingleSelectPill`s in the toolbar. Reference: Knowledge Hub's Scope row + escalations-v2's My Tasks chips.
- **[SHOULD] Page layout — own your scroll region + re-add `.page-content` spacing.** Edge-to-edge surfaces render outside `.page-content`, so CSS scoped to it (e.g. `.page-header` margin) no longer applies; re-add it (SOPs: `cn("page-header", isV2Sops && "mb-8")`). Use the shell in `reference.md` §2.
- **[MUST] The page title comes from the rail — do NOT add a second visible page header.** On every rail-based archetype (tabs-of-lists, queue, data-dense), the `<SecondaryNav title="…">` rail *is* the page heading; the in-content top-level `<h1>` is `sr-only` (Workforce, Escalations, and SOPs all do exactly this). Do **not** render a visible `<header className="page-header">` title+description block on the page body, and do **not** put an icon bubble on the page title. A visible second header (and especially a title icon bubble) reads as not-V2. *Exception:* a full-page-swap archetype with **no rail** (Command Center) keeps a visible `<PageHeader title>` — still **no icon bubble**.
- **[SHOULD] Typography & section headers.** Named type scale only (`text-xxs`/`text-xs`/…, never `text-[Npx]`). Section headers: `section-title` + `mb-1` + `text-sm text-muted-foreground` description + `mb-6`. Keep headers aligned across sub-surfaces.
- **[SHOULD] Detail/record/profile drawers use the canonical right-side `<Sheet>` three-region shell** shared by the Task drawer (`components/escalation-detail-sheet-v2.tsx`), the SOPs document drawer, and the Staff Profile (`components/member-detail-sheet-v2.tsx`): `SheetContent` is `flex flex-col overflow-hidden p-0`, then **(1) a `shrink-0` pinned header** (`px-6 pt-6`) with the title + identity/status controls (never let the title scroll away), **(2) a `flex-1 overflow-y-auto px-6 py-… scrollbar-hover` body** (sections / `bg-muted/40 shadow-none` `Card`s led by a `SectionIconBubble` + `text-sm font-semibold` heading), and **(3) a `shrink-0 border-t px-6 py-4` footer** holding the single primary CTA (Approve, Save, …). Don't scroll the whole surface with a `sticky bottom-0` footer, and don't duplicate the primary action (e.g. an in-body "Approve" callout *and* a footer Approve) — the callout goes info-only and the footer owns the CTA. `px-6` padding, `sm:max-w-xl`/`sm:max-w-md`. ELI provenance via the warm treatment; edits gated on permissions. Reuse an existing `*-v2` sheet before building one; `DialogTitle`/`DialogDescription` work inside `SheetContent` (same `@radix-ui/react-dialog` primitive), so a shared Dialog-based detail can flip to a Sheet via a `v2` prop while legacy keeps its centered dialog byte-for-byte. **Editing / creation, by contrast, stays a centered `Dialog`** — the same three-region anatomy (`flex max-h-[88vh] … flex-col gap-0 overflow-hidden p-0` → pinned `shrink-0 border-b` header / `flex-1 overflow-y-auto … scrollbar-hover` body / pinned `shrink-0 border-t` footer) but as a modal, so authoring reads as a distinct mode from the side-sheet viewing flow (Knowledge Hub's `AddKnowledgeDialog`). **Lead a long drawer with its short scannable meta sections, not the long-form body** — V2 hoists the small inheritance/agents/applies-to sections above the body while legacy keeps original order.
- **[SHOULD] Long-form / authored content is rich text in V2.** Where legacy used a plain `<textarea>`, V2 authors in a `RichTextEditor` (Tiptap, `@/components/ui/rich-text-editor`) and renders stored bodies as `prose prose-sm max-w-none … dark:prose-invert` via `dangerouslySetInnerHTML`. A stored body may be HTML (newly authored) or plain text (legacy/seed), so normalize both ways — `isHtmlBody` / `bodyToHtml` (→ HTML for prose) and `bodyToPlainText` (→ flat text for previews + any keyword classifier) — and keep the plain `<textarea>` inline behind `!v2` so Full/R1/R2 stay byte-for-byte. Reference: Knowledge Hub's `AddKnowledgeDialog` + `EntryDetail` (`reference.md` §7).
- **[SHOULD] Review / approval queues use the "Awaiting Review" card pattern.** Any surface with a "pending review / needs approval" state (SOPs documents, Knowledge Hub entries, …) surfaces it as a **queue `Card`** — `CardHeader` title ("Awaiting Review") + a `bg-primary` count badge, then a scrollable `ul` of clickable rows (icon tile + name + status chip on the hue ladder + a meta line), each row opening that record's detail where **Approve** lives. Reuse the SOPs & Knowledge anatomy (`app/trainings-sop/page.tsx`, the `pendingReviewDocs` card). Do **not** reduce a review queue to a status-warning banner that just toggles a filter — the queue is actionable, item-by-item, and closes the review loop in the detail drawer.
- **[SHOULD] Explainer / info banners match the canonical Workforce banner — don't re-invent one.** Any dismissable "here's how to read this surface" banner (e.g. Knowledge Gaps' Portfolio-vs-Property note) uses the `workforce-v2` info-banner anatomy: an `Info` glyph in a rounded tile + a **bold title line** + a `text-muted-foreground` subtitle + a trailing `XIcon` dismiss, on the same tinted-info surface. Make it session-only (`useState(true)`, resurfaces on reload) unless persistence is asked for, and place it **below** the section header/description (so it explains, not replaces, the heading). This is a recurring drift point — copy the Workforce banner instead of hand-rolling a tinted box.
- **[SHOULD] One primary CTA per surface.** A single `variant="default"` per header; demote a standing action to `variant="outline"` when a context primary appears (SOPs flips "Create Playbook" to outline when "Submit for Approval" shows). Use the matching nav glyph for cross-surface actions (`Split` for "Create Playbook").
- **[SHOULD] Breadcrumb-as-title for drill-in headers.** This is the **only** place the `font-heading text-2xl` + leading icon bubble (`h-9 w-9 rounded-lg border border-border bg-background` + 14/16px glyph) treatment belongs — a drill-in record/folder header (e.g. an opened SOPs folder), never the top-level page title. `Root › [folder ›] item`; root/folder crumbs are `text-primary hover:underline` links; the trailing crumb is the bold current page and doubles as the inline rename control (gated on `canEdit`). Edge-to-edge surfaces drop `.page-content` spacing, so this drill-in header needs explicit spacing (`cn("page-header", isV2 && "mb-8")`).
- **[OPTIONAL] Drag-and-drop upload.** Overlay on the V2 branch only: `relative` wrapper + `onDragEnter/Over/Leave/Drop` gated on the flag + `dragHasFiles(e)`, a `dragDepthRef` counter to avoid flicker, and a `pointer-events-none absolute inset-0` overlay (`border-2 border-dashed border-primary/60 bg-background/80 backdrop-blur-sm`). On drop, open the existing Add modal pre-filled — don't bypass the confirm step.

## Anti-patterns (do / don't)
- ❌ A legacy `<table>` left un-migrated next to a V2 one → ✅ rebuild **every** primary table on the grid.
- ❌ A native `<select>` or square `Button variant="outline"` dropdown for filters → ✅ `V2FilterPill` / `SingleSelectPill` / `MultiCheckList`.
- ❌ Re-declaring `FROZEN_COL_BG` / the pill class / the search input per file → ✅ import from `@/components/v2`.
- ❌ Relabeling a filter pill to "N selected" or giving it a filled selected state → ✅ name stays visible + count badge + `border-primary/40`.
- ❌ Leading icons on secondary-nav items → ✅ text-only (+ trailing count).
- ❌ A visible `page-header` title+description block, or an icon bubble on the page title, on a rail page → ✅ the rail `title` is the heading; the in-content `<h1>` is `sr-only`; the icon bubble is for drill-in breadcrumb-titles only.
- ❌ View-mode toggle (tree/table) promoted to a rail item → ✅ toolbar `V2SegmentedToggle`.
- ❌ Ad-hoc gray `bg-gray-300` initials `<div>` → ✅ shared `Avatar`/`AvatarFallback`.
- ❌ Two competing `variant="default"` buttons in a header → ✅ one primary; demote the rest.
- ❌ Arbitrary `text-[Npx]` / raw palette state colors (`red-100`, `amber-800`) → ✅ named type scale + `status-*` tokens (CLAUDE.md).
- ❌ Editing the legacy branch to "share" code → ✅ opt-in prop (default off) / inline flag branch.

## Phased workflow
```
Phase 0 — Context
- [ ] Read CLAUDE.md, this SKILL.md, reference.md, and your archetype's reference file
- [ ] Complete the intake checklist

Phase 1 — Structure
- [ ] Pick gating (full-page swap vs route-scoped inline flag)
- [ ] Promote tabs → <SecondaryNav> (text-only); register route in SECONDARY_RAIL_ROUTES
- [ ] Prune dead tabs; gate admin tabs by permission; reset active tab + drill-in state when hidden
- [ ] Page shell: rail + scroll region; re-add dropped .page-content spacing

Phase 2 — Content
- [ ] Rebuild EVERY primary table on the grid (useStickyScroll + FROZEN_COL_BG + V2SortHeader)
- [ ] Toolbar: V2SearchInput + V2FilterPill/SingleSelectPill/MultiCheckList; collapse to Filters dialog
- [ ] Keep tree/table as a V2SegmentedToggle (not a rail item)
- [ ] Row → record drawer: reuse a *-v2 Sheet (Staff Profile anatomy)

Phase 3 — Polish
- [ ] Status/scope chips via the hue-ladder helper + chip-border rule (legacy palette inline)
- [ ] Shared Avatar/ELI avatar; typography + section/breadcrumb headers; one primary CTA
- [ ] Optional: drag-drop upload

Phase 4 — Verify (see Definition of Done)
```

## Definition of Done & how to verify
- [ ] **Types clean:** `npx tsc --noEmit` (fast; catches JSX/type breaks). Lint: `npm run lint` (note: the repo currently hits an ESLint config conflict from a parent-dir `.eslintrc.json` — if so, rely on `tsc` + targeted review).
- [ ] **Legacy unchanged (flag OFF):** toggle V2 off via the demo controls (`components/app-shell/demo-controls.tsx` → `lib/version-two-context.tsx`) and confirm the page renders exactly as before. For shared components, `git diff` the legacy file/branch should show no behavioral change.
- [ ] **V2 matches the reference (flag ON):** open the page and the archetype's reference page side by side; the rail, toolbar, table grid, pills, avatars, and drawers should look like the same product. Screenshot both and compare (see below).
- [ ] **No new primitives that should be shared** — if you hand-rolled something the references already have, replace it with the `@/components/v2` import.

### Visual anchoring (because the target is visual)
Text can't fully convey "looks like the samples." Before finishing:
1. `npm run dev`, open the reference page (e.g. `/escalations`, `/workforce`, `/sops-knowledge`) with the V2 flag on, and screenshot it.
2. Screenshot your redesigned page in the same state.
3. Compare rail width/typography, toolbar control shapes, table column rhythm, chip colors, and drawer anatomy. Fix mismatches before reporting done.

## Report when done
Fill in:
- **Archetype + gating:** which reference, full-page swap vs inline flag.
- **CLAUDE.md rules applied:** (e.g. status hue ladder, chip-border, type/icon scale, ELI avatar).
- **Primitives reused:** which `@/components/v2` + `*-v2` components; **created:** any new primitive (and confirm you exported it + updated this skill).
- **Tables rebuilt:** list each, confirm all primary tables migrated.
- **Verification:** `tsc` result; flag-off = legacy unchanged; flag-on = matches reference (attach screenshots).
- **Full/R1/R2 confirmed unchanged.**

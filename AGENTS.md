# OXP Studio prototype — project rules

## Eli / AI-generated content rules (MANDATORY)

These rules come from the Eli design system in `../prototype-sandbox` (see its
`docs/eli-ecosystem-guide.md`, `docs/eli-patterns-core.md`, `docs/components/eli.md`)
and the `../entrata-storybook` examples. **Any change that touches AI/ELI-generated
or AI-branded UI must follow them.** The primitives are already ported into this repo
— reuse them, never improvise ad-hoc AI styling.

### 1. Eli avatar
ELI represented as an avatar = **black circle with the eli cube centered**:
`rounded-full bg-black` container, `/eli-cube.svg` at ~60% of the container
(e.g. `h-5 w-5` circle → `h-3 w-3` cube; `h-8 w-8` → `h-5 w-5`).
- Never put the cube on blue/muted/purple-tinted or square containers when it
  represents the agent.
- Exception: the cube used as a **product logo** (OXP sidebar header, mobile-nav
  brand row) is a logo, not an avatar — leave as-is.
- A muted + `grayscale` treatment is allowed for a **deactivated** agent state.

### 2. Warm background for Eli-generated content
Content ELI produced (messages, drafts, insights) uses the warm treatment:
`bg-eli-warm-bg text-eli-warm-bg-foreground` with an eli-purple border
(`border border-eli-purple/30`) or, for richer surfaces, the gradient rings in
`app/globals.css` (`.eli-gradient-border-ring` = animated "processing",
`.eli-gradient-border-ring-static` = "generated"). Tokens live in
`app/globals.css` (`--eli-*`) and `tailwind.config.ts` (`eli-purple`, `eli-pink`,
`eli-warm-bg`, `eli-warm-bg-foreground`). Do not style AI messages as plain
blue/gray bubbles; blue bubbles = human staff.

### 3. AI provenance badge
Every Eli-generated message/content block carries an
`<AiStatusBadge status="ELI Generated" | "ELI Suggested" | "AI Assisted" | "AI Draft" />`
(from `components/ui/badge.tsx`). Never hand-roll AI provenance chips.

### 4. Eli-branded toggles
Switches that **hand work to ELI** — activating the AI to act on the user's
behalf (agent AI-activation, "Eli auto-reply", enabling an AI-generated draft) —
use `<Switch variant="eli" />` (purple on-state, `components/ui/switch.tsx`).
When the toggle is the primary AI control of a surface, its container gets the
warm treatment (`border-eli-purple/30 bg-eli-warm-bg`).
**Not for governance/oversight controls.** Human-admin toggles that constrain,
audit, or supervise the AI (guardrails, approval gates, kill switches,
audit-event tracking, retention, policy settings) are **manual/staff controls**
per rule #5 — keep them plain `<Switch>`. Rule of thumb: if a human is
configuring oversight *of* the AI, it's plain; if the toggle turns ELI loose to
do work, it's purple.

### 5. Color semantics
Purple/warm = ELI context; blue/gray = manual/staff context; red = destructive
or notification counts only. Never mix ELI branding onto manual controls.

## Version Two redesign — reference implementations
The redesigned "Version Two" aesthetic is gated behind `useVersionTwo()`
(`lib/version-two-context.tsx`) so Full/R1/R2 stay untouched. When redesigning a
new page to match, treat these as the canonical visual references:
- **Command Center** — `app/command-center/command-center-v2.tsx` (page-level
 swap: `app/command-center/page.tsx` branches `isVersionTwo` → `*-v2` vs
 `*-legacy`).
- **Playbooks (My Tasks / Playbook / Settings)** —
 `app/playbooks/[id]/PlaybookDetailClient.tsx` (inline `isVersionTwo` branch
 swapping `-v2` component variants).
- **Agent Knowledge Hub** — `app/agent-knowledge-hub/page.tsx` (inline
 `isV2 ? <KnowledgeHubV2/> : <legacy/>` branch). The canonical example of a
 **grouped card-list / cascade** surface converted to the frozen-column grid:
 the Portfolio→Property cascade collapses into a Scope filter pill + Scope
 column; the Knowledge Gaps triage sub-surface stays cards.
Reuse existing `-v2` component variants (e.g. `escalation-detail-sheet-v2`,
`member-detail-sheet-v2`, `metric-detail-dialog-v2`) before building new ones.
To redesign another page, use the `/v2-redesign` skill.

## Design conventions (established)
- **Type scale:** named tokens only — `text-xxs` (11px), `text-xs`, `text-sm`,
  `text-base`, … Never use arbitrary `text-[Npx]` utilities.
- **Icon scale:** Lucide icons at 14/16/20px (`h-3.5`/`h-4`/`h-5`). No 12px tier.
  Inline `<svg>` only for brand logos, sparklines, and diff markers.
- **Custom Tailwind tokens + tailwind-merge:** if you add a custom utility that
  shares the `text-`/`bg-` namespace, register it in `lib/utils.ts`
  (`extendTailwindMerge`) or `cn()` will silently drop conflicting classes.
- **Switches vs. checkboxes:** switches are reserved for instantly-applied
  settings (e.g. AI activation); anything that filters a list uses a checkbox
  (borderless label + `<Checkbox>`, see "Show closed" / "Only my tasks").
- **Single-select menus** (status, assignee pickers): a leading check mark on
  the selected row only (`<Check>` toggled by opacity) + `role="listbox"`/
  `role="option"`. Never checkbox squares — those signal multi-select.
- **Property filtering:** always the shared `<PropertySelector>` (groups,
  views, search) in a popover behind a pill trigger with a `Building` icon.
  It emits node IDs — resolve to display names with
  `resolveSelectedIdsToLeafPropertyNames` before matching row data.
- **Selected/active state — two control families, don't mix them:**
  · *Toggle / segmented controls* (view switchers, ToggleGroup on-state): light
    blue fill — `bg-[hsl(207_73%_95%)]` light / `bg-[hsl(207_73%_20%)]` dark.
  · *Filter pills* (`PropertySelector` trigger, every `MultiCheckList` variant):
    the filter **name stays visible** (a single selection may show that one
    value inline), a `bg-primary` count badge appears once >1 is selected, and
    the selected pill tints its border `border-primary/40`. Never relabel a pill
    to "N selected" and never swap it to a filled (`bg-accent`) selected state.
- **Semantic status colors:** use the `status-*` tokens (ported from
  prototype-sandbox globals.css): `bg-status-error|warning|success|info`
  (+`-foreground`, `-border`) and `bg-progress` for progress fills. Never
  raw palette classes (`red-100`, `amber-800`, …) for state. One hue = one
  meaning: error = breach/destructive; warning = time pressure; success =
  completed outcomes ONLY (never "low priority" or "due today"); info =
  waiting/informational. (Primary buttons stay black/white in OXP — do not
  adopt the sandbox's blue primary.)
- **Status badge hue ladder** (workflow states, every surface): gray/`muted`
  = not started (Open/On Hold) · blue/`status-info` = active (In progress,
  Handed back to agent) · amber/`status-warning` = waiting (Waiting on
  resident, Pending approval, Due Today) · red/`status-error` = Blocked/
  Overdue · green/`status-success` = Done/Completed.
- **Pill / chip borders** (one rule, every surface): **a border defines an
  interactive control; a fill defines a display chip.** Mirrors the `Badge`
  variants in `components/ui/badge.tsx` (every tonal variant is
  `border-transparent`; only `outline` carries a border).
  · **Display chips** — read-only labels, counts, status/role badges — use a
    tonal fill (`bg-muted`, `bg-status-*`) and **no border**. The background is
    the shape. Never put a neutral `border` on a display `bg-muted`/`bg-status-*`
    chip.
  · **ELI/AI chips** are the one display exception — they keep the
    `border border-eli-purple/30` ring on `bg-eli-warm-bg` because the purple
    border is brand (rule #2) and the warm bg is too faint to read alone.
  · **Interactive control pills** — filter pills, the `PropertySelector`
    trigger, removable token chips, pill buttons — **keep a border**
    (`border-input` on `bg-background`, or `border-border` on a faint
    `bg-muted/50`) so the control reads as clickable. The border is the
    affordance, so the same "count" element is bordered when it's a toggle but
    borderless when it's static.

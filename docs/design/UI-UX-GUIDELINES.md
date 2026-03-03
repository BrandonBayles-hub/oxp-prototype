# UI/UX Guidelines & Design System

**Purpose:** Single source of truth for UI/UX consistency. Every page shares the same layout, typography, spacing, and components so the app feels cohesive. Use this doc when building or reviewing UI.

**Component library:** **[shadcn/ui](https://ui.shadcn.com/)** — all UI is built with shadcn components. Use `npx shadcn@latest` to add components; do not introduce a second component library.

**Reference examples:** Two screens define the target look and feel (save into `assets/` or keep in your design tool):
- **Trainings & SOP** (Vault / document list): `Screenshot_2026-02-21_at_9.51.32_PM-3bf66b3d-6da2-4a63-bd72-9a96e01c841c.png`
- **Agent Roster**: `Screenshot_2026-02-21_at_9.52.01_PM-e5c9acf0-e94d-4297-bfc8-90955480d13f.png`

---

## 1. Design Principles

| Principle | Meaning |
|-----------|--------|
| **Open layout** | Generous whitespace; no cramped sections. Prefer padding and spacing over borders and boxes. |
| **Simple and clean** | Flat, minimal. No heavy shadows, gradients, or decorative clutter. Only show what is truly necessary. |
| **Typography and spacing** | Use type and spacing to create hierarchy and separation, not lines or boxes. |
| **Restraint** | Icons, outlines, and extra elements only when they add clarity or function. Default to less. |
| **Color used sparingly** | Use color very sparingly. In the reference mocks it appears rarely; when it does, it is intentional (e.g. a single status like Active/Training, or a focused accent). Default to neutrals: white, light grey, dark grey, black. Do not add color for decoration or to “fill” the UI. |
| **Micro-interactions and loading** | Transitions and loading states should feel smooth and minimal—no jarring jumps or busy spinners. |
| **Simple, not dashboard-y** | Aim for Harvey/Claude/OpenAI simplicity. Avoid the opposite: card-heavy layouts with shadows and depth, and a lot of color. See **§7.1 What to avoid**. |
| **Responsive** | The app must work across screen sizes (small laptop, tablet, large desktop). Layout and nav adapt; content remains usable without horizontal overflow or cramped touch targets. See **§3.1**. |

---

## 2. Typography

| Use | Font | Notes |
|-----|------|--------|
| **Page header** (e.g. "Trainings & SOP", "Agent Roster") | **Nohemi** | Large, bold; primary visual anchor for the page. |
| **All other text** (nav, body, table content, labels, buttons) | **Inter** | Legible sans-serif; consistent weights and sizes for hierarchy. |

- Load **Nohemi** and **Inter** (e.g. via Google Fonts or self-hosted) and set in the app theme/CSS.
- Use font size and weight (not color alone) to establish hierarchy; keep contrast accessible.

---

## 2.1 Color: Use Very Sparingly

In the reference mocks, color appears **rarely** and **only with intent** (e.g. a status badge, not decorative fill). Apply the same discipline:

- **Default palette:** Neutrals only — white, light grey, dark grey, black. This should cover most of the UI (backgrounds, text, borders, icons).
- **When to add color:** Only for a small, defined set of semantic cues (e.g. Active = green, Training = orange, or one focused accent). Each use should have a clear reason; if in doubt, use grey.
- **Do not:** Use color for decoration, to distinguish every button, or to “liven up” the layout. Match the mocks: color is the exception, not the rule.

---

## 2.2 Tone and voice (copy)

- **Friendly but professional.** Copy should feel approachable and trustworthy, not cold or casual.
- **Short and concise.** This is UX: avoid long sentences or long descriptions. Use brief labels, one-line explanations, and scannable text. If a line feels like a paragraph, shorten it.
- **Default to less.** Only the copy that's needed for clarity or action; no filler or repeated explanations.

---

## 3. App Shell (Shared on Every Page)

- **Two-column layout:** Left sidebar (navigation) + main content area. Main content gets most of the width.
- **Left sidebar:**
  - **Top: Side nav branding** — Use the **Entrata Cube** logo at the top corner. Asset: **`assets/entrata-cube.svg`** (40×40, fill `#383838`). Place it at the top of the sidebar; optional "entrata" wordmark next to it per reference screens.
  - Nav grouped by section: **To Do** (Getting Started, Command Center, Escalations), **My Workforce** (Performance, Agent Roster, Workforce), **Configure** (Workflows, Trainings & SOP, Voice, Tools, Governance).
  - Each nav item: subtle outline icon + label; active state = light grey background, no heavy border.
  - Bottom: User profile (avatar, name).
- **Main content area:** White (or theme background); no strong dividing line between content and sidebar—separation by spacing and subtle sidebar background (e.g. light grey).
- **Floating input (optional):** "Ask a question" chat-style input at bottom-right on relevant pages (e.g. Trainings & SOP); minimal, with attach and send.

Use one **AppShell** (or layout) component so every page uses the same nav and structure. Implement with shadcn layout primitives and your router.

### 3.1 Responsive behavior and screen sizes

The app must be **responsive** and usable across common screen sizes. Apply the following so every viewport gets a coherent experience.

- **Breakpoints:** Use a consistent breakpoint system (e.g. Tailwind: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px). Design and build for **small laptop (~1024px)** as a baseline; ensure it scales up to large desktop and down to tablet (and optionally large phones).
- **App shell (sidebar):**
  - **Large (e.g. ≥ lg):** Sidebar visible as a fixed or sticky column; main content beside it.
  - **Small (e.g. &lt; lg):** Sidebar collapses or hides; navigation available via a **hamburger/menu control** that opens the nav in a **Sheet** (drawer) or overlay. Main content is full-width when the sheet is closed. Preserve the same nav structure and branding inside the sheet.
- **Main content:** Use fluid width and max-width where appropriate so content doesn’t stretch awkwardly on very wide screens. Padding should scale (e.g. responsive padding) so content doesn’t touch viewport edges on small screens.
- **Tables:** On narrow viewports, either (1) **horizontal scroll** within a scroll container (with a visible cue that more columns exist), or (2) **card/list reflow** — show each row as a card so users can scan without horizontal scroll. Prefer scroll for many columns; prefer cards when a few key fields suffice.
- **Action bars:** Filters, search, and primary actions should **wrap** or **collapse** on small screens (e.g. filters in a dropdown, or a single “Filter” button that opens a sheet). Avoid horizontal overflow.
- **Touch:** On touch devices, ensure **tap targets** are at least ~44×44px for primary actions and nav. Keep spacing between interactive elements so taps are accurate.
- **Viewport:** Use a proper viewport meta tag so layout is not zoomed incorrectly on mobile. Avoid fixed pixel widths that cause horizontal scroll on small screens.

See **SHADCN-COMPONENT-MAPPING.md** for sidebar (Sheet) and layout implementation notes.

---

## 4. Page-Level Patterns

### 4.1 Page header block

- **Page title** in Nohemi (large, bold).
- **Optional short description** below in Inter, smaller, lighter grey.
- Enough vertical space between header and content so the layout stays open.

### 4.2 Action bar (when the page has filters or actions)

- Place between page header and main content (e.g. table or cards).
- Contains only what’s needed: e.g. dropdown filters, search, primary actions ("+ New Folder", "+ Add Document", "Create Agent", "Filter Agents").
- **Search:** Single line, light border, placeholder like "Search files, labels, owners"; subtle icon only if needed.
- **Buttons:** Minimal borders; "+" or "Create" style per example. Prefer shadcn `Button` variants (e.g. default/outline) without extra decoration.

### 4.3 Tables and lists

- **Tables (e.g. Trainings & SOP):**
  - Column headers: Inter, uppercase or otherwise distinct; small sort arrows only where sorting is offered.
  - Rows: **No horizontal or vertical grid lines**; separate rows with **vertical spacing** (padding) on a white background.
  - Row content: icon (folder/document) only where it clarifies type; label, metadata (e.g. Trained on, Modified), owner (avatar + name), and a single subtle action (e.g. pencil) if needed.
- **Lists by section (e.g. Agent Roster):**
  - Section title + icon + count (e.g. "Leasing & Marketing", "32/37 Active") in Nohemi or bold Inter.
  - Cards or list items with: title, short description, status tags (e.g. **ELI+** using the ELI+ cube icon — `assets/eli-plus-cube.svg` — and Active, Training). Use thin dividers or spacing between items, not heavy outlines.
  - "View All" link at end of section where appropriate.

### 4.4 Icons and outlines

- **Icons:** Monochrome, outline style; small and unobtrusive. Use only for nav, file type, sort, and primary actions (e.g. attach, send). Do not add decorative icons.
- **Outlines:** Prefer none; if needed (e.g. search, filter button), use a **light grey, thin** border. Buttons: minimal border or fill per shadcn; no heavy boxes.
- **Status and color:** Color is used **very little** in the mocks; when it appears (e.g. green Active, orange Training), it is **intentional** and meaningful. Reserve color for a small set of status or semantic cues only. Do not introduce colored buttons, borders, or backgrounds beyond what the references show. Keep contrast accessible when color is used.

---

## 5. shadcn Usage

- **Add components** via `npx shadcn@latest add <component>` so versions and styles stay consistent.
- **Theme/tokens:** Use shadcn’s theming (CSS variables) for color, radius, spacing. **Color palette:** Default to neutrals (white, light grey, dark grey/black); add accent or status colors only where the mocks use them (e.g. status badges). Override only for Nohemi/Inter and any brand tweaks; keep the rest aligned with the “simple and clean” look (light background, subtle borders, minimal shadow, **sparing use of color**).
- **Prefer:** `Button`, `Input`, `Table`, `Card`, `DropdownMenu`, `Avatar`, `Badge` (for status), layout primitives. Use **DataTable**-style composition for sortable tables with spacing-based rows (no grid lines).
- **Avoid:** Extra wrappers, custom one-off components that duplicate shadcn, or heavy custom CSS that breaks the open, minimal look.

---

## 6. Micro-interactions and Loading

- **Transitions:** Use short, subtle transitions for:
  - Nav active state, hover on buttons and rows.
  - Opening/closing modals or panels.
- **Loading:** Prefer skeleton placeholders or a minimal spinner that matches the layout (e.g. skeleton rows for tables, skeleton cards for Agent Roster). Avoid large full-screen loaders unless necessary.
- Keep motion minimal and purposeful; no decorative animations.

---

## 6.1 What good looks like (checklist)

**North star:** A good screen feels like Harvey, Claude, or Linear — calm, readable, and purposeful. It does not feel like a property-management dashboard full of cards and color.

Use this checklist when building or reviewing a page:

| Check | Good looks like |
|-------|------------------|
| **Layout** | Open; plenty of whitespace; spacing creates separation, not lines or boxes. |
| **Hierarchy** | One clear page title (Nohemi); body and labels in Inter; size/weight for emphasis, not color. |
| **Content** | Only what’s needed: clear labels, one primary action per area, minimal icons. |
| **Tables/lists** | Rows separated by padding; no full grid lines; subtle borders only when necessary. |
| **Color** | Mostly neutrals (white, greys, black); color only for a small set of status/semantic cues. |
| **Restraint** | No outlines on everything, no mix of many font sizes, no decorative cards or colored backgrounds. |

When in doubt: **prefer more whitespace and less decoration.**

**Annotated reference (optional):** If you create an annotated version of Trainings & SOP or Agent Roster with 3–5 callouts (e.g. "No grid lines — spacing only," "Single accent color here"), save it in `assets/` and add the filename to **§9 Asset and Config References**. That gives implementers a visible "why" for the target look.

---

## 7. Example-to-Page Mapping

| Example screen | Maps to app page(s) | Use for |
|----------------|---------------------|--------|
| **Trainings & SOP** | Vault / Trainings & SOP (documents), or any document/list view | Page header + description, action bar (search, New Folder, Add Document), borderless table with FILE NAME / Trained on / Modified / Owner, floating "Ask a question" input. |
| **Agent Roster** | Agent Roster, and pattern for other “bucket + list” views | Page header, Filter + Create Agent, sections by bucket (Leasing & Marketing, Resident Relations & Retention, etc.) with counts and list items (title, description, status tags), View All. |
| **Command Center or Escalations** *(add when available)* | Command Center (landing), Escalations (task list) | Same open, minimal pattern: one clear focus, spacing-based layout, minimal chrome. Use Trainings & SOP / Agent Roster as the visual bar until a third reference screenshot is added. |

When adding a new page, reuse one of these patterns (header + action bar + table, or header + action bar + sectioned lists) so the app stays consistent.

---

## 7.1 What to Avoid (Anti-patterns)

We want the app to feel **simple** like Harvey, Claude, OpenAI — not busy, outlined, or colorful. Use the **bad UI references** as guardrails: if a screen starts to look like them, dial it back.

**References (what *not* to do):** Save in `assets/` as needed.
- **Example 1:** `Screenshot_2026-02-21_at_10.05.48_PM-bbda8b15-...` — Card-heavy dashboard, shadows and depth, lots of color (purple, green, orange, blue), many widgets.
- **Example 2:** `Screenshot_2026-02-21_at_10.11.16_PM-06a51923-...` — Maintenance Performance: very busy, outlines on everything, colored metric cards, many font sizes.

| Avoid | Why | Do instead |
|-------|-----|------------|
| **Cards with shadows and depth** | Almost every element in a distinct, shadow-casting card creates a layered, heavy look. | Prefer open layout with spacing; use cards only when they add structure (e.g. Agent Roster list items). No prominent drop shadows; flat, minimal. |
| **Outlines on everything** | Buttons, inputs, tabs, filters, dropdowns all with visible borders make the UI busy and boxy. | Outlines only when needed (e.g. one search field). Prefer borderless or very light borders; use spacing and background to separate, not lines. |
| **Heavy use of color** | Purple, green, orange, blue, red on icons, progress bars, charts, status dots — or colored card backgrounds (blue, green, pink, yellow) — makes the UI loud. | Neutrals first. Color only for a small set of intentional cues (e.g. one or two status colors). No colored card backgrounds; icons and nav: monochrome. |
| **Different size fonts everywhere** | Many font sizes within one view (big numbers, medium titles, small subtitles, tiny trends) with no clear system feels chaotic. | Stick to a simple type scale (e.g. page title, section, body, caption). Few sizes; hierarchy through weight and spacing as much as size. |
| **Dashboard clutter** | Many separate cards, donut charts, progress bars, and insight panels competing for attention. | One clear focus per view. Prefer lists and tables with spacing (like our reference mocks); avoid packing multiple chart/widget cards onto one screen. |
| **Colored icons everywhere** | Icons in purple, blue, green per section. | Monochrome, outline icons. Color only when it carries meaning (e.g. status). |
| **Notification dots and badges on everything** | Red counts on nav, headers, bells. | Use sparingly; only where they’re essential. Prefer calm, minimal chrome. |

**Rule of thumb:** If a screen feels closer to the bad UI references (busy, outlines everywhere, lots of color, many font sizes) than to the Trainings & SOP or Agent Roster mocks, simplify: remove outlines except where essential, strip color to neutrals plus one or two semantic colors, reduce type sizes to a clear scale, and reduce visual chunks so the layout stays open and simple.

---

## 8. Copy and Terminology

- **Tone:** Friendly but professional; short and concise. See **§2.2 Tone and voice**.
- Use **resident** (not “tenant”) for the person living at the property in all UI copy. See **docs/architecture/TDD-ARCHITECTURE.md** §2 and **docs/product/README.md**.

---

## 9. Asset and Config References

- **Side nav logo (top corner):** **`assets/entrata-cube.svg`** — Entrata Cube logo, 40×40, fill `#383838`. Use at the top of the left sidebar in the app shell. Source: user-provided; stored in repo for build.
- **ELI+ cube (Agent Roster and agent-type badges):** **`assets/eli-plus-cube.svg`** — Tesseract/cube icon for **ELI+** agent type (15×15). Use on the Agent Roster page and anywhere we show the ELI+ badge/type (per reference screen). Source: Tesseract 4.svg.
- **Screenshots:** Copy into repo `assets/` or reference from your design tool. **Good:** `Screenshot_2026-02-21_at_9.51.32_PM-...` (Trainings & SOP), `Screenshot_2026-02-21_at_9.52.01_PM-...` (Agent Roster). **Third reference (optional):** When you have a Command Center or Escalations screenshot that matches the same open look, add it here and to the table in §7. **Annotated reference (optional):** An annotated mock (e.g. Trainings & SOP with callouts like “No grid lines — spacing only”) can be saved in `assets/` and linked here. **What to avoid:** (1) `Screenshot_2026-02-21_at_10.05.48_PM-bbda8b15-...` (card-heavy, shadows, lots of color); (2) `Screenshot_2026-02-21_at_10.11.16_PM-06a51923-...` (busy, outlines everywhere, colored cards, many font sizes). See §7.1.
- **shadcn MCP (Cursor):** In MCP config: `"shadcn": { "command": "npx", "args": ["shadcn@latest", "mcp"] }`.

*Last updated: Feb 2025. Align all new UI with these guidelines and the two reference screens.*

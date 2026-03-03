# shadcn Component Mapping

**Purpose:** Map UI elements in the reference screens (Trainings & SOP, Agent Roster) to **shadcn** components so we use the library consistently and avoid one-off styling.

Use with **UI-UX-GUIDELINES.md**. Add components via `npx shadcn@latest add <component>`.

---

## App shell and layout

| Element | shadcn / approach |
|--------|---------------------|
| Two-column layout (sidebar + main) | Custom layout with flex/grid. **Responsive:** At `lg` and up: fixed or sticky sidebar; below `lg`: hide sidebar, show a menu/hamburger control that opens nav in a **`Sheet`** (drawer from left). Main content is full-width when sheet is closed. |
| **Sidebar top (branding)** | **`assets/entrata-cube.svg`** — Entrata Cube logo, 40×40; place at top of sidebar. Use `<img src="..." alt="Entrata" />` or inline SVG. Optional "entrata" wordmark next to it. |
| Sidebar nav items | `Button` variant ghost or similar for nav items; active state via `className` (e.g. light grey bg). |
| Avatar (user, owner) | `Avatar` + `AvatarImage` / `AvatarFallback`. |
| Main content area | Main container with padding; no shadcn layout required. |

---

## Page header and description

| Element | shadcn / approach |
|--------|---------------------|
| Page title (Nohemi) | Semantic `h1` with Nohemi font class; no shadcn component. |
| Description (Inter, muted) | `p` with muted text class; or shadcn doesn’t have a specific “description” component—use typography + color. |

---

## Action bar

| Element | shadcn / approach |
|--------|---------------------|
| Dropdown (e.g. “Owner”) | `DropdownMenu` + `DropdownMenuTrigger` + `DropdownMenuContent`. |
| Search input | `Input` with optional search icon; keep border light (theme). |
| Primary buttons (“+ New Folder”, “Create Agent”) | `Button` (default or secondary variant per design). |
| “Filter Agents” style button | `Button` variant outline + `ChevronDown` icon; or `DropdownMenuTrigger`. |

---

## Tables (Trainings & SOP style)

| Element | shadcn / approach |
|--------|---------------------|
| Table container | `Table` (`TableHeader`, `TableBody`, `TableRow`, `TableCell`). |
| Row styling | **No borders**; use spacing (e.g. `TableCell` padding, gap) to separate rows. Override default border with theme or `className`. |
| Sortable headers | `TableHead` + sort icon (e.g. `ArrowUpDown`); wire to sort state. |
| Icon in cell (folder/document) | Icon component (e.g. lucide-react) + `TableCell`. |
| Edit action (pencil) | `Button` variant ghost, size icon. |

---

## Sectioned lists (Agent Roster style)

| Element | shadcn / approach |
|--------|---------------------|
| Section title + count | `h2` or similar + `Badge` or plain text for count (e.g. “32/37 Active”). |
| Card/list item (title, description, tags) | `Card` (`CardHeader`, `CardContent`) or a simple `div` with spacing; keep outlines minimal. |
| Status tags (ELI+, Active, Training) | **ELI+:** use **`assets/eli-plus-cube.svg`** (15×15) inside or next to the badge. **Active** / **Training:** `Badge` with variant or custom class for color (green, orange). |
| “View All” link | `Button` variant link or `a` with link styling. |

---

## Responsive behavior

| Concern | Approach |
|--------|----------|
| **Breakpoints** | Use Tailwind (or theme) breakpoints: e.g. `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px. Baseline layout for ~1024px; adapt down to tablet and up to large desktop. |
| **Sidebar on small screens** | `Sheet` (or `Drawer`) opened by a header menu button; same nav content and branding inside. Close on route change or overlay tap. |
| **Tables on narrow viewports** | Option A: Wrap table in a horizontally scrollable container (`overflow-x-auto`) with clear affordance. Option B: Reflow rows as cards (e.g. `Card` per row) for key fields only. |
| **Action bar (filters, search)** | Use `flex-wrap` and/or collapse filters into a single `DropdownMenu` or “Filter” button that opens a `Sheet` on small screens. |
| **Touch targets** | Buttons and nav items: min ~44×44px tap area on touch devices; use shadcn size variants or padding to achieve. |

---

## Floating and overlays

| Element | shadcn / approach |
|--------|---------------------|
| “Ask a question” input (bottom-right) | `Input` or `Textarea` in a fixed-position container; optional `Button` for attach/send. Or `Popover` / custom floating panel. |

---

## Loading and feedback

| Element | shadcn / approach |
|--------|---------------------|
| Skeleton (tables, cards) | `Skeleton` for rows or card placeholders. |
| Spinner (when needed) | No built-in spinner in core shadcn; use a small, minimal spinner (e.g. lucide-react `Loader2` with animate) or add a small custom component. |

---

## Theming (fonts and tokens)

- **Nohemi:** Set as font for page headers (e.g. `h1` or `.page-title`) in your CSS or Tailwind config.
- **Inter:** Set as default body font in theme.
- **shadcn theme:** Use CSS variables for colors and radius; keep borders light and shadows minimal to match the reference screens.

*Add or adjust mappings as we introduce new pages or shadcn components.*

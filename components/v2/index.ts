/**
 * Version Two shared UI primitives — the canonical source of truth for the V2
 * design language (see `.cursor/skills/v2-redesign/SKILL.md`). Import from here
 * instead of re-declaring class strings / consts per page; that duplication is
 * what makes the grid and filters drift between surfaces.
 *
 * CLAUDE.md remains the base design contract; these primitives are the OXP
 * Studio-specific implementation layered on top of it.
 */
export { FROZEN_COL_BG, FROZEN_COL_BG_HOVER, V2_SEGMENTED_ON, useStickyScroll } from "./table";
export { V2SearchInput } from "./v2-search-input";
export { V2FilterPill } from "./v2-filter-pill";
export { V2SegmentedToggle, type V2SegmentedOption } from "./v2-segmented-toggle";
export { V2SortHeader } from "./v2-sort-header";
export { SingleSelectPill } from "./single-select-pill";

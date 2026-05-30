/**
 * Admin sidebar / quick-action links hidden until those areas are surfaced in the UI.
 * Remove a path from this set to show it again (routes can remain).
 */
export const SET_ADMIN_NAV_HIDDEN_PATHS: ReadonlySet<string> = new Set([
  "/admin/bundles",
  "/admin/eligibility",
  "/admin/scheduling",
  "/admin/audit-log",
]);

export function fnIsAdminNavPathHidden(strPath: string): boolean {
  return SET_ADMIN_NAV_HIDDEN_PATHS.has(strPath);
}

/**
 * Admin dashboard: “Recent Activity”. Set to `true` when the feed is implemented.
 */
export const BOOL_ADMIN_DASHBOARD_SHOW_RECENT_ACTIVITY = false;

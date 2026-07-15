/**
 * Navigation helpers for the Custom Agent Builder in the Next.js prototype.
 *
 * The MFE version uses react-router-dom with nested Routes under /agent-builder/*.
 * In the prototype, we use query parameters (?view=...) on /agent-builder instead.
 *
 * This module centralizes the URL-building logic so component-level changes are
 * minimal: swap `useNavigate()` → `useAgentBuilderNav()` and
 * `<Link to=...>` → `<Link href=...>`.
 */

const BASE_PATH = '/agent-builder';

export function agentBuilderUrl(
  view?: string,
  params?: Record<string, string>,
): string {
  const sp = new URLSearchParams();
  if (view) sp.set('view', view);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      sp.set(k, v);
    }
  }
  const qs = sp.toString();
  return qs ? `${BASE_PATH}?${qs}` : BASE_PATH;
}

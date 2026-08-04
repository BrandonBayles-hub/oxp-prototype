import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Register our custom `text-xxs` font-size token with tailwind-merge. Without
// this, twMerge doesn't recognize `text-xxs` as a font-size and treats it as
// conflicting with `text-{color}` classes — silently dropping the color when
// the two are combined via cn(). Declaring it under the font-size group keeps
// text-xxs conflicting only with other sizes, never with colors.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["xxs"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Is `href` the active route for `pathname`?
 *
 * Exists because this app runs `trailingSlash: true` (next.config.ts), so
 * `usePathname()` returns "/performance/" while nav configs hold the
 * slash-less "/performance". A bare `pathname === href` therefore NEVER
 * matches and the tab silently never highlights — which is exactly why the
 * Performance "Overview" tab had no active state.
 *
 * Non-exact matching requires a SEGMENT boundary: "/performance/library" must
 * not light up for "/performance/library-archive". A bare `startsWith` gets
 * that wrong.
 *
 * Ported from the entrata-3.0 platform helper so the two codebases resolve
 * active nav state identically.
 */
export function isActiveRoute(
  pathname: string | null | undefined,
  href: string,
  opts: { exact?: boolean } = {},
): boolean {
  if (!pathname) return false;
  const norm = (s: string) => (s.length > 1 ? s.replace(/\/+$/, "") : s);
  const p = norm(pathname);
  const h = norm(href);
  return opts.exact ? p === h : p === h || p.startsWith(`${h}/`);
}

const BASE_PATH =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BASE_PATH) ||
  "";

export function assetPath(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = BASE_PATH.endsWith("/") ? BASE_PATH.slice(0, -1) : BASE_PATH;
  return `${base}${normalized}`;
}

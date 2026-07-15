import { getProfileById, DEFAULT_PROFILE_ID } from "@/lib/marketplace/utils/profiles";

/**
 * Static-export shim of Leo's visibility helpers.
 *
 * The cookie-based `getCurrentClientId()` / `getCurrentClientName()` helpers
 * are replaced with static lookups that always return the default
 * Entrata-internal demo profile. The Prisma `where`-builder helpers are
 * preserved but unused in the static port (kept to avoid breaking
 * unrelated imports if any).
 */

export function buildVisibilityFilter(clientId: string) {
  return {
    status: "PUBLISHED",
    OR: [
      { visibility: { in: ["EXCHANGE", "PUBLIC_LISTED"] } },
      { visibility: "PRIVATE", ownerClientId: clientId },
      { visibility: "PRIVATE", clientAccess: { some: { clientId } } },
    ],
  };
}

export function buildPrivateFilter(clientId: string) {
  return {
    status: "PUBLISHED",
    visibility: "PRIVATE",
    OR: [
      { ownerClientId: clientId },
      { clientAccess: { some: { clientId } } },
    ],
  };
}

export function buildPublicFilter() {
  return {
    status: "PUBLISHED",
    visibility: "PUBLIC_LISTED",
  };
}

/**
 * Static replacement for the cookie-based current-client lookup. Always
 * returns the default demo profile so server components can resolve a
 * client identity at build time without reading cookies.
 */
export async function getCurrentClientId(): Promise<string> {
  return getProfileById(DEFAULT_PROFILE_ID).id;
}

export async function getCurrentClientName(): Promise<string> {
  return getProfileById(DEFAULT_PROFILE_ID).name;
}

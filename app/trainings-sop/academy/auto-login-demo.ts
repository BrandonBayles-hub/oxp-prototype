/*
 * auto-login-demo.ts — bootstrap the Academy app into a logged-in demo state
 * so the Sign-In screen is never shown when Academy is embedded in another
 * surface (here: the OXP Studio /trainings-sop "Trainings" tab).
 *
 * Why this exists
 * ---------------
 * The dev.green standalone Academy prototype gates everything behind a Sign-In
 * screen (App.jsx line ~2179: `if (!token) return <LoginScreen />`). The
 * standalone build keeps the gate because it's the demo entry point and the
 * marketing surface needs the "sign in to see Academy" affordance.
 *
 * Inside the OXP Studio prototype, the user has already navigated to OXP >
 * Trainings & SOP > Trainings — they have already implicitly authenticated
 * into the OXP shell, so showing Academy's own login is a duplicate friction
 * the PM explicitly asked us to remove. We satisfy the gate without modifying
 * the upstream Academy source by:
 *
 *   1. Pre-populating `localStorage.academy_token` with a non-empty placeholder
 *      BEFORE App.jsx's useState initializer runs. App reads localStorage on
 *      first render, sees a token, skips the LoginScreen branch.
 *
 *   2. Letting demo-data.js's module-level `currentUser = DEMO_ADMIN` default
 *      do its job. App's `boot()` then resolves /api/me → DEMO_ADMIN → setUser,
 *      and the main app finishes hydrating.
 *
 * The two steps together mean: zero source-file edits in Academy, no flash of
 * the LoginScreen, no async race. The function is safe to call at module load
 * time (top-level "use client" code in AcademyTab.tsx) because the typeof
 * window guard makes it a no-op during static export / SSR.
 *
 * Cleanup
 * -------
 * If a future Academy build no longer requires a token (full demo bypass at
 * the boot level), this file becomes dead code and can be deleted along with
 * its import in AcademyTab.tsx.
 */

const TOKEN_KEY = "academy_token";
const TOKEN_VALUE = "demo-token-embedded";
const USER_PREF_KEY = "academy_demo_user_email";

export function seedAcademyDemoSession(): void {
  if (typeof window === "undefined") return;
  try {
    if (!window.localStorage.getItem(TOKEN_KEY)) {
      window.localStorage.setItem(TOKEN_KEY, TOKEN_VALUE);
    }
  } catch {
    // localStorage can throw in private-browsing / sandboxed contexts.
    // Academy will fall back to its sign-in screen in that case, which is
    // exactly the standalone-build behavior — acceptable degradation.
    return;
  }

  // Persona replay: AcademyDemoBar persists the chosen demo user via
  // localStorage.academy_demo_user_email so the selection survives the
  // hard reload we trigger on user-switch. Without this block, demo-data.js
  // re-initializes its module-level `currentUser` back to DEMO_ADMIN on
  // every load and the user-switcher silently lies (UI reads "Taylor"
  // because the saved pref is shown, but Academy's role-gated tabs still
  // render the Admin view). We re-fire the demo login route here so
  // demo-data.js's currentUser matches what AcademyDemoBar shows before
  // App.jsx's boot() reads /api/me.
  //
  // Fire-and-forget: demoApiRequest is async (setTimeout(0) inside the
  // route map) but Academy's boot() also runs async (inside a useEffect on
  // mount). The login side-effect typically lands before /api/me is
  // dispatched. Worst case is one frame of admin view before the next
  // render — acceptable for a demo. Failures fall through to the default
  // admin state.
  let savedEmail: string | null = null;
  try {
    savedEmail = window.localStorage.getItem(USER_PREF_KEY);
  } catch {
    /* localStorage unavailable */
  }
  if (!savedEmail) return;
  void replayPersona(savedEmail);
}

async function replayPersona(email: string): Promise<void> {
  try {
    const { demoApiRequest } = await import("./source/demo-data.js");
    const result = (await demoApiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: "academy123" }),
    })) as { token?: string; user?: unknown } | undefined;
    if (result?.token) {
      try {
        window.localStorage.setItem(TOKEN_KEY, result.token);
      } catch {
        /* noop */
      }
    }
  } catch {
    /* login route lookup failed; fall back to default admin state */
  }
}

"use client";

/*
 * AcademyDemoControls.tsx — the single, compact demo-control bar for the
 * embedded Entrata Academy inside OXP Studio > Trainings & SOP > Trainings.
 *
 * Why this lives in the host page (not inside AcademyTab)
 * --------------------------------------------------------
 * The PM wants these controls anchored to the top-right of the main content
 * area (aligned with the host's Trainings/SOPs pill toggle), NOT stacked
 * above the embedded Academy. That position is owned by the host page
 * (app/trainings-sop/page.tsx), so the control bar has to render there.
 *
 * How it drives Academy state without source-edits to App.jsx
 * ----------------------------------------------------------
 * - User switch: same pattern as before — write localStorage.academy_token +
 *   academy_demo_user_email, then full reload. auto-login-demo.ts replays the
 *   chosen persona on every load.
 *
 * - Tier / Release / State: Academy's App.jsx renders these controls inside
 *   .entrata-topbar with React-bound onChange handlers that mutate Academy's
 *   internal useState. host-overrides.css now visually-hides .entrata-topbar
 *   (clip+absolute pattern) but keeps the selects in the DOM, so this
 *   component can:
 *     1. find the hidden selects via DOM query
 *     2. set their .value with the native HTMLSelectElement setter so React's
 *        valueTracker actually fires
 *     3. dispatch a synthetic 'change' Event → Academy's onChange handler
 *        runs → Academy's setState fires → role/release/tier-gated UI
 *        repaints in place (no reload)
 *
 *   This is the cleanest way to get host-level controls that mutate Academy
 *   state without changing App.jsx (sync-back from dev.green stays mechanical).
 *
 * Initial-value sync
 * ------------------
 * On mount, we poll briefly for Academy's hidden selects to exist (Academy
 * is rendered as a sibling component, so its DOM lands a tick or two after
 * ours), read their current values into local state, and from then on this
 * component is the source of truth for what the user sees. If polling never
 * finds the selects (e.g. user is on the SOPs tab and Academy isn't
 * mounted), the controls just render with their defaults — but they only
 * render at all when pageTab === "trainings", so that's a non-issue.
 */

import { useEffect, useRef, useState } from "react";

const DEMO_USERS: Array<{
  email: string;
  label: string;
  role: string;
  locale?: string;
}> = [
  // Source: source/demo-data.js DEMO_USERS_MAP. Keep in dev.green order.
  { email: "admin@sunsetpm.com", label: "Alex Chen", role: "Admin" },
  { email: "morgan.west@sunsetpm.com", label: "Morgan West", role: "Regional VP" },
  { email: "parker.sf@sunsetpm.com", label: "Parker Williams", role: "Property Manager" },
  { email: "taylor.sf@sunsetpm.com", label: "Taylor Brooks", role: "Leasing Agent" },
  { email: "riley.sf@sunsetpm.com", label: "Riley Maintenance", role: "Maintenance Tech" },
  { email: "rafael.sf@sunsetpm.com", label: "Rafael Oliveira", role: "Maintenance Tech (pt-BR)", locale: "pt-BR" },
];

const TOKEN_KEY = "academy_token";
const USER_PREF_KEY = "academy_demo_user_email";
const DEFAULT_EMAIL = "admin@sunsetpm.com";

// `Mode: Live` hides every piece of in-product internal annotation
// chrome — primarily the per-surface engineering-notes banner
// (`.eng-notes-open`) — so PMM/training can record video walkthroughs
// that look like the production GA surface. `Mode: Inspect` is the PM
// default; it surfaces the notes again so the PM/eng team can review
// them inline while building. The select drives a body class
// (`body.academy-demo-mode`) consumed by host-overrides.css; nothing
// inside the synced Academy bundle changes.
const MODE_OPTIONS = [
  { value: "inspect", label: "Inspect" },
  { value: "live", label: "Live" },
];
const MODE_PREF_KEY = "academy_demo_mode";
const DEFAULT_MODE = "inspect";

const RELEASE_OPTIONS = [
  { value: "all", label: "All releases" },
  { value: "MVP", label: "MVP" },
  { value: "1.1", label: "1.1 Visibility + Engagement" },
  { value: "1.2", label: "1.2 Compliance + Automation" },
  { value: "1.3", label: "1.3 AI Differentiators" },
  { value: "1.4", label: "1.4 Enterprise Platform" },
  { value: "1.5", label: "1.5 Digital Adoption" },
  { value: "1.6", label: "1.6 Release-Grouped Changelog" },
  { value: "1.7", label: "1.7 KB Favorites, History & Pop-Out" },
];

const STATE_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "loading", label: "Loading" },
  { value: "error", label: "Error" },
  { value: "empty", label: "Empty" },
];

const TIER_OPTIONS = [
  { value: "elite", label: "Elite" },
  { value: "basic", label: "Basic" },
];

/**
 * Reflect the current tier / release / mode triplet onto <body> classes so
 * host-overrides.css can drive R2-MVP visibility deltas via the cascade
 * (rather than source-patching the synced Academy bundle).
 *
 * Classes applied:
 *   - `academy-tier-basic`     / `academy-tier-elite`
 *   - `academy-release-mvp`    (only when release === "MVP")
 *   - `academy-release-all`    (when release === "all" — i.e., GA preview)
 *   - `academy-release-future` (any non-MVP non-"all" release)
 *   - `academy-demo-mode`      (only when mode === "live")
 *
 * Why on <body> instead of `.academy-deploy-root`: the demo controls
 * render in the host page (a sibling subtree), so writing on the closest
 * shared ancestor — <body> — gives us a single source of truth that both
 * the Academy embed AND any host chrome (e.g. .eng-notes that escapes
 * the deploy-root) can read.
 */
function applyDemoBodyClasses(tier: string, release: string, mode: string): void {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (!body) return;
  body.classList.remove(
    "academy-tier-basic",
    "academy-tier-elite",
    "academy-release-mvp",
    "academy-release-all",
    "academy-release-future",
    "academy-demo-mode",
  );
  body.classList.add(tier === "basic" ? "academy-tier-basic" : "academy-tier-elite");
  if (release === "MVP") body.classList.add("academy-release-mvp");
  else if (release === "all") body.classList.add("academy-release-all");
  else body.classList.add("academy-release-future");
  if (mode === "live") body.classList.add("academy-demo-mode");
}

// Hidden-select selectors. The .release-selector-bar and .sim-bar wrappers
// are both inside .entrata-topbar — Academy renders them on every mount.
// .sim-bar contains TWO selects (State first, Tier second).
const RELEASE_SELECTOR = ".academy-deploy-root .entrata-topbar .release-selector-bar select";
const SIM_BAR_SELECTORS = ".academy-deploy-root .entrata-topbar .sim-bar select";
const SIM_BAR_STATE_INDEX = 0;
const SIM_BAR_TIER_INDEX = 1;

/**
 * Bridge a value change from our visible control over to Academy's hidden
 * select. Uses the React-safe pattern: native HTMLSelectElement value setter
 * (bypasses React's value tracker) + bubbling 'change' event so React's
 * synthetic event system picks it up and re-runs Academy's onChange.
 */
function dispatchSelectChange(selectEl: HTMLSelectElement | null, value: string): boolean {
  if (!selectEl) return false;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
  if (!setter) {
    selectEl.value = value;
  } else {
    setter.call(selectEl, value);
  }
  selectEl.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

interface AcademyDemoControlsProps {
  /**
   * Whether to show the user-persona <select>. Defaults to true (the
   * Trainings & SOP > Trainings surface, where role-switching the demo
   * is core to the demo). Pass false from contexts that are admin-only
   * by design (e.g. Admin Insights > Entrata Academy), where we hard-pin
   * the persona to the admin user upstream and the switcher would only
   * confuse the demo.
   */
  showUserSwitcher?: boolean;
}

export function AcademyDemoControls({ showUserSwitcher = true }: AcademyDemoControlsProps = {}) {
  const [email, setEmail] = useState<string>(DEFAULT_EMAIL);
  const [release, setRelease] = useState<string>("all");
  const [state, setState] = useState<string>("normal");
  const [tier, setTier] = useState<string>("elite");
  const [mode, setMode] = useState<string>(DEFAULT_MODE);

  // The Academy controls take a beat to land in the DOM after this component
  // mounts (because <App /> is a sibling rendered slightly later). Poll for
  // them with rAF a few times so we can capture their initial values into
  // local state. The fallback defaults above are correct for a fresh Academy
  // boot anyway, so failure to find them is non-fatal.
  const synced = useRef(false);
  useEffect(() => {
    if (synced.current) return;
    let cancelled = false;
    let attempts = 0;
    const tick = () => {
      if (cancelled || synced.current) return;
      const releaseEl = document.querySelector(RELEASE_SELECTOR) as HTMLSelectElement | null;
      const simBars = document.querySelectorAll(SIM_BAR_SELECTORS);
      if (releaseEl && simBars.length >= 2) {
        synced.current = true;
        const nextRelease = releaseEl.value;
        const stateEl = simBars[SIM_BAR_STATE_INDEX] as HTMLSelectElement | undefined;
        const tierEl = simBars[SIM_BAR_TIER_INDEX] as HTMLSelectElement | undefined;
        const nextState = stateEl?.value ?? "normal";
        const nextTier = tierEl?.value ?? "elite";
        setRelease(nextRelease);
        setState(nextState);
        setTier(nextTier);
        // Apply body classes immediately on first sync so any MVP/basic
        // hiding lands before the user's first paint of the embed.
        applyDemoBodyClasses(nextTier, nextRelease, modeRef.current);
        return;
      }
      if (attempts++ < 60) {
        // ~1s of polling at 60fps; if Academy still isn't there, give up.
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);

    try {
      const saved = window.localStorage.getItem(USER_PREF_KEY);
      if (saved && DEMO_USERS.some((u) => u.email === saved)) {
        setEmail(saved);
      }
      const savedMode = window.localStorage.getItem(MODE_PREF_KEY);
      if (savedMode && MODE_OPTIONS.some((o) => o.value === savedMode)) {
        setMode(savedMode);
        modeRef.current = savedMode;
      }
    } catch {
      /* localStorage unavailable */
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // Keep `mode` mirrored in a ref so the polling sync above (which fires
  // once and reads its inputs out of closure) can always see the latest
  // mode value when it applies body classes. Without this, a user who
  // saved `mode: "live"` in a prior session would see Inspect-mode
  // notes for ~1s before the next render swaps them away.
  const modeRef = useRef<string>(DEFAULT_MODE);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Reflect every tier/release/mode change onto <body> classes so
  // host-overrides.css can drive MVP visibility deltas. Runs on every
  // change AND on initial mount (so the fallback defaults are applied
  // even if the sync-from-DOM poll above never finds Academy).
  useEffect(() => {
    applyDemoBodyClasses(tier, release, mode);
  }, [tier, release, mode]);

  // Clear our body classes when the component unmounts (e.g. user
  // navigates from /trainings-sop with Trainings active to a route that
  // doesn't render AcademyDemoControls). Otherwise stale classes would
  // sit on <body> and hide elements on unrelated host pages.
  useEffect(() => {
    return () => {
      if (typeof document === "undefined") return;
      document.body?.classList.remove(
        "academy-tier-basic",
        "academy-tier-elite",
        "academy-release-mvp",
        "academy-release-all",
        "academy-release-future",
        "academy-demo-mode",
      );
    };
  }, []);

  async function handleUserChange(nextEmail: string) {
    setEmail(nextEmail);
    if (typeof window === "undefined") return;
    try {
      const { demoApiRequest } = await import("./source/demo-data.js");
      const result = (await demoApiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: nextEmail, password: "academy123" }),
      })) as { token?: string } | undefined;
      const newToken = result?.token ?? "demo-token-embedded";
      window.localStorage.setItem(TOKEN_KEY, newToken);
      window.localStorage.setItem(USER_PREF_KEY, nextEmail);
    } catch {
      try {
        window.localStorage.setItem(USER_PREF_KEY, nextEmail);
      } catch {
        /* noop */
      }
    }
    // Hard reload — role-gated tabs/analytics/recommendations are bound at
    // boot() time, so a soft re-render wouldn't repaint everything.
    window.location.reload();
  }

  function handleReleaseChange(value: string) {
    setRelease(value);
    dispatchSelectChange(document.querySelector(RELEASE_SELECTOR), value);
  }

  function handleStateChange(value: string) {
    setState(value);
    const simBars = document.querySelectorAll(SIM_BAR_SELECTORS);
    dispatchSelectChange(simBars[SIM_BAR_STATE_INDEX] as HTMLSelectElement | null, value);
  }

  function handleTierChange(value: string) {
    setTier(value);
    const simBars = document.querySelectorAll(SIM_BAR_SELECTORS);
    dispatchSelectChange(simBars[SIM_BAR_TIER_INDEX] as HTMLSelectElement | null, value);
  }

  function handleModeChange(value: string) {
    setMode(value);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(MODE_PREF_KEY, value);
    } catch {
      /* localStorage unavailable; class still applies in-session */
    }
  }

  // Shared select base classes — fixed widths per control so the bar stays
  // narrow enough to live in the top-right slot without overlapping the
  // centered Trainings/SOPs pill toggle in the same row. Browser-native
  // <select> respects explicit widths and will truncate long option labels
  // in the closed state; the dropdown still shows full text when opened.
  const selectBase =
    "h-7 rounded-md border border-border bg-background px-1.5 py-0 text-xs text-foreground " +
    "shadow-sm hover:border-foreground/30 focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-1.5 py-1"
      role="group"
      aria-label="Academy demo controls"
    >
      {showUserSwitcher ? (
        <select
          className={`${selectBase} w-[130px]`}
          value={email}
          onChange={(e) => handleUserChange(e.target.value)}
          aria-label="Switch demo user"
          title="Switch demo user"
        >
          {DEMO_USERS.map((u) => (
            <option key={u.email} value={u.email}>
              {u.label} · {u.role}
            </option>
          ))}
        </select>
      ) : null}
      <select
        className={`${selectBase} w-[80px]`}
        value={tier}
        onChange={(e) => handleTierChange(e.target.value)}
        aria-label="Switch tier"
        title="Switch tier"
      >
        {TIER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            Tier: {o.label}
          </option>
        ))}
      </select>
      <select
        className={`${selectBase} w-[90px]`}
        value={release}
        onChange={(e) => handleReleaseChange(e.target.value)}
        aria-label="Filter by release"
        title="Filter by release"
      >
        {RELEASE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        className={`${selectBase} w-[90px]`}
        value={state}
        onChange={(e) => handleStateChange(e.target.value)}
        aria-label="Simulate view state"
        title="Simulate view state"
      >
        {STATE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            State: {o.label}
          </option>
        ))}
      </select>
      <select
        className={`${selectBase} w-[90px]`}
        value={mode}
        onChange={(e) => handleModeChange(e.target.value)}
        aria-label="Demo mode: Inspect shows engineering notes, Live hides them so the embed reads as GA-ready for PMM walkthroughs"
        title="Inspect = show engineering notes, Live = hide them (use Live when recording PMM walkthroughs)"
      >
        {MODE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            Mode: {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

"use client";

/*
 * AcademyTab.tsx — the embedded entry point for Entrata Academy.
 *
 * What this component is
 * ----------------------
 * A thin "use client" wrapper that renders the full Academy SPA inside an
 * existing page surface. The Academy SPA itself lives unmodified at
 * ./source/App.jsx and is a literal sync of the dev.green
 * entrata-academy-deploy prototype.
 *
 * Two modes
 * ---------
 *   - `mode="trainings"` (default): full Academy with all surfaces, MINUS
 *     the "Admin" tab. Used under OXP > Trainings & SOP > Trainings.
 *     The Admin tab moved to OXP > Admin Insights > Entrata Academy as
 *     part of the broader OXP "admin tools live in their own left-nav
 *     entry, not inside each section" reorganization.
 *
 *   - `mode="admin"`: ONLY the Academy Admin surface (trainingTab = "overview").
 *     The tab nav row is hidden via CSS and an effect force-clicks the
 *     Admin tab on mount to drive Academy's internal `trainingTab` state.
 *     Used under OXP > Admin Insights > Entrata Academy.
 *
 * How tab visibility is enforced without source-edits to App.jsx
 * --------------------------------------------------------------
 * Academy's tab buttons (.content-tab) are React-rendered children of
 * #tour-content-tabs and have no per-tab data attribute, so we can't
 * target the Admin tab with pure CSS. The component runs a small JS
 * effect that:
 *
 *   - trainings mode: finds any .content-tab whose text starts with
 *     "Admin" and sets display:none on it. A MutationObserver re-applies
 *     the hide every time Academy re-renders the tab list (e.g. on
 *     tier/release/role change), so the hide is durable across React
 *     re-renders.
 *
 *   - admin mode: finds the same Admin button and calls .click() once
 *     to drive Academy's internal setTrainingTab("overview"). The
 *     content-tabs row itself is hidden via host-overrides.css under the
 *     .academy-mode-admin scope.
 *
 * Responsibilities (intentionally narrow):
 *   1. Side-effect imports — load the scoped Academy stylesheets and host
 *      overrides so Academy renders correctly without leaking styles into
 *      the OXP Studio shell.
 *   2. Pre-render bootstrap — call `seedAcademyDemoSession()` once at module
 *      load on the client. This pre-seeds localStorage.academy_token so
 *      Academy's `if (!token) return <LoginScreen />` gate is bypassed.
 *   3. Wrap the App in `.academy-deploy-root .academy-mode-{mode}` so all
 *      scoped CSS rules and mode-scoped overrides can hang off the right
 *      ancestor.
 *
 * Why a separate file from page.tsx
 * ---------------------------------
 * The Academy bundle is large (charts, rich-text editor, all the SVG
 * icons, the entire LMS state machine). The host page /trainings-sop is
 * already heavy. By making AcademyTab.tsx its own client component,
 * Next.js can code-split. (The current static export doesn't deeply
 * tree-shake at the module boundary, but the structure is there for when
 * we move to a dynamic import / lazy boundary later.)
 */

import { useEffect } from "react";

import "./source/styles.scoped.css";
import "./source/styles/studio.scoped.css";
import "./source/styles/training-ai.scoped.css";
// host-overrides.css must load LAST so its rules win the cascade and the
// duplicate Academy chrome (entrata-topbar, oxp-sidebar, page-header,
// mode-switcher) is hidden inside the OXP Studio surface.
import "./host-overrides.css";

import { App } from "./source/App.jsx";
import { seedAcademyDemoSession } from "./auto-login-demo";

// Runs once on the client when this module is first loaded by the browser.
// On the static-export server pass it's a no-op (typeof window === "undefined").
// We do it at module scope (NOT in a useEffect) so the seed is in place before
// App.jsx's useState initializer reads localStorage on first render — that's
// what prevents the Sign-In screen from flashing for a frame.
seedAcademyDemoSession();

export type AcademyMode = "trainings" | "admin";

interface AcademyTabProps {
  /** Which Academy surface to render. Default "trainings". */
  mode?: AcademyMode;
}

/**
 * True if `btn` is one of Academy's tab buttons AND its label is "Admin"
 * (with optional trailing release-version badge text). We test against
 * the full content-tab signature so we don't accidentally tag the mobile
 * menu's Admin button (.mobile-menu div > button) when present.
 */
function isAdminTabButton(btn: Element): boolean {
  if (!btn.classList.contains("content-tab")) return false;
  const text = btn.textContent?.trim() ?? "";
  // "Admin" alone, or "Admin v1.4" with a release-badge suffix.
  return text === "Admin" || text.startsWith("Admin ");
}

export function AcademyTab({ mode = "trainings" }: AcademyTabProps) {
  // -- Effect: hide the Admin tab in "trainings" mode.
  //
  // Academy's content-tab buttons re-render whenever the user/release/
  // tier/state changes. A MutationObserver on the tab container is the
  // cheapest way to keep the Admin button hidden across those re-renders
  // without us holding stale element refs.
  useEffect(() => {
    if (mode !== "trainings") return;
    const root = document.querySelector(".academy-deploy-root");
    if (!root) return;

    const hideAdminTab = () => {
      root.querySelectorAll(".content-tab").forEach((btn) => {
        if (isAdminTabButton(btn)) {
          (btn as HTMLElement).style.display = "none";
        }
      });
      // Also hide the duplicate Admin entry in Academy's mobile menu, if
      // any. The mobile menu doesn't use .content-tab — it's just plain
      // <button>Admin</button> children of .mobile-menu > div.
      root.querySelectorAll(".mobile-menu button").forEach((btn) => {
        if (btn.textContent?.trim() === "Admin") {
          (btn as HTMLElement).style.display = "none";
        }
      });
    };

    hideAdminTab();
    const observer = new MutationObserver(hideAdminTab);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [mode]);

  // -- Effect: in "trainings" mode, defeat Academy's admin auto-route.
  //
  // The carryover bug
  // -----------------
  // Academy's App.jsx (line 1047-1055) runs an effect on user-load that
  // sets the active top-tab based on role:
  //
  //   if (user.role === "Admin") setTrainingTab("overview")
  //   else if (manager-y role)   setTrainingTab("team")
  //   else                       setTrainingTab("my-learning")
  //
  // The "overview" branch routes admin personas directly into the Admin
  // surface (the same set of workflow sub-tabs that Admin Insights >
  // Entrata Academy exposes). That makes sense for standalone Academy
  // but it's wrong for the OXP > Trainings & SOP > Trainings embed,
  // which by design is the learner / manager surface — Admin sub-tabs
  // belong to Admin Insights now.
  //
  // The CSS rule in rule-9 of host-overrides.css hides the Admin tab
  // BUTTON in trainings mode, but the auto-route still sets the active
  // view to "overview" and the Admin sub-tabs row + content panel
  // render. Net effect: admin personas (Alex Chen · Admin) browsing
  // Trainings & SOP > Trainings see the same admin workflow row they'd
  // see under Admin Insights, no top-tab styled active, and no learner
  // surface visible. Reported by the PM on 2026-05-22 looking at the
  // post-pipeline UI-review screenshots.
  //
  // The fix
  // -------
  // Watch the `.content-tabs` container for class changes (active-tab
  // swaps). When the Admin tab becomes `.active`, click the first
  // non-admin tab to drive Academy's internal `setTrainingTab` back to
  // a learner view. App.jsx's auto-route effect is guarded by a
  // one-shot ref (`initialTabAppliedRef.current`), so once we override
  // it the override sticks — Academy won't re-route to "overview" on
  // subsequent renders unless the entire bundle remounts.
  //
  // Why a MutationObserver rather than rAF polling
  // ----------------------------------------------
  // Academy's initial `useState("my-learning")` makes My Learning
  // briefly active on first mount, BEFORE the user-load effect re-
  // routes to Admin (the user object isn't populated until the auto-
  // login bootstrap resolves, which takes a tick or two). A polling-
  // exit-on-first-active-tab approach saw My Learning active, decided
  // "no carryover needed", and exited — then Admin auto-route fired
  // and the bug came right back. The observer keeps watching until we
  // see Admin actually active (or 5s elapses, meaning the persona
  // isn't admin and the effect is a no-op).
  //
  // Why the click is idempotent and safe to re-fire
  // -----------------------------------------------
  // Clicking the first non-admin tab when Admin is active flips
  // `trainingTab` to "my-learning" (or whatever that tab's value is).
  // The observer re-fires when My Learning becomes active. Our guard
  // checks `isAdminTabButton(activeTab)` before clicking, so a non-
  // admin active tab is a no-op. We also stop observing after 5s as a
  // safety net.
  //
  // What "first non-admin tab" means here
  // -------------------------------------
  // The first `.content-tab` rendered by App.jsx is always "My
  // Learning" (App.jsx ~line 2333). Subsequent tabs depend on role and
  // tier (Catalog, Spotlights, Team, Certifications, Compliance,
  // Analytics, Knowledge Base, What's New, Leaderboard, Admin). For an
  // admin persona on tier=elite the visible order is: My Learning,
  // Learning Catalog, Spotlights, Team, Credentials, Compliance,
  // Knowledge Base, What's New, [Admin — hidden]. So the first
  // non-admin button is always "My Learning", which matches the
  // learner-surface default and is what the PM saw on the SOPs
  // screenshot before the persona switched to Admin.
  useEffect(() => {
    if (mode !== "trainings") return;
    let done = false;
    let observer: MutationObserver | null = null;
    let timeoutId: number | undefined;

    const tryReset = (tabsContainer: Element) => {
      if (done) return;
      const tabs = Array.from(tabsContainer.querySelectorAll(".content-tab"));
      const activeTab = tabs.find((b) => b.classList.contains("active"));
      if (activeTab && isAdminTabButton(activeTab)) {
        const firstNonAdmin = tabs.find((b) => !isAdminTabButton(b)) as
          | HTMLButtonElement
          | undefined;
        if (firstNonAdmin) firstNonAdmin.click();
      }
    };

    const attach = (): boolean => {
      const tabsContainer = document.querySelector(
        ".academy-deploy-root .content-tabs",
      );
      if (!tabsContainer) return false;
      tryReset(tabsContainer);
      observer = new MutationObserver(() => tryReset(tabsContainer));
      // Watch the tabs row only. We need attribute changes (`class`)
      // to catch the `.active` flip, and subtree:true because each
      // tab button is a child of the row.
      observer.observe(tabsContainer, {
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
      });
      return true;
    };

    // Poll for the tabs container to mount, then attach the observer.
    // ~2s cap is enough for Academy's first render plus the auto-login
    // bootstrap on the slowest expected machine.
    let attempts = 0;
    const pollAttach = () => {
      if (done) return;
      if (attach()) return;
      if (attempts < 120) {
        attempts++;
        requestAnimationFrame(pollAttach);
      }
    };
    pollAttach();

    // Stop observing after 5s. If Admin hasn't auto-activated by then
    // the persona isn't admin and the observer would just leak.
    timeoutId = window.setTimeout(() => {
      done = true;
      if (observer) observer.disconnect();
    }, 5000);

    return () => {
      done = true;
      if (observer) observer.disconnect();
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [mode]);

  // -- Effect: in "trainings" mode, hijack the "Manage All Learning Plans"
  //    button so admin personas land in OXP > Admin Insights > Entrata
  //    Academy instead of Academy's internal admin learning-paths surface.
  //
  // Background
  // ----------
  // App.jsx (~line 2712) renders a single button at the bottom of the
  // My Learning > Learning Plans section, gated by isAdmin:
  //
  //   <button onClick={() => {
  //     setTrainingTab("overview");
  //     setAdminSubTab("learning-paths");
  //     loadLearningPaths();
  //   }}>Manage All Learning Plans</button>
  //
  // That click jumps into Academy's internal Admin surface — the one
  // we hide in the trainings embed (host-overrides.css rule 9 hides the
  // Admin tab + the state-carryover effect above force-clicks back to
  // My Learning whenever Academy auto-routes admins to "overview"). So
  // if we let the click through unmodified, the admin user gets routed
  // into a hidden tab → blank panel → confused PM.
  //
  // The right destination for "Manage All Learning Plans" in the OXP
  // embed is /admin-insights/?source=academy (the same admin hub the
  // PM moved here in the Admin tab relocation work). That hub renders
  // the full Academy admin surface inside the host's Admin Insights
  // chrome.
  //
  // Why event delegation in the capture phase
  // -----------------------------------------
  // Academy's React onClick is attached at the root via React's
  // synthetic event delegation. To intercept the click BEFORE React
  // runs the handler, we attach a native listener on
  // .academy-deploy-root in the CAPTURE phase and call
  // stopImmediatePropagation() — that prevents both other listeners
  // AND React's synthetic delegation from seeing the click. Without
  // capture, React fires first and Academy navigates into the hidden
  // Admin surface before our redirect lands.
  //
  // Why this lives in AcademyTab and not in the host page
  // -----------------------------------------------------
  // The button only exists inside the Academy bundle, and only when
  // an admin persona is on the My Learning tab. AcademyTab is the
  // narrowest, mode-aware boundary that always owns this click for
  // the trainings embed. The button's render is gated by `isAdmin`
  // in App.jsx, so non-admin users never see it and we don't need
  // an extra role check here.
  useEffect(() => {
    if (mode !== "trainings") return;
    if (typeof document === "undefined") return;

    const root = document.querySelector<HTMLElement>(".academy-deploy-root");
    if (!root) return;

    const handleClickCapture = (ev: Event): void => {
      const target = ev.target as Element | null;
      if (!target) return;
      // Walk up from the click target up to .academy-deploy-root looking
      // for a button labeled "Manage All Learning Plans". This handles
      // the case where the click lands on a child of the button (icon /
      // text node) rather than the button itself.
      let el: Element | null = target;
      while (el && el !== root) {
        if (
          el.tagName === "BUTTON" &&
          (el.textContent ?? "").trim().toLowerCase().includes("manage all learning plans")
        ) {
          ev.preventDefault();
          ev.stopPropagation();
          if (typeof (ev as Event & { stopImmediatePropagation?: () => void }).stopImmediatePropagation === "function") {
            (ev as Event & { stopImmediatePropagation?: () => void }).stopImmediatePropagation!();
          }
          // Persist the source choice so when Admin Insights renders
          // it lands on Entrata Academy (and not the default Experts
          // source). admin-insights/page.tsx reads this on mount.
          try {
            window.localStorage.setItem("admin_insights_source", "academy");
          } catch {
            /* localStorage unavailable — Admin Insights will start on
             * the default source, query string would be nicer here but
             * the host page doesn't read one today. */
          }
          window.location.href = "/admin-insights/";
          return;
        }
        el = el.parentElement;
      }
    };

    root.addEventListener("click", handleClickCapture, /* capture */ true);
    return () => {
      root.removeEventListener("click", handleClickCapture, /* capture */ true);
    };
  }, [mode]);

  // -- Effect: in "admin" mode, force Academy's internal trainingTab to
  // "overview" by clicking the Admin button once after it lands in the
  // DOM. Polling with requestAnimationFrame (max ~1s) handles the case
  // where this effect runs before Academy's first render lays down the
  // tab buttons.
  useEffect(() => {
    if (mode !== "admin") return;
    let cancelled = false;
    let clicked = false;
    const tick = (attempts: number) => {
      if (cancelled || clicked) return;
      const root = document.querySelector(".academy-deploy-root");
      if (root) {
        const adminBtn = Array.from(root.querySelectorAll(".content-tab"))
          .find(isAdminTabButton) as HTMLButtonElement | undefined;
        if (adminBtn) {
          if (!adminBtn.classList.contains("active")) {
            adminBtn.click();
          }
          clicked = true;
          return;
        }
      }
      if (attempts < 60) {
        requestAnimationFrame(() => tick(attempts + 1));
      }
    };
    requestAnimationFrame(() => tick(0));
    return () => {
      cancelled = true;
    };
  }, [mode]);

  return (
    <div className={`academy-deploy-root academy-mode-${mode}`}>
      <App />
    </div>
  );
}

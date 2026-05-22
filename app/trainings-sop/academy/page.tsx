"use client";

/*
 * /trainings-sop/academy — Entrata Academy LMS, embedded as a sibling route
 * inside the OXP Studio prototype.
 *
 * Strategy notes (full rationale in the original merge-prep docs):
 *   1. Single-page state-model port (Path A.1). The entire App.jsx state
 *      machine is preserved as-is. Navigation inside Academy stays internal
 *      React state — we don't promote Academy's surfaces to App Router routes.
 *      That's a follow-up if/when bookmarkable URLs become a requirement.
 *
 *   2. CSS is scoped via the `.academy-deploy-root` wrapper. The original
 *      Academy styles redefine :root / body / button etc. globally, which
 *      would clobber the OXP Studio shadcn theme. The companion
 *      `scope-css.mjs` script rewrites every selector so it only applies
 *      under that wrapper. Re-run that script after every dev.green sync.
 *
 *   3. RichTextEditor.jsx is a TipTap shim — the OXP prototype already ships
 *      TipTap at components/ui/rich-text-editor, so we don't pay for a second
 *      editor bundle. TinyMCE is gone.
 *
 *   4. Backend reachability: Academy normally hits the Entrata Core PHP API
 *      at https://entrata.localhost via NEXT_PUBLIC_ACADEMY_API_URL. In the
 *      static-export OXP prototype, that env var is not set in production
 *      builds, so demo-data.js's `isDemoMode()` returns true and the app
 *      renders against the in-bundle demo dataset. To wire a real backend
 *      locally, export NEXT_PUBLIC_ACADEMY_API_URL before `npm run dev`.
 *
 *   5. AppShell chrome (the OXP Studio sidebar / top bar) wraps this page
 *      from app/layout.tsx. Academy's own internal nav still renders too,
 *      so users see both shells. That's an explicit tradeoff for the first
 *      merge — collapsing to a single chrome is a follow-up CSS pass.
 */

import "./source/styles.scoped.css";
import "./source/styles/studio.scoped.css";
import "./source/styles/training-ai.scoped.css";
// host-overrides.css loads LAST so its rules win the cascade and Academy's
// duplicate chrome (entrata-topbar + oxp-sidebar) is hidden inside the OXP
// Studio AppShell.
import "./host-overrides.css";

import { App } from "./source/App.jsx";

export default function AcademyPage() {
  return (
    <div className="academy-deploy-root">
      <App />
    </div>
  );
}

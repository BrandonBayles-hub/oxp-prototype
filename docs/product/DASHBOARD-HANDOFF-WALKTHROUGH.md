# Dashboard Creator Handoff — User Walkthrough

**Status:** walkthrough / demo script
**Owner:** Devon Christensen
**Last updated:** 2026-06-03
**Audience:** PMs, demo presenters, GTM, anyone learning the Entrata Analyst → Analytics Platform handoff

> This is the user-facing companion to the design doc
> [`ENTRATA-ANALYST-AND-ANALYTICS-PLATFORM-HANDOFF.md`](./ENTRATA-ANALYST-AND-ANALYTICS-PLATFORM-HANDOFF.md).
> It walks the experience step by step from the user's point of view. The design
> doc covers the *why* and the *wiring*; this doc covers the *what the user sees*.

---

## The one-line story

A user explores conversationally in **Entrata Analyst** (the "Ask" layer), gets a
table/chart/KPI answer, and with one action promotes that answer into the
**Analytics Platform** (the governed "Build" layer) — landing in their personal
**My Workspace**, their **Team** space, or the shared **Company Menu** — without
rebuilding anything by hand.

```
Ask in Analyst  →  Get an artifact  →  Send to Analytics Platform  →  Governed, re-runnable report
```

---

## Prerequisites (for demos)

- The **"Send to Analytics Platform"** demo toggle must be **on**. It lives in the
  top-nav **Demo** dropdown (`components/app-shell/entrata-top-nav.tsx`).
- The Analytics Platform should be reachable (locally `http://127.0.0.1:3001`).
- The handoff button only appears on **analytics artifacts** (table, bar chart,
  line chart, KPI strip) — not on a `draft-email` artifact.

---

## Step 1 — Ask a data question

In the Entrata Analyst chat, the user asks something analytical, e.g.:

> "Show delinquency by region over the last 6 months."

The Analyst (TextQL-style generative flow) resolves the metric + scope and replies
with an **artifact** rendered inline in the chat bubble — a table, a bar/line chart,
or a KPI strip.

## Step 2 — Trigger the handoff

There are two ways in:

1. **Button** — every eligible artifact has a **Send to Analytics Platform** action
   (the share icon) in its header action row, alongside Save / Copy / Export.
2. **Natural language / command** — the user can type in chat:
   - `/send-to-analytics`, or
   - phrases like *"save this to my workspace"*, *"add to company menu"*,
     *"publish this to the library"*.

   The chat grabs the **most recent eligible artifact** and opens the same dialog.

## Step 3 — Configure the report (the dialog)

A dialog titled **"Send to Analytics Platform"** opens with four decisions:

| Field | What it does |
|---|---|
| **Name** | Pre-filled from the artifact title + scope (e.g. *"Delinquency by Region — Southeast"*). Editable. |
| **Where should this live?** | Three tiles: **My Workspace** (personal), **My Team**, **Company Menu**. Choosing Company Menu reveals a **folder picker**. |
| **Data binding** | **Snapshot** (v1.0–v1.2): freezes the exact numbers the Analyst returned, rendered as markdown. **Live metrics** (V1.3 preview): maps to real Analytics Platform metric slugs so the report re-runs against live data. |
| **Preview dashboard source** | Expandable panel showing the exact dashboard DSL that will be sent. |

In **Live metrics** mode, the dialog shows green chips for each successfully mapped
metric and an amber note listing any labels not yet in the shared data dictionary
(a forward-looking V1.3 concept — see the design doc).

## Step 4 — Send

The user clicks **Send to Analytics Platform**. The report is delivered to the
platform, and the dialog flips to a confirmation screen:

> ✅ **Sent to My Workspace** — *"Delinquency by Region — Southeast"* will appear
> in your My Workspace.

From there:
- **Open in Analytics Platform** — jumps to the library / company menu.
- **View library** — opens the report library.

> **Known limitation:** because the Analyst prototype is a static export, delivery
> uses an opaque (`no-cors`) POST. The platform creates the report successfully, but
> the Analyst can't read back the new report's exact ID — so the success links go to
> the **library / company menu**, not a deep link to the brand-new report. This is
> documented in the design doc's Implementation Status section.

## Step 5 (optional) — "Continue building" instead of finishing

Rather than sending a finished artifact, the user can click **Continue building**.
This opens the Analytics Platform's **create-report composer pre-seeded with the
original question** — handing off the *intent* rather than the *result*, so the user
keeps editing in the Build layer.

---

## What the user gets out of it

- **No rebuild.** The good answer they found by asking is promoted as-is.
- **Governance.** It becomes a re-runnable, shareable report in a governed library.
- **Choice of audience.** Personal (My Workspace), Team, or org-wide (Company Menu).
- **A path to live data.** Snapshot today; live-metric binding as V1.3 unifies the
  data sources and dictionary across the two products.

---

## Where this lives in code

| Piece | File |
|---|---|
| Dialog UI | `components/entrata-experts-v2/chat/send-to-analytics-dialog.tsx` |
| Handoff lib (DSL, delivery, deep links) | `lib/entrata-experts-v2/analytics-handoff.ts` |
| Metric mapping (labels → AP slugs) | `lib/entrata-experts-v2/metric-map.ts` |
| Context provider + dialog host | `lib/analytics-handoff-context.tsx` |
| Artifact button | `components/entrata-experts-v2/chat/artifact.tsx` |
| Chat command interception | `components/entrata-experts-v2/chat/chat-view.tsx` |
| Demo toggle | `components/app-shell/entrata-top-nav.tsx` |

## Related docs

- [`ENTRATA-ANALYST-AND-ANALYTICS-PLATFORM-HANDOFF.md`](./ENTRATA-ANALYST-AND-ANALYTICS-PLATFORM-HANDOFF.md) — full design + technical contract
- [`ENTRATA-EXPERTS-KNOWLEDGE-BASE.md`](./ENTRATA-EXPERTS-KNOWLEDGE-BASE.md) — prototype-wide knowledge base

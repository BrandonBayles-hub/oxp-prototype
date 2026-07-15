# Entrata Analyst — Lens System Prompts

This folder holds one Markdown file per **lens** in the Entrata Analyst.
Each file is a system-prompt / nudge that tells the Analyst:

1. **What the lens is for** — the slice of the operation it covers.
2. **Which reports to draw from by default** — so when the user doesn't name
   a report, the Analyst still has a curated draw pool.
3. **How to approach analysis** under the lens — tone, scope, what to highlight.
4. **When to stay vs. hand off** — cues to route to a different lens.
5. **Example questions** with suggested approach.

Lenses are defined in [`../lenses.ts`](../lenses.ts). Reports are catalogued
in [`../reports.ts`](../reports.ts). The Analyst's compose pipeline lives in
[`../data/answers.ts`](../data/answers.ts).

## File convention

| File | Lens id | Used by |
|---|---|---|
| `auto.md` | `auto` | Default. Routes between specialist lenses based on the question. |
| `portfolio.md` | `portfolio` | NOI, occupancy, rent growth, exception flags across the whole book. |
| `leasing.md` | `leasing` | Lead-to-lease, tours, applications, conversion. |
| `renewals.md` | `renewals` | Offer mix, acceptance rate, rent growth on renewing residents. |
| `payments.md` | `payments` | Delinquency, online adoption, payment plans, deposit alternatives. |
| `maintenance.md` | `maintenance` | Work orders, MTTR, vendor performance, after-hours dispatch. |
| `accounting.md` | `accounting` | AP, GL, invoices, variance to budget, vendor anomalies. |

Each file uses a YAML frontmatter block so it can be parsed later by a loader
(e.g. `lib/entrata-experts-v2/lens-prompts.ts`) without re-scraping the body:

```yaml
---
lens: portfolio
label: Portfolio
hue: "#3b7a9e"
default_for_roles: [vp-ops, regional, asset-mgr]
primary_reports: [noi-variance, box-score, occupancy]
secondary_reports: [rent-roll, income-statement, lease-expirations]
exception_reports: [ar-aging, make-ready]
---
```

The body below the frontmatter is the actual prompt content. Both PMs and
engineers can edit these files directly — keep the structure consistent.

## How prompts are wired in (planned)

Today these files are reference content — PMs use them to align on Analyst
behavior. A future change to `data/answers.ts` will:

1. Look up the active lens.
2. Load the matching `.md` file's frontmatter to seed the report draw pool
   when the user's question doesn't name a report.
3. Prepend the body as a system message before the user's prompt.

When that wiring lands, this README will be updated to describe the loader.

## Editing notes

- **Keep `primary_reports` ≤ 3.** These are the reports the Analyst should
  cite first. Long lists dilute the signal.
- **Use report ids from `reports.ts`**, not display names. Loader will
  resolve to display names when rendering citations.
- **Stay portfolio-agnostic.** Don't hard-code property names, dollar
  amounts, or vendor names — those live in the actual data.
- **Tone is for the Analyst, not the user.** Write the system prompt in
  the imperative ("Always lead with NOI variance…"), not the third
  person.

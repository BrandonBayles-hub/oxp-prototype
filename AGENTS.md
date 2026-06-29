# OXP Prototype — ELI+ Setup

## What this project is

A Next.js/React/TypeScript/Tailwind prototype of the **ELI+ Setup** feature for Entrata's OXP Studio. It's a guided onboarding flow that walks property management companies through configuring Leasing AI, Payments AI, Maintenance AI, and Renewals AI before those products go live.

This prototype was built to production-spec quality to drive a Jira Epic (DEV-283088). When answering questions, treat it like a real production codebase — not a throwaway proof-of-concept.

## Where the feature lives

Everything for ELI+ Setup is in `/components/eli-plus-setup/`. The entry point is at `/getting-started` in the app.

## Key files

| File | Role |
|---|---|
| `components/eli-plus-setup/index.tsx` | Root component — all global state, tab routing |
| `components/eli-plus-setup/pages/OverviewPage.tsx` | Dashboard: progress cards + action item cards |
| `components/eli-plus-setup/pages/CompanyPage.tsx` | Carrier Compliance tab (most complex — 10DLC/Twilio) |
| `components/eli-plus-setup/pages/CommunicationsPage.tsx` | SMS number assignment per property |
| `components/eli-plus-setup/pages/EmailPage.tsx` | Email integration |
| `components/eli-plus-setup/components/HybridShell.tsx` | Left sidebar nav + portfolio progress bar |
| `components/eli-plus-setup/components/TaskSheet.tsx` | Reusable right-sidebar for action cards |
| `components/eli-plus-setup/components/TenDlcSheetContent.tsx` | "Add a Privacy Policy" sidebar |
| `components/eli-plus-setup/components/CarrierComplianceSheetContent.tsx` | Carrier sim action sidebars |
| `components/eli-plus-setup/components/GlobalToast.tsx` | Top-center toast notifications |

## State architecture

All ELI+ Setup state lives in `index.tsx` and flows down via props. Key state:

- `simMode: "none" | "missing" | "rejected"` — carrier compliance simulation
- `privacyPublished: boolean` — privacy policy completion
- `emailComplete: boolean` — email integration done
- `commsComplete: boolean` — carrier compliance + SMS done  
- `ivrComplete: boolean` — IVR code set
- Per-property settings (rent dates, payment options, escalation numbers, etc.)

## Mock data

All data is currently hardcoded. The HANDOFF.md lists every field and its real data source in Entrata (Merchant Services, Client Admin, Communications tables, property DB).

## Design patterns to follow

- **Action cards → right sidebar**: Never redirect to another tab. Always open `TaskSheet`.
- **Toasts**: Always use `GlobalToast` or `fixed top-4 left-1/2 -translate-x-1/2` positioning.
- **Buttons with dependencies**: Disabled state + hover tooltip explaining what's needed.
- **Required fields with no defaults**: `messageFrequency` and retention fields — intentional, legal requirement.
- **Info icons**: `LabelWithInfo` component with dynamic tooltip positioning (viewport-aware).

## Tech stack

- Next.js 15 (App Router, `output: "export"`)
- React 19
- TypeScript (strict)
- Tailwind CSS v4
- shadcn/ui components
- Lucide React icons

## Deployment

GitHub Pages via `proto.yml` workflow. Build: `next build` → `./out/`. Auto-deploys on push to `main`.

Live: https://probable-dollop-7ppnpwg.pages.github.io/getting-started

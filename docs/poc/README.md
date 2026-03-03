# POC (Proof of Concept)

**Goal:** A single, navigable app where you can **view and access most functionality** — all major pages and patterns from **docs/product/APP-PAGES-AND-GOALS.md**, with mock data and no real backend. Use it to validate layout, navigation, and design before building Entrata, Workato, and agent integrations.

## Contents

- **POC-BUILD-PLAN.md** — Meticulous, chunked build plan: scaffold → app shell → responsive sidebar → routes → each page in order. Each chunk is sized to avoid timeouts; execution rules and a full checklist ensure no planned piece is missed. Follow it step-by-step to build the POC.

## Stack (POC)

- Next.js (App Router), React, TypeScript, Tailwind, shadcn/ui
- Fonts: Nohemi (headers), Inter (body)
- Assets: `assets/entrata-cube.svg`, `assets/eli-plus-cube.svg`
- Data: mock only (in code or static JSON)

## After the POC

Once the POC is complete (all chunks and checklist items done), the next step is to replace mock data with real APIs and services per **docs/architecture/TDD-ARCHITECTURE.md** Phase 1 (Vault, Entrata, agents, Escalations).

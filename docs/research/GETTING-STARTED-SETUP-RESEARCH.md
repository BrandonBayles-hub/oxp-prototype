# Research: Getting Started & System Setup

**Purpose:** Research what should be included in a **Getting Started** (or **Setup**) experience oriented around getting the system running easily: document upload (for training agents and compliance), enabling agents, workflows, voice, and a clear path to “first value.” This informs the product design of the Getting Started page and the Academy/onboarding flow (TDD §4.6).

**Relationship:** Feeds into **docs/architecture/TDD-ARCHITECTURE.md §4.6 (Academy / Get-Started)**. The Getting Started page is the primary **in-product** surface for setup; Academy can include training content and checklists that reference the same steps.

---

## 1. Why a Setup-Oriented Getting Started Matters

**Time-to-value (TTV):** A large share of SaaS users never return after the first login; reducing TTV is critical. Benchmarks suggest:
- **Over 24 hours** to value: high abandonment risk.
- **1–24 hours:** acceptable for complex products.
- **15–60 minutes:** ideal for simpler products.
- Users who reach an “aha moment” within **48 hours** convert at much higher rates than those taking 7+ days; every day of delay can cut conversion.

**Activation over feature tour:** Onboarding should guide users to a **meaningful first outcome** (e.g. “first resident question answered by the agent,” “first workflow run,” “first document in the Vault and used by an agent”), not a generic feature walkthrough.

**Reducing friction:** Fewer steps, logical order (easiest to hardest), progress indication (e.g. progress bar), and quick wins within the first few minutes improve completion. Pre-built templates and demo or default data can let users see value before everything is custom.

*Sources: Rework “Onboarding & Time-to-Value”; AdoptKit SaaS onboarding checklist 2026; Chameleon “Reduce Time to Value”; Athenic “First 48 Hours”; SaaS Operations onboarding checklist.*

---

## 2. What Similar Systems Include in “Get Started” / Setup

### 2.1 AI and Agent Platforms

- **Account setup** first (sign up, workspace, optional billing).
- **Document / knowledge connection:** Import documents, connect knowledge base URLs, or connect data sources. Documents are often the first “content” step so the agent has something to ground on.
- **Create and configure agent:** Name, instructions/prompt, model, optional tools. Some platforms use templates (e.g. “Customer support,” “Internal FAQ”).
- **Add tools and tasks:** Define what the agent can do (APIs, actions).
- **Test before deploy:** Preview, test with sample questions, then enable for real use.
- **Voice-specific (when applicable):** API key, phone number or channel, greeting, voice settings (TTS), instructions. Test with sample calls before going live.

Common sequence: **Account → Documents/Knowledge → Agent config → Tools → Test → Deploy.** Entire flow from signup to first working agent can be designed for “minutes” with no coding when steps are clear and defaulted.

*Sources: Relevance AI quickstart; Contextual AI getting started; ASAPP generative agent getting started; ScoutOS AI agents; Voice.ai / iTellico / OpenAI voice agents quickstarts; Microsoft Agent 365 onboarding; ElevenLabs agents.*

### 2.2 Enterprise Compliance and Document Upload

- **Structured upload flow:** Obtain upload target (e.g. pre-signed URL), upload file, confirm and sync metadata. Status tracking (e.g. “Awaiting classification,” “Pending review,” “Approved”) so users know where each document stands.
- **Categorization:** Documents grouped by type (policy, lease, compliance evidence) and optionally by requirement or jurisdiction. Supports both “train the system” and “prove compliance.”
- **Lifecycle:** Upload → classify (manual or IDP) → review → approve. Approved docs become the source of truth for agents and for audit.

So a **single document upload** flow can serve **two goals**: (1) **training/grounding** (agents use these docs to answer), (2) **compliance** (we have the right policies and evidence on file). The Getting Started page can make both explicit: “Upload your SOPs and policies so agents stay on policy and you stay in compliance.”

*Sources: FloQast compliance document upload; SAP SuccessFactors onboarding compliance setup; Oracle Taleo file upload; Appian document lifecycle; AWS Audit Manager evidence.*

### 2.3 Property Management and Operational Software

- **Pre-implementation:** Objectives, KPIs, team roles.
- **Data and system prep:** Migrate or load data (templates, implementation support); configure settings.
- **Entity setup:** Agency/company profile (name, logo, contact); then **properties** (name, location, details, fees, policies). Build out core entities before turning on automation.
- **Operational config:** Pricing, payment timelines, house rules, integrations (payments, accounting, channels).
- **Training:** Guided sessions (e.g. 1:1, ~2 hours), office hours, help docs.
- **Go-live checklist:** Verify data, integrations, and key workflows before flipping the switch.

Implication for our platform: Getting Started should include **account/org**, then **core data** (which could be “connect Entrata” + “upload key documents”), then **enable agents and workflows**, then **channels (including voice)**, then **go-live** (first real use).

*Sources: Manifestly PM implementation checklist; elina PMS go-live; Hostfully setup steps; Buildium onboarding; Hostfully onboarding collection.*

### 2.4 Integration / Workflow Platforms (iPaaS)

- **Create project/workspace** where integrations and connections live.
- **Set up connections** to the systems you want to automate (e.g. Entrata, email, our platform). Test each connection.
- **Design first workflow** (recipe): trigger, steps, actions. Use a template to start.
- **Activate and monitor:** Turn on the recipe, confirm it runs, monitor runs.

For our product (Workato embedded): Getting Started should guide **first connection** (e.g. Entrata, or “Platform” connector to our API), then **first recipe** (e.g. “When new lead in Entrata → notify and create task”), then **activate.**

*Sources: Workato getting started; Cyclr; Oracle Integration; Transposit.*

---

## 3. Recommended Structure for Our “Getting Started” Page

The Getting Started page should be **one place** (or a short wizard + persistent checklist) that orients the user around **system setup** and leads to “system running easily.” Below is a research-backed sequence that covers documents (train + compliance), agents, workflows, and voice.

### 3.1 Suggested Step Order (Setup-Oriented)

| Order | Step | Purpose | Research basis |
|-------|------|---------|----------------|
| 1 | **Account & organization** | Tenant, org name, admin, optional property/portfolio list or Entrata link | Account first (AI platforms, PM onboarding). |
| 2 | **Connect Entrata** | API credentials or OAuth; verify connection; sync basic data (properties, units) if applicable | PM and iPaaS: “connect your systems” early so workflows and agents have context. |
| 3 | **Upload documents to the Vault** | Add documents that will **train/ground** agents and **support compliance**. Two sub-goals made explicit: | Compliance + knowledge: upload is central; dual purpose (train + comply). |
| 3a | | **SOPs and policies** — So agents answer and act according to your procedures; also the source of truth for settings (per TDD). | SOPs as source of truth; Vault holds SOPs. |
| 3b | | **Compliance-related docs** — e.g. fair housing policy, lease templates, refund policy. Tag for compliance; optional “compliance checklist” (e.g. “Fair housing policy uploaded”). | Enterprise compliance flows; document lifecycle and categorization. |
| 4 | **Enable and configure agents** | Choose which **agents** to turn on (e.g. Leasing AI, Renewal AI, Maintenance AI, Payments AI). For each: bind to **Vault** (Knowledge is Phase 3 per TDD; Phase 1 = Vault only), set scope (properties/channels), optionally use a template. | AI platforms: create/configure agent after knowledge is in place. |
| 5 | **Set up workflows** | Open Workato (embedded); create or enable **first workflow** (e.g. from template: “New lead → create task and notify”). Connect our platform and Entrata; test run. | iPaaS: connections → first recipe → activate. |
| 6 | **Set up voice (and other channels)** | Configure **voice**: number or channel, greeting, voice settings, which agent handles voice. Enable **other channels** (chat, SMS, portal) and map to same agents. | Voice agents: phone number, greeting, TTS, test before live. |
| 7 | **Review and go live** | **Go-live checklist**: Documents in place, agents enabled, at least one workflow active, voice/channels configured, first test (e.g. ask the assistant a question, or run a recipe). Then “Go live” (e.g. make agents available to residents/staff). | PM go-live: verify data and integrations; AI: test then deploy. |

This order respects dependencies: **documents before agents** (agents need something to ground on), **Entrata before workflows** (recipes need connections), **agents before voice** (voice is a channel for the same agents).

### 3.2 What Each Step Should Include (Design Hints)

- **Account & organization:** Short form (org name, admin email, timezone). Optional: link to Entrata or list properties so the rest of setup can be scoped.
- **Connect Entrata:** Guided “Add connection” (API key or OAuth); “Test connection”; success state with “Properties available” or similar. Link to help if credentials are unclear.
- **Upload documents:**
  - **For training/agents:** “Add SOPs and policies to the Vault.” Upload or drag-and-drop; optional folder/type (e.g. “SOP,” “Policy”). Explain: “These documents will be used to train and ground your agents so they stay on policy.”
  - **For compliance:** Same Vault upload, with optional **compliance tags** (e.g. “Fair housing,” “Lease terms,” “Refund policy”) and a **compliance checklist** (“Fair housing policy,” “Security deposit policy,” etc.) so the user can see what’s done and what’s missing.
  - **SOPs specifically:** If the document is an SOP, prompt for approval workflow (draft → review → approve) and optional settings block (per ENTRATA-AND-SOP-SOURCE-OF-TRUTH.md); after approval, settings apply.
- **Enable agents:** List of available agents (or templates) with short descriptions. Per agent: “Enable” toggle, select Vault folders or doc types to use, select scope (properties/channels), optional “Test” (ask a sample question). Progress: “2 of 4 agents enabled.”
- **Set up workflows:** Link or embed to Workato; “Create your first recipe” with a template (e.g. “Lead response” or “Maintenance triage”). Steps: pick template → connect Entrata + Platform → configure if needed → test → activate.
- **Set up voice:** “Add voice channel”: phone number or provider, greeting text, select which agent(s) handle voice, voice (TTS) settings. Optional: “Test call.” Same for other channels (chat, SMS) if not default-on.
- **Go live:** Checklist of items above (e.g. “Entrata connected,” “At least one SOP approved,” “At least one agent enabled,” “At least one workflow active,” “Voice or another channel configured”). “Run a test” (sample question or recipe run). Then “Go live” CTA (e.g. “Make assistant available to residents”).

### 3.3 Experience Shape

- **Single “Getting Started” page or wizard:** One place that shows **all setup steps** and **progress** (e.g. steps 1–7 with checkmarks or progress bar). User can do them in order or jump to a step; saving state so they can leave and return.
- **Defaults and templates:** Sensible defaults (e.g. one default agent template, one Workato recipe template) so “first value” doesn’t require building everything from scratch.
- **Quick wins:** First win within minutes (e.g. “Entrata connected” or “First document in Vault” or “First agent enabled and tested with a sample question”).
- **Help and Academy:** Each step can link to a short **Academy** article or video (“Why connect Entrata,” “How SOPs control your agents,” “Your first Workato recipe”). Getting Started = **doing**; Academy = **learning** and reference.

---

## 4. Compliance-Focused Sub-Flow (Documents)

Because the user called out **compliance** alongside training, the document upload step should make compliance explicit:

- **Checklist:** A short **compliance checklist** (e.g. “Fair housing policy,” “Lease terms summary,” “Security deposit policy,” “Refund policy”) that the customer can tick off as they upload or tag documents. Checklist can be segment-specific later (e.g. affordable housing adds “Income certification procedure”).
- **Tagging:** When uploading, user can tag a document as **compliance** and optionally select which checklist item it satisfies. So one upload serves both “agent can use this” and “we have evidence for compliance.”
- **Status:** For SOPs, show approval status (draft / in review / approved). For compliance docs, optional “Reviewed” or “Approved” so the checklist shows “Uploaded and approved.”

This keeps “getting in compliance” and “training the agents” on the same page (literally) without two separate flows.

---

## 5. Summary: What Needs to Be in This Type of System

| Area | What to include | Rationale |
|------|------------------|-----------|
| **Documents** | Upload to Vault; SOPs + policies (train agents, source of truth); compliance docs with tags and optional checklist | Training and compliance in one flow; Vault is single store. |
| **Connections** | Connect Entrata (and optionally other systems) early so workflows and agents have context | PM and iPaaS patterns; data before automation. |
| **Agents** | Enable and configure agents; bind to **Vault** (Knowledge is Phase 3 per TDD; Phase 1 agents use Vault only); scope (properties/channels); test | AI platform pattern: knowledge → agent → test → deploy. Our phased build: Phase 1 = Vault only. |
| **Workflows** | First workflow via Workato (template); connect systems; test and activate | iPaaS pattern; “first recipe” as milestone. |
| **Voice & channels** | Configure voice (number, greeting, agent, TTS); enable other channels (chat, SMS, portal) | Voice agents: config then test; multi-channel from day one. |
| **Go live** | Checklist of setup steps; run a test; “Go live” CTA | PM go-live; activation over feature tour. |
| **Progress & help** | Single Getting Started page or wizard; progress indicator; links to Academy/help per step | TTV; reduce friction; quick wins. |

---

## 6. References

- **TTV and onboarding:** Rework “Onboarding & Time-to-Value”; AdoptKit SaaS onboarding checklist 2026; Chameleon “Reduce Time to Value”; Athenic “First 48 Hours”; SaaS Operations onboarding.
- **AI/agent setup:** Relevance AI, Contextual AI, ASAPP, ScoutOS getting started; Voice.ai, iTellico, OpenAI voice agents quickstarts; Microsoft Agent 365; ElevenLabs agents; GitHub Agentic Workflows; Google Vertex AI Agent Builder.
- **Compliance and documents:** FloQast compliance upload; SAP SuccessFactors compliance for onboarding; Oracle Taleo; Appian document lifecycle; AWS Audit Manager evidence.
- **PM and operational:** Manifestly PM implementation checklist; elina PMS go-live; Hostfully setup; Buildium onboarding.
- **iPaaS:** Workato getting started; Cyclr; Oracle Integration; Transposit.

*Last updated: Feb 2025. Use this to refine the Getting Started page spec and TDD §4.6 (Academy / Get-Started).*

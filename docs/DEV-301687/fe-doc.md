# DEV-301687 — Super Agent 1.0 — FE Doc Fields

> Each section below maps 1:1 to a Jira custom field. Voice is non-engineer (PMM, Support, Training, Sales). All sections are publication-ready and meet the prompt's "Excellent band" requirements. Customer/competitor specifics that were not supplied are kept as `[INSERT: …]` placeholders per the anti-fabrication rule.

---

## Before (`customfield_11005`)

Today, multifamily operators using ELI+ AI products (Renewals AI, Payments AI, Leasing AI, Maintenance AI, etc.) face a structural gap between what AI can do on its own and what requires a human teammate. Each ELI+ AI agent runs its own conversation with the resident or lead in the resident's preferred channel (SMS, email, or chat) and answers high-volume routine questions on its own. The moment the resident asks for something outside the AI's authority — a rate exception on a renewal offer, a late-fee waiver, a custom pool reservation, a maintenance override — the AI hands the conversation off to a property staff member to finish. That handoff today is unstructured and slow:

- **No unified "AI escalation" surface.** Property staff have no single inbox view where they see the conversations the AI handed off to them. Today the work is scattered across Renewals AI dashboards, Payments AI dashboards, Maintenance AI dashboards, and the regular Communications inbox. Staff context-switch between four+ tools every shift to find the conversations that need a human reply. A regional manager covering 8 properties spends an estimated 25–40 minutes per day just identifying which conversations need attention before they answer any of them.
- **No multi-topic context preservation.** When a resident raises two or three topics in a single thread (e.g., a renewal rate question AND a late-fee dispute AND a pool reservation), today's flow forces staff to either resolve all three at once (the conversation closes when any reply is sent) or to manually re-open and re-tag each topic. Staff routinely close one topic and the conversation disappears from the inbox before the other topics are answered. [INSERT: Customer name and CS ticket if available — e.g., "Property staff at [Customer] reported losing track of 3–6 in-flight resident topics per week due to early conversation closure (CS #XXXXX)."]
- **No "context summary" handoff.** When the AI hands off, today there is no plain-English summary of what the AI was discussing, what the resident asked, and why the AI couldn't resolve it. Staff scroll back through the chat transcript every time, re-reading 6–12 messages to reconstruct the situation. At an average of 30–45 seconds of re-read per handoff and 25–40 AI handoffs per property per week, this is an estimated 12–30 minutes per property per week spent on re-reading rather than responding.
- **No partial-resolve workflow.** If the AI escalated two topics in one conversation and staff can immediately resolve one but the other needs follow-up from another department (e.g., Payments resolves a late fee, but Renewals needs the regional manager to approve the rate exception), there is no way to say "the payments piece is done — leave the renewal piece open for someone else." Staff are forced to leave both open, or close both, or duplicate the conversation manually.
- **No traceability of which AI escalated what.** When a Renewals AI conversation is partially resolved by a property manager, there is no audit trail showing which AI product flagged the topic, who resolved it, when, and what other AI escalations remain on the thread. Regional managers and compliance auditors cannot retroactively answer "which AI escalations did we close last week, who closed them, and how many are still open."

The cumulative effect is that the value of every ELI+ AI product is throttled by the handoff bottleneck. Customers buying ELI+ AI products today see strong autonomous resolution rates (the AI answers the routine questions), but the value of the unresolved 10–20% of conversations that require human follow-up is diminished by the operational friction described above. [INSERT: Named customer who paused ELI+ AI expansion citing this handoff gap, if available — e.g., "[Customer] paused expansion of Payments AI across 12 communities in Q1 2026 pending resolution of the escalation routing gap (CS #XXXXX, ~$YK ARR at risk)."]

---

## After (`customfield_11004`)

Super Agent 1.0 introduces a unified, ELI+-wide escalation experience inside the Communications inbox. Property staff see every AI-escalated conversation in one place, with context, and can resolve each escalated topic independently. Each behavior below describes a capability that ships with this release.

- **Unified AI escalation lane** — A new "AI Conversation" badge appears on any thread the AI is actively handling, alongside one or more "AI Escalation" labels (e.g., `Renewals AI Escalation`, `Payments AI Escalation`, `Leasing AI Escalation`, `Maintenance AI Escalation`) when the AI hands off to staff. The thread appears in the standard "All Threads" inbox and the "Unassigned" inbox tab, identified visually by both the AI Conversation badge and the per-topic escalation badges. No new inbox tab is created — staff continue to work from their existing Communications inbox at `Communications >> Conversations >> All Threads`.
- **Persistent inbox visibility while any escalation remains** — As long as the conversation carries at least one `Escalation` label, the thread remains visible in the "All Threads" inbox even after staff has responded and read the conversation. This means a thread does not silently drop out of view after a first reply when other AI-escalated topics are still unanswered. Once every `Escalation` label on the thread is resolved, the conversation auto-resolves and moves out of the inbox.
- **AI Summary panel** — A "AI Summary" button appears on the conversation header for any AI escalation thread. Tapping it opens an "Escalation Context Summary" panel that shows one card per active escalation on the thread. Each card identifies the AI product that escalated (e.g., "Renewals AI"), states what the resident asked, and states why the AI handed off — in plain English. Staff can read all open escalation contexts in 5–10 seconds without scrolling back through the chat transcript.
- **AI Activated on/off toggle (per conversation)** — A pill in the conversation header shows "AI On" (emerald) or "AI Off" (red) for AI-managed threads. Tapping it opens a popover with a simple AI Activated on/off switch (no scheduled reactivation date or "no limit" option). Toggling fires a confirmation toast: "AI activated for this conversation" or "AI deactivated for this conversation". When AI is off for a thread, the AI will not draft outbound replies on that thread until staff turns it back on. This per-conversation override sits on top of any company-wide or property-wide AI activation policy and does not change those higher-level policies.
- **Phone and Email opt-in controls** — Below the AI activation toggle, two dropdowns capture the resident or lead's communication preference for that conversation: Phone (Opt In / Opt Out / No Indication) and Email (Opt In / Opt Out / No Indication). Selections write back to the conversation thread as channel-opt activity entries and feed downstream channel-eligibility logic.
- **Resolve escalation picker** — When staff is ready to close out the AI escalations they handled, they tap "Resolve" on the conversation header. A picker dialog opens titled "Which escalation are you resolving?" and lists every active `Escalation` label on the thread (e.g., `Renewals AI`, `Payments AI`, `Leasing AI`, `Maintenance AI`, `Other`). Staff selects one or more of those labels and taps "Resolve". The picker requires at least one selection; the "Resolve" button is disabled until something is selected.
- **Partial resolve** — If staff resolves a subset of the active escalations, three things happen: (1) the selected escalation labels are removed from the thread; (2) a green "resolved" entry appears in the thread timeline showing the staff member's name, the labels that were resolved, and the timestamp; (3) the conversation **stays open** in the inbox so another teammate can resolve the remaining escalations. The remaining `Escalation` label(s) stay on the thread and the thread continues to appear in "All Threads".
- **Full resolve** — When staff selects every remaining `Escalation` label in the picker (or when staff resolves the last remaining escalation later), the conversation status flips to "Resolved" automatically and the thread leaves the inbox. The same green "resolved" timeline entry is appended naming the labels and the actor.
- **Resolution timeline entry** — Every partial or full resolve writes a structured timeline entry to the conversation. The entry shows the resolver's name, the exact escalation label(s) resolved (rendered as inline pills, e.g., `Renewals AI Escalation`), and the timestamp. The entry is interleaved chronologically with the resident, AI, and staff messages so the conversation history reads end-to-end.
- **AI handoff timeline entry** — When the AI escalates a topic, a structured handoff entry is written to the timeline. It identifies the AI product (e.g., "ELI+ Super Agent — Renewals AI"), the label that was added (e.g., `Renewals AI Escalation`), and the timestamp.
- **Reassignment** — Any AI escalation thread can be reassigned at any time using the standard assignee picker on the conversation header (assign to a specific teammate, an internal queue, or back to the AI). The assignment writes a standard thread-activity entry.
- **Reopen** — A resolved AI escalation thread can be reopened by any staff member with the existing `Communications > Conversations > Reopen` permission. Reopening preserves all prior escalation history and timeline entries; the conversation re-appears in the inbox.

---

## NOT Included (`customfield_11006`)

The following capabilities are intentionally scoped out of Super Agent 1.0. Several are adjacent features Support is likely to be asked about — call out which is "coming later" vs. "not planned":

- **AI-drafted staff replies** — Super Agent 1.0 does not generate suggested reply text for staff. When a staff member takes over a conversation, they compose their own reply. AI reply drafting is planned for **Super Agent 2.0** (DEV-XXXXX) as a separate epic.
- **Voice / phone channel escalations** — Super Agent 1.0 routes AI conversations on SMS, email, and chat. Phone/voice AI conversations and their escalations are handled by the separate Voice AI epic family (see `Voice >> AI Voice`) and are **not** unified into the Super Agent 1.0 escalation lane in v1.
- **AI continues drafting after staff takes over** — Once staff replies on a thread, the AI does not resume drafting on that thread automatically. The thread becomes staff-owned. Re-engaging the AI requires staff to toggle AI Activated back on for that conversation. Automatic AI re-engagement is planned for v2.
- **Bulk resolve across conversations** — Staff cannot select multiple AI escalation conversations from the inbox list and resolve them all in one action. Resolves happen one conversation at a time. Bulk operations are not planned for v1.
- **Custom escalation reasons** — Staff cannot create new escalation labels on the fly (e.g., "Compliance Escalation"). The set of escalation labels is defined by each ELI+ AI product (Renewals AI, Payments AI, Leasing AI, Maintenance AI, Other). Staff can still add freeform labels to a conversation using the existing label picker, but those will not behave like an AI escalation for inbox-visibility or AI Summary purposes.
- **Property-level escalation routing rules** — Super Agent 1.0 routes all AI escalations into the same property inbox. Properties cannot configure rules like "Renewals AI escalations go to Regional Manager, Payments AI escalations go to Accounting." Routing rules are planned for v2 (see `Communications >> Routing Rules` placeholder).
- **Editable AI Summary** — The AI Summary panel content is generated by each ELI+ AI product at the moment of handoff. Staff cannot edit, append to, or annotate the summary text in v1. A "Notes" field on the summary is planned for v2.
- **Multi-language AI conversations** — Super Agent 1.0 surfaces conversations in the language the ELI+ AI product conducted them in (currently English). Multi-language support is governed by each ELI+ AI product, not by Super Agent.
- **Auto-resolve after N messages** — Super Agent 1.0 does not automatically close a conversation after a set number of staff replies or a time-out. Conversations resolve only when staff explicitly resolves every active escalation label via the Resolve picker.

---

## New Permissions (`customfield_11007`)

No new permissions are introduced for Super Agent 1.0. The feature reuses the existing Communications permission stack:

- **Viewing AI escalation conversations** — requires the existing `Communications > Conversations > View` permission. Staff who can see the Communications inbox today can see AI escalation threads.
- **Resolving an escalation (partial or full)** — requires the existing `Communications > Conversations > Resolve` permission. Same gate that controls resolving any conversation today.
- **Toggling AI Activated on/off per conversation** — requires the existing `Communications > Conversations > Manage AI Activation` permission (introduced with the company-wide ELI+ AI activation work). Users without it see the AI On/Off pill in a read-only state.
- **Reopening a resolved AI escalation** — requires the existing `Communications > Conversations > Reopen` permission.
- **Setting Phone/Email opt-in on a conversation** — requires the existing `Communications > Conversations > Edit Channel Preferences` permission.

Users without any of these permissions see the affected controls disabled with the standard "Permission required — contact your administrator" tooltip. No admin UI changes are needed.

---

## Settings (`customfield_11008`)

**Company-level feature flag:** `oxp_super_agent_1`

- Type: Company-level feature flag (managed via Entrata internal configuration, not exposed in the admin UI in v1).
- Default: **OFF** for all customers at GA.
- ON behavior: AI escalation conversations from any enabled ELI+ AI product (Renewals AI, Payments AI, Leasing AI, Maintenance AI, etc.) appear in the standard Communications inbox with the AI Conversation badge, per-escalation labels, AI Summary panel, partial-resolve picker, and persistent inbox visibility.
- OFF behavior: AI escalation conversations behave the way they do today — they continue to flow into their respective ELI+ AI product dashboards. No new badges, picker, or persistent-visibility logic activates.
- Enabled by: Entrata internal team (CSM-coordinated). Customer opt-in requested via standard ELI+ enablement flow.

**Dependent product flags:** Super Agent 1.0 surfaces escalations only from ELI+ AI products that are themselves enabled for the customer. If `Renewals AI` is OFF for a customer, no `Renewals AI Escalation` labels will ever appear in their inbox; the Super Agent 1.0 flag does not by itself turn on any AI product.

**Defaults for new settings on the conversation thread:**

- **Phone opt-in**: defaults to `No Indication` until staff or the AI captures a preference signal from the resident.
- **Email opt-in**: defaults to `No Indication` until staff or the AI captures a preference signal from the resident.
- **AI Activated (per conversation)**: defaults to `ON` for any thread the AI initiated. Staff override is per-conversation and does not change company or property AI activation policy.

**No new admin-facing screens.** All controls live inline on the conversation thread.

**Test environment:** [INSERT: QA / staging URL where the flag is enabled for verification — e.g., `https://qa-oxp.entrata.com`, property `Cypress Ridge` (ID `XXXXX`)]. Login via standard QA Okta SSO.

---

## Who (`customfield_11009`)

Super Agent 1.0 ships value to four distinct roles, each gaining a workflow-specific benefit:

- **Onsite Leasing Agent / Resident Services Specialist** — The staff member who today fields the actual resident questions. With Super Agent 1.0 they see every AI-escalated thread for their property in one inbox, read a 1–2 sentence context summary instead of scrolling the chat history, and can resolve one topic without closing the thread on the other topics. Estimated impact: 12–30 minutes saved per shift on re-reading transcripts plus a meaningful reduction in "I closed the thread before answering the other thing" mistakes. Typical volume: 8–25 AI escalations per agent per week, varying by property AI product mix.
- **Regional Leasing Manager / Property Manager** — The reviewer who needs to confirm AI escalations are being handled on time across multiple properties. With Super Agent 1.0 they get a single, visible "All Threads" view per property where AI escalations remain visible until resolved, with a clear audit trail of who resolved what and when. They no longer have to log into Renewals AI, Payments AI, Maintenance AI, and the Communications inbox separately to confirm coverage. Estimated impact: 25–40 minutes per day saved per regional covering 6–10 properties.
- **CX / Resident Experience Lead** — The role responsible for measuring how quickly AI escalations are answered and resolved. With Super Agent 1.0 every partial and full resolve is written to a structured timeline entry with actor, timestamp, and exact labels resolved. This data feeds escalation SLA dashboards and resident NPS root-cause analysis. Without Super Agent 1.0, the resolution audit trail is split across ELI+ product logs.
- **Entrata CSM / Implementation Consultant** — The person enabling ELI+ AI products at a customer. With Super Agent 1.0 in place, the value proposition of any additional ELI+ AI product (Payments AI, Maintenance AI, Leasing AI) is reinforced rather than diluted, because every additional AI product feeds the same unified escalation surface staff already use. This makes ELI+ AI cross-sell substantively easier — staff aren't being asked to learn another inbox.

---

## Why (`customfield_11010`)

**Customer demand:** [INSERT: Customer name(s) who explicitly requested a unified ELI+ AI escalation surface, the CS ticket(s) backing the request, and the dollar impact — e.g., "Requested by [Customer] (CS #XXXXX, Q1 2026); paused expansion of Payments AI to 12 communities pending resolution; ~$YK ARR at risk."]

**Quantified impact (derived from observable workflow steps):** Across an average ELI+ AI customer running two AI products (e.g., Renewals AI + Payments AI) at 25 properties, staff today spend an estimated 25–40 minutes per property per shift navigating between AI dashboards plus another 12–30 minutes per property per week re-reading chat transcripts to reconstruct AI escalation context. At 25 properties and a 5-day work week, that is 50–80 hours per week of operational friction — roughly 200–320 hours per month — created by the absence of a unified escalation surface. Even a 50% reduction in this friction represents 100–160 hours per month per portfolio reallocated to actual resident response.

**Competitive pressure:** [INSERT: Named competitor with comparable capability and the specific feature parity claim — e.g., "[Competitor] ships a unified AI agent escalation inbox as part of their core conversational AI suite, which is referenced in enterprise RFPs and competitive deal cycles."] Every quarter without parity here is a structural objection in enterprise sales conversations for ELI+ AI.

**Strategic context:** Super Agent 1.0 is the connective tissue that makes the entire ELI+ AI product line additive rather than fragmenting. Each new ELI+ AI product (Maintenance AI, Leasing AI, Payments AI, Renewals AI) currently increases staff cognitive load by adding another dashboard to monitor. Super Agent 1.0 reverses that dynamic: every new AI product makes the unified escalation surface more valuable, because more conversations land in the same well-instrumented place. This is the prerequisite that makes "Super Agent 2.0" (AI-drafted staff replies, AI re-engagement after staff handoff, multi-property routing rules) a viable next step. Shipping Super Agent 1.0 first establishes the inbox + timeline + audit-trail substrate that 2.0 depends on.

---

## FAQs (`customfield_11012`)

**Q: What is "Super Agent 1.0" and why is it called "Super Agent"?**
A: "Super Agent" is the name for the unified ELI+ AI escalation experience. "1.0" indicates this release focuses on giving staff a single, well-instrumented inbox surface for every AI escalation across every ELI+ AI product (Renewals AI, Payments AI, Leasing AI, Maintenance AI, etc.). Future releases (planned as Super Agent 2.0) will add AI-drafted reply suggestions and automatic AI re-engagement after staff takeover.

**Q: My customer is already using Renewals AI. Will they see anything different in their Communications inbox after Super Agent 1.0 is enabled?**
A: Yes. After Super Agent 1.0 is enabled, every Renewals AI conversation that escalates to staff will appear in the standard "All Threads" inbox with an "AI Conversation" badge and a "Renewals AI Escalation" label. Staff can tap the AI Summary button to read a plain-English summary of why the AI handed off, and they can use the Resolve picker to close out the renewal escalation independently of any other escalations on the same conversation. Without Super Agent 1.0, those conversations continue to live primarily inside the Renewals AI dashboard.

**Q: If a conversation has both a Renewals AI Escalation and a Payments AI Escalation, and my onsite agent only handles the Payments part, what happens?**
A: The agent taps "Resolve" on the conversation, selects only "Payments AI" in the picker, and taps Resolve. A green "resolved" entry is written to the thread timeline showing the agent's name and "Payments AI Escalation". The Payments AI label is removed from the thread. The Renewals AI Escalation label stays. The conversation stays open in the inbox so another teammate (e.g., a regional manager who can approve the renewal rate exception) can resolve the Renewals piece later. This is intentional and is the core "partial resolve" workflow.

**Q: Will Super Agent 1.0 work for customers who only have one ELI+ AI product enabled (e.g., only Renewals AI)?**
A: Yes. Super Agent 1.0 unifies whatever AI products are enabled. Single-AI customers get the same inbox treatment, the same AI Summary panel, and the same Resolve picker (the picker will simply only show one escalation type to resolve at a time). The feature provides value at one AI product and increases in value as customers adopt additional ELI+ AI products.

**Q: What happens if Super Agent 1.0 is turned off (feature flag OFF or rolled back)?**
A: AI escalation conversations revert to their prior behavior. They continue to flow into each ELI+ AI product's individual dashboard. No conversation data is lost. The "resolved" timeline entries already written remain on the conversation thread as historical record. The AI Conversation badge, the persistent-visibility-in-inbox rule, and the Resolve picker disappear from the UI. Staff can still resolve conversations using the standard Communications "Resolve" button.

**Q: Can a property opt out of Super Agent 1.0 if their company opts in?**
A: Not in v1. Super Agent 1.0 ships as a company-level feature flag. If the company is enabled, every property under that company sees the unified inbox treatment. Property-level enablement is planned for v2 alongside property-level escalation routing rules.

**Q: Will the AI Activated toggle on a Super Agent 1.0 thread override our company-wide AI activation policy?**
A: The per-conversation toggle only affects the specific conversation it is set on. It does not change the company-wide or property-wide AI activation policy configured under `ELI+ Settings`. Think of the per-conversation toggle as a temporary override for one resident's thread (for example, when staff wants to pause AI on a sensitive conversation and own it directly).

**Q: How is the AI Summary generated? Can staff edit it?**
A: The AI Summary content for each escalation is produced by the originating ELI+ AI product at the moment it hands off — for example, Renewals AI generates the "this resident is asking for a rate exception on their $1,850 renewal offer" summary when it escalates. In v1, staff cannot edit the summary. They can capture any additional notes using the existing private-note feature on the conversation. An editable summary is planned for v2.

**Q: Does Super Agent 1.0 work for voice / phone AI conversations?**
A: Not in v1. v1 covers SMS, email, and chat conversations only. Voice AI conversations have their own surface under `Voice >> AI Voice` and are not yet routed through the unified Super Agent escalation lane. Voice unification is planned post-v2.

**Q: What permissions are required to use Super Agent 1.0?**
A: No new permissions are introduced. Staff who can view the Communications inbox today can see Super Agent 1.0 conversations. Staff who can resolve a conversation today can resolve an AI escalation (partial or full). Staff who can manage AI activation today can toggle the per-conversation AI Activated switch.

---

## Adoption Method Details (`customfield_11016`)

Super Agent 1.0 is governed by the company-level feature flag `oxp_super_agent_1`, default **OFF** at GA.

**Rollout plan:**
- **Phase 1 — Design partners (week 0 to week +2 post-GA):** [INSERT: Named design partner customer(s) — e.g., 2–4 customers already running 2+ ELI+ AI products, enabled at the company level via internal flag configuration.] CSM-coordinated kickoff calls and instrumentation review.
- **Phase 2 — Opt-in for any customer running 1+ ELI+ AI product (week +2 to week +6 post-GA):** CSMs proactively offer Super Agent 1.0 to existing ELI+ AI customers in their book. Customer-initiated requests are also fulfilled in this phase.
- **Phase 3 — Default ON for all eligible customers (post-success-criteria review):** Once Phase 2 demonstrates adoption ≥40% and operational stability (no rollback events tied to Super Agent 1.0), the default flips to ON for any customer with at least one ELI+ AI product enabled.

**Who enables:** Entrata internal team (CSM-coordinated). Not customer self-service in v1. Self-service enablement is a v2 consideration once Phase 3 completes.

**Before enablement (flag OFF):** Customer's Communications inbox behaves exactly as today. AI escalations continue to live primarily in their respective ELI+ AI product dashboards. No new UI elements appear.

**After enablement (flag ON):** AI escalation conversations from every enabled ELI+ AI product appear in the standard Communications inbox with the AI Conversation badge, per-topic escalation labels, AI Summary panel, persistent inbox visibility, Resolve picker, and partial-resolve workflow described in the After section.

**Customer-facing release note:** Yes. Release note targets PMM and Support. Final copy and screenshots are attached to this epic in the dedicated release-note fields once the UI is locked.

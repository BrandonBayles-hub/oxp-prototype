/**
 * Pre-defined guardrails for the Agent Builder.
 *
 * Some guardrails are locked (security-level) and cannot be disabled.
 * Others are enabled by default but can be turned off with acknowledgment.
 */

import type { StructuredGuardrail } from "./custom-agents-context";

export const DEFAULT_GUARDRAILS: StructuredGuardrail[] = [
  // ── Security guardrails (locked — always enforced) ──
  {
    id: "guard.pii-protection",
    label: "PII Protection",
    description: "Never expose Social Security numbers, full bank account numbers, or passwords in any response or log.",
    enabled: true,
    locked: true,
    category: "security",
  },
  {
    id: "guard.data-access-scope",
    label: "Data Access Scope Enforcement",
    description: "Agent can only access data for properties it is provisioned for. Cross-property data access is blocked at the API layer.",
    enabled: true,
    locked: true,
    category: "security",
  },
  {
    id: "guard.audit-logging",
    label: "Audit Logging",
    description: "Every agent action is logged with timestamp, user context, property, and outcome. Logs are immutable and retained per compliance policy.",
    enabled: true,
    locked: true,
    category: "security",
  },
  {
    id: "guard.auth-enforcement",
    label: "Authentication Enforcement",
    description: "Agent validates JWT tokens and RBAC permissions on every request. Unauthenticated access is rejected.",
    enabled: true,
    locked: true,
    category: "security",
  },
  {
    id: "guard.rate-limiting",
    label: "Rate Limiting",
    description: "Agent actions are rate-limited to prevent abuse. Excessive calls trigger automatic throttling and alerts.",
    enabled: true,
    locked: true,
    category: "security",
  },
  {
    id: "guard.ai-disclosure",
    label: "AI Identity Disclosure",
    description: "Agent must proactively identify itself as an AI assistant at the start of every initial interaction with a resident or applicant. This introduction is hardcoded by Entrata and cannot be customized. Subsequent messages in the same conversation do not repeat the disclosure.",
    enabled: true,
    locked: true,
    category: "security",
  },
  {
    id: "guard.call-recording-disclosure",
    label: "Call Recording Disclosure",
    description: "When voice calls are recorded, a static Entrata-controlled recording disclosure is played before the conversation begins. This disclosure cannot be customized or disabled by the customer. Complies with two-party consent state requirements.",
    enabled: true,
    locked: true,
    category: "security",
  },
  {
    id: "guard.housing-decision-prohibition",
    label: "Housing Decision Prohibition",
    description: "Agent cannot autonomously make housing decisions (approve/deny applications, determine eligibility, or screen residents). Any workflow involving housing decisions requires mandatory human review, adverse action notice generation, and explainability documentation. This guardrail is enforced at the platform level.",
    enabled: true,
    locked: true,
    category: "security",
  },
  {
    id: "guard.pricing-algorithm-prohibition",
    label: "Pricing Algorithm Prohibition",
    description: "Agent cannot function as a rent optimizer, pricing recommendation engine, or rent-setting algorithm. Agents may read current market rent data for informational purposes but cannot generate, suggest, or apply rent pricing changes. This restriction exists due to antitrust and pricing algorithm sensitivities.",
    enabled: true,
    locked: true,
    category: "security",
  },
  {
    id: "guard.data-minimization",
    label: "Sensitive Data Minimization",
    description: "Agent may only access data necessary for its stated purpose. Sensitive resident data (screening results, payment history, identity documents, financial records) is subject to purpose-limitation enforcement. Data accessed by the agent is never cached, stored externally, or used for purposes beyond the current interaction.",
    enabled: true,
    locked: true,
    category: "security",
  },

  // ── Compliance guardrails (enabled by default, require acknowledgment to disable) ──
  {
    id: "guard.fair-housing",
    label: "Fair Housing Act Compliance",
    description: "Agent will never make statements or decisions that discriminate based on race, color, national origin, religion, sex, familial status, or disability. Applies to all leasing, marketing, and resident communications.",
    enabled: true,
    locked: false,
    category: "compliance",
    requiresAcknowledgment: true,
  },
  {
    id: "guard.tcpa",
    label: "TCPA / Communication Consent",
    description: "Agent will verify communication consent before sending texts or making calls. Honors do-not-call lists and opt-out requests immediately.",
    enabled: true,
    locked: false,
    category: "compliance",
    requiresAcknowledgment: true,
  },
  {
    id: "guard.fcra",
    label: "FCRA Screening Data Protection",
    description: "Agent will never share screening results (credit, background) with unauthorized parties or include them in resident-facing communications.",
    enabled: true,
    locked: false,
    category: "compliance",
    requiresAcknowledgment: true,
  },
  {
    id: "guard.ada",
    label: "ADA / Accessibility Compliance",
    description: "Agent will accommodate reasonable accommodation requests and never deny or discourage based on disability status.",
    enabled: true,
    locked: false,
    category: "compliance",
    requiresAcknowledgment: true,
  },

  // ── Safety guardrails (enabled by default, can be toggled) ──
  {
    id: "guard.human-escalation",
    label: "Human Escalation Safety Net",
    description: "Agent will escalate to a human when it detects emotional distress, legal threats, safety concerns, or topics outside its expertise.",
    enabled: true,
    locked: false,
    category: "safety",
  },
  {
    id: "guard.financial-limits",
    label: "Financial Action Limits",
    description: "Agent will not approve, post, or waive charges exceeding configurable thresholds without human review.",
    enabled: true,
    locked: false,
    category: "safety",
  },
  {
    id: "guard.no-legal-advice",
    label: "No Legal Advice",
    description: "Agent will not provide legal advice or interpret lease terms as legal guidance. It will direct residents to consult qualified counsel.",
    enabled: true,
    locked: false,
    category: "safety",
  },
];

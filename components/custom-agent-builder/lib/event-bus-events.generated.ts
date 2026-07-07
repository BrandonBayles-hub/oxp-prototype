/* eslint-disable */
// @generated — do not edit manually.
//
// Canonical catalog of every event type published to the Entrata Business
// Event Bus (Kafka). Generated from the PHP backed-enum files at the paths
// listed in this file's source array — those enums are the authoritative
// source of truth (there is no DB table that enumerates bus events).
//
// Regenerate with:
//   node scripts/build-event-bus-catalog.mjs
//
// Source monolith: ~/Desktop/vhosts/docker-env/Entrata
// Generated at:    2026-04-23T22:51:15.291Z
// Total domains:   6
// Total events:    52

export type EventBusDomainId =
  | "docex"
  | "online-application"
  | "resident-portal"
  | "resident-verify"
  | "ar-customer-transactions"
  | "ar-scheduled-charges";

export type EventBusCategory =
  | "Leasing"
  | "Resident"
  | "Accounting"
  | "Operations"
  | "Communication";

export interface EventBusDomain {
  readonly id: EventBusDomainId;
  /** Human-readable team / library name. */
  readonly name: string;
  /** Short description shown in UIs. */
  readonly description: string;
  /** Kafka topic prefix from topicName() — e.g. "entrata.people.leasing". */
  readonly kafkaContext: string;
  /** UI category bucket used by the Agent Builder. */
  readonly uiCategory: EventBusCategory;
  /** Repo-relative path of the PHP source enum file. */
  readonly sourceFile: string;
}

export interface EventBusEvent {
  /** Stable synthetic id used by the Agent Builder UI / trigger records. */
  readonly id: string;
  /** PascalCase enum case name, e.g. "LeasePacketCancelled". */
  readonly caseName: string;
  /** Kebab-case Kafka event name, e.g. "lease-packet-cancelled". */
  readonly value: string;
  /** Human-readable label derived from the case name. */
  readonly label: string;
  /** Full Kafka topic prefix (context + "." + value). */
  readonly kafkaTopicBase: string;
  readonly domainId: EventBusDomainId;
}

export const EVENT_BUS_GENERATED_AT: string = "2026-04-23T22:51:15.291Z";

export const EVENT_BUS_DOMAINS: ReadonlyArray<EventBusDomain> = Object.freeze([
  {
    id: "docex",
    name: "Lease Execution (DocEx)",
    description: "Lease generation and e-signature lifecycle events (lease-signed, lease-generated, etc.).",
    kafkaContext: "entrata.people.leasing",
    uiCategory: "Leasing",
    sourceFile: "Psi/Libraries/DocExBusinessEvents/BusinessEvents.php",
  },
  {
    id: "online-application",
    name: "Online Application",
    description: "Prospect application and leasing funnel events (application-started, quote-generated, waitlist-offer-sent, etc.).",
    kafkaContext: "entrata.people.leasing",
    uiCategory: "Leasing",
    sourceFile: "Psi/Libraries/OnlineApplicationBusinessEvents/BusinessEvents.php",
  },
  {
    id: "resident-portal",
    name: "Resident Portal",
    description: "Resident-experience events published from the Resident Portal (community events, etc.).",
    kafkaContext: "entrata.properties.resident-experience",
    uiCategory: "Resident",
    sourceFile: "Psi/Libraries/ResidentPortalBusinessEvents/BusinessEvents.php",
  },
  {
    id: "resident-verify",
    name: "Resident Verify / Screening",
    description: "Screening and identity-verification lifecycle events (screening-completed, adverse-action-notice-sent, etc.).",
    kafkaContext: "entrata.people.leasing",
    uiCategory: "Leasing",
    sourceFile: "Psi/Libraries/ResidentVerifyBusinessEvents/BusinessEvents.php",
  },
  {
    id: "ar-customer-transactions",
    name: "AR — Customer Transactions",
    description: "Accounts-receivable ledger events (ledger-updated, etc.).",
    kafkaContext: "entrata.properties.accounting",
    uiCategory: "Accounting",
    sourceFile: "Psi/Libraries/AccountsReceivables/CustomerTransactions/BusinessEvents/EventType.php",
  },
  {
    id: "ar-scheduled-charges",
    name: "AR — Scheduled Charges",
    description: "Scheduled-charge posting events at property / lease level (property-posted, lease-posted).",
    kafkaContext: "entrata.properties.resident-management",
    uiCategory: "Accounting",
    sourceFile: "Psi/Libraries/AccountsReceivables/ScheduledCharges/BusinessEvents/EventType.php",
  },
]);
export const EVENT_BUS_EVENTS: ReadonlyArray<EventBusEvent> = Object.freeze([
  {
    id: "evt.bus.ar-customer-transactions.ledger-updated",
    caseName: "LedgerUpdated",
    value: "ledger-updated",
    label: "Ledger Updated",
    kafkaTopicBase: "entrata.properties.accounting.ledger-updated",
    domainId: "ar-customer-transactions",
  },
  {
    id: "evt.bus.ar-scheduled-charges.lease-posted",
    caseName: "LeasePosted",
    value: "lease-posted",
    label: "Lease Posted",
    kafkaTopicBase: "entrata.properties.resident-management.lease-posted",
    domainId: "ar-scheduled-charges",
  },
  {
    id: "evt.bus.ar-scheduled-charges.property-posted",
    caseName: "PropertyPosted",
    value: "property-posted",
    label: "Property Posted",
    kafkaTopicBase: "entrata.properties.resident-management.property-posted",
    domainId: "ar-scheduled-charges",
  },
  {
    id: "evt.bus.docex.lease-countersigned",
    caseName: "LeaseCounterSigned",
    value: "lease-countersigned",
    label: "Lease Counter Signed",
    kafkaTopicBase: "entrata.people.leasing.lease-countersigned",
    domainId: "docex",
  },
  {
    id: "evt.bus.docex.lease-generated",
    caseName: "LeaseGenerated",
    value: "lease-generated",
    label: "Lease Generated",
    kafkaTopicBase: "entrata.people.leasing.lease-generated",
    domainId: "docex",
  },
  {
    id: "evt.bus.docex.lease-marked-as-signed",
    caseName: "LeaseMarkedAsSigned",
    value: "lease-marked-as-signed",
    label: "Lease Marked As Signed",
    kafkaTopicBase: "entrata.people.leasing.lease-marked-as-signed",
    domainId: "docex",
  },
  {
    id: "evt.bus.docex.lease-packet-cancelled",
    caseName: "LeasePacketCancelled",
    value: "lease-packet-cancelled",
    label: "Lease Packet Cancelled",
    kafkaTopicBase: "entrata.people.leasing.lease-packet-cancelled",
    domainId: "docex",
  },
  {
    id: "evt.bus.docex.lease-partially-approved",
    caseName: "LeasePartiallyApproved",
    value: "lease-partially-approved",
    label: "Lease Partially Approved",
    kafkaTopicBase: "entrata.people.leasing.lease-partially-approved",
    domainId: "docex",
  },
  {
    id: "evt.bus.docex.lease-partially-signed",
    caseName: "LeasePartiallySigned",
    value: "lease-partially-signed",
    label: "Lease Partially Signed",
    kafkaTopicBase: "entrata.people.leasing.lease-partially-signed",
    domainId: "docex",
  },
  {
    id: "evt.bus.docex.lease-signed",
    caseName: "LeaseSigned",
    value: "lease-signed",
    label: "Lease Signed",
    kafkaTopicBase: "entrata.people.leasing.lease-signed",
    domainId: "docex",
  },
  {
    id: "evt.bus.docex.lease-uploaded",
    caseName: "LeaseUploaded",
    value: "lease-uploaded",
    label: "Lease Uploaded",
    kafkaTopicBase: "entrata.people.leasing.lease-uploaded",
    domainId: "docex",
  },
  {
    id: "evt.bus.docex.marked-as-lease-generated",
    caseName: "MarkedAsLeaseGenerated",
    value: "marked-as-lease-generated",
    label: "Marked As Lease Generated",
    kafkaTopicBase: "entrata.people.leasing.marked-as-lease-generated",
    domainId: "docex",
  },
  {
    id: "evt.bus.docex.remaining-lease-generated",
    caseName: "RemainingLeaseGenerated",
    value: "remaining-lease-generated",
    label: "Remaining Lease Generated",
    kafkaTopicBase: "entrata.people.leasing.remaining-lease-generated",
    domainId: "docex",
  },
  {
    id: "evt.bus.docex.replace-lease-cancelled",
    caseName: "ReplaceLeaseCancelled",
    value: "replace-lease-cancelled",
    label: "Replace Lease Cancelled",
    kafkaTopicBase: "entrata.people.leasing.replace-lease-cancelled",
    domainId: "docex",
  },
  {
    id: "evt.bus.docex.reversed-lease-approval",
    caseName: "ReversedLeaseApproval",
    value: "reversed-lease-approval",
    label: "Reversed Lease Approval",
    kafkaTopicBase: "entrata.people.leasing.reversed-lease-approval",
    domainId: "docex",
  },
  {
    id: "evt.bus.docex.signed-lease-uploaded",
    caseName: "SignedLeaseUploaded",
    value: "signed-lease-uploaded",
    label: "Signed Lease Uploaded",
    kafkaTopicBase: "entrata.people.leasing.signed-lease-uploaded",
    domainId: "docex",
  },
  {
    id: "evt.bus.online-application.applicant-added",
    caseName: "ApplicantAdded",
    value: "applicant-added",
    label: "Applicant Added",
    kafkaTopicBase: "entrata.people.leasing.applicant-added",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.applicant-deleted",
    caseName: "ApplicantDeleted",
    value: "applicant-deleted",
    label: "Applicant Deleted",
    kafkaTopicBase: "entrata.people.leasing.applicant-deleted",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.application-approval-revoked",
    caseName: "ApplicationApprovalRevoked",
    value: "application-approval-revoked",
    label: "Application Approval Revoked",
    kafkaTopicBase: "entrata.people.leasing.application-approval-revoked",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.application-approved",
    caseName: "ApplicationApproved",
    value: "application-approved",
    label: "Application Approved",
    kafkaTopicBase: "entrata.people.leasing.application-approved",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.application-archived",
    caseName: "ApplicationArchived",
    value: "application-archived",
    label: "Application Archived",
    kafkaTopicBase: "entrata.people.leasing.application-archived",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.application-cancelled",
    caseName: "ApplicationCancelled",
    value: "application-cancelled",
    label: "Application Cancelled",
    kafkaTopicBase: "entrata.people.leasing.application-cancelled",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.application-completed",
    caseName: "ApplicationCompleted",
    value: "application-completed",
    label: "Application Completed",
    kafkaTopicBase: "entrata.people.leasing.application-completed",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.application-partially-completed",
    caseName: "ApplicationPartiallyComplete",
    value: "application-partially-completed",
    label: "Application Partially Complete",
    kafkaTopicBase: "entrata.people.leasing.application-partially-completed",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.application-reopened",
    caseName: "ApplicationReopened",
    value: "application-reopened",
    label: "Application Reopened",
    kafkaTopicBase: "entrata.people.leasing.application-reopened",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.application-started",
    caseName: "ApplicationStarted",
    value: "application-started",
    label: "Application Started",
    kafkaTopicBase: "entrata.people.leasing.application-started",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.forget-password",
    caseName: "ForgetPassword",
    value: "forget-password",
    label: "Forget Password",
    kafkaTopicBase: "entrata.people.leasing.forget-password",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.lease-approved",
    caseName: "LeaseApproved",
    value: "lease-approved",
    label: "Lease Approved",
    kafkaTopicBase: "entrata.people.leasing.lease-approved",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.lease-cancelled",
    caseName: "LeaseCancelled",
    value: "lease-cancelled",
    label: "Lease Cancelled",
    kafkaTopicBase: "entrata.people.leasing.lease-cancelled",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.offer-accepted",
    caseName: "OfferAccepted",
    value: "offer-accepted",
    label: "Offer Accepted",
    kafkaTopicBase: "entrata.people.leasing.offer-accepted",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.offer-declined",
    caseName: "OfferDeclined",
    value: "offer-declined",
    label: "Offer Declined",
    kafkaTopicBase: "entrata.people.leasing.offer-declined",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.offer-expired",
    caseName: "OfferExpired",
    value: "offer-expired",
    label: "Offer Expired",
    kafkaTopicBase: "entrata.people.leasing.offer-expired",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.offer-rejected",
    caseName: "OfferRejected",
    value: "offer-rejected",
    label: "Offer Rejected",
    kafkaTopicBase: "entrata.people.leasing.offer-rejected",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.primary-applicant-changed",
    caseName: "PrimaryApplicantChanged",
    value: "primary-applicant-changed",
    label: "Primary Applicant Changed",
    kafkaTopicBase: "entrata.people.leasing.primary-applicant-changed",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.prospect-login",
    caseName: "ProspectLogin",
    value: "prospect-login",
    label: "Prospect Login",
    kafkaTopicBase: "entrata.people.leasing.prospect-login",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.quote-accepted",
    caseName: "QuoteAccepted",
    value: "quote-accepted",
    label: "Quote Accepted",
    kafkaTopicBase: "entrata.people.leasing.quote-accepted",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.quote-expired",
    caseName: "QuoteExpired",
    value: "quote-expired",
    label: "Quote Expired",
    kafkaTopicBase: "entrata.people.leasing.quote-expired",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.quote-generated",
    caseName: "QuoteGenerated",
    value: "quote-generated",
    label: "Quote Generated",
    kafkaTopicBase: "entrata.people.leasing.quote-generated",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.reverse-lease-approval",
    caseName: "ReverseLeaseApproval",
    value: "reverse-lease-approval",
    label: "Reverse Lease Approval",
    kafkaTopicBase: "entrata.people.leasing.reverse-lease-approval",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.send-invitation",
    caseName: "SendInvitation",
    value: "send-invitation",
    label: "Send Invitation",
    kafkaTopicBase: "entrata.people.leasing.send-invitation",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.waitlist-offer-accepted",
    caseName: "WaitlistOfferAccepted",
    value: "waitlist-offer-accepted",
    label: "Waitlist Offer Accepted",
    kafkaTopicBase: "entrata.people.leasing.waitlist-offer-accepted",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.waitlist-offer-declined",
    caseName: "WaitlistOfferDeclined",
    value: "waitlist-offer-declined",
    label: "Waitlist Offer Declined",
    kafkaTopicBase: "entrata.people.leasing.waitlist-offer-declined",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.waitlist-offer-refused",
    caseName: "WaitlistOfferRefused",
    value: "waitlist-offer-refused",
    label: "Waitlist Offer Refused",
    kafkaTopicBase: "entrata.people.leasing.waitlist-offer-refused",
    domainId: "online-application",
  },
  {
    id: "evt.bus.online-application.waitlist-offer-sent",
    caseName: "WaitlistOfferSent",
    value: "waitlist-offer-sent",
    label: "Waitlist Offer Sent",
    kafkaTopicBase: "entrata.people.leasing.waitlist-offer-sent",
    domainId: "online-application",
  },
  {
    id: "evt.bus.resident-portal.community-event-changed",
    caseName: "CommunityEventChanged",
    value: "community-event-changed",
    label: "Community Event Changed",
    kafkaTopicBase: "entrata.properties.resident-experience.community-event-changed",
    domainId: "resident-portal",
  },
  {
    id: "evt.bus.resident-verify.adverse-action-notice-sent",
    caseName: "AdverseActionLetterGenerated",
    value: "adverse-action-notice-sent",
    label: "Adverse Action Letter Generated",
    kafkaTopicBase: "entrata.people.leasing.adverse-action-notice-sent",
    domainId: "resident-verify",
  },
  {
    id: "evt.bus.resident-verify.consumer-report-sent",
    caseName: "ConsumerReportSent",
    value: "consumer-report-sent",
    label: "Consumer Report Sent",
    kafkaTopicBase: "entrata.people.leasing.consumer-report-sent",
    domainId: "resident-verify",
  },
  {
    id: "evt.bus.resident-verify.identity-verification-completed",
    caseName: "IdVerificationCompleted",
    value: "identity-verification-completed",
    label: "Id Verification Completed",
    kafkaTopicBase: "entrata.people.leasing.identity-verification-completed",
    domainId: "resident-verify",
  },
  {
    id: "evt.bus.resident-verify.screening-completed",
    caseName: "ScreeningCompleted",
    value: "screening-completed",
    label: "Screening Completed",
    kafkaTopicBase: "entrata.people.leasing.screening-completed",
    domainId: "resident-verify",
  },
  {
    id: "evt.bus.resident-verify.screening-conditions-satisfied",
    caseName: "ScreeningConditionsSatisfied",
    value: "screening-conditions-satisfied",
    label: "Screening Conditions Satisfied",
    kafkaTopicBase: "entrata.people.leasing.screening-conditions-satisfied",
    domainId: "resident-verify",
  },
  {
    id: "evt.bus.resident-verify.screening-decision",
    caseName: "ScreeningDecision",
    value: "screening-decision",
    label: "Screening Decision",
    kafkaTopicBase: "entrata.people.leasing.screening-decision",
    domainId: "resident-verify",
  },
  {
    id: "evt.bus.resident-verify.screening-decision-reset",
    caseName: "ScreeningDecisionReset",
    value: "screening-decision-reset",
    label: "Screening Decision Reset",
    kafkaTopicBase: "entrata.people.leasing.screening-decision-reset",
    domainId: "resident-verify",
  },
]);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_BY_ID = new Map<string, EventBusEvent>(
  EVENT_BUS_EVENTS.map((e) => [e.id, e])
);

const EVENT_BY_VALUE = new Map<string, EventBusEvent>(
  EVENT_BUS_EVENTS.map((e) => [e.value, e])
);

const DOMAIN_BY_ID = new Map<EventBusDomainId, EventBusDomain>(
  EVENT_BUS_DOMAINS.map((d) => [d.id, d])
);

export function getEventBusEventById(id: string): EventBusEvent | undefined {
  return EVENT_BY_ID.get(id);
}

export function getEventBusEventByValue(value: string): EventBusEvent | undefined {
  return EVENT_BY_VALUE.get(value);
}

export function getEventBusDomain(domainId: EventBusDomainId): EventBusDomain | undefined {
  return DOMAIN_BY_ID.get(domainId);
}


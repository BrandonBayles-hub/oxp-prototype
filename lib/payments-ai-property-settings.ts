/**
 * Resolved property payment settings for Payments AI configuration (DEV-297149).
 * Prototype mock — keyed by agent-roster property id.
 */

export type PropertySettingKey =
  | "rentChargeDate"
  | "paymentBlockDays"
  | "acceptedPaymentTypes"
  | "partialPayments"
  | "leaseStatusPaymentAllowances"
  | "autoPayments"
  | "prePayments"
  | "latePayments"
  | "repaymentAgreementPolicy"
  | "standardRentReminders"
  | "delinquencyNotices"
  | "collectionsPolicy"
  | "evictionDate"
  | "pastResidentLoginWindow"
  | "lateFeePolicy";

export type PropertySettingDefinition = {
  key: PropertySettingKey;
  section: "Payment Info" | "Policies";
  name: string;
  description: string;
  entrataPath: string;
};

export const PROPERTY_SETTING_DEFINITIONS: PropertySettingDefinition[] = [
  { key: "rentChargeDate", section: "Payment Info", name: "Rent Charge Date", description: "The day of the month when rent charges are posted to resident accounts.", entrataPath: "Setup > Properties > Financial > Charges > General" },
  { key: "paymentBlockDays", section: "Payment Info", name: "Payment Block Days", description: "Set the date after which payments are blocked for the billing period.", entrataPath: "Setup > Properties > Residents > ResidentPortal > Payments" },
  { key: "acceptedPaymentTypes", section: "Payment Info", name: "Accepted Payment Types", description: "Select which payment methods are accepted, including ACH, Card, MoneyGram, etc.", entrataPath: "Setup > Properties > Financial > Payments" },
  { key: "partialPayments", section: "Payment Info", name: "Partial Payments", description: "Configure whether residents may pay less than their full balance and related partial payment rules.", entrataPath: "Setup > Properties > Residents > ResidentPortal > Payments" },
  { key: "leaseStatusPaymentAllowances", section: "Payment Info", name: "Lease Status Payment Allowances", description: "Define which lease statuses are permitted to make online payments.", entrataPath: "Setup > Properties > Residents > ResidentPortal > Payments" },
  { key: "autoPayments", section: "Payment Info", name: "Auto Payments", description: "Configure autopay enrollment, scheduling, and related resident portal settings.", entrataPath: "Setup > Properties > Residents > ResidentPortal > Payments" },
  { key: "prePayments", section: "Payment Info", name: "Pre Payments", description: "Configure whether and how residents can pay before charges are posted for the billing period.", entrataPath: "Setup > Properties > Residents > ResidentPortal > Payments" },
  { key: "latePayments", section: "Payment Info", name: "Late Payments", description: "Configure rules for accepting and processing late payments.", entrataPath: "Setup > Properties > Residents > ResidentPortal > Payments" },
  { key: "repaymentAgreementPolicy", section: "Payment Info", name: "Repayment Agreement Policy", description: "Set repayment agreement terms, eligibility criteria, and agreement details.", entrataPath: "Setup > Properties > Financial > Payments" },
  { key: "standardRentReminders", section: "Policies", name: "Standard Rent Reminders", description: "Review Rent Reminder contact point settings to determine how standard rent reminders will be delivered.", entrataPath: "Setup > Properties > Communication > Contact Points > Payments" },
  { key: "delinquencyNotices", section: "Policies", name: "Delinquency Notices", description: "Review delinquency notice delivery settings to determine how delinquency notices will be delivered.", entrataPath: "Setup > Properties > Financial > Delinquency > Delinquency" },
  { key: "collectionsPolicy", section: "Policies", name: "Collections Policy", description: "Review collections notice settings to determine how collections notices will be delivered.", entrataPath: "Setup > Properties > Financial > Delinquency > Pre-Collections" },
  { key: "evictionDate", section: "Policies", name: "Eviction Date", description: "The specific date when eviction filings are initiated.", entrataPath: "Setup > Company > Financial > Delinquency > Delinquency" },
  { key: "pastResidentLoginWindow", section: "Policies", name: "Past Resident Login Window", description: "The number of days a resident with the lease status of Past can login to make online payments.", entrataPath: "Setup > Properties > Residents > ResidentPortal > Enrollment/Login" },
  { key: "lateFeePolicy", section: "Policies", name: "Late Fee Policy", description: "Define late fee amounts, calculation methods, and escalation rules.", entrataPath: "Setup > Properties > Financial > Delinquency > Delinquency" },
];

export type ResolvedPropertySettings = Record<PropertySettingKey, string> & {
  propertyId: string;
  propertyName: string;
  avgRent: number;
  rentDueDay: number;
  lateFeeDay: number;
  delinquencyBeginDays: number;
  prpLoginDays: number;
  collectionsAgencyDaysAfterMoveOut: number;
};

const DEFAULT_VALUES: Omit<ResolvedPropertySettings, "propertyId" | "propertyName"> = {
  rentChargeDate: "Charges automatically posted on the 25th through the 31st of the following month",
  paymentBlockDays: "Online payments accepted between the 1st and 10th of the month.",
  acceptedPaymentTypes:
    "Electronic payments type: ACH, Cards, and Cash App Pay, and MoneyGram. Non-Electronic payment types: Cash and Money Order.",
  partialPayments: "Partial payments allowed.",
  leaseStatusPaymentAllowances:
    "Payments allowed from residents in Collections and blocked for residents in Evicting status.",
  autoPayments: "Total balance auto payments allowed between the 1st and 4th of the month.",
  prePayments: "Current residents can pay up to 4 months of charges.",
  latePayments: "Late payments disallowed beginning on the 5th of the month.",
  repaymentAgreementPolicy: "Repayment agreements disallowed.",
  standardRentReminders: "Email and SMS rent reminders enabled.",
  delinquencyNotices: "Delinquency notices begin 3 days after charges are due for balances over $100.",
  collectionsPolicy: "Collections notices begin 4 days after financial moveout for balances over $700.",
  evictionDate: "Evictions begin 3 days after final delinquency notice is sent.",
  pastResidentLoginWindow: "Past residents are allowed to login for 40 days after move out.",
  lateFeePolicy: "Late fees begin posting on the 5th of the month.",
  avgRent: 1650,
  rentDueDay: 3,
  lateFeeDay: 5,
  delinquencyBeginDays: 3,
  prpLoginDays: 40,
  collectionsAgencyDaysAfterMoveOut: 4,
};

const PROPERTY_OVERRIDES: Partial<Record<string, Partial<Omit<ResolvedPropertySettings, "propertyId" | "propertyName">>>> = {
  "ivy-gate": { avgRent: 980, acceptedPaymentTypes: "ACH, MoneyGram", pastResidentLoginWindow: "45 days after move-out", prpLoginDays: 45 },
  "summit-view": { avgRent: 1420, acceptedPaymentTypes: "ACH, Credit Card" },
  "aspen-heights": { avgRent: 2100, acceptedPaymentTypes: "ACH, Credit Card, Debit Card, CashPay" },
};

export const STRIP_SETTING_KEYS: PropertySettingKey[] = [
  "acceptedPaymentTypes",
  "rentChargeDate",
  "lateFeePolicy",
  "delinquencyNotices",
  "pastResidentLoginWindow",
  "collectionsPolicy",
  "evictionDate",
];

export function resolvePropertySettings(propertyId: string, propertyName: string): ResolvedPropertySettings {
  const overrides = PROPERTY_OVERRIDES[propertyId] ?? {};
  return {
    propertyId,
    propertyName,
    ...DEFAULT_VALUES,
    ...overrides,
  };
}

export function getSettingDefinition(key: PropertySettingKey): PropertySettingDefinition {
  const def = PROPERTY_SETTING_DEFINITIONS.find((d) => d.key === key);
  if (!def) throw new Error(`Unknown setting key: ${key}`);
  return def;
}

export function getSettingValueByName(
  resolved: ResolvedPropertySettings,
  settingName: string
): string | undefined {
  const def = PROPERTY_SETTING_DEFINITIONS.find((d) => d.name === settingName);
  return def ? resolved[def.key] : undefined;
}

export function toPropertyContext(resolved: ResolvedPropertySettings) {
  return {
    rentChargeDate: resolved.rentChargeDate,
    rentDueDate: `${resolved.rentDueDay}${ordinal(resolved.rentDueDay)} of the month`,
    delinquencyPolicy: `${resolved.delinquencyBeginDays} days after charges are due`,
    legalNoticeSchedule: resolved.collectionsPolicy,
    legalNoticeDelivery: resolved.delinquencyNotices,
    companySettingsPath: "Setup > Company > Financial > Delinquency",
    pastResidentLoginDays: resolved.prpLoginDays,
    avgRent: resolved.avgRent,
    collectionsAgencyDaysAfterMoveOut: resolved.collectionsAgencyDaysAfterMoveOut,
  };
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Twilio campaigns available to the PMC, surfaced as a searchable multi-select
 * in the Communication step. In production this list comes from the
 * `communication/getTwilioCampaigns` internal REST endpoint. The shape here
 * mirrors what that endpoint returns.
 */
export type TwilioCampaign = {
  id: string;
  name: string;
  useCase:
    | "Leasing"
    | "Resident Care"
    | "Maintenance"
    | "Collections"
    | "Renewals"
    | "Marketing"
    | "Emergency";
  brand: "Harvest Peak Capital";
  /** 10DLC campaign ID (if registered). */
  campaignId: string;
  status: "approved" | "pending" | "rejected";
  messagesPerDay: number;
};

export const TWILIO_CAMPAIGNS: TwilioCampaign[] = [
  { id: "camp.leasing-inbound",    name: "Leasing · Inbound Replies",        useCase: "Leasing",        brand: "Harvest Peak Capital", campaignId: "CABFD23C", status: "approved", messagesPerDay: 4500 },
  { id: "camp.leasing-outreach",   name: "Leasing · New-lead Outreach",      useCase: "Leasing",        brand: "Harvest Peak Capital", campaignId: "CABFD24D", status: "approved", messagesPerDay: 6000 },
  { id: "camp.tour-reminders",     name: "Leasing · Tour Reminders",         useCase: "Leasing",        brand: "Harvest Peak Capital", campaignId: "CABFD25E", status: "approved", messagesPerDay: 2000 },
  { id: "camp.application-followup", name: "Leasing · Application Follow-up", useCase: "Leasing",       brand: "Harvest Peak Capital", campaignId: "CABFD26F", status: "approved", messagesPerDay: 1500 },
  { id: "camp.resident-care",      name: "Resident Care · Transactional",     useCase: "Resident Care", brand: "Harvest Peak Capital", campaignId: "CABFD270", status: "approved", messagesPerDay: 8000 },
  { id: "camp.resident-announce",  name: "Resident Care · Announcements",     useCase: "Resident Care", brand: "Harvest Peak Capital", campaignId: "CABFD281", status: "approved", messagesPerDay: 3500 },
  { id: "camp.wo-updates",         name: "Maintenance · Work Order Updates",  useCase: "Maintenance",   brand: "Harvest Peak Capital", campaignId: "CABFD292", status: "approved", messagesPerDay: 5200 },
  { id: "camp.wo-scheduling",      name: "Maintenance · Scheduling",          useCase: "Maintenance",   brand: "Harvest Peak Capital", campaignId: "CABFD2A3", status: "approved", messagesPerDay: 1800 },
  { id: "camp.collections",        name: "Collections · Delinquency Notices", useCase: "Collections",   brand: "Harvest Peak Capital", campaignId: "CABFD2B4", status: "approved", messagesPerDay: 1200 },
  { id: "camp.renewal-offers",     name: "Renewals · Offer Delivery",         useCase: "Renewals",      brand: "Harvest Peak Capital", campaignId: "CABFD2C5", status: "approved", messagesPerDay: 950 },
  { id: "camp.renewal-reminders",  name: "Renewals · Decision Reminders",     useCase: "Renewals",     brand: "Harvest Peak Capital", campaignId: "CABFD2D6", status: "approved", messagesPerDay: 900 },
  { id: "camp.marketing-promos",   name: "Marketing · Promotions",            useCase: "Marketing",     brand: "Harvest Peak Capital", campaignId: "CABFD2E7", status: "pending",  messagesPerDay: 2500 },
  { id: "camp.emergency",          name: "Emergency · Property Notifications", useCase: "Emergency",   brand: "Harvest Peak Capital", campaignId: "CABFD2F8", status: "approved", messagesPerDay: 250 },
  { id: "camp.oxp-custom-agents",  name: "OXP · Custom Agents (general)",     useCase: "Resident Care", brand: "Harvest Peak Capital", campaignId: "CABFD309", status: "approved", messagesPerDay: 500 },
];

/** Available merge fields for the First Message textareas. */
export const FIRST_MESSAGE_MERGE_FIELDS = [
  { token: "{{property.name}}",        label: "Property name",         example: "Hillside Living" },
  { token: "{{property.short_name}}",  label: "Property short name",   example: "Hillside" },
  { token: "{{property.city}}",        label: "Property city",         example: "Denver" },
  { token: "{{property.state}}",       label: "Property state",        example: "CO" },
  { token: "{{property.phone}}",       label: "Property phone",        example: "(303) 555-0142" },
  { token: "{{property.email}}",       label: "Property email",        example: "leasing+hil-001@harvestpeak.com" },
  { token: "{{property.address}}",     label: "Property address",      example: "1200 E 17th Ave, Denver, CO" },
  { token: "{{property.office_hours}}", label: "Office hours",         example: "Mon–Fri 9a–6p" },
  { token: "{{property.website}}",     label: "Property website",      example: "hillsideliving.com" },
  { token: "{{customer.first_name}}",  label: "Customer first name",   example: "Jordan" },
  { token: "{{customer.last_name}}",   label: "Customer last name",    example: "Reyes" },
  { token: "{{agent.persona}}",        label: "Agent persona name",    example: "Eric" },
  { token: "{{pmc.name}}",             label: "PMC name",              example: "Harvest Peak Capital" },
] as const;

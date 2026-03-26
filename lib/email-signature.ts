/**
 * Default outbound email signature (communications-setup template).
 * Missing merge values are replaced with empty strings.
 */
export const EMAIL_SIGNATURE_TEMPLATE_DEFAULT = `Best regards,
{{StaffName}}
{{StaffTitle}}

{{PropertyName}}
{{PropertyPhone}}
{{PropertyAddress}}`;

export type EmailSignatureMergeFields = {
  staffName: string;
  staffTitle: string;
  propertyName: string;
  propertyPhone: string;
  propertyAddress: string;
};

const PLACEHOLDERS: Record<string, keyof EmailSignatureMergeFields> = {
  "{{StaffName}}": "staffName",
  "{{StaffTitle}}": "staffTitle",
  "{{PropertyName}}": "propertyName",
  "{{PropertyPhone}}": "propertyPhone",
  "{{PropertyAddress}}": "propertyAddress",
};

export function mergeEmailSignatureTemplate(
  template: string,
  fields: EmailSignatureMergeFields
): string {
  let out = template;
  for (const [token, key] of Object.entries(PLACEHOLDERS)) {
    const value = fields[key] ?? "";
    out = out.split(token).join(value);
  }
  return out;
}

/** Prototype property directory for signature merge fields. */
export const PROPERTY_EMAIL_CONTACTS: Record<string, { phone: string; address: string }> = {
  "Hillside Living": {
    phone: "(720) 555-0140",
    address: "1800 Hillside Parkway, Denver, CO 80205",
  },
  "Jamison Apartments": {
    phone: "(720) 555-0280",
    address: "2400 Jamison Circle, Aurora, CO 80014",
  },
  "Sun Valley": {
    phone: "(720) 555-0310",
    address: "1200 Sun Valley Drive, Boulder, CO 80301",
  },
};

/** Vanity line + leasing inbox shown on property hover (conversation list). */
export const PROPERTY_VANITY_CONTACT: Record<string, { vanityNumber: string; email: string }> = {
  "Hillside Living": {
    vanityNumber: "(844) 555-7444",
    email: "leasing@hillsideliving.com",
  },
  "Jamison Apartments": {
    vanityNumber: "(844) 555-9262",
    email: "hello@jamisonapartments.com",
  },
  "Sun Valley": {
    vanityNumber: "(844) 555-3100",
    email: "leasing@sunvalleyliving.com",
  },
};

/** Outbound “From” line for new Entrata-side threads (SMS vanity or leasing email). */
export type PropertyFromChannelOption = {
  id: string;
  channel: "SMS" | "Email";
  propertyName: string;
  from: string;
};

export function getPropertyFromChannelOptions(): PropertyFromChannelOption[] {
  const out: PropertyFromChannelOption[] = [];
  for (const propertyName of Object.keys(PROPERTY_VANITY_CONTACT)) {
    const v = PROPERTY_VANITY_CONTACT[propertyName];
    if (!v) continue;
    out.push({
      id: `${propertyName}::SMS`,
      channel: "SMS",
      propertyName,
      from: v.vanityNumber,
    });
    out.push({
      id: `${propertyName}::Email`,
      channel: "Email",
      propertyName,
      from: v.email,
    });
  }
  return out.sort((a, b) => {
    const byP = a.propertyName.localeCompare(b.propertyName);
    if (byP !== 0) return byP;
    return a.channel === b.channel ? 0 : a.channel === "SMS" ? -1 : 1;
  });
}

/** SMS vanity + leasing email for one property only (new thread From line). */
export function getPropertyFromChannelOptionsForProperty(
  propertyName: string
): PropertyFromChannelOption[] {
  const v = PROPERTY_VANITY_CONTACT[propertyName];
  if (!v) return [];
  return [
    {
      id: `${propertyName}::SMS`,
      channel: "SMS",
      propertyName,
      from: v.vanityNumber,
    },
    {
      id: `${propertyName}::Email`,
      channel: "Email",
      propertyName,
      from: v.email,
    },
  ];
}

export function getPropertyVanityContact(propertyName: string): {
  vanityNumber: string;
  email: string;
} | null {
  return PROPERTY_VANITY_CONTACT[propertyName] ?? null;
}

/** Email From/To used in Email-channel threads (matches conversation detail header). */
export function getEmailThreadRoutingAddresses(
  residentName: string,
  propertyName: string
): { residentEmail: string; propertyInboxEmail: string } {
  const residentEmail = `${residentName.replace(/\s+/g, ".").toLowerCase()}@email.com`;
  const propertyInboxEmail = `leasing@${propertyName.replace(/\s+/g, "").toLowerCase()}.com`;
  return { residentEmail, propertyInboxEmail };
}

/**
 * Phone From/To for non-email threads (conversation list tooltip).
 * Resident line is a stable prototype number derived from the name; property line prefers vanity, then main office.
 */
export function getVoiceOrSmsThreadRoutingNumbers(
  residentName: string,
  propertyName: string
): { residentPhone: string; propertyLine: string } {
  let h = 0;
  for (let i = 0; i < residentName.length; i++) {
    h = residentName.charCodeAt(i) + ((h << 5) - h);
  }
  const last4 = String(Math.abs(h) % 10000).padStart(4, "0");
  const residentPhone = `(720) 555-${last4}`;
  const vanity = getPropertyVanityContact(propertyName);
  const main = getPropertyEmailContact(propertyName);
  const propertyLine = vanity?.vanityNumber || main.propertyPhone || "";
  return { residentPhone, propertyLine };
}

export function getPropertyEmailContact(propertyName: string): {
  propertyPhone: string;
  propertyAddress: string;
} {
  const row = PROPERTY_EMAIL_CONTACTS[propertyName];
  return {
    propertyPhone: row?.phone ?? "",
    propertyAddress: row?.address ?? "",
  };
}

export function buildStaffEmailSignatureBody(fields: {
  staffName: string;
  staffTitle: string;
  propertyName: string;
}): string {
  const { propertyPhone, propertyAddress } = getPropertyEmailContact(fields.propertyName);
  return mergeEmailSignatureTemplate(EMAIL_SIGNATURE_TEMPLATE_DEFAULT, {
    staffName: fields.staffName,
    staffTitle: fields.staffTitle,
    propertyName: fields.propertyName,
    propertyPhone,
    propertyAddress,
  });
}

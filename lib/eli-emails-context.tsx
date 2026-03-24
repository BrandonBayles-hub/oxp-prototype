"use client";

import { createContext, useCallback, useContext, useState } from "react";

export type ImapSmtpConfig = {
  enabled: boolean;
  address: string;
  port: string;
  email: string;
  password: string;
  enableSsl: boolean;
};

export type IntegrationMethod = "google" | "microsoft" | "other";

export type EliEmailAddress = {
  id: number;
  emailAddress: string;
  forwardTo: string;
  properties: string[];
  serviceTypes: string[];
  imapConfig: ImapSmtpConfig;
  smtpConfig: ImapSmtpConfig;
  status: "active" | "disabled";
  created: string;
  integration?: IntegrationMethod;
};

const INITIAL_EMAILS: EliEmailAddress[] = [
  { id: 1, emailAddress: "test-prod@entrata-nexus.com", forwardTo: "test-prod@entrata-nexus.com", properties: ["Oakwood Terrace"], serviceTypes: ["ELI+ Renewals AI"], imapConfig: { enabled: false, address: "", port: "", email: "", password: "", enableSsl: false }, smtpConfig: { enabled: false, address: "", port: "", email: "", password: "", enableSsl: false }, status: "active", created: "2026-01-21" },
  { id: 2, emailAddress: "spidyamit@zohomail.com", forwardTo: "spidyamit@zohomail.com", properties: ["Skyline Apartments", "Brandon's Buildings"], serviceTypes: ["ELI+ Leasing AI"], imapConfig: { enabled: true, address: "imap.zohomail.com", port: "993", email: "spidyamit@zohomail.com", password: "••••••••", enableSsl: true }, smtpConfig: { enabled: true, address: "smtp.zohomail.com", port: "465", email: "spidyamit@zohomail.com", password: "••••••••", enableSsl: true }, status: "active", created: "2026-01-21" },
  { id: 3, emailAddress: "test1@gmail.com", forwardTo: "test1@gmail.com", properties: ["Azure Heights", "Pine Valley Estates"], serviceTypes: ["ELI+ Leasing AI"], imapConfig: { enabled: true, address: "imap.gmail.com", port: "993", email: "test1@gmail.com", password: "••••••••", enableSsl: true }, smtpConfig: { enabled: true, address: "smtp.gmail.com", port: "465", email: "test1@gmail.com", password: "••••••••", enableSsl: true }, status: "active", created: "2026-01-21", integration: "google" },
  { id: 4, emailAddress: "test2@gmail.com", forwardTo: "test2@gmail.com", properties: ["Cambridge Suites", "Sunset Ridge"], serviceTypes: ["ELI+ Payments AI"], imapConfig: { enabled: true, address: "imap.gmail.com", port: "993", email: "test2@gmail.com", password: "••••••••", enableSsl: true }, smtpConfig: { enabled: true, address: "smtp.gmail.com", port: "465", email: "test2@gmail.com", password: "••••••••", enableSsl: true }, status: "active", created: "2026-01-21", integration: "microsoft" },
];

type EliEmailsContextValue = {
  emails: EliEmailAddress[];
  setEmails: React.Dispatch<React.SetStateAction<EliEmailAddress[]>>;
  connectedEmails: EliEmailAddress[];
  pendingEmails: EliEmailAddress[];
  isPropertyConnected: (propertyName: string) => boolean;
  getEmailForProperty: (propertyName: string) => EliEmailAddress | undefined;
  getServiceTypesForProperty: (propertyName: string) => string[];
};

const EliEmailsContext = createContext<EliEmailsContextValue | null>(null);

function isFullyConnected(e: EliEmailAddress): boolean {
  if (e.integration === "google" || e.integration === "microsoft") return true;
  return e.imapConfig.enabled && e.smtpConfig.enabled;
}

export function EliEmailsProvider({ children }: { children: React.ReactNode }) {
  const [emails, setEmails] = useState<EliEmailAddress[]>(INITIAL_EMAILS);

  const connectedEmails = emails.filter(isFullyConnected);
  const pendingEmails = emails.filter((e) => !isFullyConnected(e));

  const isPropertyConnected = useCallback(
    (propertyName: string) => connectedEmails.some((e) => e.properties.includes(propertyName)),
    [connectedEmails]
  );

  const getEmailForProperty = useCallback(
    (propertyName: string) => connectedEmails.find((e) => e.properties.includes(propertyName)),
    [connectedEmails]
  );

  const getServiceTypesForProperty = useCallback(
    (propertyName: string) => {
      const email = connectedEmails.find((e) => e.properties.includes(propertyName));
      return email?.serviceTypes ?? [];
    },
    [connectedEmails]
  );

  return (
    <EliEmailsContext.Provider
      value={{ emails, setEmails, connectedEmails, pendingEmails, isPropertyConnected, getEmailForProperty, getServiceTypesForProperty }}
    >
      {children}
    </EliEmailsContext.Provider>
  );
}

export function useEliEmails() {
  const ctx = useContext(EliEmailsContext);
  if (!ctx) throw new Error("useEliEmails must be used within EliEmailsProvider");
  return ctx;
}

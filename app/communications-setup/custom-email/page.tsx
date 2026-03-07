"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Globe,
  CheckCircle2,
  Circle,
  Copy,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Info,
  Pencil,
} from "lucide-react";

const PROPERTIES = [
  "Brandon's Buildings",
  "Aluminia Apartments",
  "Harvest Peak Capital",
  "Sunset Ridge",
  "Oakwood Terrace",
  "Pine Valley Estates",
];

const SERVICE_TYPES = [
  "All Service Types",
  "ELI Leasing",
  "Facilities",
  "Leasing",
  "Message Center",
];

type DkimStatus = "not_started" | "pending" | "verified";

type ImapSmtpConfig = {
  enabled: boolean;
  address: string;
  port: string;
  email: string;
  password: string;
  enableSsl: boolean;
};

type EmailAddress = {
  id: number;
  emailAddress: string;
  forwardTo: string;
  properties: string[];
  serviceTypes: string[];
  imapConfig: ImapSmtpConfig;
  smtpConfig: ImapSmtpConfig;
  status: "active" | "disabled";
  created: string;
};

type Subdomain = {
  id: number;
  subdomain: string;
  properties: string[];
  serviceTypes: string[];
  verified: boolean;
};

type AuthenticatedDomain = {
  id: number;
  domain: string;
  dkimStatus: DkimStatus;
  subdomains: Subdomain[];
  emailAddresses: EmailAddress[];
  expanded: boolean;
};

function getDkimRecords(domain: string) {
  return [
    { type: "CNAME", name: `s1._domainkey.${domain}`, value: "s1.domainkey.u12345.wl001.sendgrid.net", purpose: "DKIM Signature 1" },
    { type: "CNAME", name: `s2._domainkey.${domain}`, value: "s2.domainkey.u12345.wl001.sendgrid.net", purpose: "DKIM Signature 2" },
    { type: "CNAME", name: `em1234.${domain}`, value: "u12345.wl001.sendgrid.net", purpose: "Return Path (SPF)" },
    { type: "CNAME", name: `url1234.${domain}`, value: "sendgrid.net", purpose: "Branded Link Tracking" },
    { type: "TXT", name: `_dmarc.${domain}`, value: "v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@entrata.com; ruf=mailto:dmarc@entrata.com", purpose: "DMARC Policy" },
  ];
}

function DkimStatusBadge({ status }: { status: DkimStatus }) {
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Verified
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
        <Circle className="h-3.5 w-3.5 animate-pulse" />
        Verifying...
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-500">
      <Circle className="h-3.5 w-3.5" />
      Not Verified
    </span>
  );
}

export default function CustomEmailPage() {
  const [domains, setDomains] = useState<AuthenticatedDomain[]>([
    {
      id: 1,
      domain: "greystar.com",
      dkimStatus: "verified",
      expanded: false,
      subdomains: [
        { id: 1, subdomain: "leasing", properties: ["Brandon's Buildings"], serviceTypes: ["Leasing", "ELI Leasing"], verified: true },
      ],
      emailAddresses: [
        { id: 1, emailAddress: "test-prod@entrata-nexus.com", forwardTo: "test-prod@entrata-nexus.com", properties: ["Brandon's Buildings"], serviceTypes: [], imapConfig: { enabled: false, address: "", port: "", email: "", password: "", enableSsl: false }, smtpConfig: { enabled: false, address: "", port: "", email: "", password: "", enableSsl: false }, status: "active", created: "2026-01-21" },
        { id: 2, emailAddress: "spidyamit@zohomail.com", forwardTo: "spidyamit@zohomail.com", properties: ["Brandon's Buildings"], serviceTypes: ["Leasing"], imapConfig: { enabled: true, address: "imap.zohomail.com", port: "993", email: "spidyamit@zohomail.com", password: "••••••••", enableSsl: true }, smtpConfig: { enabled: true, address: "smtp.zohomail.com", port: "465", email: "spidyamit@zohomail.com", password: "••••••••", enableSsl: true }, status: "active", created: "2026-01-21" },
        { id: 3, emailAddress: "test1@gmail.com", forwardTo: "test1@gmail.com", properties: ["Aluminia Apartments"], serviceTypes: ["ELI Leasing"], imapConfig: { enabled: true, address: "imap.gmail.com", port: "993", email: "test1@gmail.com", password: "••••••••", enableSsl: true }, smtpConfig: { enabled: true, address: "smtp.gmail.com", port: "465", email: "test1@gmail.com", password: "••••••••", enableSsl: true }, status: "active", created: "2026-01-21" },
        { id: 4, emailAddress: "test2@gmail.com", forwardTo: "test2@gmail.com", properties: ["Aluminia Apartments"], serviceTypes: ["Facilities"], imapConfig: { enabled: true, address: "imap.gmail.com", port: "993", email: "test2@gmail.com", password: "••••••••", enableSsl: true }, smtpConfig: { enabled: true, address: "smtp.gmail.com", port: "465", email: "test2@gmail.com", password: "••••••••", enableSsl: true }, status: "active", created: "2026-01-21" },
      ],
    },
    {
      id: 2,
      domain: "harvestpeak.com",
      dkimStatus: "not_started",
      expanded: false,
      subdomains: [
        { id: 2, subdomain: "maintenance", properties: ["Harvest Peak Capital"], serviceTypes: ["Facilities"], verified: false },
      ],
      emailAddresses: [
        { id: 5, emailAddress: "test3@gmail.com", forwardTo: "test3@gmail.com", properties: ["Harvest Peak Capital"], serviceTypes: [], imapConfig: { enabled: true, address: "imap.gmail.com", port: "993", email: "test3@gmail.com", password: "••••••••", enableSsl: true }, smtpConfig: { enabled: true, address: "smtp.gmail.com", port: "465", email: "test3@gmail.com", password: "••••••••", enableSsl: true }, status: "active", created: "2026-01-21" },
        { id: 6, emailAddress: "test-4581@zohomail.in", forwardTo: "test-4581@zohomail.in", properties: ["Brandon's Buildings"], serviceTypes: ["Message Center"], imapConfig: { enabled: true, address: "imap.zohomail.in", port: "993", email: "test-4581@zohomail.in", password: "••••••••", enableSsl: true }, smtpConfig: { enabled: true, address: "smtp.zohomail.in", port: "465", email: "test-4581@zohomail.in", password: "••••••••", enableSsl: true }, status: "active", created: "2026-01-23" },
      ],
    },
  ]);

  const [showAddDomain, setShowAddDomain] = useState(false);
  const [newDomainInput, setNewDomainInput] = useState("");

  const handleAddDomain = () => {
    if (!newDomainInput.trim()) return;
    setDomains((prev) => [
      ...prev,
      {
        id: Date.now(),
        domain: newDomainInput.trim().toLowerCase(),
        dkimStatus: "not_started",
        subdomains: [],
        emailAddresses: [],
        expanded: true,
      },
    ]);
    setNewDomainInput("");
    setShowAddDomain(false);
  };

  const handleVerifyDkim = (domainId: number) => {
    setDomains((prev) =>
      prev.map((d) => (d.id === domainId ? { ...d, dkimStatus: "pending" as DkimStatus } : d))
    );
    setTimeout(() => {
      setDomains((prev) =>
        prev.map((d) => (d.id === domainId ? { ...d, dkimStatus: "verified" as DkimStatus } : d))
      );
    }, 1500);
  };

  const handleDeleteDomain = (domainId: number) => {
    setDomains((prev) => prev.filter((d) => d.id !== domainId));
  };

  const toggleDomainExpanded = (domainId: number) => {
    setDomains((prev) =>
      prev.map((d) => (d.id === domainId ? { ...d, expanded: !d.expanded } : d))
    );
  };

  const handleDeleteEmail = (domainId: number, emailId: number) => {
    setDomains((prev) =>
      prev.map((d) =>
        d.id === domainId
          ? { ...d, emailAddresses: d.emailAddresses.filter((e) => e.id !== emailId) }
          : d
      )
    );
  };

  const defaultImapSmtp: ImapSmtpConfig = { enabled: false, address: "", port: "", email: "", password: "", enableSsl: false };
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailModalDomainId, setEmailModalDomainId] = useState<number | null>(null);
  const [emailModalEditId, setEmailModalEditId] = useState<number | null>(null);
  const [emailForm, setEmailForm] = useState({
    emailAddress: "",
    properties: [] as string[],
    serviceTypes: [] as string[],
    forwardTo: "",
    imapConfig: { ...defaultImapSmtp },
    smtpConfig: { ...defaultImapSmtp },
  });
  const [emailFormPropDropdown, setEmailFormPropDropdown] = useState(false);
  const [emailFormSvcDropdown, setEmailFormSvcDropdown] = useState(false);
  const [forwardToCopied, setForwardToCopied] = useState(false);

  const openAddEmailModal = (domainId: number) => {
    const domain = domains.find((d) => d.id === domainId);
    const forwardTo = domain ? `new-address@${domain.domain}` : "";
    setEmailModalDomainId(domainId);
    setEmailModalEditId(null);
    setEmailForm({
      emailAddress: "",
      properties: [],
      serviceTypes: [],
      forwardTo,
      imapConfig: { ...defaultImapSmtp },
      smtpConfig: { ...defaultImapSmtp },
    });
    setEmailModalOpen(true);
  };

  const openEditEmailModal = (domainId: number, email: EmailAddress) => {
    setEmailModalDomainId(domainId);
    setEmailModalEditId(email.id);
    setEmailForm({
      emailAddress: email.emailAddress,
      properties: [...email.properties],
      serviceTypes: [...email.serviceTypes],
      forwardTo: email.forwardTo,
      imapConfig: { ...email.imapConfig },
      smtpConfig: { ...email.smtpConfig },
    });
    setEmailModalOpen(true);
  };

  const closeEmailModal = () => {
    setEmailModalOpen(false);
    setEmailModalDomainId(null);
    setEmailModalEditId(null);
    setEmailFormPropDropdown(false);
    setEmailFormSvcDropdown(false);
    setForwardToCopied(false);
  };

  const handleEmailModalComplete = () => {
    if (!emailForm.emailAddress.trim() || emailForm.properties.length === 0 || !emailModalDomainId) return;
    const isSmtpActive = emailForm.smtpConfig.enabled && emailForm.smtpConfig.address.trim() !== "";
    const isImapActive = emailForm.imapConfig.enabled && emailForm.imapConfig.address.trim() !== "";

    if (emailModalEditId) {
      setDomains((prev) =>
        prev.map((d) =>
          d.id === emailModalDomainId
            ? {
                ...d,
                emailAddresses: d.emailAddresses.map((e) =>
                  e.id === emailModalEditId
                    ? {
                        ...e,
                        emailAddress: emailForm.emailAddress.trim(),
                        forwardTo: emailForm.forwardTo,
                        properties: emailForm.properties,
                        serviceTypes: emailForm.serviceTypes,
                        imapConfig: emailForm.imapConfig,
                        smtpConfig: emailForm.smtpConfig,
                        status: (isSmtpActive || isImapActive ? "active" : e.status) as "active" | "disabled",
                      }
                    : e
                ),
              }
            : d
        )
      );
    } else {
      setDomains((prev) =>
        prev.map((d) =>
          d.id === emailModalDomainId
            ? {
                ...d,
                emailAddresses: [
                  ...d.emailAddresses,
                  {
                    id: Date.now(),
                    emailAddress: emailForm.emailAddress.trim(),
                    forwardTo: emailForm.forwardTo,
                    properties: emailForm.properties,
                    serviceTypes: emailForm.serviceTypes,
                    imapConfig: emailForm.imapConfig,
                    smtpConfig: emailForm.smtpConfig,
                    status: (isSmtpActive || isImapActive ? "active" : "disabled") as "active" | "disabled",
                    created: new Date().toISOString().split("T")[0],
                  },
                ],
              }
            : d
        )
      );
    }
    closeEmailModal();
  };

  const toggleEmailFormProp = (prop: string) => {
    setEmailForm((prev) => ({
      ...prev,
      properties: prev.properties.includes(prop) ? prev.properties.filter((p) => p !== prop) : [...prev.properties, prop],
    }));
  };

  const toggleEmailFormSvc = (svc: string) => {
    if (svc === "All Service Types") {
      setEmailForm((prev) => ({
        ...prev,
        serviceTypes: prev.serviceTypes.includes(svc) ? [] : SERVICE_TYPES.filter((s) => s !== "All Service Types"),
      }));
    } else {
      setEmailForm((prev) => {
        const next = prev.serviceTypes.includes(svc) ? prev.serviceTypes.filter((s) => s !== svc) : [...prev.serviceTypes, svc];
        return { ...prev, serviceTypes: next.filter((s) => s !== "All Service Types") };
      });
    }
  };

  return (
    <div className="mx-auto max-w-[56rem] px-4 pb-12 pt-8 sm:px-6">
      <Link
        href="/communications-setup"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Communications Setup
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-2xl font-medium tracking-tight text-[hsl(var(--foreground))]"
            style={{ fontFamily: "Nohemi, Plus Jakarta Sans, Inter, sans-serif" }}
          >
            Setup Email Domain
          </h1>
          <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">
            Authenticate your email domains via DKIM and create custom subdomains for your properties.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddDomain(true)}
          className="btn-primary shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Domain
        </button>
      </div>

      <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <p className="text-xs leading-relaxed text-blue-800">
          Domain authentication works with any DNS host or registrar (GoDaddy, Cloudflare, Namecheap, AWS Route 53, etc.). The DNS records are the same regardless of your hosting provider. You can authenticate multiple domains if your properties use different email domains.
        </p>
      </div>

      {showAddDomain && (
        <div className="mb-6 rounded-lg border border-[hsl(var(--border))] bg-white px-6 py-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Add New Domain
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={newDomainInput}
              onChange={(e) => setNewDomainInput(e.target.value)}
              placeholder="e.g. greystar.com"
              className="input-base flex-1"
              onKeyDown={(e) => { if (e.key === "Enter") handleAddDomain(); }}
            />
            <button
              type="button"
              onClick={handleAddDomain}
              disabled={!newDomainInput.trim()}
              className="btn-primary disabled:pointer-events-none disabled:opacity-50"
            >
              Add Domain
            </button>
            <button
              type="button"
              onClick={() => { setShowAddDomain(false); setNewDomainInput(""); }}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {domains.map((domainEntry) => (
          <div key={domainEntry.id} className="rounded-lg border border-[hsl(var(--border))] bg-white">
            <div
              className="flex items-center gap-3 px-6 py-4 cursor-pointer hover:bg-[hsl(var(--muted))]/20 transition-colors"
              onClick={() => toggleDomainExpanded(domainEntry.id)}
            >
              <ShieldCheck className="h-5 w-5 shrink-0 text-[hsl(var(--muted-foreground))]" />
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-[hsl(var(--foreground))]">{domainEntry.domain}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {domainEntry.subdomains.length} subdomain{domainEntry.subdomains.length !== 1 ? "s" : ""} configured
                </p>
              </div>
              <DkimStatusBadge status={domainEntry.dkimStatus} />
              {domainEntry.expanded ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
              )}
            </div>

            {domainEntry.expanded && (
              <div className="border-t border-[hsl(var(--border))]">
                <div className="px-6 py-5 space-y-4 border-b border-[hsl(var(--border))]/40">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">
                      Authenticate Domain
                    </h3>
                    <div className="flex items-center gap-2">
                      {domainEntry.dkimStatus !== "verified" && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleVerifyDkim(domainEntry.id); }}
                          disabled={domainEntry.dkimStatus === "pending"}
                          className="btn-primary text-xs h-8 disabled:pointer-events-none disabled:opacity-50"
                        >
                          {domainEntry.dkimStatus === "pending" ? "Verifying..." : "Verify Domain"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteDomain(domainEntry.id); }}
                        className="rounded p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    <p className="text-xs leading-relaxed text-blue-800">
                      Add all of the following DNS records at your domain registrar. Once published, click &quot;Verify Domain&quot; — propagation may take up to 48 hours.
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))]">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
                          <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Purpose</th>
                          <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Type</th>
                          <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Host / Name</th>
                          <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Value / Points To</th>
                          <th className="w-10 px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[hsl(var(--border))]/40">
                        {getDkimRecords(domainEntry.domain).map((rec) => (
                          <tr key={rec.name}>
                            <td className="px-4 py-2.5 text-xs font-medium text-[hsl(var(--foreground))]">{rec.purpose}</td>
                            <td className="px-4 py-2.5">
                              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono font-medium text-gray-700">{rec.type}</span>
                            </td>
                            <td className="px-4 py-2.5 text-xs font-mono text-[hsl(var(--foreground))] break-all">{rec.name}</td>
                            <td className="px-4 py-2.5 text-xs font-mono text-[hsl(var(--muted-foreground))] break-all">{rec.value}</td>
                            <td className="px-4 py-2.5">
                              <button
                                type="button"
                                onClick={() => navigator.clipboard.writeText(rec.value)}
                                className="rounded p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                                title="Copy value"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="px-6 py-5 space-y-4 border-t border-[hsl(var(--border))]/40">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">
                      Configured Email Addresses
                    </h3>
                    <button
                      type="button"
                      onClick={() => openAddEmailModal(domainEntry.id)}
                      className="btn-secondary text-xs h-8"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add New Email Address
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-[hsl(var(--border))]">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Email Address</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Properties</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">IMAP</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">SMTP</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Status</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Created</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[hsl(var(--border))]/40">
                        {domainEntry.emailAddresses.map((email) => (
                          <tr key={email.id} className="hover:bg-[hsl(var(--muted))]/20 transition-colors">
                            <td className="px-4 py-3 text-xs font-medium text-[hsl(var(--foreground))]">{email.emailAddress}</td>
                            <td className="px-4 py-3 text-xs text-[hsl(var(--foreground))]">
                              {email.properties.length > 1
                                ? `${email.properties[0]} +${email.properties.length - 1}`
                                : email.properties[0] || "—"}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${email.imapConfig.enabled ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                                {email.imapConfig.enabled ? "Enabled" : "Disabled"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${email.smtpConfig.enabled ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                                {email.smtpConfig.enabled ? "Enabled" : "Disabled"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${email.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                                {email.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]">{email.created}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditEmailModal(domainEntry.id, email)}
                                  className="rounded p-1.5 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))]/40 hover:text-[hsl(var(--foreground))]"
                                  title="Edit email"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEmail(domainEntry.id, email.id)}
                                  className="rounded p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                  title="Delete email"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {domainEntry.emailAddresses.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-xs text-[hsl(var(--muted-foreground))]">
                              No email addresses configured yet. Click &quot;Add New Email Address&quot; to get started.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {domains.length === 0 && (
          <div className="rounded-lg border border-dashed border-[hsl(var(--border))] bg-white py-12 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-[hsl(var(--border))]" />
            <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
              No domains configured yet. Add a domain to get started.
            </p>
          </div>
        )}
      </div>

      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={closeEmailModal} />
          <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-[hsl(var(--border))] bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[hsl(var(--border))] bg-white px-6 py-4 rounded-t-xl">
              <div>
                <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                  {emailModalEditId ? "Edit Email Address" : "Add New Email Address"}
                </h2>
                <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                  Set up a new custom email address with forwarding and IMAP/SMTP configuration
                </p>
              </div>
              <button type="button" onClick={closeEmailModal} className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/40 hover:text-[hsl(var(--foreground))] transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[hsl(var(--foreground))]">Email Address</label>
                <input
                  type="email"
                  value={emailForm.emailAddress}
                  onChange={(e) => setEmailForm((prev) => ({ ...prev, emailAddress: e.target.value }))}
                  placeholder="e.g. test-prod@entrata-nexus.com"
                  className="input-base w-full"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[hsl(var(--foreground))]">Properties</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setEmailFormPropDropdown(!emailFormPropDropdown); setEmailFormSvcDropdown(false); }}
                    className="input-base flex w-full items-center justify-between text-left"
                  >
                    <span className={emailForm.properties.length > 0 ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]"}>
                      {emailForm.properties.length > 0
                        ? `${emailForm.properties.length} Propert${emailForm.properties.length === 1 ? "y" : "ies"} selected`
                        : "Select properties..."}
                    </span>
                    <ChevronDown className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  </button>
                  {emailFormPropDropdown && (
                    <div className="absolute z-20 mt-1 w-full rounded-md border border-[hsl(var(--border))] bg-white py-1 shadow-lg max-h-48 overflow-y-auto">
                      {PROPERTIES.map((prop) => (
                        <button
                          key={prop}
                          type="button"
                          onClick={() => toggleEmailFormProp(prop)}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-[hsl(var(--muted))]/40"
                        >
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${emailForm.properties.includes(prop) ? "border-blue-600 bg-blue-600 text-white" : "border-[hsl(var(--border))]"}`}>
                            {emailForm.properties.includes(prop) && (
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            )}
                          </span>
                          <span className="text-[hsl(var(--foreground))]">{prop}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Select one or more properties to associate with this email address</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[hsl(var(--foreground))]">Service Types</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setEmailFormSvcDropdown(!emailFormSvcDropdown); setEmailFormPropDropdown(false); }}
                    className="input-base flex w-full items-center justify-between text-left"
                  >
                    <span className={emailForm.serviceTypes.length > 0 ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]"}>
                      {emailForm.serviceTypes.length > 0
                        ? `${emailForm.serviceTypes.length} service type${emailForm.serviceTypes.length === 1 ? "" : "s"} selected`
                        : "Select service types..."}
                    </span>
                    <ChevronDown className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  </button>
                  {emailFormSvcDropdown && (
                    <div className="absolute z-20 mt-1 w-full rounded-md border border-[hsl(var(--border))] bg-white py-1 shadow-lg max-h-48 overflow-y-auto">
                      {SERVICE_TYPES.map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => toggleEmailFormSvc(st)}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-[hsl(var(--muted))]/40"
                        >
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${emailForm.serviceTypes.includes(st) ? "border-blue-600 bg-blue-600 text-white" : "border-[hsl(var(--border))]"}`}>
                            {emailForm.serviceTypes.includes(st) && (
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            )}
                          </span>
                          <span className="text-[hsl(var(--foreground))]">{st}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Select one or more service types to associate with this email address</p>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-blue-600">
                  Forward to Email
                  <Info className="h-3.5 w-3.5" />
                </label>
                <p className="mb-2 text-xs text-[hsl(var(--muted-foreground))]">Start forwarding your emails to the following email address.</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={emailForm.forwardTo}
                    readOnly
                    className="input-base flex-1 bg-[hsl(var(--muted))]/30"
                  />
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(emailForm.forwardTo); setForwardToCopied(true); setTimeout(() => setForwardToCopied(false), 2000); }}
                    className="btn-secondary h-9 px-4 text-xs shrink-0"
                  >
                    {forwardToCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <hr className="border-[hsl(var(--border))]" />

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-blue-600">
                  IMAP
                  <Info className="h-3.5 w-3.5" />
                </label>
                <p className="mb-3 text-xs text-[hsl(var(--muted-foreground))]">Set your IMAP details</p>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${emailForm.imapConfig.enabled ? "border-blue-600 bg-blue-600 text-white" : "border-[hsl(var(--border))]"}`}>
                    {emailForm.imapConfig.enabled && (
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    checked={emailForm.imapConfig.enabled}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, imapConfig: { ...prev.imapConfig, enabled: e.target.checked } }))}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-[hsl(var(--foreground))]">Enable IMAP configuration for this inbox</span>
                </label>
                <p className="mt-1 ml-[30px] text-xs text-[hsl(var(--muted-foreground))]">Enabling IMAP will help the user to receive email</p>

                {emailForm.imapConfig.enabled && (
                  <div className="mt-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/10 p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[hsl(var(--foreground))]">Address</label>
                        <input type="text" value={emailForm.imapConfig.address} onChange={(e) => setEmailForm((prev) => ({ ...prev, imapConfig: { ...prev.imapConfig, address: e.target.value } }))} placeholder="imap.gmail.com" className="input-base w-full text-xs" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[hsl(var(--foreground))]">Port</label>
                        <input type="text" value={emailForm.imapConfig.port} onChange={(e) => setEmailForm((prev) => ({ ...prev, imapConfig: { ...prev.imapConfig, port: e.target.value } }))} placeholder="993" className="input-base w-full text-xs" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[hsl(var(--foreground))]">Email</label>
                        <input type="email" value={emailForm.imapConfig.email} onChange={(e) => setEmailForm((prev) => ({ ...prev, imapConfig: { ...prev.imapConfig, email: e.target.value } }))} placeholder="user@domain.com" className="input-base w-full text-xs" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[hsl(var(--foreground))]">Password</label>
                        <input type="password" value={emailForm.imapConfig.password} onChange={(e) => setEmailForm((prev) => ({ ...prev, imapConfig: { ...prev.imapConfig, password: e.target.value } }))} placeholder="••••••••" className="input-base w-full text-xs" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-blue-600">
                  SMTP
                  <Info className="h-3.5 w-3.5" />
                </label>
                <p className="mb-3 text-xs text-[hsl(var(--muted-foreground))]">Set your SMTP details</p>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${emailForm.smtpConfig.enabled ? "border-blue-600 bg-blue-600 text-white" : "border-[hsl(var(--border))]"}`}>
                    {emailForm.smtpConfig.enabled && (
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    checked={emailForm.smtpConfig.enabled}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, smtpConfig: { ...prev.smtpConfig, enabled: e.target.checked } }))}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-[hsl(var(--foreground))]">Enable SMTP configuration for this inbox</span>
                </label>
                <p className="mt-1 ml-[30px] text-xs text-[hsl(var(--muted-foreground))]">Enabling SMTP will help the user to send email</p>

                {emailForm.smtpConfig.enabled && (
                  <div className="mt-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/10 p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[hsl(var(--foreground))]">Address</label>
                        <input type="text" value={emailForm.smtpConfig.address} onChange={(e) => setEmailForm((prev) => ({ ...prev, smtpConfig: { ...prev.smtpConfig, address: e.target.value } }))} placeholder="smtp.gmail.com" className="input-base w-full text-xs" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[hsl(var(--foreground))]">Port</label>
                        <input type="text" value={emailForm.smtpConfig.port} onChange={(e) => setEmailForm((prev) => ({ ...prev, smtpConfig: { ...prev.smtpConfig, port: e.target.value } }))} placeholder="465" className="input-base w-full text-xs" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[hsl(var(--foreground))]">Email</label>
                        <input type="email" value={emailForm.smtpConfig.email} onChange={(e) => setEmailForm((prev) => ({ ...prev, smtpConfig: { ...prev.smtpConfig, email: e.target.value } }))} placeholder="user@domain.com" className="input-base w-full text-xs" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[hsl(var(--foreground))]">Password</label>
                        <input type="password" value={emailForm.smtpConfig.password} onChange={(e) => setEmailForm((prev) => ({ ...prev, smtpConfig: { ...prev.smtpConfig, password: e.target.value } }))} placeholder="••••••••" className="input-base w-full text-xs" />
                      </div>
                    </div>
                    <label className="flex items-center gap-2.5 cursor-pointer mt-2">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${emailForm.smtpConfig.enableSsl ? "border-blue-600 bg-blue-600 text-white" : "border-[hsl(var(--border))]"}`}>
                        {emailForm.smtpConfig.enableSsl && (
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        )}
                      </span>
                      <input
                        type="checkbox"
                        checked={emailForm.smtpConfig.enableSsl}
                        onChange={(e) => setEmailForm((prev) => ({ ...prev, smtpConfig: { ...prev.smtpConfig, enableSsl: e.target.checked } }))}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium text-[hsl(var(--foreground))]">Enable SSL</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-[hsl(var(--border))] bg-white px-6 py-4 rounded-b-xl">
              <button type="button" onClick={closeEmailModal} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEmailModalComplete}
                disabled={!emailForm.emailAddress.trim() || emailForm.properties.length === 0}
                className="btn-primary disabled:pointer-events-none disabled:opacity-50"
              >
                Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

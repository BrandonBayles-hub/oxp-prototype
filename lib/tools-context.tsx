"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/* ─────────────────────────────── Types ──────────────────────────────── */

export type ToolRisk = "low" | "medium" | "high";

export type EntrataTool = {
  id: string;
  name: string;
  label: string;
  description: string;
  risk: ToolRisk;
  enabled: boolean;
  requiresApproval: boolean;
};

export type EntrataModule = {
  id: string;
  name: string;
  description: string;
  contracted: boolean;
  tools: EntrataTool[];
};

export type CustomMcpServer = {
  id: string;
  name: string;
  url: string;
  description: string;
  enabled: boolean;
  connectionStatus: "connected" | "disconnected" | "pending";
  tools: { name: string; description: string }[];
  createdAt: string;
};

export type ToolsState = {
  entrataModules: EntrataModule[];
  customServers: CustomMcpServer[];
};

/* ─────────────────────────────── Defaults ───────────────────────────── */

const DEFAULT_ENTRATA_MODULES: EntrataModule[] = [
  {
    id: "leasing",
    name: "Leasing & CRM",
    description: "Lead capture, tour scheduling, availability queries, and prospect management.",
    contracted: true,
    tools: [
      { id: "et-1", name: "entrata/leads/create", label: "Create Lead", description: "Create or update a prospect lead record", risk: "medium", enabled: true, requiresApproval: false },
      { id: "et-2", name: "entrata/tours/schedule", label: "Schedule Tour", description: "Book a tour for a prospect at a specific property and time", risk: "medium", enabled: true, requiresApproval: false },
      { id: "et-3", name: "entrata/availability/get", label: "Get Availability", description: "Query available units filtered by property, floor plan, and date", risk: "low", enabled: true, requiresApproval: false },
      { id: "et-4", name: "entrata/floor_plans/get", label: "Get Floor Plans", description: "Retrieve floor plan details, pricing, and unit counts", risk: "low", enabled: true, requiresApproval: false },
    ],
  },
  {
    id: "applications",
    name: "Applications & Screening",
    description: "Application processing, applicant management, and tenant screening.",
    contracted: true,
    tools: [
      { id: "et-5", name: "entrata/applications/get", label: "Get Application", description: "Retrieve application details and status by applicant or unit", risk: "low", enabled: true, requiresApproval: false },
      { id: "et-6", name: "entrata/applications/create", label: "Create Application", description: "Initiate a new rental application for a prospect", risk: "medium", enabled: true, requiresApproval: false },
      { id: "et-7", name: "entrata/screening/run", label: "Run Screening", description: "Execute background and credit screening for an applicant", risk: "high", enabled: true, requiresApproval: true },
    ],
  },
  {
    id: "leases",
    name: "Lease Management",
    description: "Lease lifecycle — lookups, renewals, document generation, and term enforcement.",
    contracted: true,
    tools: [
      { id: "et-8", name: "entrata/leases/get", label: "Get Lease", description: "Retrieve lease details for a unit or resident", risk: "low", enabled: true, requiresApproval: false },
      { id: "et-9", name: "entrata/leases/renew", label: "Renew Lease", description: "Generate a renewal offer with updated terms and pricing", risk: "high", enabled: true, requiresApproval: true },
      { id: "et-10", name: "entrata/leases/send_document", label: "Send Lease Document", description: "Send lease agreement to resident for electronic signature", risk: "high", enabled: true, requiresApproval: true },
    ],
  },
  {
    id: "residents",
    name: "Resident Services",
    description: "Resident data lookups, contact information, and search.",
    contracted: true,
    tools: [
      { id: "et-11", name: "entrata/residents/get", label: "Get Resident", description: "Retrieve full resident profile and lease history", risk: "low", enabled: true, requiresApproval: false },
      { id: "et-12", name: "entrata/residents/get_contact", label: "Get Contact Info", description: "Look up resident phone, email, and mailing address", risk: "low", enabled: true, requiresApproval: false },
      { id: "et-13", name: "entrata/residents/search", label: "Search Residents", description: "Search residents by name, unit, or property", risk: "low", enabled: true, requiresApproval: false },
    ],
  },
  {
    id: "work_orders",
    name: "Work Orders",
    description: "Maintenance request lifecycle — creation, updates, status tracking, and vendor dispatch.",
    contracted: true,
    tools: [
      { id: "et-14", name: "entrata/work_orders/create", label: "Create Work Order", description: "Submit a new maintenance work order with unit, type, and description", risk: "medium", enabled: true, requiresApproval: false },
      { id: "et-15", name: "entrata/work_orders/get", label: "Get Work Order", description: "Retrieve work order details and current status", risk: "low", enabled: true, requiresApproval: false },
      { id: "et-16", name: "entrata/work_orders/update", label: "Update Work Order", description: "Update status, priority, or assignment on an existing work order", risk: "medium", enabled: true, requiresApproval: false },
    ],
  },
  {
    id: "payments",
    name: "Payments & Accounting",
    description: "Balance inquiries, payment history, ledger entries, and fee management.",
    contracted: true,
    tools: [
      { id: "et-17", name: "entrata/payments/get_balance", label: "Get Balance", description: "Retrieve current balance and outstanding charges for a resident", risk: "low", enabled: true, requiresApproval: false },
      { id: "et-18", name: "entrata/payments/get_history", label: "Get Payment History", description: "Look up payment transaction history for a resident or unit", risk: "low", enabled: true, requiresApproval: false },
      { id: "et-19", name: "entrata/payments/post_ledger", label: "Post Ledger Entry", description: "Post a charge, credit, or adjustment to a resident ledger", risk: "high", enabled: true, requiresApproval: true },
      { id: "et-20", name: "entrata/payments/waive_fee", label: "Waive Fee", description: "Waive a late fee or other charge on a resident account", risk: "high", enabled: true, requiresApproval: true },
    ],
  },
  {
    id: "communications",
    name: "Communications",
    description: "Resident notifications, marketing preferences, and bulk messaging.",
    contracted: false,
    tools: [
      { id: "et-21", name: "entrata/communications/send", label: "Send Notification", description: "Send email, SMS, or portal notification to a resident", risk: "medium", enabled: false, requiresApproval: false },
      { id: "et-22", name: "entrata/communications/preferences", label: "Get Preferences", description: "Retrieve resident communication and marketing preferences", risk: "low", enabled: false, requiresApproval: false },
    ],
  },
];

const DEFAULT_CUSTOM_SERVERS: CustomMcpServer[] = [];

/* ─────────────────────────────── Storage ────────────────────────────── */

const STORAGE_KEY = "janet-poc-tools-v2";

function loadState(): ToolsState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveState(state: ToolsState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

function mergeState(saved: ToolsState | null): ToolsState {
  if (!saved) return { entrataModules: DEFAULT_ENTRATA_MODULES, customServers: DEFAULT_CUSTOM_SERVERS };

  const mergedModules = DEFAULT_ENTRATA_MODULES.map((defaultMod) => {
    const savedMod = saved.entrataModules?.find((m) => m.id === defaultMod.id);
    if (!savedMod) return defaultMod;
    return {
      ...defaultMod,
      contracted: savedMod.contracted,
      tools: defaultMod.tools.map((defaultTool) => {
        const savedTool = savedMod.tools.find((t) => t.id === defaultTool.id);
        if (!savedTool) return defaultTool;
        return { ...defaultTool, enabled: savedTool.enabled, requiresApproval: savedTool.requiresApproval };
      }),
    };
  });

  return {
    entrataModules: mergedModules,
    customServers: saved.customServers ?? DEFAULT_CUSTOM_SERVERS,
  };
}

/* ─────────────────────────────── Context ────────────────────────────── */

type ToolsContextValue = {
  entrataModules: EntrataModule[];
  customServers: CustomMcpServer[];
  toggleModuleContracted: (moduleId: string) => void;
  toggleToolEnabled: (moduleId: string, toolId: string) => void;
  toggleToolApproval: (moduleId: string, toolId: string) => void;
  addCustomServer: (server: Omit<CustomMcpServer, "id" | "createdAt" | "connectionStatus">) => void;
  removeCustomServer: (serverId: string) => void;
  updateCustomServer: (serverId: string, patch: Partial<CustomMcpServer>) => void;
  toggleCustomServerEnabled: (serverId: string) => void;
  /** Flat list of all enabled tool names (from contracted+enabled Entrata tools and enabled custom servers) */
  availableToolNames: string[];
};

const ToolsContext = createContext<ToolsContextValue | null>(null);

export function ToolsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ToolsState>(() => mergeState(null));

  useEffect(() => {
    setState(mergeState(loadState()));
  }, []);

  const persist = useCallback((next: ToolsState) => {
    setState(next);
    saveState(next);
  }, []);

  const updateModules = useCallback(
    (updater: (modules: EntrataModule[]) => EntrataModule[]) => {
      setState((prev) => {
        const next = { ...prev, entrataModules: updater(prev.entrataModules) };
        saveState(next);
        return next;
      });
    },
    []
  );

  const toggleModuleContracted = useCallback((moduleId: string) => {
    updateModules((mods) =>
      mods.map((m) => (m.id === moduleId ? { ...m, contracted: !m.contracted } : m))
    );
  }, [updateModules]);

  const toggleToolEnabled = useCallback((moduleId: string, toolId: string) => {
    updateModules((mods) =>
      mods.map((m) =>
        m.id === moduleId
          ? { ...m, tools: m.tools.map((t) => (t.id === toolId ? { ...t, enabled: !t.enabled } : t)) }
          : m
      )
    );
  }, [updateModules]);

  const toggleToolApproval = useCallback((moduleId: string, toolId: string) => {
    updateModules((mods) =>
      mods.map((m) =>
        m.id === moduleId
          ? { ...m, tools: m.tools.map((t) => (t.id === toolId ? { ...t, requiresApproval: !t.requiresApproval } : t)) }
          : m
      )
    );
  }, [updateModules]);

  const addCustomServer = useCallback(
    (server: Omit<CustomMcpServer, "id" | "createdAt" | "connectionStatus">) => {
      setState((prev) => {
        const next: ToolsState = {
          ...prev,
          customServers: [
            ...prev.customServers,
            { ...server, id: `custom-${Date.now()}`, createdAt: new Date().toISOString(), connectionStatus: "pending" },
          ],
        };
        saveState(next);
        return next;
      });
    },
    []
  );

  const removeCustomServer = useCallback((serverId: string) => {
    setState((prev) => {
      const next = { ...prev, customServers: prev.customServers.filter((s) => s.id !== serverId) };
      saveState(next);
      return next;
    });
  }, []);

  const updateCustomServer = useCallback((serverId: string, patch: Partial<CustomMcpServer>) => {
    setState((prev) => {
      const next = {
        ...prev,
        customServers: prev.customServers.map((s) => (s.id === serverId ? { ...s, ...patch } : s)),
      };
      saveState(next);
      return next;
    });
  }, []);

  const toggleCustomServerEnabled = useCallback((serverId: string) => {
    setState((prev) => {
      const next = {
        ...prev,
        customServers: prev.customServers.map((s) =>
          s.id === serverId ? { ...s, enabled: !s.enabled } : s
        ),
      };
      saveState(next);
      return next;
    });
  }, []);

  const availableToolNames = useMemo(() => {
    const names: string[] = [];
    for (const mod of state.entrataModules) {
      if (!mod.contracted) continue;
      for (const tool of mod.tools) {
        if (tool.enabled) names.push(tool.name);
      }
    }
    for (const server of state.customServers) {
      if (!server.enabled) continue;
      for (const tool of server.tools) {
        names.push(tool.name);
      }
    }
    return names;
  }, [state.entrataModules, state.customServers]);

  const value: ToolsContextValue = {
    entrataModules: state.entrataModules,
    customServers: state.customServers,
    toggleModuleContracted,
    toggleToolEnabled,
    toggleToolApproval,
    addCustomServer,
    removeCustomServer,
    updateCustomServer,
    toggleCustomServerEnabled,
    availableToolNames,
  };

  return <ToolsContext.Provider value={value}>{children}</ToolsContext.Provider>;
}

export function useTools() {
  const ctx = useContext(ToolsContext);
  if (!ctx) throw new Error("useTools must be used within a ToolsProvider");
  return ctx;
}

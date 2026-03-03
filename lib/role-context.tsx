"use client";

import { createContext, useContext, useState, useCallback } from "react";

export const ROLES = [
  { value: "admin", label: "Corporate Admin" },
  { value: "regional", label: "Regional Manager" },
  { value: "property", label: "Property Manager" },
  { value: "ic", label: "Site Staff" },
] as const;

export type Role = (typeof ROLES)[number]["value"];

const ALLOWED_ROUTES: Record<Role, string[] | "all"> = {
  admin: "all",
  regional: ["/command-center", "/escalations", "/performance", "/agent-roster", "/workforce"],
  property: ["/command-center", "/escalations", "/agent-roster", "/workforce"],
  ic: ["/command-center", "/escalations", "/workforce"],
};

/** Properties each role can see. "all" = no filtering. */
const ROLE_PROPERTIES: Record<Role, string[] | "all"> = {
  admin: "all",
  regional: ["Property A", "Property B"],
  property: ["Property A"],
  ic: ["Property A"],
};

/** Check whether a property value falls within the role's scope */
export function isPropertyInScope(property: string, roleProperties: string[] | "all"): boolean {
  if (roleProperties === "all") return true;
  if (property === "All properties" || property === "All") return true;
  return roleProperties.some((rp) => property.includes(rp));
}

type RoleContextValue = {
  role: Role;
  setRole: (role: Role) => void;
  isRouteAllowed: (href: string) => boolean;
  /** Properties visible to the current role. "all" = no restriction. */
  roleProperties: string[] | "all";
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>("admin");

  const isRouteAllowed = useCallback(
    (href: string) => {
      const allowed = ALLOWED_ROUTES[role];
      if (allowed === "all") return true;
      return allowed.includes(href);
    },
    [role]
  );

  const roleProperties = ROLE_PROPERTIES[role];

  return (
    <RoleContext.Provider value={{ role, setRole, isRouteAllowed, roleProperties }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}

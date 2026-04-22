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
  regional: ["/command-center", "/escalations", "/conversations", "/performance", "/agent-roster", "/workforce"],
  property: ["/command-center", "/escalations", "/conversations", "/performance", "/agent-roster", "/workforce"],
  ic: ["/command-center", "/escalations", "/conversations", "/workforce"],
};

const ROLE_PROPERTIES: Record<Role, string[] | "all"> = {
  admin: "all",
  regional: ["Hillside Living", "Jamison Apartments"],
  property: ["Hillside Living"],
  ic: ["Hillside Living"],
};

export function matchesRoleProperties(
  propertyLabel: string,
  roleProperties: string[] | "all"
): boolean {
  if (roleProperties === "all") return true;
  if (propertyLabel === "All properties" || propertyLabel === "All") return true;
  return roleProperties.some((p) => propertyLabel.includes(p));
}

type RoleContextValue = {
  role: Role;
  setRole: (role: Role) => void;
  isRouteAllowed: (href: string) => boolean;
  roleProperties: string[] | "all";
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>("admin");

  const isRouteAllowed = useCallback(
    (href: string) => {
      const allowed = ALLOWED_ROUTES[role];
      if (allowed === "all") return true;
      
      // Strip trailing slash for comparison if it's not exactly "/"
      const normalizedHref = href !== "/" && href.endsWith("/") ? href.slice(0, -1) : href;
      return allowed.includes(normalizedHref);
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

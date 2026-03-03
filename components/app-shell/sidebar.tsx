"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useSetup } from "@/lib/setup-context";
import { useRole } from "@/lib/role-context";
import { useContract } from "@/lib/contract-context";
import { useNavBadges, type NavBadge } from "@/lib/use-nav-badges";
import {
  Rocket,
  LayoutDashboard,
  AlertCircle,
  BarChart3,
  Users,
  UserCog,
  GitBranch,
  BookOpen,
  Mic,
  Wrench,
  Shield,
} from "lucide-react";

const activationItem = { href: "/getting-started", label: "Agent Activation", icon: Rocket };

const navGroups = [
  {
    label: "To Do",
    items: [
      { href: "/command-center", label: "Command Center", icon: LayoutDashboard },
      { href: "/escalations", label: "Escalations", icon: AlertCircle },
    ],
  },
  {
    label: "My Workforce",
    items: [
      { href: "/performance", label: "Performance", icon: BarChart3 },
      { href: "/agent-roster", label: "Agent Roster", icon: Users },
      { href: "/workforce", label: "Workforce", icon: UserCog },
    ],
  },
  {
    label: "Configure",
    items: [
      activationItem,
      { href: "/workflows", label: "Workflows", icon: GitBranch },
      { href: "/trainings-sop", label: "Training and SOPs", icon: BookOpen },
      { href: "/voice", label: "Voice & Brand", icon: Mic },
      // { href: "/tools", label: "Tools", icon: Wrench },
      { href: "/governance", label: "Governance", icon: Shield },
    ],
  },
];

function NavBadgeChip({ badge }: { badge: NavBadge }) {
  return (
    <span
      className={cn(
        "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold leading-none",
        badge.variant === "action"
          ? "bg-red-500 text-white"
          : "bg-muted text-muted-foreground"
      )}
    >
      {badge.count > 99 ? "99+" : badge.count}
    </span>
  );
}

function ActivationProgress({ completed, total }: { completed: number; total: number }) {
  const done = completed === total;
  return (
    <span
      className={cn(
        "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-2 text-[10px] font-bold leading-none",
        done
          ? "bg-green-500 text-white"
          : "bg-foreground text-background"
      )}
    >
      {completed}/{total}
    </span>
  );
}

const UNGATED_ROUTES = new Set(["/agent-roster"]);

export function Sidebar() {
  const pathname = usePathname();
  const { goLiveComplete } = useSetup();
  const { isRouteAllowed } = useRole();
  const { badges, activation } = useNavBadges();
  const { contracted } = useContract();

  const navGroupsWithVisibility = navGroups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => isRouteAllowed(item.href))
        .filter((item) => goLiveComplete ? item.href !== "/getting-started" : true),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className="flex h-full w-64 flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))]"
      style={{ minWidth: "16rem" }}
    >
      <div className="flex items-center gap-3 px-4 py-5">
        <Image
          src="/entrata-cube.svg"
          alt="Entrata"
          width={36}
          height={36}
          className="shrink-0"
        />
        <div className="flex flex-col">
          <span className="text-lg font-bold leading-tight tracking-wide text-[hsl(var(--foreground))]">
            entrata
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#CC0000]">
            OXP Studio
          </span>
        </div>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-2 py-4">
        {navGroupsWithVisibility.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[11px] font-medium tracking-wider text-[hsl(var(--muted-foreground))]">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                const badge = badges[item.href];
                const isActivation = item.href === "/getting-started";
                const isUngated = !contracted && UNGATED_ROUTES.has(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? isUngated
                            ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                            : "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
                          : isUngated
                            ? "bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-900/40"
                            : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/80 hover:text-[hsl(var(--foreground))]"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0 stroke-[1.5]", isUngated && "text-amber-600 dark:text-amber-400")} />
                      {item.label}
                      {isUngated && (
                        <span className="ml-auto rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] font-bold leading-none text-amber-800 dark:bg-amber-800 dark:text-amber-200">
                          ACTIVE
                        </span>
                      )}
                      {!isUngated && isActivation && !activation.done && (
                        <ActivationProgress completed={activation.completed} total={activation.total} />
                      )}
                      {contracted && !isActivation && badge && <NavBadgeChip badge={badge} />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="px-2 py-3">
        <div className="flex items-center gap-2.5 rounded-md px-3 py-2">
          <div className="h-8 w-8 shrink-0 rounded-full bg-[hsl(var(--muted))]" />
          <span className="text-sm font-medium text-[hsl(var(--foreground))]">
            Account
          </span>
        </div>
      </div>
    </aside>
  );
}

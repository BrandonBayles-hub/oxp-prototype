"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/role-context";
import { useR1Release } from "@/lib/r1-release-context";
import { useNavBadges, type NavBadge } from "@/lib/use-nav-badges";
import {
  Rocket,
  LayoutDashboard,
  MessageSquare,
  AlertCircle,
  BarChart3,
  Codepen,
  UserCog,
  GitBranch,
  BookOpen,
  Mic,
  Wrench,
  Shield,
  Sparkles,
} from "lucide-react";

const activationItem = { href: "/getting-started", label: "AI & Agent Activation", icon: Rocket };

const navGroups = [
  {
    label: "To Do",
    items: [
      { href: "/command-center", label: "Command Center", icon: LayoutDashboard },
      { href: "/conversations", label: "Communications", icon: MessageSquare },
      { href: "/escalations", label: "Escalations", icon: AlertCircle },
      { href: "/entrata-experts", label: "Entrata Experts", icon: Sparkles },
    ],
  },
  {
    label: "My Workforce",
    items: [
      { href: "/performance", label: "Performance", icon: BarChart3 },
      { href: "/agent-roster", label: "Agent Roster", icon: Codepen },
      { href: "/workforce", label: "Workforce", icon: UserCog },
    ],
  },
  {
    label: "Configure",
    items: [
      activationItem,
      { href: "/workflows", label: "Agent Builder", icon: GitBranch },
      { href: "/trainings-sop", label: "Trainings & SOP", icon: BookOpen },
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

export function Sidebar() {
  const pathname = usePathname();
  const { isRouteAllowed } = useRole();
  const { isR1Release } = useR1Release();
  const { badges, activation } = useNavBadges();

  const r1HiddenRoutes = ["/conversations", "/performance", "/voice", "/governance"];

  const navGroupsWithVisibility = navGroups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => isRouteAllowed(item.href))
        .filter((item) => !(isR1Release && r1HiddenRoutes.includes(item.href))),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className="flex h-full w-64 flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))]"
      style={{ minWidth: "16rem" }}
    >
      <div className="flex h-14 items-center gap-3 px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/eli-cube.svg" alt="" width={28} height={28} className="shrink-0" />
        <span className="text-base tracking-tight text-foreground"><span className="font-bold">OXP</span> <span className="font-light">Studio</span></span>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-2 py-4">
        {navGroupsWithVisibility.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[11px] font-medium tracking-wider text-[hsl(var(--muted-foreground))]">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname.replace(/\/$/, "") === item.href.replace(/\/$/, "");
                const Icon = item.icon;
                const badge = badges[item.href];
                const isActivation = item.href === "/getting-started";
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
                          : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/80 hover:text-[hsl(var(--foreground))]"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 stroke-[1.5]" />
                      {item.label}
                      {isActivation && !activation.done && (
                        <ActivationProgress completed={activation.completed} total={activation.total} />
                      )}
                      {!isActivation && badge && <NavBadgeChip badge={badge} />}
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

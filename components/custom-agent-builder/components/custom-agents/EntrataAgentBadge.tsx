import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type EntrataAgentBadgeProps = {
  className?: string;
  size?: "sm" | "md";
  /**
   * Short qualifier appended after "Entrata". Leave undefined for the default
   * "Entrata Agent". Use "System" on version rows where the label is talking
   * about the original Entrata baseline configuration.
   */
  qualifier?: string;
};

/**
 * Visual marker for agents that are maintained by Entrata rather than
 * authored/customized by the PMC. Used for:
 *   - Native system agents (Leasing AI, Maintenance AI, Renewal AI, Payments AI)
 *   - Seeded custom agents the PM hasn't modified yet (Residents, Utilities,
 *     Vendor, Solicitor — see `isEntrataSeededAgent`)
 *   - The "system baseline" version row inside a forked agent's version
 *     history (see `systemBaseline` on CustomAgent)
 *
 * The styling intentionally differs from `CustomAgentBadge` so the roster
 * cards make it obvious at a glance which agents are stock Entrata and which
 * ones the PMC has made their own.
 */
export function EntrataAgentBadge({
  className,
  size = "sm",
  qualifier,
}: EntrataAgentBadgeProps) {
  const padding =
    size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]";
  const label = qualifier ? `Entrata · ${qualifier}` : "Entrata Agent";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-50 font-medium text-sky-700",
        padding,
        className
      )}
      title="Maintained by Entrata — the PMC has not customized this agent."
    >
      <ShieldCheck className="h-3 w-3" />
      {label}
    </span>
  );
}

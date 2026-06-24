import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type CustomAgentBadgeProps = {
  pmcName: string;
  className?: string;
  size?: "sm" | "md";
};

export function CustomAgentBadge({ pmcName, className, size = "sm" }: CustomAgentBadgeProps) {
  const padding = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 font-medium text-indigo-700",
        padding,
        className
      )}
      title={`Custom agent built by ${pmcName}`}
    >
      <Sparkles className="h-3 w-3" />
      Custom · {pmcName}
    </span>
  );
}

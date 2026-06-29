import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        gray: "border-transparent bg-zinc-100 text-zinc-600",
        yellow: "border-transparent bg-amber-100 text-amber-800",
        green: "border-transparent bg-emerald-100 text-emerald-800",
        red: "border-transparent bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
        ai: "border-eli-purple/30 bg-eli-warm-bg text-eli-purple dark:border-eli-purple/40 dark:text-eli-pink",
        aiVibrant: "border-transparent bg-black text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

/** AI/Eli provenance label. Mirrors prototype-sandbox AiStatusBadge. */
type AiStatusType = "ELI Generated" | "ELI Suggested" | "AI Assisted" | "AI Draft"

function AiStatusBadge({
  status,
  vibrant,
  className,
  ...props
}: { status: AiStatusType; vibrant?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Badge variant={vibrant ? "aiVibrant" : "ai"} className={cn("gap-1 rounded-sm px-1.5 py-0 font-medium", className)} {...props}>
      {status}
    </Badge>
  )
}

export { Badge, badgeVariants, AiStatusBadge }
export type { AiStatusType }

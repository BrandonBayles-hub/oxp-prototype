"use client";

import { useNotifications } from "@/lib/notifications-context";
import { useRouter } from "next/navigation";
import { AlertCircle, Bell, Info, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function NotificationToast() {
  const { latest, dismissLatest } = useNotifications();
  const router = useRouter();

  if (!latest) return null;

  const linkTo = latest.linkTo || (latest.escalationId ? "/escalations" : undefined);

  const handleClick = () => {
    if (linkTo) {
      dismissLatest();
      router.push(linkTo);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border bg-background p-4 shadow-lg max-w-sm",
          linkTo && "cursor-pointer hover:ring-1 hover:ring-primary/30 transition-shadow",
          latest.variant === "urgent" && "border-red-500/50 bg-red-50 dark:bg-red-950/30",
          latest.variant === "info" && "border-blue-500/50",
          latest.variant === "default" && "border-border"
        )}
        role={linkTo ? "button" : undefined}
        onClick={handleClick}
      >
        {latest.variant === "urgent" ? (
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
        ) : latest.variant === "info" ? (
          <Info className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
        ) : (
          <Bell className="h-5 w-5 shrink-0 text-primary mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium",
            latest.variant === "urgent" && "text-red-900 dark:text-red-200"
          )}>
            {latest.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {latest.description}
          </p>
          {linkTo && (
            <p className="mt-1 flex items-center gap-0.5 text-xs font-medium text-primary">
              View details <ChevronRight className="h-3 w-3" />
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); dismissLatest(); }}
          className="shrink-0 rounded-md p-1 hover:bg-muted/50"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

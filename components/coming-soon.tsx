import { Construction } from "lucide-react";

export function ComingSoon({ feature }: { feature?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Construction className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">Coming Soon</h3>
      {feature && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {feature} is under development and will be available in a future update.
        </p>
      )}
    </div>
  );
}

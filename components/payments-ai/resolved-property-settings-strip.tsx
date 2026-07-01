"use client";

import { ExternalLink, Info } from "lucide-react";
import {
  getSettingDefinition,
  STRIP_SETTING_KEYS,
  type ResolvedPropertySettings,
} from "@/lib/payments-ai-property-settings";
import { cn } from "@/lib/utils";

type Props = {
  resolved: ResolvedPropertySettings;
  onOpenSetting?: (settingName: string) => void;
  className?: string;
};

export function ResolvedPropertySettingsStrip({ resolved, onOpenSetting, className }: Props) {
  return (
    <div className={cn("rounded-lg border border-border bg-muted/30 p-4", className)}>
      <div className="mb-3 flex items-center gap-2">
        <Info className="h-4 w-4 text-muted-foreground" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-foreground">Linked property settings</p>
          <p className="text-xs text-muted-foreground">
            Pulled from Entrata for <span className="font-medium text-foreground">{resolved.propertyName}</span> — verify
            without leaving this screen.
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {STRIP_SETTING_KEYS.map((key) => {
          const def = getSettingDefinition(key);
          const value = resolved[key];
          return (
            <div
              key={key}
              className="group relative rounded-md border border-border bg-background px-3 py-2.5 shadow-sm"
            >
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{def.name}</p>
              <p className="mt-0.5 text-xs font-medium leading-snug text-foreground">{value}</p>
              <div className="pointer-events-none absolute inset-x-0 bottom-full z-20 mb-1 hidden rounded-md border border-border bg-popover p-2.5 text-xs shadow-md group-hover:block">
                <p className="text-muted-foreground leading-relaxed">{def.description}</p>
                <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">{def.entrataPath}</p>
                {onOpenSetting && (
                  <button
                    type="button"
                    className="pointer-events-auto mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                    onClick={() => onOpenSetting(def.name)}
                  >
                    Open in Property Settings
                    <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

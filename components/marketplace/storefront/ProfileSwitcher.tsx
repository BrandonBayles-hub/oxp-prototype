"use client";

import { ChevronDown, Building2, Check } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useProfile } from "./ProfileContext";
import { DEMO_PROFILES } from "@/lib/marketplace/utils/profiles";
import { cn } from "@/lib/marketplace/utils/utils";

export function ProfileSwitcher() {
  const { profile, setProfileId } = useProfile();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5",
            "text-sm font-medium text-foreground transition-colors",
            "hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="hidden sm:inline">{profile.name}</span>
          <span className="hidden md:inline text-xs text-muted-foreground">
            ({profile.segment})
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[280px] rounded-xl border border-border bg-white p-1.5 shadow-lg"
          sideOffset={8}
          align="end"
        >
          <DropdownMenu.Label className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Demo Customer Profile
          </DropdownMenu.Label>

          {DEMO_PROFILES.map((p) => (
            <DropdownMenu.Item
              key={p.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors",
                "hover:bg-muted",
                profile.id === p.id && "bg-muted"
              )}
              onSelect={() => setProfileId(p.id)}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {p.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground">
                  {p.name}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    ({p.segment})
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.description}
                </div>
              </div>
              {profile.id === p.id && (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

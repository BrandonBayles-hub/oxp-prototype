"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/marketplace/utils/utils";

export type SortOption = { key: string; label: string; href: string };

export function SortSelect({
  options,
  value,
  className,
}: {
  options: SortOption[];
  value: string;
  className?: string;
}) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = e.target.value;
    const option = options.find((o) => o.key === selected);
    if (option?.href) router.push(option.href);
  }

  return (
    <label className={cn("flex items-center gap-2", className)}>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        Sort
      </span>
      <select
        value={value}
        onChange={handleChange}
        aria-label="Sort listings"
        className={cn(
          "rounded-md border border-border bg-muted/30 py-1.5 pl-2 pr-8 text-xs font-medium text-foreground",
          "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
          "appearance-none bg-no-repeat bg-[length:1rem_1rem] bg-[right_0.25rem_center]",
          "cursor-pointer"
        )}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
        }}
      >
        {options.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

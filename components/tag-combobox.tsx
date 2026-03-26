"use client";

import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function TagCombobox({
  existingLabels,
  onAdd,
}: {
  existingLabels: string[];
  onAdd: (tag: string) => void;
}) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    if (!value.trim()) return existingLabels.slice(0, 8);
    const q = value.toLowerCase();
    return existingLabels.filter((l) => l.toLowerCase().includes(q)).slice(0, 8);
  }, [existingLabels, value]);

  const handleSelect = (tag: string) => {
    onAdd(tag);
    setValue("");
    // Keep open for multi-select
  };

  const handleSubmit = () => {
    if (!value.trim()) return;
    onAdd(value.trim());
    setValue("");
    // Keep open for multi-select
  };

  const isNew = value.trim() && !existingLabels.some((l) => l.toLowerCase() === value.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setValue(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Plus className="h-3 w-3" />
          Add label
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="border-b border-border p-2">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleSubmit(); }
            }}
            placeholder="Search or create..."
            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
        </div>
        <div className="max-h-44 overflow-y-auto p-1">
          {isNew && (
            <button
              type="button"
              onClick={handleSubmit}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted transition-colors"
            >
              <span className="font-medium text-primary">Create &quot;{value.trim()}&quot;</span>
            </button>
          )}
          {suggestions.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => handleSelect(label)}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted transition-colors"
            >
              <span className="text-foreground">{label}</span>
            </button>
          ))}
          {!isNew && suggestions.length === 0 && (
            <p className="p-2 text-center text-xs text-muted-foreground">Type to create a label.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

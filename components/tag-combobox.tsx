"use client";

import { useState, useEffect, useMemo, useRef } from "react";

export function TagCombobox({
  existingLabels,
  onAdd,
}: {
  existingLabels: string[];
  onAdd: (tag: string) => void;
}) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const suggestions = useMemo(() => {
    if (!value.trim()) return existingLabels.slice(0, 8);
    const q = value.toLowerCase();
    return existingLabels.filter((l) => l.toLowerCase().includes(q)).slice(0, 8);
  }, [existingLabels, value]);

  const handleSelect = (tag: string) => {
    onAdd(tag);
    setValue("");
  };

  const handleSubmit = () => {
    if (!value.trim()) return;
    onAdd(value.trim());
    setValue("");
  };

  const isNew = value.trim() && !existingLabels.some((l) => l.toLowerCase() === value.trim().toLowerCase());

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); handleSubmit(); }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Type to search or create a label..."
          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Add label"
        />
      </div>
      {open && (suggestions.length > 0 || isNew) && (
        <div className="absolute left-0 top-full z-30 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
          <ul className="max-h-44 overflow-y-auto p-1">
            {isNew && (
              <li>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-muted transition-colors"
                >
                  <span className="font-medium text-primary">Create &quot;{value.trim()}&quot;</span>
                </button>
              </li>
            )}
            {suggestions.map((label) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => handleSelect(label)}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-muted transition-colors"
                >
                  <span className="text-foreground">{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

"use client";
import * as React from "react";
import { LensPicker, ModePicker, ModelPicker } from "./composer-controls";
// import { ScopePicker } from "./scope-picker"; // temporarily disabled — see toolbar below
import { Button } from "@/components/ui/button";
import type { LensId, Depth, ModelId, Scope } from "@/lib/entrata-experts-v2/types";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One entry in the `/`-slash command menu. Built dynamically by the parent
 * (the Analyst surface assembles the user's Saved Insights + a couple of
 * system commands). Surfaces that don't pass `slashCommands` get no menu —
 * the textarea behaves exactly as before.
 */
export interface SlashCommand {
  /** URL-safe slug; the menu matches against this. e.g. "delinquency-tampa" */
  slug: string;
  /** Display label, usually the insight's name. */
  label: string;
  /** Short helper text (lens, scope, description). */
  hint?: string;
  /** Optional leading icon. */
  icon?: React.ReactNode;
  /** What happens when the user picks this command. */
  run: () => void;
}

// The Lens/Mode/Model pickers render only when their values + onChange handler
// are provided. `scope` / `onChangeScope` remain on the props so callers don't
// break, but the ScopePicker is currently not rendered (see toolbar below).
interface Props {
  lens?: LensId;
  depth?: Depth;
  model?: ModelId;
  scope?: Scope;
  onChangeLens?: (l: LensId, d: Depth, m: ModelId) => void;
  onChangeScope?: (s: Scope) => void;
  onSend: (text: string) => void;
  isThinking?: boolean;
  onStop?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  /**
   * Optional `/` slash menu. When provided and the user types `/…` as the
   * first character, a filtered popover appears. ↑/↓ navigate, Enter selects.
   */
  slashCommands?: SlashCommand[];
}

export function MessageInput({
  lens,
  depth,
  model,
  onChangeLens,
  onSend,
  isThinking,
  onStop,
  placeholder = "Ask Entrata about your portfolio…",
  autoFocus,
  slashCommands,
}: Props) {
  const showLens = lens !== undefined && depth !== undefined && model !== undefined && !!onChangeLens;
  const [value, setValue] = React.useState("");
  const [highlight, setHighlight] = React.useState(0);
  const ref = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "0px";
    ref.current.style.height = Math.min(ref.current.scrollHeight, 220) + "px";
  }, [value]);

  React.useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  // Slash menu opens when (a) commands were provided, (b) the value starts
  // with `/`, and (c) there's no whitespace yet (i.e. still typing the
  // command name, not a free-text prompt that happens to start with `/`).
  const slashQuery = React.useMemo(() => {
    if (!slashCommands || slashCommands.length === 0) return null;
    if (!value.startsWith("/")) return null;
    if (/\s/.test(value)) return null;
    return value.slice(1).toLowerCase();
  }, [value, slashCommands]);

  const filtered = React.useMemo(() => {
    if (slashQuery === null || !slashCommands) return [];
    if (slashQuery === "") return slashCommands;
    return slashCommands.filter(
      (c) =>
        c.slug.toLowerCase().includes(slashQuery) ||
        c.label.toLowerCase().includes(slashQuery),
    );
  }, [slashCommands, slashQuery]);

  const showMenu = slashQuery !== null && filtered.length > 0;

  // Reset the highlight whenever the filter changes so we never point past
  // the end of the list after a keystroke.
  React.useEffect(() => {
    if (highlight >= filtered.length) setHighlight(0);
  }, [filtered.length, highlight]);

  const send = () => {
    const t = value.trim();
    if (!t || isThinking) return;
    onSend(t);
    setValue("");
  };

  const runCommand = (cmd: SlashCommand) => {
    setValue("");
    cmd.run();
  };

  return (
    <div className="relative">
      {showMenu && (
        <SlashMenu
          commands={filtered}
          highlight={Math.min(highlight, filtered.length - 1)}
          onHover={setHighlight}
          onPick={runCommand}
        />
      )}
      <div className="rounded-xl border border-border bg-background shadow-sm transition-colors focus-within:border-foreground/40">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (showMenu) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlight((h) => (h + 1) % filtered.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlight((h) => (h - 1 + filtered.length) % filtered.length);
                return;
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const target = filtered[Math.min(highlight, filtered.length - 1)];
                if (target) runCommand(target);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setValue("");
                return;
              }
              if (e.key === "Tab") {
                e.preventDefault();
                const target = filtered[Math.min(highlight, filtered.length - 1)];
                if (target) setValue(`/${target.slug} `);
                return;
              }
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder={placeholder}
          className={cn(
            "w-full resize-none bg-transparent px-4 pb-1 pt-3 text-[15px] leading-relaxed text-foreground",
            "placeholder:text-muted-foreground focus:outline-none",
          )}
        />
        <div className="flex items-center gap-1.5 px-3 py-2">
          {showLens && (
            <>
              <LensPicker lens={lens!} onSelect={(l) => onChangeLens!(l, depth!, model!)} />
              <ModePicker depth={depth!} onSelect={(d) => onChangeLens!(lens!, d, model!)} />
              <ModelPicker model={model!} onSelect={(m) => onChangeLens!(lens!, depth!, m)} />
            </>
          )}
          {/* Scope picker temporarily removed — to restore, re-add the import and
              render <ScopePicker scope={scope!} onChange={onChangeScope!} /> here. */}
          <div className="flex-1" />
          {isThinking ? (
            <Button size="icon" className="h-7 w-7" onClick={onStop} title="Stop">
              <Square className="h-3 w-3 fill-current" />
            </Button>
          ) : (
            <Button size="icon" className="h-7 w-7" onClick={send} disabled={!value.trim()} title="Send">
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SlashMenu({
  commands,
  highlight,
  onHover,
  onPick,
}: {
  commands: SlashCommand[];
  highlight: number;
  onHover: (i: number) => void;
  onPick: (c: SlashCommand) => void;
}) {
  return (
    <div
      role="listbox"
      aria-label="Saved Insights and commands"
      className="absolute bottom-full left-0 right-0 z-30 mb-1 max-h-72 overflow-y-auto scrollbar-hover rounded-lg border border-border bg-background shadow-lg"
    >
      <div className="border-b border-border/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Saved Insights &amp; commands
      </div>
      <ul className="py-1">
        {commands.map((c, i) => {
          const active = i === highlight;
          return (
            <li key={c.slug}>
              <button
                type="button"
                role="option"
                aria-selected={active}
                // Use onMouseDown so the click registers before the textarea
                // loses focus (which would otherwise hide the menu first).
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(c);
                }}
                onMouseEnter={() => onHover(i)}
                className={cn(
                  "flex w-full items-start gap-2 px-3 py-1.5 text-left transition-colors",
                  active ? "bg-muted" : "hover:bg-muted/60",
                )}
              >
                {c.icon && <span className="mt-0.5 shrink-0">{c.icon}</span>}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-medium text-foreground">
                      /{c.slug}
                    </code>
                    <span className="truncate text-[13px] text-foreground">{c.label}</span>
                  </div>
                  {c.hint && (
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{c.hint}</div>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

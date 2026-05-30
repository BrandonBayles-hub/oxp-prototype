"use client";
import * as React from "react";
import { LensPicker } from "./lens-picker";
import { ScopePicker } from "./scope-picker";
import { Button } from "@/components/ui/button";
import type { LensId, Depth, ModelId, Scope } from "@/lib/entrata-experts-v2/types";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

// Lens + scope are independently optional. Render the pickers only when both
// the value and its onChange handler are provided. Analyst uses both; the
// Assistant chats reuse the same composer with just the scope picker (lens
// routing doesn't apply to fixed-purpose assistants).
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
}

export function MessageInput({
  lens,
  depth,
  model,
  scope,
  onChangeLens,
  onChangeScope,
  onSend,
  isThinking,
  onStop,
  placeholder = "Ask Entrata about your portfolio…",
  autoFocus,
}: Props) {
  const showLens = lens !== undefined && depth !== undefined && model !== undefined && !!onChangeLens;
  const showScope = scope !== undefined && !!onChangeScope;
  const [value, setValue] = React.useState("");
  const ref = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "0px";
    ref.current.style.height = Math.min(ref.current.scrollHeight, 220) + "px";
  }, [value]);

  React.useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const send = () => {
    const t = value.trim();
    if (!t || isThinking) return;
    onSend(t);
    setValue("");
  };

  return (
    <div className="rounded-xl border border-border bg-background shadow-sm transition-colors focus-within:border-foreground/40">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
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
          <LensPicker
            lens={lens!}
            depth={depth!}
            model={model!}
            onChange={onChangeLens!}
          />
        )}
        {showScope && <ScopePicker scope={scope!} onChange={onChangeScope!} />}
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
  );
}

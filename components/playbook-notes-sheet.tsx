"use client";

import { useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowUp, Pencil, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlaybooks, type PlaybookNote } from "@/lib/playbooks-context";

const AUTHOR = "Staff";
const SESSION_KEY = "playbook-session-note-ids";

function getSessionIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveSessionId(at: string) {
  if (typeof window === "undefined") return;
  try {
    const ids = getSessionIds();
    ids.add(at);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...ids]));
  } catch { /* ignore */ }
}

const SUGGESTIONS = [
  "Following up with vendor.",
  "Waiting on resident response.",
  "Checked in with regional manager.",
  "On hold pending additional information.",
];

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function PlaybookNotesSheet({
  playbookId,
  playbookName,
  notes,
  open,
  onOpenChange,
}: {
  playbookId: string;
  playbookName: string;
  notes: PlaybookNote[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { addPlaybookNote, updatePlaybookNote, removePlaybookNote } = usePlaybooks();

  const [draft, setDraft] = useState("");
  const [editingAt, setEditingAt] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Read live from sessionStorage — survives sheet close/reopen
  const isSessionNote = (at: string) => getSessionIds().has(at);

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const at = new Date().toISOString();
    saveSessionId(at);
    addPlaybookNote(playbookId, AUTHOR, trimmed, at);
    setDraft("");
    textareaRef.current?.focus();
  };

  const startEdit = (n: PlaybookNote) => {
    setEditingAt(n.at);
    setEditDraft(n.text);
  };

  const saveEdit = () => {
    if (!editingAt) return;
    const trimmed = editDraft.trim();
    if (trimmed) updatePlaybookNote(playbookId, editingAt, trimmed);
    setEditingAt(null);
    setEditDraft("");
  };

  const cancelEdit = () => {
    setEditingAt(null);
    setEditDraft("");
  };

  // Display newest first
  const displayed = [...notes].reverse();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <SheetDescription className="sr-only">
          Internal notes for {playbookName}
        </SheetDescription>

        {/* Header */}
        <SheetHeader className="flex flex-row items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <SheetTitle>Notes</SheetTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {notes.length} note{notes.length !== 1 ? "s" : ""} on{" "}
              <span className="font-medium text-foreground">{playbookName}</span>
            </p>
          </div>
        </SheetHeader>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto space-y-3 bg-muted px-4 py-4 scrollbar-hover">
          {displayed.length === 0 ? (
            <div className="flex h-full min-h-[120px] flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-medium text-foreground">No notes yet</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Add an internal note below.
              </p>
            </div>
          ) : (
            displayed.map((n) => {
              const isMine = isSessionNote(n.at);
              const isEditing = editingAt === n.at;

              return (
                <div key={n.at} className="group flex flex-col gap-0.5">
                  {/* Meta row */}
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5 text-[9px]">
                      <AvatarFallback className="bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200">
                        {initials(n.by)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] font-medium tracking-wider text-muted-foreground">
                      {n.by} · {formatTime(n.at)}
                    </span>
                    {/* Edit / delete — only for session notes, only when not already editing */}
                    {isMine && !isEditing && (
                      <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => startEdit(n)}
                          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
                          aria-label="Edit note"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removePlaybookNote(playbookId, n.at)}
                          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Delete note"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bubble — edit mode or read mode */}
                  {isEditing ? (
                    <div className="max-w-[90%] rounded-2xl border border-primary/40 bg-background px-3 py-2 shadow-sm ring-1 ring-primary/20">
                      <textarea
                        autoFocus
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                          if (e.key === "Escape") cancelEdit();
                        }}
                        rows={2}
                        className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground focus-visible:outline-none"
                      />
                      <div className="mt-1.5 flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted"
                          aria-label="Cancel edit"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={!editDraft.trim()}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
                          aria-label="Save edit"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl border border-border bg-background px-3 py-2 text-sm shadow-sm",
                        isMine && "cursor-default"
                      )}
                    >
                      {n.text}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Suggestions */}
        <div className="flex flex-col gap-1.5 bg-muted px-4 pt-3">
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground">
            SUGGESTED NOTES
          </p>
          {SUGGESTIONS.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => {
                setDraft(text);
                textareaRef.current?.focus();
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 line-clamp-2"
            >
              {text}
            </button>
          ))}
        </div>

        {/* Composer */}
        <div className="bg-muted p-4">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 shadow-sm transition-shadow focus-within:border-primary/40 focus-within:shadow-md">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="Add an internal note..."
              rows={1}
              className="min-h-[40px] max-h-32 flex-1 resize-none bg-transparent py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!draft.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Add note"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

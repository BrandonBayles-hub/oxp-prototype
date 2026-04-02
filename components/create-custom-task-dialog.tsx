"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { X, Plus, Link2, Paperclip, CheckSquare, ChevronDown, Check } from "lucide-react";
import {
  SPECIALTIES,
  PROPERTIES,
  DUE_IN_OPTIONS,
  TIMEZONES,
  TIMEZONE_LABELS,
  ALL_WEEKDAYS,
  type TaskTemplate,
  type SpecialtyTask,
  type SpecialtyTaskRepeats,
  type SpecialtyTaskPriority,
  type TaskSections,
  type Weekday,
} from "@/lib/specialties-data";
import type { PlaybookTemplateTask, PlaybookTemplatePriority } from "@/lib/playbook-templates-data";
import { useWorkforce } from "@/lib/workforce-context";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PropertySelector } from "@/components/property-selector";
import { getSelectedPropertyNames, getDataForView } from "@/lib/property-selector-data";

// ── Shared cadence types ────────────────────────────────────────────────────

function AssigneeCombobox({ members, value, onChange }: { members: { id: string; name: string }[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return members;
    return members.filter((m) => m.name.toLowerCase().includes(q));
  }, [members, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring",
            !value && "text-muted-foreground"
          )}
        >
          <span className="truncate">{value || "Select Assignee"}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0 z-[200]" align="start">
        <div className="p-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members…"
            className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
        </div>
        <div className="max-h-48 overflow-y-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); setQuery(""); }}
            className={cn("flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-muted", !value && "bg-muted font-medium")}
          >
            <Check className={cn("h-3.5 w-3.5 shrink-0", value ? "invisible" : "text-primary")} />
            <span className="text-muted-foreground">Unassigned</span>
          </button>
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onChange(m.name); setOpen(false); setQuery(""); }}
              className={cn("flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-muted", value === m.name && "bg-muted font-medium")}
            >
              <Check className={cn("h-3.5 w-3.5 shrink-0", value === m.name ? "text-primary" : "invisible")} />
              {m.name}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">No members found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

type CadenceState = {
  cadence: SpecialtyTaskRepeats;
  weekDays: Weekday[];
  monthDay: number;
  createTime: string;
  timezone: string;
};

const CADENCE_OPTIONS: { value: SpecialtyTaskRepeats; label: string }[] = [
  { value: "Never", label: "Does Not Repeat" },
  { value: "Daily", label: "Daily" },
  { value: "Weekly", label: "Weekly" },
  { value: "Monthly", label: "Monthly" },
  { value: "Quarterly", label: "Quarterly" },
  { value: "Semi-Annually", label: "Semi-Annually" },
  { value: "Annually", label: "Annually" },
];

const CUSTOM_WORKFLOWS = [
  "Custom",
  "Leasing",
  "Maintenance",
  "Renewals",
  "Compliance",
  "Accounting",
  "Document Approval",
  "Trainings & SOP",
];

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const DUE_UNITS = ["Day(s)", "Hour(s)", "Week(s)"];

const DEFAULT_SECTIONS: TaskSections = {
  links: { enabled: false, required: false },
  attachments: { enabled: false, required: false },
  checklist: { enabled: false, requireAll: false, items: [] },
};

// ── Props ───────────────────────────────────────────────────────────────────

type CreateCustomTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill specialty when opened from a specialty detail page */
  specialtyId?: string;
  /** Hide specialty & workflow pickers when creating within a specialty context */
  hideSpecialtyWorkflow?: boolean;
  /** When provided, the dialog opens in edit mode with fields pre-filled */
  initialData?: SpecialtyTask | TaskTemplate | PlaybookTemplateTask | null;
  /** Optional custom title to override default Create/Edit title */
  title?: string;
  /** If true, allows choosing an absolute date for non-repeating tasks instead of relative 'Due In' */
  allowAbsoluteDate?: boolean;
  /** Custom text for the save button */
  saveButtonText?: string;
} & (
  | { mode: "template"; onSave: (task: TaskTemplate) => void }
  | { mode: "specialty"; onSave: (task: SpecialtyTask) => void }
  | { mode: "playbook"; onSave: (task: PlaybookTemplateTask) => void }
);

export function CreateCustomTaskDialog(props: CreateCustomTaskDialogProps) {
  const { open, onOpenChange, specialtyId: prefilledSpecialtyId, hideSpecialtyWorkflow, initialData } = props;
  const { humanMembers } = useWorkforce();

  const isEditing = !!initialData;

  const [name, setName] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [workflow, setWorkflow] = useState("Custom");
  const [specialtyId, setSpecialtyId] = useState(prefilledSpecialtyId ?? SPECIALTIES[0].id);
  const [schedule, setSchedule] = useState<CadenceState>({
    cadence: "Never",
    weekDays: ["Mon"],
    monthDay: 1,
    createTime: "09:00",
    timezone: "America/Denver",
  });
  const [priority, setPriority] = useState<SpecialtyTaskPriority | PlaybookTemplatePriority>("P2");
  const [dueValue, setDueValue] = useState("1");
  const [dueUnit, setDueUnit] = useState("Day(s)");
  const [assignee, setAssignee] = useState("");
  const [property, setProperty] = useState("");
  const [absoluteDate, setAbsoluteDate] = useState("");
  const [sections, setSections] = useState<TaskSections>({ ...DEFAULT_SECTIONS, checklist: { ...DEFAULT_SECTIONS.checklist, items: [] } });
  const [newChecklistItem, setNewChecklistItem] = useState("");

  // key to force re-mount RichTextEditor on reset
  const [editorKey, setEditorKey] = useState(0);

  // Track which initialData we've loaded to avoid re-loading on every render
  const [loadedInitialId, setLoadedInitialId] = useState<string | null>(null);
  if (initialData && initialData.id !== loadedInitialId && open) {
    setLoadedInitialId(initialData.id);
    setName(initialData.name);
    setDescriptionHtml(
      "descriptionHtml" in initialData ? (initialData.descriptionHtml ?? "")
      : "description" in initialData ? (initialData.description ?? "")
      : ""
    );
    setWorkflow("workflow" in initialData ? initialData.workflow : "Custom");
    setSpecialtyId(initialData.specialtyId ?? prefilledSpecialtyId ?? SPECIALTIES[0].id);
    const repeats = ("repeats" in initialData ? initialData.repeats : undefined) ?? "Never";
    setSchedule({
      cadence: repeats as SpecialtyTaskRepeats,
      weekDays: ("weekDays" in initialData && initialData.weekDays) ? initialData.weekDays : ["Mon"],
      monthDay: ("monthDay" in initialData && initialData.monthDay) ? initialData.monthDay : 1,
      createTime: ("createTime" in initialData && initialData.createTime) ? initialData.createTime : "09:00",
      timezone: ("timezone" in initialData && initialData.timezone) ? initialData.timezone : "America/Denver",
    });
    setPriority(initialData.priority ?? "P2");
    // Parse dueIn/dueOffset string like "1 Day" or "2 Weeks" back into value + unit, or handle absolute date
    const dueInStr = ("dueIn" in initialData ? initialData.dueIn : undefined)
      ?? ("dueOffset" in initialData ? initialData.dueOffset : undefined)
      ?? "1 Day";
    
    // Note: Due to React strict mode / lifecycle, we want to try to use the current repeats/cadence
    // when setting the absolute date so we aren't un-checking it if there's a delay.
    const isAbsolute = props.allowAbsoluteDate && !!dueInStr.match(/^\d{4}-\d{2}-\d{2}$/);
    if (isAbsolute) {
      setAbsoluteDate(dueInStr);
      setDueValue("1");
      setDueUnit("Day(s)");
    } else {
      setAbsoluteDate("");
      const dueMatch = dueInStr.match(/^(\d+)\s*(.+)/);
      if (dueMatch) {
        setDueValue(dueMatch[1]);
        const raw = dueMatch[2].toLowerCase().replace(/s$/, "");
        if (raw.startsWith("hour")) setDueUnit("Hour(s)");
        else if (raw.startsWith("week")) setDueUnit("Week(s)");
        else setDueUnit("Day(s)");
      } else {
        setDueValue("1");
        setDueUnit("Day(s)");
      }
    }
    setAssignee("assignee" in initialData ? (initialData.assignee ?? "") : "");
    setProperty("property" in initialData ? (initialData.property ?? "") : "");
    if ("sections" in initialData && initialData.sections) {
      setSections(JSON.parse(JSON.stringify(initialData.sections)));
    } else {
      setSections({ links: { enabled: false, required: false }, attachments: { enabled: false, required: false }, checklist: { enabled: false, requireAll: false, items: [] } });
    }
    setNewChecklistItem("");
    
    // Explicitly set absoluteDate if a nextReviewDate was passed in via dueIn
    if (props.allowAbsoluteDate && isAbsolute) {
      setAbsoluteDate(dueInStr);
    }
    
    setEditorKey((k) => k + 1);
  }

  const reset = () => {
    setName("");
    setDescriptionHtml("");
    setWorkflow("Custom");
    setSpecialtyId(prefilledSpecialtyId ?? SPECIALTIES[0].id);
    setSchedule({ cadence: "Never", weekDays: ["Mon"], monthDay: 1, createTime: "09:00", timezone: "America/Denver" });
    setPriority("P2");
    setDueValue("1");
    setDueUnit("Day(s)");
    setAbsoluteDate("");
    setAssignee("");
    setProperty("");
    setSections({ links: { enabled: false, required: false }, attachments: { enabled: false, required: false }, checklist: { enabled: false, requireAll: false, items: [] } });
    setNewChecklistItem("");
    setLoadedInitialId(null);
    setEditorKey((k) => k + 1);
  };

  const dueIn = props.allowAbsoluteDate && schedule.cadence === "Never"
    ? (absoluteDate || new Date().toISOString().split("T")[0])
    : `${dueValue} ${dueUnit.replace("(s)", dueValue === "1" ? "" : "s")}`;

  const buildSchedulingFields = () => {
    if (schedule.cadence === "Never") return {};
    return {
      createTime: schedule.createTime,
      timezone: schedule.timezone,
      ...(schedule.cadence === "Weekly" ? { weekDays: schedule.weekDays } : {}),
      ...(schedule.cadence === "Monthly" ? { monthDay: schedule.monthDay } : {}),
    };
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const plainDescription = descriptionHtml.replace(/<[^>]+>/g, "").trim();

    const sectionsToSave: TaskSections | undefined =
      sections.links.enabled || sections.attachments.enabled || sections.checklist.enabled
        ? sections
        : undefined;

    if (props.mode === "template") {
      props.onSave({
        ...(initialData as TaskTemplate),
        id: initialData?.id ?? `t-custom-${Date.now()}`,
        name: name.trim(),
        workflow,
        specialtyId,
        description: plainDescription,
        descriptionHtml: descriptionHtml || undefined,
        system: false,
        repeats: schedule.cadence,
        priority: priority as SpecialtyTaskPriority,
        dueIn,
        assignee: assignee || undefined,
        property: property || undefined,
        sections: sectionsToSave,
        ...buildSchedulingFields(),
      });
    } else if (props.mode === "playbook") {
      props.onSave({
        ...(initialData as PlaybookTemplateTask),
        id: initialData?.id ?? `pbt-custom-${Date.now()}`,
        name: name.trim(),
        description: plainDescription,
        dueOffset: dueIn,
        priority: priority as PlaybookTemplatePriority,
        specialtyId,
      });
    } else {
      props.onSave({
        ...(initialData as SpecialtyTask),
        id: initialData?.id ?? `st-custom-${Date.now()}`,
        name: name.trim(),
        workflow,
        specialtyId: prefilledSpecialtyId ?? specialtyId,
        repeats: schedule.cadence,
        priority: priority as SpecialtyTaskPriority,
        dueIn,
        source: "custom",
        assignee: assignee || undefined,
        property: property || undefined,
        descriptionHtml: descriptionHtml || undefined,
        sections: sectionsToSave,
        ...buildSchedulingFields(),
      });
    }
    reset();
    onOpenChange(false);
  };

  const addChecklistItem = () => {
    const trimmed = newChecklistItem.trim();
    if (!trimmed) return;
    setSections((prev) => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        items: [...prev.checklist.items, trimmed],
      },
    }));
    setNewChecklistItem("");
  };

  const removeChecklistItem = (index: number) => {
    setSections((prev) => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        items: prev.checklist.items.filter((_, i) => i !== index),
      },
    }));
  };

  const labelClass = "text-xs font-medium text-foreground";
  const inputClass =
    "h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{props.title || (isEditing ? "Edit Custom Task" : "Create Custom Task")}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the task details, sections, and assignment info."
              : "Define a custom task with optional sections for links, attachments, and checklists."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 py-2 -mx-6 px-6">
          {/* ── Task Info ── */}
          <section>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Task Info
            </p>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className={labelClass}>
                  <span className="text-destructive">*</span>Task Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Placeholder"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Description</label>
                <RichTextEditor
                  key={editorKey}
                  content={descriptionHtml}
                  onChange={setDescriptionHtml}
                  placeholder="I am your reach text editor."
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Repeats</label>
                <Select
                  value={schedule.cadence}
                  onValueChange={(v) => {
                    const c = v as SpecialtyTaskRepeats;
                    const patch: Partial<CadenceState> = { cadence: c };
                    if (c === "Weekly" && schedule.weekDays.length === 0) patch.weekDays = ["Mon"];
                    if (c === "Monthly" && !schedule.monthDay) patch.monthDay = 1;
                    setSchedule((prev) => ({ ...prev, ...patch }));
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CADENCE_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-sm">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {schedule.cadence !== "Never" && (
                <p className="text-xs text-muted-foreground">
                  Note: Task will not show in specialty setting after creation
                </p>
              )}

              {schedule.cadence === "Weekly" && (
                <div className="space-y-1.5">
                  <label className={labelClass}>Repeat On</label>
                  <div className="flex gap-1">
                    {ALL_WEEKDAYS.map((day) => {
                      const active = schedule.weekDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const next = schedule.weekDays.includes(day)
                              ? schedule.weekDays.filter((d) => d !== day)
                              : [...schedule.weekDays, day];
                            setSchedule((prev) => ({
                              ...prev,
                              weekDays: next.length > 0 ? next : [day],
                            }));
                          }}
                          className={cn(
                            "flex h-8 w-10 items-center justify-center rounded-md border text-xs font-medium transition-colors",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input bg-background text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {schedule.cadence === "Monthly" && (
                <div className="space-y-1.5">
                  <label className={labelClass}>Day of Month</label>
                  <Select
                    value={String(schedule.monthDay || 1)}
                    onValueChange={(v) => setSchedule((prev) => ({ ...prev, monthDay: parseInt(v) }))}
                  >
                    <SelectTrigger className="h-9 w-24 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_DAYS.map((d) => (
                        <SelectItem key={d} value={String(d)} className="text-sm">
                          {d}{d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {schedule.cadence !== "Never" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={labelClass}>Created At</label>
                    <input
                      type="time"
                      value={schedule.createTime}
                      onChange={(e) => setSchedule((prev) => ({ ...prev, createTime: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelClass}>Timezone</label>
                    <Select
                      value={schedule.timezone}
                      onValueChange={(v) => setSchedule((prev) => ({ ...prev, timezone: v }))}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz} className="text-sm">
                            {TIMEZONE_LABELS[tz] ?? tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={labelClass}>Due {props.allowAbsoluteDate && schedule.cadence === "Never" ? "Date" : "In"}</label>
                  {props.allowAbsoluteDate && schedule.cadence === "Never" ? (
                    <input
                      type="date"
                      value={absoluteDate}
                      onChange={(e) => setAbsoluteDate(e.target.value)}
                      className={inputClass}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Within</span>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={dueValue}
                        onChange={(e) => setDueValue(e.target.value)}
                        className="h-9 w-16 rounded-md border border-input bg-background px-2 text-center text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <Select value={dueUnit} onValueChange={setDueUnit}>
                        <SelectTrigger className="h-9 w-28 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DUE_UNITS.map((u) => (
                            <SelectItem key={u} value={u} className="text-sm">{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass}>Priority</label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as SpecialtyTaskPriority)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {props.mode === "playbook" && (
                        <SelectItem value="P0" className="text-sm">P0 - Emergency</SelectItem>
                      )}
                      <SelectItem value="P1" className="text-sm">P1 - Critical</SelectItem>
                      <SelectItem value="P2" className="text-sm">P2 - High</SelectItem>
                      <SelectItem value="P3" className="text-sm">P3 - Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </section>

          {/* ── Task Sections ── */}
          <section>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Task Sections
            </p>

            <div className="space-y-3">
              {/* Links toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Links</span>
                  </div>
                  <Switch
                    checked={sections.links.enabled}
                    onCheckedChange={(checked) =>
                      setSections((prev) => ({
                        ...prev,
                        links: { ...prev.links, enabled: checked },
                      }))
                    }
                  />
                </div>
                {sections.links.enabled && (
                  <div className="ml-6">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={sections.links.required}
                        onChange={(e) =>
                          setSections((prev) => ({
                            ...prev,
                            links: { ...prev.links, required: e.target.checked },
                          }))
                        }
                        className="h-3.5 w-3.5 rounded border-border accent-primary"
                      />
                      At least one link is required before the task can be completed
                    </label>
                  </div>
                )}
              </div>

              {/* Attachments toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Attachments</span>
                  </div>
                  <Switch
                    checked={sections.attachments.enabled}
                    onCheckedChange={(checked) =>
                      setSections((prev) => ({
                        ...prev,
                        attachments: { ...prev.attachments, enabled: checked },
                      }))
                    }
                  />
                </div>
                {sections.attachments.enabled && (
                  <div className="ml-6">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={sections.attachments.required}
                        onChange={(e) =>
                          setSections((prev) => ({
                            ...prev,
                            attachments: { ...prev.attachments, required: e.target.checked },
                          }))
                        }
                        className="h-3.5 w-3.5 rounded border-border accent-primary"
                      />
                      At least one attachment is required before the task can be completed
                    </label>
                  </div>
                )}
              </div>

              {/* Checklist toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Checklist</span>
                  </div>
                  <Switch
                    checked={sections.checklist.enabled}
                    onCheckedChange={(checked) =>
                      setSections((prev) => ({
                        ...prev,
                        checklist: { ...prev.checklist, enabled: checked },
                      }))
                    }
                  />
                </div>

                {sections.checklist.enabled && (
                  <div className="ml-6 space-y-2">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={sections.checklist.requireAll}
                        onChange={(e) =>
                          setSections((prev) => ({
                            ...prev,
                            checklist: { ...prev.checklist, requireAll: e.target.checked },
                          }))
                        }
                        className="h-3.5 w-3.5 rounded border-border accent-primary"
                      />
                      All items must be checked before the task can be completed
                    </label>

                    {sections.checklist.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="flex-1 text-sm text-foreground">{item}</span>
                        <button
                          type="button"
                          onClick={() => removeChecklistItem(idx)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newChecklistItem}
                        onChange={(e) => setNewChecklistItem(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChecklistItem(); } }}
                        placeholder="New checklist item"
                        className="h-8 flex-1 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={addChecklistItem}
                      className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Item
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── Assignment Info ── */}
          <section>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Assignment Info
            </p>

            <div className="space-y-3">
              <div className="space-y-1.5 relative z-[150]">
                <label className={labelClass}>Property</label>
                <Popover modal={true}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring",
                        !property && "text-muted-foreground"
                      )}
                    >
                      <span className="truncate">{property || "Select property"}</span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0 z-[200]" align="start" sideOffset={4}>
                    <PropertySelector
                      selected={(() => {
                        if (!property) return new Set<string>();
                        const data = getDataForView("Property List");
                        let foundId = "";
                        const walk = (nodes: typeof data): void => {
                          for (const n of nodes) {
                            if (n.type === "property" && n.name === property) { foundId = n.id; return; }
                            if (n.children) walk(n.children);
                          }
                        };
                        walk(data);
                        return foundId ? new Set([foundId]) : new Set<string>();
                      })()}
                      onSelectionChange={(ids) => {
                        const data = getDataForView("Property List");
                        const names = getSelectedPropertyNames(data, ids);
                        setProperty(names[0] ?? "");
                      }}
                      className="h-[360px] border-0 shadow-none rounded-md"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {!hideSpecialtyWorkflow && (
                <>
                  <div className="space-y-1.5">
                    <label className={labelClass}>Specialty</label>
                    <Select value={specialtyId} onValueChange={setSpecialtyId}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select Specialty" />
                      </SelectTrigger>
                      <SelectContent>
                        {SPECIALTIES.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="text-sm">{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className={labelClass}>Workflow</label>
                    <Select value={workflow} onValueChange={setWorkflow}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CUSTOM_WORKFLOWS.map((w) => (
                          <SelectItem key={w} value={w} className="text-sm">{w}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label className={labelClass}>Assignee</label>
                <AssigneeCombobox
                  members={humanMembers}
                  value={assignee}
                  onChange={setAssignee}
                />
              </div>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => { reset(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button size="sm" disabled={!name.trim()} onClick={handleSave}>
            {props.saveButtonText || (isEditing ? "Save Changes" : "Create Task")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

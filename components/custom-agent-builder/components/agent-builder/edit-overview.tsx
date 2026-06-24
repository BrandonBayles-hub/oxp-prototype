"use client";

import { useEffect, useRef } from "react";
import {
  MessageSquare,
  Shield,
  Zap,
  Clock,
  Database,
  Wrench,
  Building2,
  Radio,
  Target,
  Brain,
  Plus,
  X,
  Sparkles,
  Star,
} from "lucide-react";
// Button is imported implicitly by a sibling component; keep the type-import
// only to satisfy the bundler in case future edits add usages back.
// import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DATA_CATALOG, SKILL_CATALOG, VOICE_CATALOG } from "../../lib/custom-agents-catalog";
import { PMC_PROPERTIES } from "../../lib/pmc-identity";
import type {
  AgentVersion,
  Trigger,
  SuccessMetric,
  SuccessMetricUnit,
} from "../../lib/custom-agents-context";
import { inferFromPrompt } from "../../lib/custom-agents-inference";
import { TriggerEditor, newTrigger } from "./trigger-editor";
import { ThresholdWarning } from "./threshold-warning";

export type RecommendationState = {
  /** Data ids that were auto-added by AI during this edit session and haven't been acknowledged. */
  newData: Set<string>;
  /** Skill ids that were auto-added by AI during this edit session and haven't been acknowledged. */
  newSkills: Set<string>;
  /** Data ids the user explicitly rejected in this session — don't re-add them. */
  dismissedData: Set<string>;
  /** Skill ids the user explicitly rejected in this session — don't re-add them. */
  dismissedSkills: Set<string>;
};

type EditOverviewProps = {
  draft: AgentVersion;
  setDraft: (updater: (d: AgentVersion) => AgentVersion) => void;
  recs: RecommendationState;
  setRecs: (updater: (r: RecommendationState) => RecommendationState) => void;
};

export function EditOverview({ draft, setDraft, recs, setRecs }: EditOverviewProps) {
  // Re-run AI inference whenever the prompt / guardrails / triggers change. Auto-adds
  // newly-recommended data sources & skills unless the user explicitly dismissed them.
  const triggersKey = useRef<string>("");
  useEffect(() => {
    const key = JSON.stringify(draft.triggers);
    const inf = inferFromPrompt(
      `${draft.prompt}\n${draft.guardrails ?? ""}`,
      draft.triggers
    );
    const newData = inf.dataIds.filter(
      (id) => !draft.dataIds.includes(id) && !recs.dismissedData.has(id)
    );
    const newSkills = inf.skillIds.filter(
      (id) => !draft.skillIds.includes(id) && !recs.dismissedSkills.has(id)
    );
    if (newData.length === 0 && newSkills.length === 0) {
      triggersKey.current = key;
      return;
    }
    triggersKey.current = key;
    setDraft((d) => ({
      ...d,
      dataIds: [...d.dataIds, ...newData],
      skillIds: [...d.skillIds, ...newSkills],
      aiInferredDataIds: Array.from(new Set([...(d.aiInferredDataIds ?? []), ...newData])),
      aiInferredSkillIds: Array.from(new Set([...(d.aiInferredSkillIds ?? []), ...newSkills])),
    }));
    setRecs((r) => {
      const next: RecommendationState = {
        newData: new Set(r.newData),
        newSkills: new Set(r.newSkills),
        dismissedData: new Set(r.dismissedData),
        dismissedSkills: new Set(r.dismissedSkills),
      };
      newData.forEach((id) => next.newData.add(id));
      newSkills.forEach((id) => next.newSkills.add(id));
      return next;
    });
    // We intentionally only react to the three fields that drive inference. Including
    // `draft.dataIds/skillIds` or `recs` in deps would cause a loop; the effect is
    // idempotent because we filter by "not already present".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.prompt, draft.guardrails, JSON.stringify(draft.triggers)]);

  const patch = (p: Partial<AgentVersion>) => setDraft((d) => ({ ...d, ...p }));

  const toggleData = (id: string) => {
    const isPresent = draft.dataIds.includes(id);
    if (isPresent) {
      setDraft((d) => ({ ...d, dataIds: d.dataIds.filter((x) => x !== id) }));
      setRecs((r) => {
        const next: RecommendationState = {
          newData: new Set(r.newData),
          newSkills: new Set(r.newSkills),
          dismissedData: new Set(r.dismissedData),
          dismissedSkills: new Set(r.dismissedSkills),
        };
        // If it was an AI recommendation, record the dismissal so we don't re-add it
        // on the next inference pass.
        if (recs.newData.has(id) || (draft.aiInferredDataIds ?? []).includes(id)) {
          next.dismissedData.add(id);
        }
        next.newData.delete(id);
        return next;
      });
    } else {
      setDraft((d) => ({ ...d, dataIds: [...d.dataIds, id] }));
      setRecs((r) => {
        const next: RecommendationState = {
          newData: new Set(r.newData),
          newSkills: new Set(r.newSkills),
          dismissedData: new Set(r.dismissedData),
          dismissedSkills: new Set(r.dismissedSkills),
        };
        next.dismissedData.delete(id);
        return next;
      });
    }
  };

  const toggleSkill = (id: string) => {
    const isPresent = draft.skillIds.includes(id);
    if (isPresent) {
      setDraft((d) => ({ ...d, skillIds: d.skillIds.filter((x) => x !== id) }));
      setRecs((r) => {
        const next: RecommendationState = {
          newData: new Set(r.newData),
          newSkills: new Set(r.newSkills),
          dismissedData: new Set(r.dismissedData),
          dismissedSkills: new Set(r.dismissedSkills),
        };
        if (recs.newSkills.has(id) || (draft.aiInferredSkillIds ?? []).includes(id)) {
          next.dismissedSkills.add(id);
        }
        next.newSkills.delete(id);
        return next;
      });
    } else {
      setDraft((d) => ({ ...d, skillIds: [...d.skillIds, id] }));
      setRecs((r) => {
        const next: RecommendationState = {
          newData: new Set(r.newData),
          newSkills: new Set(r.newSkills),
          dismissedData: new Set(r.dismissedData),
          dismissedSkills: new Set(r.dismissedSkills),
        };
        next.dismissedSkills.delete(id);
        return next;
      });
    }
  };

  const acceptDataRec = (id: string) => {
    setRecs((r) => {
      const next: RecommendationState = {
        newData: new Set(r.newData),
        newSkills: new Set(r.newSkills),
        dismissedData: new Set(r.dismissedData),
        dismissedSkills: new Set(r.dismissedSkills),
      };
      next.newData.delete(id);
      return next;
    });
  };

  const acceptSkillRec = (id: string) => {
    setRecs((r) => {
      const next: RecommendationState = {
        newData: new Set(r.newData),
        newSkills: new Set(r.newSkills),
        dismissedData: new Set(r.dismissedData),
        dismissedSkills: new Set(r.dismissedSkills),
      };
      next.newSkills.delete(id);
      return next;
    });
  };

  const addTrigger = (kind: Trigger["kind"]) => {
    patch({ triggers: [...draft.triggers, newTrigger(kind)] });
  };
  const updateTrigger = (id: string, t: Trigger) => {
    patch({ triggers: draft.triggers.map((x) => (x.id === id ? t : x)) });
  };
  const removeTrigger = (id: string) => {
    patch({ triggers: draft.triggers.filter((x) => x.id !== id) });
  };

  const toggleProperty = (p: string) => {
    if (draft.properties.includes(p)) {
      patch({ properties: draft.properties.filter((x) => x !== p) });
    } else {
      patch({ properties: [...draft.properties, p] });
    }
  };

  const updateMetric = (id: string, changes: Partial<SuccessMetric>) => {
    patch({
      successMetrics: (draft.successMetrics ?? []).map((m) =>
        m.id === id ? { ...m, ...changes } : m
      ),
    });
  };
  const addMetric = () => {
    const m: SuccessMetric = {
      id: `sm_${Math.random().toString(36).slice(2, 8)}`,
      label: "New metric",
      unit: "count",
      direction: "up",
      windowDays: 30,
      currentValue: 0,
      previousValue: 0,
      primary: (draft.successMetrics ?? []).length === 0,
      aiInferred: false,
    };
    patch({ successMetrics: [...(draft.successMetrics ?? []), m] });
  };
  const removeMetric = (id: string) => {
    patch({ successMetrics: (draft.successMetrics ?? []).filter((m) => m.id !== id) });
  };
  const setPrimary = (id: string) => {
    patch({
      successMetrics: (draft.successMetrics ?? []).map((m) => ({
        ...m,
        primary: m.id === id,
      })),
    });
  };

  // Data/skills not currently in the draft, for the "Add more" pickers.
  const availableData = DATA_CATALOG.filter((d) => !draft.dataIds.includes(d.id));
  const availableSkills = SKILL_CATALOG.filter((s) => !draft.skillIds.includes(s.id));

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        {/* Name */}
        <EditSection title="Name" icon={Sparkles}>
          <Input
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Agent name"
            className="text-base font-medium"
          />
        </EditSection>

        {/* Prompt */}
        <EditSection title="Prompt" icon={MessageSquare}>
          <textarea
            value={draft.prompt}
            onChange={(e) => patch({ prompt: e.target.value })}
            rows={8}
            placeholder="Describe what you want the agent to do when its trigger fires."
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Changes here will update the AI&apos;s recommended data and skills below.
          </p>
        </EditSection>

        {/* Guardrails */}
        <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/80 to-orange-50/40 p-5">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-900">Guardrails</h3>
              <p className="text-[11px] text-amber-800/80">
                Rules the agent always follows — extra weight.
              </p>
            </div>
          </div>
          <textarea
            value={draft.guardrails ?? ""}
            onChange={(e) => patch({ guardrails: e.target.value })}
            rows={5}
            placeholder="One rule per line."
            className="mt-2 w-full rounded-md border border-amber-200 bg-white/80 px-3 py-2 text-sm text-foreground placeholder:text-amber-700/40 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>

        {/* Triggers */}
        <EditSection title="Triggers" icon={Zap}>
          <div className="space-y-2">
            {draft.triggers.map((t) => (
              <div
                key={t.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3"
              >
                <div className="min-w-0 flex-1">
                  <TriggerEditor trigger={t} onChange={(next) => updateTrigger(t.id, next)} />
                </div>
                <button
                  type="button"
                  onClick={() => removeTrigger(t.id)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Remove trigger"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {draft.triggers.length === 0 && (
              <p className="text-[12px] text-muted-foreground">No triggers yet — add one below.</p>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addTrigger("schedule")}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
            >
              <Clock className="h-3 w-3" />
              <Plus className="h-2.5 w-2.5" /> Schedule
            </button>
            <button
              type="button"
              onClick={() => addTrigger("event")}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
            >
              <Zap className="h-3 w-3" />
              <Plus className="h-2.5 w-2.5" /> Event
            </button>
            <button
              type="button"
              onClick={() => addTrigger("inbound_message")}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
            >
              <MessageSquare className="h-3 w-3" />
              <Plus className="h-2.5 w-2.5" /> Inbound message
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Changing triggers will also update the AI&apos;s recommended data and skills.
          </p>
        </EditSection>

        {/* Success metrics */}
        <EditSection title="Success metrics" icon={Target}>
          <div className="space-y-2">
            {(draft.successMetrics ?? []).map((m) => (
              <MetricRow
                key={m.id}
                metric={m}
                onChange={(c) => updateMetric(m.id, c)}
                onRemove={() => removeMetric(m.id)}
                onSetPrimary={() => setPrimary(m.id)}
              />
            ))}
            {(draft.successMetrics ?? []).length === 0 && (
              <p className="text-[12px] text-muted-foreground">No metrics yet — add one below.</p>
            )}
          </div>
          <button
            type="button"
            onClick={addMetric}
            className="mt-3 inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
          >
            <Plus className="h-3 w-3" /> Add metric
          </button>
        </EditSection>

        {/* Data & Skills */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <EditSection title="Data" icon={Database}>
            <RecommendedNotice
              count={recs.newData.size}
              onAcceptAll={() => {
                setRecs((r) => ({ ...r, newData: new Set() }));
              }}
            />
            <div className="mt-2">
              <ThresholdWarning version={draft} compact />
            </div>
            <ul className="mt-2 space-y-1">
              {draft.dataIds.map((id) => {
                const d = DATA_CATALOG.find((x) => x.id === id);
                if (!d) return null;
                const isNew = recs.newData.has(id);
                return (
                  <ChipRow
                    key={id}
                    label={d.label}
                    description={d.description}
                    newlyRecommended={isNew}
                    onAccept={() => acceptDataRec(id)}
                    onRemove={() => toggleData(id)}
                  />
                );
              })}
              {draft.dataIds.length === 0 && (
                <li className="text-[12px] text-muted-foreground">None selected yet.</li>
              )}
            </ul>
            {availableData.length > 0 && (
              <AddMore
                label="data source"
                options={availableData.map((d) => ({ id: d.id, label: d.label, description: d.description }))}
                onAdd={toggleData}
              />
            )}
          </EditSection>

          <EditSection title="Skills" icon={Wrench}>
            <RecommendedNotice
              count={recs.newSkills.size}
              onAcceptAll={() => {
                setRecs((r) => ({ ...r, newSkills: new Set() }));
              }}
            />
            <div className="mt-2">
              <ThresholdWarning version={draft} compact />
            </div>
            <ul className="mt-2 space-y-1">
              {draft.skillIds.map((id) => {
                const s = SKILL_CATALOG.find((x) => x.id === id);
                if (!s) return null;
                const isNew = recs.newSkills.has(id);
                return (
                  <ChipRow
                    key={id}
                    label={s.label}
                    description={s.description}
                    newlyRecommended={isNew}
                    onAccept={() => acceptSkillRec(id)}
                    onRemove={() => toggleSkill(id)}
                    sensitive={s.requiresApproval}
                  />
                );
              })}
              {draft.skillIds.length === 0 && (
                <li className="text-[12px] text-muted-foreground">None selected yet.</li>
              )}
            </ul>
            {availableSkills.length > 0 && (
              <AddMore
                label="skill"
                options={availableSkills.map((s) => ({ id: s.id, label: s.label, description: s.description }))}
                onAdd={toggleSkill}
              />
            )}
          </EditSection>
        </div>
      </div>

      <div className="space-y-5">
        <EditSection title="Properties" icon={Building2}>
          <ul className="space-y-1.5">
            {PMC_PROPERTIES.map((p) => {
              const on = draft.properties.includes(p);
              return (
                <li key={p}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-white px-2.5 py-1.5 text-[12px] hover:bg-muted/40">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleProperty(p)}
                      className="h-3.5 w-3.5"
                    />
                    <span className={on ? "font-medium text-foreground" : "text-muted-foreground"}>
                      {p}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </EditSection>

        <EditSection title="Conversational Abilities" icon={Radio}>
          <label className="flex cursor-pointer items-center gap-2 text-[12px]">
            <input
              type="checkbox"
              checked={draft.communication?.enabled ?? false}
              onChange={(e) =>
                patch({
                  communication: {
                    ...(draft.communication ?? { enabled: false, channels: [] }),
                    enabled: e.target.checked,
                  },
                })
              }
              className="h-3.5 w-3.5"
            />
            Enable communication
          </label>
          {draft.communication?.enabled && (
            <div className="mt-3 space-y-2">
              {/*
                This side-panel edit surface intentionally mirrors the full
                Communication wizard step (see wizard.tsx `CommunicationStep`)
                in miniature — same channel set (sms/email/voice/chat), same
                persona concept, same per-channel opening line, minus the
                knobs we moved out of the agent builder (phone-number /
                Twilio campaign / email alias → property-scoped; transfer
                number → escalation step). If you're adding a field here,
                add it to the wizard too so both surfaces stay in sync.
              */}
              <div>
                <p className="mb-1 text-[11px] font-medium text-muted-foreground">Channels</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["sms", "email", "voice", "chat"] as const).map((c) => {
                    const on = draft.communication?.channels.includes(c) ?? false;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          const channels = draft.communication?.channels ?? [];
                          patch({
                            communication: {
                              ...(draft.communication ?? { enabled: true, channels: [] }),
                              channels: on ? channels.filter((x) => x !== c) : [...channels, c],
                            },
                          });
                        }}
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                          on
                            ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                            : "border-border bg-white text-muted-foreground"
                        }`}
                      >
                        {c.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                  Agent name (what customers see)
                </p>
                <Input
                  value={draft.communication?.personaName ?? ""}
                  onChange={(e) =>
                    patch({
                      communication: {
                        ...(draft.communication ?? { enabled: true, channels: [] }),
                        personaName: e.target.value,
                      },
                    })
                  }
                  placeholder={`Defaults to "${draft.name || "untitled"}"`}
                />
              </div>
              {draft.communication?.channels.includes("voice") && (
                <div>
                  <p className="mb-1 text-[11px] font-medium text-muted-foreground">Voice</p>
                  <select
                    value={draft.communication?.voiceId ?? ""}
                    onChange={(e) =>
                      patch({
                        communication: {
                          ...(draft.communication ?? { enabled: true, channels: [] }),
                          voiceId: e.target.value || undefined,
                        },
                      })
                    }
                    className="w-full rounded-md border border-border bg-white px-2 py-1 text-[12px]"
                  >
                    <option value="">Choose a voice…</option>
                    {VOICE_CATALOG.map((v) => (
                      <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {(draft.communication?.channels ?? []).map((ch) => (
                <div key={ch}>
                  <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                    Opening line — {ch.toUpperCase()}
                  </p>
                  <textarea
                    value={
                      draft.communication?.firstMessageByChannel?.[ch] ??
                      draft.communication?.firstMessage ??
                      ""
                    }
                    onChange={(e) =>
                      patch({
                        communication: {
                          ...(draft.communication ?? { enabled: true, channels: [] }),
                          firstMessageByChannel: {
                            ...(draft.communication?.firstMessageByChannel ?? {}),
                            [ch]: e.target.value,
                          },
                        },
                      })
                    }
                    rows={2}
                    className="w-full rounded-md border border-border bg-white px-2 py-1 text-[12px]"
                    placeholder={
                      ch === "voice"
                        ? "Thanks for calling {{property.name}}, this is {{agent.persona}}…"
                        : ch === "email"
                        ? "Hi {{customer.first_name}}, this is the team at {{property.name}}…"
                        : "Hi! This is {{agent.persona}} from {{property.name}}…"
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </EditSection>

        <EditSection title="Memory" icon={Brain}>
          <label className="flex cursor-pointer items-center gap-2 text-[12px]">
            <input
              type="checkbox"
              checked={draft.memory?.enabled ?? false}
              onChange={(e) =>
                patch({
                  memory: {
                    ...(draft.memory ?? { enabled: false, lastN: 3, retentionDays: 30 }),
                    enabled: e.target.checked,
                  },
                })
              }
              className="h-3.5 w-3.5"
            />
            Remember past runs
          </label>
          {draft.memory?.enabled && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-[11px] font-medium text-muted-foreground">Last N runs</p>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={draft.memory.lastN}
                  onChange={(e) =>
                    patch({
                      memory: {
                        ...(draft.memory ?? { enabled: true, lastN: 3, retentionDays: 30 }),
                        lastN: Math.max(1, Math.min(20, Number(e.target.value) || 1)),
                      },
                    })
                  }
                />
              </div>
              <div>
                <p className="mb-1 text-[11px] font-medium text-muted-foreground">Retention (days)</p>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={draft.memory.retentionDays}
                  onChange={(e) =>
                    patch({
                      memory: {
                        ...(draft.memory ?? { enabled: true, lastN: 3, retentionDays: 30 }),
                        retentionDays: Math.max(1, Math.min(365, Number(e.target.value) || 30)),
                      },
                    })
                  }
                />
              </div>
            </div>
          )}
        </EditSection>
      </div>
    </div>
  );
}

function EditSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function RecommendedNotice({ count, onAcceptAll }: { count: number; onAcceptAll: () => void }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-indigo-200 bg-indigo-50/70 px-2 py-1.5 text-[11px] text-indigo-900">
      <span className="flex items-center gap-1">
        <Sparkles className="h-3 w-3" />
        {count} newly recommended by AI
      </span>
      <button
        type="button"
        onClick={onAcceptAll}
        className="rounded-md bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-indigo-700"
      >
        Accept all
      </button>
    </div>
  );
}

function ChipRow({
  label,
  description,
  newlyRecommended,
  onAccept,
  onRemove,
  sensitive,
}: {
  label: string;
  description?: string;
  newlyRecommended?: boolean;
  onAccept?: () => void;
  onRemove?: () => void;
  sensitive?: boolean;
}) {
  return (
    <li
      className={`group flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-[12px] ${
        newlyRecommended
          ? "border-indigo-200 bg-indigo-50/40"
          : "border-transparent hover:border-border hover:bg-muted/30"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-foreground">{label}</span>
          {newlyRecommended && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-600/10 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-700">
              <Sparkles className="h-2.5 w-2.5" /> New
            </span>
          )}
          {sensitive && (
            <span className="rounded-full border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground">
              Sensitive
            </span>
          )}
        </div>
        {description && newlyRecommended && (
          <p className="mt-0.5 text-[10px] text-indigo-900/70">{description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {newlyRecommended && onAccept && (
          <button
            type="button"
            onClick={onAccept}
            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100"
            title="Keep this recommendation"
          >
            Keep
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-0.5 text-muted-foreground opacity-60 hover:bg-muted hover:text-foreground group-hover:opacity-100"
            title="Remove"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </li>
  );
}

function AddMore({
  label,
  options,
  onAdd,
}: {
  label: string;
  options: Array<{ id: string; label: string; description: string }>;
  onAdd: (id: string) => void;
}) {
  return (
    <details className="mt-2 rounded-md border border-dashed border-border">
      <summary className="cursor-pointer list-none px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground">
        <span className="inline-flex items-center gap-1">
          <Plus className="h-3 w-3" /> Add a {label}
        </span>
      </summary>
      <ul className="max-h-64 divide-y divide-border overflow-y-auto">
        {options.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              onClick={() => onAdd(o.id)}
              className="flex w-full items-start gap-2 px-2.5 py-1.5 text-left text-[12px] hover:bg-muted/40"
            >
              <Plus className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{o.label}</p>
                <p className="line-clamp-2 text-[10px] text-muted-foreground">{o.description}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

function MetricRow({
  metric,
  onChange,
  onRemove,
  onSetPrimary,
}: {
  metric: SuccessMetric;
  onChange: (p: Partial<SuccessMetric>) => void;
  onRemove: () => void;
  onSetPrimary: () => void;
}) {
  return (
    <div
      className={`rounded-lg border p-2.5 ${
        metric.primary ? "border-indigo-200 bg-indigo-50/30" : "border-border bg-white"
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onSetPrimary}
          title={metric.primary ? "Primary metric" : "Set as primary"}
          className={`mt-1 shrink-0 rounded p-0.5 ${
            metric.primary ? "text-indigo-600" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Star className={`h-3.5 w-3.5 ${metric.primary ? "fill-indigo-500" : ""}`} />
        </button>
        <div className="min-w-0 flex-1 space-y-1.5">
          <Input
            value={metric.label}
            onChange={(e) => onChange({ label: e.target.value })}
            className="h-7 text-[12px] font-medium"
          />
          <div className="flex flex-wrap gap-1.5">
            <select
              value={metric.unit}
              onChange={(e) => onChange({ unit: e.target.value as SuccessMetricUnit })}
              className="rounded border border-border bg-white px-1.5 py-0.5 text-[11px]"
            >
              <option value="count">Count</option>
              <option value="percent">Percent</option>
              <option value="minutes">Minutes</option>
              <option value="dollars">Dollars</option>
              <option value="rate">Rate</option>
            </select>
            <select
              value={metric.direction}
              onChange={(e) =>
                onChange({ direction: e.target.value as "up" | "down" })
              }
              className="rounded border border-border bg-white px-1.5 py-0.5 text-[11px]"
            >
              <option value="up">Higher is better</option>
              <option value="down">Lower is better</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Remove metric"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function emptyRecs(): RecommendationState {
  return {
    newData: new Set(),
    newSkills: new Set(),
    dismissedData: new Set(),
    dismissedSkills: new Set(),
  };
}

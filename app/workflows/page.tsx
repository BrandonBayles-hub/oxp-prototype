"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useWorkflows } from "@/lib/workflows-context";
import { ContractGate } from "@/components/contract-overlay";

const TEMPLATES = [
  { id: "lead", name: "Lead response", description: "When new lead in Entrata → create task and notify leasing." },
  { id: "maint", name: "Maintenance triage", description: "New work order → notify resident, optional escalation." },
  { id: "renewal", name: "Lease renewal batch", description: "Leases expiring in N days → batch reminder workflow." },
];

export default function WorkflowsPage() {
  const { recipes, toggleRecipe, addRecipe, atLeastOneEnabled } = useWorkflows();
  const [showEmbedHint, setShowEmbedHint] = useState(true);

  const applyTemplate = (template: (typeof TEMPLATES)[number]) => {
    addRecipe({ name: template.name, enabled: false, fromTemplate: template.name });
  };

  return (
    <ContractGate featureName="Workflows">
    <>
      <PageHeader
        title="Workflows"
        description="Set up workflows and automations across Entrata and your connectors. Workato is embedded below."
      />

      {/* TDD §4.2.1: Embed area for Workato (POC: placeholder + link) */}
      <section className="section-block">
        <h2 className="section-title mb-2">Workflow builder (Workato)</h2>
        <p className="mb-4 text-[length:var(--text-body)] text-[hsl(var(--muted-foreground))]">
          Primary place to open Workato (embedded), manage recipes, and connect Platform + Entrata. When integrated, the iframe will load the white-label Workato UI here.
        </p>
        <div className="flex min-h-[280px] items-center justify-center rounded-lg border-2 border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20">
          {showEmbedHint ? (
            <div className="text-center">
              <p className="text-[length:var(--text-body)] font-medium text-[hsl(var(--foreground))]">
                Workato embed placeholder
              </p>
              <p className="mt-1 text-[length:var(--text-caption)] text-[hsl(var(--muted-foreground))]">
                JWT/auth and iframe will go here. Manage recipes in the list below for POC.
              </p>
              <button
                type="button"
                onClick={() => setShowEmbedHint(false)}
                className="mt-3 text-sm font-medium text-[hsl(var(--foreground))] underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <p className="text-[length:var(--text-caption)] text-[hsl(var(--muted-foreground))]">
              Embed area (Workato)
            </p>
          )}
        </div>
      </section>

      {/* TDD §4.2: Templates — "Use this" clones recipe */}
      <section className="section-block">
        <h2 className="section-title mb-2">Recipe templates</h2>
        <p className="mb-4 text-[length:var(--text-body)] text-[hsl(var(--muted-foreground))]">
          Pre-built Workato recipes you can clone and adapt. Align with agent types and MCP.
        </p>
        <ul className="grid gap-3 sm:grid-cols-3">
          {TEMPLATES.map((t) => (
            <li
              key={t.id}
              className="flex flex-col rounded-md border border-[hsl(var(--border))] bg-white p-4 shadow-sm"
            >
              <p className="font-medium text-[hsl(var(--foreground))]">{t.name}</p>
              <p className="mt-1 flex-1 text-[length:var(--text-caption)] text-[hsl(var(--muted-foreground))]">
                {t.description}
              </p>
              <button
                type="button"
                onClick={() => applyTemplate(t)}
                className="btn-secondary mt-3 w-full text-sm"
              >
                Use this template
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Manage recipes */}
      <section className="section-block">
        <h2 className="section-title mb-2">Your recipes</h2>
        <table className="table-borderless">
          <thead>
            <tr>
              <th>Recipe</th>
              <th>From template</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recipes.map((r) => (
              <tr key={r.id} className="table-row-hover">
                <td className="font-medium text-[hsl(var(--foreground))]">{r.name}</td>
                <td className="text-[hsl(var(--muted-foreground))]">{r.fromTemplate ?? "—"}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => toggleRecipe(r.id)}
                    className={`rounded-full px-2.5 py-0.5 text-[length:var(--text-caption)] font-medium ${
                      r.enabled
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                    }`}
                  >
                    {r.enabled ? "Enabled" : "Disabled"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
    </ContractGate>
  );
}

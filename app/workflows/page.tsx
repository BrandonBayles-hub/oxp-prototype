"use client";

import { Suspense, useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { useWorkflows } from "@/lib/workflows-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Zap,
  Link2,
  Trash2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function WorkflowsPage() {
  return (
    <Suspense>
      <WorkflowsContent />
    </Suspense>
  );
}

type Project = {
  id: string;
  name: string;
  description: string;
  contributors: { name: string; color: string }[];
  lastUpdatedBy: string;
  lastUpdatedAt: string;
  recipeCount: number;
};

const PROJECTS: Project[] = [
  {
    id: "p-1",
    name: "Lead to Lease",
    description: "Automation to manage the full lead-to-lease lifecycle from inquiry to move-in.",
    contributors: [
      { name: "Paul Dunford", color: "bg-orange-500" },
      { name: "Sarah Chen", color: "bg-teal-500" },
      { name: "Dana Park", color: "bg-purple-500" },
    ],
    lastUpdatedBy: "Paul Dunford",
    lastUpdatedAt: "Feb 14, 2026 3:21 PM",
    recipeCount: 3,
  },
  {
    id: "p-2",
    name: "Maintenance",
    description: "Automation for work order triage, vendor assignment, and resident notifications.",
    contributors: [
      { name: "Sarah Chen", color: "bg-teal-500" },
      { name: "Lisa Nguyen", color: "bg-blue-500" },
      { name: "Dana Park", color: "bg-purple-500" },
    ],
    lastUpdatedBy: "Sarah Chen",
    lastUpdatedAt: "Feb 12, 2026 11:31 AM",
    recipeCount: 1,
  },
  {
    id: "p-3",
    name: "Approvals",
    description: "Automation for the document approval and review process.",
    contributors: [
      { name: "Dana Park", color: "bg-purple-500" },
      { name: "Rachel Adams", color: "bg-red-500" },
      { name: "Paul Dunford", color: "bg-orange-500" },
      { name: "Lisa Nguyen", color: "bg-blue-500" },
    ],
    lastUpdatedBy: "Dana Park",
    lastUpdatedAt: "Feb 10, 2026 3:43 PM",
    recipeCount: 6,
  },
  {
    id: "p-4",
    name: "Renewals",
    description: "Lease renewal reminders, offer generation, and retention workflows.",
    contributors: [
      { name: "Lisa Nguyen", color: "bg-blue-500" },
      { name: "Sarah Chen", color: "bg-teal-500" },
    ],
    lastUpdatedBy: "Lisa Nguyen",
    lastUpdatedAt: "Feb 8, 2026 9:15 AM",
    recipeCount: 2,
  },
  {
    id: "p-5",
    name: "Collections",
    description: "Automated payment reminders, delinquency escalation, and balance tracking.",
    contributors: [
      { name: "Rachel Adams", color: "bg-red-500" },
      { name: "Paul Dunford", color: "bg-orange-500" },
    ],
    lastUpdatedBy: "Rachel Adams",
    lastUpdatedAt: "Feb 6, 2026 2:10 PM",
    recipeCount: 4,
  },
  {
    id: "p-6",
    name: "Move In",
    description: "Automation to help manage getting a unit prepped for move in.",
    contributors: [
      { name: "Paul Dunford", color: "bg-orange-500" },
    ],
    lastUpdatedBy: "Paul Dunford",
    lastUpdatedAt: "Feb 3, 2026 4:55 PM",
    recipeCount: 1,
  },
];

type SidebarCategory = {
  label: string;
  count: number;
  items: { label: string; count: number; id: string }[];
};

function WorkflowsContent() {
  const { recipes } = useWorkflows();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["projects"]));
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sidebarData: SidebarCategory[] = useMemo(() => [
    {
      label: "Assets",
      count: recipes.length + 6 + 1,
      items: [
        { label: "Recipes", count: recipes.length, id: "recipes" },
        { label: "Connections", count: 6, id: "connections" },
        { label: "Trash", count: 1, id: "trash" },
      ],
    },
    {
      label: "Projects",
      count: PROJECTS.reduce((sum, p) => sum + p.recipeCount, 0),
      items: PROJECTS.map((p) => ({ label: p.name, count: p.recipeCount, id: p.id })),
    },
  ], [recipes.length]);

  const displayedProjects = selectedProject
    ? PROJECTS.filter((p) => p.id === selectedProject)
    : PROJECTS;

  const pageTitle = selectedProject
    ? PROJECTS.find((p) => p.id === selectedProject)?.name ?? "Projects"
    : "Projects";

  return (
    <>
      <PageHeader
        title="Workflows"
        description="Set up workflows and automations across Entrata and your connectors."
      />

        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-52 shrink-0">
            <nav className="space-y-4">
              {sidebarData.map((cat) => {
                const sectionId = cat.label.toLowerCase();
                const isExpanded = expandedSections.has(sectionId);
                return (
                  <div key={cat.label}>
                    <button
                      type="button"
                      onClick={() => toggleSection(sectionId)}
                      className="flex w-full items-center justify-between py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    >
                      <span>{cat.label}</span>
                      <span className="flex items-center gap-1">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                          {cat.count}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </span>
                    </button>
                    {isExpanded && (
                      <ul className="mt-1 space-y-0.5">
                        {sectionId === "projects" && (
                          <li>
                            <button
                              type="button"
                              onClick={() => setSelectedProject(null)}
                              className={cn(
                                "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-muted",
                                selectedProject === null && "bg-muted font-medium text-foreground",
                              )}
                            >
                              <span className="flex items-center gap-2">
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                All Projects
                              </span>
                            </button>
                          </li>
                        )}
                        {cat.items.map((item) => {
                          const isActive = sectionId === "projects" && selectedProject === item.id;
                          const IconComp = sectionId === "assets"
                            ? item.id === "recipes" ? Zap : item.id === "connections" ? Link2 : Trash2
                            : null;
                          return (
                            <li key={item.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (sectionId === "projects") setSelectedProject(item.id);
                                }}
                                className={cn(
                                  "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-muted",
                                  isActive && "bg-muted font-medium text-foreground",
                                )}
                              >
                                <span className="flex items-center gap-2">
                                  {IconComp ? (
                                    <IconComp className="h-3.5 w-3.5 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                  )}
                                  {item.label}
                                </span>
                                <span className="text-xs tabular-nums text-muted-foreground">{item.count}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">{pageTitle}</h2>
              <Button size="sm" variant="outline">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Project
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayedProjects.map((project) => (
                <Card key={project.id} className="flex flex-col justify-between p-5">
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="text-base font-semibold text-foreground">{project.name}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Duplicate</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                      {project.description}
                    </p>
                    <div className="mt-3 flex -space-x-1.5">
                      {project.contributors.map((c) => (
                        <Avatar key={c.name} className="h-6 w-6 border-2 border-card">
                          <AvatarFallback className={cn("text-[9px] font-medium text-white", c.color)}>
                            {c.name.split(" ").map((w) => w[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </div>
                  <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                    Last updated by <span className="font-medium text-foreground">{project.lastUpdatedBy}</span> on {project.lastUpdatedAt}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>
    </>
  );
}

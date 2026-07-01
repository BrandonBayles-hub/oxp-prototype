"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildPaymentsAIBulkCategories,
  getNodeSelectionState,
  toggleNodeSelection,
  type BulkGroupCategory,
  type BulkGroupNode,
  type BulkSelectionScope,
} from "@/lib/payments-ai-property-groups";

type FlyoutProperty = {
  id: string;
  name: string;
  vertical: string;
  status: "Active" | "Inactive";
};

type Props = {
  properties: FlyoutProperty[];
  selectedIds: Set<string>;
  onSelectedIdsChange: (next: Set<string>) => void;
  scope: BulkSelectionScope;
  onScopeChange: (scope: BulkSelectionScope) => void;
};

function Checkbox({
  state,
  onChange,
  ariaLabel,
  className,
}: {
  state: "checked" | "indeterminate" | "unchecked";
  onChange: () => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <input
      type="checkbox"
      aria-label={ariaLabel}
      checked={state === "checked"}
      ref={(node) => {
        if (node) node.indeterminate = state === "indeterminate";
      }}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className={cn("h-4 w-4 cursor-pointer rounded border-border accent-zinc-900", className)}
    />
  );
}

function PropertySelectionTable({
  propertyIds,
  propertyById,
  selectedIds,
  onSelectedIdsChange,
  indentPx = 0,
}: {
  propertyIds: string[];
  propertyById: Map<string, FlyoutProperty>;
  selectedIds: Set<string>;
  onSelectedIdsChange: (next: Set<string>) => void;
  indentPx?: number;
}) {
  const rows = propertyIds
    .map((id) => propertyById.get(id))
    .filter((property): property is FlyoutProperty => Boolean(property));

  if (rows.length === 0) return null;

  const allSelected = rows.every((property) => selectedIds.has(property.id));
  const someSelected = rows.some((property) => selectedIds.has(property.id)) && !allSelected;

  const toggleProperty = (propertyId: string) => {
    const next = new Set(selectedIds);
    if (next.has(propertyId)) next.delete(propertyId);
    else next.add(propertyId);
    onSelectedIdsChange(next);
  };

  const toggleAll = () => {
    const next = new Set(selectedIds);
    if (allSelected) rows.forEach((property) => next.delete(property.id));
    else rows.forEach((property) => next.add(property.id));
    onSelectedIdsChange(next);
  };

  return (
    <div style={{ paddingLeft: indentPx }} className="px-2 pb-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="w-10 pb-2 pl-2">
              <Checkbox
                state={allSelected ? "checked" : someSelected ? "indeterminate" : "unchecked"}
                ariaLabel="Select all properties in group"
                onChange={toggleAll}
              />
            </th>
            <th className="pb-2 font-medium text-muted-foreground">Property</th>
            <th className="pb-2 font-medium text-muted-foreground">Vertical</th>
            <th className="pb-2 font-medium text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((property) => {
            const isActive = property.status === "Active";
            return (
              <tr
                key={property.id}
                className="border-b border-border/50 hover:bg-zinc-50"
              >
                <td className="py-3 pl-2">
                  <Checkbox
                    state={selectedIds.has(property.id) ? "checked" : "unchecked"}
                    ariaLabel={`Select ${property.name}`}
                    onChange={() => toggleProperty(property.id)}
                  />
                </td>
                <td className={`py-3 font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                  {property.name}
                </td>
                <td className="py-3 text-muted-foreground">{property.vertical}</td>
                <td className="py-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-zinc-100 text-zinc-500 border-zinc-200"
                    }`}
                  >
                    {property.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GroupTreeNode({
  node,
  depth,
  propertyById,
  selectedIds,
  onSelectedIdsChange,
  expandedIds,
  onToggleExpanded,
}: {
  node: BulkGroupNode;
  depth: number;
  propertyById: Map<string, FlyoutProperty>;
  selectedIds: Set<string>;
  onSelectedIdsChange: (next: Set<string>) => void;
  expandedIds: Set<string>;
  onToggleExpanded: (id: string) => void;
}) {
  const hasChildren = Boolean(node.children?.length);
  const hasNestedProperties = !hasChildren && node.propertyIds.length > 0;
  const expanded = expandedIds.has(node.id);
  const selectionState = getNodeSelectionState(node, selectedIds);
  const indentPx = depth * 16 + 8;

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-zinc-50"
        style={{ paddingLeft: `${indentPx}px` }}
      >
        {(hasChildren || hasNestedProperties) && (
          <button
            type="button"
            onClick={() => onToggleExpanded(node.id)}
            className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            aria-label={expanded ? `Collapse ${node.label}` : `Expand ${node.label}`}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
        {!hasChildren && !hasNestedProperties && <span className="inline-block h-5 w-5" aria-hidden />}
        <Checkbox
          state={selectionState}
          ariaLabel={`Select ${node.label}`}
          onChange={() => onSelectedIdsChange(toggleNodeSelection(node, selectedIds))}
        />
        <button
          type="button"
          onClick={() => hasChildren || hasNestedProperties ? onToggleExpanded(node.id) : undefined}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
        >
          <span className="text-sm font-medium text-foreground">{node.label}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {collectCount(node)} {collectCount(node) === 1 ? "property" : "properties"}
          </span>
        </button>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <GroupTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              propertyById={propertyById}
              selectedIds={selectedIds}
              onSelectedIdsChange={onSelectedIdsChange}
              expandedIds={expandedIds}
              onToggleExpanded={onToggleExpanded}
            />
          ))}
        </div>
      )}

      {expanded && hasNestedProperties && (
        <PropertySelectionTable
          propertyIds={node.propertyIds}
          propertyById={propertyById}
          selectedIds={selectedIds}
          onSelectedIdsChange={onSelectedIdsChange}
          indentPx={indentPx + 28}
        />
      )}
    </div>
  );
}

function collectCount(node: BulkGroupNode): number {
  if (node.children?.length) {
    return [...new Set(node.children.flatMap(collectCountIds))].length;
  }
  return node.propertyIds.length;
}

function collectCountIds(node: BulkGroupNode): string[] {
  if (node.children?.length) {
    return node.children.flatMap(collectCountIds);
  }
  return node.propertyIds;
}

function CategorySection({
  category,
  propertyById,
  selectedIds,
  onSelectedIdsChange,
  expandedIds,
  onToggleExpanded,
}: {
  category: BulkGroupCategory;
  propertyById: Map<string, FlyoutProperty>;
  selectedIds: Set<string>;
  onSelectedIdsChange: (next: Set<string>) => void;
  expandedIds: Set<string>;
  onToggleExpanded: (id: string) => void;
}) {
  const categoryNode: BulkGroupNode = {
    id: `category-${category.id}`,
    label: category.label,
    propertyIds: [],
    children: category.children,
  };
  const expanded = expandedIds.has(categoryNode.id);

  return (
    <div className="rounded-lg border border-border bg-white">
      <div
        className="flex items-center gap-2 border-b border-border/60 px-3 py-3"
        style={{ paddingLeft: "12px" }}
      >
        <button
          type="button"
          onClick={() => onToggleExpanded(categoryNode.id)}
          className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          aria-label={expanded ? `Collapse ${category.label}` : `Expand ${category.label}`}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <Checkbox
          state={getNodeSelectionState(categoryNode, selectedIds)}
          ariaLabel={`Select ${category.label}`}
          onChange={() => onSelectedIdsChange(toggleNodeSelection(categoryNode, selectedIds))}
        />
        <button
          type="button"
          onClick={() => onToggleExpanded(categoryNode.id)}
          className="text-sm font-semibold text-foreground"
        >
          {category.label}
        </button>
      </div>
      {expanded && (
        <div className="py-1">
          {category.children.map((child) => (
            <GroupTreeNode
              key={child.id}
              node={child}
              depth={0}
              propertyById={propertyById}
              selectedIds={selectedIds}
              onSelectedIdsChange={onSelectedIdsChange}
              expandedIds={expandedIds}
              onToggleExpanded={onToggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function PaymentsAIBulkPropertySelector({
  properties,
  selectedIds,
  onSelectedIdsChange,
  scope,
  onScopeChange,
}: Props) {
  const propertyById = useMemo(
    () => new Map(properties.map((property) => [property.id, property])),
    [properties],
  );
  const categories = useMemo(
    () => buildPaymentsAIBulkCategories(properties.map((property) => property.id)),
    [properties],
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const toggleExpanded = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1">
        <button
          type="button"
          onClick={() => onScopeChange("property-groups")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            scope === "property-groups"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Property Groups
        </button>
        <button
          type="button"
          onClick={() => onScopeChange("individual-properties")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            scope === "individual-properties"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Individual Properties
        </button>
      </div>

      {scope === "property-groups" ? (
        <div className="space-y-3">
          {categories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              propertyById={propertyById}
              selectedIds={selectedIds}
              onSelectedIdsChange={onSelectedIdsChange}
              expandedIds={expandedIds}
              onToggleExpanded={toggleExpanded}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-white">
          <PropertySelectionTable
            propertyIds={properties.map((property) => property.id)}
            propertyById={propertyById}
            selectedIds={selectedIds}
            onSelectedIdsChange={onSelectedIdsChange}
          />
          {!properties.length && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No properties match the current filter.</p>
          )}
        </div>
      )}
    </div>
  );
}

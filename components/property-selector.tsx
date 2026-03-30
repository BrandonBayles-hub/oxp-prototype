"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  Search,
  Grid,
  Blocks,
  Ungroup,
  MapPin,
  ChevronRight,
  Info,
  Building,
  Building2,
  ShoppingCart,
  Heart,
  Home,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  type PropertyNode,
  type PropertyViewMode,
  PROPERTY_VIEW_MODES,
  getDataForView,
  getSearchPlaceholder,
  collectDescendantIds,
  matchesSearch,
} from "@/lib/property-selector-data";

// ---------------------------------------------------------------------------
// Node icon mapping
// ---------------------------------------------------------------------------

const PROPERTY_TYPE_ICONS: Record<string, React.ElementType> = {
  apartments: Building,
  office: Building2,
  retail: ShoppingCart,
  senior: Heart,
  "single-family": Home,
};

const TYPE_ICONS: Record<PropertyNode["type"], React.ElementType> = {
  portfolio: Grid,
  region: Blocks,
  group: Ungroup,
  property: MapPin,
};

function NodeIcon({
  node,
  viewMode,
}: {
  node: PropertyNode;
  viewMode: PropertyViewMode;
}) {
  let Icon: React.ElementType;

  if (viewMode === "Property Type" && node.type === "portfolio") {
    Icon = PROPERTY_TYPE_ICONS[node.id] ?? Grid;
  } else {
    Icon = TYPE_ICONS[node.type] ?? MapPin;
  }

  const isLeaf = node.type === "property";

  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
        isLeaf ? "" : "bg-muted"
      )}
    >
      <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Node type label
// ---------------------------------------------------------------------------

function nodeTypeLabel(
  node: PropertyNode,
  viewMode: PropertyViewMode,
  depth: number
): string {
  if (depth === 0 && viewMode === "States") return "State";
  if (depth === 0 && viewMode === "Property Type") return "Property Type";
  return node.type.charAt(0).toUpperCase() + node.type.slice(1);
}

// ---------------------------------------------------------------------------
// Tree item
// ---------------------------------------------------------------------------

interface TreeItemProps {
  node: PropertyNode;
  depth: number;
  expanded: Set<string>;
  selected: Set<string>;
  onToggleExpand: (id: string) => void;
  onToggleSelect: (id: string, node: PropertyNode) => void;
  searchTerm: string;
  viewMode: PropertyViewMode;
}

function TreeItem({
  node,
  depth,
  expanded,
  selected,
  onToggleExpand,
  onToggleSelect,
  searchTerm,
  viewMode,
}: TreeItemProps) {
  const isExpanded = expanded.has(node.id);
  const isSelected = selected.has(node.id);
  const hasChildren = !!node.children?.length;

  const filteredChildren = useMemo(() => {
    if (!node.children || !searchTerm) return node.children;
    return node.children.filter((child) => matchesSearch(child, searchTerm));
  }, [node.children, searchTerm]);

  const allDescendantIds = useMemo(
    () => (hasChildren ? collectDescendantIds(node).slice(1) : []),
    [node, hasChildren]
  );

  if (searchTerm && !matchesSearch(node, searchTerm)) return null;
  const allChildrenSelected =
    hasChildren && allDescendantIds.length > 0 && allDescendantIds.every((id) => selected.has(id));
  const someChildrenSelected =
    hasChildren && !allChildrenSelected && allDescendantIds.some((id) => selected.has(id));

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 pr-3",
          depth === 0 && "pl-3",
          depth === 1 && "pl-7",
          depth === 2 && "pl-11",
          depth >= 3 && "pl-14"
        )}
      >
        {/* Expand toggle */}
        {hasChildren ? (
          <button
            onClick={() => onToggleExpand(node.id)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-muted"
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-150",
                isExpanded && "rotate-90"
              )}
            />
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        {/* Icon */}
        <NodeIcon node={node} viewMode={viewMode} />

        {/* Label & metadata */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-normal text-foreground truncate">
            {node.name}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{nodeTypeLabel(node, viewMode, depth)}</span>
            {node.count != null && <span>{node.count} Properties</span>}
          </div>
        </div>

        {/* Info icon */}
        {node.hasInfo && (
          <button className="shrink-0 rounded p-1 hover:bg-muted">
            <Info className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
          </button>
        )}

        {/* Checkbox */}
        <Checkbox
          checked={
            isSelected || allChildrenSelected
              ? true
              : someChildrenSelected
              ? "indeterminate"
              : false
          }
          onCheckedChange={() => onToggleSelect(node.id, node)}
          className="shrink-0"
        />
      </div>

      {/* Children */}
      {hasChildren && isExpanded && filteredChildren && (
        <div>
          {filteredChildren.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selected={selected}
              onToggleExpand={onToggleExpand}
              onToggleSelect={onToggleSelect}
              searchTerm={searchTerm}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface PropertySelectorProps {
  className?: string;
  selected?: Set<string>;
  /** Called whenever the set of selected IDs changes */
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

export function PropertySelector({ className, selected: externalSelected, onSelectionChange }: PropertySelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [internalSelected, setInternalSelected] = useState<Set<string>>(new Set());
  
  const selected = externalSelected !== undefined ? externalSelected : internalSelected;
  const setSelected = externalSelected !== undefined 
    ? (onSelectionChange || setInternalSelected) 
    : setInternalSelected;
  
  const [viewMode, setViewMode] = useState<PropertyViewMode>("Property List");

  const data = useMemo(() => getDataForView(viewMode), [viewMode]);

  const hasActiveFilters = selected.size > 0 || searchTerm.length > 0;

  const handleToggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleSelect = useCallback((id: string, node: PropertyNode) => {
    const next = new Set(selected);
    const descendantIds = collectDescendantIds(node);
    const allCurrentlySelected = descendantIds.every((did) => next.has(did));

    if (allCurrentlySelected) {
      for (const did of descendantIds) next.delete(did);
    } else {
      for (const did of descendantIds) next.add(did);
    }
    
    if (externalSelected !== undefined && onSelectionChange) {
      onSelectionChange(next);
    } else {
      setInternalSelected(next);
      onSelectionChange?.(next);
    }
  }, [selected, externalSelected, onSelectionChange]);

  const handleClear = useCallback(() => {
    if (externalSelected !== undefined && onSelectionChange) {
      onSelectionChange(new Set());
    } else {
      setInternalSelected(new Set());
      onSelectionChange?.(new Set());
    }
    setSearchTerm("");
  }, [externalSelected, onSelectionChange]);

  const handleViewChange = useCallback((value: string) => {
    setViewMode(value as PropertyViewMode);
    if (externalSelected !== undefined && onSelectionChange) {
      onSelectionChange(new Set());
    } else {
      setInternalSelected(new Set());
      onSelectionChange?.(new Set());
    }
    setSearchTerm("");
    setExpanded(new Set());
  }, [externalSelected, onSelectionChange]);

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-background shadow-lg",
        className
      )}
    >
      {/* Header */}
      <div className="space-y-3 px-4 pt-4 pb-3">
        {/* Title + Clear */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Filter Properties
          </h3>
          <Button
            variant="link"
            size="sm"
            onClick={handleClear}
            disabled={!hasActiveFilters}
            className="h-auto p-0 text-xs"
          >
            Clear
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={getSearchPlaceholder(viewMode)}
            className="h-8 pl-8 text-xs bg-muted/50"
          />
        </div>

        {/* View mode selector */}
        <Select value={viewMode} onValueChange={handleViewChange}>
          <SelectTrigger className="h-9 text-xs font-medium bg-background relative z-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[200]">
            {PROPERTY_VIEW_MODES.map((mode) => (
              <SelectItem key={mode} value={mode} className="text-xs">
                {mode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Section label */}
      <div className="px-4 py-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Select Properties
        </p>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto pb-2">
        {data.map((node) => (
          <TreeItem
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            selected={selected}
            onToggleExpand={handleToggleExpand}
            onToggleSelect={handleToggleSelect}
            searchTerm={searchTerm}
            viewMode={viewMode}
          />
        ))}
      </div>
    </div>
  );
}

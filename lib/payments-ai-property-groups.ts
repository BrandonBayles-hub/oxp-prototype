/** Property group hierarchy for Payments AI bulk settings (Agent Roster). */

export type PaymentsAIPropertyType = "Apartment" | "Commercial" | "Student" | "Subsidized";
export type PaymentsAIPropertyState = "Colorado" | "Texas" | "Florida";
export type BulkSelectionScope = "property-groups" | "individual-properties";

export type PaymentsAIPropertyMeta = {
  propertyType: PaymentsAIPropertyType;
  state: PaymentsAIPropertyState;
  customGroupId: "mountain-portfolio" | "texas-portfolio" | "southeast-portfolio";
  systemGroupId: "central-leasing" | "historical-access";
};

export const PAYMENTS_AI_PROPERTY_META: Record<string, PaymentsAIPropertyMeta> = {
  "aspen-heights": { propertyType: "Apartment", state: "Colorado", customGroupId: "mountain-portfolio", systemGroupId: "central-leasing" },
  "14th-north-pkwy": { propertyType: "Apartment", state: "Texas", customGroupId: "texas-portfolio", systemGroupId: "central-leasing" },
  "rails-on-main": { propertyType: "Apartment", state: "Texas", customGroupId: "texas-portfolio", systemGroupId: "central-leasing" },
  "summit-view": { propertyType: "Student", state: "Colorado", customGroupId: "mountain-portfolio", systemGroupId: "central-leasing" },
  "bellamy-place": { propertyType: "Apartment", state: "Colorado", customGroupId: "mountain-portfolio", systemGroupId: "central-leasing" },
  "ivy-gate": { propertyType: "Subsidized", state: "Colorado", customGroupId: "mountain-portfolio", systemGroupId: "central-leasing" },
  "copper-ridge": { propertyType: "Commercial", state: "Texas", customGroupId: "texas-portfolio", systemGroupId: "central-leasing" },
  "harborstone": { propertyType: "Apartment", state: "Florida", customGroupId: "texas-portfolio", systemGroupId: "central-leasing" },
  "meridian-west": { propertyType: "Student", state: "Texas", customGroupId: "texas-portfolio", systemGroupId: "historical-access" },
  "cedar-canyon": { propertyType: "Apartment", state: "Colorado", customGroupId: "texas-portfolio", systemGroupId: "historical-access" },
  "trailside-co": { propertyType: "Subsidized", state: "Colorado", customGroupId: "southeast-portfolio", systemGroupId: "historical-access" },
  "magnolia-grove": { propertyType: "Apartment", state: "Florida", customGroupId: "southeast-portfolio", systemGroupId: "historical-access" },
  "the-henley": { propertyType: "Student", state: "Florida", customGroupId: "southeast-portfolio", systemGroupId: "historical-access" },
  "riverwalk-apts": { propertyType: "Subsidized", state: "Florida", customGroupId: "southeast-portfolio", systemGroupId: "historical-access" },
  "broadstone-park": { propertyType: "Apartment", state: "Texas", customGroupId: "southeast-portfolio", systemGroupId: "historical-access" },
};

export type BulkGroupNode = {
  id: string;
  label: string;
  propertyIds: string[];
  children?: BulkGroupNode[];
};

export type BulkGroupCategory = {
  id: "smart" | "system" | "custom";
  label: string;
  children: BulkGroupNode[];
};

const CUSTOM_GROUP_LABELS: Record<PaymentsAIPropertyMeta["customGroupId"], string> = {
  "mountain-portfolio": "Mountain Portfolio",
  "texas-portfolio": "Texas Portfolio",
  "southeast-portfolio": "Southeast Portfolio",
};

const SYSTEM_GROUP_LABELS: Record<PaymentsAIPropertyMeta["systemGroupId"], string> = {
  "central-leasing": "Central Leasing Office",
  "historical-access": "Historical Access",
};

const PROPERTY_TYPES: PaymentsAIPropertyType[] = ["Apartment", "Commercial", "Student", "Subsidized"];
const PROPERTY_STATES: PaymentsAIPropertyState[] = ["Colorado", "Texas", "Florida"];

function idsMatching(
  allPropertyIds: string[],
  predicate: (meta: PaymentsAIPropertyMeta) => boolean,
): string[] {
  return allPropertyIds.filter((id) => {
    const meta = PAYMENTS_AI_PROPERTY_META[id];
    return meta ? predicate(meta) : false;
  });
}

function node(id: string, label: string, propertyIds: string[], children?: BulkGroupNode[]): BulkGroupNode {
  return { id, label, propertyIds, children };
}

export function buildPaymentsAIBulkCategories(allPropertyIds: string[]): BulkGroupCategory[] {
  const propertyTypeNodes = PROPERTY_TYPES.map((type) =>
    node(`smart-type-${type.toLowerCase()}`, type, idsMatching(allPropertyIds, (m) => m.propertyType === type)),
  );

  const stateNodes = PROPERTY_STATES.map((state) =>
    node(`smart-state-${state.toLowerCase()}`, state, idsMatching(allPropertyIds, (m) => m.state === state)),
  );

  const customGroupIds = [...new Set(allPropertyIds.map((id) => PAYMENTS_AI_PROPERTY_META[id]?.customGroupId).filter(Boolean))] as PaymentsAIPropertyMeta["customGroupId"][];
  const customNodes = customGroupIds.map((groupId) =>
    node(
      `custom-${groupId}`,
      CUSTOM_GROUP_LABELS[groupId],
      idsMatching(allPropertyIds, (m) => m.customGroupId === groupId),
    ),
  );

  const systemGroupIds = [...new Set(allPropertyIds.map((id) => PAYMENTS_AI_PROPERTY_META[id]?.systemGroupId).filter(Boolean))] as PaymentsAIPropertyMeta["systemGroupId"][];
  const systemNodes = systemGroupIds.map((groupId) =>
    node(
      `system-${groupId}`,
      SYSTEM_GROUP_LABELS[groupId],
      idsMatching(allPropertyIds, (m) => m.systemGroupId === groupId),
    ),
  );

  return [
    {
      id: "smart",
      label: "Smart Groups",
      children: [
        node("smart-all-properties", "All Properties", allPropertyIds),
        node("smart-property-types", "Property Types", propertyTypeNodes.flatMap((n) => n.propertyIds), propertyTypeNodes),
        node("smart-states", "States/Provinces", stateNodes.flatMap((n) => n.propertyIds), stateNodes),
      ],
    },
    {
      id: "system",
      label: "System Groups",
      children: systemNodes,
    },
    {
      id: "custom",
      label: "Custom Groups",
      children: customNodes,
    },
  ];
}

export function collectNodePropertyIds(node: BulkGroupNode): string[] {
  if (node.children?.length) {
    return [...new Set(node.children.flatMap(collectNodePropertyIds))];
  }
  return node.propertyIds;
}

export function getNodeSelectionState(
  node: BulkGroupNode,
  selectedIds: Set<string>,
): "checked" | "indeterminate" | "unchecked" {
  const ids = collectNodePropertyIds(node);
  if (ids.length === 0) return "unchecked";
  const selectedCount = ids.filter((id) => selectedIds.has(id)).length;
  if (selectedCount === 0) return "unchecked";
  if (selectedCount === ids.length) return "checked";
  return "indeterminate";
}

export function toggleNodeSelection(node: BulkGroupNode, selectedIds: Set<string>): Set<string> {
  const ids = collectNodePropertyIds(node);
  const next = new Set(selectedIds);
  const state = getNodeSelectionState(node, selectedIds);
  const shouldSelect = state !== "checked";
  ids.forEach((id) => {
    if (shouldSelect) next.add(id);
    else next.delete(id);
  });
  return next;
}

export function getSelectedGroupLabels(
  categories: BulkGroupCategory[],
  selectedIds: Set<string>,
): string[] {
  const labels: string[] = [];
  const visit = (node: BulkGroupNode) => {
    const state = getNodeSelectionState(node, selectedIds);
    if (state === "checked" && !node.children?.length) {
      labels.push(node.label);
    }
    node.children?.forEach(visit);
  };
  categories.forEach((category) => category.children.forEach(visit));
  return labels;
}

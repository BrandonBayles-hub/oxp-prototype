export const mockEscalations = [
  { id: "1", summary: "Resident asked about late fee policy", category: "Payments", status: "Open", assignee: "Unassigned" },
  { id: "2", summary: "Work order #4402 — HVAC not cooling", category: "Maintenance", status: "In progress", assignee: "Mike" },
  { id: "3", summary: "Lease renewal terms clarification", category: "Leasing", status: "Open", assignee: "Unassigned" },
];

export const mockAgentSections = [
  {
    bucket: "Leasing & Marketing",
    items: [
      { id: "1", name: "Leasing AI", description: "Tours, applications, lease questions", status: "Active" },
    ],
  },
  {
    bucket: "Resident Relations & Retention",
    items: [
      { id: "2", name: "Renewal AI", description: "Renewal conversations and retention", status: "Active" },
    ],
  },
  {
    bucket: "Operations & Maintenance",
    items: [
      { id: "3", name: "Maintenance AI", description: "Work orders, follow-up, scheduling", status: "Active" },
      { id: "4", name: "Payments AI", description: "Rent, fees, payment questions", status: "Training" },
    ],
  },
];

export const mockVaultDocs = [
  { id: "1", fileName: "Leasing SOP", trainedOn: "Yes", modified: "Feb 18, 2025", owner: "Admin" },
  { id: "2", fileName: "Maintenance escalation", trainedOn: "Yes", modified: "Feb 15, 2025", owner: "Admin" },
  { id: "3", fileName: "Fair housing & anti-discrimination", trainedOn: "Yes", modified: "Feb 10, 2025", owner: "Admin" },
  { id: "4", fileName: "Lease template", trainedOn: "No", modified: "Feb 5, 2025", owner: "Admin" },
];

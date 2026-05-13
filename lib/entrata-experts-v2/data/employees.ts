import type { Employee } from "../types";

export const EMPLOYEES: Employee[] = [
  { id: "e-mara", name: "Mara Holloway", role: "vp-ops", roleLabel: "VP of Operations", avatarSeed: 1 },
  { id: "e-marcus", name: "Marcus Chen", role: "regional", roleLabel: "Regional Manager — Southeast", region: "southeast", avatarSeed: 2 },
  { id: "e-priya", name: "Priya Rao", role: "regional", roleLabel: "Regional Manager — Mountain West", region: "mountain-west", avatarSeed: 3 },
  { id: "e-jasmin", name: "Jasmin Ortega", role: "onsite-pm", roleLabel: "PM — Wynbrook Tampa Bay", property: "wb-tampa-1", avatarSeed: 4 },
  { id: "e-derek", name: "Derek Olsson", role: "onsite-pm", roleLabel: "PM — Wynbrook Westshore", property: "wb-tampa-2", avatarSeed: 5 },
  { id: "e-aisha", name: "Aisha Nguyen", role: "onsite-pm", roleLabel: "PM — Wynbrook Charlotte Crossings", property: "wb-charlotte", avatarSeed: 6 },
  { id: "e-ryan", name: "Ryan Park", role: "onsite-pm", roleLabel: "PM — Wynbrook LoHi", property: "wb-denver", avatarSeed: 7 },
  { id: "e-jordan", name: "Jordan Reilly", role: "onsite-pm", roleLabel: "PM — Wynbrook Cat Quarter", property: "wb-tucson", avatarSeed: 8 },
  { id: "e-lena", name: "Lena Whitfield", role: "onsite-pm", roleLabel: "PM — Wynbrook Sun Devil Commons", property: "wb-asu", avatarSeed: 9 },
  { id: "e-thomas", name: "Thomas Becker", role: "asset-mgr", roleLabel: "Asset Manager", avatarSeed: 10 },
  { id: "e-rina", name: "Rina Patel", role: "accounting", roleLabel: "AP Lead", avatarSeed: 11 },
  { id: "e-greg", name: "Greg Tomlin", role: "accounting", roleLabel: "Controller", avatarSeed: 12 },
];

export const EMPLOYEE_BY_ID: Record<string, Employee> = EMPLOYEES.reduce(
  (acc, e) => ({ ...acc, [e.id]: e }),
  {},
);

export function avatarColor(seed: number) {
  const palette = [
    "#475569",
    "#3b7a9e",
    "#0f766e",
    "#c2410c",
    "#5c6e91",
    "#dc2626",
    "#7c3aed",
    "#0891b2",
    "#a16207",
    "#65a30d",
    "#a16207",
    "#608aa6",
  ];
  return palette[seed % palette.length];
}

export function initials(name: string) {
  return name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}

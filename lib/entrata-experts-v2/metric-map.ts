// Entrata Analyst → Analytics Platform metric dictionary bridge
// -----------------------------------------------------------------------------
// Phase 2 (V1.3) of the handoff design
// (docs/product/ENTRATA-ANALYST-AND-ANALYTICS-PLATFORM-HANDOFF.md).
//
// Analyst artifacts carry *labels* ("Delinquency rate", "Market rent"), not the
// platform's metric ids. When a handed-off block should be **live** (re-queried
// by the Analytics Platform rather than a frozen snapshot), we resolve those
// labels to real Analytics Platform metric slugs.
//
// Every slug below is a real, active `MetricDefinition.slug` in the Analytics
// Platform catalog — emitting an unknown slug makes the platform's DSL compiler
// reject the dashboard (`unknown_metric`), so this map is the contract that
// keeps live handoffs compiling. By V1.3 both products read the same dictionary
// and this lookup collapses into a shared resolver; until then it covers the
// core lenses (portfolio, payments, leasing, renewals, maintenance).

/** Normalize a human label for lookup: lowercase, strip units/punctuation. */
export function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[%$()]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(avg|average|total|net|rate|amount|pct|percent|per|the|of|ytd)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// label (already normalized) → Analytics Platform metric slug.
// Keys are written in normalized form (see normalizeLabel) so lookups are exact.
const METRIC_SLUGS: Record<string, string> = {
  // Portfolio / occupancy
  occupancy: "occupancy_rate",
  occupied: "occupancy_rate",
  vacancy: "vacancy_rate",
  vacant: "vacancy_rate",
  leased: "leased_rate",
  "leased units": "leased_rate",
  "available units": "available_units",
  "expiring leases": "expiring_leases",

  // Financial / accounting
  noi: "noi",
  "operating income": "net_operating_income",
  "noi margin": "noi_margin",
  "operating expense": "total_operating_expense",
  "bad debt": "bad_debt",
  concessions: "concessions",
  "effective gross income": "effective_gross_income",
  "capital expenditures": "capital_expenditures",
  capex: "capital_expenditures",

  // Payments / delinquency
  delinquency: "delinquency_rate",
  delinquent: "delinquency_rate",
  "delinquency dollars": "delinquency_amount",
  "balance owed": "delinquency_amount",
  "balance": "delinquency_amount",
  collections: "collections_rate",
  collected: "collections_rate",

  // Rents / pricing
  rent: "avg_rent",
  "market rent": "avg_market_rent",
  "in place rent": "avg_in_place_rent",
  "inplace rent": "avg_in_place_rent",
  "market rent psf": "avg_market_rent_psf",
  "in place rent psf": "avg_in_place_rent_psf",
  "lease trade out": "lease_trade_out",
  "trade out": "lease_trade_out",
  "loss to lease": "loss_to_lease",
  "gain to lease": "gain_to_lease",

  // Leasing
  "lead to lease": "lead_to_lease_conversion",
  "lead lease conversion": "lead_to_lease_conversion",
  conversion: "lead_to_lease_conversion",
  "leases signed": "leases_signed",
  applications: "applications_received",
  "applications received": "applications_received",
  "days to lease": "avg_days_to_lease",
  "lease term": "avg_lease_term",

  // Renewals
  renewal: "renewal_rate",
  renewals: "renewal_rate",
  "renewal acceptance": "renewal_acceptance_rate",
  "renewals count": "renewals_count",
  "days to renew": "elir_avg_days_to_renew",

  // Maintenance / turns
  "turn time": "turn_time",
  "make ready": "avg_make_ready_turn_days",
  "make ready turn": "avg_make_ready_turn_days",
  "resolution time": "avg_resolution_time",
};

// Analytics Platform dimension slugs that are always safe to group by — the
// platform's catalog loader guarantees these even when not seeded
// (catalogs.server.ts). Anything else risks an `unknown_dimension` compile error.
const SAFE_DIMENSIONS = ["property", "region", "classType", "vertical", "month"] as const;
export type SafeDimension = (typeof SAFE_DIMENSIONS)[number];

const DIMENSION_SLUGS: Record<string, SafeDimension> = {
  property: "property",
  properties: "property",
  community: "property",
  communities: "property",
  asset: "property",
  building: "property",
  region: "region",
  market: "region",
  markets: "region",
  division: "region",
  month: "month",
  date: "month",
  period: "month",
  week: "month",
  quarter: "month",
  class: "classType",
  "class type": "classType",
  tier: "classType",
  vertical: "vertical",
  segment: "vertical",
  type: "vertical",
};

/**
 * Resolve an Analyst label to a real Analytics Platform metric slug, or null
 * when nothing in the (pre-V1.3) bridge dictionary matches.
 */
export function resolveMetricSlug(label: string): string | null {
  const norm = normalizeLabel(label);
  if (!norm) return null;
  if (METRIC_SLUGS[norm]) return METRIC_SLUGS[norm];
  // Substring fallback: pick the longest dictionary key contained in the label
  // (or vice-versa) so "Net delinquency rate %" still resolves to delinquency.
  let best: { key: string; slug: string } | null = null;
  for (const [key, slug] of Object.entries(METRIC_SLUGS)) {
    if (norm.includes(key) || key.includes(norm)) {
      if (!best || key.length > best.key.length) best = { key, slug };
    }
  }
  return best?.slug ?? null;
}

/**
 * Resolve a dimension label (typically the first column of a table) to a safe
 * Analytics Platform dimension slug. Defaults to "property".
 */
export function resolveDimensionSlug(label: string | undefined): SafeDimension {
  if (!label) return "property";
  const norm = normalizeLabel(label) || label.toLowerCase().trim();
  if (DIMENSION_SLUGS[norm]) return DIMENSION_SLUGS[norm];
  for (const [key, slug] of Object.entries(DIMENSION_SLUGS)) {
    if (norm.includes(key)) return slug;
  }
  return "property";
}

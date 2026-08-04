"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import {
  CHART_FONT_SIZE,
  CHART_GRID_STROKE,
  DeltaPill,
  EscalationsSection,
  SERIES_NEUTRAL,
  ReportFilterBar,
  ReportPageHeader,
  ReportSection,
  SectionBanner,
  StatCard,
  StatGrid,
  useReportScope,
  legendLabel,
  monthsForPeriod,
  seriesColor,
  seriesColorMap,
  serializeFilters,
  type ReportFilters,
  type ReportViewMode,
  type Tone,
} from "@/components/performance";

// -----------------------------------------------------------------------------
// Static config (illustrative prototype data)
// -----------------------------------------------------------------------------

const PROPERTIES = [
  "Cedar Hills",
  "Hillside Living",
  "Jamison Apartments",
  "Lakewood",
  "Maple Court",
  "Oak Terrace",
  "Parkview Flats",
  "Pine Valley",
  "Summit Ridge",
  "The Beacon",
] as const;

type Property = (typeof PROPERTIES)[number];

/** Property series colors come from the shared ordered palette so a given
 *  property keeps the same color on every report it appears in. */
const PROPERTY_COLORS: Record<Property, string> = seriesColorMap(PROPERTIES);

// -----------------------------------------------------------------------------
// Trend data helpers
// -----------------------------------------------------------------------------

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function seedRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface MonthlyPoint {
  month: string;
  monthIdx: number;
  current: number;
  perProperty: Record<Property, number>;
}

function buildMonthlyTrend(seed: number, currentStart: number, currentEnd: number, perPropertySpread = 30) {
  const rand = seedRand(seed);
  const data: MonthlyPoint[] = [];
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const current = currentStart + (currentEnd - currentStart) * t + (rand() - 0.5) * 0.8;
    const perProperty = {} as Record<Property, number>;
    PROPERTIES.forEach((p, idx) => {
      const offset = (idx - PROPERTIES.length / 2) * (perPropertySpread / PROPERTIES.length);
      perProperty[p] = Math.round(current + offset + (rand() - 0.5) * (perPropertySpread / 6));
    });
    data.push({
      month: MONTH_LABELS[i],
      monthIdx: i,
      current: Math.round(current),
      perProperty,
    });
  }
  return data;
}

const renewalRateTrend = buildMonthlyTrend(101, 69, 75, 40);
const totalRenewalsTrend = buildMonthlyTrend(202, 200, 215, 100);
const rentIncreaseTrend = buildMonthlyTrend(303, 4.5, 5.0, 1.5);
const fullyAutomatedTrend = buildMonthlyTrend(404, 54, 62, 20);
const escalationResolutionTrend = buildMonthlyTrend(505, 3.0, 3.4, 0.8);

function buildRenewalRateByBedrooms(monthCount: number) {
  return Array.from({ length: monthCount }, (_, i) => {
    const t = i / Math.max(monthCount - 1, 1);
    return {
      month: MONTH_LABELS[i % 12],
      "Studio": Math.round(60 + 4 * t + (i % 2) * 0.5),
      "1 BR": Math.round(66 + 4 * t + (i % 3) * 0.4),
      "2 BR": Math.round(71 + 4 * t + (i % 2) * 0.3),
      "3 BR": Math.round(75 + 4 * t + (i % 3) * 0.2),
    };
  });
}

const BASE_RENT_INCREASE_DIST = [
  { bucket: "0–2%", count: 312 },
  { bucket: "2–4%", count: 580 },
  { bucket: "4–6%", count: 842 },
  { bucket: "6–8%", count: 410 },
  { bucket: "8–10%", count: 162 },
  { bucket: "10%+", count: 112 },
];

const BASE_NON_RENEWAL_REASONS = [
  { reason: "Price", count: 410 },
  { reason: "Relocating", count: 286 },
  { reason: "Buying Home", count: 184 },
  { reason: "Roommate Changes", count: 96 },
  { reason: "Maintenance Issues", count: 78 },
  { reason: "Other", count: 142 },
];

const BASE_RENEWAL_INTENT = [
  { name: "Wants to Renew", value: 64, count: 1842, color: seriesColor(0)},
  { name: "Considering", value: 14, count: 412, color: seriesColor(1)},
  { name: "Does Not Want to Renew", value: 11, count: 318, color: seriesColor(2)},
  { name: "Needs Different Unit", value: 4, count: 124, color: seriesColor(3)},
  { name: "New Lease Questions", value: 6, count: 186, color: seriesColor(4)},
];

const BASE_TERM_LENGTH_VOLUME = [
  { term: "Month-to-Month", count: 162 },
  { term: "6 Months", count: 286 },
  { term: "9 Months", count: 198 },
  { term: "12 Months", count: 1480 },
  { term: "14 Months", count: 168 },
  { term: "15+ Months", count: 124 },
];

function buildResidentEngagement(monthCount: number) {
  return Array.from({ length: monthCount }, (_, i) => {
    const t = i / Math.max(monthCount - 1, 1);
    return {
      month: MONTH_LABELS[i % 12],
      "Engaged %": Math.round(52 + 8 * t + (i % 2) * 0.5),
      "No Response %": Math.round(44 - 6 * t + (i % 2) * 0.4),
      "Opted Out %": Math.round(4 - 2 * t + (i % 3) * 0.2),
    };
  });
}

const BASE_ESCALATION_REASONS = [
  { reason: "Pricing Question", count: 148 },
  { reason: "Lease Terms", count: 96 },
  { reason: "Unit Transfer", count: 72 },
  { reason: "Maintenance", count: 50 },
  { reason: "Contact Office", count: 28 },
  { reason: "Technical", count: 12 },
];

const BASE_OUTREACH_CHANNEL_MIX = [
  { name: "SMS", value: 70, count: 12840, color: seriesColor(0)},
  { name: "Email", value: 30, count: 5580, color: seriesColor(1)},
];

function buildDeveloperNotesQuery(startDate: string, endDate: string) {
  return `WITH property_months AS (
    SELECT
        p.cid,
        p.id AS property_id,
        p.property_name,
        p.number_of_units,
        pt.name AS property_type,
        gs.month
    FROM properties p
    JOIN property_products pp
        ON pp.property_id = p.id
       AND pp.ps_product_id = 1
    JOIN property_types pt
        ON pt.id = p.property_type_id
    CROSS JOIN (
        SELECT generate_series(
            date_trunc('month', '${startDate}'::date),
            date_trunc('month', '${endDate}'::date),
            '1 month'::interval
        )::date AS month
    ) gs
    WHERE p.property_type_id IN (1, 4)
      AND p.is_test = 0
),
ending_intervals AS (
    SELECT
        pm.month AS ending_month,
        pm.cid,
        pm.property_id,
        pm.property_name,
        pm.number_of_units,
        pm.property_type,
        li.lease_id,
        li.id AS lease_interval_id,
        li.lease_start_date::date AS lease_start_date,
        li.lease_end_date::date AS lease_end_date,
        cl.unit_space_id,
        cl.transfer_lease_id,
        cl.move_out_date::date AS move_out_date,
        pf.number_of_bedrooms,
        lp.move_out_reason_list_item_id,
        mor.name AS move_out_reason,
        SUM(sc.charge_amount) AS old_rent
    FROM property_months pm
    JOIN lease_intervals li
        ON li.cid = pm.cid
       AND li.property_id = pm.property_id
       AND date_trunc('month', li.lease_end_date)::date = pm.month
       AND li.lease_interval_type_id NOT IN (4)
       AND li.lease_status_type_id > 3
    JOIN cached_leases cl
        ON cl.cid = li.cid
       AND cl.id = li.lease_id
       AND (cl.move_out_date IS NULL OR cl.move_out_date >= cl.lease_end_date)
    JOIN unit_spaces us
        ON us.cid = cl.cid
       AND us.id = cl.unit_space_id
    JOIN property_floorplans pf
        ON pf.cid = us.cid
       AND pf.id = us.property_floorplan_id
    JOIN scheduled_charges sc
        ON sc.cid = li.cid
       AND sc.lease_interval_id = li.id
       AND NOT sc.is_unselected_quote
       AND sc.deleted_by IS NULL
       AND (sc.ar_origin_id, sc.ar_code_type_id) IN ((1, 2), (2, 2))
       AND sc.ar_trigger_id BETWEEN 300 AND 399
       AND li.lease_end_date BETWEEN sc.charge_start_date AND COALESCE(sc.charge_end_date, '12/31/2099')
       AND sc.scheduled_charge_type_id NOT IN (10)
    JOIN lease_processes lp
        ON lp.cid = cl.cid
       AND lp.lease_id = cl.id
       AND lp.customer_id IS NULL
    LEFT JOIN list_items mor
        ON mor.cid = pm.cid
       AND mor.id = lp.move_out_reason_list_item_id
    GROUP BY
        pm.month,
        pm.cid,
        pm.property_id,
        pm.property_name,
        pm.number_of_units,
        pm.property_type,
        li.lease_id,
        li.id,
        li.lease_start_date,
        li.lease_end_date,
        cl.unit_space_id,
        cl.transfer_lease_id,
        cl.move_out_date,
        pf.number_of_bedrooms,
        lp.move_out_reason_list_item_id,
        mor.name
),
renewal_outcomes AS (
    SELECT
        ei.*,
        next_interval.next_lease_interval_id,
        next_interval.next_lease_interval_type_id,
        next_interval.next_lease_start_date,
        next_interval.next_lease_term_months,
        transfer_interval.transfer_lease_interval_id,
        transfer_interval.transfer_lease_interval_type_id,
        transfer_interval.transfer_lease_start_date,
        transfer_interval.transfer_lease_term_months,
        COALESCE(next_interval.next_rent, transfer_interval.transfer_rent) AS new_rent,
        CASE
            WHEN next_interval.next_lease_interval_id IS NOT NULL
             AND next_interval.next_lease_interval_type_id = 3 THEN 'Renewed'
            WHEN next_interval.next_lease_interval_id IS NOT NULL
             AND next_interval.next_lease_interval_type_id = 2 THEN 'MTM'
            WHEN next_interval.next_lease_interval_id IS NOT NULL
             AND next_interval.next_lease_interval_type_id = 6 THEN 'Extended'
            WHEN next_interval.next_lease_interval_id IS NULL
             AND transfer_interval.transfer_lease_interval_id IS NOT NULL
             AND transfer_interval.transfer_lease_interval_type_id IN (3, 5) THEN 'Renewed'
            WHEN next_interval.next_lease_interval_id IS NULL
             AND transfer_interval.transfer_lease_interval_id IS NULL
             AND ei.move_out_date BETWEEN ei.lease_start_date AND ei.lease_end_date THEN 'Moved Out'
            ELSE 'Other'
        END AS what_happened
    FROM ending_intervals ei
    LEFT JOIN LATERAL (
        SELECT
            lin.id AS next_lease_interval_id,
            lin.lease_interval_type_id AS next_lease_interval_type_id,
            lin.lease_start_date::date AS next_lease_start_date,
            lt.term_month AS next_lease_term_months,
            SUM(scn.charge_amount) AS next_rent
        FROM lease_intervals lin
        LEFT JOIN lease_terms lt
            ON lt.cid = lin.cid
           AND lt.id = lin.lease_term_id
        JOIN scheduled_charges scn
            ON scn.cid = lin.cid
           AND scn.lease_interval_id = lin.id
           AND NOT scn.is_unselected_quote
           AND scn.deleted_by IS NULL
           AND (scn.ar_origin_id, scn.ar_code_type_id) IN ((1, 2), (2, 2))
           AND scn.ar_trigger_id BETWEEN 300 AND 399
           AND lin.lease_start_date BETWEEN scn.charge_start_date AND COALESCE(scn.charge_end_date, '12/31/2099')
           AND scn.scheduled_charge_type_id NOT IN (10)
        WHERE lin.cid = ei.cid
          AND lin.lease_id = ei.lease_id
          AND lin.lease_start_date = ei.lease_end_date + INTERVAL '1 day'
          AND lin.lease_interval_type_id NOT IN (4)
          AND lin.lease_status_type_id >= 3
        GROUP BY lin.id, lin.lease_interval_type_id, lin.lease_start_date, lt.term_month
        ORDER BY lin.lease_start_date
        LIMIT 1
    ) next_interval ON TRUE
    LEFT JOIN LATERAL (
        SELECT
            linn.id AS transfer_lease_interval_id,
            linn.lease_interval_type_id AS transfer_lease_interval_type_id,
            linn.lease_start_date::date AS transfer_lease_start_date,
            ltn.term_month AS transfer_lease_term_months,
            SUM(scnn.charge_amount) AS transfer_rent
        FROM cached_leases cln
        JOIN lease_intervals linn
            ON linn.cid = cln.cid
           AND linn.lease_id = cln.id
           AND linn.lease_interval_type_id NOT IN (4)
        LEFT JOIN lease_terms ltn
            ON ltn.cid = linn.cid
           AND ltn.id = linn.lease_term_id
        JOIN scheduled_charges scnn
            ON scnn.cid = linn.cid
           AND scnn.lease_interval_id = linn.id
           AND NOT scnn.is_unselected_quote
           AND scnn.deleted_by IS NULL
           AND (scnn.ar_origin_id, scnn.ar_code_type_id) IN ((1, 2), (2, 2))
           AND scnn.ar_trigger_id BETWEEN 300 AND 399
           AND linn.lease_start_date BETWEEN scnn.charge_start_date AND COALESCE(scnn.charge_end_date, '12/31/2099')
           AND scnn.scheduled_charge_type_id NOT IN (10)
        WHERE cln.cid = ei.cid
          AND cln.id = ei.transfer_lease_id
          AND ei.transfer_lease_id IS NOT NULL
          AND ei.move_out_date BETWEEN ei.lease_start_date AND ei.lease_end_date
          AND cln.lease_status_type_id >= 3
        GROUP BY linn.id, linn.lease_interval_type_id, linn.lease_start_date, ltn.term_month
        HAVING SUM(scnn.charge_amount) > 0
        ORDER BY linn.lease_start_date
        LIMIT 1
    ) transfer_interval ON TRUE
),
renewal_detail AS (
    SELECT
        ro.*,
        offer.application_id,
        offer.application_lease_interval_id,
        offer.offer_sent_on,
        offer.accepted_on,
        offer.application_completed_on,
        offer.lease_completed_on,
        signal.renewal_intent_event_sub_type_id,
        signal.signal_recorded_on
    FROM renewal_outcomes ro
    LEFT JOIN LATERAL (
        SELECT
            ca.id AS application_id,
            ca.lease_interval_id AS application_lease_interval_id,
            CASE
                WHEN ca.occupancy_type_id = 6 THEN ca.application_datetime
                ELSE q.created_on
            END AS offer_sent_on,
            ca.application_completed_on,
            ca.lease_completed_on,
            CASE
                WHEN ca.occupancy_type_id = 6 THEN sub_cert.date_primary_applicant_signed
                ELSE q.accepted_on
            END AS accepted_on
        FROM cached_applications ca
        LEFT JOIN quotes q
            ON q.cid = ca.cid
           AND q.application_id = ca.id
        LEFT JOIN subsidy_certifications sub_cert
            ON sub_cert.cid = ca.cid
           AND sub_cert.application_id = ca.id
        WHERE ca.cid = ro.cid
          AND ca.lease_id = ro.lease_id
          AND ca.lease_interval_type_id = 3
          AND COALESCE(q.created_on::date, ca.application_datetime::date)
              BETWEEN ro.lease_start_date AND ro.lease_end_date
        ORDER BY ca.lease_completed_on DESC NULLS LAST, accepted_on DESC NULLS LAST, offer_sent_on DESC
        LIMIT 1
    ) offer ON TRUE
    LEFT JOIN LATERAL (
        SELECT
            e.event_sub_type_id AS renewal_intent_event_sub_type_id,
            e.created_on AS signal_recorded_on
        FROM events e
        WHERE e.cid = ro.cid
          AND e.event_type_id = 604
          AND e.event_sub_type_id IN (648, 649, 650)
          AND e.lease_interval_id = offer.application_lease_interval_id
          AND e.created_on::date BETWEEN COALESCE(offer.offer_sent_on::date, ro.lease_start_date) AND ro.lease_end_date
        ORDER BY e.created_on DESC, e.id DESC
        LIMIT 1
    ) signal ON TRUE
)
SELECT
    ending_month,
    cid,
    property_id,
    property_name,
    property_type,
    number_of_units,
    lease_id,
    lease_interval_id,
    lease_start_date,
    lease_end_date,
    unit_space_id,
    number_of_bedrooms,
    what_happened,
    CASE WHEN what_happened = 'Moved Out' THEN move_out_reason END AS move_out_reason,
    CASE WHEN what_happened = 'Moved Out' THEN move_out_reason_list_item_id END AS move_out_reason_list_item_id,
    COALESCE(next_lease_term_months, transfer_lease_term_months) AS renewal_term_months,
    old_rent,
    new_rent,
    ROUND((new_rent - old_rent) / NULLIF(old_rent, 0) * 100, 2) AS rent_growth_pct,
    CASE
        WHEN new_rent IS NULL OR old_rent IS NULL THEN NULL
        WHEN (new_rent - old_rent) / NULLIF(old_rent, 0) < 0.02 THEN '0-2%'
        WHEN (new_rent - old_rent) / NULLIF(old_rent, 0) < 0.04 THEN '2-4%'
        WHEN (new_rent - old_rent) / NULLIF(old_rent, 0) < 0.06 THEN '4-6%'
        WHEN (new_rent - old_rent) / NULLIF(old_rent, 0) < 0.08 THEN '6-8%'
        WHEN (new_rent - old_rent) / NULLIF(old_rent, 0) < 0.10 THEN '8-10%'
        ELSE '10%+'
    END AS rent_increase_bucket,
    CASE
        WHEN what_happened IN ('Renewed', 'MTM', 'Extended')
        THEN GREATEST(new_rent - old_rent, 0) * 12
        ELSE 0
    END AS incremental_annual_revenue,
    CASE
        WHEN what_happened IN ('Renewed', 'MTM', 'Extended') THEN 5000
        ELSE 0
    END AS avoided_turnover_cost_static,
    offer_sent_on,
    accepted_on,
    application_completed_on,
    lease_completed_on,
    CASE
        WHEN signal_recorded_on IS NOT NULL
         AND application_completed_on IS NOT NULL THEN LEAST(signal_recorded_on, application_completed_on)
        ELSE COALESCE(signal_recorded_on, application_completed_on)
    END AS first_resident_signal_on,
    CASE
        WHEN what_happened = 'MTM' THEN next_lease_start_date::timestamp
        ELSE COALESCE(lease_completed_on, accepted_on, transfer_lease_start_date::timestamp)
    END AS renewal_completed_on,
    CASE
        WHEN what_happened = 'MTM' THEN NULL
        ELSE COALESCE(lease_completed_on::date, accepted_on::date, transfer_lease_start_date) - offer_sent_on::date
    END AS days_to_renew,
    lease_end_date - CASE
        WHEN what_happened = 'MTM' THEN next_lease_start_date
        ELSE COALESCE(lease_completed_on::date, accepted_on::date, transfer_lease_start_date)
    END AS days_before_lease_end,
    CASE
        WHEN lease_end_date - CASE
            WHEN what_happened = 'MTM' THEN next_lease_start_date
            ELSE COALESCE(lease_completed_on::date, accepted_on::date, transfer_lease_start_date)
        END >= 60 THEN 1
        ELSE 0
    END AS signed_60_plus_days_early,
    renewal_intent_event_sub_type_id,
    signal_recorded_on
FROM renewal_detail
ORDER BY ending_month, property_name, lease_id, lease_interval_id;`;
}

const overallMetricCoverage = [
  "Renewal rate, leases eligible for renewal, renewed residents, renewal rate trend, and total renewals trend aggregate detail rows by ending_month; renewed rows are what_happened IN ('Renewed', 'MTM', 'Extended').",
  "Avg rent increase at renewal, rent increase trend, incremental annual revenue, and rent increase distribution use old_rent, new_rent, rent_growth_pct, rent_increase_bucket, and incremental_annual_revenue on renewed/MTM/extended rows.",
  "Avg days before lease end and renewals signed 60+ days early use renewal_completed_on, days_before_lease_end, and signed_60_plus_days_early. renewal_completed_on prefers cached_applications.lease_completed_on, with MTM falling back to the next lease interval start date because MTM does not have cached_applications linkage.",
  "Avg days to renew uses cached_applications.lease_completed_on minus offer_sent_on when available. accepted_on and application_completed_on are also returned because they are useful for earlier intent/acceptance timing analysis. MTM rows return NULL for days_to_renew because there is no application offer-to-sign workflow.",
  "Renewal Rate by Bedrooms groups the same renewal-rate calculation by number_of_bedrooms from property_floorplans.",
  "Reasons for Non-Renewal uses move_out_reason_list_item_id and move_out_reason only when what_happened = 'Moved Out', so prior successful renewal intervals on the same lease do not inherit the final move-out reason.",
  "Renewal Intent Distribution uses the latest renewal signal per renewal application from events where event_type_id = 604, event_sub_type_id IN (648, 649, 650), and events.lease_interval_id = cached_applications.lease_interval_id.",
  "Renewals signed by term length groups renewed/MTM/extended rows by renewal_term_months.",
  "Avoided turnover costs uses avoided_turnover_cost_static, calculated as $5,000 for each renewed/MTM/extended interval.",
];

const missingOverallMetrics = [
  "Renewal rate lift (AI vs non-AI) still needs an AI-managed indicator for the renewal interval or offer.",
  "Staff hours saved, total outreach messages, SMS sent, emails sent, outreach channel mix, resident response rate, average AI response time, and average resident response time need Renewals AI messaging/conversation event sources.",
  "Fully automated renewals and resident engagement breakdown need an automation/human-intervention marker plus outreach response disposition data.",
  "Escalation rate, total escalations, open escalations, resolved escalations, and average escalation resolution time need Renewals AI escalation records or conversation escalation events.",
  "Escalation Reasons is intentionally commented out until we identify the escalation reason data source.",
];

function scaleCount<T extends Record<string, any>>(data: T[], key: string, scale: number, seed: number): T[] {
  const rand = seedRand(seed);
  return data.map((item) => ({
    ...item,
    [key]: Math.round((item[key] as number) * scale * (1 + (rand() - 0.5) * 0.08)),
  }));
}

function scaleDonut(data: { name: string; value: number; count: number; color: string }[], scale: number, seed: number) {
  const rand = seedRand(seed);
  const scaled = data.map((d) => ({
    ...d,
    count: Math.round(d.count * scale * (1 + (rand() - 0.5) * 0.06)),
  }));
  const total = scaled.reduce((s, d) => s + d.count, 0);
  return scaled.map((d) => ({ ...d, value: Math.round((d.count / total) * 100) }));
}

// -----------------------------------------------------------------------------
// Period slicing — limits trend data to the selected period
// -----------------------------------------------------------------------------

function sliceTrend<T extends { monthIdx: number }>(data: T[], months: number): T[] {
  return data.slice(Math.max(0, data.length - months));
}

function formatSqlDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addMonths(date: Date, offset: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
}

function monthValueToSqlDate(value: string) {
  return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : null;
}

function getQueryDateRange(filters: ReportFilters) {
  if (filters.periodId === "custom") {
    const customStart = monthValueToSqlDate(filters.customFrom);
    const customEnd = monthValueToSqlDate(filters.customTo);
    if (customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }
  }

  const months = monthsForPeriod(filters.periodId);
  const now = new Date();
  const currentMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  return {
    startDate: formatSqlDate(addMonths(currentMonth, -(months - 1))),
    endDate: formatSqlDate(currentMonth),
  };
}

// -----------------------------------------------------------------------------
// Page-local UI
//
// Stat cards, delta pills, section banners and the filter bar now come from
// @/components/performance so every ELI+ report shares one specification.
// -----------------------------------------------------------------------------

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

function LoadingBanner() {
  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground" />
      Refreshing data based on your filter selection…
    </div>
  );
}

// -----------------------------------------------------------------------------
// Filters
// -----------------------------------------------------------------------------
// Filters
//
// Period / Properties / view-mode controls come from the shared ReportFilterBar
// so the bar has the same controls, order, defaults and position on every
// report. Only the property list is page-specific.
// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// Trend chart — switches between current portfolio metric vs per-property lines
// -----------------------------------------------------------------------------

function TrendChart({
  data,
  view,
  selected,
  yDomain,
  height = 240,
}: {
  data: MonthlyPoint[];
  view: ReportViewMode;
  selected: Set<string>;
  yDomain?: [number, number];
  height?: number;
}) {
  if (view === "global") {
    const config = {
      current: { label: "Current", color: seriesColor(0) },
    } satisfies ChartConfig;
    return (
      <div>
        <ChartContainer config={config} className="!aspect-auto w-full" style={{ height }}>
          <LineChart data={data} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={32}
              domain={yDomain ?? [0, "auto"]}
            />
            <ChartTooltip content={<ChartTooltipContent className="min-w-[12rem]" />} />
            <Line
              type="monotone"
              dataKey="current"
              stroke={seriesColor(0)}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
        <div className="mt-1 flex items-center justify-center gap-4 text-xxs">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-slate-900" />
            <span className="font-medium text-foreground">Current</span>
          </span>
        </div>
      </div>
    );
  }

  const visibleProps = PROPERTIES.filter((p) => selected.has(p));
  const flat = data.map((d) => {
    const row: Record<string, number | string> = { month: d.month };
    for (const p of visibleProps) row[p] = d.perProperty[p];
    return row;
  });
  const config = Object.fromEntries(
    visibleProps.map((p) => [p, { label: p, color: PROPERTY_COLORS[p] }]),
  ) satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="!aspect-auto w-full" style={{ height }}>
      <LineChart data={flat} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} domain={yDomain ?? [0, "auto"]} />
        <ChartTooltip content={<ChartTooltipContent className="min-w-[14rem]" />} />
        {visibleProps.map((p) => (
          <Line
            key={p}
            type="monotone"
            dataKey={p}
            stroke={PROPERTY_COLORS[p]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

function PropertyChips({
  state,
  setState,
}: {
  state: ReportFilters;
  setState: (s: ReportFilters) => void;
}) {
  if (state.view !== "perProperty") return null;
  const list = PROPERTIES.filter((p) => state.properties.has(p));
  return (
    <div className="-mt-2 mb-5 flex flex-wrap gap-1.5">
      {list.map((p) => (
        <span
          key={p}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs"
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PROPERTY_COLORS[p] }} />
          {p}
          <button
            type="button"
            onClick={() => {
              // Write to `propertySelection`, not `properties`. The latter is
              // the page-scoped derivation and is recomputed from the shared
              // selection on every render, so assigning to it was discarded
              // and the chip's X did nothing.
              //
              // An empty selection means "all", so removing the first chip has
              // to materialise the remaining properties explicitly — otherwise
              // "all minus one" would round-trip straight back to "all".
              const current =
                state.propertySelection && state.propertySelection.size > 0
                  ? new Set(state.propertySelection)
                  : new Set<string>(state.properties);
              current.delete(p);
              setState({ ...state, propertySelection: current });
            }}
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Remove ${p}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Donut chart used for renewal intent + outreach mix
// -----------------------------------------------------------------------------

function DonutWithLegend({
  data,
  formatRow,
}: {
  data: { name: string; value: number; count: number; color: string }[];
  formatRow?: (d: { name: string; value: number; count: number }) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="h-[180px] w-[180px] shrink-0">
        <ChartContainer config={{}} className="!aspect-auto h-full w-full">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={1}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-3 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="flex-1 text-foreground">{d.name}</span>
            <span className="font-semibold text-foreground tabular-nums">
              {formatRow ? formatRow(d) : `${d.value}%`}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              ({d.count.toLocaleString()})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeveloperNotes({
  query,
  startDate,
  endDate,
}: {
  query: string;
  startDate: string;
  endDate: string;
}) {
  return (
    <details className="mb-4 mt-2 rounded-md border border-border bg-muted/30">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-foreground">
        Developer Notes
      </summary>
      <div className="space-y-4 border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <p>
          This is a prototype dashboard. Data is illustrative and does not reflect live property metrics. Baseline represents pre-AI performance for comparison. All metrics reflect the selected time period.
        </p>

        <div>
          <h4 className="mb-1 text-xs font-semibold text-foreground">
            Overall Renewal Performance Data Coverage
          </h4>
          <ul className="list-disc space-y-1 pl-5">
            {overallMetricCoverage.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-1 text-xs font-semibold text-foreground">
            Metrics Not Covered by This Query
          </h4>
          <ul className="list-disc space-y-1 pl-5">
            {missingOverallMetrics.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-1 text-xs font-semibold text-foreground">
            Consolidated Sample Query
          </h4>
          <p className="mb-2 text-xxs text-muted-foreground">
            Rendered for the selected period: {startDate} through {endDate}.
          </p>
          <pre className="max-h-[28rem] overflow-auto rounded-md border border-border bg-background p-3 text-xxs leading-relaxed text-foreground">
            <code>{query}</code>
          </pre>
        </div>
      </div>
    </details>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function RenewalsAiDashboardPage() {
  const [filters, setFilters, scope] = useReportScope(PROPERTIES);
  const [loading, setLoading] = useState(false);
  const isFirstRender = useRef(true);
  const filtersKey = useMemo(() => serializeFilters(filters), [filters]);
  const queryDateRange = useMemo(() => getQueryDateRange(filters), [filters]);
  const developerNotesQuery = useMemo(
    () => buildDeveloperNotesQuery(queryDateRange.startDate, queryDateRange.endDate),
    [queryDateRange],
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, [filtersKey]);

  const months = useMemo(() => monthsForPeriod(filters.periodId), [filters.periodId]);

  const renewalRateData = useMemo(() => sliceTrend(renewalRateTrend, months), [months]);
  const totalRenewalsData = useMemo(() => sliceTrend(totalRenewalsTrend, months), [months]);
  const rentIncreaseData = useMemo(() => sliceTrend(rentIncreaseTrend, months), [months]);
  const fullyAutomatedData = useMemo(() => sliceTrend(fullyAutomatedTrend, months), [months]);
  const escalationResolutionData = useMemo(() => sliceTrend(escalationResolutionTrend, months), [months]);

  const scale = months / 12;
  const rentIncreaseDistribution = useMemo(() => scaleCount(BASE_RENT_INCREASE_DIST, "count", scale, 1001 + months), [scale, months]);
  const nonRenewalReasons = useMemo(() => scaleCount(BASE_NON_RENEWAL_REASONS, "count", scale, 2001 + months), [scale, months]);
  const termLengthVolume = useMemo(() => scaleCount(BASE_TERM_LENGTH_VOLUME, "count", scale, 3001 + months), [scale, months]);
  const escalationReasons = useMemo(() => scaleCount(BASE_ESCALATION_REASONS, "count", scale, 4001 + months), [scale, months]);
  const renewalIntent = useMemo(() => scaleDonut(BASE_RENEWAL_INTENT, scale, 5001 + months), [scale, months]);
  const outreachChannelMix = useMemo(() => scaleDonut(BASE_OUTREACH_CHANNEL_MIX, scale, 6001 + months), [scale, months]);
  const residentEngagement = useMemo(() => buildResidentEngagement(months), [months]);
  const renewalRateByBedrooms = useMemo(() => buildRenewalRateByBedrooms(months), [months]);

  const kpi = useMemo(() => {
    const rand = seedRand(7777 + months);
    const jitter = () => 1 + (rand() - 0.5) * 0.06;
    const fmt = (v: number) => v >= 1000 ? Math.round(v).toLocaleString() : v.toFixed(v < 10 ? 1 : 0);
    const fmtDollar = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(2)}M` : `$${Math.round(v / 1000)}K`;

    const renewalRate = (74 * jitter()).toFixed(1);
    const eligibleLeases = Math.round(3264 * scale * jitter());
    const renewedResidents = Math.round(2418 * scale * jitter());
    const avgRentIncrease = (4.8 * jitter()).toFixed(1);
    const incrementalRevenue = fmtDollar(1510000 * scale * jitter());
    const avoidedTurnover = fmtDollar(2140000 * scale * jitter());
    const avgDaysToRenew = (9.2 * jitter()).toFixed(1);
    const avgDaysBeforeLease = Math.round(68 * jitter());
    const signed60Plus = (72 * jitter()).toFixed(1);
    const staffHoursSaved = fmt(1842 * scale * jitter());
    const avgDaysAI = (9.2 * jitter()).toFixed(1);
    const fullyAutomated = (62 * jitter()).toFixed(1);
    const totalOutreach = fmt(18420 * scale * jitter());
    const smsSent = fmt(12840 * scale * jitter());
    const emailsSent = fmt(5580 * scale * jitter());
    const responseRate = (38.4 * jitter()).toFixed(1);
    const avgAIResponseTime = (8 * jitter()).toFixed(0);
    const avgResidentResponseTime = (4.2 * jitter()).toFixed(1);
    const escalationRate = (12.4 * jitter()).toFixed(1);
    const totalEscalations = Math.round(406 * scale * jitter());
    const openEscalations = Math.round(42 * scale * jitter());
    const resolvedEscalations = Math.round(364 * scale * jitter());

    return {
      renewalRate: `${renewalRate}%`,
      eligibleLeases: eligibleLeases.toLocaleString(),
      renewedResidents: renewedResidents.toLocaleString(),
      avgRentIncrease: `+${avgRentIncrease}%`,
      incrementalRevenue,
      avoidedTurnover,
      avgDaysToRenew,
      avgDaysBeforeLease: String(avgDaysBeforeLease),
      signed60Plus: `${signed60Plus}%`,
      staffHoursSaved,
      avgDaysAI,
      fullyAutomated: `${fullyAutomated}%`,
      totalOutreach,
      smsSent,
      emailsSent,
      responseRate: `${responseRate}%`,
      avgAIResponseTime: `< ${avgAIResponseTime} sec`,
      avgResidentResponseTime: `${avgResidentResponseTime} hrs`,
      escalationRate: `${escalationRate}%`,
      totalEscalations: totalEscalations.toLocaleString(),
      openEscalations: String(openEscalations),
      resolvedEscalations: resolvedEscalations.toLocaleString(),
    };
  }, [months, scale]);

  return (
    <div className="-mt-2">
      <ReportPageHeader
        agent="Renewals AI"
        description="Renewal rates and revenue impact, plus the time and outreach ELI+ handled"
      />

      <ReportFilterBar
        filters={filters}
        onChange={setFilters}
        properties={PROPERTIES}
        unmatchedProperties={scope.unmatched}
        showViewToggle
      />

      <PropertyChips state={filters} setState={setFilters} />

      {loading && <LoadingBanner />}

      {/* ============================================================ */}
      {/* Section 1 — Overall Renewal Performance                       */}
      {/* ============================================================ */}
      

      {/* ============================================================ */}
      {/* Section 2 — Renewals AI Impact                               */}
      {/* ============================================================ */}
      <section className="mb-6">
        <SectionBanner
          title="Renewals AI Impact"
          description="Time savings, automation metrics, and AI-driven value for properties using Renewals AI"
        />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,1fr)]">
          <Card>
            <CardContent className="px-5 py-4">
              <p className="text-xxs font-semibold text-muted-foreground">
                Renewal rate lift (AI vs non-AI)
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums text-foreground">
                {loading ? "…" : "+8.2 pts"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                AI-managed: 78% vs non-AI: 69.8%
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard
              label="Staff hours saved"
              value={kpi.staffHoursSaved}
              delta="+240 hrs"
              sub="hours saved by AI automation"
              subItalic="18,420 messages × 6 min avg manual handling ÷ 60"
            />
            <StatCard
            lowerIsBetter
              label="Avg days to renew (AI)"
              value={kpi.avgDaysAI}
              delta="-4.9 days faster"
              sub="vs 14.1 days without AI"
            />
            <StatCard
              label="Fully automated renewals"
              value={kpi.fullyAutomated}
              delta="+8 pts"
              sub="renewals completed with zero human intervention"
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Fully Automated Renewals — Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={fullyAutomatedData}
                view={filters.view}
                selected={filters.properties}
                yDomain={filters.view === "global" ? [0, 65] : [0, 100]}
              />
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Resident Engagement Breakdown — Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  "Engaged %": { label: "Engaged %", color: seriesColor(0) },
                  "No Response %": { label: "No Response %", color: seriesColor(1) },
                  "Opted Out %": { label: "Opted Out %", color: seriesColor(2) },
                }}
                className="!aspect-auto h-[240px] w-full"
              >
                <LineChart data={residentEngagement} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} domain={[0, 70]} tickFormatter={(v) => `${v}%`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="Engaged %" stroke={seriesColor(0)} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="No Response %" stroke={seriesColor(1)} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Opted Out %" stroke={seriesColor(2)} strokeWidth={2} dot={false} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: `${CHART_FONT_SIZE}px`, paddingTop: "6px" }}
                    formatter={legendLabel}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Total outreach messages"
            value={kpi.totalOutreach}
            delta="+12%"
            sub="AI-sent messages"
          />
          <StatCard label="SMS sent" value={kpi.smsSent} delta="+8%" sub="outbound SMS" />
          <StatCard label="Emails sent" value={kpi.emailsSent} delta="+18%" sub="outbound emails" />
          <StatCard
            label="Resident response rate"
            value={kpi.responseRate}
            delta="+2.1 pts"
            sub="responded to AI outreach"
          />
          <StatCard
            lowerIsBetter
            label="Avg AI response time"
            value={kpi.avgAIResponseTime}
            delta="-2 sec"
            sub="from resident message to AI reply"
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <StatCard
            lowerIsBetter
            label="Avg resident response time"
            value={kpi.avgResidentResponseTime}
            delta="-1.4 hrs"
            sub="from AI message to resident reply"
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Outreach Channel Mix</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutWithLegend data={outreachChannelMix} />
            </CardContent>
          </Card>
        </div>
      </section>

      

      {/* ============================================================ */}
      {/* Section 3 — Escalations                                      */}
      {/* ============================================================ */}
      <EscalationsSection
        stats={[
          {
            label: "Escalation rate",
            value: kpi.escalationRate,
            delta: "-1.8 pts",
            deltaTone: "positive",
            sub: "of AI contacts escalated",
          },
          {
            label: "Total escalations · drill in",
            value: kpi.totalEscalations,
            sub: "escalated to staff",
            action: (
              <Link href="/escalations" className="text-xxs font-medium text-foreground underline underline-offset-2 hover:no-underline">
                Drill in →
              </Link>
            ),
          },
          { label: "Open escalations", value: kpi.openEscalations, sub: "pending resolution" },
          {
            label: "Resolved",
            value: kpi.resolvedEscalations,
            delta: "89% resolution",
            deltaTone: "positive",
            sub: "resolved by staff",
          },
        ]}
      >
        <div className="grid gap-3 lg:grid-cols-1">
          {/* Escalation Reasons is commented out until the escalation reason data source is identified.
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Escalation Reasons</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="!aspect-auto h-[260px] w-full">
                <BarChart data={escalationReasons} margin={{ left: 8, right: 12, top: 8, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                  <XAxis dataKey="reason" tickLine={false} axisLine={false} tickMargin={8} angle={-30} textAnchor="end" height={50} interval={0} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Avg Escalation Resolution Time — Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={escalationResolutionData}
                view={filters.view}
                selected={filters.properties}
                yDomain={filters.view === "global" ? [0, 4] : [0, 5]}
              />
            </CardContent>
          </Card>
        </div>
      </EscalationsSection>

      <section className="mb-6">
        <SectionBanner
          title="Overall Renewal Performance"
          description="Key renewal metrics across all properties — independent of AI usage"
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Renewal rate"
            value={kpi.renewalRate}
            delta="+4 pts"
            sub="of eligible residents renewed"
          />
          <StatCard label="Leases eligible for renewal" value={kpi.eligibleLeases} sub="leases expired during period" />
          <StatCard
            label="Renewed residents"
            value={kpi.renewedResidents}
            delta="+14%"
            sub="renewed during period"
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Renewal Rate — Monthly Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={renewalRateData}
                view={filters.view}
                selected={filters.properties}
                yDomain={filters.view === "global" ? [0, 80] : [0, 100]}
              />
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Renewals — Monthly Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={totalRenewalsData}
                view={filters.view}
                selected={filters.properties}
                yDomain={filters.view === "global" ? [0, 220] : [0, 300]}
              />
            </CardContent>
          </Card>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Avg rent increase at renewal"
            value={kpi.avgRentIncrease}
            delta="+0.6 pts"
            sub="$52 avg monthly increase"
          />
          <StatCard
            label="Incremental annual revenue"
            value={kpi.incrementalRevenue}
            delta="+$184K"
            sub="from renewal rent increases"
          />
          <StatCard
            label="Avoided turnover costs"
            value={kpi.avoidedTurnover}
            delta="+$320K"
            sub="est. savings from retained residents"
            subItalic="$5,000 avg turnover cost × 428 retained leases"
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Avg % Rent Increase at Renewal — Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={rentIncreaseData}
                view={filters.view}
                selected={filters.properties}
                yDomain={filters.view === "global" ? [0, 8] : [0, 8]}
              />
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Rent Increase Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="!aspect-auto h-[240px] w-full">
                <BarChart data={rentIncreaseDistribution} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                  <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} angle={-30} textAnchor="end" height={40} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            lowerIsBetter
            label="Avg days to renew"
            value={kpi.avgDaysToRenew}
            delta="-4.9 days"
            sub="days from offer generated to signed"
          />
          <StatCard
            label="Avg days before lease end"
            value={kpi.avgDaysBeforeLease}
            delta="+12 days"
            sub="days before expiration renewal is finalized"
          />
          <StatCard
            label="Renewals signed 60+ days early"
            value={kpi.signed60Plus}
            delta="+8 pts"
            sub="of renewals finalized 60+ days before expiry"
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Renewal Rate by Bedrooms — Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  Studio: { label: "Studio", color: seriesColor(0) },
                  "1 BR": { label: "1 BR", color: seriesColor(1) },
                  "2 BR": { label: "2 BR", color: seriesColor(2) },
                  "3 BR": { label: "3 BR", color: seriesColor(5) },
                }}
                className="!aspect-auto h-[260px] w-full"
              >
                <LineChart data={renewalRateByBedrooms} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} domain={[50, 90]} tickFormatter={(v) => `${v}%`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="Studio" stroke={seriesColor(0)} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="1 BR" stroke={seriesColor(1)} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="2 BR" stroke={seriesColor(2)} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="3 BR" stroke={seriesColor(5)} strokeWidth={2} dot={false} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: `${CHART_FONT_SIZE}px`, paddingTop: "6px" }}
                    formatter={legendLabel}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Reasons for Non-Renewal</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="!aspect-auto h-[260px] w-full">
                <BarChart data={nonRenewalReasons} margin={{ left: 8, right: 12, top: 8, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                  <XAxis dataKey="reason" tickLine={false} axisLine={false} tickMargin={8} angle={-30} textAnchor="end" height={50} interval={0} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Renewal Intent Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutWithLegend data={renewalIntent} />
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Renewals Signed by Term Length (Volume)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="!aspect-auto h-[220px] w-full">
                <BarChart data={termLengthVolume} margin={{ left: 8, right: 12, top: 8, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                  <XAxis dataKey="term" tickLine={false} axisLine={false} tickMargin={8} angle={-30} textAnchor="end" height={50} interval={0} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      <DeveloperNotes
        query={developerNotesQuery}
        startDate={queryDateRange.startDate}
        endDate={queryDateRange.endDate}
      />
    </div>
  );
}

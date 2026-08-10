"use client";

import type { ReactNode } from "react";
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
import { ArrowLeft, ChevronRight, Info, Loader2, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import {
  CHART_GRID_STROKE,
  EscalationsSection,
  ExportCsvButton,
  MetricTrendDrillIn,
  ReportFilterBar,
  ReportPageHeader,
  SectionBanner,
  SegmentedToggle,
  StatCard,
  buildSeededMetricTrend,
  buildWeightedCategoryTrends,
  DAY_OF_WEEK_TREND_WEIGHTS,
  HOUR_BUCKET_TREND_WEIGHTS,
  exportAgentMetricCsv,
  useReportScope,
  legendLabel,
  monthsForPeriod,
  seriesColor,
  seriesColorMap,
  serializeFilters,
  type ReportFilters,
  type ReportViewMode,
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
const aiResponseTimeTrend = buildMonthlyTrend(606, 10, 8, 4);

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
  { name: "SMS", value: 55, count: 10131, color: seriesColor(0)},
  { name: "Chat", value: 20, count: 3684, color: seriesColor(1)},
  { name: "Email", value: 25, count: 4605, color: seriesColor(2)},
];

type ReportVersion = "original" | "jvm" | "golden";
type EscalationMode = "rate" | "total" | "open" | "resolved";

const REPORT_VERSION_OPTIONS = [
  { value: "original", label: "Original" },
  { value: "jvm", label: "Alpha Launch" },
  { value: "golden", label: "Golden Prototype" },
] as const;

const RESPONSE_TIME_BY_BEDROOM = [
  { bedrooms: "Studio", SMS: 2.3, Chat: 3.1, Email: 6.1, Overall: 3.4 },
  { bedrooms: "1 BR", SMS: 2.8, Chat: 3.6, Email: 6.7, Overall: 3.9 },
  { bedrooms: "2 BR", SMS: 3.4, Chat: 4.2, Email: 7.4, Overall: 4.6 },
  { bedrooms: "3 BR", SMS: 3.9, Chat: 4.8, Email: 8.2, Overall: 5.1 },
];

const BASE_CONVERSATION_ANALYSIS = [
  { name: "Easy Renewal", value: 42, count: 1016, color: seriesColor(0) },
  { name: "Price Concerns", value: 27, count: 653, color: seriesColor(1) },
  { name: "Wants Larger Unit", value: 12, count: 290, color: seriesColor(2) },
  { name: "Wants Smaller Unit", value: 8, count: 194, color: seriesColor(3) },
  { name: "Unhappy with Community", value: 11, count: 266, color: seriesColor(4) },
];

const ESCALATION_DRILL_INS = [
  { id: "ESC-1042", property: "Cedar Hills", resident: "Avery P.", status: "Open", reason: "Price Concerns", age: "2h" },
  { id: "ESC-1041", property: "Oak Terrace", resident: "Mina R.", status: "Resolved", reason: "Wants Larger Unit", age: "4h" },
  { id: "ESC-1038", property: "The Beacon", resident: "Jonah S.", status: "Resolved", reason: "Lease Terms", age: "7h" },
  { id: "ESC-1036", property: "Summit Ridge", resident: "Priya K.", status: "Open", reason: "Unhappy with Community", age: "9h" },
  { id: "ESC-1031", property: "Pine Valley", resident: "Marco L.", status: "Resolved", reason: "Maintenance Concern", age: "1d" },
  { id: "ESC-1027", property: "Maple Court", resident: "Tess A.", status: "Resolved", reason: "Pricing Exception", age: "2d" },
  { id: "ESC-1023", property: "Lakewood", resident: "Drew C.", status: "Open", reason: "Needs Human Follow-up", age: "2d" },
  { id: "ESC-1018", property: "Parkview Flats", resident: "Nora B.", status: "Resolved", reason: "Transfer Request", age: "3d" },
] as const;

type TradeSlice = "property" | "bedrooms" | "handler";

const TRADE_SLICE_LABEL: Record<TradeSlice, string> = {
  property: "Property",
  bedrooms: "Bedroom Count",
  handler: "Renewal Owner",
};

const TRADE_OUT_ROWS = [
  { property: "Cedar Hills", bedrooms: "Studio", handler: "Renewals AI", tradeOut: 4.2, leases: 42 },
  { property: "Cedar Hills", bedrooms: "1 BR", handler: "Human", tradeOut: 3.8, leases: 52 },
  { property: "Cedar Hills", bedrooms: "2 BR", handler: "Renewals AI", tradeOut: 4.5, leases: 61 },
  { property: "Cedar Hills", bedrooms: "3 BR", handler: "Human", tradeOut: 4.0, leases: 31 },
  { property: "Hillside Living", bedrooms: "Studio", handler: "Human", tradeOut: 4.4, leases: 39 },
  { property: "Hillside Living", bedrooms: "1 BR", handler: "Renewals AI", tradeOut: 4.9, leases: 126 },
  { property: "Hillside Living", bedrooms: "2 BR", handler: "Human", tradeOut: 4.1, leases: 63 },
  { property: "Hillside Living", bedrooms: "3 BR", handler: "Renewals AI", tradeOut: 5.2, leases: 47 },
  { property: "Jamison Apartments", bedrooms: "Studio", handler: "Renewals AI", tradeOut: 4.8, leases: 45 },
  { property: "Jamison Apartments", bedrooms: "1 BR", handler: "Human", tradeOut: 5.0, leases: 88 },
  { property: "Jamison Apartments", bedrooms: "2 BR", handler: "Renewals AI", tradeOut: 5.4, leases: 118 },
  { property: "Jamison Apartments", bedrooms: "3 BR", handler: "Human", tradeOut: 5.1, leases: 36 },
  { property: "Lakewood", bedrooms: "Studio", handler: "Renewals AI", tradeOut: 3.3, leases: 28 },
  { property: "Lakewood", bedrooms: "1 BR", handler: "Human", tradeOut: 3.5, leases: 66 },
  { property: "Lakewood", bedrooms: "2 BR", handler: "Renewals AI", tradeOut: 3.9, leases: 72 },
  { property: "Lakewood", bedrooms: "3 BR", handler: "Human", tradeOut: 3.6, leases: 44 },
  { property: "Maple Court", bedrooms: "Studio", handler: "Human", tradeOut: 4.1, leases: 34 },
  { property: "Maple Court", bedrooms: "1 BR", handler: "Renewals AI", tradeOut: 4.7, leases: 91 },
  { property: "Maple Court", bedrooms: "2 BR", handler: "Human", tradeOut: 4.6, leases: 77 },
  { property: "Maple Court", bedrooms: "3 BR", handler: "Renewals AI", tradeOut: 5.0, leases: 29 },
  { property: "Oak Terrace", bedrooms: "Studio", handler: "Human", tradeOut: 4.6, leases: 33 },
  { property: "Oak Terrace", bedrooms: "1 BR", handler: "Renewals AI", tradeOut: 4.9, leases: 84 },
  { property: "Oak Terrace", bedrooms: "2 BR", handler: "Renewals AI", tradeOut: 5.1, leases: 73 },
  { property: "Oak Terrace", bedrooms: "3 BR", handler: "Human", tradeOut: 4.8, leases: 27 },
  { property: "Parkview Flats", bedrooms: "Studio", handler: "Renewals AI", tradeOut: 4.0, leases: 41 },
  { property: "Parkview Flats", bedrooms: "1 BR", handler: "Human", tradeOut: 4.3, leases: 69 },
  { property: "Parkview Flats", bedrooms: "2 BR", handler: "Renewals AI", tradeOut: 4.6, leases: 58 },
  { property: "Parkview Flats", bedrooms: "3 BR", handler: "Human", tradeOut: 4.2, leases: 23 },
  { property: "Pine Valley", bedrooms: "Studio", handler: "Human", tradeOut: 5.0, leases: 30 },
  { property: "Pine Valley", bedrooms: "1 BR", handler: "Renewals AI", tradeOut: 5.4, leases: 73 },
  { property: "Pine Valley", bedrooms: "2 BR", handler: "Human", tradeOut: 5.6, leases: 65 },
  { property: "Pine Valley", bedrooms: "3 BR", handler: "Renewals AI", tradeOut: 5.8, leases: 58 },
  { property: "Summit Ridge", bedrooms: "Studio", handler: "Renewals AI", tradeOut: 4.5, leases: 36 },
  { property: "Summit Ridge", bedrooms: "1 BR", handler: "Human", tradeOut: 4.6, leases: 74 },
  { property: "Summit Ridge", bedrooms: "2 BR", handler: "Renewals AI", tradeOut: 4.9, leases: 82 },
  { property: "Summit Ridge", bedrooms: "3 BR", handler: "Human", tradeOut: 4.7, leases: 35 },
  { property: "The Beacon", bedrooms: "Studio", handler: "Human", tradeOut: 3.4, leases: 39 },
  { property: "The Beacon", bedrooms: "1 BR", handler: "Renewals AI", tradeOut: 3.7, leases: 71 },
  { property: "The Beacon", bedrooms: "2 BR", handler: "Human", tradeOut: 3.9, leases: 49 },
  { property: "The Beacon", bedrooms: "3 BR", handler: "Renewals AI", tradeOut: 4.1, leases: 18 },
];

const VELOCITY_ROWS = TRADE_OUT_ROWS.map((row, index) => {
  const bedroomOrder = row.bedrooms === "Studio" ? 0 : row.bedrooms === "1 BR" ? 1 : row.bedrooms === "2 BR" ? 2 : 3;
  const aiAdjustment = row.handler === "Renewals AI" ? -1.1 : 0.8;
  const daysToRenew = Math.max(5.8, 10.2 - bedroomOrder * 0.35 + aiAdjustment + (index % 4) * 0.25);
  const daysBeforeLeaseEnd = Math.round(60 + bedroomOrder * 3.5 - aiAdjustment * 2 + (index % 5) * 2);
  const signed60Plus = Math.min(86, Math.max(54, 66 + bedroomOrder * 3 - aiAdjustment * 2.5 + (index % 6) * 1.4));

  return {
    ...row,
    daysToRenew,
    daysBeforeLeaseEnd,
    signed60Plus,
  };
});

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
  "Staff hours saved, total outreach messages, SMS sent, chat sent, emails sent, outreach channel mix, resident response rate, average AI response time, and average resident response time need Renewals AI messaging/conversation event sources.",
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
  yTickFormatter,
  height = 240,
}: {
  data: MonthlyPoint[];
  view: ReportViewMode;
  selected: Set<string>;
  yDomain?: [number, number];
  yTickFormatter?: (value: number | string) => string;
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
              width={yTickFormatter ? 44 : 32}
              domain={yDomain ?? [0, "auto"]}
              tickFormatter={yTickFormatter}
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
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={yTickFormatter ? 44 : 32}
          domain={yDomain ?? [0, "auto"]}
          tickFormatter={yTickFormatter}
        />
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
    <div className="mt-3 flex flex-wrap gap-1.5">
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
              const next = new Set(state.properties);
              next.delete(p);
              setState({ ...state, properties: next });
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
  const config = Object.fromEntries(
    data.map((item) => [item.name, { label: item.name, color: item.color }]),
  ) satisfies ChartConfig;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="h-[180px] w-[180px] shrink-0">
        <ChartContainer config={config} className="!aspect-auto h-full w-full">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  nameKey="name"
                  formatter={(value, name) => (
                    <>
                      <span className="text-muted-foreground">{name}</span>
                      <span className="font-mono font-medium tabular-nums text-foreground">
                        {Number(value).toLocaleString()}%
                      </span>
                    </>
                  )}
                />
              }
            />
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

function BillboardCard({
  label,
  value,
  sub,
  active,
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Card className={cn("border-border/60", active && "border-foreground/40 shadow-sm")}>
      <Button
        type="button"
        variant="ghost"
        onClick={onClick}
        aria-pressed={active}
        aria-controls="metric-drill-in-view"
        className="h-full w-full items-stretch justify-start whitespace-normal rounded-md p-0 text-left hover:bg-transparent"
      >
        <CardContent className="h-full w-full px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xxs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <span
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-md px-2 text-xxs font-medium",
                active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground",
              )}
            >
              View details
              <ChevronRight className="h-3 w-3" />
            </span>
          </div>
          <p className="mt-2 text-4xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          <p className="mt-1 text-xs font-normal text-muted-foreground">{sub}</p>
        </CardContent>
      </Button>
    </Card>
  );
}

function SubMetricTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2.5">
      <p className="text-xxs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

type MetricTooltip = {
  customer: string;
  engineering: string;
};

function MetricInfoPopover({
  label,
  tooltip,
}: {
  label: string;
  tooltip: MetricTooltip;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 text-muted-foreground/60 transition-colors hover:text-muted-foreground"
          aria-label={`About ${label}`}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 space-y-3 p-3 text-xs leading-relaxed text-popover-foreground"
        side="top"
        align="start"
      >
        <div>
          <p className="mb-1 text-xxs font-semibold uppercase tracking-wide text-muted-foreground">
            What this shows
          </p>
          <p>{tooltip.customer}</p>
        </div>
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5">
          <p className="mb-1 text-xxs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            Engineering notes — do not show to customers
          </p>
          <p className="text-foreground/90">{tooltip.engineering}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function BillboardStatCard({
  label,
  value,
  sub,
  channels,
  stackChannels = false,
  tooltip,
  onSelect,
  onExport,
}: {
  label: string;
  value: string;
  sub: string;
  channels: { label: string; value: string }[];
  stackChannels?: boolean;
  tooltip?: MetricTooltip;
  onSelect?: () => void;
  onExport?: () => void;
}) {
  const channelColumns = Math.min(channels.length, 3);
  const singleChannelRow = !stackChannels && channels.length > 0 && channels.length <= channelColumns;
  return (
    <Card
      className={`billboard-stat flex h-full flex-col border-border/60 ${onSelect ? "cursor-pointer transition-colors hover:border-foreground/30 hover:bg-muted/20" : ""}`}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
    >
      <CardContent className="flex flex-1 flex-col gap-1 p-0 px-5 py-3">
        <div className="flex items-center gap-1.5">
          <p className="min-w-0 flex-1 text-xxs font-semibold uppercase tracking-wide text-muted-foreground leading-none">
            {label}
          </p>
          {tooltip && (
            <span className="shrink-0" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
              <MetricInfoPopover label={label} tooltip={tooltip} />
            </span>
          )}
          {onExport ? (
            <span className="shrink-0">
              <ExportCsvButton onExport={onExport} size="icon" label={`Export ${label} CSV`} />
            </span>
          ) : null}
        </div>
        <div className={channels.length > 0 ? "billboard-stat__metrics" : "min-w-0"}>
          <div className="min-w-0">
            <p className="billboard-stat__value text-foreground">{value}</p>
            <p className="mt-1 text-xs font-normal leading-snug text-muted-foreground">{sub}</p>
          </div>
          {channels.length > 0 && (
            <div className={`billboard-stat__channels ${singleChannelRow || stackChannels ? "items-center" : "items-start"}`}>
              <div
                className={
                  stackChannels
                    ? "flex flex-col justify-center gap-2.5"
                    : "billboard-stat__channel-grid content-start"
                }
                style={
                  stackChannels
                    ? undefined
                    : ({ ["--billboard-cols"]: String(channelColumns) } as Record<string, string>)
                }
              >
                {channels.map((ch) => (
                  <div
                    key={ch.label}
                    className={
                      stackChannels
                        ? "flex flex-col items-start text-left"
                        : "flex min-w-0 flex-col items-center text-center"
                    }
                  >
                    <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">
                      {ch.value}
                    </span>
                    <span
                      className={
                        stackChannels
                          ? "text-xxs leading-tight text-muted-foreground"
                          : "max-w-[4.5rem] text-xxs leading-tight text-muted-foreground"
                      }
                    >
                      {ch.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Distribute `total` across `weights` so the parts always sum exactly to `total`. */
function distributeCounts(total: number, weights: number[]): number[] {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const counts = weights.map((weight) => Math.floor((total * weight) / weightSum));
  let remainder = total - counts.reduce((sum, count) => sum + count, 0);
  for (let i = 0; remainder > 0; i += 1, remainder -= 1) {
    counts[i % counts.length] += 1;
  }
  return counts;
}

function EscalationMetricSelector({
  mode,
  onModeChange,
  metrics,
}: {
  mode: EscalationMode;
  onModeChange: (mode: EscalationMode) => void;
  metrics: {
    rate: string;
    total: string;
    open: string;
    resolved: string;
  };
}) {
  const options: { id: EscalationMode; label: string; value: string; sub: string }[] = [
    { id: "rate", label: "Escalation Rate", value: metrics.rate, sub: "of AI contacts escalated" },
    { id: "total", label: "Total Escalations", value: metrics.total, sub: "escalated to staff" },
    { id: "open", label: "Open Escalations", value: metrics.open, sub: "pending resolution" },
    { id: "resolved", label: "Resolved Escalations", value: metrics.resolved, sub: "resolved by staff" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {options.map((option) => (
        <Button
          key={option.id}
          type="button"
          variant="ghost"
          onClick={() => onModeChange(option.id)}
          aria-pressed={mode === option.id}
          className={cn(
            "h-auto justify-start whitespace-normal rounded-md border px-3 py-3 text-left hover:bg-muted/50",
            mode === option.id ? "border-foreground/30 bg-muted" : "border-border bg-background",
          )}
        >
          <span className="block">
            <span className="block text-xxs font-semibold uppercase tracking-wide text-muted-foreground">
              {option.label}
            </span>
            <span className="mt-1 block text-xl font-bold tabular-nums text-foreground">
              {option.value}
            </span>
            <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
              {option.sub}
            </span>
          </span>
        </Button>
      ))}
    </div>
  );
}

const RENEWAL_CONVERSION_FUNNEL_TOOLTIP: MetricTooltip = {
  customer:
    "Shows how renewal conversations move from talking with Renewals AI, to accepting a renewal offer, to signing the renewal lease. Conversations is the starting group. Offers Accepted and Leases Signed are shown as counts and as a percentage of those conversations.",
  engineering:
    "Denominator (Conversations) = unique residents that Renewals AI had a conversation with in the filtered time period and properties — this is the Conversations number in the chart. Offers Accepted numerator = residents from that conversation cohort who accepted their renewal offer, regardless of whether Renewals AI accepted on their behalf or the resident accepted through the portal or another path. Leases Signed numerator = residents from that same conversation cohort who signed their renewal lease, regardless of signing method. Percentages are Offers Accepted ÷ Conversations and Leases Signed ÷ Conversations.",
};

function RenewalConversionFunnelCard({
  rows,
  onSelect,
  onExport,
}: {
  rows: { label: string; count: number; color: string; pct: number }[];
  onSelect?: () => void;
  onExport?: () => void;
}) {
  return (
    <Card
      className={`border-border/60 ${onSelect ? "cursor-pointer transition-colors hover:border-foreground/30 hover:bg-muted/20" : ""}`}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          Conversations → Offers Accepted → Leases Signed
          <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
            <MetricInfoPopover
              label="Conversations → Offers Accepted → Leases Signed"
              tooltip={RENEWAL_CONVERSION_FUNNEL_TOOLTIP}
            />
          </span>
          {onExport ? (
            <span className="ml-auto shrink-0">
              <ExportCsvButton
                onExport={onExport}
                size="icon"
                label="Export Conversations → Offers Accepted → Leases Signed CSV"
              />
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-semibold tabular-nums text-foreground">
                {row.count.toLocaleString()}
                <span className="ml-1 font-normal text-muted-foreground">({row.pct}%)</span>
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-muted">
              <div className="h-2.5 rounded-full" style={{ width: `${row.pct}%`, backgroundColor: row.color }} />
            </div>
          </div>
        ))}
        <p className="pt-1 text-xxs italic text-muted-foreground/80">
          Conversion shown as % of renewal conversations
          {onSelect ? " · Click to view trend" : ""}
        </p>
      </CardContent>
    </Card>
  );
}

function ResponseTimeByBedroomChart() {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Resident Response Time by Bedroom Count</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            SMS: { label: "SMS", color: seriesColor(0) },
            Chat: { label: "Chat", color: seriesColor(1) },
            Email: { label: "Email", color: seriesColor(2) },
            Overall: { label: "Overall", color: seriesColor(3) },
          }}
          className="!aspect-auto h-[260px] w-full"
        >
          <BarChart data={RESPONSE_TIME_BY_BEDROOM} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
            <XAxis dataKey="bedrooms" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} tickFormatter={(v) => `${v}h`} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="SMS" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Chat" fill={seriesColor(1)} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Email" fill={seriesColor(2)} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Overall" fill={seriesColor(3)} radius={[4, 4, 0, 0]} />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
              formatter={legendLabel}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function escalationConversation(item: (typeof ESCALATION_DRILL_INS)[number]) {
  const firstName = item.resident.split(" ")[0];
  return [
    {
      speaker: "Renewals AI",
      text: `Hi ${firstName}, your renewal offer for ${item.property} is ready. I can help review pricing, lease terms, or transfer options.`,
    },
    {
      speaker: item.resident,
      text: item.reason === "Price Concerns"
        ? "The renewal increase is higher than I expected. Are there any options to lower the monthly rent?"
        : item.reason === "Wants Larger Unit" || item.reason === "Transfer Request"
          ? "I am interested in renewing, but I need to understand whether a different unit is available."
          : "I need help before I can decide on the renewal offer.",
    },
    {
      speaker: "Renewals AI",
      text: "I can share the available options and flag this for the onsite team if an exception or human follow-up is needed.",
    },
    {
      speaker: "Renewals AI",
      text: `Escalated to staff: ${item.reason}. Current status is ${item.status.toLowerCase()}.`,
    },
  ];
}

function EscalationDrillIn({
  mode,
  showConversationViewer = false,
}: {
  mode: EscalationMode;
  showConversationViewer?: boolean;
}) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const rows = ESCALATION_DRILL_INS.filter((item) => {
    if (mode === "open") return item.status === "Open";
    if (mode === "resolved") return item.status === "Resolved";
    return true;
  });
  const selectedConversation = rows.find((item) => item.id === selectedConversationId) ?? null;

  const title = {
    rate: "Escalations Included in Rate",
    total: "Total Escalations",
    open: "Open Escalations",
    resolved: "Resolved Escalations",
  }[mode];

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("grid gap-3", showConversationViewer && selectedConversation && "lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.42fr)]")}>
          <div className="divide-y divide-border rounded-md border border-border">
            {rows.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "grid gap-2 px-3 py-2 text-sm",
                  showConversationViewer
                    ? "sm:grid-cols-[7rem_1fr_7rem_9rem_4rem_8rem]"
                    : "sm:grid-cols-[7rem_1fr_8rem_10rem_4rem]",
                )}
              >
                <span className="font-medium text-foreground">{item.id}</span>
                <span className="text-foreground">{item.resident} · {item.property}</span>
                <span className="text-muted-foreground">{item.status}</span>
                <span className="text-muted-foreground">{item.reason}</span>
                <span className="text-right text-muted-foreground">{item.age}</span>
                {showConversationViewer ? (
                  <Button
                    type="button"
                    variant={selectedConversationId === item.id ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setSelectedConversationId(item.id)}
                    className="h-7 justify-center px-2 text-xs"
                  >
                    View Conversation
                  </Button>
                ) : null}
              </div>
            ))}
          </div>

          {showConversationViewer && selectedConversation ? (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Conversation for {selectedConversation.id}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.resident} · {selectedConversation.property}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConversationId(null)}
                  className="h-7 px-2"
                  aria-label="Close conversation"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="mt-3 space-y-2">
                {escalationConversation(selectedConversation).map((message, index) => (
                  <div
                    key={`${message.speaker}-${index}`}
                    className={cn(
                      "rounded-md border border-border px-3 py-2 text-xs",
                      message.speaker === "Renewals AI" ? "bg-background" : "bg-card",
                    )}
                  >
                    <p className="font-semibold text-foreground">{message.speaker}</p>
                    <p className="mt-1 leading-relaxed text-muted-foreground">{message.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function weightedAverage<T extends { leases: number }>(rows: T[], key: keyof T) {
  const leases = rows.reduce((sum, row) => sum + row.leases, 0);
  if (!leases) return 0;
  return rows.reduce((sum, row) => sum + Number(row[key]) * row.leases, 0) / leases;
}

function CountBarChartCard<T extends Record<string, string | number>>({
  title,
  data,
  xKey,
  height = 240,
}: {
  title: string;
  data: T[];
  xKey: keyof T & string;
  height?: number;
}) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="!aspect-auto w-full" style={{ height }}>
          <BarChart data={data} margin={{ left: 8, right: 12, top: 8, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
            <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} angle={-30} textAnchor="end" height={50} interval={0} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill={seriesColor(0)} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function buildVelocitySlices(primary: TradeSlice) {
  const keyFor = (row: (typeof VELOCITY_ROWS)[number], slice: TradeSlice) => {
    if (slice === "property") return row.property;
    if (slice === "bedrooms") return row.bedrooms;
    return row.handler;
  };

  const groups = new Map<string, typeof VELOCITY_ROWS>();
  VELOCITY_ROWS.forEach((row) => {
    const key = keyFor(row, primary);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });

  return Array.from(groups.entries())
    .map(([label, rows]) => ({
      label,
      leases: rows.reduce((sum, row) => sum + row.leases, 0),
      daysToRenew: weightedAverage(rows, "daysToRenew"),
      daysBeforeLeaseEnd: weightedAverage(rows, "daysBeforeLeaseEnd"),
      signed60Plus: weightedAverage(rows, "signed60Plus"),
    }))
    .sort((a, b) => a.daysToRenew - b.daysToRenew);
}

function VelocityMetricBarList({
  rows,
  metric,
  format,
  lowerIsBetter = false,
}: {
  rows: ReturnType<typeof buildVelocitySlices>;
  metric: "daysToRenew" | "daysBeforeLeaseEnd" | "signed60Plus";
  format: (value: number) => string;
  lowerIsBetter?: boolean;
}) {
  const sortedRows = [...rows].sort((a, b) =>
    lowerIsBetter ? a[metric] - b[metric] : b[metric] - a[metric],
  );
  const maxValue = Math.max(...sortedRows.map((row) => row[metric]), 1);

  return (
    <div className="space-y-2">
      {sortedRows.map((row, index) => (
        <div key={row.label} className="rounded-md border border-border bg-background px-3 py-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">{row.label}</p>
              <p className="text-xs text-muted-foreground">{row.leases} leases in selected period</p>
            </div>
            <p className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
              {format(row[metric])}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(5, (row[metric] / maxValue) * 100)}%`,
                backgroundColor: seriesColor(index),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RenewalVelocityDrillIn({
  primary,
  onPrimaryChange,
  metrics,
}: {
  primary: TradeSlice;
  onPrimaryChange: (next: TradeSlice) => void;
  metrics: {
    avgDaysToRenew: string;
    avgDaysBeforeLease: string;
    signed60Plus: string;
  };
}) {
  const rows = buildVelocitySlices(primary);

  return (
    <div className="space-y-3">
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm">Renewal Velocity</CardTitle>
            <SegmentedToggle
              value={primary}
              onChange={onPrimaryChange}
              aria-label="Renewal velocity primary slice"
              options={[
                { value: "property", label: "Property" },
                { value: "bedrooms", label: "Bedrooms" },
                { value: "handler", label: "AI vs Human" },
              ]}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SubMetricTile label="Avg Days to Renew" value={metrics.avgDaysToRenew} sub="days from offer generated to signed" />
            <SubMetricTile label="Avg Days Before Lease End" value={metrics.avgDaysBeforeLease} sub="days before expiration renewal is finalized" />
            <SubMetricTile label="Renewals Signed 60+ Days Early" value={metrics.signed60Plus} sub="of renewals finalized 60+ days before expiry" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground">
            {TRADE_SLICE_LABEL[primary]} comparison for the selected period.
          </p>
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
              <p className="mb-2 text-xxs font-semibold uppercase tracking-wide text-muted-foreground">Avg Days to Renew</p>
              <VelocityMetricBarList rows={rows} metric="daysToRenew" format={(value) => `${value.toFixed(1)} days`} lowerIsBetter />
            </div>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
              <p className="mb-2 text-xxs font-semibold uppercase tracking-wide text-muted-foreground">Avg Days Before Lease End</p>
              <VelocityMetricBarList rows={rows} metric="daysBeforeLeaseEnd" format={(value) => `${Math.round(value)} days`} />
            </div>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
              <p className="mb-2 text-xxs font-semibold uppercase tracking-wide text-muted-foreground">Signed 60+ Days Early</p>
              <VelocityMetricBarList rows={rows} metric="signed60Plus" format={(value) => `${value.toFixed(1)}%`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function weightedTradeOut(rows: typeof TRADE_OUT_ROWS) {
  const leases = rows.reduce((sum, row) => sum + row.leases, 0);
  if (!leases) return 0;
  return rows.reduce((sum, row) => sum + row.tradeOut * row.leases, 0) / leases;
}

function buildTradeOutSlices(primary: TradeSlice) {
  const keyFor = (row: (typeof TRADE_OUT_ROWS)[number], slice: TradeSlice) => {
    if (slice === "property") return row.property;
    if (slice === "bedrooms") return row.bedrooms;
    return row.handler;
  };

  const secondarySlices = (["property", "bedrooms", "handler"] as TradeSlice[]).filter((slice) => slice !== primary);
  const groups = new Map<string, typeof TRADE_OUT_ROWS>();
  TRADE_OUT_ROWS.forEach((row) => {
    const key = keyFor(row, primary);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });

  return Array.from(groups.entries())
    .map(([label, rows]) => ({
      label,
      leases: rows.reduce((sum, row) => sum + row.leases, 0),
      tradeOut: weightedTradeOut(rows),
      secondary: secondarySlices.map((slice) => {
        const nested = new Map<string, typeof TRADE_OUT_ROWS>();
        rows.forEach((row) => {
          const key = keyFor(row, slice);
          nested.set(key, [...(nested.get(key) ?? []), row]);
        });
        return {
          label: TRADE_SLICE_LABEL[slice],
          values: Array.from(nested.entries())
            .map(([nestedLabel, nestedRows]) => ({
              label: nestedLabel,
              tradeOut: weightedTradeOut(nestedRows),
              leases: nestedRows.reduce((sum, row) => sum + row.leases, 0),
            }))
            .sort((a, b) => b.tradeOut - a.tradeOut),
        };
      }),
    }))
    .sort((a, b) => b.tradeOut - a.tradeOut);
}

interface TradeOutBarRow {
  label: string;
  leases: number;
  tradeOut: number;
}

function TradeOutBarList({
  rows,
  selectedLabel,
  onSelect,
  ariaLabel,
  renderInlineDetail,
  compact = false,
}: {
  rows: TradeOutBarRow[];
  selectedLabel?: string | null;
  onSelect?: (label: string) => void;
  ariaLabel: string;
  renderInlineDetail?: (row: TradeOutBarRow) => ReactNode;
  compact?: boolean;
}) {
  const maxTradeOut = Math.max(...rows.map((row) => row.tradeOut), 1);

  return (
    <div className={cn("space-y-2", compact && "space-y-1.5")} aria-label={ariaLabel}>
      {rows.map((row, index) => {
        const isSelected = selectedLabel === row.label;
        const inlineDetail = isSelected ? renderInlineDetail?.(row) : null;
        const barWidth = `${Math.max(5, (row.tradeOut / maxTradeOut) * 100)}%`;
        const content = (
          <div className="w-full min-w-0">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={cn("truncate font-semibold text-foreground", compact ? "text-xs" : "text-sm")}>
                  {row.label}
                </p>
                <p className="text-xs font-normal text-muted-foreground">
                  {row.leases} leases in selected period
                </p>
              </div>
              <p className={cn("shrink-0 font-semibold tabular-nums text-foreground", compact ? "text-xs" : "text-sm")}>
                {row.tradeOut.toFixed(1)}%
              </p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: barWidth,
                  backgroundColor: seriesColor(index),
                }}
              />
            </div>
          </div>
        );

        if (onSelect) {
          return (
            <div key={row.label} className="space-y-2">
              <Button
                type="button"
                variant={isSelected ? "secondary" : "ghost"}
                onClick={() => onSelect(row.label)}
                aria-expanded={Boolean(inlineDetail)}
                className={cn(
                  "h-auto w-full justify-start whitespace-normal rounded-md border px-3 py-2.5 text-left",
                  isSelected ? "border-foreground/20 bg-muted" : "border-border hover:bg-muted/50"
                )}
              >
                {content}
              </Button>
              {inlineDetail}
            </div>
          );
        }

        return (
          <div key={row.label} className="rounded-md border border-border bg-background px-3 py-2">
            {content}
          </div>
        );
      })}
    </div>
  );
}

function TradeOutBreakdownPanel({
  row,
  primary,
}: {
  row: ReturnType<typeof buildTradeOutSlices>[number];
  primary: TradeSlice;
}) {
  const sliceLabels = row.secondary.map((group) => group.label.toLowerCase()).join(" and ");

  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-3 shadow-inner">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {row.label} Breakdown
          </p>
          <p className="text-xs text-muted-foreground">
            Compare this {TRADE_SLICE_LABEL[primary].toLowerCase()} by {sliceLabels}.
          </p>
        </div>
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {row.tradeOut.toFixed(1)}% trade out
        </p>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {row.secondary.map((group) => (
          <div key={group.label} className="rounded-md border border-border bg-background px-3 py-3">
            <p className="mb-2 text-xxs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
            <TradeOutBarList
              rows={group.values}
              ariaLabel={`${row.label} ${group.label} trade out breakdown`}
              compact
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TradeOutDrillIn({
  primary,
  onPrimaryChange,
  selectedLabel,
  onSelectedLabelChange,
}: {
  primary: TradeSlice;
  onPrimaryChange: (next: TradeSlice) => void;
  selectedLabel: string | null;
  onSelectedLabelChange: (next: string | null) => void;
}) {
  const rows = buildTradeOutSlices(primary);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-sm">Trade Out Analysis</CardTitle>
          <SegmentedToggle
            value={primary}
            onChange={(next) => {
              onPrimaryChange(next);
              onSelectedLabelChange(null);
            }}
            aria-label="Trade out primary slice"
            options={[
              { value: "property", label: "Property" },
              { value: "bedrooms", label: "Bedrooms" },
              { value: "handler", label: "AI vs Human" },
            ]}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            {TRADE_SLICE_LABEL[primary]} ranked by trade out, highest to lowest. Select a bar to compare alternate slices inline.
          </p>
          <TradeOutBarList
            rows={rows}
            selectedLabel={selectedLabel}
            onSelect={onSelectedLabelChange}
            ariaLabel={`${TRADE_SLICE_LABEL[primary]} trade out ranking`}
            renderInlineDetail={(row) => {
              const expandedRow = rows.find((candidate) => candidate.label === row.label);
              return expandedRow ? <TradeOutBreakdownPanel row={expandedRow} primary={primary} /> : null;
            }}
          />
        </div>
      </CardContent>
    </Card>
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
  const [reportVersion, setReportVersion] = useState<ReportVersion>("jvm");
  const [goldenDrillIn, setGoldenDrillIn] = useState<string | null>(null);
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
  const aiResponseTimeData = useMemo(() => sliceTrend(aiResponseTimeTrend, months), [months]);

  const scale = months / 12;
  const rentIncreaseDistribution = useMemo(() => scaleCount(BASE_RENT_INCREASE_DIST, "count", scale, 1001 + months), [scale, months]);
  const nonRenewalReasons = useMemo(() => scaleCount(BASE_NON_RENEWAL_REASONS, "count", scale, 2001 + months), [scale, months]);
  const termLengthVolume = useMemo(() => scaleCount(BASE_TERM_LENGTH_VOLUME, "count", scale, 3001 + months), [scale, months]);
  const escalationReasons = useMemo(() => scaleCount(BASE_ESCALATION_REASONS, "count", scale, 4001 + months), [scale, months]);
  const renewalIntent = useMemo(() => scaleDonut(BASE_RENEWAL_INTENT, scale, 5001 + months), [scale, months]);
  const outreachChannelMix = useMemo(() => scaleDonut(BASE_OUTREACH_CHANNEL_MIX, scale, 6001 + months), [scale, months]);
  const conversationAnalysis = useMemo(() => scaleDonut(BASE_CONVERSATION_ANALYSIS, scale, 7001 + months), [scale, months]);
  const renewalConversionFunnel = useMemo(() => {
    const rand = seedRand(8801 + months);
    const jitter = () => 1 + (rand() - 0.5) * 0.04;
    const conversations = Math.round(6120 * scale * jitter());
    const offersAccepted = Math.round(conversations * 0.48 * jitter());
    const leasesSigned = Math.round(offersAccepted * 0.84 * jitter());
    return [
      { label: "Conversations", count: conversations, color: seriesColor(0), pct: 100 },
      {
        label: "Offers Accepted",
        count: offersAccepted,
        color: seriesColor(1),
        pct: conversations > 0 ? Math.round((offersAccepted / conversations) * 100) : 0,
      },
      {
        label: "Leases Signed",
        count: leasesSigned,
        color: seriesColor(2),
        pct: conversations > 0 ? Math.round((leasesSigned / conversations) * 100) : 0,
      },
    ];
  }, [months, scale]);
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
    const avgDaysAI = (9.2 * jitter()).toFixed(1);
    const fullyAutomated = (62 * jitter()).toFixed(1);
    const totalOutreachCount = Math.round(18420 * scale * jitter());
    const [smsCount, chatCount, emailCount] = distributeCounts(
      totalOutreachCount,
      [0.55, 0.2, 0.25],
    );
    const totalOutreach = totalOutreachCount.toLocaleString();
    const smsSent = smsCount.toLocaleString();
    const chatSent = chatCount.toLocaleString();
    const emailsSent = emailCount.toLocaleString();
    const responseRate = (38.4 * jitter()).toFixed(1);
    const smsResponseRate = (42.8 * jitter()).toFixed(1);
    const chatResponseRate = (36.1 * jitter()).toFixed(1);
    const emailResponseRate = (27.6 * jitter()).toFixed(1);
    const avgAIResponseTime = (8 * jitter()).toFixed(0);
    const avgResidentResponseTime = (4.2 * jitter()).toFixed(1);
    const smsResponseTime = (2.9 * jitter()).toFixed(1);
    const chatResponseTime = (4.5 * jitter()).toFixed(1);
    const emailResponseTime = (7.1 * jitter()).toFixed(1);
    const escalationRate = (12.4 * jitter()).toFixed(1);
    const totalEscalations = Math.round(406 * scale * jitter());
    const openEscalations = Math.round(42 * scale * jitter());
    const resolvedEscalations = Math.round(364 * scale * jitter());
    const optOutRate = (4.1 * jitter()).toFixed(1);
    const smsOptOutRate = (3.2 * jitter()).toFixed(1);
    const chatOptOutRate = (3.8 * jitter()).toFixed(1);
    const emailOptOutRate = (5.4 * jitter()).toFixed(1);
    const smsAIResponseTime = (6 * jitter()).toFixed(0);
    const chatAIResponseTime = (7 * jitter()).toFixed(0);
    const emailAIResponseTime = (12 * jitter()).toFixed(0);

    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayCounts = distributeCounts(totalOutreachCount, [2840, 3120, 2960, 2780, 2540, 1890, 1290]);
    const dayVolumes = dayLabels
      .map((label, index) => ({ label, count: dayCounts[index] }))
      .sort((a, b) => b.count - a.count);

    const hourBucketLabels = ["12a–4a", "4a–8a", "8a–12p", "12p–4p", "4p–8p", "8p–12a"];
    const hourBucketCounts = distributeCounts(totalOutreachCount, [820, 2140, 5890, 4320, 3180, 1070]);
    const hourBuckets = hourBucketLabels
      .map((label, index) => ({ label, count: hourBucketCounts[index] }))
      .sort((a, b) => b.count - a.count);

    // Peak hour sits inside the busiest 4-hour bucket (approx 45% of that bucket).
    const topHourLabel = "10 AM";
    const topHourCount = Math.max(1, Math.round(hourBuckets[0].count * 0.45));

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
      avgDaysAI,
      fullyAutomated: `${fullyAutomated}%`,
      totalOutreach,
      smsSent,
      chatSent,
      emailsSent,
      responseRate: `${responseRate}%`,
      smsResponseRate: `${smsResponseRate}%`,
      chatResponseRate: `${chatResponseRate}%`,
      emailResponseRate: `${emailResponseRate}%`,
      avgAIResponseTime: `< ${avgAIResponseTime} sec`,
      avgResidentResponseTime: `${avgResidentResponseTime} hrs`,
      smsResponseTime: `${smsResponseTime} hrs`,
      chatResponseTime: `${chatResponseTime} hrs`,
      emailResponseTime: `${emailResponseTime} hrs`,
      escalationRate: `${escalationRate}%`,
      totalEscalations: totalEscalations.toLocaleString(),
      openEscalations: String(openEscalations),
      resolvedEscalations: resolvedEscalations.toLocaleString(),
      optOutRate: `${optOutRate}%`,
      smsOptOutRate: `${smsOptOutRate}%`,
      chatOptOutRate: `${chatOptOutRate}%`,
      emailOptOutRate: `${emailOptOutRate}%`,
      smsAIResponseTime: `< ${smsAIResponseTime} sec`,
      chatAIResponseTime: `< ${chatAIResponseTime} sec`,
      emailAIResponseTime: `< ${emailAIResponseTime} sec`,
      topDay: dayVolumes[0],
      dayBreakdown: dayVolumes.slice(1),
      topHour: { label: topHourLabel, count: topHourCount },
      hourBuckets,
    };
  }, [months, scale]);

  const tradeOutAverage = weightedTradeOut(TRADE_OUT_ROWS);

  const METRIC_TOOLTIPS = {
    totalMessages: {
      customer: "Total messages sent by this agent for the filtered time period and properties.",
      engineering:
        "Each message sent by super agent is tagged by super agent to the originating sub-agent(s). If a single message was triggered by multiple sub-agents, it counts toward each sub-agent. Make sure we can break down the metric by communication channel since that is also displayed.",
    },
    messagesByDay: {
      customer:
        "Which day of the week this agent sent the most messages, plus how the rest of the week compares, for the filtered time period and properties.",
      engineering:
        "Count messages tagged to this sub-agent, grouped by day-of-week of send time (using each property's local timezone). The headline is the peak weekday (label + count). The seven day counts MUST sum exactly to Total Messages Sent for the same filter scope (sub-agent + period + properties).",
    },
    messagesByHour: {
      customer:
        "Which hour of the day this agent sent the most messages, plus volume by time-of-day window, for the filtered time period and properties. Times use each property's local timezone.",
      engineering:
        "Bucket message send timestamps into 4-hour windows using each property's local timezone (so 3:55 PM Mountain and 3:55 PM Central both land in 12p–4p). The headline is the single peak hour within the busiest window. The six bucket counts MUST sum exactly to Total Messages Sent for the same filter scope (sub-agent + period + properties).",
    },
    escalationRate: {
      customer: "The percentage of conversations with this agent that needed a team member to step in.",
      engineering:
        "Nexus escalations only — count only escalations in Nexus where a human needs to get involved. Formula: conversations with ≥1 such escalation ÷ total conversations for this sub-agent in the filter scope. A conversation with multiple escalations counts once. Also surface total / open / resolved escalation counts for the same scope.",
    },
    optOutRate: {
      customer:
        "How often residents opted out of messaging after hearing from this agent. We only count an opt-out when this agent sent the most recent message to that resident in the 48 hours before they opted out.",
      engineering:
        "Find STOP/opt-out events (SMS, chat, or email). For each, look up ONLY the most recent agent message sent to that resident within the prior 48 hours. Attribute the opt-out ONLY to the sub-agent(s) tagged on that most recent message. If no agent message exists in that window, exclude the opt-out. Break down by channel.",
    },
    agentResponseTime: {
      customer: "On average, how long it takes residents to get a reply after they message this agent.",
      engineering:
        "Measure per conversational turn. For each resident message → agent reply pair, compute elapsed time until the resident actually receives the reply (not when the sub-agent handed the reply to super agent). If a conversation goes back and forth 10 times, include all 10 response times in the average. Exclude turns where a blocking escalation was created (human takes over). Exclude resident messages that have not yet received an agent response — those turns cannot be measured and must not be included in the average.",
    },
    residentResponseRate: {
      customer:
        "When this agent reaches out first (for example, a renewal offer or follow-up), how often the resident replies within 48 hours.",
      engineering:
        "Denominator = proactive outreach messages initiated by this sub-agent in filter scope. Numerator = those that received ≥1 resident reply within 48 hours of the outreach. Break down by SMS and Email only (Chat and Voice are excluded from this metric's channel split).",
    },
    residentResponseTime: {
      customer:
        "For residents who replied within 48 hours of a proactive message from this agent, the average time it took them to reply.",
      engineering:
        "Uses the same dataset as Resident Response Rate Within 48 Hours (proactive outreach messages that received a resident reply within 48 hours). Compute the average (not median) elapsed time from delivery of the proactive message to the resident's reply. This value must never exceed 48 hours because the cohort is limited to replies within that window. Break down by SMS and Email only (Chat and Voice are excluded from this metric's channel split).",
    },
    renewalVelocity: {
      customer:
        "For residents who talked with Renewals AI about their renewal and then signed, how long it usually takes from offer to signature — and how far ahead of lease end they sign.",
      engineering:
        "Dataset = residents who had some interaction with Renewals AI about their renewal in the filter scope. Among those residents who signed their renewal lease: (1) Offer to signature = average elapsed time from renewal-offer generation to lease signature. (2) Days before lease end = average of (lease end date − signing date). (3) Signed 60+ days early = percentage of those signing residents whose (lease end date − signing date) is ≥ 60 days.",
    },
  } as const satisfies Record<string, MetricTooltip>;

  const jvmStats = [
    // Row 1: Messaging volume
    {
      label: "Total Messages Sent",
      value: kpi.totalOutreach,
      sub: "across all channels",
      tooltip: METRIC_TOOLTIPS.totalMessages,
      channels: [
        { label: "SMS", value: kpi.smsSent },
        { label: "Chat", value: kpi.chatSent },
        { label: "Email", value: kpi.emailsSent },
      ],
    },
    {
      label: "Messages Sent by Day",
      value: kpi.topDay.label,
      sub: `${kpi.topDay.count.toLocaleString()} messages · peak day`,
      tooltip: METRIC_TOOLTIPS.messagesByDay,
      channels: kpi.dayBreakdown.map((d) => ({ label: d.label, value: d.count.toLocaleString() })),
    },
    {
      label: "Messages Sent by Hour",
      value: kpi.topHour.label,
      sub: `${kpi.topHour.count.toLocaleString()} messages · peak hour`,
      tooltip: METRIC_TOOLTIPS.messagesByHour,
      channels: kpi.hourBuckets.map((h) => ({ label: h.label, value: h.count.toLocaleString() })),
    },
    // Row 2: AI performance
    {
      label: "Escalation Rate",
      value: kpi.escalationRate,
      sub: "of AI contacts escalated",
      tooltip: METRIC_TOOLTIPS.escalationRate,
      channels: [
        { label: "Total", value: kpi.totalEscalations },
        { label: "Open", value: kpi.openEscalations },
        { label: "Resolved", value: kpi.resolvedEscalations },
      ],
    },
    {
      label: "Opt Out Rate",
      value: kpi.optOutRate,
      sub: "residents who opted out of AI messaging",
      tooltip: METRIC_TOOLTIPS.optOutRate,
      channels: [
        { label: "SMS", value: kpi.smsOptOutRate },
        { label: "Email", value: kpi.emailOptOutRate },
      ],
    },
    {
      label: "Average Agent Response Time",
      value: kpi.avgAIResponseTime,
      sub: "resident msg → agent reply",
      tooltip: METRIC_TOOLTIPS.agentResponseTime,
      channels: [
        { label: "SMS", value: kpi.smsAIResponseTime },
        { label: "Chat", value: kpi.chatAIResponseTime },
        { label: "Email", value: kpi.emailAIResponseTime },
      ],
    },
    // Row 3: Resident behavior
    {
      label: "Resident Response Rate Within 48 Hours",
      value: kpi.responseRate,
      sub: "SMS and email outreach",
      tooltip: METRIC_TOOLTIPS.residentResponseRate,
      channels: [
        { label: "SMS", value: kpi.smsResponseRate },
        { label: "Email", value: kpi.emailResponseRate },
      ],
    },
    {
      label: "Resident Response Time",
      value: kpi.avgResidentResponseTime,
      sub: "average time to reply · SMS & email",
      tooltip: METRIC_TOOLTIPS.residentResponseTime,
      channels: [
        { label: "SMS", value: kpi.smsResponseTime },
        { label: "Email", value: kpi.emailResponseTime },
      ],
    },
    {
      label: "Renewal Velocity",
      value: kpi.avgDaysToRenew,
      sub: "avg days to signature",
      tooltip: METRIC_TOOLTIPS.renewalVelocity,
      channels: [
        { label: "Avg days before lease end", value: `${kpi.avgDaysBeforeLease}d` },
        { label: "Signed 60+ days early", value: kpi.signed60Plus },
      ],
    },
  ];

  const goldenStats = jvmStats;

  const goldenDrillConfigs = useMemo(() => {
    const configs: Record<
      string,
      {
        title: string;
        description: string;
        currentValue: string;
        unitSuffix?: string;
        series: { key: string; label: string; color: string; points: ReturnType<typeof buildSeededMetricTrend> }[];
      }
    > = {};

    const add = (
      label: string,
      opts: {
        description: string;
        currentValue: string;
        unitSuffix?: string;
        start: number;
        end: number;
        integer?: boolean;
        seed?: string;
      },
    ) => {
      configs[label] = {
        title: label,
        description: opts.description,
        currentValue: opts.currentValue,
        unitSuffix: opts.unitSuffix,
        series: [
          {
            key: "value",
            label,
            color: seriesColor(0),
            points: buildSeededMetricTrend({
              seed: opts.seed ?? `renewals-${label}`,
              months,
              start: opts.start,
              end: opts.end,
              integer: opts.integer,
            }),
          },
        ],
      };
    };

    add("Total Messages Sent", {
      description: "Total messages sent by Renewals AI over the selected period.",
      currentValue: kpi.totalOutreach,
      start: 1200,
      end: 2100,
      integer: true,
    });
    configs["Messages Sent by Day"] = {
      title: "Messages Sent by Day",
      description:
        "Monthly message volume by day of week. The current peak weekday is called out above; compare how each weekday trends across the selected period.",
      currentValue: `Peak day: ${kpi.topDay.label} · ${kpi.topDay.count.toLocaleString()} messages`,
      series: buildWeightedCategoryTrends({
        seedPrefix: "renewals-messages-by-day",
        months,
        categories: [...DAY_OF_WEEK_TREND_WEIGHTS],
        totalStart: 9200,
        totalEnd: 18420,
      }),
    };
    configs["Messages Sent by Hour"] = {
      title: "Messages Sent by Hour",
      description:
        "Monthly message volume by 4-hour window (property-local time). The current peak hour is called out above; lines show each time-of-day bucket over the selected period.",
      currentValue: `Peak hour: ${kpi.topHour.label} · ${kpi.topHour.count.toLocaleString()} messages`,
      series: buildWeightedCategoryTrends({
        seedPrefix: "renewals-messages-by-hour",
        months,
        categories: [...HOUR_BUCKET_TREND_WEIGHTS],
        totalStart: 9200,
        totalEnd: 18420,
      }),
    };
    add("Escalation Rate", {
      description: "Share of conversations that needed a human in Nexus.",
      currentValue: kpi.escalationRate,
      unitSuffix: "%",
      start: 15.2,
      end: 11.4,
    });
    add("Opt Out Rate", {
      description: "Opt-out rate attributed to Renewals AI over time.",
      currentValue: kpi.optOutRate,
      unitSuffix: "%",
      start: 5.1,
      end: 3.8,
    });
    add("Average Agent Response Time", {
      description: "Average agent response time (seconds) across answered turns.",
      currentValue: kpi.avgAIResponseTime,
      unitSuffix: "sec",
      start: 11,
      end: 7,
      integer: true,
    });
    add("Resident Response Rate Within 48 Hours", {
      description: "Share of proactive outreach messages that got a reply within 48 hours.",
      currentValue: kpi.responseRate,
      unitSuffix: "%",
      start: 32,
      end: 41,
    });
    add("Resident Response Time", {
      description: "Average resident reply time among the 48-hour responder cohort.",
      currentValue: kpi.avgResidentResponseTime,
      unitSuffix: "hrs",
      start: 5.2,
      end: 3.8,
    });
    add("Renewal Velocity", {
      description: "Average days from offer generation to signature for Renewals AI–touched residents who signed.",
      currentValue: `${kpi.avgDaysToRenew} days`,
      unitSuffix: "days",
      start: 12.4,
      end: 8.6,
    });

    const conversations = buildSeededMetricTrend({
      seed: "renewals-funnel-conversations",
      months,
      start: 420,
      end: 610,
      integer: true,
    });
    const offers = conversations.map((point, i) => ({
      month: point.month,
      value: Math.round(point.value * (0.58 + (i / Math.max(conversations.length - 1, 1)) * 0.08)),
    }));
    const signed = offers.map((point, i) => ({
      month: point.month,
      value: Math.round(point.value * (0.72 + (i / Math.max(offers.length - 1, 1)) * 0.06)),
    }));
    configs["Conversations → Offers Accepted → Leases Signed"] = {
      title: "Conversations → Offers Accepted → Leases Signed",
      description: "Monthly funnel volumes for unique Renewals AI conversation residents.",
      currentValue: `${renewalConversionFunnel[0].count.toLocaleString()} conversations`,
      series: [
        { key: "conversations", label: "Conversations", color: seriesColor(0), points: conversations },
        { key: "offers", label: "Offers Accepted", color: seriesColor(1), points: offers },
        { key: "signed", label: "Leases Signed", color: seriesColor(2), points: signed },
      ],
    };

    return configs;
  }, [months, kpi, renewalConversionFunnel]);

  const activeGoldenDrill = goldenDrillIn ? goldenDrillConfigs[goldenDrillIn] : null;

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
        showViewToggle={reportVersion === "original"}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-amber-500/50 bg-amber-500/5 px-4 py-3">
        <div>
          <p className="text-xxs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            Developer tool — do not ship to customers
          </p>
          <p className="text-xs font-semibold text-foreground">Report Version</p>
          <p className="text-xxs text-muted-foreground">
            Prototype-only switch between Original, Alpha Launch, and Golden Prototype layouts.
          </p>
        </div>
        <SegmentedToggle
          value={reportVersion}
          onChange={(next) => {
            setReportVersion(next);
            setGoldenDrillIn(null);
          }}
          options={REPORT_VERSION_OPTIONS}
          aria-label="Renewals AI report version"
        />
      </div>

      {loading && <LoadingBanner />}

      {reportVersion === "original" ? (
        <>

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
              <p className="mt-1 text-4xl font-bold tracking-tight text-foreground">
                {loading ? "…" : "+8.2 pts"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                AI-managed: 78% vs non-AI: 69.8%
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <StatCard
            lowerIsBetter
              label="Avg days to renew (AI)"
              value={kpi.avgDaysAI}
              sub="vs 14.1 days without AI"
            />
            <StatCard
              label="Fully automated renewals"
              value={kpi.fullyAutomated}
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
              <PropertyChips state={filters} setState={setFilters} />
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
                    wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
                    formatter={legendLabel}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="Total outreach messages"
            value={kpi.totalOutreach}
            sub="AI-sent messages"
          />
          <StatCard label="SMS sent" value={kpi.smsSent} sub="outbound SMS" />
          <StatCard label="Chat sent" value={kpi.chatSent} sub="outbound chat" />
          <StatCard label="Emails sent" value={kpi.emailsSent} sub="outbound emails" />
          <StatCard
            label="Resident response rate"
            value={kpi.responseRate}
            sub="responded to AI outreach"
          />
          <StatCard
            lowerIsBetter
            label="Avg AI response time"
            value={kpi.avgAIResponseTime}
            sub="from resident message to AI reply"
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <StatCard
            lowerIsBetter
            label="Avg resident response time"
            value={kpi.avgResidentResponseTime}
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
            sub: "of AI contacts escalated",
          },
          {
            label: "Total escalations",
            value: kpi.totalEscalations,
            sub: "escalated to staff",
            action: (
              <Link href="/escalations" className="text-xxs font-medium text-foreground underline underline-offset-2 hover:no-underline">
                View queue →
              </Link>
            ),
          },
          { label: "Open escalations", value: kpi.openEscalations, sub: "pending resolution" },
          {
            label: "Resolved",
            value: kpi.resolvedEscalations,
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
              <CardTitle className="text-sm">Avg Escalation Resolution Time (Hours) — Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={escalationResolutionData}
                view={filters.view}
                selected={filters.properties}
                yDomain={filters.view === "global" ? [0, 4] : [0, 5]}
                yTickFormatter={(value) => `${value}h`}
              />
              <PropertyChips state={filters} setState={setFilters} />
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
            sub="of eligible residents renewed"
          />
          <StatCard label="Leases eligible for renewal" value={kpi.eligibleLeases} sub="leases expired during period" />
          <StatCard
            label="Renewed residents"
            value={kpi.renewedResidents}
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
              <PropertyChips state={filters} setState={setFilters} />
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
              <PropertyChips state={filters} setState={setFilters} />
            </CardContent>
          </Card>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Avg rent increase at renewal"
            value={kpi.avgRentIncrease}
            sub="$52 avg monthly increase"
          />
          <StatCard
            label="Incremental annual revenue"
            value={kpi.incrementalRevenue}
            sub="from renewal rent increases"
          />
          <StatCard
            label="Avoided turnover costs"
            value={kpi.avoidedTurnover}
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
              <PropertyChips state={filters} setState={setFilters} />
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
            sub="days from offer generated to signed"
          />
          <StatCard
            label="Avg days before lease end"
            value={kpi.avgDaysBeforeLease}
            sub="days before expiration renewal is finalized"
          />
          <StatCard
            label="Renewals signed 60+ days early"
            value={kpi.signed60Plus}
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
                    wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
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
        </>
      ) : null}

      {reportVersion === "jvm" ? (
        <section className="mb-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {jvmStats.map((stat) => (
              <BillboardStatCard
                key={stat.label}
                label={stat.label}
                value={loading ? "…" : stat.value}
                sub={stat.sub}
                channels={stat.channels}
                stackChannels={stat.label === "Renewal Velocity"}
                tooltip={stat.tooltip}
              />
            ))}
          </div>
          <div className="mt-3">
            <RenewalConversionFunnelCard rows={renewalConversionFunnel} />
          </div>
        </section>
      ) : null}

      {reportVersion === "golden" ? (
        <>
          {activeGoldenDrill ? (
            <MetricTrendDrillIn
              title={activeGoldenDrill.title}
              description={activeGoldenDrill.description}
              currentValue={activeGoldenDrill.currentValue}
              unitSuffix={activeGoldenDrill.unitSuffix}
              series={activeGoldenDrill.series}
              onBack={() => setGoldenDrillIn(null)}
              onExport={() =>
                exportAgentMetricCsv({ agent: "renewals", metric: activeGoldenDrill.title })
              }
            />
          ) : (
            <section className="mb-6">
              <p className="mb-3 text-xs text-muted-foreground">
                Click any metric card to open its trend. Export conversation-level CSV from inside each drill-in.
              </p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {goldenStats.map((stat) => (
                  <BillboardStatCard
                    key={stat.label}
                    label={stat.label}
                    value={loading ? "…" : stat.value}
                    sub={stat.sub}
                    channels={stat.channels}
                    stackChannels={stat.label === "Renewal Velocity"}
                    tooltip={stat.tooltip}
                    onSelect={() => setGoldenDrillIn(stat.label)}
                  />
                ))}
              </div>
              <div className="mt-3">
                <RenewalConversionFunnelCard
                  rows={renewalConversionFunnel}
                  onSelect={() => setGoldenDrillIn("Conversations → Offers Accepted → Leases Signed")}
                />
              </div>
            </section>
          )}

          {!activeGoldenDrill ? (
          <section className="mb-6">
            <SectionBanner
              title="Renewals AI Conversation Analysis"
              description="AI-categorized summary of what happened inside resident renewal conversations"
            />
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Conversation Category Mix</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutWithLegend data={conversationAnalysis} />
              </CardContent>
            </Card>
          </section>
          ) : null}
        </>
      ) : null}

      <DeveloperNotes
        query={developerNotesQuery}
        startDate={queryDateRange.startDate}
        endDate={queryDateRange.endDate}
      />
    </div>
  );
}

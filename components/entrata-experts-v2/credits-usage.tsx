"use client";
import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SAMPLE_USAGE = [
  { period: "April 2026", expert: "Entrata Analyst", queries: 142, credits: 1_420, status: "Within plan" },
  { period: "April 2026", expert: "Everyday Assistant", queries: 38, credits: 380, status: "Within plan" },
  { period: "April 2026", expert: "Multifamily Research Assistant", queries: 21, credits: 315, status: "Within plan" },
  { period: "April 2026", expert: "Document Analyzer", queries: 7, credits: 175, status: "Within plan" },
];

export function CreditsUsage() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-medium uppercase tracking-wider">
              Credits remaining
            </CardDescription>
            <CardTitle
              className="text-2xl font-semibold"
              style={{
                fontFamily:
                  "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif",
              }}
            >
              7,710
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Resets May 1, 2026 · Plan: Entrata Experts (Beta)
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-medium uppercase tracking-wider">
              This month
            </CardDescription>
            <CardTitle
              className="text-2xl font-semibold"
              style={{
                fontFamily:
                  "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif",
              }}
            >
              2,290 used
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            22.9% of monthly allotment · 208 conversations
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-medium uppercase tracking-wider">
              Active seats
            </CardDescription>
            <CardTitle
              className="text-2xl font-semibold"
              style={{
                fontFamily:
                  "'Plus Jakarta Sans', Inter, ui-sans-serif, system-ui, sans-serif",
              }}
            >
              9 of 12
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            3 unassigned seats · Manage in OXP Studio Teammates
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent usage</CardTitle>
          <CardDescription>
            Live billing data appears here in the production product. The values
            shown below are sample data for the prototype.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Expert</TableHead>
                <TableHead className="text-right">Queries</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SAMPLE_USAGE.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.period}</TableCell>
                  <TableCell>{row.expert}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.queries}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.credits.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="green" className="text-[10px]">{row.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

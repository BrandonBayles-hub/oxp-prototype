"use client";

import { PageHeader } from "@/components/page-header";

export default function EntrataExpertsPage() {
  return (
    <>
      <PageHeader
        title="Entrata Experts"
        description="AI-powered assistants for property management — from data analysis to content creation, leasing support, and more."
      />

      <div className="mt-2 overflow-hidden rounded-lg border border-border shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/entrata-experts-preview.png"
          alt="Entrata Experts — Select an expert to chat with, including Entrata Analyst, Everyday Assistant, Ad Writing Assistant, Document Analyzer, and more."
          className="w-full"
        />
      </div>
    </>
  );
}

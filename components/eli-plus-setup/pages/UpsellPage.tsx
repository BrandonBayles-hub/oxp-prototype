"use client"

import type { PageId } from "../index"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Lock, ArrowLeft, ExternalLink, Sparkles } from "lucide-react"

const PRODUCT_COPY: Record<string, { headline: string; description: string; bullets: string[] }> = {
  "renewals-ai": {
    headline: "Renewals AI",
    description:
      "Automate lease renewal outreach, predict renewal likelihood by resident, and surface the right offer at the right time — all without manual follow-up.",
    bullets: [
      "AI-driven renewal probability scoring per resident",
      "Automated outreach sequences with personalized offers",
      "Renewal pipeline dashboard with conversion tracking",
      "Integrated with your existing lease management workflow",
    ],
  },
  "resident-ai": {
    headline: "Resident AI",
    description:
      "Turn every resident touchpoint into a faster, smarter interaction. Resident AI handles maintenance requests, payment questions, and community communications automatically.",
    bullets: [
      "24/7 automated resident messaging and triage",
      "Smart maintenance request routing and status updates",
      "Payment reminders and balance inquiries handled automatically",
      "Escalation workflows to your team when human touch is needed",
    ],
  },
}

interface Props { navigate: (to: PageId) => void; productKey: string }

export function UpsellPage({ navigate, productKey }: Props) {
  const copy = PRODUCT_COPY[productKey] ?? PRODUCT_COPY["renewals-ai"]

  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-8">

      {/* Lock badge */}
      <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-500">
        <Lock className="h-3 w-3" aria-hidden />
        Not included in your current plan
      </div>

      {/* Headline */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-zinc-400" aria-hidden />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{copy.headline}</h1>
        </div>
        <p className="text-base text-zinc-600 leading-relaxed">{copy.description}</p>
      </div>

      {/* Feature bullets */}
      <ul className="space-y-3">
        {copy.bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-zinc-400 shrink-0" aria-hidden />
            <span className="text-sm text-zinc-600">{bullet}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row items-start gap-3 pt-2">
        <a
          href="https://www.entrata.com/contact-sales"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "eli", size: "default" }), "gap-2")}
        >
          Talk to Sales
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
        <a
          href="https://www.entrata.com"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline", size: "default" }), "gap-2")}
        >
          Learn More
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>

    </div>
  )
}

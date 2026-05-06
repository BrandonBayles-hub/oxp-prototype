"use client"

import type { PageId } from "../index"

interface Props { navigate: (to: PageId) => void }

export function EmailPage({ navigate }: Props) {
  return (
    <div className="h-full w-full">
      <iframe
        src="/communications-setup/custom-email/?embed=1"
        className="h-full w-full border-0"
        title="Setup Email Integration for Communications"
      />
    </div>
  )
}

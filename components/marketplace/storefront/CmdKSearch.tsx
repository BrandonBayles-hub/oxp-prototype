"use client";

import { useState, useEffect, useCallback } from "react";
import { MarketplaceModal } from "./MarketplaceModal";

interface ModalListing {
  id: string;
  name: string;
  slug: string;
  provider: string;
  providerType: string;
  partnerTier: string | null;
  shortDescription: string;
  pricing: string;
  ctaType: string;
  priceAmount: number | null;
  billingCycle: string | null;
  rating: number;
  installCount: number;
  iconUrl: string | null;
  requestMethod: string;
  requestTarget: string | null;
}

interface ModalBundle {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  savings: string | null;
  featured: boolean;
}

export function CmdKSearch() {
  const [open, setOpen] = useState(false);
  const [listings, setListings] = useState<ModalListing[]>([]);
  const [bundles, setBundles] = useState<ModalBundle[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/search");
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings ?? []);
        setBundles(data.bundles ?? []);
      }
    } catch {
      // Ignore; modal will show empty state
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <MarketplaceModal
      isOpen={open}
      onClose={handleClose}
      listings={listings}
      bundles={bundles}
      title="Search the Marketplace"
      context="all"
    />
  );
}

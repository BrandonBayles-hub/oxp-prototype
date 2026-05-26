"use client";

import React, { useState, useEffect } from "react";
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
  pricing: string;
  ctaType: string;
  priceAmount: number | null;
  billingCycle: string | null;
  featured: boolean;
  iconUrl: string | null;
}

interface MarketplaceModalTriggerProps {
  trigger: React.ReactElement;
  title: string;
  description: string;
  filters: {
    aiLevel?: string[];
    domains?: string[];
    platforms?: string[];
    pricing?: string[];
  };
}

export function MarketplaceModalTrigger({ 
  trigger, 
  title, 
  description, 
  filters 
}: MarketplaceModalTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [listings, setListings] = useState<ModalListing[]>([]);
  const [bundles, setBundles] = useState<ModalBundle[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && listings.length === 0) {
      fetchFilteredData();
    }
  }, [isOpen]);

  async function fetchFilteredData() {
    setLoading(true);
    try {
      // Build query string from filters
      const params = new URLSearchParams();
      if (filters.aiLevel?.length) params.append('aiLevel', filters.aiLevel.join(','));
      if (filters.domains?.length) params.append('domains', filters.domains.join(','));
      if (filters.platforms?.length) params.append('platforms', filters.platforms.join(','));
      if (filters.pricing?.length) params.append('pricing', filters.pricing.join(','));

      const response = await fetch(`/api/search?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setListings(data.listings || []);
        setBundles(data.bundles || []);
      }
    } catch (error) {
      console.error('Failed to fetch filtered data:', error);
    } finally {
      setLoading(false);
    }
  }

  const triggerWithOnClick = React.cloneElement(trigger, {
    onClick: () => setIsOpen(true),
  } as any);

  return (
    <>
      {triggerWithOnClick}
      <MarketplaceModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        listings={listings}
        bundles={bundles}
        title={title}
        context={description}
      />
    </>
  );
}
"use client";

import { useFeatureFlags } from "./FeatureFlagsProvider";
import { ListingCard, type ListingCardProps } from "./ListingCard";

export function ListingCardWithFlags({ listing, ...rest }: ListingCardProps) {
  const flags = useFeatureFlags();
  return (
    <ListingCard
      listing={listing}
      showRating={flags.showRatings}
      showDownloads={flags.showDownloads}
      {...rest}
    />
  );
}

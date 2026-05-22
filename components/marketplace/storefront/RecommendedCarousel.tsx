"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/marketplace/utils/utils";

const GAP_PX = 24;

function useVisibleCount() {
  const [n, setN] = useState(3);
  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 768) setN(1);
      else if (window.innerWidth < 1024) setN(2);
      else setN(3);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return n;
}

function useStepPx(
  visibleCount: number,
  viewportRef: React.RefObject<HTMLDivElement | null>
) {
  const [stepPx, setStepPx] = useState(0);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || visibleCount < 1) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      const cardWidth = (w - GAP_PX * (visibleCount - 1)) / visibleCount;
      setStepPx(cardWidth + GAP_PX);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [visibleCount, viewportRef]);
  return stepPx;
}

export interface RecommendedCarouselListing {
  id: string;
  name: string;
  slug: string;
  provider: string;
  shortDescription: string;
}

const ICON_COLORS = [
  "bg-warm-light text-warm-dark",
  "bg-primary/10 text-primary",
  "bg-secondary text-secondary-foreground",
  "bg-muted text-muted-foreground",
];

function getIconColor(name: string) {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return ICON_COLORS[hash % ICON_COLORS.length];
}

export function RecommendedCarousel({
  listings,
}: {
  listings: RecommendedCarouselListing[];
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const visibleCount = useVisibleCount();
  const stepPx = useStepPx(visibleCount, viewportRef);

  const [index, setIndex] = useState(0);
  const itemCount = listings.length;
  const maxIndex = Math.max(0, itemCount - visibleCount);
  const showArrows = itemCount > visibleCount;

  const goTo = useCallback(
    (nextIndex: number) => {
      setIndex(Math.max(0, Math.min(maxIndex, nextIndex)));
    },
    [maxIndex]
  );

  if (itemCount === 0) return null;

  const translateX = -index * stepPx;

  return (
    <>
    <div className="relative flex items-stretch gap-4">
      {showArrows && (
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index <= 0}
          className="flex-shrink-0 z-10 self-center w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Previous"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
      )}

      <div ref={viewportRef} className="flex-1 min-w-0 overflow-hidden">
        <div
          className={cn(
            "flex gap-6 transition-transform duration-300 ease-out",
            itemCount <= visibleCount && "justify-center"
          )}
          style={{
            transform:
              stepPx > 0 && itemCount > visibleCount
                ? `translateX(${translateX}px)`
                : undefined,
          }}
        >
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="flex-shrink-0 min-w-0"
              style={
                stepPx > 0
                  ? { width: `${stepPx - GAP_PX}px` }
                  : { width: "100%" }
              }
            >
              <Link
                href={`/apps/entrata-marketplace/listing/${listing.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-border bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/20"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className={cn(
                      "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-xl font-bold",
                      getIconColor(listing.name)
                    )}
                  >
                    {listing.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {listing.provider}
                    </span>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {listing.name}
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 flex-1 min-h-0">
                  {listing.shortDescription}
                </p>
                <div className="mt-auto flex items-center justify-end pt-3">
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {showArrows && (
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index >= maxIndex}
          className="flex-shrink-0 z-10 self-center w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Next"
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
      )}
    </div>

    {itemCount > 1 && (
      <div className="flex justify-center gap-2 mt-6" aria-hidden>
        {listings.map((listing, i) => (
          <button
            key={listing.id}
            type="button"
            onClick={() => goTo(i)}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              i === index
                ? "bg-primary scale-125"
                : "bg-border hover:bg-muted-foreground"
            )}
            aria-label={`Go to recommendation ${i + 1}`}
          />
        ))}
      </div>
    )}
    </>
  );
}

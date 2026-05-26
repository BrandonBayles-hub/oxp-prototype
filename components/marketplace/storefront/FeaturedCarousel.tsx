"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/marketplace/utils/utils";
import { ListingIcon } from "./ListingIcon";

const ROTATE_INTERVAL_MS = 6000;
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

interface CarouselListing {
  id: string;
  name: string;
  slug: string;
  provider: string;
  shortDescription: string;
  pricing: string;
  iconUrl?: string | null;
}

interface FeaturedCarouselProps {
  listings: CarouselListing[];
}

export function FeaturedCarousel({ listings }: FeaturedCarouselProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const visibleCount = useVisibleCount();
  const stepPx = useStepPx(visibleCount, viewportRef);

  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const itemCount = listings.length;
  const maxIndex = Math.max(0, itemCount - visibleCount);
  const showArrows = itemCount > visibleCount && itemCount >= 3;

  const goTo = useCallback(
    (nextIndex: number) => {
      setIndex(Math.max(0, Math.min(maxIndex, nextIndex)));
    },
    [maxIndex]
  );

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(m.matches);
    const fn = () => setPrefersReducedMotion(m.matches);
    m.addEventListener("change", fn);
    return () => m.removeEventListener("change", fn);
  }, []);

  useEffect(() => {
    if (itemCount < 3 || itemCount <= visibleCount || isPaused || prefersReducedMotion) return;
    const id = setInterval(() => {
      setIndex((i) => (i >= maxIndex ? 0 : i + 1));
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [itemCount, visibleCount, maxIndex, isPaused, prefersReducedMotion]);

  if (itemCount === 0) return null;

  const translateX = -index * stepPx;

  return (
    <section
      className="relative border-t border-border bg-muted/30 py-12"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="Featured partners"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground">
            Featured Partners
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
            Strategic partners powering the Entrata ecosystem
          </p>
        </div>

        <div className="relative flex items-stretch gap-4">
          {showArrows && (
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              disabled={index <= 0}
              className="flex-shrink-0 z-10 self-center w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-all"
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
                      <ListingIcon
                        name={listing.name}
                        iconUrl={listing.iconUrl ?? null}
                        sizeClassName="h-14 w-14"
                        shapeClassName="rounded-xl text-xl"
                        imgPaddingClassName="p-1.5"
                      />
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
              className="flex-shrink-0 z-10 self-center w-10 h-10 rounded-full bg-white border border-border shadow-sm flex items-center justify-center hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-all"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          )}
        </div>

        {itemCount > 1 && (
          <div className="flex justify-center gap-2 mt-6" aria-hidden>
            {Array.from({ length: itemCount }, (_, i) => (
              <button
                key={listings[i].id}
                type="button"
                onClick={() => goTo(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  i === index
                    ? "bg-primary scale-125"
                    : "bg-border hover:bg-muted-foreground"
                )}
                aria-label={`Go to solution ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

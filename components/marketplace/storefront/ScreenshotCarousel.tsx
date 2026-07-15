"use client";

import { useState, useCallback, useEffect, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/marketplace/utils/utils";

interface ScreenshotCarouselProps {
  urls: string[];
  name: string;
}

const NAV_ARROW_BTN =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-white shadow-sm outline-none transition-all hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2";

const DOT_BTN =
  "h-2 w-2 rounded-full outline-none transition-all focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2";

export function ScreenshotCarousel({ urls, name }: ScreenshotCarouselProps) {
  const count = urls.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
  }, [urls]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const goTo = useCallback(
    (idx: number) => {
      if (count <= 0) return;
      setActiveIndex(((idx % count) + count) % count);
    },
    [count],
  );

  const prev = useCallback(() => goTo(activeIndex - 1), [goTo, activeIndex]);
  const next = useCallback(() => goTo(activeIndex + 1), [goTo, activeIndex]);

  const showControls = count > 1;

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (count <= 1) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    },
    [count, prev, next],
  );

  if (count === 0) return null;

  const transitionClass = reducedMotion
    ? ""
    : "transition-transform duration-300 ease-out";

  return (
    <div
      className={cn(
        "space-y-2",
        showControls &&
          "rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2",
      )}
      tabIndex={showControls ? 0 : undefined}
      onKeyDown={showControls ? onKeyDown : undefined}
      role="region"
      aria-roledescription="carousel"
      aria-label={`Screenshots for ${name}`}
    >
      <h2 className="text-sm font-semibold text-foreground">Screenshots</h2>

      <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
        <div
          className={cn("flex", transitionClass)}
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {urls.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="w-full shrink-0 px-2 py-3 sm:px-4 sm:py-4"
              aria-hidden={i !== activeIndex}
            >
              <div className="mx-auto flex h-56 max-h-[min(22rem,50vh)] w-full items-center justify-center sm:h-64">
                <img
                  src={url}
                  alt={`${name} screenshot ${i + 1} of ${count}`}
                  className="max-h-full max-w-full object-contain object-center"
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {showControls && (
        <div
          className="mt-4 flex items-center justify-center gap-3 sm:gap-4"
          role="group"
          aria-label="Screenshot navigation"
        >
          <button
            type="button"
            onClick={prev}
            className={NAV_ARROW_BTN}
            aria-label="Previous screenshot"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>

          <div
            className="flex min-h-10 items-center justify-center gap-2 px-1"
            role="tablist"
            aria-label="Choose screenshot"
          >
            {urls.map((url, i) => (
              <button
                key={`dot-${url}-${i}`}
                type="button"
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={`Show screenshot ${i + 1} of ${count}`}
                onClick={() => goTo(i)}
                className={cn(
                  DOT_BTN,
                  i === activeIndex
                    ? "scale-125 bg-primary"
                    : "bg-border hover:bg-muted-foreground",
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={next}
            className={NAV_ARROW_BTN}
            aria-label="Next screenshot"
          >
            <ChevronRight className="h-5 w-5 text-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}

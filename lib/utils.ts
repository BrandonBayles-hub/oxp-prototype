import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Register our custom `text-xxs` font-size token with tailwind-merge. Without
// this, twMerge doesn't recognize `text-xxs` as a font-size and treats it as
// conflicting with `text-{color}` classes — silently dropping the color when
// the two are combined via cn(). Declaring it under the font-size group keeps
// text-xxs conflicting only with other sizes, never with colors.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["xxs"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const BASE_PATH =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BASE_PATH) ||
  "";

export function assetPath(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = BASE_PATH.endsWith("/") ? BASE_PATH.slice(0, -1) : BASE_PATH;
  return `${base}${normalized}`;
}

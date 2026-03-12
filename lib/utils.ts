import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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

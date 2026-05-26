import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

/**
 * Route-segment layout for the Entrata Marketplace marketplace.
 *
 * Applies the .marketplace-root class (defined in app/globals.css) which
 * scopes Leo's recolored design tokens (--entrata, --warm-*, --success,
 * --info, etc.) and the Geist font family, so the marketplace surfaces
 * inherit Leo's prototype look without leaking those styles into the
 * surrounding OXP Studio chrome.
 */

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Entrata Marketplace",
  description:
    "Discover apps and capabilities for your properties — the Entrata Marketplace.",
};

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} marketplace-root`}>
      <main className="min-h-screen">{children}</main>
      <footer className="border-t border-border bg-muted/30 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground sm:px-6 lg:px-8">
          <p>
            &copy; {new Date().getFullYear()} Entrata, Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

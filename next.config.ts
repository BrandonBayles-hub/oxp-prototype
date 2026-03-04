import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No server redirect: root app/page.tsx does client-side redirect to /getting-started.
  // This avoids 404s that can occur with config redirects in some setups.
  transpilePackages: [
    "@tiptap/react",
    "@tiptap/starter-kit",
    "@tiptap/pm",
    "@tiptap/core",
    "@tiptap/extension-text-style",
  ],
};

export default nextConfig;

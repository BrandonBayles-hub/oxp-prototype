import type { NextConfig } from "next";
// const basePath = process.env.STACK_NAME === "staging" ? "/oxp-prototype" : "";
// const assetPrefix = process.env.STACK_NAME === "staging" ? "/oxp-prototype/" : "";
const nextConfig: NextConfig = {
  // Static export for deployment (output copied to dist/ by build script).
  output: "export",
  // basePath: basePath,
  // assetPrefix: assetPrefix,
  trailingSlash: true,
  // images: { unoptimized: true },
  // No server redirect: root app/page.tsx does client-side redirect to /getting-started.
  // This avoids 404s that can occur with config redirects in some setups.
  devIndicators: false,
  transpilePackages: [
    "@tiptap/react",
    "@tiptap/starter-kit",
    "@tiptap/pm",
    "@tiptap/core",
    "@tiptap/extension-text-style",
  ],
};

export default nextConfig;

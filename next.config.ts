import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

// This repo often lives at …/oxp-prototype-product/oxp-prototype-product with a second
// lockfile under …/oxp-prototype-product. Next would infer the parent as the workspace root,
// load `next` from the parent `node_modules`, and break server chunks (e.g. Cannot find module './611.js').
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// const basePath = process.env.STACK_NAME === "staging" ? "/oxp-prototype" : "";
// const assetPrefix = process.env.STACK_NAME === "staging" ? "/oxp-prototype/" : "";
const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
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

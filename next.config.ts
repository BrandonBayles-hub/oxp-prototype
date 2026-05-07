import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";
import path from "path";
// const basePath = process.env.STACK_NAME === "staging" ? "/oxp-prototype" : "";
// const assetPrefix = process.env.STACK_NAME === "staging" ? "/oxp-prototype/" : "";
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  devIndicators: false,
  outputFileTracingRoot: path.join(__dirname),
  transpilePackages: [
    "@tiptap/react",
    "@tiptap/starter-kit",
    "@tiptap/pm",
    "@tiptap/core",
    "@tiptap/extension-text-style",
  ],
};

export default nextConfig;

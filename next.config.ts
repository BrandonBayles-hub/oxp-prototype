import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";
// const basePath = process.env.STACK_NAME === "staging" ? "/oxp-prototype" : "";
// const assetPrefix = process.env.STACK_NAME === "staging" ? "/oxp-prototype/" : "";

// Academy CSS scope-redirect aliases.
// ----------------------------------------------------------------------
// app/trainings-sop/academy/source/App.jsx is a literal sync of the
// dev.green entrata-academy-deploy prototype and imports its raw,
// unscoped stylesheets at the top of the file:
//
//   import "./styles.css";
//   import "./styles/studio.css";
//
// Those sheets contain global `:root { font-size: 14px; ... }` and
// `body { ... }` rules that clobber the OXP Studio shell theme — they
// override --primary, --border, etc. and shrink html font-size from
// 16px → 14px, which scales down every rem-sized element across the
// entire app once Admin Insights (the only page that imports the
// Academy bundle) is visited. AcademyTab.tsx imports the scoped
// variants produced by scope-css.mjs FIRST, but App.jsx's later
// imports of the unscoped originals win the cascade.
//
// We redirect the two unscoped imports to their `.scoped.css` siblings
// here so App.jsx itself stays unmodified and dev.green resyncs remain
// mechanical. The aliases are absolute-path-keyed, so they only affect
// these two specific files — no risk of catching unrelated styles.css
// imports elsewhere in the repo.
const academySource = path.resolve(
  __dirname,
  "app/trainings-sop/academy/source",
);
const academyCssAliases = {
  [path.join(academySource, "styles.css")]: path.join(
    academySource,
    "styles.scoped.css",
  ),
  [path.join(academySource, "styles/studio.css")]: path.join(
    academySource,
    "styles/studio.scoped.css",
  ),
  [path.join(academySource, "styles/training-ai.css")]: path.join(
    academySource,
    "styles/training-ai.scoped.css",
  ),
};

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
  webpack(config) {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      ...academyCssAliases,
    };
    return config;
  },
};

export default nextConfig;

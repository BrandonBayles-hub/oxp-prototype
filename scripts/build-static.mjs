// Static-export build for the GitHub Pages + S3/CloudFront deploys.
//
// The deploy targets host a static `out/` bundle, so the build must run with
// `output: "export"` (STATIC_EXPORT=1 in next.config.ts). But the live Entrata
// Analyst → LiteLLM integration ships server-only route handlers under
// `app/api/**` (`export const dynamic = "force-dynamic"`), and Next.js refuses
// to statically export those — the build dies with:
//   "export const dynamic = "force-dynamic" cannot be used with output: export".
//
// Those routes only matter when the app runs on a real server (local dev,
// `npm run start`). The client already falls back to mock answers when the
// routes 404 (see lib/entrata-experts-v2/store.ts + use-model-catalog.ts), so a
// static deploy is fully functional without them. We therefore move `app/api`
// aside for the duration of the export and restore it afterward.
import { execFileSync } from "node:child_process";
import { existsSync, renameSync, rmSync, cpSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const apiDir = path.join(root, "app", "api");
const apiStash = path.join(root, ".app-api.stash");

const hasApi = existsSync(apiDir);
if (hasApi) {
  // Clear any stash left behind by a previously interrupted run.
  rmSync(apiStash, { recursive: true, force: true });
  renameSync(apiDir, apiStash);
}

try {
  execFileSync(path.join(root, "node_modules", ".bin", "next"), ["build"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, STATIC_EXPORT: "1" },
  });
} finally {
  if (hasApi) renameSync(apiStash, apiDir);
}

// Mirror `out/` to `dist/` for the S3/CloudFront deploy (deploy-microfrontend
// uploads `dist/`; GitHub Pages uploads `out/`).
rmSync(path.join(root, "dist"), { recursive: true, force: true });
cpSync(path.join(root, "out"), path.join(root, "dist"), { recursive: true });

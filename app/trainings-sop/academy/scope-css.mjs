#!/usr/bin/env node
/*
 * scope-css.mjs — one-shot CSS scoping for the embedded Academy.
 *
 * Why this exists:
 *   Academy ships ~4,500 lines of global CSS that redefines :root tokens,
 *   body, h1-3, button, input, etc. If we import those sheets into the
 *   Next.js page directly they clobber the OXP Studio shell (shadcn theme,
 *   shadcn buttons, etc.). To keep the merge non-destructive we wrap every
 *   selector in a `.academy-deploy-root` ancestor, so the styles only apply
 *   inside the Academy page wrapper.
 *
 * What it does:
 *   - Reads the three Academy CSS files from source/
 *   - For each selector list:
 *       * `:root`, `html`, `body`  → `.academy-deploy-root`
 *       * everything else          → `.academy-deploy-root <selector>`
 *       * keeps @import / @font-face / @keyframes / inner-keyframe stops untouched
 *   - Walks into @media / @supports / @layer blocks recursively.
 *   - Writes scoped sheets next to the originals as `*.scoped.css`.
 *
 * When to re-run:
 *   After every dev.green sync that touches the three source sheets.
 *   Run from this directory with:  node scope-css.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const FILES = [
  "source/styles.css",
  "source/styles/studio.css",
  "source/styles/training-ai.css",
];

const SCOPE = ".academy-deploy-root";

// Selectors we replace outright instead of prefixing (would otherwise
// produce something nonsensical like ".academy-deploy-root :root").
const SWALLOW = new Set([":root", "html", "body", "html, body", "body, html"]);

function prefixSelectorList(selectorText) {
  return selectorText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      if (SWALLOW.has(s)) return SCOPE;
      // Existing nested combinator (e.g. `.foo > .bar`) — prefix the whole thing.
      return `${SCOPE} ${s}`;
    })
    .join(", ");
}

function scopeCss(css) {
  // Strip CSS comments so they don't confuse the tokenizer.
  // We re-insert nothing — comments are sacrificed on the altar of correctness.
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

  let out = "";
  let i = 0;
  const len = noComments.length;

  // Track whether we're inside a keyframes block (selector tokens like `0%` or
  // `from` must be left alone).
  let keyframesDepth = 0;

  while (i < len) {
    // Skip whitespace.
    while (i < len && /\s/.test(noComments[i])) {
      out += noComments[i];
      i++;
    }
    if (i >= len) break;

    // Read until `{` or `;` or `}` — that's the "header" of the next rule.
    let start = i;
    let depth = 0;
    while (i < len) {
      const ch = noComments[i];
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      else if (depth === 0 && (ch === "{" || ch === ";" || ch === "}")) break;
      i++;
    }

    const header = noComments.slice(start, i);
    const stop = noComments[i];

    if (stop === ";" || stop === "}") {
      // At-rule statement (e.g. @import) or block close — copy verbatim.
      out += header + (stop || "");
      i++;
      if (stop === "}" && keyframesDepth > 0) keyframesDepth--;
      continue;
    }

    // stop === "{"
    const trimmedHeader = header.trim();

    if (trimmedHeader.startsWith("@")) {
      // @media / @supports / @layer / @keyframes — copy header, recurse into body.
      out += header + "{";
      i++; // consume {

      // For keyframes the body uses percentage selectors we DO NOT want prefixed.
      if (/^@(-webkit-)?keyframes\b/i.test(trimmedHeader)) {
        keyframesDepth++;
        // Copy body verbatim until matching `}`.
        let bdepth = 1;
        while (i < len && bdepth > 0) {
          const ch = noComments[i];
          if (ch === "{") bdepth++;
          else if (ch === "}") bdepth--;
          if (bdepth > 0) out += ch;
          i++;
        }
        out += "}";
        keyframesDepth--;
      }
      // For other @-rules with selector bodies (e.g. @media), recurse.
      continue;
    }

    // Regular rule.
    if (keyframesDepth > 0) {
      // We're inside @keyframes — leave selector untouched.
      out += header + "{";
    } else {
      out += prefixSelectorList(trimmedHeader) + " {";
    }
    i++; // consume {
  }

  return out;
}

for (const rel of FILES) {
  const inPath = join(__dirname, rel);
  const outPath = inPath.replace(/\.css$/, ".scoped.css");
  const src = readFileSync(inPath, "utf8");
  const scoped = scopeCss(src);
  writeFileSync(outPath, scoped, "utf8");
  console.log(`  scoped: ${rel} -> ${rel.replace(/\.css$/, ".scoped.css")}`);
}

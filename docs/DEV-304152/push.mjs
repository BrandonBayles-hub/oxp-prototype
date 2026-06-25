// Direct Jira REST API push for DEV-304152 (no MCP).
//   1. PUT all 9 FE Doc custom fields + metadata selects/multi-selects
//   2. PUT description (sections 1-5 of description.md) + footer pointing to continuation
//   3. Delete any prior continuation comments + POST continuation comment (sections 6-12 + Appendix A)
//   4. Verify result + print summary
//
// Usage: node docs/DEV-304152/push.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { markdownToAdf } from "./md-to-adf.mjs";

const here = dirname(fileURLToPath(import.meta.url));
function loadDotenv(p) {
  const env = {};
  for (const l of readFileSync(p, "utf8").split("\n")) {
    if (l.trim().startsWith("#")) continue;
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}
const env = loadDotenv(process.env.JIRA_ENV_FILE || `${process.env.HOME}/.config/jira-cli/.env`);
const auth = "Basic " + Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString("base64");
const headers = { Authorization: auth, Accept: "application/json", "Content-Type": "application/json" };
const ISSUE = "DEV-304152";
const BASE = `https://${env.JIRA_HOST}`;

async function api(method, path, body) {
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, text };
}

// --- 1. Parse fe-doc.md into per-field ADF docs ---
// Section headings in fe-doc.md are of the form: `## Before (\`customfield_11005\`)`
// We split the file on `\n## ` and extract the customfield id from the parenthesized
// `customfield_XXXXX` and the section body (everything after the heading line until
// the next `\n## ` or `\n---\n` or EOF).
const feDoc = readFileSync(join(here, "fe-doc.md"), "utf8");
const FIELD_MAP = {
  customfield_11005: "Before",
  customfield_11004: "After",
  customfield_11006: "NOT Included",
  customfield_11007: "New Permissions",
  customfield_11008: "Settings",
  customfield_11009: "Who",
  customfield_11010: "Why",
  customfield_11012: "FAQs",
  customfield_11016: "Adoption Method Details",
};
const sections = {};
{
  // Split into top-level H2 sections.
  const parts = feDoc.split(/\n## /);
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    const m = block.match(/^([^(]+)\(`(customfield_\d+)`\)\s*\n([\s\S]*?)(?=\n---\s*\n|\n## |$)/);
    if (!m) continue;
    const cf = m[2];
    const body = m[3].trim();
    if (FIELD_MAP[cf]) sections[cf] = markdownToAdf(body);
  }
}
for (const cf of Object.keys(FIELD_MAP)) {
  if (!sections[cf]) {
    console.error("Missing section for", cf, FIELD_MAP[cf]);
    process.exit(2);
  }
  console.log(
    "FE Doc",
    cf,
    "(" + FIELD_MAP[cf] + ")",
    "—",
    sections[cf].content.length,
    "blocks,",
    JSON.stringify(sections[cf]).length,
    "bytes",
  );
}

// --- 2. Parse description.md and split at section 6 boundary (block 100) ---
const descMd = readFileSync(join(here, "description.md"), "utf8");
const descAdfFull = markdownToAdf(descMd);
// Discovered block index for "## 6. User Stories" — split there.
const SPLIT = 100;
const descAdf = {
  version: 1,
  type: "doc",
  content: [
    ...descAdfFull.content.slice(0, SPLIT),
    { type: "rule" },
    {
      type: "panel",
      attrs: { panelType: "info" },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Continued in comments — ", marks: [{ type: "strong" }] },
            {
              type: "text",
              text:
                "§ 6 User Stories, § 7 SDET Test Cases, § 8 Amplitude Events, § 9 Success Metrics (AARRR), § 10 Feature Flag & Rollback, § 11 Vertical Impact Deviation Matrix, § 12 Accessibility, and Appendix A are appended as a continuation comment below. The description field was split because Atlassian's description-field content limit (~85 KB ADF) is below this spec's full size (~145 KB).",
            },
          ],
        },
      ],
    },
  ],
};
const commentAdf = {
  version: 1,
  type: "doc",
  content: [
    {
      type: "panel",
      attrs: { panelType: "info" },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Engineering spec — continuation. ", marks: [{ type: "strong" }] },
            {
              type: "text",
              text:
                "Sections 1–5 (Problem Definition, Solution — Workflows, Error & Failure States, Loading & Empty States, API Contracts, Business Logic) are in the epic description above. Sections 6–12 plus Appendix A follow here.",
            },
          ],
        },
      ],
    },
    ...descAdfFull.content.slice(SPLIT),
  ],
};
console.log(
  "\nDescription ADF bytes:",
  JSON.stringify(descAdf).length,
  "/ continuation comment ADF bytes:",
  JSON.stringify(commentAdf).length,
);

// --- 3. Build FE Doc + metadata payload ---
// Metadata field IDs from the skill prompt:
//   customfield_10226 Feature Essential Status         Completed = 10330
//   customfield_11003 Phased Rapid Release             Yes 14311 / No 14312
//   customfield_11015 Adoption Method                  Required at GA 14334
//   customfield_11301 Customer Facing / Release Note   Yes 14876
//   customfield_10434 Feature Flag Type (multi)        Company Feature Flag 14903
//   customfield_11299 Impact Areas (multi)             Leasing 14858, Marketing 14859, Resident Mgmt 14860, Implementation 15087
//   customfield_11300 Critical Workflows (multi)       Leasing 14866, Websites 14874, Implementation 15089
const feFieldsPayload = {
  customfield_11005: sections.customfield_11005,
  customfield_11004: sections.customfield_11004,
  customfield_11006: sections.customfield_11006,
  customfield_11007: sections.customfield_11007,
  customfield_11008: sections.customfield_11008,
  customfield_11009: sections.customfield_11009,
  customfield_11010: sections.customfield_11010,
  customfield_11012: sections.customfield_11012,
  customfield_11016: sections.customfield_11016,
  customfield_10226: { id: "10330" },
  customfield_11003: { id: "14311" },
  customfield_11015: { id: "14334" },
  customfield_11301: { id: "14876" },
  customfield_10434: [{ id: "14903" }],
  customfield_11299: [{ id: "14858" }, { id: "14859" }, { id: "14860" }, { id: "15087" }],
  customfield_11300: [{ id: "14866" }, { id: "14874" }, { id: "15089" }],
};

// --- 4. Push FE Doc + metadata ---
console.log("\nPUT /rest/api/3/issue/" + ISSUE + " — FE Doc fields + metadata");
const putFe = await api("PUT", `/rest/api/3/issue/${ISSUE}`, { fields: feFieldsPayload });
console.log("PUT (FE Doc) status:", putFe.status);
if (putFe.status >= 300) {
  console.error("FE Doc PUT failed:", putFe.text.slice(0, 3000));
  process.exit(2);
}

// --- 5. Push description ---
console.log("\nPUT /rest/api/3/issue/" + ISSUE + " — description");
const putDesc = await api("PUT", `/rest/api/3/issue/${ISSUE}`, { fields: { description: descAdf } });
console.log("PUT (description) status:", putDesc.status);
if (putDesc.status >= 300) {
  console.error("Description PUT failed:", putDesc.text.slice(0, 3000));
  process.exit(2);
}

// --- 6. Delete any prior continuation comments + POST continuation ---
console.log("\nFetching existing comments to clean up any prior continuation drafts...");
const list = await api("GET", `/rest/api/3/issue/${ISSUE}/comment?expand=body`);
if (list.status >= 300) {
  console.error("Could not list comments:", list.status, list.text);
  process.exit(2);
}
const existing = JSON.parse(list.text).comments || [];
const isContinuation = (c) => {
  const txt = JSON.stringify(c.body || "");
  return txt.includes("Engineering spec — continuation") || txt.includes("Engineering spec — continued");
};
const toDelete = existing.filter(isContinuation);
console.log("Found", existing.length, "comments;", toDelete.length, "match continuation pattern; deleting.");
for (const c of toDelete) {
  const del = await api("DELETE", `/rest/api/3/issue/${ISSUE}/comment/${c.id}`);
  console.log("  DELETE comment", c.id, "->", del.status);
}
console.log("\nPOST /rest/api/3/issue/" + ISSUE + "/comment — continuation");
const postC = await api("POST", `/rest/api/3/issue/${ISSUE}/comment`, { body: commentAdf });
console.log("POST status:", postC.status);
if (postC.status >= 300) {
  console.error("Comment POST failed:", postC.text.slice(0, 3000));
  process.exit(2);
}
const newComment = JSON.parse(postC.text);
console.log("Continuation comment id:", newComment.id);

// --- 7. Verify ---
console.log("\nGET /rest/api/3/issue/" + ISSUE + " (verify)");
const verify = await api(
  "GET",
  `/rest/api/3/issue/${ISSUE}?fields=summary,status,description,customfield_11004,customfield_11005,customfield_11006,customfield_11007,customfield_11008,customfield_11009,customfield_11010,customfield_11012,customfield_11016,customfield_10226,customfield_11003,customfield_11015,customfield_11301,customfield_10434,customfield_11299,customfield_11300,comment`,
);
const v = JSON.parse(verify.text);
console.log("\nIssue:", v.key, "—", v.fields.summary, "(", v.fields.status.name, ")");
for (const cf of Object.keys(FIELD_MAP)) {
  const d = v.fields[cf];
  const ok = d && d.type === "doc" && d.content.length > 1;
  console.log(ok ? "  OK" : " MISS", cf, "(" + FIELD_MAP[cf] + ")", ok ? "— " + d.content.length + " blocks" : "EMPTY");
}
for (const cf of ["customfield_10226", "customfield_11003", "customfield_11015", "customfield_11301"]) {
  const o = v.fields[cf];
  console.log(o ? "  OK" : " MISS", cf, o ? "— " + o.value : "EMPTY");
}
for (const cf of ["customfield_10434", "customfield_11299", "customfield_11300"]) {
  const o = v.fields[cf];
  console.log(
    Array.isArray(o) && o.length ? "  OK" : " MISS",
    cf,
    Array.isArray(o) ? "— " + o.map((x) => x.value).join(", ") : "EMPTY",
  );
}
const desc = v.fields.description;
const descOk = desc && desc.type === "doc" && desc.content.length > 0;
console.log(descOk ? "  OK" : " MISS", "description", descOk ? "— " + desc.content.length + " blocks" : "EMPTY");
const allComments = (v.fields.comment && v.fields.comment.comments) || [];
const continuationComments = allComments.filter((c) =>
  JSON.stringify(c.body || "").includes("Engineering spec — continuation"),
);
console.log(
  continuationComments.length === 1 ? "  OK" : " MISS",
  "continuation comment — found",
  continuationComments.length,
  "of expected 1",
);

console.log("\nDone. View at:", `${BASE}/browse/${ISSUE}`);

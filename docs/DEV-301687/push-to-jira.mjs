// Push DEV-301687 FE Doc fields + description to Jira via the REST API directly.
// Reads creds from $JIRA_ENV_FILE (or ~/.config/jira-cli/.env).
// Converts every textarea section through md-to-adf.mjs before pushing.
//
// Usage:  node docs/DEV-301687/push-to-jira.mjs [--dry-run]
//
// Steps:
//   1. Load creds.
//   2. Fetch DEV-301687 to verify access and capture current state.
//   3. Build payload: each FE Doc field is markdownToAdf(section); description
//      is markdownToAdf(description.md); metadata selects/multi-selects use
//      option IDs.
//   4. PUT /rest/api/3/issue/DEV-301687.
//   5. Re-fetch and report which fields are now populated.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { markdownToAdf } from "./md-to-adf.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");

// --- 1. Load creds -----------------------------------------------------------

function loadDotenv(path) {
  const env = {};
  const txt = readFileSync(path, "utf8");
  for (const line of txt.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (!m) continue;
    if (line.trim().startsWith("#")) continue;
    env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

const envPath =
  process.env.JIRA_ENV_FILE ||
  `${process.env.HOME}/.config/jira-cli/.env`;
if (!existsSync(envPath)) {
  console.error(`No Jira env file at ${envPath}`);
  process.exit(1);
}
const env = loadDotenv(envPath);
const { JIRA_HOST, JIRA_EMAIL, JIRA_API_TOKEN } = env;
if (!JIRA_HOST || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error("JIRA_HOST / JIRA_EMAIL / JIRA_API_TOKEN missing in env file.");
  process.exit(1);
}
const authHeader =
  "Basic " + Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");

// --- 2. Section extraction ---------------------------------------------------

function sectionContent(md, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `\\n##\\s+${escaped}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$(?![\\s\\S]))`,
  );
  const match = ("\n" + md).match(re);
  if (!match) throw new Error(`Section "${heading}" not found`);
  return match[1].replace(/\n---\s*$/, "").trim();
}

const feDoc = readFileSync(join(here, "fe-doc.md"), "utf8");
const description = readFileSync(join(here, "description.md"), "utf8");

const feSections = {
  customfield_11005: { label: "Before", md: sectionContent(feDoc, "Before") },
  customfield_11004: { label: "After", md: sectionContent(feDoc, "After") },
  customfield_11006: {
    label: "NOT Included",
    md: sectionContent(feDoc, "NOT Included"),
  },
  customfield_11007: {
    label: "New Permissions",
    md: sectionContent(feDoc, "New Permissions"),
  },
  customfield_11008: { label: "Settings", md: sectionContent(feDoc, "Settings") },
  customfield_11009: { label: "Who", md: sectionContent(feDoc, "Who") },
  customfield_11010: { label: "Why", md: sectionContent(feDoc, "Why") },
  customfield_11012: { label: "FAQs", md: sectionContent(feDoc, "FAQs") },
  customfield_11016: {
    label: "Adoption Method Details",
    md: sectionContent(feDoc, "Adoption Method Details"),
  },
};

// --- 3. Build payloads -------------------------------------------------------

const feFields = {};
for (const [cf, { md }] of Object.entries(feSections)) {
  feFields[cf] = markdownToAdf(md);
}

// Metadata
feFields.customfield_10226 = { id: "10330" }; // Feature Essential Status = Completed
feFields.customfield_11003 = { id: "14311" }; // Phased Rapid Release = Yes
feFields.customfield_11015 = { id: "14335" }; // Adoption Method = Opt-in/out
feFields.customfield_11301 = { id: "14876" }; // Customer Facing / Release Note = Yes
feFields.customfield_10434 = [{ id: "14903" }]; // Feature Flag Type = Company
feFields.customfield_11299 = [
  { id: "14858" }, // Leasing
  { id: "14859" }, // Marketing
  { id: "14860" }, // Resident Management
  { id: "14862" }, // Maintenance
];
feFields.customfield_11300 = [
  { id: "14866" }, // Leasing
  { id: "14872" }, // Renewal/transfer
  { id: "14865" }, // Payments
];

const descriptionAdf = markdownToAdf(description);

// Combine both pushes into a single PUT (Jira accepts a single fields object).
const combinedFields = { ...feFields, description: descriptionAdf };

// --- 4. Dump + push ---------------------------------------------------------

writeFileSync(
  join(here, "jira-payload.adf.json"),
  JSON.stringify(
    {
      _meta: {
        issueKey: "DEV-301687",
        host: JIRA_HOST,
        format: "ADF",
        builtAt: new Date().toISOString(),
      },
      put: {
        url: `https://${JIRA_HOST}/rest/api/3/issue/DEV-301687`,
        method: "PUT",
        body: { fields: combinedFields },
      },
    },
    null,
    2,
  ) + "\n",
);

async function api(method, path, body) {
  const url = `https://${JIRA_HOST}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

console.log("Issue:", "DEV-301687");
console.log("Host:", JIRA_HOST);
console.log("Auth as:", JIRA_EMAIL);
console.log("Dry run?", DRY_RUN);
console.log(
  "FE Doc fields:",
  Object.keys(feSections).length,
  "+ metadata:",
  Object.keys(feFields).length - Object.keys(feSections).length,
);
console.log("Description ADF bytes:", JSON.stringify(descriptionAdf).length);

if (DRY_RUN) {
  console.log(
    "Dry run only — payload written to docs/DEV-301687/jira-payload.adf.json. Re-run without --dry-run to push.",
  );
  process.exit(0);
}

console.log("\nPUT /rest/api/3/issue/DEV-301687 ...");
const putRes = await api("PUT", "/rest/api/3/issue/DEV-301687", {
  fields: combinedFields,
});
console.log("PUT status:", putRes.status);
if (putRes.status >= 300) {
  console.error("PUT body:", putRes.body.slice(0, 4000));
  process.exit(2);
}

console.log("\nGET /rest/api/3/issue/DEV-301687 (verify) ...");
const verify = await api(
  "GET",
  "/rest/api/3/issue/DEV-301687?fields=summary,status,description," +
    Object.keys(feFields).join(","),
);
console.log("GET status:", verify.status);
const v = JSON.parse(verify.body);
console.log("\nField population:");
for (const cf of Object.keys(feSections)) {
  const val = v.fields[cf];
  const ok = val && val.type === "doc" && Array.isArray(val.content) && val.content.length > 0;
  console.log(
    `  ${cf} (${feSections[cf].label}):`,
    ok ? `OK (${val.content.length} top-level blocks)` : "EMPTY",
  );
}
const descOk =
  v.fields.description &&
  v.fields.description.type === "doc" &&
  Array.isArray(v.fields.description.content) &&
  v.fields.description.content.length > 0;
console.log(
  "  description:",
  descOk
    ? `OK (${v.fields.description.content.length} top-level blocks)`
    : "EMPTY",
);
const selects = {
  customfield_10226: "Feature Essential Status",
  customfield_11003: "Phased Rapid Release",
  customfield_11015: "Adoption Method",
  customfield_11301: "Customer Facing / Release Note",
};
for (const [cf, label] of Object.entries(selects)) {
  const opt = v.fields[cf];
  console.log(
    `  ${cf} (${label}):`,
    opt ? `${opt.value || opt.name || opt.id}` : "EMPTY",
  );
}
for (const cf of ["customfield_10434", "customfield_11299", "customfield_11300"]) {
  const opts = v.fields[cf];
  console.log(
    `  ${cf}:`,
    Array.isArray(opts) && opts.length
      ? opts.map((o) => o.value || o.name || o.id).join(", ")
      : "EMPTY",
  );
}
console.log("\nDone. View:", `https://${JIRA_HOST}/browse/DEV-301687`);

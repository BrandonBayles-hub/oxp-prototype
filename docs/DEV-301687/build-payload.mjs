#!/usr/bin/env node
// Build docs/DEV-301687/jira-payload.json with the actual markdown content inlined.
// Run from anywhere via:  node docs/DEV-301687/build-payload.mjs
// Re-run any time fe-doc.md or description.md changes.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const feDoc = readFileSync(join(here, "fe-doc.md"), "utf8");
const desc = readFileSync(join(here, "description.md"), "utf8");

function sectionContent(md, heading) {
  // Returns the body text under "## <heading>" up to (but not including) the next "## " heading
  // or end-of-file. Trims surrounding whitespace and any trailing "---" divider line.
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\n##\\s+${escaped}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$(?![\\s\\S]))`);
  const match = ("\n" + md).match(re);
  if (!match) throw new Error(`Section "${heading}" not found in fe-doc.md`);
  return match[1].replace(/\n---\s*$/, "").trim();
}

const fields = {
  customfield_11005: sectionContent(feDoc, "Before"),
  customfield_11004: sectionContent(feDoc, "After"),
  customfield_11006: sectionContent(feDoc, "NOT Included"),
  customfield_11007: sectionContent(feDoc, "New Permissions"),
  customfield_11008: sectionContent(feDoc, "Settings"),
  customfield_11009: sectionContent(feDoc, "Who"),
  customfield_11010: sectionContent(feDoc, "Why"),
  customfield_11012: sectionContent(feDoc, "FAQs"),
  customfield_11016: sectionContent(feDoc, "Adoption Method Details"),

  customfield_10226: { id: "10330" },
  customfield_11003: { id: "14311" },
  customfield_11015: { id: "14335" },
  customfield_11301: { id: "14876" },

  customfield_10434: [{ id: "14903" }],
  customfield_11299: [
    { id: "14858" },
    { id: "14859" },
    { id: "14860" },
    { id: "14862" },
  ],
  customfield_11300: [
    { id: "14866" },
    { id: "14872" },
    { id: "14865" },
  ],
};

const fieldLabels = {
  customfield_11005: "Before",
  customfield_11004: "After",
  customfield_11006: "NOT Included",
  customfield_11007: "New Permissions",
  customfield_11008: "Settings",
  customfield_11009: "Who",
  customfield_11010: "Why",
  customfield_11012: "FAQs",
  customfield_11016: "Adoption Method Details",
  customfield_10226: "Feature Essential Status",
  customfield_11003: "Phased Rapid Release",
  customfield_11015: "Adoption Method",
  customfield_11301: "Customer Facing / Release Note",
  customfield_10434: "Feature Flag Type",
  customfield_11299: "Impact Areas",
  customfield_11300: "Critical Workflows Impacted",
};

const payload = {
  _meta: {
    issueKey: "DEV-301687",
    server: "user-entrata-mcp-gateway",
    tool: "jira__editJiraIssue",
    pushes: 2,
    contentFormat: "markdown",
    purpose:
      "Drop-in payload. Make TWO jira__editJiraIssue calls in order: (1) feDocPush, then (2) descriptionPush. Both use contentFormat=markdown. If Jira ingest rejects markdown, fall back to ADF assembly per prompt.md's ADF section.",
    fieldLabels,
    generatedAt: new Date().toISOString(),
  },
  feDocPush: {
    issueIdOrKey: "DEV-301687",
    contentFormat: "markdown",
    fields,
  },
  descriptionPush: {
    issueIdOrKey: "DEV-301687",
    contentFormat: "markdown",
    fields: {
      description: desc.trim(),
    },
  },
  pushInstructions: [
    "1. Verify user-entrata-mcp-gateway MCP is connected (Cursor Settings >> MCP).",
    "2. Call jira__getJiraIssue {issueIdOrKey: 'DEV-301687'} to capture current state.",
    "3. Call jira__editJiraIssue with the contents of feDocPush.",
    "4. Call jira__editJiraIssue with the contents of descriptionPush.",
    "5. Re-call jira__getJiraIssue {issueIdOrKey: 'DEV-301687'} and verify each of the 9 FE Doc custom fields is populated and the description field contains the full engineering spec.",
    "6. Run the self-audit in docs/DEV-301687/SELF-AUDIT.md.",
  ],
};

writeFileSync(join(here, "jira-payload.json"), JSON.stringify(payload, null, 2) + "\n");
console.log("Wrote", join(here, "jira-payload.json"));
console.log("FE Doc fields populated:", Object.keys(fields).length);
console.log("Description bytes:", desc.length);

// Debug script: push subsets of the DEV-301687 payload to isolate which field
// triggers the 400 INVALID_INPUT. Run with: node docs/DEV-301687/push-debug.mjs <subset>
//   subsets: description, selects, multis, textareas, all
//   or: --field=<customfield_xxxx> (push only that single field)
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { markdownToAdf } from "./md-to-adf.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const arg = (process.argv[2] || "all").replace(/^--/, "");

function loadDotenv(p) {
  const env = {};
  for (const line of readFileSync(p, "utf8").split("\n")) {
    if (line.trim().startsWith("#")) continue;
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}
const env = loadDotenv(process.env.JIRA_ENV_FILE || `${process.env.HOME}/.config/jira-cli/.env`);
const auth = "Basic " + Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString("base64");

function section(md, h) {
  const re = new RegExp(`\\n##\\s+${h.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$(?![\\s\\S]))`);
  return ("\n"+md).match(re)[1].replace(/\n---\s*$/,'').trim();
}
const feDoc = readFileSync(join(here,"fe-doc.md"),"utf8");
const desc = readFileSync(join(here,"description.md"),"utf8");

const textareas = {
  customfield_11005: markdownToAdf(section(feDoc,"Before")),
  customfield_11004: markdownToAdf(section(feDoc,"After")),
  customfield_11006: markdownToAdf(section(feDoc,"NOT Included")),
  customfield_11007: markdownToAdf(section(feDoc,"New Permissions")),
  customfield_11008: markdownToAdf(section(feDoc,"Settings")),
  customfield_11009: markdownToAdf(section(feDoc,"Who")),
  customfield_11010: markdownToAdf(section(feDoc,"Why")),
  customfield_11012: markdownToAdf(section(feDoc,"FAQs")),
  customfield_11016: markdownToAdf(section(feDoc,"Adoption Method Details")),
};
const selects = {
  customfield_10226: { id: "10330" },
  customfield_11003: { id: "14311" },
  customfield_11015: { id: "14335" },
  customfield_11301: { id: "14876" },
};
const multis = {
  customfield_10434: [{ id: "14903" }],
  customfield_11299: [{ id: "14858" }, { id: "14859" }, { id: "14860" }, { id: "14862" }],
  customfield_11300: [{ id: "14866" }, { id: "14872" }, { id: "14865" }],
};
const descriptionField = { description: markdownToAdf(desc) };

const subsets = {
  description: descriptionField,
  selects,
  multis,
  textareas,
  all: { ...textareas, ...selects, ...multis, ...descriptionField },
};

let fields;
const fieldArg = process.argv.find(a => a.startsWith("--field="));
if (fieldArg) {
  const cf = fieldArg.split("=")[1];
  const v = textareas[cf] ?? selects[cf] ?? multis[cf] ?? (cf==="description"?markdownToAdf(desc):undefined);
  if (!v) { console.error("Unknown field:", cf); process.exit(1); }
  fields = { [cf]: v };
} else {
  fields = subsets[arg];
  if (!fields) { console.error("Unknown subset:", arg, "use one of:", Object.keys(subsets).join(", ")); process.exit(1); }
}

console.log("Pushing subset:", fieldArg || arg, "| fields:", Object.keys(fields));
const res = await fetch(`https://${env.JIRA_HOST}/rest/api/3/issue/DEV-301687`, {
  method: "PUT",
  headers: { Authorization: auth, Accept: "application/json", "Content-Type": "application/json" },
  body: JSON.stringify({ fields }),
});
console.log("Status:", res.status);
console.log("Body:", (await res.text()).slice(0, 2000));

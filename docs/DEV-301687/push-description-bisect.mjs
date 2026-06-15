// Bisect the description ADF to find what trips INVALID_INPUT.
// Usage: node push-description-bisect.mjs [start] [end]   (block index range, inclusive)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { markdownToAdf } from "./md-to-adf.mjs";

const here = dirname(fileURLToPath(import.meta.url));
function loadDotenv(p){const env={};for(const l of readFileSync(p,"utf8").split("\n")){if(l.trim().startsWith("#"))continue;const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);if(m)env[m[1]]=m[2].replace(/^['"]|['"]$/g,"");}return env;}
const env=loadDotenv(process.env.JIRA_ENV_FILE||`${process.env.HOME}/.config/jira-cli/.env`);
const auth="Basic "+Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString("base64");

const md = readFileSync(join(here,"description.md"),"utf8");
const adf = markdownToAdf(md);
const blocks = adf.content;

const start = Number(process.argv[2] ?? 0);
const end = Number(process.argv[3] ?? blocks.length - 1);
const sliced = { version:1, type:"doc", content: blocks.slice(start, end+1) };
console.log("Trying blocks", start, "..", end, "of", blocks.length, "| bytes:", JSON.stringify(sliced).length);

const res = await fetch(`https://${env.JIRA_HOST}/rest/api/3/issue/DEV-301687`, {
  method: "PUT",
  headers: { Authorization: auth, Accept: "application/json", "Content-Type": "application/json" },
  body: JSON.stringify({ fields: { description: sliced } }),
});
console.log("Status:", res.status);
const body = await res.text();
console.log("Body:", body.slice(0, 1500));
if (res.status === 204) {
  console.log("\nBlock types in this range:");
  const h = {};
  sliced.content.forEach(b => h[b.type] = (h[b.type]||0)+1);
  console.log(h);
}

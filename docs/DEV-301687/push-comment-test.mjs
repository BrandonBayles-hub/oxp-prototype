// Test pushing the tail of the spec as a single comment.
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
const tail = { version:1, type:"doc", content: adf.content.slice(108) };
const banner = {
  version:1, type:"doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Engineering spec — continued from epic description" }] },
    { type: "paragraph", content: [{ type: "text", text: "The first six sections of the engineering spec (Problem, Workflows, Errors, Loading & Empty States, API Contracts, Business Logic) are in the epic description above. The remaining sections — § 7 SDET through Appendix A — follow in this comment because the description field exceeded Atlassian's content size limit." }] },
    { type: "rule" },
    ...tail.content,
  ],
};

console.log("Comment ADF bytes:", JSON.stringify(banner).length);

const res = await fetch(`https://${env.JIRA_HOST}/rest/api/3/issue/DEV-301687/comment`, {
  method: "POST",
  headers: { Authorization: auth, Accept: "application/json", "Content-Type": "application/json" },
  body: JSON.stringify({ body: banner }),
});
console.log("POST /comment status:", res.status);
const body = await res.text();
console.log("Body:", body.slice(0, 1500));
if (res.status < 300) {
  const j = JSON.parse(body);
  console.log("Comment id:", j.id, "self:", j.self);
}

// Final clean push for DEV-301687.
//   1. PUT description (sections 1-6 of description.md + footer pointing to continuation comment)
//   2. POST continuation comment (sections 7 - Appendix A) — overwrites by deleting prior continuation comments first
//   3. Verify result + print summary
//
// FE Doc fields and metadata were already pushed in a prior run (HTTP 204 from push-debug.mjs).
// This script does NOT re-push them; it only finalizes the description + continuation comment.
//
// Usage: node docs/DEV-301687/push-final.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { markdownToAdf } from "./md-to-adf.mjs";

const here = dirname(fileURLToPath(import.meta.url));
function loadDotenv(p){const env={};for(const l of readFileSync(p,"utf8").split("\n")){if(l.trim().startsWith("#"))continue;const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);if(m)env[m[1]]=m[2].replace(/^['"]|['"]$/g,"");}return env;}
const env=loadDotenv(process.env.JIRA_ENV_FILE||`${process.env.HOME}/.config/jira-cli/.env`);
const auth="Basic "+Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString("base64");
const headers={Authorization:auth, Accept:"application/json", "Content-Type":"application/json"};
const ISSUE="DEV-301687";
const BASE=`https://${env.JIRA_HOST}`;

async function api(method, path, body){
  const res = await fetch(BASE+path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, text };
}

const md = readFileSync(join(here, "description.md"), "utf8");
const adf = markdownToAdf(md);
// Section block index map (computed once from description.md structure):
//    0 H1 title
//    3 H2 § 1
//   17 H2 § 2
//   29 H2 § 3
//   32 H2 § 3.5
//   37 H2 § 4
//   76 H2 § 5
//   94 H2 § 6
//  108 H2 § 7  ← split here: description = 0..107, comment = 108..end
const SPLIT = 108;

// --- Build description (blocks 0..107) + footer ---
const descriptionAdf = {
  version: 1,
  type: "doc",
  content: [
    ...adf.content.slice(0, SPLIT),
    { type: "rule" },
    {
      type: "panel",
      attrs: { panelType: "info" },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Continued in comments — " , marks: [{ type: "strong" }]},
            { type: "text", text: "§ 7 SDET Test Cases, § 8 Amplitude Events, § 9 Success Metrics (AARRR), § 10 Feature Flag & Rollback, § 11 Vertical Impact Deviation Matrix, § 12 Accessibility, and Appendix A are appended as a continuation comment below. The description field was split at the § 6/§ 7 boundary because Atlassian's description-field content limit (~85 KB ADF) is below this spec's full size (~123 KB)." },
          ],
        },
      ],
    },
  ],
};

console.log("Description ADF bytes:", JSON.stringify(descriptionAdf).length);

// --- Build continuation comment (blocks 108..end) + banner ---
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
            { type: "text", text: "Sections 1–6 (Problem Definition, Solution — Workflows, Error & Failure States, Loading & Empty States, API Contracts, Business Logic, User Stories) are in the epic description above. Sections 7–12 plus Appendix A follow here." },
          ],
        },
      ],
    },
    ...adf.content.slice(SPLIT),
  ],
};
console.log("Continuation comment ADF bytes:", JSON.stringify(commentAdf).length);

// --- Step 1: Remove any prior continuation comments authored by me ---
console.log("\nFetching existing comments to clean up prior continuation drafts...");
const list = await api("GET", `/rest/api/3/issue/${ISSUE}/comment?expand=body`);
if (list.status >= 300) { console.error("Could not list comments:", list.status, list.text); process.exit(2); }
const existing = JSON.parse(list.text).comments || [];
const isContinuation = (c) => {
  const txt = JSON.stringify(c.body || "");
  return txt.includes("Engineering spec — continued") || txt.includes("Engineering spec — continuation");
};
const toDelete = existing.filter(isContinuation);
console.log("Found", existing.length, "comments;", toDelete.length, "match continuation pattern and will be deleted.");
for (const c of toDelete) {
  const del = await api("DELETE", `/rest/api/3/issue/${ISSUE}/comment/${c.id}`);
  console.log("  DELETE comment", c.id, "->", del.status);
}

// --- Step 2: PUT description ---
console.log("\nPUT /rest/api/3/issue/" + ISSUE);
const put = await api("PUT", `/rest/api/3/issue/${ISSUE}`, { fields: { description: descriptionAdf } });
console.log("PUT status:", put.status);
if (put.status >= 300) { console.error("PUT failed:", put.text.slice(0,2000)); process.exit(2); }

// --- Step 3: POST continuation comment ---
console.log("\nPOST /rest/api/3/issue/" + ISSUE + "/comment");
const post = await api("POST", `/rest/api/3/issue/${ISSUE}/comment`, { body: commentAdf });
console.log("POST status:", post.status);
if (post.status >= 300) { console.error("POST failed:", post.text.slice(0,2000)); process.exit(2); }
const newComment = JSON.parse(post.text);
console.log("Continuation comment id:", newComment.id);

// --- Step 4: Verify ---
console.log("\nGET /rest/api/3/issue/" + ISSUE + " (verify)");
const verify = await api("GET", `/rest/api/3/issue/${ISSUE}?fields=summary,status,description,customfield_11004,customfield_11005,customfield_11006,customfield_11007,customfield_11008,customfield_11009,customfield_11010,customfield_11012,customfield_11016,customfield_10226,customfield_11003,customfield_11015,customfield_11301,customfield_10434,customfield_11299,customfield_11300,comment`);
console.log("GET status:", verify.status);
const v = JSON.parse(verify.text);
console.log("\nIssue:", v.key, "—", v.fields.summary, "(", v.fields.status.name, ")");
const feLabels={customfield_11005:"Before",customfield_11004:"After",customfield_11006:"NOT Included",customfield_11007:"Permissions",customfield_11008:"Settings",customfield_11009:"Who",customfield_11010:"Why",customfield_11012:"FAQs",customfield_11016:"Adoption"};
for (const [cf,name] of Object.entries(feLabels)) {
  const d=v.fields[cf]; const ok=d&&d.type==='doc'&&d.content.length>1;
  console.log((ok?'  OK':' MISS'), cf, '('+name+')', ok?'— '+d.content.length+' blocks':'EMPTY');
}
for (const cf of ['customfield_10226','customfield_11003','customfield_11015','customfield_11301']) {
  const o=v.fields[cf]; console.log((o?'  OK':' MISS'), cf, o?'— '+o.value:'EMPTY');
}
for (const cf of ['customfield_10434','customfield_11299','customfield_11300']) {
  const o=v.fields[cf]; console.log((Array.isArray(o)&&o.length?'  OK':' MISS'), cf, Array.isArray(o)?'— '+o.map(x=>x.value).join(', '):'EMPTY');
}
const desc=v.fields.description; const descOk = desc && desc.type==='doc' && desc.content.length>0;
console.log((descOk?'  OK':' MISS'), 'description', descOk?'— '+desc.content.length+' blocks':'EMPTY');
const allComments = v.fields.comment.comments || [];
const continuationComments = allComments.filter(c => JSON.stringify(c.body||'').includes('Engineering spec — continuation'));
console.log((continuationComments.length===1?'  OK':' MISS'), 'continuation comment — found', continuationComments.length, 'of expected 1');

console.log("\nDone. View at:", `${BASE}/browse/${ISSUE}`);

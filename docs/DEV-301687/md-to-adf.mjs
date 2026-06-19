// Convert markdown → ADF (Atlassian Document Format) JSON.
// Uses `marked`'s lexer to tokenize, then walks the token tree.
// Targeted to the constructs used in this epic's source files:
//   headings (h1-h4), paragraphs, bullet/ordered lists, inline code, bold,
//   italic, code blocks (with language), block quotes, horizontal rules,
//   tables (pipe tables with header row), links.

import { Lexer } from "marked";

function textNode(text, marks) {
  const node = { type: "text", text };
  if (marks && marks.length) node.marks = marks;
  return node;
}

function inlineToAdf(tokens, marks = []) {
  const out = [];
  if (!tokens) return out;
  for (const t of tokens) {
    switch (t.type) {
      case "text":
      case "escape":
        if (t.tokens) out.push(...inlineToAdf(t.tokens, marks));
        else if (t.text) out.push(textNode(t.text, marks));
        break;
      case "strong":
        out.push(...inlineToAdf(t.tokens, [...marks, { type: "strong" }]));
        break;
      case "em":
        out.push(...inlineToAdf(t.tokens, [...marks, { type: "em" }]));
        break;
      case "codespan": {
        // ADF disallows combining `code` with `strong`, `em`, `strike`, `subsup`,
        // `underline`, or color marks. Only `link` is allowed alongside `code`.
        const preserved = marks.filter((m) => m.type === "link");
        out.push(textNode(t.text, [...preserved, { type: "code" }]));
        break;
      }
      case "del":
        out.push(...inlineToAdf(t.tokens, [...marks, { type: "strike" }]));
        break;
      case "link":
        out.push(
          ...inlineToAdf(t.tokens, [
            ...marks,
            { type: "link", attrs: { href: t.href } },
          ]),
        );
        break;
      case "br":
        out.push({ type: "hardBreak" });
        break;
      case "html":
        // Strip raw HTML (e.g. <br/>) to a hard break or skip.
        if (/^<br\s*\/?>$/i.test(t.text || "")) out.push({ type: "hardBreak" });
        // otherwise ignore
        break;
      case "image":
        // Render as link text fallback
        out.push(
          textNode(t.text || t.href, [
            ...marks,
            { type: "link", attrs: { href: t.href } },
          ]),
        );
        break;
      default:
        if (t.text) out.push(textNode(t.text, marks));
    }
  }
  return out;
}

function listItemContent(item) {
  // marked list items have .tokens which are block-level tokens (text, paragraph, list).
  const content = [];
  let inlineBuf = [];
  const flushInline = () => {
    if (inlineBuf.length) {
      content.push({ type: "paragraph", content: inlineBuf });
      inlineBuf = [];
    }
  };
  for (const t of item.tokens || []) {
    switch (t.type) {
      case "text":
        // Loose list items wrap text in tokens; tight items expose .tokens
        if (t.tokens) inlineBuf.push(...inlineToAdf(t.tokens));
        else if (t.text) inlineBuf.push(textNode(t.text));
        break;
      case "paragraph":
        flushInline();
        content.push({ type: "paragraph", content: inlineToAdf(t.tokens) });
        break;
      case "list":
        flushInline();
        content.push(listToAdf(t));
        break;
      case "code":
        flushInline();
        content.push(codeBlock(t));
        break;
      case "blockquote":
        flushInline();
        content.push(blockquoteToAdf(t));
        break;
      default:
        if (t.tokens) inlineBuf.push(...inlineToAdf(t.tokens));
        else if (t.text) inlineBuf.push(textNode(t.text));
    }
  }
  flushInline();
  if (content.length === 0) content.push({ type: "paragraph", content: [] });
  return content;
}

function listToAdf(token) {
  const items = (token.items || []).map((item) => ({
    type: "listItem",
    content: listItemContent(item),
  }));
  return {
    type: token.ordered ? "orderedList" : "bulletList",
    content: items,
  };
}

function blockquoteToAdf(token) {
  return {
    type: "blockquote",
    content: tokensToAdfBlocks(token.tokens || []),
  };
}

function codeBlock(token) {
  const text = (token.text ?? "").replace(/\n$/, "");
  const node = {
    type: "codeBlock",
    content: text.length ? [{ type: "text", text }] : [],
  };
  if (token.lang) node.attrs = { language: token.lang };
  return node;
}

function tableToAdf(token) {
  // marked v18 table token: { header: [{ tokens, align }], rows: [[{ tokens, align }]] }
  const cellNode = (cellToken, isHeader) => ({
    type: isHeader ? "tableHeader" : "tableCell",
    attrs: {},
    content: [
      {
        type: "paragraph",
        content: inlineToAdf(cellToken.tokens || []),
      },
    ],
  });
  const headerRow = {
    type: "tableRow",
    content: (token.header || []).map((c) => cellNode(c, true)),
  };
  const bodyRows = (token.rows || []).map((row) => ({
    type: "tableRow",
    content: row.map((c) => cellNode(c, false)),
  }));
  return {
    type: "table",
    attrs: { isNumberColumnEnabled: false, layout: "default" },
    content: [headerRow, ...bodyRows],
  };
}

function tokensToAdfBlocks(tokens) {
  const blocks = [];
  for (const t of tokens) {
    switch (t.type) {
      case "space":
        break;
      case "heading":
        blocks.push({
          type: "heading",
          attrs: { level: Math.min(t.depth, 6) },
          content: inlineToAdf(t.tokens),
        });
        break;
      case "paragraph":
        blocks.push({ type: "paragraph", content: inlineToAdf(t.tokens) });
        break;
      case "text":
        // Top-level loose text (rare). Wrap as paragraph.
        blocks.push({
          type: "paragraph",
          content: t.tokens ? inlineToAdf(t.tokens) : [textNode(t.text || "")],
        });
        break;
      case "list":
        blocks.push(listToAdf(t));
        break;
      case "code":
        blocks.push(codeBlock(t));
        break;
      case "blockquote":
        blocks.push(blockquoteToAdf(t));
        break;
      case "hr":
        blocks.push({ type: "rule" });
        break;
      case "table":
        blocks.push(tableToAdf(t));
        break;
      case "html":
        // Strip raw HTML at block level.
        break;
      default:
        // Unknown — coerce to plain text paragraph.
        if (t.text) {
          blocks.push({
            type: "paragraph",
            content: [textNode(String(t.text))],
          });
        }
    }
  }
  return blocks;
}

export function markdownToAdf(md) {
  const lexer = new Lexer({ gfm: true, breaks: false });
  const tokens = lexer.lex(md);
  return {
    version: 1,
    type: "doc",
    content: tokensToAdfBlocks(tokens),
  };
}

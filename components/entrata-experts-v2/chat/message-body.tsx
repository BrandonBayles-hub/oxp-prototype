"use client";
import * as React from "react";
import type { Citation } from "@/lib/entrata-experts-v2/types";
import { CitationChip } from "./citation-chip";

/**
 * Tiny markdown-ish renderer that supports:
 *   - **bold**
 *   - bullet lines starting with "• " or "- "
 *   - paragraphs separated by blank lines
 *   - inline citations of the form [#1], [#2]...
 */
export function MessageBody({ body, citations }: { body: string; citations: Citation[] }) {
  const lines = body.split("\n");
  const blocks: { type: "p" | "ul"; content: string[] }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (blocks.length && blocks[blocks.length - 1].content.length) {
        blocks.push({ type: "p", content: [] });
      }
      continue;
    }
    if (/^[•\-]\s+/.test(trimmed)) {
      const last = blocks[blocks.length - 1];
      if (last && last.type === "ul") {
        last.content.push(trimmed.replace(/^[•\-]\s+/, ""));
      } else {
        blocks.push({ type: "ul", content: [trimmed.replace(/^[•\-]\s+/, "")] });
      }
    } else {
      const last = blocks[blocks.length - 1];
      if (last && last.type === "p") {
        last.content.push(trimmed);
      } else {
        blocks.push({ type: "p", content: [trimmed] });
      }
    }
  }

  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-foreground">
      {blocks
        .filter((b) => b.content.length > 0)
        .map((block, idx) =>
          block.type === "p" ? (
            <p key={idx}>{renderInline(block.content.join(" "), citations)}</p>
          ) : (
            <ul key={idx} className="space-y-1.5 pl-1">
              {block.content.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-[7px] text-muted-foreground/70">•</span>
                  <span>{renderInline(item, citations)}</span>
                </li>
              ))}
            </ul>
          ),
        )}
    </div>
  );
}

function renderInline(text: string, citations: Citation[]): React.ReactNode {
  const tokens: { kind: "text" | "bold" | "cite"; value: string }[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2);
      if (end > -1) {
        tokens.push({ kind: "bold", value: text.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    if (text[i] === "[" && text[i + 1] === "#") {
      const end = text.indexOf("]", i + 2);
      if (end > -1) {
        tokens.push({ kind: "cite", value: text.slice(i + 2, end) });
        i = end + 1;
        continue;
      }
    }
    const nextSpecial = findNextSpecial(text, i);
    tokens.push({ kind: "text", value: text.slice(i, nextSpecial) });
    i = nextSpecial;
  }

  return tokens.map((t, idx) => {
    if (t.kind === "bold") return <strong key={idx} className="font-semibold text-foreground">{t.value}</strong>;
    if (t.kind === "cite") {
      const num = parseInt(t.value, 10);
      const citation = citations[num - 1];
      if (!citation) return <span key={idx}>[#{t.value}]</span>;
      return <CitationChip key={idx} citation={citation} index={num} />;
    }
    return <React.Fragment key={idx}>{t.value}</React.Fragment>;
  });
}

function findNextSpecial(text: string, from: number): number {
  let next = text.length;
  const candidates = ["**", "[#"];
  for (const c of candidates) {
    const idx = text.indexOf(c, from);
    if (idx > -1 && idx < next && idx > from) next = idx;
  }
  return next;
}

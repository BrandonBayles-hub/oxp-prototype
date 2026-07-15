"use client";

/*
 * RichTextEditor — TipTap shim for the OXP Studio prototype.
 *
 * Academy originally used a self-hosted TinyMCE 7 instance via
 * @tinymce/tinymce-react. The OXP Studio prototype already ships TipTap
 * (StarterKit + Underline + TextAlign) at components/ui/rich-text-editor.tsx.
 * This shim adapts the academy prop API (value / onChange / height / placeholder /
 * disabled) onto the prototype's TipTap component so callers (ArticleViewer)
 * keep working without changes.
 *
 * Tradeoffs vs the original TinyMCE wrapper:
 *   - TipTap base ships with smaller bundle (~40KB vs TinyMCE ~600KB).
 *   - The "import" / "type style" toolbar buttons in the prototype's TipTap
 *     wrapper are placeholders (no-ops); the original TinyMCE had find/replace
 *     and visualblocks plugins that are not in the default TipTap extension set.
 *   - The `articleSlugLookup` prop (which the original used to rewrite
 *     in-editor links to internal article slugs) is accepted but currently
 *     unused. Re-add if/when KB cross-linking lands in the Next.js prototype.
 */

import { RichTextEditor as TipTapEditor } from "@/components/ui/rich-text-editor";

// eslint-disable-next-line no-unused-vars
export function RichTextEditor({ value = "", onChange, disabled, height = 400, placeholder, articleSlugLookup }) {
  return (
    <TipTapEditor
      content={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`min-h-[${height}px]`}
    />
  );
}

export default RichTextEditor;

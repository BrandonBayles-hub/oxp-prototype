"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
import {
  TextStyle,
  FontFamily,
  FontSize,
} from "@tiptap/extension-text-style";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Bold, Italic, List, ListOrdered, Quote, Undo, Redo, Heading1, Heading2, Heading3, ListTree, ChevronDown } from "lucide-react";
import { FontWeight } from "@/lib/tiptap-font-weight";

type OutlineItem = { id: string; level: number; text: string };

function extractHeadings(editor: Editor): OutlineItem[] {
  const items: OutlineItem[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      const text = node.textContent.trim();
      if (text) items.push({ id: `heading-${pos}`, level: node.attrs.level as number, text });
    }
  });
  return items;
}

function scrollToHeading(editor: Editor, text: string, level: number) {
  let targetPos = -1;
  editor.state.doc.descendants((node, pos) => {
    if (targetPos >= 0) return false;
    if (node.type.name === "heading" && node.attrs.level === level && node.textContent.trim() === text) {
      targetPos = pos;
      return false;
    }
  });
  if (targetPos < 0) return;
  editor.commands.setTextSelection(targetPos + 1);
  const domAtPos = editor.view.domAtPos(targetPos + 1);
  const domNode = domAtPos.node instanceof HTMLElement ? domAtPos.node : domAtPos.node.parentElement;
  const heading = domNode?.closest("h1, h2, h3") ?? domNode;
  heading?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function isHtml(s: string): boolean {
  const t = s.trim();
  return t.startsWith("<") && (t.includes("</") || t.endsWith("/>"));
}

function toTiptapContent(value: string): string {
  if (!value.trim()) return "<p></p>";
  if (isHtml(value)) return value;
  return value
    .split(/\n/)
    .map((line) => `<p>${line || "<br>"}</p>`)
    .join("");
}

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  /** When this changes, value is re-applied to the editor (e.g. document id) */
  contentKey?: string;
  /** Show the document outline panel */
  showOutline?: boolean;
};

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Document content…",
  className = "",
  minHeight = "180px",
  contentKey,
  showOutline: showOutlineProp,
}: RichTextEditorProps) {
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [headings, setHeadings] = useState<OutlineItem[]>([]);
  const initialContent = useRef(toTiptapContent(value));
  const lastContentKey = useRef(contentKey);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Heading.configure({ levels: [1, 2, 3] }),
      TextStyle,
      FontFamily,
      FontSize,
      FontWeight,
    ],
    content: initialContent.current,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none dark:prose-invert focus:outline-none px-3 py-2",
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  const [textStyleAttrs, setTextStyleAttrs] = useState({
    fontFamily: "",
    fontWeight: "",
    fontSize: "",
  });

  useEffect(() => {
    if (!editor || contentKey === undefined || contentKey === lastContentKey.current) return;
    lastContentKey.current = contentKey;
    const next = toTiptapContent(value);
    editor.commands.setContent(next, { emitUpdate: false });
  }, [contentKey, value, editor]);

  useEffect(() => {
    if (!editor) return;
    const updateAttrs = () => {
      const attrs = editor.getAttributes("textStyle");
      setTextStyleAttrs({
        fontFamily: attrs.fontFamily ?? "",
        fontWeight: attrs.fontWeight ?? "",
        fontSize: attrs.fontSize ?? "",
      });
    };
    updateAttrs();
    editor.on("selectionUpdate", updateAttrs);
    editor.on("transaction", updateAttrs);
    return () => {
      editor.off("selectionUpdate", updateAttrs);
      editor.off("transaction", updateAttrs);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const refresh = () => setHeadings(extractHeadings(editor));
    refresh();
    editor.on("update", refresh);
    return () => { editor.off("update", refresh); };
  }, [editor]);

  const showOutline = showOutlineProp !== false && headings.length > 0;

  if (!editor) {
    return (
      <div
        className={"rounded-md border border-input bg-muted/30 text-sm " + className}
        style={{ minHeight }}
      >
        <div className="flex items-center justify-center px-3 py-8 text-muted-foreground">
          Loading editor…
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        "rounded-md border border-input bg-background text-sm flex flex-col " + className
      }
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/60 bg-muted/40 px-2 py-1">
        {headings.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setOutlineOpen((o) => !o)}
              className={`rounded p-1.5 ${outlineOpen ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              title="Toggle outline"
              aria-label="Toggle outline"
            >
              <ListTree className="h-4 w-4" />
            </button>
            <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
          </>
        )}
        {/* Font family */}
        <select
          value={textStyleAttrs.fontFamily}
          onChange={(e) => {
            const v = e.target.value;
            if (v) editor.chain().focus().setFontFamily(v).run();
            else editor.chain().focus().unsetFontFamily().run();
          }}
          className="h-8 min-w-0 max-w-[140px] rounded border border-border/60 bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          title="Font"
          aria-label="Font family"
        >
          <option value="">Inter</option>
          <option value="Inter, sans-serif">Inter</option>
          <option value="system-ui, sans-serif">System</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="ui-monospace, monospace">Monospace</option>
        </select>
        {/* Font weight */}
        <select
          value={textStyleAttrs.fontWeight}
          onChange={(e) => {
            const v = e.target.value;
            if (v) editor.chain().focus().setFontWeight(v).run();
            else editor.chain().focus().unsetFontWeight().run();
          }}
          className="h-8 min-w-0 max-w-[100px] rounded border border-border/60 bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          title="Weight"
          aria-label="Font weight"
        >
          <option value="">Normal</option>
          <option value="400">Normal</option>
          <option value="500">Medium</option>
          <option value="600">Semibold</option>
          <option value="700">Bold</option>
        </select>
        {/* Font size */}
        <select
          value={textStyleAttrs.fontSize}
          onChange={(e) => {
            const v = e.target.value;
            if (v) editor.chain().focus().setFontSize(v).run();
            else editor.chain().focus().unsetFontSize().run();
          }}
          className="h-8 min-w-0 max-w-[80px] rounded border border-border/60 bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          title="Size"
          aria-label="Font size"
        >
          <option value="">14</option>
          <option value="12px">12</option>
          <option value="14px">14</option>
          <option value="16px">16</option>
          <option value="18px">18</option>
          <option value="24px">24</option>
        </select>
        {/* Heading level */}
        <select
          value={
            editor.isActive("heading", { level: 1 }) ? "1" :
            editor.isActive("heading", { level: 2 }) ? "2" :
            editor.isActive("heading", { level: 3 }) ? "3" : ""
          }
          onChange={(e) => {
            const v = e.target.value;
            if (v) editor.chain().focus().setHeading({ level: Number(v) as 1 | 2 | 3 }).run();
            else editor.chain().focus().setParagraph().run();
          }}
          className="h-8 min-w-0 max-w-[100px] rounded border border-border/60 bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          title="Heading level"
          aria-label="Heading level"
        >
          <option value="">Paragraph</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>
        <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`rounded p-1.5 ${editor.isActive("bold") ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          title="Bold"
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`rounded p-1.5 ${editor.isActive("italic") ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          title="Italic"
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`rounded p-1.5 ${editor.isActive("bulletList") ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          title="Bullet list"
          aria-label="Bullet list"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`rounded p-1.5 ${editor.isActive("orderedList") ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          title="Numbered list"
          aria-label="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`rounded p-1.5 ${editor.isActive("blockquote") ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          title="Quote"
          aria-label="Quote"
        >
          <Quote className="h-4 w-4" />
        </button>
        <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
          title="Undo"
          aria-label="Undo"
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
          title="Redo"
          aria-label="Redo"
        >
          <Redo className="h-4 w-4" />
        </button>
        
      </div>
      <div className="flex flex-1 overflow-hidden min-h-0">
        {showOutline && outlineOpen && (
          <nav className="w-56 shrink-0 border-r border-border/60 bg-muted/20 overflow-y-auto py-2 px-1">
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Outline</p>
            {headings.map((h, i) => (
              <button
                key={h.id + i}
                type="button"
                onClick={() => scrollToHeading(editor, h.text, h.level)}
                className="flex w-full rounded px-2 py-1 text-left text-xs text-foreground/80 hover:bg-muted hover:text-foreground transition-colors truncate"
                style={{ paddingLeft: `${(h.level - 1) * 12 + 8}px` }}
                title={h.text}
              >
                <span className="truncate">{h.text}</span>
              </button>
            ))}
          </nav>
        )}
        <div className="flex-1 overflow-y-auto">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

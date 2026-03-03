import { Extension } from "@tiptap/core";

export type FontWeightOptions = {
  types: string[];
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontWeight: {
      setFontWeight: (fontWeight: string) => ReturnType;
      unsetFontWeight: () => ReturnType;
    }
  }
}

/**
 * Extension to set font-weight on text (uses textStyle mark).
 * Requires @tiptap/extension-text-style (TextStyle).
 */
export const FontWeight = Extension.create<FontWeightOptions>({
  name: "fontWeight",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontWeight: {
            default: null,
            parseHTML: (element) => element.style.fontWeight || null,
            renderHTML: (attributes) => {
              if (!attributes.fontWeight) return {};
              return { style: `font-weight: ${attributes.fontWeight}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontWeight:
        (fontWeight) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontWeight }).run(),
      unsetFontWeight:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontWeight: null }).removeEmptyTextStyle().run(),
    };
  },
});

// =============================================================================
// Model catalog helpers — pure, no server-only deps.
// -----------------------------------------------------------------------------
// Shared by the server route (/api/experts/models) and client code (model
// picker, message bubble). Turns raw LiteLLM proxy model ids into friendly,
// display-ready options, filters out non-chat models, and ranks frontier
// families first so the latest models surface at the top of the picker.
// =============================================================================

export interface ModelOption {
  id: string;
  label: string;
  short: string;
  provider: string;
  blurb: string;
  hue: string;
  paid?: boolean;
}

interface Family {
  test: RegExp;
  provider: string;
  hue: string;
  /** Lower = more "frontier"; sorted to the top of the picker. */
  rank: number;
  paid?: boolean;
}

// Order matters — the first match wins, so more specific tiers come first.
const FAMILIES: Family[] = [
  { test: /opus/i, provider: "Anthropic", hue: "#c2410c", rank: 0, paid: true },
  { test: /gpt-?5|^o[1-9]|\bo[1-9]\b/i, provider: "OpenAI", hue: "#3b7a9e", rank: 0, paid: true },
  { test: /gemini-?(2|3|1\.5).*pro|gemini-?(2|3)/i, provider: "Google", hue: "#1a73e8", rank: 1, paid: true },
  { test: /sonnet/i, provider: "Anthropic", hue: "#b45309", rank: 1, paid: true },
  { test: /grok/i, provider: "xAI", hue: "#111827", rank: 2 },
  { test: /deepseek/i, provider: "DeepSeek", hue: "#4338ca", rank: 2 },
  { test: /gemini/i, provider: "Google", hue: "#1a73e8", rank: 3 },
  { test: /claude|haiku/i, provider: "Anthropic", hue: "#b45309", rank: 3, paid: true },
  { test: /gpt|chatgpt/i, provider: "OpenAI", hue: "#3b7a9e", rank: 3 },
  { test: /kimi|moonshot/i, provider: "Moonshot", hue: "#7c3aed", rank: 4 },
  { test: /llama/i, provider: "Meta", hue: "#0866ff", rank: 4 },
  { test: /mistral|mixtral|magistral|ministral|codestral/i, provider: "Mistral", hue: "#ea580c", rank: 5 },
  { test: /qwen/i, provider: "Alibaba", hue: "#6d28d9", rank: 5 },
  { test: /command|cohere/i, provider: "Cohere", hue: "#39594d", rank: 6 },
  { test: /phi-?[0-9]/i, provider: "Microsoft", hue: "#0f766e", rank: 6 },
  { test: /jamba/i, provider: "AI21", hue: "#1f6feb", rank: 6 },
  { test: /nova/i, provider: "Amazon", hue: "#ff9900", rank: 6 },
];

// Models that aren't conversational — embeddings, audio, image, safety, rerank.
const NON_CHAT =
  /(embed|embedding|whisper|tts|text-to-speech|\bspeech\b|audio|transcrib|rerank|reranker|moderation|guard|dall|\bimage\b|stable-diffusion|sdxl|\bflux\b|\bbge\b|\bgte\b|nomic)/i;

export function isChatModel(id: string): boolean {
  return !NON_CHAT.test(id);
}

function familyFor(id: string): Family | undefined {
  return FAMILIES.find((f) => f.test.test(id));
}

export function rankModel(id: string): number {
  return familyFor(id)?.rank ?? 9;
}

/** Frontier families first, then alphabetical. */
export function sortModels(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const ra = rankModel(a);
    const rb = rankModel(b);
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
}

const ACRONYMS: Record<string, string> = {
  gpt: "GPT",
  ai: "AI",
  llm: "LLM",
  oss: "OSS",
  k2: "K2",
  v2: "V2",
  v3: "V3",
  r1: "R1",
  hd: "HD",
};

// Strip provider prefixes ("anthropic/", "bedrock/…"), trailing date/version
// stamps, and title-case the remainder into something humans recognize.
function prettify(id: string): string {
  let s = id.includes("/") ? id.slice(id.lastIndexOf("/") + 1) : id;
  s = s
    .replace(/[-_]?\d{4}-\d{2}-\d{2}$/i, "")
    .replace(/[-_]?\d{8}$/i, "")
    .replace(/[-_](latest|preview|exp|beta)$/i, "");

  // Merge consecutive integer tokens into a dotted version: 4-5 → "4.5".
  const merged: string[] = [];
  for (const p of s.split(/[-_]/).filter(Boolean)) {
    const prev = merged[merged.length - 1];
    if (/^\d+$/.test(p) && prev && /^\d+(\.\d+)*$/.test(prev)) {
      merged[merged.length - 1] = `${prev}.${p}`;
    } else {
      merged.push(p);
    }
  }

  const pretty = merged
    .map((p) => {
      const low = p.toLowerCase();
      if (ACRONYMS[low]) return ACRONYMS[low];
      if (/^\d/.test(p)) return p; // version-ish token, keep as-is
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(" ");
  return pretty || id;
}

export function describeModel(id: string): ModelOption {
  const fam = familyFor(id);
  const label = prettify(id);
  return {
    id,
    label,
    short: label,
    provider: fam?.provider ?? "Model",
    blurb: fam
      ? `${fam.provider} · served via the LiteLLM gateway.`
      : "Served via the LiteLLM gateway.",
    hue: fam?.hue ?? "#475569",
    paid: fam?.paid,
  };
}

/** Build the curated, display-ready option list from raw proxy model ids. */
export function buildModelOptions(ids: string[]): ModelOption[] {
  const seen = new Set<string>();
  const chat = ids.filter((id) => {
    if (!id || seen.has(id) || !isChatModel(id)) return false;
    seen.add(id);
    return true;
  });
  return sortModels(chat).map(describeModel);
}

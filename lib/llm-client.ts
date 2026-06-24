/**
 * Client-side LLM utility for the static export.
 *
 * In local dev the prototype can use the Next.js API route at
 * /api/workflows/generate (server-side, key stays hidden). In a static
 * deploy (S3/CloudFront) that route doesn't exist, so this module calls
 * the GenAI Gateway directly from the browser.
 *
 * The gateway URL and key are read from NEXT_PUBLIC_ env vars which
 * Next.js inlines at build time. For the internal dev prototype this is
 * acceptable — the key is a dev-environment token, not a production secret.
 */

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LLMResult {
  content: string;
  model: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

const getBaseUrl = () =>
  (process.env.NEXT_PUBLIC_LITELLM_BASE_URL ?? "").replace(/\/+$/, "");

const getApiKey = () =>
  process.env.NEXT_PUBLIC_LITELLM_API_KEY ?? "";

const getDefaultModel = () =>
  process.env.NEXT_PUBLIC_LITELLM_DEFAULT_MODEL ?? "gpt-4.1";

export function isClientLLMConfigured(): boolean {
  return Boolean(getBaseUrl() && getApiKey());
}

export async function callClientLLM(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<LLMResult> {
  const baseUrl = getBaseUrl();
  const url = baseUrl.endsWith("/chat/completions")
    ? baseUrl
    : `${baseUrl}/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: getDefaultModel(),
      messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 4000,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`LLM request failed (${res.status}): ${detail.slice(0, 500)}`);
  }

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  if (!content) {
    throw new Error("LLM returned an empty completion.");
  }

  return {
    content,
    model: data?.model ?? getDefaultModel(),
    usage: data?.usage,
  };
}

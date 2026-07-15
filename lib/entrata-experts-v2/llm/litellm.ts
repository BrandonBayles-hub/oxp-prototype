/**
 * Server-side LiteLLM proxy client.
 *
 * This module reads server-only env vars (LITELLM_*) and talks to a LiteLLM
 * proxy using the OpenAI-compatible Chat Completions API. It must only be
 * imported from server code (the /api/experts/chat route handler) so the API
 * key never reaches the browser.
 */
import type { ModelId } from "../types";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function isLiteLLMConfigured(): boolean {
  return Boolean(process.env.LITELLM_API_KEY && process.env.LITELLM_BASE_URL);
}

/**
 * Map an Entrata Analyst model-picker id to a concrete proxy model name.
 *
 * - "auto" / empty           → LITELLM_DEFAULT_MODEL
 * - legacy curated ids       → their env mapping (back-compat with the static list)
 * - any other id             → passed straight through (it IS a live proxy model
 *                              id selected from the LiteLLM /models catalog)
 */
export function resolveModel(model: ModelId | undefined): string {
  const def = process.env.LITELLM_DEFAULT_MODEL || "";
  if (!model || model === "auto") return def;
  switch (model) {
    case "opus-4-7":
      return process.env.LITELLM_MODEL_OPUS || def;
    case "gpt-5-5":
      return process.env.LITELLM_MODEL_GPT || def;
    case "kimi-k2-5":
      return process.env.LITELLM_MODEL_KIMI || def;
    default:
      return model;
  }
}

function completionsUrl(): string {
  const base = (process.env.LITELLM_BASE_URL || "").replace(/\/+$/, "");
  if (base.endsWith("/chat/completions")) return base;
  return `${base}/chat/completions`;
}

function modelsUrl(): string {
  const base = (process.env.LITELLM_BASE_URL || "").replace(/\/+$/, "");
  if (base.endsWith("/models")) return base;
  return `${base}/models`;
}

/**
 * List the model ids the LiteLLM proxy currently serves (OpenAI-compatible
 * GET /models). Throws on misconfiguration, network failure, or non-2xx.
 */
export async function listLiteLLMModels(
  opts: { signal?: AbortSignal } = {},
): Promise<string[]> {
  if (!isLiteLLMConfigured()) {
    throw new Error("LiteLLM is not configured (missing LITELLM_API_KEY or LITELLM_BASE_URL).");
  }

  const res = await fetch(modelsUrl(), {
    method: "GET",
    headers: { Authorization: `Bearer ${process.env.LITELLM_API_KEY}` },
    signal: opts.signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`LiteLLM models request failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = await res.json().catch(() => null);
  const list: unknown[] = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
      ? data
      : [];
  const ids = list
    .map((m) => (typeof m === "string" ? m : (m as { id?: unknown })?.id))
    .filter((x): x is string => typeof x === "string" && x.length > 0);
  return Array.from(new Set(ids));
}

export interface LiteLLMResult {
  content: string;
  model: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

/**
 * Call the LiteLLM proxy and return the assistant message content.
 * Throws on misconfiguration, network failure, or a non-2xx response.
 */
export async function callLiteLLM(
  messages: ChatMessage[],
  opts: { model?: ModelId; temperature?: number; maxTokens?: number; signal?: AbortSignal } = {},
): Promise<LiteLLMResult> {
  if (!isLiteLLMConfigured()) {
    throw new Error("LiteLLM is not configured (missing LITELLM_API_KEY or LITELLM_BASE_URL).");
  }

  const model = resolveModel(opts.model);
  if (!model) {
    throw new Error("No model resolved (set LITELLM_DEFAULT_MODEL or a model mapping).");
  }

  const res = await fetch(completionsUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LITELLM_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 1600,
      response_format: { type: "json_object" },
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`LiteLLM request failed (${res.status}): ${detail.slice(0, 500)}`);
  }

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  if (!content) {
    throw new Error("LiteLLM returned an empty completion.");
  }

  return {
    content,
    model: data?.model ?? model,
    usage: data?.usage,
  };
}

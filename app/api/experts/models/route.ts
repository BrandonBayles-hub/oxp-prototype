import { NextResponse } from "next/server";
import {
  isLiteLLMConfigured,
  listLiteLLMModels,
} from "@/lib/entrata-experts-v2/llm/litellm";
import { buildModelOptions } from "@/lib/entrata-experts-v2/llm/model-catalog";

// Server runtime: holds the API key + proxies the LiteLLM /models endpoint.
// Incompatible with `output: "export"` — see next.config.ts.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  // No creds → tell the client to fall back to its built-in default model list.
  if (!isLiteLLMConfigured()) {
    return NextResponse.json({ ok: false, reason: "not-configured" });
  }

  try {
    const ids = await listLiteLLMModels();
    const models = buildModelOptions(ids);
    return NextResponse.json({ ok: true, models, count: models.length });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, reason: "error", error }, { status: 502 });
  }
}

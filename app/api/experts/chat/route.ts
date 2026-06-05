import { NextResponse } from "next/server";
import {
  callLiteLLM,
  isLiteLLMConfigured,
  type ChatMessage,
} from "@/lib/entrata-experts-v2/llm/litellm";
import {
  buildSystemPrompt,
  normalizeAnalystResponse,
} from "@/lib/entrata-experts-v2/llm/analyst";
import type { Depth, LensId, ModelId, RoleId, Scope } from "@/lib/entrata-experts-v2/types";

// This route needs a server runtime (it holds the API key + proxies LiteLLM).
// It is intentionally incompatible with `output: "export"` — see next.config.ts.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ChatRequestBody {
  prompt: string;
  lens?: LensId;
  depth?: Depth;
  model?: ModelId;
  role?: RoleId;
  scope?: Scope;
  messages?: { role: "user" | "assistant"; content: string }[];
}

const DEFAULT_SCOPE: Scope = { kind: "portfolio", id: "portfolio", label: "Whole portfolio" };

export async function POST(req: Request) {
  // No creds → tell the client to fall back to its built-in mock answers.
  if (!isLiteLLMConfigured()) {
    return NextResponse.json({ ok: false, reason: "not-configured" });
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad-request", error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = (body.prompt ?? "").trim();
  if (!prompt) {
    return NextResponse.json({ ok: false, reason: "bad-request", error: "Missing prompt." }, { status: 400 });
  }

  const lens: LensId = body.lens ?? "auto";
  const depth: Depth = body.depth ?? "auto";
  const model: ModelId = body.model ?? "auto";
  const role: RoleId = body.role ?? "vp-ops";
  const scope: Scope = body.scope ?? DEFAULT_SCOPE;

  const system = buildSystemPrompt({ lens, depth, role, scope });

  const history: ChatMessage[] = Array.isArray(body.messages)
    ? body.messages
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-10) // keep the last few turns for context
        .map((m) => ({ role: m.role, content: m.content }))
    : [];

  const messages: ChatMessage[] = [
    { role: "system", content: system },
    ...history,
    { role: "user", content: prompt },
  ];

  try {
    const result = await callLiteLLM(messages, { model, temperature: 0.2 });
    const message = normalizeAnalystResponse(result.content, { lens, depth, model, scope });
    return NextResponse.json({
      ok: true,
      message,
      meta: { model: result.model, usage: result.usage ?? null },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    // Surface the failure but let the client decide to fall back to mock.
    return NextResponse.json({ ok: false, reason: "error", error }, { status: 502 });
  }
}

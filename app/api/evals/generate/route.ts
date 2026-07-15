import { NextResponse } from "next/server";
import {
  callLiteLLM,
  isLiteLLMConfigured,
  type ChatMessage,
} from "@/lib/entrata-experts-v2/llm/litellm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EVAL_SYSTEM_PROMPT = `You are a QA engineer for Entrata, a property management platform.
Given an agent's name, description, type, and any additional context (triggers, MCP tools, guardrails),
generate 5-8 realistic eval (test) cases that verify the agent behaves correctly.

## Output Format
Return a JSON object with this exact structure:
{
  "evals": [
    {
      "input": "A realistic scenario or input the agent would receive",
      "expected": "The expected correct behavior or output",
      "severity": "critical" | "major" | "minor",
      "tags": ["tag1", "tag2"]
    }
  ]
}

## Rules
1. Include at least 2 "critical" severity cases (happy path + most dangerous failure).
2. Include at least 1 compliance/guardrail test (fair housing, PII, etc.).
3. Include at least 1 edge case (empty input, duplicate data, timeout, etc.).
4. Make inputs specific and realistic for property management.
5. Expected outcomes should be precise and testable, not vague.
6. Tags should reflect the scenario category (e.g., "happy-path", "escalation", "edge-case", "compliance").
7. Return ONLY the JSON object — no markdown, no explanation.`;

interface RequestBody {
  name: string;
  description: string;
  type: "deterministic" | "ai-powered";
  triggers?: string[];
  mcpTools?: string[];
}

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  if (!body.name || !body.description) {
    return NextResponse.json(
      { ok: false, error: "Missing name or description." },
      { status: 400 },
    );
  }

  if (!isLiteLLMConfigured()) {
    return NextResponse.json(
      { ok: false, reason: "not-configured" },
      { status: 503 },
    );
  }

  let userPrompt = `Generate eval cases for this ${body.type} agent:\n\n`;
  userPrompt += `**Name:** ${body.name}\n`;
  userPrompt += `**Description:** ${body.description}\n`;
  userPrompt += `**Type:** ${body.type === "deterministic" ? "Deterministic workflow (same output every run)" : "AI-powered (LLM-driven, output varies)"}\n`;

  if (body.triggers?.length) {
    userPrompt += `**Triggers:** ${body.triggers.join(", ")}\n`;
  }
  if (body.mcpTools?.length) {
    userPrompt += `**MCP Tools used:** ${body.mcpTools.join(", ")}\n`;
  }

  const messages: ChatMessage[] = [
    { role: "system", content: EVAL_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  try {
    const result = await callLiteLLM(messages, {
      temperature: 0.3,
      maxTokens: 2000,
    });

    let parsed;
    try {
      parsed = JSON.parse(result.content);
    } catch {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse eval JSON from LLM response.");
      }
    }

    const evals = (parsed.evals || parsed).map(
      (e: Record<string, unknown>, i: number) => ({
        id: `eval-llm-${Date.now()}-${i}`,
        input: String(e.input || ""),
        expected: String(e.expected || ""),
        severity: ["critical", "major", "minor"].includes(String(e.severity))
          ? e.severity
          : "major",
        tags: Array.isArray(e.tags) ? e.tags.map(String) : [],
        status: "not_run",
      }),
    );

    return NextResponse.json({
      ok: true,
      evals,
      meta: { model: result.model, usage: result.usage ?? null },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { ok: false, reason: "error", error },
      { status: 502 },
    );
  }
}

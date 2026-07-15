/**
 * Chat turn types and stub transport for the frontend-only simulator.
 * Signatures are preserved so callers don't break; no network calls are made.
 */

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ChatToolCall = {
  tool: string;
  args: Record<string, unknown>;
  result: { output: string };
};

export type ChatTurnResult = {
  reply: string;
  toolCalls: ChatToolCall[];
};

export async function sendAgentTurn(opts: {
  systemPrompt: string;
  history: ChatTurn[];
  callerMessage: string;
  /** @deprecated No longer used — kept for caller compatibility. */
  agentId?: string | null;
  model?: string;
  signal?: AbortSignal;
}): Promise<ChatTurnResult> {
  void opts;
  return {
    reply: "This is a demo response from the simulator.",
    toolCalls: [],
  };
}

export async function isBackendReachable(_signal?: AbortSignal): Promise<boolean> {
  return false;
}

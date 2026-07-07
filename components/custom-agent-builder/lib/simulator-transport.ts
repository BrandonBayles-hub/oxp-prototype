/**
 * Simulator transport — the single place every simulator surface goes to get
 * an agent reply. This prototype is frontend-only; replies come from the
 * built-in demo responder so authors can always type and get a reply back.
 */

import type { ChatTurn, ChatToolCall } from "./agent-chat-client";
import { demoReply } from "./simulator-demo-responder";

export type SimulatorReplyInput = {
  systemPrompt: string;
  history: ChatTurn[];
  callerMessage: string;
  /** @deprecated No longer used — kept for caller compatibility. */
  backendAgentId?: string | null;
  /**
   * Customer-facing agent name, used by the demo responder for natural
   * greetings ("Hi, this is Riley…"). Defaults to "the agent".
   */
  personaName?: string;
  /** Tunes demo responder register (email = formal, voice = spoken). */
  channel?: "sms" | "email" | "voice" | "chat";
  signal?: AbortSignal;
};

export type SimulatorReply = {
  reply: string;
  toolCalls: ChatToolCall[];
  /** Which provider actually produced the reply. Surfaced in the UI badge. */
  source: "backend" | "openai" | "demo";
  /**
   * Non-fatal error messages that were swallowed on the way to a successful
   * reply — useful for a tooltip/debug strip. Empty on clean success.
   */
  warnings: string[];
};

/**
 * Fetch a reply from the built-in demo responder. This is the only call the
 * UI layer should make for an agent turn.
 */
export async function fetchSimulatorReply(
  input: SimulatorReplyInput
): Promise<SimulatorReply> {
  void input.signal;
  const reply = demoReply({
    systemPrompt: input.systemPrompt,
    history: input.history,
    callerMessage: input.callerMessage,
    personaName: input.personaName ?? "the agent",
    channel: input.channel,
  });
  return { reply, toolCalls: [], source: "demo", warnings: [] };
}

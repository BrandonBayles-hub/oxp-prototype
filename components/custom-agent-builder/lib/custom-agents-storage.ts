/**
 * Tiny, dependency-free module exposing the localStorage key used by the
 * CustomAgentsProvider. Split out from `custom-agents-context.tsx` so that
 * lightweight consumers (e.g. the Agent Roster listing) can read the raw
 * persisted payload without dragging the full provider — and its cost /
 * evals / forking helpers — into the main bundle.
 *
 * Keep this file side-effect free and dependency-free so it stays cheap
 * to import from anywhere.
 */
export const CUSTOM_AGENTS_STORAGE_KEY = "oxp-custom-agents-v8";

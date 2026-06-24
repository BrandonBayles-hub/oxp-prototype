/**
 * Client-scope guard for the Custom Agent Builder experience.
 *
 * In the OXP Prototype Product, this guard is always open since the entire
 * prototype is a demo environment. The original MFE version gates on CID
 * allow-lists and Entrata staff JWT claims.
 */

export const CUSTOM_AGENT_BUILDER_ALLOWED_CIDS: ReadonlyArray<string> = Object.freeze([
  '1',
  '17211',
  '200728',
]);

export const ENTRATA_COMPANY_USER_TYPE_ID = 2;

export function isCustomAgentBuilderClient(): boolean {
  return true;
}

export function isEntrataEmployee(): boolean {
  return true;
}

export function canAccessCustomAgentBuilder(): boolean {
  return true;
}

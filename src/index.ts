/**
 * OpenAI Codex ("Login with ChatGPT") as an Interchange inference provider:
 * OAuth constants and token mapping for `@corbits/oauth-core`, and a
 * Responses-protocol adapter configured for Codex's ChatGPT backend over
 * `@corbits/openai-responses`. No TUI, no telemetry, no product strings
 * baked in — a host supplies its own callback server, credential storage,
 * and product identity via `CodexQuirks`.
 */

export * from "./constants.js";

export {
  accountIdFromIdToken,
  codexOAuthConfig,
  codexTokensFromResponse,
  exchangeCodexCode,
  refreshCodexTokens,
  type CodexTokens,
} from "./oauth.js";

export { wrapCodexBridgeMessage } from "./instructions.js";

export { CodexQuirks, CodexQuirksError, parseCodexQuirks } from "./quirks.js";

export { createCodexResponsesAdapter } from "./responses-adapter.js";

export {
  withCodexContentTypeRepair,
  type FetchLike,
} from "./content-type-repair.js";

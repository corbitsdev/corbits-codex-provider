import {
  responsesAdapterFactory,
  type ResponsesHooks,
  type ResponsesQuirks,
} from "@corbits/openai-responses";
import type { AdapterFactory } from "@intx/inference";
import type { InferenceEffort, InferenceOptions } from "@intx/types/runtime";
import {
  CODEX_ACCOUNT_ID_OPTION,
  CODEX_ORIGINATOR,
  CODEX_REASONING_EFFORT_OPTION,
  CODEX_RESPONSES_PATH,
  CODEX_SESSION_ID_OPTION,
} from "./constants.js";
import { wrapCodexBridgeMessage } from "./instructions.js";
import { parseCodexQuirks, type CodexQuirks } from "./quirks.js";

// `store` and `parallelToolCalls` need an explicit `false` on the wire, and
// `maxOutputTokens: false` because the backend 400s on `max_output_tokens`.
function codexResponsesQuirks(quirks: CodexQuirks): ResponsesQuirks {
  return {
    path: CODEX_RESPONSES_PATH,
    headers: {
      static: {
        "openai-beta": "responses=experimental",
        originator: CODEX_ORIGINATOR,
        ...(quirks.accountId !== undefined
          ? { "chatgpt-account-id": quirks.accountId }
          : {}),
      },
      fromOption: [
        { optionKey: CODEX_ACCOUNT_ID_OPTION, header: "chatgpt-account-id" },
      ],
    },
    sessionIdOption: CODEX_SESSION_ID_OPTION,
    sessionIdHeader: "session_id",
    systemPrompt: { role: "developer", shape: "parts" },
    contentShape: "typed",
    store: false,
    parallelToolCalls: false,
    maxOutputTokens: false,
    reasoning: {
      effortOption: CODEX_REASONING_EFFORT_OPTION,
    },
  };
}

// `reasoning.effort` is suppressed for "none" because ChatGPT Codex rejects
// `summary: "auto"` for some model families (HTTP 400), and the CLI's own
// default reasoning summary is "none", so no `summary` field is sent at all.
function codexResponsesHooks(quirks: CodexQuirks): ResponsesHooks {
  return {
    wrapSystemPrompt: (systemPrompt: string) =>
      wrapCodexBridgeMessage(systemPrompt, quirks),
    includeReasoningEffort: (effort: string) => effort !== "none",
  };
}

// The highest reasoning level each model lists, from the same catalog as
// `CODEX_DEFAULT_MODELS` (`supported_reasoning_levels`). `ultra` sits above
// `max` on some models but is not the neutral `max`. A model missing here,
// including `gpt-6.1`, which that catalog does not list, sends `high`.
const CODEX_MAX_EFFORT: Readonly<Record<string, "max" | "xhigh">> = {
  "gpt-6.1-sol": "max",
  "gpt-6-astra": "max",
  "gpt-6-sol": "max",
  "gpt-6-luna": "max",
  "gpt-5.6-sol": "max",
  "gpt-5.6-terra": "max",
  "gpt-5.6-luna": "max",
  "gpt-5.5": "xhigh",
};

function codexEffort(
  model: string,
  effort: InferenceEffort,
): InferenceEffort | "xhigh" {
  return effort === "max" ? (CODEX_MAX_EFFORT[model] ?? "high") : effort;
}

// Interchange's neutral `effort` becomes the effort option the request
// builder reads, unless the caller already set that option to a non-empty
// string, which is the only value the builder sends.
function withNeutralEffort(
  model: string,
  options: InferenceOptions,
): InferenceOptions {
  const explicit = options.providerOptions?.[CODEX_REASONING_EFFORT_OPTION];
  if (
    options.effort === undefined ||
    (typeof explicit === "string" && explicit.length > 0)
  )
    return options;
  return {
    ...options,
    providerOptions: {
      ...options.providerOptions,
      [CODEX_REASONING_EFFORT_OPTION]: codexEffort(model, options.effort),
    },
  };
}

/**
 * `AdapterFactory` for Codex's Responses-speaking ChatGPT backend. `quirks`
 * is this package's own {@link CodexQuirks} (an `InferenceSource.quirks`
 * bag) carrying the host identity `wrapCodexBridgeMessage` needs and the
 * optional `chatgpt-account-id`; unlike
 * `@corbits/openai-responses`'s own quirks, an absent bag is a validation
 * error rather than a default, since there is no honest generic product
 * name to fall back to. This shape — `(source, quirks?)` — is what makes
 * the adapter loadable from an Interchange `AdapterManifest` entry.
 */
export const createCodexResponsesAdapter: AdapterFactory = (source, quirks) => {
  const parsed = parseCodexQuirks(quirks);
  const adapter = responsesAdapterFactory(
    codexResponsesQuirks(parsed),
    codexResponsesHooks(parsed),
  )(source);
  return {
    ...adapter,
    buildRequest: (messages, model, options) =>
      adapter.buildRequest(messages, model, withNeutralEffort(model, options)),
  };
};

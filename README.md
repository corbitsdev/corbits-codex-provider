# @corbits/codex-provider

OpenAI Codex ("Login with ChatGPT") for `@intx/inference`: the OAuth client config and token mapping for `@corbits/oauth-core`, and a Responses API adapter for Codex's ChatGPT backend built on `@corbits/openai-responses`. An inference provider for Corbits and Interchange agents that also works in any host that runs `@intx/inference`.

## Why @corbits/codex-provider?

1. **Inference on a ChatGPT subscription.** Codex has no API-key path. This package supplies the PKCE login config, the code exchange and refresh, and the `chatgpt-account-id` the backend requires on every request.
2. **The exact request Codex accepts.** `store: false`, `parallel_tool_calls: false`, no `max_output_tokens`, the host prompt as a leading `developer` message, and the Codex CLI's `originator` header are fixed in the adapter, not left to each host.
3. **Backend bugs repaired, host identity required.** `withCodexContentTypeRepair` restores the `content-type` the backend drops on some SSE streams. The host names itself through `CodexQuirks`; there is no default product name.

## Install

```bash
bun add @corbits/codex-provider @corbits/oauth-core@^0.1.0 @corbits/openai-responses@^0.1.0 @intx/inference@^0.4.0 @intx/types@^0.4.0
```

Runs on Bun >= 1.2 or Node >= 24.

## Quickstart

Needs `CODEX_ACCESS_TOKEN` and `CODEX_ACCOUNT_ID` from a completed "Login with ChatGPT".

```ts
import { createDefaultScheduler, runInference } from "@intx/inference";
import {
  CODEX_ACCOUNT_ID_OPTION,
  CODEX_BASE_URL,
  CODEX_PROVIDER,
  createCodexResponsesAdapter,
  withCodexContentTypeRepair,
} from "@corbits/codex-provider";

const accountId = process.env["CODEX_ACCOUNT_ID"];
if (accountId === undefined) throw new Error("CODEX_ACCOUNT_ID is not set");

// createDependencies binds the global fetch, so build deps directly to
// install the content-type repair.
const deps = {
  fetch: withCodexContentTypeRepair(fetch),
  scheduler: createDefaultScheduler(),
  adapters: {
    has: (provider: string) => provider === CODEX_PROVIDER,
    resolve: createCodexResponsesAdapter,
  },
};

let seq = 0;
for await (const event of runInference({
  deps,
  source: {
    id: "codex",
    provider: CODEX_PROVIDER,
    baseURL: CODEX_BASE_URL,
    credentialId: "CODEX_ACCESS_TOKEN",
    model: "gpt-5.5",
    quirks: { productName: "My Agent", environmentTagName: "my_agent_env" },
  },
  turns: [
    {
      role: "user",
      timestamp: Date.now(),
      content: [{ type: "text", text: "Say hello." }],
    },
  ],
  inferenceOptions: {
    providerOptions: { [CODEX_ACCOUNT_ID_OPTION]: accountId },
  },
  nextSeq: () => seq++,
  readMaterial: (id) => {
    const secret = process.env[id];
    if (secret === undefined) throw new Error(`${id} is not set`);
    return { secret };
  },
})) {
  if (event.type === "inference.text.delta")
    process.stdout.write(event.data.token);
  if (event.type === "inference.error")
    throw new Error(event.data.error.message);
}
process.stdout.write("\n");
```

## Where it fits

[Interchange](https://github.com/faremeter/interchange) runs AI agents as principals (accounts that hold their own identity, permissions and credentials). Corbits packages add what an agent product needs around it.

- **Runs in:** the agent sidecar (the runtime next to each agent) for inference, and the hub (the multi-tenant control plane) for login and token refresh.
- **Plugs into:** the [`@intx/inference`](https://github.com/faremeter/interchange/tree/main/packages/inference) adapter registry, as the factory for the `codex` provider id.
- **Pairs with:** [`@corbits/oauth-core`](https://github.com/corbitsdev/corbits-oauth-core) for login and refresh, and [`@corbits/openai-responses`](https://github.com/corbitsdev/corbits-openai-responses), the wire protocol underneath.

## Reference

| Export                                                     | Description                                                                                                          |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `createCodexResponsesAdapter`                              | `AdapterFactory`. Validates the source's `quirks` as `CodexQuirks` and throws `CodexQuirksError` when absent.        |
| `withCodexContentTypeRepair(fetch)`                        | Wraps `fetch` to restore a missing `content-type` on 2xx `/codex/responses` responses from the request's `accept`.   |
| `codexOAuthConfig`                                         | `OAuthClientConfig` for `@corbits/oauth-core`: client id, endpoints, loopback redirect, scopes, extra params.        |
| `exchangeCodexCode(code, verifier, now, fetch?)`           | Redeems an authorization code for `CodexTokens`.                                                                     |
| `refreshCodexTokens(refresh, now, previous?, fetch?)`      | Refreshes `CodexTokens`. Carries `previous.accountId` forward when the response has no `id_token`.                   |
| `codexTokensFromResponse(response, now, previousRefresh?)` | Maps a token endpoint response to `CodexTokens`.                                                                     |
| `accountIdFromIdToken(idToken)`                            | Reads the ChatGPT account id from an `id_token`. Returns `undefined` on malformed input; does not verify signatures. |
| `wrapCodexBridgeMessage(prompt, identity)`                 | The leading `developer` message the adapter builds from the host's system prompt.                                    |
| `CodexQuirks`, `parseCodexQuirks`, `CodexQuirksError`      | Schema, parser and error for `{ productName, environmentTagName }`. Unknown keys are rejected.                       |
| `CodexTokens`, `FetchLike`                                 | Types.                                                                                                               |
| `CODEX_PROVIDER`                                           | The `"codex"` provider id.                                                                                           |
| `CODEX_BASE_URL`, `CODEX_RESPONSES_PATH`                   | `https://chatgpt.com/backend-api` and `/codex/responses`.                                                            |
| `CODEX_ACCOUNT_ID_OPTION`                                  | `providerOptions` key sent as the `chatgpt-account-id` header.                                                       |
| `CODEX_SESSION_ID_OPTION`                                  | `providerOptions` key sent as `prompt_cache_key` and the `session_id` header.                                        |
| `CODEX_REASONING_EFFORT_OPTION`                            | `providerOptions` key sent as `reasoning.effort`; `"none"` omits it.                                                 |
| `CODEX_REFRESH_SKEW_MS`                                    | Refresh this long before expiry.                                                                                     |

The OAuth constants behind `codexOAuthConfig` (`CODEX_CLIENT_ID`, `CODEX_AUTHORIZE_URL`, `CODEX_TOKEN_URL`, `CODEX_REDIRECT_URI`, `CODEX_SCOPES`, `CODEX_AUTHORIZE_EXTRA_PARAMS`, `CODEX_ORIGINATOR`, `CODEX_TOKEN_TIMEOUT_MS`) are exported too.

## Using with Interchange

Register the login on the hub. `@corbits/oauth-core/hub`'s `mountOAuthLogin` and `createOAuthTokenRefresher` take a map of providers; this package supplies the Codex entry. The refresher keeps the stored `accountId` metadata when a refresh response omits `id_token`.

```ts
import type { OAuthLoginProviders } from "@corbits/oauth-core/hub";
import {
  CODEX_PROVIDER,
  codexOAuthConfig,
  exchangeCodexCode,
  refreshCodexTokens,
} from "@corbits/codex-provider";

export const providers: OAuthLoginProviders = {
  [CODEX_PROVIDER]: {
    oauthConfig: codexOAuthConfig,
    exchange: (code, verifier, now) => exchangeCodexCode(code, verifier, now),
    refresh: (refreshSecret, now) => refreshCodexTokens(refreshSecret, now),
    metadata: (tokens) =>
      "accountId" in tokens && typeof tokens.accountId === "string"
        ? { accountId: tokens.accountId }
        : {},
  },
};
```

Load the adapter in the sidecar from an operator-configured `AdapterManifest`, and wrap the harness `fetch` with the content-type repair:

```ts
import { createDefaultScheduler, type AdapterManifest } from "@intx/inference";
import { loadAdapterRegistry } from "@intx/inference/providers";
import { withCodexContentTypeRepair } from "@corbits/codex-provider";

const manifest: AdapterManifest = [
  {
    provider: "codex",
    specifier: "@corbits/codex-provider",
    export: "createCodexResponsesAdapter",
  },
];
export const deps = {
  fetch: withCodexContentTypeRepair(fetch),
  scheduler: createDefaultScheduler(),
  adapters: await loadAdapterRegistry(manifest),
};
```

Each Codex source points at `CODEX_BASE_URL`, uses the OAuth access token as its credential, and carries `quirks: { productName, environmentTagName }` naming the host. Pass the credential's `accountId` metadata as `providerOptions[CODEX_ACCOUNT_ID_OPTION]`.

## License

[LGPL-2.1-only](https://github.com/corbitsdev/corbits-codex-provider/blob/main/LICENSE)

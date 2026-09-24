# @corbits/codex-provider

OpenAI Codex ("Login with ChatGPT") as an Interchange inference provider: OAuth constants and token mapping for `@corbits/oauth-core`, and a Responses adapter for Codex's ChatGPT backend over `@corbits/openai-responses`. Login, token storage, and usage reporting compose in the host from `@corbits/oauth-core`.

## Runtime support

Bun >= 1.2 consumes this package's TypeScript source directly via the `intx-src` export condition. Node >= 24 loads the compiled `dist` output. `@intx/inference` and `@intx/types` are peer dependencies and must resolve to the host's own copy.

## Quickstart

```sh
npm add @corbits/codex-provider
pnpm add @corbits/codex-provider
yarn add @corbits/codex-provider
bun add @corbits/codex-provider
```

### Register the OAuth login

A host mounts "Continue with Codex" through `@corbits/oauth-core/hub`'s `mountOAuthLogin`, which takes a map of `OAuthLoginProviders`. This package supplies one entry for that map — it never runs its own callback server, token store, or refresh loop; `oauth-core` owns all of that.

```ts
import type { OAuthLoginProviders } from "@corbits/oauth-core/hub";
import {
  CODEX_PROVIDER,
  codexOAuthConfig,
  exchangeCodexCode,
  refreshCodexTokens,
} from "@corbits/codex-provider";

const providers: OAuthLoginProviders = {
  [CODEX_PROVIDER]: {
    oauthConfig: codexOAuthConfig,
    exchange: (code, verifier, now) => exchangeCodexCode(code, verifier, now),
    // `refresh` only ever receives the stored refresh secret, so the prior
    // tokens passed here supply just that; refreshCodexTokens carries the
    // account id forward from a caller-supplied `previous` only when the
    // refresh response itself omits `id_token`, which it usually does.
    refresh: (refreshSecret, now) =>
      refreshCodexTokens(refreshSecret, now, {
        access: "",
        refresh: refreshSecret,
      }),
    // The Codex backend rejects inference without this header value.
    metadata: (tokens) =>
      "accountId" in tokens && typeof tokens.accountId === "string"
        ? { accountId: tokens.accountId }
        : {},
  },
  // ...the host's other providers, each contributing one entry the same way.
};
```

Pass `providers` as-is to `mountOAuthLogin` (login route) and to `createOAuthTokenRefresher` (background renewal ahead of expiry) — both live on `@corbits/oauth-core/hub` and own the database, the cipher, and the grant check.

### Register the inference adapter

`CodexQuirks` (`productName`, `environmentTagName`) has no default — an absent bag is a validation error. The ChatGPT backend omits `content-type` on some streamed responses; wrap the host `fetch` with `withCodexContentTypeRepair` so the harness sees SSE.

```ts
import type { AdapterManifest } from "@intx/inference";
import type { LastCycleSource } from "@intx/types/runtime";
import {
  CODEX_PROVIDER,
  createCodexResponsesAdapter,
  withCodexContentTypeRepair,
} from "@corbits/codex-provider";

// Host-owned: register the adapter under the host's provider id.
export const inferenceManifest: AdapterManifest = [
  {
    provider: CODEX_PROVIDER,
    specifier: "@corbits/codex-provider",
    export: "createCodexResponsesAdapter",
  },
];

// Host-owned: the host identity the bridge message needs — never defaulted.
const source: LastCycleSource = {
  sourceId: "codex/1",
  provider: CODEX_PROVIDER,
  model: "gpt-5.5",
};

export const adapter = createCodexResponsesAdapter(source, {
  productName: "My Harness",
  environmentTagName: "my_harness_environment",
});

// Host-owned: wrap the host fetch so SSE streams expose a content-type.
export const hostFetch = withCodexContentTypeRepair(globalThis.fetch);
```

The host's catalog record for a Codex credential points at `CODEX_BASE_URL` with the subscription access token that OAuth login produced.

## How it works

Codex has no API-key path — only the ChatGPT OAuth subscription token. This package identifies as the public Codex CLI (`originator: codex_cli_rs`) because that backend expects that client identity on every inference request. A host operating prompt rides as the leading `developer` message via `wrapCodexBridgeMessage`; there is no `instructions` field.

## Development

```sh
git clone https://github.com/corbitsdev/corbits-codex-provider.git
cd corbits-codex-provider
bun install
bun run typecheck
bun run lint
bun run format:check
bun run test
bun run check
```

`bun run format` rewrites the tree. `bun run check` is typecheck + lint + format:check + test.

## License

LGPL-2.1-only.

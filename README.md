# @corbits/codex-provider

OpenAI Codex ("Login with ChatGPT") as an Interchange inference provider: OAuth constants and token mapping for `@corbits/oauth-core`, and a Responses adapter for Codex's ChatGPT backend over `@corbits/openai-responses`. Login, token storage, and usage reporting compose in the host from `@corbits/oauth-core`.

## Quickstart

Bun >= 1.2 runs the published TypeScript source. Node >= 24 is an engines floor for tooling; native Node does not load this extensionless TypeScript source as-is. `@intx/inference` and `@intx/types` are peer dependencies and must resolve to the host's own copy.

```sh
npm add @corbits/codex-provider
pnpm add @corbits/codex-provider
yarn add @corbits/codex-provider
bun add @corbits/codex-provider
```

Register the adapter under the host's provider id. `CodexQuirks` (`productName`, `environmentTagName`) has no default — an absent bag is a validation error.

```ts
import type { AdapterManifest } from "@intx/inference";
import {
  CODEX_PROVIDER,
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

// Host-owned: wrap the host fetch so SSE streams expose a content-type.
export const hostFetch = withCodexContentTypeRepair(globalThis.fetch);
```

`codexOAuthConfig`, `exchangeCodexCode`, and `refreshCodexTokens` plug into `@corbits/oauth-core`'s `buildAuthorizeUrl`, `exchangeCode`, and `refreshTokenRequest`.

```ts
import type { LastCycleSource } from "@intx/types/runtime";
import {
  CODEX_PROVIDER,
  createCodexResponsesAdapter,
} from "@corbits/codex-provider";

const source: LastCycleSource = {
  sourceId: "codex/1",
  provider: CODEX_PROVIDER,
  model: "gpt-5.5",
};

// Host-owned: the host identity the bridge message needs — never defaulted.
const quirks = {
  productName: "My Harness",
  environmentTagName: "my_harness_environment",
};

export const adapter = createCodexResponsesAdapter(source, quirks);
```

The host's catalog record points at `CODEX_BASE_URL` with the subscription access token. The ChatGPT backend omits `content-type` on some streamed responses; wrap the host `fetch` with `withCodexContentTypeRepair` so the harness sees SSE.

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

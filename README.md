# @corbits/codex-provider

OpenAI Codex ("Login with ChatGPT") as an Interchange inference provider: OAuth constants and token mapping for `@corbits/oauth-core`, and a Responses adapter for Codex's ChatGPT backend over `@corbits/openai-responses`. It does not run login, store tokens, or report usage — the host composes those from `@corbits/oauth-core`.

## Runtime support

Bun >= 1.2 runs the published TypeScript source. Node >= 24 is an engines floor for tooling; native Node does not load this extensionless TypeScript source as-is. `@intx/inference` and `@intx/types` are peer dependencies and must resolve to the host's own copy.

## Quickstart

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
  createCodexResponsesAdapter,
  withCodexContentTypeRepair,
} from "@corbits/codex-provider";

const manifest: AdapterManifest = [
  {
    provider: CODEX_PROVIDER,
    specifier: "@corbits/codex-provider",
    export: "createCodexResponsesAdapter",
  },
];

const fetch = withCodexContentTypeRepair(globalThis.fetch);
void createCodexResponsesAdapter;
void manifest;
void fetch;
```

`codexOAuthConfig`, `exchangeCodexCode`, and `refreshCodexTokens` plug into `@corbits/oauth-core`'s `startOAuthLogin` and `createTokenSession`.

```ts
import type { InferenceSource } from "@intx/types/runtime";
import {
  CODEX_BASE_URL,
  CODEX_PROVIDER,
  createCodexResponsesAdapter,
} from "@corbits/codex-provider";

const source: InferenceSource = {
  id: "codex/1",
  provider: CODEX_PROVIDER,
  baseURL: CODEX_BASE_URL,
  apiKey: "",
  model: "gpt-5.5",
  quirks: {
    productName: "My Harness",
    environmentTagName: "my_harness_environment",
  },
};

const adapter = createCodexResponsesAdapter(source, source.quirks);
void adapter;
```

The ChatGPT backend omits `content-type` on some streamed responses; wrap the host `fetch` with `withCodexContentTypeRepair` so the harness sees SSE.

## How it works

Codex has no API-key path — only the ChatGPT OAuth subscription token. This package identifies as the public Codex CLI (`originator: codex_cli_rs`) because that backend only serves that client. A host operating prompt rides as the leading `developer` message via `wrapCodexBridgeMessage`; there is no `instructions` field.

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

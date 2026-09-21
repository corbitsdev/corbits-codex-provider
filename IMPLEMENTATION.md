# @corbits/codex-provider — Implementation

## Package

- Name: `@corbits/codex-provider`
- Public export: `./src/index.ts` (TypeScript source; no `dist/`)
- License: LGPL-2.1-only
- Dependencies: `@corbits/oauth-core` and `@corbits/openai-responses`
  as `github:` specifiers (never vendored); `arktype` for trust-boundary
  parse.

## Runtime

- Bun >= 1.2 is the development runtime and consumes this package's
  TypeScript source directly.
- Node >= 24 is the engines floor; native Node does not load this
  extensionless TypeScript source as-is.
- Peer dependencies: `@intx/inference` and `@intx/types`. They must
  resolve to the host's own copy.

## Install

```sh
npm add @corbits/codex-provider
pnpm add @corbits/codex-provider
yarn add @corbits/codex-provider
bun add @corbits/codex-provider
```

## Public surface

From `@corbits/codex-provider`:

- `CODEX_PROVIDER` — `"codex"`.
- `CODEX_BASE_URL` — `https://chatgpt.com/backend-api`.
- `CODEX_CLIENT_ID`, `CODEX_AUTHORIZE_URL`, `CODEX_TOKEN_URL`,
  `CODEX_REDIRECT_URI`, `CODEX_SCOPES`, `CODEX_ORIGINATOR`,
  `CODEX_AUTHORIZE_EXTRA_PARAMS`, `CODEX_RESPONSES_PATH`,
  `CODEX_TOKEN_TIMEOUT_MS`, `CODEX_REFRESH_SKEW_MS`.
- `CODEX_ACCOUNT_ID_OPTION` (`codexAccountId`),
  `CODEX_SESSION_ID_OPTION` (`codexSessionId`),
  `CODEX_REASONING_EFFORT_OPTION` (`codexReasoningEffort`).
- `codexOAuthConfig`, `exchangeCodexCode`, `refreshCodexTokens`,
  `codexTokensFromResponse`, `accountIdFromIdToken`, `CodexTokens`.
- `createCodexResponsesAdapter` — `(source, quirks?)` `AdapterFactory`.
- `CodexQuirks`, `parseCodexQuirks`, `CodexQuirksError`.
- `wrapCodexBridgeMessage`.
- `withCodexContentTypeRepair`, `FetchLike`.

Consumers import only this surface.

## Adapter factory

```ts
import type { AdapterManifest } from "@intx/inference";
import {
  CODEX_PROVIDER,
  createCodexResponsesAdapter,
} from "@corbits/codex-provider";

const manifest: AdapterManifest = [
  {
    provider: CODEX_PROVIDER,
    specifier: "@corbits/codex-provider",
    export: "createCodexResponsesAdapter",
  },
];
```

`InferenceSource.quirks` must include `productName` and
`environmentTagName`. The factory bakes Responses quirks:

- path `/codex/responses`
- static headers `openai-beta: responses=experimental` and
  `originator: codex_cli_rs`
- `chatgpt-account-id` from `codexAccountId`
- session header `session_id` from `codexSessionId`
- system prompt as `developer` / parts; `contentShape: "typed"`
- `store: false`, `parallelToolCalls: false`, `maxOutputTokens: false`
- reasoning effort from `codexReasoningEffort`; omitted when `"none"`

## OAuth

```ts
import {
  codexOAuthConfig,
  exchangeCodexCode,
  refreshCodexTokens,
} from "@corbits/codex-provider";
```

- Authorize: `https://auth.openai.com/oauth/authorize`
- Token: `https://auth.openai.com/oauth/token`
- Redirect: `http://localhost:1455/auth/callback` (`localhost`, not
  `127.0.0.1`; the authorization server accepts only this URI)
- Client id `app_EMoamEEZ73f0CkXaXp7hrann` (public, not a secret)
- Extra authorize params: `codex_cli_simplified_flow`,
  `id_token_add_organizations`, `originator: codex_cli_rs`
- Token timeout 15s; refresh skew 60s
- `id_token` claims: `chatgpt_account_id` or nested under
  `https://api.openai.com/auth`

## Wire

Inference: `https://chatgpt.com/backend-api/codex/responses` with the
subscription bearer token. No Chat Completions path.

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

`bun run format` rewrites the tree. `bun run check` is typecheck + lint +
format:check + test.

`bun.lock` is committed. Do not commit a lockfile written against
`bun link` symlinks.

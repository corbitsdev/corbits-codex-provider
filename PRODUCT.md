# @corbits/codex-provider — Product

## What it is

OpenAI Codex ("Login with ChatGPT") as an Interchange inference provider:
OAuth constants and token mapping for `@corbits/oauth-core`, and a
Responses adapter for Codex's ChatGPT backend over
`@corbits/openai-responses`.

## Why it exists

Hosts that already run Interchange need a Codex path without owning the
ChatGPT OAuth dialect or the Responses wire shape. This package supplies
the Codex-specific constants, token mapping, host-identity quirks, and
adapter factory so the host can compose login and storage from
`@corbits/oauth-core` instead of forking the Codex CLI.

## Who it is for

Interchange hosts that resolve `@intx/inference` and `@intx/types`, and
will compose `@corbits/oauth-core` for the login loop, callback server,
and credential store.

## What users can do

- Register `createCodexResponsesAdapter` under provider id `codex`.
- Pass a required `CodexQuirks` bag (`productName`, `environmentTagName`)
  so the operating prompt rides as a host-named bridge message.
- Plug `codexOAuthConfig`, `exchangeCodexCode`, and `refreshCodexTokens`
  into `@corbits/oauth-core`'s `startOAuthLogin` and `createTokenSession`.
- Wrap the host `fetch` with `withCodexContentTypeRepair` so streamed
  Codex responses that omit `Content-Type` still parse as SSE.

## Non-goals

- This package does not run login, store tokens, or report usage.
- There is no API-key path — only the ChatGPT OAuth subscription token.
- No TUI, telemetry, or product strings are baked in. An absent
  `CodexQuirks` bag is a validation error, not a default name.

## License

LGPL-2.1-only.

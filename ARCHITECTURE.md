# @corbits/codex-provider — Architecture

## Shape

This package is Codex-shaped configuration and mapping on top of two
shared packages. It does not reimplement OAuth or the Responses protocol.

```
host (provider id, InferenceSource, CodexQuirks)
        │
        ├─ oauth-core  ←  config, code exchange, refresh
        │
        ▼
createCodexResponsesAdapter(source, quirks)
        │  parseCodexQuirks (required; no default)
        │  bake Responses quirks + wrapSystemPrompt hook
        ▼
@corbits/openai-responses ProviderAdapter
        │
        ▼
ChatGPT Codex Responses backend
        ▲
withCodexContentTypeRepair(fetch)   ← host-applied fetch decorator
```

## Composition

| Concern | Owner |
| --- | --- |
| Login loop, callback server, credential store | Host via `@corbits/oauth-core` |
| OAuth client config and Codex token mapping | This package |
| Responses parse, SSE, replay | `@corbits/openai-responses` |
| Codex wire shape (path, headers, store, tools, max tokens) | This package, baked at adapter construction |
| Host product identity in the operating prompt | `CodexQuirks` → `wrapCodexBridgeMessage` |
| Missing `Content-Type` on some streams | `withCodexContentTypeRepair` (host wraps `fetch`) |

## Provider id

This package registers under `codex`. The host keeps that id in its
adapter manifest and `InferenceSource.provider`.

## Quirks (host identity)

`CodexQuirks` is this package's own bag, not
`@corbits/openai-responses`'s `ResponsesQuirks`. It carries
`productName` and `environmentTagName` for the bridge message. An
absent bag is a validation error: there is no honest generic product
name. Extra keys are rejected.

The Responses-protocol quirks (path, headers, content shape, store,
parallel tool calls, max-output-tokens opt-out, reasoning effort option)
are internal. The host does not supply them; the factory bakes them.

A function-valued wrap (`wrapSystemPrompt`) cannot ride in JSON quirks,
so it is applied as a Responses hook at factory construction.

## Operating prompt

Codex has no `instructions` field. The host operating prompt is the
leading `developer` message, wrapped so the model treats the host as
the harness and reconciles Codex tool names (`apply_patch`,
`update_plan`, `shell`) with whatever the host actually sent. Function
tools on the request are authoritative for names and schemas.

## Client identity

The ChatGPT Codex backend only serves the public Codex CLI client.
This package identifies as that client (`originator: codex_cli_rs`,
public client id, fixed loopback redirect). There is no separate
API-key identity.

## Token mapping

A successful login yields a subscription token plus a ChatGPT account
id decoded from `id_token`. Refresh responses often omit `id_token`;
the previous tokens' account id is carried forward so later requests
do not drop `chatgpt-account-id`.

`accountIdFromIdToken` reads the JWT payload only. It does not verify
the signature: the token arrived from the authorization server over
TLS and is used to label the account, not to authorize. Malformed
input returns undefined rather than throwing.

## Fetch decorator

The backend omits `Content-Type` on some successful streamed responses
while the body is valid SSE. A harness that keys protocol off that
header would fail the turn. The decorator restores `Content-Type` from
the request's `Accept` when the URL is the Codex responses path, the
response is 2xx, the header is absent, and `Accept` names exactly one
of `text/event-stream` or `application/json`. Other responses pass
through.

## Failure modes

- Missing or invalid `CodexQuirks` → `CodexQuirksError` at adapter
  construction.
- Sending `max_output_tokens` → backend HTTP 400 (the factory opts out).
- Reasoning effort `"none"` → no `reasoning.effort` on the wire
  (backend 400s `summary: "auto"` for some model families).
- Authorization server rejects a redirect other than the Codex CLI's
  exact loopback URI.

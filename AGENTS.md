# AGENTS.md

## Purpose

`@corbits/codex-provider` gives an Interchange host a Responses-protocol
adapter and OAuth building blocks for OpenAI Codex ("Login with ChatGPT").
It composes `@corbits/oauth-core` and `@corbits/openai-responses` rather
than reimplementing OAuth or the Responses wire protocol.

## Layout

- `src/constants.ts` — endpoints, client id, headers, timeouts.
- `src/oauth.ts` — `codexOAuthConfig`, `accountIdFromIdToken`, token-response mapping.
- `src/instructions.ts` — the bridge-message wrap for the host's operating prompt.
- `src/quirks.ts` — `CodexQuirks`, the host-identity bag `wrapCodexBridgeMessage` needs.
- `src/responses-adapter.ts` — `createCodexResponsesAdapter`, a plain `(source, quirks?)` `AdapterFactory`.
- `src/content-type-repair.ts` — `withCodexContentTypeRepair`, a fetch decorator for a backend content-type bug.
- `src/index.ts` — the public surface; nothing else is imported by consumers.

## Rules

- Consume `@corbits/oauth-core` and `@corbits/openai-responses` as packages
  (`github:` specifiers) only — never vendor or fork them. `@intx/inference` and
  `@intx/types` are peer dependencies: an adapter must plug into the host's
  own copy of the harness, not a second bundled one.
- Parse every trust boundary with arktype (`CodexQuirks`, id_token claims);
  never `as T` untrusted input.
- `exactOptionalPropertyTypes` is on: omit optional keys, never assign
  `undefined` to them.
- `bun.lock` is committed once `@corbits/oauth-core` and
  `@corbits/openai-responses` are on GitHub; a lockfile written against
  `bun link` symlinks would not resolve for anyone else.
- No product strings baked in; `CodexQuirks` is the only injection point for
  a host's identity, and an absent bag is a validation error, not a default.
- Tests exist only for load-bearing risk: the exact Codex request shape,
  `accountIdFromIdToken` on hostile input, the bridge-message tag structure,
  and the content-type repair's conditions.

## Local development

```sh
bun install
bun run check    # typecheck + lint + format:check + test
```

`@corbits/oauth-core` and `@corbits/openai-responses` resolve from their
GitHub repos, so `bun install` needs those repos pushed. To work against an
unpushed local checkout of either, `bun link` it here; a later `bun install`
re-resolves from git and drops the link.

`CodexQuirks` in `src/quirks.ts` is explicitly typed as `Type<CodexQuirksShape>`
rather than left to inference: a consumer can end up with two resolved
copies of `arktype` on disk, and TypeScript cannot name the inferred type
across that boundary.

## Distribution

The package ships TypeScript source: `exports` points at `src/index.ts`,
there is no build step and no `dist/`. Consumers install it with
`bun add github:corbitsdev/corbits-codex-provider` and Bun runs the source
as-is.

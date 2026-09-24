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

- `@corbits/oauth-core`, `@corbits/openai-responses`, `@intx/inference`,
  and `@intx/types` are peer dependencies (npm semver ranges) — never vendor
  or fork them. An adapter must plug into the host's own copies of the
  harness and its sibling packages, not second bundled ones.
- Parse every trust boundary with arktype (`CodexQuirks`, id_token claims);
  never `as T` untrusted input.
- `exactOptionalPropertyTypes` is on: omit optional keys, never assign
  `undefined` to them.
- `bun.lock` is committed. Never commit a lockfile written against
  `bun link` symlinks — it would not resolve for anyone else.
- No product strings baked in; `CodexQuirks` is the only injection point for
  a host's identity, and an absent bag is a validation error, not a default.
- Relative imports inside `src/` carry explicit `.js` suffixes so the
  compiled `dist/` output resolves under native Node ESM. Never add a
  build-time rewrite script to paper over an extensionless import.
- Tests exist only for load-bearing risk: the exact Codex request shape,
  `accountIdFromIdToken` on hostile input, the bridge-message tag structure,
  and the content-type repair's conditions.

## Local development

```sh
bun install
bun run build    # tsc -p tsconfig.build.json -> dist/
bun run check    # typecheck + lint + format:check + test
```

`@corbits/oauth-core` and `@corbits/openai-responses` resolve from npm, so
`bun install` needs no git access. To work against an unpushed local checkout
of either, `bun link` it here; a later `bun install` re-resolves from the
registry and drops the link.

`CodexQuirks` in `src/quirks.ts` is explicitly typed as `Type<CodexQuirksShape>`
rather than left to inference: a consumer can end up with two resolved
copies of `arktype` on disk, and TypeScript cannot name the inferred type
across that boundary.

## Distribution

The package ships compiled `dist/` on npm as `@corbits/codex-provider`:
`exports` points at `dist/index.js` (types at `dist/index.d.ts`), built with
`bun run build` (`tsc -p tsconfig.build.json`) via the `prepack` hook.
Consumers install the published package (`bun add @corbits/codex-provider`
or `npm install @corbits/codex-provider`) on Bun >= 1.2 or Node.js >= 24,
both of which load the compiled output. Only `dist` ships (`files` is
dist-only).

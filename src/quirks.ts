import { type, type Type } from "arktype";

interface CodexQuirksShape {
  productName: string;
  environmentTagName: string;
  accountId?: string;
}

/**
 * Host identity a Codex bridge message needs and cannot default, plus the
 * optional ChatGPT account the requests are sent for. An absent bag is a
 * validation error — there is no honest generic product name.
 */
export const CodexQuirks: Type<CodexQuirksShape> = type({
  productName: "string",
  environmentTagName: "string",
  // Sent as `chatgpt-account-id` on every request. A catalog source carries
  // no providerOptions, so a deployment states the account here. Visible
  // ASCII only, so a value that is not a valid header fails here rather than
  // on every request.
  "accountId?": /^[\x21-\x7e]+$/,
  "+": "reject",
});
export type CodexQuirks = CodexQuirksShape;

/** Thrown when a `CodexQuirks` bag fails validation (missing host identity, unknown key). */
export class CodexQuirksError extends Error {
  override readonly name = "CodexQuirksError";
}

/** Parses an adapter's `quirks` argument into a validated {@link CodexQuirks}. An absent bag is a validation error: there is no honest default product name. */
export function parseCodexQuirks(raw: unknown): CodexQuirks {
  const validated = CodexQuirks(raw ?? {});
  if (validated instanceof type.errors) {
    throw new CodexQuirksError(
      `@corbits/codex-provider: invalid quirks: ${validated.summary}`,
    );
  }
  return validated;
}

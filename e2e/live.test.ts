// Live calls against the ChatGPT Codex backend. Opt in by setting both
// CODEX_LIVE_ACCESS_TOKEN (a "Login with ChatGPT" access token) and
// CODEX_LIVE_ACCOUNT_ID. CODEX_LIVE_MODEL is optional.

import { describe, expect, test } from "bun:test";
import { createDefaultScheduler, runInference } from "@intx/inference";
import type { InferenceEvent, InferenceSource } from "@intx/types/runtime";
import {
  CODEX_ACCOUNT_ID_OPTION,
  CODEX_BASE_URL,
  CODEX_PROVIDER,
  createCodexResponsesAdapter,
  withCodexContentTypeRepair,
} from "../src/index";

const accessToken = process.env["CODEX_LIVE_ACCESS_TOKEN"] ?? "";
const accountId = process.env["CODEX_LIVE_ACCOUNT_ID"] ?? "";
const model = process.env["CODEX_LIVE_MODEL"] ?? "gpt-5.5";

const source: InferenceSource = {
  id: `codex:${model}`,
  provider: CODEX_PROVIDER,
  baseURL: CODEX_BASE_URL,
  credentialId: "codex",
  model,
  quirks: { productName: "Corbits Live Test", environmentTagName: "live_test" },
};

const deps = {
  fetch: withCodexContentTypeRepair(fetch),
  scheduler: createDefaultScheduler(),
  adapters: {
    has: (provider: string) => provider === CODEX_PROVIDER,
    resolve: createCodexResponsesAdapter,
  },
};

describe.skipIf(accessToken === "" || accountId === "")(
  "live Codex backend",
  () => {
    test("streams a text turn", async () => {
      let seq = 0;
      const events: InferenceEvent[] = [];
      for await (const ev of runInference({
        turns: [
          {
            role: "user",
            timestamp: 0,
            content: [{ type: "text", text: "Reply with the word pong." }],
          },
        ],
        source,
        inferenceOptions: {
          systemPrompt: "Answer in one word.",
          providerOptions: { [CODEX_ACCOUNT_ID_OPTION]: accountId },
        },
        nextSeq: () => seq++,
        readMaterial: () => ({ secret: accessToken }),
        deps,
      }))
        events.push(ev);
      const done = events.find((e) => e.type === "inference.done");
      if (done?.type !== "inference.done")
        throw new Error(
          `expected inference.done, got ${JSON.stringify(events)}`,
        );
      const text = done.data.turn.content.find((b) => b.type === "text");
      expect(text?.type === "text" && text.text.toLowerCase()).toContain(
        "pong",
      );
    }, 60_000);
  },
);

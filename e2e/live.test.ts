// Live calls against the ChatGPT Codex backend. Opt in by setting both
// CODEX_LIVE_ACCESS_TOKEN (a "Login with ChatGPT" access token) and
// CODEX_LIVE_ACCOUNT_ID. CODEX_LIVE_MODEL is optional.

import { describe, expect, test } from "bun:test";
import { createDefaultScheduler, runInference } from "@intx/inference";
import type {
  ContentBlock,
  InferenceEvent,
  InferenceSource,
} from "@intx/types/runtime";
import {
  CODEX_ACCOUNT_ID_OPTION,
  CODEX_BASE_URL,
  CODEX_PROVIDER,
  createCodexResponsesAdapter,
  withCodexContentTypeRepair,
} from "../src/index";

const accessToken = process.env["CODEX_LIVE_ACCESS_TOKEN"] ?? "";
const accountId = process.env["CODEX_LIVE_ACCOUNT_ID"] ?? "";
const model = process.env["CODEX_LIVE_MODEL"] ?? "gpt-6.1-sol";

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

// A 16x16 solid red PNG.
const RED_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGUlEQVR4nGP4z8BAEiJN9aiG0VBiGEpJAwCQ+f8B0adKSwAAAABJRU5ErkJggg==";

// A one-page PDF whose only content is `text`, set in Helvetica.
function onePagePdf(text: string): string {
  const stream = `BT /F1 24 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets)
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf).toString("base64");
}

async function reply(content: ContentBlock[]): Promise<string> {
  let seq = 0;
  const events: InferenceEvent[] = [];
  for await (const ev of runInference({
    turns: [{ role: "user", timestamp: 0, content }],
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
    throw new Error(`expected inference.done, got ${JSON.stringify(events)}`);
  const text = done.data.turn.content.find((b) => b.type === "text");
  return text?.type === "text" ? text.text.toLowerCase() : "";
}

describe.skipIf(accessToken === "" || accountId === "")(
  "live Codex backend",
  () => {
    test("streams a text turn", async () => {
      expect(
        await reply([{ type: "text", text: "Reply with the word pong." }]),
      ).toContain("pong");
    }, 60_000);

    test("reads a base64 image", async () => {
      expect(
        await reply([
          {
            type: "image",
            source: { kind: "base64", mimeType: "image/png", data: RED_PNG },
          },
          { type: "text", text: "What single color fills this image?" },
        ]),
      ).toContain("red");
    }, 60_000);

    test("reads a base64 PDF", async () => {
      expect(
        await reply([
          {
            type: "document",
            source: {
              kind: "base64",
              mimeType: "application/pdf",
              data: onePagePdf("The secret word is PINEAPPLE."),
            },
          },
          { type: "text", text: "What is the secret word in the document?" },
        ]),
      ).toContain("pineapple");
    }, 60_000);
  },
);

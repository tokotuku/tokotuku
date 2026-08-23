import { readFile } from "node:fs/promises";

type Metadata = {
  sessionId?: string;
  source?: string;
  requestedModel?: string;
  requestedReasoningEffort?: string;
  effectiveModel?: string;
  effectiveReasoningEffort?: string;
};

const [path, expectedModel, expectedEffort] = process.argv.slice(2);
if (!path || !expectedModel || !expectedEffort) {
  console.error("usage: bun run-metadata.ts <json> <model> <effort>");
  process.exit(2);
}
const metadata = JSON.parse(await readFile(path, "utf8")) as Metadata;
const modelOk =
  metadata.requestedModel === expectedModel && metadata.effectiveModel === expectedModel;
const effortOk =
  metadata.requestedReasoningEffort === expectedEffort &&
  metadata.effectiveReasoningEffort === expectedEffort;
if (!modelOk || !effortOk) {
  console.error(
    JSON.stringify(
      {
        error: "runtime pin mismatch; mutation must not start",
        expected: { model: expectedModel, reasoningEffort: expectedEffort },
        actual: metadata,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}
process.stdout.write(
  `${JSON.stringify({ status: "pin-ok", model: expectedModel, reasoningEffort: expectedEffort })}\n`,
);
